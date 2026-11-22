import {render} from '../engine.js';
// Serves customer sites: custom domains (domain column) and free subdomains (sub column, e.g. gcchurch.usealphabiz.com).
const page=(t,b)=>new Response('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:system-ui,sans-serif;text-align:center;padding:12vh 20px"><h1>'+t+'</h1><p>'+b+'</p>',{status:404,headers:{'content-type':'text/html;charset=utf-8'}});
export default{async fetch(req,env){const host=new URL(req.url).hostname.toLowerCase(),base=(env.BASE_DOMAIN||'usealphabiz.com').toLowerCase(),h=host.replace(/^www\./,''),origin=env.SITE_ORIGIN||'https://'+base;
let q;
if(host===base||host==='www.'+base)return fetch(req);
if(host.endsWith('.'+base)){const label=host.slice(0,-base.length-1);if(label.includes('.')||['www','app','api','admin'].includes(label))return fetch(req);q='or=(sub.eq.'+label+',domain.eq.'+host+')'}
else q='domain=eq.'+h;
const r=await fetch(`${env.SUPABASE_URL}/rest/v1/sites?${q}&live=eq.true&select=id,data,variant,sub,domain,status&limit=1`,{headers:{apikey:env.SUPABASE_ANON,Authorization:'Bearer '+env.SUPABASE_ANON},cf:{cacheTtl:30,cacheEverything:true}});
const [s]=await r.json().catch(()=>[]);if(!s)return page('Site not found','This website is not live yet. <a href="'+origin+'">Build yours free at UseAlphaBiz</a>.');
const tpl=isNaN(s.variant)?await (await fetch(origin+'/tpl-'+s.variant+'.html',{cf:{cacheTtl:86400,cacheEverything:true}})).text():'';
const badge=!(s.status==='live'&&s.domain); // free sites carry a small UseAlphaBiz badge; paid sites do not
return new Response(render(s.data,s.variant,{url:'https://'+host,tpl,origin,sid:s.id,sburl:env.SUPABASE_URL,skey:env.SUPABASE_ANON,badge}),{headers:{'content-type':'text/html;charset=utf-8'}})}}
