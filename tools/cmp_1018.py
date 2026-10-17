"""정답(위) / 구현(아래) 비교 그림: docs/captures/impl_1018/<화면>_cmp.jpg  ·  python3 tools/cmp_1018.py [화면…]
   픽셀 차(평균 절대차 0~255)도 같이 출력 — 숫자로 판정 (AUDIT_1018 §4-3)"""
import os, sys
from PIL import Image, ImageChops, ImageDraw, ImageStat
D = os.path.join(os.path.dirname(__file__), '../docs/captures/')
names = sys.argv[1:] or ['title', 'lobby', 'battle_start', 'battle', 'victory', 'result', 'heroes', 'popup']
for n in names:
    t, i = D + f'target_1018/{n}.jpg', D + f'impl_1018/{n}.jpg'
    if not (os.path.exists(t) and os.path.exists(i)):
        print(n, '없음'); continue
    a = Image.open(t).convert('RGB').resize((1688, 780)); b = Image.open(i).convert('RGB').resize((1688, 780))
    out = Image.new('RGB', (1688, 1564), (255, 255, 255)); out.paste(a, (0, 0)); out.paste(b, (0, 784))
    d = ImageDraw.Draw(out)
    for y, s in ((4, 'TARGET'), (788, 'IMPL')):
        d.rectangle((4, y, 92, y + 22), fill=(0, 0, 0)); d.text((10, y + 5), s, fill=(255, 255, 0))
    out.save(D + f'impl_1018/{n}_cmp.jpg', quality=85)
    diff = ImageStat.Stat(ImageChops.difference(a, b).convert('L')).mean[0]
    print(f'{n}: 평균 픽셀 차 {diff:.1f}')
