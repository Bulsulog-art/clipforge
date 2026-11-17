import { JapaneseFont } from "@/components/dentvid/font-ja";

// The Japanese pages have their own folder (not [locale]) so that only they, of all the landings,
// load the Japanese web font.
export default function JapaneseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JapaneseFont />
      {children}
    </>
  );
}
