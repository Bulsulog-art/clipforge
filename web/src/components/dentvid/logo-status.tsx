"use client";

import { LOGO_TEXT, logoNotes, logoProblemText, type LogoText } from "@/content/dentvideo-logo";
import { prepareLogo, type PreparedLogo } from "@/lib/dentvid/logo-prepare";
import type { Locale } from "@/content/dentvideo-locales";

/** The landing teaser's logo state (kept in the teaser, worded and toggled here, off its first load). */
export type LogoState = { reading?: boolean; text?: LogoText; error?: string; prepared?: PreparedLogo; notes?: string[]; keep?: boolean };

/** LogoStatus for the teaser: the white-background toggle lives here, not in the landing's own code. */
export function TeaserLogoStatus({ st, set, show, locale }: { st: LogoState; set: (s: LogoState) => void; show: (f: File) => void; locale: Locale }) {
  return (
    <LogoStatus
      text={LOGO_TEXT[locale]}
      reading={st.reading}
      error={st.error}
      notes={st.notes}
      cleaned={!!st.prepared?.cleaned && !!st.prepared.original}
      keepBackground={!!st.keep}
      onToggleBackground={async () => {
        const f = st.keep ? st.prepared?.file : await st.prepared?.original?.();
        if (!f) return;
        set({ ...st, keep: !st.keep });
        show(f);
      }}
    />
  );
}

/** Prepares a chosen logo and words the outcome in the visitor's language (the landing loads this lazily). */
export async function readLogo(file: File, locale: Locale): Promise<{ text: LogoText; error?: string; prepared?: PreparedLogo; notes: string[] }> {
  const text = LOGO_TEXT[locale];
  const r = await prepareLogo(file);
  return r.ok ? { text, prepared: r, notes: logoNotes(text, r) } : { text, error: logoProblemText(text, r.problem), notes: [] };
}

/**
 * What happened to the chosen logo, under the fields: reading, why it could
 * not be used (role=alert), or what was done to it, with a way back.
 * Shared with the wizard's brand fields.
 */
export function LogoStatus({
  text,
  reading,
  error,
  notes = [],
  cleaned,
  keepBackground,
  onToggleBackground,
}: {
  text?: LogoText | null;
  reading?: boolean;
  error?: string | null;
  notes?: string[];
  cleaned: boolean;
  keepBackground: boolean;
  onToggleBackground: () => void;
}) {
  if (reading)
    return (
      <p role="status" className="-mt-2 flex items-center gap-2 text-xs text-dv-muted" data-testid="dv-logo-reading">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-dv-teal border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
        {text?.reading ?? "…"}
      </p>
    );
  if (error)
    return (
      <p role="alert" className="-mt-2 text-xs font-medium leading-relaxed text-[#8a1f1f]" data-testid="dv-logo-error">
        {error}
      </p>
    );
  if (!text || (!cleaned && !notes.length)) return null;
  return (
    <div role="status" className="-mt-2 grid gap-1 text-xs leading-relaxed text-dv-muted" data-testid="dv-logo-notes">
      {cleaned && (
        <p>
          {keepBackground ? null : <>{text.cleaned} </>}
          <button type="button" onClick={onToggleBackground} className="font-semibold text-dv-teal underline underline-offset-2 hover:no-underline">
            {keepBackground ? text.removeBackground : text.keepOriginal}
          </button>
        </p>
      )}
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
}
