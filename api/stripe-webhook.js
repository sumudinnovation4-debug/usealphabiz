const crypto=require('crypto'),{markPaid}=require('./_fulfil');
module.exports=async(req,res)=>{const raw=await new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>r(b))});
const g=Object.fromEntries((req.headers['stripe-signature']||'').split(',').map(x=>x.split('=')));
if(crypto.createHmac('sha256',process.env.STRIPE_WHSEC).update(g.t+'.'+raw).digest('hex')!==g.v1)return res.status(401).end();
const e=JSON.parse(raw),o=e.data.object;if(e.type==='checkout.session.completed'&&o.payment_status==='paid'&&o.amount_total>=2999)await markPaid((o.metadata||{}).site,o.id,o.amount_total/100,'USD');res.status(200).end()};
module.exports.config={api:{bodyParser:false}};
