// Real domain availability check using the Cloudflare Registrar API.
// 501 = Cloudflare not set up yet (the page shows demo mode). 502 = Cloudflare answered with an error.
const MAX_COST=15; // we skip domains whose first-year price (USD) is above this, to protect your margin
module.exports=async(req,res)=>{
if(!process.env.CF_API_TOKEN||!process.env.CF_ACCOUNT_ID)return res.status(501).json({error:'cloudflare not configured'});
const n=(req.query.name||'').toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'').slice(0,60);if(!n)return res.json([]);
let r;try{r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/registrar/domain-check`,{method:'POST',headers:{Authorization:'Bearer '+process.env.CF_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({domains:[n+'.com',n+'.net',n+'.org','get'+n+'.com','my'+n+'.com']})}).then(x=>x.json())}catch(e){return res.status(502).json({error:'could not reach cloudflare'})}
if(!r||!r.success||!r.result)return res.status(502).json({error:((r&&r.errors||[])[0]||{}).message||'cloudflare error'});
res.json((r.result.domains||[]).map(d=>{const cost=parseFloat((d.pricing||{}).registration_cost);
const ok=!!d.registrable&&d.tier!=='premium'&&cost>0&&cost<=MAX_COST;
return{d:d.name,ok,why:ok?'':d.registrable?'price':'taken'}}))};
