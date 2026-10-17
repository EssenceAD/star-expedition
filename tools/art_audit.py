"""그림 잘림 검사 (ART_RULES_1018 §3). python3 tools/art_audit.py [폴더...]
투명 PNG: 그림 내용이 칸 가장자리 6px 띠에 연속으로 22% 이상 닿으면 '잘림'.
검정 배경 JPG(이펙트): 가장자리 1px에 밝기 35 넘는 점이 2% 넘으면 '잘림'.
잘린 게 하나라도 있으면 종료 코드 1 (테스트 실패)."""
import sys, glob, numpy as np
from PIL import Image
def run_frac(arr):
    best = cur = 0
    for v in arr:
        cur = cur + 1 if v else 0; best = max(best, cur)
    return best / max(1, len(arr))
def check(f, n=6, lim=0.22):
    im = Image.open(f)
    if f.endswith('.jpg'):
        a = np.asarray(im.convert('L'))
        e = {k: (v > 35).mean() for k, v in {'L': a[:, 0], 'R': a[:, -1], 'T': a[0], 'B': a[-1]}.items()}
        return {k: round(v, 2) for k, v in e.items() if v > 0.02}
    a = np.asarray(im.convert('RGBA'))[..., 3]; bb = im.getbbox()
    if not bb: return {}
    b = a[bb[1]:bb[3], bb[0]:bb[2]] > 15
    r = {'L': run_frac(b[:, :n].any(1)), 'R': run_frac(b[:, -n:].any(1)), 'T': run_frac(b[:n].any(0))}
    return {k: round(v, 2) for k, v in r.items() if v > lim}
DEFAULT = ['public/art/px2/*/*.png', 'public/art/mobs2/*/*.png', 'public/art/bosses2/*/*.png',
           'public/art/raidboss/anim*/*.png', 'public/art/worldboss/anim*/*.png', 'public/art/fullbody/*.png', 'public/art/fx/*/*.jpg']
if __name__ == '__main__':
    pats = sys.argv[1:] or DEFAULT; bad = 0
    for p in pats:
        for f in sorted(glob.glob(p)):
            r = check(f)
            if r: bad += 1; print('잘림', f, r)
    print('잘린 그림', bad, '장'); sys.exit(1 if bad else 0)
