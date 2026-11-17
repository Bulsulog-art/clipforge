import type { Metadata } from "next";
import { DemoRoute, demoRouteMetadata, type DemoParams } from "@/components/dentvid/demo-route";

// A personalised demo link (English): never cached or indexed (components/dentvid/demo-page).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: DemoParams): Promise<Metadata> {
  return demoRouteMetadata("en", (await params).token);
}

export default async function EnglishDemo({ params }: DemoParams) {
  return <DemoRoute locale="en" token={(await params).token} />;
}
