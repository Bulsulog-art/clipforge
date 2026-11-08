import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dvSession, weekOf } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { ClinicForm } from "@/components/dentvid/clinic-form";
import { Library } from "@/components/dentvid/library";
import { RememberLocale } from "@/components/dentvid/chrome";
import { PlanPanel, PlanStatus } from "@/components/dentvid/plan-panel";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { DV_FOUNDING, dvAvailablePlans, foundingOfferOpen } from "@/lib/dentvid/billing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).home.metaTitle, robots: { index: false } };
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  const profile = (clinic?.profile ?? {}) as { name?: string; language?: string };
  const locale = await dvLocale(profile.language);
  const t = appText(locale).home;

  if (!clinic) {
    return (
      <main lang={locale} className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="dv-display text-[2.5rem] leading-[1.05] sm:text-5xl">{t.setupTitle}</h1>
        <p className="mt-2 text-dv-body">{t.setupLead}</p>
        <div className="mt-8"><ClinicForm locale={locale} /></div>
      </main>
    );
  }

  const [{ items }, plan, { billing }] = await Promise.all([loadItems(db, user.id), loadClinicPlan(db, clinic.id), searchParams]);
  const b = appText(locale).billing;
  // Back from Dodo: the webhook usually lands within seconds, so say so.
  const notice = billing === "success" && plan.plan !== "active" ? b.success : billing === "cancelled" ? b.cancelled : null;

  return (
    <main lang={locale} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-dv-muted">{profile.name ?? t.yourClinic}</p>
          <h1 className="dv-display text-[2.5rem] leading-[1.05] sm:text-5xl">{t.title}</h1>
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
      {!plan.canMake && (
        <div className="mt-8">
          <PlanPanel
            locale={locale}
            state={plan.plan}
            options={dvAvailablePlans()}
            founding={foundingOfferOpen() ? { priceUsd: DV_FOUNDING.priceUsd } : null}
          />
        </div>
      )}
      <div className="mt-8">
        <Library
          locale={locale}
          items={items}
          locked={!plan.canMake}
          canStartWeek={plan.canMake && !items.some((i) => i.kind === "generated" && i.week_of === weekOf())}
        />
      </div>
    </main>
  );
}
