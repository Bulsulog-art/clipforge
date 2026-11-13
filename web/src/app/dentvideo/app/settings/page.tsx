import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { dvSession } from "@/lib/dentvid/auth";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { SettingsView } from "@/components/dentvid/app-screens";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { adminOrNull, loadAppBillingPanel } from "@/lib/dentvid/billing-state";
import { logoSignedUrl } from "@/lib/dentvid/logo-url";
import { dodoApiKey } from "@/lib/dentvid/dodo-account";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).settings.metaTitle, robots: { index: false } };
}

export default async function Settings() {
  const { db, user } = await dvSession();
  if (!user) redirect(dvHref("/dentvideo/start?mode=signin"));
  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  if (!clinic) redirect(dvHref("/dentvideo/start?step=clinic"));
  const profile = (clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined;
  const locale = await dvLocale(profile?.language);
  const [plan, logoUrl] = await Promise.all([clinic ? loadClinicPlan(db, clinic.id) : null, logoSignedUrl(db, clinic?.logo_path as string | null | undefined)]);
  const admin = await adminOrNull();
  const panel = plan && !plan.canMake ? await loadAppBillingPanel({ id: clinic.id, plan: plan.plan, dodo_subscription_id: plan.subscriptionId }, admin) : null;
  return (
    <SettingsView
      locale={locale}
      profile={profile}
      logoPath={clinic?.logo_path as string | null | undefined}
      logoUrl={logoUrl}
      plan={plan}
      plans={dvAvailablePlans()}
      billingIssue={panel && panel.kind !== "plans" ? panel : null}
      // Only whether a key exists reaches the page — never the key.
      selfServe={!!dodoApiKey()}
      accountEmail={user.email ?? null}
    />
  );
}
