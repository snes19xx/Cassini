import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# Disk detection

def detect_saturn_disk(rgb: np.ndarray) -> tuple[tuple[float, float], float]:
    """
    Estimate Saturn's disk center and radius from a Cassini image.
    """
    gray = rgb.mean(axis=2)

    # Threshold at 10% of peak. Picks up the disk + rings + any glint.
    mask = gray > (0.10 * gray.max())

    # Erode aggressively so only the planet body survives.
    eroded = ndimage.binary_erosion(mask, iterations=25)

    # Largest remaining connected component = disk.
    labels, n_labels = ndimage.label(eroded)
    if n_labels == 0:
        raise RuntimeError(
            "Could not detect Saturn's disk. Try --center and --radius manually."
        )
    sizes = ndimage.sum(eroded, labels, index=np.arange(1, n_labels + 1))
    disk_label = int(np.argmax(sizes)) + 1
    disk_mask = labels == disk_label

    # Centroid: pixel coordinates of disk's center of mass.
    cy, cx = ndimage.center_of_mass(disk_mask)

    # Radius: 80th percentile of distances from centroid to disk pixels.
    ys, xs = np.where(disk_mask)
    distances = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    radius = float(np.percentile(distances, 80))

    return (float(cx), float(cy)), radius


# Radial sampling

def sample_radials(
    rgb: np.ndarray,
    center: tuple[float, float],
    radius_px: float,
    n_radials: int,
    inner_frac: float,
    outer_frac: float,
    arc_center_deg: float,
    arc_half_width_deg: float,
    n_samples: int = 512,
) -> np.ndarray:
    """
    Sample n_radials lines radiating outward from `center`.
    Returns array shape (n_radials, n_samples, 3) dtype float.
    """
    cx, cy = center
    h, w = rgb.shape[:2]

    # Angles in radians
    angles = np.deg2rad(
        np.linspace(
            arc_center_deg - arc_half_width_deg,
            arc_center_deg + arc_half_width_deg,
            n_radials,
            endpoint=False,
        )
    )

    # Radii: the samples each line takes, from inner to outer.
    radii = np.linspace(radius_px * inner_frac, radius_px * outer_frac, n_samples)

    # Outer product: each row is one radial, each column is one radius.
    cosines = np.cos(angles)[:, None]  # (n_radials, 1)
    sines = np.sin(angles)[:, None]
    sample_xs = cx + cosines * radii[None, :]  # (n_radials, n_samples)
    sample_ys = cy + sines * radii[None, :]

    # Bilinear interpolation. Clamp to valid index range first.
    sample_xs = np.clip(sample_xs, 0.0, w - 1.001)
    sample_ys = np.clip(sample_ys, 0.0, h - 1.001)
    x0 = np.floor(sample_xs).astype(int)
    y0 = np.floor(sample_ys).astype(int)
    fx = sample_xs - x0
    fy = sample_ys - y0

    rgb_f = rgb.astype(np.float32)
    samples = (
        rgb_f[y0, x0]         * ((1 - fx) * (1 - fy))[:, :, None]
        + rgb_f[y0, x0 + 1]   * (fx       * (1 - fy))[:, :, None]
        + rgb_f[y0 + 1, x0]   * ((1 - fx) * fy)[:, :, None]
        + rgb_f[y0 + 1, x0 + 1] * (fx     * fy)[:, :, None]
    )

    return samples  # (n_radials, n_samples, 3), float


# Reduction to LUT 

def reduce_to_lut(
    samples: np.ndarray, out_width: int = 32, out_height: int = 512
) -> np.ndarray:
    """
    Collapse (n_radials, 512, 3) into an (out_height, out_width, 3) uint8 image.
    """
    # Median across the radial axis --> (n_samples, 3) gradient.
    profile = np.median(samples, axis=0)

    # If n_samples != out_height, resample.
    if profile.shape[0] != out_height:
        ts = np.linspace(0, profile.shape[0] - 1, out_height)
        profile = np.stack(
            [np.interp(ts, np.arange(profile.shape[0]), profile[:, c]) for c in range(3)],
            axis=1,
        )

    # Tile horizontally to produce the final 32×512 texture.
    lut = np.broadcast_to(profile[:, None, :], (out_height, out_width, 3)).copy()
    return np.clip(lut, 0, 255).astype(np.uint8)


# Preview

def save_preview(
    rgb: np.ndarray,
    center: tuple[float, float],
    radius_px: float,
    inner_frac: float,
    outer_frac: float,
    arc_center_deg: float,
    arc_half_width_deg: float,
    out_path: Path,
) -> None:
    preview = rgb.copy()
    cx, cy = center
    h, w = preview.shape[:2]
    yy, xx = np.indices((h, w))
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    inner_band = np.abs(dist - radius_px * inner_frac) < 2.0
    outer_band = np.abs(dist - radius_px * outer_frac) < 2.0
    preview[inner_band] = [0, 255, 255]
    preview[outer_band] = [255, 0, 255]
    angles = np.deg2rad(
        np.linspace(
            arc_center_deg - arc_half_width_deg,
            arc_center_deg + arc_half_width_deg,
            60,
            endpoint=False,
        )
    )
    for a in angles:
        px = int(cx + np.cos(a) * radius_px * outer_frac)
        py = int(cy + np.sin(a) * radius_px * outer_frac)
        if 3 <= px < w - 3 and 3 <= py < h - 3:
            preview[py - 3 : py + 4, px - 3 : px + 4] = [255, 64, 64]

    Image.fromarray(preview).save(out_path)
    print(f"  preview written to {out_path}")


# Entry point

def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--center", default=None, help="Manual 'X,Y' center.")
    parser.add_argument("--radius", type=float, default=None)
    parser.add_argument("--n-radials", type=int, default=90)
    parser.add_argument("--inner-fraction", type=float, default=0.30)
    parser.add_argument("--outer-fraction", type=float, default=1.30)
    parser.add_argument("--arc-deg", type=float, default=360.0)
    parser.add_argument("--arc-center", type=float, default=0.0)
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img)

    if args.center is not None and args.radius is not None:
        cx, cy = (float(v) for v in args.center.split(","))
        center, radius = (cx, cy), float(args.radius)
        print(f"  using disk: center=({cx:.1f}, {cy:.1f})  radius={radius:.1f} px")
    else:
        center, radius = detect_saturn_disk(rgb)
        print(f"  detected: center=({center[0]:.1f}, {center[1]:.1f})  radius={radius:.1f} px")

    print(f"Sampling {args.n_radials} radial lines across {args.arc_deg}° ...")
    samples = sample_radials(
        rgb,
        center,
        radius,
        args.n_radials,
        args.inner_fraction,
        args.outer_fraction,
        args.arc_center,
        args.arc_deg / 2.0,
    )

    print("Reducing to LUT (median across radials) ...")
    lut = reduce_to_lut(samples)
    print(f"  LUT shape: {lut.shape}  (height x width x channels)")

    print(f"Writing {dst} ...")
    Image.fromarray(lut).save(dst)

    if args.preview:
        preview_path = dst.with_name(dst.stem + ".preview.png")
        save_preview(
            rgb,
            center,
            radius,
            args.inner_fraction,
            args.outer_fraction,
            args.arc_center,
            args.arc_deg / 2.0,
            preview_path,
        )

    print("Done.")


if __name__ == "__main__":
    main()
