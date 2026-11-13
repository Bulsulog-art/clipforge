/** Dev-only stand-in for POST /api/dentvideo/post: always yes. 404 unless DENTVIDEO_DEV_PREVIEW=1. */
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") return new Response("Not found", { status: 404 });
  return Response.json({ ok: true, stored: true });
}
