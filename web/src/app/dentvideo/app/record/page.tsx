import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dvSession } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { RecordUpload } from "@/components/dentvid/record-upload";
import { RememberLocale } from "@/components/dentvid/chrome";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: appText(await dvLocale()).record.metaTitle, robots: { index: false } };
}

type ShootCard = { opening: string; points: string[]; closing: string; avoid?: string[]; setup?: string[]; minutes?: number };

export default async function RecordPage() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");
  const [{ rows }, { data: clinic }] = await Promise.all([
    loadItems(db, user.id),
    db.from("dentvid_clinics").select("profile").eq("owner_id", user.id).maybeSingle(),
  ]);
  const locale = await dvLocale((clinic?.profile as { language?: string } | undefined)?.language);
  const t = appText(locale).record;
  const cards = rows
    .filter((r) => r.shoot_card)
    .slice(0, 5)
    .map((r) => ({ title: r.title, card: r.shoot_card as ShootCard }));

  return (
    <main lang={locale} className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <RememberLocale locale={locale} />
      <h1 className="dv-display text-[2.5rem] leading-[1.05] sm:text-5xl">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-dv-body">{t.lead}</p>

      <div className="mt-8"><RecordUpload locale={locale} /></div>

      <h2 className="mt-12 text-xl font-semibold">{t.cardsHeading}</h2>
      {cards.length === 0 ? (
        <p className="mt-3 text-dv-body">{t.noCards}</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {cards.map(({ title, card }) => (
            <article key={title} className="dv-card p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-3 text-sm"><span className="font-medium">{t.startWith}</span> “{card.opening}”</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#33423f]">
                {card.points.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
              <p className="mt-3 text-sm"><span className="font-medium">{t.closeWith}</span> “{card.closing}”</p>
              {card.avoid?.length ? <p className="mt-3 text-xs text-[#7a4b00]">{t.avoid} {card.avoid.join(" · ")}</p> : null}
              {card.setup?.length ? <p className="mt-2 text-xs text-dv-muted">{t.filming} {card.setup.join(" · ")}</p> : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
