const {sb,fulfil}=require('./_fulfil');
module.exports=async(req,res)=>{const u=await(await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON,Authorization:(req.headers.authorization||'Bearer ')}})).json();
if(!u.email||!(process.env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).includes(u.email.toLowerCase()))return res.status(403).json({error:'forbidden'});
const {action:a,id}=req.query;
if(a==='retry'&&(await sb(`payments?site_id=eq.${id}&select=ref`)).length){await sb(`sites?id=eq.${id}&status=eq.failed`,'PATCH',{status:'paid'});await fulfil(id)}
if(a==='suspend')await sb(`sites?id=eq.${id}`,'PATCH',{live:false,status:'suspended'});
if(a==='unsuspend')await sb(`sites?id=eq.${id}`,'PATCH',{live:true,status:'live'});
if(a==='delete')await sb(`sites?id=eq.${id}`,'DELETE');
res.json({sites:await sb('sites?select=id,domain,category,status,live,note,created,name:data->>name&order=created.desc&limit=200'),pay:await sb('payments?select=amount,currency')})};
