import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";
import type { Metadata } from "next";

// The sign-up page is a client component, so its noindex lives here.
export const metadata: Metadata = {
  title: "Start",
  robots: { index: false, follow: false },
};

// Sign-up speaks the visitor's language, which may be Japanese or Arabic: both faces are declared
// here (only the glyph slices a page uses are ever downloaded).
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JapaneseFont />
      <ArabicFont />
      {children}
    </>
  );
}
