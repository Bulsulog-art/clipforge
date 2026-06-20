import { LegalShell } from "../legal-page";

export const metadata = { title: "Privacy Policy — ClipForge" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effective="June 2026">
      <p>
        ClipForge is operated by Bulsu Labs (&quot;we&quot;, &quot;us&quot;). This policy explains exactly what we
        collect, why we collect it, who can see it, and what we never do. We wrote this in plain
        English on purpose. If anything is unclear, write to{" "}
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> and we will explain.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account</strong> — your email address (used to sign in and to send transactional
          emails), an opaque user ID assigned by our auth provider, and an optional display name.
        </li>
        <li>
          <strong>Source media</strong> — the YouTube or TikTok URLs you paste, or videos you upload
          directly. We store the source temporarily so the render pipeline can process it, and we
          store the rendered clips so you can re-download them from the app.
        </li>
        <li>
          <strong>Usage data</strong> — your credit balance, plan tier, render job history, error
          logs, and crash diagnostics. We use this only to keep the service running and to
          troubleshoot when something goes wrong.
        </li>
        <li>
          <strong>Device data</strong> — APNs push token (only if you grant notification
          permission), iOS version, and locale. This is used to deliver &quot;your clips are ready&quot;
          notifications.
        </li>
        <li>
          <strong>Purchase history</strong> — which products you purchased via Apple In-App
          Purchase, tracked through Apple&apos;s subscription system and RevenueCat. We do not see your
          credit card.
        </li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>
          We <strong>never</strong> sell your data. There is no broker, no marketplace, no
          third-party data partner. ClipForge has zero advertising revenue.
        </li>
        <li>
          We <strong>never</strong> use your uploaded videos to train AI models. Your content is
          yours.
        </li>
        <li>
          We <strong>never</strong> read your camera roll, contacts, photo metadata, location, or
          messages. We do not request those permissions.
        </li>
        <li>
          We <strong>never</strong> track you across other apps or websites. We do not use the IDFA.
        </li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To run the clip pipeline: download &rarr; transcribe &rarr; score &rarr; render &rarr; store.</li>
        <li>To deliver subscription benefits and update your credit balance.</li>
        <li>To send push notifications about jobs you started (only if you opted in).</li>
        <li>To respond when you contact us at <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a>.</li>
        <li>To detect abuse and fraud (e.g. someone trying to re-use a refunded purchase).</li>
      </ul>

      <h2>Face data</h2>
      <p>
        ClipForge includes one optional feature — <strong>Face Swap</strong> — that processes face
        data. This section explains exactly how it works, because face data is sensitive and we treat
        it that way.
      </p>
      <ul>
        <li>
          <strong>What we collect.</strong> Face data is collected only when <em>you</em> tap
          &quot;Face swap&quot; and pick a portrait photo from your library. The photo is a still image
          you choose; we do not scan, capture, or access your camera or photo library in the
          background, and we never collect face data automatically.
        </li>
        <li>
          <strong>How we use it.</strong> The photo is used for one purpose only: to render the
          face-swapped version of <em>your own</em> clip that you requested. We do
          <strong> not</strong> create a faceprint or biometric template, do <strong>not</strong> use
          it to identify or recognise any person, do <strong>not</strong> match it against any other
          image or database, do <strong>not</strong> use it for advertising or analytics, and do
          <strong> not</strong> use it to train any AI model.
        </li>
        <li>
          <strong>Retention — we do not retain your face data.</strong> ClipForge does not retain your
          face data. The uploaded photo is deleted from our storage automatically as soon as the swap
          is generated — typically within a few minutes — and we do not keep it afterward. We never
          create or store a faceprint, biometric template, or any data derived from your face. If a
          swap never completes, the image is deleted when you delete your account (Settings &rarr;
          Account &rarr; Delete Account) or sooner on request to{" "}
          <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a>.
        </li>
        <li>
          <strong>Where it is temporarily stored.</strong> During the few minutes it takes to render,
          the photo is held encrypted at rest in our Supabase object storage (EU region), protected by
          row-level security keyed to your account so no other user can access it. The resulting
          swapped video is treated like any other rendered clip.
        </li>
        <li>
          <strong>Third parties we share face data with.</strong> We share your face photo with
          exactly one third party: <strong>FAL.ai</strong> (fal.ai), an AI model-hosting provider. We
          share face data with no one else, and we never sell it.
        </li>
        <li>
          <strong>Why we share it.</strong> Solely so that FAL.ai can run the face-swap model and
          generate the video you requested. FAL.ai cannot perform the swap without the image; we share
          it for this single purpose and no other.
        </li>
        <li>
          <strong>Does FAL.ai store face data?</strong> FAL.ai receives the image through a temporary
          signed link that expires after one hour (we do not upload it to FAL.ai&apos;s storage
          ourselves). To operate, debug and secure its service, FAL.ai may temporarily retain request
          inputs — including the image — for up to 30 days, after which they are deleted; FAL.ai uses
          the image only to process the requested job and for no other purpose. FAL.ai&apos;s data
          practices are described in its{" "}
          <a href="https://fal.ai/privacy">Privacy Policy</a> and{" "}
          <a href="https://fal.ai/legal/terms-of-service">Terms of Service</a>.
        </li>
        <li>
          <strong>Your responsibility.</strong> The first time you use Face Swap you confirm that the
          face is your own or that you have explicit consent from the person pictured. Using Face Swap
          to impersonate, harass, defame, or deceive is prohibited and may result in account
          suspension.
        </li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        We rely on a small set of trusted vendors. Each only sees the data they need to do their
        job, and each is bound by a data-processing agreement compatible with GDPR.
      </p>
      <ul>
        <li><strong>Supabase</strong> (EU region) — Postgres database, object storage, authentication.</li>
        <li><strong>OpenAI</strong> — Whisper for speech-to-text and GPT-4o-mini for moment scoring. OpenAI&apos;s API policy excludes input/output from training by default.</li>
        <li><strong>FAL.ai</strong> — face-swap and lipsync models, used only when you start a face-swap or avatar job.</li>
        <li><strong>RevenueCat</strong> — subscription state, entitlement, and webhook handling.</li>
        <li><strong>Apple</strong> — App Store sign-in (if used), App Store In-App Purchase, and APNs.</li>
        <li><strong>Sentry</strong> — crash and error reporting (no PII, IPs are anonymized).</li>
        <li><strong>Coolify-managed VPS in Europe</strong> — application hosting and render workers.</li>
      </ul>

      <h2>Data retention</h2>
      <ul>
        <li>Source videos are deleted within 24 hours of the render finishing.</li>
        <li>Uploaded face photos (Face Swap) are deleted automatically as soon as the swap is generated — see <strong>Face data</strong> above.</li>
        <li>Rendered clips are kept while your account is active so you can re-download them.</li>
        <li>Account data (email, profile, purchase history) is kept until you delete the account.</li>
        <li>Crash/error logs are kept for 90 days then purged.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can <strong>export</strong> your account data or <strong>delete your account</strong> at
        any time from <em>Settings &rarr; Account &rarr; Delete Account</em>, or by emailing{" "}
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a>. Deletion is permanent and cascades
        across every service listed above; we will confirm by email within 7 days.
      </p>
      <p>
        EU/UK residents have the additional rights described in GDPR Articles 15–22 (access,
        rectification, erasure, restriction, portability, objection). We honour these globally,
        regardless of where you live.
      </p>

      <h2>Children</h2>
      <p>
        ClipForge is rated <strong>4+</strong> on the App Store but is not designed for children
        under 13 and is not directed to them. We do not knowingly collect data from anyone under 13;
        if you believe a child has signed up, write to{" "}
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a> and we will remove the account.
      </p>

      <h2>Security</h2>
      <p>
        All traffic is TLS 1.2+. Database access requires service-role credentials kept in
        environment-variable secrets. Storage objects are protected by row-level security keyed to
        the user&apos;s UUID. OAuth tokens for social-publishing integrations are encrypted at rest with
        AES-256-GCM. We do not store credit-card numbers — payments are handled by Apple.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we materially change what we collect or who has access to it, we will notify you in-app
        before the change takes effect. Minor wording fixes will not trigger a notice.
      </p>

      <h2>Contact</h2>
      <p>
        Bulsu Labs · ClipForge<br />
        <a href="mailto:info@bulsulabs.com">info@bulsulabs.com</a><br />
        <a href="https://bulsulabs.com">bulsulabs.com</a>
      </p>
    </LegalShell>
  );
}
