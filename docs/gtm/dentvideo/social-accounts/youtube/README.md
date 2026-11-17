# DentVideo YouTube channel: creation script

For a browser session on the owner's machine. About fifteen minutes if hello@dentvideo.com is reachable for the
sign-up code. Nothing here costs money. Do not start a Google Workspace trial, YouTube Premium, ads or any paid
promotion.

Prepared 2026-11-17. Google steps checked that day against support.google.com (sources in `01-account-path.md`).

## Files

| File | What it is |
|---|---|
| `01-account-path.md` | Google Account on hello@dentvideo.com without Gmail, the Brand Account channel, sharing ownership, where a phone is needed |
| `02-handle.md` | Handle candidates and the availability check |
| `04-channel-description.md` | Name, TR and EN description, links, contact, keywords, country |
| `05-upload-defaults.md` | Not made for kids, upload defaults, altered-content rule, watermark, first three playlists |
| `06-first-shorts.md` | The first six Shorts: material, shot timing, TR and EN titles, descriptions, pinned comments |
| `images/profile-800x800.png` | Profile picture (full-bleed square, YouTube crops it to a circle) |
| `images/profile-preview-circle.png` | What the circle crop looks like |
| `images/banner-2560x1440.png` | Channel banner, all text and logo inside the 1546 x 423 safe area |
| `images/banner-preview-safe-area.png` | The banner with the safe area and the desktop strip marked |
| `images/banner-preview-desktop.png`, `images/banner-preview-mobile.png` | The strips desktop and phone show |
| `images/watermark-150x150.png` | Video watermark, transparent PNG |
| `_work/` | Sources to re-render the images (SVG, HTML, brand fonts) |
| `_src/` | Copies of the brand sources read from origin/main (profile kit, research, logo SVGs) |

## Before you start

- [ ] You can open the hello@dentvideo.com mailbox (Google sends a code there).
- [ ] The owner's mobile phone is at hand, in case Google forces a phone at sign-up.
- [ ] The `images/` folder is on the machine running the browser.
- [ ] Use a normal home or office connection, not a VPN. VPNs and data-centre IPs make Google demand a phone.

## Script

### 1. Google Account (skip if one exists)

1. Go to https://accounts.google.com/signin/recovery, enter `hello@dentvideo.com`.
   - Account found → sign in with it, go to step 2.
   - Not found → https://accounts.google.com/signup → **For my personal use** → name `DentVideo` → real birthday
     of the login holder → **Use your existing email** → `hello@dentvideo.com` → enter the emailed code →
     password into the password manager → **Skip** the phone if offered → accept terms.

> **Verify:** https://myaccount.google.com shows hello@dentvideo.com, and no @gmail.com address was created.

### 2. Brand Account channel

1. https://www.youtube.com/channel_switcher → **Create a channel**.
2. Name `DentVideo`. Handle `dentvideoapp` (fallbacks `dentvideocom`, `dentvideohq`). Wait for the green tick.
3. Picture: `images/profile-800x800.png`. **Create**.

> **Verify:** https://myaccount.google.com/brandaccounts lists DentVideo. https://www.youtube.com/@dentvideoapp
> opens the new channel. If the Brand Accounts page is empty, the channel is personal: delete it and redo step 2.

### 3. Profile (YouTube Studio → Customization → Profile)

1. Banner: **Change** → `images/banner-2560x1440.png` → in the crop dialog keep the default crop (the whole
   frame); check that the desktop and mobile previews show the logo and both text lines in full → **Done**.
2. Picture: already set; if not, `images/profile-800x800.png`, crop to the full square.
3. Video watermark: `images/watermark-150x150.png`, display **End of video**.
4. Name `DentVideo`, handle as chosen, description: TR block from `04-channel-description.md`.
5. **Add language** → original Turkish, translation English → paste the EN name `DentVideo` and the EN block.
6. Links: the four rows from `04-channel-description.md`, dentvideo.com first.
7. Contact info: `hello@dentvideo.com`.
8. **Publish**.

> **Verify:** open the channel logged out (private window). Banner text not cut off on desktop and on a phone,
> profile mark whole inside the circle, description and the dentvideo.com link visible under the name.

### 4. Settings (YouTube Studio → Settings)

1. **Channel → Basic info:** Country **Montenegro**. Keywords from `04-channel-description.md`.
2. **Channel → Advanced settings:** **No, set this channel as not made for kids**.
3. **Upload defaults:** values from `05-upload-defaults.md` §2 (Private, Standard licence, Science & Technology,
   Turkish, comments held for review).
4. **Save**.

> **Verify:** Settings → Channel → Advanced shows "not made for kids". Upload defaults shows Private and Turkish.

### 5. Playlists (Content → Playlists → New playlist)

Create the three from `05-upload-defaults.md` §5, public.

> **Verify:** the Playlists tab of the channel lists all three.

### 6. Permissions (only when someone else needs access)

https://myaccount.google.com/brandaccounts → DentVideo → **Manage permissions** → invite as **Owner** or **Manager**.
Add a second owner early: a new owner can only become primary owner after seven days.

### 7. First Shorts

Follow `06-first-shorts.md`. For each upload: Details → title, description, playlist, **Altered content** per the
table, Related video, visibility **Private** → read once more → schedule.

> **Verify after the first upload:** it plays in the Shorts feed vertically. If Altered content was Yes, the
> expanded description shows the AI label. The pinned comment is pinned (comment menu → Pin).

## What was not done

- No account, channel or handle was created or reserved, and nobody logged in anywhere.
- Handle availability was checked logged-out with a plain fetch only (see `02-handle.md`).
- Phone requirements are as Google documents them. Google can still ask for a phone at sign-up when its risk check
  flags the attempt; that screen cannot be bypassed.
- The checker and app screens in the Shorts plan have to be recorded live; nothing was recorded or rendered.

## Report back

The final handle, the channel URL (`https://www.youtube.com/channel/UC...`), and who holds owner access. The URL goes
into the site's `sameAs` with the other profiles.
