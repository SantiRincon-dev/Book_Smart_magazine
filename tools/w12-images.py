#!/usr/bin/env python3
"""Makes the three images of Week 12 ("Campus Stereotypes") from the students' files.

The students' two finished pieces are screenshots saved in
"fotos y trabajo por sesión/sesión 12/" (533x710 and 703x892 PNG). This writes,
into assets/img/articles/ (the originals are never touched):

  w12-cyt-skaters.webp     the first piece, at its real size
  w12-daily-grinder.webp   the second piece, at its real size
  w12-cover.webp           both pieces side by side at ONE height (the smaller
                           file's, 710 px), on a transparent background: the
                           tile on the home page and in the archive. Neither
                           piece is enlarged to make the pair even.

Quality 94 keeps the small lettering inside the pictures crisp (the pieces are
already screenshots, so a lossless copy would only be three times heavier).

Run it from the project root, then run tools/make-thumbs.py for the cover's
small copy and its coverW / coverH:

    python tools/w12-images.py
    python tools/make-thumbs.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SESSION = ROOT / "fotos y trabajo por sesión" / "sesión 12"
OUT = ROOT / "assets" / "img" / "articles"
QUALITY = 94
GAP = 24          # px between the two pieces on the cover

PIECES = [
    ("Captura de pantalla 2026-11-19 203949.png", "w12-cyt-skaters.webp"),
    ("Captura de pantalla 2026-11-19 204013.png", "w12-daily-grinder.webp"),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    opened = []
    for source_name, target_name in PIECES:
        with Image.open(SESSION / source_name) as image:
            rgb = image.convert("RGB")
        target = OUT / target_name
        rgb.save(target, "WEBP", quality=QUALITY, method=6)
        opened.append(rgb)
        print(f"{target_name}: {rgb.width}x{rgb.height}  {target.stat().st_size / 1024:.0f} KB")

    # The cover: one height for both (the smaller piece's), natural proportions.
    height = min(piece.height for piece in opened)
    scaled = [piece.resize((round(piece.width * height / piece.height), height), Image.LANCZOS)
              if piece.height != height else piece
              for piece in opened]
    width = sum(piece.width for piece in scaled) + GAP * (len(scaled) - 1)
    cover = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = 0
    for piece in scaled:
        cover.paste(piece.convert("RGBA"), (x, 0))
        x += piece.width + GAP
    target = OUT / "w12-cover.webp"
    cover.save(target, "WEBP", quality=QUALITY, alpha_quality=100, method=6)
    print(f"w12-cover.webp: {width}x{height}  {target.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
