import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { dvSession, weekOf } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { AppHomeView } from "@/components/dentvid/app-screens";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { appSendsToFunnel, showFirstWeek } from "@/lib/dentvid/onboarding";
import { DV_FOUNDING, dvAvailablePlans, foundingOfferOpen, foundingCode } from "@/lib/dentvid/billing";
import { readWeekDelay } from "@/lib/dentvid/ops-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).home.metaTitle, robots: { index: false } };
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { db, user } = await dvSession();
  if (!user) redirect(dvHref("/dentvideo/start"));

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  // No clinic yet: the onboarding wizard describes it (and shows the preview).
  if (!clinic) redirect(dvHref("/dentvideo/start?step=clinic"));
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string };
  const locale = await dvLocale(profile.language);

  const [{ items }, plan, { billing }] = await Promise.all([loadItems(db, user.id), loadClinicPlan(db, clinic.id), searchParams]);
  // Not paid yet, and nothing to show: back to the preview / plans.
  if (appSendsToFunnel(plan.plan, billing, items.length)) {
    redirect(dvHref(billing === "cancelled" ? "/dentvideo/start?step=plan&billing=cancelled" : "/dentvideo/start"));
  }

  const week = weekOf();
  const generated = items.filter((i) => i.kind === "generated");
  const madeThisWeek = generated.some((i) => i.week_of === week && i.status !== "failed");
  const firstWeek = showFirstWeek({ plan: plan.plan, billing, madeThisWeek, everMade: generated.some((i) => i.status !== "failed") });
  // A run that is being retried or is delayed: the library says so calmly (never an error).
  const weekDelay = plan.canMake ? await readWeekDelay(clinic.id, week) : null;
  const b = appText(locale).billing;
  const notice = billing === "cancelled" ? b.cancelled : null;

  return (
    <AppHomeView
      locale={locale}
      clinicName={profile.name}
      plan={plan}
      items={items}
      firstWeek={firstWeek}
      madeThisWeek={madeThisWeek}
      currentWeek={week}
      weekDelay={weekDelay}
      notice={notice}
      plans={dvAvailablePlans()}
      founding={foundingOfferOpen() ? { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() } : null}
    />
  );
}
