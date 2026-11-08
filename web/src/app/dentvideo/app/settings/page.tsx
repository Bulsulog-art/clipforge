import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvSession } from "@/lib/dentvid/auth";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { ClinicForm } from "@/components/dentvid/clinic-form";
import { RememberLocale } from "@/components/dentvid/chrome";
import type { ClinicProfile } from "@/lib/dentvid/profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).settings.metaTitle, robots: { index: false } };
}

export default async function Settings() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");
  const { data: clinic } = await db.from("dentvid_clinics").select("profile, logo_path").eq("owner_id", user.id).maybeSingle();
  const profile = (clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined;
  const locale = await dvLocale(profile?.language);
  const t = appText(locale).settings;
  return (
    <main lang={locale} className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-2 text-[#4a5a57]">{t.lead}</p>
      <div className="mt-8">
        <ClinicForm locale={locale} initial={profile} logoPath={clinic?.logo_path} submitLabel={t.save} />
      </div>
    </main>
  );
}
