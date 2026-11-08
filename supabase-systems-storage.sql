-- Photo uploads for menu items and products. Run ONCE in the Supabase SQL Editor, after supabase-systems.sql.
-- Each owner can only upload into the folder named after their own site id.
insert into storage.buckets(id,name,public) values('biz','biz',true) on conflict (id) do nothing;
drop policy if exists "biz read" on storage.objects;
create policy "biz read" on storage.objects for select using (bucket_id='biz');
drop policy if exists "biz owner insert" on storage.objects;
create policy "biz owner insert" on storage.objects for insert to authenticated with check (bucket_id='biz' and b_owner(((storage.foldername(name))[1])::uuid));
drop policy if exists "biz owner update" on storage.objects;
create policy "biz owner update" on storage.objects for update to authenticated using (bucket_id='biz' and b_owner(((storage.foldername(name))[1])::uuid));
drop policy if exists "biz owner delete" on storage.objects;
create policy "biz owner delete" on storage.objects for delete to authenticated using (bucket_id='biz' and b_owner(((storage.foldername(name))[1])::uuid));
