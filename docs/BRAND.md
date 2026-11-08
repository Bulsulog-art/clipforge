# DentVideo brand

DentVideo makes compliant, narrated patient-education videos for dental clinics. The brand should feel
**calm, clinical-trustworthy and warm**: a careful colleague, not a startup shouting. This file is the
source of truth for the logo, colour, type and layout rules used under `/dentvideo` (dentvideo.com).

## Logo

- **Mark**: a molar whose crown carries a rounded play glyph (knocked out, even-odd), on a deep-teal
  rounded tile (64-unit grid, radius 16, top-left → bottom-right gradient `#167269 → #0b4a48`, 14 % white
  hairline rim). The cusp between the two crown lobes is softened so it never reads as a heart.
- **Wordmark**: "DentVideo" in Plus Jakarta Sans Bold, tracking −35, outlined to paths (no font
  dependency). "Dent" in ink, "Video" in brand teal (`#8fd1c6` on dark).
- **Lockup**: tile + 14-unit gap + wordmark, cap height = 27/64 of the tile, optically centred.
- Source of truth: `web/src/components/dentvid/mark.tsx` (`DvIcon`, `DvLogo`, path constants).
  Static exports in `web/public/dentvideo/`: `icon.svg`, `logo.svg`, `logo-dark.svg`, `icon-32.png`,
  `apple-icon.png` (180), `icon-512.png`. Regenerate the static files from the constants if the mark changes.
- Checked rendered at 16, 32, 128 and 512 px: the tooth silhouette reads at 16 px; the play glyph
  appears from 32 px.

**Do**: use `tone="light"` on paper/sand/white, `tone="dark"` on ink or deep teal; keep clear space ≥ half
the tile height on all sides; minimum lockup height 20 px, minimum icon 16 px.
**Don't**: recolour the tile, stretch, add shadows/outlines/glows to the wordmark, set the wordmark in live
text, place the lockup on busy video frames, or put the light lockup on `#0f5c5c` (use dark).

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `dv-teal` | `#0f5c5c` | Brand, primary actions, links |
| `dv-teal-600` | `#167269` | Gradients, glows |
| `dv-teal-900` | `#0b3f3e` | Dark sections ("checked twice", guide CTA) |
| `dv-teal-950` | `#082e2d` | Footer |
| `dv-teal-300` | `#8fd1c6` | Accent on dark (checks, "Video") |
| `dv-teal-50/100` | `#eef5f2` / `#dcebe7` | Tints, soft badges |
| `dv-paper` | `#faf7f2` | Page background (warm off-white) |
| `dv-sand` / `-200` | `#f5efe6` / `#efe7da` | Alternate sections, icon wells |
| `dv-line` / `dv-edge` | `#e8e1d5` / `#d9d1c3` | Hairlines / input borders |
| `dv-ink` | `#14211f` | Headings, primary text |
| `dv-body` | `#3d4c49` | Body copy (≈ 8.4:1 on paper) |
| `dv-muted` | `#5b6a67` | Secondary/small text (≈ 5.3:1 on paper, 5:1 on sand; replaces `#6b7a77`, which failed AA for small text) |

Warm clay `#b6774f` appears only as a sample "clinic colour" swatch in illustrations. No neon, no purple,
no saturated gradients; glows are large, blurred and low-opacity.

## Type

- **Display**: Instrument Serif 400 (`.dv-display`) for H1/H2 and step numerals. Tracking −1.2 %,
  leading 0.98–1.05, `text-wrap: balance`. Scale: H1 44 / 60 / 76 px (mobile / sm / lg),
  H2 38 / 48 / 56 px.
- **Text/UI**: Plus Jakarta Sans 400–700 (`--dv-font-sans`). Body 17 px / 1.65, H3 18 px semibold,
  small 14 px, captions 12–13 px. Both fonts load with `latin-ext` (Turkish, German, French, Spanish).
- OG images use the same two faces from `web/assets/fonts/` (OFL).

## Layout and components

- Content width `max-w-6xl` (72 rem), gutters 16 px (mobile) / 24 px. Section rhythm 96 px mobile,
  128 px desktop. Card padding 24–28 px; grid gaps 16–20 px.
- Buttons (`.dv-btn-primary/-secondary/-light`): pills, 600 weight, primary has a 1 px inner top
  highlight and a soft teal drop shadow; secondary is white with a hairline ring.
- Cards (`.dv-card`): white, 20 px radius, hairline ring + layered soft shadow
  (0 0 0 1px / 0 1px 2px / 0 12px 32px). Fields (`.dv-field`): 14 px radius, teal focus halo.
- Texture: faint 44 px clinical grid masked to the centre (`.dv-grid`); fine SVG film grain on tinted
  surfaces (`.dv-grain`). Never both at full strength in the same place.
- Product shots: real sample videos in a CSS phone frame (`PhoneFrame`), with small floating cards that
  reuse real copy (patient question, "ready for your review", the three checks).
- Focus: 2 px teal outline, 3 px offset, on every link/button/summary (mint on dark).
- Motion: one short rise on hero load and a slow 6 px float on hero cards, all disabled under
  `prefers-reduced-motion`; the hero video only autoplays (muted) when motion is allowed and always has a
  pause/play control.

## Research notes (what was applied)

Patterns taken from high-star open-source landing work (cruip/open-react-template, magicui):

- Pair a distinctive display face with a neutral text face (open-react-template: Nacelle + Inter) →
  Instrument Serif + Plus Jakarta Sans.
- Buttons with an inset 1 px light highlight and a gradient fill instead of a flat colour.
- Device frames with exact screen insets around real media (magicui `iphone`), video muted/looped/playsInline.
- Layered "hairline + soft" card shadows (magicui `bento-grid`) instead of borders.
- Background patterns (grid/dots) faded with a radial mask, plus subtle SVG `feTurbulence` noise
  (magicui `grid-pattern`, `noise-texture`).
- Motion restraint: a single entrance stagger; no marquee, particles or cursor effects.

## Copy

All user-facing text comes from `web/src/content/dentvideo.ts` and `dentvideo-app.ts`. Design changes never
add claims, numbers or testimonials.
