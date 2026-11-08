import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dvSession } from "./auth";
import { isAdminUser } from "./admin";
import { foundingCode } from "./billing";
import { dvAdmin } from "./supabase";
import { missingTable } from "./events-server";
import type { AdminClinic, AdminEvent, AdminItem } from "./admin-metrics";

/**
 * The owner dashboard's gate and data. Everyone who is not a signed-in
 * admin (DENTVIDEO_ADMIN_USER_IDS) gets the ordinary 404 — signed-out
 * visitors included — so the page does not admit to existing.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  let user: { id: string; email?: string | null } | null = null;
  try {
    user = (await dvSession()).user;
  } catch {
    user = null;
  }
  // The user id decides; the email is only shown as "signed in as".
  if (!user || !isAdminUser(user.id)) notFound();
  return { id: user.id, email: user.email ?? user.id };
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
};

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
export async function loadAdminData(now = new Date()): Promise<AdminData> {
  const warnings: string[] = [];
  let db: SupabaseClient;
  try {
    db = dvAdmin();
  } catch {
    return { now: now.toISOString(), clinics: [], events: [], items: [], eventsTable: false, spend: await loadSpend(now), dodoFoundingUses: null, warnings: ["DentVideo backend is not configured."] };
  }
  const since = new Date(now.getTime() - 35 * 86_400_000).toISOString();
  const sinceItems = new Date(now.getTime() - 60 * 86_400_000).toISOString().slice(0, 10);

  const [clinics, events, items, spend, dodoFoundingUses] = await Promise.all([
    fetchAll<AdminClinic>((a, b) => db.from("dentvid_clinics").select("*").order("created_at", { ascending: false }).range(a, b)),
    fetchAll<AdminEvent>((a, b) =>
      db.from("dentvid_events").select("name, locale, props, clinic_id, created_at").gte("created_at", since).order("created_at", { ascending: false }).range(a, b),
    ),
    fetchAll<AdminItem>((a, b) =>
      db
        .from("dentvid_items")
        .select("id, clinic_id, kind, week_of, status, approval, title, error, updated_at")
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
  return {
    now: now.toISOString(),
    clinics: clinics.rows,
    events: events.rows,
    items: items.rows,
    eventsTable,
    spend,
    dodoFoundingUses,
    warnings,
  };
}

/** One clinic and its library for the read-only admin view, with short-lived signed URLs. */
export async function loadClinicForAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let db: SupabaseClient;
  try {
    db = dvAdmin();
  } catch {
    return null;
  }
  const { data: clinic } = await db.from("dentvid_clinics").select("*").eq("id", id).maybeSingle();
  if (!clinic) return null;
  const { loadItems } = await import("./items");
  const { items } = await loadItems(db, clinic.owner_id as string);
  return { clinic: clinic as AdminClinic & { owner_id: string }, items };
}
