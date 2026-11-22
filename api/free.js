// Free subdomains: yourname.usealphabiz.com
// GET  /api/free?name=gcchurch            -> {ok:true} or {ok:false,why:'...'}   (no login needed)
// POST /api/free {id,sub} + Bearer token  -> claims the subdomain for the logged-in user's site and makes it live
const U=process.env.SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY,A=process.env.SUPABASE_ANON||K,BASE=(process.env.BASE_DOMAIN||'usealphabiz.com').toLowerCase(),MAX=+process.env.FREE_SITES_PER_USER||3;
const RES=new Set(('www app api admin mail email smtp imap pop ftp ns ns1 ns2 dns cdn static assets img images media files dashboard login logout signup register account accounts billing pay payment payments checkout support help docs status blog news about contact legal terms privacy shop store test demo dev staging beta root system sites site web home usealphabiz alphabiz alphastack cloudflare supabase vercel paystack stripe google facebook whatsapp instagram security abuse postmaster webmaster hostmaster noc').split(' '));
const sb=(p,m,b)=>fetch(U+'/rest/v1/'+p,{method:m||'GET',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=representation'},body:b&&JSON.stringify(b)}).then(async r=>({st:r.status,j:await r.json().catch(()=>null)}));
function check(n){n=String(n||'').toLowerCase().trim();
 if(n.length<3||n.length>30||!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(n)||n.includes('--'))return{err:'Use 3 to 30 letters, numbers or single hyphens. It cannot start or end with a hyphen.'};
 if(RES.has(n)||/^(xn|www|mail|admin|support)/.test(n))return{err:'That name is reserved. Try another one.'};return{n}}
module.exports=async(req,res)=>{
 if(!U||!K)return res.status(501).json({error:'Free subdomains are not set up yet.'});
 if(req.method==='GET'){const c=check(req.query.name);if(c.err)return res.json({ok:false,why:c.err});
  const r=await sb('sites?or=(sub.eq.'+c.n+',domain.eq.'+c.n+'.'+BASE+')&select=id&limit=1');
  if(!Array.isArray(r.j))return res.status(502).json({error:'Could not check right now.'});
  return res.json({ok:!r.j.length,why:r.j.length?'That name is taken.':'',host:c.n+'.'+BASE})}
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const tok=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!tok)return res.status(401).json({error:'Please log in first.'});
 const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),c=check(body.sub),id=String(body.id||'');
 if(c.err)return res.status(400).json({error:c.err});if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Bad site id.'});
 let u;try{u=await fetch(U+'/auth/v1/user',{headers:{apikey:A,Authorization:'Bearer '+tok}}).then(r=>r.ok?r.json():null)}catch{u=null}
 if(!u||!u.id)return res.status(401).json({error:'Please log in again.'});
 const mine=await sb('sites?id=eq.'+id+'&user_id=eq.'+u.id+'&select=id,sub');
 if(!Array.isArray(mine.j)||!mine.j.length)return res.status(404).json({error:'Save your site first, then publish.'});
 if(!mine.j[0].sub){const n=await sb('sites?user_id=eq.'+u.id+'&sub=not.is.null&select=id');if(Array.isArray(n.j)&&n.j.length>=MAX)return res.status(403).json({error:'You can have up to '+MAX+' free sites. Upgrade a site or release one first.'})}
 const r=await sb('sites?id=eq.'+id,'PATCH',{sub:c.n,live:true,updated:new Date().toISOString()});
 if(r.st===409||(r.j&&r.j.code==='23505'))return res.status(409).json({error:'That name was just taken. Try another one.'});
 if(!Array.isArray(r.j)||!r.j.length)return res.status(502).json({error:'Could not publish. Please try again.'});
 res.json({ok:true,sub:c.n,host:c.n+'.'+BASE})};
