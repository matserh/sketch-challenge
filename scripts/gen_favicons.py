"""Generate favicon PNGs from SVG."""
import cairosvg
from pathlib import Path
from PIL import Image

PUBLIC = Path('/home/z/my-project/public')
SVG = PUBLIC / 'favicon.svg'

sizes = {
    'favicon-32x32.png': 32,
    'favicon-16x16.png': 16,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512,
}

for name, size in sizes.items():
    out = PUBLIC / name
    cairosvg.svg2png(
        url=str(SVG),
        write_to=str(out),
        output_width=size,
        output_height=size,
    )
    print(f'Generated {out} ({size}x{size})')

# ICO file (multi-resolution)
imgs = []
for size in [16, 32, 48]:
    p = PUBLIC / f'favicon-{size}x{size}.png'
    if p.exists():
        imgs.append(Image.open(p))

ico_path = PUBLIC / 'favicon.ico'
imgs[0].save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print(f'Generated {ico_path}')
print('\nAll favicons generated.')
