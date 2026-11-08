import { redirect } from "next/navigation";
import { dvSession } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { RecordUpload } from "@/components/dentvid/record-upload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record a video", robots: { index: false } };

type ShootCard = { opening: string; points: string[]; closing: string; avoid?: string[]; setup?: string[]; minutes?: number };

export default async function RecordPage() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");
  const { rows } = await loadItems(db, user.id);
  const cards = rows
    .filter((r) => r.shoot_card)
    .slice(0, 5)
    .map((r) => ({ title: r.title, card: r.shoot_card as ShootCard }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Record yourself — five minutes is enough</h1>
      <p className="mt-2 max-w-2xl text-[#4a5a57]">
        Patients trust the dentist they can see. Prop your phone at eye level, stand near a window, and talk through one of
        these cards. We cut it into short clips with captions and your logo — your words are never changed, and anything
        worth a second look is flagged for you before posting.
      </p>

      <div className="mt-8"><RecordUpload /></div>

      <h2 className="mt-12 text-xl font-semibold">This week's filming cards</h2>
      {cards.length === 0 ? (
        <p className="mt-3 text-[#4a5a57]">Make this week's videos first — each one comes with a filming card you can use here.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {cards.map(({ title, card }) => (
            <article key={title} className="rounded-2xl border border-[#e8e1d5] bg-white p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-3 text-sm"><span className="font-medium">Start with:</span> “{card.opening}”</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#33423f]">
                {card.points.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
              <p className="mt-3 text-sm"><span className="font-medium">Close with:</span> “{card.closing}”</p>
              {card.avoid?.length ? <p className="mt-3 text-xs text-[#7a4b00]">Avoid: {card.avoid.join(" · ")}</p> : null}
              {card.setup?.length ? <p className="mt-2 text-xs text-[#6b7a77]">Filming: {card.setup.join(" · ")}</p> : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
