#!/usr/bin/env python3
"""
Contact sheets for reviewing generated backgrounds (one sheet per category,
ids printed under each tile). Every image is looked at before it is approved.

    python3 -I scripts/dentvideo-backgrounds/contact-sheet.py <image-dir> <out-dir> [--cols 6] [--tile 300]
"""
import argparse, os, re
from collections import defaultdict
from PIL import Image, ImageDraw, ImageFont

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--tile", type=int, default=300, help="tile width; height is 16:9 portrait")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    groups = defaultdict(list)
    for f in sorted(os.listdir(a.src)):
        m = re.match(r"([a-z]+)-\d+\.jpg$", f)
        if m:
            groups[m.group(1)].append(f)
    tw, th, label = a.tile, int(a.tile * 16 / 9), 34
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for cat, files in groups.items():
        rows = (len(files) + a.cols - 1) // a.cols
        sheet = Image.new("RGB", (a.cols * (tw + 8) + 8, rows * (th + label + 8) + 8), "#1b1b1b")
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            x, y = 8 + (i % a.cols) * (tw + 8), 8 + (i // a.cols) * (th + label + 8)
            im = Image.open(os.path.join(a.src, f)).convert("RGB")
            im.thumbnail((tw, th))
            sheet.paste(im, (x, y))
            d.text((x + 4, y + th + 4), f[:-4], fill="#ffffff", font=font)
        sheet.save(os.path.join(a.out, f"{cat}.jpg"), quality=85)
        print(cat, len(files))

if __name__ == "__main__":
    main()
