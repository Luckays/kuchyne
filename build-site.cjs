// Dependency-free build. Keep the current apartment and the original room assets separate.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const model=JSON.parse(read('apartment-model.json'));
if(model.version!==20)throw Error('Review adapter before changing model revision');
const original=read('apartment-viewer.html');
let renderer=original.match(/<script>([\s\S]*?)<\/script>/)[1];
renderer=renderer.replace('const model=__MODEL_JSON__;','const model='+JSON.stringify(model).replace(/</g,'\\u003c')+';');
renderer=renderer.replace('function pointVisible(p){','let activeRoom=null;\nfunction pointVisible(p){if(activeRoom&&p.room!==activeRoom)return false;');
renderer=renderer.replace(".concat(rv?[{name:'View floor',group:'floor',min:[rv.b[0],rv.b[1],-.06],max:[rv.b[2],rv.b[3],0],color:'#c5bba6'}]:[])",'.concat(roomFloor(rv))');
renderer=renderer.replace("if(inspect.checked&&b.group==='r18_door')continue;","if(focus==='hall'&&b.max[0]<-.10&&b.max[1]<-1.30)continue;\n if(inspect.checked&&b.group==='r18_door')continue;");
renderer=renderer.replace("for(const t of meshTriangles){","for(const t of meshTriangles){if(focus==='hall'&&Math.max(...t.v.map(p=>p[0]))<-.10&&Math.max(...t.v.map(p=>p[1]))<-1.30)continue;");
// Do not cut a room-view floor or service routes from neighbouring rooms into the view.
renderer=renderer.replace('const path=r.path.map(project);',"if(activeRoom){const ids=new Set(svc.points.filter(p=>p.room===activeRoom).map(p=>p.id));if(!ids.has(r.start)&&!ids.has(r.end))continue;}const path=r.path.map(project);");
// Preserve room views while inspecting options; register after the legacy handlers.
const anchor='new ResizeObserver(draw).observe(canvas);';
renderer=renderer.replace(anchor,read('room-adapter.js')+'\n'+anchor);
// Bound software raster cost on large screens, and allow rendering at native 1x density.
renderer=renderer.replace('ratio=Math.min(2,Math.max(1.5,window.devicePixelRatio||1))','ratio=Math.min(1.5,window.devicePixelRatio||1)');
const buttons=[...original.matchAll(/<button[^>]*data-view="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(([,id,label])=>`<button type="button" data-view="${id}">${label}</button>`).join('');
// The old loop registers only the three existing room buttons, before adapter views are added.
let html=read('site-shell.html').replace('__STYLE__',()=>read('site.css')).replace('__LEGACY_BUTTONS__',()=>buttons).replace('__RENDERER__',()=>renderer).replace('__APP__',()=>read('site-app.js'));
html=html.replace(/[\t ]+$/gm,'');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
if(/__[A-Z_]+__/.test(html))throw Error('Unresolved template token');
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log(`Built index.html: ${Buffer.byteLength(html)} bytes; apartment revision ${model.version}`);
