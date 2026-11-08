"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileVideo, Loader2, Upload } from "lucide-react";
import { dvBrowser, BUCKET, DV_SUPABASE_ANON, DV_SUPABASE_URL } from "@/lib/dentvid/supabase";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { RECORDING_MAX_MB, checkRecording, fileSize } from "@/lib/dentvid/app-ui";

/**
 * Upload one recording to the clinic's folder with a progress bar (an
 * XMLHttpRequest to Storage's upload endpoint — the same request the SDK
 * makes, which cannot report progress), then queue it. If that request is
 * refused, the SDK uploads it instead, without progress.
 */
function uploadWithProgress(path: string, file: File, token: string, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (!DV_SUPABASE_URL) return resolve(false);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${DV_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", DV_SUPABASE_ANON);
    xhr.setRequestHeader("content-type", file.type || "video/mp4");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

export function RecordUpload({ locale }: { locale: Locale }) {
  const { record: t, errors } = appText(locale);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "queued" | "error">("idle");
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(f: File | null) {
    setFile(f);
    setError(null);
    setState("idle");
    if (!f) return;
    const problem = checkRecording(f);
    if (problem === "size") setError(fmt(t.tooBig, { mb: RECORDING_MAX_MB }));
    else if (problem) setError(t.wrongFormat);
  }

  async function upload() {
    if (!file || checkRecording(file)) return;
    setState("uploading");
    setPct(null);
    setError(null);
    try {
      const db = dvBrowser();
      const { data: s } = await db.auth.getSession();
      const user = s.session?.user;
      if (!user || !s.session) throw new Error(errors.signIn);
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase().slice(0, 4);
      const path = `${user.id}/recordings/${Date.now()}.${ext}`;
      setPct(0);
      const ok = await uploadWithProgress(path, file, s.session.access_token, setPct);
      if (!ok) {
        setPct(null);
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || "video/mp4" });
        if (upErr) throw new Error(errors.invalidUpload);
      }
      setPct(100);
      const res = await fetch("/api/dentvideo/recording", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? errors.couldNotStart);
      setState("queued");
    } catch (e) {
      setState("error");
      setError((e as Error).message || errors.couldNotStart);
    }
  }

  if (state === "queued") {
    return (
      <div role="status" className="dv-card p-6 sm:p-8">
        <CheckCircle2 className="h-8 w-8 text-dv-teal" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-dv-ink">{t.queued}</h2>
        <p className="mt-1 text-dv-body">{t.queuedNote}</p>
        <Link href="/dentvideo/app" className="dv-btn dv-btn-primary mt-6 w-full px-6 py-3 sm:w-auto">
          {t.backToVideos}
        </Link>
      </div>
    );
  }

  const uploading = state === "uploading";
  const invalid = !!file && !!checkRecording(file);

  return (
    <div className="dv-card p-5 sm:p-8">
      <p id="rec-label" className="text-sm font-semibold text-dv-ink">{t.fileLabel}</p>
      {/* A styled picker: the native control would speak the browser's language, not the clinic's. */}
      <label
        className={`mt-3 flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          uploading ? "pointer-events-none border-dv-line bg-dv-sand/40" : "border-dv-edge bg-dv-paper hover:border-dv-teal hover:bg-dv-teal-50/40"
        }`}
      >
        {file ? <FileVideo className="h-7 w-7 text-dv-teal" aria-hidden="true" /> : <Upload className="h-7 w-7 text-dv-teal" aria-hidden="true" />}
        {file ? (
          <>
            <span className="max-w-full truncate font-semibold text-dv-ink">{file.name}</span>
            <span className="text-sm text-dv-muted">
              {fileSize(file.size, locale)}
              {!uploading && <> · <span className="font-medium text-dv-teal underline underline-offset-4">{t.chooseAnother}</span></>}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-dv-teal">{t.choose}</span>
            <span className="text-sm text-dv-muted">{fmt(t.limits, { mb: RECORDING_MAX_MB })}</span>
          </>
        )}
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
          aria-labelledby="rec-label"
          disabled={uploading}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>

      {uploading && (
        <div className="mt-5" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-dv-ink">{pct === null ? t.uploading : fmt(t.progress, { pct })}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t.uploading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
            className="mt-2 h-2 overflow-hidden rounded-full bg-dv-sand-200"
          >
            <div
              className={`h-full rounded-full bg-dv-teal transition-[width] duration-300 ${pct === null ? "w-1/3 animate-pulse motion-reduce:animate-none" : ""}`}
              style={pct === null ? undefined : { width: `${Math.max(3, pct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-dv-muted">{t.keepOpen}</p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">
          {error}
        </p>
      )}

      <button type="button" onClick={upload} disabled={!file || invalid || uploading} className="dv-btn dv-btn-primary mt-5 w-full px-6 py-3 sm:w-auto">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
        {uploading ? t.uploading : t.upload}
      </button>
    </div>
  );
}
