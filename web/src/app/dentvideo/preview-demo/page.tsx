import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devPreviewMeta, devPreviewOn } from "@/lib/dentvid/private-meta";
import { PreviewDemo } from "./preview-demo";

// A test bench for the live preview: never indexed, and like the other dev
// previews it exists only with DENTVIDEO_DEV_PREVIEW=1 (never set in
// production) — everyone else gets the plain 404, title included.
export const dynamic = "force-dynamic";
export const generateMetadata = (): Metadata => devPreviewMeta("Live preview demo");

export default function PreviewDemoPage() {
  if (!devPreviewOn()) notFound();
  return <PreviewDemo />;
}
