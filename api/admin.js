const {sb,fulfil}=require('./_fulfil');
// The owner is always an admin and is the only one who can add or remove other admins.
const OWNER='alphastacks341@gmail.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,MAIL=/^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/;
module.exports=async(req,res)=>{
const u=await(await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON,Authorization:(req.headers.authorization||'Bearer ')}})).json();
const em=String(u.email||'').toLowerCase();
// The email must be verified, otherwise anyone could sign up with an admin's address.
if(!em||!(u.email_confirmed_at||u.confirmed_at))return res.status(403).json({error:'forbidden'});
const owner=em===OWNER,envList=(process.env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
let ok=owner||envList.includes(em);
if(!ok){const r=await sb('admins?email=eq.'+encodeURIComponent(em)+'&select=email');ok=Array.isArray(r)&&r.length>0}
if(!ok)return res.status(403).json({error:'forbidden'});
const {action:a,id}=req.query,email=String(req.query.email||'').toLowerCase().trim(),idOk=UUID.test(id||'');
if(owner&&a==='addadmin'&&MAIL.test(email)&&email!==OWNER)await sb('admins','POST',{email});
if(owner&&a==='rmadmin'&&MAIL.test(email))await sb('admins?email=eq.'+encodeURIComponent(email),'DELETE');
if(idOk){
if(a==='retry'&&(await sb(`payments?site_id=eq.${id}&select=ref`)).length){await sb(`sites?id=eq.${id}&status=eq.failed`,'PATCH',{status:'paid'});await fulfil(id)}
if(a==='suspend')await sb(`sites?id=eq.${id}`,'PATCH',{live:false,status:'suspended'});
if(a==='unsuspend')await sb(`sites?id=eq.${id}`,'PATCH',{live:true,status:'live'});
if(a==='delete')await sb(`sites?id=eq.${id}`,'DELETE')}
const admins=owner?await sb('admins?select=email,created&order=created.asc'):[];
res.json({owner,admins:Array.isArray(admins)?admins:[],sites:await sb('sites?select=id,domain,category,status,live,note,created,name:data->>name&order=created.desc&limit=200'),pay:await sb('payments?select=amount,currency')})};
