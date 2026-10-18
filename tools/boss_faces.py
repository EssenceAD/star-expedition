"""장 보스 얼굴 (메인 지도 보스 노드 아래 · 형철 10/18): bosses2/<지역>/r0c0 그림의 위쪽(머리) 정사각형 → public/art/ui2/bossface/<지역>.png 72×72 (스프라이트 폴더 밖 · 잘림 검사 대상 아님)"""
from PIL import Image
import glob, os
for d in sorted(glob.glob('public/art/bosses2/*/')):
    im = Image.open(d + 'r0c0.png').convert('RGBA')
    x0, y0, x1, y1 = im.getchannel('A').getbbox()
    w = x1 - x0
    s = int(min(w, y1 - y0) * 0.62)
    cx = (x0 + x1) // 2
    box = (cx - s // 2, y0, cx + s // 2, y0 + s)
    # 일부러 자른 얼굴 · 바탕을 칠한 정사각형
    bg = Image.new('RGBA', (72, 72), (36, 22, 12, 255))
    bg.alpha_composite(im.crop(box).resize((72, 72), Image.LANCZOS))
    bg.save(f"public/art/ui2/bossface/{os.path.basename(d.rstrip('/'))}.png")
    print(os.path.basename(d.rstrip('/')), box)
