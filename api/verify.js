const {markPaid}=require('./_fulfil');
module.exports=async(req,res)=>{const ref=req.query.ref;const p=await(await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET}})).json();
if(!p.data||p.data.status!=='success'||!((p.data.currency==='USD'&&p.data.amount>=2999)||(p.data.currency==='NGN'&&p.data.amount>=2699900)))return res.status(402).json({ok:false});
await markPaid((p.data.metadata||{}).site,ref,p.data.amount/100,p.data.currency);res.json({ok:true})};
