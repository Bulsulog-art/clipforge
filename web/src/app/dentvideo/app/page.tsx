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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).home.metaTitle, robots: { index: false } };
}

export default async function AppHome() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();
  const profile = (clinic?.profile ?? {}) as { name?: string; language?: string };
  const locale = await dvLocale(profile.language);
  const t = appText(locale).home;

  if (!clinic) {
    return (
      <main lang={locale} className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t.setupTitle}</h1>
        <p className="mt-2 text-[#4a5a57]">{t.setupLead}</p>
        <div className="mt-8"><ClinicForm locale={locale} /></div>
      </main>
    );
  }

  const { items } = await loadItems(db, user.id);

  return (
    <main lang={locale} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7a77]">{profile.name ?? t.yourClinic}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-[#4a5a57]">{t.lead}</p>
        </div>
        <Link href="/dentvideo/app/settings" className="text-sm text-[#0f5c5c] underline-offset-4 hover:underline">
          {t.settings}
        </Link>
      </div>
      <div className="mt-8">
        <Library locale={locale} items={items} canStartWeek={!items.some((i) => i.kind === "generated" && i.week_of === weekOf())} />
      </div>
    </main>
  );
}
