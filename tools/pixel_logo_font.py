"""W.I.N.D 로고를 무료 도트 글꼴(OFL)로 찍기 — tools/pixel_logo.py 와 같은 칠(위 크림 금 → 아래 주황 · 윗변 빛 · 아랫변 그늘 · 이중 외곽 · 그림자 · 별)
   사용: python3 tools/pixel_logo_font.py 글꼴.ttf 크기 출력.png [글자] [굵기(가변 글꼴)]  · 글꼴은 안티앨리어싱 없이(1비트) 찍어 점이 또렷하게
   지금 로고 (10/18 · 형철 스케치: 멋드러진 굵은 기울임 글씨를 도트로): python3 tools/pixel_logo_font.py tools/fonts/PlayfairDisplay-Italic.ttf 56 public/art/ui2/logo.png W.I.N.D. 900
   (Playfair Display Black Italic · OFL · tools/fonts/PlayfairDisplay-OFL.txt) · 후보 비교 docs/captures/logo_calli_1018.jpg · 이전 도트 글꼴 비교 docs/captures/logo_fonts_1018.jpg"""
import sys
from PIL import Image, ImageDraw, ImageFont

def make(font_path, size, out, text='W.I.N.D.', wght=None):
    f = ImageFont.truetype(font_path, size)
    if wght: f.set_variation_by_axes([wght])
    l, t, r, b = f.getbbox(text)
    w, h = r - l + 4, b - t + 4
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.fontmode = '1'
    d.text((2 - l, 2 - t), text, font=f, fill=255)
    bb = m.getbbox()
    m = m.crop(bb)
    W0, H = m.size
    PAD = 4
    im = Image.new('RGBA', (W0 + PAD * 2 + 3, H + PAD * 2 + 4), (0, 0, 0, 0))
    fill = {(x + PAD, y + PAD) for x in range(W0) for y in range(H) if m.getpixel((x, y)) > 127}
    RAMP = [(255, 249, 214), (255, 241, 178), (255, 231, 146), (255, 222, 120), (255, 213, 100), (255, 204, 86), (253, 194, 74), (250, 184, 64),
            (246, 172, 56), (240, 160, 50), (233, 148, 44), (224, 136, 40), (214, 124, 36), (202, 112, 32), (188, 100, 30), (172, 88, 28), (156, 78, 26), (140, 68, 24)]
    HI, SH, O1, O2, DROP = (255, 254, 240), (120, 56, 20), (92, 42, 14), (26, 12, 6), (16, 8, 28)
    N8 = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))
    N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    o1 = {(x + dx, y + dy) for (x, y) in fill for dx, dy in N4} - fill
    o2 = {(x + dx, y + dy) for (x, y) in fill | o1 for dx, dy in N8} - fill - o1
    body = fill | o1 | o2
    for (x, y) in body:
        for dd in (2, 3):
            p = (x + dd - 1, y + dd)
            if p not in body and 0 <= p[0] < im.width and 0 <= p[1] < im.height: im.putpixel(p, DROP + (170,))
    for p in o2: im.putpixel(p, O2 + (255,))
    for p in o1: im.putpixel(p, O1 + (255,))
    for (x, y) in fill:
        r = y - PAD
        k = min(len(RAMP) - 1, int(r / max(1, H - 1) * (len(RAMP) - 1)))
        c = RAMP[k]
        if k < len(RAMP) - 1 and (x + y) % 2 == 0 and r % 3 == 2: c = RAMP[k + 1]
        if (x, y - 1) not in fill: c = HI
        elif (x, y + 1) not in fill: c = SH
        im.putpixel((x, y), c + (255,))
    def spark(cx, cy, big=True):
        pts = [(0, 0, 255), (1, 0, 220), (-1, 0, 220), (0, 1, 220), (0, -1, 220)]
        if big: pts += [(2, 0, 150), (-2, 0, 150), (0, 2, 150), (0, -2, 150), (3, 0, 70), (-3, 0, 70), (0, 3, 70), (0, -3, 70)]
        for (dx, dy, a) in pts:
            p = (cx + dx, cy + dy)
            if 0 <= p[0] < im.width and 0 <= p[1] < im.height and im.getpixel(p)[3] == 0: im.putpixel(p, (255, 255, 236, a))
    spark(PAD + W0 // 4, 2); spark(im.width - 5, 4); spark(PAD + W0 * 3 // 5, PAD + 1, False)
    im.save(out)
    return im

if __name__ == '__main__':
    a = sys.argv[1:]
    print(make(a[0], int(a[1]), a[2], a[3] if len(a) > 3 else 'W.I.N.D.', int(a[4]) if len(a) > 4 else None).size)
