-- ReviewRadar — Supabase setup
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run
--
-- This does two things:
--   1. Creates the `businesses` table (locations a user is monitoring)
--   2. Turns on Row Level Security so each user can only ever see or
--      modify their own rows — enforced by Postgres itself, not by
--      app code. Even if someone forges a request with a different
--      user_id, RLS rejects it, because every policy below compares
--      against auth.uid() (the user_id encoded in their real, signed
--      Supabase session token) rather than trusting a value sent by
--      the client.

create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  place_id    text not null,
  name        text not null,
  address     text not null,
  rating      numeric(2,1),
  platforms   text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (user_id, place_id)
);

-- Index for the common query pattern (load all locations for a user)
create index if not exists businesses_user_id_idx on businesses (user_id);

-- Turn on Row Level Security — without this line, RLS is OFF by
-- default and the policies below would not be enforced at all.
alter table businesses enable row level security;

-- A user can read only their own businesses.
create policy "Users can view own businesses"
  on businesses for select
  using (auth.uid() = user_id);

-- A user can insert rows only under their own user_id — this stops
-- someone from writing a business and assigning it to another
-- person's account.
create policy "Users can insert own businesses"
  on businesses for insert
  with check (auth.uid() = user_id);

-- A user can update only their own rows.
create policy "Users can update own businesses"
  on businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A user can delete only their own rows.
create policy "Users can delete own businesses"
  on businesses for delete
  using (auth.uid() = user_id);

-- ── Verify ──────────────────────────────────────────────────────
-- After running the above, confirm RLS is actually on:
--   select relrowsecurity from pg_class where relname = 'businesses';
-- Should return `t` (true). If it returns `f`, RLS did not enable —
-- re-run the `alter table ... enable row level security;` line.
