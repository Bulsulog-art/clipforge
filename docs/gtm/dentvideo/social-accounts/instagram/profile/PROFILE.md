# Profile fields (copy and paste)

The character counts were measured. Instagram limits: Name 30, Bio 150.

## Profile photo

`profile/avatar-1080.png` (1080×1080 PNG). It is the DentVideo mark (the cream tooth with a play cut-out)
on the brand teal gradient (#167269 to #0b4a48), and the background fills the whole square. The tooth
takes up about 42 % of the width, so it stays readable in the feed circle (about 32 px) and keeps clear
margins when Instagram crops the photo to a circle. `profile/avatar-circle-preview.png` shows it at
320, 110 and 40 px.
Do not use `logo.svg` (the wordmark is unreadable when it is small) or `icon-512.png` (its rounded
corners would show inside the circle).

## Name field

| Option | Text | Chars |
|---|---|---|
| **TR (use now)** | `DentVideo · Klinik videoları` | 28 |
| EN (later) | `DentVideo · Patient videos` | 26 |

People can find the account by searching the Name field, which is why the second half is there.

## Bio

**TR, recommended** (136):

```
Diş klinikleri için hasta bilgilendirme videoları, her pazartesi. Hekim onaylamadan hiçbir şey paylaşılmaz. Buradaki klinikler örnektir.
```

TR, alternative without the "sample" line (140). Use it only if every grid post states "örnek klinik"
on the image, which this grid does:

```
Diş klinikleri için hasta bilgilendirme videoları, her pazartesi. Kliniğinizin dilinde, logosuyla. Hekim onaylamadan hiçbir şey paylaşılmaz.
```

**EN alternative** (136). Switch to it when US/UK outreach starts. Use one bio at a time.

```
Patient-education videos for dental clinics, every Monday. Nothing is posted until the dentist approves. Clinics shown here are samples.
```

Voice notes: no numbers, no "best", "AI-powered", "save time", emojis or hashtags. The "five videos" fact
and the prices stay out of the bio on purpose. They go in the "Fiyat" highlight and on the site.

## Category

**Yazılım** (Software). If Instagram only offers related labels, choose **Uygulama sayfası** (App Page) or
**Yazılım şirketi** (Software Company). Turn **"Display category on profile"** ON.
Do not choose anything medical (Diş hekimi, Sağlık/Medikal): the account is not a clinic and must not
look like one.

## Links (Edit profile → Links → Add external link)

All the links below return HTTP 200 (checked 2026-11-17), and the site stores `utm_*` on the first visit
(`AttributionCapture.tsx`). The campaign name `tr-launch` matches `08-social-launch-kit.md`.

| Order | Title | URL |
|---|---|---|
| 1 | `Önizleme` | `https://dentvideo.com/tr?utm_source=instagram&utm_medium=bio&utm_campaign=tr-launch` |
| 2 | `Reklam kontrolü` | `https://dentvideo.com/tr/ad-checker?utm_source=instagram&utm_medium=bio&utm_campaign=tr-launch&utm_content=ad-checker` |
| later (EN bio) | `Preview` | `https://dentvideo.com/?utm_source=instagram&utm_medium=bio&utm_campaign=en-launch` |

Links in post captions are not clickable. Captions say "bağlantı profilde".
Rule for Stories link stickers: `utm_medium=story` with the same campaign, plus `utm_content=<highlight id>`.

## Contact

- **Account type: Business** (Professional account → Business), not Creator.
  - DentVideo is a company that sells software, and a Business account is meant for that. The profile
    shows a category and a contact button, which a clinic owner expects.
  - It links to a Facebook Page and Meta Business Suite for an inbox and, if ever approved, ads. Paid
    promotion needs the owner's approval, so do not set it up now.
  - Business accounts get only Meta's commercial-use sound library. That is a feature, not a loss: a
    company account must not use licensed hits (RESEARCH.md §4).
  - Creator accounts are for people and their branded-content deals, which DentVideo does not do.
- **Contact options:** Email `hello@dentvideo.com` only. No phone, WhatsApp or address button. Nobody
  answers a phone, and an address in Podgorica would only confuse Turkish clinics.
- **Action button:** none. Do not use "Book now" or "Order": there is nothing to book.
