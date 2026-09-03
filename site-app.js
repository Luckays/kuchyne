(() => {
  const rooms = {
    all: {name:'Celý byt', title:'Všechno na jednom místě', text:'Vyber místnost vlevo. Zobrazí se samostatně, spolu s přehledem vybavení.', materials:[['Dub','#bf9567'],['Sklo','#a5c0c4'],['Kámen','#8f9494']], items:['Obývák s kuchyní a promítáním','Pracovna s hudebním koutem','Dětský pokoj a ložnice','Nové jádro, šatna a úložné prostory']},
    living: {name:'Obývák a kuchyň', title:'Vaření, hudba a odpočinek', text:'Kuchyň s poloostrovem navazuje na jídelní stůl a sedačku. Luxfery zůstávají pouze na jednom zakončení.', materials:[['Dub','#bf9567'],['Luxfery','#aac5c5'],['Světlá deska','#d8d5cc']], items:['Trouba ve vysoké skříni mezi dřezem a lednicí','Myčka 45 cm u dřezu; výsuvné koše pod dřezem','Rohová sedačka, stolek a lampa na čtení','Projektor na polici, nástěnné plátno, gramofon a repro','Police s rostlinami a obrázky']},
    office: {name:'Pracovna', title:'Práce mezi knihami a kytkami', text:'Dva pracovní stoly a hudební kout. Akustické lamely pokračují i pod klimatizací.', materials:[['Dubové lamely','#ae8056'],['Zeleň','#5c7753'],['Světlé stěny','#dfdfd9']], items:['Stoly s monitory, notebooky a pracovním vybavením','Vícepatrové police na knihy a rostliny','Gauč nebo varianta s keyboardem a lavicí','Místo na kytaru, trumpetu a stojánek','Obrazy a jednoduché police na protější stěně']},
    children: {name:'Dětský pokoj', title:'Místo pro dva', text:'Dvě místa na spaní i učení, doplněná úložným nábytkem.', materials:[['Dřevo','#c2a477'],['Světlé plochy','#dddcd4']], items:['Dvě postele a dva pracovní stoly','Monitory, notebooky a stolní osvětlení','Šatní skříň a menší skříňka','Police na volné stěně a nad postelemi']},
    bedroom: {name:'Ložnice', title:'Klidnější část bytu', text:'Dvoulůžko a skříň kombinující uzavřenou polovinu s otevřenými policemi.', materials:[['Dub','#b9956e'],['Textil','#b9b3a8']], items:['Dubové posuvné dveře po vnitřní stěně s těsněním','Dvoulůžko s matrací a nočními stolky','Skříň: polovina s posuvnými čely, polovina otevřená','Velký obraz za postelí','Klimatizace na boční stěně a venkovní roleta']},
    bath: {name:'Koupelna', title:'Šedý kámen a světlo přes sklo', text:'Nová koupelna se zvýšenou sprchovou plochou o 10 cm přes celou její délku.', materials:[['Šedý obklad','#929594'],['Luxfery','#bad0cf']], items:['Luxferová stěna až ke stropu, přibližně do poloviny místnosti','Sprchová plocha končí zároveň s luxferovou stěnou','Odtokový žlab u stěny s umyvadlem','Umyvadlo se zrcadlem a skříňkou','Pračka, horní skříňky a elektrické topení naproti sprchovým bateriím']},
    wc: {name:'WC', title:'Samostatné WC', text:'Součást nového bytového jádra. Stoupačky jsou za WC.', materials:[['Šedý obklad','#929594'],['Bílá sanita','#ededeb']], items:['Posuvné dveře zasouvané do pouzdra ve zdi','WC v samostatné místnosti','Přístup k instalační šachtě','Navržené osvětlení a přívody']},
    wardrobe: {name:'Šatna', title:'Všechno má svoje místo', text:'Úložné prostory za vstupními dveřmi, s oddílem na prádlo i úklid.', materials:[['Světlé korpusy','#deded5'],['Dřevo','#bfa079']], items:['Vysoká skříň na oblečení a další věci','Mělký botník na protější straně','Výsuvný koš na prádlo a police','Úklidový oddíl pro vysavač, prostředky a žehlicí prkno','Rozvaděč nad botníkem']},
    hall: {name:'Chodba a vstup', title:'Volný průchod bytem', text:'Propojení jednotlivých místností se vstupem do šatny.', materials:[['Dřevo','#baa184'],['Světlé stěny','#e0dfd9']], items:['Vstupní a interiérové dveře','Zrcadlo a odkládací místo na klíče','Osvětlení a vypínače u průchodů']},
    balcony: {name:'Lodžie', title:'Navazuje na pracovnu', text:'Venkovní prostor s návrhem umístění klimatizační jednotky.', materials:[['Světlé plochy','#c9cbc7'],['Kov','#606970']], items:['Venkovní jednotka vlevo nahoře při pohledu zvenku','Napojení čtyř nástěnných klimatizací','Návrh venkovních rolet']}
  };
  const $ = s => document.querySelector(s);
  let current='all', plan=false;
  const nav=$('#rooms');
  Object.entries(rooms).forEach(([key,r],i)=>{const a=document.createElement('a');a.href='#'+key;a.dataset.room=key;const n=document.createElement('span');n.className='num';n.textContent=i===0?'⌂':String(i).padStart(2,'0');a.append(n,document.createTextNode(r.name));nav.append(a);});
  function update(){
    current=Object.hasOwn(rooms,location.hash.slice(1))?location.hash.slice(1):'all';
    const r=rooms[current];
    document.title=r.name+' · Náš byt';
    $('#breadcrumb').textContent=r.name.toLocaleUpperCase('cs');$('#room-title').textContent=r.name;$('#overview-title').textContent=r.title;$('#room-description').textContent=r.text;$('#view-caption').textContent=current==='all'?'Celý byt':r.name+' · samostatný pohled';
    nav.querySelectorAll('a').forEach(a=>{if(a.dataset.room===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#furniture-list').replaceChildren(...r.items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    $('#materials').replaceChildren(...r.materials.map(([name,color])=>{const el=document.createElement('span');el.className='material';const dot=document.createElement('span');dot.className='swatch';dot.style.backgroundColor=color;el.append(dot,document.createTextNode(name));return el;}));
    document.querySelectorAll('[data-for]').forEach(el=>el.hidden=current!=='all'&&!el.dataset.for.split(' ').includes(current));
    window.apartmentUI.select(current,plan);
    $('#load-status').textContent='';
  }
  function changeMode(next){plan=next;$('#view-3d').setAttribute('aria-pressed',String(!plan));$('#view-plan').setAttribute('aria-pressed',String(plan));window.apartmentUI.select(current,plan);}
  if(!window.apartmentUI){$('#load-status').textContent='Model se nepodařilo načíst. Zkus stránku obnovit.';return;}
  $('#view-3d').onclick=()=>changeMode(false);$('#view-plan').onclick=()=>changeMode(true);$('#reset-view').onclick=()=>changeMode(plan);$('#zoom-in').onclick=()=>window.apartmentUI.zoom(1.15);$('#zoom-out').onclick=()=>window.apartmentUI.zoom(1/1.15);
  window.addEventListener('hashchange',update);
  update();
})();
