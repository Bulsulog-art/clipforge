# DentVideo iPhone app: release checklist

Nothing ships until every box of its gate is ticked. Three gates, in order: TestFlight internal
(the owner and the team), TestFlight external (invited clinics), App Store submission. Each gate
includes the ones before it. Setup steps (secrets, App Store Connect, demo account) are in
`docs/APP_STORE_DENTVIDEO.md`; what the app is and why, in `docs/IOS_APP_PLAN.md`.

Write the result of each gate (date, build number, who checked, the CI run link) in the PR or
the release issue. A box that cannot be ticked is a stop, not a note.

## What the automated checks cover (and what they cannot)

| Check | Where | Covers |
|---|---|---|
| Core unit tests | `ios/DentVideo/Core`, `swift test` (CI job `build-and-test`) | API client incl. 401 refresh, revoked sessions, 429, 5xx, timeouts, malformed JSON; week logic; post texts; deep links; strings complete in 8 languages, no price or purchase wording |
| App build, Debug + Release | CI job `build-and-test` | compiles with strict concurrency; **the Release binary is checked to contain no demo data** |
| App unit tests | `ios/DentVideo/Tests/Unit` (CI job `tests`) | AppModel: optimistic approve/decline/posted with rollback, approve-all partial answers, offline, gone session, error sentences, plan states, links and notification payloads |
| End-to-end UI journeys | `ios/DentVideo/Tests/UI` (CI job `tests`) | every journey against the in-process fake API: sign-in (ok, wrong password, other product, forgot), expired and revoked session, no plan, paused, week states, approve/decline/undo, approve all, post sheet (Photos allowed/denied, share sheet), record (camera allowed/denied, upload ok/failed/retry/remove, resume after the app was closed), settings save, validation and server refusal, account deletion confirm/cancel, sign out, offline start with the saved week, deep links, 8 languages, right to left, largest text size, 44 pt targets; a crash fails the test |
| Devices in CI | CI job `tests` | iPhone 17 Pro Max and iPad Pro 13" on iOS 26, iPhone SE (3rd generation) on iOS 17 |
| Screenshots of every screen | CI job `screens` | all screens and states, 8 languages, light/dark, AX5, iPad, for a human to look at |

Not covered by CI, because a simulator cannot do it: the real camera and microphone, real APNs
pushes, the real Photos library on a device, Instagram and TikTok being installed, a real
background upload over a mobile network, the production server and its data, signing. Those
are the manual steps below.

Run the CI checks: GitHub → Actions → "iOS DentVideo" → Run workflow on the release branch
(screens `full`, tests on). All jobs green, the run link in the release note.

---

## Gate 1: before TestFlight internal

Automated

- [ ] "iOS DentVideo" run on the exact commit: `build-and-test`, all three `tests` legs and
      `screens` green. No test retried into a pass more than once (look at `test.log`; a flaky
      test is fixed, not ignored).
- [ ] Core localisation test green (8 languages complete, no purchase wording).
- [ ] Release binary check green ("Release build has no demo data").
- [ ] Screenshots of this run looked at by a person: every screen in English light and dark,
      Arabic, German and Japanese key screens, AX5, iPad. Nothing clipped, overlapping,
      untranslated or misaligned.

Server

- [ ] Web deployed with the mobile API (`/api/dentvideo/mobile/v1/*`) and its tests green.
- [ ] `supabase/liman/0023_dentvid_devices.sql` applied; its check queries pass.
- [ ] APNs variables set on the web app (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8`,
      `DENTVID_APNS_BUNDLE_ID`).
- [ ] `https://dentvideo.com/.well-known/apple-app-site-association` answers the DentVideo app id
      for `/app` and `/app/*` with `application/json`.

Build

- [ ] Version (`CFBundleShortVersionString`) raised in `ios/DentVideo/project.yml` if this is a
      new version.
- [ ] The owner (not an agent) runs "iOS DentVideo release (TestFlight)". It finishes green and
      the build shows in App Store Connect → TestFlight after processing.
- [ ] Export compliance does not ask (the app declares no non-exempt encryption).

## Gate 2: before external testers (invited clinics)

Everything in gate 1, plus a full manual pass on a **real iPhone** with the TestFlight build,
signed in with the demo clinic (`docs/APP_STORE_DENTVIDEO.md` §1.5) and then with one real clinic
that agreed to test. Use the newest iOS on one phone and, if available, iOS 17 on an older or
small phone (SE or mini).

### Manual test script (real device, about 30 minutes)

Write "ok" or what happened next to each step.

1. **Install and first start.** Install from TestFlight. Open: the sign-in screen shows, no
   crash, no prices, no "subscribe" anywhere.
2. **Wrong password.** Sign in with a wrong password: the sentence says email and password do
   not match. No crash, the keyboard can be dismissed.
3. **Forgot password.** "Forgot your password?" → Send link: the email arrives; the link opens
   dentvideo.com/reset; a new password works in the app.
4. **Sign in.** Correct password: the notification explanation appears once; tap "Allow
   notifications", then allow in the iOS prompt.
5. **This week.** The week, clinic name, progress, cards with pictures. Pull down to refresh.
   Scroll fast: no stutter, posters do not flicker.
6. **Watch.** Open a ready video: the poster shows, then the video plays with sound, also with
   the silent switch on. Full screen works. Back.
7. **Needs a look.** Open a flagged video: the note is in the app's language and readable.
8. **Approve.** Approve: a light tap is felt, the state changes to Approved, "Post this video"
   appears. Undo works. Approve again.
9. **Decline.** Decline another with a note; check on dentvideo.com (web app) that the note and
   the decision arrived. Undo.
10. **Approve all.** On a week with several ready videos: "Approve all ready (n)" → confirm →
    the notice says how many; flagged videos stay undecided.
11. **Post to Instagram.** On an approved video: Post this video → Save video and copy text →
    allow Photos (add only). "Saved to Photos. Text copied." Tap "Open Instagram": Instagram
    opens (on the new post with the video where Instagram supports it, otherwise at its home);
    create a Reel with the newest video, paste the caption: the text and hashtags are complete.
    Do not publish unless it is the clinic's own test account.
12. **Post to TikTok.** Same with "TikTok & Shorts" and "Open TikTok": TikTok opens; paste: the
    short text with three hashtags.
13. **Photos refused.** iOS Settings → DentVideo → Photos → None. Post again: the sentence
    explains, "More apps…" still offers Save Video. Set Photos back.
14. **Posted tick.** Tick "Posted on our accounts": the card says Posted; the web shows it too.
15. **Reminders.** Settings → Posting reminders on, "at each video's suggested time". Change one
    approved video's time to a few minutes ahead if possible (or use a custom time): the
    reminder arrives; tapping it opens that video.
16. **Push.** Owner triggers the week-ready notice for the demo clinic
    (`POST /api/internal/dentvideo/notify`, `docs/APP_STORE_DENTVIDEO.md` §8). The push arrives
    with the app closed and with it open (banner); tapping opens the week. Turn "Week is ready"
    off in Settings and trigger again: no push (the email still comes).
17. **Universal link.** From the "your week is ready" email (or Notes), tap a
    `https://dentvideo.com/app` link: the app opens (not Safari) on the week.
18. **Record.** Record tab → Record with this card → allow camera and microphone. The card is
    readable while recording, hide/show works, the front/back switch works. Record 20 seconds,
    watch the take (picture upright, sound in sync), "Use this take".
19. **Background upload.** Record a 2-minute take on mobile data, "Use this take", then lock the
    phone immediately for 3 minutes. Unlock: the upload finished (or continues) and the clip
    reaches "We're editing your clip"; it appears on the web.
20. **Upload interrupted.** Start another upload, turn on airplane mode: it says interrupted;
    turn it off, Try again: it completes.
21. **Camera refused.** iOS Settings → DentVideo → Camera off: Record shows the explanation and
    "Open Settings" goes to the right page.
22. **Settings.** Change the city and the closing line, Save: "Saved". Check on the web. Try a
    closing line the market rules refuse: the server's sentence shows, nothing is saved.
23. **Offline.** Airplane mode, close the app fully, open it: the saved week shows with the
    offline note; approved videos play from the phone; approving says "No connection".
24. **Languages.** iOS Settings → DentVideo → Language: German, Arabic (right to left), Japanese:
    the app follows; videos keep the clinic's video language. Back to the phone's language.
25. **Largest text.** iOS Settings → Accessibility → Display & Text Size → Larger Text → the
    largest size: every screen is usable, buttons reachable, nothing cut off.
26. **VoiceOver.** Turn VoiceOver on: the week, a video, Approve and Post can be done by ear;
    every button says what it does; the order follows the screen.
27. **Dark mode.** Switch to dark: every screen readable, no white flashes.
28. **Sign out.** Settings → Sign out → confirm: back to sign-in; signing in again works and no
    previous clinic data shows before it.
29. **Delete account** (only on a throwaway test account): Settings → Delete account → the
    button stays off until the clinic name is typed; Cancel works; delete → signed out; the
    account is gone on the web.

### Crash-free and stability

- [ ] No crash in the manual pass. App Store Connect → TestFlight → Crashes: zero for this build
      after the internal testers' use (at least 3 days or 20 sessions, whichever is later).
- [ ] Xcode Organizer → Crashes and Energy: nothing for this build.
- [ ] TestFlight feedback read and answered; every reproducible defect has a fix or an issue.

### External test group

- [ ] Beta App Review information filled in (contact, demo account, the notes from
      `docs/APP_STORE_DENTVIDEO.md` §2); "What to Test" written.
- [ ] Testers are clinics that already have a DentVideo account and agreed to test. No public
      link.

## Gate 3: before App Store submission

Everything in gates 1 and 2, plus:

- [ ] External testers used the build for at least a week (one Monday delivery cycle), crash-free
      users 100% in App Store Connect, no open blocking feedback.
- [ ] The build submitted is the build that passed gate 2 (same build number), or a new build
      that passed gates 1 and 2 again.
- [ ] Demo account checked the day before: signs in, active plan, a ready week with at least one
      ready and one "needs a look" video, recording included.
- [ ] Metadata in eight languages from `docs/APP_STORE_DENTVIDEO.md` §3; no "best", "#1",
      prices or outcome claims; Support, Marketing and Privacy URLs open.
- [ ] Screenshots: the set generated from the final CI run (`scripts/appstore_shots.py`), iPhone
      6.9" in eight languages and iPad 13" in English, each looked at; demo clinic only.
- [ ] App Privacy answers match `PrivacyInfo.xcprivacy` and §5 of the App Store doc; the privacy
      policy mentions the push token.
- [ ] Age rating questionnaire answered as in §4.
- [ ] Pricing Free, no in-app purchases created, availability set.
- [ ] Review notes pasted (§2), including the 3.1.3(c) explanation.
- [ ] "Manually release this version" selected, so the owner decides the moment after approval.

After approval

- [ ] Install from the App Store on a clean phone, sign in, open a video, post one test video to
      the clinic's own test account. Then release.
- [ ] Watch App Store Connect crashes and the support inbox daily for the first week.
