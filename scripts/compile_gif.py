import os
import sys
from PIL import Image

def make_gif(frames_dir, output_path, duration=110):
    files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    if not files:
        print("No PNG frames found in", frames_dir)
        sys.exit(1)

    print(f"Loading {len(files)} frames from {frames_dir}...")
    images = []
    for f in files:
        img_path = os.path.join(frames_dir, f)
        im = Image.open(img_path).convert('RGB')
        # Resize to 960x540 for optimal GitHub README bandwidth and crispness
        im_resized = im.resize((960, 540), Image.Resampling.LANCZOS)
        # Quantize to adaptive 128-color palette for sharp rendering and tiny size
        quantized = im_resized.quantize(colors=128, method=Image.Resampling.LANCZOS)
        images.append(quantized)

    print(f"Compiling GIF to {output_path}...")
    images[0].save(
        output_path,
        save_all=True,
        append_images=images[1:],
        duration=duration,
        loop=0,
        optimize=True
    )
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"GIF generated successfully: {output_path} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    frames_dir = sys.argv[1] if len(sys.argv) > 1 else 'docs/assets/frames'
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'docs/assets/arachnemind-crawler-demo.gif'
    make_gif(frames_dir, output_path)
