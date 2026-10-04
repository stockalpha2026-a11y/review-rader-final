-- Run this in Supabase SQL Editor. Safe to run even though
-- supabase_setup.sql already ran — this only adds one new column,
-- it doesn't touch anything that exists already.

alter table businesses
  add column if not exists maps_url text;
