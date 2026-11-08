import type { Metadata } from "next";

// The sign-up page is a client component, so its noindex lives here.
export const metadata: Metadata = {
  title: "Start",
  robots: { index: false, follow: false },
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
