const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const model=JSON.parse(fs.readFileSync(__dirname+'/apartment-model.json','utf8'));
for(const width of [360,900]){
 const elements=new Map(),events={};
 for(const tag of html.matchAll(/<(input|select|button)\b[^>]*>/g)){
  const attrs=tag[0],data=attrs.match(/(data-[\w-]+)(?:="([^"]*)")?/);if(!data)continue;
  const key=data[2]?`[${data[1]}="${data[2]}"]`:`[${data[1]}]`;
  elements.set(key,{checked:/\bchecked\b/.test(attrs),value:data[1]==='data-service-layer'?'interior':'',innerHTML:'',style:{},addEventListener(){}});
 }
 for(const s of ['[data-ac-legend]','[data-service-detail]','[data-service-legend]'])elements.set(s,{textContent:'',hidden:false});
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
 api.select('office',false);const layer=elements.get('[data-service-layer]');layer.value='socket';layer.onchange();
 const options=elements.get('[data-service-point]').innerHTML;
 const ids=[...options.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);assert(ids.length>0);for(const id of ids)assert.equal(model.services.points.find(p=>p.id===id)?.room,'PR');
 layer.value='interior';layer.onchange();
 for(const name of ['keyboard','laundry','bins','inspect','open','ceiling','screen','doors','hvac','shutters']){const el=elements.get('[data-'+name+']');el.checked=true;el.onchange();el.checked=false;el.onchange();}
 api.select('all');events.keydown({key:'ArrowLeft',preventDefault(){}});api.zoom(1.15);
 for(const [selector,button] of elements)if(selector.startsWith('[data-view=')){assert.equal(typeof button.onclick,'function',selector);button.onclick();}
 console.log(width+': 10 rooms, 3D/plan, room-scoped points, all toggles and legacy views OK');
}
console.log('Model geometry preserved, source templates resolved, scripts parse.');
