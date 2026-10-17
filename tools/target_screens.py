"""정답 화면 v2 — kit2 부품 이름 그대로 사용. 좌표는 논리 px(844x390), 안전 여백 16px."""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
K2=os.path.join(os.path.dirname(__file__),'../public/art/ui/kit2/')
A=os.path.join(os.path.dirname(__file__),'../public/art/')
FD=os.path.join(os.path.dirname(__file__),'fonts/')
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'../docs/captures/target_1018/')
os.makedirs(OUT,exist_ok=True)
KIT=json.load(open(K2+'_kit.json'))
S=2; W,H=844*S,390*S; SAFE=16
def F(sz,f='ga1_800'): return ImageFont.truetype(FD+f+'.ttf', int(sz*S))
def src(n): return Image.open(K2+n+'.png').convert('RGBA')
def part(n,w=None,h=None,flip=False):
    im=src(n)
    if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
    if w and h: return im.resize((int(w*S),int(h*S)),Image.LANCZOS)
    if w: return im.resize((int(w*S),int(im.height*w*S/im.width)),Image.LANCZOS)
    if h: return im.resize((int(im.width*h*S/im.height),int(h*S)),Image.LANCZOS)
    return im
def nine(n,w,h,corner=None):
    """9-slice by _kit.json slice; corner = target corner size in logical px (default: source slice * scale where height fits)."""
    im=src(n); sw,sh=im.size; m=KIT[n]['slice'][0]
    W2,H2=int(w*S),int(h*S)
    t=int(corner*S) if corner else int(m*min(1,H2/sh))
    t=max(1,min(t,W2//2-1,H2//2-1)); out=Image.new('RGBA',(W2,H2))
    xs=[0,m,sw-m,sw]; ys=[0,m,sh-m,sh]; X=[0,t,W2-t,W2]; Y=[0,t,H2-t,H2]
    for i in range(3):
        for j in range(3):
            if X[i+1]<=X[i] or Y[j+1]<=Y[j]: continue
            out.alpha_composite(im.crop((xs[i],ys[j],xs[i+1],ys[j+1])).resize((X[i+1]-X[i],Y[j+1]-Y[j]),Image.LANCZOS),(X[i],Y[j]))
    return out
def put(c,im,x,y,anchor='lt'):
    X,Y=x*S,y*S
    if anchor=='mm': X-=im.width/2; Y-=im.height/2
    if anchor=='mb': X-=im.width/2; Y-=im.height
    if anchor=='rt': X-=im.width
    c.alpha_composite(im,(int(X),int(Y)))
def text(c,s,x,y,sz,fill=(255,240,210),anchor='la',f='ga1_800',stroke=1.2):
    ImageDraw.Draw(c).text((x*S,y*S),s,font=F(sz,f),fill=fill,anchor=anchor,stroke_width=int(stroke*S),stroke_fill=(15,14,30))
def inner(n,x,y,w,h):
    """returns inner content rect (logical) of a part drawn at x,y,w,h"""
    k=KIT[n]; sx=w/k['w']; sy=h/k['h']; l,t,r,b=k['inset']
    return x+l*sx, y+t*sy, w-(l+r)*sx, h-(t+b)*sy
def bar(c,x,y,w,h,ratio,col,frame='bar'):
    put(c,nine(frame,w,h,corner=h/2),x,y)
    ix,iy,iw,ih=inner(frame,x,y,w,h) if KIT[frame]['h']<=h*S*4 else (x+h*0.3,y+h*0.25,w-h*0.6,h*0.5)
    ix,iy,iw,ih=x+h*0.32,y+h*0.26,w-h*0.64,h*0.48
    ImageDraw.Draw(c).rectangle((ix*S,iy*S,(ix+iw*ratio)*S,(iy+ih)*S),fill=col)
def cover(path):
    bg=Image.open(path).convert('RGBA'); sc=max(W/bg.width,H/bg.height); bg=bg.resize((int(bg.width*sc)+1,int(bg.height*sc)+1),Image.LANCZOS)
    return bg.crop(((bg.width-W)//2,(bg.height-H)//2,(bg.width-W)//2+W,(bg.height-H)//2+H))
def dim(c,a=150): c.alpha_composite(Image.new('RGBA',c.size,(8,10,22,a)))
def fullbody(hid,h):
    fb=Image.open(A+f'fullbody/{hid}.png').convert('RGBA'); fb=fb.crop(fb.getbbox())
    return fb.resize((int(fb.width*h*S/fb.height),int(h*S)),Image.LANCZOS)
def socket_icon(c,x,y,sz,icon,frame='socket'):
    fr=part(frame,sz,sz); ix,iy,iw,ih=inner(frame,x,y,sz,sz)
    ic=Image.open(icon).convert('RGBA').resize((int(iw*S)+2,int(ih*S)+2),Image.LANCZOS)
    c.alpha_composite(ic,(int(ix*S)-1,int(iy*S)-1)); put(c,fr,x,y)
def shadow(c,x,y,w):
    sh=Image.new('RGBA',(int(w*S),int(w*0.28*S)),(0,0,0,0)); ImageDraw.Draw(sh).ellipse((0,0,sh.width-1,sh.height-1),fill=(10,12,8,120))
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3*S)),(int((x-w/2)*S),int((y-w*0.14)*S)))
def bust(hid,h,maxw):
    fb=Image.open(A+f'fullbody/{hid}.png').convert('RGBA'); fb=fb.crop(fb.getbbox()); b=fb.crop((0,0,fb.width,int(fb.height*0.42)))
    s=h*S/b.height; b=b.resize((int(b.width*s),int(b.height*s)),Image.LANCZOS); mw=int(maxw*S)
    if b.width>mw: l=(b.width-mw)//2; b=b.crop((l,0,l+mw,b.height))
    m=b.split()[3]; g=Image.linear_gradient('L').rotate(180).resize((b.width,int(b.height*0.25)))
    fade=Image.new('L',b.size,255); fade.paste(g,(0,b.height-g.height)); b.putalpha(ImageChops.multiply(m,fade)); return b

# ================= BATTLE =================
def battle():
    c=cover(A+'bgs/region_forest.jpg')
    def sprite(hid,key,fx_,fy,hgt):
        path=A+f'px2/{hid}/'; pj=json.load(open(path+'_parts.json'))[key]; im=Image.open(path+key+'.png').convert('RGBA')
        s=hgt*S/400; im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
        c.alpha_composite(im,(int(fx_*S-(pj['fx']-pj['x'])*s),int(fy*S-im.height)))
    team=[('woongs',350,290),('gonu',282,272),('ikamolly',214,294),('walwal',150,274)]
    for hid,x,y in sorted(team,key=lambda t:t[2]): shadow(c,x,y,46); sprite(hid,'m1r1c0',x,y,112)
    mobs=[('r0c0',560,288,0.55),('r1c0',640,274,0.75),('r0c0',712,296,0.55)]
    for k,x,y,s in sorted(mobs,key=lambda t:t[2]):
        shadow(c,x,y,60*s/0.55); im=Image.open(A+f'mobs2/forest/{k}.png').convert('RGBA')
        im=im.resize((int(im.width*s*S/1.4),int(im.height*s*S/1.4)),Image.LANCZOS); c.alpha_composite(im,(int(x*S-im.width/2),int(y*S-im.height)))
    for hid,x,y in team: bar(c,x-22,y-124,44,7,0.85,(110,210,90))
    for k,x,y,s in mobs: bar(c,x-20,y-(70 if s<0.6 else 98),40,7,0.7,(220,70,60))
    text(c,'1,163',600,180,22,(255,190,80),'mm','ga1_800',2)
    # top-left: AUTO / speed  (pill)
    put(c,nine('pill',58,24,corner=12),SAFE,SAFE-4); text(c,'자동',SAFE+29,SAFE+8,10,(255,214,120),'mm')
    put(c,nine('pill',38,24,corner=12),SAFE+64,SAFE-4); text(c,'×2',SAFE+83,SAFE+8,10,(255,240,210),'mm')
    # top-center strip
    put(c,nine('strip',260,30,corner=15),422-130,SAFE-6); text(c,'숲 동굴 1-2   ·   WAVE 1/2   ·   2:41',422,SAFE+9,9.5,(250,236,205),'mm')
    # top-right pause
    put(c,part('pause',44,25),844-SAFE-44,SAFE-4)
    # DPS collapsed handle on left edge
    put(c,part('handle',26,25),SAFE-6,110); text(c,'피해량',SAFE+7,142,7,(255,214,120),'mm')
    # bottom units
    for i,(hid,_,_) in enumerate(team):
        x0=SAFE+4+i*203; b=bust(hid,84,66); c.alpha_composite(b,(int((x0+33)*S-b.width/2),H-b.height))
        put(c,nine('nameplate',126,18,corner=9),x0+68,302); text(c,['웅스','고느끼','이카몰리','왈왈콩선생'][i],x0+76,311,8,(255,236,190),'lm')
        text(c,'Lv.5',x0+188,311,7,(243,220,160),'rm')
        bar(c,x0+68,321,126,9,0.8,(110,210,90)); bar(c,x0+68,330,126,7,0.45,(80,150,255))
        for j in range(3):
            sx=x0+68+j*43; sy=339
            socket_icon(c,sx,sy,40,A+f'skills/{hid}_{j}.png')
        if i==1:
            ix,iy,iw,ih=inner('socket',x0+68+43,339,40,40)
            ov=Image.new('RGBA',(int(iw*S),int(ih*S)),(0,0,0,140)); c.alpha_composite(ov,(int(ix*S),int(iy*S)))
            text(c,'7',ix+iw/2,iy+ih/2,12,(255,255,255),'mm')
    c.convert('RGB').save(OUT+'battle.jpg',quality=90); return c

# ================= BATTLE START / VICTORY =================
def word_overlay(base,name,w,out):
    c=base.copy(); dim(c,90)
    rays=Image.new('RGBA',c.size); d=ImageDraw.Draw(rays); cx,cy=422*S,170*S
    for k in range(16):
        a=k*math.pi/8; d.polygon([(cx,cy),(cx+math.cos(a-0.07)*900*S,cy+math.sin(a-0.07)*900*S),(cx+math.cos(a+0.07)*900*S,cy+math.sin(a+0.07)*900*S)],fill=(255,210,120,36))
    c.alpha_composite(rays.filter(ImageFilter.GaussianBlur(6*S)))
    im=Image.open(A+f'ui/title/{name}.png').convert('RGBA'); im=im.resize((int(w*S),int(im.height*w*S/im.width)),Image.LANCZOS)
    put(c,im,422,170,'mm'); c.convert('RGB').save(OUT+out,quality=90)

# ================= RESULT =================
def result():
    c=cover(A+'bgs/region_forest.jpg').filter(ImageFilter.GaussianBlur(6*S)); dim(c,175)
    team=['woongs','gonu','ikamolly','walwal']; lv=[5,5,4,5]; ex=[0.62,0.89,0.24,0.41]; up=[1,0,1,1]
    for i,h in enumerate(team):
        x=257+i*110; put(c,fullbody(h,190),x,256,'mb')
        if up[i]:
            lu=Image.open(A+'ui/title/word_levelup.png').convert('RGBA'); lu=lu.resize((int(84*S),int(lu.height*84*S/lu.width)),Image.LANCZOS); put(c,lu,x,52,'mm')
        text(c,f'Lv.{lv[i]}',x-46,272,8.5,(255,214,120)); text(c,'EXP +122',x+46,272,7.5,(150,230,120),'ra')
        bar(c,x-48,284,96,12,ex[i],(120,220,90),'bar_thick'); text(c,f'{int(ex[i]*100)}%',x,290,7.5,(255,255,255),'mm')
    put(c,nine('strip',320,30,corner=15),262,SAFE-6); text(c,'원정대 레벨 4',284,SAFE+9,9,(255,214,120),'lm')
    bar(c,380,SAFE+2,180,14,0.87,(90,160,255),'bar_thick')
    # loot band
    put(c,part('loot_band',600,62),122,306)
    items=['w_bow_epic.png','a_leather_rare.png','gold.png','stardust.png']
    for j,it in enumerate(items):
        sx=322+j*50; p=A+'items/'+it if os.path.exists(A+'items/'+it) else A+'ui/icons/'+it
        socket_icon(c,sx,318,42,p,['socket_epic','socket_rare','socket_common','socket_common'][j])
    text(c,'전리품',422,312,9,(255,226,160),'mm')
    # right column buttons (KR style round medals)
    for k,lbl in enumerate(['다음 전투','다시하기','나가기']):
        y=82+k*84; put(c,part('medal',56,56),844-SAFE-56,y-28); text(c,lbl,844-SAFE-28,y+36,8,(250,236,205),'mm')
    put(c,part('medal',48,48),SAFE+6,282); text(c,'통계',SAFE+30,338,8,(250,236,205),'mm')
    c.convert('RGB').save(OUT+'result.jpg',quality=90)

# ================= LOBBY =================
def lobby():
    c=cover(A+'ui/bg/lobby_town.jpg')
    signs=[('출격',300,150),('영웅',170,210),('상점',560,190),('대장간',660,120),('길드',430,92)]
    for t,x,y in signs:
        put(c,nine('sign',84,30,corner=15),x-42,y-15); text(c,t,x,y,10,(255,236,190),'mm',f='hah_800')
    # walking heroes with bubble
    for hid,x,y,say in [('woongs',380,330,'오늘도 출발!'),('gonu',520,300,None)]:
        shadow(c,x,y,30); put(c,fullbody(hid,64),x,y,'mb')
        if say:
            put(c,nine('dialog',104,30,corner=12),x-52,y-98); text(c,say,x,y-83,9,(60,40,25),'mm',stroke=0)
    # top bar: player plate + currencies
    put(c,nine('plate',170,34,corner=14),SAFE,SAFE-6); text(c,'형철  Lv.4',SAFE+16,SAFE+11,10,(255,236,190),'lm')
    for k,(lbl,val) in enumerate([('골드','12,480'),('별가루','340')]):
        x=844-SAFE-(k+1)*118; put(c,nine('pill',112,24,corner=12),x,SAFE-2); text(c,val,x+100,SAFE+10,9,(255,240,210),'rm'); text(c,lbl,x+14,SAFE+10,8,(255,214,120),'lm')
    # bottom menu (big medals)
    for k,lbl in enumerate(['영웅','가방','임무','도감']):
        x=SAFE+8+k*64; put(c,part('medal',50,50),x,390-SAFE-60); text(c,lbl,x+25,390-SAFE-4,8,(250,236,205),'mm')
    put(c,nine('btn_gold',150,46,corner=20),844-SAFE-150,390-SAFE-50); text(c,'출격',844-SAFE-75,390-SAFE-27,15,(70,40,15),'mm',f='hah_800',stroke=0)
    c.convert('RGB').save(OUT+'lobby.jpg',quality=90)

# ================= HEROES LIST =================
def heroes():
    c=cover(A+'ui/bg/lobby_town.jpg').filter(ImageFilter.GaussianBlur(8*S)); dim(c,170)
    put(c,part('back',30,30),SAFE,SAFE-4); put(c,nine('title_ribbon',160,34,corner=16),SAFE+40,SAFE-6); text(c,'영웅',SAFE+120,SAFE+11,12,(255,236,190),'mm',f='hah_800')
    tabs=['전체','전사','궁수','마법사','사제']
    for k,t in enumerate(tabs):
        n='tab_on' if k==0 else 'tab_off'; x=SAFE+230+k*72; put(c,nine(n,68,26,corner=12),x,SAFE-4); text(c,t,x+34,SAFE+9,9,(255,236,190) if k==0 else (200,190,170),'mm')
    heroes=['woongs','gonu','ikamolly','walwal','grom','bube','aria','ayla']
    for k,h in enumerate(heroes):
        col,row=k%8,0; cw,ch=92,190; x=SAFE+8+k*101; y=78
        cn=f'card_{min(4,1+k%4)}'; ix,iy,iw,ih=inner(cn,x,y,cw,ch)
        fb=fullbody(h,ih*1.05); fbw=fb.width/S
        win=Image.new('RGBA',(int(iw*S),int(ih*S))); win.alpha_composite(fb,(int((iw-fbw)/2*S),int(win.height-fb.height+2)))
        c.alpha_composite(win,(int(ix*S),int(iy*S))); put(c,part(cn,cw,ch),x,y)
        text(c,['웅스','고느끼','이카몰리','왈왈콩','그롬','부베','아리아','에일라'][k],x+cw/2,y+ch-22,8.5,(255,236,190),'mm')
        for s in range(3): put(c,part('star',10,10),x+cw/2-16+s*11,y+ch-12)
    c.convert('RGB').save(OUT+'heroes.jpg',quality=90)

# ================= POPUP =================
def popup():
    c=cover(A+'ui/bg/lobby_town.jpg'); dim(c,150)
    x,y,w,h=222,70,400,250; put(c,nine('popup',w,h,corner=40),x,y)
    put(c,nine('title_ribbon',200,34,corner=16),422-100,y-12); text(c,'보상 획득',422,y+5,12,(255,236,190),'mm',f='hah_800')
    ix,iy,iw,ih=inner('popup',x,y,w,h)
    put(c,nine('panel_parch',iw-20,110,corner=24),ix+10,iy+30)
    for j in range(4): socket_icon(c,ix+40+j*80,iy+52,56,A+f'skills/woongs_{j%3}.png',['socket_common','socket_rare','socket_epic','socket_legend'][j])
    put(c,nine('btn_navy',120,38,corner=17),422-130,y+h-60); text(c,'닫기',422-70,y+h-41,11,(230,225,240),'mm')
    put(c,nine('btn_gold',120,38,corner=17),422+10,y+h-60); text(c,'받기',422+70,y+h-41,11,(70,40,15),'mm',stroke=0)
    c.convert('RGB').save(OUT+'popup.jpg',quality=90)

# ================= TITLE =================
def title():
    c=cover(A+'ui/title/key_art.jpg'); lg=Image.open(A+'ui/title/logo.png').convert('RGBA'); lw=380
    lg=lg.resize((int(lw*S),int(lg.height*lw*S/lg.width)),Image.LANCZOS); put(c,lg,422,SAFE+4,'lt' if False else 'lt') if False else c.alpha_composite(lg,(int((422-lw/2)*S),int((SAFE+4)*S)))
    text(c,'바람의 원정대',422,SAFE+8+lg.height/S+6,19,(255,236,190),'mt',f='hah_800',stroke=2)
    text(c,'화면을 눌러 시작',422,390-SAFE-40,15,(255,255,255),'mm',stroke=2)
    text(c,'v0.12.0',844-SAFE,390-SAFE,7,(200,200,220),'rb',stroke=1)
    c.convert('RGB').save(OUT+'title.jpg',quality=90)

if __name__=='__main__':
    b=battle(); word_overlay(b,'word_battle',360,'battle_start.jpg'); word_overlay(b,'word_victory',470,'victory.jpg')
    result(); lobby(); heroes(); popup(); title()
    ims=[Image.open(OUT+n).resize((844,390)) for n in ['title.jpg','lobby.jpg','battle_start.jpg','battle.jpg','victory.jpg','result.jpg','heroes.jpg','popup.jpg']]
    sheet=Image.new('RGB',(1688,390*4))
    for i,im in enumerate(ims): sheet.paste(im,((i%2)*844,(i//2)*390))
    sheet.save(OUT+'_all.jpg',quality=82); print('ok')
