import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { dvSession } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { RecordView, type ShootCard } from "@/components/dentvid/app-screens";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { dodoApiKey } from "@/lib/dentvid/dodo-account";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).record.metaTitle, robots: { index: false } };
}

export default async function RecordPage() {
  const { db, user } = await dvSession();
  if (!user) redirect(dvHref("/dentvideo/start"));
  const [{ rows }, { data: clinic }] = await Promise.all([
    loadItems(db, user.id),
    db.from("dentvid_clinics").select("id, profile").eq("owner_id", user.id).maybeSingle(),
  ]);
  const locale = await dvLocale((clinic?.profile as { language?: string } | undefined)?.language);
  const cards = rows
    .filter((r) => r.shoot_card)
    .slice(0, 5)
    .map((r) => ({ title: r.title, card: r.shoot_card as ShootCard }));

  // Starter has no own recordings: the page shows what Practice adds instead of an upload that would be refused.
  const plan = clinic ? await loadClinicPlan(db, clinic.id) : null;

  // Only whether a key exists reaches the page — never the key.
  return <RecordView locale={locale} cards={cards} plan={plan} selfServe={!!dodoApiKey()} />;
}
