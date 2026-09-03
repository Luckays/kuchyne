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

 // Move the complete AC assembly to the west wall, clear of the door travel.
 const turn=p=>[3.165-(p[1]+.165),-.74+(p[0]-5.07),p[2]];
 for(const b of model.boxes.filter(b=>b.name.startsWith('Nastenna klimatizace Loznice'))){
  const a=turn(b.min),c=turn(b.max);
  b.min=a.map((v,i)=>Math.min(v,c[i]));b.max=a.map((v,i)=>Math.max(v,c[i]));
 }
 model.wall_ac_units.Loznice={wall:'west',origin:[3.165,-1.15,1.98]};
 const route=[[-4.05,3.306,2.46],[-.2,3.306,2.46],[-.2,.055,2.46],[3.22,.055,2.46],[3.22,-.41,2.46],[3.22,-.41,2.15]];
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
 return model;
};
