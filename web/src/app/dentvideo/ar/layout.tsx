import { ArabicFont } from "@/components/dentvid/font-ar";

// The Arabic pages have their own folder (not [locale]) so that only they, of all the landings,
// load the Arabic web font.
export default function ArabicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArabicFont />
      {children}
    </>
  );
}
