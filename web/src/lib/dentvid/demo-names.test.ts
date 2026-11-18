import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Demo data must never show a name or handle that could belong to a real clinic:
 * a real practice could find itself in our screenshots, emails or sample posts.
 * Every demo clinic is plainly fictional ("Sample Dental Practice", "Örnek Diş
 * Kliniği", "サンプル歯科" …) and carries no social handle.
 *
 * These are the names and handles that were used before and were taken out.
 * If one comes back anywhere in web/src or web/public text, this test fails.
 */
export const RETIRED_DEMO_NAMES = [
  // English
  "Riverside Dental", "riverside.dental", "riversidedental", "riverside-dental",
  "Sunrise Dental", "sunrisedental", "Smile Studio", "smilestudio", "smile_studio", "smile_clinic",
  "Harbour Smiles", "Oakwood Dental Care", "Kingsway Dental", "Brightside Dentistry", "Meadow Lane Dental", "Smile Dental",
  // German
  "Zahnarztpraxis am Park", "zahnarzt-am-park", "Zahnzentrum Mitte", "Praxis Dr. Weber", "Zahnärzte am Markt", "Lächelwerk",
  // Spanish
  "Clínica Dental Sonrisa", "clinicasonrisa", "Dental Mediterráneo",
  // French
  "Cabinet Dentaire du Parc", "cabinet-du-parc", "Centre Dentaire Lumière", "Cabinet Dr Martin",
  // Polish
  "Gabinet Stomatologiczny Uśmiech", "Gabinet Uśmiech", "gabinet-usmiech", "Dentica Kraków",
  // Japanese
  "さくら歯科", "sakura-dental", "みなと歯科",
  // Arabic
  "عيادة الابتسامة", "مركز النور لطب الأسنان", "smile-dental.example",
  // Turkish (PR #194)
  "Gülümse Diş", "gulumsedis", "Dentpark", "Beyaz Diş Kliniği",
  // Sample sign-off handles (PR #194)
  "demodisklinigi", "demodentalstudio", "demozahnarztpraxis", "clinicadentaldemo",
  "cabinetdentairedemo", "demo_shika_tokyo", "demodental.dubai", "gabinet.demo.krakow",
];

const TEXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".txt", ".md", ".html", ".xml", ".svg", ".css", ".webmanifest"]);
const WEB = join(__dirname, "..", "..", "..");
const SELF = relative(WEB, __filename);

function* textFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* textFiles(p);
    else if (TEXT.has(extname(name).toLowerCase())) yield p;
  }
}

/** Every retired name in `text`, case-insensitive. */
export function retiredNamesIn(text: string): string[] {
  const t = text.toLocaleLowerCase();
  return RETIRED_DEMO_NAMES.filter((n) => t.includes(n.toLocaleLowerCase()));
}

describe("demo clinic names", () => {
  it("the matcher catches each retired name in any case and passes the fictional ones", () => {
    for (const n of RETIRED_DEMO_NAMES) expect(retiredNamesIn(`x ${n.toUpperCase()} y`)).toContain(n);
    expect(retiredNamesIn('"Sample Dental Practice" "Clínica Dental Ejemplo" "Cabinet Dentaire Exemple" "サンプル歯科" "Przykładowy Gabinet Stomatologiczny" "Demo Zahnarztpraxis" "عيادة أسنان تجريبية" "Örnek Diş Kliniği"')).toEqual([]);
  });

  it("no retired name or handle appears in web/src or web/public text", () => {
    const hits: string[] = [];
    let scanned = 0;
    for (const root of ["src", "public"]) {
      for (const f of textFiles(join(WEB, root))) {
        const rel = relative(WEB, f);
        if (rel === SELF) continue;
        scanned++;
        for (const n of retiredNamesIn(readFileSync(f, "utf8"))) hits.push(`${rel}: ${n}`);
      }
    }
    expect(scanned).toBeGreaterThan(500);
    expect(hits).toEqual([]);
  });
});
