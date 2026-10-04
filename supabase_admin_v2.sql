-- ============================================================================
-- ReviewRadar — admin v2: cash requests, 2-step admin login (authenticator app),
-- grace-period log, expiry-reminder tracking.
-- Run ONCE in Supabase → SQL Editor, AFTER supabase_payments.sql. Safe to re-run.
-- ============================================================================

-- 1. Payment method + "already emailed" flag -----------------------------------
alter table payment_requests add column if not exists method text not null default 'upi' check (method in ('upi','cash'));
alter table payment_requests add column if not exists notified_at timestamptz;

-- 2. Admin gate -----------------------------------------------------------------
-- rr_is_admin_candidate(): "is this user on the admin list?" (used only to decide whether to show
--   the authenticator screen; it grants nothing).
-- rr_is_admin(): on the list AND signed in with the second step (aal2). Every admin function
--   below calls this, so without the authenticator code the server refuses everything.
create or replace function rr_is_admin_candidate() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from rr_admins where user_id = auth.uid())
$$;
revoke all on function rr_is_admin_candidate() from public, anon;
grant execute on function rr_is_admin_candidate() to authenticated;

create or replace function rr_is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from rr_admins where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;
revoke all on function rr_is_admin() from public, anon;
grant execute on function rr_is_admin() to authenticated;

-- 3. Grace-period / approval log (admins read it through rr_admin_log) -----------
create table if not exists rr_grant_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  admin_id    uuid not null,
  days        int  not null,
  reason      text,
  request_id  uuid,
  created_at  timestamptz not null default now()
);
alter table rr_grant_log enable row level security;   -- no policies: nobody reads it directly

drop function if exists rr_admin_grant(uuid, int, text, text, uuid);
create or replace function rr_admin_grant(p_business uuid, p_days int, p_plan text default null,
                                          p_billing text default null, p_request uuid default null,
                                          p_reason text default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_end timestamptz;
begin
  if not rr_is_admin() then raise exception 'Not allowed'; end if;
  if p_days is null or p_days < 1 or p_days > 800 then raise exception 'Days must be between 1 and 800'; end if;
  if p_request is null and coalesce(btrim(p_reason), '') = '' then raise exception 'A reason is required for manual days'; end if;

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

  insert into rr_grant_log (business_id, admin_id, days, reason, request_id)
  values (p_business, auth.uid(), p_days, left(nullif(btrim(p_reason), ''), 200), p_request);
  return v_end;
end $$;

create or replace function rr_admin_log()
returns table (created_at timestamptz, business_name text, admin_email text, days int, reason text)
language sql security definer stable set search_path = public as $$
  select l.created_at, b.name, u.email::text, l.days, l.reason
  from rr_grant_log l
  join businesses b on b.id = l.business_id
  left join auth.users u on u.id = l.admin_id
  where rr_is_admin()
  order by l.created_at desc limit 50
$$;

-- 4. Request list now includes the payment method --------------------------------
drop function if exists rr_admin_requests(text);
create or replace function rr_admin_requests(p_status text default 'pending')
returns table (id uuid, business_id uuid, business_name text, owner_email text, plan text, billing text,
               amount int, reference text, note text, status text, created_at timestamptz, method text)
language sql security definer stable set search_path = public as $$
  select r.id, r.business_id, b.name, u.email::text, r.plan, r.billing, r.amount, r.reference, r.note, r.status, r.created_at, r.method
  from payment_requests r
  join businesses b on b.id = r.business_id
  left join auth.users u on u.id = r.user_id
  where rr_is_admin() and r.status = p_status
  order by r.created_at desc limit 200
$$;

revoke all on function rr_admin_grant(uuid, int, text, text, uuid, text), rr_admin_log(),
  rr_admin_requests(text) from public, anon;
grant execute on function rr_admin_grant(uuid, int, text, text, uuid, text), rr_admin_log(),
  rr_admin_requests(text) to authenticated;

-- 5. Expiry-reminder tracking (one email per business, per stage, per expiry date) --
create table if not exists rr_reminders_sent (
  business_id    uuid not null references businesses(id) on delete cascade,
  kind           text not null,
  access_ends_at timestamptz not null,
  sent_at        timestamptz not null default now(),
  primary key (business_id, kind, access_ends_at)
);
alter table rr_reminders_sent enable row level security;   -- only the edge function (service role) touches it

-- 6. BOTH founders as admins -------------------------------------------------------
-- Each person must have signed up/logged in once. Put the two real login emails below, then run.
insert into rr_admins (user_id)
select id from auth.users
where lower(email) in (lower('FOUNDER-1-LOGIN-EMAIL'), lower('FOUNDER-2-LOGIN-EMAIL'))
on conflict do nothing;
select count(*) as admins_registered from rr_admins;

-- 7. Daily reminder job (run AFTER deploying the expiry-reminders function) ---------
-- Needs the pg_cron and pg_net extensions (Database → Extensions). Replace the two placeholders,
-- and use the SAME secret you saved as CRON_SECRET in Edge Function secrets.
--
-- select cron.schedule('rr-expiry-reminders', '30 3 * * *',   -- 03:30 UTC = 09:00 IST
--   $$ select net.http_post(
--        url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/expiry-reminders',
--        headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR-CRON-SECRET"}'::jsonb,
--        body    := '{}'::jsonb) $$);
