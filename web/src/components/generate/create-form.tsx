"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Paperclip, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { ThemePreview } from "./theme-preview";
import { ASPECTS, THEMES, backgroundCss, type AspectId, type ThemeId } from "./themes";

/**
 * The prompt→video screen.
 *
 * One box, one button. Everything else on the page either shows what the
 * result will look like or gets out of the way — the whole promise is that a
 * sentence is enough, so the form must not read like a brief.
 */

const MIN_PROMPT = 3;
const MAX_PROMPT = 500;
const MAX_CLIPS = 8;

/** Written to be worth stealing: each one is a shape that actually renders well. */
const EXAMPLES = [
  "3 signs your morning routine is broken — and the 60-second fix",
  "Why most people quit the gym in week 3, and what the ones who stay do differently",
  "The 2-minute rule that cleared my inbox for good",
  "What $10k in ad spend taught me about writing hooks",
];

type Attachment = { path: string; name: string };

export function CreateForm({ credits, tier }: { credits: number; tier: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectId>("9:16");
  const [themeId, setThemeId] = useState<ThemeId>("midnight");
  const [clips, setClips] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const tooShort = prompt.trim().length < MIN_PROMPT;
  const broke = credits < 1;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_CLIPS - clips.length;
    if (room <= 0) return toast.error(`That's the limit — ${MAX_CLIPS} clips per video.`);

    setUploading(true);
    // One at a time: a person attaching six phone clips on hotel wifi gets a
    // list that fills in steadily instead of six parallel uploads that all
    // crawl and then fail together.
    for (const file of Array.from(files).slice(0, room)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/generate/assets", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? `Couldn't upload ${file.name}`);
        continue;
      }
      const { path, name } = await res.json();
      setClips((c) => [...c, { path, name }]);
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    if (tooShort) return toast.error("Tell us what the video should say.");
    setSubmitting(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        assetPaths: clips.map((c) => c.path),
        aspect,
        theme: themeId,
      }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const err = await res.json().catch(() => ({}));
      if (res.status === 402) {
        toast.error(err.error ?? "You're out of credits.");
        return router.push("/pricing");
      }
      return toast.error(err.error ?? "Couldn't start that. Try again.");
    }

    const { jobId } = await res.json();
    router.push(`/studio/${jobId}`);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div>
        <label htmlFor="prompt" className="text-sm font-medium text-foreground">
          What should the video say?
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
          rows={4}
          autoFocus
          placeholder="One sentence is enough. Say the idea, not the shot list."
          className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3.5 text-base leading-relaxed outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-brand/40"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>We write the shots, find the footage and animate the type.</span>
          <span className={prompt.length > MAX_PROMPT - 40 ? "text-foreground" : ""}>
            {prompt.length}/{MAX_PROMPT}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setPrompt(e)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-xs text-muted-foreground outline-none transition hover:border-brand/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {e.length > 52 ? `${e.slice(0, 50)}…` : e}
            </button>
          ))}
        </div>

        <Field label="Shape" hint="Where you're posting it.">
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={aspect === a.id}
                onClick={() => setAspect(a.id)}
                className={`rounded-xl border px-4 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  aspect === a.id
                    ? "border-brand bg-brand/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-[11px] opacity-70">{a.where}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Look" hint="Colour, type and rhythm. Pick one — you'll see it on the right.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={themeId === t.id}
                onClick={() => setThemeId(t.id)}
                className={`overflow-hidden rounded-xl border text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  themeId === t.id ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/40"
                }`}
              >
                <span
                  className="flex h-14 items-end justify-start p-2"
                  style={{ background: backgroundCss(t) }}
                >
                  <span className="h-1.5 w-8 rounded-full" style={{ background: t.accent }} />
                </span>
                <span className="block bg-card px-2.5 py-2">
                  <span className="block text-xs font-semibold text-foreground">{t.name}</span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">{t.mood}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Your own clips"
          hint={
            clips.length
              ? "We'll cut these in where they fit and fill the rest with matching stock."
              : "Optional. Skip it and we pull matching stock footage for you."
          }
        >
          <input
            ref={fileInput}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="flex flex-wrap items-center gap-2">
            {clips.map((c, i) => (
              <span
                key={c.path}
                className="inline-flex max-w-56 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                <span className="truncate">{i + 1}. {c.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => setClips((list) => list.filter((x) => x.path !== c.path))}
                  className="rounded-full text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {clips.length < MAX_CLIPS && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-1.5 text-xs font-medium text-muted-foreground outline-none transition hover:border-brand/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : clips.length ? "Add another" : "Add clips"}
              </button>
            )}
          </div>
        </Field>

        <button
          onClick={submit}
          disabled={submitting || uploading || tooShort || broke}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white outline-none transition hover:bg-brand-glow focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {submitting ? "Starting…" : "Make my video"}
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {broke ? (
            <>
              You&apos;re out of credits.{" "}
              <Link href="/pricing" className="font-medium text-brand hover:underline">
                {tier === "free" ? "Start a plan" : "Top up"}
              </Link>{" "}
              to keep making videos.
            </>
          ) : (
            <>
              1 credit · about a minute · {credits} credit{credits === 1 ? "" : "s"} left
            </>
          )}
        </p>
      </div>

      <aside className="lg:sticky lg:top-8">
        <ThemePreview theme={theme} aspect={aspect} prompt={prompt} hasClips={clips.length > 0} />
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
          A sketch of the look, not the render. The real one moves, cuts and counts.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
