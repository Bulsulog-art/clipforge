"use client";

import { useState } from "react";
import Image from "next/image";
import type { AppText } from "@/content/dentvideo-app";
import { fmt } from "@/content/dentvideo-app";
import { backgroundSrc, MAX_PHOTOS } from "@/lib/dentvid/backgrounds";

/**
 * "Background photos" under a generated video: a horizontal strip of the
 * photos suggested for it (curated library, ranked by the video's content).
 * Tapping toggles a photo (1–4); Apply saves them and the video is re-made
 * with them rotating behind the text. The strip only mounts when opened, so a
 * library of cards does not load every thumbnail up front.
 */
export function BackgroundPicker({
  itemId,
  photos,
  t,
  onChanged,
}: {
  itemId: string;
  photos: { suggested: string[]; chosen: string[]; status?: "queued" | "failed" };
  t: AppText["library"]["photos"];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(photos.chosen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updating = photos.status === "queued";
  const changed = picked.length !== photos.chosen.length || picked.some((id, i) => id !== photos.chosen[i]);

  function toggle(id: string) {
    setError(null);
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_PHOTOS ? cur : [...cur, id]));
  }

  async function apply() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/dentvideo/items/${itemId}/backgrounds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ backgrounds: picked }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) setError(body.error ?? t.failed);
    else {
      setOpen(false);
      onChanged();
    }
  }

  return (
    <div className="flex flex-col">
      {photos.status === "failed" && (
        <p role="alert" className="mt-3 rounded-xl bg-[#fbeaea] px-3 py-2 text-sm text-[#8a1f1f]">
          {t.failed}
        </p>
      )}
      <details className="group text-sm" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-dv-teal">
          {t.title}
          <span aria-hidden="true" className="text-dv-muted transition-transform group-open:rotate-45">+</span>
        </summary>
        {open && (
          <div className="pb-3">
            <p className="text-xs text-dv-muted">{t.hint}</p>
            <ul className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-2" aria-label={t.title}>
              {photos.suggested.map((id, i) => {
                const order = picked.indexOf(id);
                const on = order >= 0;
                return (
                  <li key={id} className="shrink-0 snap-start">
                    <button
                      type="button"
                      disabled={updating || saving}
                      onClick={() => toggle(id)}
                      aria-pressed={on}
                      className={`relative block h-32 w-[72px] overflow-hidden rounded-lg ring-offset-2 transition disabled:cursor-not-allowed ${on ? "ring-2 ring-dv-teal" : "ring-1 ring-dv-edge opacity-90 hover:opacity-100"}`}
                    >
                      <Image src={backgroundSrc(id)} alt={fmt(t.photoAlt, { n: i + 1 })} width={72} height={128} sizes="72px" className="h-full w-full object-cover" />
                      {on && (
                        <span aria-hidden="true" className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-dv-teal text-xs font-semibold text-white shadow">
                          {order + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={apply}
                disabled={!changed || picked.length === 0 || saving || updating}
                className="dv-btn dv-btn-primary px-5 py-2.5 text-sm"
              >
                {saving ? t.applying : t.apply}
              </button>
              <span className="text-xs text-dv-muted" aria-live="polite">{fmt(t.selected, { n: picked.length })}</span>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-[#8a1f1f]">{error}</p>}
          </div>
        )}
      </details>
    </div>
  );
}
