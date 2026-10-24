#!/usr/bin/env python3
"""Generate the header avatar from the doctor's portrait.

    python3 tools/make-photo.py

Writes img/avatar-96.* and img/avatar-192.*. The face sits in the upper
third of the source, so the crop is anchored there rather than centred.
"""

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.join(HERE, "..")
IMG = os.path.join(PROTO, "img")
SOURCE = os.path.join(PROTO, "img", "doctor-480.webp")

# Square window around the head, measured on the 480x735 derivative.
#
# Tuned by rendering candidates at the header's real 38px and looking at
# them: a 240px box clipped the crown of the head, a 240-300px box still
# left the head off-centre. This 280px window keeps the whole head with
# even margins, which is what reads at thumbnail size.
FACE_BOX = (155, 45, 435, 325)


def main():
    with Image.open(SOURCE) as im:
        im = im.convert("RGB")
        face = im.crop(FACE_BOX)

        print(f"  وجه: {face.size[0]}x{face.size[1]} من {im.size[0]}x{im.size[1]}")

        for size in (96, 192):
            frame = face.resize((size, size), Image.LANCZOS)

            webp = os.path.join(IMG, f"avatar-{size}.webp")
            frame.save(webp, "WEBP", quality=86, method=6)

            jpg = os.path.join(IMG, f"avatar-{size}.jpg")
            frame.save(jpg, "JPEG", quality=88, optimize=True, progressive=True)

            print(
                f"  avatar-{size:<4} {size}x{size}  "
                f"webp {os.path.getsize(webp) / 1024:.1f} KB   "
                f"jpg {os.path.getsize(jpg) / 1024:.1f} KB"
            )

    print("Done.")


if __name__ == "__main__":
    main()
