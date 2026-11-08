# DentVideo — next markets and languages

*Research date: 2026-11-08. Author: market + localisation lead (agent). Every number has a source; anything marked
**(unverified)** comes from a secondary or commercial source, or is an estimate of ours, and should be checked before it
is used in sales material. This is market research, not legal advice: every market below regulates clinic advertising,
and the clinic stays responsible for what it posts (DentVideo already sends every video to the clinic for approval).*

## TL;DR

| Rank | Market (language) | Verdict | Why, in one line |
|---|---|---|---|
| 1 | **Japan (ja)** | **Build now** | ~65,000 dental clinics, a ¥770bn self-pay (aesthetic + ortho) segment, agencies charging ¥50k–300k/month for the job DentVideo does for $69, and strict-but-codified rules a deterministic filter can actually enforce. |
| 2 | **Gulf: UAE + Saudi + rest of GCC (ar)** | **Build now** | Overwhelmingly private, high price tolerance (Dubai Reels retainers AED 3–15k/month), Instagram/TikTok/Snapchat-first; one language covers six rich countries. Regulator approval/permit regimes are the main risk and must be in the onboarding. |
| 3 | **Poland (pl)** | **Build now** (cheap) | ~40k dentists, almost entirely private, and the doctors' ethics code stopped banning advertising on 1 Jan 2025 — clinics are only now starting to post. Latin script: near-zero rendering cost. |
| 4 | South Korea (ko) | Later | Very large, very digital, but every clinic "ad" on Instagram/YouTube-sized platforms needs paid **pre-review** — a weekly 5-video product collides with that. Crowded local agency market. |
| 5 | Taiwan + Hong Kong (zh-Hant) | Later | Rich self-pay segment, but Taiwan's Medical Care Act §85 limits ad *content* to a whitelist and fines the responsible dentist NT$50k–250k per post; HK's Dental Council is stricter still. |
| 6 | Netherlands (nl) | Later / opportunistic | High willingness to pay and adult care is self-pay, but only ~5k practices and most Dutch dentists are comfortable posting in English. |
| — | **Singapore (en)** | **Sell now in English** | No new language needed: market the existing English product with SG-specific compliance rules (added to the pipeline in this change). zh-Hans/ms are not needed to win SG clinics. |
| 7 | Malaysia (ms/en/zh) | Later | MoH Medicine Advertisement Board approval for facility ads; lower price tolerance. |
| 8 | Indonesia (id) | Not now | Large but low SaaS willingness-to-pay and ~96% of people did not see a dentist last year (brand claim). |
| 9 | Mainland China (zh-Hans) | **Poor fit** | Instagram/TikTok/YouTube are blocked; every clinic ad on Douyin/Xiaohongshu/WeChat Channels needs a *Medical Advertising Review Certificate*, and disguising ads as health education is explicitly banned. A foreign card-billed SaaS cannot serve this. |

**Chosen for the video pipeline in this change: Japanese (ja), Arabic (ar), Polish (pl).** Polish is the "trivially close"
third — it costs almost nothing to add — but it is also on merit the third-best market. Singapore is unlocked in English.

---

## How markets were scored

1. **Practices that can pay** — number of dental clinics × the share that are private/self-pay businesses (a clinic that
   lives on public tariffs has no marketing budget).
2. **Willingness to pay** for a $39–219/month tool, measured against what clinics already pay agencies for the same
   output.
3. **Can the product legally do its job?** Short educational clinic videos on the platforms there. A market where every
   post needs prior government approval breaks a weekly 5-video product.
4. **Can we take the money?** Dodo Payments (our merchant of record) customer coverage and local-currency expectations.
5. **Build cost** — new script, right-to-left layout, fonts, TTS quality.
6. **Competition** — local agencies and tools.

### Payments (Dodo Payments)

- Dodo acts as merchant of record and says it accepts payments from **220+ countries and regions**; its docs separate the
  customer list from the (shorter) merchant/payout list.
  [Dodo MoR docs](https://docs.dodopayments.com/features/mor-introduction),
  [Accepted countries](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories)
- Country codes **KR and AE** appear in Dodo's *Supported Countries* API reference; the payment-method page lists local
  methods for **Poland (BLIK), the Netherlands (iDEAL) and South Korea (local wallets)**; the adaptive-currency page maps
  **AED** and **CNY**; Dodo's currency list includes **TWD**.
  [Supported countries API](https://docs.dodopayments.com/api-reference/misc/supported-countries),
  [Payment methods](https://docs.dodopayments.com/features/payment-methods),
  [Adaptive currency](https://docs.dodopayments.com/features/adaptive-currency),
  [Currencies](https://dodopayments.com/currency)
- **(unverified)** A third-party tracker lists JP, SG, MY, TW, HK, SA, AE, KR, ID, CN, NL and PL as supported customer
  countries. [supportedcountries.com](https://supportedcountries.com/dodo-payments/) — **I could not open Dodo's own
  docs from this environment (host not reachable), so SA and JP card acceptance in particular must be confirmed in the
  Dodo dashboard before launch.**
- The *merchant* restriction list (Iran, Iraq, Pakistan, Russia, Syria, Yemen, …) concerns where a seller is based, not
  where customers are. [AppSumo listing, ~1 year old](https://appsumo.com/products/dodo-payments/)
- Local invoices: Japanese businesses expect a 請求書 / qualified invoice for consumption-tax credit; Korean businesses
  expect a 세금계산서; Gulf and Polish clinics expect a VAT invoice. A merchant-of-record receipt usually satisfies EU/Gulf
  buyers; **Japan's qualified-invoice (インボイス制度) status of Dodo's receipts is unverified** and is the first thing a
  Japanese office manager will ask. Recommend: price in USD, show JPY/AED/SAR/PLN with adaptive currency, and confirm
  invoice wording with Dodo.

---

## 1. Japan (ja) — rank 1

**Practices.** 65,057 dental clinics (歯科診療所) at the end of May 2026, falling by a few dozen a month.
[MHLW 医療施設動態調査 2026-05](https://www.mhlw.go.jp/toukei/saikin/hw/iryosd/m26/dl/is2605.pdf),
[2025-12](https://www.mhlw.go.jp/toukei/saikin/hw/iryosd/m25/is2512.html)

**Private / self-pay.** Practices are private businesses billing public insurance for basic care; the money that funds
marketing is **自由診療** (self-pay). Yano Research put the self-pay aesthetic + orthodontic market at **¥769.7bn in 2024**
(¥169.7bn aesthetic, ¥600bn ortho), driven by clear aligners. Implants are additional and not in that figure.
[Yakuji Nippo summary of Yano Research](https://www.yakuji.co.jp/?p=129588) **(secondary)**. Over-supply (clinics now
closing) makes patient acquisition a real concern. [NOWnews on 2024 clinic bankruptcies](https://www.nownews.com/news/6712954)

**Willingness to pay.** Dental Instagram management agencies charge **¥50,000–300,000/month**; short-video management
**¥150,000–450,000/month**. [atsoho.com](https://atsoho.com/blog/sns-management-creative-production-cost),
[s--line.co.jp](https://s--line.co.jp/dental-clinic-instagram-marketing/) **(vendor blogs)**. DentVideo's $69 plan
(~¥10,500) is an order of magnitude cheaper. Expect JPY pricing display and a Japanese invoice to be required.

**Platforms.** Instagram is the main channel for dental clinics, YouTube second; LINE 公式アカウント for patient
messaging; TikTok growing. [Clinic SNS guide](https://yoshikazunomori.com/blog/digitalmarketing/clinic-sns/) **(industry
opinion, no survey found)**. All are available in Japan.

**Rules — 医療法 + 医療広告ガイドライン (MHLW).**
- A post is a regulated "広告" when it is **誘引性** (invites people to visit) and **特定性** (identifies the clinic). A
  clinic's own Instagram/TikTok counts; so can staff accounts.
  [MHLW 事例解説書 (6th ed. index)](https://www.mhlw.go.jp/content/10800000/001680061.pdf),
  [atsoho summary](https://atsoho.com/blog/beauty-clinic-sns-medical-ad-guideline)
- **Banned outright:** false ads; **比較優良広告** (claims of being better than other clinics — "県内一", "日本一",
  "No.1", "最高"); **誇大広告** (exaggeration — "絶対安全", "必ず治る", "無痛"); **公序良俗** violations; and
  **体験談** — patients' subjective accounts of treatment or results (省令禁止事項).
  [MHLW 事例解説書](https://www.mhlw.go.jp/content/001683116.pdf),
  [BUSINESS LAWYERS](https://www.businesslawyers.jp/practices/1141)
- **Before/after photos** are only allowed on clinic-controlled web content with the 限定解除 disclosures: the usual
  treatment content, standard cost, period/number of visits, and main risks and side effects.
  [crexgroup](https://crexgroup.com/ja/marketing/advertising/medical-advertising-guideline-before-after/) **(secondary)**
- **Self-pay (自由診療) treatments** described in clinic content need cost and main risks/side-effects disclosed
  (限定解除 conditions). [MHLW 建議](https://www.mhlw.go.jp/content/10800000/001198689.pdf). DentVideo does not know a
  clinic's fees, so the Japanese copywriter is told to add a risk line and point to the clinic for fees, and the clinic
  is told (shoot card / onboarding) to add its standard fee to the caption itself. **Product gap:** a per-clinic
  "self-pay disclosure" field (fees, period, risks) would make this automatic.
- **Unapproved devices/drugs.** Many clear-aligner systems are not approved under Japan's 薬機法; content that names one
  needs extra disclosures (unapproved status, how obtained, domestic alternatives, overseas safety information).
  [JIRA briefing on unapproved device ads](https://www.jira-net.or.jp/event/files/item2024/item2024_1-02_advertising_regulations.pdf)
  **(the dental-aligner specifics are unverified)** → the pipeline never names aligner brands in Japanese.
- **Discounts / campaigns / "モニター募集" / free offers** are a standard 誇大・不当 example.

**Educational short-form allowed?** Yes — disease and hygiene education is the safest content a Japanese clinic can post,
and is exactly DentVideo's format. Must avoid: 体験談, ビフォーアフター, superlatives/comparisons, 無痛/絶対/必ず/完治/永久,
prices or discounts, naming unapproved products, and self-pay treatment content without risk disclosure.

**Competition.** Agencies, and Japanese "AI SNS posting tools" for dentists are appearing
([atsoho comparison 2026](https://atsoho.com/blog/dental-sns-patient-acquisition-ai-compare)); none we found makes
narrated, compliance-checked videos weekly. **Risk:** Japanese quality bar is very high; TTS must sound native (see the
voice test below).

## 2. Gulf Cooperation Council (ar) — rank 2

**Practices.** Dubai alone lists **~436** licensed dental clinics/polyclinics
([zavis directory](https://www.zavis.ai/directory/dubai/dental) **(unverified)**). Saudi MOH ran **3,253 public** dental
clinics in 2023 ([MOH](https://www.moh.gov.sa/en/ministry/mediacenter/news/pages/news-2023-07-24-001.aspx)); Riyadh alone
had **236 private** dental clinics registered back in 2018
([Saudi Dental Journal](https://doaj.org/article/43968120eda44e6e9845c09a4dd8c30d)) — the national private count is
much larger but **no official 2024 figure was found**. Saudi private dental establishments with 3+ staff have had to be
35% Saudi-staffed since March 2024 ([Arab News](https://www.arabnews.pk/node/2373261/saudi-arabia)), i.e. a large,
regulated private sector. UAE: "increasing number of private dental clinics… high degree of competition"
([Insights10](https://insights10.com/report/uae-dental-care-market-analysis) **(commercial)**).

**Willingness to pay.** Dubai agency retainers: AED 2,500 minimum, AED 6,000–15,000 for tiers including Reels/TikToks;
AED 3,000–6,000 for 6–8 reels a month. [redberries.ae](https://redberries.ae/how-much-does-social-media-marketing-cost-in-dubai/)
**(vendor blogs)**. $69–219/month is cheap by comparison. USD pricing is normal in the UAE; show AED/SAR.

**Platforms.** Saudi Arabia: WhatsApp, **Snapchat (~80–88%)**, **TikTok (~77–78%)**, Instagram, X.
[Saudi Internet 2025 report via Minute Mirror](https://minutemirror.com.pk/whatsapp-is-most-used-app-in-saudi-arabia-report-finds-620330/)
**(secondary)**. UAE: Instagram, TikTok, Snapchat, YouTube, WhatsApp
([DHA standards scope](https://www.dha.gov.ae/uploads/042022/Standards%20for%20Medical%20Advertisement%20Content%20in%20Social%20Media2022433965.pdf)).
DentVideo's 9:16 MP4 is postable on all of them (Snapchat Spotlight included).

**Rules.**
- **Dubai (DHA)** — *Standards for Medical Advertisement Content on Social Media* (v1.1, 2022; re-issued by circular
  CIR-2026-00000144, Aug 2026): apply to DHA-licensed facilities on Instagram, Facebook, TikTok, YouTube, Snapchat,
  WhatsApp, LinkedIn; the **facility's medical director must approve** each post; banned claims include **"the best",
  "100%", "no side effects", "immediate results"**, and claiming superiority over other doctors/facilities; filming
  patients during procedures for promotion is banned even with consent.
  [DHA standards PDF](https://www.dha.gov.ae/uploads/042022/Standards%20for%20Medical%20Advertisement%20Content%20in%20Social%20Media2022433965.pdf),
  [DHA circular 2026](https://www.dha.gov.ae/en/circulars/details/CIR-2026-00000144),
  [Khaleej Times word list](https://www.khaleejtimes.com/uae/dubai-health-authority-claims-words-cannot-be-used-in-doctor-clinic-social-media-ads),
  [The National (filming ban)](https://www.thenationalnews.com/uae/dubai-health-authority-bans-filming-of-surgical-procedures-for-advertising-1.728430)
- **Abu Dhabi (DoH)** — facilities log advertising material on DoH systems under the *Healthcare Guidelines for Health
  Media & Advertising*. [DoH circular 26/2023](https://doh.gov.ae/-/media/Feature/Resources/Circulars/26--2023.ashx)
- **Federal (MOHAP / Emirates Drug Establishment)** — health advertisements need ministry approval; fines of
  AED 100,000–200,000 are reported for unapproved health ads online. Federal Decree-Law 38/2024 moved some of these
  services, so the competent body should be confirmed.
  [MOHAP guideline](https://mohap.gov.ae/assets/download/4cbc4da5/Guidelines%20for%20Health%20Advertisement%20Approval%20Requestion_637720409404515599.pdf.aspx),
  [Zawya](https://www.zawya.com/en/legal/uae-health-bodies-face-hefty-fines-for-posting-advertisements-without-clearance-hx7lseqd)
- **UAE Media Council Advertiser Permit** — mandatory from 1 Feb 2026 for individuals publishing promotional content
  (paid or unpaid). A clinic posting on its own licensed account is a company, but dentists posting personally may need
  it. [WAM](https://www.wam.ae/en/article/bkxzoe1-uae-media-council-launches-advertiser-permit),
  [Gulf News](https://gulfnews.com/uae/new-uae-law-advertiser-permit-now-mandatory-for-influencers-and-creators-for-social-media-1.500427938)
- **Saudi Arabia (MOH)** — the Private Health Institutions Law prohibits advertising a facility except under its
  executive regulations; practitioners may not advertise themselves (Health Professions Practice Law); MOH has summoned
  practitioners over promotional social-media videos, penalties up to SAR 3m reported.
  [Ajel](https://english.ajel.sa/saudi-arabia/b2pzo4rzk), [Saudi Gazette](https://saudigazette.com.sa/article/650925),
  [MOH](https://www.moh.gov.sa/en/Ministry/MediaCenter/News/Pages/News-2024-04-21-003.aspx) **(secondary; regulation text
  not retrieved)**.

**Educational short-form allowed?** Yes, with conditions: content must come from the licensed facility's account, be
approved by its medical director (DHA) and, depending on emirate/country, the facility must hold or log an advertising
approval. Educational videos without offers or claims are the low-risk end. Must avoid: best/100%/no side
effects/immediate results, superiority, prices and offers, patient filming or testimonials, before/after, cure claims,
and anything presented as the dentist's personal promotion in Saudi Arabia. **Onboarding for ar clinics must say this
plainly; DentVideo's "dentist approves every video" step is the hook into the medical-director approval.**

**Language.** Modern Standard Arabic (simplified, spoken register) works across the Gulf and is what TTS speaks well;
Gulf dialect is a later per-clinic option.

**Risks.** Permit/approval regimes vary by emirate and change often; Saudi practitioner self-promotion ban; RTL rendering
must be right first time (done in this change); Dodo SA card acceptance to confirm.

## 3. Poland (pl) — rank 3

**Practices.** ~40,600 practising dentists at the end of 2022, only **34.6%** of whom provided any NFZ (public)
services; 5,239 providers held NFZ dental contracts in Q1 2024. **~93% of dentists work in private, usually one-person
practices** ([OKO.press](https://oko.press/stomatologie-trzeba-przywrocic-obywatelom-oto-jak-mozna-to-zrobic)
**(unverified figure)**; NIK/NIL via [Sejm answer](https://api.sejm.gov.pl/sejm/term10/interpellations/attachment/ATTDNYJPR/i13211-o1.pdf)).
Dental care is "largely privately financed" ([Medexpress](https://www.medexpress.pl/en/protection-health/polacy-odkladaja-leczenie-zebow-by-cost-experts-to-bomb-health-and-economy/)).

**Willingness to pay.** Dental prices rose ~9% y/y in 2024 and up to 10% in Q1 2025
([WBJ](https://wbj.pl/prices-of-dental-services-in-poland-rising-much-faster-than-eu-average/post/144810),
[Infor](https://ksiegowosc.infor.pl/obrot-gospodarczy/dzialalnosc-gospodarcza/6792915,nawet-o-10-drozej-za-leczenie-zebow-w-i-kwartale-2025-r-dentysci-podnosza-ceny-bardziej-niz-postepuje-inflacja-ich-koszty-rosna-jeszcze-szybciej.html)).
Lower than DE/FR, but $39–69 is within a private practice's marketing budget **(our estimate)**. PLN display + BLIK via
Dodo; VAT invoice expected.

**Platforms.** Instagram, Facebook (still large in PL), TikTok, YouTube; ZnanyLekarz (Docplanner) for reviews/booking
**(general knowledge; no dental-specific survey found)**.

**Rules.** The revised **Kodeks Etyki Lekarskiej** (applies to physicians and dentists) took effect **1 Jan 2025**: the
blanket advertising ban is gone; a doctor/dentist may inform about services provided it complies with the code
(new art. 71), may not use professional authority to promote unrelated products, and for the first time the code
addresses social media. [Infor](https://www.infor.pl/prawo/nowosci-prawne/6827190,nowy-kodeks-etyki-lekarskiej-kluczowe-zmiany-2025.html),
[Rzeczpospolita](https://www.rp.pl/prawo-dla-ciebie/art40639991-znika-zakaz-reklamy-dla-lekarzy-ale-nie-bedzie-dowolnosci),
[PAP](https://www.pap.pl/aktualnosci/ekspert-teraz-lekarze-maja-prawo-sie-reklamowac-wywiad). The change followed CJEU
case law that blanket bans breach EU law (C‑339/15 Vanderborght, a Belgian dentist)
([Poland Insight](https://polandinsight.com/eu-court-ruling-could-prompt-end-to-polands-ban-on-medical-advertising-19463/)).
Pharmaceutical Law separately bars medical professionals from taking part in advertising medicines. Unfair-practice and
consumer law apply to misleading claims. **The exact art. 71 wording was not retrieved — check the NIL text.**

**Educational short-form allowed?** Yes — informing patients was always allowed and is now explicitly the safe path.
Must avoid: misleading or comparative claims, "najlepszy", guarantees, "bezbolesny", prices/promotions framed as
inducements, patient testimonials, endorsing products/brands (toothpaste, aligner brands).

**Competition.** Local agencies; no Polish AI tool for narrated dental education videos found. **Timing advantage:**
clinics are only now allowed to market.

## 4. South Korea (ko) — rank 4 (later)

~**19,005 dental clinics** (치과의원) and 242 dental hospitals (Feb 2025, non-covered-service reporting)
([dentalnews](https://dentalnews.or.kr/news/article.html?no=44487) **(secondary)**). Medical Service Act art. 56 bans
testimonials, results-misleading before/after, comparison and disparaging ads; art. 57 requires **pre-review by the
self-regulatory body for ads on any SNS/internet medium with ≥100,000 average daily users** — counted per platform, so
Instagram/YouTube/TikTok all qualify (Seoul Administrative Court, 2025).
[Medical Times](https://medicaltimes.com/Mobile/News/NewsView.html?ID=1164847),
[law column](https://dentalnews.or.kr/news/article.html?no=48144). Penalties up to 1 year / KRW 10m
([cheongchul](https://cheongchul.com/blog/의료광고-변호사-의료법상-금지되는-치료경험담-치료후기-광고)). Whether purely
educational posts are "ads" is contested ("정보성 게시물도 실질적으로 광고로 보이면 위반"). A weekly pre-review per video is
a product killer; local agencies (and KakaoTalk/Naver Blog-first habits) make it crowded. Revisit with a "pre-review
export" feature.

## 5. Taiwan / Hong Kong (zh-Hant) — rank 5 (later)

Taiwan: ~16,384 dentists end-2023 (pressure-group count) ([NOWnews](https://www.nownews.com/news/6712954)
**(unverified)**). Medical Care Act §85 whitelists ad content (name, address, dentists' qualifications, specialties,
hours, items the MOHW announces); §86 bans improper methods incl. promotions ("8折" implant offers fined); §103 fines the
responsible dentist **NT$50k–250k**, Taipei adds NT$10k per extra post; "an assistant ran the account" is not a defence;
the 2023 Constitutional Court ruling (112 憲判字 17) lets individual doctors advertise too.
[Taipei appeal decisions](https://laws.gov.taipei/law/LawDecision/ContentPrint?id=1584-034),
[Angle health-law review](https://www.angle.com.tw/ahlr/journal/content.aspx?no=915462). Educational content naming the
clinic sits close to that whitelist line. Hong Kong's Dental Council code is stricter on practice promotion **(not
researched in depth)**. Good market later, with a Taiwan-specific "health-education only, no service promotion" mode.

## 6. Netherlands (nl) — rank 6

~9,555 active dentists (2025) in ~5,100 mostly small practices (2014 estimate); adult care is outside basic insurance and
paid privately or via supplementary cover. [CED profile 2026](https://www.cedentists.eu/wp-content/uploads/2026/06/Netherlands-2026-23.06.2026.pdf),
[WHO HSPM](https://eurohealthobservatory.who.int/monitors/health-systems-monitor/countries-hspm/hspm/netherlands-2016/provision-of-services/dental-care).
High willingness to pay and iDEAL via Dodo, but a small market where English content is often acceptable. Cheap to add
later (Latin script).

## 7. Singapore (en; zh-Hans/ms optional) — sell now in English

Clinics are licensed under the Healthcare Services Act; the **HCS (Advertisement) Regulations 2021** cover ads,
endorsements and testimonials (testimonials prohibited by default), and the **SDC Ethical Code** bars dentists from
soliciting testimonials and restricts before/after and outcome claims.
[HCS (Advertisement) Regs](https://sso.agc.gov.sg/SL/HSA2020-S1033-2021),
[MOH advertising FAQ](https://www.moh.gov.sg/docs/librariesprovider8/resources/12-10-2023-advert-regs-faqs-(1).pdf),
[SDC Ethical Code](https://sdc.gov.sg/for-professionals/regulations-guidelines-circulars/sdc-ethical-code-guidelines/),
[SDC advisory on SEO platforms](https://healthprofessionals.gov.sg/sdc/home/announcement/Index/advisory-on-provision-of-government-indemnity-against-claims-arising-from-work-carried-out-by-medical-practitioners-and-healthcare-workers-deployed-to-support-whole-of-government-(-wog-)-covid-19-efforts).
English is the clinics' working language, so the existing pipeline serves them; this change adds SG to the
market-specific compliance notes. Number of clinics: **not found** (estimate several hundred to ~1,000 private clinics —
unverified). Small but rich: a good reference market for Malaysia later.

## 8. Malaysia (ms/en/zh) — rank 7

Facility advertising must follow the Private Healthcare Facilities and Services Act 1998 and MoH guidelines; the
Medicine Advertisement Board approval process for facility ads was reportedly cut to 3–5 days; the Malaysian Private
Dental Practitioners Association campaigns against "unethical advertising".
[MoH MDC guidelines](https://hq.moh.gov.my/ohp/mdc/doclink/guidelines-and-provisions-for-public-information-2022/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJndWlkZWxpbmVzLWFuZC1wcm92aXNpb25zLWZvci1wdWJsaWMtaW5mb3JtYXRpb24tMjAyMiIsImlhdCI6MTc1NDM3NDU5NSwiZXhwIjoxNzU0NDYwOTk1fQ.jthS1e1TbTFN0iBElcvT8JxrxAxOXEXG7dLyAHmQXOM),
[IMTJ](https://www.laingbuissonnews.com/imtj/news-imtj/relaxation-of-rules-on-advertising-may-help-medical-tourism-to-malaysia/),
[FMT](https://fmtv5.freemalaysiatoday.com/category/nation/2023/03/22/unethical-ads-giving-dental-association-the-ache).
Per-ad approval + lower price tolerance → later; English works for many urban clinics today.

## 9. Indonesia (id) — rank 8

Social media is a key promotion channel for Indonesian dentists, with ethics questions unresolved
([IJPHS 2025](https://ijphs.iaescore.com/index.php/IJPHS/article/view/24582)); a Pepsodent campaign says ~96% of
Indonesians did not visit a dentist in the past year
([Marketech APAC](https://marketech-apac.com/pepsodent-launches-social-media-academy-in-indonesia-to-train-dentists-as-dentfluencers/)
**(brand claim)**). Clinic counts and KODEKI advertising text **not found**. Low SaaS ARPU expected; not now.

## 10. Mainland China (zh-Hans) — poor fit

- Instagram, TikTok and YouTube are blocked; clinics use Douyin, Xiaohongshu, WeChat Channels, Kuaishou.
- **医疗广告管理办法** (2006, in force): every medical ad needs a **医疗广告审查证明** (valid one year) and must show the
  certificate number; disguising ads as news or health-information columns is banned, and the Advertising Law bans
  medical ads disguised as health/wellness knowledge. A Shanghai clinic was fined ¥14,400 for an unreviewed
  "探店" video on WeChat Channels. A revision of the measures is planned (2025 work plan); Beijing's 2026 rules for
  medical-beauty live streams require the certificate number on screen.
  [法大大 (current text)](https://www.fadada.com/article/Basics-005648),
  [君合 analysis](https://www.junhe.com/legal-updates/1866?locale=zh),
  [Beijing 2026](https://www.beijing.gov.cn/zhengce/zhengcefagui/202604/W020260428497254152997.pdf)
- A foreign, card-billed SaaS without a Chinese entity, ICP filing, WeChat Pay/Alipay invoicing (发票) and in-country
  hosting cannot realistically sell here, and the core format (clinic-branded health education) is exactly what the
  regulation targets. **Recommendation: do not pursue.** Chinese-speaking clinics in Singapore/Malaysia/Taiwan are the
  route to Chinese content.

---

## Recommendation

**Build ja, ar, pl now (this PR); sell Singapore in English now; revisit ko and zh-Hant with a compliance-export feature;
skip mainland China.**

Revenue logic (illustrative, our assumptions): the addressable pool is private clinics that already pay for social media.
- **Japan**: even 0.1% of ~65k clinics = 65 clinics × $69 ≈ $4.5k MRR; the agency price anchor (¥50k+/month) supports the
  $219 tier for multi-clinic groups. Highest ceiling.
- **Gulf**: fewer clinics but the highest price tolerance; 50 clinics × $69–219 ≈ $3.5–11k MRR. Chains/polyclinics buy
  the top tier.
- **Poland**: ~38k private dentists; 0.2% × $39–69 ≈ $3–5k MRR; cheapest to serve, and the 2025 code change is a
  window.

Risks, honestly:
- **Japan:** the 自由診療 disclosure requirement means the clinic must add fees to captions for implant/aligner/whitening
  topics (we cannot know them); Japanese buyers expect polished Japanese UX, support and invoices.
- **Gulf:** regulator approvals (DHA medical-director approval, DoH logging, MOHAP/EDE, Media Council permits, Saudi MOH)
  sit outside DentVideo; if a clinic needs a permit per post, weekly volume is the limit. Arabic RTL must be flawless.
- **Poland:** lower ARPU; art. 71 boundaries still being tested by disciplinary courts.
- **All:** Dodo coverage for SA/JP cards and local invoices must be confirmed before paid campaigns.

---

## Website localisation brief

For the agent localising the website. These are copy rules for marketing pages, not the video pipeline.

**Wiring the site to the pipeline:** the sign-up/profile form's language list
(`web/src/lib/dentvid/profile.ts`) must offer `ja`, `ar` and `pl` — the video pipeline accepts them as of this change,
and the live preview (`web/src/remotion`, mirrored from the worker) already renders Japanese and right-to-left Arabic.
Country codes JP, AE/SA/QA/KW/BH/OM, PL and SG switch on that market's compliance rules in the pipeline.

### Japanese — `ja` (ja-JP)
- **Script/direction:** Japanese (kanji + kana), LTR. No spaces between words; use full-width punctuation 、。「」;
  avoid ending lines on an opening bracket; set `lang="ja"` so Noto Sans JP / system Japanese fonts are used (not Chinese
  glyph variants).
- **Tone:** polite, calm, precise; です・ます調 throughout. Trust signals (clear process, privacy, the dentist approves
  everything) beat hype. Avoid katakana-heavy marketing jargon where a plain Japanese word exists.
- **Address:** never "あなた" in headings; address the clinic implicitly or as "院長先生" / "歯科医院の皆さま".
- **Do-not-say (marketing copy):** 日本一 / No.1 / 業界最安 / 最高 / 絶対 / 必ず / 確実に集患 / 患者数◯倍 (unverifiable
  results), 「医療広告ガイドライン完全対応」「100%準拠」 (we filter, we do not guarantee legal compliance — say
  「医療広告ガイドラインを踏まえたチェック」), 無料 only if truly free, no fake testimonials or clinic logos without
  permission.
- **Platforms to mention:** Instagram（リール）, TikTok, YouTube ショート, LINE 公式アカウント.
- **Pricing:** show JPY equivalent (税込 notation) next to USD; mention 請求書/領収書 availability only once confirmed with
  Dodo.

### Arabic — `ar` (Gulf-oriented MSA; hreflang `ar` with `ar-AE`/`ar-SA` alternates)
- **Script/direction:** Arabic, **RTL** (`dir="rtl"`): mirror layout, icons with direction (arrows, chevrons, progress),
  keep phone numbers, prices, @handles, URLs and brand names LTR (use `<bdi>`/`dir="ltr"` spans). No letter-spacing on
  Arabic text; increase line height. Font: Noto Kufi Arabic / Noto Sans Arabic / IBM Plex Sans Arabic. Western digits
  (0–9) are normal in the Gulf.
- **Tone:** professional and respectful Modern Standard Arabic, simple sentences; warm but not salesy. Avoid literal
  translations of English idioms.
- **Address:** plural/neutral forms (أنتم / عيادتكم) — they avoid gendering and read as polite.
- **Do-not-say:** الأفضل / رقم 1 / الأرخص / مضمون / نتائج فورية / 100% / بدون أي آثار جانبية / خصم / عرض لفترة محدودة
  (DHA explicitly lists best, 100%, no side effects, immediate results); never imply DentVideo replaces the regulator's
  approval — say the clinic's medical director approves every video («اعتماد المدير الطبي»), and that advertising
  permits (DHA/DoH/MOH/Media Council) remain the clinic's responsibility.
- **Platforms:** Instagram (Reels), TikTok, Snapchat, YouTube Shorts; WhatsApp for contact.
- **Pricing:** USD with AED/SAR shown; VAT-inclusive wording for UAE (5%) / KSA (15%) once confirmed with Dodo.

### Polish — `pl` (pl-PL)
- **Script/direction:** Latin with Polish diacritics (ą ć ę ł ń ó ś ź ż), LTR; check fonts include them (Inter does).
  Polish words are long — allow wrapping in buttons.
- **Tone:** factual, friendly, professional; avoid anglicisms where a Polish word is natural (but "Reels", "TikTok"
  are fine).
- **Address:** formal plural "Państwo" for the clinic ("Państwa gabinet"), or impersonal forms; avoid "Ty" in B2B copy.
- **Do-not-say:** najlepszy / nr 1 / gwarancja / gwarantowane wyniki / bezbolesny / 100% / "więcej pacjentów
  gwarantowane"; do not claim "zgodne z prawem" — say "z kontrolą zgodności z zasadami reklamy medycznej (Kodeks Etyki
  Lekarskiej 2025)". No fake reviews; ZnanyLekarz only as a reference, not as a partner, unless it is one.
- **Platforms:** Instagram, Facebook, TikTok, YouTube Shorts.
- **Pricing:** USD with PLN shown; VAT invoice (faktura VAT) once confirmed; BLIK as a payment method if Dodo enables it.

---

## Implementation notes (video pipeline, this change)

What a new pipeline language needs, and what was done for ja/ar/pl — see the PR for code:
compliance hard rules and AVOID words in the language (ja without word boundaries), market notes per country (JP, AE/SA
and GCC, PL, SG) for the writers and the reviewer, spoken-register cues, Google-suggest seeds, address rules
(です・ます / neutral plural Arabic / Państwo), speech-rate units (Japanese counted in characters, ~5.5/s), TTS
voice brief, background-photo stems, CJK phrase segmentation and width-aware sizing, RTL layout, and Noto CJK + Noto
Arabic fonts in the worker image. Eval results and rendered frames are recorded in the PR.

### Results of this change (2026-11-08)

**Voice (tts-1-hd), one clinic script per language, gpt-4o-transcribe round trip + gpt-audio judge:**

| Language | nova | onyx | shimmer | echo | gpt-4o-mini-tts/nova |
|---|---|---|---|---|---|
| ja | CER 2.8%*, 8/9 native | 2.8%*, 8/9 native | 2.8%*, 8/9 native | — | 5.6%*, 8/9 native |
| ar | 0%, 7/8 slight accent | **12.9%, garbled opening** | **0%, 8/9 native** | **0%, 8/9 native** | 0%, 8/9 native |
| pl | 0%, 9/9 native | 0%, 8/9 native | 0%, 9/9 native | — | 0%, 8/9 native |

\*Japanese CER is kana/kanji spelling of the same words (後 vs あと) and punctuation, not mispronunciation. Scores are
natural/pronunciation out of 10. Decision: keep tts-1-hd everywhere; for Arabic, swap nova→shimmer and onyx→echo
(`voiceFor` in worker/src/dental/voice.ts).

**Agent eval** (`eval.ts --only ja,ar,pl --per 5`, gpt-5.4 / gpt-5.4-mini, judge gpt-4o), 14 videos:

| Language | Ready | First pass | Hook | Voice |
|---|---|---|---|---|
| ja | 80% | 80% | 4.0 | 3.75 |
| ar | 100% | 100% | 4.0 | 4.0 |
| pl | 100% | 80% | 4.0 | 4.0 |

Japanese narrations picked up the market rules unprompted in the text ("ホワイトニングは自由診療です。しみる感じや知覚過敏が
出ることがあります"); the one Japanese rejection was the accuracy reviewer catching an over-general implant timeline.
Arabic narration is simplified MSA with light Gulf colloquialisms (صار معكم، بدري) — natural for Gulf social media;
a strict-MSA or dialect setting is a possible per-clinic option later. Polish kept "Państwo" consistently.
Agent cost: $0.043 per video.

**Renders:** one real CLI video per language (34.8 s ja, 36.5 s ar, 32.6 s pl, QA ok): no tofu, Japanese wraps
between phrases, Arabic is right-to-left (list badges, compare cards, logo mirrored to the top left, @handle kept LTR).
