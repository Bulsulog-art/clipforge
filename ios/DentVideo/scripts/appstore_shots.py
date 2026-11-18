#!/usr/bin/env python3
"""App Store screenshots for DentVideo: the real app screens (simulator, demo mode, the fictional
"Sample Dental Practice" clinic in each language) under a short caption band in dentvideo.com's
style (paper background, Instrument Serif caption in ink). No device frame, no claims, no prices.

Input: the "store" artifact of the iOS DentVideo workflow (scripts/screens.sh):
    <in>/phone/<lang>/<screen>.png   1320 x 2868 (iPhone 6.9")
    <in>/ipad/en/<screen>.png        2064 x 2752 (iPad 13")
Output: <out>/<lang>/<n>-<screen>.png (iPhone) and <out>/ipad-en/<n>-<screen>.png, at exactly
the sizes App Store Connect accepts (developer.apple.com, "Screenshot specifications").

Usage: python3 appstore_shots.py <in> <out> [--fonts DIR]
Fonts: Instrument Serif (OFL, google/fonts ofl/instrumentserif) in --fonts if present; Japanese
and Arabic use Noto Serif CJK JP / Noto Naskh Arabic (fc-match finds them). Needs Pillow with
libraqm (Arabic shaping).
"""
import argparse
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, features

ORDER = ["week-full", "video-review", "post-ready", "camera-live", "record", "videos"]
LANGS = ["en", "tr", "de", "es", "fr", "ja", "ar", "pl"]

CAPTIONS = {
    "en": ["Your week’s videos, ready on Monday", "Watch, then approve or decline", "Saved and copied, ready to post",
           "Record with your talking points on screen", "A filming card for every topic", "Your language, your voice, your closing line"],
    "tr": ["Haftanın videoları pazartesi hazır", "İzleyin, sonra onaylayın ya da reddedin", "Kaydedildi, kopyalandı, paylaşıma hazır",
           "Konuşma maddeleri ekranda, siz kayıtta", "Her konu için bir çekim kartı", "Diliniz, sesiniz, kapanış cümleniz"],
    "de": ["Ihre Wochenvideos, fertig am Montag", "Ansehen, dann freigeben oder ablehnen", "Gesichert und kopiert, bereit zum Posten",
           "Aufnehmen mit den Stichpunkten im Bild", "Eine Drehkarte für jedes Thema", "Ihre Sprache, Ihre Stimme, Ihr Schlusssatz"],
    "es": ["Los vídeos de tu semana, listos el lunes", "Míralo y apruébalo o recházalo", "Guardado y copiado, listo para publicar",
           "Graba con tus puntos clave en pantalla", "Una tarjeta de grabación por tema", "Tu idioma, tu voz, tu frase de cierre"],
    "fr": ["Les vidéos de la semaine, prêtes le lundi", "Regardez, puis validez ou refusez", "Enregistrée et copiée, prête à publier",
           "Filmez avec vos points clés à l’écran", "Une fiche de tournage par sujet", "Votre langue, votre voix, votre phrase de fin"],
    # Japanese has no spaces: the line breaks are set by hand at phrase boundaries.
    "ja": ["今週の動画は\n月曜日に届きます", "見て、承認または見送り", "保存とコピーが完了、\nすぐに投稿", "話すポイントを\n画面に表示して撮影",
           "テーマごとの撮影カード", "言語も声も、\n締めのひと言も"],
    "ar": ["فيديوهات أسبوعك جاهزة يوم الاثنين", "شاهد، ثم وافق أو ارفض", "تم الحفظ والنسخ، جاهز للنشر",
           "سجّل والنقاط الرئيسية على الشاشة", "بطاقة تصوير لكل موضوع", "لغتك وصوتك وجملة الختام"],
    "pl": ["Filmy na ten tydzień, gotowe w poniedziałek", "Obejrzyj, potem zaakceptuj lub odrzuć", "Zapisane i skopiowane, gotowe do publikacji",
           "Nagrywaj z punktami wypowiedzi na ekranie", "Karta nagrania do każdego tematu", "Twój język, Twój głos, Twoje zdanie końcowe"],
}

PAPER = (245, 239, 230)   # sand #f5efe6
INK = (20, 33, 31)        # #14211f
TEAL = (15, 92, 92)       # #0f5c5c
SIZES = {"phone": (1320, 2868), "ipad": (2064, 2752)}


def fc(name):
    try:
        return subprocess.run(["fc-match", "-f", "%{file}", name], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return ""


def font_for(lang, size, fonts_dir):
    if lang == "ja":
        path, index = fc("Noto Serif CJK JP"), 0
        if path.endswith(".ttc"):
            # The JP face inside the collection.
            for i in range(12):
                try:
                    f = ImageFont.truetype(path, size, index=i)
                    if "JP" in " ".join(f.getname()):
                        return f
                except OSError:
                    break
        return ImageFont.truetype(path, size, index=index)
    if lang == "ar":
        return ImageFont.truetype(fc("Noto Naskh Arabic"), size, layout_engine=ImageFont.Layout.RAQM)
    serif = os.path.join(fonts_dir or "", "InstrumentSerif-Regular.ttf")
    if os.path.exists(serif):
        return ImageFont.truetype(serif, size)
    return ImageFont.truetype(fc("Noto Serif"), size)


def wrap(draw, text, font, width, lang):
    """Greedy wrap by words (by characters for Japanese), balanced to two lines when it fits."""
    if "\n" in text:
        return text.split("\n")
    units = list(text) if lang == "ja" else text.split(" ")
    sep = "" if lang == "ja" else " "
    if draw.textlength(text, font=font) <= width:
        return [text]
    # Best split point: the one that makes the two lines most equal.
    best, best_diff = None, None
    for i in range(1, len(units)):
        a, b = sep.join(units[:i]), sep.join(units[i:])
        wa, wb = draw.textlength(a, font=font), draw.textlength(b, font=font)
        if wa <= width and wb <= width and (best_diff is None or abs(wa - wb) < best_diff):
            best, best_diff = [a, b], abs(wa - wb)
    if best:
        return best
    lines, cur = [], ""
    for u in units:
        t = (cur + sep + u) if cur else u
        if draw.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = u
    lines.append(cur)
    return lines


def compose(shot_path, caption, lang, kind, fonts_dir):
    W, H = SIZES[kind]
    canvas = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(canvas)
    band = int(H * (0.17 if kind == "phone" else 0.15))
    size = int(W * (0.072 if kind == "phone" else 0.052))
    font = font_for(lang, size, fonts_dir)
    margin = int(W * 0.08)
    lines = wrap(d, caption, font, W - 2 * margin, lang)
    while len(lines) > 2 and size > 40:
        size -= 4
        font = font_for(lang, size, fonts_dir)
        lines = wrap(d, caption, font, W - 2 * margin, lang)
    line_h = int(size * 1.18)
    y = int(band * 0.56) - (line_h * len(lines)) // 2 + int(size * 0.1)
    direction = "rtl" if lang == "ar" else None
    for line in lines:
        kw = {"direction": direction} if direction and features.check("raqm") else {}
        w = d.textlength(line, font=font, **kw)
        d.text(((W - w) / 2, y), line, font=font, fill=INK, **kw)
        y += line_h
    # A short teal rule under the caption, as the site's section kickers.
    rule_w = int(W * 0.06)
    d.rounded_rectangle(((W - rule_w) / 2, band - int(H * 0.012), (W + rule_w) / 2, band - int(H * 0.012) + 8), radius=4, fill=TEAL)

    shot = Image.open(shot_path).convert("RGB")
    avail_h = H - band - int(H * 0.045)
    scale = min(avail_h / shot.height, (W - 2 * margin * 0.6) / shot.width)
    sw, sh = int(shot.width * scale), int(shot.height * scale)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    radius = int(sw * (0.085 if kind == "phone" else 0.035))
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
    x, top = (W - sw) // 2, band + int(H * 0.02)
    # One soft shadow, as the site's cards.
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x, top + 18, x + sw, top + sh + 18), radius=radius, fill=70)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.paste(Image.new("RGB", (W, H), (60, 50, 40)), (0, 0), shadow)
    canvas.paste(shot, (x, top), mask)
    # Hairline around the screen, so a light screen does not melt into the paper.
    ImageDraw.Draw(canvas).rounded_rectangle((x, top, x + sw - 1, top + sh - 1), radius=radius, outline=(225, 216, 202), width=3)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--fonts", default="")
    a = ap.parse_args()
    if not features.check("raqm"):
        print("warning: Pillow has no libraqm; Arabic captions will not be shaped", file=sys.stderr)
    made = 0
    jobs = [("phone", l, l) for l in LANGS] + [("ipad", "en", "ipad-en")]
    for kind, lang, folder in jobs:
        src = os.path.join(a.inp, kind, lang)
        if not os.path.isdir(src):
            print(f"skip {kind}/{lang}: no input")
            continue
        os.makedirs(os.path.join(a.out, folder), exist_ok=True)
        for n, screen in enumerate(ORDER, 1):
            p = os.path.join(src, f"{screen}.png")
            if not os.path.exists(p):
                print(f"missing {kind}/{lang}/{screen}")
                continue
            img = compose(p, CAPTIONS[lang][n - 1], lang, kind, a.fonts)
            assert img.size == SIZES[kind]
            img.save(os.path.join(a.out, folder, f"{n}-{screen}.png"), optimize=True)
            made += 1
    print(f"{made} screenshots written to {a.out}")


if __name__ == "__main__":
    main()
