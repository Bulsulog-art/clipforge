# DentVideo go-to-market kit: the first 100 paying clinics

Written 2026-11-11 for Bulsu Labs (BLS AI Automation DOO, Podgorica). Two people, little money, no free trial, no
reviews yet. The goal is **100 paying clinics**. There is no discount and no founding offer (removed 2026-11-13): plans are
Starter $29/month and Practice $49/month, and we invent no urgency.

| File | What it is |
| --- | --- |
| [01-icp-and-markets.md](01-icp-and-markets.md) | Who we sell to, and which 3 markets first (Türkiye, DACH, Spanish-speaking: Spain + Mexico), with numbers |
| [02-outreach-law-and-channels.md](02-outreach-law-and-channels.md) | What outreach is lawful in each chosen market, and the channels we use instead of cold email |
| [03-templates-tr.md](03-templates-tr.md) | Ready-to-send Turkish messages + 60-second demo script |
| [03-templates-de.md](03-templates-de.md) | Ready-to-send German messages + 60-second demo script |
| [03-templates-es.md](03-templates-es.md) | Ready-to-send Spanish messages (Spain and Mexico) + 60-second demo script |
| [04-30-day-launch-plan.md](04-30-day-launch-plan.md) | Day-by-day plan for 2 people, targets, and what to watch in `/admin` |
| [05-listings-copy.md](05-listings-copy.md) | Product Hunt, G2, Capterra, AlternativeTo, SaaSHub, OMR Reviews, LinkedIn, Crunchbase copy |
| [06-referral-program.md](06-referral-program.md) | A cheap, lawful referral and partner programme (description only) |
| [07-targets-turkiye.md](07-targets-turkiye.md) | 50 organisations to approach in Türkiye, with URLs |

This kit builds on, and does not repeat, `docs/POSITIONING.md` (pricing logic, objections, claims we must not make),
`docs/MARKETS.md` (per-country advertising rules), `docs/OFFSITE_PLAN.md` (listings and trade-press tiers) and
`docs/SEO_PLAN.md`.

## The facts every message uses (do not paraphrase)

**One-line definition** (from `web/src/content/guides/entity.ts`; use it verbatim everywhere):

> DentVideo is a web app for dental clinics that makes short patient-education videos — narrated, captioned and in the
> clinic's colours — and checks every script for clinical accuracy and health-advertising rules before the dentist
> approves it. It is made by Bulsu Labs.

**Short form (≤160 chars):** DentVideo makes weekly patient-education videos for dental clinics, checked for advertising
rules and clinical accuracy before the dentist approves. (148)

| Fact | Exact wording |
| --- | --- |
| What a clinic gets | 5 short vertical (9:16) videos every Monday, narrated and captioned, with the clinic's logo and colours |
| Languages | Videos in 10 languages (EN, DE, ES, FR, IT, PT, TR, JA, AR, PL); website in 8 (EN, DE, ES, TR, FR, JA, AR, PL) |
| The check | Every script and caption is checked twice: once for health-advertising rules, once for clinical accuracy. It is a careful filter, not legal advice. |
| Who decides | The dentist approves every video. DentVideo does not post by itself; the clinic shares approved videos from its phone. |
| Prices (USD) | Starter $29/month. Practice $49/month (adds the dentist's own recordings turned into captioned clips). Group: contact us (hello@dentvideo.com). Monthly only (no yearly plan), no minimum term. |
| Discounts | None. The founding offer (code `KURUCU100`) was removed on 2026-11-13; checkout applies no code by default. |
| Before paying | A live preview of the clinic's own branded video (logo + colours) in the browser. **No free trial, no free week.** |
| Not done | No avatar doctors, no fake patients, no auto-posting, no promised patient numbers. |

## Ground rules for every message, post and listing

1. **No invented reviews, testimonials, logos, client counts or statistics.** We have no customers to quote yet. Say so
   if asked: "You would be one of our first clinics."
2. **No outcome or legal promises:** not "more patients", "fill your chair", "100% compliant", "HWG-sicher",
   "yasaya tam uyumlu", "garantizado".
3. **No professional body named as a partner or endorser** unless it has agreed in writing.
4. **No invented urgency:** there is no limited offer, so there are no "seats left". No countdown timers, no
   "today only".
5. **No disparaging named competitors or agencies.** Compare with categories ("an agency", "doing it yourself").
6. **One personalised first line per message.** A template sent unedited is spam, and in the EU it is also the thing
   regulators fine.
7. **Every outreach message names the sender (person + DentVideo/Bulsu Labs) and offers an easy "no".** A "no" is
   logged and never contacted again (see the do-not-contact list in 02).
8. **Product gap to know before selling hard:** the video pipeline has market-specific rule notes for JP, the GCC, PL
   and SG (`worker/src/dental/locale.ts` → `marketRules`). For TR, DE, ES and MX it relies on the universal hard rules
   plus the reviewer being told the clinic's country. That is enough to say "checked against commonly restricted claims
   in your country", but adding TR/DE/AT/CH/ES/MX notes (Turkish 2025 Tanıtım Yönetmeliği, HWG §11 + Berufsordnung,
   RD 1907/1996, COFEPRIS aviso de publicidad) is the cheapest way to make the core promise stronger in the three
   chosen markets. Ask the dev agent for it in week 1.
