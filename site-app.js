(() => {
  const rooms=Object.fromEntries(Object.entries({all:'Celý byt',living:'Obývák a kuchyň',office:'Pracovna',children:'Dětský pokoj',bedroom:'Ložnice',bath:'Koupelna',wc:'WC',wardrobe:'Šatna',hall:'Chodba a vstup',balcony:'Lodžie'}).map(([key,name])=>[key,{name}]));
  const $ = s => document.querySelector(s);
  let current='all', plan=false, pan=false;
  const nav=$('#rooms');
  Object.entries(rooms).forEach(([key,r],i)=>{const a=document.createElement('a');a.href='#'+key;a.dataset.room=key;const n=document.createElement('span');n.className='num';n.textContent=i===0?'⌂':String(i).padStart(2,'0');a.append(n,document.createTextNode(r.name));nav.append(a);});
  function update(){
    current=Object.hasOwn(rooms,location.hash.slice(1))?location.hash.slice(1):'all';
    const r=rooms[current];
    document.title=r.name+' · Náš byt';
    $('#breadcrumb').textContent=r.name.toLocaleUpperCase('cs');$('#room-title').textContent=r.name;$('#view-caption').textContent=current==='all'?'Celý byt':r.name+' · samostatný pohled';
    nav.querySelectorAll('a').forEach(a=>{if(a.dataset.room===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});


    document.querySelectorAll('[data-for]').forEach(el=>el.hidden=current!=='all'&&!el.dataset.for.split(' ').includes(current));
    window.apartmentUI.select(current,plan);
    $('#load-status').textContent='';
  }
  function changeMode(next){plan=next;$('#view-3d').setAttribute('aria-pressed',String(!plan));$('#view-plan').setAttribute('aria-pressed',String(plan));window.apartmentUI.select(current,plan);}
  if(!window.apartmentUI){$('#load-status').textContent='Model se nepodařilo načíst. Zkus stránku obnovit.';return;}
  $('#view-3d').onclick=()=>changeMode(false);$('#view-plan').onclick=()=>changeMode(true);$('#pan-mode').onclick=()=>{pan=!pan;$('#pan-mode').setAttribute('aria-pressed',String(pan));$('#interaction-hint').textContent=pan?'Tažením posouvej · + / − přibližuj':'Tažením otáčej · + / − přibližuj';window.apartmentUI.pan(pan);};$('#reset-view').onclick=()=>{pan=false;$('#pan-mode').setAttribute('aria-pressed','false');$('#interaction-hint').textContent='Tažením otáčej · + / − přibližuj';window.apartmentUI.pan(false);window.apartmentUI.reset();changeMode(plan);};$('#zoom-in').onclick=()=>window.apartmentUI.zoom(1.15);$('#zoom-out').onclick=()=>window.apartmentUI.zoom(1/1.15);
  window.addEventListener('hashchange',update);
  update();
})();
