import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvSession } from "@/lib/dentvid/auth";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { ClinicForm } from "@/components/dentvid/clinic-form";
import { RememberLocale } from "@/components/dentvid/chrome";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import { PlanPanel, PlanStatus } from "@/components/dentvid/plan-panel";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { DV_FOUNDING, dvAvailablePlans, foundingOfferOpen, foundingCode } from "@/lib/dentvid/billing";
import { logoSignedUrl } from "@/lib/dentvid/logo-url";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).settings.metaTitle, robots: { index: false } };
}

export default async function Settings() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");
  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  if (!clinic) redirect("/dentvideo/start?step=clinic");
  const profile = (clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined;
  const locale = await dvLocale(profile?.language);
  const t = appText(locale).settings;
  const b = appText(locale).billing;
  const [plan, logoUrl] = await Promise.all([clinic ? loadClinicPlan(db, clinic.id) : null, logoSignedUrl(db, clinic?.logo_path as string | null | undefined)]);
  return (
    <main lang={locale} className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      <h1 className="dv-display text-[2.5rem] leading-[1.05] sm:text-5xl">{t.title}</h1>
      <p className="mt-2 text-dv-body">{t.lead}</p>
      <div className="mt-8">
        <ClinicForm locale={locale} initial={profile} logoPath={clinic?.logo_path} logoUrl={logoUrl} submitLabel={t.save} />
      </div>
      {plan && (
        <section aria-labelledby="billing-title" className="mt-14 border-t border-dv-line pt-10">
          <h2 id="billing-title" className="dv-display text-[2rem] leading-tight">{b.settingsHeading}</h2>
          <div className="mt-3">
            <PlanStatus locale={locale} state={plan.plan} tier={plan.tier} renewsAt={plan.renewsAt} />
          </div>
          {plan.plan === "trial" && (
            <p className="mt-2 text-sm text-dv-body">
              {b.trialNote}{" "}
              <Link href="/dentvideo/start?step=preview" className="font-semibold text-dv-teal underline-offset-4 hover:underline">
                {b.toPreview}
              </Link>
            </p>
          )}
          {!plan.canMake && (
            <div className="mt-6">
              <PlanPanel
                locale={locale}
                state={plan.plan}
                options={dvAvailablePlans()}
                founding={foundingOfferOpen() ? { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() } : null}
              />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
