import os
import sys

from PIL import Image

# Disable the pixel limit for massive textures
Image.MAX_IMAGE_PIXELS = None

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PLACEHOLDER = os.path.join(BASE_DIR, "placeholders")
OUT_OPTIMIZED = os.path.join(BASE_DIR, "optimized")

TEX_SOURCES = [
    {"src": "titan.jpg",             "out": "titan.webp",            "quality": 90},
    {"src": "titan_hazy.png",        "out": "titan_hazy.webp",       "quality": 90},
    {"src": "titan_false_color.jpg", "out": "titan_false_color.webp","quality": 95},
    {"src": "iapetus.jpg",           "out": "iapetus.webp",          "quality": 87},
    {"src": "enceladus.jpg",         "out": "enceladus.webp",        "quality": 85},
    {"src": "mimas.jpg",             "out": "mimas.webp",            "quality": 92},
    {"src": "rhea.jpg",              "out": "rhea.webp",             "quality": 87},
    {"src": "dione.jpg",             "out": "dione.webp",            "quality": 90},
    {"src": "tethys.jpg",            "out": "tethys.webp",           "quality": 87},
    {"src": "8k_saturn.jpg",         "out": "saturn.webp",           "quality": 92},
    {"src": "titan_IR.png",          "out": "titan_ir.webp",         "quality": 95},
    {"src": "enceladus_IR.jpg",      "out": "enceladus_IR.webp",     "quality": 95}
] 

def optimize():
    # Re-create directories
    if not os.path.exists(OUT_PLACEHOLDER):
        os.makedirs(OUT_PLACEHOLDER)
    if not os.path.exists(OUT_OPTIMIZED):
        os.makedirs(OUT_OPTIMIZED)

    
    total_in = 0
    total_opt = 0

    for tex in TEX_SOURCES:
        src_path = os.path.join(BASE_DIR, tex["src"])
        ph_path = os.path.join(OUT_PLACEHOLDER, tex["out"])
        op_path = os.path.join(OUT_OPTIMIZED, tex["out"])

        if not os.path.exists(src_path):
            print(f"SKIP {tex['src']}: Not found at {src_path}")
            continue

        try:
            with Image.open(src_path) as img:
                if img.mode != "RGB":
                    img = img.convert("RGB")
                
                orig_w, orig_h = img.size
                in_size = os.path.getsize(src_path)
                
                # Placeholder
                ph_img = img.copy()
                ph_img.thumbnail((512, 512), Image.Resampling.LANCZOS)
                ph_img.save(ph_path, "WEBP", quality=85, method=6)
                
                # Optimized
                is_saturn = "saturn" in tex["src"].lower()
                target_width = 8192 if not is_saturn else orig_w
                
                if orig_w > target_width:
                    print(f"  Resizing {tex['src']}...")
                    new_h = int(orig_h * (target_width / orig_w))
                    op_img = img.resize((target_width, new_h), Image.Resampling.LANCZOS)
                else:
                    print(f"  Using original {orig_w}px for {tex['src']}...")
                    op_img = img.copy()

                op_img.save(op_path, "WEBP", 
                            quality=tex["quality"], 
                            method=6, 
                            exact=True, 
                            lossless=False)

                op_size = os.path.getsize(op_path)
                total_in += in_size
                total_opt += op_size

                reduction = (1 - (op_size / in_size)) * 100
                print(f"  DONE: {tex['src']:20} | In: {in_size/1024/1024:5.2f}MB | Out: {op_size/1024/1024:5.2f}MB ({reduction:.1f}% smaller)")

        except Exception as e:
            print(f"  ERROR {tex['src']}: {type(e).__name__}: {e}")

    print(f"\nFinal Stats:")
    print(f"  Source:       {total_in/1024/1024:7.2f} MB")
    print(f"  Optimized:    {total_opt/1024/1024:7.2f} MB")

if __name__ == "__main__":
    optimize()