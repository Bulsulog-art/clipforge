import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { deliveryWeek, dvSession } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { clinicLocale, dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { AppHomeView } from "@/components/dentvid/app-screens";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { appSendsToFunnel, billingReturn, paymentDeclined, showFirstWeek } from "@/lib/dentvid/onboarding";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { readWeekDelay } from "@/lib/dentvid/ops-server";
import { weekDelivered, weekJobId } from "@/lib/dentvid/week-job";
import { dentvidQueue } from "@/lib/queue";
import type { FirstWeekJob } from "@/lib/dentvid/first-week-state";
import { adminOrNull, loadAppBillingPanel, paymentSeen } from "@/lib/dentvid/billing-state";
import { marksBrowserInternal } from "@/lib/dentvid/internal-traffic";
import { InternalMark } from "@/components/dentvid/internal-mark";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await clinicLocale()).home.metaTitle, robots: { index: false } };
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ billing?: string; status?: string }> }) {
  const { db, user } = await dvSession();
  if (!user) redirect(dvHref("/dentvideo/start?mode=signin"));

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  // No clinic yet: the onboarding wizard describes it (and shows the preview).
  if (!clinic) redirect(dvHref("/dentvideo/start?step=clinic"));
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string; country?: string };
  const locale = await dvLocale(profile.language);

  const [{ items }, plan, sp] = await Promise.all([loadItems(db, user.id), loadClinicPlan(db, clinic.id), searchParams]);
  // Dodo returns to ?billing=success whatever happened and says how it went in &status= (a declined card is "failed").
  const billing = billingReturn(sp.billing, sp.status);
  // A refused card is not a cancelled checkout: say what happened.
  const declined = paymentDeclined(sp.billing, sp.status);
  // Not paid yet, and nothing to show: back to the preview / plans.
  if (appSendsToFunnel(plan.plan, billing, items.length)) {
    redirect(dvHref(billing === "cancelled" ? `/dentvideo/start?step=plan&billing=cancelled${declined ? "&payment=failed" : ""}` : "/dentvideo/start"));
  }

  // "This week" is the week being delivered: from the Saturday-evening batch on, the coming Monday's.
  const week = deliveryWeek();
  const generated = items.filter((i) => i.kind === "generated");
  // Only usable videos count: a week that ended with nothing but rejected topics can be made again (api/dentvideo/week).
  const madeThisWeek = weekDelivered(items, week);
  const admin = await adminOrNull();
  // ?billing=success shows "being made" only with evidence of a payment (or right after the return from checkout).
  const seen = billing === "success" && plan.plan === "trial" && !madeThisWeek ? await paymentSeen(clinic.id, admin) : true;
  // Paused by DentVideo (admin): nothing is being made, so never "your first week is being made".
  const firstWeek = !plan.adminPaused && showFirstWeek({ plan: plan.plan, billing, madeThisWeek, everMade: generated.some((i) => i.status !== "failed"), paymentSeen: seen });
  // A run that is being retried or is delayed: the library says so calmly (never an error).
  const weekDelay = plan.canMake ? await readWeekDelay(clinic.id, week) : null;
  // The first week's job, so a card that waits far longer than promised can offer "try again".
  const firstWeekJob = firstWeek && plan.plan === "active" ? await readWeekJob(clinic.id, week) : undefined;
  const b = appText(locale).billing;
  const notice = billing === "cancelled" ? (declined ? b.paymentFailed : b.cancelled) : null;
  // Not paying: the plan picker — unless buying would double-charge (on hold → update the card, payment being confirmed, cancelled but paid up).
  const panel = plan.canMake ? null : await loadAppBillingPanel({ id: clinic.id, plan: plan.plan, dodo_subscription_id: plan.subscriptionId, adminPaused: plan.adminPaused }, admin);

  return (
    <>
      {/* Owner / QA / e2e signed in: this browser is internal traffic from now on (lib/dentvid/internal-flag). */}
      {marksBrowserInternal(user) && <InternalMark />}
      <AppHomeView
        locale={locale}
        clinicName={profile.name}
        country={profile.country}
        plan={plan}
        items={items}
        firstWeek={firstWeek}
        madeThisWeek={madeThisWeek}
        currentWeek={week}
        weekDelay={weekDelay}
        firstWeekJob={firstWeekJob}
        notice={notice}
        plans={dvAvailablePlans()}
        billingIssue={panel && panel.kind !== "plans" ? panel : null}
      />
    </>
  );
}

/** The week's job state and when it was queued; undefined when the queue does not answer within 1.5 s. */
async function readWeekJob(clinicId: string, week: string): Promise<FirstWeekJob> {
  const ask = (async (): Promise<FirstWeekJob> => {
    const job = await dentvidQueue.getJob(weekJobId(clinicId, week));
    if (!job) return { state: null, createdAt: null };
    return { state: await job.getState(), createdAt: typeof job.timestamp === "number" ? job.timestamp : null };
  })().catch(() => undefined);
  const timeout = new Promise<undefined>((r) => setTimeout(() => r(undefined), 1_500));
  return Promise.race([ask, timeout]);
}
