import type { Metadata } from "next";
import { RememberLocale } from "@/components/dentvid/chrome";
import { devPreviewMeta } from "@/lib/dentvid/private-meta";
import { notFound } from "next/navigation";
import { asLocale } from "@/lib/dentvid/locale";
import { weekOf } from "@/lib/dentvid/week";
import { slotLabel, slotsFor } from "@/lib/dentvid/posting";
import { APPROVE_TTL_DAYS, type PostView } from "@/lib/dentvid/post-link";
import { PostNow } from "@/components/dentvid/post-now";
import { samplePost } from "@/lib/dentvid/posting-samples";

export const dynamic = "force-dynamic";
export const generateMetadata = (): Metadata => devPreviewMeta("Post page preview");

/**
 * Dev-only: the email's "approve & share" page with a real sample video.
 * 404 unless DENTVIDEO_DEV_PREVIEW=1. Its buttons call a stub endpoint that
 * says yes, so the whole tap path can be walked.
 *
 *   /dentvideo/dev/post?lang=tr&state=pending|approved|invalid|nothing&country=US
 *
 * `country` is the clinic's (profile.country): with lang=en, US shows "Tue 12:30 PM",
 * GB or none the 24-hour "Tue 12:30".
 */
export default async function PostPreview({ searchParams }: { searchParams: Promise<{ lang?: string; state?: string; country?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  const state = sp.state ?? "pending";
  const demo = samplePost(locale);
  const country = /^[A-Za-z]{2}$/.test(sp.country ?? "") ? sp.country!.toUpperCase() : null;
  const slot = slotsFor(weekOf(), 5, { country, locale })[1];
  const view: PostView =
    state === "invalid" || state === "nothing"
      ? { state, locale }
      : {
          state: "ready",
          locale,
          item: {
            id: "00000000-0000-4000-8000-0000000000a1",
            title: demo.title,
            videoUrl: demo.videoUrl,
            thumbUrl: demo.thumbUrl,
            approval: state === "approved" ? "approved" : "pending",
            posted: false,
            texts: demo.texts,
            slot: slotLabel(slot, locale, country),
            // The share kit's subtitle file, as the real page builds it from stored cues.
            srt: "1\n00:00:00,250 --> 00:00:02,900\n" + demo.title + "\n",
          },
        };
  // As on the real page: the header and footer speak the clinic's language.
  return (
    <>
      <RememberLocale locale={view.locale} />
      <PostNow view={view} token="dev" appUrl="/dentvideo/dev/app" ttlDays={APPROVE_TTL_DAYS} endpoint="/dentvideo/dev/post/stub" />
    </>
  );
}
