import { redirect } from "next/navigation";
import { dvSession } from "@/lib/dentvid/auth";
import { ClinicForm } from "@/components/dentvid/clinic-form";
import type { ClinicProfile } from "@/lib/dentvid/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clinic settings", robots: { index: false } };

export default async function Settings() {
  const { db, user } = await dvSession();
  if (!user) redirect("/dentvideo/start");
  const { data: clinic } = await db.from("dentvid_clinics").select("profile, logo_path").eq("owner_id", user.id).maybeSingle();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Clinic settings</h1>
      <p className="mt-2 text-[#4a5a57]">Changes apply to the next videos we make.</p>
      <div className="mt-8">
        <ClinicForm initial={(clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined} logoPath={clinic?.logo_path} submitLabel="Save changes" />
      </div>
    </main>
  );
}
