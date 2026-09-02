from pathlib import Path
import json, math, zipfile, shutil
import numpy as np
import ezdxf, trimesh
from ezdxf import bbox

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'upload/plzen byt.dxf'
if not SOURCE.exists(): SOURCE=ROOT/'plzen-byt-podklad.dxf'
OUT=ROOT/'model-mistnosti-v1'; OUT.mkdir(exist_ok=True)
doc=ezdxf.readfile(SOURCE)
inserts={e.dxf.name:e for e in doc.modelspace().query('INSERT')}
def hatch_bounds(name):
    result=[]
    for e in inserts[name].virtual_entities():
        if e.dxftype()=='HATCH':
            for path in e.paths:
                pts=np.array(path.vertices)[:,:2]
                result.append([*pts.min(axis=0),*pts.max(axis=0)])
    return result
left=hatch_bounds('Zeď_14')[0]
top=hatch_bounds('Zeď_12')[0]
X0,Y0=left[2],left[1]
W=(top[2]-X0)/1000; D=(top[1]-Y0)/1000
H=2.6
boxes=[]
def box(name,x0,y0,z0,x1,y1,z1,group='wall',side='',color='#ddd9ce'):
    assert x1>x0 and y1>y0 and z1>z0, name
    boxes.append(dict(name=name,min=[x0,y0,z0],max=[x1,y1,z1],group=group,side=side,color=color))
box('Podlaha',-.1,-.15,-.10,W+.25,D+.20,0,'floor',color='#c7c0b2')
box('Severni stena',-.1,D,0,W+.25,D+.2,H,side='north')
box('Zapadni pricka',-.1,0,0,0,D,H,side='west')
south=[]
for x0,y0,x1,y1 in hatch_bounds('Zeď_16'):
    a=max(0,(x0-X0)/1000); b=min(W,(x1-X0)/1000)
    if b>a:
        south.append([a,b])
        box('Jizni stena '+str(len(south)),a,-.15,0,b,0,H,side='south')
south.sort()
doors=[[south[i][1],south[i+1][0]] for i in range(len(south)-1)]
for i,(a,b) in enumerate(doors):
    box('Nadprazi dveri '+str(i+1),a,-.15,2.05,b,0,H,side='south')
windows=[]
for e in inserts['Zeď_3'].virtual_entities():
    if e.dxftype()=='INSERT' and e.dxf.name.startswith('Okno'):
        ext=bbox.extents([e]); a=(ext.extmin.y-Y0)/1000;b=(ext.extmax.y-Y0)/1000
        if a>=0 and b<=D:windows.append([a,b])
windows.sort(); wa=windows[0][0];wb=windows[-1][1]
box('Vychodni stena dolni',W,0,0,W+.25,wa,H,side='east')
box('Vychodni stena horni',W,wb,0,W+.25,D,H,side='east')
box('Parapetni stena - odhad vysky',W,wa,0,W+.25,wb,.9,side='east')
box('Nadprazi okna - odhad vysky',W,wa,2.1,W+.25,wb,H,side='east')
for i,(a,b) in enumerate(windows):
    f=.045; xa=W+.105; xb=W+.165
    for name,y0,z0,y1,z1 in [('dolni',a,.9,b,.945),('horni',a,2.055,b,2.1),('leva',a,.945,a+f,2.055),('prava',b-f,.945,b,2.055)]:
        box(f'Orientacni ram {i+1} {name}',xa,y0,z0,xb,y1,z1,'frame','east','#aaa99f')
    box(f'Orientacni zaskleni {i+1}',W+.13,a+f,.945,W+.136,b-f,2.055,'glass','east','#b4d3df')

kitchen=[[(4084.24677518348-X0)/1000,0,(6682.246775183478-X0)/1000,.6],[(6082.246775183478-X0)/1000,.6,(6682.246775183478-X0)/1000,2.0]]
meta={'version':1,'units':'metres','room':{'width':W,'depth':D,'height':H,'area':W*D},'dxf_origin_mm':[X0,Y0,0],'coordinates':'Model: X right, Y toward top of plan, Z up. GLB: X right, Y up, Z toward bottom of plan.','assumptions':{'ceiling_height':2.6,'window_sill':.9,'window_head':2.1,'door_opening_head':2.05,'floor_thickness':.1},'door_openings_x':doors,'window_openings_y':windows,'boxes':boxes,'kitchen_footprint':kitchen}
(OUT/'model.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
scene=trimesh.Scene(); meshes=[]
for item in boxes:
    lo=np.array(item['min']);hi=np.array(item['max']);m=trimesh.creation.box(extents=hi-lo);m.apply_translation((hi+lo)/2)
    rgb=bytes.fromhex(item['color'][1:]);m.visual.face_colors=[*rgb,255]
    meshes.append((item['name'],m))
    g=m.copy();g.apply_transform([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]])
    scene.add_geometry(g,node_name=item['name'],geom_name=item['name'])
scene.export(OUT/'mistnost-v1.glb')
with (OUT/'mistnost-v1.obj').open('w') as f:
    f.write('# Metres, Z up. Basic room reconstructed from DXF. See README.\n');offset=1
    for name,m in meshes:
        f.write('o '+name.replace(' ','_')+'\n')
        for v in m.vertices:f.write('v '+' '.join(f'{c:.8f}' for c in v)+'\n')
        for face in m.faces:f.write('f '+' '.join(str(int(c)+offset) for c in face)+'\n')
        offset+=len(m.vertices)
cad=ezdxf.new('R2010');cad.units=4;ms=cad.modelspace()
for item,(_,m) in zip(boxes,meshes):
    layer=item['group'];
    if layer not in cad.layers:cad.layers.new(layer)
    for face in m.faces:ms.add_3dface([tuple(v*1000) for v in m.vertices[face]],dxfattribs={'layer':layer})
cad.saveas(OUT/'mistnost-v1-3d.dxf')
(OUT/'README.txt').write_text(f'''MÍSTNOST S KUCHYNÍ – ZÁKLADNÍ MODEL V1

Vnitřní půdorys z dodaného DXF: {W:.4f} × {D:.4f} m ({W*D:.2f} m²).
Výška 2,60 m je pracovní předpoklad odsouhlasený uživatelem.
Model obsahuje místnost z přiloženého obrázku, nikoli celý byt.
Strop je vynechán pro prohlížení shora. Stěny jsou v souborech v plné výšce.
Půdorysné polohy stěn, jejich tloušťky a otvory vycházejí z DXF.
Drobné odchylky hran výkresu pod 0,1 mm jsou v modelu pravoúhlých stěn zjednodušeny.

VÝŠKY K OVĚŘENÍ MĚŘENÍM
Parapet okna 0,90 m, horní hrana okna 2,10 m.
Horní hrana stavebních dveřních otvorů 2,05 m. V půdorysu je popis dveří
800/1970; stavební otvory mají šířku {doors[0][1]-doors[0][0]:.3f} m a {doors[1][1]-doors[1][0]:.3f} m.
Okenní rámy a zasklení jsou pouze orientační. Je třeba ověřit parapet,
výšku a provedení obou navazujících okenních polí, případně balkonových dveří.
Podlahová deska tl. 0,10 m je vizualizační podklad, ne skladba skutečné podlahy.
Nábytek ani návrh kuchyně zatím nejsou vymodelovány.
Fialový obrys v náhledu označuje pouze půdorysnou stopu původní kuchyně.
Toto je prostorový podklad pro návrh, nikoli prováděcí stavební dokumentace.

SOUBORY
mistnost-v1.glb – barevný 3D model, metry, osa Y nahoru.
mistnost-v1.obj – geometrie, metry, osa Z nahoru.
mistnost-v1-3d.dxf – trojúhelníkové 3DFACE, milimetry, osa Z nahoru.
model.json – rozměry, předpoklady a geometrie jednotlivých dílů.
nahled.html – samostatný interaktivní náhled, funguje bez internetu.
build_room.py – zdroj generátoru (Python, numpy, ezdxf, trimesh).
plzen-byt-podklad.dxf – nezměněná kopie vstupního DXF.

Souřadnice 3D DXF a OBJ: počátek v levém dolním vnitřním rohu místnosti,
X doprava, Y směrem k horní stěně půdorysu, Z vzhůru.
Původní počátek v DXF: X={X0:.8f}, Y={Y0:.8f} mm.
Obnovení polohy: X_puvodni = X_model_mm + X0; Y_puvodni = Y_model_mm + Y0.
''',encoding='utf-8')
shutil.copyfile(SOURCE,OUT/'plzen-byt-podklad.dxf')
shutil.copyfile(__file__,OUT/'build_room.py')
print(json.dumps({k:v for k,v in meta.items() if k!='boxes'},ensure_ascii=False,indent=2))
print('Meshes:',len(meshes),'all closed:',all(m.is_watertight for _,m in meshes))
