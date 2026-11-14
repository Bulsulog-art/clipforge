/**
 * Addresses people type or guess from other SaaS sites (dentvideo.com/pricing,
 * /login, /tr/start …) that have no page of their own: the middleware sends
 * them to the page that answers them instead of a 404. An optional language
 * prefix is kept ("/tr/pricing" → the Turkish landing's plans; "/de/login" →
 * sign-in in German).
 *
 * Kept out of lib/dentvid/host.ts, which ships to the browser with every
 * DentVideo page (dvHref): only the middleware needs this.
 */
const ALIAS = /^(?:\/(en|de|es|tr|fr|ja|ar|pl))?\/(pricing|plans|prices|login|log-in|signin|sign-in|signup|sign-up|register|start|samples|examples|demo|features|how-it-works|contact|contact-us|impressum|company)\/?$/i;

/** Landing sections a guessed address names: /samples → the landing's sample videos. */
const SECTION: Record<string, string> = { samples: "samples", examples: "samples", demo: "samples", features: "how", "how-it-works": "how" };

/** The dentvideo.com path (with query and hash) a guessed address should go to, or null when it is not one. */
export function aliasFor(pathname: string, search: string): string | null {
  const q = new URLSearchParams(search);
  const qs = () => (q.toString() ? `?${q.toString()}` : "");
  if (/^\/en\/?$/i.test(pathname)) return `/${qs()}`;
  const m = ALIAS.exec(pathname);
  if (!m) return null;
  const locale = m[1]?.toLowerCase();
  const what = m[2].toLowerCase();
  // "/start" without a prefix is the real sign-up page.
  if (what === "start" && !locale) return null;
  const home = !locale || locale === "en" ? "/" : `/${locale}`;
  if (what === "pricing" || what === "plans" || what === "prices") return `${home}${qs()}#pricing`;
  if (SECTION[what]) return `${home}${qs()}#${SECTION[what]}`;
  // Contact details (email, company, address) are on the imprint, in every language.
  if (/^(contact|contact-us|impressum|company)$/.test(what)) return `${!locale || locale === "en" ? "" : `/${locale}`}/imprint${qs()}`;
  if (/^(login|log-in|signin|sign-in)$/.test(what)) q.set("mode", "signin");
  if (locale && !q.has("lang")) q.set("lang", locale);
  return `/start${qs()}`;
}
