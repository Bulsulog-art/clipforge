# dentvideo.com: what the best open-source landing work teaches, and what we took

Written 2026-11-15 for the premium pass on the marketing site (landing, examples, guides, about).
Short and concrete. Anything borrowed is a technique, re-written by hand for this codebase; no
component code was copied. Licenses are noted so that stays checkable.

Network note: this session could read GitHub (raw files, READMEs) and run web searches; it could not
open most product sites directly (ui.shadcn.com, utopia.fyi, developer.chrome.com were blocked), so
the notes on those come from their source repos and search summaries.

## Sources read

| Source | License | What we read |
| --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) (`apps/v4/registry/new-york-v4/ui/accordion.tsx`) | MIT | Accordion: trigger `items-start justify-between gap-4`, icon rotates on `[data-state=open]`, content animates height |
| [Magic UI](https://github.com/magicuidesign/magicui) (`registry/magicui/iphone.tsx`, `safari.tsx`) | MIT | Device frames: media positioned by percentage insets behind an SVG bezel with a punched-out screen; elliptical screen radius |
| Magic UI `bento-grid`, `border-beam`, `shine-border` (docs + [21st.dev mirrors](https://21st.dev/@dillionverma/components/border-beam.md)) | MIT | Bento cards with hairline + soft shadow; gradient borders (we used the static idea, not the animated beam) |
| [Radix Primitives](https://github.com/radix-ui/primitives) | MIT | Already a dependency; accordion height via a measured CSS variable (we use native `<details>` instead, see below) |
| [cruip/open-react-template](https://github.com/cruip/open-react-template) (noted in docs/BRAND.md) | GPL-3.0 | Display + neutral text pairing; gradient button with inset highlight (idea only, no code) |
| Chrome "More options for styling `<details>`" ([search summary](https://developer.chrome.com/blog/styling-details)), [modern-css.com](https://modern-css.com/animating-details-without-javascript-height/) | docs | `::details-content` + `interpolate-size: allow-keywords` animate `<details>` to `height:auto` with no script |
| Utopia fluid type ([utopia.fyi](https://utopia.fyi/blog/designing-with-fluid-type-scales/), via search) | docs | One `clamp(min, a + b·vw, max)` per step, solved for a min and a max viewport |
| Pricing-page teardowns ([stigg](https://www.stigg.io/blog-posts/7-great-saas-pricing-page-examples-and-why-they-work), [saasui](https://www.saasui.design/saas-pricing-page-examples)) | articles | 2–3 plans, one marked; "contact us" tier set apart; scope/compare below the cards |
| Health-tech trust write-ups ([insivia](https://www.insivia.com/designing-for-trust-web-design-elements-that-enhance-credibility-in-healthtech-platforms/), [psqh](https://psqh.com/analysis/eight-proven-ways-to-inspire-trust-and-credibility-with-your-healthcare-website)) | articles | Trust from specificity, named operator, plain data facts, calm palette; testimonials are often legally awkward in health anyway |

Linear / Stripe / Vercel / Raycast pages were studied as patterns only (they are not open source).

## Techniques, and where each one landed

1. **Fluid display type** (Utopia). `.dv-h1` `clamp(2.5rem, 1.85rem + 2.6vw, 4.375rem)`, `.dv-h2`
   `clamp(2.125rem, 1.6rem + 1.9vw, 3.375rem)`: one rule each instead of three breakpoint jumps.
   Japanese and Arabic keep their own sizes (`:lang()` overrides), because a serif scale does not
   suit kanji or Arabic. `text-wrap: pretty` on body text, `balance` on headings (already there).
2. **One elevation and radius ladder** (shadcn tokens, Magic UI bento). `--dv-shadow-1/2/3`,
   `--dv-radius-sm/-/lg`, one easing `--dv-ease`. Cards, steps and hover lifts read the tokens.
3. **Device frame craft** (Magic UI iphone). Kept our CSS-only `PhoneFrame` (no SVG asset, no
   request) but slimmed the bezel (9 → 7 px), added a light-catching titanium rim gradient, a
   hairline where glass meets bezel, and a three-layer teal-tinted shadow (contact, mid, ambient).
4. **Product shot on a tinted panel, cropped** (Linear/Raycast feature cards). "How it works" steps
   are cards from `lg`: the real app screen rises out of a soft teal-to-sand panel and is cut off by
   it, so the screen is bigger and legible, and the three steps line up.
5. **Bento grid** (Magic UI bento-grid, MIT). "What changes for your clinic": four equal cards with
   a numbered marker, then the honest ROI line as a full-width deep-teal tile.
6. **Hero halo instead of decoration** (Vercel/Linear glow). A large, blurred, low-opacity radial
   halo and two hairline "lens" rings behind the phone, CSS only. Glass notes (backdrop blur) for
   the app's own words beside the phone. No motion added: the landing's no-float rule stands.
7. **Pricing craft** (Stripe/Linear pattern). Two plans centred at the same width; the recommended
   one gets a gradient hairline border (`padding-box`/`border-box` backgrounds, no extra element)
   and a teal-tinted lift, the badge moves inside the card. Group, which has no price to compare, is
   a slim full-width row under the plans. Fine print, scope and "before you decide" keep the plans'
   column width.
8. **Accordion height without JS** (Chrome + shadcn accordion feel). `details::details-content`
   animates `block-size` to `auto` where supported; elsewhere it opens instantly as before. Only
   when `prefers-reduced-motion: no-preference`.
9. **Micro-interactions, CSS only.** `.dv-lift` (−3 px and a deeper shadow, only on hover-capable
   devices), `.dv-nudge` (arrows move 3 px along the reading direction, mirrored in RTL).
10. **A dark, quiet close** (Stripe/Vercel final CTA). The final call to action is a deep-teal
    panel with grain and a soft glow, light button, price line under it. "Advertising rules" gets
    the same treatment with two glass panels for "does / does not".
11. **Trust without social proof.** No logos, ratings, counters or testimonials (none exist, and
    invented ones are banned). Trust comes from what is already true: a named operator and
    director, merchant of record, data facts, DPA link, "what it does not do". The FAQ now names the
    person who answers (`hello@dentvideo.com`) beside the questions.

## Rejected, and why

- **Animation libraries** (framer-motion on the landing, GSAP, Lottie): weight on the LCP path for
  effects CSS does.
- **Scroll reveals and floating cards on the landing**: a deliberate owner decision from the
  previous pass ("calmer design", enforced by `conversion.test.ts`). Kept.
- **Animated border beams, marquees, counters, logo walls, "trusted by"**: noise, or fake proof.
- **SVG device frames** (Magic UI): accurate, but a bigger DOM per phone and nothing our CSS frame
  lacks at these sizes.
- **New fonts**: Instrument Serif + Plus Jakarta Sans are self-hosted already; nothing new loaded.

## Audit of the site before this pass (390 / 768 / 1440, en tr de ar ja)

What already worked: a calm brand (teal, warm paper, Instrument Serif), real sample videos and real
app screens, honest copy, server-rendered prices, good RTL and Japanese line breaking, LCP under
1 s on emulated mobile.

Gaps, most visible first:

1. **"How it works" screens were too small to read** (14 rem phones, app text at ~6 px) and the
   numbers floated above titles in a thin serif; nothing tied the three steps together.
2. **Pricing was unbalanced.** Group, with no price, took a full plan column and was mostly empty
   space; "before you decide" sat beside a one-line disclosure, leaving a half-empty row; the
   recommended plan was marked only by a 2 px ring and a badge over the edge.
3. **"What changes for your clinic" read as a text wall**: four hairline-topped paragraphs, then a
   sand box that looked like every other sand box on the page.
4. **The hero phone looked heavy** (9 px black bezel, one long grey shadow) and its two notes were
   plain white cards; the hero facts were a stacked list under the copy, pushing the page down.
5. **The last call to action was the weakest panel on the page** (sand on paper), and the dark
   "Advertising rules" section was flat text on teal.
6. **"What arrives every Monday" showed one lonely phone** for a section about a week of videos.
7. **The examples hub left half the desktop empty** in "More examples" (three cards in a six-column
   grid per language).
8. **Inconsistent micro-interactions**: guide cards changed shadow on hover, example cards did not,
   arrows did nothing; FAQ panels snapped open.
9. **Display sizes jumped at breakpoints** (three fixed sizes per heading).
10. **FAQ named no person** next to the questions, though the trust section does.
