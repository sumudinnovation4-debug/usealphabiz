// Called by the customer's browser right after Paystack says "success". We do not trust the browser:
// we ask Paystack (with the business's own secret key) whether the money really arrived.
const {settle}=require('./_bz');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
 try{const r=await settle(String(b.site||''),String(b.kind||''),String(b.ref||''),String(b.reference||''));res.status(r.code).json(r.ok?{ok:true}:{ok:false,error:r.error})}
 catch(e){res.status(500).json({ok:false,error:'Could not verify right now. Your payment is safe; the business will confirm it.'})}};
