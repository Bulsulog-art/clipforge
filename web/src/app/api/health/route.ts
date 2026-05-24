import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import IORedis from "ioredis";

/**
 * GET /api/health           — shallow check (200 OK, used by Coolify)
 * GET /api/health?deep=1    — exercises each backing service in turn
 *
 * The shallow check stays fast (no I/O) so an uptime monitor pinging
 * every 30s doesn't add load. The deep check is what you wire to
 * pagerduty / status-page; it returns a 200 with subsystem detail
 * even when one piece is down so the status page can colour-code per
 * service instead of "everything is broken".
 *
 * Each subsystem has a 2.5s per-call timeout — total worst-case
 * latency ≤ 10s.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1"
    || url.pathname.endsWith("/deep");

  if (!deep) {
    return NextResponse.json({ ok: true, ts: Date.now() });
  }

  const results = await Promise.all([
    checkSupabase(),
    checkRedis(),
    checkOpenAI(),
  ]);
  const subsystems = Object.fromEntries(results.map((r) => [r.name, r]));
  const allOk = results.every((r) => r.ok);

  return NextResponse.json({
    ok: allOk,
    ts: Date.now(),
    subsystems,
  }, { status: 200 });   // always 200 — deep check is informational
}

type Probe = { name: string; ok: boolean; latencyMs: number; detail?: string };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

async function checkSupabase(): Promise<Probe> {
  const start = Date.now();
  try {
    const svc = createServiceClient();
    // Tiny head request — counts rows without pulling any data. If RLS
    // or auth is broken this returns an error fast. The filter builder
    // is awaitable but not a real Promise<T> until .then() fires, so we
    // wrap it in a thenable to make withTimeout happy.
    const probe = Promise.resolve(
      svc.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
    );
    await withTimeout(probe, 2500);
    return { name: "supabase", ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      name: "supabase", ok: false, latencyMs: Date.now() - start,
      detail: (e as Error).message,
    };
  }
}

async function checkRedis(): Promise<Probe> {
  const start = Date.now();
  const url = process.env.REDIS_URL;
  if (!url) {
    return { name: "redis", ok: false, latencyMs: 0, detail: "REDIS_URL not set" };
  }
  // Use a one-shot client so the health route doesn't keep a long-lived
  // connection. Connection pool for the actual queue lives in lib/queue.ts.
  const client = new IORedis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2500,
    lazyConnect: true,
  });
  try {
    await withTimeout(client.connect(), 2500);
    const pong = await withTimeout(client.ping(), 1500);
    return {
      name: "redis", ok: pong === "PONG", latencyMs: Date.now() - start,
      detail: pong === "PONG" ? undefined : `unexpected reply: ${pong}`,
    };
  } catch (e) {
    return {
      name: "redis", ok: false, latencyMs: Date.now() - start,
      detail: (e as Error).message,
    };
  } finally {
    client.disconnect();
  }
}

async function checkOpenAI(): Promise<Probe> {
  const start = Date.now();
  if (!process.env.OPENAI_API_KEY) {
    return { name: "openai", ok: false, latencyMs: 0, detail: "OPENAI_API_KEY not set" };
  }
  try {
    // GET /v1/models is the cheapest authenticated endpoint — no token
    // billing, returns 200 if the key is valid.
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }),
      2500,
    );
    return {
      name: "openai", ok: res.ok, latencyMs: Date.now() - start,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      name: "openai", ok: false, latencyMs: Date.now() - start,
      detail: (e as Error).message,
    };
  }
}
