# DentVideo TikTok account: creation script

Prepared 2026-11-17. Nothing was created, signed up for or logged into. No money spent, no paid tools used.
Every value to type is in this folder. Steps marked **[V]** are verification points: stop and check before going on.
Steps marked **[PHONE]** are where TikTok may ask for a phone number.

## Files in this folder

| File | What it is |
|---|---|
| `README.md` | This script |
| `HANDLES.md` | Handle candidates and the availability check (**@dentvideo** looks free) |
| `check-handles.sh` | Re-runs the check with plain curl: `./check-handles.sh "dentvideo dentvideo.app"` |
| `PROFILE.md` | Display name, TR bio and EN alternative, website link, Business vs Personal |
| `profile-photo-1080.png` | Profile photo, 1080 x 1080, from the DentVideo mark |
| `profile-photo-circle-preview.png` | How it looks as a circle at 200, 96 and 48 px |
| `POSTS.md` | The first six posts, captions, hashtags, cover use, AI label rules and steps |
| `covers/01-...png` to `covers/06-...png` | Six 1080 x 1920 covers with TR text |
| `SETTINGS.md` | Security, privacy, comment filters, disclosure toggles, TikTok health rules |
| `_src/` | Source material copied from the repo (samples, logos, landing screenshots) and the checker result capture |

## Before you start (owner decisions, five minutes)

1. **Who holds the account.** One named person in the company, with a real date of birth (TikTok asks for it and
   uses it for age gating; it must be an adult's). The account belongs to the company; the password and
   authenticator live in the company password manager.
2. **Which phone number, if TikTok asks.** A company-controlled mobile number that will still be ours in years: not a
   staff member's personal number, not a virtual or VoIP number (TikTok often rejects these, and a lost number can
   lock the account). Decide this now so the browser session is not stuck halfway.
3. **A phone with the TikTok app.** Some steps (the switch to Business, possibly the Website field and the AI label
   toggle) may only exist in the mobile app. The browser session can do the rest.
4. **Access to hello@dentvideo.com** for the sign-up code.

## Step by step

### 1. Re-check the handle (1 minute)
Run `./check-handles.sh` or open `https://www.tiktok.com/@dentvideo` logged out.
**[V]** The page shows "Couldn't find this account". If an account now exists, use the next free handle in
HANDLES.md and tell the owner.

### 2. Sign up with email (3 minutes)
- Go to `https://www.tiktok.com/signup` → **Use phone or email** → **Sign up with email** (the tab may read
  "Email / Username").
- Birthday: the account holder's real date.
- Email: `hello@dentvideo.com`. Password: generate in the password manager, save it there first.
- Tick nothing optional (no marketing emails needed).
- **[V]** A six-digit code arrives at hello@dentvideo.com. Enter it. If no code arrives in five minutes, check spam,
  then request once more. Do not request repeatedly; it can trigger a cool-down.
- **[PHONE] #1:** TikTok may ask for a phone number or a puzzle CAPTCHA at this point, depending on device, network and
  risk signals (third-party reports, unverified). If it asks for a phone: use the number decided above, enter the SMS
  code. If the browser session cannot receive it, stop and hand over to the owner. Do not try another email or a
  different network to dodge it.

### 3. Skip the interest picker
TikTok may show "Choose your interests". Skip it or pick nothing; it only shapes the personal feed.

### 4. Set the username
TikTok proposes a random username. Change it to **dentvideo** (Profile → Edit profile → Username, or on the prompt
right after sign-up).
**[V]** A green tick appears next to the field. If it says the name is not available, try `dentvideo.app`, then
`dentvideo_app`, `getdentvideo`, `dentvideohq`, in that order. Note which one you got. The username can probably be
changed only once in thirty days (unverified), so get it right.

### 5. Turn on 2-step verification now, before anything else
SETTINGS.md section 1. Authenticator app plus email.
**[PHONE] #2:** if SMS is offered or required as one of the methods, use the company number.
**[V]** Log out and back in; TikTok asks for the second factor.

### 6. Profile photo, name, bio
- Edit profile → **Change photo** → upload `profile-photo-1080.png`. Use the full square, no zoom.
- **Name:** `DentVideo`
- **Bio:** `Diş kliniklerine her pazartesi hasta bilgilendirme videoları. Siz onaylarsınız.`
**[V]** View the profile logged out (or from another browser): the photo is centred in the circle and nothing is cut
off; the bio shows on one or two lines without an ellipsis.

### 7. Switch to a Business account (mobile app)
App: Profile → menu → **Settings and privacy** → **Account** → **Switch to Business Account** → Next.
- Category: a **software / apps / technology** category. Not health or medical (PROFILE.md explains why).
- Add the **Email** contact: hello@dentvideo.com.
**[V]** The profile shows an Email button and Settings now lists **Business Suite** (or "Business tools").
**[PHONE] #3:** TikTok may ask to confirm the account by SMS during the switch or when you open Business tools
(unverified). Same number.

### 8. Website link
Edit profile → **Website** → `https://dentvideo.com/tr?utm_source=tiktok&utm_medium=bio&utm_campaign=tr-launch` → Save.
**[V]** Logged out, the link shows under the bio and opens the TR landing. If there is **no Website field**, see
PROFILE.md: leave it, rely on the Email button, and write "dentvideo.com" in captions. Do not buy or fake followers
to unlock it.

### 9. Settings
Work through SETTINGS.md sections 2, 3, 4 and 6 (privacy, comment filters, disclosure, business tools).
**[V]** Comment keyword filter list saved; Downloads off; contacts sync off.

### 10. Do not post on day one
Leave the new account alone for a day: watch a few dental-team videos, follow nothing in bulk, no rapid edits. New
accounts that post and edit heavily on day one can get reviewed as spam (common advice, unverified).

### 11. First post (when the owner has approved its recording)
Follow POSTS.md, post 01. On the Post screen:
- Caption from POSTS.md, exactly (check Turkish characters survived the paste).
- Cover: `covers/01-pazartesi.png` (Edit cover → Upload, or put it as the first frame).
- **Disclose post content → Your brand**: on.
- **AI-generated content**: as listed for that post (off for 01, on for 03 and 05).
- Downloads off; Duet/Stitch as listed.
**[V]** After posting, open it logged out: the caption, "Promotional content" tag and (for 03 and 05) the AI label all
show. If TikTok flags the post as "ineligible for For You", read the reason in analytics before posting the next one.

Nothing is posted without the owner's approval of the recording and caption. The browser session prepares; the owner
says go.

## Where TikTok may ask for a phone number (summary)

1. At sign-up, if its risk checks want more than email (step 2).
2. For 2-step verification if SMS is one of the methods (step 5).
3. When switching to Business or opening business tools (step 7), unverified.
4. Later, if the account is flagged ("verify it's you") or to reset access without email.
5. TikTok Ads Manager or Business Center (not part of this setup; no ads).

## Open items for the owner

- **Checker gap:** dentvideo.com/tr/ad-checker marks "Hastalarımız çok memnun." as Uygun, while the page's own FAQ
  says patient satisfaction statements are restricted by the 2025 regulation. Post 02 leaves that sentence out until
  the rule is fixed. (Running the check sent the site's own anonymous "a check ran" event once; the text itself stayed
  in the browser.)
- **Handle on the samples:** the TR sample end cards show `@demodisklinigi`. Posts cut before the end card; a re-render
  without the handle would be cleaner.
- **Clinic names in the dev harness and landing screenshots** ("Gülümse Diş Kliniği, İzmir"; fixtures also list
  "Dentpark İzmir" and "Beyaz Diş Kliniği") may belong to real clinics. Record everything on the Örnek Diş Kliniği test
  account.
- **Unverified facts** (TikTok's help site, support.tiktok.com, could not be reached; three facts came only from
  third-party pages): whether the Website field needs Business status or a follower count; the exact name and place
  of the AI-content toggle on web and in the app; the Commercial Music Library limits for Business accounts. Check
  each in the app during the steps above.

## Sources read for this pack

- TikTok Community Guidelines, released 25 Aug 2026, effective 24 Sep 2026, fetched with curl from
  `https://www.tiktok.com/community-guidelines/en/integrity-authenticity`, `.../regulated-commercial-activities` and
  `.../fyf-standards`.
- TikTok Branded Content Policy, `https://www.tiktok.com/legal/page/global/bc-policy/en`, fetched with curl.
- TikTok profile pages for the handle check, fetched with curl.
- Repo (origin/main): `docs/gtm/dentvideo/social/RESEARCH.md`, `docs/gtm/dentvideo/profile/PROFIL-KITI.md`,
  `docs/gtm/08-social-launch-kit.md`, `web/public/dentvideo/{icon,logo,logo-dark}.svg`,
  `web/public/dentvideo/samples/tr/*`, `web/public/dentvideo/landing/tr/*`.
- Content kit: `social-kit/KIT.md` in the session scratchpad.
- Live site, viewed without logging in: `https://dentvideo.com/tr`, `https://dentvideo.com/tr/ad-checker`.
- Third-party guides via web search, used only where marked **unverified** (website link rule, AI toggle path, music
  library limits, phone at sign-up).
