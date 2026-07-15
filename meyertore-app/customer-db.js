(()=>{
const KEY='meyertore_customers_v1';
const ACTIVE='meyertore_active_customer_v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const save=list=>localStorage.setItem(KEY,JSON.stringify(list));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let customers=load();let editingId=null;
function inject(){
 const home=document.getElementById('home'); if(!home)return;
 const box=document.createElement('section');box.className='card customer-db';box.innerHTML=`
 <h3>Kundendatenbank</h3>
 <div class="customer-toolbar"><input id="customerSearch" type="search" placeholder="Kunde suchen…"><button id="customerNew" type="button">Neuer Kunde</button></div>
 <div id="customerList" class="customer-list"></div>
 <details id="customerEditor"><summary>Kundendaten bearbeiten</summary><div class="customer-form">
  <label>Firma / Name<input id="cName" type="text"></label>
  <label>Anschrift<textarea id="cAddress" rows="2"></textarea></label>
  <label>Ansprechpartner<input id="cContact" type="text"></label>
  <label>Telefon<input id="cPhone" type="tel"></label>
  <label>E-Mail<input id="cEmail" type="email"></label>
  <label>Standort der Anlage<input id="cSite" type="text"></label>
  <label class="wide">Notizen<textarea id="cNotes" rows="2"></textarea></label>
 </div><div class="customer-actions"><button id="customerSave" type="button">Speichern</button><button id="customerDelete" type="button" class="danger">Löschen</button></div></details>`;
 home.appendChild(box);
 document.getElementById('customerSearch').addEventListener('input',render);
 document.getElementById('customerNew').onclick=()=>edit(null);
 document.getElementById('customerSave').onclick=store;
 document.getElementById('customerDelete').onclick=remove;
 render();
 addFormSelectors();
}
function render(){
 const q=(document.getElementById('customerSearch')?.value||'').toLowerCase();
 const list=document.getElementById('customerList'); if(!list)return;
 const rows=customers.filter(c=>[c.name,c.address,c.contact,c.site].join(' ').toLowerCase().includes(q));
 list.innerHTML=rows.length?rows.map(c=>`<button type="button" class="customer-row" data-id="${c.id}"><strong>${esc(c.name||'Ohne Namen')}</strong><span>${esc(c.site||c.address||'')}</span></button>`).join(''):'<p class="muted">Noch keine Kunden gespeichert.</p>';
 list.querySelectorAll('.customer-row').forEach(b=>b.onclick=()=>edit(b.dataset.id));
}
function edit(id){
 const c=customers.find(x=>x.id===id)||{};editingId=id||null;
 for(const k of ['Name','Address','Contact','Phone','Email','Site','Notes'])document.getElementById('c'+k).value=c[k.toLowerCase()]||'';
 document.getElementById('customerEditor').open=true;
 document.getElementById('customerDelete').style.display=id?'inline-flex':'none';
}
function store(){
 const c={id:editingId||crypto.randomUUID(),name:cName.value.trim(),address:cAddress.value.trim(),contact:cContact.value.trim(),phone:cPhone.value.trim(),email:cEmail.value.trim(),site:cSite.value.trim(),notes:cNotes.value.trim()};
 if(!c.name){alert('Bitte einen Kundennamen eingeben.');return}
 const i=customers.findIndex(x=>x.id===c.id); if(i>=0)customers[i]=c;else customers.push(c);
 save(customers);editingId=c.id;render();syncSelectors(c.id);toast?.('Kunde gespeichert');
}
function remove(){if(!editingId||!confirm('Diesen Kunden löschen?'))return;customers=customers.filter(c=>c.id!==editingId);save(customers);editingId=null;edit(null);render();syncSelectors('');}
function selectorHtml(type){return `<div class="card customer-select"><label>Kunde auswählen<select data-customer-select="${type}"><option value="">— Kunde auswählen —</option></select></label><button type="button" data-customer-apply="${type}">Kundendaten übernehmen</button></div>`}
function addFormSelectors(){
 for(const type of ['industrial','roll']){const form=document.getElementById(type+'Form');if(!form)continue;form.insertAdjacentHTML('afterbegin',selectorHtml(type));form.querySelector(`[data-customer-apply="${type}"]`).onclick=()=>apply(type);}
 syncSelectors(localStorage.getItem(ACTIVE)||'');
}
function syncSelectors(selected=''){
 document.querySelectorAll('[data-customer-select]').forEach(s=>{const cur=selected||s.value;s.innerHTML='<option value="">— Kunde auswählen —</option>'+customers.sort((a,b)=>a.name.localeCompare(b.name,'de')).map(c=>`<option value="${c.id}">${esc(c.name)}${c.site?' – '+esc(c.site):''}</option>`).join('');s.value=customers.some(c=>c.id===cur)?cur:'';});
}
function setValue(form,name,value){const el=form.elements[name];if(el&&value!==undefined){el.value=value||'';el.dispatchEvent(new Event('input',{bubbles:true}));}}
function apply(type){
 const sel=document.querySelector(`[data-customer-select="${type}"]`);const c=customers.find(x=>x.id===sel.value);if(!c)return;
 localStorage.setItem(ACTIVE,c.id);const f=document.getElementById(type+'Form');
 if(type==='roll'){setValue(f,'betreiber',[c.name,c.address].filter(Boolean).join('\n'));setValue(f,'standort',c.site);}
 else {setValue(f,'standort',c.site||c.address);setValue(f,'betreiber',c.name);}
 save(type,false);toast?.('Kundendaten übernommen');
}
function relabel(){
 document.querySelectorAll('[data-save]').forEach(b=>b.textContent='Entwurf speichern');
 document.querySelectorAll('[data-print]').forEach(b=>b.textContent='PDF erstellen');
 document.querySelectorAll('[data-export]').forEach(b=>{b.textContent='Datensicherung exportieren';b.classList.add('advanced-action')});
 document.querySelectorAll('.file-btn').forEach(b=>{b.childNodes[0].textContent='Datensicherung laden';b.classList.add('advanced-action')});
}
window.addEventListener('DOMContentLoaded',()=>{inject();relabel()});
})();