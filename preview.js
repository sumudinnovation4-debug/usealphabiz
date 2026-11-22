/* Full-screen preview with phone / tablet / desktop sizes. Opens instantly, nothing needs saving first.
   abzPreview({title, html: ()=>string|Promise<string>, useLabel, onUse}) */
function abzPreview(o){
  if(!document.getElementById('abzpv-css')){const s=document.createElement('style');s.id='abzpv-css';s.textContent=
  '#abzpv{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;background:#e3e7e4;font-family:Inter,system-ui,sans-serif}'+
  '#abzpv .pb{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border-bottom:1px solid #dfe4df}'+
  '#abzpv .pt{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#abzpv .pd{display:flex;gap:4px}#abzpv .pd button{border:1px solid #dfe4df;background:#fff;border-radius:8px;padding:7px 10px;font-size:1rem;cursor:pointer}#abzpv .pd button.on{background:#e6f1e8;border-color:#3f8f5a}'+
  '#abzpv .ps{flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;align-items:flex-start}'+
  '#abzpv .pf{position:relative;height:100%}#abzpv iframe{border:0;background:#fff;transform-origin:0 0;display:block}'+
  '#abzpv.dev .pf{box-shadow:0 0 0 1px #0002,0 12px 40px #0003}'+
  '@media(max-width:560px){#abzpv .px{display:none}}';document.head.appendChild(s)}
  const el=document.createElement('div');el.id='abzpv';
  el.innerHTML='<div class=pb><button class="btn out sm" data-a=x>✕ Close</button><span class=pt></span><span class=pd><button data-d=p title="Phone">📱</button><button data-d=t class=px title="Tablet">📟</button><button data-d=d class=on title="Desktop">💻</button></span>'+(o.onUse?'<button class="btn sm" data-a=use></button>':'')+'</div><div class=ps><div class=pf><iframe></iframe></div></div>';
  document.body.appendChild(el);const prev=document.body.style.overflow;document.body.style.overflow='hidden';
  const fr=el.querySelector('iframe'),ps=el.querySelector('.ps'),pf=el.querySelector('.pf');let dev='d';
  el.querySelector('.pt').textContent=o.title||'Preview';if(o.onUse)el.querySelector('[data-a=use]').textContent=o.useLabel||'Use this';
  function lay(){const sw=ps.clientWidth,sh=ps.clientHeight,want=dev=='p'?390:dev=='t'?820:Math.max(1200,sw);let w=dev=='d'?want:Math.min(want,sw),k=1;if(dev=='d'&&sw<want){k=sw/want}
    el.classList.toggle('dev',dev!='d'||k<1&&false);fr.style.width=w+'px';fr.style.height=(sh/k)+'px';fr.style.transform='scale('+k+')';pf.style.width=(w*k)+'px';pf.style.height=sh+'px'}
  function close(){document.removeEventListener('keydown',key);removeEventListener('resize',lay);document.body.style.overflow=prev;el.remove()}
  function key(e){if(e.key==='Escape')close()}
  document.addEventListener('keydown',key);addEventListener('resize',lay);
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.a=='x')close();else if(b.dataset.a=='use'){close();o.onUse()}else if(b.dataset.d){dev=b.dataset.d;el.querySelectorAll('.pd button').forEach(x=>x.classList.toggle('on',x===b));lay()}};
  lay();Promise.resolve(o.html()).then(h=>{fr.srcdoc=h});
  return{close};
}
