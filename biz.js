/* UseAlphaBiz business runtime: menu / shop, cart, checkout, order tracking, bookings and forms.
   Runs on every published "system" site. Talks to the shared AlphaBiz database with the public (anon) key only.
   All prices, stock and availability are checked again on the server, so nothing here can be used to cheat. */
(function(){
const C=window.BIZ||{};if(!C.kind)return;
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cur=C.cur||'₦',money=n=>cur+Number(n||0).toLocaleString('en-NG');
const live=!!(C.sid&&C.url&&C.key),KEY='bz_'+(C.sid||'demo');
const img=u=>/^(https?:\/\/|data:image\/)/.test(u||'')?u:'';
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(KEY+k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(KEY+k,JSON.stringify(v))}catch{}}};
async function api(path,opt){const r=await fetch(C.url+'/rest/v1/'+path,Object.assign({headers:{apikey:C.key,Authorization:'Bearer '+C.key,'Content-Type':'application/json'}},opt));let j=null;try{j=await r.json()}catch{}
 if(!r.ok)throw new Error((j&&j.message)||'Something went wrong. Please try again.');return j}
const rpc=(fn,b)=>api('rpc/'+fn,{method:'POST',body:JSON.stringify(b)});
const wa=(t)=>C.wa?'https://wa.me/'+C.wa+'?text='+encodeURIComponent(t):'';

/* ---------- demo data (editor preview and templates page, before the site is published) ---------- */
const SAMPLE={
 restaurant:[['Jollof Rice & Chicken','Rice',2500,'Smoky party jollof with grilled chicken.'],['Pounded Yam & Egusi','Swallow',3000,'Fresh egusi soup with assorted meat.'],['Suya Platter','Grills',2000,'Spicy beef suya with onions and yaji.'],['Pepper Soup','Soups',2200,'Hot goat meat pepper soup.'],['Fried Rice & Plantain','Rice',2500,'Veggie fried rice with dodo.'],['Chapman','Drinks',1200,'Chilled house chapman.']],
 store:[['Wireless Mouse','Accessories',6500,'Quiet 2.4GHz wireless mouse.'],['HP LaserJet Printer','Printers',145000,'Fast mono laser printer.'],['Laptop Bag 15.6"','Accessories',12000,'Water-resistant padded bag.'],['Router AC1200','Networking',28000,'Dual-band WiFi router.'],['Power Bank 20000mAh','Power',18500,'Fast charging, 2 ports.'],['Bluetooth Speaker','Audio',15000,'Loud, clear and portable.']],
 booking:[['Classic Haircut','Hair',3000,'Clean cut and styling.','45'],['Braids (Medium)','Hair',15000,'Neat medium braids.','180'],['Full Body Massage','Spa',20000,'60 minutes of deep relaxation.','60'],['Manicure & Pedicure','Nails',12000,'Complete hand and foot care.','90']],
 school:[]};
const DEF={delivery_fee:0,open:'09:00',close:'17:00',slot_minutes:60,capacity:1,days:[1,2,3,4,5,6],orders_open:true,bank:{}};
let ITEMS=[],SET=Object.assign({},DEF),CART=store.get('cart',{});

function css(){const s=document.createElement('style');s.textContent=`
.bz-btn{display:inline-block;padding:11px 20px;border-radius:var(--r,10px);background:var(--ac,#1b9a4b);color:var(--on,#fff);border:2px solid var(--ac,#1b9a4b);font:700 .95rem/1.2 inherit;font-family:inherit;cursor:pointer;text-decoration:none}.bz-btn.o{background:transparent;color:inherit;border-color:currentColor}.bz-btn[disabled]{opacity:.45;cursor:not-allowed}.bz-btn.sm{padding:7px 14px;font-size:.85rem}
.bz-bar{display:flex;gap:8px;overflow-x:auto;padding:4px 0 14px;margin-bottom:6px}.bz-chip{flex:none;padding:8px 16px;border-radius:99px;border:1.5px solid currentColor;background:transparent;color:inherit;font:600 .88rem inherit;font-family:inherit;cursor:pointer;opacity:.75}.bz-chip.on{background:var(--ac,#1b9a4b);color:var(--on,#fff);border-color:var(--ac,#1b9a4b);opacity:1}
.bz-search{width:100%;max-width:360px;padding:11px 14px;border-radius:10px;border:1.5px solid #8884;background:var(--bz-bg,#fff);color:var(--bz-fg,#1a1a1a);font:inherit;margin-bottom:12px}
.bz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}.bz-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.bz-card{background:var(--bz-bg,#fff);color:var(--bz-fg,#1a1a1a);border-radius:var(--r,12px);overflow:hidden;border:1px solid #8882;display:flex;flex-direction:column}.bz-list .bz-card{flex-direction:row;align-items:stretch}
.bz-im{aspect-ratio:4/3;background:#8881 center/cover;display:grid;place-items:center;font:800 2.4rem system-ui;color:#8886}.bz-list .bz-im{width:110px;aspect-ratio:auto;flex:none}
.bz-in{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}.bz-in b{font-size:1.02rem}.bz-in p{margin:0;font-size:.88rem;opacity:.75}.bz-pr{font-weight:800;font-size:1.05rem}.bz-low{font-size:.78rem;color:#c0392b;font-weight:700}
.bz-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto;padding-top:6px}.bz-qty{display:inline-flex;align-items:center;gap:10px}.bz-qty button{width:32px;height:32px;border-radius:50%;border:1.5px solid currentColor;background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}
.bz-fab{position:fixed;left:16px;bottom:16px;z-index:70;display:none}.bz-fab.on{display:block}.bz-fab .bz-btn{box-shadow:0 8px 24px #0005;padding:14px 22px;font-size:1rem}
.bz-ov{position:fixed;inset:0;background:#000a;z-index:90;display:none;align-items:flex-end;justify-content:center}.bz-ov.on{display:flex}
.bz-md{background:var(--bz-bg,#fff);color:var(--bz-fg,#1a1a1a);width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:22px;font-family:inherit}@media(min-width:700px){.bz-ov{align-items:center}.bz-md{border-radius:20px}}
.bz-md h3{margin:0 0 12px;font-size:1.3rem}.bz-md label,.bz-f label{display:block;font-size:.84rem;font-weight:700;margin:12px 0 4px}
.bz-md input,.bz-md select,.bz-md textarea,.bz-f input,.bz-f select,.bz-f textarea{width:100%;padding:12px;border-radius:10px;border:1.5px solid #8886;background:var(--bz-bg,#fff);color:var(--bz-fg,#1a1a1a);font:inherit;font-size:1rem}
.bz-line{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #8882}.bz-tot{display:flex;justify-content:space-between;font-weight:800;font-size:1.1rem;padding:12px 0}
.bz-opts{display:flex;gap:8px;flex-wrap:wrap}.bz-opt{flex:1;min-width:100px}.bz-opt input{position:absolute;opacity:0}.bz-opt span{display:block;text-align:center;padding:11px 8px;border-radius:10px;border:1.5px solid #8886;font-weight:600;cursor:pointer}.bz-opt input:checked+span{background:var(--ac,#1b9a4b);color:var(--on,#fff);border-color:var(--ac,#1b9a4b)}.bz-opt{position:relative}
.bz-err{background:#fdecea;color:#b3261e;padding:10px 12px;border-radius:10px;font-size:.9rem;margin-top:12px}.bz-ok{background:#e8f6ee;color:#14633a;padding:14px;border-radius:12px;margin:10px 0}
.bz-slots{display:flex;gap:8px;flex-wrap:wrap}.bz-slots button{padding:10px 14px;border-radius:10px;border:1.5px solid currentColor;background:transparent;color:inherit;font:700 .92rem inherit;font-family:inherit;cursor:pointer}.bz-slots button.on{background:var(--ac,#1b9a4b);color:var(--on,#fff);border-color:var(--ac,#1b9a4b)}.bz-slots button[disabled]{opacity:.35;text-decoration:line-through;cursor:not-allowed}
.bz-f{background:var(--bz-bg,#fff);color:var(--bz-fg,#1a1a1a);border-radius:var(--r,14px);padding:24px;border:1px solid #8882;max-width:640px}.bz-hp{position:absolute;left:-9999px;opacity:0}.bz-empty{padding:30px;text-align:center;opacity:.7}.bz-demo{background:#fff7d6;color:#6b5400;padding:8px 12px;border-radius:8px;font-size:.82rem;margin:0 0 12px}.bz-bank{background:#8881;padding:12px;border-radius:10px;font-size:.92rem;line-height:1.7}`;document.head.appendChild(s)}

/* ---------- load ---------- */
async function load(){
 if(!live){const k=C.kind;ITEMS=((C.pack&&window.BIZ_PACKS&&BIZ_PACKS[C.pack])||SAMPLE[k]||[]).map((r,i)=>({id:'demo'+i,kind:k=='booking'?'service':'product',category:r[1],name:r[0],price:r[2],descr:r[3],minutes:+r[4]||60,stock:null,image:'',sort:i}));return}
 try{const [it,st]=await Promise.all([api('b_items?site_id=eq.'+C.sid+'&active=eq.true&select=*&order=category.asc,sort.asc,name.asc'),api('b_settings?site_id=eq.'+C.sid+'&select=s')]);ITEMS=it||[];if(st&&st[0])SET=Object.assign({},DEF,st[0].s)}catch(e){ITEMS=[];window.__bzErr=e.message}}
const prods=()=>ITEMS.filter(i=>i.kind=='product'),svcs=()=>ITEMS.filter(i=>i.kind=='service');
const demoNote=()=>live?'':'<div class="bz-demo">Preview mode: sample items. Your real items appear after you publish and add them in your dashboard.</div>';

/* ---------- catalog ---------- */
function catalog(el){
 const layout=el.dataset.layout||'grid',all=prods();let cat='All',q='';
 if(!all.length){el.innerHTML=demoNote()+'<div class="bz-empty">Our menu is being updated. Please check back soon or message us on WhatsApp.</div>';return}
 const cats=['All',...new Set(all.map(i=>i.category).filter(Boolean))];
 const draw=()=>{const L=all.filter(i=>(cat=='All'||i.category==cat)&&(!q||(i.name+' '+i.descr+' '+i.category).toLowerCase().includes(q)));
  el.innerHTML=demoNote()+(el.dataset.search?'<input class="bz-search" placeholder="Search products..." value="'+esc(q)+'">':'')+(cats.length>2?'<div class="bz-bar">'+cats.map(c=>'<button class="bz-chip '+(c==cat?'on':'')+'" data-c="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div>':'')+
  '<div class="bz-'+layout+'">'+(L.map(card).join('')||'<div class="bz-empty">Nothing found.</div>')+'</div>';
  const s=$('.bz-search',el);if(s){s.oninput=()=>{q=s.value.toLowerCase();const p=s.selectionStart;draw();const n=$('.bz-search',el);n.focus();n.setSelectionRange(p,p)}}};
 const card=i=>{const out=i.stock===0,n=CART[i.id]||0,im=img(i.image);
  return '<div class="bz-card"><div class="bz-im" style="'+(im?"background-image:url('"+esc(im)+"')":'')+'">'+(im?'':esc((i.name||'?')[0]))+'</div><div class="bz-in"><b>'+esc(i.name)+'</b>'+(i.descr?'<p>'+esc(i.descr)+'</p>':'')+(i.stock!=null&&i.stock>0&&i.stock<=5?'<span class="bz-low">Only '+i.stock+' left</span>':'')+
  '<div class="bz-row"><span class="bz-pr">'+(i.price==null?'Ask for price':money(i.price))+'</span>'+(out?'<span class="bz-low">Sold out</span>':i.price==null?(C.wa?'<a class="bz-btn sm o" target="_blank" rel="noopener" href="'+wa('Hi, what is the price of '+i.name+'?')+'">Ask</a>':''):n?'<span class="bz-qty"><button data-m="'+esc(i.id)+'" aria-label="Less">−</button><b>'+n+'</b><button data-p="'+esc(i.id)+'" aria-label="More">+</button></span>':'<button class="bz-btn sm" data-a="'+esc(i.id)+'">Add</button>')+'</div></div></div>'};
 el.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.c){cat=t.dataset.c;draw()}else if(t.dataset.a||t.dataset.p){add(t.dataset.a||t.dataset.p,1)}else if(t.dataset.m){add(t.dataset.m,-1)}};
 el.redraw=draw;draw()}
function add(id,d){const it=ITEMS.find(x=>x.id==id);if(!it)return;let n=(CART[id]||0)+d;if(it.stock!=null)n=Math.min(n,it.stock);if(n<=0)delete CART[id];else CART[id]=Math.min(n,50);store.set('cart',CART);$$('[data-biz=catalog]').forEach(e=>e.redraw&&e.redraw());fab();if($('.bz-ov.on #bz-cart'))cartView()}
const lines=()=>Object.keys(CART).map(id=>{const it=ITEMS.find(x=>x.id==id);return it&&it.price!=null?{it,qty:CART[id]}:null}).filter(Boolean),sub=()=>lines().reduce((a,l)=>a+l.it.price*l.qty,0),count=()=>lines().reduce((a,l)=>a+l.qty,0);

/* ---------- online payment (Paystack, the business's own account) ---------- */
function loadPS(){return new Promise((ok,no)=>{if(window.PaystackPop)return ok();const x=document.createElement('script');x.src='https://js.paystack.co/v1/inline.js';x.onload=ok;x.onerror=()=>no(new Error('Could not load the payment window. Check your internet and try again.'));document.head.appendChild(x)})}
/* Opens Paystack. Resolves true only after OUR server has confirmed with Paystack that the money arrived. */
async function payNow(kind,ref,amount,v){
 await loadPS();const em=(v.email&&/^\S+@\S+\.\S+$/.test(v.email))?v.email:(String(v.phone||'').replace(/\D/g,'')||'customer')+'@pay.usealphabiz.com';
 const paid=await new Promise(res=>{let ok=false;PaystackPop.setup({key:SET.paystack_pk,email:em,amount:Math.round(amount*100),currency:'NGN',ref:ref+'x'+Date.now().toString(36),metadata:{bz_site:C.sid,bz_ref:ref,bz_kind:kind},
  callback:r=>{ok=true;res(r.reference)},onClose:()=>{if(!ok)res(null)}}).openIframe()});
 if(!paid)return false;
 const r=await fetch((C.api||'')+'/api/bz-pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site:C.sid,kind,ref,reference:paid})});const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.ok)throw new Error(j.error||'We could not confirm your payment yet. If you were charged, the business will confirm it.');return true}
function payBox(el,kind,ref,amount,v){el.innerHTML='<div class="bz-err" style="background:#fff7d6;color:#6b5400">Payment of <b>'+money(amount)+'</b> not completed yet.</div><button class="bz-btn" style="width:100%;margin-top:10px" type="button">Pay '+money(amount)+' now</button><div class="bz-pe"></div>';
 const b=$('button',el),e=$('.bz-pe',el);b.onclick=async()=>{b.disabled=true;e.innerHTML='';try{if(!live)throw new Error('Preview mode: payment is only available on the published site.');
   if(await payNow(kind,ref,amount,v)){el.innerHTML='<div class="bz-ok">Payment received ✔ Thank you.</div>';el.dispatchEvent(new CustomEvent('bz-paid',{bubbles:true}))}else{b.disabled=false}}catch(x){e.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>';b.disabled=false}};
 return b}

/* ---------- cart + checkout ---------- */
let OV;function overlay(){if(OV)return OV;OV=document.createElement('div');OV.className='bz-ov';OV.innerHTML='<div class="bz-md" role="dialog" aria-modal="true"></div>';OV.onclick=e=>{if(e.target==OV)OV.classList.remove('on')};document.body.appendChild(OV);document.addEventListener('keydown',e=>{if(e.key=='Escape')OV.classList.remove('on')});return OV}
const open=h=>{const o=overlay();$('.bz-md',o).innerHTML=h;o.classList.add('on');return $('.bz-md',o)};
let FAB;function fab(){if(!prods().length)return;if(!FAB){FAB=document.createElement('div');FAB.className='bz-fab';FAB.innerHTML='<button class="bz-btn"></button>';FAB.onclick=cartView;document.body.appendChild(FAB)}
 const n=count();FAB.classList.toggle('on',n>0);$('button',FAB).textContent='🛒 '+n+' item'+(n>1?'s':'')+' · '+money(sub())}
function cartView(){const L=lines();if(!L.length){open('<h3>Your cart</h3><div class="bz-empty">Your cart is empty.</div><button class="bz-btn block" onclick="this.closest(\'.bz-ov\').classList.remove(\'on\')">Close</button>');return}
 const modes=C.kind=='restaurant'?[['delivery','Delivery'],['pickup','Pickup'],['dinein','Dine-in']]:[['delivery','Delivery'],['pickup','Pickup']],bank=SET.bank&&SET.bank.number,fee=+SET.delivery_fee||0,saved=store.get('me',{});
 const m=open('<div id="bz-cart"><h3>Your order</h3>'+demoNote()+L.map(l=>'<div class="bz-line"><span>'+esc(l.it.name)+'</span><span class="bz-qty"><button data-m="'+esc(l.it.id)+'">−</button><b>'+l.qty+'</b><button data-p="'+esc(l.it.id)+'">+</button></span><b>'+money(l.it.price*l.qty)+'</b></div>').join('')+
 '<div class="bz-tot"><span>Subtotal</span><span id="bz-sub">'+money(sub())+'</span></div>'+(SET.orders_open===false?'<div class="bz-err">We are not taking orders right now.</div>':'')+
 '<form id="bz-co"><label>How would you like it?</label><div class="bz-opts">'+modes.map((x,i)=>'<label class="bz-opt"><input type="radio" name="mode" value="'+x[0]+'" '+(i?'':'checked')+'><span>'+x[1]+'</span></label>').join('')+'</div>'+
 '<div id="bz-adr"><label>Delivery address</label><textarea name="address" rows="2" placeholder="House number, street, area">'+esc(saved.address||'')+'</textarea>'+(fee?'<small>Delivery fee: '+money(fee)+'</small>':'')+'</div>'+
 '<label>Your name</label><input name="name" required value="'+esc(saved.name||'')+'" autocomplete="name"><label>Phone number</label><input name="phone" type="tel" required value="'+esc(saved.phone||'')+'" autocomplete="tel" placeholder="080..."><label>Email (optional)</label><input name="email" type="email" value="'+esc(saved.email||'')+'">'+
 '<label>Note (optional)</label><input name="note" placeholder="e.g. no pepper, call when you arrive">'+
 '<label>How will you pay?</label><div class="bz-opts">'+(bank?'<label class="bz-opt"><input type="radio" name="pay" value="transfer" '+(SET.paystack_pk?'':'checked')+'><span>Bank transfer</span></label>':'')+'<label class="bz-opt"><input type="radio" name="pay" value="cash" '+(bank||SET.paystack_pk?'':'checked')+'><span>Cash on delivery/pickup</span></label>'+(SET.paystack_pk?'<label class="bz-opt"><input type="radio" name="pay" value="card" checked><span>Pay online (card / transfer)</span></label>':'')+(C.wa?'<label class="bz-opt"><input type="radio" name="pay" value="whatsapp"><span>Confirm on WhatsApp</span></label>':'')+'</div>'+
 '<div id="bz-e"></div><button class="bz-btn bz-sub" style="width:100%;margin-top:16px;padding:15px" '+(SET.orders_open===false?'disabled':'')+'>Place order · <span id="bz-t">'+money(sub()+fee)+'</span></button></form></div>');
 const f=$('#bz-co',m),sync=()=>{const d=f.mode.value=='delivery';$('#bz-adr',m).style.display=d?'':'none';$('#bz-t',m).textContent=money(sub()+(d?fee:0))};f.onchange=sync;sync();
 $('#bz-cart',m).onclick=e=>{const t=e.target.closest('button');if(t&&(t.dataset.p||t.dataset.m))add(t.dataset.p||t.dataset.m,t.dataset.p?1:-1)};
 f.onsubmit=async e=>{e.preventDefault();const b=$('.bz-sub',f),er=$('#bz-e',f);er.innerHTML='';b.disabled=true;const v=Object.fromEntries(new FormData(f));store.set('me',{name:v.name,phone:v.phone,email:v.email,address:v.address});
  try{let r;if(live)r=await rpc('place_order',{sid:C.sid,p_name:v.name,p_phone:v.phone,p_email:v.email||'',p_mode:v.mode,p_address:v.address||'',p_note:v.note||'',p_pay:v.pay,p_items:L.map(l=>({id:l.it.id,qty:l.qty}))});
   else r={ref:'DEMO1234',total:sub()+(v.mode=='delivery'?fee:0),subtotal:sub(),fee:v.mode=='delivery'?fee:0};
   store.set('last',{ref:r.ref,phone:v.phone});done(r,v,L)}catch(x){er.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>';b.disabled=false}}}
function done(r,v,L){const msg='Hello '+(C.name||'')+', I just placed order '+r.ref+':\n'+L.map(l=>l.qty+' x '+l.it.name).join('\n')+'\nTotal: '+money(r.total)+'\nName: '+v.name+'\nPhone: '+v.phone+(v.mode=='delivery'?'\nAddress: '+v.address:'\n'+(v.mode=='dinein'?'Dine-in':'Pickup'))+(v.note?'\nNote: '+v.note:'');
 const b=SET.bank||{};CART={};store.set('cart',CART);fab();$$('[data-biz=catalog]').forEach(e=>e.redraw&&e.redraw());
 open('<h3>Order received ✔</h3>'+demoNote()+'<div class="bz-ok">Your order number is <b>'+esc(r.ref)+'</b>. Total: <b>'+money(r.total)+'</b>. Keep this number to track your order.</div>'+
 (v.pay=='transfer'&&b.number?'<div class="bz-bank"><b>Pay by bank transfer</b><br>Bank: '+esc(b.bank)+'<br>Account name: '+esc(b.name)+'<br>Account number: <b>'+esc(b.number)+'</b><br>Amount: <b>'+money(r.total)+'</b><br>Narration: '+esc(r.ref)+'</div><p style="font-size:.88rem">We will confirm your order as soon as payment arrives.</p>':'<p>We will contact you shortly to confirm.</p>')+
 (v.pay=='card'?'<div id="bz-pay"></div>':'')+(C.wa?'<a class="bz-btn" style="display:block;text-align:center;margin:12px 0" target="_blank" rel="noopener" href="'+wa(msg)+'">Send order on WhatsApp</a>':'')+'<button class="bz-btn o" style="width:100%" onclick="this.closest(\'.bz-ov\').classList.remove(\'on\')">Close</button>');
 if(v.pay=='card'){const el=$('#bz-pay'),b=payBox(el,'order',r.ref,r.total,v);b.click()}}

/* ---------- order tracking ---------- */
const STAT={new:'Received',confirmed:'Confirmed',preparing:'Being prepared',ready:'Ready',out:'Out for delivery',done:'Completed',cancelled:'Cancelled'};
function track(el){const last=store.get('last',{});el.innerHTML='<form class="bz-f" style="margin:0 auto"><h3 style="margin-top:0">Track your order</h3>'+demoNote()+'<label>Order number</label><input name="ref" required value="'+esc(last.ref||'')+'" placeholder="AB1234EF"><label>Phone number used</label><input name="phone" type="tel" required value="'+esc(last.phone||'')+'"><div class="r"></div><button class="bz-btn" style="margin-top:14px">Check status</button></form>';
 const f=$('form',el);f.onsubmit=async e=>{e.preventDefault();const r=$('.r',f);r.innerHTML='';try{const o=live?await rpc('track_order',{sid:C.sid,p_ref:f.ref.value,p_phone:f.phone.value}):{ref:'DEMO1234',status:'preparing',pay_status:'pending',total:5000,items:[]};
  r.innerHTML='<div class="bz-ok" style="margin-top:14px"><b>'+esc(STAT[o.status]||o.status)+'</b><br>Order '+esc(o.ref)+' · '+money(o.total)+' · Payment: '+(o.pay_status=='paid'?'received':'pending')+'</div>'}catch(x){r.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>'}}}

/* ---------- services + booking ---------- */
function services(el){const L=svcs();if(!L.length){el.innerHTML=demoNote()+'<div class="bz-empty">Our services list is being updated.</div>';return}
 el.innerHTML=demoNote()+'<div class="bz-list">'+L.map(i=>'<div class="bz-card"><div class="bz-in"><b>'+esc(i.name)+'</b>'+(i.descr?'<p>'+esc(i.descr)+'</p>':'')+'<div class="bz-row"><span class="bz-pr">'+(i.price==null?'':money(i.price)+' · ')+i.minutes+' min</span><a class="bz-btn sm" href="#book" data-bk="'+esc(i.id)+'">Book</a></div></div></div>').join('')+'</div>';
 el.onclick=e=>{const a=e.target.closest('[data-bk]');if(a){const s=$('#bz-svc');if(s)s.value=a.dataset.bk}}}
function booking(el){const L=svcs(),today=new Date(Date.now()+36e5).toISOString().slice(0,10),max=new Date(Date.now()+36e5+90*864e5).toISOString().slice(0,10);let slot='';
 el.innerHTML='<form class="bz-f" id="book">'+demoNote()+'<h3 style="margin-top:0">Book an appointment</h3>'+(L.length?'<label>Service</label><select name="item" id="bz-svc">'+L.map(i=>'<option value="'+esc(i.id)+'">'+esc(i.name)+(i.price!=null?' · '+money(i.price):'')+'</option>').join('')+'</select>':'')+
 '<label>Date</label><input type="date" name="day" min="'+today+'" max="'+max+'" required><label>Time</label><div class="bz-slots" id="bz-sl"><span class="mut">Choose a date first</span></div>'+
 '<label>Your name</label><input name="name" required autocomplete="name"><label>Phone number</label><input name="phone" type="tel" required autocomplete="tel"><label>Email (optional)</label><input name="email" type="email"><label>Note (optional)</label><input name="note">'+
 '<input class="bz-hp" name="website" tabindex="-1" autocomplete="off"><div id="bz-be"></div><button class="bz-btn bz-sub" style="width:100%;margin-top:16px;padding:15px">Confirm booking</button></form>';
 const f=$('form',el),sl=$('#bz-sl',el),er=$('#bz-be',el);
 f.day.onchange=async(keep)=>{slot='';sl.innerHTML='Loading...';if(keep!==true)er.innerHTML='';try{let r;if(live)r=await rpc('booking_slots',{sid:C.sid,p_day:f.day.value});else{r={slots:[],full:['11:00']};for(let h=9;h<17;h++)r.slots.push(String(h).padStart(2,'0')+':00')}
   sl.innerHTML=r.slots.length?r.slots.map(s=>'<button type="button" data-s="'+s+'" '+(r.full.includes(s)?'disabled':'')+'>'+s+'</button>').join(''):'<span>No times available on this day. Please choose another date.</span>'}catch(x){sl.innerHTML='';er.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>'}};
 sl.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;slot=b.dataset.s;$$('button',sl).forEach(x=>x.classList.toggle('on',x==b))};
 f.onsubmit=async e=>{e.preventDefault();er.innerHTML='';if(f.website.value)return;if(!slot){er.innerHTML='<div class="bz-err">Please choose a time.</div>';return}const b=$('.bz-sub',f);b.disabled=true;
  try{const sv=L.find(x=>x.id==(f.item&&f.item.value));let r;if(live)r=await rpc('book_slot',{sid:C.sid,p_item:(f.item&&f.item.value)||null,p_day:f.day.value,p_slot:slot,p_name:f.name.value,p_phone:f.phone.value,p_email:f.email.value,p_note:f.note.value});else r={ref:'BKDEMO',day:f.day.value,slot,service:sv?sv.name:''};
   const msg='Hello '+(C.name||'')+', I booked '+(r.service||'an appointment')+' for '+r.day+' at '+r.slot+'. Ref '+r.ref+'. Name: '+f.name.value;
   el.innerHTML='<div class="bz-f">'+demoNote()+'<h3 style="margin-top:0">Booking received ✔</h3><div class="bz-ok">'+esc(r.service||'Appointment')+'<br><b>'+esc(r.day)+' at '+esc(r.slot)+'</b><br>Reference: <b>'+esc(r.ref)+'</b></div><p>We will confirm shortly. Please arrive a few minutes early.</p>'+(C.wa?'<a class="bz-btn" target="_blank" rel="noopener" href="'+wa(msg)+'">Confirm on WhatsApp</a>':'')+'</div>';
   if(+r.amount_due>0){const bx=document.createElement('div');bx.style.margin='14px 0';el.firstChild.insertBefore(bx,$('p',el));payBox(bx,'booking',r.ref,+r.amount_due,{email:f.email.value,phone:f.phone.value}).click()}
  }catch(x){er.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>';b.disabled=false;if(/taken|available/i.test(x.message))f.day.onchange(true)}}}

/* ---------- generic forms: admission and enquiry ---------- */
function forms(){$$('form[data-biz-form]').forEach(f=>{f.classList.add('bz-f');if(!$('.bz-hp',f))f.insertAdjacentHTML('beforeend','<input class="bz-hp" name="website" tabindex="-1" autocomplete="off"><div class="bz-r"></div>');
 f.onsubmit=async e=>{e.preventDefault();const r=$('.bz-r',f),b=$('button[type=submit],button:not([type])',f);r.innerHTML='';const v=Object.fromEntries(new FormData(f));if(v.website){f.innerHTML='<div class="bz-ok">Thank you!</div>';return}delete v.website;
  const {name,phone,email,message,...data}=v;if(b)b.disabled=true;
  try{let o;if(live)o=await rpc('submit_form',{sid:C.sid,p_kind:f.dataset.bizForm,p_name:name||'',p_phone:phone||'',p_email:email||'',p_message:message||'',p_data:data});else o={ref:'DEMO'};
   const txt='Hello '+(C.name||'')+', I just sent '+(f.dataset.bizForm=='admission'?'an admission application':'an enquiry')+' (ref '+o.ref+'). Name: '+name;
   f.innerHTML=demoNote()+'<h3 style="margin-top:0">Thank you ✔</h3><div class="bz-ok">We received your '+(f.dataset.bizForm=='admission'?'application':'message')+'. Reference: <b>'+esc(o.ref)+'</b>. We will contact you soon.</div>'+(C.wa?'<a class="bz-btn" target="_blank" rel="noopener" href="'+wa(txt)+'">Also message us on WhatsApp</a>':'')}catch(x){r.innerHTML='<div class="bz-err">'+esc(x.message)+'</div>';if(b)b.disabled=false}}})}

async function init(){css();await load();
 $$('[data-biz=catalog]').forEach(catalog);$$('[data-biz=services]').forEach(services);$$('[data-biz=booking]').forEach(booking);$$('[data-biz=track]').forEach(track);forms();fab();
 const wb=$$('[data-biz-hours]');if(wb.length&&live)wb.forEach(e=>e.textContent=SET.open+' - '+SET.close)}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
