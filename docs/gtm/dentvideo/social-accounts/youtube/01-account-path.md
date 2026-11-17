# Account path: Google account on hello@dentvideo.com, then a Brand Account channel

Checked on 2026-11-17 against Google's own help pages:
- Create a Google Account, "Use an existing email address": https://support.google.com/accounts/answer/27441
- Create a YouTube channel with a business or other name: https://support.google.com/youtube/answer/1646861
- Change channel owners and managers with a Brand Account: https://support.google.com/youtube/answer/4628007
- Feature access and phone verification: https://support.google.com/youtube/answer/9890437 and /answer/9891124

Screens and button labels change. If a label differs, follow the meaning, not the wording.

## Step 0. Does hello@dentvideo.com already have a Google Account?

`docs/gtm/dentvideo/profile/PROFIL-KITI.md` says Search Console for dentvideo.com is already verified and Google Ads
is planned on "the same Google account". Before signing up, open https://accounts.google.com/signin/recovery (or
https://www.google.com/accounts/ForgotPasswd) and type `hello@dentvideo.com`.

- **It finds an account:** do not create a new one. Sign in to it and go to Part B. Signup would only answer
  "This email address is already in use".
- **"Couldn't find your Google Account":** do Part A.

## Part A. Google Account on the existing address (no Gmail)

1. Open https://accounts.google.com/signup (or the sign-in page → **Create account**).
2. In the drop-down choose **For my personal use**. Google's help names this option for the existing-email path.
   (**For work or my business** leads into a Google Workspace sign-up, which is paid. Do not start a Workspace trial.)
   The account is still owned by the company address. Ownership is shared later through the Brand Account, not
   through this login.
3. First name `DentVideo`, last name empty (or `Team`). Next.
4. Birthday and gender: the real details of the person who will hold the login. Google uses the birthday for age
   checks; an invented date can lock the account later.
5. On the "Choose your Gmail address" screen click **Use your existing email** (wording can be "Use my current
   email address instead").
6. Type `hello@dentvideo.com` → **Next**.
7. Google sends a code to hello@dentvideo.com. Open that mailbox, copy the code, paste it → **Next**.
8. Create a strong password and store it in the company password manager.
9. **Phone number screen.** Google's help marks it as optional ("Optional: Add and verify a phone number"). Click
   **Skip** if the button is there. Google sometimes requires a phone at this step when its risk check flags the
   sign-up (new device, VPN, data-centre IP). There is no way around that screen; if it appears without Skip,
   use the owner's mobile number and note which number was used.
10. Recovery email: optional. Add the owner's personal address so the account can be recovered.
11. Review and accept the terms → the account exists.

**Verification point A:** https://myaccount.google.com opens, top right shows hello@dentvideo.com, and
**Personal info → Contact info → Email** shows hello@dentvideo.com with no Gmail address.

## Part B. The channel as a Brand Account

A channel created through the "business or other name" path lives in a Brand Account. That is what lets more
people own or manage it later without sharing the hello@ password.

1. Sign in to https://www.youtube.com with hello@dentvideo.com.
2. Open https://www.youtube.com/channel_switcher (avatar → **Settings** → **Add or manage your channel(s)** goes
   to the same page).
3. Click **Create a channel** / **Create a new channel**. Do **not** use the plain "Create channel" prompt that
   appears when you first click "Your channel", because that makes a personal channel tied to the login.
4. Name `DentVideo`. Handle: see `02-handle.md`. Picture: `images/profile-800x800.png`.
5. Tick the terms box → **Create**. Google's help: "This creates a new Brand Account."

**Verification point B:** https://myaccount.google.com/brandaccounts lists **DentVideo**. If the channel does not
appear there, it was created as a personal channel: stop and recreate it through the channel switcher.

## Part C. Shared ownership (when another person needs access)

1. https://myaccount.google.com/brandaccounts → **DentVideo** → **Manage permissions** → **Invite new users**.
2. Enter the person's Google login, pick **Owner** or **Manager** → **Invite** → **Done**. They accept by email.
   - Owner: everything, including who else has access.
   - Manager: can post and manage videos.
   - Communications manager: cannot use YouTube. Do not use this role here.
3. A new owner can make themself **Primary owner** only after being an owner for **seven days or more**.
   Google recommends at least one other owner besides the primary owner, so add a second owner early.
4. If the Primary owner option is missing, check that the channel is not using YouTube Studio's newer
   "channel permissions" (Studio → Settings → Permissions). Google says to opt out of channel permissions before
   changing the primary owner.

## Where a phone number can be required

| Moment | Required? |
|---|---|
| Google Account sign-up (Part A, step 9) | Optional per Google's help. Can be forced by a risk check. |
| Creating the Brand Account channel | No. |
| Uploading Shorts and normal videos up to fifteen minutes | No. |
| Intermediate features: custom thumbnails, videos over fifteen minutes, live streaming | Yes. YouTube sends a code by text or voice call. Google limits how many channels one number can verify (the help page says a number that already verified two channels must be replaced). |
| Advanced features (Content ID appeal, monetization) | Channel history, ID or video verification. Not needed for this plan. |
| Suspicious sign-in later | Google may ask for the recovery phone. |

Shorts do not use custom thumbnails (the cover is picked from a frame in the YouTube app), so the Shorts-first plan
runs without phone verification. Phone verification becomes necessary only when a long video with a custom thumbnail
is planned.

## Two-step verification

Turn it on after the first week (https://myaccount.google.com/signinoptions/two-step-verification) using an
authenticator app or a passkey on the owner's device. It needs a phone or security key, which is why it is
not part of the minutes-long setup.
