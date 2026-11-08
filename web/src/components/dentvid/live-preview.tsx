"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import { APP_TEXT } from "@/content/dentvideo-app";
import type { Locale } from "@/content/dentvideo";
import { PreviewPlaceholder } from "./phone";

/**
 * A clinic's own weekly videos, playing in a phone before it has paid:
 * the real composition (the worker's, mirrored in web/src/remotion) drawn
 * in the browser by @remotion/player from a static library of reviewed
 * plans and narration (public/dentvideo/preview), painted in the visitor's
 * colour, logo, name and handle. No model call, no server render, no cost
 * per visitor.
 *
 * Remotion is only loaded where this component is rendered: the player is a
 * separate chunk (next/dynamic, ssr: false), so pages that do not show a
 * preview do not carry it.
 */

export type PreviewProfile = {
  name: string;
  language: "en" | "de" | "es" | "fr" | "it" | "pt" | "tr";
  services: string[];
  brandColor?: string /* "#rrggbb" */;
  logoUrl?: string /* object URL or https */;
  handle?: string;
  tone?: string;
};

const Player = dynamic(() => import("./live-preview-player"), {
  ssr: false,
  loading: () => <PreviewPlaceholder />,
});

export function LivePreview({
  profile,
  className,
  backgrounds,
}: {
  profile: PreviewProfile;
  className?: string;
  /** Background photos for the videos (one per scene, in order), when a picker has chosen them. */
  backgrounds?: string[];
}): JSX.Element {
  // Italian and Portuguese clinics see the interface (and, for now, the videos) in English.
  const locale: Locale = profile.language in APP_TEXT ? (profile.language as Locale) : "en";
  return <Player profile={profile} backgrounds={backgrounds} text={APP_TEXT[locale].preview} className={className} />;
}
