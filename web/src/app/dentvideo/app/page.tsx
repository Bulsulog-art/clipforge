import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dvSession, weekOf } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { Library } from "@/components/dentvid/library";
import { RememberLocale } from "@/components/dentvid/chrome";
import { FirstWeek } from "@/components/dentvid/first-week";
import { PlanPanel, PlanStatus } from "@/components/dentvid/plan-panel";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { appSendsToFunnel, showFirstWeek } from "@/lib/dentvid/onboarding";
import { DV_FOUNDING, dvAvailablePlans, foundingOfferOpen, foundingCode } from "@/lib/dentvid/billing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).home.metaTitle, robots: { index: false } };
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  // No clinic yet: the onboarding wizard describes it (and shows the preview).
  if (!clinic) redirect("/dentvideo/start?step=clinic");
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string };
  const locale = await dvLocale(profile.language);
  const t = appText(locale).home;

  const [{ items }, plan, { billing }] = await Promise.all([loadItems(db, user.id), loadClinicPlan(db, clinic.id), searchParams]);
  // Not paid yet, and nothing to show: back to the preview / plans.
  if (appSendsToFunnel(plan.plan, billing, items.length)) {
    redirect(billing === "cancelled" ? "/dentvideo/start?step=plan&billing=cancelled" : "/dentvideo/start");
  }

  const week = weekOf();
  const generated = items.filter((i) => i.kind === "generated");
  const madeThisWeek = generated.some((i) => i.week_of === week && i.status !== "failed");
  const firstWeek = showFirstWeek({ plan: plan.plan, billing, madeThisWeek, everMade: generated.some((i) => i.status !== "failed") });
  const b = appText(locale).billing;
  const notice = billing === "cancelled" ? b.cancelled : null;

  return (
    <main lang={locale} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      {firstWeek && (
        <div className="mb-12">
          <FirstWeek locale={locale} paid={plan.plan === "active"} />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-dv-muted">{profile.name ?? t.yourClinic}</p>
          {firstWeek ? (
            <h2 className="dv-display text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h2>
          ) : (
            <h1 className="dv-display text-[2.5rem] leading-[1.05] sm:text-5xl">{t.title}</h1>
          )}
          <p className="mt-2 max-w-2xl text-dv-body">{t.lead}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <PlanStatus locale={locale} state={plan.plan} tier={plan.tier} renewsAt={plan.renewsAt} />
          <Link href="/dentvideo/app/settings" className="text-sm text-[#0f5c5c] underline-offset-4 hover:underline">
            {t.settings}
          </Link>
        </div>
      </div>
      {notice && (
        <p role="status" className="mt-6 rounded-xl bg-[#e6efed] px-4 py-3 text-sm text-[#0f5c5c]">
          {notice}
        </p>
      )}
      {!plan.canMake && !firstWeek && (
        <div className="mt-8">
          <PlanPanel
            locale={locale}
            state={plan.plan}
            options={dvAvailablePlans()}
            founding={foundingOfferOpen() ? { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() } : null}
          />
        </div>
      )}
      {!(firstWeek && items.length === 0) && (
        <div className="mt-8">
          <Library
            locale={locale}
            items={items}
            locked={!plan.canMake}
            canStartWeek={plan.canMake && !firstWeek && !madeThisWeek}
          />
        </div>
      )}
    </main>
  );
}
