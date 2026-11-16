import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { videoFileName } from "./app-ui";

/**
 * The subtitle file of a video: SRT (what "Download subtitles (.srt)" gives,
 * and what YouTube and Facebook take) or WebVTT (the web's own format), built
 * on download from the cues the worker stored on the item (dentvid_items.subtitles,
 * worker/src/dental/subtitles.ts: the narrator's exact words, timed from the
 * narration's measured pauses). No model call, nothing stored twice.
 *
 * Stored cues are worker-written, but they are checked again here: a cue is
 * kept only with finite, ordered times inside 0–600 s and plain text, and the
 * text is stripped of anything that could end a cue early ("-->", blank lines)
 * or read as markup in a WebVTT player.
 */

export type Cue = { start: number; end: number; text: string };
export type SubtitleFormat = "srt" | "vtt";

const MAX_SECONDS = 600;
const MAX_CUES = 400;

/** The valid cues of a stored `subtitles` value, or [] (none, malformed, or a video made before subtitles existed). */
export function storedCues(value: unknown): Cue[] {
  const cues = (value as { cues?: unknown } | null | undefined)?.cues;
  if (!Array.isArray(cues)) return [];
  const out: Cue[] = [];
  let last = 0;
  for (const c of cues.slice(0, MAX_CUES)) {
    const { start, end, text } = (c ?? {}) as { start?: unknown; end?: unknown; text?: unknown };
    if (typeof start !== "number" || typeof end !== "number" || typeof text !== "string") continue;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < last - 0.001 || end <= start || end > MAX_SECONDS) continue;
    const clean = cleanText(text);
    if (!clean) continue;
    out.push({ start, end, text: clean });
    last = end;
  }
  return out;
}

function cleanText(text: string): string {
  return text
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/-->/g, "→")
    .replace(/[<>]/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}

function stamp(seconds: number, sep: "," | "."): string {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(r, 3)}`;
}

export function toSrt(cues: Cue[]): string {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n");
}

export function toVtt(cues: Cue[], language?: string): string {
  const head = `WEBVTT${language && /^[a-z]{2}$/.test(language) ? `\nLanguage: ${language}` : ""}\n`;
  return [head, ...cues.map((c, i) => `${i + 1}\n${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`)].join("\n");
}

/** "how-long-does-sensitivity-last.srt" — the same slug as the video's download name. */
export function subtitleFileName(title: string, format: SubtitleFormat): string {
  return videoFileName(title).replace(/\.mp4$/i, "") + `.${format}`;
}

/**
 * GET one of the owner's videos as a subtitle file. Owner-scoped (RLS and
 * owner_id): another clinic's id is simply not found. 404 when the video has
 * no stored cues (made before subtitles existed, or a clip from a recording).
 */
export async function subtitleResponse(db: SupabaseClient, ownerId: string, itemId: string, format: SubtitleFormat): Promise<Response> {
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  // "*": the subtitles column (0025) may not exist on a given database; then there is nothing to give.
  const { data } = await db.from("dentvid_items").select("*").eq("id", itemId).eq("owner_id", ownerId).maybeSingle();
  const row = data as { title?: string; subtitles?: unknown; plan?: { language?: string } | null } | null;
  const cues = storedCues(row?.subtitles);
  if (!row || !cues.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = format === "srt" ? toSrt(cues) : toVtt(cues, row.plan?.language);
  const name = subtitleFileName(row.title ?? "video", format);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": format === "srt" ? "application/x-subrip; charset=utf-8" : "text/vtt; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
