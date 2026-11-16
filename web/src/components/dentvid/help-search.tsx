"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";

/**
 * The help center's search box. The answers are already on the page (server
 * HTML, every one visible without JavaScript); this only hides the ones that
 * don't contain every word typed, and the categories left empty. No index,
 * no request: a few lines that read the page's own text.
 *
 * Matching ignores case and accents ("factura" finds "Facturación",
 * "iptal" finds "İptal"), so a clinic can type the way it speaks.
 */

/** Lowercase, without accents or the Turkish dotless/dotted i difference. */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ı/g, "i");
}

/** Whether `text` contains every word of `query` (both folded). An empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = foldText(text);
  return words.every((w) => hay.includes(w));
}

type Props = {
  label: string;
  placeholder: string;
  none: string;
  /** "{n} answers" / "1 answer". */
  one: string;
  other: string;
};

export function HelpSearch({ label, placeholder, none, one, other }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const articles = Array.from(document.querySelectorAll<HTMLElement>("[data-help-article]"));
    let n = 0;
    for (const a of articles) {
      const hit = matchesQuery(a.textContent ?? "", query);
      a.hidden = !hit;
      if (hit) n += 1;
    }
    for (const s of Array.from(document.querySelectorAll<HTMLElement>("[data-help-section]"))) {
      s.hidden = !s.querySelector("[data-help-article]:not([hidden])");
    }
    setShown(query.trim() ? n : null);
  }, [query]);

  return (
    <div className="mt-8 max-w-2xl" role="search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dv-muted" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-full border border-dv-line bg-white py-3 pe-5 ps-12 text-base text-dv-ink shadow-sm outline-none placeholder:text-dv-muted focus-visible:border-dv-teal focus-visible:ring-2 focus-visible:ring-dv-teal/30"
          data-testid="help-search"
        />
      </div>
      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-dv-muted" data-testid="help-search-status">
        {shown === null ? "" : shown === 0 ? none : shown === 1 ? one : other.replace("{n}", String(shown))}
      </p>
    </div>
  );
}
