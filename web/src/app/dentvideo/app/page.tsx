import { redirect } from "next/navigation";
import Link from "next/link";
import { dvSession, weekOf } from "@/lib/dentvid/auth";
import { loadItems } from "@/lib/dentvid/items";
import { ClinicForm } from "@/components/dentvid/clinic-form";
import { Library } from "@/components/dentvid/library";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your videos", robots: { index: false } };

export default async function AppHome() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path").eq("owner_id", user.id).maybeSingle();

  if (!clinic) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Tell us about your clinic</h1>
        <p className="mt-2 text-[#4a5a57]">
          Two minutes, once. Your videos are written in your language, about the services you offer, in your colours.
        </p>
        <div className="mt-8"><ClinicForm /></div>
      </main>
    );
  }

  const { items } = await loadItems(db, user.id);
  const name = (clinic.profile as { name?: string }).name ?? "Your clinic";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7a77]">{name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your videos</h1>
          <p className="mt-2 max-w-2xl text-[#4a5a57]">
            Every video is checked for clinical accuracy and health-advertising rules, and measured for sound and picture.
            Nothing is published until you approve it.
          </p>
        </div>
        <Link href="/dentvideo/app/settings" className="text-sm text-[#0f5c5c] underline-offset-4 hover:underline">
          Clinic settings
        </Link>
      </div>
      <div className="mt-8"><Library items={items} canStartWeek={!items.some((i) => i.kind === "generated" && i.week_of === weekOf())} /></div>
    </main>
  );
}
