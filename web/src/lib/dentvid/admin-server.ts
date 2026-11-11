import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dvSession } from "./auth";
import { isAdminUser } from "./admin";
import { csrfSecret, csrfToken, sessionIdOf } from "./admin-csrf";
import { foundingCode } from "./billing";
import { dvAdmin } from "./supabase";
import { missingTable } from "./events-server";
import { isEmailVerified } from "./verify-email";
import type { AdminClinic, AdminEvent, AdminItem } from "./admin-metrics";

/**
 * The owner dashboard's gate and data. Everyone who is not a signed-in
 * admin (DENTVIDEO_ADMIN_USER_IDS) gets the ordinary 404 — signed-out
 * visitors included — so the page does not admit to existing.
 */
export async function requireAdmin(): Promise<AdminViewer> {
  const viewer = await adminViewer();
  if (!viewer) notFound();
  return viewer;
}

export type AdminViewer = {
  id: string;
  email: string;
  /** The Supabase session this page was rendered for (admin-csrf.ts). */
  sessionId: string;
  /** The per-session CSRF token every action form carries; "" when no secret is configured (actions then refuse). */
  csrf: string;
};

/**
 * The signed-in admin, or null for everyone else (signed out, not listed in
 * DENTVIDEO_ADMIN_USER_IDS, or the session cannot be read). For routes, which
 * answer 404 themselves; pages use requireAdmin.
 */
export async function adminViewer(): Promise<AdminViewer | null> {
  let user: { id: string; email?: string | null } | null = null;
  let sessionId = "";
  try {
    const s = await dvSession();
    user = s.user;
    if (user) {
      // getUser() above verified the token; the session id is a claim of that same token.
      try {
        const { data } = await s.db.auth.getSession();
        sessionId = sessionIdOf(data.session?.access_token);
      } catch {
        sessionId = "";
      }
    }
  } catch {
    user = null;
  }
  // The user id decides; the email is only shown as "signed in as".
  if (!user || !isAdminUser(user.id)) return null;
  const secret = csrfSecret();
  return { id: user.id, email: user.email ?? user.id, sessionId, csrf: secret && sessionId ? csrfToken(user.id, sessionId, secret) : "" };
}

const PAGE = 1000;
const MAX_ROWS = 50_000;

/** Every row of a query, page by page (PostgREST caps a response at ~1000 rows). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>): Promise<{ rows: T[]; error: { code?: string; message?: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { rows, error };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null };
}

export type SpendState = {
  available: boolean;
  spentTodayUsd: number | null;
  spentMonthUsd: number | null;
  dailyCapUsd: number;
  monthlyCapUsd: number;
  paused: boolean;
  parked: { jobId: string; name: string; reason: string; parkedAt: string; clinicId?: string }[];
};

export type AdminData = {
  now: string;
  clinics: AdminClinic[];
  events: AdminEvent[];
  items: AdminItem[];
  eventsTable: boolean;
  spend: SpendState;
  dodoFoundingUses: number | null;
  warnings: string[];
  /** Owner ids whose email is confirmed (lib/dentvid/verify-email); undefined when it could not be read. */
  verifiedOwners?: string[];
};

/** Which clinic owners confirmed their address. One admin call for up to 1000 users (Liman holds other apps' too). */
async function loadVerifiedOwners(db: SupabaseClient, ownerIds: string[]): Promise<string[] | undefined> {
  if (!ownerIds.length) return [];
  try {
    const want = new Set(ownerIds);
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return undefined;
    return (data?.users ?? []).filter((u) => want.has(u.id) && isEmailVerified(u)).map((u) => u.id);
  } catch {
    return undefined;
  }
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** Spend-guard counters and parked jobs, written by the worker (worker/src/dentvid/spend-guard.ts, park.ts). */
export async function loadSpend(now = new Date()): Promise<SpendState> {
  const base: SpendState = {
    available: false,
    spentTodayUsd: null,
    spentMonthUsd: null,
    dailyCapUsd: num(process.env.DENTVID_DAILY_USD_CAP, 20),
    monthlyCapUsd: num(process.env.DENTVID_MONTHLY_USD_CAP, 300),
    paused: process.env.DENTVID_PAUSE_GENERATION === "1" || process.env.DENTVID_PAUSE_GENERATION === "true",
    parked: [],
  };
  try {
    const { limiterRedis } = await import("../rate-limit-server");
    const r = limiterRedis();
    if (!r) return base;
    const day = now.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const work = Promise.all([r.get(`dv:spend:usd:day:${day}`), r.get(`dv:spend:usd:month:${month}`), r.hgetall("dv:parked")]);
    const res = await Promise.race([work, new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))]);
    if (!res) return base;
    const [d, m, parkedRaw] = res;
    const parked: SpendState["parked"] = [];
    for (const v of Object.values(parkedRaw ?? {})) {
      try {
        const p = JSON.parse(v) as { jobId: string; name: string; reason: string; parkedAt: string; data?: { clinicId?: string } };
        parked.push({ jobId: p.jobId, name: p.name, reason: p.reason, parkedAt: p.parkedAt, clinicId: p.data?.clinicId });
      } catch {
        // skip a malformed entry
      }
    }
    parked.sort((a, b) => b.parkedAt.localeCompare(a.parkedAt));
    return { ...base, available: true, spentTodayUsd: Number(d ?? 0) / 100, spentMonthUsd: Number(m ?? 0) / 100, parked };
  } catch {
    return base;
  }
}

/** Times the founding code has been used, from Dodo (only with DODO_API_KEY); null when unknown. */
export async function loadDodoFoundingUses(): Promise<number | null> {
  const apiKey = process.env.DODO_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const { dodoApiBase } = await import("../dodo");
    const res = await fetch(`${dodoApiBase()}/discounts?page_size=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: { code?: string; times_used?: number }[] };
    const code = foundingCode().toUpperCase();
    const d = (body.items ?? []).find((x) => (x.code ?? "").toUpperCase() === code);
    return typeof d?.times_used === "number" ? d.times_used : null;
  } catch {
    return null;
  }
}

/** Everything the dashboard shows, loaded with the service role. Each source fails soft. */
export async function loadAdminData(now = new Date(), opts: { eventDays?: number; itemDays?: number } = {}): Promise<AdminData> {
  const warnings: string[] = [];
  let db: SupabaseClient;
  try {
    db = dvAdmin();
  } catch {
    return { now: now.toISOString(), clinics: [], events: [], items: [], eventsTable: false, spend: await loadSpend(now), dodoFoundingUses: null, warnings: ["DentVideo backend is not configured."] };
  }
  const since = new Date(now.getTime() - Math.max(35, opts.eventDays ?? 35) * 86_400_000).toISOString();
  const sinceItems = new Date(now.getTime() - Math.max(60, opts.itemDays ?? 60) * 86_400_000).toISOString().slice(0, 10);

  const [clinics, events, items, spend, dodoFoundingUses] = await Promise.all([
    fetchAll<AdminClinic>((a, b) => db.from("dentvid_clinics").select("*").order("created_at", { ascending: false }).range(a, b)),
    fetchAll<AdminEvent>((a, b) =>
      db.from("dentvid_events").select("name, locale, props, clinic_id, created_at").gte("created_at", since).order("created_at", { ascending: false }).range(a, b),
    ),
    fetchAll<AdminItem>((a, b) =>
      db
        .from("dentvid_items")
        .select("id, clinic_id, kind, week_of, status, approval, title, error, findings, video_path, updated_at")
        .gte("week_of", sinceItems)
        .order("updated_at", { ascending: false })
        .range(a, b),
    ),
    loadSpend(now),
    loadDodoFoundingUses(),
  ]);
  if (clinics.error) warnings.push(`Clinics could not be read: ${clinics.error.message}`);
  if (items.error) warnings.push(`Videos could not be read: ${items.error.message}`);
  const eventsTable = !events.error;
  if (events.error && !missingTable(events.error)) warnings.push(`Events could not be read: ${events.error.message}`);
  const verifiedOwners = await loadVerifiedOwners(db, [...new Set(clinics.rows.map((c) => c.owner_id).filter((x): x is string => !!x))]);
  return {
    now: now.toISOString(),
    clinics: clinics.rows,
    events: events.rows,
    items: items.rows,
    eventsTable,
    spend,
    dodoFoundingUses,
    warnings,
    verifiedOwners,
  };
}
