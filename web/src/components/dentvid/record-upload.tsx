"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser, BUCKET } from "@/lib/dentvid/supabase";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";

const MAX_MB = 500;

export function RecordUpload({ locale }: { locale: Locale }) {
  const { record: t, errors } = appText(locale);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "queued" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setState("error");
      setError(fmt(t.tooBig, { mb: MAX_MB }));
      return;
    }
    setState("uploading");
    setError(null);
    try {
      const db = dvBrowser();
      const { data: u } = await db.auth.getUser();
      if (!u.user) throw new Error(errors.signIn);
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase().slice(0, 4);
      const path = `${u.user.id}/recordings/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw new Error(errors.invalidUpload);
      const res = await fetch("/api/dentvideo/recording", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? errors.couldNotStart);
      setState("queued");
      setTimeout(() => router.push("/dentvideo/app"), 2500);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  }

  return (
    <div className="dv-card p-6">
      <label className="block text-sm font-medium">
        {t.fileLabel}
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="dv-field file:mr-3 file:rounded-full file:border-0 file:bg-[#e6efed] file:px-3 file:py-1"
        />
      </label>
      <button
        onClick={upload}
        disabled={!file || state === "uploading" || state === "queued"}
        className="mt-4 dv-btn dv-btn-primary px-6 py-3"
      >
        {state === "uploading" ? t.uploading : state === "queued" ? t.queued : t.upload}
      </button>
      {state === "queued" && <p className="mt-3 text-sm text-[#0f5c5c]">{t.queuedNote}</p>}
      {error && <p className="mt-3 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
    </div>
  );
}
