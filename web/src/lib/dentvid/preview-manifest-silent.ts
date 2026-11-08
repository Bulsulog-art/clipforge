/**
 * The live preview's library for the languages that have no reviewed,
 * narrated preview videos yet (Japanese, Arabic, Polish): short silent plans
 * written by hand in each market's register and within its advertising rules
 * (docs/MARKETS.md) — hygiene topics only, no claims, no prices. They play
 * without sound, so a Japanese, Arabic or Polish clinic previews its own
 * language instead of English.
 *
 * Replace a language with real pipeline output (scripts/build-dentvideo-preview.mts
 * writes preview-manifest.ts) once it has reviewed, narrated videos: an entry
 * in PREVIEW_MANIFEST wins over this one (preview-library.ts).
 */
import type { PreviewEntry } from "./preview-library";

export const SILENT_PREVIEW_MANIFEST: Record<"ja" | "ar" | "pl", PreviewEntry[]> = {
  "ja": [
    {
      "id": "cleaning-shiseki-to-cleaning",
      "category": "cleaning",
      "service": "歯のクリーニング",
      "title": "歯石とクリーニング",
      "seconds": 28.0,
      "narrated": false
    },
    {
      "id": "gum-haguki-kara-no-shukketsu",
      "category": "gum",
      "service": "歯周病の予防",
      "title": "歯ぐきからの出血",
      "seconds": 29.0,
      "narrated": false
    },
    {
      "id": "children-shiage-migaki",
      "category": "children",
      "service": "小児歯科",
      "title": "子どもの仕上げみがき",
      "seconds": 28.5,
      "narrated": false
    }
  ],
  "ar": [
    {
      "id": "cleaning-tanzif-al-jir",
      "category": "cleaning",
      "service": "تنظيف الأسنان",
      "title": "تنظيف الجير",
      "seconds": 29.0,
      "narrated": false
    },
    {
      "id": "gum-nazif-al-litha",
      "category": "gum",
      "service": "علاج اللثة",
      "title": "نزيف اللثة",
      "seconds": 29.0,
      "narrated": false
    },
    {
      "id": "children-tafrish-asnan-al-atfal",
      "category": "children",
      "service": "طب أسنان الأطفال",
      "title": "تفريش أسنان الأطفال",
      "seconds": 28.5,
      "narrated": false
    }
  ],
  "pl": [
    {
      "id": "cleaning-kamien-nazebny",
      "category": "cleaning",
      "service": "Higienizacja",
      "title": "Kamień nazębny i higienizacja",
      "seconds": 29.5,
      "narrated": false
    },
    {
      "id": "gum-krwawienie-dziasel",
      "category": "gum",
      "service": "Leczenie dziąseł",
      "title": "Krwawienie dziąseł",
      "seconds": 29.0,
      "narrated": false
    },
    {
      "id": "children-szczotkowanie-u-dzieci",
      "category": "children",
      "service": "Stomatologia dziecięca",
      "title": "Szczotkowanie zębów u dzieci",
      "seconds": 28.5,
      "narrated": false
    }
  ]
};
