#!/usr/bin/env python3
"""Makes the small WebP copy of each issue's cover.

The home page's shelf and the archive show every cover at a few hundred
pixels, but the PNG originals weigh up to 1.1 MB each. This writes a light
WebP next to them (assets/img/articles/thumbs/) and leaves the originals
untouched: they are still what the articles themselves show.

Run it from the project root after adding an issue:

    python -m pip install pillow
    python tools/make-thumbs.py

It reads the `cover:` paths from js/data/articles.js and prints, for each one,
the three fields to paste into that issue's object:

    thumb: '...webp', coverW: 1088, coverH: 598

(coverW / coverH are the original's real size: they give each tile its true
proportions before the image has loaded, so nothing jumps.)
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "js" / "data" / "articles.js"
THUMBS = ROOT / "assets" / "img" / "articles" / "thumbs"
MAX_WIDTH = 960
QUALITY = 84


def main():
    THUMBS.mkdir(parents=True, exist_ok=True)
    covers = re.findall(r"cover:\s*'([^']+)'", MANIFEST.read_text(encoding="utf-8"))
    for relative in covers:
        source = ROOT / relative
        if source.suffix.lower() == ".svg":
            print(f"skip   {relative} (vector: use it as is)")
            continue
        if not source.exists():
            print(f"MISSING {relative}")
            continue
        with Image.open(source) as image:
            width, height = image.size
            # Transparency is kept when a cover really has some (the Week 01 cover
            # is drawn on nothing, so it sits on the tile's mat in either theme);
            # everything else is flattened to RGB, which weighs less.
            rgba = image.convert("RGBA")
            image = rgba if rgba.getchannel("A").getextrema()[0] < 255 else rgba.convert("RGB")
            if width > MAX_WIDTH:
                image = image.resize((MAX_WIDTH, round(height * MAX_WIDTH / width)), Image.LANCZOS)
            target = THUMBS / (source.stem + ".webp")
            image.save(target, "WEBP", quality=QUALITY, method=6)
        print(f"{relative}\n    thumb: 'assets/img/articles/thumbs/{target.name}', "
              f"coverW: {width}, coverH: {height}    "
              f"({source.stat().st_size / 1024:.0f} KB -> {target.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
