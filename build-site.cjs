// Dependency-free build. Keep the current apartment and the original room assets separate.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const model=require('./model-updates.cjs')(JSON.parse(read('apartment-model.json')));
if(model.version!==20)throw Error('Review adapter before changing model revision');
const original=read('apartment-viewer.html');
let renderer=original.match(/<script>([\s\S]*?)<\/script>/)[1];
renderer=renderer.replace("kitchen=root.querySelector('[data-kitchen]')","kitchen={checked:true}");
renderer=renderer.replace('const opened=openDW.checked',"if(cleaning.checked&&b.assembly==='cleaning_door'){const [hx,hy]=b.hinge,ang=b.open_angle*Math.PI/180;for(const p of v){const x=p[0]-hx,y=p[1]-hy;p[0]=hx+x*Math.cos(ang)-y*Math.sin(ang);p[1]=hy+x*Math.sin(ang)+y*Math.cos(ang);}}\nconst opened=openDW.checked");
renderer=renderer.replace('if(door)n=',"if(cleaning.checked&&b.assembly==='cleaning_door'){const ang=b.open_angle*Math.PI/180;n=[n[0]*Math.cos(ang)-n[1]*Math.sin(ang),n[0]*Math.sin(ang)+n[1]*Math.cos(ang),n[2]];}if(door)n=");
renderer=renderer.replace('const model=__MODEL_JSON__;','const model='+JSON.stringify(model).replace(/</g,'\\u003c')+';');
// The retained hood is deeper than the new ceiling cavity: show its projecting casing.
renderer=renderer.replace("['LuxeAir navrh tela','Platno zapustene pouzdro']","['Platno zapustene pouzdro']");
renderer=renderer.replace('if(door){const [hx,hy]=door.hinge;',"if(door?.type==='wall_slide'){for(const p of v)for(let axis=0;axis<3;axis++)p[axis]+=door.slide[axis];}else if(door){const [hx,hy]=door.hinge;");
// Fully opened pocket leaves are concealed inside the wall, even in cutaway views.
renderer=renderer.replace("if(inspect.checked&&b.group==='r18_door')continue;", "if(doorControl.checked&&b.door_id&&doorMap[b.door_id]?.type==='pocket')continue;\n if(inspect.checked&&b.group==='r18_door')continue;");
renderer=renderer.replace('function pointVisible(p){','let activeRoom=null;\nfunction pointVisible(p){if(activeRoom&&p.room!==activeRoom)return false;');
renderer=renderer.replace(".concat(rv?[{name:'View floor',group:'floor',min:[rv.b[0],rv.b[1],-.06],max:[rv.b[2],rv.b[3],0],color:'#c5bba6'}]:[])",'.concat(roomFloor(rv))');
renderer=renderer.replace("if(inspect.checked&&b.group==='r18_door')continue;","if(focus==='hall'&&b.max[0]<-.10&&b.max[1]<-1.30)continue;\n if(inspect.checked&&b.group==='r18_door')continue;");
renderer=renderer.replace("for(const t of meshTriangles){","for(const t of meshTriangles){if(focus==='hall'&&Math.max(...t.v.map(p=>p[0]))<-.10&&Math.max(...t.v.map(p=>p[1]))<-1.30)continue;");
// Do not cut a room-view floor or service routes from neighbouring rooms into the view.
renderer=renderer.replace(/rv\.b\[(\d)\]([+-])\.06/g,'rv.b[$1]$2.30');
renderer=renderer.replace('const a=b.min.slice(),c=b.max.slice();','const a=b.min.slice(),c=b.max.slice();if(rv){const pad=["wall","frame","glass","door_frame","door_leaf","shutter","shutter_curtain"].includes(b.group)?.30:.02;for(let i=0;i<2;i++){a[i]=Math.max(a[i],rv.b[i]-pad);c[i]=Math.min(c[i],rv.b[i+2]+pad);}if(c[0]<=a[0]||c[1]<=a[1])continue;}');
renderer=renderer.replace('const pts=vv.map(project);polys.push({pts,depth:pts.reduce((s,p)=>s+p[2],0)/3,n:t.n,color:t.color});','const clipped=rv?clipRoomPolygon(vv,rv.b,t.group===\'wall\'?.30:.02):vv;if(clipped.length<3)continue;const pts=clipped.map(project);polys.push({pts,depth:pts.reduce((s,p)=>s+p[2],0)/pts.length,n:t.n,color:t.color});');
renderer=renderer.replace('const path=r.path.map(project);',"if(activeRoom){const ids=new Set(svc.points.filter(p=>p.room===activeRoom).map(p=>p.id));if(!ids.has(r.start)&&!ids.has(r.end))continue;}const path=r.path.map(project);");
// Remove obsolete camera controls instead of retaining invisible legacy buttons.
renderer=renderer.replace(/root\.querySelector\('\[data-view="iso"\]'\)\.onclick=[\s\S]*?(?=new ResizeObserver\(draw\))/, '');
renderer=renderer.replace(",acLegend=root.querySelector('[data-ac-legend]')", '');
renderer=renderer.replace(' if(acLegend)acLegend.hidden=!hvac.checked;', '');
renderer=renderer.replace(/    svcDetail\.textContent=[^\n]*/, "    svcDetail.textContent=selected?selected.label+' · výška '+selected.xyz[2].toFixed(2)+' m':'';");
renderer=renderer.replace(/    const desc=\{[^\n]*\};/, "    const desc={practical:'Vybavení',light:'L = světlo',interior:'',socket:'Z = zásuvka · S = vypínač · R = rozvaděč',electric:'Elektrické okruhy',water:'SV = studená voda · TV = teplá voda · tečkovaně = odpad',hood:'Trasa odtahu',data:'Datové a AV propojení'};");
// Register the current room controls.
const anchor='new ResizeObserver(draw).observe(canvas);';
renderer=renderer.replace(anchor,read('room-adapter.js')+'\n'+anchor);
// Bound software raster cost on large screens, and allow rendering at native 1x density.
renderer=renderer.replace('ratio=Math.min(2,Math.max(1.5,window.devicePixelRatio||1))','ratio=Math.min(1.5,window.devicePixelRatio||1)');
let html=read('site-shell.html').replace('__STYLE__',()=>read('site.css')).replace('__RENDERER__',()=>renderer).replace('__APP__',()=>read('site-app.js'));
html=html.replace(/[\t ]+$/gm,'');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
if(/__[A-Z_]+__/.test(html))throw Error('Unresolved template token');
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log(`Built index.html: ${Buffer.byteLength(html)} bytes; apartment revision ${model.version}`);
