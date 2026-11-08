import type { Metadata } from "next";

// Private: never indexed. Each page checks the admin itself (lib/dentvid/admin-server).
export const metadata: Metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
