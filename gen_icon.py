from pathlib import Path
from PIL import Image, ImageDraw

p = Path('assets/icon.ico')
size = (256, 256)
im = Image.new('RGBA', size, (30, 136, 229, 255))
d = ImageDraw.Draw(im)
d.ellipse((32, 32, 224, 224), fill=(16, 185, 129, 255))
d.text((100, 90), 'N', (255, 255, 255, 255))
im.save(p, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32)])
print('created', p, 'size', im.size)
