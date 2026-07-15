const industrialItems=JSON.parse(document.getElementById('industrialData').textContent);
const rollData=JSON.parse(document.getElementById('rollData').textContent);
const signatures={};
const storagePrefix='meyertore_pwa_v1_';

function renderIndustrial(){
 const box=document.getElementById('industrialRows');
 industrialItems.forEach((t,i)=>{
  const n=String(i+1).padStart(2,'0');
  box.insertAdjacentHTML('beforeend',`<div class="inspect-row">
   <div class="inspect-title"><strong>Pos. ${n}</strong> ${t}</div>
   ${['ok','wartung','reparatur'].map(s=>`<label class="status-cell"><input type="radio" name="pos_${n}_status" value="${s}" aria-label="${s}"></label>`).join('')}
   <label class="inspect-note">Bemerkung<input type="text" name="pos_${n}_note"></label>
  </div>`);
 });
}
function renderRoll(){
 const box=document.getElementById('rollSections');
 let count=0;
 rollData.forEach(([heading,items])=>{
  const card=document.createElement('div');card.className='card';
  card.innerHTML=`<h3 class="section-heading">${heading}</h3><div class="status-legend"><span></span><span>o. B.</span><span>Beanst.</span><span>n. a.</span></div>`;
  items.forEach(t=>{
   count++; const n=String(count).padStart(2,'0');
   card.insertAdjacentHTML('beforeend',`<div class="inspect-row">
    <div class="inspect-title">${t}</div>
    ${['ok','beanstandung','na'].map(s=>`<label class="status-cell"><input type="radio" name="roll_${n}_status" value="${s}" aria-label="${s}"></label>`).join('')}
    <label class="inspect-note">Bemerkung<input type="text" name="roll_${n}_note"></label>
   </div>`);
  });
  box.appendChild(card);
 });
}

function switchView(id){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
 window.scrollTo({top:0,behavior:'smooth'});
 history.replaceState(null,'','#'+id);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>switchView(b.dataset.open));

function formData(form){
 const obj={};
 [...form.elements].forEach(el=>{
  if(!el.name)return;
  if(el.type==='radio'){if(el.checked)obj[el.name]=el.value}
  else if(el.type==='checkbox')obj[el.name]=el.checked;
  else obj[el.name]=el.value;
 });
 return obj;
}
function applyData(form,obj){
 [...form.elements].forEach(el=>{
  if(!el.name)return;
  if(el.type==='radio')el.checked=obj[el.name]===el.value;
  else if(el.type==='checkbox')el.checked=!!obj[el.name];
  else if(obj[el.name]!==undefined)el.value=obj[el.name];
 });
}
function packageData(type){
 const form=document.getElementById(type+'Form');
 return {version:1,type,updated:new Date().toISOString(),fields:formData(form),signatures:Object.fromEntries(Object.entries(signatures).filter(([k])=>k.startsWith(type)))};
}
function save(type,notify=true){
 localStorage.setItem(storagePrefix+type,JSON.stringify(packageData(type)));
 if(notify)toast('Gespeichert');
}
function load(type){
 const raw=localStorage.getItem(storagePrefix+type); if(!raw)return;
 try{const p=JSON.parse(raw);applyData(document.getElementById(type+'Form'),p.fields||{});Object.assign(signatures,p.signatures||{});refreshSignatures()}catch(e){}
}
function refreshSignatures(){
 document.querySelectorAll('[data-preview]').forEach(img=>{
  const d=signatures[img.dataset.preview];
  img.src=d||'';img.classList.toggle('has-signature',!!d);
 });
}
['industrial','roll'].forEach(type=>{
 const form=document.getElementById(type+'Form');
 form.addEventListener('input',()=>save(type,false));
 form.addEventListener('change',()=>save(type,false));
 document.querySelector(`[data-save="${type}"]`).onclick=()=>save(type);
 document.querySelector(`[data-print="${type}"]`).onclick=()=>{save(type,false);switchView(type);setTimeout(()=>window.print(),100)};
 document.querySelector(`[data-reset="${type}"]`).onclick=()=>{if(confirm('Alle Eingaben dieses Protokolls löschen?')){form.reset();Object.keys(signatures).filter(k=>k.startsWith(type)).forEach(k=>delete signatures[k]);localStorage.removeItem(storagePrefix+type);refreshSignatures();toast('Protokoll geleert')}};
 document.querySelector(`[data-export="${type}"]`).onclick=()=>{
  save(type,false);const blob=new Blob([JSON.stringify(packageData(type),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${type}_pruefprotokoll_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
 };
 document.querySelector(`[data-import="${type}"]`).onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const p=JSON.parse(await f.text());if(p.type!==type)throw Error();applyData(form,p.fields||{});Object.assign(signatures,p.signatures||{});refreshSignatures();save(type,false);toast('Datei geladen')}catch{alert('Die Datei passt nicht zu diesem Protokoll.')} e.target.value='';
 };
});

let activeSig=null, drawing=false,last=null;
const dialog=document.getElementById('signatureDialog'),canvas=document.getElementById('signatureCanvas'),ctx=canvas.getContext('2d');
function sizeCanvas(){
 const r=canvas.parentElement.getBoundingClientRect(),dpr=Math.max(1,devicePixelRatio||1);
 canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
 ctx.lineWidth=3*dpr;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';
 if(activeSig&&signatures[activeSig]){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,canvas.width,canvas.height);im.src=signatures[activeSig]}
}
function pt(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
document.querySelectorAll('.signature-launch').forEach(b=>b.onclick=()=>{activeSig=b.dataset.signature;dialog.classList.remove('hidden');document.body.style.overflow='hidden';requestAnimationFrame(sizeCanvas)});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);last=pt(e);ctx.beginPath();ctx.arc(last.x,last.y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pt(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p});
['pointerup','pointercancel'].forEach(n=>canvas.addEventListener(n,e=>{e.preventDefault();drawing=false}));
document.getElementById('sigClear').onclick=()=>ctx.clearRect(0,0,canvas.width,canvas.height);
document.getElementById('sigCancel').onclick=()=>{dialog.classList.add('hidden');document.body.style.overflow='';activeSig=null};
document.getElementById('sigApply').onclick=()=>{if(activeSig){signatures[activeSig]=canvas.toDataURL('image/png');refreshSignatures();save(activeSig.startsWith('industrial')?'industrial':'roll',false)}dialog.classList.add('hidden');document.body.style.overflow='';activeSig=null;toast('Unterschrift übernommen')};

function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),1800)}

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}};

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
renderIndustrial();renderRoll();load('industrial');load('roll');refreshSignatures();
const start=location.hash.slice(1);if(['industrial','roll'].includes(start))switchView(start);
