import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/content/dentvideo-locales";
import { CHECKER, CHECKER_PATH } from "@/content/dentvideo-checker";
import { dvHref } from "@/lib/dentvid/host";

/** On the advertising-rules guides: try the rules on your own post, in the checker. */
export function CheckerCallout({ locale }: { locale: Locale }) {
  const c = CHECKER[locale];
  return (
    <aside className="flex flex-col gap-4 rounded-[1.25rem] bg-dv-teal-50 p-5 ring-1 ring-dv-teal-100 sm:flex-row sm:items-center sm:justify-between sm:p-6" data-testid="checker-callout">
      <div>
        <p className="text-lg font-semibold leading-snug text-dv-ink">{c.h1}</p>
        <p className="mt-1 text-sm leading-relaxed text-dv-body">{c.ui.privacy}</p>
      </div>
      <Link href={dvHref(CHECKER_PATH[locale])} className="dv-btn dv-btn-primary shrink-0 px-5 py-3">
        {c.ui.check}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </aside>
  );
}
