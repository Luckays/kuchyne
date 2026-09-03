// Final compact wardrobe: two end bays, no side cabinets or legacy floating shelves.
module.exports=function wardrobeLayout(model){
 model.boxes=model.boxes.filter(b=>! /^(Satna |Pradlo |Vysavac |Zehlici prkno|Uklid |Botnik )/.test(b.name));
 const add=(name,min,max,color='#c99e6b',group='r18_furniture',extra={})=>model.boxes.push({name,min,max,color,group,side:'',...extra});
 function bay(name,y0,y1){
  for(const x of [-1.10,-.168])add(name+' bocnice '+x,[x,y0,.08],[x+.018,y1,2.40]);
  for(const z of [.08,2.382])add(name+' deska '+z,[-1.10,y0,z],[-.15,y1,z+.018]);
 }
 bay('Satna obleceni',-3.57,-2.97);
 add('Satna obleceni zada',[-1.082,-3.57,.10],[-.168,-3.552,2.38],'#d9d8cf');
 add('Satna tyc bundy',[-1.05,-3.29,1.79],[-.20,-3.265,1.815],'#53615d');
 add('Satna horni police',[-1.08,-3.55,2.08],[-.17,-2.99,2.10]);
 for(const [i,x] of [-.96,-.71,-.46].entries()){
  add('Satna raminko '+i,[x-.008,-3.50,1.72],[x+.008,-3.06,1.735],'#b9956e');
  add('Satna zaves raminka '+i,[x-.008,-3.285,1.73],[x+.008,-3.27,1.80],'#53615d');
  add('Satna bunda '+i,[x-.055,-3.47,.85],[x+.055,-3.09,1.72],['#687f82','#aca69a','#657268'][i]);
 }
 // Hamper pulls forward, underneath the hanging zone.
 for(const x of [-.60,-.205])add('Pradlo kos bocnice '+x,[x,-3.51,.12],[x+.015,-3.04,.64],'#b2aa99','r19_furniture',{assembly:'laundry'});
 add('Pradlo kos dno',[-.60,-3.51,.105],[-.19,-3.04,.12],'#b2aa99','r19_furniture',{assembly:'laundry'});
 add('Pradlo kos zadni hrana',[-.60,-3.51,.12],[-.19,-3.495,.64],'#b2aa99','r19_furniture',{assembly:'laundry'});
 add('Pradlo vysuv celo',[-.62,-3.045,.10],[-.17,-3.027,.67],'#c99e6b','r19_furniture',{assembly:'laundry'});
 add('Pradlo madlo',[-.46,-3.027,.58],[-.31,-3.009,.60],'#53615d','r19_furniture',{assembly:'laundry'});
 model.laundry_slide=.35;
 // Utility bay at the opposite end, opening into the central area.
 bay('Satna uklid',-1.72,-1.34);
 add('Satna uklid zada',[-1.082,-1.358,.10],[-.168,-1.34,2.38],'#d9d8cf');
 for(const z of [1.64,1.98])add('Satna uklid police '+z,[-1.08,-1.70,z],[-.17,-1.36,z+.02]);
 add('Satna uklid delici pricka',[-.69,-1.70,.10],[-.672,-1.36,1.64]);
 for(let i=0;i<3;i++)add('Satna prostredky '+i,[-1.05+i*.27,-1.58,1.66],[-.95+i*.27,-1.40,1.87],'#d9d8cf');
 add('Vysavac drzak',[-.50,-1.39,1.20],[-.36,-1.36,1.34],'#53615d');
 add('Vysavac motor',[-.51,-1.56,1.08],[-.36,-1.39,1.28],'#53615d');
 add('Vysavac trubka',[-.445,-1.49,.24],[-.425,-1.47,1.12],'#53615d');
 add('Vysavac hlavice',[-.58,-1.61,.16],[-.29,-1.44,.24],'#53615d');
 add('Zehlici prkno slozene',[-1.02,-1.61,.12],[-.94,-1.39,1.48],'#aaa797');
 for(let i=0;i<2;i++){
  const x=-1.10+i*.475;
  add('Satna uklid dvere '+i,[x+.003,-1.74,.083],[x+.472,-1.722,2.397],'#c99e6b','r18_door',{assembly:'cleaning_door',hinge:[i===0?x:x+.475,-1.74],open_angle:i===0?-95:95});
 }
 // Recenter the side entrance on the unobstructed area between the two bays.
 const d=model.doors.items.find(d=>d.id==='DV8'),dy=-.32;
 d.opening=d.opening.map(p=>[p[0],p[1]+dy]);d.hinge[1]+=dy;
 d.status='Posuv po chodbové straně; vstup mezi dvěma koncovými úložnými moduly.';
 for(const b of model.boxes.filter(b=>b.name.startsWith('DV8 ')||b.name===d.source)){b.min[1]+=dy;b.max[1]+=dy;}
 for(const m of model.meshes.filter(m=>m.name.startsWith('Byt Zeď_19 ')))for(const p of m.vertices){
  if(m.name==='Byt Zeď_19 0-0'&&p[1]>-2.30)p[1]+=dy;
  if(m.name==='Byt Zeď_19 1-0'&&p[1]<-1.40)p[1]+=dy;
 }
 model.cleaning_access={central_area:[[-1.10,-2.97],[-.15,-1.74]],width_m:.95,length_m:1.23};
 // Keep socket position and routing attached to the relocated vacuum dock.
 for(const [id,xyz] of [['Z41',[-.30,-1.38,1.32]],['S08',[-.16,-2.63,1.1]]]){
  const p=model.services.points.find(p=>p.id===id);const delta=xyz.map((v,i)=>v-p.xyz[i]);p.xyz=xyz;
  for(const b of model.boxes.filter(b=>b.name.startsWith(id+' ')))for(let i=0;i<3;i++){b.min[i]+=delta[i];b.max[i]+=delta[i];}
  for(const r of model.services.routes){if(r.end===id)r.path[r.path.length-1]=xyz.slice();if(r.start===id)r.path[0]=xyz.slice();}
 }
 return model;
};
