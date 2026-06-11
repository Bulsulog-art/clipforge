import type { Metadata } from "next";
import { FallbackLanding } from "@/components/fallback-landing";

/**
 * Web fallback for `https://clipforge.bulsulabs.xyz/jobs/<id>` — see
 * `clips/[clipId]/page.tsx` for the rationale.
 */
export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "View this ClipForge render",
    description: "Open this render in the ClipForge app.",
  };
}

export default async function JobFallbackPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <FallbackLanding kind="job" id={jobId} />;
}
