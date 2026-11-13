# 6. Referral and partner programme (description only — nothing is built)

Two programmes, both cheap because DentVideo's unit cost is ~$4.60 per clinic per month (`POSITIONING.md` §6): a free
month costs us ~$5 of real money and $29–49 of forgone revenue, paid only after the new clinic has paid.

## A. Clinic → clinic: "Bir ay sizden, bir ay bizden" / "Give a month, get a month"

**Offer:** when a clinic you referred pays its **second** monthly invoice (i.e. stays past month one), **both** clinics get
their next month free (credited to the next invoice). Up to 12 free months per referring clinic per year.

Why this shape:
- **Keeps "no free trial" intact.** The referred clinic still pays before anything is generated; the credit only lands
  after a second payment, so it cannot be farmed with throwaway signups.
- **No invented urgency.** There is no limited offer to chase; a referred clinic pays the same list price as anyone.
- **Dentists talk to dentists.** Oda/Kammer/colegio circles, study clubs and alumni WhatsApp groups are where a
  recommendation from a colleague carries weight we can't buy.

**How it would work (for the dev agent, later):**
1. Each paying clinic gets a personal link on its account page: `dentvideo.com/?ref=<clinicCode>`.
2. The `ref` code is stored with the signup (today `landing_view` only stores the referring *host*; this needs a small
   field on the clinic row).
3. A webhook on the referred clinic's second successful payment issues a one-cycle 100% discount on both clinics'
   next invoice in Dodo, and logs it for `/admin` ("Referrals: pending / earned").
4. One e-mail to each clinic when the month is earned. No leaderboards, no gamification.

**Rules and wording:**
- Only paying clinics can refer; self-referral or a second account of the same clinic doesn't count.
- No cash, so no tax forms for dentists; it is a price discount on a B2B service.
- **Germany:** a software discount between practices is unrelated to patient referrals, so § 299a StGB (healthcare
  bribery) is not engaged; still never tie a reward to patients, prescriptions or products used on patients.
- If a clinic posts its link publicly (e.g. on Instagram), it must label it as an ad/referral ("reklam / iş birliği",
  "Werbung", "#publi"). Türkiye's Reklam Kurulu influencer guidance and EU/Spanish rules require that disclosure; the
  account-page text should remind them.
- Copy (TR): "Bir meslektaşınızı davet edin: ikinci ödemesini yaptığında ikinizin de bir sonraki ayı bizden."
  (DE): "Empfehlen Sie DentVideo einer Kollegin oder einem Kollegen: Sobald die Praxis zum zweiten Mal bezahlt hat,
  ist für beide der nächste Monat kostenlos." (ES): "Recomiende DentVideo a un colega: cuando su clínica pague la
  segunda cuota, el siguiente mes es gratis para ambos."

**Cost cap:** at most 2 free months per new clinic acquired (one each side) ≈ $100–200 forgone revenue per clinic that has
already paid twice. Cheaper than any paid channel.

## B. Partners: agencies, dental depots, software vendors, consultants

**Offer (pick one per partner, decide before the first call):**
1. **Affiliate:** 20% of what the referred clinic pays, for its first 12 months, paid monthly once the balance is ≥ $50
   (bank transfer/Wise against the partner's invoice to BLS AI Automation DOO).
2. **Reseller / white-label-lite (agencies):** the agency buys Practice seats at a volume price below the $49 list price
   (for 5+ clinics; the figure is the owner's call) and bills its clients itself; videos still carry the *clinic's*
   brand, never the agency's or ours, and the clinic's dentist still approves every video.

**Who it fits:** dental social-media agencies (we remove their weekly Reels grind), dental depots and online dental
shops (newsletter mention to their clinic customers), clinic-management software (in-app partner offer), practice
consultants (*Praxisberater*, *danışman*), implant/aligner companies' clinic-education programmes.

**Rules:**
- Written one-page partner terms before any payout: no promises of results, no "approved by/partner of [chamber]", must
  use the canonical definition (README), must disclose the commission where they recommend publicly, we can end the
  arrangement if they spam (partners must follow the same outreach law as we do — in DE/ES that means no cold e-mail
  to clinics on our behalf).
- **No commissions to professional bodies** (TDB, odalar, Kammern, colegios). They get free, neutral content and
  talks, never money: money would look like a bought endorsement.
- Track partner-sourced clinics with `?ref=partner-<name>` + `utm_source=partner` until the referral field exists.

## What to measure

Share of new paying clinics that came via referral or partner (target ≥ 25% by month 3), cost per referred clinic
(forgone revenue), 90-day retention of referred vs. cold-outreach clinics (referred clinics usually stay longer — verify
with our own data before claiming it anywhere).
