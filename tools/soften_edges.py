# 전투 도트 프레임: 이펙트가 일직선으로 잘린 가장자리 부드럽게 (형철 10/18 「스킬 쓸 때 엣지가 보임」 · 웅스·황짐승)
#  그림 안 어느 세로줄·가로줄에서 「불투명 → 투명」이 한 줄로 길게(그 변 길이의 RATIO 넘게) 끊기면 잘린 변으로 봄
#  → 그 줄 안쪽 FADE px 동안 알파를 0 → 원래로 (팔레트 PNG는 RGBA로 바꿔 저장) · 아래 방향(땅)은 손대지 않음
#  (왈왈 m2r1c1 빛기둥처럼 일부러 곧은 그림은 되돌림)
#  스킬·평타 칸(m2*)만 · 바깥 EDGE 비율 안의 줄만 (지팡이·칼처럼 곧은 몸통 선은 그대로)
#  python3 tools/soften_edges.py public/art/px2 [다른 폴더…] — 한 번 한 그림은 끊긴 줄이 사라져 다시 해도 그대로
import sys, glob, os
import numpy as np
from PIL import Image

FADE, RATIO, A, EDGE = 26, 0.2, 128, 0.25


def cuts(al):
    """(방향, 위치) 목록: 'R' = x열 오른쪽이 잘림 · 'L' = x열 왼쪽 · 'T' = y행 위쪽"""
    op = al > A
    h, w = op.shape
    out = []
    # 오른쪽으로 잘림: x에 있고 x+1에 없음
    r = (op[:, :-1] & ~op[:, 1:]).sum(0)
    for x in np.where(r > RATIO * h)[0]:
        if x > (1 - EDGE) * w:
            out.append(('R', int(x)))
    l = (~op[:, :-1] & op[:, 1:]).sum(0)
    for x in np.where(l > RATIO * h)[0]:
        if x < EDGE * w:
            out.append(('L', int(x) + 1))
    t = (~op[:-1, :] & op[1:, :]).sum(1)
    for y in np.where(t > RATIO * w)[0]:
        if y < EDGE * h:
            out.append(('T', int(y) + 1))
    return out


done = 0
for root in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(root, '**', 'm2*.png'), recursive=True)):
        im = Image.open(f).convert('RGBA')
        a = np.asarray(im, dtype=np.float32).copy()
        al = a[..., 3]
        h, w = al.shape
        cs = cuts(al)
        if not cs:
            continue
        for d, p in cs:
            if d == 'R':
                lo = max(0, p - FADE + 1)
                al[:, lo:p + 1] *= np.linspace(1, 0, p + 1 - lo, dtype=np.float32)[None, :]
            elif d == 'L':
                hi = min(w, p + FADE)
                al[:, p:hi] *= np.linspace(0, 1, hi - p, dtype=np.float32)[None, :]
            else:
                hi = min(h, p + FADE)
                al[p:hi, :] *= np.linspace(0, 1, hi - p, dtype=np.float32)[:, None]
        a[..., 3] = al
        Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA').save(f, optimize=True)
        done += 1
        print(f, cs)
print('softened', done)
