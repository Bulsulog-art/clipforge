# TikTok profile: photo, name, bio, link, account type

All copy follows the house voice: human, no numbers, no claims, no hype, no emojis, no dashes, no exclamation marks.

## Profile photo

- File: `profile-photo-1080.png` (1080 x 1080 PNG, sRGB).
- Built from `web/public/dentvideo/icon.svg` (origin/main): the same teal gradient (#167269 to #0b4a48) and the cream
  tooth-and-play mark (#f7f1e7). Two changes for TikTok's circular crop: the gradient now fills the whole square (no
  rounded corners or hairline border, which a circle would cut off), and the mark is scaled down so it sits inside
  the circle with a margin.
- Check: `profile-photo-circle-preview.png` shows it cropped to a circle at 200, 96 and 48 pixels. The mark still reads
  at 48 px.
- Do not upload the wordmark (`logo.svg`); text is unreadable in a small circle.

## Name (display name)

**DentVideo**

Search finds the display name as well as the handle, so a short descriptive alternative is fine if you want it:
`DentVideo | Diş klinikleri` (26 characters). Recommendation: plain **DentVideo**; the bio carries the description.

## Bio (80 characters max)

**TR (use this), 79 characters:**

> Diş kliniklerine her pazartesi hasta bilgilendirme videoları. Siz onaylarsınız.

**EN alternative, 80 characters:**

> Patient-education videos for dental clinics, every Monday. You approve each one.

If the EN line is rejected for length (some counters differ), use this one (74 characters):

> Patient-education videos for dental clinics. Every Monday, with your logo.

Other TR candidates I counted and did not pick:
- "Diş kliniklerine her pazartesi kendi dillerinde hasta bilgilendirme videoları." (78): misses approval, the
  point that builds trust with dentists.
- "Kliniğinizin logosuyla hasta bilgilendirme videoları. Her pazartesi, onayınızla." (80): exactly at the limit.

No price, no "five", no "AI", no "ten languages": the bio is too short to hold the qualifiers those need.

## Website link

**Link to set:**
`https://dentvideo.com/tr?utm_source=tiktok&utm_medium=bio&utm_campaign=tr-launch`
(same UTM pattern as the Instagram kit in `docs/gtm/08-social-launch-kit.md`). The TR landing has the free logo
preview button and links to the ad checker.

**Is a Business account or a follower count needed?** Status: **unverified from an official source.**
TikTok's help site (support.tiktok.com) could not be fetched from this session (it does not resolve here, and a plain
curl gets an empty JavaScript shell). What third-party guides say, unverified: a Business account can add a clickable
website link in its bio with no follower minimum; a Personal account traditionally needs about a thousand followers;
some guides say the threshold was dropped or varies by region. They disagree, so the browser session must check it:

- After switching to Business (README step 7), open **Edit profile**. If a **Website** field is there, paste the link.
- If there is no Website field: leave it empty (no "link coming soon" text), turn the Email contact button on
  (`hello@dentvideo.com`), and have captions say "dentvideo.com" in words instead of "Bağlantı profilde".
  Re-check the field each week.
- The web profile editor may not show the Website field even when the app does. Check in the mobile app before
  concluding it is missing.

## Business or Personal account

**Recommendation: Business account.**

Why:
1. **We are a company posting about our own product.** TikTok's Community Guidelines (Regulated Goods, Services, and
   Commercial Activities, effective 24 September 2026, read from tiktok.com with curl) say that if you are "promoting
   your own business, product, or service" you "must clearly disclose it using the content disclosure setting". So
   every DentVideo post is commercial content whatever the account type. The general sound library's licence is for
   personal, non-commercial use (per secondary sources; unverified from TikTok's own help pages), so a Personal account
   would not make trending songs legitimately usable for us anyway. Choosing Personal to get the music would put the
   account in a grey zone for no real gain.
2. **The music limit costs us little.** On a Business account you get only the **Commercial Music Library**: no
   chart or trending songs, and you cannot duet or stitch videos whose sound is outside that library (secondary
   sources, unverified on TikTok's help site). Our masters are exported **without music** by design
   (RESEARCH section 4, KIT house rules), the sound is real clinic foley, the owner's own voice or the sample's
   narration. Where a bed helps, pick a Commercial Music Library track in the app. Trending audio is not the hook
   for an audience of dentists; recognition is.
3. **What Business adds that we need:** the Website field (see above), an Email contact button, the business
   category, analytics with traffic sources and follower data, and Business Suite tools. None of it costs money.

What we give up: trending songs and some sound-based trends, duets and stitches with non-commercial sounds, and
creator monetisation programmes (irrelevant).

Business category: pick a **software / apps / technology** category from TikTok's list. Do **not** pick a medical,
health or clinic category: we sell software, not a health service, and a health category invites the "restricted
medical services" rules (SETTINGS.md section 5).

You can switch back to Personal later from the same settings menu if this proves wrong; posts stay.
