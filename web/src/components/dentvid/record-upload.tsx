"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser, BUCKET } from "@/lib/dentvid/supabase";

const MAX_MB = 500;

export function RecordUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "queued" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setState("error");
      setError(`Please keep recordings under ${MAX_MB} MB (about 10 minutes of phone video).`);
      return;
    }
    setState("uploading");
    setError(null);
    try {
      const db = dvBrowser();
      const { data: u } = await db.auth.getUser();
      if (!u.user) throw new Error("Please sign in again.");
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase().slice(0, 4);
      const path = `${u.user.id}/recordings/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw new Error(upErr.message);
      const res = await fetch("/api/dentvideo/recording", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not start processing.");
      setState("queued");
      setTimeout(() => router.push("/dentvideo/app"), 2500);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  }

  return (
    <div className="rounded-2xl border border-[#e8e1d5] bg-white p-6">
      <label className="block text-sm font-medium">
        Your recording (vertical or landscape, 1–10 minutes)
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 w-full rounded-xl border border-[#d9d1c3] bg-white px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-[#e6efed] file:px-3 file:py-1"
        />
      </label>
      <button
        onClick={upload}
        disabled={!file || state === "uploading" || state === "queued"}
        className="mt-4 rounded-full bg-[#0f5c5c] px-6 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60"
      >
        {state === "uploading" ? "Uploading…" : state === "queued" ? "Received — making your clips" : "Upload and make clips"}
      </button>
      {state === "queued" && <p className="mt-3 text-sm text-[#0f5c5c]">Your clips will appear in your library in about 10 minutes.</p>}
      {error && <p className="mt-3 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
    </div>
  );
}
