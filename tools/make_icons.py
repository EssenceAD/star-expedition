"""앱 아이콘 (바탕화면 설치·홈 화면 추가 · 10/18 정식 오픈) — 타이틀 키아트 하늘 + 도트 로고 W.I.N.D. + 「바람의 원정대」
   사용: python3 tools/make_icons.py  → public/icons/wind-192·512.png · wind-512-maskable.png(안전 영역 80%) · wind-apple-180.png (이름을 바꾸면 설치된 앱도 새 아이콘을 받음)"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

ART = 'public/art/screens/title.jpg'
LOGO = 'public/art/ui2/logo.png'
FONT = 'tools/fonts/Galmuri11-Bold.ttf'  # 갈무리 (OFL · public/fonts/Galmuri-OFL.txt) — PIL은 woff2를 못 읽어 TTF


def base(size, logo_w, sub=True):
    bg = Image.open(ART).convert('RGB')
    W, H = bg.size
    s = H  # 위쪽 하늘·성 부분을 정사각형으로
    x0 = (W - s) // 2
    sq = bg.crop((x0, 0, x0 + s, s)).resize((size, size), Image.LANCZOS)
    sq = ImageEnhance.Brightness(sq).enhance(0.62)
    im = sq.convert('RGBA')
    # 아래로 갈수록 어둡게 (글씨가 또렷하게)
    sh = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    for y in range(size):
        a = int(150 * max(0, (y / size - 0.35) / 0.65))
        d.line([(0, y), (size, y)], fill=(11, 9, 24, a))
    im.alpha_composite(sh)
    logo = Image.open(LOGO).convert('RGBA')
    k = max(1, round(logo_w / logo.width))
    lg = logo.resize((logo.width * k, logo.height * k), Image.NEAREST)
    if lg.width > logo_w:
        lg = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.NEAREST)
    ly = (size - lg.height) // 2 - (size // 14 if sub else 0)
    im.alpha_composite(lg, ((size - lg.width) // 2, ly))
    if sub:
        f = ImageFont.truetype(FONT, max(11, size // 11))
        t = '바람의 원정대'
        d = ImageDraw.Draw(im)
        d.fontmode = '1'
        tw = d.textlength(t, font=f)
        tx, ty = (size - tw) / 2, ly + lg.height + size // 30
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                if dx or dy: d.text((tx + dx, ty + dy), t, font=f, fill=(26, 12, 6, 255))
        d.text((tx, ty), t, font=f, fill=(255, 241, 178, 255))
    return im.convert('RGB')


if __name__ == '__main__':
    base(512, 464).save('public/icons/wind-512.png')
    base(192, 174).save('public/icons/wind-192.png')
    base(180, 162).save('public/icons/wind-apple-180.png')
    base(512, 348).save('public/icons/wind-512-maskable.png')
    print('ok')
