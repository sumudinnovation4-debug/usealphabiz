const crypto=require('crypto'),{markPaid}=require('./_fulfil');
module.exports=async(req,res)=>{const raw=await new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>r(b))});
if(crypto.createHmac('sha512',process.env.PAYSTACK_SECRET).update(raw).digest('hex')!==req.headers['x-paystack-signature'])return res.status(401).end();
const e=JSON.parse(raw);if(e.event==='charge.success'){const d=e.data,site=(d.metadata||{}).site;if(site&&((d.currency==='USD'&&d.amount>=2999)||(d.currency==='NGN'&&d.amount>=2777700)))await markPaid(site,d.reference,d.amount/100,d.currency)}res.status(200).end()};
module.exports.config={api:{bodyParser:false}};
