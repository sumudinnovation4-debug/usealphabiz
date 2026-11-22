/* UseAlphaBiz visual editor bridge. Runs inside the preview iframe (same origin as editor.html). */
(function(){
var A=window.__abz,D=document,P=window.parent,H=P&&P.__abzHost;if(!A||!H)return;
var cur=null,hov=null,editing=null,orig='',pt=null;
var css=D.createElement('style');css.setAttribute('data-abz-x','');
css.textContent='.abz-hov{outline:2px dashed rgba(63,143,90,.7)!important;outline-offset:-2px;cursor:pointer!important}.abz-sel{outline:3px solid #3f8f5a!important;outline-offset:-3px}[contenteditable=true]{outline:3px solid #f59e0b!important;outline-offset:-3px;cursor:text!important;-webkit-user-select:text;user-select:text}html{-webkit-tap-highlight-color:transparent}';
D.head.appendChild(css);
var INL=':not(b):not(strong):not(i):not(em):not(u):not(br):not(span):not(a):not(mark):not(small):not(sup):not(sub)';
function tgt(n){while(n&&n.nodeType!==1)n=n.parentNode;return n&&n.closest?n.closest('[data-abz]'):null}
function byId(id){return id?D.querySelector('[data-abz="'+id+'"]'):null}
function textual(e){if(!e||!e.textContent.trim())return false;if(/^(IMG|SVG|INPUT|TEXTAREA|SELECT|VIDEO|IFRAME|CANVAS|BODY|HTML)$/i.test(e.tagName))return false;if(e.querySelector('*'+INL))return false;if(e.querySelector('*:not([data-abz])'))return false;return true}
function hex(c){var m=String(c).match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,\/]+([\d.]+))?/);if(!m)return '';if(m[4]!=null&&parseFloat(m[4])===0)return '';return '#'+[m[1],m[2],m[3]].map(function(n){return ('0'+(+n).toString(16)).slice(-2)}).join('')}
function effBg(e){while(e){var h=hex(getComputedStyle(e).backgroundColor);if(h)return h;e=e.parentElement}return '#ffffff'}
function label(e){var t=e.tagName.toLowerCase();if(/^h[1-6]$/.test(t))return 'Heading';if(t==='p')return 'Paragraph';if(t==='img')return 'Photo';if(t==='a')return /btn|button/i.test(e.className)?'Button':'Link';if(t==='button')return 'Button';if(t==='li')return 'List item';if(t==='section')return 'Section';if(t==='header'||t==='nav')return 'Header';if(t==='footer')return 'Footer';if(t==='body')return 'Page';if(textual(e))return 'Text';if(/url\(/.test(getComputedStyle(e).backgroundImage))return 'Photo block';return 'Block'}
function secOf(e){var x=e&&e!==D.body?e:null,best=null;while(x&&x!==D.body){if(/^(SECTION|HEADER|FOOTER|ARTICLE|ASIDE)$/.test(x.tagName)){best=x;break}x=x.parentElement}
if(best)return best;x=e;while(x&&x!==D.body){var p=x.parentElement;if(p&&p.children.length>=3&&x.offsetHeight>90&&getComputedStyle(x).display!=='inline'){return x}x=p}return null}
function info(e){if(!e)return null;var cs=getComputedStyle(e),t=e.tagName.toLowerCase(),a=e.closest('a'),sec=secOf(e),imgIn=t!=='img'?e.querySelector('img[data-abz]'):null;
return{id:e.getAttribute('data-abz'),tag:t,label:label(e),text:textual(e),img:t==='img',bg:/url\(/.test(cs.backgroundImage),
 link:!!a,linkId:a?a.getAttribute('data-abz'):'',href:a?(a.getAttribute('href')||''):'',alt:t==='img'?(e.getAttribute('alt')||''):'',
 photoInside:!!imgIn,isBody:e===D.body,hasSec:!!sec,secLabel:sec?label(sec):'',
 s:{color:hex(cs.color)||'#000000',bg:effBg(e),bgOwn:!!hex(cs.backgroundColor),fs:parseFloat(cs.fontSize)||16,fw:parseInt(cs.fontWeight)||400,ta:cs.textAlign,pt:parseFloat(cs.paddingTop)||0,pb:parseFloat(cs.paddingBottom)||0,br:parseFloat(cs.borderRadius)||0}}}
function mark(e){if(cur)cur.classList.remove('abz-sel');cur=e||null;if(cur)cur.classList.add('abz-sel');H.sel(info(cur))}
function refresh(){H.sel(info(cur))}
function nid(){return 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function commit(op){A.run(op);H.log(op);refresh()}
function endEdit(ok){if(!editing)return;var e=editing;editing=null;e.removeAttribute('contenteditable');e.blur();
 if(ok){var h=A.san(e.innerHTML);if(h!==A.san(orig))commit({t:'tx',id:e.getAttribute('data-abz'),h:h})}else e.innerHTML=orig;H.editing(false)}
function startEdit(e){e=e||cur;if(!e||!textual(e))return false;endEdit(true);editing=e;orig=e.innerHTML;e.setAttribute('contenteditable','true');e.focus();
 try{var r=D.createRange();r.selectNodeContents(e);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r)}catch(x){}H.editing(true);return true}
D.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a');if(a||ev.target.closest('button,[type=submit]'))ev.preventDefault();
 if(editing&&editing.contains(ev.target))return;ev.preventDefault();ev.stopPropagation();
 if(editing)endEdit(true);var e=tgt(ev.target);if(!e)return;pt={x:ev.clientX,y:ev.clientY};
 if(e===cur&&textual(e)){startEdit(e);return}mark(e)},true);
D.addEventListener('submit',function(ev){ev.preventDefault()},true);
D.addEventListener('mousemove',function(ev){if(editing)return;var e=tgt(ev.target);if(e===hov)return;if(hov)hov.classList.remove('abz-hov');hov=e;if(hov&&hov!==cur)hov.classList.add('abz-hov')});
D.addEventListener('mouseleave',function(){if(hov){hov.classList.remove('abz-hov');hov=null}});
D.addEventListener('focusout',function(ev){if(editing&&ev.target===editing)setTimeout(function(){if(editing&&D.activeElement!==editing)endEdit(true)},0)});
D.addEventListener('keydown',function(ev){if(ev.key==='Escape'){if(editing)endEdit(false);else mark(null)}if(ev.key==='Enter'&&editing&&/^(H[1-6]|A|BUTTON|LI)$/.test(editing.tagName)&&!ev.shiftKey){ev.preventDefault();endEdit(true)}});
D.addEventListener('paste',function(ev){if(!editing)return;ev.preventDefault();var t=(ev.clipboardData||window.clipboardData).getData('text/plain');D.execCommand('insertText',false,t)});
function sec(){return secOf(cur)||null}
var API={
 cur:function(){return info(cur)},
 select:function(id){mark(byId(id))},
 deselect:function(){endEdit(true);mark(null)},
 edit:function(){return startEdit()},
 parent:function(){endEdit(true);if(!cur)return;var p=cur.parentElement;p=p&&p.closest('[data-abz]');if(p)mark(p)},
 under:function(){endEdit(true);if(!pt)return;var st=D.elementsFromPoint(pt.x,pt.y).filter(function(x){return x.hasAttribute&&x.hasAttribute('data-abz')}),i=st.indexOf(cur);if(st.length)mark(st[(i+1)%st.length])},
 photo:function(){endEdit(true);if(!cur)return;var i=cur.querySelector('img[data-abz]');if(i)mark(i)},
 style:function(s,deep){if(cur){endEdit(true);commit({t:'st',id:cur.getAttribute('data-abz'),s:s,deep:deep?1:0})}},
 styleOn:function(id,s,deep){if(byId(id))commit({t:'st',id:id,s:s,deep:deep?1:0})},
 image:function(url){if(cur){endEdit(true);commit({t:'im',id:cur.getAttribute('data-abz'),v:url})}},
 attr:function(a){var e=cur&&(cur.closest('a')&&a.href!=null?cur.closest('a'):cur);if(e)commit({t:'at',id:e.getAttribute('data-abz'),a:a})},
 dup:function(){if(!cur||cur===D.body)return;endEdit(true);var n=nid();commit({t:'dup',id:cur.getAttribute('data-abz'),n:n});mark(byId(n))},
 del:function(){if(!cur||cur===D.body)return;endEdit(true);var p=cur.parentElement;commit({t:'x',id:cur.getAttribute('data-abz')});mark(null)},
 mv:function(d){if(!cur||cur===D.body)return;endEdit(true);commit({t:'mv',id:cur.getAttribute('data-abz'),d:d});refresh()},
 secMv:function(d){var s=sec();if(s)commit({t:'mv',id:s.getAttribute('data-abz'),d:d});s&&s.scrollIntoView({block:'center',behavior:'smooth'})},
 secDup:function(){var s=sec();if(!s)return;var n=nid();commit({t:'dup',id:s.getAttribute('data-abz'),n:n});var c=byId(n);c&&c.scrollIntoView({block:'start',behavior:'smooth'});mark(c)},
 secDel:function(){var s=sec();if(!s)return;if(s.contains(cur))mark(null);commit({t:'x',id:s.getAttribute('data-abz')})},
 selSec:function(){var s=sec();if(s)mark(s)},
 ins:function(kind){endEdit(true);var s=sec(),after=s;if(!after){var k=[].slice.call(D.querySelectorAll('body>*[data-abz]')).filter(function(x){return x.offsetHeight>0});after=k[k.length-1]}if(!after)return;
  var n=nid();commit({t:'ins',id:after.getAttribute('data-abz'),n:n,k:kind});var c=byId(n);if(c){c.scrollIntoView({block:'center',behavior:'smooth'});mark(c)}},
 font:function(h,b){var o={t:'font'};if(h)o.h=h;if(b)o.b=b;commit(o)},
 rule:function(k,p){commit({t:'rule',k:k,p:p})},
 recolor:function(f,v){commit({t:'cr',f:f,v:v})},
 swatches:function(){
  var hd=D.querySelector('header')||D.querySelector('nav'),ft=D.querySelector('footer'),btn=null;
  var bs=D.querySelectorAll('.btn,button,a[class*="btn"],a[class*="button"],[class*="button"]');for(var i=0;i<bs.length&&!btn;i++){var h=hex(getComputedStyle(bs[i]).backgroundColor);if(h&&bs[i].offsetHeight>0)btn=h}
  var cs=function(e){return e?getComputedStyle(e):null};
  return{header:hd?{id:hd.getAttribute('data-abz'),bg:effBg(hd),fg:hex(cs(hd).color)||'#000000'}:null,
   footer:ft?{id:ft.getAttribute('data-abz'),bg:effBg(ft),fg:hex(cs(ft).color)||'#000000'}:null,
   page:{id:'b',bg:effBg(D.body)},main:btn}}
};
window.__abzEd=API;
H.ready&&H.ready(API);
})();
