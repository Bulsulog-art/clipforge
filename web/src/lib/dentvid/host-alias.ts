/**
 * Addresses people type or guess from other SaaS sites (dentvideo.com/pricing,
 * /login, /tr/start, /contact, /support …) that have no page of their own: the
 * middleware sends them to the page that answers them instead of a 404. An
 * optional language prefix is kept ("/tr/pricing" → the Turkish landing's
 * plans; "/de/login" → sign-in in German; "/de/support" → the German help
 * center's contact block).
 *
 * Kept out of lib/dentvid/host.ts, which ships to the browser with every
 * DentVideo page (dvHref): only the middleware needs this.
 */
const ALIAS =
  /^(?:\/(en|de|es|tr|fr|ja|ar|pl))?\/(pricing|plans|prices|login|log-in|signin|sign-in|signup|sign-up|register|start|samples|demo|features|how-it-works|contact|contact-us|support|faq|help-center|customer-service|security|impressum|company)\/?$/i;

/** Landing sections a guessed address names: /demo → the landing's sample videos. (/examples is a page of its own; /samples goes there.) */
const SECTION: Record<string, string> = { demo: "samples", features: "how", "how-it-works": "how" };

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
  // The language's own prefix for a page that exists in every language (/examples, /help, /imprint …).
  const prefix = !locale || locale === "en" ? "" : `/${locale}`;
  if (what === "pricing" || what === "plans" || what === "prices") return `${home}${qs()}#pricing`;
  // /samples: the examples showcase in that language.
  if (what === "samples") return `${prefix}/examples${qs()}`;
  if (SECTION[what]) return `${home}${qs()}#${SECTION[what]}`;
  // Someone looking for a person to write to: the help center's "still stuck" block, with the
  // support address, in their language (the help answers sit right above it).
  if (/^(contact|contact-us|support|faq|help-center|customer-service)$/.test(what)) return `${prefix}/help${qs()}#help-stuck`;
  // The company's legal details (name, address, registration) are on the imprint, in every language.
  if (what === "impressum" || what === "company") return `${prefix}/imprint${qs()}`;
  // How personal data is protected: the privacy policy.
  if (what === "security") return `${prefix}/privacy${qs()}`;
  if (/^(login|log-in|signin|sign-in)$/.test(what)) q.set("mode", "signin");
  if (locale && !q.has("lang")) q.set("lang", locale);
  return `/start${qs()}`;
}
