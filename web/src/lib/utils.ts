import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export const TIER_LIMITS = {
  free: { videos: 2, clipsPerVideo: 5, watermark: true, autopost: false },
  starter: { videos: 10, clipsPerVideo: Infinity, watermark: false, autopost: false },
  pro: { videos: 50, clipsPerVideo: Infinity, watermark: false, autopost: true },
  agency: { videos: 250, clipsPerVideo: Infinity, watermark: false, autopost: true },
} as const;

export type Tier = keyof typeof TIER_LIMITS;
