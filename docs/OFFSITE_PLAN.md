# DentVideo: off-site SEO and GEO plan

Written 2026-11-08. This plan covers what happens **outside dentvideo.com**:
- listings and profiles;
- launch sites;
- trade press, podcasts and associations;
- the consistency work that gets answer engines (ChatGPT search, Perplexity, Gemini, Google AI Overviews, Copilot) to
  describe and cite DentVideo correctly.

On-site work (guides, llms.txt, schema, sitemap, IndexNow) is in `docs/SEO_PLAN.md`. App-store metadata is in `docs/ASO.md`.

**Ground rules (from `docs/POSITIONING.md` §7). They apply to every profile, pitch and post:**
- no promised patients or results;
- no "100% compliant", "approved by" or "painless";
- no invented statistics or testimonials;
- no professional body named as a partner;
- no disparaging named competitors.

Reviews come only from real clinics, are never paid for, and are requested only with the clinic's consent.

---

## How URLs were verified (read this first)

Outbound fetches from this session's sandbox were refused by its network proxy for **every** external host tried
(77 URLs, all `CONNECT 403`). WebFetch was not allowed to resolve them either. So:

- **Verified (search)** means a web search on 2026-11-08 returned the site's own page, or a dated third-party page
  describing it, matching what is written here. The page itself was not opened.
- **Unverified** means the URL comes from prior knowledge and could not be confirmed this session. Open it before
  relying on it, and treat any cost shown as an estimate.
- Directory prices change often, and several aggregator pages disagreed with each other. Confirm the price on the
  submission page before paying.

---

## (a) Where to be listed: prioritised

Priority order: **entity and GEO value first** (sources answer engines read and that carry our facts), then audience fit
(dentists, or the people who sell to them), then cost.

Mass directory submission is not the goal. Google's spam policies treat low-quality directory links as link spam.
About 25 good profiles that say the same thing are worth more than 300 weak ones.

### Tier 1: free, do in the first two weeks

| # | Site | URL | Cost | What to submit | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | **G2** (free seller profile) | https://sell.g2.com/create-free-profile | Free profile; paid tiers add analytics and customisation | Product profile with the G2 text in (d), 6 screenshots (reuse the ASO set), plan names, website. Categories to request: *Social Media Management*, *AI Video Generator* / *Video Creation*, *Dental Practice Marketing* (if offered). G2's research team approves new listings in about 1–3 business days. | Verified (search): G2's own pages describe the free profile and the claim flow |
| 2 | **Capterra / GetApp / Software Advice** (one vendor account feeds all three, plus local sites such as capterra.de, .es and .fr) | https://www.capterra.com/vendors/sign-up | Free basic listing; pay-per-click optional (don't buy it yet) | Same text and screenshots as G2, pricing page link, categories *Social Media Marketing* / *Video Making*. One October 2026 report says free profiles carry **no** website link. Its value is reviews and visibility in answer engines, not a backlink. | Unverified URL. Free listing confirmed by several third-party sources. G2's acquisition of these sites was announced in 2026, so the sign-up flow may now redirect to G2. |
| 3 | **LinkedIn company page** | https://www.linkedin.com/company/setup/new/ | Free | Page "DentVideo" (showcase under Bulsu Labs if a Bulsu Labs page exists), tagline and About text from (d), logo `web/public/dentvideo/icon-512.png`, website, industry *Software Development*, specialities. Link the founder's profile as an employee. | Unverified URL (standard LinkedIn path) |
| 4 | **Crunchbase** | https://www.crunchbase.com (sign in → "Add organization") | Free basic profile | Organisation "DentVideo" *or* "Bulsu Labs" with DentVideo as product: short and long description from (d), website, LinkedIn, HQ country, founder. **Use the real founding date and location; do not estimate them.** | Unverified URL |
| 5 | **Product Hunt** | https://www.producthunt.com | Free | Full launch kit in (b). Launch only once the app or web flow works end to end in English. | Unverified URL (free launch confirmed in third-party 2026 guides) |
| 6 | **OMR Reviews** (the DACH software-review platform) | https://omr.com/de/reviews | Free profile; paid packages Essential/Professional/Scale/Ultimate for review campaigns and badges | German profile with the German text in (d). Categories: *Social-Media-Management*, *Video-Marketing*. OMR may ask for ID and a VAT/company-register document. | Verified (search): OMR's vendor terms and pricing pages |
| 7 | **AlternativeTo** | https://alternativeto.net (Add application) | Free (one source mentions an optional ~$5 priority review) | Add DentVideo as a web app; tags `dental`, `patient-education`, `video`, `social-media`. List it as an alternative to general AI-video tools (Pictory, Opus Clip, Synthesia). Describe the difference neutrally: dental-specific topics and review. | Verified (search): third-party pages describe it as free with moderation |
| 8 | **SaaSHub** | https://www.saashub.com/submit | Free (account, then review) | Same short and long text as G2. | Verified (search, third-party guide) |
| 9 | **Wikidata** | https://www.wikidata.org/wiki/Special:NewItem | Free | **Wait** until there is at least one independent source (trade-press article, podcast page, G2 listing is borderline). Items without "serious and publicly available references" get deleted. Statements in (d). | Verified (search) for the notability rule; the URL is standard |
| 10 | **appvizer** (France and other EU markets) | https://www.appvizer.fr | Free listing (paid lead programmes exist) | French text from (d), category *Marketing des réseaux sociaux*. | Unverified |

### Tier 2: AI-tool directories (pick one or two; mostly paid)

These rank for "AI tool for X" queries, and answer engines scrape them heavily. Their audience is not dentists, so they
are worth a small one-off fee at most.

| # | Site | URL | Cost | What to submit | Status |
| --- | --- | --- | --- | --- | --- |
| 11 | **There's An AI For That** | https://theresanaiforthat.com/submit/ | From about $49 one-time (third-party report, Oct 2026; G2 lists $49–$347) | Task: "Dental patient-education videos". Use the 160-char line from (d) plus the screenshots. | Verified (search, third-party pricing) |
| 12 | **Toolify** | https://www.toolify.ai/submit | About $99 one-time (third-party report, Oct 2026) | Same. Only if #11 brings referrals. | Verified (search, third-party pricing, possibly biased) |
| 13 | **Future Tools** | https://www.futuretools.io/submit-a-tool | Free submission historically; curated, so may not be accepted | Same. | Unverified |
| 14 | Futurepedia | https://www.futurepedia.io | Reported at about $497 with nofollow links; one report says the submit page returns 404 | **Skip.** | Verified (search) as poor value |
| 15 | BetaList, Uneed, Microlaunch, Peerlist Launchpad, Fazier | betalist.com, uneed.best, microlaunch.net, peerlist.io/launchpad, fazier.com | Sources conflict: free queues have mostly closed, and paid fast-track costs about $30–$130 | **Skip or one at most.** BetaList is for pre-launch startups; these audiences are founders, not dentists. | Partly verified (search; prices conflict) |

### Tier 3: dental trade press, resource pages and podcasts (earned, not bought)

These are the links and mentions that matter most for GEO in each language. The aim is an *editorial* mention: a guest
article, an expert quote or a podcast episode. A paid "Firmenprofil" or banner is not the aim. Offer content (the
pre-post compliance checklist, the guides), not adverts.

**Türkiye (priority market)**

| Site | URL | Cost | What to pitch | Status |
| --- | --- | --- | --- | --- |
| Dental Tribune Türkiye | https://www.dental-tribune.com (DT Turkey edition) | Editorial: free; ads: on request | Article: "2025 Tanıtım Yönetmeliği sonrası diş hekimi sosyal medyada ne paylaşabilir?" based on `/tr/guides/dis-hekimi-reklam-yasagi` | Verified (search): DT Turkey e-paper editions exist; current editorial contact not confirmed |
| Türk Dişhekimleri Birliği (TDB) and il odaları (e.g. İstanbul Dişhekimleri Odası) | https://www.tdb.org.tr · https://www.ido.org.tr | Free | An offer of a free webinar or newsletter item on the promotion regulation. Ask for **no endorsement**: a speaker slot or a bulletin item only. | Unverified (fetch blocked) |
| Dentistry faculties and student clubs (e.g. "dijital hekimlik" seminars) | per university | Free | Guest lecture on social media under the regulation | Unverified |
| startups.watch (Turkish startup database) | https://startups.watch | Profile process unclear; the platform sells analytics | Company profile for Bulsu Labs/DentVideo, if free | Verified (search) that it exists; listing terms not confirmed |
| Webrazzi (Turkish tech press) | https://webrazzi.com | Editorial: free | Launch news **only** once there is something newsworthy (e.g. the founding cohort is full) | Verified (search) that it exists |

**DACH**

| Site | URL | Cost | What to pitch | Status |
| --- | --- | --- | --- | --- |
| ZWP online / Dental Tribune D-A-CH (OEMUS Media) | https://www.zwp-online.info | Editorial news: free; "Firmenprofil" microsite: paid | Product news under *Branchenmeldungen*, plus a guest article "Social Media ohne HWG-Abmahnung: eine Checkliste" | Verified (search): paid Firmenprofile and the news sections |
| zm – Zahnärztliche Mitteilungen | https://www.zm-online.de | Editorial | Expert-comment angle on the BGH/OLG before-and-after rulings; no product pitch | Unverified |
| DZW / dentalmagazin.de | https://www.dzw.de · https://www.dentalmagazin.de | Editorial | Same article, different angle (practice management) | Unverified |
| Landeszahnärztekammern (Fortbildung) | per chamber | Free | An offer of a neutral webinar on social media and the HWG. CME accreditation is not required. | Unverified |

**Spain and Latin America**

| Site | URL | Cost | What to pitch | Status |
| --- | --- | --- | --- | --- |
| Gaceta Dental | https://gacetadental.com | Editorial free; ads, Brand Day and a partner directory paid (media kit 2025) | Article "Qué puede publicar una clínica dental en redes sin incumplir la publicidad sanitaria" | Verified (search): 2025 media kit |
| Dental Tribune Hispanic & Latin America | https://www.dental-tribune.com | Editorial | Same article in LatAm Spanish, without Spain-specific law | Unverified (edition not confirmed) |
| Colegios de dentistas (e.g. COEM Madrid), Consejo General de Dentistas | https://www.consejodentistas.es | Free | Talk on publicidad sanitaria for members; no endorsement | Unverified |
| Maxillaris | https://www.maxillaris.com | Editorial | Practice-management column | Unverified |

**France**

| Site | URL | Cost | What to pitch | Status |
| --- | --- | --- | --- | --- |
| L'Information Dentaire | https://www.information-dentaire.fr | Editorial; ads via its publisher | Tribune: "Information ou publicité ? Ce qu'un cabinet peut publier sur Instagram depuis le décret 2020-1658" | Verified (search): publisher and weekly magazine |
| Dentalespace | https://www.dentalespace.com | Advertiser and supplier packages; members' directory | Supplier listing, if a free tier exists; otherwise an article contribution | Verified (search): positions itself as a channel for suppliers and advertisers |
| Le Fil Dentaire | https://www.lefildentaire.com | Editorial | Same tribune | Unverified (search returned only the floss product) |
| Syndicats (Les CDF, FSDL) and URPS newsletters | per organisation | Free | Information item on the ONCD recommendations; no endorsement | Unverified |

**US / UK (English)**

| Site | URL | Cost | What to pitch | Status |
| --- | --- | --- | --- | --- |
| Dentaltown (forums and blogs) | https://www.dentaltown.com | Free to post as a member; vendor rules apply | Genuine answers in the marketing forum. Disclose that you are the founder. No link-dropping. | Verified (search): Dentaltown hosts dental-marketing podcasts and blogs |
| DrBicuspid | https://www.drbicuspid.com | Editorial | Practice-management op-ed on advertising rules for social media | Unverified |
| Dental Products Report | https://www.dentalproductsreport.com | Editorial product news | New-product submission | Unverified |
| Dentistry.co.uk (UK) | https://www.dentistry.co.uk | Editorial | "What the GDC and CAP Code mean for your practice's Reels" | Unverified |
| Podcasts: *The No BS Dental Growth Podcast* (KickStart Dental), *Dental Marketing Goat* (Gary Bird), *Dental Marketing Heroes* (Ian Cantle, UK), *The Dental Brief* | via each show's site | Free (guest) | Topic: "What dentists can and can't say on social media, country by country". Use the guest-inquiry contact on each show's own site. | Verified (search): each show exists and lists guest/contact routes |

**Italy / Portugal / Brazil:** no site copy exists in these languages yet, so skip trade press until guides exist (SEO_PLAN
"Later"). Infodent (Italian dental publisher, member of UNIDI) is the first one to approach then.

### Cold-outreach law (read before using section (c))

Not legal advice. These are the commonly cited rules; check before a campaign.

| Market | Rule |
| --- | --- |
| **DE** | § 7 UWG: advertising e-mail without prior consent is generally unlawful **even B2B**. Pitch editors and associations through their published editorial or press contacts with a content offer, not a sales pitch. Reach agencies via LinkedIn or at events, not by cold e-mail. |
| **ES** | LSSI art. 21 requires prior consent for commercial e-mail. Treat it like DE. |
| **FR** | B2B prospecting e-mail to a professional address is accepted (CNIL) if it relates to the recipient's profession, identifies the sender and offers an opt-out. |
| **UK** | PECR allows B2B e-mail to corporate subscribers. Many dental practices are partnerships or sole traders, which are treated like individuals, so use consent or LinkedIn. |
| **TR** | Law 6563 / İYS: commercial e-messages to *tacir/esnaf* may be sent without prior consent as long as opt-out works. Confirm that the recipient counts as one. |
| **US** | CAN-SPAM: opt-out, physical address, honest subject line. |

Every template below has an opt-out line and a single ask.

---

## (b) Product Hunt launch kit

**Why bother:** Product Hunt's audience is founders, not dentists. The launch is for the **entity**: a high-authority page
answer engines quote, a backlink, and a dated "launched" event for Crunchbase and Wikidata. It is not for sign-ups.
Don't spend more than a day on it.

- **Name:** DentVideo
- **Tagline** (60 max): `Weekly patient-education videos for dental clinics` (50)
- **Topics:** Marketing, Video, Artificial Intelligence, Health & Fitness (or Medical, if offered), SaaS
- **Description** (260 max):
  > Five short, narrated, captioned videos every Monday for your dental clinic, on what local patients search for and in
  > your colours. Each script is checked for health-advertising rules and clinical accuracy. You approve in one tap. 7
  > languages. (242)
- **Links:** https://dentvideo.com, plus the app links once live.
- **Pricing field:** Paid. Mention the live branded preview before payment and the founding offer (Practice at the Starter
  price for 12 months for the first 100 clinics, code `KURUCU100`) in the first comment, not in the tagline.
- **Launch timing:** 00:01 Pacific, Tuesday to Thursday. Product Hunt forbids asking for upvotes: tell people "we're live,
  feedback welcome", never "please upvote". The owner must be online to reply for the first 6–8 hours.

**First comment (maker):**

> Hi Product Hunt, I'm the maker of DentVideo.
>
> Dentists know they "should" post short videos. Most don't, for two reasons: it takes evenings, and in many countries one
> wrong word ("painless", "guaranteed", a price, a before-and-after) breaks health-advertising rules. Turkey's 2025
> regulation, Germany's HWG, France's code of ethics and the UK's GDC guidance all draw that line differently.
>
> DentVideo does the weekly part. Every Monday a clinic gets five vertical videos answering questions patients in its
> country actually search for. They are narrated, captioned and in the clinic's colours. Before the dentist sees them,
> every script goes through two reviewers: one for advertising rules, one acting as a general dentist for clinical
> accuracy. The dentist approves the week in one tap and shares from their phone. They can also record five minutes of
> themselves; we cut it into captioned clips and never change their words.
>
> What we don't do, on purpose: no avatar doctors, no fake patients, no promised patient numbers, no auto-posting. The
> check is a careful filter, not legal advice. The dentist always has the last word.
>
> Seven languages: EN, DE, ES, FR, IT, PT, TR. Paid plans, with a live preview of your own branded video before you pay.
> The first 100 clinics get Practice at the Starter price for 12 months with code KURUCU100.
>
> I'd love feedback, especially from anyone who has done marketing for a clinic: what would make you trust this with your
> practice's name?

Before posting, check it against the current pricing and preview flow. Strike "live preview" if the preview isn't live yet.

**Gallery** (1270 × 760 images; captions as the image headline):

| # | Image | Caption |
| --- | --- | --- |
| 1 | Hero: phone frame playing a sample video, the week's five cards beside it | Five patient videos every Monday. You just approve. |
| 2 | Topic cards showing patient questions | Topics from what patients in your country search for |
| 3 | The three checks on one video | Checked twice: advertising rules and clinical accuracy |
| 4 | Approve-all button and share sheet | Approve the week in one tap, share in one tap |
| 5 | Filming card next to clips from the dentist's own recording | Five minutes of you becomes a week of clips |
| 6 | The same video in TR, DE and ES side by side | Seven languages, formal or informal |
| 7 (optional) | 60–90 s screen recording, no voice-over needed | (video) |

Use only the demo clinic; never a real clinic or patient.

---

## (c) Outreach templates

How to use them:
- Personalise the first line every time; a template sent unedited is spam.
- Send one follow-up at most, after 7–10 days.
- Never attach files on first contact.
- Never claim a partnership, endorsement or result.
- Check the cold-outreach law table above first, especially for DE and ES.

`[ ]` marks what to fill in.

### 1. Dental associations, chambers, colleges (offer: free, neutral education)

**EN**
> Subject: Free member session: what dentists can post on social media
>
> Dear [name],
>
> [One line showing you know their recent work, e.g. "Your October bulletin on patient communication"].
>
> I run DentVideo, a small software company that makes patient-education videos for clinics. To build it, we had to map
> what the [GDC guidance and CAP Code / state board rules] allow on social media. I'd be glad to give your members a free,
> 30-minute session on it: no product pitch, plus a printable pre-post checklist they can keep.
>
> If that's useful, I can send an outline. If not, no reply needed and I won't follow up.
>
> [Name], founder, DentVideo (Bulsu Labs) · dentvideo.com

**TR**
> Konu: Üyelerinize ücretsiz bilgilendirme: Diş hekimi sosyal medyada ne paylaşabilir?
>
> Sayın [ad],
>
> [Odanın son çalışmasına dair tek cümle].
>
> Diş kliniklerine hasta bilgilendirme videoları hazırlayan DentVideo'nun kurucusuyum. Ürünü geliştirirken 12 Kasım 2025
> tarihli Tanıtım ve Bilgilendirme Yönetmeliği'nin sosyal medyada neye izin verdiğini ayrıntılı olarak inceledik.
> Üyelerinize bu konuda 30 dakikalık, ürün tanıtımı içermeyen ücretsiz bir çevrimiçi oturum ve yazdırılabilir bir
> "paylaşmadan önce" kontrol listesi sunmak isterim.
>
> Uygun görürseniz kısa bir taslak gönderebilirim. Uygun değilse yanıt vermenize gerek yok; tekrar yazmayacağım.
>
> Saygılarımla, [ad], DentVideo (Bulsu Labs) · dentvideo.com/tr

**DE** (via the chamber's published press or Fortbildung contact, not a cold sales e-mail)
> Betreff: Angebot für Ihre Fortbildung: Social Media und HWG in der Zahnarztpraxis
>
> Sehr geehrte/r [Name],
>
> [ein Satz zu einer aktuellen Veranstaltung oder Veröffentlichung der Kammer].
>
> Ich bin Gründer von DentVideo, einer Software für Patientenaufklärungsvideos. Für die Entwicklung haben wir die
> Grenzen des Heilmittelwerbegesetzes und der Berufsordnung für Social Media sowie die aktuellen Urteile zu
> Vorher-Nachher-Bildern aufgearbeitet. Gern biete ich Ihren Mitgliedern dazu einen kostenfreien, produktneutralen
> 30-Minuten-Vortrag samt Checkliste an.
>
> Wenn das passt, schicke ich eine Gliederung. Falls nicht, ist keine Antwort nötig.
>
> Mit freundlichen Grüßen, [Name], DentVideo (Bulsu Labs) · dentvideo.com/de

**ES**
> Asunto: Charla gratuita para colegiados: qué puede publicar una clínica en redes
>
> Estimado/a [nombre]:
>
> [Una línea sobre una actividad reciente del colegio].
>
> Soy el fundador de DentVideo, un software que crea vídeos educativos para clínicas dentales. Para desarrollarlo
> analizamos a fondo qué permite la normativa de publicidad sanitaria en redes sociales. Me gustaría ofrecer a sus
> colegiados una charla gratuita de 30 minutos, sin presentación comercial, con una lista de comprobación descargable.
>
> Si le interesa, le envío un guion. Si no, no hace falta que responda.
>
> Un saludo, [nombre], DentVideo (Bulsu Labs) · dentvideo.com/es

**FR**
> Objet : Intervention gratuite : ce qu'un cabinet peut publier sur les réseaux sociaux
>
> Madame, Monsieur,
>
> [Une phrase sur une action récente de l'organisation].
>
> Je suis le fondateur de DentVideo, un logiciel de vidéos d'information patient pour les cabinets dentaires. Pour le
> concevoir, nous avons étudié en détail la frontière entre information et publicité depuis le décret 2020-1658 et les
> recommandations de l'Ordre. Je serais heureux de proposer à vos adhérents une intervention gratuite de 30 minutes, sans
> présentation commerciale, avec une check-list à conserver.
>
> Si cela vous intéresse, je vous envoie un plan. Sinon, inutile de répondre.
>
> Bien cordialement, [nom], DentVideo (Bulsu Labs) · dentvideo.com/fr

### 2. Dental bloggers, editors and podcasts (offer: a useful topic, not a review swap)

**EN**
> Subject: Episode idea: what dentists can't say on social media (country by country)
>
> Hi [name], I liked your episode/post on [topic], especially [specific point].
>
> I build DentVideo, which writes and checks patient-education videos for clinics in seven languages. That means I spend
> my days on the odd differences: the UK bans advertising prescription-only medicines to the public, Germany's HWG
> restricts before-and-after images, Turkey's 2025 rules ban promotion outright. If your listeners would find a practical
> "what's safe to post" segment useful, I'd be glad to join or write it up. Happy to keep the product out of it.
>
> If it's not a fit, no worries, and no follow-up from me.
>
> [Name] · dentvideo.com

**TR**
> Konu: Yazı/bölüm önerisi: Yeni yönetmelikle diş hekimi Instagram'da ne paylaşabilir?
>
> Merhaba [ad], [konu] hakkındaki yazınızı/bölümünüzü çok faydalı buldum.
>
> DentVideo'yu geliştiriyorum; kliniklere yedi dilde hasta bilgilendirme videosu hazırlayıp her metni tanıtım kurallarına
> göre denetliyoruz. Okurlarınız/dinleyicileriniz için "yönetmelik sonrası güvenle paylaşılabilecek 10 konu" başlıklı,
> ürün tanıtımı içermeyen bir yazı ya da sohbet önerebilirim.
>
> Uygun değilse sorun değil, tekrar yazmayacağım.
>
> [ad] · dentvideo.com/tr

**DE** (only to editors' or podcasts' published contact for contributions)
> Betreff: Themenvorschlag: Was Zahnarztpraxen auf Instagram zeigen dürfen
>
> Hallo [Name], Ihr Beitrag zu [Thema] hat mir gefallen, besonders [Punkt].
>
> Ich entwickle DentVideo, eine Software für geprüfte Aufklärungsvideos. Für Ihre Leserinnen und Leser könnte ich einen
> produktneutralen Praxisbeitrag liefern: „Social Media ohne HWG-Abmahnung: 10 Themen, die erlaubt sind“, mit den
> aktuellen Urteilen zu Vorher-Nachher-Bildern als Hintergrund.
>
> Passt es nicht, ist keine Antwort nötig.
>
> [Name] · dentvideo.com/de

**ES**
> Asunto: Propuesta de tema: qué puede publicar una clínica dental sin incumplir la publicidad sanitaria
>
> Hola [nombre], me gustó tu artículo/episodio sobre [tema], sobre todo [detalle].
>
> Desarrollo DentVideo, que crea y revisa vídeos educativos para clínicas en siete idiomas. Puedo preparar para tus
> lectores u oyentes un contenido práctico y sin enfoque comercial: diez temas que una clínica puede publicar con
> tranquilidad y cinco frases que conviene evitar.
>
> Si no encaja, sin problema; no volveré a escribir.
>
> [nombre] · dentvideo.com/es

**FR**
> Objet : Idée de sujet : ce qu'un cabinet dentaire peut publier sur Instagram
>
> Bonjour [nom], j'ai apprécié votre article/épisode sur [sujet], en particulier [point].
>
> Je développe DentVideo, qui rédige et vérifie des vidéos d'information patient en sept langues. Je peux proposer à vos
> lecteurs ou auditeurs un contenu pratique, sans dimension commerciale : « Information ou publicité ? 10 sujets qu'un
> cabinet peut publier sereinement ».
>
> Si ce n'est pas pertinent, inutile de répondre.
>
> [nom] · dentvideo.com/fr

### 3. Dental-marketing agencies (partner / reseller angle)

Positioning: DentVideo is **supply** for the agency. The agency keeps the client relationship, strategy, ads and posting;
DentVideo supplies checked weekly videos. **No partner programme exists yet.** These templates ask whether there is
interest. The owner must decide terms (white-label, wholesale price or referral fee) before promising any.

**EN**
> Subject: Checked patient-education videos for your dental clients
>
> Hi [name], I saw [agency] handles social media for [n] dental practices, including [client/example].
>
> DentVideo produces five narrated, captioned patient-education videos per clinic every Monday in seven languages. Each
> script is checked for health-advertising rules and clinical accuracy before anyone sees it. Some agencies would rather
> spend their time on strategy and ads than on weekly editing; for them we could be the video supply.
>
> Would a 15-minute call about a partner arrangement be worth it? If not, no reply needed.
>
> [Name] · dentvideo.com

**TR**
> Konu: Diş kliniği müşterileriniz için denetlenmiş hasta bilgilendirme videoları
>
> Merhaba [ad], [ajans] olarak diş kliniklerinin sosyal medyasını yönettiğinizi gördüm.
>
> DentVideo her pazartesi klinik başına beş seslendirilmiş, altyazılı hasta bilgilendirme videosu üretiyor; her metin
> yayından önce tanıtım yönetmeliğine ve klinik doğruluğa göre denetleniyor. Haftalık kurgu yerine stratejiye ve
> müşteriye odaklanmak isteyen ajanslar için video tedarikçisi olabiliriz.
>
> Bir iş birliği modeli için 15 dakikalık bir görüşme ister misiniz? Uygun değilse yanıt gerekmez.
>
> [ad] · dentvideo.com/tr

**DE** (LinkedIn message or event follow-up; not a cold e-mail)
> Hallo [Name], Sie betreuen mit [Agentur] Zahnarztpraxen auf Social Media.
>
> DentVideo liefert jeder Praxis jeden Montag fünf vertonte, untertitelte Aufklärungsvideos, vorab geprüft auf
> Heilmittelwerberecht und fachliche Richtigkeit. Für Agenturen, die ihre Zeit lieber in Strategie und Anzeigen stecken
> als in den wöchentlichen Schnitt, könnten wir der Video-Zulieferer sein.
>
> Wäre ein 15-minütiges Gespräch über eine Partnerschaft interessant? Wenn nicht, alles gut.
>
> [Name] · dentvideo.com/de

**ES** (LinkedIn or event follow-up)
> Hola [nombre], vi que [agencia] gestiona las redes de varias clínicas dentales.
>
> DentVideo crea cada lunes cinco vídeos educativos con voz y subtítulos por clínica, revisados antes en publicidad
> sanitaria y precisión clínica. Para agencias que prefieren dedicar su tiempo a estrategia y anuncios en lugar de a la
> edición semanal, podríamos ser el proveedor de vídeo.
>
> ¿Te encaja una llamada de 15 minutos para hablar de colaboración? Si no, sin problema.
>
> [nombre] · dentvideo.com/es

**FR**
> Objet : Vidéos d'information patient vérifiées pour vos clients dentistes
>
> Bonjour [nom], j'ai vu que [agence] accompagne des cabinets dentaires sur les réseaux sociaux.
>
> DentVideo produit chaque lundi cinq vidéos d'information patient en voix off et sous-titrées par cabinet, vérifiées
> en amont (règles de communication en santé et exactitude clinique). Pour une agence qui préfère consacrer son temps à
> la stratégie plutôt qu'au montage hebdomadaire, nous pourrions être le fournisseur vidéo.
>
> Un échange de 15 minutes sur un partenariat vous intéresserait-il ? Sinon, inutile de répondre.
>
> [nom] · dentvideo.com/fr · Pour ne plus recevoir de message de ma part, répondez simplement « stop ».

---

## (d) GEO checklist

Answer engines describe a product by combining what several sources say about it. When the sources agree, the model
repeats them. When they disagree, it hedges or picks the loudest source, often an aggregator. The job is to make every
source say the same few facts.

### 1. One entity definition, used everywhere

Use this text verbatim (it is the `entity.ts` definition). Don't paraphrase it per profile.

> **DentVideo is a web app for dental clinics that makes short patient-education videos — narrated, captioned and in
> the clinic's colours — and checks every script for clinical accuracy and health-advertising rules before the dentist
> approves it. It is made by Bulsu Labs.**

- **Short form** (for 160-char fields): `DentVideo makes weekly patient-education videos for dental clinics, checked for
  advertising rules and clinical accuracy before the dentist approves.` (148)
- **Fixed facts** (same wording on every profile):
  - name `DentVideo` (one word, capital V);
  - publisher `Bulsu Labs`;
  - website `https://dentvideo.com`;
  - seven video languages (en, de, es, fr, it, pt, tr);
  - five videos every Monday;
  - two checks (advertising rules, clinical accuracy);
  - the dentist approves and the clinic shares;
  - no auto-posting;
  - a synthetic voice, with no avatars.
- **Price fact:** the plan names and the live preview before payment.
- **Fix first.** `entity.ts` (→ About pages, llms.txt, JSON-LD) still says *"The first week of videos is free … Paid
  plans are not public yet"*. That contradicts the published pricing and the paid-first model. Until it is changed,
  every new profile will disagree with the site. This is the single most important GEO fix. It is a small content edit,
  not a profile task.
- **`sameAs`:** once the profiles exist, add their URLs (LinkedIn, Crunchbase, G2, Product Hunt, Wikidata) as `sameAs`
  on the Organization/SoftwareApplication JSON-LD. Nothing in `web/src` emits `sameAs` today. This is a code task for
  later, listed here so it isn't forgotten.
- Use the same logo (`web/public/dentvideo/icon-512.png`) and the same founder name and photo on every profile.

### 2. Which "best X" and comparison queries to target, and how

Answer engines build "best X" answers from listicles, review sites, Reddit/forums and comparison pages. There are three
ways to be in them: be *on* the review sites, be *mentioned* in the listicles, and own an honest comparison page.

| Query (per language) | Where answers come from today | How we get in |
| --- | --- | --- |
| "best dental social media software / tool", "best AI video tool for dentists", "dental patient education video software" | G2/Capterra category pages, agency listicles, Reddit r/Dentistry and r/DentalHygiene | G2 and Capterra profiles with 5+ real reviews. Ask listicle authors to *evaluate* DentVideo (offer a free test account, never payment). Genuine, disclosed Reddit and Dentaltown answers. |
| "dental social media agency vs software", "do I need a dental marketing agency" | Agency blogs | Already covered by `/guides/dental-video-marketing-agency-or-software` (+ de/es/fr/tr equivalents). Pitch the guide to podcasts. |
| "alternatives to [Optio / My Social Practice / Canva for dentists]" | AlternativeTo, G2 "alternatives" pages | AlternativeTo and G2 listings in matching categories. Don't build pages attacking named competitors (POSITIONING §7). |
| "Social Media Agentur Zahnarzt Alternative", "Zahnarzt Instagram Videos erstellen lassen" | Agency sites, OMR Reviews | OMR Reviews profile plus the German agency-or-tool guide; ZWP article |
| "diş kliniği sosyal medya ajansı mı yazılım mı", "diş hekimi reklam yasağı ne paylaşılır" | Agency sites, law-firm posts | TR guides (already live) plus Dental Tribune Türkiye and oda bulletins as independent corroboration |
| "agencia marketing dental o herramienta", "qué publicar clínica dental redes" | Agency blogs, translated AI-tool pages | ES guides plus Gaceta Dental article |
| "agence communication dentaire ou outil", "publicité dentiste Instagram autorisée" | Agency sites, ONCD pages | FR guides plus L'Information Dentaire tribune |
| "What is DentVideo?", "Is DentVideo legit?", "DentVideo review/pricing" | Whatever exists. Today that is only our own site. | Consistent profiles (above). A pricing page in llms.txt. Real reviews on G2 and Capterra. |

**Monthly spot check:** run the queries in the SEO_PLAN §7 checklist and log whether DentVideo is cited and described
correctly.

### 3. Ready-to-paste profile text

**Wikidata.** Create only after one independent reference exists.

| Field | Value |
| --- | --- |
| Label (en) | DentVideo |
| Description (en) | web application that makes patient-education videos for dental clinics |
| Aliases | Dent Video |
| Label/description (de) | DentVideo · Web-App für Patientenaufklärungsvideos von Zahnarztpraxen |
| Label/description (tr) | DentVideo · diş klinikleri için hasta bilgilendirme videoları üreten web uygulaması |
| Label/description (es) | DentVideo · aplicación web de vídeos educativos para clínicas dentales |
| Label/description (fr) | DentVideo · application web de vidéos d'information patient pour cabinets dentaires |

Statements (check property IDs in the Wikidata UI as you add them):

| Property | Value |
| --- | --- |
| instance of (P31) | web application; software as a service |
| developer (P178) | Bulsu Labs. This needs its own item, which needs its own reference. If there isn't one, leave it out. |
| official website (P856) | https://dentvideo.com |
| language of work or name (P407) | English, German, Spanish, French, Italian, Portuguese, Turkish |
| inception (P571) | real launch date |
| LinkedIn company ID (P4264) | add once the page exists |
| Crunchbase organization ID (P2088) | add once the profile exists |

Add a reference URL (the independent article) to the main statements.

**Crunchbase**
- Short description: use the short form above (148 chars).
- Long description:
  > DentVideo is a web app for dental clinics that makes short patient-education videos — narrated, captioned and in the
  > clinic's colours — and checks every script for clinical accuracy and health-advertising rules before the dentist
  > approves it. Every Monday a clinic receives five vertical videos answering questions patients in its country search
  > for, approves them in one tap and shares them from a phone. Dentists can also record five minutes of themselves and
  > receive captioned clips. Videos are made in English, German, Spanish, French, Italian, Portuguese and Turkish.
  > DentVideo is made by Bulsu Labs.
- Industries: Dental, Health Care, Marketing, Video, Software, SaaS, Artificial Intelligence.

**LinkedIn company page**
- Tagline (120 max): `Weekly patient-education videos for dental clinics, checked for advertising rules and clinical accuracy.` (104)
- About:
  > DentVideo makes short patient-education videos for dental clinics, five every Monday: narrated, captioned and in the
  > clinic's colours. Before the dentist sees them, every script is checked twice, once for health-advertising rules and
  > once by a reviewer acting as a general dentist for clinical accuracy. The dentist approves the week in one tap and
  > shares from their phone.
  >
  > Seven languages: English, German, Spanish, French, Italian, Portuguese, Turkish.
  >
  > What we don't do: avatar doctors, fake patients, auto-posting, or promises of patient numbers. Our checks are a
  > careful filter, not legal advice; the clinic always has the last word.
  >
  > DentVideo is made by Bulsu Labs. dentvideo.com
- Specialities: patient education, dental marketing, social media video, health-advertising compliance, multilingual
  content.

**G2 / Capterra / OMR / SaaSHub**
- One-liner: the short form above.
- Description (en): the Crunchbase long description plus:
  > Plans: Starter, Practice (adds your own recordings turned into clips) and Group (up to three locations). A live
  > preview of your branded video is shown before you pay.
- Key features:
  1. five videos every Monday;
  2. topics from local Google searches;
  3. advertising-rules check in seven languages;
  4. clinical-accuracy review;
  5. sound and picture check;
  6. approve-all;
  7. one-tap share with the caption copied;
  8. filming cards and own-recording clips;
  9. formal or informal address.
- Target users: dentists, dental clinic owners, practice managers, small dental groups.
- Do **not** tick "free trial" or "free version".
- **German description (OMR, capterra.de):** the `entity.ts` German definition, then:
  > Jeden Montag fünf vertonte, untertitelte Hochformat-Videos zu Fragen, die Patienten tatsächlich googeln; Freigabe der
  > ganzen Woche mit einem Tippen; Teilen vom Smartphone. Eigene Aufnahmen werden zu untertitelten Clips. Sieben
  > Sprachen, Sie oder Du. Die Prüfung ist ein sorgfältiger Filter, keine Rechtsberatung.
- **Turkish, Spanish and French one-liners:** use the `entity.ts` definition for each language verbatim.

---

## (e) 30-day owner action list (things only the owner can do)

Ordered by impact. Times are focused-work estimates. Total is about 22 hours over 30 days, roughly 5 hours a week plus
Product Hunt day.

| # | When | Action | Time | Why it matters |
| --- | --- | --- | --- | --- |
| 1 | Day 1 | **Decide the public offer wording**: paid-first with a live preview, and drop "free first week, no card" everywhere, including `entity.ts`. Confirm whether Starter gets logo and colours. Then ask the dev agent to update the site copy and `entity.ts` in one PR. | 30 min | Every profile below copies these facts. Contradictions are the main reason answer engines mis-describe a product. |
| 2 | Day 1–2 | **Search Console + Bing Webmaster** (if not done): domain verification, sitemap, request indexing of `/`, `/tr`, `/de`, `/es`, `/fr` and the hubs (SEO_PLAN §7). | 45 min | Bing feeds ChatGPT search and Copilot. Nothing else counts until pages are indexed. |
| 3 | Day 2–3 | **Terms of Use and Privacy Policy pages** for dentvideo.com: decide who drafts them (lawyer or template) and approve them. | 2 h | G2, Capterra, the app stores, Product Hunt and partners all ask for them, and paying clinics expect them. |
| 4 | Day 3 | **LinkedIn**: create the DentVideo page with the text in (d), and set the founder headline to "Founder, DentVideo (Bulsu Labs)". | 45 min | LinkedIn is among the most-cited sources for "who makes X". It is also the legal outreach channel in DE and ES. |
| 5 | Day 4–5 | **G2 free profile + Capterra listing.** Submit, pass vendor verification and upload screenshots. | 1.5 h | The two sources answer engines use most for "best X software" answers. |
| 6 | Day 5 | **Record a 90-second founder demo** (screen + voice): the weekly email, approve-all and share. Upload to YouTube with the entity definition in the description, and reuse it on Product Hunt, G2 and LinkedIn. | 1.5 h | YouTube is heavily cited in AI Overviews, and every listing gets better with a video. |
| 7 | Day 6–7 | **Crunchbase, OMR Reviews, AlternativeTo, SaaSHub, appvizer**, all from the (d) texts. | 2 h | Consistent entity facts in five more places, including the DACH-specific review site. |
| 8 | Week 2 | **Ask the first founding clinics for honest G2/Capterra reviews.** Ask personally, with no incentive tied to the rating, and only clinics that have used it for 3+ weeks. Get written consent before naming any clinic anywhere. | 1 h | Reviews are what move a profile into "best X" lists. 5 reviews is the first threshold to aim for. |
| 9 | Week 2 | **Türkiye earned media**: send the association template to TDB and 3 il odaları, and the editorial pitch to Dental Tribune Türkiye. | 1.5 h | This is the priority market, and the TR SERP has almost no native guide (SEO_PLAN §1). An oda bulletin is the strongest independent reference available. |
| 10 | Week 2–3 | **Product Hunt launch** (kit in b): prepare the gallery the day before, then be online 00:01–08:00 PT on launch day to answer comments. | 3 h + launch day | High-authority dated page; Crunchbase and Wikidata can cite it. |
| 11 | Week 3 | **DACH**: ZWP online product news and the HWG checklist article offer, via their editorial contact. Offer a webinar to 2 Landeszahnärztekammern. | 1.5 h | German trade press is what Gemini and AI Overviews cite for "Zahnarzt Social Media". |
| 12 | Week 3 | **Podcasts**: pitch 4 English shows (list in a) and 1 per other market if you find them. | 1 h | Podcast show-notes pages are durable, independent references. |
| 13 | Week 3–4 | **ES + FR**: Gaceta Dental and L'Information Dentaire pitches. Send the association template to one colegio (by phone or form first, not cold e-mail). | 1.5 h | Independent corroboration in two more languages |
| 14 | Weekly | **Answer two real questions a week** on Dentaltown, Reddit (r/Dentistry) or Turkish dentist groups. Disclose that you are the founder, and link only when the guide directly answers the question. | 30 min/week | Forums are a top source for answer engines, and the answers rank on their own. |
| 15 | Week 4 | **Agencies**: 5 partner conversations (template 3; LinkedIn in DE and ES). **Decide the partner terms before the first call.** | 2 h | A channel that sells to many clinics at once |
| 16 | Week 4 | **One paid AI directory** (There's An AI For That, about $49). | 20 min | Cheap coverage for "AI tool for dentists" queries |
| 17 | Day 30 | **GEO baseline check**: run the 10 queries in (d) §2 in ChatGPT (search on), Perplexity and Google, and record whether DentVideo is cited and described correctly. Create the **Wikidata** item if an independent article now exists. | 1 h | Shows whether the month worked. Wikidata needs that independent source. |

### Top 10 at a glance

1. Fix the public offer wording (paid-first, preview) on the site and in `entity.ts`.
2. Search Console and Bing Webmaster verification, sitemap and indexing.
3. Terms of Use and Privacy Policy pages.
4. LinkedIn company page and founder headline.
5. G2 and Capterra profiles.
6. 90-second founder demo video on YouTube.
7. Crunchbase, OMR Reviews, AlternativeTo, SaaSHub and appvizer profiles.
8. First honest reviews from founding clinics.
9. Türkiye earned media: TDB, odalar and Dental Tribune Türkiye.
10. Product Hunt launch.
