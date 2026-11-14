"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { htmlLangFor } from "@/lib/dentvid/html-lang";

// See app/layout.
export function HtmlRoot({ pageLocales, children }: { pageLocales: Record<string, string>; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const [{ lang, dir }] = useState(() => htmlLangFor(path, pageLocales));
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      {children}
    </html>
  );
}
