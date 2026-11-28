import { NextResponse } from "next/server";
import { agentActor } from "@/lib/dentvid/agent-auth";
import { demoPath, parseDemoInput } from "@/lib/dentvid/demos";
import { createDemo } from "@/lib/dentvid/demos-server";
import { ImageFetchError, fetchImageSafely, type FetchedImage } from "@/lib/dentvid/safe-image-fetch";
import { dvUrl } from "@/lib/dentvid/host";
import { LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * Demo links for the automated sales agent: POST a prospect clinic's public
 * details as JSON, get back its personalised demo URL. Same rules as the
 * owner's /admin/demos (parseDemoInput, createDemo), without a browser session.
 *
 * Auth: "Authorization: Bearer <DENTVIDEO_AGENT_TOKEN>" (lib/dentvid/agent-auth).
 * Unconfigured, or a wrong/missing token → a plain 404, as the admin routes do.
 * The route reads no cookie, so the Origin guard lets the bearer call through.
 *
 * A logo is accepted by URL only and fetched once, server side, through the
 * SSRF guard (lib/dentvid/safe-image-fetch). A prospect's site often blocks or
 * breaks the fetch, so a failed logo does not fail the demo: it is created
 * without one and the response says `logo: "skipped"`.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });
/** The text fields only (no file): a few hundred bytes in practice. */
const MAX_BODY = 8 * 1024;

async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) return { ok: false, status: 413 };
  if (!req.body) return { ok: false, status: 400 };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function POST(req: Request) {
  const actor = agentActor(req.headers.get("authorization"));
  if (!actor) return NOT_FOUND();
  const limited = await limitChecks([{ key: `rl:demoagent:user:${actor.userId}`, rule: LIMITS.demoAgent }]);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many demos in an hour; wait a little.", retryAfter: limited.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await readJson(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.status === 413 ? "The body is too large." : "Send a JSON object." }, { status: body.status });
  }
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return NextResponse.json({ error: "Send a JSON object." }, { status: 400 });
  }
  const raw = body.value as Record<string, unknown>;
  const parsed = parseDemoInput({
    clinicName: raw.clinicName,
    city: raw.city,
    country: raw.country,
    language: raw.language,
    colour: raw.colour,
    logoUrl: raw.logoUrl,
    note: raw.note,
    campaign: raw.campaign,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  let logo: FetchedImage | null = null;
  let logoError: string | undefined;
  if (input.logoUrl) {
    try {
      logo = await fetchImageSafely(input.logoUrl);
    } catch (e) {
      logoError = e instanceof ImageFetchError ? e.message : "The logo could not be read.";
    }
  }

  const saved = await createDemo(input, logo, actor.userId);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.missing ? 503 : 500 });

  const url = dvUrl(demoPath(saved.demo.token, input.language));
  return NextResponse.json({
    token: saved.demo.token,
    url,
    expiresAt: saved.demo.expires_at,
    logo: logo ? "stored" : input.logoUrl ? "skipped" : "none",
    ...(logoError ? { logoError } : {}),
  });
}
