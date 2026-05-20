import { LegalShell } from "../legal/legal-page";

export const metadata = {
  title: "Support — ClipForge",
  description:
    "Get help with ClipForge — render issues, refunds, account deletion, billing, and contact.",
};

export default function SupportPage() {
  return (
    <LegalShell title="Support" effective="May 2026">
      <p>
        Need help? Email <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> and we will
        get back to you within 24 hours on weekdays, 48 hours on weekends.
      </p>

      <h2>Common questions</h2>

      <h2>My render failed — what do I do?</h2>
      <p>
        Open the project, tap <strong>Try again</strong>. If it fails twice in a row, the credit
        is refunded automatically. If you do not see the refund within 5 minutes, send the project
        ID (visible at the top of the failed job) to{" "}
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> and we will refund manually.
      </p>

      <h2>The YouTube link I pasted is not loading</h2>
      <p>Make sure the link is:</p>
      <ul>
        <li>Public (not unlisted, not private)</li>
        <li>Hosted on youtube.com, youtu.be, or tiktok.com (we only accept those)</li>
        <li>Under 60 minutes long</li>
        <li>Not region-restricted from EU/US</li>
      </ul>

      <h2>How do I cancel my Plus subscription?</h2>
      <p>
        Subscriptions are managed by Apple. Open <strong>Settings &rarr; [your name] &rarr;
        Subscriptions &rarr; ClipForge Plus</strong> on your iPhone and tap{" "}
        <em>Cancel Subscription</em>. We do not have access to your card; only Apple can change
        billing.
      </p>

      <h2>I want a refund</h2>
      <ul>
        <li>
          <strong>Subscription</strong> — request a refund directly from Apple at{" "}
          <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a> within 14 days
          (EU) or 90 days (US).
        </li>
        <li>
          <strong>Credit pack</strong> — credits already spent on a render cannot be refunded, but
          we will refund unspent credits if you email{" "}
          <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> within 7 days of purchase.
        </li>
      </ul>

      <h2>How do I delete my account?</h2>
      <p>
        Open the iOS app: <strong>Settings &rarr; Account &rarr; Delete Account</strong>. Deletion
        is permanent and removes every clip, project, and saved face image. You can also email{" "}
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> with the subject line{" "}
        <em>Delete my account</em> and we will do it within 7 days.
      </p>

      <h2>Where are my clips saved?</h2>
      <p>
        Rendered clips live in the ClipForge app. Tap any clip and use <strong>Save to
        Photos</strong> to copy it to your iOS camera roll. We never write to your camera roll
        without that tap.
      </p>

      <h2>Notifications are not arriving</h2>
      <p>
        Open iOS <strong>Settings &rarr; Notifications &rarr; ClipForge</strong> and confirm Allow
        Notifications is on. Then inside the app, go to <strong>Settings &rarr;
        Notifications</strong> and toggle <em>Render done</em>.
      </p>

      <h2>Privacy concerns or data export</h2>
      <p>
        See our <a href="/legal/privacy">Privacy Policy</a>. To export everything we have about
        you, email <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a>; we will send a ZIP
        within 7 days.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Email <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> with:
      </p>
      <ul>
        <li>What you were trying to do</li>
        <li>What happened instead</li>
        <li>The project ID if a render is involved (top of the project screen)</li>
        <li>iOS version and ClipForge app version (Settings &rarr; About)</li>
      </ul>
      <p>We read every email personally.</p>

      <h2>Bulsu Labs</h2>
      <p>
        ClipForge is built by Bulsu Labs. See more of our work at{" "}
        <a href="https://bulsulabs.com">bulsulabs.com</a>.
      </p>
    </LegalShell>
  );
}
