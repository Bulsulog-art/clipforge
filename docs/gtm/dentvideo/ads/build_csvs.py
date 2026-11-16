#!/usr/bin/env python3
"""Builds the Google Ads Editor import CSVs for DentVideo (month 1).

Source of truth for every campaign, ad group, keyword, negative, RSA and asset.
Edit here, re-run, then re-run validate.py. Output: UTF-8 with BOM, comma-separated.

The red-team fixes of 2026-11-15 (redteam/fixes-log.txt, 87 edits: keywords H3, software-qualified
"geprüft/denetlenir" H5, no Canva/ChatGPT M1, no "küçük kısmı" M2, no price in checker ads M3,
interim /tr and /de landing pages instead of /videos/* B1, 32 campaign negatives) are ported here:
re-running this script reproduces the reviewed CSVs byte for byte. Changed after that (finalize, 2026-11-15):
budgets TR $5 / DE $9 (red team M7) and the last five unqualified "geprüft / kontrol edilmiş / checked"
claims now say software (H5 follow-through).

2026-11-16 (docs/gtm/dentvideo/ads): prices are read from web/src/lib/dentvid/pricing.ts (Starter and
Practice, USD / EUR / TRY), never typed here. The account is opened in EUR with time zone
Europe/Podgorica (business country Montenegro), so budgets and Max CPCs are written in EUR
(plan values in USD converted at EUR_PER_USD and rounded down) and the ad schedules are in
Podgorica time. Sitelinks now also use /help, /examples and the sourced comparison pages.

Usage: python3 -I build_csvs.py [path/to/pricing.ts]
"""
import csv, math, os, re, sys

OUT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://dentvideo.com"

# ---------------------------------------------------------------- prices (source of truth: pricing.ts)
PRICING_TS = next((a for a in sys.argv[1:] if a.endswith(".ts")),
                  os.path.join(OUT, "..", "..", "..", "..", "web", "src", "lib", "dentvid", "pricing.ts"))

def load_prices(path=PRICING_TS):
    """{"starter": {"USD": 49, "EUR": 49, "TRY": 1490}, "practice": {...}} from DV_LIST_PRICES."""
    src = open(path, encoding="utf-8").read()
    block = re.search(r"DV_LIST_PRICES[^=]*=\s*\{(.*?)\n\};", src, re.S)
    if not block:
        raise SystemExit("DV_LIST_PRICES not found in %s" % path)
    out = {}
    for tier, body in re.findall(r"(\w+)\s*:\s*\{([^}]*)\}", block.group(1)):
        out[tier] = {c: int(v) for c, v in re.findall(r"(USD|EUR|TRY)\s*:\s*(\d+)", body)}
    if set(out) != {"starter", "practice"} or any(set(v) != {"USD", "EUR", "TRY"} for v in out.values()):
        raise SystemExit("unexpected DV_LIST_PRICES shape in %s: %r" % (path, out))
    return out

PRICES = load_prices()
def tl(n):  return "{:,}".format(n).replace(",", ".") + " TL"   # 1.490 TL (pricing.ts formatDvPrice)
def eur(n): return "%d €" % n                                      # 49 € (German order)
def usd(n): return "$%d" % n
S, P = PRICES["starter"], PRICES["practice"]

# ---------------------------------------------------------------- account currency
# Account currency EUR (cannot be changed after creation). The plan's budgets and caps are in USD;
# they are converted at the ECB reference rate of 2026-11-16 (1 EUR = 1.1014 USD) and rounded DOWN.
USD_PER_EUR = 1.1014
def to_eur(usd_str):
    return "%.2f" % (math.floor(float(usd_str) / USD_PER_EUR * 100) / 100)

def suffix(camp):
    return ("utm_source=google&utm_medium=cpc&utm_campaign=%s"
            "&utm_term={targetid}&utm_content={adgroupid}-{creative}" % camp)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
def sched(start, end):
    return ";".join("(%s[%s-%s])" % (d, start, end) for d in DAYS)

# ---------------------------------------------------------------- campaigns
# Account time zone: Europe/Podgorica (CET/CEST, same clock as DE/AT).
# DE/AT 07-22 local = 07:00-22:00 account time.
# TR 07-23 Istanbul (UTC+3 all year) = 05:00-21:00 account time in winter (CET); in summer (CEST)
# the same setting runs 06:00-22:00 Istanbul time, which is fine.
# Budgets (red team M7, 2026-11-15): TR $5 + DE $9 = $14/day. In EUR, rounded down:
# TR 4.50 + DE 8.00 = 12.50 EUR/day; Google's monthly ceiling 12.50 x 30.4 = 380 EUR (about $419).
CAMPAIGNS = [
    dict(name="tr-search-core", market="TR", budget="4.50", langs="tr;en",
         locs=[("Turkey", "2792")], schedule=sched("05:00", "21:00"),
         label="launch-m1", note="Ready; paused until the LAUNCH.md checklist is done"),
    dict(name="de-search-core", market="DE", budget="8.00", langs="de;en",
         locs=[("Germany", "2276"), ("Austria", "2040")], schedule=sched("07:00", "22:00"),
         label="launch-m1", note="Ready; paused until the LAUNCH.md checklist is done"),
    dict(name="us-search-test", market="US", budget="4.50", langs="en",
         locs=[("United States", "2840")], schedule="",
         label="GATED-do-not-enable",
         note="GATED: enable only if TR or DE shows click->paid >= 1.5% AND Keyword Planner shows >= 10 US exact terms with low top-of-page bid <= $1.50 (ads-angles 3.4). Kill at $75 spent with 0 paid."),
]

# ---------------------------------------------------------------- shared copy
TR_PRICE_D = "Starter aylık %s, Practice aylık %s, vergiler hariç. Taahhüt yok." % (tl(S["TRY"]), tl(P["TRY"]))
DE_PRICE_D = "Starter %s, Practice %s pro Monat zzgl. MwSt. Monatlich kündbar." % (eur(S["EUR"]), eur(P["EUR"]))
US_PRICE_D = "See a preview with your logo before you pay. From %s/month plus tax, cancel anytime." % usd(S["USD"])
TR_FROM_H = "Aylık %s'den Başlar" % tl(S["TRY"])   # "from" = Starter, the lowest list price
DE_FROM_H = "Ab %s im Monat" % eur(S["EUR"])
US_FROM_H = "From %s a Month" % usd(S["USD"])

TR_A_HEAD = [  # Sponsorsuz dönem: düzenli bilgilendirme (ads-angles TR-A, price updated)
    "Sponsorlu Tanıtım Yasak mı?", "Geriye Organik İçerik Kalıyor", "Hasta Bilgilendirme Videosu",
    "Her Pazartesi 5 Hazır Video", "Bilgilendirme, Reklam Değil", "Siz Onaylayın, Siz Paylaşın",
    "Avatar Yok, Sahte Hekim Yok", "Hasta Görüntüsü Kullanılmaz", "Logonuz ve Renklerinizle",
    "Türkçe Seslendirme ve Altyazı", "Ödemeden Önce Önizleyin", TR_FROM_H,
    "İstediğiniz Zaman İptal",
]
TR_A_DESC = [
    "Sponsorlu tanıtım kısıtlı, bilgilendirme değil. Her pazartesi 5 kısa video hazır gelir.",
    "Her metin yazılımla, siz görmeden tanıtım kuralları ve klinik doğruluğa göre denetlenir.",
    "Videoyu siz onaylar, kendi hesabınızdan siz paylaşırsınız. Onayınız olmadan yayın yok.",
    TR_PRICE_D,
]
TR_TIME_HEAD = [
    "Her Pazartesi 5 Hazır Video", "Çekim ve Kurgu Gerekmez", "Siz Sadece Onaylayın",
    "Açıklama Metni de Hazır", "Instagram ve TikTok Formatı", "Logonuz ve Renklerinizle",
    "Haftada Birkaç Dakikanız", "Türkçe Seslendirme ve Altyazı", "Ödemeden Önce Önizleyin",
    TR_FROM_H, "Taahhüt Yok, İstediğinde İptal",
    "İlk Hafta Yaklaşık 15 Dakikada", "Avatar Yok, Sahte Hekim Yok",
]

DE_A_HEAD = [  # Aufklärung statt Werbung (ads-angles DE-A, price updated)
    "Aufklärung statt Werbung", "Jeden Montag 5 neue Videos", "Sachlich statt anpreisend",
    "Fertig vertont, untertitelt", "Sie geben nur noch frei", "Ohne Dreh und ohne Schnitt",
    "Riskante Aussagen markiert", "Softwaregestützt vorgeprüft", "Keine Avatare, keine Patienten",
    "In Ihren Praxisfarben", "Vorschau vor dem Kauf", DE_FROM_H, "Monatlich kündbar",
]
DE_A_DESC = [
    "Sachliche Patientenaufklärung als Kurzvideo, jeden Montag fertig. Ansehen und freigeben.",
    "Jedes Skript vorab softwaregestützt auf Werberecht geprüft. Keine Rechtsberatung.",
    "Keine Avatare, keine falschen Ärzte, keine Patienten im Bild. Online nur nach Freigabe.",
    DE_PRICE_D,
]
DE_C_HEAD = [  # Keine Zeit, kein Personal (ads-angles DE-C)
    "Keine Zeit für Instagram?", "Social Media ohne Mehrarbeit", "Ihr Team bleibt am Patienten",
    "Jeden Montag 5 neue Videos", "Ein paar Minuten pro Woche", "Sie geben nur noch frei",
    "E-Mail, wenn die Woche fertig", "Vom Handy aus teilen", "Vertont und untertitelt",
    "Softwaregestützt vorgeprüft", "In Ihren Praxisfarben", "Erste Woche in ca. 15 Minuten",
    DE_FROM_H,
]
DE_C_DESC = [
    "Wenn im Team niemand Zeit für Social Media hat: fünf fertige Aufklärungsvideos pro Woche.",
    "Sie bekommen eine E-Mail, sehen die Woche an, geben mit einem Klick frei und teilen.",
    "Jedes Skript vorab softwaregestützt auf Werberecht geprüft. Sie entscheiden.",
    DE_PRICE_D,
]

def rsa(pins, rest, desc, url, p1, p2):
    """pins: headlines pinned to position 1 (they rotate there). rest: unpinned.
    Duplicates are dropped; at most 15 headlines are kept."""
    heads, seen = [], set()
    for h in list(pins) + list(rest):
        if h not in seen:
            seen.add(h); heads.append(h)
    heads = heads[:15]
    return dict(heads=heads, npin=len(pins), desc=desc[:4], url=SITE + url, p1=p1, p2=p2)

# ---------------------------------------------------------------- TR
TR = [
    dict(name="TR-0 Brand", cpc="0.20", url="/tr",
         kw=[("dentvideo", "Exact"), ("dent video", "Exact"), ("dentvideo", "Phrase")],
         neg=["ücretsiz", "bedava"],
         ads=[rsa(["DentVideo", "DentVideo Diş Klinikleri İçin"],
                  ["Hasta Bilgilendirme Videosu"] + TR_TIME_HEAD,
                  ["DentVideo her pazartesi kliniğinize 5 kısa hasta bilgilendirme videosu hazırlar.",
                   TR_A_DESC[1], TR_A_DESC[2], TR_PRICE_D], "/tr", "dis-klinigi", "videolar")]),
    dict(name="TR-1 Sosyal medya", cpc="0.70", url="/tr",
         kw=[("diş kliniği sosyal medya", "Phrase"), ("diş kliniği sosyal medya", "Exact"),
             ("diş kliniği sosyal medya yönetimi", "Exact"), ("diş hekimi sosyal medya", "Phrase"),
             ("diş kliniği instagram", "Exact"),
             ("diş hekimi instagram paylaşımları", "Phrase"), ("diş kliniği instagram paylaşım", "Phrase"),
             ("diş hekimi reels", "Phrase"), ("diş kliniği reels", "Phrase"),
             ("diş kliniği içerik", "Phrase"), ("diş hekimi içerik üretimi", "Phrase"),
             ("diş kliniği sosyal medya içerik", "Phrase"),
             ("diş hekimi sosyal medya paylaşım fikirleri", "Exact"),
             ("diş kliniği paylaşım fikirleri", "Phrase"), ("diş kliniği sosyal medya takvimi", "Exact"),
             ("diş kliniği reels fikirleri", "Phrase"), ("diş hekimi instagram içerik fikirleri", "Phrase"),
             ("diş kliniği youtube shorts", "Phrase")],
         neg=["ücretsiz", "bedava"],
         ads=[rsa(["Diş Kliniği Sosyal Medyası", "Diş Hekimi Instagram İçeriği"],
                  ["Diş Kliniği İçin Paylaşımlar"] + TR_TIME_HEAD,
                  ["Diş kliniğiniz için Instagram ve TikTok'a hazır kısa videolar, paylaşım metniyle birlikte.",
                   "Her pazartesi beş kısa hasta bilgilendirme videosu hazır. İzleyin, onaylayın, paylaşın.",
                   "Metin, seslendirme, altyazı ve klinik renkleriniz hazır gelir; onay her zaman sizde.",
                   TR_PRICE_D], "/tr", "sosyal-medya", "videolar"),
              rsa(["Diş Kliniği Sosyal Medyası", "Diş Hekimi Instagram İçeriği"], TR_A_HEAD, TR_A_DESC,
                  "/tr", "sosyal-medya", "bilgilendirme")]),
    dict(name="TR-2 Video", cpc="0.70", url="/tr",
         kw=[("diş kliniği video", "Exact"),
             ("diş hekimi tanıtım videosu", "Phrase"), ("hasta bilgilendirme videoları", "Phrase"),
             ("hasta bilgilendirme videosu", "Phrase"), ("hasta bilgilendirme videosu", "Exact"),
             ("diş hekimi video çekimi", "Phrase"), ("diş kliniği video çekimi", "Phrase"),
             ("implant bilgilendirme videosu", "Exact"), ("diş polikliniği sosyal medya", "Phrase"),
             ("diş hekimi yapay zeka video", "Phrase"), ("diş kliniği yapay zeka video", "Phrase"),
             ("diş hekimleri için video", "Exact"), ("diş kliniği hazır video", "Phrase"),
             ("diş hekimleri için hazır içerik", "Phrase"), ("diş hekimi altyazılı video", "Phrase"),
             ("hasta bilgilendirme içerikleri", "Phrase")],
         neg=["ücretsiz", "bedava"],
         ads=[rsa(["Hasta Bilgilendirme Videosu", "Diş Kliniği Videoları"],
                  ["Haftada 5 Hazır Video", "Kliniğinize Özel Videolar"] + TR_TIME_HEAD,
                  ["Yalnızca sunduğunuz tedavilerle ilgili, hastaların sık sorduğu sorulara kısa videolar.",
                   "Her pazartesi beş kısa hasta bilgilendirme videosu hazır. İzleyin, onaylayın, paylaşın.",
                   "Metin, seslendirme, altyazı ve klinik renkleriniz hazır gelir; onay her zaman sizde.",
                   TR_PRICE_D], "/tr", "dis-klinigi", "videolar"),
              rsa(["Hasta Bilgilendirme Videosu", "Diş Kliniği Videoları"], TR_A_HEAD, TR_A_DESC,
                  "/tr", "dis-klinigi", "bilgilendirme")]),
    dict(name="TR-3 Reklam kuralları", cpc="0.40", url="/tr/ad-checker",
         kw=[("diş hekimi reklam yasağı", "Phrase"), ("diş hekimi reklam yasağı", "Exact"),
             ("diş hekimi reklam yasağı sosyal medya", "Phrase"), ("sağlıkta tanıtım yönetmeliği", "Phrase"),
             ("tanıtım ve bilgilendirme yönetmeliği", "Phrase"), ("diş hekimi instagram yasak", "Phrase"),
             ("diş hekimi sosyal medya yasak", "Phrase"), ("diş hekimi ne paylaşabilir", "Phrase"),
             ("hekim sosyal medya paylaşımı", "Phrase"), ("diş hekimi öncesi sonrası paylaşım", "Phrase"),
             ("diş hekimi sponsorlu reklam", "Phrase"), ("sağlıkta reklam yasağı sosyal medya", "Phrase"),
             ("diş hekimi instagram kuralları", "Phrase"), ("diş kliniği paylaşım kuralları", "Phrase"),
             ("hekim sosyal medya ne paylaşabilir", "Phrase")],
         neg=[],
         ads=[rsa(["Bu Paylaşım Yasak mı?", "Ücretsiz Reklam Kontrolü"],
                  ["Paylaşmadan Önce Kontrol", "Riskli İfadeleri Görün", "Tanıtım Kurallarına Bakın",
                   "Metni Yapıştırın, Sonucu Görün", "Gerekçesiyle Açıklanır", "Hukuki Görüş Değildir",
                   "Kayıt Gerekmez", "Metniniz Hiçbir Yere Gitmez", "Haftalık Videolar da Kontrollü",
                   "Her Pazartesi 5 Video", "Siz Onaylamadan Yayın Yok", "Instagram ve Web Metni İçin",
                   "Taahhüt Yok, İstediğinde İptal"],
                  ["Metninizi yapıştırın, riskli ifadeleri gerekçesiyle görün. Kayıt yok, metin gönderilmez.",
                   "Hukuki görüş değildir; karar sizde. Şüphede kaldığınızda odanıza danışın.",
                   "İsterseniz her pazartesi 5 bilgilendirme videosu, metinleri yazılımla kontrol edilmiş.",
                   "Ücretsiz araç: Instagram açıklamanızı ya da web sitesi metninizi tarayıcıda kontrol edin."],
                  "/tr/ad-checker", "reklam-kontrol", "dis-hekimi"),
              rsa(["Sponsorlu Tanıtım Yasak mı?", "Bu Paylaşım Yasak mı?"],
                  ["Ücretsiz Reklam Kontrolü", "Paylaşmadan Önce Kontrol", "Riskli İfadeleri Görün",
                   "Bilgilendirme, Reklam Değil", "Geriye Organik İçerik Kalıyor", "Hukuki Görüş Değildir",
                   "Metniniz Hiçbir Yere Gitmez", "Hasta Bilgilendirme Videosu", "Her Pazartesi 5 Hazır Video",
                   "Siz Onaylayın, Siz Paylaşın", "Avatar Yok, Sahte Hekim Yok", "Instagram ve Web Metni İçin",
                   "İstediğiniz Zaman İptal"],
                  ["Paylaşım metninizi yapıştırın, riskli ifadeleri görün. Hukuki görüş değildir; karar sizde.",
                   TR_A_DESC[0], TR_A_DESC[1],
                   "Ücretsiz araç: Instagram açıklamanızı ya da web sitesi metninizi tarayıcıda kontrol edin."],
                  "/tr/ad-checker", "reklam-kontrol", "sosyal-medya")]),
    dict(name="TR-4 Ajans alternatifi", cpc="0.80", url="/tr",
         kw=[("diş kliniği sosyal medya ajansı", "Phrase"), ("diş hekimi sosyal medya ajansı", "Phrase"),
             ("diş hekimleri için sosyal medya ajansı", "Phrase"),
             ("diş kliniği dijital pazarlama", "Phrase"), ("diş hekimi pazarlama", "Phrase"),
             ("diş kliniği sosyal medya yönetimi fiyat", "Phrase"), ("sosyal medya yönetimi diş", "Phrase"),
             ("diş kliniği içerik ajansı", "Phrase"), ("diş kliniği sosyal medya fiyatları", "Phrase")],
         neg=["ücretsiz", "bedava"],
         ads=[rsa(["Ajansa Bir Alternatif", "Ajans mı, DentVideo mu?"],
                  ["Sabit Aylık Ücret", "Toplantısız İçerik Üretimi", "Brifing ve Toplantı Yok",
                   "Çekim ve Kurgu Gerekmez", "Her Pazartesi 5 Hazır Video", "Diş Kliniği Sosyal Medyası",
                   "Haftada Birkaç Dakikanız", "Tek Dokunuşla Onaylayın", "Açıklama Metni de Hazır",
                   "Instagram ve TikTok Formatı", "Logonuz ve Renklerinizle", TR_FROM_H,
                   "Ödemeden Önce Önizleyin"],
                  ["Toplantı, brifing ve taahhüt yok. Her pazartesi 5 hazır video, yazılımla kontrol edilmiş.",
                   "Metin, seslendirme, altyazı ve logonuz hazır gelir. Size düşen izlemek ve onaylamak.",
                   "Zaten bir ajansla çalışıyorsanız, onayladığınız videoları sizin yerinize o paylaşabilir.",
                   TR_PRICE_D], "/tr", "ajans", "alternatif"),
              rsa(["Ajansa Bir Alternatif", "Diş Kliniği Sosyal Medyası"], TR_A_HEAD, TR_A_DESC,
                  "/tr", "ajans", "bilgilendirme")]),
]

# ---------------------------------------------------------------- DE
DE = [
    dict(name="DE-0 Brand", cpc="0.50", url="/de",
         kw=[("dentvideo", "Exact"), ("dent video", "Exact"), ("dentvideo", "Phrase")],
         neg=["kostenlos", "gratis"],
         ads=[rsa(["DentVideo", "DentVideo für Zahnarztpraxen"],
                  ["Aufklärungsvideos für Praxen"] + DE_A_HEAD,
                  ["DentVideo liefert jeden Montag fünf kurze Aufklärungsvideos in Ihren Praxisfarben.",
                   DE_A_DESC[1], DE_A_DESC[2], DE_PRICE_D], "/de", "zahnarztpraxis", "videos")]),
    dict(name="DE-1 Social Media", cpc="1.80", url="/de",
         kw=[("social media zahnarztpraxis", "Phrase"), ("social media zahnarztpraxis", "Exact"),
             ("social media zahnarzt", "Phrase"), ("social media für zahnärzte", "Phrase"),
             ("instagram zahnarztpraxis", "Exact"), ("instagram zahnarzt", "Exact"),
             ("instagram für zahnärzte", "Phrase"), ("zahnarzt reels", "Exact"),
             ("zahnarztpraxis tiktok", "Exact"), ("content zahnarztpraxis", "Phrase"),
             ("redaktionsplan zahnarztpraxis", "Phrase"), ("social media ideen zahnarzt", "Phrase"),
             ("posts zahnarztpraxis", "Phrase"), ("social media beiträge zahnarzt", "Phrase"),
             ("zahnarzt social media marketing", "Exact"), ("zahnarzt youtube shorts", "Phrase"),
             ("instagram ideen zahnarztpraxis", "Phrase"), ("reels ideen zahnarzt", "Phrase"),
             ("zahnarzt content erstellen", "Phrase"), ("social media ordination zahnarzt", "Phrase")],
         neg=["kostenlos", "gratis"],
         ads=[rsa(["Social Media für Zahnärzte", "Instagram für Ihre Praxis"],
                  ["Reels für die Zahnarztpraxis", "Posts für Ihre Zahnarztpraxis"] + DE_A_HEAD,
                  ["Kurze Hochformat-Videos für Instagram und TikTok, mit fertigem Beitragstext und Hashtags.",
                   DE_A_DESC[0], DE_A_DESC[1], DE_PRICE_D], "/de", "social-media", "zahnarzt"),
              rsa(["Social Media für Zahnärzte", "Instagram für Ihre Praxis"], DE_C_HEAD, DE_C_DESC,
                  "/de", "social-media", "praxis")]),
    dict(name="DE-2 Videos", cpc="1.80", url="/de",
         kw=[("videos zahnarztpraxis", "Phrase"), ("video zahnarztpraxis", "Phrase"),
             ("zahnarzt video erstellen", "Phrase"), ("patientenaufklärung video zahnarzt", "Phrase"),
             ("aufklärungsvideos zahnarzt", "Phrase"), ("patientenvideos zahnarzt", "Phrase"),
             ("praxisvideo zahnarzt", "Phrase"), ("zahnarzt ki video", "Phrase"),
             ("ki videos zahnarztpraxis", "Phrase"), ("aufklärungsvideos zahnarztpraxis", "Phrase"),
             ("aufklärungsvideos zahnarztpraxis", "Exact"), ("patienteninformation video zahnarzt", "Phrase"),
             ("kurzvideos zahnarztpraxis", "Phrase"), ("videos für zahnärzte", "Phrase"),
             ("ki content zahnarztpraxis", "Phrase")],
         neg=["kostenlos", "gratis"],
         ads=[rsa(["Videos für Zahnarztpraxen", "Aufklärungsvideos für Praxen"],
                  ["5 Praxisvideos jeden Montag", "Patientenvideos mit Ihrem Logo"] + DE_A_HEAD,
                  ["Nur zu Leistungen, die Sie anbieten, und zu Fragen, die Patienten tatsächlich googeln.",
                   DE_A_DESC[0], DE_A_DESC[2], DE_PRICE_D], "/de", "zahnarztpraxis", "videos"),
              rsa(["Videos für Zahnarztpraxen", "Aufklärungsvideos für Praxen"], DE_C_HEAD, DE_C_DESC,
                  "/de", "zahnarztpraxis", "aufklaerung")]),
    dict(name="DE-3 Werberecht", cpc="1.20", url="/de/ad-checker",
         kw=[("hwg zahnarzt", "Phrase"), ("heilmittelwerbegesetz zahnarzt", "Phrase"),
             ("zahnarzt werbung erlaubt", "Phrase"),
             ("zahnarzt werbung instagram", "Phrase"),
             ("werberecht zahnarzt", "Phrase"), ("berufsordnung zahnarzt werbung", "Phrase"),
             ("abmahnung zahnarzt instagram", "Phrase"), ("hwg social media zahnarzt", "Phrase"),
             ("vorher nachher zahnarzt erlaubt", "Phrase"), ("zahnarzt werbung was ist erlaubt", "Phrase"),
             ("berufsordnung zahnärzte social media", "Phrase"), ("zahnarzt werbung österreich", "Phrase"),
             ("werberichtlinie zahnärztekammer", "Phrase"), ("zäg werbung", "Phrase")],
         neg=[],
         ads=[rsa(["Ist mein Post erlaubt?", "Kostenloser Werbe-Check"],
                  ["Riskante Aussagen markiert", "Text einfügen, Ergebnis sehen", "Text bleibt in Ihrem Browser",
                   "Keine Rechtsberatung", "Mit Begründung und Vorschlag", "Für Posts und Website-Texte",
                   "Werberecht im Blick behalten", "Videos vorab softwaregeprüft", "Jeden Montag 5 neue Videos",
                   "Nichts ohne Ihre Freigabe", "Aufklärung statt Werbung", "Für Instagram und Website",
                   "Monatlich kündbar"],
                  ["Text einfügen, riskante Formulierungen sehen. Keine Rechtsberatung, Sie entscheiden.",
                   "Kostenloser Check im Browser: Ihr Text wird nirgendwohin gesendet und nicht gespeichert.",
                   "Für jede markierte Stelle gibt es eine Begründung und eine ruhigere Formulierung.",
                   "Auf Wunsch jeden Montag fünf Aufklärungsvideos, softwaregestützt vorgeprüft."],
                  "/de/ad-checker", "werbe-check", "zahnarzt"),
              rsa(["Ist mein Post erlaubt?", "Aufklärung statt Werbung"],
                  ["Kostenloser Werbe-Check", "Riskante Aussagen markiert", "Keine Rechtsberatung"]
                  + [{DE_FROM_H: "Für Instagram und Website"}.get(h, h) for h in DE_A_HEAD],
                  ["Text einfügen, riskante Formulierungen sehen. Keine Rechtsberatung, Sie entscheiden.",
                   DE_A_DESC[0], DE_A_DESC[1],
                   "Kostenloser Check im Browser: Ihr Text wird nirgendwohin gesendet und nicht gespeichert."],
                  "/de/ad-checker", "werbe-check", "praxis")]),
    dict(name="DE-4 Agentur-Alternative", cpc="2.50", url="/de",
         kw=[("social media agentur zahnarzt", "Phrase"), ("social media agentur zahnarztpraxis", "Phrase"),
             ("marketing agentur zahnarzt", "Phrase"), ("praxismarketing zahnarzt", "Phrase"),
             ("zahnarztmarketing", "Exact"), ("zahnarzt marketing", "Exact"),
             ("social media betreuung zahnarzt", "Phrase"), ("social media management zahnarzt", "Phrase"),
             ("social media zahnarztpraxis ohne agentur", "Phrase"),
             ("social media agentur zahnarzt kosten", "Phrase"), ("praxismarketing zahnarzt kosten", "Phrase")],
         neg=["kostenlos", "gratis"],
         ads=[rsa(["Alternative zur Agentur", "Praxismarketing ohne Agentur"],
                  ["Kein Retainer, keine Laufzeit", "Ohne Briefings und Meetings", "Social Media für Zahnärzte",
                   "Jeden Montag 5 neue Videos", "Wenige Minuten pro Woche", "Ganze Woche mit einem Klick",
                   "Begleittext schon kopiert", "Für Instagram und TikTok", "Softwaregestützt vorgeprüft",
                   "Mit Logo und Praxisfarben", DE_FROM_H, "Vorschau vor dem Kauf",
                   "Agentur oder DentVideo?"],
                  ["Keine Laufzeit, keine Briefings. Jeden Montag fünf fertige, softwaregeprüfte Videos.",
                   "Skript, Stimme, Untertitel und Logo kommen fertig. Sie sehen an und geben frei.",
                   "Arbeiten Sie schon mit einer Agentur? Dann kann sie die Videos für Sie posten.",
                   DE_PRICE_D], "/de", "agentur", "alternative"),
              rsa(["Alternative zur Agentur", "Social Media für Zahnärzte"], DE_A_HEAD, DE_A_DESC,
                  "/de", "agentur", "aufklaerung")]),
]

# ---------------------------------------------------------------- US (gated)
US_HEAD = ["5 New Videos Every Monday", "Short Videos for Your Practice", "Dental Reels, Ready Weekly",
           "No Filming, No Editing", "You Just Review and Approve", "Narrated and Captioned",
           "With Your Logo and Colors", "No Patients on Camera", "No Avatars or Fake Doctors",
           "Risky Ad Claims Flagged", "Preview Before You Pay", US_FROM_H,
           "Monthly Plan, Cancel Anytime", "Software, Not an Agency"]
US_DESC = ["Five short patient-education videos every Monday, in your colors. Review, approve, share.",
           "Software checks every script for clinical accuracy and risky ad claims before you see it.",
           "No patients, avatars or fake doctors on screen. Nothing is posted without your approval.",
           US_PRICE_D]
US = [
    dict(name="US-1 Patient education videos", cpc="1.50", url="/",
         kw=[("dental patient education videos", "Exact"),
             ("patient education videos for dental office", "Exact"),
             ("dental video content", "Exact"), ("dental reels", "Exact")],
         neg=[],
         ads=[rsa(["Patient Education Videos", "Dental Patient Videos"], US_HEAD, US_DESC, "/",
                  "dental", "videos")]),
    dict(name="US-2 Dental social content", cpc="1.50", url="/",
         kw=[("dental social media content", "Exact"), ("dental social media posts", "Exact"),
             ("dental instagram content", "Exact"), ("social media content for dentists", "Exact"),
             ("done for you dental social media", "Exact")],
         neg=[],
         ads=[rsa(["Dental Social Media Content", "Videos for Dental Instagram"], US_HEAD, US_DESC, "/",
                  "dental", "social-media")]),
]
ADGROUPS = {"tr-search-core": TR, "de-search-core": DE, "us-search-test": US}

# ---------------------------------------------------------------- negatives
SHARED_LISTS = {
    "NEG-ALL": "job, jobs, career, salary, internship, course, courses, certification, udemy, student, students, thesis, university, school, free download, template, templates, psd, png, logo, near me, emergency, appointment, reviews, wikipedia, pdf, apk, crack, mod, prompt, seo, google ads, website, web design, veterinary, dental lab, dental technician",
    "NEG-TR": "iş ilanı, iş ilanları, eleman, eleman arıyor, kariyer, maaş, maaşları, staj, stajyer, asistan, asistan alımı, kurs, kursu, eğitim, eğitimi, sertifika, sertifikalı, seminer, öğrenci, öğrencisi, fakülte, fakültesi, tus, dus, kpss, atama, ödev, tez, sunum, slayt, şablon, şablonları, psd, png, indir, logo, yakınımda, en yakın, nöbetçi, acil, randevu, mhrs, sgk, devlet, hastanesi, ağız ve diş sağlığı merkezi, implant fiyatları, implant fiyat, diş fiyatları, tedavi fiyatları, muayene ücreti, diş hekimi ücretleri, tdb asgari ücret, diş çekimi, dolgu, kanal tedavisi fiyat, ağrı, ağrısı, apse, şişlik, yorumlar, şikayet, şikayetvar, komik, şarkı, dizi, veteriner, diş teknisyeni, laboratuvar, google reklam, google ads, reklam ver, web sitesi, web tasarım, seo, prompt",
    "NEG-DE": "job, jobs, stellenangebot, stellenangebote, stelle, gehalt, ausbildung, zfa, zmp, zmv, praktikum, minijob, karriere, kurs, seminar, fortbildung, weiterbildung, zertifikat, webinar, student, studium, examen, hausarbeit, bachelorarbeit, masterarbeit, doktorarbeit, vorlage, vorlagen, download, png, logo, in der nähe, notdienst, notfall, termin, öffnungszeiten, bewertungen, schmerzen, kosten implantat, implantat kosten, zahnreinigung, krankenkasse, zahnzusatzversicherung, wartezimmer tv, zahntechniker, dentallabor, tierarzt, website, homepage, seo, google ads, anwalt, rechtsanwalt, kanzlei, urteil, wikipedia, pdf",
}
LIST_CAMPAIGNS = {"NEG-ALL": ["tr-search-core", "de-search-core", "us-search-test"],
                  "NEG-TR": ["tr-search-core"], "NEG-DE": ["de-search-core"]}
CAMPAIGN_NEG = {
    "tr-search-core": "avukat, hukuk bürosu, dilekçe, itiraz, danıştay, ceza itiraz, resmi gazete pdf, madde metni, sağlık turizmi, yurt dışı hasta, health tourism, aracı kuruluş, saç ekimi, estetik cerrah, eczane, influencer, reklam kurulu, ticaret bakanlığı, kvkk danışmanlığı, avatar video, heygen",
    "de-search-core": "abmahnung erhalten, abmahnung was tun, unterlassungserklärung, fachanwalt, medizinrecht, goz, bema, abrechnung, praxisübernahme, praxisverkauf, freelancer, werkstudent, quereinsteiger, fortbildungspunkte, dsgvo, barrierefreiheit, bfsg, jameda, google bewertungen löschen, avatar, heygen, deepfake",
    "us-search-test": "free, ce, continuing education, hygienist, assistant, school, canva, chairside, caesy, waiting room tv, agency jobs",
}
# Red team 2026-11-15 (H3): patient / kids / fan / other-profession queries. Kept separate so the
# CSV row order matches the reviewed file (written after all CAMPAIGN_NEG rows).
CAMPAIGN_NEG_ADDED = {
    "tr-search-core": "izle, oyun, oyunu, çizgi film, vlog, korkusu, ameliyat, anestezi, hastane, eczacı, psikolog, diyetisyen, fizyoterapist, güzellik merkezi, ünlü, fenomen",
    "de-search-core": "anschauen, lustig, witzig, spiel, angst, erfahrungen, veneers, zahnspange, türkei, ungarn, krankenhaus, klinikum, physiotherapie, kosmetikstudio, hyaluron, botox",
}
def split(s): return [x.strip() for x in s.split(",") if x.strip()]

# ---------------------------------------------------------------- assets
# 2026-11-16: the comparison pages (/videos/*) now mount PriceRegion, so they show the visitor's
# currency (red team B1 is closed for them); they replace the interim price-free guides. Link texts
# still name no third-party brand (red team M1), so the Canva pages are "template or ready-made".
# Every URL is checked for HTTP 200 by validate.py.
SITELINKS = {
    "tr-search-core": [
        ("Örnek Videolar", "/tr/examples", "Demo klinikler için hazırlandı", "Düzenlenmemiş gerçek videolar"),
        ("Ücretsiz Reklam Kontrolü", "/tr/ad-checker", "Paylaşım metninizi yapıştırın", "Riskli ifadeleri görün"),
        ("Ajans mı, DentVideo mu?", "/videos/dentvideo-mu-ajans-mi", "Ajans neyi yapar, yazılım neyi", "Kaynaklı ve tarihli karşılaştırma"),
        ("Şablon mu, Hazır mı?", "/videos/dentvideo-mu-canva-mi", "Kendiniz mi yapmalı, hazır mı?", "Hangisi kime uyar, kaynaklı"),
        ("Video Hazırlamanın 5 Yolu", "/videos/dis-klinigi-hasta-bilgilendirme-videosu-hazirlama-yollari", "Çekim, ajans, uygulama, yazılım", "Zaman, maliyet ve kurallar"),
        ("Yardım Merkezi", "/tr/help", "Onay, paylaşım ve ayarlar", "Ödeme, fatura ve hesap"),
    ],
    "de-search-core": [
        ("Beispielvideos", "/de/examples", "Für Demo-Praxen erstellt", "Unbearbeitet bis auf Kompression"),
        ("Kostenloser Werbe-Check", "/de/ad-checker", "Post oder Website-Text einfügen", "Riskante Aussagen sehen"),
        ("DentVideo oder Agentur?", "/videos/dentvideo-oder-zahnarzt-marketing-agentur", "Was eine Agentur mehr leistet", "Mit Quellen und Datum"),
        ("Vorlage oder fertig?", "/videos/dentvideo-oder-canva-zahnarztpraxis", "Selbst gestalten oder liefern", "Was zu Ihrer Praxis passt"),
        ("Fünf Wege zum Video", "/videos/zahnarzt-aufklaerungsvideos-erstellen-wege", "Selbst, Agentur, App, Software", "Zeit, Kosten, Werberecht"),
        ("Hilfe-Center", "/de/help", "Freigabe, Teilen, Einstellungen", "Abrechnung, Rechnung, Konto"),
    ],
    "us-search-test": [
        ("Example Videos", "/examples", "Made for demo clinics", "Unedited except compression"),
        ("Free Ad Checker", "/ad-checker", "Paste a caption or web text", "See risky claims flagged"),
        ("DentVideo vs. an Agency", "/videos/dentvideo-vs-dental-marketing-agency", "What an agency does on top", "Sourced and dated"),
        ("5 Ways to Make Videos", "/videos/ways-to-make-dental-patient-education-videos", "Film, agency, apps, software", "Time, cost and ad-rule checks"),
        ("Guides for Clinics", "/guides", "Ad rules, post ideas, filming", "Practical and sourced"),
        ("Help Center", "/help", "Approval, posting, settings", "Billing, invoices, account"),
    ],
}
CALLOUTS = {
    "tr-search-core": ["Aylık Plan, Taahhüt Yok", "Ödemeden Önce Önizleme", "Her Pazartesi 5 Video",
                       "Türkçe Seslendirme", "Avatar ve Sahte Hekim Yok", "Onaysız Yayın Yok",
                       "Logonuz ve Renklerinizle", "Altyazı ve Açıklama Hazır"],
    "de-search-core": ["Monatlich kündbar", "Vorschau vor dem Kauf", "Jeden Montag 5 Videos",
                       "Vertont und untertitelt", "Keine Avatare", "Nur mit Ihrer Freigabe",
                       "In Ihren Praxisfarben", "Beitragstext inklusive"],
    "us-search-test": ["Monthly, Cancel Anytime", "Preview Before You Pay", "5 Videos Every Monday",
                       "Narrated and Captioned", "No Avatars on Screen", "You Approve Every Video",
                       "Your Logo and Colors"],
}
SNIPPETS = {  # header uses Google's predefined English header name; language shown separately
    "tr-search-core": ("Services", "Turkish", ["Bilgilendirme videoları", "Seslendirme", "Altyazı",
                                                "Paylaşım metni", "Hashtag önerileri"]),
    "de-search-core": ("Services", "German", ["Aufklärungsvideos", "Vertonung", "Untertitel",
                                               "Beitragstext", "Hashtags"]),
    "us-search-test": ("Services", "English", ["Patient-education videos", "Narration", "Captions",
                                                "Post captions", "Hashtags"]),
}

# ---------------------------------------------------------------- writers
def write(name, header, rows):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow([r.get(h, "") for h in header])
    return path

def main():
    # 1 campaigns
    hdr = ["Campaign", "Campaign Type", "Networks", "Budget", "Budget type", "Bid Strategy Type",
           "Campaign Status", "Languages", "Targeting method", "Exclusion method", "Ad Schedule",
           "Final URL suffix", "EU political ads", "Labels"]
    rows = []
    for c in CAMPAIGNS:
        rows.append({"Campaign": c["name"], "Campaign Type": "Search", "Networks": "Google search",
                     "Budget": c["budget"], "Budget type": "Daily", "Bid Strategy Type": "Manual CPC",
                     "Campaign Status": "Paused", "Languages": c["langs"],
                     "Targeting method": "Location of presence", "Exclusion method": "Location of presence",
                     "Ad Schedule": c["schedule"], "Final URL suffix": suffix(c["name"]),
                     "EU political ads": "Doesn't have EU political ads", "Labels": c["label"]})
    write("1-campaigns.csv", hdr, rows)

    # 2 locations
    rows = [{"Campaign": c["name"], "Location": n, "Location ID": i}
            for c in CAMPAIGNS for (n, i) in c["locs"]]
    write("2-locations.csv", ["Campaign", "Location", "Location ID"], rows)

    # 3 ad groups
    rows = [{"Campaign": cn, "Ad Group": g["name"], "Max CPC": to_eur(g["cpc"]), "Ad Group Status": "Enabled"}
            for cn, gs in ADGROUPS.items() for g in gs]
    write("3-adgroups.csv", ["Campaign", "Ad Group", "Max CPC", "Ad Group Status"], rows)

    # 4 keywords
    rows = [{"Campaign": cn, "Ad Group": g["name"], "Keyword": k, "Criterion Type": t, "Status": "Enabled"}
            for cn, gs in ADGROUPS.items() for g in gs for (k, t) in g["kw"]]
    write("4-keywords.csv", ["Campaign", "Ad Group", "Keyword", "Criterion Type", "Status"], rows)

    # 5 RSAs
    hdr = ["Campaign", "Ad Group", "Ad type", "Status"]
    for i in range(1, 16):
        hdr += ["Headline %d" % i, "Headline %d position" % i]
    for i in range(1, 5):
        hdr += ["Description %d" % i, "Description %d position" % i]
    hdr += ["Path 1", "Path 2", "Final URL"]
    rows = []
    for cn, gs in ADGROUPS.items():
        for g in gs:
            for a in g["ads"]:
                r = {"Campaign": cn, "Ad Group": g["name"], "Ad type": "Responsive search ad",
                     "Status": "Enabled", "Path 1": a["p1"], "Path 2": a["p2"], "Final URL": a["url"]}
                for i, h in enumerate(a["heads"], 1):
                    r["Headline %d" % i] = h
                    if i <= a["npin"]:
                        r["Headline %d position" % i] = "1"
                for i, d in enumerate(a["desc"], 1):
                    r["Description %d" % i] = d
                rows.append(r)
    write("5-responsive-search-ads.csv", hdr, rows)

    # 6 campaign- and ad-group-level negatives
    rows = []
    for cn, s in list(CAMPAIGN_NEG.items()) + list(CAMPAIGN_NEG_ADDED.items()):
        rows += [{"Campaign": cn, "Ad Group": "", "Keyword": k, "Criterion Type": "Campaign Negative Phrase"}
                 for k in split(s)]
    for cn, gs in ADGROUPS.items():
        for g in gs:
            rows += [{"Campaign": cn, "Ad Group": g["name"], "Keyword": k, "Criterion Type": "Negative Phrase"}
                     for k in g["neg"]]
    write("6-negatives-campaign-adgroup.csv", ["Campaign", "Ad Group", "Keyword", "Criterion Type"], rows)

    # 7 shared negative lists (+ campaign links) and plain-text copies for manual paste
    rows = [{"Shared set name": n, "Shared set type": "Negative keywords", "Keyword": k,
             "Criterion Type": "Negative Phrase"} for n, s in SHARED_LISTS.items() for k in split(s)]
    write("7a-shared-negative-lists.csv", ["Shared set name", "Shared set type", "Keyword", "Criterion Type"], rows)
    rows = [{"Campaign": c, "Shared set name": n, "Shared set type": "Negative keywords"}
            for n, cs in LIST_CAMPAIGNS.items() for c in cs]
    write("7b-shared-list-campaign-links.csv", ["Campaign", "Shared set name", "Shared set type"], rows)
    os.makedirs(os.path.join(OUT, "negative-lists-paste"), exist_ok=True)
    for n, s in SHARED_LISTS.items():
        with open(os.path.join(OUT, "negative-lists-paste", n + ".txt"), "w", encoding="utf-8") as f:
            f.write("\n".join('"%s"' % k for k in split(s)) + "\n")

    # 8 assets
    rows = [{"Campaign": cn, "Link Text": t, "Final URL": SITE + u, "Description Line 1": d1,
             "Description Line 2": d2} for cn, ls in SITELINKS.items() for (t, u, d1, d2) in ls]
    write("8a-sitelinks.csv", ["Campaign", "Link Text", "Final URL", "Description Line 1", "Description Line 2"], rows)
    rows = [{"Campaign": cn, "Callout text": t} for cn, ts in CALLOUTS.items() for t in ts]
    write("8b-callouts.csv", ["Campaign", "Callout text"], rows)
    rows = [{"Campaign": cn, "Header": h, "Language": lang, "Values": ";".join(v)}
            for cn, (h, lang, v) in SNIPPETS.items()]
    write("8c-structured-snippets.csv", ["Campaign", "Header", "Language", "Values"], rows)
    print("CSV files written to", OUT)

if __name__ == "__main__":
    main()
