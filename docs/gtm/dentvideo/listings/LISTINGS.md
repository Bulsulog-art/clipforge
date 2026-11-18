# DentVideo listing kit

Copy-paste text for software directories. You submit everything yourself, from your own accounts
(or the Mac session does it step by step from `../RUNBOOK.md` §4, with no payments).
Facts re-checked against dentvideo.com, its llms.txt and `web/src/lib/dentvid/pricing.ts` on 2026-11-16.
Forms change, so glance at each page first. Nothing here needs a payment.

**How sure each entry is**
- "Checked": I opened the site's own page.
- "Third-party": the site blocks automated readers (Cloudflare or a login wall), so I relied on SaaSCity's write-ups from October 2026 and the directory's help pages. Field names may differ slightly. The text below still fits.

**Images (all real app screenshots or the real logo; the image files are in the repo, not in this folder)**

| File in the repo | Use |
|---|---|
| `web/public/dentvideo/icon-512.png` | Logo everywhere (512x512 PNG) |
| `web/public/dentvideo/landing/en/{week,review,setup,card}.webp` | Phone screenshots (English). Sites that refuse WebP: convert on the Mac with `sips -s format png week.webp --out week.png` |
| `web/public/dentvideo/landing/{tr,de}/*.webp` | The same screens in Turkish and German |
| Product Hunt thumbnail (240x240) and gallery (1270x760) | Not in the repo. Only needed on launch day, which is not part of this round. Make them then from the logo and the screenshots above |

The screenshots show the app's demo clinic ("Sample Dental Practice, Bristol"). It is a demo, not a customer. If a site asks for screenshot captions, write "Demo clinic".

---

## Shared text blocks (reuse these)

**Name:** DentVideo
**Website:** https://dentvideo.com
**Company / vendor:** Bulsu Labs (legal name: "BLS AI AUTOMATION" DOO PODGORICA)
**HQ:** Podgorica, Montenegro · **Founded:** 2026 · **Employees:** 1-10
**Contact email:** hello@dentvideo.com

**Tagline (50 chars)**
> Weekly patient-education videos for dental clinics

**Short description (147 chars)**
> Five short patient-education videos for dental clinics every Monday, in the clinic's language and colors, checked before the dentist approves them.

**Long description (1,192 chars; drop the last paragraph if a field caps at 1,000: 992 chars without it)**
> DentVideo is a web app for dental clinics. Every Monday it delivers five short patient-education videos, narrated and captioned in the clinic's language, with its logo and colors, plus a ready-to-post caption and hashtags.
>
> Every script is checked by software for clinical accuracy and for the health-advertising rules of the clinic's country before the dentist sees it. Anything worth a second look is marked with the reason. It is a filter, not legal advice. Nothing is published without the dentist's approval, and the clinic posts from its own accounts; DentVideo never posts for it.
>
> Clinics choose a female or male narrator and can add one closing line under their captions, checked against the same advertising rules. On the Practice plan, the dentist's own phone recordings become captioned clips.
>
> Plans: Starter $49 / €49 / 1.490 TL per month, Practice $79 / €79 / 2.490 TL per month, Group priced per location. Monthly, cancel anytime. A free logo preview works without an account.
>
> Videos are made in ten languages. The website and help center are in English, German, Spanish, French, Turkish, Japanese, Arabic and Polish. DentVideo is made by Bulsu Labs in Podgorica, Montenegro.

**Key features (one per line)**
- Five finished patient-education videos every Monday
- Narration and burned-in captions in the clinic's language
- Clinic logo, colors and name on every video
- Ready-to-post caption and hashtags with each video
- Software check for clinical accuracy and local health-advertising rules
- Dentist approval before anything can be shared; the clinic posts itself
- Female or male narrator; one optional closing line under the captions, checked against the ad rules
- Practice plan: clips from the dentist's own phone recordings
- Videos in ten languages (English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic, Polish), formal or informal address
- Free logo preview without an account
- Help center: https://dentvideo.com/help (also in the seven other site languages)

**Platform:** web app (SaaS). It works in a phone's browser; on a phone an approved video opens the share menu. **There is no App Store or Google Play app yet: do not tick iOS, iPhone, Android or "mobile app" anywhere.**
**Support / help URL:** https://dentvideo.com/help · **Pricing URL:** https://dentvideo.com (pricing section) · **Privacy:** https://dentvideo.com/privacy · **Terms:** https://dentvideo.com/terms

**Pricing block**
| Plan | Price | Billing |
|---|---|---|
| Starter | $49 / €49 / 1.490 TL per month, excl. tax | Monthly, cancel anytime |
| Practice | $79 / €79 / 2.490 TL per month, excl. tax | Monthly, cancel anytime |
| Group | Priced per location, by contact | Contact hello@dentvideo.com |

Free trial: **No** (say "free logo preview, no account needed" if there is a free-text field). No setup fee. Do not tick "free plan".

**Competitors / alternatives to name when a form asks**
Canva, CapCut, InVideo AI, VEED, Pictory. These are tools a clinic would otherwise use to make the same videos by hand. Do not name dental agencies.

**Do not write anywhere:** customer counts, "trusted by", ratings, awards, "best", "#1", "guaranteed", discounts, free trial, "HIPAA compliant", "certified compliant", "available on iOS". The site itself says the check is automated and not legal advice.

**Do not do anywhere:** pay for a listing, upgrade, featured spot or faster review; accept a paid-plan trial; write, request or import reviews (no reviews from yourself, family, friends or staff, and no incentives); invite "reviewers" from a vendor dashboard.

---

## Priority order (impact vs. effort)

| # | Site | Cost | Your time | Why |
|---|---|---|---|---|
| 1 | SaaSHub | Free | 10 min + 1 verification email | Followed link once verified; feeds "alternatives to Canva / InVideo" pages |
| 2 | G2 (also covers Capterra, GetApp, Software Advice) | Free | 15 min, then claim after approval | One form for four of the sites AI assistants cite most for software |
| 3 | AlternativeTo | Free (paid faster review exists; skip it) | 10 min | Appears on "alternatives to X" searches |
| 4 | TrustRadius | Free | 15 min | Another B2B review site, free profile |
| 5 | Product Hunt | Free | 30 min prep + launch day | Strong one-off signal; needs a personal account at least 1 week old |
| 6 | There's An AI For That | Paid one-time fee (no normal free route) | 5 min | Large AI catalog, followed link. Owner's decision; not in the runbook |
| 7 | Dentaltown article | Free, editorial | 1-2 hours writing | US dental community; must be educational, not promotional |
| 8 | SourceForge (business software) | Free basic listing (third-party report) | 10 min | Large catalog; lower priority |
| - | Futurepedia | **$497**, no free listing | - | Skip |
| - | Dental-specific directories (UK, US, DE, TR) | Paid or by contact | - | See the last section. None found that is free and self-serve |
| - | Crunchbase | - | - | In `../profile/PROFIL-KITI.md` |

---

## 1. SaaSHub (Third-party: saashub.com blocks automated readers)

- **Submit:** https://www.saashub.com/services/submit
- **Cost:** Free. Verification is free. The only paid option is a featured listing at $99/month; you do not need it.
- **Rules:** The product must be released, on its own domain, and in English. Without competitors, the submission goes to the back of the queue.
- **After approval:** click **Verify** on the listing and confirm with **hello@dentvideo.com**. An address on the product's domain is what SaaSHub accepts. A verified listing gets a followed "Visit website" link. SaaSHub sends a one-click reconfirmation email every quarter. **Answer it**, or the link turns nofollow again.

| Field | Paste |
|---|---|
| Website URL | https://dentvideo.com |
| Name | DentVideo |
| Tagline | Weekly patient-education videos for dental clinics |
| Description | Long description |
| Categories | Video Marketing, Social Media Marketing, Healthcare, Dental (pick the closest ones the form offers) |
| Competitors | Canva, CapCut, InVideo AI, VEED, Pictory |
| Pricing | Paid; from $49/month |
| Logo | `web/public/dentvideo/icon-512.png` |
| Screenshots | `landing/en/week`, `review`, `setup` (PNG via `sips` if WebP is refused) |

---

## 2. G2 (one form also lists you on Capterra, GetApp and Software Advice) (Checked)

- **Submit:** https://www.g2.com/add_product_requests/new. Capterra's own "Get Your Product Listed" button now points to this same G2 form; G2 bought Capterra, GetApp and Software Advice in 2026.
- **Sign in first:** https://my.g2.com/signup. Use LinkedIn, Google or a business email. Use **hello@dentvideo.com** if possible, because G2 checks that you work for the vendor.
- **Cost:** Free. Paid plans start at $299/month; you do not need them.
- **Process (G2's own help page):** the request form is reviewed by G2 research in about 3-5 business days. The profile then goes live "unclaimed". Open it, hover **Unclaimed**, then **Claim this profile**. Claim approval takes 1-3 business days.
- **Eligibility:** B2B only, no alpha/beta products. DentVideo qualifies: it is sold to clinics and is live.
- **Note:** a free G2 profile has **no link** to your website. The value is that the entity exists on G2/Capterra, which AI assistants and Google read. It is not a backlink.

**Request form**

| Field | Paste |
|---|---|
| Product name | DentVideo (G2 rule: same as on your website, no "AI" or other keywords added) |
| Product website | https://dentvideo.com |
| Vendor / company name | Bulsu Labs |
| Vendor website | https://bulsulabs.com |
| Description | Long description |
| Suggested category | AI Video Generators (an existing G2 category). If there is a second field: Social Media Content / Video Marketing |
| Your name / title / email | Berke Bulsu, Managing Director, hello@dentvideo.com |

**After claiming (my.G2 > Listings > Manage Listings > Cross-Marketplaces)**

| Tab / field | Paste |
|---|---|
| Product Logo | `web/public/dentvideo/icon-512.png` (PNG, JPG or WebP under 5 MB) |
| Languages | English, German, Spanish, French, Turkish, Japanese, Arabic, Polish |
| Software Type | Hosted deployment: **Yes** · On-premise: **No** |
| Licensing model | Proprietary |
| Seller information | Year founded 2026 · HQ Podgorica, Montenegro · Company size 1-10 · Seller description: short description |
| Packages & Pricing | Pricing block (Starter, Practice, Group). Free trial: none |
| Target Buyers | Company size: small business (1-50). Industry: Medical Practice / Hospital & Health Care. Countries: worldwide, or start with United Kingdom, United States, Germany, Austria, Switzerland, Turkey, Spain, France, Poland |
| Capterra / GetApp / Software Advice descriptions | Long description (English only, as G2 requires). Ask for the **Dental Software** category on Capterra in addition to video |
| Screenshots | `landing/en/week`, `review`, `setup`, `card` |
| AI Trust Tier | Turn on; DentVideo is AI Native (scripts and narration are generated) |

---

## 3. AlternativeTo (Third-party: the site blocks automated readers)

- **Submit:** sign up at https://alternativeto.net and verify your email. Then user menu (top right) > **Suggest new application**.
- **Cost:** Free. The free queue can take months. There is an optional paid priority review; **do not buy it** in this round.
- **Rules:** no links, emails or phone numbers in the description. No UTM tags on the website URL. The app must work in English. AlternativeTo declines "general-purpose video generators"; DentVideo is dental-specific, so the description says that in the first line.
- **After approval:** open the Canva, InVideo and CapCut pages > **Suggest Alternatives** > add DentVideo.

| Field | Paste |
|---|---|
| Name | DentVideo |
| Official website | https://dentvideo.com |
| Creator website | https://bulsulabs.com |
| Platforms | Online / Web |
| License | Commercial |
| Short description | Five short patient-education videos for dental clinics every Monday, in the clinic's language and colors, checked before the dentist approves them. |
| Description | Long description (it has no links, emails or phone numbers, as AlternativeTo requires) |
| Tags | dental, dentist, patient-education, video, social-media, healthcare-marketing |
| Alternative to | Canva, InVideo, CapCut |
| Logo | `web/public/dentvideo/icon-512.png` |
| Screenshots | `landing/en/week`, `review` |

---

## 4. TrustRadius (Third-party: official help pages read via search)

- **Start:** https://www.trustradius.com/vendor/claim-your-profile. Create an account with a work email, then fill in the **Vendor Access Request**. If DentVideo is not found, use the "add a product" option in the vendor portal.
- **Cost:** "It is free for any vendor or product that fits our taxonomy to be listed" (TrustRadius). Premium profiles cost extra; you do not need them.

| Field | Paste |
|---|---|
| Product name | DentVideo |
| Vendor | Bulsu Labs |
| Website | https://dentvideo.com |
| Description | Long description |
| Category | Video Creation / Video Marketing; add Dental if offered |
| Features | Key features list |
| Pricing (optional) | Pricing block |
| Logo / screenshots | as for G2 |

---

## 5. Product Hunt (Third-party: producthunt.com blocks automated readers; specs from its help center via search)

- **Submit:** https://www.producthunt.com/posts/new
- **Cost:** Free.
- **Before launch day:** create a **personal** account now (company accounts cannot post). A new account must wait **one week** before it can post. Fill in your profile (photo, headline "Founder, DentVideo") and comment helpfully on a few launches during that week.
- **Limits:** tagline 60 chars, description 260 chars, gallery images 1270x760, thumbnail 240x240.

| Field | Paste |
|---|---|
| Link | https://dentvideo.com |
| Name | DentVideo |
| Tagline (50/60) | Weekly patient-education videos for dental clinics |
| Description (248/260) | Every Monday, DentVideo delivers five short patient-education videos for your dental clinic: narrated and captioned in your language, with your logo and colors. Scripts are software-checked for clinical accuracy and ad rules. You approve; you post. |
| Topics | Health & Fitness (or Health), Marketing, Video, Artificial Intelligence, SaaS |
| Pricing | Paid |
| Thumbnail | 240x240, made on launch day from the logo |
| Makers | Your own account |
| Shoutouts (optional) | None needed |

**Gallery order**
(1270x760 images, made on launch day from the `landing/en` screenshots)
1. A finished week, every Monday (week + video card)
2. You approve everything (review screen + card)
3. Set up once (clinic settings + week)
4. One finished video card (optional)

Video (optional): Product Hunt takes a YouTube link. If you want one, upload one of the three sample videos from the homepage (`whitening-myths-debunked.mp4`) to YouTube as "DentVideo sample: demo clinic, unedited".

**Maker's first comment** (post it the moment the launch goes live; edit the bracket into your own words or delete it)

> Hi Product Hunt, I'm Berke, and I make DentVideo.
>
> Dental clinics are told to post every week, but someone has to pick a topic, write a script that stays within health-advertising rules, record it, caption it and edit it. Most clinics have no one for that. DentVideo does it for them: every Monday it delivers five short patient-education videos, narrated and captioned in the clinic's language, with the clinic's logo and colors.
>
> Two choices I made on purpose:
> 1. Every script is checked by software for clinical accuracy and for the advertising rules of the clinic's country before the dentist sees it. It is an automated check, not legal advice, and the dentist approves every video.
> 2. DentVideo never posts for the clinic. Approved videos are shared from the clinic's own accounts.
>
> [One sentence in your own words: why you started this.]
>
> You can try it with your logo on a real video without an account. It is a new product, launched in 2026, and I'd really like feedback from anyone who has run social media for a clinic: what would make you trust a tool like this, and what is missing?

**Launch-day tips**
- Launches start at 00:01 Pacific time (09:01 in Podgorica, 11:01 in Istanbul in winter). Schedule it for a Tuesday-Thursday and keep that day free.
- Reply to every comment yourself, the same day, honestly. If you don't know something, say so.
- Ask friends and contacts to **look and leave feedback**. Never ask for upvotes, and never post a direct "upvote me" link. Product Hunt penalizes vote rings and new accounts upvoting in bulk.
- Share the launch once on LinkedIn and X, in your own name.
- Do not offer a launch discount (we don't do discounts).
- Afterwards, send me the Product Hunt URL for the site's sameAs.

---

## 6. There's An AI For That (Third-party: the site blocks automated readers)

- **Submit:** https://theresanaiforthat.com/launch/ (the old /submit/ redirects there)
- **Cost:** paid only (one-time fee for a basic listing, more with a newsletter spot); the only free route is a monthly X thread where TAAFT picks one tool. **Not part of this round: any payment is the owner's own decision.**
- **Form:** only the URL is required; TAAFT builds the page from the site. Edit it after verifying your email.
- **Rules:** the tool must use AI in a clear, significant way (it does). TAAFT also expects replies to user questions within 48 hours.
- **Fix after it goes live:** name DentVideo · task "Dental patient-education videos" · description = short description · pricing "Paid, from $49/mo" · logo.

---

## 7. Dentaltown (editorial, not a listing) (Third-party)

- **Submit:** https://www.dentaltown.com/submit-article
- **Cost:** Free for editorial. Dentaltown's rule: "content that is primarily promotional, product-driven, or intended to market a specific service, company, or offering is not permitted." Articles go through the message boards first.
- **What fits:** a useful article with no pitch, for example "What dentists can and can't say on Instagram in the UK and US: a plain checklist", built from the dentvideo.com guides. Your author bio can say "Berke Bulsu makes DentVideo." That is all the promotion it can carry.
- **Message boards:** Dentaltown's vendor guide forbids starting a thread just for self-promotion. Boards are visible only to verified members.

---

## 8. SourceForge business software (Third-party, lower priority)

- **Submit:** https://sourceforge.net/software/vendors/new (Cloudflare blocked my check; a third-party source says the basic SaaS listing is free and that upgrades are paid).
- **Fields:** use the G2 table. Category: Video Creation / Video Marketing; also Dental if offered.

---

## Skip: Futurepedia

No free listing as of October 2026. The submit page returns 404 (I confirmed the 404 myself). The only route is a $497 "Verified Enhanced Listing", and its link is nofollow. Not worth it now.

---

## Dental-specific directories: what I found

I looked for directories in the US, UK, DE and TR where a dental software vendor can list itself for free. None I found is both free and self-serve:

| Directory | Market | Status |
|---|---|---|
| Capterra / GetApp / Software Advice **Dental Software** category | US, UK, DE (getapp.de), etc. | **Free via the G2 form above.** Ask for the Dental category when you claim. This is the best dental-specific placement available |
| Dentistry.co.uk "Dental suppliers and services directory" | UK | Commercial directory of a trade publisher (FMC). No public form; contact the publisher. Probably paid; not verified |
| Dentalcompare | US | Paid listing request (https://www.dentalcompare.com/125863-Dentalcompare-Product-Listing-Request/) |
| ZWP online company profile | DE | Paid (part of the publisher's media kit) |
| Turkey | TR | No dental software vendor directory found. Turkish dentists mostly talk in closed Facebook/WhatsApp groups and on LinkedIn; see COMMUNITY.md |

If you want one paid dental placement later, ask Dentistry.co.uk (UK) for a price first. Its audience is UK dentists, which matches the UK advertising-rules content on the site.
