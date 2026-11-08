"use client";

/**
 * PLACEHOLDER — the real live preview (animated, branded sample videos in a
 * phone frame, drawn in the browser at zero cost) is built separately and
 * replaces this file at merge. Same path, same exported API; keep it tiny.
 */
export type PreviewProfile = {
  name: string;
  language: "en" | "de" | "es" | "fr" | "it" | "pt" | "tr";
  services: string[];
  brandColor?: string;
  logoUrl?: string;
  handle?: string;
  tone?: string;
};

export function LivePreview({ profile, className = "" }: { profile: PreviewProfile; className?: string }) {
  const c = /^#?[0-9a-fA-F]{6}$/.test(profile.brandColor ?? "") ? `#${profile.brandColor!.replace(/^#/, "")}` : "#0f5c5c";
  return (
    <div className={`relative mx-auto aspect-[9/19.5] w-full max-w-[18rem] rounded-[2.6rem] bg-[#151d1c] p-[10px] shadow-[0_40px_80px_-30px_rgba(8,46,45,0.55)] ${className}`}>
      <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-[2.1rem] p-5 text-white" style={{ background: `linear-gradient(165deg, ${c} 0%, #0b1110 120%)` }}>
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-[20px] w-[32%] -translate-x-1/2 rounded-full bg-black" />
        {profile.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL or signed URL
          <img src={profile.logoUrl} alt="" className="absolute right-4 top-10 max-h-10 max-w-[45%] rounded-md bg-white/90 object-contain p-1" />
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{profile.services[0] ?? ""}</p>
        <p className="mt-2 text-xl font-bold leading-tight">{profile.name || "—"}</p>
        {profile.handle ? <p className="mt-3 w-max rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">@{profile.handle.replace(/^@/, "")}</p> : null}
      </div>
    </div>
  );
}
