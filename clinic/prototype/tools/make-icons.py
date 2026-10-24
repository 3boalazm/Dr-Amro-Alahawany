#!/usr/bin/env python3
"""
Generate PWA icons for the clinic booking app.

Design: deep navy tile, muted-gold ECG trace — matches the brand mark used
in the app header. Rendered at 4x and downsampled for clean edges.
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
os.makedirs(OUT, exist_ok=True)

SS = 4  # supersample factor

NAVY_TOP = (13, 30, 45)
NAVY_BOTTOM = (7, 18, 28)
GOLD_LIGHT = (240, 214, 163)
GOLD_DEEP = (188, 145, 78)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_bg(size):
    """Vertical navy gradient."""
    img = Image.new("RGB", (1, size), NAVY_TOP)
    px = img.load()
    for y in range(size):
        px[0, y] = lerp(NAVY_TOP, NAVY_BOTTOM, y / max(size - 1, 1))
    return img.resize((size, size), Image.BILINEAR)


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_mark(draw, size, scale=1.0, y_offset=0.0):
    """
    ECG polyline: flat → small dip → tall spike → deep dip → flat.
    Coordinates are fractions of `size`, centred.
    """
    w = size
    pts = [
        (0.200, 0.500),
        (0.330, 0.500),
        (0.395, 0.560),
        (0.465, 0.300),
        (0.545, 0.700),
        (0.615, 0.430),
        (0.680, 0.500),
        (0.800, 0.500),
    ]
    stroke = max(2, round(w * 0.052 * scale))
    mapped = []
    for fx, fy in pts:
        x = (0.5 + (fx - 0.5) * scale) * w
        y = (0.5 + (fy - 0.5) * scale) * w + y_offset * w
        mapped.append((x, y))

    for i in range(len(mapped) - 1):
        draw.line([mapped[i], mapped[i + 1]], fill=GOLD_LIGHT, width=stroke, joint="curve")

    # rounded caps
    r = stroke / 2 - 0.5
    for x, y in (mapped[0], mapped[-1]):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=GOLD_LIGHT)

    # joints
    for x, y in mapped[1:-1]:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=GOLD_LIGHT)


def build(size, *, maskable=False, rounded=True):
    s = size * SS
    base = gradient_bg(s).convert("RGBA")

    # subtle radial glow behind the mark
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [0.16 * s, 0.16 * s, 0.84 * s, 0.84 * s],
        fill=(200, 160, 95, 26),
    )
    glow = glow.filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(s * 0.09))
    base.alpha_composite(glow)

    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    # Maskable icons need the mark inside the central 80% safe zone.
    draw_mark(ld, s, scale=0.80 if maskable else 0.98)
    base.alpha_composite(layer)

    if maskable:
        # full bleed — the platform applies its own mask
        img = base
    elif rounded:
        img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        img.paste(base, (0, 0), rounded_mask(s, round(s * 0.22)))
    else:
        img = base

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, "PNG", optimize=True)
    print(f"  {name:32} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f} KB")


def save_ico(sizes, name):
    """Browsers still request /favicon.ico on their own — ship a real one.

    Pillow's ICO writer downsamples a single master image into every size in
    `sizes`, so the master must be the largest one (256) or the big frames
    come out upscaled and blurry.
    """
    path = os.path.join(OUT, "..", name)
    master = build(256)
    master.save(path, format="ICO", sizes=[(s, s) for s in sorted(sizes)])
    with Image.open(path) as ico:
        got = sorted(getattr(ico, "ico", None).sizes()) if getattr(ico, "ico", None) else "?"
    print(f"  {name:32} {got}  {os.path.getsize(path) / 1024:.1f} KB")


if __name__ == "__main__":
    print("Generating PWA icons…")
    save(build(192), "icon-192.png")
    save(build(512), "icon-512.png")
    save(build(192, maskable=True), "icon-maskable-192.png")
    save(build(512, maskable=True), "icon-maskable-512.png")
    save(build(180, rounded=False), "apple-touch-icon.png")
    save(build(32), "favicon-32.png")
    save(build(16), "favicon-16.png")
    save_ico([16, 32, 48], "favicon.ico")
    print("Done.")
