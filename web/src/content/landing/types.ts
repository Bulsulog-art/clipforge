/**
 * The shape of one landing page's copy (content/landing/<locale>.ts).
 *
 * The page answers, in order, the five questions a careful owner-dentist asks
 * (scratchpad brief "premium positioning", §3): what exactly do I get, will it
 * look good for my clinic, what changes for me, can it get me in trouble, is it
 * worth the price and can I get out.
 *
 * Rules for anything written here (enforced by content/*.test.ts):
 * - describe only what the product does today, and nothing an owner has not
 *   cleared ([OWNER] / [SHIP FIRST] items in the brief stay out);
 * - no price figures: {price}, {starter} and {practice} slots are filled from
 *   lib/dentvid/pricing.ts (the list prices Dodo charges), in the visitor's
 *   currency. The only other money figures allowed are the sourced agency
 *   ranges in `compare.cost.agency` (pricing memo §1.1);
 * - no guarantee, refund or satisfaction offer, no discount, no free week;
 * - never promise patients or bookings; the ROI line stays hedged;
 * - no testimonials, client counts, ratings or invented cases.
 */

export type Faq = { q: string; a: string };
export type TitledText = { title: string; text: string };

/** "DentVideo vs an agency vs doing it yourself": three columns, the same rows in every locale. */
export type Comparison = {
  heading: string;
  text: string;
  /** DentVideo, a social media agency, doing it yourself — always in this order. */
  columns: [string, string, string];
  rows: [ComparisonRow, ComparisonRow, ComparisonRow, ComparisonRow];
  /**
   * The cost row. `ours` holds {starter} and {practice} slots (Starter's and
   * Practice's monthly list prices, from pricing.ts). `agency` may hold the
   * sourced agency range for the market (pricing memo §1.1); nothing else here
   * may carry a figure.
   */
  cost: { label: string; ours: string; agency: string; diy: string };
  /** Where the agency range comes from, and that quotes differ. */
  source: string;
};
export type ComparisonRow = { label: string; values: [string, string, string] };

/**
 * A plan card. No price here: the figure comes from lib/dentvid/pricing.ts in
 * the visitor's currency (components/dentvid/price.tsx), so the page can only
 * ever show what Dodo charges.
 */
export type PricingTier = { name: string; blurb: string; features: [string, string, string, string, string] };

export type LandingContent = {
  meta: { title: string; description: string; ogDescription: string };
  /** §1 The first screen: what arrives, for whom, and that the clinic stays in control. */
  hero: {
    eyebrow: string;
    h1: string;
    lead: string;
    /** The main button: down to the landing's own logo preview (#try), no account. */
    cta: string;
    /** Under the button: the logo preview needs no account. */
    ctaHint: string;
    /** The one text link beside the button: down to the sample videos. */
    samplesLink: string;
    /** After "From {price}/month": monthly, cancel anytime. */
    priceNote: string;
    /** Three true facts, no figures except the "within an hour" the plan step promises. */
    facts: [string, string, string];
  };
  /** Two small cards beside the hero phone, in the app's own words. */
  mock: { ready: string; copied: string };
  /** Labels for the hero video's play/pause control. */
  video: { play: string; pause: string };
  /** §2 "Try it with your logo": a live preview on the landing, no account. */
  teaser: {
    eyebrow: string;
    heading: string;
    text: string;
    name: string;
    namePlaceholder: string;
    logo: string;
    color: string;
    cta: string;
    note: string;
  };
  /** §3 What arrives every Monday: the deliverable, made concrete. */
  monday: {
    heading: string;
    lead: string;
    items: [TitledText, TitledText, TitledText, TitledText, TitledText, TitledText, TitledText];
    /** Above the example topics (the sample videos' own topics). */
    exampleLabel: string;
    /** The last chip: two more topics every Monday. */
    more: string;
  };
  /** §4 Real output for a demo clinic, shown as-is. */
  samples: { heading: string; text: string; badge: string };
  /** §5 What changes for the clinic: the value, no numbers. */
  value: { heading: string; items: [TitledText, TitledText, TitledText, TitledText]; roi: string; roiNote: string };
  /** §6 How it works, with the app's real screens (alt texts in `shots`). */
  how: { heading: string; steps: [TitledText, TitledText, TitledText]; shots: [string, string, string] };
  /** §7 Approval, decline, own-account posting. */
  control: { heading: string; lead: string; points: [TitledText, TitledText, TitledText, TitledText, TitledText, TitledText] };
  /** §8 The market's advertising rules: what the software does and does not do. */
  rules: {
    heading: string;
    lead: string;
    doesHeading: string;
    does: [string, string, string];
    doesNotHeading: string;
    doesNot: [string, string, string];
    close: string;
  };
  /** §9 Who it is for, and who it is not for. */
  fit: { heading: string; yesHeading: string; yes: [string, string, string, string]; noHeading: string; no: [string, string, string, string] };
  /** §10 */
  compare: Comparison;
  /**
   * §11 The plans. No figures: prices come from lib/dentvid/pricing.ts in the
   * visitor's currency (USD in the server-rendered page, swapped in the
   * browser for EUR or TL where that is what Dodo charges).
   */
  pricing: {
    heading: string;
    text: string;
    cta: string;
    perMonth: string;
    /** "From {price}/month": {price} is Starter's list price. */
    from: string;
    recommended: string;
    /** Under the cards: {currency} is "USD", "EUR" or "TL"; prices exclude tax, Dodo is the merchant of record. */
    note: string;
    /** Under the cards: monthly, how to cancel, access until the paid period ends. */
    cancel: string;
    /** Starter, Practice — always in this order. Group is "Contact us" (content/dentvideo-group.ts). */
    tiers: [PricingTier, PricingTier];
  };
  /** Beside the plans: "Why does it cost more than a design app?" */
  pricingWhy: Faq;
  /** Right under the plans: what a clinic gets every week, and what it does not. */
  scope: { heading: string; includedHeading: string; included: [string, string, string, string]; excludedHeading: string; excluded: [string, string, string, string] };
  /**
   * §12 Before you decide: existing facts only — no guarantee, refund or satisfaction offer.
   * Six answers to the objections a dentist has at the price, in this order: see it first,
   * nothing to film, checked then approved, decline with a note, cancel anytime, downloads stay yours.
   */
  before: { heading: string; items: [TitledText, TitledText, TitledText, TitledText, TitledText, TitledText] };
  /**
   * §13 Who is behind DentVideo: who runs it, who takes the money, what happens
   * to the data, how to leave, plus patient data, the DPA and AI disclosure.
   */
  trust: {
    heading: string;
    items: [TitledText, TitledText, TitledText, TitledText];
    /** "Managing director": shown before the operator's director's name. */
    director: string;
    /** "Questions reach a person at": shown before the support address. */
    contact: string;
    data: [TitledText, TitledText, TitledText];
    /** The link to the DPA page under the data facts. */
    dpaLink: string;
    legal: string;
  };
  /** §14 */
  faqHeading: string;
  faq: [Faq, Faq, Faq, Faq, Faq, Faq, Faq, Faq, Faq, Faq];
  /** §15 One last action. `small` holds a {price} slot (Starter's list price). */
  final: { heading: string; text: string; cta: string; small: string };
  guidesHeading: string;
};
