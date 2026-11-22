-- Run this once in Supabase: SQL Editor -> paste -> Run. (Free subdomains)
alter table sites add column if not exists sub text;
create unique index if not exists one_sub on sites(lower(sub)) where sub is not null;
-- Nothing else is needed: the existing policies already let the public see live sites,
-- and only the server (service key) can write the sub column or the live flag.
