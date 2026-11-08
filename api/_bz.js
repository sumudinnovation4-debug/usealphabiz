// Shared by bz-pay.js and bz-webhook.js: verify a customer's Paystack payment for a business site and mark it paid.
const U=process.env.SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY;
const PSK=process.env.PAYSTACK_BASE||'https://api.paystack.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,REF=/^[A-Za-z0-9]{4,20}$/,PREF=/^[A-Za-z0-9_.=-]{6,80}$/;
const sb=(p,m='GET',b)=>fetch(U+'/rest/v1/'+p,{method:m,headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=representation'},body:b&&JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>null);if(!r.ok)throw new Error('db '+r.status);return j});
async function secret(site){const r=await sb(`b_secrets?site_id=eq.${site}&select=paystack_sk`);return r[0]&&r[0].paystack_sk}
// Finds the order/booking, checks the Paystack transaction really succeeded for the right amount, then marks it paid.
async function settle(site,kind,ref,reference,tx){
  if(!UUID.test(site)||!REF.test(ref)||!PREF.test(reference)||!['order','booking'].includes(kind))return {code:400,error:'Bad request'};
  const table=kind=='order'?'b_orders':'b_bookings',due=kind=='order'?'total':'amount_due';
  const rows=await sb(`${table}?site_id=eq.${site}&ref=eq.${ref}&select=id,${due},pay_status`);const row=rows[0];
  if(!row)return {code:404,error:'Not found'};
  if(row.pay_status=='paid')return {code:200,ok:true,already:true};
  if(!tx){const sk=await secret(site);if(!sk)return {code:409,error:'Paystack is not connected for this business'};
    const r=await fetch(PSK+'/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+sk}});const j=await r.json().catch(()=>({}));tx=j&&j.data}
  const md=(tx&&tx.metadata)||{};
  if(!tx||tx.status!=='success'||tx.currency!=='NGN'||tx.reference!==reference)return {code:402,error:'Payment not completed'};
  if(md.bz_site!==site||md.bz_ref!==ref||md.bz_kind!==kind)return {code:402,error:'Payment does not match this order'};
  if(!(+row[due]>0)||tx.amount<Math.round(+row[due]*100))return {code:402,error:'Amount paid is less than the amount due'};
  try{await sb(`${table}?id=eq.${row.id}&pay_status=neq.paid`,'PATCH',{pay_status:'paid',paid_ref:reference})}catch(e){return {code:409,error:'This payment was already used'}}
  return {code:200,ok:true}}
module.exports={sb,secret,settle,UUID};
