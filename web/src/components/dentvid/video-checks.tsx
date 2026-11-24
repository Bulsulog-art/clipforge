import { Play, ShieldCheck } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { checkedText, fillChecked } from "@/content/dentvideo-checked";
import { helpHref } from "@/content/dentvideo-help-links";
import { dvHref } from "@/lib/dentvid/host";
import { countryName, ruleCountry } from "@/lib/dentvid/rule-countries";

/**
 * Showing the work on a video, on its library card and in the review:
 *
 *   CheckedLine  "Software-checked: clinical accuracy, advertising rules (Germany),
 *                picture and sound. How we check", one quiet line, only for a
 *                video whose stored results prove it (lib/dentvid/item-checks.ts)
 *   ScriptText   the narration (or what the dentist says in a recorded clip),
 *                sentence by sentence, with a time to play from where the
 *                stored subtitles give one, and the sentence our check marked
 *                where the stored review says which one
 *
 * No state: safe in server and client components, small in the bundle.
 */

/**
 * What the stored results prove was checked (lib/dentvid/item-checks.ts checkedOf). Present only when
 * both software reviews passed on the script and the caption; `picture` when the picture and sound
 * measurement also ran clean on the very file the clinic sees.
 */
export type Checked = { picture: boolean };

/** One sentence of the script: `at` (seconds) where the stored subtitles time it, `marked` where the stored review quotes it. */
export type ScriptLine = { text: string; at?: number; marked?: true };

/** "0:14", "1:05". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The parts of the line, in the page's language: what was checked, and nothing it cannot prove. */
export function checkedParts(locale: Locale, checked: Checked, country?: string | null): string[] {
  const t = checkedText(locale);
  const own = ruleCountry(country);
  return [t.accuracy, own ? fillChecked(t.adsIn, { country: countryName(locale, own) }) : t.adsGeneral, ...(checked.picture ? [t.picture] : [])];
}

export function CheckedLine({ locale, checked, country, className = "" }: { locale: Locale; checked?: Checked; country?: string | null; className?: string }) {
  if (!checked) return null;
  const t = checkedText(locale);
  return (
    <p className={`flex items-start gap-1.5 text-xs leading-relaxed text-dv-muted ${className}`} data-checked-line>
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dv-teal" aria-hidden="true" />
      <span className="min-w-0">
        {fillChecked(t.line, { parts: checkedParts(locale, checked, country).join(t.sep) })}{" "}
        <a
          href={dvHref(helpHref(locale, "how-we-check"))}
          target="_blank"
          rel="noopener"
          data-help-link="how-we-check"
          className="whitespace-nowrap font-medium text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal"
        >
          {t.how}
        </a>
      </span>
    </p>
  );
}

/**
 * The script, one sentence per row. With `onSeek` (the review player), a timed sentence starts with a
 * button that plays the video from there; without it the time is plain text.
 */
export function ScriptText({ locale, lines, recording = false, onSeek }: { locale: Locale; lines: ScriptLine[]; recording?: boolean; onSeek?: (seconds: number) => void }) {
  const t = checkedText(locale);
  return (
    <div data-script>
      <p className="text-sm font-semibold text-dv-ink">{recording ? t.spoken : t.narration}</p>
      <ol className="mt-1.5 space-y-1.5">
        {lines.map((l, n) => {
          const time = l.at !== undefined ? clock(l.at) : null;
          return (
            <li key={n} className={`flex items-start gap-2 ${l.marked ? "rounded-lg bg-[#fdf6ea] p-2 ring-1 ring-inset ring-[#f0dcb5]" : ""}`} data-marked={l.marked ? "" : undefined}>
              {time &&
                (onSeek ? (
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() => onSeek(l.at!)}
                    aria-label={fillChecked(t.playFrom, { time })}
                    className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-dv-teal-50 px-2 text-xs font-semibold tabular-nums text-dv-teal hover:bg-dv-teal/15"
                  >
                    <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                    {time}
                  </button>
                ) : (
                  <span dir="ltr" className="inline-flex min-h-8 shrink-0 items-center px-1 text-xs font-semibold tabular-nums text-dv-muted">
                    {time}
                  </span>
                ))}
              <span className={`min-w-0 flex-1 ${time ? "pt-1" : ""}`}>
                {l.marked && <span className="block text-xs font-semibold text-[#7a4b00]">{t.marked}</span>}
                <span dir="auto" className="block text-start leading-relaxed text-dv-body">
                  {l.text}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
