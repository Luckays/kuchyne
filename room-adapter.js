// Shared geometry for all room views.
const cleaning=root.querySelector('[data-cleaning]');
const glazing=root.querySelector('[data-glazing]');
const panControl=root.querySelector('[data-pan-mode]');
let panMode=false,panX=0,panY=0;
glazing.onchange=()=>draw();
function clipRoomPolygon(vertices,bounds,pad){
 let result=vertices;
 for(let axis=0;axis<2;axis++)for(const sign of [-1,1]){
  const limit=sign<0?bounds[axis]-pad:bounds[axis+2]+pad,src=result;result=[];
  if(!src.length)return result;
  let prev=src.at(-1),prevIn=sign*(prev[axis]-limit)<=0;
  for(const p of src){const inside=sign*(p[axis]-limit)<=0;if(inside!==prevIn){const t=(limit-prev[axis])/(p[axis]-prev[axis]);result.push(prev.map((v,i)=>v+t*(p[i]-v)));}if(inside)result.push(p);prev=p;prevIn=inside;}
 }
 return result;
}
Object.assign(roomViews, {
  living:{b:[0,0,5.87,3.45],c:[2.94,1.72,1.1],a:-.85,e:.8,room:'OB'},
  bath:{b:[1.305,-2.55,3.05,-.15],c:[2.18,-1.35,1.1],a:-.85,e:.8,room:'KO'},
  wc:{b:[1.305,-3.6,3.05,-2.55],c:[2.18,-3.07,1],a:-.9,e:.95,room:'WC'},
  wardrobe:{b:[-1.11,-3.6,-.12,-1.3],c:[-.615,-2.45,1.05],a:-.7,e:.85,room:'SA'},
  hall:{b:[-1.11,-3.6,1.205,-.15],c:[.05,-1.87,1],a:-.7,e:.85,room:'CH'},
  balcony:{b:[-5.01,-.15,-3.6,3.45],c:[-4.3,1.65,1.2],a:-2.6,e:.6,room:'BA'}
});
function roomFloor(rv){
 if(!rv)return [];
 const bounds=rv.room==='CH'?[[-.12,-3.6,1.205,-.15],[-1.11,-1.3,-.12,-.15]]:[rv.b];
 return bounds.map(b=>({name:'View floor',group:'floor',min:[b[0],b[1],-.06],max:[b[2],b[3],0],color:'#c5bba6'}));
}
let selectedRoom='all', selectedPlan=false;
function selectRoom(key,plan=false){
 selectedRoom=key;selectedPlan=plan;activeRoom=key==='all'?null:roomViews[key]?.room;
 focus=key==='all'?false:key;zoom=1;panX=0;panY=0;
 const rv=roomViews[key];az=plan?-Math.PI/2:(rv?.a??-.85);el=plan?Math.PI/2:(rv?.e??.95);
 populatePoints();draw();
}
window.apartmentUI={select:selectRoom,pan(enabled){panMode=enabled;canvas.style.cursor=enabled?'move':'grab';},reset(){ceiling.checked=false;hvac.checked=false;cut.checked=true;panX=0;panY=0;draw();},zoom(factor){zoom=Math.max(.55,Math.min(2.5,zoom*factor));draw();}};
svcLayer.onchange=()=>{populatePoints();draw();};
svcPoint.onchange=draw;
cut.onchange=draw;cleaning.onchange=draw;openDW.onchange=draw;ceiling.onchange=draw;
hvac.onchange=draw;shutters.onchange=draw;bins.onchange=draw;inspect.onchange=draw;
doorControl.onchange=()=>{if(doorControl.checked)screen.checked=false;draw();};
keyboard.onchange=draw;laundry.onchange=draw;
screen.onchange=()=>{if(screen.checked)doorControl.checked=false;draw();};
canvas.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;
 e.preventDefault();
 if(panMode&&e.key.startsWith('Arrow')){if(e.key==='ArrowLeft')panX-=20;if(e.key==='ArrowRight')panX+=20;if(e.key==='ArrowUp')panY-=20;if(e.key==='ArrowDown')panY+=20;draw();return;}
 if(e.key==='ArrowLeft')az-=.15;if(e.key==='ArrowRight')az+=.15;
 if(e.key==='ArrowUp')el=Math.min(1.57,el+.12);if(e.key==='ArrowDown')el=Math.max(-.3,el-.12);
 if(e.key==='+'||e.key==='=')zoom=Math.min(2.5,zoom*1.15);if(e.key==='-')zoom=Math.max(.55,zoom/1.15);
 if(e.key==='0'){selectRoom(selectedRoom,selectedPlan);return;}draw();
});
