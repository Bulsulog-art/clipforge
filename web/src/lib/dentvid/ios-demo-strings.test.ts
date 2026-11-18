import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkText } from "./ad-checker";
import { PAGE_MARKETS, type CheckerMarket } from "./checker-markets";
import type { Locale } from "@/content/dentvideo-locales";

/**
 * The iOS app's demo clinic (ios/DentVideo/App/Sources/Demo/DemoContent.swift) is what the App
 * Store screenshots show as a clinic's posts, closing line and filming card. Those texts must pass
 * the product's own rules for their language's markets, the same code as the public checker: a
 * Turkish close that steers viewers to book ("randevunuzu online alın") would contradict what we
 * sell, in front of every Turkish dentist who looks at the listing.
 *
 * The texts come from ios/DentVideo/scripts/demo-strings.mjs (filming-card "avoid" lines are left
 * out there: they name what not to say).
 */
type DemoString = { lang: string; field: string; text: string };
type DemoModule = { readDemoStrings: () => DemoString[]; extractDemoStrings: (src: string) => DemoString[] };

const SCRIPT = join(__dirname, "..", "..", "..", "..", "ios", "DentVideo", "scripts", "demo-strings.mjs");
const load = async () => (await import(/* @vite-ignore */ SCRIPT)) as DemoModule;

const LANGS: Locale[] = ["en", "tr", "de", "es", "fr", "ja", "ar", "pl"];

function findings(s: DemoString): string[] {
  const markets: readonly CheckerMarket[] = PAGE_MARKETS[s.lang as Locale] ?? [];
  return markets.flatMap((m) => checkText(s.text, m).map((h) => `${s.lang} ${s.field} [${m}] ${h.rule} (${h.verdict}): "${h.match}" in "${s.text}"`));
}

describe("iOS demo clinic texts", () => {
  it("are read for all eight languages, every field", async () => {
    const all = (await load()).readDemoStrings();
    for (const lang of LANGS) {
      const mine = all.filter((s) => s.lang === lang);
      for (const f of ["clinic", "closing", "titles[0]", "captions[0]", "card.opening", "card.points[0]", "card.closing", "topics[0]", "sample[0]", "sample[6]", "sample2[2]"]) {
        expect(mine.some((s) => s.field === f), `${lang} ${f}`).toBe(true);
      }
    }
  });

  it("the check catches a demo line that breaks a market rule", async () => {
    // The lines the TR screenshots used to show, and two general ones.
    const bad: DemoString[] = [
      { lang: "tr", field: "closing", text: "Kontrol randevunuzu online alın." },
      { lang: "tr", field: "card.closing", text: "Muayene için randevu alın, sizin için neyin gerçekçi olduğunu söyleyelim." },
      { lang: "en", field: "captions[0]", text: "The best whitening in town, guaranteed." },
      { lang: "de", field: "card.points[0]", text: "Garantiert schmerzfrei" },
    ];
    for (const s of bad) expect(findings(s), s.text).not.toEqual([]);
    // And extraction reads a block as the app writes it.
    const src = 'static let tr = DemoContent(clinic: "A", city: "B", country: "TR", services: ["x"], closing: "Kontrol randevunuzu online alın.", titles: ["t\\u{00A0}?"], captions: ["c"], tags: ["g"], card: ShootCard(opening: "o", points: ["p"], closing: "k", avoid: ["Önce-sonra iddiaları"], setup: ["s"], minutes: 2))';
    const got = (await load()).extractDemoStrings(src);
    expect(got.find((s) => s.field === "closing")?.text).toBe("Kontrol randevunuzu online alın.");
    expect(got.find((s) => s.field === "titles[0]")?.text).toBe("t ?");
    expect(got.some((s) => s.text === "Önce-sonra iddiaları")).toBe(false);
  });

  it("pass the checker for their language's markets", async () => {
    const all = (await load()).readDemoStrings();
    expect(all.flatMap(findings)).toEqual([]);
  });
});
