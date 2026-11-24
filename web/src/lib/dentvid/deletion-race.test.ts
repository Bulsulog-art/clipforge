import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ACCOUNT_TEXT } from "@/content/dentvideo-account";
import { APP_TEXT } from "@/content/dentvideo-app";

/**
 * Deleting an account cancels the clinic's Dodo subscription first and only then removes its library
 * and its clinic row. Dodo's subscription.cancelled can arrive in between, while the clinic still
 * looks active and paid through a future date. Its written confirmation would then promise "your
 * library stays for 90 days" to an account that is being deleted. These tests play that race end to
 * end: the deletion route (handlers/account-delete.ts) with Dodo's webhook delivered from inside the
 * Dodo cancel call, through the real webhook (billing-webhook.ts) and the real confirmation sender
 * (billing-confirm-email.ts), and nothing may reach the clinic.
 *
 * The rate limiter here has no Redis (REDIS_URL unset), so the route's request count is never stored:
 * the same as a limiter that let the request through uncounted because Redis was slow. Only the
 * route's own deletion mark (deletion-marker.ts) stands between the webhook and the email.
 */

vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({ admin: true }), BUCKET: "dentvid" }));

const deleteImpl = vi.fn();
vi.mock("@/lib/dentvid/account", () => ({ deleteDentvideoAccount: (...a: unknown[]) => deleteImpl(...a) }));

const cancelAtDodo = vi.fn();
vi.mock("@/lib/dentvid/dodo-account", async (orig) => ({
  ...(await orig<typeof import("./dodo-account")>()),
  dodoApiKey: () => "sk_test",
  dodoGetSubscription: async () => ({ status: "active" }),
  dodoCancelSubscription: (...a: unknown[]) => cancelAtDodo(...a),
}));

import { deleteAccount } from "./handlers/account-delete";
import { _setOpsForTests } from "./ops-server";
import { MemoryOpsStore, type OwnerAlert } from "./ops-alert";
import { accountDeletionMarker, confirmMailWith, handleDentvideoEvent, type DvWebhookDeps } from "./billing-webhook";
import { sendBillingConfirmation } from "./billing-confirm-email";
import { DELETION_MARK_TTL_S, accountDeleting, deletionMarkKey, markAccountDeleting } from "./deletion-marker";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import type { ClinicForMail, LifecycleStore, Sender } from "./lifecycle";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CLINIC = "11111111-2222-3333-4444-555555555555";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";
const NOW = new Date("2026-11-20T00:00:00Z");
const END = "2026-12-10T00:00:00.000Z";

/** The clinic as the database holds it: gone once the deletion reaches its clinic step. */
type ClinicRow = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null; profile: Record<string, unknown> };
let row: ClinicRow | null;

function webhookDb(): SupabaseClient {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        neq: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table !== "dentvid_clinics") return { data: null, error: { code: "42P01", message: "relation does not exist" } };
          return { data: row && filters.every(([k, v]) => (row as Record<string, unknown>)[k] === v) ? { ...row } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (!patch && table !== "dentvid_clinics") return resolve({ data: null, error: { code: "42P01", message: `relation "public.${table}" does not exist` } });
          if (patch && row && table === "dentvid_clinics" && filters.every(([k, v]) => (row as Record<string, unknown>)[k] === v)) Object.assign(row, patch);
          return resolve({ error: null });
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

function ledger(): SubscriptionStore {
  const map = new Map<string, DvSubRecord>([["sub_1", { dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "active", tier: "practice", product: PRACTICE, period_end: END, last_event_at: "2026-11-10T00:00:00.000Z" }]]);
  return {
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async (r) => (map.set(r.dodo_subscription_id, { ...map.get(r.dodo_subscription_id), ...r }), true),
    recordPayment: async () => {},
    paymentClinic: async () => null,
  };
}

/** The email side: the clinic's owner, the email log, and every email that would have gone out. */
function mailbox() {
  const sent: { to: string; subject: string }[] = [];
  const store: LifecycleStore = {
    trialClinics: async () => [],
    logs: async () => [],
    clinic: async () => (row ? ({ id: row.id, owner_id: row.owner_id, profile: row.profile as ClinicForMail["profile"], plan: row.plan, created_at: "", email_opt_out_at: null } as ClinicForMail) : null),
    claim: async () => true,
    release: async () => {},
    owner: async () => ({ email: "dr@clinic.example", verified: true }),
    optOut: async () => true,
  };
  const send: Sender = async (to, m) => (sent.push({ to, subject: m.subject }), true);
  return { sent, store, send };
}

const cancelEvent = { type: "subscription.cancelled", timestamp: "2026-11-20T00:00:00Z", data: { subscription_id: "sub_1", product_id: PRACTICE, status: "cancelled", next_billing_date: END, metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER } } };

function webhookDeps(over: Partial<DvWebhookDeps>, raised: OwnerAlert[]): DvWebhookDeps {
  return {
    alert: async (a) => void raised.push(a),
    clinicRef: async (_db, id) => ({ id, name: "Sample Dental Practice", email: "dr@clinic.example" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    sendPaymentMail: vi.fn(async () => "sent"),
    markPaid: vi.fn(async () => {}),
    ownerInternal: async () => false,
    dodoStatus: async () => null,
    paidThrough: async () => null,
    appleManaged: async () => false,
    apple: { get: async () => null, forClinic: async () => [], put: async () => true },
    subs: ledger(),
    now: () => NOW,
    selfServe: true,
    ...over,
  };
}

/** The deletion as account.ts runs it, in its order: Dodo first, then the library and the clinic row. */
function realOrderDeletion() {
  deleteImpl.mockImplementation(async (args: { dodo: { getSubscription: (id: string) => Promise<unknown>; cancelSubscription: (id: string) => Promise<void> } | null }) => {
    await args.dodo!.getSubscription("sub_1");
    try {
      await args.dodo!.cancelSubscription("sub_1");
    } catch {
      return { ok: false, reason: "billing_failed", step: "billing" };
    }
    row = null;
    return { ok: true, files: 0, items: 0, clinic: true, devices: 0, cancelledSubscription: true, userDeleted: true, loginKept: false, appStoreSubscription: false };
  });
}

function actor() {
  const db = {
    auth: { signOut: async () => ({ error: null }) },
    from: () => {
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: row ? { ...row } : null, error: null }) };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, user: { id: OWNER, email: "dr@clinic.example" } as User };
}

const request = () => new Request("https://dentvideo.com/api/dentvideo/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "Sample Dental Practice" }) });

let ops: MemoryOpsStore;
beforeEach(() => {
  row = { id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: END, profile: { name: "Sample Dental Practice", language: "en", country: "US" } };
  ops = new MemoryOpsStore();
  _setOpsForTests(ops);
  vi.stubEnv("REDIS_URL", "");
  deleteImpl.mockReset();
  cancelAtDodo.mockReset();
});
afterEach(() => {
  _setOpsForTests(undefined);
  vi.unstubAllEnvs();
});

describe("account deletion racing Dodo's cancellation webhook", () => {
  it("the webhook that arrives mid-deletion sends the clinic nothing, and the owner is told why", async () => {
    const mail = mailbox();
    const raised: OwnerAlert[] = [];
    let during: { status: number; body: Record<string, unknown> } | null = null;
    cancelAtDodo.mockImplementation(async () => {
      // Dodo answers the cancel and delivers subscription.cancelled at once: the clinic row is still there.
      expect(row?.plan).toBe("active");
      const deps = webhookDeps({ sendConfirmMail: confirmMailWith({ env: { RESEND_API_KEY: "re_test" }, send: mail.send, store: () => mail.store, ops: async () => ops }) }, raised);
      during = await handleDentvideoEvent(webhookDb(), cancelEvent, deps);
    });
    realOrderDeletion();

    const res = await deleteAccount(actor(), request());
    expect(res.status).toBe(200);
    expect(cancelAtDodo).toHaveBeenCalledWith({ apiKey: "sk_test" }, "sub_1");
    expect(during).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "account deletion" } });
    expect(mail.sent).toEqual([]);
    expect(raised[0].done.join(" ")).toMatch(/asked to delete the account/);
    // No request count was stored (no limiter Redis): the mark alone held it back.
    expect([...ops.kv.keys()].filter((k) => k.startsWith("rl:"))).toEqual([]);
    expect(ops.kv.get(deletionMarkKey(OWNER))).toBeTruthy();
  });

  it("the sender itself skips an account being deleted, even when the webhook's own check missed it", async () => {
    const mail = mailbox();
    const raised: OwnerAlert[] = [];
    let during: { status: number; body: Record<string, unknown> } | null = null;
    cancelAtDodo.mockImplementation(async () => {
      // As before the mark existed: the webhook's check finds no deletion (an uncounted request).
      const deps = webhookDeps({ deletionRequested: async () => false, sendConfirmMail: confirmMailWith({ env: { RESEND_API_KEY: "re_test" }, send: mail.send, store: () => mail.store, ops: async () => ops }) }, raised);
      during = await handleDentvideoEvent(webhookDb(), cancelEvent, deps);
    });
    realOrderDeletion();

    expect((await deleteAccount(actor(), request())).status).toBe(200);
    expect(during).toMatchObject({ body: { confirmEmail: "account deletion" } });
    expect(mail.sent).toEqual([]);
  });

  it("the mark is written before Dodo is asked to cancel", async () => {
    const seen: (string | null)[] = [];
    cancelAtDodo.mockImplementation(async () => void seen.push(await ops.get(deletionMarkKey(OWNER))));
    realOrderDeletion();
    expect((await deleteAccount(actor(), request())).status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBeNull();
  });

  it("when Redis is configured but the mark cannot be written, Dodo is never called and nothing is deleted", async () => {
    ops.down = true;
    realOrderDeletion();
    const res = await deleteAccount(actor(), request());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: ACCOUNT_TEXT.en.errors.deleteBillingFailed });
    expect(cancelAtDodo).not.toHaveBeenCalled();
    expect(row).not.toBeNull();
  });

  it("without Redis at all the deletion goes ahead, and the webhook holds the email back as not checked", async () => {
    _setOpsForTests(null);
    const mail = mailbox();
    const raised: OwnerAlert[] = [];
    let during: { status: number; body: Record<string, unknown> } | null = null;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    cancelAtDodo.mockImplementation(async () => {
      const deps = webhookDeps({ sendConfirmMail: confirmMailWith({ env: { RESEND_API_KEY: "re_test" }, send: mail.send, store: () => mail.store, ops: async () => null }) }, raised);
      during = await handleDentvideoEvent(webhookDb(), cancelEvent, deps);
    });
    realOrderDeletion();
    const res = await deleteAccount(actor(), request());
    err.mockRestore();
    expect(res.status).toBe(200);
    expect(during).toMatchObject({ body: { confirmEmail: "not checked" } });
    expect(mail.sent).toEqual([]);
  });
});

describe("deletion mark", () => {
  it("is written with the request count's lifetime and read back; another owner is not marked", async () => {
    const store = new MemoryOpsStore();
    const set = vi.spyOn(store, "set");
    expect(await markAccountDeleting(store, OWNER.toUpperCase(), NOW)).toBe("marked");
    expect(set).toHaveBeenCalledWith(`dv:deleting:${OWNER}`, NOW.toISOString(), DELETION_MARK_TTL_S);
    expect(DELETION_MARK_TTL_S).toBe(2 * 3600);
    expect(await accountDeleting(store, OWNER)).toBe(true);
    expect(await accountDeleting(store, "someone-else")).toBe(false);
  });

  it("no store: nothing to write and unknown on read; a store that is down: failed after one more try, unknown on read", async () => {
    expect(await markAccountDeleting(null, OWNER, NOW)).toBe("no store");
    expect(await accountDeleting(null, OWNER)).toBeNull();
    const down = new MemoryOpsStore();
    down.down = true;
    const set = vi.spyOn(down, "set");
    expect(await markAccountDeleting(down, OWNER, NOW, { retryMs: 1 })).toBe("failed");
    expect(set).toHaveBeenCalledTimes(2);
    expect(await accountDeleting(down, OWNER)).toBeNull();
  });

  it("the webhook's deletion check sees the mark alone, with no request count stored", async () => {
    const store = new MemoryOpsStore();
    expect(await accountDeletionMarker(OWNER, NOW, { ops: async () => store })).toBe(false);
    await markAccountDeleting(store, OWNER, NOW);
    expect(await accountDeletionMarker(OWNER, NOW, { ops: async () => store })).toBe(true);
    expect(await accountDeletionMarker("someone-else", NOW, { ops: async () => store })).toBe(false);
  });

  it("a connection still opening on the first try is retried", async () => {
    const store = new MemoryOpsStore();
    let first = true;
    const realSet = store.set.bind(store);
    store.set = async (k, v, t) => {
      if (first) {
        first = false;
        throw new Error("redis connecting");
      }
      return realSet(k, v, t);
    };
    expect(await markAccountDeleting(store, OWNER, NOW, { retryMs: 1 })).toBe("marked");
  });
});

describe("the confirmation sender and the mark", () => {
  const row: ClinicForMail = { id: CLINIC, owner_id: OWNER, profile: { name: "Sample Dental Practice", language: "en", country: "US" }, plan: "active", created_at: "", email_opt_out_at: null };
  const store = (): LifecycleStore => ({
    trialClinics: async () => [],
    logs: async () => [],
    clinic: async () => row,
    claim: async () => true,
    release: async () => {},
    owner: async () => ({ email: "dr@clinic.example", verified: true }),
    optOut: async () => true,
  });
  const notice = { kind: "cancelled" as const, subscriptionId: "sub_1", endsAt: END };

  it("true: nothing is sent; false or unknown: the sender goes on (the webhook decides about unknown)", async () => {
    for (const [mark, want] of [
      [true, "account deletion"],
      [false, "sent"],
      [null, "sent"],
    ] as const) {
      const send = vi.fn(async () => true);
      const r = await sendBillingConfirmation({ store: store(), send, config: { base: "https://dentvideo.com", enabled: true }, accountDeleting: async () => mark }, CLINIC, notice);
      expect(r, String(mark)).toBe(want);
      expect(send).toHaveBeenCalledTimes(want === "sent" ? 1 : 0);
    }
  });

  it("a plan change during a deletion is not confirmed either", async () => {
    const send = vi.fn(async () => true);
    const r = await sendBillingConfirmation(
      { store: store(), send, config: { base: "https://dentvideo.com", enabled: true }, accountDeleting: async (owner) => owner === OWNER },
      CLINIC,
      { kind: "plan_changed", subscriptionId: "sub_1", tier: "starter", eventAt: "2026-11-20T10:00:00Z" },
    );
    expect(r).toBe("account deletion");
    expect(send).not.toHaveBeenCalled();
  });
});
