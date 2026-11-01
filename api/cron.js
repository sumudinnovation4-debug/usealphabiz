const {sb,fulfil}=require('./_fulfil');
module.exports=async(req,res)=>{if(req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return res.status(401).end();
await sb(`sites?status=eq.working&updated=lt.${new Date(Date.now()-6e5).toISOString()}`,'PATCH',{status:'paid'});
const l=await sb('sites?status=in.(paid,registering)&select=id');for(const s of l)await fulfil(s.id);res.json({n:l.length})};
