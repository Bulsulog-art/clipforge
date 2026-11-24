import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITS, MemoryStore, slidingWindow } from "@/lib/rate-limit";
import { adoptWaitingApple } from "./apple-webhook";
import type { AppleSubRecord } from "./apple-store";
import { alerts } from "./ops-alert";
import {
  CONFIRM_PROBLEM,
  appleTakesOver,
  cancellationAlert,
  confirmNotSentAlert,
  deletionLimitKey,
  deletionRequested,
  libraryUntil,
  readAppleLedger,
  type AppleLedgerRow,
} from "./billing-confirm-checks";

const OWNER = "8f9e6a52-1111-4222-8333-944455556666";
const CLINIC = "11111111-2222-3333-4444-555555555555";
const NOW = new Date("2026-11-24T10:30:00Z");
const MIN = 60_000;

/* ------------------------------------------------------------ account deletion marker */

describe("account deletion: read from the deletion route's own request count", () => {
  /** What the deletion route does before it cancels Dodo: count the request (rate-limit.ts slidingWindow). */
  const deleteRequest = (store: MemoryStore, ownerId: string, at: Date) => slidingWindow(store, deletionLimitKey(ownerId), LIMITS.accountDeleteUser, at.getTime());
  const read = (store: MemoryStore) => (key: string) => store.get(key);

  it("sees a deletion asked for a moment ago, or within the last hour, and not one that is long past", async () => {
    let t = NOW.getTime();
    const store = new MemoryStore(1000, () => t);
    expect(await deletionRequested(read(store), OWNER, NOW)).toBe(false);

    await deleteRequest(store, OWNER, new Date(NOW.getTime() - 2 * MIN));
    expect(await deletionRequested(read(store), OWNER, NOW)).toBe(true);

    // At any point of the next hour it is still seen (the current or the previous bucket).
    for (const later of [10, 30, 59]) expect(await deletionRequested(read(store), OWNER, new Date(NOW.getTime() + later * MIN)), `${later} min`).toBe(true);
    // Three hours on, the count has expired.
    t = NOW.getTime() + 3 * 60 * MIN;
    expect(await deletionRequested(read(store), OWNER, new Date(t))).toBe(false);
  });

  it("is per owner", async () => {
    const store = new MemoryStore();
    await deleteRequest(store, "someone-else", NOW);
    expect(await deletionRequested(read(store), OWNER, NOW)).toBe(false);
  });

  it("throws when the count cannot be read (the webhook then treats it as unknown)", async () => {
    await expect(
      deletionRequested(
        async () => {
          throw new Error("redis connecting");
        },
        OWNER,
        NOW,
      ),
    ).rejects.toThrow("redis connecting");
  });

  it("matches the deletion route: it counts the request with this key and rule before it deletes anything", () => {
    const route = fs.readFileSync(path.resolve(__dirname, "handlers/account-delete.ts"), "utf8");
    const call = "rateLimited([{ key: `rl:delete:user:${user.id}`, rule: LIMITS.accountDeleteUser }]";
    expect(route).toContain(call);
    expect(route.indexOf(call)).toBeLessThan(route.indexOf("deleteDentvideoAccount({"));
    expect(deletionLimitKey("u1")).toBe("rl:delete:user:u1");
    // The reason the marker is needed: deletion cancels the Dodo subscription before it removes the library and the clinic.
    const account = fs.readFileSync(path.resolve(__dirname, "account.ts"), "utf8");
    const body = account.slice(account.indexOf("export async function deleteDentvideoAccount"));
    expect(body.indexOf("dodo.cancelSubscription")).toBeGreaterThan(0);
    expect(body.indexOf("dodo.cancelSubscription")).toBeLessThan(body.indexOf('from("dentvid_clinics").delete('));
  });
});

/* ------------------------------------------------------------ App Store takeover */

describe("an App Store subscription waiting to take over", () => {
  const row = (over: Partial<AppleSubRecord> = {}): AppleSubRecord => ({
    original_transaction_id: "1000",
    clinic_id: CLINIC,
    app_user_id: OWNER,
    status: "ignored_web_active",
    tier: "practice",
    environment: "PRODUCTION",
    period_end: "2026-12-20T00:00:00.000Z",
    ...over,
  });
  const cases: [string, AppleSubRecord[]][] = [
    ["held back, live", [row()]],
    ["sandbox", [row({ environment: "SANDBOX" })]],
    ["no tier", [row({ tier: null })]],
    ["lapsed", [row({ period_end: "2026-11-20T00:00:00.000Z" })]],
    ["no date", [row({ period_end: null })]],
    ["the clinic's live Apple plan", [row({ status: "active" })]],
    ["refunded", [row({ status: "refunded" })]],
    ["one of several", [row({ status: "expired" }), row({ original_transaction_id: "2000" })]],
    ["none", []],
  ];

  it("follows exactly the rule the takeover itself uses (apple-webhook.ts adoptWaitingApple)", async () => {
    const db = { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) } as unknown as SupabaseClient;
    for (const [label, rows] of cases) {
      const adopted = await adoptWaitingApple(db, CLINIC, { apple: { get: async () => null, forClinic: async () => rows, put: async () => true }, now: () => NOW });
      expect(appleTakesOver(rows, NOW), label).toBe(!!adopted);
    }
    expect(appleTakesOver([row()], NOW)).toBe(true);
    expect(appleTakesOver([row({ environment: "SANDBOX" })], NOW)).toBe(false);
  });

  it("reads the ledger: missing table means no App Store subscription can be waiting; any other error is unknown", async () => {
    const db = (result: { data?: unknown; error?: unknown } | "throw") =>
      ({
        from: () => {
          const q = {
            select: () => q,
            eq: () => q,
            limit: async () => {
              if (result === "throw") throw new Error("socket hang up");
              return result;
            },
          };
          return q;
        },
      }) as unknown as SupabaseClient;
    const rows: AppleLedgerRow[] = [{ status: "ignored_web_active", tier: "starter", environment: "PRODUCTION", period_end: "2026-12-20T00:00:00.000Z" }];
    expect(await readAppleLedger(db({ data: rows, error: null }), CLINIC)).toEqual(rows);
    expect(await readAppleLedger(db({ data: null, error: null }), CLINIC)).toEqual([]);
    expect(await readAppleLedger(db({ data: null, error: { code: "42P01", message: 'relation "public.dentvid_apple_subscriptions" does not exist' } }), CLINIC)).toBe("no ledger");
    expect(await readAppleLedger(db({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.dentvid_apple_subscriptions'" } }), CLINIC)).toBe("no ledger");
    expect(await readAppleLedger(db({ data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } }), CLINIC)).toBeNull();
    expect(await readAppleLedger(db("throw"), CLINIC)).toBeNull();
  });
});

/* ------------------------------------------------------------ owner alerts */

describe("what the owner is told", () => {
  const END = "2026-12-10T00:00:00.000Z";
  const base = () => alerts.customerAtRisk({ clinic: { id: CLINIC, name: "Sample Dental Practice", email: "dr@clinic.example" }, event: "subscription.cancelled", from: "active", to: "active until 2026-12-10, then cancelled" });

  it("keeps the alert's key, title and question, and replaces the lines that were about plans stopping now", () => {
    const a = cancellationAlert(base(), { result: "sent", endsAt: END, email: "dr@clinic.example" });
    expect(a.key).toBe(base().key);
    expect(a.titleEn).toBe(base().titleEn);
    expect(a.todo).toEqual(base().todo);
    expect(a.done).toEqual([
      "The clinic keeps getting its weekly videos until 2026-12-10; then the plan ends, and its library stays until 2027-03-10 unless it chooses a plan again.",
      "The clinic was sent a written confirmation in its language with both dates.",
    ]);
    expect(libraryUntil(new Date(END)).toISOString().slice(0, 10)).toBe("2027-03-10");
  });

  it("asks for a confirmation by hand exactly when the clinic should have had one and did not", () => {
    const byHand = (result: string) => cancellationAlert(base(), { result, endsAt: END, email: "dr@clinic.example" }).todo.length > base().todo.length;
    for (const result of ["failed", "migration missing", "not checked", "no email", "unverified", "disabled", "no email key", "bad date", "account deletion"]) expect(byHand(result), result).toBe(true);
    for (const result of ["sent", "already sent", "timed out", "app store takes over", "demo clinic", "test account", "no clinic", "not active"]) expect(byHand(result), result).toBe(false);
    const noAddress = cancellationAlert(base(), { result: "failed", endsAt: END, email: null });
    expect(noAddress.todo[0]).toBe("Confirm the cancellation to the clinic by hand: weekly videos until 2026-12-10, library kept until 2027-03-10.");
  });

  it("never says the plan ends when the App Store takes over", () => {
    const a = cancellationAlert(base(), { result: "app store takes over", endsAt: END });
    expect(a.done.join(" ")).not.toMatch(/plan ends|library stays/);
    expect(a.done.join(" ")).toMatch(/takes over/);
  });

  it("a confirmation that did not go out: one alert per clinic, kind and day, with what to write", () => {
    const a = confirmNotSentAlert({ clinic: { id: CLINIC, email: "dr@clinic.example" }, kind: "plan_changed", result: "failed", detail: "the plan is now Practice." });
    expect(a).toMatchObject({ key: `confirm_not_sent:${CLINIC}:plan_changed`, severity: "warning", titleEn: "A plan change confirmation did not reach the clinic" });
    expect(a.what[0]).toBe("The written confirmation of the plan change did not go out (failed: the email could not be sent).");
    expect(a.todo[0]).toBe("Send dr@clinic.example a short confirmation by hand: the plan is now Practice.");
    expect([...CONFIRM_PROBLEM].sort()).toEqual(["failed", "migration missing", "not checked"]);
  });
});
