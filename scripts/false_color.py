import os

from PIL import Image


def generate_lut():
    keypoints = [
        (0, (35, 20, 30)),      
        (45, (70, 60, 65)),     
        (100, (105, 145, 145)),  
        (160, (175, 160, 130)),  
        (210, (235, 180, 120)),  
        (255, (255, 220, 180))   
    ]
    
    palette = []
    for i in range(256):
        if i <= keypoints[0][0]:
            palette.extend(keypoints[0][1])
        elif i >= keypoints[-1][0]:
            palette.extend(keypoints[-1][1])
        else:
            for j in range(len(keypoints)-1):
                v1, c1 = keypoints[j]
                v2, c2 = keypoints[j+1]
                if v1 <= i <= v2:
                    ratio = (i - v1) / (v2 - v1)
                    r = int(c1[0] + (c2[0] - c1[0]) * ratio)
                    g = int(c1[1] + (c2[1] - c1[1]) * ratio)
                    b = int(c1[2] + (c2[2] - c1[2]) * ratio)
                    palette.extend([r, g, b])
                    break
    return palette

def apply_complex_false_color(input_filename, output_filename):
    if not os.path.exists(input_filename):
        print(f"Error: {input_filename} not found.")
        return

    # Convert to 8-bit grayscale
    img = Image.open(input_filename).convert('L')
    
    # Apply the custom 256-color palette to the grayscale image
    img.putpalette(generate_lut())
    
    # Convert back to standard RGB to save as JPEG
    colored_img = img.convert('RGB')
    colored_img.save(output_filename, quality=95)
    print(f"Success. False color map saved as {output_filename}")

if __name__ == "__main__":
    input_file = 'titan_bw.jpg'
    output_file = 'titan_false_color.jpg'
    
    apply_complex_false_color(input_file, output_file)