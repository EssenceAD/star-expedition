"""W.I.N.D 도트 로고 (UI v3 · 형철 10/18: 타이틀 = 광원 뺀 키아트 + 도트 로고)
   글자 모양(1칸 = 1) → 금빛 세로 단계 + 1칸 짙은 외곽선 + 아래 2칸 그림자 + 별 반짝임 → public/art/ui2/logo.png"""
from PIL import Image
G = {
 'W': ['11.....11','11.....11','11.....11','11..1..11','11..1..11','11.111.11','1111.1111','111...111','11.....11'],
 'I': ['111111','111111','..11..','..11..','..11..','..11..','..11..','111111','111111'],
 'N': ['11....11','111...11','1111..11','11.11.11','11..1111','11...111','11....11','11....11','11....11'],
 'D': ['111111.','1111111','11...111','11....11','11....11','11....11','11...111','1111111','111111.'],
 '.': ['..','..','..','..','..','..','..','11','11'],
}
WORD = ['W', '.', 'I', '.', 'N', '.', 'D', '.']
GAP = 2
# 세로 단계 (위 밝은 금 → 아래 진한 주황)
RAMP = [(255, 246, 200), (255, 232, 140), (255, 214, 102), (255, 200, 80), (250, 180, 60), (240, 160, 48), (226, 138, 40), (206, 116, 32), (180, 96, 28)]
INK = (34, 18, 8)
SHADOW = (20, 10, 30)
H = 9
cols = []
for ch in WORD:
    g = G[ch]; w = len(g[0])
    for x in range(w): cols.append([g[y][x] == '1' for y in range(H)])
    for _ in range(GAP): cols.append([False] * H)
cols = cols[:-GAP]
W0 = len(cols)
PAD = 3
im = Image.new('RGBA', (W0 + PAD * 2, H + PAD * 2 + 2), (0, 0, 0, 0))
fill = {(x + PAD, y + PAD) for x in range(W0) for y in range(H) if cols[x][y]}
# 그림자 (아래 2칸)
for (x, y) in fill:
    for dy in (1, 2):
        p = (x, y + dy + 1)
        if p not in fill: im.putpixel(p, SHADOW + (200,))
# 외곽선
for (x, y) in fill:
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        p = (x + dx, y + dy)
        if p not in fill: im.putpixel(p, INK + (255,))
# 채움 + 윗변 빛 1칸
for (x, y) in fill:
    c = RAMP[y - PAD]
    if (x, y - 1) not in fill: c = (255, 252, 230)
    im.putpixel((x, y), c + (255,))
# 반짝임 별 (I 위 · D 오른쪽 위)
def spark(cx, cy):
    for (dx, dy, a) in ((0, 0, 255), (1, 0, 200), (-1, 0, 200), (0, 1, 200), (0, -1, 200), (2, 0, 120), (-2, 0, 120), (0, 2, 120), (0, -2, 120)):
        p = (cx + dx, cy + dy)
        if 0 <= p[0] < im.width and 0 <= p[1] < im.height: im.putpixel(p, (255, 255, 240, a))
spark(PAD + 13, 1); spark(im.width - 3, 2)
im.save('public/art/ui2/logo.png')
print(im.size)
