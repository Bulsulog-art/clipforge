# TikTok handle check

Checked 2026-11-17 at 21:48 UTC with a plain `curl` of `https://www.tiktok.com/@<handle>` (no login, no paid tool).
Re-run any time with `./check-handles.sh "dentvideo dentvideo.app"`.

## Result, in order of preference

| # | Handle | Result | Notes |
|---|---|---|---|
| 1 | **@dentvideo** | No account found, probably free | First choice. Matches the domain and the brand name exactly. |
| 2 | @dentvideo.app | No account found, probably free | Fallback if 1 is refused at sign-up. |
| 3 | @dentvideo_app | No account found, probably free | |
| 4 | @getdentvideo | No account found, probably free | |
| 5 | @dentvideohq | No account found, probably free | |
| (not recommended) | @dentvideo.tr / @dentvideotr | No account found | The kit runs one account in mixed languages (TR first, then EN and DE), so no market suffix. |
| (not recommended) | @dentvideo.official | No account found | "official" adds nothing and reads like an impersonation guard. |

Also checked:
- **@dentvideos (plural) is TAKEN**: a public account, display name "DentVideos", one video, no bio, not verified.
  It has no visible link to us. It is close enough to confuse people, so say "dentvideo, without an s" when you
  spell the handle out loud. Do not contact or report it unless it starts copying our brand.
- **@dentvid**, **@dent.video**, **@dentvideo_**: no account found.
- **@demodisklinigi**: no account found on TikTok. This handle is burned into the end card of the TR sample videos (see
  POSTS.md, "Two things to fix before posting").

## How reliable this check is

Medium to high for "taken", medium for "free".

- **What was measured.** TikTok's profile page embeds a status code. A known account (`@tiktok`) returns
  `statusCode 0` with its `uniqueId`; a nonsense name (`@zzqqxxnotarealuser8812`) returns `statusCode 10221`
  ("Couldn't find this account"). Two small real accounts were also detected correctly (`@dentist` and `@dental`,
  each with around two hundred followers, and `@dentvideos` with a handful), so the check is not limited to famous
  accounts.
- **Why "free" is not certain.** `10221` also comes back for accounts that are banned, deactivated (TikTok keeps a
  deactivated account's name for about thirty days), set aside by TikTok, or blocked by its username filter. A private
  account would still show as existing, so private accounts are not a blind spot.
- **The final word is the sign-up form.** In the username field TikTok shows a green tick or "This username isn't
  available" as you type. That is the verification point in README step 4.

Handle rules, from memory and **unverified** (TikTok's help site was not reachable from here): letters, numbers,
underscores and periods; no period at the end; up to 24 characters; a username can be changed only once every
thirty days. The form enforces whatever the current rules are, so pick carefully and trust the form.
