# DentVideo — SEO + GEO plan

Goal: dentists in Türkiye, DACH, Spain/LatAm, France and the US/UK find dentvideo.com when they search for
help with social media videos and advertising rules — and ChatGPT, Perplexity and Google AI Overviews cite
DentVideo's guides and describe the product correctly.

Status (branch `dentvideo-seo2`): 32 guides live in code (tr 6, de 6, es 6, fr 6, en 8), a guides hub and an
About page per language, entity facts in one place, llms.txt + llms-full.txt, sitemap with lastmod and
hreflang, IndexNow. Everything below the "Owner checklist" needs a human.

---

## 1. Positioning in search

DentVideo sits where three intents meet. Most competitors cover only one:

| Intent | What dentists type | Who ranks today (Nov 2026 spot checks) | Our angle |
| --- | --- | --- | --- |
| **Content** — what to post | "diş hekimi instagram paylaşımları", "Instagram Ideen Zahnarzt", "post instagram clínica dental", "dental social media post ideas" | US agency blogs; machine-translated pages from AI-tool vendors (predis.ai, fluxnote.io) in DE/ES/FR/TR | Native-language, practical lists **filtered by what the local rules allow** |
| **Compliance** — what is allowed | "diş hekimi reklam yasağı", "Heilmittelwerbegesetz Zahnarzt Instagram", "publicidad sanitaria dentistas", "publicité dentiste", "gdc advertising guidance" | Law firms, chambers, trade press (zm-online, ZWP, redaccionmedica), each covering law but not "so what do I post" | Plain-language rules + checklist + safer wording, hedged and sourced, then a path to safe content |
| **Tool / alternative** — who does it | "diş kliniği sosyal medya yönetimi / reklam ajansı", "Social Media Agentur Zahnarzt", "agencia marketing dental", "agence communication dentaire", "dental social media marketing agency" | Agencies selling themselves | Honest comparison (agency / freelancer / team / software) with questions to ask — DentVideo as the software option |

Gap that matters most: **non-English SERPs have almost no authoritative, native guide that combines "what to post"
with "what the rules allow"**. The Turkish SERP for content questions returned no Turkish-language guide at all;
DE/ES/FR content queries are dominated by translated vendor pages that recommend testimonials, before/after and
discount promotions — the very things the local rules restrict. That is our opening.

## 2. Research method and raw findings

- Google Suggest (`suggestqueries.google.com`, `hl`/`gl` per market, seed + a…z expansion; ~80 seeds).
  Raw output kept out of the repo; re-run with the script pattern in `worker/src/dental/questions.ts`.
- SERP spot checks with web search for the head term of each cluster; regulation facts checked against official
  or professional sources (links in each guide's "Sources" block).
- No search-volume tool was available. Priorities below combine suggest presence (a query that autocompletes
  has demand), commercial closeness to DentVideo, and how weak the current SERP is. Replace with Search Console
  impressions after 4–6 weeks.

Notable suggestions per market (real autocompletes, verbatim):

- **tr**: diş hekimi reklam yasağı · diş hekimi reklam cezası · diş hekimi reklam yönetmeliği · diş hekimliği reklam
  yasağı · diş kliniği reklam yönetmeliği · diş kliniği reklam ajansı · diş kliniği sosyal medya yönetimi · diş
  kliniği dijital pazarlama · diş kliniği tanıtım videosu · sağlık hizmetlerinde tanıtım ve bilgilendirme faaliyetleri
  hakkında yönetmelik (… 2025, … 2026, … resmi gazete, … pdf) · 32263 sayılı … yönetmelik (old number — searchers are
  still looking for the 2023 text) · instagram fenomeni diş hekimi.
- **de**: social media manager zahnarzt(praxis) · social media agentur zahnarzt · instagram ideen zahnarzt · instagram
  für zahnarztpraxis · darf zahnarzt werbung machen · werbung zahnarzt erlaubt · zahnarzt marketing agentur ·
  praxismarketing zahnarztpraxis · hwg vorher nachher bilder · heilmittelwerbegesetz instagram · patientenaufklärung
  videos · social media zahnarztpraxis seminar/fortbildung.
- **es**: publicidad sanitaria (+ comunidad de madrid, euskadi, aragón, asturias) · registro / autorización publicidad
  sanitaria · ley / decreto / normativa publicidad sanitaria · real decreto 1907/1996 · post instagram clínica dental ·
  marketing para dentistas instagram · estrategias de marketing para dentistas · agencia marketing para dentistas ·
  publicidad para clínica dental.
- **fr**: publicité dentiste · publicité cabinet dentaire · publicité clinique dentaire · dentiste sur les réseaux
  sociaux · code de déontologie des chirurgiens dentistes (pdf, commenté) · vidéo présentation cabinet dentaire.
  ("dentiste instagram/tiktok" is navigational — people looking for dentist influencers — skip.)
- **en**: dental social media post ideas · dental posts for social media · dental office social media ideas · dental
  social media calendar 2026 · dental social media consent form · dental social media marketing agency · dental social
  media manager · dental patient education videos (free download) · patient education videos waiting room · dental
  education videos for waiting room · dental video marketing · gdc advertising guidance · gdc ethical advertising ·
  dental advertising guidelines · dental reels ideas · dental captions for instagram · dental hashtags for instagram ·
  how to make dental videos.

## 3. Keyword clusters → pages

Priority: **P1** = build/optimise now (high fit, weak SERP), **P2** = next, **P3** = later.
URLs are the public dentvideo.com paths. `[hub]` = guides index for that language.

### Türkiye (tr) — priority market

| Pri | Cluster (primary → secondary) | Intent | Page |
| --- | --- | --- | --- |
| P1 | diş hekimi reklam yasağı → diş hekimliği reklam yönetmeliği, diş kliniği reklam yasağı, diş hekimi reklam cezası, sağlık hizmetlerinde tanıtım ve bilgilendirme yönetmeliği 2025 | compliance | `/guides/dis-hekimi-reklam-yasagi` |
| P1 | diş hekimi instagram paylaşımları → diş kliniği instagram, diş hekimi sosyal medya, diş hekimi tiktok | content | `/guides/dis-hekimi-instagram-paylasim-fikirleri` |
| P1 | diş hekimleri için instagram videoları → diş hekimi video, reels | content/how-to | `/guides/dis-hekimleri-icin-instagram-videolari` |
| P2 | diş kliniği sosyal medya yönetimi → diş kliniği reklam ajansı, diş kliniği dijital pazarlama | tool/alternative | `/guides/dis-klinigi-sosyal-medya-yonetimi` |
| P2 | hasta bilgilendirme videosu → diş tedavisi bilgilendirme, bekleme salonu videosu | content | `/guides/hasta-bilgilendirme-videolari` |
| P2 | diş hekimi video çekimi → diş kliniği tanıtım videosu, telefonla video çekimi | how-to | `/guides/dis-hekimi-video-cekimi` |
| P3 | sağlık turizmi tanıtım kuralları (diş) | compliance | *to write* (see calendar) |
| P3 | diş hekimi reklam cezası (standalone) | compliance | covered as FAQ; split out if GSC shows demand |

### DACH (de)

| Pri | Cluster | Intent | Page |
| --- | --- | --- | --- |
| P1 | Heilmittelwerbegesetz Zahnarzt → HWG Instagram, HWG Vorher-Nachher-Bilder, darf Zahnarzt Werbung machen, Berufsordnung Zahnärzte Werbung | compliance | `/guides/heilmittelwerbegesetz-zahnarzt-social-media` |
| P1 | Social Media Zahnarztpraxis → Instagram Ideen Zahnarzt, Zahnarzt Reels, Zahnarzt TikTok | content | `/guides/social-media-zahnarztpraxis-ideen` |
| P1 | Instagram für Zahnarztpraxis → Zahnarzt Instagram Videos | content/how-to | `/guides/instagram-videos-fuer-zahnarztpraxen` |
| P2 | Social Media Agentur Zahnarzt → Social-Media-Manager Zahnarztpraxis, Zahnarzt Marketing Agentur, Praxismarketing Zahnarzt | tool/alternative | `/guides/praxismarketing-zahnarzt-agentur-oder-selbst` |
| P2 | Patientenaufklärung Video(s) → Aufklärungsvideo Zahnarzt, Wartezimmer-TV | content | `/guides/patientenaufklaerung-videos-zahnarztpraxis` |
| P2 | Zahnarzt Werbung Österreich / Schweiz → § 35 ZÄG, Werberichtlinie ÖZÄK, MedBG Art. 40 | compliance | `/guides/zahnarzt-werbung-oesterreich-schweiz` |
| P3 | Impressum Instagram Zahnarzt | compliance | *to write* |

### Spain / LatAm (es)

| Pri | Cluster | Intent | Page |
| --- | --- | --- | --- |
| P1 | publicidad sanitaria dentistas → normativa publicidad sanitaria, real decreto 1907/1996, publicidad clínica dental | compliance | `/guides/publicidad-sanitaria-dentistas` |
| P1 | ideas de publicaciones clínica dental → post instagram clínica dental, reels para dentistas, marketing para dentistas instagram | content | `/guides/ideas-contenido-instagram-clinica-dental` |
| P1 | vídeos para clínicas dentales → redes sociales clínica dental | content/how-to | `/guides/videos-para-clinicas-dentales` |
| P2 | agencia marketing dental → marketing para dentistas, community manager clínica dental | tool/alternative | `/guides/marketing-dental-agencia-o-herramienta` |
| P2 | vídeos educativos dentales → educación al paciente | content | `/guides/videos-educativos-pacientes-dentales` |
| P2 | consentimiento fotos pacientes → RGPD clínica dental redes, antes y después | compliance | `/guides/consentimiento-fotos-pacientes-clinica-dental` |
| P3 | publicidad sanitaria Madrid / Euskadi / Cataluña (autorización, registro) | compliance, regional | *to write* (one page per region with real demand) |
| P3 | publicidad servicios de salud México (COFEPRIS) | compliance, LatAm | *to write after local review* |

### France (fr)

| Pri | Cluster | Intent | Page |
| --- | --- | --- | --- |
| P1 | publicité dentiste → publicité cabinet dentaire, communication dentiste, dentiste réseaux sociaux, code de déontologie chirurgien-dentiste | compliance | `/guides/communication-chirurgien-dentiste-reseaux-sociaux` |
| P1 | contenu instagram cabinet dentaire → idées publication dentiste | content | `/guides/idees-contenu-instagram-cabinet-dentaire` |
| P1 | vidéo cabinet dentaire → vidéo dentiste, vidéo présentation cabinet dentaire | content/how-to | `/guides/videos-pour-cabinets-dentaires` |
| P2 | avant après dentiste instagram → témoignages patients dentiste, avis Google dentiste | compliance | `/guides/photos-avant-apres-temoignages-dentiste` |
| P2 | information patient dentaire → vidéo salle d'attente | content | `/guides/videos-information-patient-dentaire` |
| P2 | agence communication dentaire → marketing dentaire, community manager dentiste | tool/alternative | `/guides/marketing-dentaire-agence-ou-outil` |
| P3 | répondre aux avis Google (dentiste) | compliance/how-to | *to write* |

### US / UK (en)

| Pri | Cluster | Intent | Page |
| --- | --- | --- | --- |
| P1 | dental social media post ideas → dental posts for social media, dental office social media ideas, dental reels ideas, dental content ideas | content | `/guides/dental-social-media-post-ideas` |
| P1 | gdc advertising guidance → gdc ethical advertising, gdc social media guidance, CAP code dentist | compliance (UK) | `/guides/dental-advertising-rules-uk-gdc-asa` |
| P1 | dental advertising rules → dental advertising guidelines, ADA advertising, FTC dental testimonials | compliance (US) | `/guides/dental-advertising-rules-us` |
| P2 | dental video marketing → dental social media marketing agency, dental social media manager | tool/alternative | `/guides/dental-video-marketing-agency-or-software` |
| P2 | dental patient education videos → patient education videos waiting room | content | `/guides/patient-education-videos` |
| P2 | dental social media consent form → HIPAA social media dental, patient photo consent | compliance | `/guides/patient-consent-dental-social-media` |
| P2 | instagram videos for dentists → how to make dental videos | how-to | `/guides/instagram-videos-for-dentists` |
| P2 | dental advertising rules by country | compliance (intl.) | `/guides/dental-social-media-advertising-rules` |
| P3 | dental social media calendar 2027 · dental captions for instagram · dental hashtags | content | *to write* |

### Entity / brand (all markets)

| Query shape | Page |
| --- | --- |
| "DentVideo", "what is DentVideo", "DentVideo review" | `/about`, `/<l>/about`, landings |
| "AI patient education videos for dentists", "compliant dental videos" | landings + `/about` |

## 4. Internal linking map

Rules (enforced by `web/src/content/guides/guides.test.ts`):

- Every guide links to **≥ 2 other guides in the same language** and to the **landing or sign-up** in its text,
  plus: breadcrumb (DentVideo → Guides hub → guide), "Related guides" (same category first), "All guides", CTA box.
- Links never cross languages inside text. Cross-language links exist only as hreflang + the small language row
  under a guide that has true translations.
- Header and footer link to the guides hub and About page in the page's language.

Per language the shape is the same hub-and-spoke:

```
Landing (/<l>)  ──►  Guides hub (/<l>/guides)  ──►  every guide
   ▲                         ▲
   │                         │
   └── CTA in every guide ───┘
Compliance pillar  ◄──►  Post ideas  ◄──►  Instagram videos  ◄──►  Patient-education videos
       ▲                                                              │
       └──── Agency-or-software  ◄────────────────────────────────────┘
       └──── Consent / before-after (es, fr, en) and AT/CH (de), filming (tr)
```

hreflang groups (true translations only — country-specific compliance guides are deliberately *not* grouped):

| topic key | en | de | es | fr | tr |
| --- | --- | --- | --- | --- | --- |
| instagram-videos | instagram-videos-for-dentists | instagram-videos-fuer-zahnarztpraxen | videos-para-clinicas-dentales | videos-pour-cabinets-dentaires | dis-hekimleri-icin-instagram-videolari |
| post-ideas | dental-social-media-post-ideas | social-media-zahnarztpraxis-ideen | ideas-contenido-instagram-clinica-dental | idees-contenu-instagram-cabinet-dentaire | dis-hekimi-instagram-paylasim-fikirleri |
| patient-education | patient-education-videos | patientenaufklaerung-videos-zahnarztpraxis | videos-educativos-pacientes-dentales | videos-information-patient-dentaire | hasta-bilgilendirme-videolari |
| agency-or-tool | dental-video-marketing-agency-or-software | praxismarketing-zahnarzt-agentur-oder-selbst | marketing-dental-agencia-o-herramienta | marketing-dentaire-agence-ou-outil | dis-klinigi-sosyal-medya-yonetimi |

Landings, guides hubs and About pages are hreflang-linked across all five languages (+ x-default = English).

## 5. What is implemented (technical + GEO)

- **Content**: `web/src/content/guides/{tr,de,es,fr,en}.ts`; merged into `GUIDES` by one line in
  `content/dentvideo.ts` (a library guide with an existing slug replaces the short original in place, same URL).
  The 7 original short guides still sit in `content/dentvideo.ts` as `BASE_GUIDES` but are fully superseded — delete
  them once the parallel LANDING rewrite has merged, to avoid a conflict now.
- Each guide: direct, quotable answer as the first paragraph (25–110 words, tested), ≥ 900 words (tested),
  checklists/steps, FAQ (≥ 3), dated (`published`/`updated`), official sources on every compliance guide.
- **Pages**: guides hub `/guides` and `/<l>/guides`; About `/about` and `/<l>/about`; guide pages with breadcrumb,
  table of contents, updated date, reading time, "not legal advice" on rules guides, sources, translations, related.
- **Structured data**: Article (dates, author, publisher = Bulsu Labs organisation `@id`, citations, image), FAQPage,
  BreadcrumbList, HowTo (Turkish filming guide), CollectionPage + ItemList on hubs, AboutPage + Organization +
  SoftwareApplication on About. Note: Google shows FAQ/HowTo rich results only for some sites now; the markup is still
  read by other engines and LLM crawlers.
- **Entity facts**: `web/src/content/guides/entity.ts` — one definition sentence and ten facts per language, used by
  About pages, llms.txt, llms-full.txt and JSON-LD.
- **llms.txt** (entity facts, pages, every guide by language) and **llms-full.txt** (full Markdown of every guide),
  at dentvideo.com/llms.txt and /llms-full.txt.
- **Sitemap**: every landing, hub, About page and guide, with `<lastmod>` and `xhtml:link` hreflang alternates.
- **OG images**: one generated card per guide (`/guides/<slug>/opengraph-image`).
- **IndexNow**: key file at `https://dentvideo.com/e6b765322de3360e21f7c4e8fb3c2c40.txt`; submit with
  `node scripts/indexnow.mjs` (add `--dry-run` to preview).
- **Verification meta (optional)**: set `DENTVIDEO_GOOGLE_SITE_VERIFICATION` / `DENTVIDEO_BING_SITE_VERIFICATION` at
  build time to emit `google-site-verification` / `msvalidate.01` on dentvideo.com pages. DNS is preferred (below).

## 6. 90-day content calendar

Cadence: one new guide or major refresh per week, Türkiye first. Every new guide must pass the tests (≥ 900 words,
FAQ, links, sources for rules). Weeks start from the deploy date.

| Week | Market | Work | Target cluster |
| --- | --- | --- | --- |
| 1 | all | Deploy; GSC + Bing verification; submit sitemap; run IndexNow; request indexing of the 5 hubs | — |
| 2 | tr | New: **Sağlık turizminde diş kliniği tanıtımı: yurt dışı hastalara ne söylenebilir** (2025 regulation treats health tourism separately) | sağlık turizmi tanıtım |
| 3 | tr | Outreach: TDB / il odası bülten önerisi; LinkedIn post by founder summarising the reklam yasağı checklist | links |
| 4 | de | New: **Impressum, Datenschutz und Instagram: Pflichtangaben für Zahnarztpraxen** | impressum instagram zahnarzt |
| 5 | en | New: **Dental social media calendar 2027** (month-by-month, safe topics, awareness days) | dental social media calendar |
| 6 | es | New: **Autorización de publicidad sanitaria por comunidad autónoma** (start with Madrid, País Vasco, Cataluña; facts verified with each consejería) | publicidad sanitaria madrid / euskadi |
| 7 | all | **GSC review #1**: queries with impressions but position > 10 → rewrite titles/intros; add FAQ entries for real queries | — |
| 8 | fr | New: **Répondre aux avis Google quand on est chirurgien-dentiste** (secret professionnel, déontologie) | répondre avis google dentiste |
| 9 | en | New: **Dental Instagram captions and hashtags: templates that stay within the rules** | dental captions / hashtags |
| 10 | tr | New: **Diş hekimi reklam cezası: yaptırımlar ve şikâyet süreci** if GSC shows demand; else refresh reklam yasağı guide with new Bakanlık duyuruları | diş hekimi reklam cezası |
| 11 | de | New: **Zahnarzt-Videos im Wartezimmer: Aufklärungs-TV ohne GEMA- und Datenschutzfallen** (verify GEMA facts before writing) | wartezimmer tv zahnarzt |
| 12 | es | New (LatAm): **Publicidad de clínicas dentales en México: COFEPRIS** — only after review by a Mexican professional | publicidad dental méxico |
| 13 | all | **Quarterly refresh**: re-check every rules guide against official sources (TR regulation, ES RD project, ADA Code, GDC guidance); bump `updated`; re-run IndexNow; **GSC review #2** | — |

Ongoing every week: one LinkedIn/X post per market linking to a guide; answer one relevant Quora/Reddit/forum
question (EN) or ekşi/meslek grubu question (TR) with a link only where genuinely useful.

Later (after 90 days): Italian and Portuguese guide sets (the product already makes videos in both); per-guide
video embeds (a DentVideo sample answering the guide's question) with VideoObject markup.

## 7. Owner checklist (needs a human)

### Must do at deploy
1. **Set `NEXT_PUBLIC_DENTVIDEO_URL=https://dentvideo.com`** in production (canonical tags, OG URLs and JSON-LD switch to
   dentvideo.com only when it is set; the sitemap/llms files already use dentvideo.com).
2. **Google Search Console** — add a **Domain property** for `dentvideo.com`. Google shows a `google-site-verification=…`
   TXT value; send it to us and we add it as a DNS TXT record via the Hostinger API. Then submit
   `https://dentvideo.com/sitemap.xml` and use URL Inspection → "Request indexing" for `/`, `/tr`, `/de`, `/es`, `/fr`
   and the five guides hubs.
3. **Bing Webmaster Tools** — easiest: "Import from Google Search Console" after step 2. Otherwise add the site and send
   us the TXT/CNAME value (or set `DENTVIDEO_BING_SITE_VERIFICATION` for the meta tag). Submit the sitemap. Bing feeds
   ChatGPT search and Copilot, so this matters for GEO.
4. **IndexNow** — after each deploy that adds or changes pages: `node scripts/indexnow.mjs` (from the repo root,
   network access to dentvideo.com and api.indexnow.org; no account). Expect HTTP 200 or 202.
5. **Yandex Webmaster** (optional, useful for Türkiye) — IndexNow already pings Yandex; verification gives query data.
6. **Google Business Profile** — not applicable (no physical customer location); skip.
7. Have a **native professional skim the rules guides** once (a Turkish diş hekimi or health lawyer, a German
   Medizinrecht contact, a Spanish colegio contact, a French Ordre-aware contact, a UK/US compliance person). The
   guides are hedged and sourced, but a named reviewer is worth adding to the page (E-E-A-T) once one exists —
   do not invent one.

### Backlinks and PR (ranked by fit)
- **Türkiye**: TDB and il diş hekimleri odaları (bülten/duyuru with the reklam yasağı checklist); diş hekimliği
  fakülteleri (öğrenci kulüpleri, "dijital hekimlik" seminerleri); dental trade press (Dental Tribune Türkiye);
  dişhekimi Facebook/Telegram grupları — share the checklist, not ads.
- **DACH**: zm-online / ZWP / DZW guest article "Social Media ohne HWG-Abmahnung"; Landeszahnärztekammer
  Fortbildungen (offer a free webinar); Praxisberater and Abrechnungsdienstleister blogs; ÖZÄK/SSO newsletters.
- **Spain/LatAm**: Gaceta Dental, Dental Tribune Hispanic; colegios de dentistas (charla sobre publicidad sanitaria);
  universidades (máster de gestión de clínicas).
- **France**: L'Information Dentaire, Le Fil Dentaire; syndicats (FSDL, CNSD/Les CDF) and URPS newsletters; facultés.
- **US/UK**: Dentistry.co.uk, Dental Tribune, DrBicuspid guest posts; BDA/ADA state society newsletters; dental
  podcasts; directories with real editorial (Capterra/G2 "dental marketing software", Product Hunt launch).
- Universal: a free, linkable asset per market (the pre-post checklist as a printable PDF) is the most natural link
  bait. Avoid paid link schemes.

### What to measure (monthly)
- **GSC by language folder** (`/tr`, `/de`, …, and `/guides/<slug>` grouped by locale): impressions, clicks, average
  position for each P1 cluster's primary query; pages indexed vs. submitted.
- **Bing Webmaster**: same, plus "AI performance"/Copilot citations where reported.
- **GEO spot checks** (15 min/month): ask ChatGPT (search on), Perplexity and Google (AI Overview) the P1 questions in
  each language — e.g. "diş hekimleri instagramda ne paylaşabilir", "Darf ein Zahnarzt auf Instagram werben?",
  "¿qué puede publicar una clínica dental en redes?", "un dentiste peut-il faire de la publicité sur Instagram ?",
  "what can dentists post on social media UK" — log whether dentvideo.com is cited and whether DentVideo is described
  correctly (compare with `entity.ts`).
- **Referrals** from chatgpt.com, perplexity.ai, copilot.microsoft.com, gemini.google.com in analytics (add privacy-
  friendly analytics if none is running).
- **Conversions**: sign-ups (`/start?lang=…`) by landing page and by language.

## 8. Maintenance rules

- Change a fact about the product → `content/guides/entity.ts` (and the landing copy), never ad hoc in a guide.
- Change a rule → update the guide, its `sources`, bump `updated`; the sitemap lastmod follows automatically.
- Watch list: Türkiye's 2025 tanıtım yönetmeliği (amendments, Bakanlık duyuruları); Spain's pending real decreto on
  health advertising; ADA Code advisory opinions (2025 social-media update); GDC guidance revisions; FTC reviews rule
  enforcement; France's ONCD recommendations.
- No prices, no invented statistics, no testimonials in any guide (tested).
