-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- (Only needed if you already ran supabase.sql before. It adds the extra-admins table.)
create table if not exists admins(email text primary key,created timestamptz default now());
alter table admins enable row level security;
