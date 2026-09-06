"""
helper: find the polar-vortex eye in a Cassini polar-view image.

"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

src = sys.argv[1] if len(sys.argv) > 1 else "PIA17175_Painted_Lines_Hexagon.tif"

im = Image.open(src).convert("RGB")
rgb = np.asarray(im)
gray = rgb.mean(axis=2)
print(f"image: {im.size}")


mask = gray > (0.10 * gray.max())
eroded = ndimage.binary_erosion(mask, iterations=20)
labels, n = ndimage.label(eroded)
if n == 0:
    raise SystemExit("No disk found.")
sizes = ndimage.sum(eroded, labels, index=np.arange(1, n + 1))
disk = labels == (int(np.argmax(sizes)) + 1)
cy_disk, cx_disk = ndimage.center_of_mass(disk)
print(f"disk centroid: ({cx_disk:.0f}, {cy_disk:.0f})")

LIT_THRESHOLD = 0.50
lit_mask = (gray > LIT_THRESHOLD * gray.max()) & disk
print(f"lit region pixel count: {lit_mask.sum()} (centroid mask: {disk.sum()})")

smoothed = ndimage.gaussian_filter(gray, sigma=8)
masked = np.where(lit_mask, smoothed, 1e9)
py, px = np.unravel_index(np.argmin(masked), masked.shape)
print(f"darkest spot in lit region (polar vortex): ({px}, {py})")
print(f"raw brightness at that spot: {gray[py, px]:.1f}")
print(f"  → use --center {px},{py} in prepare_polar_hexagon.py")

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 8))
ax.imshow(rgb)
ax.scatter([cx_disk], [cy_disk], c="cyan", s=80, marker="+", label="disk centroid")
ax.scatter([px], [py], c="red", s=80, marker="x", label="detected pole")
ax.legend()
ax.set_title(f"PIA17175 pole detection — pole at ({px}, {py})")
fig.savefig("PIA17175_pole_detection.png", dpi=80, bbox_inches="tight")
print("Wrote PIA17175_pole_detection.png")
