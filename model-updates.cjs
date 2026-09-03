// Current model revisions, applied without changing the DXF-derived openings.
module.exports = function updateModel(model) {
 const door=model.doors.items.find(d=>d.id==='DV7');
 const centerY=(door.opening[0][1]+door.opening[1][1])/2;
 const oldPlane=door.hinge[1];
 door.type='pocket';door.angle=0;door.slide=[.80,0,0];door.hinge[1]=centerY;
 door.pocket_bounds=[[door.opening[1][0],centerY-.025,0],[door.opening[1][0]+.80,centerY+.025,2.05]];
 door.status='Posuvné dveře do stavebního pouzdra; zasunutí doprava v půdorysu.';
 for(const box of model.boxes.filter(b=>b.door_id==='DV7')){
  if(box.name.includes('klika')){
   const sign=box.name.endsWith('-1')?-1:1;
   box.name=box.name.replace('klika','zapustena musle');
   box.min=[1.42777220684005,centerY+sign*.019-.002,.94];
   box.max=[1.46777220684005,centerY+sign*.019+.002,1.06];
  }else{
   box.min[1]+=centerY-oldPlane;box.max[1]+=centerY-oldPlane;
   box.name='DV7 WC posuvne kridlo';
  }
 }
 // Split the pocket-side jamb into two facing trims, leaving the leaf slot clear.
 const jamb=model.boxes.find(b=>b.name.startsWith('DV7 zaruben 2.'));
 if(jamb){
  const back=JSON.parse(JSON.stringify(jamb));
  jamb.name='DV7 pouzdro predni oblozka';jamb.max[1]=centerY-.026;
  back.name='DV7 pouzdro zadni oblozka';back.min[1]=centerY+.026;
  model.boxes.push(back);
 }
 // Bedroom: acoustic-style surface sliding leaf on the bedroom side.
 // Product envelope only; no acoustic rating or installation certification implied.
 const bedroom=model.doors.items.find(d=>d.id==='DV3');
 bedroom.type='wall_slide';bedroom.angle=0;bedroom.slide=[.92,0,0];
 bedroom.hinge=[3.7042586246522225,-.2225];bedroom.leaf_width_m=.90;
 bedroom.height_m=2.067;
 bedroom.status='Posuv po vnitřní straně ložnice, plné křídlo s obvodovým těsněním. Přesné kování a montážní rozměry nejsou vybrané.';
 for(const b of model.boxes.filter(b=>b.door_id==='DV3')){
  if(b.name.includes('klika')){
   const sign=b.name.endsWith('-1')?-1:1;
   b.name=b.name.replace('klika','zapustena musle');
   b.min=[3.7942586246522225,-.2225+sign*.024-.002,.94];
   b.max=[3.8342586246522225,-.2225+sign*.024+.002,1.06];
  }else{
   b.name='DV3 Loznice posuvne kridlo';
   b.min=[3.7042586246522225,-.245,.008];
   b.max=[4.6042586246522225,-.200,2.075];
  }
 }
 const add=(name,min,max,color,group='door_frame')=>model.boxes.push({name,min,max,color,group,side:''});
 add('DV3 kryt kolejnice',[3.69,-.275,2.085],[5.56,-.163,2.16],'#c99e6b');
 add('DV3 kolejnice',[3.72,-.245,2.075],[5.54,-.202,2.09],'#53615d');
 for(const x of [3.735,4.565])add('DV3 svisle tesneni '+x,[x,-.201,.012],[x+.012,-.185,2.06],'#53615d');
 add('DV3 horni tesneni',[3.735,-.201,2.052],[4.577,-.185,2.064],'#53615d');
 model.boxes.push({name:'DV3 spodni tesneni',min:[3.714,-.239,.003],max:[4.594,-.206,.012],color:'#53615d',group:'door_leaf',side:'',door_id:'DV3'});

 // User-selected tight-fit study: AC above the bedroom sliding door.
 // 10 mm above the rail, ~7 mm above the highest modeled intake; NOT installation approval.
 const turn=p=>[p[0]-.91,p[1],p[2]+.19];
 for(const b of model.boxes.filter(b=>b.name.startsWith('Nastenna klimatizace Loznice'))){
  const a=turn(b.min),c=turn(b.max);
  b.min=a.map((v,i)=>Math.min(v,c[i]));b.max=a.map((v,i)=>Math.max(v,c[i]));
 }
 model.wall_ac_units.Loznice={wall:'north',origin:[3.75,-.16,2.17],status:'Prostorová varianta nad dveřmi; odstupy výrobce nejsou ověřené.'};
 const route=[[-4.05,3.306,2.54],[-.2,3.306,2.54],[-.2,.055,2.54],[4.49,.055,2.54],[4.49,-.22,2.54],[4.49,-.22,2.34]];
 model.climate_routes.refrigerant.Loznice=route;
 model.services.routes.find(r=>r.id==='AC-LO').path=route.map(p=>p.slice());
 model.services.points.find(p=>p.id==='K-LO').xyz=route.at(-1).slice();
 model.boxes=model.boxes.filter(b=>!b.name.startsWith('Chladivo a kabelaz Loznice')&&!b.name.startsWith('AC-LO segment'));
 for(let i=1;i<route.length;i++){
  const a=route[i-1],c=route[i];
  add('Chladivo a kabelaz Loznice '+i,a.map((v,j)=>Math.min(v,c[j])-(v===c[j]?.014:0)),a.map((v,j)=>Math.max(v,c[j])+(v===c[j]?.014:0)),'#8a8b61','ac_pipe');
 }
 const marker=model.boxes.find(b=>b.name.startsWith('K-LO '));
 if(marker){const size=marker.max.map((v,i)=>v-marker.min[i]);marker.min=route.at(-1).map((v,i)=>v-size[i]/2);marker.max=route.at(-1).map((v,i)=>v+size[i]/2);}
 // Keep the bedroom light switch reachable beside the closed sliding leaf.
 const lightSwitch=model.services.points.find(p=>p.id==='S17');
 if(lightSwitch){const dx=3.62-lightSwitch.xyz[0];lightSwitch.xyz[0]=3.62;
  for(const b of model.boxes.filter(b=>b.name.startsWith('S17 '))){b.min[0]+=dx;b.max[0]+=dx;}
  const cable=model.services.routes.find(r=>r.end==='S17');
  if(cable)cable.path=[[4.15,-.35,2.47],[3.62,-.35,2.47],[3.62,-.17,2.47],lightSwitch.xyz.slice()];
 }
 // Uniform ceiling underside, 120 mm below the original 2.60 m ceiling.
 model.ceiling={original_height:2.60,drop:.12,finished_height:2.48};
 model.assumptions.ceiling_height=2.60;
 model.assumptions.suspended_ceiling_height=2.48;
 model.assumptions.hood_proposal.full_soffit_drop_proposed=.12;
 model.assumptions.hood_proposal.status='Existing hood envelope retained below the new ceiling; recessed fit in 120 mm is not verified.';
 for(const b of model.boxes){
  if(['ceiling','ac_soffit'].includes(b.group)){b.min[2]+=.13;b.max[2]+=.13;}
  if(b.group==='svc_light'&&b.min[2]>2.28){b.min[2]+=.13;b.max[2]+=.13;}
 }
 const rooms={office:[-3.60,0,-.10,3.45],children:[-4.73,-3.60,-1.23,-.15],bedroom:[3.15,-3.60,5.87,-.15],bath:[1.305,-2.55,3.05,-.15],wc:[1.305,-3.6,3.05,-2.55],wardrobe:[-1.11,-3.6,-.12,-1.3],hall:[-.12,-3.6,1.205,-.15],hall_north:[-1.11,-1.3,-.12,-.15]};
 for(const [name,b] of Object.entries(rooms))add('Podhled 12 cm '+name,[b[0],b[1],2.48],[b[2],b[3],2.495],'#eeeae1','ceiling');
 const raisedLightIds=new Set();
 for(const p of model.services.points){if(p.kind==='light'&&p.xyz[2]>2.28){p.xyz[2]+=.13;raisedLightIds.add(p.id);}}
 // Move horizontal installation routes into the shallower ceiling cavity.
 const routeZ=z=>z>=2.4&&z<2.50?z+.075:z;
 for(const r of model.services.routes){
  if(r.id==='AC-LO')continue;
  r.path=r.path.map(p=>[p[0],p[1],routeZ(p[2])]);
  if(raisedLightIds.has(r.end))r.path[r.path.length-1]=model.services.points.find(p=>p.id===r.end).xyz.slice();
 }
 for(const [name,path] of Object.entries(model.climate_routes.refrigerant))if(name!=='Loznice')model.climate_routes.refrigerant[name]=path.map(p=>[p[0],p[1],routeZ(p[2])]);
 for(const b of model.boxes)if(['ac_pipe','svc_electric','svc_data'].includes(b.group)&&!b.name.startsWith('Chladivo a kabelaz Loznice')){b.min[2]=routeZ(b.min[2]);b.max[2]=routeZ(b.max[2]);}
 return model;
};
