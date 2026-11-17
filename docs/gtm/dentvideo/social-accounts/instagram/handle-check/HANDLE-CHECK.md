# Instagram handle check, 2026-11-17

## Result

**Unknown for every candidate. The plain fetch gave no usable signal.** The browser session must check each
handle in the sign-up form. That form is the only reliable check, because Instagram shows a red cross or a
green tick there as you type.

## Candidates, in order of preference

| # | Handle | Notes | Plain-fetch result |
|---|---|---|---|
| 1 | `dentvideo` | Same as the domain. First choice. | unverified |
| 2 | `dentvideo.app` | Reads as "the product", fits a web app. | unverified |
| 3 | `dentvideoapp` | The same without the dot, which is easier to say out loud. | unverified |
| 4 | `getdentvideo` | Common SaaS pattern. | unverified |
| 5 | `dentvideo.official` | Acceptable, but long. | unverified |
| 6 | `dentvideo_app` | Underscores are easy to mistype. | unverified |
| 7 | `dentvideohq` | Last resort. | unverified |

Not recommended: `dentvideo.tr`, `dentvideotr` (the account will serve US/UK and DE later too), and any
handle that looks like a clinic (`dentvideoklinik`, `dentvideo.dis`) or uses `dr`/`dentist` (it could
suggest a dentist runs it).

If none of 1 to 3 is free, take the first free one and note it. LinkedIn, the site's `sameAs` and the
TikTok handle should then match it where possible.

## How the check was done, and why it is unreliable

- Method: `curl https://www.instagram.com/<handle>/` with a desktop browser user agent, done twice with
  a 4-second gap between requests (raw log in `fetch-log.txt`). Controls: `instagram` and `natgeo`
  (known to exist) and `zz_surely_free_handle_x9q7k2` (almost certainly free).
- Instagram answered without a login in only two ways:
  - **302 to `/accounts/login/?...&is_from_rle`**. This is a login wall from rate limiting.
  - **200 with `pageID: httpErrorPage`**. This is a generic error shell.
- **The known accounts and the random handle got the same answers.** For example, `instagram` got
  302 in pass 1 and httpErrorPage in pass 2. The response depends on rate limiting, not on whether
  the account exists. Reliability for telling free from taken: **none**.
- One free web search for "instagram.com dentvideo" found no indexed account called `dentvideo`. That
  is weak evidence and does not show the handle is free. An account with no posts, or a private one,
  is often not indexed. The search also covers only accounts, not names Instagram has reserved.
- Nothing was signed into, and no paid tool or scraping service was used.

## Side finding: a made-up handle inside the sample videos

The end card of the Turkish sample videos (`web/public/dentvideo/samples/tr/*.mp4`, e.g.
`implant-asamalari.mp4` at about 28.8 s) shows **`@demodisklinigi`** under "Demo Diş Kliniği". The social
research rules (`docs/gtm/dentvideo/social/RESEARCH.md` §7) say: "No made-up handle (it could be a real
account)". Whether `@demodisklinigi` exists could not be checked, for the same reason as above.
**Before Reels 02/04/06 go out, open instagram.com/demodisklinigi in a signed-in browser.** If it is a
real account, do not post those Reels until the samples are re-rendered without a handle.
