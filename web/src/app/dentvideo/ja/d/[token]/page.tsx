import type { Metadata } from "next";
import { DemoRoute, demoRouteMetadata, type DemoParams } from "@/components/dentvid/demo-route";

// A personalised demo link (Japanese): never cached or indexed (components/dentvid/demo-page).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: DemoParams): Promise<Metadata> {
  return demoRouteMetadata("ja", (await params).token);
}

export default async function JapaneseDemo({ params }: DemoParams) {
  return <DemoRoute locale="ja" token={(await params).token} />;
}
