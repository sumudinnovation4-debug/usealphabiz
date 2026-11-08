// Backup: each business can set its Paystack webhook to  https://YOURDOMAIN/api/bz-webhook?site=SITE_ID
// so payments are marked paid even if the customer closes the page. Signature is checked with that business's secret key.
const crypto=require('crypto'),{settle,secret,UUID}=require('./_bz');
module.exports=async(req,res)=>{const raw=await new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>r(b))});
 try{const site=String((req.query&&req.query.site)||new URL(req.url,'http://x').searchParams.get('site')||'');if(!UUID.test(site))return res.status(400).end();
  const sk=await secret(site);if(!sk)return res.status(404).end();
  const sig=crypto.createHmac('sha512',sk).update(raw).digest('hex'),h=String(req.headers['x-paystack-signature']||'');
  if(sig.length!==h.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(h)))return res.status(401).end();
  const e=JSON.parse(raw);if(e.event==='charge.success'){const d=e.data||{},m=d.metadata||{};if(m.bz_site===site)await settle(site,String(m.bz_kind),String(m.bz_ref),String(d.reference),d)}
  res.status(200).end()}catch(e){res.status(500).end()}};
module.exports.config={api:{bodyParser:false}};
