import type { Metadata } from "next";
import { DemoRoute, demoRouteMetadata, type DemoParams } from "@/components/dentvid/demo-route";

// A personalised demo link (Arabic, right to left): never cached or indexed (components/dentvid/demo-page).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: DemoParams): Promise<Metadata> {
  return demoRouteMetadata("ar", (await params).token);
}

export default async function ArabicDemo({ params }: DemoParams) {
  return <DemoRoute locale="ar" token={(await params).token} />;
}
