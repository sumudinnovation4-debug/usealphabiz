-- UseAlphaBiz business systems (Restaurant, Online store, School, Bookings).
-- Run ONCE in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run again. Requires supabase.sql to have been run first (it creates the sites table).
--
-- Design: one shared set of tables for every client site. Every row carries the site_id it belongs to.
--  * Owners (the person who owns the site) can read and change ONLY their own site's rows.
--  * The public (customers on the published site) can only READ the menu/products/settings of live sites,
--    and can only WRITE through the functions below, which check everything on the server
--    (prices are recomputed here, never trusted from the browser).

create table if not exists b_settings(site_id uuid primary key references sites(id) on delete cascade, s jsonb not null default '{}');

create table if not exists b_items(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  kind text not null default 'product' check (kind in ('product','service')),
  category text not null default '' check (length(category)<=60),
  name text not null check (length(name) between 1 and 120),
  descr text not null default '' check (length(descr)<=600),
  price numeric(12,2) check (price is null or price>=0),
  stock int check (stock is null or stock>=0),
  image text not null default '' check (length(image)<=200000),
  active boolean not null default true,
  sort int not null default 0,
  minutes int not null default 60 check (minutes between 5 and 600),
  created timestamptz not null default now());
create index if not exists b_items_site on b_items(site_id);

create table if not exists b_orders(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  ref text not null,
  name text not null, phone text not null, email text not null default '',
  mode text not null check (mode in ('delivery','pickup','dinein')),
  address text not null default '', note text not null default '',
  items jsonb not null,
  subtotal numeric(12,2) not null, delivery_fee numeric(12,2) not null default 0, total numeric(12,2) not null,
  pay_method text not null check (pay_method in ('transfer','cash','whatsapp')),
  pay_status text not null default 'pending' check (pay_status in ('pending','paid')),
  status text not null default 'new' check (status in ('new','confirmed','preparing','ready','out','done','cancelled')),
  created timestamptz not null default now(),
  unique(site_id,ref));
create index if not exists b_orders_site on b_orders(site_id,created desc);

create table if not exists b_bookings(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  ref text not null,
  item_id uuid references b_items(id) on delete set null,
  service text not null default '',
  day date not null, slot text not null,
  name text not null, phone text not null, email text not null default '', note text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','done','cancelled','no_show')),
  created timestamptz not null default now(),
  unique(site_id,ref));
create index if not exists b_bookings_site on b_bookings(site_id,day,slot);

create table if not exists b_forms(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  kind text not null check (kind in ('enquiry','admission')),
  name text not null, phone text not null default '', email text not null default '', message text not null default '',
  data jsonb not null default '{}',
  status text not null default 'new' check (status in ('new','contacted','accepted','closed')),
  created timestamptz not null default now());
create index if not exists b_forms_site on b_forms(site_id,created desc);

-- helpers (security definer so they work for customers who cannot read the sites table directly)
create or replace function b_owner(sid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from sites where id=sid and user_id=auth.uid()) $$;
create or replace function b_live(sid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from sites where id=sid and live) $$;

alter table b_settings enable row level security; alter table b_items enable row level security;
alter table b_orders enable row level security; alter table b_bookings enable row level security; alter table b_forms enable row level security;

drop policy if exists own on b_settings; create policy own on b_settings for all using(b_owner(site_id)) with check(b_owner(site_id));
drop policy if exists pub on b_settings; create policy pub on b_settings for select using(b_live(site_id));
drop policy if exists own on b_items; create policy own on b_items for all using(b_owner(site_id)) with check(b_owner(site_id));
drop policy if exists pub on b_items; create policy pub on b_items for select using(active and b_live(site_id));
drop policy if exists own on b_orders; create policy own on b_orders for all using(b_owner(site_id)) with check(b_owner(site_id));
drop policy if exists own on b_bookings; create policy own on b_bookings for all using(b_owner(site_id)) with check(b_owner(site_id));
drop policy if exists own on b_forms; create policy own on b_forms for all using(b_owner(site_id)) with check(b_owner(site_id));

revoke all on b_settings,b_items,b_orders,b_bookings,b_forms from anon;
grant select on b_settings,b_items to anon;
grant select,insert,update,delete on b_settings,b_items,b_orders,b_bookings,b_forms to authenticated;

-- stop one site from filling the database
create or replace function b_cap() returns trigger language plpgsql as $$
begin
  if tg_table_name='b_items' and (select count(*) from b_items where site_id=new.site_id)>=1000 then raise exception 'Item limit reached (1000)'; end if;
  return new;
end $$;
drop trigger if exists cap on b_items; create trigger cap before insert on b_items for each row execute function b_cap();

-- ---------- customer-facing functions (the only way the public can write) ----------
create or replace function b_ref(pfx text) returns text language sql volatile as
$$ select pfx||upper(substr(md5(random()::text||clock_timestamp()::text),1,6)) $$;

create or replace function b_phone(p text) returns text language sql immutable as
$$ select regexp_replace(coalesce(p,''),'[^0-9+]','','g') $$;

create or replace function place_order(sid uuid,p_name text,p_phone text,p_email text,p_mode text,p_address text,p_note text,p_pay text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare st jsonb; fee numeric:=0; sub numeric:=0; it record; r text; tot numeric; lines jsonb:='[]'; cnt int; itm b_items; tries int:=0;
begin
  if not b_live(sid) then raise exception 'This shop is not available right now'; end if;
  p_name:=btrim(coalesce(p_name,'')); p_phone:=b_phone(p_phone); p_email:=left(btrim(coalesce(p_email,'')),120);
  if length(p_name)<2 or length(p_name)>80 then raise exception 'Please enter your name'; end if;
  if length(p_phone)<7 or length(p_phone)>16 then raise exception 'Please enter a valid phone number'; end if;
  if p_mode is null or p_mode not in ('delivery','pickup','dinein') then raise exception 'Choose delivery, pickup or dine-in'; end if;
  if p_pay is null or p_pay not in ('transfer','cash','whatsapp') then raise exception 'Choose how you will pay'; end if;
  if p_mode='delivery' and length(btrim(coalesce(p_address,'')))<5 then raise exception 'Please enter your delivery address'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>60 then raise exception 'Your cart is empty'; end if;
  select s into st from b_settings where site_id=sid; st:=coalesce(st,'{}'::jsonb);
  if st->>'orders_open'='false' then raise exception 'We are not taking orders right now'; end if;
  select count(*) into cnt from b_orders where site_id=sid and phone=p_phone and created>now()-interval '1 hour';
  if cnt>=5 then raise exception 'Too many orders from this number. Please call us.'; end if;
  for it in select id, sum(q)::int as qty from (select (e->>'id')::uuid as id, least(greatest(coalesce((e->>'qty')::int,1),1),50) as q from jsonb_array_elements(p_items) e) x group by id loop
    select * into itm from b_items where id=it.id and site_id=sid and active and kind='product' for update;
    if not found then raise exception 'An item in your cart is no longer available. Please refresh.'; end if;
    if itm.price is null then raise exception '% has no online price. Please message us.',itm.name; end if;
    if itm.stock is not null then
      if itm.stock<it.qty then raise exception 'Only % left of %',itm.stock,itm.name; end if;
      update b_items set stock=stock-it.qty where id=itm.id;
    end if;
    sub:=sub+itm.price*it.qty;
    lines:=lines||jsonb_build_array(jsonb_build_object('id',itm.id,'name',itm.name,'price',itm.price,'qty',it.qty));
  end loop;
  if p_mode='delivery' then fee:=coalesce(nullif(st->>'delivery_fee','')::numeric,0); end if;
  tot:=sub+fee;
  loop
    r:=b_ref('AB'); tries:=tries+1;
    begin
      insert into b_orders(site_id,ref,name,phone,email,mode,address,note,items,subtotal,delivery_fee,total,pay_method)
      values(sid,r,p_name,p_phone,p_email,p_mode,left(btrim(coalesce(p_address,'')),300),left(btrim(coalesce(p_note,'')),500),lines,sub,fee,tot,p_pay);
      exit;
    exception when unique_violation then if tries>5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('ref',r,'subtotal',sub,'fee',fee,'total',tot);
end $$;

create or replace function b_slots(st jsonb) returns text[] language plpgsql immutable as $$
declare o int; c int; step int; res text[]:='{}'; m int;
begin
  o:=split_part(coalesce(st->>'open','09:00'),':',1)::int*60+split_part(coalesce(st->>'open','09:00'),':',2)::int;
  c:=split_part(coalesce(st->>'close','17:00'),':',1)::int*60+split_part(coalesce(st->>'close','17:00'),':',2)::int;
  step:=greatest(coalesce(nullif(st->>'slot_minutes','')::int,60),15);
  m:=o; while m+step<=c loop res:=res||to_char(make_time(m/60,m%60,0),'HH24:MI'); m:=m+step; end loop;
  return res;
end $$;

create or replace function b_open_day(st jsonb,d date) returns boolean language sql immutable as $$
  select coalesce(st->'days' @> to_jsonb(extract(isodow from d)::int), extract(isodow from d)::int between 1 and 6)
$$;

create or replace function booking_slots(sid uuid,p_day date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare st jsonb; cap int; all_s text[]; full_s text[]; today date:=(now() at time zone 'Africa/Lagos')::date; nowm int:=extract(hour from (now() at time zone 'Africa/Lagos'))::int*60+extract(minute from (now() at time zone 'Africa/Lagos'))::int;
begin
  if not b_live(sid) then return jsonb_build_object('slots','[]'::jsonb,'full','[]'::jsonb); end if;
  select s into st from b_settings where site_id=sid; st:=coalesce(st,'{}'::jsonb);
  cap:=greatest(coalesce(nullif(st->>'capacity','')::int,1),1);
  if p_day<today or p_day>today+90 or not b_open_day(st,p_day) then return jsonb_build_object('slots','[]'::jsonb,'full','[]'::jsonb); end if;
  all_s:=b_slots(st);
  if p_day=today then select coalesce(array_agg(x),'{}') into all_s from unnest(all_s) x where split_part(x,':',1)::int*60+split_part(x,':',2)::int>nowm+30; end if;
  select coalesce(array_agg(slot),'{}') into full_s from (select slot from b_bookings where site_id=sid and day=p_day and status in('pending','confirmed') group by slot having count(*)>=cap) z;
  return jsonb_build_object('slots',to_jsonb(all_s),'full',to_jsonb(full_s));
end $$;

create or replace function book_slot(sid uuid,p_item uuid,p_day date,p_slot text,p_name text,p_phone text,p_email text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare st jsonb; cap int; avail jsonb; r text; svc text:=''; cnt int; tries int:=0;
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
  if p_item is not null then select name into svc from b_items where id=p_item and site_id=sid and kind='service' and active; if not found then p_item:=null; svc:=''; end if; end if;
  loop
    r:=b_ref('BK'); tries:=tries+1;
    begin
      insert into b_bookings(site_id,ref,item_id,service,day,slot,name,phone,email,note)
      values(sid,r,p_item,svc,p_day,p_slot,p_name,p_phone,left(btrim(coalesce(p_email,'')),120),left(btrim(coalesce(p_note,'')),500));
      exit;
    exception when unique_violation then if tries>5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('ref',r,'day',p_day,'slot',p_slot,'service',svc);
end $$;

create or replace function submit_form(sid uuid,p_kind text,p_name text,p_phone text,p_email text,p_message text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cnt int; fid uuid;
begin
  if not b_live(sid) then raise exception 'This form is not available right now'; end if;
  if p_kind is null or p_kind not in ('enquiry','admission') then raise exception 'Invalid form'; end if;
  p_name:=btrim(coalesce(p_name,'')); p_phone:=b_phone(p_phone); p_email:=left(btrim(coalesce(p_email,'')),120);
  if length(p_name)<2 or length(p_name)>80 then raise exception 'Please enter your name'; end if;
  if length(p_phone)<7 and length(p_email)<5 then raise exception 'Please enter a phone number or email so we can reply'; end if;
  p_data:=coalesce(p_data,'{}'::jsonb);
  if jsonb_typeof(p_data)<>'object' or length(p_data::text)>6000 then raise exception 'Form is too long'; end if;
  select count(*) into cnt from b_forms where site_id=sid and created>now()-interval '1 hour' and ((p_phone<>'' and phone=p_phone) or (p_email<>'' and email=p_email));
  if cnt>=5 then raise exception 'Too many messages from you. We will reply soon.'; end if;
  insert into b_forms(site_id,kind,name,phone,email,message,data) values(sid,p_kind,p_name,p_phone,p_email,left(btrim(coalesce(p_message,'')),2000),p_data) returning id into fid;
  return jsonb_build_object('ref',upper(left(fid::text,8)));
end $$;

create or replace function track_order(sid uuid,p_ref text,p_phone text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare o b_orders;
begin
  select * into o from b_orders where site_id=sid and ref=upper(btrim(coalesce(p_ref,''))) and right(regexp_replace(phone,'\D','','g'),9)=right(regexp_replace(coalesce(p_phone,''),'\D','','g'),9);
  if not found then raise exception 'Order not found. Check the order number and phone number.'; end if;
  return jsonb_build_object('ref',o.ref,'status',o.status,'pay_status',o.pay_status,'total',o.total,'created',o.created,'items',o.items);
end $$;

revoke all on function place_order(uuid,text,text,text,text,text,text,text,jsonb),booking_slots(uuid,date),book_slot(uuid,uuid,date,text,text,text,text,text),submit_form(uuid,text,text,text,text,text,jsonb),track_order(uuid,text,text) from public;
grant execute on function place_order(uuid,text,text,text,text,text,text,text,jsonb),booking_slots(uuid,date),book_slot(uuid,uuid,date,text,text,text,text,text),submit_form(uuid,text,text,text,text,text,jsonb),track_order(uuid,text,text) to anon,authenticated;

-- Owner cancels an order: put the stock back, atomically (the website calls this from the Orders page).
create or replace function cancel_order(oid uuid) returns void language plpgsql security definer set search_path=public as $$
declare o b_orders; e jsonb;
begin
  select * into o from b_orders where id=oid for update;
  if not found or not b_owner(o.site_id) then raise exception 'Not allowed'; end if;
  if o.status='cancelled' then return; end if;
  for e in select * from jsonb_array_elements(o.items) loop
    update b_items set stock=stock+(e->>'qty')::int where id=(e->>'id')::uuid and site_id=o.site_id and stock is not null;
  end loop;
  update b_orders set status='cancelled' where id=oid;
end $$;
revoke all on function cancel_order(uuid) from public;
grant execute on function cancel_order(uuid) to authenticated;
