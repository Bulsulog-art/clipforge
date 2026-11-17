import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";

// The app speaks the clinic's language, which may be Japanese or Arabic: both faces are declared
// here (only the glyph slices a page uses are ever downloaded).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JapaneseFont />
      <ArabicFont />
      {children}
    </>
  );
}
