import type { Metadata } from "next";

// The sign-up page is a client component, so its noindex lives here.
export const metadata: Metadata = {
  title: "Start",
  robots: { index: false, follow: false },
};

// Sign-up speaks the visitor's language, which may be Japanese or Arabic. The page links that face
// (components/dentvid/font-lazy) only when it is in one of them: declared here for every visitor, the
// Arabic face was preloaded (four weights) and the Japanese rules (about 33 KB) blocked the first paint.
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
