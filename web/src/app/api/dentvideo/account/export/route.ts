import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { buildAccountExport } from "@/lib/dentvid/account";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";

// POST /api/dentvideo/account/export — everything DentVideo holds about the
// signed-in clinic as one JSON file (GDPR art. 15/20, KVKK md. 11): profile,
// plan, every video's script/caption/review, and 24-hour download links for
// the files in its storage folder. Reads use the owner's own client (RLS).

export async function POST() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited(
    [
      { key: `rl:export:user:${user.id}`, rule: LIMITS.accountExportUser },
      { key: `rl:export:day:${user.id}`, rule: LIMITS.accountExportUserDay },
    ],
    async () => (await dvErrors()).tooMany,
  );
  if (limited) return limited;

  try {
    const data = await buildAccountExport(db, { id: user.id, email: user.email, created_at: user.created_at });
    const day = data.exported_at.slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="dentvideo-export-${day}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("[dentvideo account] export failed", (e as Error).message);
    const err = await accountErrors(await ownClinic(db, user.id).catch(() => null));
    return NextResponse.json({ error: err.exportFailed }, { status: 500 });
  }
}
