-- ============================================================================
-- ReviewRadar — manual payments + admin access control (NO payment gateway)
-- Flow: customer pays you by UPI/cash → submits the transaction ID in the app →
--       you check your bank/UPI message → press Approve in /admin → NFC access extends.
-- Run once in Supabase → SQL Editor → paste ALL → Run. Safe to re-run.
-- Requires: supabase_setup.sql + supabase_migration_nfc_gate.sql + supabase_reviews_and_demo.sql run before.
-- ============================================================================

do $$ begin
  if to_regproc('rr_make_slug') is null then
    raise exception 'Run supabase_migration_nfc_gate.sql first (it creates the NFC access columns).';
  end if;
end $$;

-- 1. Which plan each business is on --------------------------------------------
alter table businesses add column if not exists plan    text check (plan    in ('starter','basic','max','enterprise'));
alter table businesses add column if not exists billing text check (billing in ('monthly','annual'));

-- Customers must not be able to change their own access dates or plan.
-- (Admin functions below run as the table owner, so `current_user` is NOT 'authenticated' for them.)
create or replace function rr_businesses_before_write() returns trigger
language plpgsql as $$
declare is_customer boolean := coalesce(auth.role(), 'service_role') = 'authenticated' and current_user = 'authenticated';
begin
  if new.slug is null then new.slug := rr_make_slug(new.name); end if;

  if tg_op = 'INSERT' then
    -- Free month starts automatically for every new business.
    if new.access_starts_at is null then new.access_starts_at := now(); end if;
    if new.access_ends_at   is null then new.access_ends_at   := now() + interval '30 days'; end if;
    if is_customer then new.plan := null; new.billing := null; end if;
  end if;

  if tg_op = 'UPDATE' and is_customer then
    new.slug             := old.slug;
    new.google_place_id  := coalesce(new.google_place_id, old.google_place_id);
    new.access_starts_at := old.access_starts_at;
    new.access_ends_at   := old.access_ends_at;
    new.plan             := old.plan;
    new.billing          := old.billing;
  end if;
  return new;
end $$;

drop trigger if exists rr_businesses_before_write on businesses;
create trigger rr_businesses_before_write
  before insert or update on businesses
  for each row execute function rr_businesses_before_write();

-- 2. Admins (only people listed here can use /admin) ----------------------------
create table if not exists rr_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table rr_admins enable row level security;   -- no policies: nobody can read it directly

create or replace function rr_is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from rr_admins where user_id = auth.uid())
$$;
revoke all on function rr_is_admin() from public, anon;
grant execute on function rr_is_admin() to authenticated;

-- 3. Payment requests (customer says "I paid, here is the transaction ID") ------
create table if not exists payment_requests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  plan         text not null check (plan in ('starter','basic','max','enterprise')),
  billing      text not null check (billing in ('monthly','annual')),
  amount       int  not null check (amount > 0),
  reference    text not null check (char_length(reference) between 6 and 40),
  note         text check (char_length(note) <= 300),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  days_granted int,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
-- One transaction ID can only be used once (rejected ones can be re-submitted).
create unique index if not exists payment_requests_ref_idx on payment_requests (lower(reference)) where status <> 'rejected';
create index if not exists payment_requests_biz_idx on payment_requests (business_id, created_at desc);

alter table payment_requests enable row level security;
drop policy if exists "Users view own payment requests" on payment_requests;
create policy "Users view own payment requests" on payment_requests for select using (user_id = auth.uid());
drop policy if exists "Users create own payment requests" on payment_requests;
create policy "Users create own payment requests" on payment_requests for insert with check (
  user_id = auth.uid() and status = 'pending' and decided_at is null and days_granted is null
  and exists (select 1 from businesses b where b.id = business_id and b.user_id = auth.uid())
);
-- No update/delete policy: only the admin functions below can approve or reject.

-- 4. Admin functions (every one checks rr_is_admin() itself) ---------------------
create or replace function rr_admin_requests(p_status text default 'pending')
returns table (id uuid, business_id uuid, business_name text, owner_email text, plan text, billing text,
               amount int, reference text, note text, status text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.id, r.business_id, b.name, u.email::text, r.plan, r.billing, r.amount, r.reference, r.note, r.status, r.created_at
  from payment_requests r
  join businesses b on b.id = r.business_id
  left join auth.users u on u.id = r.user_id
  where rr_is_admin() and r.status = p_status
  order by r.created_at desc limit 200
$$;

create or replace function rr_admin_businesses()
returns table (id uuid, name text, slug text, owner_email text, plan text, billing text,
               access_ends_at timestamptz, days_left int, total_taps bigint, blocked_taps bigint)
language sql security definer stable set search_path = public as $$
  select b.id, b.name, b.slug, u.email::text, b.plan, b.billing, b.access_ends_at,
         ceil(extract(epoch from (b.access_ends_at - now())) / 86400)::int,
         (select count(*) from taps t where t.business_id = b.id),
         (select count(*) from taps t where t.business_id = b.id and not t.allowed)
  from businesses b
  left join auth.users u on u.id = b.user_id
  where rr_is_admin() and not b.is_demo
  order by b.access_ends_at asc nulls first
$$;

-- Extend access by N days (counted from today, or from the current end date if it is still in the future).
-- Use it for payments, cash, or a manual grace period of any length.
create or replace function rr_admin_grant(p_business uuid, p_days int, p_plan text default null,
                                          p_billing text default null, p_request uuid default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_end timestamptz;
begin
  if not rr_is_admin() then raise exception 'Not allowed'; end if;
  if p_days is null or p_days < 1 or p_days > 800 then raise exception 'Days must be between 1 and 800'; end if;

  update businesses set
    access_starts_at = coalesce(access_starts_at, now()),
    access_ends_at   = greatest(now(), coalesce(access_ends_at, now())) + make_interval(days => p_days),
    plan    = coalesce(p_plan, plan),
    billing = coalesce(p_billing, billing)
  where id = p_business and not is_demo
  returning access_ends_at into v_end;
  if v_end is null then raise exception 'Business not found'; end if;

  if p_request is not null then
    update payment_requests set status = 'approved', decided_at = now(), days_granted = p_days
    where id = p_request and business_id = p_business and status = 'pending';
  end if;
  return v_end;
end $$;

create or replace function rr_admin_reject(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not rr_is_admin() then raise exception 'Not allowed'; end if;
  update payment_requests set status = 'rejected', decided_at = now() where id = p_request and status = 'pending';
end $$;

revoke all on function rr_admin_requests(text), rr_admin_businesses(),
  rr_admin_grant(uuid, int, text, text, uuid), rr_admin_reject(uuid) from public, anon;
grant execute on function rr_admin_requests(text), rr_admin_businesses(),
  rr_admin_grant(uuid, int, text, text, uuid), rr_admin_reject(uuid) to authenticated;

-- 5. Make YOURSELF the admin ------------------------------------------------------
-- First sign up / log in to the real app once. Then replace the email below with that
-- exact login email and run this statement. (Left unchanged, it does nothing.)
insert into rr_admins (user_id)
select id from auth.users where lower(email) = lower('PUT-YOUR-LOGIN-EMAIL-HERE')
on conflict do nothing;

select count(*) as admins_registered from rr_admins;
