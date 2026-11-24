/**
 * "Did you mean …@gmail.com?" under the sign-up's email field. Every later
 * promise (the code to confirm the address, the Monday email, the "your week
 * is ready" email) goes to the address typed here, and phones make
 * dr.smith@gmial.com easy to send. This only ever suggests: it never changes
 * the field by itself and never blocks the form.
 *
 * Pure and browser-safe (no imports), so it runs on each keystroke after the
 * field was left once, and is tested directly (email-typo.test.ts).
 *
 * The rule of thumb is "say nothing unless fairly sure". A clinic's own
 * domain (smiledental.com, drsmith.de) is never flagged: a suggestion needs
 * the domain to be a near miss of one of the providers below, and the near
 * misses are kept narrow on purpose:
 * - the provider's name typed exactly with a broken ending (gmail.con,
 *   gmail.co, gmx.dee); an ending that is a real country domain only counts
 *   for providers that have no country versions (gmail.ca, never yahoo.de);
 * - one slip in the name of a longer provider (gmial, hotmial, outlok, yaho;
 *   two for the longest), starting with the right letter, with the
 *   provider's own ending or a plain slip of it;
 * - for the short names (gmx, web, live, free) only a doubled or swapped
 *   letter (gmxx.de, lvie.com); two-letter names (wp, o2, me) only by ending;
 * - the dot left out (gmailcom) or the ending left off (gmail).
 * Real addresses at other providers that look close (ymail.com, mail.com,
 * mac.com, op.pl, gmx.at …) are on an allow-list and never flagged.
 */

/** The providers a typo is corrected to, most common first (ties go to the earlier one). */
export const EMAIL_PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "wp.pl",
  "o2.pl",
  "interia.pl",
  "orange.fr",
  "free.fr",
  "laposte.net",
  "hotmail.fr",
  "yahoo.fr",
  "hotmail.es",
  "yahoo.es",
] as const;

/** Names whose only address ending is their own: any other ending close to it is a typo. */
const SINGLE_ENDING = new Set(["gmail", "googlemail", "icloud"]);

/**
 * Real mailboxes that sit close to a provider above. Never flagged, whatever
 * the rules would say (belt and braces: most are already out of reach).
 */
const OTHER_REAL = new Set([
  "mail.com",
  "email.com",
  "ymail.com",
  "rocketmail.com",
  "mac.com",
  "my.com",
  "aol.com",
  "msn.com",
  "gmx.com",
  "gmx.at",
  "gmx.ch",
  "gmx.fr",
  "gmx.es",
  "gmx.us",
  "gmx.co.uk",
  "mail.de",
  "email.de",
  "web.com",
  "live.de",
  "live.fr",
  "live.ca",
  "live.cn",
  "live.co.uk",
  "live.nl",
  "live.be",
  "live.it",
  "hotmail.de",
  "hotmail.it",
  "hotmail.co.uk",
  "hotmail.be",
  "hotmail.nl",
  "hotmail.ca",
  "hotmail.com.tr",
  "outlook.de",
  "outlook.fr",
  "outlook.es",
  "outlook.it",
  "outlook.jp",
  "outlook.com.tr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.co.uk",
  "yahoo.co.jp",
  "yahoo.ca",
  "yahoo.com.tr",
  "orange.es",
  "op.pl",
  "onet.pl",
  "vp.pl",
  "interia.eu",
  "free.de",
  "proton.me",
  "pm.me",
]);

/** Country endings (ISO 3166 two-letter codes, plus uk and eu). */
const COUNTRY = new Set(
  (
    "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo bq br bs bt bw by bz " +
    "ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er es et eu fi fj fk " +
    "fm fo fr ga gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir " +
    "is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk " +
    "ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl " +
    "pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sk sl sm sn so sr ss st sv sx sy sz tc td " +
    "tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw"
  ).split(" "),
);
const GENERIC = new Set(["com", "net", "org", "edu", "gov", "info", "biz", "pro"]);

/**
 * Real country endings that are also the usual slips for ".com" (gmail.co,
 * gmail.cm, gmail.om): a typo for any provider, but only one key away.
 */
const SLIP_ENDINGS = new Set(["co", "cm", "om"]);

/** An ending that exists on its own (de, fr, com, co.uk, com.tr) rather than a slip (con, cmo, dee). */
function realEnding(ending: string): boolean {
  const parts = ending.split(".");
  const last = parts[parts.length - 1];
  if (!COUNTRY.has(last) && !GENERIC.has(last)) return false;
  // A second level (co.uk, com.tr, ne.jp) is short letters only.
  return parts.slice(0, -1).every((p) => /^[a-z]{2,3}$/.test(p));
}

/** Optimal string alignment distance: insertions, deletions, substitutions and swapped neighbours cost 1. */
export function typoDistance(a: string, b: string): number {
  const s = Array.from(a);
  const t = Array.from(b);
  const d: number[][] = Array.from({ length: s.length + 1 }, (_, i) => Array.from({ length: t.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[s.length][t.length];
}

/** "gmail.com" → ["gmail", "com"]; "t-online.de" → ["t-online", "de"]; "yahoo.co.uk" → ["yahoo", "co.uk"]. */
function split(domain: string): [string, string] {
  const dot = domain.indexOf(".");
  return dot < 0 ? [domain, ""] : [domain.slice(0, dot), domain.slice(dot + 1)];
}

/** One letter doubled (gmxx) or two neighbours swapped (lvie): the only slips trusted in a short name. */
function slipOfShortName(typed: string, name: string): boolean {
  const a = Array.from(typed);
  const b = Array.from(name);
  if (a.length === b.length + 1) {
    for (let i = 0; i < a.length; i++) {
      if (a.slice(0, i).concat(a.slice(i + 1)).join("") === name && (a[i] === a[i - 1] || a[i] === a[i + 1])) return true;
    }
    return false;
  }
  if (a.length !== b.length) return false;
  const diff = a.flatMap((c, i) => (c === b[i] ? [] : [i]));
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

/**
 * How far a provider's name may be from the typed one. One slip for most
 * names (hotmial, outlok, yaho); two only for the long ones (googlemial,
 * tonlin); none for short names, which have too many real neighbours
 * (life, love, fred). Two slips in a seven-letter name already reach real
 * words (interior, outloud).
 */
const nameSlack = (name: string) => (Array.from(name).length >= 8 ? 2 : Array.from(name).length >= 5 ? 1 : 0);

/** The provider the typed domain most likely meant, or null. `domain` is lower-case and trimmed. */
function nearestProvider(domain: string): string | null {
  // The dot left out, or the ending left off (both pass the browser's own email check).
  if (!domain.includes(".")) {
    const whole = EMAIL_PROVIDERS.find((p) => p.replace(/\./g, "") === domain);
    if (whole) return whole;
    const byName = EMAIL_PROVIDERS.filter((p) => split(p)[0] === domain);
    return byName.length > 0 && Array.from(domain).length >= 5 ? byName[0] : null;
  }
  const [name, ending] = split(domain);
  if (!name || !ending) return null;
  let best: { provider: string; score: number } | null = null;
  for (const provider of EMAIL_PROVIDERS) {
    const [pName, pEnding] = split(provider);
    const dn = typoDistance(name, pName);
    const de = typoDistance(ending, pEnding);
    if (dn + de > 2 || dn + de === 0) continue;
    let ok: boolean;
    if (dn === 0) {
      // The name is right; only the ending is off.
      if (SINGLE_ENDING.has(pName)) ok = true;
      else if (SLIP_ENDINGS.has(ending)) ok = de === 1;
      else ok = !realEnding(ending);
    } else if (Array.from(name)[0] !== Array.from(pName)[0]) {
      ok = false;
    } else if (nameSlack(pName) === 0) {
      // gmxx.de, lvie.com; never a two-letter name (wp, o2, me): op.pl and my.com are real.
      ok = de === 0 && Array.from(pName).length >= 3 && slipOfShortName(name, pName);
    } else {
      // A slip in the name: the ending must be the provider's own, or a plain slip of it.
      ok = dn <= nameSlack(pName) && (de === 0 || (de === 1 && (!realEnding(ending) || SLIP_ENDINGS.has(ending))));
    }
    if (ok && (!best || dn + de < best.score)) best = { provider, score: dn + de };
  }
  return best?.provider ?? null;
}

/**
 * The address the visitor probably meant, or null when the address looks
 * fine, is not an address yet, or its domain is not a near miss of a common
 * provider. The part before the @ is kept exactly as typed.
 */
export function suggestDomain(email: string): string | null {
  const value = email.trim();
  if (!value || /\s/.test(value)) return null;
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  if (local.includes("@")) return null;
  const domain = value.slice(at + 1).toLowerCase().replace(/\.+$/, "");
  if (!domain || domain.startsWith(".") || domain.includes("..")) return null;
  if ((EMAIL_PROVIDERS as readonly string[]).includes(domain) || OTHER_REAL.has(domain)) return null;
  const provider = nearestProvider(domain);
  return provider ? `${local}@${provider}` : null;
}
