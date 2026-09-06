import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def detect_disk_center(rgb: np.ndarray) -> tuple[tuple[float, float], float]:
    """
    Same approach as make_limb_lut.py — threshold + erode + centroid.

    Returns ((cx, cy), radius_in_pixels).
    """
    gray = rgb.mean(axis=2)
    mask = gray > (0.10 * gray.max())
    eroded = ndimage.binary_erosion(mask, iterations=20)
    labels, n = ndimage.label(eroded)
    if n == 0:
        raise RuntimeError("Disk not detected. Try --center manually.")
    sizes = ndimage.sum(eroded, labels, index=np.arange(1, n + 1))
    disk = labels == (int(np.argmax(sizes)) + 1)
    cy, cx = ndimage.center_of_mass(disk)
    ys, xs = np.where(disk)
    radius = float(np.percentile(np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2), 80))
    return (float(cx), float(cy)), radius


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--center", default=None, help="Manual 'X,Y' center.")
    parser.add_argument("--crop-fraction", type=float, default=1.0)
    parser.add_argument("--size", type=int, default=1024)
    args = parser.parse_args()

    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img)
    print(f"  source size: {img.size[0]} × {img.size[1]} pixels")

    if args.center is not None:
        cx, cy = (float(v) for v in args.center.split(","))
        radius = min(img.size) * 0.4
        print(f"  using center=({cx:.1f}, {cy:.1f})  radius={radius:.1f} px")
    else:
        print("Detecting disk ...")
        (cx, cy), radius = detect_disk_center(rgb)
        print(f"  detected: center=({cx:.1f}, {cy:.1f})  radius={radius:.1f} px")

    half = radius * args.crop_fraction
    box = (
        max(0, int(cx - half)),
        max(0, int(cy - half)),
        min(img.size[0], int(cx + half)),
        min(img.size[1], int(cy + half)),
    )
    print(f"  cropping box {box}")
    cropped = img.crop(box).resize((args.size, args.size), Image.LANCZOS)
    cropped.save(dst)
    print(f"Wrote {dst}  ({args.size}x{args.size}).")


if __name__ == "__main__":
    main()
