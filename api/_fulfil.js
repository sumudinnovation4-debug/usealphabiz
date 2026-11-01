const U=process.env.SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY,A=process.env.CF_ACCOUNT_ID,W=process.env.CF_WORKER_NAME||'alphabiz-sites',now=()=>new Date().toISOString();
const sb=(p,m='GET',b)=>fetch(U+'/rest/v1/'+p,{method:m,headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=representation'},body:b&&JSON.stringify(b)}).then(r=>r.json().catch(()=>[]));
const cf=(p,m='GET',b)=>fetch('https://api.cloudflare.com/client/v4'+p,{method:m,headers:{Authorization:'Bearer '+process.env.CF_API_TOKEN,'Content-Type':'application/json'},body:b&&JSON.stringify(b)}).then(async r=>({st:r.status,...(await r.json().catch(()=>({})))}));
const zone=async d=>((await cf('/zones?name='+d)).result||[])[0];
async function fulfil(id){const cur=(await sb(`sites?id=eq.${id}&select=status`))[0];if(!cur)return;
 const c=await sb(`sites?id=eq.${id}&status=in.(paid,registering)`,'PATCH',{status:'working',updated:now()}),s=c[0];if(!s)return;
 const set=(status,note)=>sb(`sites?id=eq.${id}`,'PATCH',{status,note:note||'',live:status==='live',updated:now()});
 try{let z=await zone(s.domain);
  if(!z&&cur.status==='paid'){const ck=await cf(`/accounts/${A}/registrar/domain-check`,'POST',{domains:[s.domain]}),d=((ck.result||{}).domains||[])[0];
   if(!d||!d.registrable)return set('failed','Domain not available: '+((d&&d.reason)||'unknown'));
   const r=await cf(`/accounts/${A}/registrar/registrations`,'POST',{domain_name:s.domain});
   if(r.st>=300)return set('failed','Registration error '+r.st+' '+JSON.stringify(r.errors||[]));
   z=await zone(s.domain);if(!z)z=(await cf('/zones','POST',{account:{id:A},name:s.domain,type:'full'})).result}
  if(!z)return set('registering','Waiting for the registry');
  for(const h of [s.domain,'www.'+s.domain]){const r=await cf(`/accounts/${A}/workers/domains`,'PUT',{hostname:h,service:W,environment:'production',zone_id:z.id,zone_name:z.name});if(!r.success)return set('failed','Attach error '+JSON.stringify(r.errors||[]))}
  return set('live')}catch(e){return set('registering','Retrying: '+e.message)}}
async function markPaid(id,ref,amount,currency){if(!id)return;await sb('payments','POST',{ref,site_id:id,amount,currency,status:'paid'});
 const r=await sb(`sites?id=eq.${id}&status=in.(draft,failed)`,'PATCH',{status:'paid',updated:now()});
 if(!Array.isArray(r))await sb(`sites?id=eq.${id}`,'PATCH',{status:'failed',note:'Domain taken by another customer. Refund needed.'});return fulfil(id)}
module.exports={sb,cf,fulfil,markPaid};
