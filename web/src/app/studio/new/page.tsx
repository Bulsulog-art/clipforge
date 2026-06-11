"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, Loader2, ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const NICHES = [
  "motivation", "business", "finance", "health", "tech", "education",
  "comedy", "fitness", "spirituality", "history", "science", "lifestyle",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("motivation");
  const [language, setLanguage] = useState("en");
  const [clipPrompt, setClipPrompt] = useState("");
  // "" = Auto: the niche template picks the best caption style automatically.
  const [captionStyle, setCaptionStyle] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function submitUrl() {
    if (!url.match(/youtube\.com|youtu\.be|tiktok\.com/i)) {
      return toast.error("Drop a YouTube or TikTok URL.");
    }
    setLoading(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceType: "youtube", sourceUrl: url, niche, language, prompt: clipPrompt || undefined, captionStyle: captionStyle || undefined, aspect }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return toast.error(err.error ?? "Failed to create job");
    }
    const { jobId } = await res.json();
    toast.success("Project created. Transcribing…");
    router.push(`/studio/${jobId}`);
  }

  async function submitUpload() {
    if (!file) return toast.error("Pick a video file.");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("niche", niche);
    form.append("language", language);
    if (captionStyle) form.append("captionStyle", captionStyle);
    form.append("aspect", aspect);
    if (clipPrompt.trim()) form.append("prompt", clipPrompt.trim());
    const res = await fetch("/api/jobs/upload", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return toast.error(err.error ?? "Upload failed");
    }
    const { jobId } = await res.json();
    toast.success("Uploaded. Processing…");
    router.push(`/studio/${jobId}`);
  }

  return (
    <main className="container max-w-2xl py-10">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to studio
      </Link>

      <h1 className="text-3xl font-bold">New clips</h1>
      <p className="mt-1 text-sm text-muted-foreground">Paste a link and pick your topic — we&apos;ll do the rest.</p>

      <div className="mt-8 flex gap-2 rounded-lg border border-border bg-muted p-1">
        <button
          onClick={() => setTab("url")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tab === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Link2 className="mr-2 inline h-4 w-4" /> URL
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tab === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Upload className="mr-2 inline h-4 w-4" /> Upload
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {tab === "url" ? (
          <div>
            <label className="text-sm font-medium">YouTube or TikTok URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium">Video file (mp4 / mov, ≤ 4GB)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
            />
          </div>
        )}

        {/* The one choice that matters — the niche template auto-tunes captions,
            thumbnail, music and hook tone to fit. Everything else is optional. */}
        <div>
          <label className="text-sm font-medium">What&apos;s it about?</label>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm capitalize outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {NICHES.map((n) => <option key={n} value={n} className="capitalize">{n}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            We auto-tune the captions, thumbnail, music and hooks to fit your niche.
          </p>
        </div>

        {/* Advanced options stay collapsed so a first-timer can just paste + go. */}
        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" /> Customize
              <span className="font-normal text-muted-foreground">· optional</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${showAdvanced ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {showAdvanced && (
            <div className="space-y-5 border-t border-border p-4">
              <div>
                <label className="text-sm font-medium">Aspect ratio</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[
                    { id: "9:16", label: "9:16 · Reels/TikTok" },
                    { id: "1:1", label: "1:1 · Feed" },
                    { id: "16:9", label: "16:9 · YouTube" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={aspect === s.id}
                      onClick={() => setAspect(s.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        aspect === s.id
                          ? "bg-brand text-white shadow-sm shadow-brand/30"
                          : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Caption style</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[
                    { id: "", label: "Auto" },
                    { id: "bold-pop", label: "Bold Pop" },
                    { id: "clean", label: "Clean" },
                    { id: "neon", label: "Neon" },
                    { id: "hype", label: "HYPE" },
                    { id: "minimal", label: "Minimal" },
                  ].map((s) => (
                    <button
                      key={s.id || "auto"}
                      type="button"
                      aria-pressed={captionStyle === s.id}
                      onClick={() => setCaptionStyle(s.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        captionStyle === s.id
                          ? "bg-brand text-white shadow-sm shadow-brand/30"
                          : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  What to clip <span className="font-normal text-muted-foreground">· optional</span>
                </label>
                <input
                  value={clipPrompt}
                  onChange={(e) => setClipPrompt(e.target.value)}
                  maxLength={280}
                  placeholder='e.g. "every time I talk about pricing" or "just the funny moments"'
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Leave empty and we find your most viral moments automatically.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Caption language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={tab === "url" ? submitUrl : submitUpload}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-semibold text-white outline-none transition hover:bg-brand-glow focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Processing…" : "Generate clips"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Takes a few minutes. We&apos;ll caption, score and get them ready to post.
        </p>
      </div>
    </main>
  );
}
