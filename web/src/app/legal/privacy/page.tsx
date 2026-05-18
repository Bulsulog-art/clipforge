import { LegalShell } from "../legal-page";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effective="May 2026">
      <p>
        ClipForge is operated by Bulsu Labs. This policy explains what we collect, why we collect it, and what we never do.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account</strong> — email (from Apple Sign In or Google), display name, avatar.</li>
        <li><strong>Source media</strong> — videos you upload or YouTube links you paste, and the rendered clips we produce from them.</li>
        <li><strong>Usage data</strong> — credit balance, plan tier, processing logs, and minimal analytics (page views, app opens). We use this only to operate and improve the service.</li>
        <li><strong>Device data</strong> — APNs push token (only if you grant notification permission), iOS version, locale.</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We <strong>never</strong> sell your data. There is no broker, no marketplace, no third-party data partner.</li>
        <li>We <strong>never</strong> use your uploaded videos to train models or share them with external services beyond the processing pipeline (OpenAI Whisper for transcription, Replicate for face swap if you opt in).</li>
        <li>We <strong>never</strong> read your camera roll, contacts, or messages.</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To run the clip pipeline: download → transcribe → score → render → store.</li>
        <li>To deliver subscription benefits and credit balances (via RevenueCat).</li>
        <li>To send push notifications about jobs you started.</li>
        <li>To respond when you write to us.</li>
      </ul>

      <h2>Sub-processors</h2>
      <p>We rely on a small set of trusted vendors. Each only sees what they need to do their job:</p>
      <ul>
        <li><strong>Supabase</strong> (Frankfurt, EU) — database, storage, auth.</li>
        <li><strong>OpenAI</strong> — Whisper transcription, GPT-4o-mini moment scoring (no training opt-out, you can pause processing anytime).</li>
        <li><strong>Replicate</strong> — face swap models (only when you start a face-swap job).</li>
        <li><strong>RevenueCat</strong> — subscription state and entitlement tracking.</li>
        <li><strong>Apple</strong> — App Store sign-in, push notifications.</li>
        <li><strong>Coolify-hosted VPS</strong> — render workers.</li>
      </ul>

      <h2>Retention</h2>
      <p>Free-tier rendered clips are kept for 30 days after creation, then automatically deleted. Plus subscribers' clips are kept while the subscription is active and for 90 days after cancellation.</p>

      <h2>Your rights</h2>
      <p>You can export, correct, or delete your account at any time. Email <a href="mailto:hello@clipforge.bulsulabs.xyz">hello@clipforge.bulsulabs.xyz</a> and we'll respond within 7 days. EU/UK residents get the rights described in GDPR Articles 15–22; we honour them globally.</p>

      <h2>Children</h2>
      <p>ClipForge is not intended for users under 13. We do not knowingly collect data from children.</p>

      <h2>Contact</h2>
      <p>Bulsu Labs — Berke Bulsu — <a href="mailto:hello@clipforge.bulsulabs.xyz">hello@clipforge.bulsulabs.xyz</a>.</p>
    </LegalShell>
  );
}
