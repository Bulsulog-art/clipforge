import { readyEmail } from "./email";
import type { Rendered } from "./email-layout";
import { lowestMonthlyUsd } from "./lifecycle";
import {
  monthlyEmail,
  notPostedEmail,
  objectionsEmail,
  paymentProblemEmail,
  sampleEmail,
  startEmail,
  welcomeEmail,
} from "./lifecycle-email";
import { pickPreviews } from "./preview-library";
import { resetEmail } from "./reset-email";
import { codeEmail } from "./verify-email-message";

/**
 * Every email DentVideo sends, rendered with sample data — for the dev
 * preview route (/dentvideo/dev/email?kind=…), the tests (every kind in every
 * language) and design review. No I/O.
 */
export const SAMPLE_KINDS = [
  "code",
  "reset",
  "welcome",
  "start",
  "sample",
  "objections",
  "ready",
  "ready-recording",
  "not-posted",
  "monthly",
  "payment-failed",
  "payment-hold",
] as const;
export type SampleKind = (typeof SAMPLE_KINDS)[number];

const BASE = "https://dentvideo.com";
const CLINIC = "00000000-0000-4000-8000-000000000001";
const UNSUB = `${BASE}/api/dentvideo/unsubscribe?t=${CLINIC}.sample-signature`;
/** A sample https image (the DentVideo app icon) standing in for logos and posters. */
const IMG = `${BASE}/dentvideo/icon-512.png`;

export function sampleEmailFor(kind: SampleKind, language: string, opts: { brand?: boolean } = {}): Rendered {
  const clinicName = "Smile & Co Dental";
  const brand = opts.brand === false ? undefined : { color: "#2E7D6B", logoUrl: null };
  const nudge = { language, clinicName, unsubscribeUrl: UNSUB, brand };
  const preview = `${BASE}/start?step=preview&lang=${language}`;
  const plan = `${BASE}/start?step=plan&lang=${language}`;
  switch (kind) {
    case "code":
      return codeEmail({ language, code: "482913" });
    case "reset":
      return resetEmail({ language, link: `${BASE}/reset?token_hash=pkce_0123456789abcdef&lang=${language}` });
    case "welcome":
      return welcomeEmail({ language, clinicName, appUrl: `${BASE}/app`, brand });
    case "start":
      return startEmail({ ...nudge, url: preview });
    case "sample":
      return sampleEmail({ ...nudge, url: preview, titles: pickPreviews(["Implants", "Teeth whitening", "Cleanings"], language).map((e) => e.title) });
    case "objections":
      return objectionsEmail({ ...nudge, url: plan, fromUsd: lowestMonthlyUsd() });
    case "ready":
    case "ready-recording":
      return readyEmail({
        kind: kind === "ready" ? "week" : "recording",
        counts: { ready: 4, flagged: 1 },
        clinicName,
        language,
        appUrl: `${BASE}/app`,
        thumbs: ["Proper brushing", "Whitening myths", "Caring for aligners", "Kids' teeth"].map((title) => ({ url: IMG, title, href: `${BASE}/app` })),
        approveUrl: `${BASE}/api/dentvideo/approve?t=${CLINIC}.2026-11-09.1790000000.sample-signature`,
        brand,
      })!;
    case "not-posted":
      return notPostedEmail({ ...nudge, url: `${BASE}/app`, approved: 3, pending: 2 });
    case "monthly":
      return monthlyEmail({ ...nudge, url: `${BASE}/app`, year: 2026, month: 10, stats: { made: 20, approved: 17, shared: 6 } });
    case "payment-failed":
    case "payment-hold":
      return paymentProblemEmail({ language, clinicName, kind: kind === "payment-failed" ? "failed" : "on_hold", fix: "portal", appUrl: `${BASE}/app`, brand });
  }
}
