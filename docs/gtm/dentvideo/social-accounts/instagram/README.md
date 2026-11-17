# DentVideo Instagram: account creation kit

Prepared on 2026-11-17 from clipforge `origin/main` @ 0a664cd. No account was created and nothing was
signed into. No money was spent and no paid tool was used.

## What is here

| Path | What |
|---|---|
| `handle-check/HANDLE-CHECK.md` | The candidate handles in order, the check result (**unknown; the plain fetch is unreliable**), and the `@demodisklinigi` warning |
| `handle-check/fetch-log.txt` | The raw curl results, with the control handles |
| `profile/avatar-1080.png` | Profile photo, 1080×1080 |
| `profile/avatar-circle-preview.png` | The photo cropped to a circle at 320, 110 and 40 px |
| `profile/PROFILE.md` | Name, bio (TR + EN, counted), category, links with UTMs, contact, Business vs Creator |
| `highlights/highlight-*-1080x1920.png` | 5 highlight covers |
| `highlights/HIGHLIGHTS.md` | Titles, covers, and what goes in each highlight |
| `grid/` | The 9 posts: carousel slides, 3 Reels with their covers, `grid-preview-day0.png`, `GRID-PLAN.md` (cover texts and captions) |
| `SETTINGS.md` | 2FA, contact, privacy, branded content, Meta Business Suite |
| `source-shots/` | The real screenshots and video frames everything was built from |
| `_build/` | HTML sources, fonts and `grid.py`, for re-rendering locally |

## Step-by-step creation script (person or browser agent)

Use a desktop browser for steps 1–5 and the Instagram phone app for steps 6–9: Reels, highlight covers
and the AI label are only fully available in the app. Have the hello@dentvideo.com inbox open.

1. **Sign up.** Go to https://www.instagram.com/accounts/emailsignup/ → "Sign up with email". Enter:
   - Email: `hello@dentvideo.com`
   - Full name: `DentVideo · Klinik videoları`
   - Username: try `dentvideo`, then `dentvideo.app`, `dentvideoapp`, `getdentvideo`,
     `dentvideo.official`, `dentvideo_app`, `dentvideohq`. Take the first one with a green tick.
   - Password: generate one and store it in the password manager.
   - Birthday: a founder's real date of birth (Instagram requires one; it is not shown).
   - **✓ Verify:** the code from the hello@ inbox is accepted, and the URL instagram.com/<handle>
     loads the new empty profile. Write down the handle you got.
2. **Secure it now** (SETTINGS.md › Security): authenticator-app 2FA, backup codes in the password
   manager, login alerts on.
   - **✓ Verify:** sign out and back in; it asks for the 6-digit app code.
3. **Switch to Business:** Settings → Account type and tools → Switch to professional → Business →
   category **Yazılım** → contact email only (`hello@dentvideo.com`), no phone, no address. Skip "Connect
   Facebook" for now.
   - **✓ Verify:** the profile shows "Yazılım" under the name and an "Email" button.
4. **Profile photo:** upload `profile/avatar-1080.png`.
   - **✓ Verify:** in the feed-size circle the tooth and play shape are centred and nothing is clipped.
5. **Bio and links** (copy from `profile/PROFILE.md`): the recommended TR bio, then the links "Önizleme"
   and "Reklam kontrolü" with the exact URLs.
   - **✓ Verify:** the bio shows with no "…more". Tap each link from a logged-out phone: dentvideo.com/tr
     and /tr/ad-checker open, and the URL still contains `utm_source=instagram`.
6. **Before posting the Reels:** open `instagram.com/demodisklinigi` while signed in. If it is a real
   account, **skip posts 02, 04 and 06** and tell the owner (see HANDLE-CHECK.md).
7. **Post 01 → 09** following `grid/GRID-PLAN.md`, about 10 minutes apart.
   - Carousels: upload the slides in number order and keep them **3:4 / original**. If the app forces
     4:5, choose "fit": the text sits in the centre and survives the crop.
   - Reels: upload the .mp4, Edit cover → camera roll → the matching `-cover-1080x1920.png`; profile grid
     crop centred. Add no music and no filters.
   - Advanced settings: **AI label ON** for 02, 04, 06 and 08. Allow remixing **OFF**. No location, no
     tags.
   - Paste the caption from GRID-PLAN.md word for word.
   - **✓ Verify after each post:** it appears in the grid, the cover matches its row in
     `grid-preview-day0.png`, and the Reels play with captions while muted.
8. **Highlights** (`highlights/HIGHLIGHTS.md`): post the Stories, create the 5 highlights in this order:
   Nasıl çalışır, Örnek videolar, Reklam kuralları, Fiyat, SSS. Set each cover from
   `highlights/`. Check the prices on dentvideo.com/tr before posting the Fiyat Story.
   - **✓ Verify:** five teal circles with centred icons and titles that are not cut off.
9. **Remaining settings:** go through the rest of `SETTINGS.md` (privacy, tags, hidden words, branded
   content off; Meta Business Suite only if a Facebook Page exists).
10. **Hand back to the owner:** the handle, the profile URL, and a screenshot of the finished profile
    (compare it with `grid/grid-preview-day0.png`). The site's `sameAs` can then include the URL.

## Final verification points

- [ ] The handle you got is recorded, and the profile URL loads while logged out.
- [ ] 2FA uses an authenticator app; the backup codes are stored outside chat and outside the repo.
- [ ] It is a Business account, category Software, email-only contact.
- [ ] Bio has no numbers, emojis, "best", "#1" or guarantees. The links carry the UTMs and resolve.
- [ ] 9 posts in the grid. Every sample-clinic image or video says it is a sample. AI label on 02/04/06/08.
- [ ] 5 highlights with the provided covers. Fiyat matches the live site.
- [ ] No payment method added, no boost, no Meta Verified, no followers bought, no mass follow or DM.

## Known gaps

- **Handle availability is unknown.** Instagram answers logged-out requests with a login wall or an error
  shell for every handle, including accounts that exist. The sign-up form is the only check.
- The `@demodisklinigi` handle on the sample end cards could not be checked (step 6).
- The app screenshots are the 540×960 landing images, slightly upscaled on the slides. They are fine on a
  phone. For sharper versions, re-capture them from the dev harness (`docs/gtm/08-social-launch-kit.md`)
  and rerun `_build/grid.py`.
- `docs/gtm/08-social-launch-kit.md` has a separate, older 12-Reel plan with a "checked twice" bio. This kit
  replaces it for Instagram Day 0 and follows the owner's newer no-numbers voice rule.
