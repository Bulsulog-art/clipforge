# ClipForge 1.0.2 (build 7) — App Review notes

Paste the block below into **App Review Information → Notes** for version 1.0.2.

It does three jobs: it closes the 2.1 rejection explicitly, it steers the
reviewer to the path that works (upload, not a YouTube link), and it states
what the app does and does not collect — so nothing has to be guessed at.

---

## Notes (paste verbatim)

ClipForge turns one long video into short vertical clips with burned-in
captions, an auto-written hook and a generated thumbnail.

RESOLVES THE PREVIOUS REJECTION (Guideline 2.1 — face data)
The Face Swap feature has been removed from the app entirely in this version.
There is no face-image upload, no consent screen, no face storage bucket and no
third-party face model. The privacy policy's "Face data" section was removed
because there is no face data to describe. The app does not use the camera at
all — NSCameraUsageDescription has been deleted from Info.plist. The AI Avatar
feature was removed in the same pass for the same reason (it depended on the
same third-party provider).

HOW TO TEST (please use Upload, not a link)
1. Sign up with any email (no confirmation needed to proceed).
2. On the Studio tab tap the + button (or the button on the empty state) and
   choose "Upload your video". Pick any video from the photo library, 30
   seconds to 5 minutes, ideally with someone speaking.
3. Choose a niche and start. Rendering takes roughly 60-120 seconds.
4. The finished clips appear in the Clips tab: 1080x1920, captions burned in,
   thumbnail attached.

IMPORTANT — about the "Paste a link" option
YouTube actively blocks downloads originating from datacenter IP addresses, so
a YouTube link submitted from our servers may be refused by YouTube with a bot
challenge. This is a restriction imposed by YouTube, not a defect in the app.
When it happens the app does not fail silently: it tells the user plainly that
YouTube is blocking the download and to upload the file instead. Upload is the
primary, promoted path in the UI for exactly this reason, and it is the path we
ask you to test.

SUBSCRIPTIONS
Free: one clip set on signup, sources up to 5 minutes, watermark added.
Plus (auto-renewing, via RevenueCat):
  - clipforge_plus_weekly  — $5.99 / week  (10 credits weekly)
  - clipforge_plus_monthly — $14.99 / month (40 credits monthly)
  - clipforge_plus_yearly  — $59.99 / year  (500 credits)
Terms, price, renewal and cancellation are stated in-app on the paywall and
publicly at https://clipforge.bulsulabs.com/pricing

DATA
No account is required beyond an email sign-in. The microphone is requested
only if the user chooses to record a voice sample for their own voice clone.
Photo library access is used only to pick the video the user wants clipped.
Privacy: https://clipforge.bulsulabs.com/legal/privacy
Terms:   https://clipforge.bulsulabs.com/legal/terms

---

## What's New (paste into the 1.0.2 release notes)

**English**

- Upload is now the fastest way in: pick a video and we'll clip it.
- Clearer messages when a link can't be fetched, so you're never left guessing.
- Turkish and Spanish now cover the whole app, including plans and credits.
- A public pricing page at clipforge.bulsulabs.com/pricing.
- Removed features we no longer offer, and every claim that went with them.
- Faster, more reliable renders across the board.

**Türkçe**

- Artık en hızlı yol yükleme: videonu seç, klipleri biz çıkaralım.
- Bir bağlantı indirilemediğinde ne olduğunu açıkça söylüyoruz.
- Türkçe ve İspanyolca artık planlar ve krediler dahil tüm uygulamayı kapsıyor.
- clipforge.bulsulabs.com/pricing adresinde herkese açık fiyat sayfası.
- Artık sunmadığımız özellikler ve onlara dair tüm iddialar kaldırıldı.
- Genel olarak daha hızlı ve daha güvenilir render.
