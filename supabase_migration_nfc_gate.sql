-- ReviewRadar — NFC tap gate (subscription dates + tap log)
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1. New columns on businesses ------------------------------------------
alter table businesses add column if not exists slug              text;
alter table businesses add column if not exists google_place_id   text;  -- real Google Place ID (starts with ChIJ...)
alter table businesses add column if not exists access_starts_at  timestamptz;
alter table businesses add column if not exists access_ends_at    timestamptz;

-- Short unique slug used in the NFC link, e.g. .../tap?b=cafe-coco-x7k2
create or replace function rr_make_slug(biz_name text) returns text
language plpgsql as $$
declare base text; candidate text;
begin
  base := lower(regexp_replace(coalesce(biz_name,'biz'), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from left(base, 30));
  if base = '' then base := 'biz'; end if;
  loop
    candidate := base || '-' || substr(md5(random()::text), 1, 4);
    exit when not exists (select 1 from businesses where slug = candidate);
  end loop;
  return candidate;
end $$;

create or replace function rr_businesses_before_write() returns trigger
language plpgsql as $$
begin
  if new.slug is null then new.slug := rr_make_slug(new.name); end if;

  -- Free month starts automatically for every new business.
  if tg_op = 'INSERT' then
    if new.access_starts_at is null then new.access_starts_at := now(); end if;
    if new.access_ends_at   is null then new.access_ends_at   := now() + interval '30 days'; end if;
  end if;

  -- SECURITY: a customer must NOT be able to extend their own access.
  -- RLS lets users update their own rows, so lock these columns unless
  -- the change comes from the SQL editor / service role (you).
  if tg_op = 'UPDATE'
     and coalesce(auth.role(), 'service_role') = 'authenticated' then
    new.slug             := old.slug;
    new.google_place_id  := coalesce(new.google_place_id, old.google_place_id);
    new.access_starts_at := old.access_starts_at;
    new.access_ends_at   := old.access_ends_at;
  end if;
  return new;
end $$;

drop trigger if exists rr_businesses_before_write on businesses;
create trigger rr_businesses_before_write
  before insert or update on businesses
  for each row execute function rr_businesses_before_write();

-- Backfill existing rows (gives them a slug + a fresh 30-day window)
update businesses set slug = rr_make_slug(name) where slug is null;
update businesses set access_starts_at = now(), access_ends_at = now() + interval '30 days'
 where access_starts_at is null;

create unique index if not exists businesses_slug_idx on businesses (slug);

-- 2. Tap log ---------------------------------------------------------------
create table if not exists taps (
  id           bigint generated always as identity primary key,
  business_id  uuid not null references businesses(id) on delete cascade,
  tapped_at    timestamptz not null default now(),
  allowed      boolean not null,
  user_agent   text
);
create index if not exists taps_business_idx on taps (business_id, tapped_at desc);

alter table taps enable row level security;
-- Owners can read taps for their own businesses. Only the edge function
-- (service role, bypasses RLS) can insert.
drop policy if exists "Users can view own taps" on taps;
create policy "Users can view own taps" on taps for select
  using (exists (select 1 from businesses b where b.id = taps.business_id and b.user_id = auth.uid()));

-- 3. YOUR operator tools (run from SQL editor only) -----------------------
-- See everyone: status, dates, tap counts
create or replace view rr_admin_overview as
select b.name, b.slug, b.access_starts_at, b.access_ends_at,
       (b.access_ends_at > now()) as active,
       (select count(*) from taps t where t.business_id = b.id) as total_taps,
       (select count(*) from taps t where t.business_id = b.id and not t.allowed) as blocked_taps
from businesses b order by b.created_at desc;

-- Extend / set a deal:  select rr_set_access('cafe-coco-x7k2', now(), now() + interval '365 days');
create or replace function rr_set_access(p_slug text, p_start timestamptz, p_end timestamptz)
returns void language sql security definer as $$
  update businesses set access_starts_at = p_start, access_ends_at = p_end where slug = p_slug;
$$;
revoke all on function rr_set_access(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on rr_admin_overview from anon, authenticated;
