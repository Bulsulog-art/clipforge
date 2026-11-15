import type { Metadata } from "next";
import { adminMeta } from "@/lib/dentvid/private-meta";

// Private: never indexed. Each page checks the admin itself (lib/dentvid/admin-server);
// to anyone else the tab says what the page says — not found (lib/dentvid/private-meta).
export async function generateMetadata(): Promise<Metadata> {
  return adminMeta("Owner dashboard");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
