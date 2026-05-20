import { LegalShell } from "../legal-page";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effective="May 2026">
      <p>By using ClipForge you agree to these terms. They're short, written in plain language, and they're the ones we'll point to if anything goes sideways.</p>

      <h2>1. The deal</h2>
      <p>You upload videos or paste links you have the rights to. We turn them into shorter clips and let you publish them. You keep all rights to your content; we never claim anything we don't need to deliver the service.</p>

      <h2>2. What you can't do</h2>
      <ul>
        <li>Upload content you don't have rights to (someone else's full video, copyrighted material you don't license, etc.).</li>
        <li>Use ClipForge to create non-consensual deepfakes, harass, defraud, or impersonate.</li>
        <li>Use AI Face Swap on real public figures without consent, or to deceive viewers.</li>
        <li>Scrape, reverse-engineer, or abuse rate limits.</li>
        <li>Run automated bulk-buy of credits to resell elsewhere.</li>
      </ul>
      <p>Violating these terms can result in account suspension and forfeit of credits. For severe violations (CSAM, threats, etc.), we cooperate with law enforcement.</p>

      <h2>3. Subscriptions, credits, and refunds</h2>
      <ul>
        <li><strong>Plus subscriptions</strong> renew automatically until you cancel via App Store. Cancellation takes effect at the end of the current period.</li>
        <li><strong>Credit packs</strong> are consumable: once spent on a video render or AI tool, they cannot be refunded.</li>
        <li><strong>Apple-issued refunds</strong>: if Apple refunds a purchase, the corresponding unused credits are revoked from your balance.</li>
        <li><strong>Free tier</strong> is a one-time taste — 1 free clip set per account, lifetime.</li>
      </ul>

      <h2>4. Service availability</h2>
      <p>We aim for 99% uptime but can't guarantee zero downtime. Apple, OpenAI, and our hosting providers can have outages. If processing fails for our reasons, we automatically refund the credit. If your YouTube link is invalid, the credit is consumed — please double-check before you submit.</p>

      <h2>5. Pricing changes</h2>
      <p>Existing subscribers keep their current price until the next renewal. New prices apply to new sign-ups. We'll notify you at least 7 days before a renewal price change.</p>

      <h2>6. Liability</h2>
      <p>To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid us in the last 90 days. We don't underwrite damages from how you use the clips you make — that's your call.</p>

      <h2>7. Changes to these terms</h2>
      <p>If we update these terms we'll show a notice in-app and on the website at least 14 days before they take effect. Continuing to use ClipForge after that means you accept the change.</p>

      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of Türkiye, without regard to conflict-of-laws principles. Disputes go to courts of Istanbul.</p>

      <h2>Contact</h2>
      <p>Bulsu Labs — <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> · <a href="https://bulsulabs.com">bulsulabs.com</a>.</p>
    </LegalShell>
  );
}
