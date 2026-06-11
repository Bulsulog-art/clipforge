import type { Metadata } from "next";
import { FallbackLanding } from "@/components/fallback-landing";

/**
 * Web fallback for the Universal Link `https://clipforge.bulsulabs.xyz/clips/<id>`.
 * When the iOS app is installed Apple deep-links straight in; otherwise this
 * marketing surface renders (clip media is RLS-locked anyway).
 */
export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "View this ClipForge clip",
    description:
      "Open this clip in the ClipForge app — the AI viral clip studio for creators.",
    openGraph: {
      title: "ClipForge — AI viral clip studio",
      description: "Drop a long video. Get a dozen viral clips, captioned and ready.",
    },
  };
}

export default async function ClipFallbackPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  return <FallbackLanding kind="clip" id={clipId} />;
}
