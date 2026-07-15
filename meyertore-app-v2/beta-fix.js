(()=>{
'use strict';
const KEY='meyertore_beta2_display_density';
const allowed=['compact','normal','large'];
function findCards(){return [...document.querySelectorAll('#home .card')].filter(card=>{const h=card.querySelector('h2,h3');return h&&h.textContent.trim().toLowerCase()==='darstellungsgröße';});}
function applyDensity(value){if(!allowed.includes(value))value='compact';document.body.classList.remove('density-compact','density-normal','density-large');document.body.classList.add('density-'+value);document.querySelectorAll('.density-option').forEach(btn=>{const active=btn.dataset.density===value;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});localStorage.setItem(KEY,value);}
function repair(){const cards=findCards();if(cards.length>1)cards.slice(1).forEach(card=>card.remove());let card=cards[0];const home=document.getElementById('home');if(!card&&home){card=document.createElement('div');card.className='card beta-density-card';card.innerHTML='<h3>Darstellungsgröße</h3><p class="beta-density-help">Wählen Sie, wie groß die Eingabemaske angezeigt wird.</p><div class="density-chooser"><button type="button" class="density-option" data-density="compact">Kompakt</button><button type="button" class="density-option" data-density="normal">Normal</button><button type="button" class="density-option" data-density="large">Groß</button></div>';const hero=home.querySelector('.hero');hero?hero.insertAdjacentElement('afterend',card):home.prepend(card);}
if(!card)return;
card.classList.add('beta-density-card');
const chooser=card.querySelector('.density-chooser');if(!chooser)return;
const clean=chooser.cloneNode(true);chooser.replaceWith(clean);
clean.querySelectorAll('.density-option').forEach(btn=>{
 btn.type='button';btn.style.pointerEvents='auto';btn.removeAttribute('disabled');
 const activate=e=>{e.preventDefault();e.stopPropagation();applyDensity(btn.dataset.density);};
 btn.addEventListener('click',activate,{passive:false});
 btn.addEventListener('pointerup',activate,{passive:false});
 btn.addEventListener('touchend',activate,{passive:false});
});
applyDensity(localStorage.getItem(KEY)||'compact');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(repair,150));else setTimeout(repair,150);
window.addEventListener('pageshow',()=>setTimeout(repair,100));
})();