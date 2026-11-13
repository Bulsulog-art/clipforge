import type { Metadata } from "next";
import { headers } from "next/headers";
import { dvAdmin, BUCKET } from "@/lib/dentvid/supabase";
import { APPROVE_TTL_DAYS, loadPostView, supabasePostLinkStore, type PostView } from "@/lib/dentvid/post-link";
import { lifecycleConfig } from "@/lib/dentvid/lifecycle";
import { unsubscribeSecret } from "@/lib/dentvid/unsubscribe-token";
import { requestLocale } from "@/lib/dentvid/request-locale";
import { asLocale } from "@/lib/dentvid/locale";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";
import { postingText } from "@/content/dentvideo-posting";
import { PostNow } from "@/components/dentvid/post-now";
import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";

/**
 * "Approve & share" for one video, from the Monday email (no login; the
 * signed link is the key — lib/dentvid/post-link.ts). Viewing changes
 * nothing; the page's button approves (POST /api/dentvideo/post).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: postingText("en").page.metaTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function PostPage({ searchParams }: { searchParams: Promise<{ t?: string; v?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const fallback = asLocale(requestLocale(h.get("cookie"), h.get("accept-language"))) ?? "en";
  const appUrl = `${lifecycleConfig().base}/app`;
  let view: PostView = { state: "invalid", locale: fallback };
  const limit = await limitChecks([{ key: `rl:post:ip:${clientIp(h)}`, rule: LIMITS.unsubscribeIp }]);
  if (limit.ok) {
    try {
      view = await loadPostView(sp.t, sp.v, { store: supabasePostLinkStore(dvAdmin(), BUCKET), secret: unsubscribeSecret(), fallbackLocale: fallback });
    } catch (e) {
      console.error("[dentvideo] post link failed", (e as Error).message);
      view = { state: "nothing", locale: fallback };
    }
  }
  return (
    <>
      <JapaneseFont />
      <ArabicFont />
      <PostNow view={view} token={sp.t ?? ""} appUrl={appUrl} ttlDays={APPROVE_TTL_DAYS} />
    </>
  );
}
