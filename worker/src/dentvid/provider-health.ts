import { cleanError, type OpsStore } from "./ops-alert.js";
import { providerRefused } from "./retry.js";
import { ELEVEN_BASE, ttsProvider } from "../dental/elevenlabs.js";

/**
 * Are the AI providers able to work right now? Checked before a week spends
 * anything (jobs.ts makeWeek) and once a day (index.ts, with the digest),
 * using only free endpoints: no tokens, no audio.
 *
 *   OpenAI      GET /v1/models: free. Catches a revoked or wrong key and a
 *               deactivated account. Running out of credit does not show
 *               there, so a refusal seen on a real call (insufficient_quota,
 *               billing hard limit) is remembered in Redis for a few hours
 *               (`noteProviderRefused`) and the next weeks stop before
 *               spending until a week succeeds again (`clearProviderDown`).
 *   ElevenLabs  GET /v1/user/subscription: free. Characters used against the
 *               plan's limit. Only when narration uses ElevenLabs; it falls
 *               back to OpenAI's voice, so it never stops a week.
 *
 * A network error or a provider 5xx is "unknown", never a refusal: a free
 * probe that cannot answer must not hold up a clinic's week.
 */

export type Provider = "OpenAI" | "ElevenLabs";
export type ProbeResult = { state: "ok" } | { state: "refused"; reason: string } | { state: "unknown"; reason: string };

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export const PROVIDER_DOWN_KEY = (p: Provider) => `dv:ops:provider-down:${p.toLowerCase()}`;
/** How long a refusal seen on a real call stops new weeks before they spend (a successful week clears it sooner). */
export const PROVIDER_DOWN_TTL_SEC = 6 * 3600;
const PROBE_TIMEOUT_MS = 10_000;

/** A real call was refused for a reason on our side (out of credit, bad key): remember it. Never throws. */
export async function noteProviderRefused(store: OpsStore | null, provider: Provider, err: unknown): Promise<void> {
  if (!store || !providerRefused(err)) return;
  await store.set(PROVIDER_DOWN_KEY(provider), cleanError(err), PROVIDER_DOWN_TTL_SEC).catch(() => {});
}

/** A week was made: the provider works again. Never throws. */
export async function clearProviderDown(store: OpsStore | null, provider: Provider): Promise<void> {
  if (!store) return;
  await store.del(PROVIDER_DOWN_KEY(provider)).catch(() => {});
}

async function getJson(fetchImpl: Fetch, url: string, headers: Record<string, string>): Promise<{ status: number; body: unknown } | { error: string }> {
  try {
    const res = await fetchImpl(url, { method: "GET", headers, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (e) {
    return { error: (e as Error).message || "network error" };
  }
}

const errCode = (body: unknown): string => {
  const e = (body as { error?: { code?: unknown; type?: unknown; message?: unknown } | null } | null)?.error;
  return [e?.code, e?.type, e?.message].filter((x) => typeof x === "string").join(" ");
};

/** OpenAI, free: list models with the worker's key. */
export async function probeOpenAI(env: Env = process.env, fetchImpl: Fetch = fetch): Promise<ProbeResult> {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { state: "refused", reason: "OPENAI_API_KEY is not set" };
  const r = await getJson(fetchImpl, "https://api.openai.com/v1/models", { authorization: `Bearer ${key}` });
  if ("error" in r) return { state: "unknown", reason: r.error };
  if (r.status >= 200 && r.status < 300) return { state: "ok" };
  const code = errCode(r.body);
  if (r.status === 401 || r.status === 403) return { state: "refused", reason: `HTTP ${r.status}${code ? ` ${code}` : ""} (API key or account)` };
  if (r.status === 429 && /insufficient_quota|billing/i.test(code)) return { state: "refused", reason: `HTTP 429 ${code}` };
  return { state: "unknown", reason: `HTTP ${r.status}${code ? ` ${code}` : ""}` };
}

/** ElevenLabs, free: characters used against the plan's limit. "ok" when narration does not use ElevenLabs. */
export async function probeElevenLabs(env: Env = process.env, fetchImpl: Fetch = fetch): Promise<ProbeResult> {
  if (ttsProvider(env) !== "elevenlabs") return { state: "ok" };
  const key = env.ELEVENLABS_API_KEY?.trim();
  if (!key) return { state: "refused", reason: "ELEVENLABS_API_KEY is not set" };
  const r = await getJson(fetchImpl, `${ELEVEN_BASE}/user/subscription`, { "xi-api-key": key });
  if ("error" in r) return { state: "unknown", reason: r.error };
  if (r.status === 401 || r.status === 403) return { state: "refused", reason: `HTTP ${r.status} (API key)` };
  if (r.status < 200 || r.status >= 300) return { state: "unknown", reason: `HTTP ${r.status}` };
  const b = (r.body ?? {}) as { character_count?: unknown; character_limit?: unknown };
  const used = Number(b.character_count);
  const limit = Number(b.character_limit);
  if (Number.isFinite(used) && Number.isFinite(limit) && limit > 0 && used >= limit) return { state: "refused", reason: `character quota used up (${used} of ${limit})` };
  return { state: "ok" };
}

export type Preflight = { ok: true } | { ok: false; provider: Provider; reason: string };

/**
 * Before a week spends anything: is OpenAI (scripts, reviews and, by default,
 * narration) able to work? A refusal remembered from a real call, else the
 * free key check. ElevenLabs is not checked here: it falls back to OpenAI.
 */
export async function preflight(store: OpsStore | null, env: Env = process.env, fetchImpl: Fetch = fetch): Promise<Preflight> {
  const remembered = store ? await store.get(PROVIDER_DOWN_KEY("OpenAI")).catch(() => null) : null;
  if (remembered) return { ok: false, provider: "OpenAI", reason: `refused on a recent call: ${remembered}` };
  const probe = await probeOpenAI(env, fetchImpl);
  if (probe.state === "refused") return { ok: false, provider: "OpenAI", reason: probe.reason };
  return { ok: true };
}

/** The daily check: every provider in use, free endpoints only. The refusals, for the owner. */
export async function dailyProviderCheck(store: OpsStore | null, env: Env = process.env, fetchImpl: Fetch = fetch): Promise<{ provider: Provider; reason: string; fallback: boolean }[]> {
  const out: { provider: Provider; reason: string; fallback: boolean }[] = [];
  const openai = await preflight(store, env, fetchImpl);
  if (!openai.ok) out.push({ provider: "OpenAI", reason: openai.reason, fallback: false });
  const eleven = await probeElevenLabs(env, fetchImpl);
  if (eleven.state === "refused") out.push({ provider: "ElevenLabs", reason: eleven.reason, fallback: true });
  return out;
}
