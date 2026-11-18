#!/usr/bin/env python3
"""Checks docs/APP_STORE_LISTING_DENTVIDEO.md against App Store Connect's limits and the house rules.

Every pasteable value in the listing is a fenced block whose opening line carries an id, for example
    ```text id=de-DE.subtitle
This script reads those blocks and checks:
  - every language has every field, and nothing unknown is there;
  - Apple's limits (read 2026-11-17 from developer.apple.com, App Store Connect Help):
      name 2-30 characters, subtitle 30, promotional text 170, description 4000, What's New 4000,
      keywords 100 BYTES (UTF-8), each keyword longer than two characters,
      In-App Purchase display name 2-30 (no diacritics, emoji or special characters for
      subscriptions), In-App Purchase description 45, App Review notes 4000 BYTES;
  - keywords: comma-separated with no spaces around commas, no duplicates, no app, company or
    other companies' names, and (warning) no word already in the name or subtitle;
  - house rules (CLAUDE.md): no superlatives, "free", discounts, guarantees, medical promises,
    prices or currency, no pointer to buying on the web; no digits outside links (except "24" in
    Apple's renewal sentence); the description links exactly the language's terms and privacy pages;
  - optional: --shots-dir checks the screenshot files and their pixel sizes, --shots-script checks
    that the captions in the listing are the ones appstore_shots.py prints on the images.

Usage: python3 scripts/dentvideo-appstore-listing-check.py docs/APP_STORE_LISTING_DENTVIDEO.md
           [--shots-dir DIR] [--shots-script ios/DentVideo/scripts/appstore_shots.py]
Exit code 0 when there are no errors (warnings are printed but do not fail).
"""
import argparse
import ast
import os
import re
import struct
import sys
import unicodedata

LOCALES = ["en-US", "tr", "de-DE", "es-ES", "fr-FR", "ja", "ar-SA", "pl"]
# Locale in the listing -> language prefix of the dentvideo.com pages and of the screenshot folders.
SITE = {"en-US": "", "tr": "tr", "de-DE": "de", "es-ES": "es", "fr-FR": "fr", "ja": "ja", "ar-SA": "ar", "pl": "pl"}
SHOT = {"en-US": "en", "tr": "tr", "de-DE": "de", "es-ES": "es", "fr-FR": "fr", "ja": "ja", "ar-SA": "ar", "pl": "pl"}

APP_NAME = "DentVideo"

# field -> (min characters, max characters); keywords and review notes are checked in bytes below.
CHAR_LIMITS = {
    "subtitle": (1, 30),
    "promo": (1, 170),
    "description": (10, 4000),
    "whatsnew": (1, 4000),
    "iap.starter.name": (2, 30),
    "iap.practice.name": (2, 30),
    "iap.starter.desc": (1, 45),
    "iap.practice.desc": (1, 45),
}
PER_LOCALE = list(CHAR_LIMITS) + ["keywords", "captions"]
GLOBAL = {"iap.group", "review.notes"}
KEYWORDS_MAX_BYTES = 100
NOTES_MAX_BYTES = 4000

# Names of other apps and companies (Apple: not allowed in keywords), our own names (wasted there).
KEYWORD_BANNED = ["dentvideo", "bulsu", "instagram", "insta", "インスタ", "tiktok", "reels", "shorts", "facebook",
                  "youtube", "whatsapp", "canva", "capcut", "apple", "google", "meta"]

# House rules, every language, matched case-insensitively as whole words where the script has words.
BANNED = {
    "superlative or ranking": ["best", "#1", "number one", "leading", "top-rated", "en iyi", "en iyisi", "lider", "beste", "besten", "bester", "bestes", "führend",
                               "mejor", "mejores", "líder", "meilleur", "meilleure", "meilleurs", "meilleures", "leader", "最高", "No.1", "ナンバーワン", "一番", "أفضل",
                               "najlepszy", "najlepsza", "najlepsze", "najlepsi", "wiodący"],
    "free / discount / guarantee": ["free", "discount", "guarantee", "guaranteed", "trial", "offer", "ücretsiz",
                                    "bedava", "indirim", "garanti", "deneme", "kostenlos", "gratis", "rabatt",
                                    "garantie", "testphase", "gratuito", "descuento", "garantía", "prueba",
                                    "gratuit", "remise", "essai", "無料", "割引", "保証", "お試し", "مجاني", "مجانًا",
                                    "خصم", "ضمان", "تجربة", "darmowy", "darmowe", "bezpłatny", "zniżka", "gwarancja",
                                    "promocja"],
    "medical promise": ["cure", "heal", "painless", "pain-free", "pain free", "risk-free", "iyileştir", "ağrısız",
                        "acısız", "heilt", "schmerzfrei", "cura", "sin dolor", "guérit", "sans douleur", "治る",
                        "痛くない", "يشفي", "بدون ألم", "wyleczy", "bezbolesn"],
    "price or currency": ["$", "€", "₺", "¥", "zł", "usd", "eur", "try", "tl", "price", "prices", "fiyat", "preis",
                          "precio", "prix", "価格", "料金", "円", "سعر", "cena", "ceny"],
    "web purchase": ["website", "web site", "on the web", "web sitesi", "webseite", "website", "sitio web",
                     "site web", "site internet", "ウェブサイト", "サイト", "الموقع", "witryn", "stronie", "strona www"],
}

# Characters that make a word boundary check meaningless (CJK, Arabic): substring match there.
NO_SPACE_SCRIPT = re.compile(r"[぀-ヿ㐀-鿿؀-ۿ]")
URL = re.compile(r"https?://\S+")
BLOCK = re.compile(r"^```text id=(\S+)\n(.*?)\n```$", re.S | re.M)

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def nchars(s):
    # App Store Connect counts characters of the text as typed; normalise to NFC so a decomposed
    # accent does not count twice.
    return len(unicodedata.normalize("NFC", s))


def contains(text, term):
    t, low = term.lower(), text.lower()
    if NO_SPACE_SCRIPT.search(term) or not re.match(r"\w", term[0]) or not re.match(r"\w", term[-1]):
        return t in low
    return re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", low) is not None


def parse(path):
    text = open(path, encoding="utf-8").read()
    blocks = {}
    for m in BLOCK.finditer(text):
        key, value = m.group(1), m.group(2)
        if key in blocks:
            err(f"{key}: defined twice")
        blocks[key] = value
    return blocks


def check_rules(key, value, allow_digits=()):
    body = URL.sub(" ", value)
    for rule, terms in BANNED.items():
        for term in terms:
            if contains(body, term):
                err(f"{key}: {rule}: '{term}'")
    for d in re.findall(r"\d+(?:[.,]\d+)?", body):
        if d not in allow_digits:
            err(f"{key}: number '{d}' (no invented numbers; write facts in words or leave them out)")
    if "—" in value:
        warn(f"{key}: em dash")


def check_keywords(loc, value, name_and_subtitle):
    key = f"{loc}.keywords"
    if "\n" in value:
        err(f"{key}: must be one line")
    size = len(value.encode("utf-8"))
    if size > KEYWORDS_MAX_BYTES:
        err(f"{key}: {size} bytes > {KEYWORDS_MAX_BYTES}")
    if re.search(r"\s,|,\s", value) or value != value.strip():
        err(f"{key}: spaces around commas waste bytes")
    terms = value.split(",")
    seen = set()
    for t in terms:
        if nchars(t) <= 2:
            err(f"{key}: '{t}' (Apple: each keyword longer than two characters)")
        low = t.lower()
        if low in seen:
            err(f"{key}: duplicate '{t}'")
        seen.add(low)
        for b in KEYWORD_BANNED:
            if b in low:
                err(f"{key}: '{t}' names an app or company ('{b}')")
        for word in re.findall(r"\w+", low):
            if len(word) > 2 and contains(name_and_subtitle, word):
                warn(f"{key}: '{word}' is already in the name or subtitle (indexed there already)")
    return size


def check_description(loc, value):
    key = f"{loc}.description"
    prefix = f"/{SITE[loc]}" if SITE[loc] else ""
    want = {f"https://dentvideo.com{prefix}/terms", f"https://dentvideo.com{prefix}/privacy"}
    found = set(URL.findall(value))
    if found != want:
        err(f"{key}: links {sorted(found)} should be exactly {sorted(want)}")
    if "Practice" not in value or "Starter" not in value:
        err(f"{key}: must name both plans")


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def check_shots(shots_dir):
    order = ["1-week-full", "2-video-review", "3-post-ready", "4-camera-live", "5-record", "6-videos"]
    for loc in LOCALES:
        folder = os.path.join(shots_dir, SHOT[loc])
        for name in order:
            p = os.path.join(folder, name + ".png")
            if not os.path.exists(p):
                err(f"screenshots: missing {SHOT[loc]}/{name}.png")
                continue
            if png_size(p) != (1320, 2868):
                err(f"screenshots: {SHOT[loc]}/{name}.png is {png_size(p)}, iPhone 6.9\" needs (1320, 2868)")
    ipad = os.path.join(shots_dir, "ipad-en")
    found = sorted(f for f in os.listdir(ipad) if f.endswith(".png")) if os.path.isdir(ipad) else []
    if not found:
        err("screenshots: no iPad 13\" set (ipad-en/), required because the app runs on iPad")
    for f in found:
        if png_size(os.path.join(ipad, f)) != (2064, 2752):
            err(f"screenshots: ipad-en/{f} is {png_size(os.path.join(ipad, f))}, iPad 13\" needs (2064, 2752)")
    missing = [n for n in order if n + ".png" not in found]
    if missing:
        warn(f"screenshots: iPad set has {len(found)} of 6 (missing {', '.join(missing)})")
    extra = [d for d in os.listdir(shots_dir) if os.path.isdir(os.path.join(shots_dir, d))
             and d not in set(SHOT.values()) | {"ipad-en"}]
    if extra:
        warn(f"screenshots: unexpected folders {extra}")
    return len(found) + 6 * len(LOCALES)


def script_captions(path):
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "CAPTIONS" for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit(f"{path}: no CAPTIONS")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("listing")
    ap.add_argument("--shots-dir")
    ap.add_argument("--shots-script")
    a = ap.parse_args()

    blocks = parse(a.listing)
    expected = {f"{loc}.{f}" for loc in LOCALES for f in PER_LOCALE} | GLOBAL
    for k in sorted(expected - blocks.keys()):
        err(f"{k}: missing")
    for k in sorted(blocks.keys() - expected):
        err(f"{k}: unknown field")

    rows = []
    for loc in LOCALES:
        get = lambda f: blocks.get(f"{loc}.{f}", "")
        for field, (lo, hi) in CHAR_LIMITS.items():
            v = get(field)
            n = nchars(v)
            if not lo <= n <= hi:
                err(f"{loc}.{field}: {n} characters, allowed {lo}-{hi}")
            if field not in ("description",) and "\n" in v and field != "whatsnew":
                err(f"{loc}.{field}: must be one line")
            check_rules(f"{loc}.{field}", v, allow_digits=("24",) if field == "description" else ())
        for field in ("iap.starter.name", "iap.practice.name"):
            v = get(field)
            if any(unicodedata.category(c).startswith(("M", "S")) or ord(c) > 0x7F for c in v):
                err(f"{loc}.{field}: Apple allows no diacritics, emoji or special characters in subscription names")
        check_rules(f"{loc}.keywords", get("keywords"))
        kb = check_keywords(loc, get("keywords"), APP_NAME + " " + get("subtitle"))
        check_description(loc, get("description"))
        rows.append((loc, nchars(get("subtitle")), nchars(get("promo")), kb, nchars(get("description")),
                     nchars(get("whatsnew")), nchars(get("iap.starter.desc")), nchars(get("iap.practice.desc"))))

    group = blocks.get("iap.group", "")
    if not 1 <= nchars(group) <= 30 or any(ord(c) > 0x7F for c in group):
        err("iap.group: 1-30 plain characters")
    notes = blocks.get("review.notes", "")
    nb = len(notes.encode("utf-8"))
    if nb > NOTES_MAX_BYTES:
        err(f"review.notes: {nb} bytes > {NOTES_MAX_BYTES}")
    if any(not v.startswith("<PASSWORD") for v in re.findall(r"(?i)password:\s*(\S+)", notes)):
        err("review.notes: a password must stay a <PASSWORD …> placeholder in the repo")

    shots = None
    if a.shots_dir:
        shots = check_shots(a.shots_dir)
    if a.shots_script:
        printed = script_captions(a.shots_script)
        for loc in LOCALES:
            mine = blocks.get(f"{loc}.captions", "").split("\n")
            theirs = [c.replace("\n", "" if loc == "ja" else " ") for c in printed.get(SHOT[loc], [])]
            if mine != theirs:
                for i, (x, y) in enumerate(zip(mine, theirs), 1):
                    if x != y:
                        err(f"{loc}.captions line {i}: listing '{x}' but the image says '{y}'")
                if len(mine) != len(theirs):
                    err(f"{loc}.captions: {len(mine)} lines, the script has {len(theirs)}")
    for loc in LOCALES:
        caps = blocks.get(f"{loc}.captions", "").split("\n")
        if len(caps) != 6:
            err(f"{loc}.captions: {len(caps)} lines, expected 6")
        for i, c in enumerate(caps, 1):
            check_rules(f"{loc}.captions line {i}", c)

    print(f"{'locale':7} {'subtitle':>8} {'promo':>6} {'kw bytes':>8} {'descr':>6} {'new':>5} {'iap S':>5} {'iap P':>5}")
    for r in rows:
        print(f"{r[0]:7} {r[1]:>5}/30 {r[2]:>3}/170 {r[3]:>4}/100 {r[4]:>6} {r[5]:>5} {r[6]:>2}/45 {r[7]:>2}/45")
    print(f"review notes: {nb}/{NOTES_MAX_BYTES} bytes; blocks: {len(blocks)}"
          + (f"; screenshots: {shots} files checked" if shots is not None else ""))
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
