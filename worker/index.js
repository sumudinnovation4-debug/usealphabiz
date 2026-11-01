import {render} from '../engine.js';
export default{async fetch(req,env){const h=new URL(req.url).hostname.replace(/^www\./,''),origin=env.SITE_ORIGIN||'https://usealphabiz.com';
const r=await fetch(`${env.SUPABASE_URL}/rest/v1/sites?domain=eq.${h}&live=eq.true&select=data,variant&limit=1`,{headers:{apikey:env.SUPABASE_ANON,Authorization:'Bearer '+env.SUPABASE_ANON},cf:{cacheTtl:30,cacheEverything:true}});
const [s]=await r.json();if(!s)return new Response('<h1>Site not found</h1>',{status:404,headers:{'content-type':'text/html;charset=utf-8'}});
const tpl=isNaN(s.variant)?await (await fetch(origin+'/tpl-'+s.variant+'.html',{cf:{cacheTtl:86400,cacheEverything:true}})).text():'';
return new Response(render(s.data,s.variant,{url:'https://'+h,tpl,origin}),{headers:{'content-type':'text/html;charset=utf-8'}})}}
