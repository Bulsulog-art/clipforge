import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { isAdminUser } from "@/lib/dentvid/admin";
import { DEMO_LOGO_MAX_BYTES, demoPath, isDemoToken, parseDemoInput } from "@/lib/dentvid/demos";
import { createDemo, setDemoDisabled } from "@/lib/dentvid/demos-server";
import { ImageFetchError, checkImageBytes, fetchImageSafely, type FetchedImage } from "@/lib/dentvid/safe-image-fetch";
import { dvUrl } from "@/lib/dentvid/host";
import { demoMessages } from "@/content/dentvideo-demo";
import { adminOrNull, foundingForApp } from "@/lib/dentvid/billing-state";
import { LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * The owner's demo links (/admin/demos):
 *   POST  multipart form — create a demo (optional logo upload or logo URL)
 *   PATCH { token, disabled } — switch one off or back on
 *
 * Admins only (DENTVIDEO_ADMIN_USER_IDS); everyone else gets a plain 404,
 * as the admin pages do. A logo URL is fetched once, server side, through
 * the SSRF guard (lib/dentvid/safe-image-fetch), and the copy is stored —
 * the demo never hotlinks.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });
/** The form's text fields plus a 2 MB logo, with room for multipart framing. */
const MAX_BODY = DEMO_LOGO_MAX_BYTES + 64 * 1024;

async function adminUser(): Promise<{ id: string } | null> {
  try {
    const { user } = await dvSession();
    return user && isAdminUser(user.id) ? { id: user.id } : null;
  } catch {
    return null;
  }
}

async function readBytes(req: Request, max: number): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") ?? "0") > max) return null;
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export async function POST(req: Request) {
  const user = await adminUser();
  if (!user) return NOT_FOUND();
  const limited = await limitChecks([{ key: `rl:demoadmin:user:${user.id}`, rule: LIMITS.demoAdminUser }]);
  if (!limited.ok) return NextResponse.json({ error: "Too many demos in an hour; wait a little." }, { status: 429 });

  const bytes = await readBytes(req, MAX_BODY);
  if (!bytes) return NextResponse.json({ error: "The logo is larger than 2 MB." }, { status: 413 });
  let form: FormData;
  try {
    form = await new Response(bytes as unknown as BodyInit, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return NextResponse.json({ error: "Send the form as multipart/form-data." }, { status: 400 });
  }
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = parseDemoInput({
    clinicName: field("clinicName"),
    city: field("city"),
    country: field("country"),
    language: field("language"),
    colour: field("colour"),
    logoUrl: field("logoUrl"),
    note: field("note"),
    campaign: field("campaign"),
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  let logo: FetchedImage | null = null;
  const file = form.get("logo");
  try {
    if (file && typeof file !== "string" && file.size > 0) {
      if (file.size > DEMO_LOGO_MAX_BYTES) return NextResponse.json({ error: "The logo is larger than 2 MB." }, { status: 400 });
      logo = checkImageBytes(new Uint8Array(await file.arrayBuffer()), file.type || null, DEMO_LOGO_MAX_BYTES);
    } else if (input.logoUrl) {
      logo = await fetchImageSafely(input.logoUrl);
    }
  } catch (e) {
    const msg = e instanceof ImageFetchError ? e.message : "The logo could not be read.";
    return NextResponse.json({ error: `Logo: ${msg}` }, { status: 400 });
  }

  const saved = await createDemo(input, logo, user.id);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.missing ? 503 : 500 });

  const url = dvUrl(demoPath(saved.demo.token, input.language));
  const founding = await foundingForApp(await adminOrNull()).catch(() => ({ open: false }));
  return NextResponse.json({
    token: saved.demo.token,
    url,
    expiresAt: saved.demo.expires_at,
    messages: demoMessages(input.language, input.clinicName, url, founding.open),
  });
}

export async function PATCH(req: Request) {
  const user = await adminUser();
  if (!user) return NOT_FOUND();
  const body = (await req.json().catch(() => null)) as { token?: unknown; disabled?: unknown } | null;
  if (!body || !isDemoToken(body.token) || typeof body.disabled !== "boolean") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ok = await setDemoDisabled(body.token, body.disabled);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not update the demo." }, { status: 500 });
}
