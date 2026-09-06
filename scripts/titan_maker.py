import sys
from pathlib import Path

import numpy as np
from PIL import Image

INPUT_DIR     = Path(".")
OUTPUT_FILE   = Path("titan_equirect.png")
FACE_SIZE     = 1561
OUTPUT_WIDTH  = 4096
OUTPUT_HEIGHT = 2048

SPHERE_CX = (FACE_SIZE - 1) / 2.0
SPHERE_CY = (FACE_SIZE - 1) / 2.0
SPHERE_R  = (FACE_SIZE - 1) / 2.0

FACES = {
    "front":  {"file": "front.png",  "dir": np.array([ 0.,  0.,  1.]), "right": np.array([ 1.,  0.,  0.]), "up": np.array([ 0.,  1.,  0.])},
    "back":   {"file": "back.png",   "dir": np.array([ 0.,  0., -1.]), "right": np.array([-1.,  0.,  0.]), "up": np.array([ 0.,  1.,  0.])},
    "right":  {"file": "right.png",  "dir": np.array([ 1.,  0.,  0.]), "right": np.array([ 0.,  0., -1.]), "up": np.array([ 0.,  1.,  0.])},
    "left":   {"file": "left.png",   "dir": np.array([-1.,  0.,  0.]), "right": np.array([ 0.,  0.,  1.]), "up": np.array([ 0.,  1.,  0.])},
    "top":    {"file": "top.png",    "dir": np.array([ 0.,  1.,  0.]), "right": np.array([ 1.,  0.,  0.]), "up": np.array([ 0.,  0., -1.])},
    "bottom": {"file": "bottom.png", "dir": np.array([ 0., -1.,  0.]), "right": np.array([ 1.,  0.,  0.]), "up": np.array([ 0.,  0.,  1.])},
}

def load_face(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    if img.size != (FACE_SIZE, FACE_SIZE):
        print(f"  Resizing {path.name}: {img.size} -> ({FACE_SIZE}, {FACE_SIZE})")
        img = img.resize((FACE_SIZE, FACE_SIZE), Image.LANCZOS)
    return np.array(img, dtype=np.float32)

def bilinear_sample(img: np.ndarray, px: np.ndarray, py: np.ndarray) -> np.ndarray:
    H, W, _ = img.shape
    x0 = np.clip(np.floor(px).astype(np.int32),     0, W - 1)
    x1 = np.clip(np.floor(px).astype(np.int32) + 1, 0, W - 1)
    y0 = np.clip(np.floor(py).astype(np.int32),     0, H - 1)
    y1 = np.clip(np.floor(py).astype(np.int32) + 1, 0, H - 1)
    fx = (px - np.floor(px))[..., np.newaxis]
    fy = (py - np.floor(py))[..., np.newaxis]
    return (img[y0, x0] * (1 - fx) * (1 - fy) +
            img[y0, x1] * fx  * (1 - fy) +
            img[y1, x0] * (1 - fx) * fy  +
            img[y1, x1] * fx  * fy).astype(np.float64)

def convert():
    lons = np.linspace(-np.pi,      np.pi,      OUTPUT_WIDTH,  endpoint=False)
    lats = np.linspace( np.pi / 2, -np.pi / 2, OUTPUT_HEIGHT, endpoint=False)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    Px = np.cos(lat_grid) * np.sin(lon_grid)
    Py = np.sin(lat_grid)
    Pz = np.cos(lat_grid) * np.cos(lon_grid)

    accum_rgb    = np.zeros((OUTPUT_HEIGHT, OUTPUT_WIDTH, 3), dtype=np.float64)
    accum_weight = np.zeros((OUTPUT_HEIGHT, OUTPUT_WIDTH),    dtype=np.float64)

    for name, cfg in FACES.items():
        path = INPUT_DIR / cfg["file"]
        if not path.exists():
            sys.exit(f"ERROR: missing face: {path}")
        print(f"  Processing {name}...")

        face = load_face(path)
        D, R, U = cfg["dir"], cfg["right"], cfg["up"]

        dot_d = Px * D[0] + Py * D[1] + Pz * D[2]
        dot_r = Px * R[0] + Py * R[1] + Pz * R[2]
        dot_u = Px * U[0] + Py * U[1] + Pz * U[2]

        px = dot_r * SPHERE_R + SPHERE_CX
        py = dot_u * -SPHERE_R + SPHERE_CY

        sampled = bilinear_sample(face, px, py)
        alpha   = sampled[..., 3] / 255.0

        weight = np.where((dot_d > 0.5) & (alpha > 0.95), dot_d ** 8, 0.0)

        accum_rgb    += sampled[..., :3] * weight[..., np.newaxis]
        accum_weight += weight

    safe_w = np.maximum(accum_weight, 1e-10)[..., np.newaxis]
    rgb    = np.clip(accum_rgb / safe_w, 0, 255).astype(np.uint8)

    Image.fromarray(rgb, mode="RGB").save(OUTPUT_FILE)
    print(f"\nSaved: {OUTPUT_FILE.resolve()}  ({OUTPUT_WIDTH} x {OUTPUT_HEIGHT})")

if __name__ == "__main__":
    print(f"Building equirectangular map ({OUTPUT_WIDTH} x {OUTPUT_HEIGHT})...")
    convert()