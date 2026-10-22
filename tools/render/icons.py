import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
R=sys.argv[1]; OUT=sys.argv[2]; FONT=sys.argv[3]
wk=Image.open(f'{R}/out/wk.png').convert('RGBA'); bq=Image.open(f'{R}/out/bq.png').convert('RGBA')
wk=wk.crop(wk.getbbox()); bq=bq.crop(bq.getbbox())

def radial(size, inner=(27,74,107), outer=(6,18,32)):
    w,h=size; img=Image.new('RGB',size); px=img.load()
    cx,cy=w/2,h*0.42; m=math.hypot(max(cx,w-cx),max(cy,h-cy))
    for y in range(h):
        for x in range(w):
            t=min(1,math.hypot(x-cx,y-cy)/m)
            px[x,y]=tuple(int(inner[i]*(1-t)+outer[i]*t) for i in range(3))
    return img.convert('RGBA')

def glow(size, center, radius, color=(56,217,236), alpha=170):
    g=Image.new('RGBA',size,(0,0,0,0)); d=ImageDraw.Draw(g)
    cx,cy=center
    d.ellipse([cx-radius,cy-radius,cx+radius,cy+radius],outline=color+(255,),width=max(2,int(radius*0.07)))
    return Image.alpha_composite(g.filter(ImageFilter.GaussianBlur(radius*0.12)), g)

def place(base, piece, h, cx, bottom):
    p=piece.resize((int(piece.width*h/piece.height),h),Image.LANCZOS)
    sh=Image.new('RGBA',base.size,(0,0,0,0)); d=ImageDraw.Draw(sh)
    d.ellipse([cx-p.width*0.42,bottom-p.width*0.1,cx+p.width*0.42,bottom+p.width*0.1],fill=(0,0,0,150))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(p.width*0.06)))
    base.alpha_composite(p,(int(cx-p.width/2),int(bottom-p.height)))

def icon_art(S, with_bg=True):
    img=radial((S,S)) if with_bg else Image.new('RGBA',(S,S),(0,0,0,0))
    img.alpha_composite(glow((S,S),(S/2,S/2),S*0.40))
    place(img,wk,int(S*0.66),S/2,S*0.85)
    return img

big=icon_art(1024)
fg=icon_art(1024,with_bg=False)
dens={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for d,k in dens.items():
    s=int(48*k)
    sq=big.resize((s,s),Image.LANCZOS)
    m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).rounded_rectangle([0,0,s*4-1,s*4-1],radius=s*4*0.18,fill=255)
    a=sq.copy(); a.putalpha(m.resize((s,s),Image.LANCZOS)); a.save(f'{OUT}/mipmap-{d}/ic_launcher.png')
    m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).ellipse([0,0,s*4-1,s*4-1],fill=255)
    a=sq.copy(); a.putalpha(m.resize((s,s),Image.LANCZOS)); a.save(f'{OUT}/mipmap-{d}/ic_launcher_round.png')
    f=int(108*k)
    # adaptive foreground: art scaled into the 66/108 safe zone, background drawn too so it looks the same everywhere
    full=radial((f,f)); inner=icon_art(1024,with_bg=False).resize((int(f*0.78),int(f*0.78)),Image.LANCZOS)
    full.alpha_composite(inner,((f-inner.width)//2,(f-inner.height)//2)); full.save(f'{OUT}/mipmap-{d}/ic_launcher_foreground.png')
big.save(f'{R}/icon-1024.png')

font=ImageFont.truetype(FONT, 100)
def splash(w,h,path):
    img=radial((w,h)); u=min(w,h)
    img.alpha_composite(glow((w,h),(w/2,h*0.42),u*0.3))
    place(img,bq,int(u*0.42),w/2-u*0.12,h*0.42+u*0.2)
    place(img,wk,int(u*0.5),w/2+u*0.1,h*0.42+u*0.24)
    d=ImageDraw.Draw(img); f=ImageFont.truetype(FONT,int(u*0.09))
    t='ÉCHEC & MAT'; bb=d.textbbox((0,0),t,font=f)
    d.text(((w-(bb[2]-bb[0]))/2,h*0.42+u*0.32),t,font=f,fill=(238,244,251))
    img.convert('RGB').save(path)
import os
for dname in os.listdir(OUT):
    p=f'{OUT}/{dname}/splash.png'
    if os.path.exists(p):
        w,h=Image.open(p).size; splash(w,h,p)
print('ok')
