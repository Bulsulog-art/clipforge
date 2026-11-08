import { notFound } from "next/navigation";

// Deeper unknown addresses (dentvideo.com/a/b) get the DentVideo 404 too,
// inside the header and footer, rather than Next's unbranded default.
export default function UnknownDentVideoPage(): never {
  notFound();
}
