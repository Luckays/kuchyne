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
 return model;
};
