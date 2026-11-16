# DentVideo profil kiti

Hepsi kopyala-yapıştır. Bilgiler 2026-11-16'da canlı siteyle (dentvideo.com, llms.txt) ve `web/src/lib/dentvid/pricing.ts` ile karşılaştırıldı. Mac oturumu bu metinleri `../RUNBOOK.md` §2-§3'e göre kullanır.

**Görseller (repoda):**
- Logo: `web/public/dentvideo/icon-512.png` (512x512 PNG).
- Ekran görüntüleri: `web/public/dentvideo/landing/<dil>/{week,review,setup,card}.webp`. WebP kabul edilmezse Mac'te `sips -s format png week.webp --out week.png`.
- LinkedIn kapak görseli: `banner.html` (bu klasörde). Tarayıcıda 1128x191 pencere ve 2x ölçekle açıp PNG ekran görüntüsü alın (2256x382). Örnek (Mac, Chrome kurulu): `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=linkedin-banner.png --window-size=1128,191 --force-device-scale-factor=2 banner.html`.

**Doğru bilgiler (hepsinde aynı kalsın):**
- Fiyat: Starter $49 / €49 / 1.490 TL, Practice $79 / €79 / 2.490 TL, aylık, vergi hariç; Group konum başına, iletişimle. İndirim, deneme, ücretsiz plan yok.
- Site 8 dilde (English, German, Spanish, French, Turkish, Japanese, Arabic, Polish); videolar 10 dilde (bunlara ek olarak Italian ve Portuguese).
- Kadın ya da erkek anlatıcı sesi; altyazı altına tek bir kapanış satırı, reklam kurallarına göre kontrol edilerek.
- Yardım merkezi: https://dentvideo.com/help.
- Web uygulaması; telefonda tarayıcıdan çalışır. **App Store / Google Play uygulaması henüz yok**: hiçbir yerde "iOS app" yazılmaz.
- Şirket: Bulsu Labs ("BLS AI AUTOMATION" DOO PODGORICA), Podgorica, Karadağ. İletişim: hello@dentvideo.com.
- Yorum, müşteri sayısı, "en iyi", "#1", garanti yok.

---

## 1. Google Search Console ve Bing (durum)

- **Search Console zaten doğrulanmış:** sitede `google-site-verification` meta etiketi var. Yapılacak tek şey: https://search.google.com/search-console adresinde, Google Ads'i açacağınız **aynı Google hesabıyla** dentvideo.com mülkünü görebildiğinizi kontrol etmek. Görmüyorsanız mülk başka bir hesapta açılmış demektir; o hesaptan **Ayarlar → Kullanıcılar ve izinler → Kullanıcı ekle** ile bu hesabı **Sahip** olarak ekleyin. Site haritası: `https://dentvideo.com/sitemap.xml` (Site haritaları bölümünde "Başarılı" görünmeli; yoksa gönderin).
- **Bing Webmaster Tools:** https://www.bing.com/webmasters → aynı Google hesabıyla giriş → **"Import from Google Search Console"** → dentvideo.com. (Bing, ChatGPT aramasını ve Copilot'u da besliyor.) Zaten ekliyse dokunmayın.

---

## 2. LinkedIn şirket sayfası

https://www.linkedin.com/company/setup/new/ → **Company** (Şirket)

| Alan | Değer |
|---|---|
| Name | DentVideo |
| LinkedIn public URL | linkedin.com/company/dentvideo (alınmışsa `dentvideo-app`, sonra bize bildirin) |
| Website | https://dentvideo.com |
| Industry | Software Development |
| Organization size | 2-10 employees |
| Organization type | Privately held |
| Logo | `web/public/dentvideo/icon-512.png` |
| Tagline | Patient-education videos for dental clinics. Five finished videos every Monday, made in ten languages. |
| Cover image | `banner.html`'den alınan PNG |
| Location | Podgorica, Montenegro |
| Founded | 2026 |
| Specialties | dental marketing, patient education, dental social media, healthcare video, dental practice software |

**About (Overview):**

> DentVideo is a web app for dental clinics. Every Monday it delivers five short patient-education videos, narrated and captioned in the clinic's language, with the clinic's logo and colors and a ready-to-post caption.
>
> Every script is checked by software for clinical accuracy and for the health-advertising rules of the clinic's country before the dentist sees it. It is a careful filter, not legal advice. Nothing is published without the dentist's approval, and the clinic posts from its own accounts.
>
> Clinics choose a female or male narrator and can add one closing line under their captions, checked against the same rules. On the Practice plan, the dentist's own phone recordings become captioned clips.
>
> Videos are made in ten languages. The website and help center (dentvideo.com/help) are in English, German, Spanish, French, Turkish, Japanese, Arabic and Polish. Plans start at $49 / €49 / 1.490 TL per month plus tax, cancel anytime.
>
> DentVideo is made by Bulsu Labs ("BLS AI AUTOMATION" DOO PODGORICA). Contact: hello@dentvideo.com

**Yapılmayacaklar:** sayfayı "Premium Company Page" ya da reklam kredisiyle büyütmek, ücretli deneme başlatmak, takipçi satın almak, kişileri toplu davet etmek, ilk gönderiyi onaysız paylaşmak.

---

## 3. Crunchbase

https://www.crunchbase.com → ücretsiz hesap (Sign up) → sağ üstte **"+" / "Add New Profile" → Organization**. (Menü adı değişmiş olabilir; ücretli "Crunchbase Pro" denemesini başlatmayın.)

| Alan | Değer |
|---|---|
| Name | DentVideo |
| Website | https://dentvideo.com |
| Short description | Patient-education videos for dental clinics, made weekly and software-checked for clinical accuracy and advertising rules. |
| Full description | (yukarıdaki LinkedIn "About" metni) |
| Categories / Industries | Dental, Health Care, SaaS, Video, Marketing, Artificial Intelligence |
| Headquarters | Podgorica, Montenegro |
| Founded | 2026 (DentVideo'nun çıkış yılı; ay/gün bilinmiyorsa boş bırakın, tahmin etmeyin) |
| Company type | For profit, Private |
| Employees | 1-10 |
| Contact email | hello@dentvideo.com |
| LinkedIn | (2. adımdaki LinkedIn sayfasının adresi) |
| Logo | `web/public/dentvideo/icon-512.png` |

Yatırım, gelir, müşteri sayısı ya da çalışan adı alanlarını **boş bırakın**.

---

**Bitince LinkedIn ve Crunchbase adreslerini bize gönderin.** Sitenin şirket bilgisine (`sameAs`) ekleriz; böylece Google ve yapay zekâ asistanları bu profilleri DentVideo ile eşleştirir.
