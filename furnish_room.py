from pathlib import Path
import math,json,shutil,zipfile
import numpy as np
import trimesh,ezdxf
from ezdxf import bbox

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'model-mistnosti-v1'
if not OUT.exists() and (ROOT/'model.json').exists(): OUT=ROOT
BASE=ROOT/'room-shell.json'
if not BASE.exists():shutil.copyfile(OUT/'model.json',BASE)
data=json.loads(BASE.read_text());data['version']=8
data['boxes']=[b for b in data['boxes'] if b['group'] in ['wall','floor','frame','glass']]
data['meshes']=[]
source=ROOT/'upload/plzen byt.dxf'
if not source.exists():source=ROOT/'plzen-byt-podklad.dxf'
doc=ezdxf.readfile(source)
X,Y,_=data['dxf_origin_mm']; W=data['room']['width']; D=data['room']['depth']
models=[]; source_items=[]
oak='#b88955';oak_light='#c99e6b';oak_dark='#795739';mineral='#ded6c7';stone='#e6e1d7';black='#303434';metal='#989e9e';fabric='#b7bcb0';fabric_light='#c7cbbf';glass='#aed0cc'

def bounds(handle):
    e=doc.entitydb[handle];b=bbox.extents([e]);r=[(b.extmin.x-X)/1000,(b.extmin.y-Y)/1000,(b.extmax.x-X)/1000,(b.extmax.y-Y)/1000]
    source_items.append({'handle':handle,'name':e.dxf.name,'xy_bounds':r})
    return r
def mesh(name,m,color,group='furniture',material=None):
    rgb=[int(color[i:i+2],16) for i in (1,3,5)];m.visual.face_colors=[*rgb,255]
    m.metadata.update(name=name,group=group)
    models.append((name,m,material or ('glass_block' if group=='luxfer' else 'matte')))
    data['meshes'].append(dict(name=name,group=group,color=color,vertices=np.round(m.vertices,5).tolist(),faces=m.faces.tolist()))
def box(name,a,b,color=oak,group='furniture'):
    a=np.array(a,dtype=float);b=np.array(b,dtype=float);assert np.all(b>a),name
    m=trimesh.creation.box(extents=b-a);m.apply_translation((a+b)/2)
    rgb=[int(color[i:i+2],16) for i in (1,3,5)];m.visual.face_colors=[*rgb,255]
    models.append((name,m,'matte'))
    data['boxes'].append(dict(name=name,min=a.tolist(),max=b.tolist(),group=group,side='',color=color))
def cyl(name,center,radius,height,color,group='furniture',segments=20):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=segments);m.apply_translation(center);mesh(name,m,color,group)
def tube(name,start,end,radius,color,group='kitchen'):
    a=np.array(start);b=np.array(end);vec=b-a;m=trimesh.creation.cylinder(radius=radius,height=np.linalg.norm(vec),sections=12)
    m.apply_transform(trimesh.geometry.align_vectors([0,0,1],vec));m.apply_translation((a+b)/2);mesh(name,m,color,group,'metal')
def rounded(name,a,b,r,color,group='furniture',bevel=.012,n=5):
    x0,y0,z0=a;x1,y1,z1=b;r=min(r,(x1-x0)/2-.0001,(y1-y0)/2-.0001);bevel=min(bevel,(z1-z0)/3,r*.7)
    def ring(inset,z):
        rr=max(.0001,r-inset);q=[]
        for cx,cy,start in [(x1-r,y1-r,0),(x0+r,y1-r,90),(x0+r,y0+r,180),(x1-r,y0+r,270)]:
            for t in np.linspace(start,start+90,n,endpoint=False):q.append([cx+rr*math.cos(math.radians(t)),cy+rr*math.sin(math.radians(t)),z])
        return q
    rings=[ring(bevel,z0),ring(0,z0+bevel),ring(0,z1-bevel),ring(bevel,z1)];verts=sum(rings,[]);k=4*n;faces=[]
    for j in range(3):
        for i in range(k):
            a0=j*k+i;a1=j*k+(i+1)%k;b0=a0+k;b1=a1+k;faces.extend([[a0,a1,b1],[a0,b1,b0]])
    for i in range(1,k-1):faces.extend([[0,i+1,i],[3*k,3*k+i,3*k+i+1]])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=True);m.fix_normals();mesh(name,m,color,group)
def handle(name,x,y,z,axis='x',length=.18):
    if axis=='x':box(name,[x-length/2,y,z-.008],[x+length/2,y+.018,z+.008],black,'kitchen')
    else:box(name,[x,y-length/2,z-.008],[x+.018,y+length/2,z+.008],black,'kitchen')
def grain_front(name,a,b,axis='y',count=8):
    # Sparse geometry lines suggest oak grain without changing the cabinet volume.
    x0,y0,z0=a;x1,y1,z1=b
    for i in range(count):
        t=(i+.65)/count
        col=['#ad804f','#c99b65','#b38a58'][i%3]
        if axis=='y':
            x=x0+(x1-x0)*t;box(name+str(i),[x,y1+.0003,z0+.025],[x+.0015,y1+.0007,z1-.025],col,'kitchen')
        else:
            y=y0+(y1-y0)*t;box(name+str(i),[x0-.0007,y,z0+.025],[x0-.0003,y+.0015,z1-.025],col,'kitchen')

# Base shell from the previously approved room.
for b in data['boxes']:
    a=np.array(b['min']);c=np.array(b['max']);m=trimesh.creation.box(extents=c-a);m.apply_translation((a+c)/2)
    col=b['color'];m.visual.face_colors=[*[int(col[i:i+2],16) for i in (1,3,5)],255];models.append((b['name'],m,'matte'))

# Dining table and four chairs, footprints from DXF.
x0,y0,x1,y1=bounds('62B')
rounded('Jidelni stul - dubova deska',[x0,y0,.725],[x1,y1,.76],.025,oak_light)
for i,x in enumerate([x0+.065,x1-.065]):
    for j,y in enumerate([y0+.09,y1-.09]):tube(f'Noha stolu {i}-{j}',[x,y,.02],[x,y,.725],.024,oak_dark,'furniture')
for i,h in enumerate(['472','473','478','47D']):
    x0,y0,x1,y1=bounds(h);left=i<2
    rounded(f'Zidle {i+1} sedak',[x0+.015,y0+.015,.425],[x1-.015,y1-.015,.48],.075,'#b8a98e',bevel=.018)
    for j,x in enumerate([x0+.085,x1-.085]):
        for k,y in enumerate([y0+.07,y1-.07]):tube(f'Zidle {i+1} noha {j}-{k}',[x,y,.015],[x,y,.425],.013,oak_dark,'furniture')
    a=x0+.005 if left else x1-.06
    rounded(f'Zidle {i+1} operadlo',[a,y0+.025,.46],[a+.055,y1-.025,.84],.024,oak_light,bevel=.01)

# Sofa uses each cushion outline from the drawing, including the chaise on the north end.
sx0,sy0,sx1,sy1=bounds('60E')
rounded('Sedacka podnoz dlouha',[sx0+.55,sy0+.055,.095],[sx1-.035,sy1-.045,.29],.045,'#757d70')
rounded('Sedacka podnoz lenoska',[sx0+.03,sy0+1.44,.095],[sx1-.035,sy1-.045,.29],.035,'#757d70')
for i,e in enumerate(doc.entitydb['60E'].virtual_entities()):
    if e.dxftype()!='LWPOLYLINE':continue
    pts=np.array([(p.x,p.y) for p in e.vertices_in_wcs()]);a=(pts.min(axis=0)-[X,Y])/1000;b=(pts.max(axis=0)-[X,Y])/1000
    dx,dy=b-a
    if dx>.45 and dy>.55:lo,hi,col=.28,.46,fabric_light
    elif dx<.25:lo,hi,col=.29,.87,fabric
    else:lo,hi,col=.29,.66,fabric
    rounded('Sedacka dil '+str(i),[*a,lo],[*b,hi],min(.045,dx*.2,dy*.2),col,bevel=.024)
for i,(x,y) in enumerate([(sx1-.12,sy0+.15),(sx1-.12,sy1-.15),(sx0+.7,sy0+.15),(sx0+.15,sy1-.3)]):cyl('Sedacka noha '+str(i),(x,y,.055),.022,.11,black)

# Round coffee table and storage furniture.
x0,y0,x1,y1=bounds('630');cx=(x0+x1)/2;cy=(y0+y1)/2
cyl('Konferencni stolek deska',(cx,cy,.43),.25,.035,oak_light,segments=40)
for i,t in enumerate([0,120,240]):
    t=math.radians(t);tube('Konferencni stolek noha '+str(i),[cx+.17*math.cos(t),cy+.17*math.sin(t),.015],[cx+.14*math.cos(t),cy+.14*math.sin(t),.412],.014,black,'furniture')
x0,y0,x1,y1=bounds('63C')
box('Nizka knihovna sokl',[x0+.04,y0+.04,.015],[x1-.04,y1-.04,.09],oak_dark)
box('Nizka knihovna zada',[x0,y0,.09],[x1,y0+.02,.78],mineral)
for x in [x0,(x0+x1)/2-.009,x1-.018]:box('Knihovna bocnice '+str(x),[x,y0,.09],[x+.018,y1,.78],oak)
for z in [.09,.40,.76]:box('Knihovna police '+str(z),[x0,y0,z],[x1,y1,z+.02],oak_light)
for i in range(8):
    x=x0+.055+i*.043;box('Kniha '+str(i),[x,y0+.14,.11],[x+.027,y1-.025,.28+(i%3)*.03],['#b99d77','#758980','#bbb9ae','#a77d65'][i%4])
x0,y0,x1,y1=bounds('694')
box('Vysoka skrin u severni steny',[x0,y0,.08],[x1,y1,2.15],oak)
box('Vysoka skrin sever leve celo',[x0+.004,y0-.002,.09],[(x0+x1)/2-.002,y0+.016,2.145],oak_light)
box('Vysoka skrin sever prave celo',[(x0+x1)/2+.002,y0-.002,.09],[x1-.004,y0+.016,2.145],oak_light)
box('Madlo severni skrine',[(x0+x1)/2-.022,y0-.024,1.0],[(x0+x1)/2-.011,y0-.003,1.17],black)

# Kitchen: tall refrigerator and pantry stay exactly where the drawing places them.
for name,h in [('Vestavena lednice','5C6'),('Skrin s troubou','5E8')]:
    x0,y0,x1,y1=bounds(h)
    if h=='5C6':box(name+' korpus',[x0,y0,.07],[x1,y1-.025,2.2],mineral,'kitchen')
    else:
        box(name+' korpus dole',[x0,y0,.07],[x1,y1-.025,.80],mineral,'kitchen')
        box(name+' korpus nahore',[x0,y0,1.40],[x1,y1-.025,2.2],mineral,'kitchen')
        box(name+' pravy bok',[x1-.018,y0,.80],[x1,y1-.025,1.40],oak,'kitchen')
        box('Trouba ve vysoke skrini - telo',[x0+.020,y0+.035,.80],[x1-.020,y1-.025,1.40],black,'kitchen')
        box('Trouba ve vysoke skrini - celo',[x0+.004,y1-.023,.803],[x1-.004,y1+.004,1.397],black,'kitchen')
        box('Sklo trouby ve vysoke skrini',[x0+.044,y1+.005,.86],[x1-.044,y1+.008,1.245],'#485452','kitchen')
        handle('Madlo trouby ve vysoke skrini',(x0+x1)/2,y1+.016,1.28,length=.43)
        for x in [x0+.12,x1-.12]:tube('Knoflik trouby '+str(x),[x,y1+.009,1.355],[x,y1+.022,1.355],.016,metal)
        box('Displej trouby',[(x0+x1)/2-.045,y1+.005,1.336],[(x0+x1)/2+.045,y1+.009,1.373],'#1b2529','kitchen')
    box(name+' dubovy bok',[x0,y0,.075],[x0+.018,y1,2.2],oak,'kitchen')
    levels=[(.09,.80),(.806,2.19)] if h=='5C6' else [(.09,.794),(1.406,2.19)]
    for j,(za,zb) in enumerate(levels):
        a=[x0+.003,y1-.023,za];b=[x1-.003,y1,zb];box(name+' dvere '+str(j),a,b,oak_light,'kitchen');grain_front(name+' vlakna '+str(j),a,b)
        handle(name+' madlo '+str(j),x1-.12,y1+.001,zb-.045,length=.15)

# Plastered supporting partitions, plinth, and oak fronts. No timber lower carcasses.
a=2.25490898202353;b=3.65290898202353;px=3.05290898202353;pb=px+.60
box('Mineralni sokl pod drezem',[a+.015,.035,.015],[b-.015,.54,.10],mineral,'kitchen')
box('Mineralni sokl pod varnou deskou',[px+.06,.54,.015],[b-.025,1.215,.10],mineral,'kitchen')
box('Mineralni sokl za myckou',[px+.06,1.715,.015],[b-.025,1.905,.10],mineral,'kitchen')
for i,x in enumerate([a,px]):box('Zdena pricka '+str(i),[x,.015,.1],[x+.05,.565,.86],mineral,'kitchen')
# Corner storage accessed from living room; placement inferred from user's crop.
box('Rohova skrinka dubova dvirka',[b-.025,.035,.104],[b-.003,.565,.854],oak_light,'kitchen')
box('Rohova skrinka horni madlo',[b-.002,.19,.805],[b+.016,.41,.821],black,'kitchen')
for z in [.12,.46]:box('Rohova skrinka mineralni police '+str(z),[px+.06,.055,z],[b-.035,.54,z+.025],mineral,'kitchen')
box('Pricka pod poloostrovem',[px+.026,1.18,.10],[b-.06,1.23,.86],mineral,'kitchen')
box('Zadni stena pod drezem',[a,.005,.10],[b,.03,.86],mineral,'kitchen')
box('Dubove celo drezu leve',[a+.004,.568,.104],[a+.396,.595,.854],oak_light,'kitchen')
box('Dubove celo drezu prave',[a+.404,.568,.104],[px-.004,.595,.854],oak_light,'kitchen')
for x in [a+.2,a+.60]:handle('Madlo pod drezem '+str(x),x,.596,.815,length=.20)
grain_front('Drez vlakna ',[a+.004,.568,.104],[px-.004,.595,.854],count=14)

# Countertop with a real sink opening matching the drawing.
sx0,sx1=2.4056,2.9556;sy0,sy1=.05,.55
for i,(x0,y0,x1,y1) in enumerate([(a,0,sx0,.6),(sx1,0,b,.6),(sx0,0,sx1,sy0),(sx0,sy1,sx1,.6),(px,.6,pb,2.0)]):
    box('Svetla pracovni deska '+str(i),[x0,y0,.86],[x1,y1,.90],stone,'kitchen')
# Sink lip, drainboard, and recessed bowl.
for i,(x0,y0,x1,y1) in enumerate([(sx0,sy0,sx1,.15),(sx0,.50,sx1,sy1),(sx0,.15,sx0+.05,.50),(sx1-.05,.15,sx1,.50)]):box('Drez nerezovy lem '+str(i),[x0,y0,.895],[x1,y1,.904],metal,'kitchen')
box('Drez dno',[sx0+.05,.15,.735],[sx1-.05,.50,.744],'#6a7476','kitchen')
for i,(x0,y0,x1,y1) in enumerate([(sx0+.05,.15,sx0+.056,.50),(sx1-.056,.15,sx1-.05,.50),(sx0+.05,.15,sx1-.05,.156),(sx0+.05,.494,sx1-.05,.50)]):box('Drez vana '+str(i),[x0,y0,.74],[x1,y1,.90],'#a6acac','kitchen')
cx=(sx0+sx1)/2
tube('Baterie stojanka',[cx,.095,.902],[cx,.095,1.195],.016,black)
tube('Baterie rameno',[cx,.095,1.195],[cx,.285,1.195],.014,black)
tube('Baterie vytok',[cx,.285,1.195],[cx,.285,1.155],.014,black)
cyl('Drez vypust',(cx,.325,.747),.023,.004,metal,'kitchen',24)

# Hob from the DXF, with storage underneath facing the dining side.
x0,y0,x1,y1=bounds('622');rounded('Cerna varna deska',[x0,y0,.901],[x1,y1,.910],.012,'#222728','kitchen',bevel=.002)
seen_circles=set()
for i,e in enumerate(doc.entitydb['622'].virtual_entities()):
    if e.dxftype() in ['CIRCLE','ARC']:
        key=(*np.round(e.dxf.center,5),round(e.dxf.radius,5))
        if key in seen_circles:continue
        seen_circles.add(key)
        c=e.dxf.center;xx=(c.x-X)/1000;yy=(c.y-Y)/1000;r=e.dxf.radius/1000
        cyl('Varny kruh '+str(i),(xx,yy,.911),r,.003,'#818988','kitchen',28)
        cyl('Varny kruh stred '+str(i),(xx,yy,.913),max(.008,r-.0025),.002,'#252a2b','kitchen',28)
for i,(za,zb) in enumerate([(.104,.335),(.341,.585),(.591,.854)]):
    aa=[px+.003,.608,za];bb=[px+.028,1.196,zb]
    box('Ulozny prostor pod varnou deskou '+str(i),aa,bb,oak_light,'kitchen')
    handle('Madlo pod varnou deskou '+str(i),px-.019,.90,zb-.04,axis='y',length=.24)
# Proposed 45 cm dishwasher replaces the last wide drawer bank.
dy0,dy1=1.235,1.685
dx0,dx1=px+.03,px+.58
for i,(aa,bb) in enumerate([
    ([dx0,dy0+.001,.045],[dx1,dy0+.012,.86]),
    ([dx0,dy1-.012,.045],[dx1,dy1-.001,.86]),
    ([dx0,dy0,.045],[dx1,dy1,.065]),
    ([dx0,dy0,.835],[dx1,dy1,.86]),
    ([dx1-.02,dy0,.065],[dx1,dy1,.835])]):box('Mycka 45 telo '+str(i),aa,bb,'#737e7c','dishwasher')
for rack,z in enumerate([.28,.57]):
    for i in range(9):
        x=dx0+.035+i*.054;box(f'Mycka kos {rack} pricnik {i}',[x,dy0+.022,z],[x+.004,dy1-.022,z+.004],metal,'dishwasher')
    for i in range(5):
        y=dy0+.03+i*.095;box(f'Mycka kos {rack} podelnik {i}',[dx0+.022,y,z+.004],[dx1-.025,y+.004,z+.008],metal,'dishwasher')
box('Mycka dubove celo',[px+.007,dy0+.002,.045],[px+.028,dy1-.002,.84],oak_light,'dishwasher_door')
box('Mycka madlo',[px-.017,dy0+.115,.785],[px+.003,dy1-.115,.801],black,'dishwasher_door')
box('Mycka ovladani na horni hrane',[px+.028,dy0+.035,.817],[px+.032,dy1-.035,.839],black,'dishwasher_door')
box('Pricka za myckou',[px+.03,1.695,.02],[px+.58,1.715,.86],mineral,'kitchen')
box('Uzky ulozny modul na konci',[px+.003,1.720,.104],[px+.028,1.903,.854],oak_light,'kitchen')
handle('Madlo uzkeho modulu',px-.019,1.81,.815,axis='y',length=.10)

# Luxfer end cap: 3 x 4 proposed 190 mm blocks with 10 mm joints.
box('Luxfery sokl',[px+.005,1.91,.015],[b-.005,1.99,.05],mineral,'luxfer')
for col in range(3):
    for row in range(4):
        x=px+.005+col*.2;z=.05+row*.2
        rounded(f'Luxfera {col+1}-{row+1}',[x,1.912,z],[x+.19,1.992,z+.19],.007,glass,'luxfer',bevel=.006,n=3)
        box(f'Luxfera odlesk {col}-{row}',[x+.015,1.9921,z+.022],[x+.023,1.9927,z+.165],'#d8e9e4','luxfer')
for row in range(4):box('Spara luxfer vodorovna '+str(row),[px+.005,1.92,.24+row*.2],[b-.005,1.984,.25+row*.2],mineral,'luxfer')
for col in range(2):box('Spara luxfer svisla '+str(col),[px+.195+col*.2,1.92,.05],[px+.205+col*.2,1.984,.84],mineral,'luxfer')
box('Podpora desky u luxfer - horni profil',[px+.025,1.882,.835],[b-.025,1.906,.86],black,'kitchen')
for x in [px+.03,b-.05]:box('Podpora desky u luxfer - stojka '+str(x),[x,1.884,.05],[x+.02,1.904,.855],black,'kitchen')

# Only the end cap retains glass blocks; restore the original 600 mm peninsula.
box('Zadni hladky mineralni panel',[px+.58,.60,.05],[px+.60,1.905,.86],mineral,'kitchen')

# Full-room ceiling: proposed underside 2.35 m; hood envelope is provisional.
hx,hy=3.3476,.9141
hx0,hx1=hx-.25,hx+.25;hy0,hy1=hy-.45,hy+.45
white='#eeeae1'
# Grid avoids the hood and the retractable screen slot, with no fake overlapping slab.
xs=sorted([0,hx0,hx1,W]);ys=sorted([0,hy0,hy1,D])
for i in range(len(xs)-1):
 for j in range(len(ys)-1):
    x0,x1=xs[i:i+2];y0,y1=ys[j:j+2];cx=(x0+x1)/2;cy=(y0+y1)/2
    if hx0<cx<hx1 and hy0<cy<hy1:continue
    box(f'Celoplosny podhled panel {i}-{j}',[x0,y0,2.35],[x1,y1,2.365],white,'ceiling')
for name,aa,bb in [('sever',[0,D-.035,2.35],[W,D,2.38]),('jih',[0,0,2.35],[W,.035,2.38]),('zapad',[0,0,2.35],[.035,D,2.38]),('vychod',[W-.035,0,2.35],[W,D,2.38])]:
 box('Podhled obvod '+name,aa,bb,white,'ceiling_edge')
box('LuxeAir navrh tela',[hx0+.01,hy0+.01,2.354],[hx1-.01,hy1-.01,2.572],metal,'hood')
box('Digestor nasavaci ramecek',[hx0,hy0,2.344],[hx1,hy1,2.352],'#555d5a','hood')
box('Digestor bily panel',[hx0+.012,hy0+.035,2.341],[hx1-.012,hy1-.035,2.349],white,'hood')
for x in [hx0+.035,hx1-.045]:box('LED digestore '+str(x),[x,hy0+.10,2.339],[x+.010,hy1-.10,2.341],'#fff5dc','hood')
# Wall-mounted retractable screen above south bookcase and part of doorway.
box('Platno nastenne pouzdro',[3.73,.055,2.20],[5.85,.185,2.33],white,'projection')
for x in [3.80,5.75]:
    box('Platno nastenny drzak '+str(x),[x,0,2.215],[x+.055,.08,2.315],metal,'projection')
box('Platno vystupni sterbina',[3.85,.163,2.195],[5.77,.177,2.20],black,'projection')
box('Platno cerna zadni plocha',[3.895,.170,1.0225],[5.745,.175,2.195],black,'screen')
box('Platno bila projekcni plocha 16-9',[3.92,.175,1.0475],[5.72,.178,2.06],'#f7f4eb','screen')
box('Platno spodni zavazi',[3.88,.150,1.0075],[5.76,.195,1.03],white,'screen')
# Generic projector; shelf height and lens offset require a matching final device.
rounded('Projektor bile telo',[5.30,2.10,2.08],[5.56,2.40,2.20],.025,white,'projection',bevel=.012)
tube('Projektor objektiv',[5.285,2.25,2.115],[5.31,2.25,2.115],.035,black,'projection')
tube('Projektor sklo objektivu',[5.282,2.25,2.115],[5.285,2.25,2.115],.026,'#738c99','projection')
for i in range(5):box('Projektor vetrani '+str(i),[5.35+i*.025,2.4001,2.105],[5.36+i*.025,2.401,2.17],metal,'projection')

# Upper cabinets from the DXF footprints.
for k,h in enumerate(['5EE','5F4']):
    x0,y0,x1,y1=bounds(h);box('Horni skrinka korpus '+str(k),[x0,y0,1.50],[x1,y1-.02,2.20],mineral,'kitchen')
    mid=(x0+x1)/2
    for j,(a0,a1) in enumerate([(x0+.003,mid-.003),(mid+.003,x1-.003)]):
        aa=[a0,y1-.02,1.504];bb=[a1,y1,2.196];box(f'Horni dubove celo {k}-{j}',aa,bb,oak_light,'kitchen');grain_front(f'Horni vlakna {k}-{j}',aa,bb,count=5)
        handle(f'Horni madlo {k}-{j}',(a0+a1)/2,y1+.001,1.53,length=.12)

# User revision: sofa rotated 90 degrees and mirrored; chaise at the east window.
def transform_named(predicate, matrix):
    for name,m,mat in models:
        if predicate(name): m.apply_transform(matrix)
    for item in data['meshes']:
        if predicate(item['name']):
            v=np.array(item['vertices']);item['vertices']=np.round(trimesh.transform_points(v,matrix),5).tolist()
            if np.linalg.det(matrix[:3,:3])<0:item['faces']=[f[::-1] for f in item['faces']]
    for item in data['boxes']:
        if predicate(item['name']):
            a=np.array(item['min']);b=np.array(item['max'])
            v=np.array([[x,y,z] for x in [a[0],b[0]] for y in [a[1],b[1]] for z in [a[2],b[2]]])
            v=trimesh.transform_points(v,matrix);item['min']=v.min(axis=0).tolist();item['max']=v.max(axis=0).tolist()
old=next(v['xy_bounds'] for v in source_items if v['handle']=='60E')
sofa_width=2.10
sofa_x=W-.05-sofa_width;sofa_y=D-.05-(old[2]-old[0])
width_scale=sofa_width/(old[3]-old[1])
T=np.eye(4);T[:2,:2]=[[0,width_scale],[1,0]];T[:2,3]=[sofa_x-width_scale*old[1],sofa_y-old[0]]
transform_named(lambda n:n.startswith('Sedacka'),T)
# Extend only the forward chaise region by 200 mm; ordinary seats stay unchanged.
def extend_chaise(v):
    v=np.array(v,dtype=float);v[:,1]-=.20*np.clip((2.55-v[:,1])/(2.55-sofa_y),0,1);return v
for name,m,mat in models:
    if name.startswith('Sedacka'):m.vertices=extend_chaise(m.vertices)
for m in data['meshes']:
    if m['name'].startswith('Sedacka'):m['vertices']=np.round(extend_chaise(m['vertices']),5).tolist()
oldtable=next(v['xy_bounds'] for v in source_items if v['handle']=='630')
T=np.eye(4);T[:2,3]=[4.40-(oldtable[0]+oldtable[2])/2,1.72-(oldtable[1]+oldtable[3])/2]
transform_named(lambda n:n.startswith('Konferencni stolek'),T)
T=np.eye(4);T[:2,:2]=[[0,1],[1,0]];T[:2,3]=[4.82-2.25,3.035-5.285];T[2,3]=-.02
transform_named(lambda n:n.startswith('Projektor'),T)
data['assumptions']['sofa_revision']={'rotation_degrees':90,'mirrored':True,'back_wall':'north','chaise_side':'east/window','north_cabinet_shift_x':0,'width':2.10,'chaise_depth':1.50,'coffee_table_center':[4.4,1.72]}
data['assumptions']['projection']={'screen_image':[1.80,1.0125],'screen_plane_y':.178,'screen_center_x':4.82,'lens_position':[4.82,3.035,2.095],'throw_distance':2.857,'throw_ratio':2.857/1.8,'screen':'wall-mounted retractable cassette on south wall above bookcase and part of doorway','mount':'standing on north-wall shelf','status':'layout only; deployed screen overlaps doorway; generic projector, lens offset to be matched to shelf height'}
# Oak shelves, a reading lamp, and framed art use real editable model geometry.
def ellipsoid(name,center,scale,color):
    m=trimesh.creation.icosphere(subdivisions=1,radius=1);m.apply_scale(scale);m.apply_translation(center);mesh(name,m,color,'decor')
def plant(name,x,y,z,h=.30):
    cyl(name+' kvetinac',(x,y,z+.065),.075,.13,'#b7785b','decor',16)
    cyl(name+' zemina',(x,y,z+.130),.064,.003,'#51473a','decor',16)
    tube(name+' stonek',[x,y,z+.13],[x,y,z+h],.006,'#657746','decor')
    for i in range(7):
        a=i*2.4;zz=z+.16+i*(h-.15)/7;dx=.062*math.cos(a);dy=.062*math.sin(a)
        tube(name+' vetvicka '+str(i),[x,y,zz],[x+dx,y+dy,zz+.035],.0035,'#657746','decor')
        ellipsoid(name+' list '+str(i),[x+dx,y+dy,zz+.05],[.07,.035,.038],['#57734c','#829464','#6b8755'][i%3])
def north_shelf(name,x0,x1,z,depth=.22):
    box(name,[x0,D-depth,z],[x1,D-.005,z+.03],oak_light,'decor')
    for x in [x0+.10,x1-.10]:box(name+' konzola '+str(x),[x,D-.045,z-.10],[x+.018,D-.005,z],black,'decor')
north_shelf('Police projektoru nad gaucem',4.30,5.35,2.01,.47)
for x in [4.72,4.92]:
    for y in [3.10,3.25]:cyl('Projektor nozicka '+str((x,y)),(x,y,2.05),.012,.02,black,'projection',12)
north_shelf('Police nad gaucem leva',3.78,4.20,1.67)
north_shelf('Police nad gaucem prava',5.42,5.80,1.84)
plant('Kytka nad gaucem',5.62,D-.115,1.87,.29)
for i in range(5):box('Knihy nad gaucem '+str(i),[3.84+i*.041,D-.19,1.70],[3.87+i*.041,D-.04,1.89+(i%2)*.035],['#b99d77','#758980','#bbb9ae'][i%3],'decor')
# Compact adjustable wall reading light at the chaise, below the right shelf.
box('Lampa na cteni nastenna patka',[5.64,D-.04,1.40],[5.74,D-.005,1.54],black,'decor')
tube('Lampa na cteni rameno',[5.69,D-.04,1.47],[5.57,D-.29,1.48],.013,black,'decor')
tube('Lampa na cteni kloubove rameno',[5.57,D-.29,1.48],[5.51,D-.39,1.39],.012,black,'decor')
tube('Lampa na cteni hlavice',[5.51,D-.39,1.40],[5.47,D-.47,1.31],.046,black,'decor')
tube('Lampa na cteni svetelna plocha',[5.47,D-.47,1.31],[5.466,D-.478,1.301],.038,'#ffe4ad','decor')
# West wall opposite the window: staggered shelves and restrained abstract pictures.
for name,y0,y1,z in [('Police zapad dolni',.38,1.53,1.13),('Police zapad stredni',1.73,2.99,1.49),('Police zapad horni',.60,1.59,1.94)]:
    box(name,[.005,y0,z],[.24,y1,z+.03],oak_light,'decor')
    for y in [y0+.12,y1-.12]:box(name+' konzola '+str(y),[.005,y,z-.12],[.045,y+.018,z],black,'decor')
plant('Kytka zapad dolni',.13,.60,1.16,.32)
plant('Kytka zapad stredni',.13,2.77,1.52,.38)
plant('Kytka zapad horni',.13,.82,1.97,.24)
for i in range(4):box('Knihy zapad '+str(i),[.045,1.85+i*.038,1.52],[.20,1.88+i*.038,1.73+(i%2)*.04],['#b99d77','#758980','#bbb9ae'][i%3],'decor')
def picture(name,y,z,w,h):
    box(name+' dubovy ram',[.005,y,z],[.045,y+w,z+h],oak_dark,'decor')
    box(name+' pasparta',[.045,y+.018,z+.018],[.047,y+w-.018,z+h-.018],'#ece5d7','decor')
    box(name+' barevna plocha',[.047,y+w*.17,z+h*.15],[.048,y+w*.65,z+h*.53],'#819078','decor')
    m=trimesh.creation.cylinder(radius=w*.18,height=.002,sections=28);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],[1,0,0]));m.apply_translation([.049,y+w*.61,z+h*.69]);mesh(name+' kruh',m,'#bd815c','decor')
picture('Obraz zapad vetsi',1.82,1.84,.59,.43)
picture('Obraz zapad mensi',.99,1.32,.39,.46)
data['assumptions']['shelves_and_decor']={'north':'three oak shelves, middle shelf holds projector; books and plant','west':'three staggered oak shelves with plants and two abstract framed pictures','reading_lamp':'articulated north-wall lamp above chaise','status':'concept dimensions; no specific products chosen'}
data['assumptions']['corner_storage']='East-facing door at kitchen corner beside doorway, inferred from cropped image; confirm location'
data['source_furniture']=source_items
data['dishwasher_hinge']=[px+.028,.045]
data['kitchen_footprint'][1][2]=pb
data['assumptions'].update({'dishwasher_proposal':{'width':.45,'body_depth':.55,'height_envelope':.815,'opening':'towards dining side','status':'optional proposal; choose exact appliance and verify installation guide'},'peninsula_width_changed_from_to':[.60,.60],'hood_proposal':{'type':'recessed ceiling hood in full-room soffit','appliance_envelope':[.50,.90,.218],'face_height':2.35,'full_soffit_drop_proposed':.25,'mode':'recirculation considered; kit and outlet need verification','reference':'Klarstein LuxeAir 90 white 10046470; provisional envelope, confirm manual before purchase','status':'UNVERIFIED for ceiling clearance: manual recommends 650-750 mm above hob; proposed 1450 mm needs explicit manufacturer confirmation'},'oven_location':'high cabinet between sink and refrigerator, confirmed by user','oven_bottom_proposed':.80,'oven_top_proposed':1.40,'countertop_height':.90,'tall_kitchen_units_height':2.20,'upper_cabinets_bottom':1.50,'table_height':.76,'sofa_seat_height':.46,'north_cabinet_height':2.15,'bookcase_height':.78,'luxfer_block_proposal':[.19,.08,.19],'luxfer_end_cap':'3 columns x 4 rows at free end only; rear mineral panel; peninsula restored to 600 mm'})
(OUT/'model.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
scene=trimesh.Scene()
for name,m,mat in models:
    g=m.copy();g.apply_transform([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]])
    # Solid pale glass proxy keeps block geometry visible in all GLB viewers.
    scene.add_geometry(g,node_name=name,geom_name=name)
scene.export(OUT/'mistnost-v1.glb')
with (OUT/'mistnost-v1.obj').open('w') as f:
    f.write('# Furnished room revision 8. Metres, Z up. See README.\n');offset=1
    for name,m,mat in models:
        f.write('o '+name.replace(' ','_')+'\n')
        for v in m.vertices:f.write('v '+' '.join(f'{c:.6f}' for c in v)+'\n')
        for face in m.faces:f.write('f '+' '.join(str(int(c)+offset) for c in face)+'\n')
        offset+=len(m.vertices)
cad=ezdxf.new('R2010');cad.units=4;ms=cad.modelspace()
for name,m,mat in models:
    col=m.visual.face_colors[0][:3];rgb=tuple(int(x) for x in col)
    for face in m.faces:ms.add_3dface([tuple(v*1000) for v in m.vertices[face]],dxfattribs={'true_color':ezdxf.colors.rgb2int(rgb)})
cad.saveas(OUT/'mistnost-v1-3d.dxf')
(OUT/'README.txt').write_text('''MÍSTNOST S KUCHYNÍ – DOPLNĚNÁ VERZE 8

Rozměry místnosti 5,8700 × 3,4497 m. Schválená pracovní výška 2,60 m.
Nábytek je doplněn podle půdorysných poloh a rozměrů bloků ve vstupním DXF:
jídelní stůl 800 × 1400 mm, čtyři židle, rohová sedačka upravená na 2100 mm šířky s lenoškou 1500 mm,
kulatý stolek průměru 500 mm, knihovna při jižní stěně a vysoká skříň u severní.
Výšky, profilace, čalounění, materiály a detaily nábytku jsou návrhové.

KUCHYNĚ
Tvar a základní moduly vycházejí z DXF: dvě vysoké skříně 600 mm,
dřezová část 800 mm, roh a poloostrov hloubky 600 mm a délky 2000 mm
od jižní stěny. Dřez a varná deska zůstávají na místech podle DXF.
Pracovní deska 900 mm nad podlahou, horní skříňky 1500–2200 mm.
Dubová čela, světlá pracovní deska, minerální spodní konstrukce.
Na volném konci poloostrova je navrženo 3 × 4 luxfer po 190 mm,
10mm spáry. Zadní strana směrem k sedačce je opět hladký minerální panel.
Poloostrov je vrácen na původní šířku 600 mm. Návrhový zadní panel má 20 mm.
V prostoru za varnou deskou je navržena volitelná vestavná myčka šířky 450 mm,
vedle ní zbývá úzký úložný díl. Přívod vody a odpad se vedou od dřezu
v přístupném prostoru spodní konstrukce; konkrétní trasu a hadice ověřit.
Model myčky používá obálku hloubky 550 mm, výšky 815 mm; před stavbou
je nutné vybrat spotřebič a použít jeho montážní návod včetně dvířek a soklu.
V náhledu lze otevřít čelo myčky směrem k jídelnímu stolu.
Nad varnou deskou je bílá zapuštěná digestoř: cenově dostupný kandidát
Klarstein LuxeAir 90 (10046470), nabízený za 9859 Kč dne 2.9.2026.
Rozměrová obálka podle produktové stránky 900 × 500 × 218 mm je předběžná.
Celoplošný podhled je navržen ve výšce 2350 mm, tedy snížení o 250 mm.
Před objednávkou ověřit rozměrový výkres, montážní prostor a vedení odtahu;
produktové popisy uvádějí nejednotné rozměry. Podhled 250 mm zatím není
potvrzenou montážní hloubkou pro tuto digestoř. Návod výrobce navíc doporučuje
odstup 650–750 mm od desky, zatímco návrh má 1450 mm. Proto jde pouze
o cenového kandidáta, nikoliv potvrzený výběr spotřebiče. Vhodnost tohoto
odstupu musí potvrdit výrobce nebo je nutné zvolit jiný model.
Návod: https://res.cloudinary.com/chal-tec/image/upload/bbg/10046470/bda/10046470_BDA_DE-EN-FR-IT-ES.pdf
Recirkulace musí vracet
vzduch do místnosti přes výdech, nikoliv do uzavřené dutiny podhledu.
Zdroj: https://www.klarstein.co.uk/luxeair-90-extractor-hood-p-10046470.html
Cena: https://www.klarstein.cz/luxeair-90cm-751m-h-stropni-digestor-bila-p-10046470.html
Roh kuchyně vedle dveří má nově dubová dvířka směrem do obývací části.
Umístění je odvozeno z výřezu obrázku; uživatel ještě nepotvrdil přesnou polohu.

PROMÍTÁNÍ – UPRAVENÉ ROZMÍSTĚNÍ
Sedačka je otočena o 90 stupňů a zrcadlově převrácena. Záda jsou u severní
stěny, lenoška na východní straně u okna. Šířka je zmenšena na 2100 mm,
lenoška prodloužena na 1500 mm. Vysoká severní skříň je zpět v původní poloze. Konferenční stolek
je před sedačkou, střed X=4,40 m, Y=1,72 m.
Plátno má pouzdro připevněné na jižní stěně nad nízkou skříňkou a částí dveří.
Není v podhledu. Obraz 1800 × 1012,5 mm má střed X=4,82 m, rovinu Y=0,178 m.
Horní hrana obrazu je 2,06 m, spodní 1,0475 m; při stažení částečně zakrývá dveře.
Projektor stojí na prostřední dubové polici nad sedačkou a míří na jih.
Vzdálenost objektivu od plátna je 2,857 m. Stropní držák je odstraněn.
Nad sedačkou jsou další dvě police s knihami a rostlinou. U lenošky je
nástěnná kloubová lampa na čtení. Na západní stěně naproti oknu jsou
tři dubové police s květinami, knihami a dva abstraktní obrazy.
Jde o obecný model bez výběru konkrétní značky. Rozměry a výšky jsou návrhové.
Původní štěrbina pro plátno v podhledu je odstraněna a podhled doplněn.
V interaktivním náhledu lze plátno zasunout a podhled zobrazit/skrýt.

Vedle luxfer je znázorněna samostatná podpora desky. Jde o prostorový
návrh; detaily kotvení a únosnost nejsou stavebním řešením.
Trouba je podle upřesnění uživatele ve vysoké skříni mezi dřezem a lednicí.
Její spodní hrana 800 mm a horní 1400 mm jsou zatím návrhové.
Pod varnou deskou jsou nyní navrženy zásuvky.
Luxfery mají v modelu neprůhledný světle zelený náhradní materiál;
nepředstavují fyzikálně přesné zobrazení průsvitnosti či lomu světla.

PŘEDPOKLADY MÍSTNOSTI
Parapet 0,90 m, horní hrana okna 2,10 m a horní hrana dveřních stavebních
otvorů 2,05 m jsou nadále orientační. Provedení okna a jeho výšky ověřit.
Export obsahuje celý podhled a stažené plátno jako pojmenované objekty.
Náhled podhled ve výchozím pohledu skrývá; lze jej zobrazit přepínačem.
Nábytek je ve výchozím celkovém pohledu kompletní.

SOUBORY
mistnost-v1.glb – aktuální barevný model verze 8, metry, Y nahoru.
mistnost-v1.obj – aktuální geometrie, metry, Z nahoru.
mistnost-v1-3d.dxf – aktuální barevné 3DFACE, milimetry, Z nahoru.
model.json – kompletní geometrie, původní polohy DXF a návrhové předpoklady.
nahled.html – samostatný otáčivý náhled bez připojení k internetu.
build_room.py, furnish_room.py – generátory modelu (numpy, ezdxf, trimesh).
plzen-byt-podklad.dxf – nezměněný vstupní výkres.
Číslo v názvu souborů zůstává kvůli návaznosti; obsah je doplněná verze 8.
''',encoding='utf-8')
if Path(__file__).resolve()!=(OUT/'furnish_room.py').resolve():shutil.copyfile(__file__,OUT/'furnish_room.py')
if BASE.resolve()!=(OUT/'room-shell.json').resolve():shutil.copyfile(BASE,OUT/'room-shell.json')
print(json.dumps({'parts':len(models),'boxes':len(data['boxes']),'meshes':len(data['meshes']),'all_closed':all(m.is_watertight for _,m,_ in models),'data_bytes':(OUT/'model.json').stat().st_size,'source_items':len(source_items)},ensure_ascii=False))
# Rebuild the portable viewer and model bundle from the current revision.
fragment=(OUT/'viewer-template.html').read_text().replace('__MODEL_JSON__',(OUT/'model.json').read_text())
viewer=OUT/'nahled.html'
if viewer.exists():
    old=viewer.read_text();prefix=old[:old.index('<div id=')].replace('verze 7','verze 8')
    viewer.write_text(prefix+fragment+'</html>')
if Path(__file__).resolve()!=(OUT/'furnish_room.py').resolve():shutil.copyfile(__file__,OUT/'furnish_room.py')
archive=ROOT/'mistnost-v1.zip' if OUT!=ROOT else ROOT.parent/'mistnost-v1.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.iterdir()):
        if p.is_file():z.write(p,OUT.name+'/'+p.name)
