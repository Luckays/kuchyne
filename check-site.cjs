const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert(!html.includes('data-view='),'Legacy view controls must be removed');
assert(!html.includes('id="room-note"'),'Working notes must be removed');
assert(!html.includes('Pracovní návrh'),'Draft badge must be removed');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const model=require('./model-updates.cjs')(JSON.parse(fs.readFileSync(__dirname+'/apartment-model.json','utf8')));
const wcDoor=model.doors.items.find(d=>d.id==='DV7');
assert.equal(model.ceiling.drop,.12);
assert.equal(model.ceiling.finished_height,2.48);
assert.equal(model.wall_ac_units.Loznice.wall,'north');
const acBody=model.boxes.find(b=>b.name==='Nastenna klimatizace Loznice telo');
const track=model.boxes.find(b=>b.name==='DV3 kryt kolejnice');
assert(acBody.min[2]>track.max[2]);
assert(acBody.max[2]<2.48);
for(const b of model.boxes.filter(b=>b.group==='ceiling'))assert(Math.abs(b.min[2]-2.48)<1e-8);
assert.equal(model.boxes.filter(b=>b.name.startsWith('Podhled 12 cm')).length,8);
const bedroomDoor=model.doors.items.find(d=>d.id==='DV3');
assert.equal(bedroomDoor.type,'wall_slide');assert.equal(bedroomDoor.angle,0);
const bedroomLeaf=model.boxes.find(b=>b.name==='DV3 Loznice posuvne kridlo');
assert(bedroomLeaf.max[1]<-.15,'Leaf must stay inside bedroom');
assert(bedroomLeaf.max[0]+bedroomDoor.slide[0]<5.87,'Open leaf fits before room corner');
assert(bedroomLeaf.min[0]+bedroomDoor.slide[0]>bedroomDoor.opening[1][0],'Open leaf clears doorway');
const swept={min:bedroomLeaf.min,max:bedroomLeaf.max.map((v,i)=>v+bedroomDoor.slide[i])};
for(const unit of model.boxes.filter(b=>b.name.startsWith('Nastenna klimatizace Loznice'))){
 assert(![0,1,2].every(i=>unit.min[i]<swept.max[i]&&unit.max[i]>swept.min[i]),'AC must clear door travel');
}
assert.deepEqual(model.services.routes.find(r=>r.id==='AC-LO').path.at(-1),model.services.points.find(p=>p.id==='K-LO').xyz);
assert.equal(wcDoor.type,'pocket');assert.equal(wcDoor.angle,0);
for(const box of model.boxes.filter(b=>b.door_id==='DV7')){
 assert(box.min[0]+wcDoor.slide[0]>=wcDoor.pocket_bounds[0][0]);
 assert(box.max[0]+wcDoor.slide[0]<=wcDoor.pocket_bounds[1][0]);
 assert(box.min[1]>=wcDoor.pocket_bounds[0][1]&&box.max[1]<=wcDoor.pocket_bounds[1][1]);
}
for(const width of [360,900]){
 const elements=new Map(),events={};
 for(const tag of html.matchAll(/<(input|select|button)\b[^>]*>/g)){
  const attrs=tag[0],data=attrs.match(/(data-[\w-]+)(?:="([^"]*)")?/);if(!data)continue;
  const key=data[2]?`[${data[1]}="${data[2]}"]`:`[${data[1]}]`;
  elements.set(key,{checked:/\bchecked\b/.test(attrs),value:data[1]==='data-service-layer'?'interior':'',innerHTML:'',style:{},addEventListener(){}});
 }
 for(const s of ['[data-service-detail]','[data-service-legend]'])elements.set(s,{textContent:'',hidden:false});
 const canvas=createCanvas(width,380);canvas.clientWidth=width;canvas.clientHeight=380;canvas.style={};canvas.addEventListener=(k,v)=>events[k]=v;canvas.setPointerCapture=()=>{};
 elements.set('canvas',canvas);
 const root={querySelector:s=>{assert(elements.has(s),'Missing UI element '+s);return elements.get(s);},querySelectorAll:()=>[...elements].filter(([s])=>s.startsWith('[data-view=')).map(([,el])=>el)};
 const window={devicePixelRatio:1};
 vm.runInNewContext(script,{document:{getElementById:()=>root,documentElement:{}},window,getComputedStyle:()=>({getPropertyValue:k=>({'--foreground':'#222c30','--background':'#f5f6f7','--border':'#ccd4d8'}[k]||'')}),ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},console});
 const api=window.apartmentUI;assert(api);
 const fingerprints=new Set();
 for(const room of ['all','living','office','children','bedroom','bath','wc','wardrobe','hall','balcony']){
  api.select(room,false);const image=canvas.toBuffer('image/png');assert(image.length>3000,room+' empty');fingerprints.add(image.toString('base64').slice(-1000));
  api.select(room,true);
 }
 assert(fingerprints.size>=9,'Room images should differ');
 api.select('bedroom',false);const shut=canvas.toBuffer('image/png');
 elements.get('[data-doors]').checked=true;elements.get('[data-doors]').onchange();
 assert(!canvas.toBuffer('image/png').equals(shut),'Bedroom slider must change the rendered view');
 elements.get('[data-doors]').checked=false;elements.get('[data-doors]').onchange();
 api.select('office',false);const layer=elements.get('[data-service-layer]');layer.value='socket';layer.onchange();
 const options=elements.get('[data-service-point]').innerHTML;
 const ids=[...options.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);assert(ids.length>0);for(const id of ids)assert.equal(model.services.points.find(p=>p.id===id)?.room,'PR');
 layer.value='interior';layer.onchange();
 for(const name of ['keyboard','laundry','bins','inspect','open','ceiling','screen','doors','hvac','shutters']){const el=elements.get('[data-'+name+']');el.checked=true;el.onchange();el.checked=false;el.onchange();}
 api.select('all');events.keydown({key:'ArrowLeft',preventDefault(){}});api.zoom(1.15);
 console.log(width+': 10 rooms, 3D/plan, room-scoped points, all toggles OK');
}
console.log('Model geometry preserved, source templates resolved, scripts parse.');
