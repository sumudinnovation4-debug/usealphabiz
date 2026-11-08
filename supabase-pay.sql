-- UseAlphaBiz: Paystack for business systems. Run AFTER supabase-systems.sql. Safe to run again.
-- Each business connects ITS OWN Paystack account (money goes straight to them).
-- The secret key is stored write-only: nobody can read it from the browser, only the server (api/bz-pay.js) uses it.

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='b_orders'::regclass and contype='c' and pg_get_constraintdef(oid) like '%pay_method%';
  if c is not null then execute 'alter table b_orders drop constraint '||quote_ident(c); end if;
  alter table b_orders add constraint b_orders_pay_method_check check (pay_method in ('transfer','cash','whatsapp','card'));
end $$;
alter table b_orders add column if not exists paid_ref text;
alter table b_bookings add column if not exists pay_status text not null default 'none';
alter table b_bookings add column if not exists amount_due numeric(12,2) not null default 0;
alter table b_bookings add column if not exists paid_ref text;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='b_bookings_pay_status_check') then
    alter table b_bookings add constraint b_bookings_pay_status_check check (pay_status in ('none','pending','paid'));
  end if;
end $$;
create unique index if not exists b_orders_paid_ref on b_orders(paid_ref) where paid_ref is not null;
create unique index if not exists b_bookings_paid_ref on b_bookings(paid_ref) where paid_ref is not null;

create table if not exists b_secrets(site_id uuid primary key references sites(id) on delete cascade, paystack_sk text not null);
alter table b_secrets enable row level security;
revoke all on b_secrets from anon, authenticated;   -- no policies: only the service role (server) can read it

create or replace function set_paystack(sid uuid,p_pk text,p_sk text) returns void language plpgsql security definer set search_path=public as $$
declare st jsonb;
begin
  if not b_owner(sid) then raise exception 'Not allowed'; end if;
  p_pk:=btrim(coalesce(p_pk,'')); p_sk:=btrim(coalesce(p_sk,''));
  select s into st from b_settings where site_id=sid; st:=coalesce(st,'{}'::jsonb);
  if p_pk='' and p_sk='' then
    delete from b_secrets where site_id=sid;
    st:=st-'paystack_pk';
  else
    if p_pk !~ '^pk_(live|test)_[A-Za-z0-9]{10,100}$' then raise exception 'That does not look like a Paystack public key (starts with pk_)'; end if;
    if p_sk !~ '^sk_(live|test)_[A-Za-z0-9]{10,100}$' then raise exception 'That does not look like a Paystack secret key (starts with sk_)'; end if;
    if substr(p_pk,4,4)<>substr(p_sk,4,4) then raise exception 'The public and secret key must both be live or both be test keys'; end if;
    insert into b_secrets(site_id,paystack_sk) values(sid,p_sk) on conflict(site_id) do update set paystack_sk=excluded.paystack_sk;
    st:=st||jsonb_build_object('paystack_pk',p_pk);
  end if;
  insert into b_settings(site_id,s) values(sid,st) on conflict(site_id) do update set s=excluded.s;
end $$;
revoke all on function set_paystack(uuid,text,text) from public;
grant execute on function set_paystack(uuid,text,text) to authenticated;

-- place_order: same as before, plus pay method 'card' (only when the shop has connected Paystack).
do $$ declare src text; begin
  select pg_get_functiondef('place_order(uuid,text,text,text,text,text,text,text,jsonb)'::regprocedure) into src;
  if src not like '%''card''%' then
    src:=replace(src,'p_pay not in (''transfer'',''cash'',''whatsapp'')','p_pay not in (''transfer'',''cash'',''whatsapp'',''card'')');
    src:=replace(src,'  select s into st from b_settings where site_id=sid; st:=coalesce(st,''{}''::jsonb);','  select s into st from b_settings where site_id=sid; st:=coalesce(st,''{}''::jsonb);'||E'\n'||'  if p_pay=''card'' and coalesce(st->>''paystack_pk'','''')='''' then raise exception ''Online payment is not available. Choose another way to pay.''; end if;');
    execute src;
  end if;
end $$;

-- book_slot: compute what is owed (full price or deposit) when the business takes online payment for bookings.
create or replace function book_slot(sid uuid,p_item uuid,p_day date,p_slot text,p_name text,p_phone text,p_email text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare st jsonb; avail jsonb; r text; svc text:=''; v_price numeric; cnt int; tries int:=0; due numeric:=0; mode text; dep numeric;
begin
  if not b_live(sid) then raise exception 'Bookings are not available right now'; end if;
  p_name:=btrim(coalesce(p_name,'')); p_phone:=b_phone(p_phone);
  if length(p_name)<2 or length(p_name)>80 then raise exception 'Please enter your name'; end if;
  if length(p_phone)<7 or length(p_phone)>16 then raise exception 'Please enter a valid phone number'; end if;
  perform pg_advisory_xact_lock(hashtextextended(sid::text||p_day::text,0));
  avail:=booking_slots(sid,p_day);
  if not (avail->'slots') ? p_slot then raise exception 'That time is not available. Please pick another.'; end if;
  if (avail->'full') ? p_slot then raise exception 'That time was just taken. Please pick another.'; end if;
  select count(*) into cnt from b_bookings where site_id=sid and phone=p_phone and created>now()-interval '1 hour';
  if cnt>=5 then raise exception 'Too many bookings from this number. Please call us.'; end if;
  if p_item is not null then select name,b_items.price into svc,v_price from b_items where id=p_item and site_id=sid and kind='service' and active; if not found then p_item:=null; svc:=''; v_price:=null; end if; end if;
  select s into st from b_settings where site_id=sid; st:=coalesce(st,'{}'::jsonb);
  mode:=coalesce(st->>'book_pay','off');
  if coalesce(st->>'paystack_pk','')<>'' and mode in ('full','deposit') then
    if mode='full' then due:=coalesce(v_price,0);
    else dep:=coalesce(nullif(st->>'book_deposit','')::numeric,0); due:=case when v_price is null then dep else least(dep,v_price) end; end if;
    if due<0 then due:=0; end if;
  end if;
  loop
    r:=b_ref('BK'); tries:=tries+1;
    begin
      insert into b_bookings(site_id,ref,item_id,service,day,slot,name,phone,email,note,amount_due,pay_status)
      values(sid,r,p_item,svc,p_day,p_slot,p_name,p_phone,left(btrim(coalesce(p_email,'')),120),left(btrim(coalesce(p_note,'')),500),due,case when due>0 then 'pending' else 'none' end);
      exit;
    exception when unique_violation then if tries>5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('ref',r,'day',p_day,'slot',p_slot,'service',svc,'amount_due',due);
end $$;
revoke all on function book_slot(uuid,uuid,date,text,text,text,text,text) from public;
grant execute on function book_slot(uuid,uuid,date,text,text,text,text,text) to anon,authenticated;
