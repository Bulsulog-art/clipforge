# DentVideo: App Store and Google Play metadata (ASO pack)

Written 2026-11-08 for a future native "DentVideo" app (iOS and Android). No app exists yet. This file is ready-to-paste
store metadata for 10 locales, plus the rules it was written to. Counts were produced by a script, not by hand.

Product facts used here come from `web/src/content/dentvideo.ts`, `web/src/content/guides/entity.ts`,
`web/src/lib/dentvid/billing.ts` and `docs/POSITIONING.md`. If the app ends up doing less than the website (for example,
review-only with no setup), cut the matching lines before submitting.

## Read before using

1. **Paid-first vs the live site.** This pack is written for the paid-first model (a live branded preview before payment,
   no free trial). On `origin/main` the landing copy and `entity.ts` still say "first week free, no card". Make the site,
   `entity.ts`, llms.txt and these listings say the same thing before the app ships. Answer engines and app reviewers both
   notice contradictions.
2. **Logo and colours per plan.** The site's pricing table lists "Your logo and brand colours in every video" as a
   *Practice* feature, while the hero and `entity.ts` describe colours and logo for every clinic. The listings follow the
   pricing table in the PLANS block and use "in your clinic's colours" in the intro, matching the hero. Confirm which is
   true for Starter and fix whichever copy is wrong.
3. **Payments inside the app (Apple guideline 3.1).** If the iOS app lets a clinic subscribe, Apple generally requires
   in-app purchase for digital subscriptions sold in the app. Linking out to web checkout is allowed on the US storefront
   (after the 2025 Epic ruling) and in some other regions under separate entitlements. Decide the model before
   submission and re-read the current guideline 3.1. Consequences for metadata:
   - The listings name the plans but **show no prices**. Prices go in the IAP products, and Apple shows them on the page.
   - **No discount codes or special offers in store metadata.** There is no founding offer any more (removed
     2026-11-13).
   - Apple asks for working links to Terms of Use (EULA) and the Privacy Policy. **`https://dentvideo.com/terms` and
     `https://dentvideo.com/privacy` do not exist yet.** They are placeholders in every description. Create them, or
     replace the URLs, before submission.
4. **Trademarks.** "Instagram", "TikTok", "Reels" and "YouTube" stay out of names, subtitles and keyword fields. Apple
   rejects third-party brand names in metadata (guideline 2.3.7), and Google Play's metadata policy is similar. The
   descriptions mention "Instagram or TikTok" only to describe sharing, which both stores allow. If a reviewer objects,
   replace them with "social media".

## Rules every field follows

- **Compliance (same as the website, `docs/POSITIONING.md` §7):**
  - no guarantees and no promised patient numbers or results;
  - no "painless" or its equivalents in any language (the script checks for *schmerzfrei, sin dolor, ağrısız, sans
    douleur, indolore, sem dor*);
  - no invented statistics, no testimonials, no "100% compliant" or "approved by" claims;
  - the compliance check is described as "a careful filter, not legal advice";
  - the voice is described honestly as synthetic, and the app never claims to auto-post.
- **iOS keyword field:**
  - comma-separated, no spaces;
  - no word that already appears in the app name or subtitle of the same locale (Apple indexes those already);
  - no brand names, and no competitor or app names;
  - singular and plural are both kept only where Apple's stemming is unreliable for that language (e.g.
    `dentista,dentistas`).
- **Native copy, not translation.** Each locale uses the local professional register:
  - de: Sie, "Praxis";
  - es-ES: tú, "clínica";
  - es-MX: usted, "consultorio", "celular";
  - tr: siz, "klinik";
  - fr: vous, "cabinet";
  - it: tu (the app supports Lei);
  - pt-BR: você, "consultório";
  - pt-PT: "doente", "telemóvel", "logótipo".
  Each locale also names the local rule family in general terms: HWG/Berufsordnung, GDC/CAP Code, déontologie, publicidad
  sanitaria, tanıtım kuralları.
- **Plan names** stay in English (Starter, Practice, Group) in every locale, as on the website and in the checkout.

## Category recommendation (all locales)

| Store | Primary | Secondary | Why |
| --- | --- | --- | --- |
| App Store | **Business** | **Productivity** | The users are clinic owners and staff, and the job is marketing content. **Medical** would put the app next to patient apps. It would also invite health-app review scrutiny (guideline 1.4.1) for an app that gives no medical advice to its users. |
| Google Play | **Business** | (Play has one category) | Same reasoning. If Play Console asks for the Health apps declaration, answer that the app is a content and marketing tool for clinics and does not provide health services to users. |

Age rating: answer the questionnaire honestly. The videos contain general dental-treatment information, so expect
the "medical/treatment information" question to apply at the lowest frequency level.

## Screenshot plan (same order in every locale)

iPhone 6.9" set (1320 × 2868) is required; add iPad only if the app supports iPad. Play needs at least 2 phone
screenshots and a 1024 × 500 feature graphic. Use the brand rules in `docs/BRAND.md`:
- teal `#0f5c5c` caption band on `#faf7f2` paper;
- Instrument Serif for the caption, Plus Jakarta Sans for small text;
- real app screens in the phone frame;
- the demo clinic from `dentvideo-samples.ts`, never a real clinic or patient.

| # | Screen to show | Caption idea (localised per locale below) |
| --- | --- | --- |
| 1 | This week's five videos, one playing in the phone frame | Five patient videos every Monday |
| 2 | Topic list with the patient question on each card (e.g. "Does whitening damage enamel?") | Topics patients actually search for |
| 3 | A video's detail view with the three checks ticked: advertising rules, clinical accuracy, sound and picture | Checked twice before you see them |
| 4 | The "Approve all 5 ready videos" button | Approve the whole week in one tap |
| 5 | The phone share sheet with "Caption copied" | Share in one tap, caption ready |
| 6 | Filming card next to the clip list made from the dentist's own recording | Record 5 minutes, get clips of you |

Captions are kept to about 40 characters or fewer, so they fit two lines at a legible size.

## How the keywords were chosen

- **Source:** Google autocomplete, queried on 2026-11-08 with
  `https://suggestqueries.google.com/complete/search?client=firefox&hl=<lang>&gl=<cc>&q=<seed>`. There were 112 seeds
  across 10 locales, for example:
  - en: "dental marketing app", "social media for dentists", "dental patient education app";
  - de: "zahnarzt social media", "patientenaufklärung video";
  - es: "marketing para dentistas", "app para dentistas";
  - tr: "diş hekimi instagram", "diş kliniği reklam";
  - fr: "marketing dentaire", "application dentiste";
  - it: "marketing dentisti", "video studio dentistico";
  - pt: "marketing odontológico", "posts para dentistas".
  The verbatim suggestions that shaped each locale are listed under "Search evidence".
- **Limits of this method:**
  - Autocomplete shows that people type a phrase, not how many do. No volume tool was available.
  - Web search is not App Store search. Re-check the top terms in App Store Connect and Play Console after launch and
    swap weak terms every 4–6 weeks.
- **What the data said:**
  - App-intent phrases barely exist in the niche. "dental marketing app", "praxismarketing app" and "patientenaufklärung
    app" returned nothing. "app para dentistas", "app per studi dentistici", "application pour dentiste" and "diş
    hekimi uygulaması" do exist.
  - So the names lead with the **job** ("Dental Marketing", "Zahnarztpraxis", "Clínica Dental", "Diş Hekimi Video",
    "Cabinet Dentaire", "Studio Dentistico", "Marketing Odonto"), and the keyword field covers social media, content,
    ideas and patient education.
  - Turkish demand clusters around the advertising ban ("diş hekimi reklam yasağı / cezası / yönetmeliği"), so `reklam`,
    `yönetmelik` and `tanıtım` sit in the Turkish keyword field.
  - Many suggestions are navigational: names of individual dentists, "funny dentist videos" and children's videos. They
    were ignored.

## Summary: counts per locale

Counted with Python `len()` (Unicode code points; App Store Connect and Play Console count the same way for these scripts, but re-check in the console before saving). Limits in brackets.

| Locale | Name [30] | Subtitle [30] | iOS keywords [100] | Promo text [170] | Play short [80] | Full description [4000] |
| --- | --- | --- | --- | --- | --- | --- |
| en-US | 27 | 27 | 96 | 166 | 72 | 2784 |
| en-GB | 27 | 28 | 94 | 162 | 72 | 2736 |
| de-DE | 25 | 29 | 99 | 170 | 69 | 3082 |
| es-ES | 25 | 25 | 99 | 160 | 72 | 2887 |
| es-MX | 29 | 21 | 99 | 156 | 76 | 2942 |
| tr-TR | 27 | 24 | 100 | 168 | 77 | 2889 |
| fr-FR | 28 | 21 | 97 | 163 | 70 | 3275 |
| it-IT | 28 | 27 | 92 | 170 | 71 | 3031 |
| pt-BR | 27 | 21 | 100 | 160 | 74 | 2962 |
| pt-PT | 27 | 29 | 100 | 165 | 79 | 2972 |

## en-US

*App Store: United States · Google Play: English (United States)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Dental Marketing` | 27 |
| Subtitle (iOS) | `Patient videos for dentists` | 27 |
| Keywords (iOS) | `social,media,clinic,practice,office,education,content,post,ideas,caption,hashtag,maker,editor,ai` | 96 |
| Promotional text (iOS) | New every Monday: five patient-education videos for your practice, narrated and captioned, checked for advertising rules and clinical accuracy. You approve and share. | 166 |
| Short description (Play) | Five patient-education videos every Monday, checked before you see them. | 72 |

**Search evidence (Google suggest, Nov 2026):** dental social media (app), social media for dentists / dental practices, dental marketing (ideas, agency), dental posts for social media, dental office social media ideas, dental patient education app, patient education videos dental, how to make dental videos, dental video editing app, dental instagram captions.

**Full description** (2784 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo makes short patient-education videos for your dental practice: five every Monday, narrated, captioned and in your clinic's colors. Every script is checked before you see it.

Patients like to choose a dentist they feel they already know, and short videos are one of the easiest ways to get there. But finding topics, scripting, filming and editing every week takes evenings most practices don't have. And one careless claim can break health-advertising rules.

HOW IT WORKS
• Set up once: language, treatments, tone, colors and logo. Videos only cover treatments you offer.
• Every Monday: five vertical videos answering questions patients in your country actually search for on Google. Narrated, captioned, on-brand.
• Approve the whole week in one tap, or video by video.
• Share from your phone in one tap. The caption and hashtags are already copied.

CHECKED TWICE BEFORE YOU SEE IT
• Advertising rules: every script and caption is screened for claims that health-advertising rules commonly restrict: guarantees, promised results, superlatives, prices, discounts, before-and-after claims and testimonials.
• Clinical accuracy: a reviewer acting as a general dentist checks each statement against mainstream clinical guidance.
• Sound and picture: narration audible, no silent gaps or black frames, the right format for each platform.
Anything that needs your eye is marked with the reason. Nothing goes out without your approval.

YOUR OWN FACE, YOUR OWN VOICE
Record five minutes with one of the weekly filming cards and DentVideo cuts it into short captioned clips with your logo. Your words are never changed; if something deserves a second look, the clip is flagged with the reason and a suggested wording.

SEVEN LANGUAGES
English, German, Spanish, French, Italian, Portuguese and Turkish, with formal or informal address. Useful if you treat patients from abroad.

STRAIGHT ANSWERS
• The narration is a synthetic voice. No avatar doctors, no fake patients; stock footage shows objects, not people.
• The checks are a careful filter, not legal advice. Rules differ by state and country, and you stay responsible for what you publish.
• DentVideo does not post for you. You share approved videos yourself.
• We don't promise patient numbers. No one honestly can.

PLANS
See a live preview with your logo and colors before you subscribe.
• Starter: five checked videos every Monday, plus filming cards.
• Practice: everything in Starter, your own recordings turned into captioned clips, and your logo and brand colors in every video. Monthly.
• Group: for groups and multi-location practices. Contact us and we'll set it up with you.

Terms of Use: https://dentvideo.com/terms
Privacy Policy: https://dentvideo.com/privacy

DentVideo is made by Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Five patient videos every Monday (32)
2. Topics patients actually search for (35)
3. Checked twice before you see them (33)
4. Approve the whole week in one tap (33)
5. Share in one tap, caption ready (31)
6. Record 5 minutes, get clips of you (34)

## en-GB

*App Store: United Kingdom · Google Play: English (United Kingdom)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Dental Marketing` | 27 |
| Subtitle (iOS) | `Patient videos for practices` | 28 |
| Keywords (iOS) | `dentist,social,media,clinic,surgery,education,content,post,ideas,caption,advertising,editor,ai` | 94 |
| Promotional text (iOS) | Five patient-education videos for your practice every Monday, narrated and captioned in your colours, checked against advertising rules and for clinical accuracy. | 162 |
| Short description (Play) | Five patient-education videos every Monday, checked before you see them. | 72 |

**Search evidence (Google suggest, Nov 2026):** dental social media (post ideas, posts, marketing, manager), dental practice marketing (ideas, agency), dental patient education (videos, app), dental video marketing, gdc advertising guidance, gdc ethical advertising.

**Full description** (2736 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo makes short patient-education videos for your dental practice: five every Monday, narrated, captioned and in your practice colours. Every script is checked before you see it.

Patients like to choose a dentist they feel they already know, and short videos are one of the easiest ways to get there. But finding topics, scripting, filming and editing every week eats into evenings most practices don't have. And one careless claim can fall foul of the GDC's guidance or the CAP Code.

HOW IT WORKS
• Set up once: language, treatments, tone, colours and logo. Videos only cover treatments you offer.
• Every Monday: five vertical videos answering questions patients in the UK actually search for on Google. Narrated, captioned, on-brand.
• Approve the whole week in one tap, or video by video.
• Share from your phone in one tap. The caption and hashtags are already copied.

CHECKED TWICE BEFORE YOU SEE IT
• Advertising rules: every script and caption is screened for claims that health-advertising rules commonly restrict: guarantees, promised results, superlatives, prices, discounts, before-and-after claims and testimonials.
• Clinical accuracy: a reviewer acting as a general dentist checks each statement against mainstream clinical guidance.
• Sound and picture: narration audible, no silent gaps or black frames, the right format for each platform.
Anything that needs your eye is marked with the reason. Nothing goes out without your approval.

YOUR OWN FACE, YOUR OWN VOICE
Record five minutes with one of the weekly filming cards and DentVideo cuts it into short captioned clips with your logo. Your words are never changed; if something deserves a second look, the clip is flagged with the reason and a suggested wording.

SEVEN LANGUAGES
English, German, Spanish, French, Italian, Portuguese and Turkish, with formal or informal address.

STRAIGHT ANSWERS
• The narration is a synthetic voice. No avatar dentists, no made-up patients; stock footage shows objects, not people.
• The checks are a careful filter, not legal advice. You remain responsible for what your practice publishes.
• DentVideo does not post for you. You share approved videos yourself.
• We don't promise patient numbers. No one honestly can.

PLANS
See a live preview with your logo and colours before you subscribe.
• Starter: five checked videos every Monday, plus filming cards.
• Practice: everything in Starter, your own recordings turned into captioned clips, and your logo and brand colours in every video. Monthly.
• Group: for groups and multi-site practices. Contact us and we'll set it up with you.

Terms of Use: https://dentvideo.com/terms
Privacy Policy: https://dentvideo.com/privacy

DentVideo is made by Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Five patient videos every Monday (32)
2. What UK patients actually search for (36)
3. Checked twice before you see them (33)
4. Approve the whole week in one tap (33)
5. Share in one tap, caption ready (31)
6. Record 5 minutes, get clips of you (34)

## de-DE

*App Store: Deutschland (auch Österreich, Schweiz) · Google Play: Deutsch*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Zahnarztpraxis` | 25 |
| Subtitle (iOS) | `Patientenaufklärung als Video` | 29 |
| Keywords (iOS) | `zahnarzt,zahnärzte,social,media,marketing,praxismarketing,aufklärung,patienten,ideen,werbung,hwg,ki` | 99 |
| Promotional text (iOS) | Jeden Montag fünf Aufklärungsvideos für Ihre Praxis: vertont, untertitelt, in Ihren Farben und vorab auf Werberecht und fachliche Richtigkeit geprüft. Sie geben nur frei. | 170 |
| Short description (Play) | Jeden Montag fünf geprüfte Aufklärungsvideos für Ihre Zahnarztpraxis. | 69 |

**Search evidence (Google suggest, Nov 2026):** social media zahnarztpraxis (manager, seminar, fortbildung), zahnarzt marketing (agentur), zahnarztpraxis marketing, instagram zahnarztpraxis, zahnarztpraxis video(s), patientenaufklärung videos, werbung zahnarzt erlaubt, zahnärzte werbung österreich.

**Full description** (3082 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo erstellt kurze Aufklärungsvideos für Ihre Zahnarztpraxis: fünf jeden Montag, vertont, untertitelt und in Ihren Praxisfarben. Jedes Skript wird geprüft, bevor Sie es sehen.

Patienten wählen gern eine Praxis, die sie schon ein wenig zu kennen glauben, und kurze Videos sind dafür einer der einfachsten Wege. Doch Themen finden, Texte schreiben, drehen und schneiden, Woche für Woche, kostet Abende, die im Praxisalltag fehlen. Und eine unbedachte Formulierung kann gegen das Heilmittelwerbegesetz oder die Berufsordnung verstoßen.

SO FUNKTIONIERT ES
• Einmal einrichten: Sprache, Leistungen, Ansprache (Sie oder Du), Farben und Logo. Die Videos behandeln nur Leistungen, die Ihre Praxis anbietet.
• Jeden Montag: fünf Hochformat-Videos zu Fragen, die Patienten in Ihrem Land tatsächlich googeln. Vertont, untertitelt, mit Ihrem Logo.
• Die ganze Woche mit einem Tippen freigeben oder jedes Video einzeln.
• Mit einem Tippen vom Smartphone teilen. Beitragstext und Hashtags sind schon kopiert.

ZWEIFACH GEPRÜFT, BEVOR SIE ES SEHEN
• Werberecht: Jedes Skript und jeder Beitragstext wird auf Aussagen geprüft, die in der Heilberufswerbung häufig unzulässig sind: Garantien, Erfolgsversprechen, Superlative, Preise, Rabatte, Vorher-Nachher-Aussagen und Patientenstimmen.
• Fachliche Richtigkeit: Ein Prüfer in der Rolle eines Allgemeinzahnarztes gleicht jede Aussage mit anerkannten fachlichen Empfehlungen ab.
• Bild und Ton: Sprache gut hörbar, keine stummen Lücken oder schwarzen Bilder, das richtige Format für jede Plattform.
Was Ihre Aufmerksamkeit braucht, wird mit Begründung markiert. Ohne Ihre Freigabe geht nichts hinaus.

IHR GESICHT, IHRE STIMME
Fünf Minuten vor der Kamera genügen: Eine wöchentliche Drehkarte schlägt vor, was Sie sagen könnten, und DentVideo schneidet daraus kurze, untertitelte Clips mit Ihrem Logo. Ihre Worte werden nie verändert; was einen zweiten Blick verdient, wird mit Begründung und Formulierungsvorschlag markiert.

SIEBEN SPRACHEN
Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch und Türkisch, wahlweise mit Sie oder Du. Praktisch für Praxen mit internationalen Patienten.

OFFEN GESAGT
• Die Stimme ist synthetisch. Keine Avatar-Ärzte, keine erfundenen Patienten; Stockmaterial zeigt Gegenstände, keine Menschen.
• Die Prüfung ist ein sorgfältiger Filter, keine Rechtsberatung. Verantwortlich für Veröffentlichungen bleibt die Praxis.
• DentVideo postet nicht selbst. Freigegebene Videos teilen Sie selbst.
• Wir versprechen keine Patientenzahlen. Das kann niemand seriös.

TARIFE
Vor dem Abschluss sehen Sie eine Live-Vorschau mit Ihrem Logo und Ihren Farben.
• Starter: jeden Montag fünf geprüfte Videos, dazu Drehkarten.
• Practice: alles aus Starter, eigene Aufnahmen als untertitelte Clips sowie Logo und Praxisfarben in jedem Video. Monatlich.
• Group: für Praxisgruppen mit mehreren Standorten. Sprechen Sie uns an, wir richten es mit Ihnen ein.

Nutzungsbedingungen: https://dentvideo.com/terms
Datenschutzerklärung: https://dentvideo.com/privacy

DentVideo ist ein Produkt von Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Jeden Montag fünf Patientenvideos (33)
2. Themen, die Patienten googeln (29)
3. Zweifach geprüft, bevor Sie es sehen (36)
4. Die ganze Woche mit einem Tipp freigeben (40)
5. Teilen mit einem Tipp, Text kopiert (35)
6. 5 Minuten sprechen, eigene Clips (32)

## es-ES

*App Store: España · Google Play: Español (España)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Clínica Dental` | 25 |
| Subtitle (iOS) | `Marketing dental en vídeo` | 25 |
| Keywords (iOS) | `dentista,dentistas,odontología,redes,sociales,publicidad,sanitaria,pacientes,contenido,ideas,app,ia` | 99 |
| Promotional text (iOS) | Cada lunes, cinco vídeos educativos para tu clínica: con voz, subtítulos y tus colores, revisados en publicidad sanitaria y precisión clínica. Tú solo apruebas. | 160 |
| Short description (Play) | Cinco vídeos educativos cada lunes para tu clínica dental, ya revisados. | 72 |

**Search evidence (Google suggest, Nov 2026):** marketing dental, marketing para dentistas (instagram, digital, agencia, estrategias), vídeos para dentistas, app para dentistas, reels para dentistas, contenido para dentistas / ideas de contenido, redes sociales clínica dental, vídeos educativos dentales.

**Full description** (2887 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo crea vídeos cortos de educación al paciente para tu clínica dental: cinco cada lunes, con voz, subtítulos y los colores de tu clínica. Cada guion se revisa antes de que lo veas.

Los pacientes suelen elegir al dentista que sienten que ya conocen, y los vídeos cortos son una de las formas más sencillas de conseguirlo. Pero buscar temas, escribir, grabar y editar cada semana se come tardes que no tienes. Y una frase de más puede incumplir las normas de publicidad sanitaria.

CÓMO FUNCIONA
• Lo configuras una vez: idioma, tratamientos, tono (tú o usted), colores y logo. Los vídeos solo tratan los tratamientos que ofreces.
• Cada lunes: cinco vídeos verticales que responden a lo que los pacientes de tu país buscan de verdad en Google. Con voz, subtítulos y tu imagen.
• Apruebas la semana entera con un toque, o vídeo a vídeo.
• Compartes desde el móvil con un toque. El texto y los hashtags ya están copiados.

REVISADO DOS VECES ANTES DE QUE LO VEAS
• Publicidad sanitaria: cada guion y cada texto se revisan frente a las afirmaciones que las normas suelen restringir: garantías, promesas de resultados, superlativos, precios, descuentos, antes y después y testimonios.
• Precisión clínica: un revisor que actúa como dentista general contrasta cada afirmación con las guías clínicas habituales.
• Imagen y sonido: voz audible, sin silencios ni fotogramas negros, el formato correcto para cada red.
Lo que necesita tu atención se marca con el motivo. Nada sale sin tu aprobación.

TU CARA, TU VOZ
Graba cinco minutos con una de las tarjetas de grabación semanales y DentVideo los convierte en clips cortos con subtítulos y tu logo. Tus palabras nunca se modifican; si algo merece otra mirada, el clip se marca con el motivo y una propuesta de redacción.

SIETE IDIOMAS
Español, inglés, alemán, francés, italiano, portugués y turco. Útil si atiendes a pacientes de otros países.

CON CLARIDAD
• La voz es sintética. No hay avatares de médicos ni pacientes inventados; las imágenes de archivo muestran objetos, no personas.
• La revisión es un filtro cuidadoso, no asesoramiento jurídico. Las normas cambian según la comunidad autónoma y la responsabilidad de lo que publicas sigue siendo tuya.
• DentVideo no publica por ti. Tú compartes los vídeos aprobados.
• No prometemos un número de pacientes. Nadie puede hacerlo con honestidad.

PLANES
Antes de suscribirte ves una vista previa en directo con tu logo y tus colores.
• Starter: cinco vídeos revisados cada lunes y tarjetas de grabación.
• Practice: todo lo de Starter, tus propias grabaciones convertidas en clips con subtítulos y tu logo y colores en cada vídeo. Mensual.
• Group: para grupos y clínicas con varios centros. Escríbenos y lo configuramos contigo.

Condiciones de uso: https://dentvideo.com/terms
Política de privacidad: https://dentvideo.com/privacy

DentVideo es un producto de Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinco vídeos para pacientes cada lunes (38)
2. Lo que tus pacientes buscan en Google (37)
3. Revisado dos veces antes de que lo veas (39)
4. Aprueba la semana con un toque (30)
5. Comparte con un toque, texto listo (34)
6. Graba 5 minutos y recibe tus clips (34)

## es-MX

*App Store: México y Latinoamérica (Apple también indexa es-MX en la tienda de EE. UU.) · Google Play: Español (Latinoamérica, es-419)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Consultorio Dental` | 29 |
| Subtitle (iOS) | `Videos para dentistas` | 21 |
| Keywords (iOS) | `marketing,odontología,odontólogo,redes,sociales,publicidad,pacientes,contenido,ideas,clínica,app,ia` | 99 |
| Promotional text (iOS) | Cada lunes, cinco videos educativos para su consultorio: con voz, subtítulos y sus colores, revisados en publicidad y precisión clínica. Usted solo aprueba. | 156 |
| Short description (Play) | Cinco videos educativos cada lunes para su consultorio dental, ya revisados. | 76 |

**Search evidence (Google suggest, Nov 2026):** marketing para dentistas (instagram, digital, agencia, curso), publicidad para dentistas (ideas, frases), videos para dentistas, app para dentistas, contenido para dentistas.

**Full description** (2942 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo crea videos cortos de educación para pacientes de su consultorio dental: cinco cada lunes, con voz, subtítulos y los colores de su clínica. Cada guion se revisa antes de que usted lo vea.

Los pacientes suelen elegir al dentista que sienten que ya conocen, y los videos cortos son una de las formas más sencillas de lograrlo. Pero buscar temas, escribir, grabar y editar cada semana toma horas que casi nunca sobran en el consultorio. Y una frase descuidada puede ir contra las reglas de publicidad en salud.

CÓMO FUNCIONA
• Lo configura una sola vez: idioma, tratamientos, tono (usted o tú), colores y logo. Los videos solo hablan de los tratamientos que usted ofrece.
• Cada lunes: cinco videos verticales que responden a lo que los pacientes de su país realmente buscan en Google. Con voz, subtítulos y su imagen.
• Apruebe toda la semana con un toque, o video por video.
• Comparta desde su celular con un toque. El texto y los hashtags ya están copiados.

REVISADO DOS VECES ANTES DE QUE LO VEA
• Publicidad en salud: cada guion y cada texto se revisan frente a las afirmaciones que las reglas suelen restringir: garantías, promesas de resultados, superlativos, precios, descuentos, antes y después y testimonios.
• Precisión clínica: un revisor que actúa como dentista general contrasta cada afirmación con las guías clínicas habituales.
• Imagen y sonido: voz audible, sin silencios ni cuadros negros, el formato correcto para cada red.
Lo que requiere su atención se marca con el motivo. Nada se publica sin su aprobación.

SU ROSTRO, SU VOZ
Grabe cinco minutos con una de las tarjetas de grabación semanales y DentVideo los convierte en clips cortos con subtítulos y su logo. Sus palabras nunca se modifican; si algo merece una segunda revisión, el clip se marca con el motivo y una redacción sugerida.

SIETE IDIOMAS
Español, inglés, alemán, francés, italiano, portugués y turco, con trato de usted o de tú. Útil si atiende pacientes de otros países.

CON CLARIDAD
• La voz es sintética. No hay avatares de doctores ni pacientes inventados; las imágenes de archivo muestran objetos, no personas.
• La revisión es un filtro cuidadoso, no asesoría legal. Las reglas cambian según el país y la responsabilidad de lo que publica sigue siendo suya.
• DentVideo no publica por usted. Usted comparte los videos aprobados.
• No prometemos un número de pacientes. Nadie puede hacerlo con honestidad.

PLANES
Antes de suscribirse verá una vista previa en vivo con su logo y sus colores.
• Starter: cinco videos revisados cada lunes y tarjetas de grabación.
• Practice: todo lo de Starter, sus propias grabaciones convertidas en clips con subtítulos y su logo y colores en cada video. Mensual.
• Group: para grupos y clínicas con varias sucursales. Escríbenos y lo configuramos contigo.

Términos de uso: https://dentvideo.com/terms
Aviso de privacidad: https://dentvideo.com/privacy

DentVideo es un producto de Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinco videos para pacientes cada lunes (38)
2. Lo que sus pacientes buscan en Google (37)
3. Revisado dos veces antes de que lo vea (38)
4. Apruebe la semana con un toque (30)
5. Comparta con un toque, texto listo (34)
6. Grabe 5 minutos y reciba sus clips (34)

## tr-TR

*App Store: Türkiye · Google Play: Türkçe*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Diş Hekimi Video` | 27 |
| Subtitle (iOS) | `Diş kliniği sosyal medya` | 24 |
| Keywords (iOS) | `dişhekimi,dişçi,hasta,bilgilendirme,reklam,yönetmelik,tanıtım,içerik,paylaşım,klinik,ağız,sağlığı,ai` | 100 |
| Promotional text (iOS) | Her pazartesi kliniğiniz için beş hasta bilgilendirme videosu: seslendirilmiş, altyazılı, renklerinizde ve tanıtım kurallarına göre denetlenmiş. Siz yalnızca onaylayın. | 168 |
| Short description (Play) | Her pazartesi beş hasta bilgilendirme videosu; denetlenmiş, kliniğinize özel. | 77 |

**Search evidence (Google suggest, Nov 2026):** diş kliniği sosyal medya (yönetimi), diş hekimi reklam yasağı / cezası / yönetmeliği, diş kliniği reklam (ajansı, yönetmeliği), diş hekimi instagram, diş hekimi videoları, diş hekimi uygulaması, ağız ve diş sağlığı eğitim videoları.

**Full description** (2889 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo, diş kliniğiniz için kısa hasta bilgilendirme videoları hazırlar: her pazartesi beş video; seslendirilmiş, altyazılı ve kliniğinizin renklerinde. Her metin siz görmeden önce denetlenir.

Hastalar, kendini tanıdık hissettikleri hekimi seçmeyi sever; kısa videolar bunun en kolay yollarından biridir. Ama her hafta konu bulmak, metin yazmak, çekmek ve kurgulamak klinikte kimsenin ayıramadığı saatler ister. Üstelik tek bir dikkatsiz ifade, sağlık hizmetlerindeki tanıtım kurallarına aykırı düşebilir.

NASIL ÇALIŞIR
• Bir kez kurulum: dil, tedaviler, hitap (siz ya da sen), renkler ve logo. Videolar yalnızca kliniğinizin sunduğu tedavileri konu alır.
• Her pazartesi: ülkenizdeki hastaların Google'da gerçekten aradığı sorulara yanıt veren beş dikey video. Seslendirilmiş, altyazılı, logolu.
• Haftanın tamamını tek dokunuşla onaylayın ya da videoları tek tek.
• Telefonunuzdan tek dokunuşla paylaşın; açıklama ve etiketler önceden kopyalanmış olur.

SİZ GÖRMEDEN ÖNCE İKİ KEZ DENETİM
• Tanıtım kuralları: Her metin ve açıklama; garanti, sonuç vaadi, üstünlük iddiası, fiyat, kampanya ve indirim, öncesi-sonrası ve hasta yorumu gibi sağlık tanıtımında genellikle yasak olan ifadelere karşı taranır.
• Klinik doğruluk: Genel diş hekimi rolündeki bir denetçi her cümleyi yerleşik klinik rehberlerle karşılaştırır.
• Ses ve görüntü: Seslendirme net duyulur, sessiz boşluk ya da siyah kare olmaz, format her platforma uygundur.
Dikkatinizi gerektiren her şey gerekçesiyle işaretlenir. Onayınız olmadan hiçbir şey yayınlanmaz.

KENDİ YÜZÜNÜZ, KENDİ SESİNİZ
Haftalık çekim kartlarından biriyle beş dakika konuşun; DentVideo kaydı logonuzla kısa, altyazılı kliplere ayırır. Sözleriniz asla değiştirilmez; ikinci kez bakılması gereken bir şey varsa klip, gerekçesi ve önerilen ifadeyle işaretlenir.

YEDİ DİL
Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca ve Portekizce. Yurt dışından gelen hastalara hizmet veren klinikler için kullanışlıdır.

AÇIKÇA SÖYLEYELİM
• Seslendirme yapay bir sestir. Avatar hekim ya da kurgu hasta yoktur; hazır görüntüler insanları değil, nesneleri gösterir.
• Denetim özenli bir filtredir, hukuki danışmanlık değildir. Yayınladıklarınızın sorumluluğu kliniğinize aittir.
• DentVideo sizin yerinize paylaşım yapmaz; onayladığınız videoları siz paylaşırsınız.
• Hasta sayısı vaat etmiyoruz; bunu dürüstçe kimse vaat edemez.

PAKETLER
Abone olmadan önce logonuz ve renklerinizle canlı bir önizleme görürsünüz.
• Starter: her pazartesi beş denetlenmiş video ve çekim kartları.
• Practice: Starter'daki her şey, kendi kayıtlarınızdan altyazılı klipler, her videoda logonuz ve kurumsal renkleriniz. Aylık.
• Group: gruplar ve çok şubeli klinikler için. Bize ulaşın, kurulumu sizinle birlikte yapalım.

Kullanım koşulları: https://dentvideo.com/terms
Gizlilik politikası: https://dentvideo.com/privacy

DentVideo bir Bulsu Labs ürünüdür.
```

**Screenshot captions** (one per screenshot, in order):

1. Her pazartesi beş hasta videosu (31)
2. Hastaların gerçekten aradığı konular (36)
3. Siz görmeden önce iki kez denetlenir (36)
4. Tüm haftayı tek dokunuşla onaylayın (35)
5. Tek dokunuşla paylaşın, metin hazır (35)
6. 5 dakika konuşun, klipleriniz hazır (35)

## fr-FR

*App Store : France (aussi Belgique, Suisse, Canada fr) · Google Play : Français (France)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo : Cabinet Dentaire` | 28 |
| Subtitle (iOS) | `Vidéos pour dentistes` | 21 |
| Keywords (iOS) | `dentiste,marketing,communication,réseaux,sociaux,patient,information,contenu,publication,idées,ia` | 97 |
| Promotional text (iOS) | Chaque lundi, cinq vidéos d'information patient pour votre cabinet : voix off, sous-titres, vos couleurs, vérifiées (règles de communication, exactitude clinique). | 163 |
| Short description (Play) | Cinq vidéos d'information patient chaque lundi, vérifiées avant envoi. | 70 |

**Search evidence (Google suggest, Nov 2026):** marketing dentaire, marketing cabinet dentaire, marketing et communication au cabinet dentaire, publicité dentiste, dentiste réseaux sociaux, vidéo présentation cabinet dentaire, application pour dentiste.

**Full description** (3275 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo crée de courtes vidéos d'information patient pour votre cabinet dentaire : cinq chaque lundi, en voix off, sous-titrées et aux couleurs du cabinet. Chaque script est vérifié avant de vous parvenir.

Les patients choisissent volontiers un praticien qu'ils ont l'impression de déjà connaître, et la vidéo courte est l'un des moyens les plus simples d'y parvenir. Mais trouver des sujets, écrire, filmer et monter chaque semaine prend des soirées que peu de cabinets ont. Et une formulation maladroite peut basculer de l'information vers la publicité, que la déontologie encadre strictement.

COMMENT ÇA MARCHE
• Un seul paramétrage : langue, actes pratiqués, ton (vouvoiement ou tutoiement), couleurs et logo. Les vidéos ne portent que sur les soins que vous proposez.
• Chaque lundi : cinq vidéos verticales qui répondent aux questions que les patients de votre pays recherchent réellement sur Google. Voix off, sous-titres, votre identité visuelle.
• Validez toute la semaine d'un geste, ou vidéo par vidéo.
• Partagez depuis votre téléphone d'un geste : le texte et les hashtags sont déjà copiés.

VÉRIFIÉ DEUX FOIS AVANT DE VOUS PARVENIR
• Règles de communication : chaque script et chaque légende sont passés au crible des affirmations que les règles de communication en santé restreignent souvent : garanties, promesses de résultat, superlatifs, prix, remises, avant-après et témoignages.
• Exactitude clinique : un relecteur jouant le rôle d'un chirurgien-dentiste omnipraticien confronte chaque affirmation aux recommandations cliniques reconnues.
• Image et son : voix audible, ni blancs ni images noires, le bon format pour chaque réseau.
Ce qui mérite votre attention est signalé, avec la raison. Rien n'est publié sans votre validation.

VOTRE VISAGE, VOTRE VOIX
Enregistrez cinq minutes à l'aide d'une des fiches de tournage hebdomadaires : DentVideo en tire de courts extraits sous-titrés avec votre logo. Vos propos ne sont jamais modifiés ; si un passage mérite un second regard, l'extrait est signalé avec la raison et une formulation proposée.

SEPT LANGUES
Français, anglais, allemand, espagnol, italien, portugais et turc, au vouvoiement ou au tutoiement.

EN TOUTE TRANSPARENCE
• La voix off est synthétique. Pas d'avatar de praticien, pas de faux patients ; les images d'illustration montrent des objets, pas des personnes.
• La vérification est un filtre attentif, pas un conseil juridique. Vous restez responsable de ce que vous publiez au regard de votre code de déontologie.
• DentVideo ne publie pas à votre place : c'est vous qui partagez les vidéos validées.
• Nous ne promettons aucun nombre de patients. Personne ne le peut honnêtement.

FORMULES
Avant de vous abonner, vous voyez un aperçu en direct avec votre logo et vos couleurs.
• Starter : cinq vidéos vérifiées chaque lundi et des fiches de tournage.
• Practice : tout Starter, vos propres enregistrements transformés en extraits sous-titrés, votre logo et vos couleurs dans chaque vidéo. Mensuel.
• Group : pour les groupes et les cabinets à plusieurs sites. Contactez-nous, nous le mettons en place avec vous.

Conditions d'utilisation : https://dentvideo.com/terms
Politique de confidentialité : https://dentvideo.com/privacy

DentVideo est un produit de Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinq vidéos patient chaque lundi (32)
2. Ce que vos patients recherchent (31)
3. Vérifiées deux fois avant de vous parvenir (42)
4. Validez la semaine d'un geste (29)
5. Partagez d'un geste, texte copié (32)
6. 5 minutes filmées, vos extraits prêts (37)

## it-IT

*App Store: Italia · Google Play: Italiano*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Studio Dentistico` | 28 |
| Subtitle (iOS) | `Video per dentisti e social` | 27 |
| Keywords (iOS) | `dentista,marketing,dentale,odontoiatria,pazienti,contenuti,pubblicità,sanitaria,post,idee,ia` | 92 |
| Promotional text (iOS) | Ogni lunedì cinque video informativi per i pazienti del tuo studio: voce, sottotitoli e i tuoi colori, verificati su regole di pubblicità sanitaria e accuratezza clinica. | 170 |
| Short description (Play) | Cinque video informativi ogni lunedì per il tuo studio, già verificati. | 71 |

**Search evidence (Google suggest, Nov 2026):** marketing dentisti, marketing studio dentistico, agenzia marketing dentisti, marketing per studi dentistici, video per studio dentistico, video presentazione studio dentistico, video sala attesa studio dentistico, app per studi dentistici, social media dentista, post instagram dentista.

**Full description** (3031 / 4000 chars; same text for App Store and Google Play):

```text
DentVideo crea brevi video informativi per i pazienti del tuo studio dentistico: cinque ogni lunedì, con voce narrante, sottotitoli e i colori dello studio. Ogni testo viene verificato prima che tu lo veda.

I pazienti scelgono volentieri un dentista che sentono di conoscere già, e i video brevi sono uno dei modi più semplici per arrivarci. Ma trovare argomenti, scrivere, girare e montare ogni settimana richiede serate che in studio nessuno ha. E una frase di troppo può violare le regole sulla pubblicità sanitaria e il codice deontologico.

COME FUNZIONA
• Configuri una volta sola: lingua, prestazioni, tono (tu o Lei), colori e logo. I video parlano solo delle prestazioni che offri.
• Ogni lunedì: cinque video verticali che rispondono alle domande che i pazienti del tuo Paese cercano davvero su Google. Con voce, sottotitoli e la tua immagine.
• Approvi tutta la settimana con un tocco, oppure video per video.
• Condividi dal telefono con un tocco: testo e hashtag sono già copiati.

VERIFICATO DUE VOLTE PRIMA CHE TU LO VEDA
• Pubblicità sanitaria: ogni testo e ogni didascalia vengono controllati rispetto alle affermazioni che le regole spesso limitano: garanzie, promesse di risultato, superlativi, prezzi, sconti, prima e dopo e testimonianze.
• Accuratezza clinica: un revisore nel ruolo di odontoiatra generico confronta ogni affermazione con le linee guida cliniche riconosciute.
• Audio e video: voce udibile, niente silenzi o fotogrammi neri, il formato giusto per ogni piattaforma.
Ciò che richiede la tua attenzione viene segnalato con il motivo. Nulla esce senza la tua approvazione.

IL TUO VOLTO, LA TUA VOCE
Registra cinque minuti seguendo una delle schede di ripresa settimanali e DentVideo li trasforma in brevi clip sottotitolate con il tuo logo. Le tue parole non vengono mai modificate; se qualcosa merita un secondo sguardo, la clip viene segnalata con il motivo e una formulazione suggerita.

SETTE LINGUE
Italiano, inglese, tedesco, spagnolo, francese, portoghese e turco, con il tu o con il Lei. Utile se curi pazienti stranieri.

IN TUTTA CHIAREZZA
• La voce narrante è sintetica. Nessun avatar di medico, nessun paziente inventato; le immagini di repertorio mostrano oggetti, non persone.
• La verifica è un filtro accurato, non una consulenza legale. La responsabilità di ciò che pubblichi resta dello studio.
• DentVideo non pubblica al posto tuo: sei tu a condividere i video approvati.
• Non promettiamo un numero di pazienti. Nessuno può farlo onestamente.

PIANI
Prima di abbonarti vedi un'anteprima dal vivo con il tuo logo e i tuoi colori.
• Starter: cinque video verificati ogni lunedì e schede di ripresa.
• Practice: tutto Starter, le tue registrazioni trasformate in clip sottotitolate, il tuo logo e i tuoi colori in ogni video. Mensile.
• Group: per gruppi e studi con più sedi. Contattaci e lo configuriamo insieme a te.

Termini di utilizzo: https://dentvideo.com/terms
Informativa sulla privacy: https://dentvideo.com/privacy

DentVideo è un prodotto di Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinque video per i pazienti ogni lunedì (39)
2. Ciò che i pazienti cercano davvero (34)
3. Verificati due volte prima di te (32)
4. Approva la settimana con un tocco (33)
5. Condividi con un tocco, testo pronto (36)
6. Registra 5 minuti, ecco le tue clip (35)

## pt-BR

*App Store: Brasil · Google Play: Português (Brasil)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Marketing Odonto` | 27 |
| Subtitle (iOS) | `Vídeos para dentistas` | 21 |
| Keywords (iOS) | `odontológico,odontologia,consultório,clínica,posts,conteúdo,pacientes,educação,publicidade,ideias,ia` | 100 |
| Promotional text (iOS) | Toda segunda-feira, cinco vídeos educativos para o seu consultório: com narração, legendas e as suas cores, revisados quanto à publicidade e à precisão clínica. | 160 |
| Short description (Play) | Cinco vídeos educativos toda segunda para o seu consultório, já revisados. | 74 |

**Search evidence (Google suggest, Nov 2026):** marketing odontológico (instagram, regras, agência), marketing para dentistas (instagram, digital), posts para dentistas / posts prontos para dentistas, vídeos para dentistas, vídeos odontologia para pacientes, odontologia vídeos educativos, app para dentistas, publicidade odontológica / manual de publicidade odontológica.

**Full description** (2962 / 4000 chars; same text for App Store and Google Play):

```text
O DentVideo cria vídeos curtos de educação para os pacientes do seu consultório odontológico: cinco toda segunda-feira, com narração, legendas e as cores da sua clínica. Cada roteiro é revisado antes de chegar até você.

Os pacientes gostam de escolher um dentista que sentem que já conhecem, e vídeos curtos são um dos jeitos mais simples de chegar lá. Mas encontrar temas, escrever, gravar e editar toda semana toma noites que quase ninguém no consultório tem. E uma frase mal colocada pode contrariar as regras de publicidade em odontologia.

COMO FUNCIONA
• Você configura uma vez: idioma, tratamentos, tom, cores e logo. Os vídeos falam apenas dos tratamentos que você oferece.
• Toda segunda: cinco vídeos verticais que respondem ao que os pacientes do seu país realmente pesquisam no Google. Com narração, legendas e a sua identidade visual.
• Aprove a semana inteira com um toque, ou vídeo por vídeo.
• Compartilhe pelo celular com um toque: a legenda e as hashtags já ficam copiadas.

REVISADO DUAS VEZES ANTES DE VOCÊ VER
• Regras de publicidade: cada roteiro e cada legenda são checados contra afirmações que as normas costumam restringir: garantias, promessas de resultado, superlativos, preços, descontos, antes e depois e depoimentos.
• Precisão clínica: um revisor no papel de clínico geral confere cada afirmação com as diretrizes clínicas reconhecidas.
• Som e imagem: narração audível, sem silêncios nem quadros pretos, no formato certo para cada rede.
O que precisa da sua atenção vem marcado, com o motivo. Nada sai sem a sua aprovação.

SEU ROSTO, SUA VOZ
Grave cinco minutos usando um dos cartões de gravação semanais e o DentVideo transforma o vídeo em clipes curtos, legendados, com o seu logo. As suas palavras nunca são alteradas; se algo merecer um segundo olhar, o clipe é marcado com o motivo e uma sugestão de texto.

SETE IDIOMAS
Português, inglês, alemão, espanhol, francês, italiano e turco. Útil se você atende pacientes estrangeiros.

SEM RODEIOS
• A narração é uma voz sintética. Não há avatares de dentistas nem pacientes inventados; as imagens de banco mostram objetos, não pessoas.
• A revisão é um filtro cuidadoso, não assessoria jurídica. Confira as normas do seu conselho; a responsabilidade pelo que você publica continua sendo sua.
• O DentVideo não publica por você. Você compartilha os vídeos aprovados.
• Não prometemos número de pacientes. Ninguém pode prometer isso com honestidade.

PLANOS
Antes de assinar, você vê uma prévia ao vivo com o seu logo e as suas cores.
• Starter: cinco vídeos revisados toda segunda e cartões de gravação.
• Practice: tudo do Starter, as suas gravações transformadas em clipes legendados e o seu logo e cores em cada vídeo. Mensal.
• Group: para grupos e clínicas com várias unidades. Fale com a gente e configuramos tudo com você.

Termos de uso: https://dentvideo.com/terms
Política de privacidade: https://dentvideo.com/privacy

O DentVideo é um produto da Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinco vídeos para pacientes toda segunda (40)
2. O que seus pacientes pesquisam (30)
3. Revisado duas vezes antes de você ver (37)
4. Aprove a semana com um toque (28)
5. Compartilhe com um toque, legenda pronta (40)
6. Grave 5 minutos e receba seus clipes (36)

## pt-PT

*App Store: Portugal · Google Play: Português (Portugal)*

| Field | Text | Chars |
| --- | --- | --- |
| App name | `DentVideo: Clínica Dentária` | 27 |
| Subtitle (iOS) | `Vídeos para médicos dentistas` | 29 |
| Keywords (iOS) | `dentista,marketing,dentário,medicina,redes,sociais,doentes,conteúdo,publicidade,saúde,oral,ideias,ia` | 100 |
| Promotional text (iOS) | Todas as segundas, cinco vídeos informativos para a sua clínica: com locução, legendas e as suas cores, verificados quanto à publicidade em saúde e ao rigor clínico. | 165 |
| Short description (Play) | Cinco vídeos informativos todas as segundas para a sua clínica, já verificados. | 79 |

**Search evidence (Google suggest, Nov 2026):** marketing dentista (instagram, digital, agência), publicidade dentista / publicidade para dentistas, vídeos dentista / vídeos para dentistas, clínica dentária instagram, marketing clínica dentária, app para dentistas.

**Full description** (2972 / 4000 chars; same text for App Store and Google Play):

```text
O DentVideo cria vídeos curtos de informação ao doente para a sua clínica dentária: cinco todas as segundas-feiras, com locução, legendas e as cores da clínica. Cada guião é verificado antes de o ver.

Os doentes tendem a escolher o médico dentista que sentem já conhecer, e os vídeos curtos são uma das formas mais simples de lá chegar. Mas encontrar temas, escrever, gravar e editar todas as semanas ocupa serões que poucas clínicas têm. E uma frase menos cuidada pode violar as regras da publicidade em saúde.

COMO FUNCIONA
• Configura uma vez: idioma, tratamentos, tom, cores e logótipo. Os vídeos tratam apenas dos tratamentos que a clínica oferece.
• Todas as segundas: cinco vídeos verticais que respondem ao que os doentes do seu país procuram realmente no Google. Com locução, legendas e a imagem da clínica.
• Aprove a semana inteira com um toque, ou vídeo a vídeo.
• Partilhe a partir do telemóvel com um toque: o texto e as hashtags ficam já copiados.

VERIFICADO DUAS VEZES ANTES DE O VER
• Publicidade em saúde: cada guião e cada legenda são analisados face às afirmações que as regras costumam restringir: garantias, promessas de resultado, superlativos, preços, descontos, antes e depois e testemunhos.
• Rigor clínico: um revisor no papel de médico dentista generalista confronta cada afirmação com as orientações clínicas reconhecidas.
• Imagem e som: locução audível, sem silêncios nem imagens pretas, no formato certo para cada rede.
O que precisa da sua atenção é assinalado, com o motivo. Nada é publicado sem a sua aprovação.

O SEU ROSTO, A SUA VOZ
Grave cinco minutos com um dos cartões de gravação semanais e o DentVideo transforma-os em clipes curtos, legendados, com o seu logótipo. As suas palavras nunca são alteradas; se algo merecer um segundo olhar, o clipe é assinalado com o motivo e uma sugestão de redação.

SETE IDIOMAS
Português, inglês, alemão, espanhol, francês, italiano e turco. Útil se atende doentes de outros países.

COM FRANQUEZA
• A locução é uma voz sintética. Não há avatares de médicos nem doentes inventados; as imagens de arquivo mostram objetos, não pessoas.
• A verificação é um filtro cuidadoso, não aconselhamento jurídico. A responsabilidade pelo que publica continua a ser da clínica.
• O DentVideo não publica por si. É a clínica que partilha os vídeos aprovados.
• Não prometemos um número de doentes. Ninguém o pode fazer com honestidade.

PLANOS
Antes de subscrever, vê uma pré-visualização em direto com o seu logótipo e as suas cores.
• Starter: cinco vídeos verificados todas as segundas e cartões de gravação.
• Practice: tudo o que o Starter inclui, as suas gravações transformadas em clipes legendados e o seu logótipo e cores em cada vídeo. Mensal.
• Group: para grupos e clínicas com várias unidades. Fale connosco e configuramos tudo consigo.

Termos de utilização: https://dentvideo.com/terms
Política de privacidade: https://dentvideo.com/privacy

O DentVideo é um produto da Bulsu Labs.
```

**Screenshot captions** (one per screenshot, in order):

1. Cinco vídeos para doentes à segunda (35)
2. O que os doentes procuram no Google (35)
3. Verificado duas vezes antes de o ver (36)
4. Aprove a semana com um toque (28)
5. Partilhe com um toque, texto pronto (35)
6. Grave 5 minutos e receba os clipes (34)

## Before submission (checklist)

- [ ] Paid-first vs "free first week" is resolved on the site, `entity.ts` and here.
- [ ] Starter logo/colours question resolved; PLANS block adjusted.
- [ ] `/terms` and `/privacy` exist on dentvideo.com (or the URLs in every description are replaced).
- [ ] IAP products created at the website's list prices (or the external-purchase route chosen); prices stay out of the
      description text.
- [ ] Every claim in the description is true of the *app*, not only of the web app. Check the share sheet, approve-all,
      the filming cards and recording upload.
- [ ] Support URL `https://dentvideo.com`; support email `hello@dentvideo.com` (it appears in the site code; confirm the inbox is monitored).
- [ ] Marketing URL `https://dentvideo.com/<locale>` per locale. Only en, de, es, tr and fr landings exist, so it, pt-BR
      and pt-PT point to `https://dentvideo.com`.
- [ ] A native speaker skims it-IT, pt-BR and pt-PT. There is no site copy in those languages to cross-check against.
- [ ] Re-run the count script after any edit. The script lives in the session scratchpad; the rule is simple to
      re-implement: `len()` per field, keyword tokens must not appear in the name or subtitle, and no banned words.

## Maintenance

- **Promotional text** (iOS) can change without review. Use it for seasonal topics, for example back-to-school
  paediatric content in September or the "Ağız ve Diş Sağlığı Haftası" in November in Türkiye. Keep it free of promises.
- **Keyword field** changes need a new app version. Review it with App Store Connect search data after the first 30 days.
- **Product facts** change in one place, `web/src/content/guides/entity.ts`. Update this file when they change.
