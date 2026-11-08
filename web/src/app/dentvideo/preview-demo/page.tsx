import type { Metadata } from "next";
import { PreviewDemo } from "./preview-demo";

// A test bench for the live preview, not a page for search engines.
export const metadata: Metadata = {
  title: "Live preview demo",
  robots: { index: false, follow: false },
};

export default function PreviewDemoPage() {
  return <PreviewDemo />;
}
