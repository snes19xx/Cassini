"""
enhance_saturn_storm.py: punch up the Saturn storm equirectangular map for
the finale's atmospheric plunge. The flat source map reads as a blur at
that range, so this boosts local contrast on the existing cloud swirls
instead of just upscaling.

    mamba activate geo_env
    python scripts/enhance_saturn_storm.py
"""

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

# Defaults, relative to the repo root (run from there).
DEFAULT_INPUT = "dist/textures/originals/saturn_finale/storm.jpg"
DEFAULT_OUTPUT = "public/textures/finale/saturn_storm_8k.webp"


def enhance(
    img: Image.Image,
    clarity_radius: float,
    clarity_percent: int,
    detail_radius: float,
    detail_percent: int,
    detail_threshold: int,
    contrast: float,
    saturation: float,
) -> Image.Image:
    img = img.convert("RGB")

    # 1. Clarity: large radius, low percent, midtone local contrast.
    img = img.filter(
        ImageFilter.UnsharpMask(
            radius=clarity_radius, percent=clarity_percent, threshold=0
        )
    )
    # 2. Detail: small radius, crisp eddies. Threshold avoids amplifying
    #    smooth-band noise into blotches.
    img = img.filter(
        ImageFilter.UnsharpMask(
            radius=detail_radius, percent=detail_percent, threshold=detail_threshold
        )
    )
    # 3. Global contrast + saturation.
    img = ImageEnhance.Contrast(img).enhance(contrast)
    img = ImageEnhance.Color(img).enhance(saturation)
    return img


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--input", default=DEFAULT_INPUT)
    p.add_argument("--output", default=DEFAULT_OUTPUT)
    p.add_argument("--clarity-radius", type=float, default=40.0)
    p.add_argument("--clarity-percent", type=int, default=55)
    p.add_argument("--detail-radius", type=float, default=2.5)
    p.add_argument("--detail-percent", type=int, default=130)
    p.add_argument("--detail-threshold", type=int, default=1)
    p.add_argument("--contrast", type=float, default=1.12)
    p.add_argument("--saturation", type=float, default=1.28)
    p.add_argument("--upscale", action="store_true", help="2x LANCZOS upscale (off by default)")
    p.add_argument("--quality", type=int, default=92)
    args = p.parse_args()

    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading {src} ...")
    img = Image.open(src)
    print(f"  source: {img.size[0]} x {img.size[1]}  {img.mode}")

    out = enhance(
        img,
        args.clarity_radius,
        args.clarity_percent,
        args.detail_radius,
        args.detail_percent,
        args.detail_threshold,
        args.contrast,
        args.saturation,
    )

    if args.upscale:
        w, h = out.size
        out = out.resize((w * 2, h * 2), Image.LANCZOS)
        print(f"  upscaled to {out.size[0]} x {out.size[1]}")

    save_kwargs = {"quality": args.quality}
    if dst.suffix.lower() == ".webp":
        save_kwargs["method"] = 6
    out.save(dst, **save_kwargs)
    print(f"Wrote {dst}  ({out.size[0]} x {out.size[1]}, q{args.quality}).")


if __name__ == "__main__":
    main()
