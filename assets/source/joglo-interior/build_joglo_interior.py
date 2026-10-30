#!/usr/bin/env python3
"""Undangan AI Joglo Interior procedural stylized-realistic GLB kit. Units: metres; +Y up."""
from __future__ import annotations
import math, json, zipfile, shutil, colorsys, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

ROOT=Path(__file__).resolve().parent if Path(__file__).resolve().parent.name == 'undangan_ai_joglo_interior_v1' else Path('/mnt/data/undangan_ai_joglo_interior_v1')
MODEL=ROOT/'models'; ART=ROOT/'textures'; DOC=ROOT/'docs'; PREVIEW=ROOT/'previews'; WEB=ROOT/'viewer'
for f in (MODEL, ART, DOC, PREVIEW, WEB): f.mkdir(parents=True, exist_ok=True)
RNG=np.random.default_rng(71)

# --- hand-crafted procedural PBR diffuse textures; no external assets/licenses ---
def image_tex(name, im):
    im.save(ART/(name+'.png'), optimize=True)
    return im

def wood_tex(seed, base, grain=1.0, size=256):
    rng=np.random.default_rng(seed)
    arr=np.zeros((size,size,3),np.uint8)
    base=np.array(base,dtype=float)
    knots=[(rng.uniform(0,size),rng.uniform(0,size),rng.uniform(10,28)) for _ in range(3)]
    for yy in range(size):
      for xx in range(size):
        wave=math.sin(xx*.12 + 1.2*math.sin(yy*.035))*9 + math.sin(xx*.36+yy*.024)*3 + math.sin(xx*.027+yy*.17)*3
        k=sum(9*math.sin(math.hypot(xx-x0,(yy-y0)*.7)/r*math.pi) * math.exp(-((xx-x0)**2+(yy-y0)**2)/(r*r*7)) for x0,y0,r in knots)
        n=rng.normal(0,2.5)
        arr[yy,xx]=np.clip(base + (wave*grain+k+n)*np.array([1,.75,.45]),0,255)
    return Image.fromarray(arr,'RGB')

def batik_tex(size=512):
    im=Image.new('RGB',(size,size),(34,39,45)); d=ImageDraw.Draw(im)
    gold=(189,146,72); warm=(111,87,53)
    for y in range(-40,size+40,64):
      for x in range(-40,size+40,64):
        for dx,dy in ((0,-16),(-16,0),(16,0),(0,16)):
          d.ellipse((x+dx-15,y+dy-15,x+dx+15,y+dy+15),outline=gold,width=2)
          d.ellipse((x+dx-9,y+dy-9,x+dx+9,y+dy+9),outline=warm,width=1)
        d.ellipse((x-5,y-5,x+5,y+5),fill=gold)
    return im

def stone_tex(size=256):
    rng=np.random.default_rng(22); a=np.full((size,size,3),[171,158,138],dtype=float)
    noise=rng.normal(0,7,(size,size,1)); a+=noise
    for y in range(0,size,64): a[max(0,y-1):y+2]-=18
    for x in range(0,size,128): a[:,max(0,x-1):x+2]-=15
    return Image.fromarray(np.uint8(np.clip(a,0,255)),'RGB').filter(ImageFilter.GaussianBlur(.42))

TX={
 'teak':image_tex('teak_grain',wood_tex(4,[125,82,51])),
 'darkwood':image_tex('dark_teak_grain',wood_tex(7,[69,45,31],.8)),
 'lightwood':image_tex('light_teak_grain',wood_tex(13,[163,114,67],.8)),
 'batik':image_tex('batik_kawung_stylized',batik_tex()),
 'stone':image_tex('stone_tiles',stone_tex()),
}
MAT={
 'teak':PBRMaterial(name='PBR_TeakWood',baseColorTexture=TX['teak'],metallicFactor=0.0,roughnessFactor=.62,doubleSided=True),
 'darkwood':PBRMaterial(name='PBR_DarkTeak',baseColorTexture=TX['darkwood'],metallicFactor=0.0,roughnessFactor=.59,doubleSided=True),
 'lightwood':PBRMaterial(name='PBR_LightTeak',baseColorTexture=TX['lightwood'],metallicFactor=0.0,roughnessFactor=.62,doubleSided=True),
 'batik':PBRMaterial(name='PBR_BatikKawung',baseColorTexture=TX['batik'],metallicFactor=.02,roughnessFactor=.86,doubleSided=True),
 'stone':PBRMaterial(name='PBR_StoneTiles',baseColorTexture=TX['stone'],metallicFactor=.0,roughnessFactor=.94,doubleSided=True),
 'gold':PBRMaterial(name='PBR_BrassGold',baseColorFactor=[0.80,.58,.26,1],metallicFactor=.78,roughnessFactor=.32,doubleSided=True),
 'bronze':PBRMaterial(name='PBR_Bronze',baseColorFactor=[.51,.33,.16,1],metallicFactor=.64,roughnessFactor=.45,doubleSided=True),
 'cream':PBRMaterial(name='PBR_IvoryFabric',baseColorFactor=[.88,.81,.67,1],metallicFactor=0,roughnessFactor=.9,doubleSided=True),
 'cushion':PBRMaterial(name='PBR_BurgundyCushion',baseColorFactor=[.38,.12,.14,1],metallicFactor=0,roughnessFactor=.86,doubleSided=True),
 'green':PBRMaterial(name='PBR_GreenLeaf',baseColorFactor=[.20,.38,.22,1],metallicFactor=0,roughnessFactor=.86,doubleSided=True),
 'green2':PBRMaterial(name='PBR_LightGreenLeaf',baseColorFactor=[.40,.52,.25,1],metallicFactor=0,roughnessFactor=.91,doubleSided=True),
 'white':PBRMaterial(name='PBR_JasminePetals',baseColorFactor=[.98,.95,.84,1],metallicFactor=0,roughnessFactor=.83,doubleSided=True),
 'black':PBRMaterial(name='PBR_Charcoal',baseColorFactor=[.08,.075,.071,1],metallicFactor=.05,roughnessFactor=.82,doubleSided=True),
 'photo':PBRMaterial(name='PBR_PhotoPlaceholder_ReplaceInCMS',baseColorFactor=[.69,.64,.53,1],metallicFactor=0,roughnessFactor=.9,doubleSided=True),
 'roof':PBRMaterial(name='PBR_TerracottaRoof',baseColorFactor=[.44,.23,.16,1],metallicFactor=0,roughnessFactor=.88,doubleSided=True),
 'light':PBRMaterial(name='PBR_WarmLanternGlow',baseColorFactor=[1,.78,.41,1],emissiveFactor=[.9,.54,.15],metallicFactor=0,roughnessFactor=.25,doubleSided=True),
 'book':PBRMaterial(name='PBR_StorybookLeather',baseColorFactor=[.38,.16,.19,1],metallicFactor=.04,roughnessFactor=.71,doubleSided=True),
}

def uv_coordinates(mesh, scale=1):
    # Duplicate vertices for independent face UVs; arbitrary boxes and wedges get sensible projection.
    original=mesh.vertices[mesh.faces.reshape(-1)]
    faces=np.arange(len(original)).reshape(-1,3)
    uv=np.zeros((len(original),2))
    for i in range(0,len(original),3):
        a,b,c=original[i:i+3]
        n=np.abs(np.cross(b-a,c-a))
        skip=int(np.argmax(n))
        axes=[j for j in range(3) if j!=skip]
        uv[i:i+3,0]=original[i:i+3,axes[0]]*scale
        uv[i:i+3,1]=original[i:i+3,axes[1]]*scale
    return trimesh.Trimesh(vertices=original,faces=faces,process=False),uv

class Builder:
    def __init__(self): self.items=[]
    def add(self,name,mesh,material='teak',pos=(0,0,0),rot=None,scale=1):
        m=mesh.copy()
        if scale!=1: m.apply_scale(scale)
        if rot:
            ax,ang=rot
            vec={'x':[1,0,0],'y':[0,1,0],'z':[0,0,1]}[ax]
            m.apply_transform(trimesh.transformations.rotation_matrix(ang,vec))
        m.apply_translation(pos)
        raw,uv=uv_coordinates(m, .5 if material in ('teak','darkwood','lightwood') else .75)
        raw.visual=TextureVisuals(uv=uv,material=MAT[material])
        self.items.append((name,raw))
        return self
    def extend(self,prefix,other,pos=(0,0,0),rot=0):
        for name,m0 in other.items:
            m=m0.copy()
            if rot: m.apply_transform(trimesh.transformations.rotation_matrix(rot,[0,1,0]))
            m.apply_translation(pos)
            self.items.append((f'{prefix}__{name}',m))
        return self
    def scene(self):
        scene=trimesh.Scene()
        for i,(name,mesh) in enumerate(self.items):
            scene.add_geometry(mesh, node_name=name, geom_name=f'g_{i:03d}_{name}',transform=np.eye(4))
        scene.metadata.update({'title':'Undangan AI — Joglo Interior','coordinateSystem':'Y_UP','units':'meters'})
        return scene
    def save(self,name):
        path=MODEL/f'{name}.glb'
        self.scene().export(path)
        return path

# ---- Shapes, Y vertical ----
def block(b,name,size,pos,material='teak',rot=None):
    return b.add(name,trimesh.creation.box(extents=size),material,pos,rot)

def cyl(b,name,radius,height,pos,mat='teak',axis='y',sections=12):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=sections)
    if axis=='y': m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]))
    elif axis=='x':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
    return b.add(name,m,mat,pos)

def sphere(b,name,r,pos,mat,subdiv=1,scale=None):
    m=trimesh.creation.icosphere(subdivisions=subdiv,radius=r)
    if scale is not None: m.apply_scale(scale)
    return b.add(name,m,mat,pos)

def wedge(b,name,verts,triangles,material):
    m=trimesh.Trimesh(vertices=np.asarray(verts,float),faces=np.asarray(triangles,int),process=False)
    return b.add(name,m,material)

def rod_between(b,name,start,end,r,mat,sections=8):
    p=np.array(start,float); q=np.array(end,float); v=q-p
    m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(v),sections=sections)
    d=v/np.linalg.norm(v); axis=np.cross([0,0,1],d)
    if np.linalg.norm(axis)>1e-7:
        m.apply_transform(trimesh.transformations.rotation_matrix(math.acos(np.clip(d[2],-1,1)),axis))
    elif d[2]<0: m.apply_transform(trimesh.transformations.rotation_matrix(math.pi,[1,0,0]))
    return b.add(name,m,mat,(p+q)/2)

def carved_panel(b,prefix,w,h,center=(0,0,0),plane='xy',wood='darkwood',depth=.12,ornaments=6):
    x,y,z=center
    # panel stands in XY plane; vertical
    block(b,prefix+'_frame_top',(w,.12,depth),(x,y+h/2,z),wood)
    block(b,prefix+'_frame_bottom',(w,.12,depth),(x,y-h/2,z),wood)
    for sx in (-1,1):block(b,prefix+f'_post_{sx}',(.13,h+.18,depth),(x+sx*w/2,y,z),wood)
    block(b,prefix+'_infill',(w-.22,h-.19,depth*.40),(x,y,z),'lightwood')
    for j in range(ornaments):
        px=x+(j-(ornaments-1)/2)*(w-.3)/ornaments
        for k in range(2):
            py=y-.26+k*.52
            block(b,prefix+f'_carved_cross_{j}_{k}',(.043,.56,depth*.7),(px,py,z-depth*.43),'gold',('z',math.pi/4 if (j+k)%2 else -math.pi/4))
        sphere(b,prefix+f'_brass_boss_{j}',.055,(px,y,z-depth*.57),'bronze',0)
    # carved stylized diamond geometry rather than real traditional relief
    return b

# ------- modular assets -------
def make_book():
    b=Builder()
    block(b,'STORY_BOOK_COVER',(1.03,.10,.73),(0,.08,0),'book')
    block(b,'STORY_BOOK_PAGES',(.95,.105,.68),(0,.15,0),'cream')
    block(b,'STORY_BOOK_TOP',(.99,.065,.7),(0,.23,0),'book')
    block(b,'STORY_BOOK_SPINE',(.12,.27,.77),(-.50,.135,0),'darkwood')
    for i in range(3):
        block(b,f'STORY_BOOK_GOLD_RIDGE_{i}',(.025,.16,.77),(-.5+i*.07,.14,0),'gold')
    block(b,'STORY_BOOK_GOLD_CENTER',(.28,.018,.28),(0,.266,0),'gold',('y',math.pi/4))
    block(b,'STORY_BOOK_GOLD_STAMP',(.11,.02,.11),(0,.28,0),'book')
    # named hotspot marker geometry hidden by viewer; keep in GLB for raycaster registration
    block(b,'HS_STORY_BOOK',(.98,.35,.68),(0,.18,0),'photo')
    return b

def make_photo_frame():
    b=Builder()
    # frame oriented XY face, front toward +Z (guest/viewer)
    block(b,'FRAME_BACK',(1.15,1.45,.07),(0,.75,0),'darkwood')
    block(b,'PHOTO_SURFACE_01',(.88,1.17,.012),(0,.75,.048),'photo')
    block(b,'PHOTO_FRAME_TOP',(1.23,.11,.12),(0,1.48,.085),'gold')
    block(b,'PHOTO_FRAME_BOTTOM',(1.23,.11,.12),(0,.02,.085),'gold')
    for sx in (-1,1):
        block(b,f'PHOTO_FRAME_SIDE_{sx}',(.10,1.46,.12),(sx*.58,.75,.085),'gold')
    block(b,'PHOTO_MATTE',(.98,1.27,.01),(0,.75,.057),'cream')
    # insert surface again forward, copy material dynamic
    block(b,'PHOTO_DISPLAY_MESH',(.86,1.15,.015),(0,.75,.065),'photo')
    block(b,'HS_GALLERY_01',(.95,1.25,.02),(0,.75,.08),'photo')
    return b

def make_table_story():
    b=Builder()
    block(b,'STORY_TABLE_TOP',(2.1,.14,1.2),(0,.72,0),'teak')
    block(b,'STORY_TABLE_INLAY',(1.85,.021,.94),(0,.803,0),'darkwood')
    for x in (-.89,.89):
      for z in (-.44,.44):
        block(b,f'STORY_TABLE_LEG_{x}_{z}',(.14,.7,.14),(x,.35,z),'darkwood')
    for z in (-.49,.49):
        block(b,f'STORY_TABLE_APRON_{z}',(1.78,.14,.08),(0,.59,z),'gold')
    for x in (-.91,.91):
        block(b,f'STORY_TABLE_APRON_X_{x}',(.08,.14,.88),(x,.59,0),'gold')
    return b

def make_geb():
    b=Builder()
    carved_panel(b,'GEBYOK_CENTER',4.3,3.2,(0,1.6,0),'xy',ornaments=8)
    for x in (-2.75,2.75):
        carved_panel(b,f'GEBYOK_WING_{int(x)}',1.1,3.2,(x,1.6,0),'xy',ornaments=2)
    block(b,'GEBYOK_CROWN',(7.2,.21,.28),(0,3.39,0),'teak')
    for i in range(11):
        x=-3.4+i*.68
        sphere(b,f'GEBYOK_CROWN_LOTUS_{i}',.14,(x,3.58,0),'gold',0)
    for x in (-2.14,2.14):
        block(b,f'GEBYOK_STILE_{x}',(.16,3.45,.25),(x,1.72,.05),'darkwood')
    return b

def make_bench():
    b=Builder()
    block(b,'BENCH_SEAT_BASE',(2.55,.19,.84),(0,.54,0),'darkwood')
    block(b,'BENCH_UPHOLSTERY',(2.26,.13,.72),(0,.7,-.015),'cushion')
    block(b,'BENCH_BACK',(2.56,1.08,.16),(0,1.21,-.35),'teak')
    block(b,'BENCH_BACK_CUSHION',(2.27,.78,.10),(0,1.27,-.25),'cream')
    for x in (-1.19,1.19):
        block(b,f'BENCH_ARM_{x}',(.16,.14,.81),(x,.93,-.04),'gold')
        for z in (-.29,.29):
            block(b,f'BENCH_LEG_{x}_{z}',(.15,.50,.14),(x,.25,z),'teak')
    for i in range(8):
        block(b,f'BENCH_CARVING_{i}',(.07,.18,.02),(-1.03+i*.29,.49,.43),'gold',('z',math.pi/4))
    return b

def make_chair():
    b=Builder()
    block(b,'CHAIR_SEAT',(.70,.11,.73),(0,.49,0),'teak')
    block(b,'CHAIR_PAD',(.58,.075,.59),(0,.59,0),'cushion')
    block(b,'CHAIR_BACK',(.72,.94,.12),(0,1.07,-.32),'darkwood')
    block(b,'CHAIR_BACK_PANEL',(.52,.64,.025),(0,1.12,-.25),'lightwood')
    for x in (-.28,.28):
      for z in (-.29,.29): block(b,f'CHAIR_LEG_{x}_{z}',(.1,.47,.10),(x,.235,z),'darkwood')
    for x in (-.34,.34):block(b,f'CHAIR_ARM_{x}',(.11,.10,.70),(x,.81,0),'gold')
    for j in range(4):
        block(b,f'CHAIR_BACK_MOTIF_{j}',(.04,.25,.03),(-.20+j*.135,1.13,-.228),'gold',('z',.45))
    return b

def make_lantern():
    b=Builder()
    cyl(b,'LANTERN_CHAIN',.026,.55,(0,2.65,0),'bronze',sections=8)
    # ornate lantern shade simulated by nested cage bars
    for x in (-.24,.24):
      for z in (-.24,.24):block(b,f'LANTERN_CAGE_BAR_{x}_{z}',(.035,.68,.035),(x,2.03,z),'gold')
    block(b,'LANTERN_TOP',(.61,.09,.61),(0,2.43,0),'darkwood')
    block(b,'LANTERN_BASE',(.61,.10,.61),(0,1.63,0),'gold')
    block(b,'LANTERN_GLOW',(.42,.55,.42),(0,2.04,0),'light')
    sphere(b,'LANTERN_FINIAL',.08,(0,2.55,0),'gold',1)
    return b

def make_rug():
    b=Builder()
    block(b,'KAWUNG_CARPET',(3.85,.045,2.62),(0,.045,0),'batik')
    # braided border
    for z in (-1.32,1.32):block(b,f'KAWUNG_BORDER_Z_{z}',(3.97,.018,.065),(0,.076,z),'gold')
    for x in (-1.94,1.94):block(b,f'KAWUNG_BORDER_X_{x}',(.065,.018,2.66),(x,.076,0),'gold')
    return b

def make_flower():
    b=Builder()
    cyl(b,'VASE_BASE',.23,.39,(0,.195,0),'bronze',sections=16)
    cyl(b,'VASE_NECK',.125,.2,(0,.48,0),'gold',sections=14)
    for i in range(13):
        a=i*2.4
        x=.11*math.cos(a); z=.11*math.sin(a)
        rod_between(b,f'JASMINE_STEM_{i}',(x*.3,.51,z*.3),(x*.95,.80+(i%3)*.18,z*.95),.014,'green',6)
        sphere(b,f'JASMINE_FLOWER_{i}',.075,(x*.95,.85+(i%3)*.18,z*.95),'white',0)
        for j in range(2):
            sphere(b,f'LEAF_{i}_{j}',.065,(x*.7+(-1)**j*.06,.67+(i%3)*.12,z*.7),'green2',0,scale=(1.4,.45,.8))
    return b

def make_wayang():
    b=Builder()
    # characteristic pointed stylized gunungan silhouette
    verts=[(-.68,.35,0),(.68,.35,0),(.52,1.05,0),(.23,1.76,0),(0,2.12,0),(-.23,1.76,0),(-.52,1.05,0)]
    faces=[(0,i,i+1) for i in range(1,len(verts)-1)]
    wedge(b,'WAYANG_GUNUNGAN_BODY',verts,faces,'gold')
    # inner stylized relief
    for i in range(8):
        y=.55+i*.15; width=.6*(1-(y/2.35))
        block(b,f'WAYANG_RELIEF_BAR_{i}',(2*width,.032,.025),(0,y,.022),'darkwood')
    rod_between(b,'WAYANG_WOOD_HANDLE',(0,.08,0),(0,1.75,0),.035,'darkwood')
    block(b,'WAYANG_STAND',(.80,.12,.35),(0,.06,0),'darkwood')
    return b

def make_gamelan():
    b=Builder()
    block(b,'SARON_BASE',(1.60,.62,.76),(0,.40,0),'darkwood')
    block(b,'SARON_BRASS_BASE',(1.56,.08,.70),(0,.74,0),'gold')
    for i in range(8):
        x=-.65+i*.185
        block(b,f'SARON_KEY_{i}',(.16,.055,.55),(x,.82,0),'bronze')
    rod_between(b,'SARON_MALLET_HANDLE',(.60,.92,.25),(1.07,1.18,.25),.03,'teak')
    sphere(b,'SARON_MALLET_HEAD',.09,(1.07,1.18,.25),'black',1)
    for x in (-.66,.66):
       block(b,f'SARON_LEG_{x}',(.10,.34,.10),(x,.17,-.25),'darkwood')
       block(b,f'SARON_LEG_BACK_{x}',(.10,.34,.10),(x,.17,.25),'darkwood')
    return b

# Interior geometry with isometric camera view from +z; roof front half is intentionally omitted for visibility.
def make_shell():
    b=Builder()
    # ground and timber floor
    block(b,'FLOOR_WALKABLE',(13.7,.18,10.7),(0,.09,0),'stone')
    block(b,'FLOOR_TEAK_TRIM',(13.95,.14,10.95),(0,.23,0),'darkwood')
    block(b,'FLOOR_FINISH',(13.50,.035,10.50),(0,.313,0),'lightwood')
    for i in range(19):
        z=-5.05 + i*.56
        block(b,f'FLOOR_PLANK_SEAM_{i}',(13.4,.007,.012),(0,.335,z),'darkwood')
    # low rear wall and side walls with display-like cutaway
    block(b,'BACK_WALL',(13.8,3.64,.19),(0,2.15,-5.30),'cream')
    block(b,'LEFT_WALL',(0.17,2.55,10.9),(-6.80,1.57,0),'cream')
    block(b,'RIGHT_WALL',(0.17,2.55,10.9),(6.80,1.57,0),'cream')
    # traditional horizontal panelling
    for z in (-4.7,-3.3,-1.9,-.5,.9,2.3,3.7):
        block(b,f'LEFT_WALL_PILASTER_{z}',(.17,2.45,.16),(-6.67,1.59,z),'teak')
        block(b,f'RIGHT_WALL_PILASTER_{z}',(.17,2.45,.16),(6.67,1.59,z),'teak')
    for y in (.67,2.48):
        block(b,f'LEFT_WALL_RAIL_{y}',(.1,.10,10.4),(-6.67,y,0),'darkwood')
        block(b,f'RIGHT_WALL_RAIL_{y}',(.1,.10,10.4),(6.67,y,0),'darkwood')
        block(b,f'BACK_WALL_RAIL_{y}',(13.1,.10,.1),(0,y,-5.13),'darkwood')
    # perimeter outer posts + main saka guru
    for x in (-6.25,-2.95,2.95,6.25):
      for z in (-4.65,4.6):
        block(b,f'PERIMETER_POST_{x}_{z}',(.24,4.58,.24),(x,2.62,z),'teak')
        block(b,f'PERIMETER_POST_BASE_{x}_{z}',(.38,.25,.38),(x,.45,z),'stone')
        block(b,f'PERIMETER_CAP_{x}_{z}',(.46,.17,.46),(x,4.95,z),'gold')
    for x in (-2.30,2.30):
      for z in (-2.35,2.35):
        block(b,f'SAKA_GURU_{x}_{z}',(.33,5.10,.33),(x,2.82,z),'darkwood')
        block(b,f'SAKA_GURU_UMPAK_{x}_{z}',(.56,.36,.56),(x,.50,z),'stone')
        block(b,f'SAKA_GURU_CAP_{x}_{z}',(.61,.18,.61),(x,5.42,z),'gold')
    # beams visible from interior
    for z in (-4.6,4.6): block(b,f'PERIMETER_TIE_BEAM_Z_{z}',(13.5,.27,.31),(0,4.94,z),'darkwood')
    for x in (-6.25,6.25):block(b,f'PERIMETER_TIE_BEAM_X_{x}',(.32,.27,9.9),(x,4.94,0),'darkwood')
    for z in (-2.35,2.35):block(b,f'TUMPANG_SARI_TIE_Z_{z}',(5.4,.28,.31),(0,5.42,z),'teak')
    for x in (-2.3,2.3):block(b,f'TUMPANG_SARI_TIE_X_{x}',(.28,.28,5.2),(x,5.42,0),'teak')
    for j in range(5):
        block(b,f'TUMPANG_SARI_LAYER_{j}',(5.7-j*.72,.13,5.5-j*.64),(0,5.77+j*.24,0),'gold' if j%2 else 'darkwood')
    # roof rear slopes leave front cutaway view
    apex=(0,7.73,-.65)
    back=[(-7.2,4.95,-5.7),(7.2,4.95,-5.7),(7.2,4.95,.7),(-7.2,4.95,.7)]
    for side,(i0,i1) in enumerate(((0,1),(1,2),(2,3),(3,0))):
        wedge(b,f'JOGLO_ROOF_VISIBLE_PANEL_{side}',[back[i0],back[i1],apex],[[0,1,2]],'roof')
    # ridge/edge teak trim
    rod_between(b,'ROOF_RIDGE_TRIM',(-.01,7.72,-.65),(.01,7.75,-.64),.10,'gold')
    for i,p in enumerate(back): rod_between(b,f'ROOF_RAFTER_{i}',p,apex,.07,'darkwood')
    # decorative front eave independent of roof fill
    block(b,'FRONT_EAVE_BEAM',(13.5,.28,.30),(0,5.04,4.66),'teak')
    for i in range(15):
       x=-6.0+i*.86
       block(b,f'FRONT_EAVE_ORNAMENT_{i}',(.24,.38,.07),(x,4.69,4.83),'gold',('z',math.pi/4))
    # wooden doorway backdrop for navigation to other scenes
    block(b,'REAR_LEFT_DOOR',(1.15,2.65,.11),(-5.18,1.67,-5.16),'darkwood')
    block(b,'REAR_RIGHT_DOOR',(1.15,2.65,.11),(5.18,1.67,-5.16),'darkwood')
    return b

COMPONENTS={
 'joglo_interior_shell':make_shell(),
 'gebyok_ukir_jawa':make_geb(),
 'meja_buku_perjalanan':make_table_story(),
 'buku_perjalanan_interaktif':make_book(),
 'pigura_foto_jawa':make_photo_frame(),
 'sofa_kayu_jawa':make_bench(),
 'kursi_ukir_jawa':make_chair(),
 'lampu_gantung_jawa':make_lantern(),
 'karpet_batik_kawung':make_rug(),
 'vas_melati':make_flower(),
 'wayang_gunungan_display':make_wayang(),
 'gamelan_saron_dekorasi':make_gamelan(),
}

for name,b in COMPONENTS.items():b.save(name)

full=Builder()
full.extend('SHELL',COMPONENTS['joglo_interior_shell'])
full.extend('BACK_GEBYOK',COMPONENTS['gebyok_ukir_jawa'],(0,.36,-5.04))
full.extend('CENTER_RUG',COMPONENTS['karpet_batik_kawung'],(0,.36,0.55))
full.extend('STORY_TABLE',COMPONENTS['meja_buku_perjalanan'],(0,.37,0.40))
full.extend('STORY_BOOK',COMPONENTS['buku_perjalanan_interaktif'],(0,1.21,.40))
# gallery photo frame on back wall toward left; make three in frame row, front +Z
for i,x in enumerate([-5.20,-3.86,-2.52]):
    full.extend(f'GALLERY_{i+1:02d}',COMPONENTS['pigura_foto_jawa'],(x,1.43,-5.04))
for x in (-4.5,4.5):
    full.extend(f'SOFA_{str(x).replace("-","L")}',COMPONENTS['sofa_kayu_jawa'],(x,.36,1.4),math.pi/2 if x<0 else -math.pi/2)
for x,z,a in [(-3.8,-.75,-.5),(3.8,-.75,.5),(2.9,3.15,-.20)]:
    full.extend(f'CHAIR_{str(x).replace("-","L")}_{str(z).replace("-","M")}',COMPONENTS['kursi_ukir_jawa'],(x,.36,z),a)
for x,z in [(-5.4,-3.7),(5.4,-3.7),(-5.4,4.0),(5.4,4.0)]:
    full.extend(f'VASE_{x}_{z}',COMPONENTS['vas_melati'],(x,.36,z))
for x,z in [(-4.3,-2.2),(4.3,-2.2),(0,-3.4)]:
    full.extend(f'LANTERN_{x}_{z}',COMPONENTS['lampu_gantung_jawa'],(x,2.85,z))
full.extend('WAYANG_CORNER',COMPONENTS['wayang_gunungan_display'],(-5.6,.36,-3.4))
full.extend('GAMELAN_CORNER',COMPONENTS['gamelan_saron_dekorasi'],(5.2,.36,-3.4))
# extra photo frames near entry with source texture swap
for i,x in enumerate((3.45,4.8,6.15),start=4):full.extend(f'GALLERY_{i:02d}',COMPONENTS['pigura_foto_jawa'],(x,1.43,-5.04))
# door at rear vs action node explicit geometry: viewer hides it
block(full,'HS_PORTAL_WEDDING_GARDEN',(.85,2.45,.035),(-5.18,1.74,-5.01),'photo')
block(full,'HS_PORTAL_RECEPTION_HALL',(.85,2.45,.035),(5.18,1.74,-5.01),'photo')
block(full,'SPAWN_ENTRY',(.15,.03,.15),(0,.38,4.05),'green')
full.save('joglo_living_room_complete')

# Actual interactive markers are hidden in view by name when runtime loads the scene.
scene_config={
 'schemaVersion':1,'sceneId':'living-room','asset':'/models/joglo_living_room_complete.glb',
 'unit':'meter','axis':'Y-up','coordinateConvention':{'X':'horizontal','Y':'vertical/up','Z':'depth; front entrance is +Z'},
 'spawn':{'id':'SPAWN_ENTRY','position':[0,.40,4.05],'avatarFacingRadians':math.pi},
 'walkable':{'y':.37,'rectangleXZ':{'minX':-6.4,'maxX':6.4,'minZ':-4.65,'maxZ':4.65}},
 'obstacles':[{'id':'story-table','centerXZ':[0,.4],'sizeXZ':[2.35,1.50]},
              {'id':'left-sofa','centerXZ':[-4.5,1.4],'sizeXZ':[1.1,2.8]},
              {'id':'right-sofa','centerXZ':[4.5,1.4],'sizeXZ':[1.1,2.8]},
              {'id':'left-chair','centerXZ':[-3.8,-.75],'sizeXZ':[.9,.9]},
              {'id':'right-chair','centerXZ':[3.8,-.75],'sizeXZ':[.9,.9]}],
 'hotspots':[
     {'id':'story-book','nodePrefix':'STORY_BOOK__HS_STORY_BOOK','action':'open_story','nearXZ':[0,1.55]},
     *[{'id':f'photo-frame-{i+1:02d}','nodePrefix':f'GALLERY_{i+1:02d}__HS_GALLERY_01',
        'action':'open_gallery','payload':{'startIndex':i}} for i in range(6)],
     {'id':'garden-door','nodePrefix':'HS_PORTAL_WEDDING_GARDEN','action':'navigate','targetSceneId':'wedding-garden'},
     {'id':'hall-door','nodePrefix':'HS_PORTAL_RECEPTION_HALL','action':'navigate','targetSceneId':'reception-hall'}],
 'replacablePhotoSurfaceNodeSuffix':'PHOTO_DISPLAY_MESH',
 'furnitureReplacementPolicy':'Do not double-place modular props on top of complete scene',
 'camera':{'position':[11,7.5,13.8],'target':[0,2.0,0],'fov':48},
 'notes':['World engine must derive COLLIDER from external config or generate navmesh before enabling free walking.',
          'Hide HS_ and SPAWN_ nodes before rendering; they remain in GLB for scene-action association.',
          'Replace PHOTO_DISPLAY_MESH material with CMS-provided texture, respecting CORS.']
}
(ROOT/'scene-config.json').write_text(json.dumps(scene_config,indent=2,ensure_ascii=False))

# importmap ensures CDN imports from examples resolve Three.js bare specifier correctly
options=''.join(f'<option value="{name}">{name.replace("_"," ").title()}</option>' for name in ['joglo_living_room_complete',*COMPONENTS])
viewer='''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Undangan AI — Joglo Interior 3D</title>
<style>html,body{margin:0;background:#e3ddd1;color:#32251d;font-family:system-ui}canvas{display:block;width:100%;height:100vh}aside{position:fixed;top:12px;left:12px;z-index:10;background:rgba(255,252,246,.95);border:1px solid #d5c6b6;box-shadow:0 8px 40px #382b2344;padding:16px;border-radius:14px;max-width:330px}select,button{background:#fff;border:1px solid #baa98d;border-radius:8px;font:inherit;padding:8px;width:100%;margin-top:10px}small{color:#786956;display:block;margin-top:8px}#status{font-size:12px;margin-top:12px}#legend{position:fixed;right:12px;bottom:12px;background:#fff9;padding:9px;border-radius:8px;font-size:12px}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script></head><body><aside><b>Undangan AI — Interior Joglo</b><small>3D GLB • Stylized realistic prototype</small><select id="model">__OPTIONS__</select><button id="wire">Toggle Wireframe</button><button id="markers">Show/Hide Interaction Markers</button><div id="status">Loading...</div></aside><div id="legend">Drag to orbit • Scroll/pinch to zoom • Right-drag to pan</div>
<script type="module">
import * as THREE from 'three'; import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'; import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e3ddd1');
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,250);camera.position.set(11,8,14);
const ctl=new OrbitControls(camera,renderer.domElement);ctl.enableDamping=true;ctl.target.set(0,2,0);ctl.update();
scene.add(new THREE.HemisphereLight(0xfff5e4,0x776451,2.35));const sun=new THREE.DirectionalLight(0xffe7bf,3.1);sun.position.set(6,12,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-13;sun.shadow.camera.right=13;sun.shadow.camera.top=13;sun.shadow.camera.bottom=-13;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd3c8b9,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-0.06;ground.receiveShadow=true;scene.add(ground);
const gltf=new GLTFLoader();let obj=null,wire=false,showMarkers=false,serial=0;
function markObject(v){v.traverse(o=>{if(o.name.includes('HS_')||o.name.includes('SPAWN_')){o.visible=showMarkers;return;}if(o.isMesh){o.castShadow=!o.name.includes('FLOOR');o.receiveShadow=true;if(o.material){o.userData.originalMat=o.userData.originalMat||o.material;o.material=o.userData.originalMat.clone();o.material.wireframe=wire;}}})}
function fit(v){let box=new THREE.Box3().setFromObject(v);const size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());const len=Math.max(size.x,size.y,size.z);camera.position.set(c.x+len*.95,c.y+len*.70,c.z+len*1.05);ctl.target.copy(c);ctl.update();}
function open(name){const run=++serial;document.querySelector('#status').textContent='Loading '+name+' ...';gltf.load('../models/'+name+'.glb',x=>{if(run!==serial)return;if(obj){scene.remove(obj);obj.traverse(n=>{if(n.geometry)n.geometry.dispose();});}obj=x.scene;markObject(obj);scene.add(obj);fit(obj);document.querySelector('#status').textContent='Loaded • '+obj.children.length+' scene nodes';},undefined,e=>{document.querySelector('#status').textContent='Load failed: '+e.message;});}
document.querySelector('#model').addEventListener('change',e=>open(e.target.value));document.querySelector('#wire').addEventListener('click',()=>{wire=!wire;if(obj)markObject(obj)});document.querySelector('#markers').addEventListener('click',()=>{showMarkers=!showMarkers;if(obj)markObject(obj)});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.setAnimationLoop(()=>{ctl.update();renderer.render(scene,camera)});open(document.querySelector('#model').value);
</script></body></html>'''.replace('__OPTIONS__',options)
(WEB/'index.html').write_text(viewer)

readme='''# Undangan AI — Joglo Living Room 3D Asset Pack v1.0

**Deliverable:** actual geometric `.glb` assets with stylized-realistic visual design, procedural textures and PBR glTF materials. These are NOT renders/PNGs masquerading as models.

## Included

- `models/joglo_living_room_complete.glb` — assembled interior: saka guru, open-front Joglo room, carved gebyok, 6 interactive framed photo placeholders, book on table, furniture, lamps, batik carpet, floral vases, wayang and gamelan accent.
- `models/joglo_interior_shell.glb` — architectural base, removable by composition.
- **11 modular props**: gebyok, story table, story book, photo frame, wooden bench, chair, hanging lantern, batik rug, flower vase, wayang display, saron decoration.
- `scene-config.json` — 3D positioning convention, walkable envelope, obstacle draft AABBs, hotspots, camera and actions.
- `textures/*.png` — self-generated wood grain, stone and kawung-inspired batik textures embedded into the GLBs.
- `viewer/index.html` — orbit/zoom/asset selector/wireframe preview using Three.js.
- `build_joglo_interior.py` — reproducible model generator.

## Preview

From the extracted folder:

```sh
python3 -m http.server 8080
```

Open **http://localhost:8080/viewer/**. Requires internet connection to fetch Three.js via jsDelivr. The GLB assets themselves work offline.

## Three.js / React Three Fiber

Copy `models/*.glb` to `public/models/`, use `useGLTF('/models/joglo_living_room_complete.glb')`, then hide objects with names containing `HS_` or `SPAWN_` and register interactions from `scene-config.json`.

**Coordinates**: meters, **Y-up**, front/entry is positive Z. Camera recommended at `[11,7.5,13.8]`, look-at `[0,2,0]`.

### Real CMS photo replacement

The six `PHOTO_DISPLAY_MESH` meshes are placeholders. Replace their material's base color texture with an appropriately cropped publicly published photo using `THREE.TextureLoader` (cross-origin safe); don't ship couple photos in static shared models. Match each frame by its parent/prefix `GALLERY_01..06`.

### MVP scope and limitations

- Produces valid geometric assets and embedded PBR-style textures. **Not equivalent to professional hand-modeled/photogrammetric architectural realism**.
- Carved ornament motifs are stylized procedural approximations. Not an academically faithful reconstruction of a particular regional Joglo or a specific historical gebyok.
- Not rigged; no avatar character included (separate avatar milestone).
- `HS_` and `SPAWN_` markers are rendered as visible geometry by naive GLB viewers; the included viewer hides them by default. Use the scene config to register raycast hit targets.
- Walkable/colliders in `scene-config.json` are preliminary approximations; bake authoritative navmesh/physics colliders before allowing unconstrained walking.
- No personally identifying content; wedding photos are intentionally placeholders.
- Performance budgets must be tested on a real mobile browser before production.

## Copyright

All geometry and procedural textures generated originally in this session; no third-party stock models/textures were incorporated.
'''
(ROOT/'README.md').write_text(readme)
if Path(__file__).resolve() != (ROOT/'build_joglo_interior.py').resolve(): shutil.copy2(__file__,ROOT/'build_joglo_interior.py')

# Validate each GLB and publish report
reports=[]
for f in sorted(MODEL.glob('*.glb')):
    scene=trimesh.load(f,force='scene')
    if not scene.geometry: raise RuntimeError(f'No geometry in {f}')
    meshes=[g for g in scene.geometry.values() if isinstance(g,trimesh.Trimesh)]
    extent=scene.extents
    mat_names=sorted({getattr(getattr(g.visual,'material',None),'name','') or '' for g in meshes})
    reports.append({'file':f.name,'bytes':f.stat().st_size,'meshes':len(meshes),'triangles':sum(len(g.faces) for g in meshes),'extentsMeters':[round(float(x),2) for x in extent],'materialCount':len(mat_names)})
(ROOT/'validation-report.json').write_text(json.dumps(reports,indent=2))

ZIP=Path('/mnt/data/undangan-ai-joglo-interior-stylized-realistic-v1.zip')
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
    for p in ROOT.rglob('*'):
        if p.is_file():z.write(p,arcname=ROOT.name+'/'+str(p.relative_to(ROOT)))
print('ZIP',ZIP,ZIP.stat().st_size)
for r in reports:print(r)
