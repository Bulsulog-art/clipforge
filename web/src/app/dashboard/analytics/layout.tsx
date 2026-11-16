import { notFound } from "next/navigation";
import { SOCIAL_PUBLISHING } from "@/lib/features";

// Analytics are the stats of posted clips: none exist while posting is off (lib/features).
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  if (!SOCIAL_PUBLISHING) notFound();
  return children;
}
