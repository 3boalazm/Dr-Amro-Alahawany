#!/usr/bin/env python3
"""Optimise the doctor's portrait for the hero.

The original upload is a 457x700 RGBA PNG (~570 KB) — far too heavy for a
phone on 3G. This writes two responsive derivatives in WebP and JPEG.

    python3 tools/make-photo.py [source.png]

Defaults to the portrait at the repository root.
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "img")
DEFAULT_SRC = os.path.join(HERE, "..", "..", "..", "الاستاذ-دكتور-عمرو-الأهواني-استشارى-الذكورة.png")

WIDTHS = (240, 480)


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.exists(src_path):
        raise SystemExit(f"الصورة مش موجودة: {src_path}")

    os.makedirs(OUT, exist_ok=True)

    with Image.open(src_path) as im:
        # Flatten any transparency onto the page ivory so JPEG has no black
        # where the alpha channel was.
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            flat = Image.new("RGB", im.size, (250, 247, 242))
            flat.paste(im, mask=im.split()[-1])
            im = flat
        else:
            im = im.convert("RGB")

        print(f"  المصدر: {im.size[0]}x{im.size[1]}  {os.path.getsize(src_path) / 1024:.0f} KB")

        for width in WIDTHS:
            height = round(im.height * width / im.width)
            frame = im.resize((width, height), Image.LANCZOS)

            jpg = os.path.join(OUT, f"doctor-{width}.jpg")
            frame.save(jpg, "JPEG", quality=82, optimize=True, progressive=True)

            webp = os.path.join(OUT, f"doctor-{width}.webp")
            frame.save(webp, "WEBP", quality=80, method=6)

            print(
                f"  doctor-{width}  {width}x{height}  "
                f"jpg {os.path.getsize(jpg) / 1024:.1f} KB   "
                f"webp {os.path.getsize(webp) / 1024:.1f} KB"
            )

    print("Done.")


if __name__ == "__main__":
    main()
