# DentVideo support playbook (internal)

Who answers: whoever is on the `hello@dentvideo.com` mailbox (Hostinger). Every
DentVideo email is sent from `DentVideo <hello@dentvideo.com>` with
`reply_to: hello@dentvideo.com`, so a clinic's reply to any email (welcome,
"videos ready", payment problem, reminders) lands here. The in-app
**Settings → Help & contact** button opens a mail with the subject
`DentVideo help · <clinic name> · <clinic id>` (written in the app's language,
for example `DentVideo Hilfe · …`) and the clinic id in the body; the app
footer link opens one with the subject `DentVideo help`.

## How to work a message

1. **Find the clinic.** Copy the clinic id from the subject (a UUID) into the
   admin panel: `/dentvideo/admin/clinic/<id>`. No id? Search the admin by the
   sender's email.
2. **Check before you answer.** Admin → clinic: plan state, this week's videos
   (made / flagged / approved), emails sent (`dentvid_email_sends`), billing
   events. Admin → System for a delayed week run. Each question below says
   what to check first.
3. **Link the help center answer, in the clinic's language.** The help center
   is the single source for answers (see the next section). Send the link to
   the answer, then add the one or two sentences that are specific to this
   clinic. Don't paste answers from this page, from memory or from an old
   email: they go stale, the help center doesn't.
4. **Answer in the clinic's language** (the language in its profile; the
   message's language if they wrote in another one).
5. **Tone:** warm, short, plain. Sign with your first name and "DentVideo".
   No exclamation marks in a row, no emoji, no jargon ("pipeline", "job",
   "render"). Say "software-assisted check" / "you approve", the words the app
   and emails use.

## The help center is the single source

Every answer a clinic needs is on `dentvideo.com/help`, one anchor per answer,
in the eight site languages. The link to one answer, by the clinic's language:

| Clinic's language | Link to the answer `<id>` |
|---|---|
| English | `https://dentvideo.com/help#<id>` |
| German | `https://dentvideo.com/de/help#<id>` |
| Spanish | `https://dentvideo.com/es/help#<id>` |
| Turkish | `https://dentvideo.com/tr/help#<id>` |
| French | `https://dentvideo.com/fr/help#<id>` |
| Japanese | `https://dentvideo.com/ja/help#<id>` |
| Arabic | `https://dentvideo.com/ar/help#<id>` |
| Polish | `https://dentvideo.com/pl/help#<id>` |
| Italian, Portuguese | the English link (there is no help center in these languages yet; the emails do the same) |

For example, a German clinic asking how to cancel gets
`https://dentvideo.com/de/help#cancel`.

- Content: `web/src/content/help/<locale>.ts`. Anchors: `HELP_IDS` in
  `web/src/content/dentvideo-help-links.ts`.
- The app links the matching answer from settings fields, the record page,
  empty or delayed weeks, billing problems and the post sheet; the welcome,
  "videos ready", payment-problem and "not posted" emails link one too.
- **An answer is wrong or missing?** Fix the help center, in all eight
  languages (the tests require it), not this page. This page only says which
  answer to link and what to check first.
- `web/src/content/support-playbook.test.ts` checks that every answer linked
  here exists and that the short summaries below still match the help center.

## Rules (never break these)

- Never say a video is "legally approved", "compliant" or "guaranteed". The
  check is software-assisted; **the dentist approves** and has the final say.
- Never promise patients, results, rankings or reach.
- Never post on a clinic's behalf, and never ask for their social media
  passwords. DentVideo does not post; the clinic shares.
- Never take card details by email. Payments are handled by Dodo Payments
  (merchant of record). The clinic changes its card, cancels and downloads
  invoices itself in **Settings → Plan and billing → "Manage billing"**
  (self-serve billing has been live since 2026-11-17, when `DODO_API_KEY` was
  set in production). If that does not work for them, see question 8.
- Never quote a price from memory. Prices come from `web/src/lib/dentvid/pricing.ts`
  and the plan screen in the app; send the clinic to the plan screen.
- Don't promise a response time we cannot keep. "A person reads every
  message" is what the emails promise.
- A clinic asking to stop reminders: unsubscribe them (Admin), and confirm
  that account, payment and "videos ready" emails continue.
- Health data: if a clinic sends patient information or a recording showing
  a patient, don't forward it; answer from the admin panel and delete the
  attachment from the mailbox.

## Top questions: which answer to link

"In short" is for you, so you can pick the right answer and spot a
mismatch with what the clinic sees. Don't paste it; link the answer.

### 1. When do my first videos arrive?

- **Link:** `first-videos`. If this week's videos are missing later on:
  `no-videos-this-week`.
- **In short:** the first week is made right after payment and is usually
  ready within an hour. The Videos page updates by itself and we email when
  the videos are ready for review. After that, five new videos every Monday.
- *Check first:* Admin → clinic → first week job. If it is delayed or
  failed, say so honestly and give a new time only once it is running.

### 2. How do I approve a video?

- **Link:** `approve`.
- **In short:** Videos → "Watch and approve" → "Approve" (or "Decline").
  "Approve all" approves the ready ones in one tap and never includes videos
  that need a look. The "videos ready" email also has "Approve & share" next
  to each video. Approving only marks a video ready to post; we never post
  for them.

### 3. How do I post a video on Instagram, TikTok or Facebook?

- **Link:** `share`. For one app: `instagram`, `tiktok-shorts`, `facebook`;
  for their Google profile: `google-business`; for when to post:
  `posting-times`.
- **In short:** on an approved video, tap "Post it". On a phone, "Save video +
  copy caption" saves the video and copies the caption with hashtags; on a
  computer the video downloads. They post it from their own account, paste the
  caption, then tap "Mark as posted". If saving doesn't work on their device:
  "Download".

### 4. Is the content medically accurate? Is it allowed in my country?

- **Link:** `software-check`. When they ask who is liable: `responsibility`.
- **In short:** before they see a script, software checks it against
  health-advertising rules and mainstream clinical guidance; anything worth a
  second look is marked with the reason. It is an automated check, not legal
  advice, and the final say is theirs.

### 5. A video "needs a look". What do I do?

- **Link:** `needs-a-look`.
- **In short:** the reason is on the card, under "What to check before
  posting". If the video suits the clinic, they approve it; if not, they
  decline it with a short note. A marked video is never approved without them.

### 6. Can you change a video (wording, topic, our logo or colors)?

- **Link:** one video: `wrong-video`. Logo and color: `logo-colors`.
  Background photos: `background-photos`. Topics: `services`. Language or
  form of address: `language`. Voice: `narrator-voice`.
- **In short:** "Ask for a change" on the video's card remakes only that
  video, with the same checks, and they approve it again; up to 3 changes a
  week. If the changed version doesn't pass the checks, the current video
  stays. Settings changes (logo, color, services, language, voice) apply to
  the next videos.
- *Internal:* Admin → Requests (or the clinic's page) shows each change
  request, its note and status. A request that failed "technical" or "busy"
  also sent you an alert; the clinic's old video is untouched. If a clinic
  needs more than 3 a week, do it by hand rather than raising the cap for
  everyone (`DENTVID_MAX_CHANGES_PER_CLINIC_WEEK`).

### 7. I didn't get the email / the code doesn't arrive.

- **Link:** `sign-in`.
- **In short:** look in spam or promotions for mail from hello@dentvideo.com
  and mark it as not spam. A sign-in code works for 15 minutes; a new one can
  be requested on the sign-in screen. "Forgot your password?" is there too.
- *Check first:* Admin → Emails for a failed send to that clinic.

### 8. My payment failed / my videos are paused.

- **Link:** `payment-failed`. To change the card: `update-card`.
- **In short:** the videos stay in the library and can still be shared; only
  new weekly videos pause until a payment goes through. They tap "Update
  payment details", or change the card in Settings → Plan and billing →
  "Manage billing". They should not buy a new plan: that would charge them
  twice.
- *Check first:* Admin → clinic → billing events. If "Manage billing" fails
  for them (an error, or no button because no Dodo subscription is stored on
  the clinic), the app and the payment email promise a secure link. There is
  no admin button for that link yet, so pass it to Berke. Never ask for card
  details.

### 9. How do I cancel? Refunds? Where is my invoice? What happens to our videos?

- **Link:** `cancel`, `invoices`, `after-cancel`; for a full copy of their
  data: `export-data`.
- **In short:**
  - Cancel: Settings → Plan and billing → "Manage billing", or we do it for
    them. Plans are monthly with no minimum term; access runs to the end of
    the paid period. A started period isn't refunded in part unless the law
    requires it or the service failed (Refund Policy).
  - Invoices: under Settings → Plan and billing → "Manage billing". Dodo
    Payments issues them and also emails a receipt after every payment, so
    DentVideo never sends a second invoice. If "Manage billing" doesn't work
    for them, the fallback is that Dodo receipt email.
  - After the paid period: the library stays 90 days (emails 14 days and 1
    day before deletion); downloaded videos stay theirs to use.
- *Internal:* the 90 days count from the end of the paid period
  (`dentvid_clinics.plan_ended_at`); the deletion date is on the clinic's
  admin page and in the app. A clinic that asks for more time: choosing a plan
  again keeps everything; otherwise point them to Settings → Your data →
  "Download my data". The worker's daily retention job
  (`DENTVID_RETENTION_MODE`: `delete` by default, `dry-run`, `off`) never
  touches active, paused or trial clinics, keeps settings and the logo, and
  emails you the counts whenever it deletes anything.
- *If Settings shows an App Store card instead of "Manage billing",* the plan
  was bought in the iPhone app: Apple bills it, and the clinic changes or
  cancels it in the App Store. Neither we nor Dodo can.

### 10. Can I stop the reminder emails?

- **Link:** `reminder-emails`.
- **In short:** every reminder and monthly summary has an "Unsubscribe" link.
  Emails about the account, payments and ready videos keep arriving.
- *Do first:* unsubscribe them in Admin, then tell them in your own sentence
  that you have done it.

### 11. Can I suggest a topic?

- **Link:** `topics`.
- **In short:** "Suggest a topic for next week" on the Videos page or in
  Settings: one patient question or subject, up to 140 characters. Waiting
  suggestions are used first, up to three a week, when they fit the clinic's
  services and pass the checks. "Your suggestions" shows what became of each.
- *Internal:* Admin → Requests lists every suggestion with its status and
  reason. A suggestion about a service the clinic doesn't list is refused "not
  offered": suggest they add the service in Settings (`services`).

### 12. Do the videos have subtitles? (accessibility, YouTube, TikTok)

- **Link:** `captions`.
- **In short:** key points are on screen in every video. "Download subtitles
  (.srt)" in "Post it" gives the narrator's exact words, timed from the
  pauses (close, not exact to the word). Videos made before subtitle files
  existed, and clips from their own recordings, have no .srt file.

### Other answers to link

| Question | Answer |
|---|---|
| Starter or Practice, switching plans | `plans` |
| A second location, a group | `group` |
| Recording yourself (Practice) | `record` |
| The closing line was refused | `closing-line` |
| Using the videos on the website or in the waiting room | `other-uses` |
| Patient information, videos that show patients | `patient-data` |
| Data protection, the DPA | `privacy-dpa` |
| Deleting the account | `delete-account` |

## Escalate to Berke (owner) when

- a clinic disputes a charge or mentions a chargeback;
- a clinic says a published video caused a complaint from a patient, a
  chamber/association or a regulator;
- anything about personal data (access, deletion beyond Settings, a breach);
- the same failure (emails, week run, checkout) shows for more than one clinic;
- a clinic needs a secure billing link because "Manage billing" fails for
  them (question 8).

## Which email says what (for reference)

| Email | When | Unsubscribe | Main action |
|---|---|---|---|
| Code | sign-up | no (transactional) | enter the 6-digit code |
| Reset | password reset | no | choose a new password |
| Welcome | first payment | no | open the library |
| Videos ready | each week / each recording | no | review; per video "Approve & share"; "Approve all ready videos" |
| Payment failed / on hold | billing webhook | no | update the card |
| Start / sample / objections | unpaid clinic, day 0 / 1 / 3 | yes (one-click) | finish preview / choose a plan |
| Not posted | paying, nothing shared this week | yes | open this week's videos |
| Monthly | paying, once a month | yes | open the library |
| Library deletion notice | plan ended: 14 days and 1 day before the videos are deleted | no (about their data) | open the library / download |

Previews of every email in every language: `/dentvideo/dev/email?kind=<kind>&lang=<lang>`
(kinds in `web/src/lib/dentvid/email-samples.ts`).
