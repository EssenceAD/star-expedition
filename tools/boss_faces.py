"""장 보스 얼굴 (메인 지도 보스 노드 아래 · 형철 10/18): bosses2/<지역>/r0c0 그림의 위쪽(머리) 정사각형 → face.png 72×72"""
from PIL import Image
import glob, os
for d in sorted(glob.glob('public/art/bosses2/*/')):
    im = Image.open(d + 'r0c0.png').convert('RGBA')
    x0, y0, x1, y1 = im.getchannel('A').getbbox()
    w = x1 - x0
    s = int(min(w, y1 - y0) * 0.62)
    cx = (x0 + x1) // 2
    box = (cx - s // 2, y0, cx + s // 2, y0 + s)
    im.crop(box).resize((72, 72), Image.LANCZOS).save(d + 'face.png')
    print(os.path.basename(d.rstrip('/')), box)
