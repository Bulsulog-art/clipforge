import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Thrown from metadata too, so the tab shows the 404's localized title.
export async function generateMetadata(): Promise<Metadata> {
  notFound();
}

// Deeper unknown addresses (dentvideo.com/a/b) get the DentVideo 404 too,
// inside the header and footer, rather than Next's unbranded default.
export default function UnknownDentVideoPage(): never {
  notFound();
}
