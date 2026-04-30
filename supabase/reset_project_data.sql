-- Safe project data reset for Elevate
-- Keeps auth.users intact and clears only app-domain tables.
-- Run in Supabase SQL Editor.

begin;

truncate table if exists public.stock_take_items restart identity cascade;
truncate table if exists public.stock_takes restart identity cascade;
truncate table if exists public.stock_entries restart identity cascade;
truncate table if exists public.sale_items restart identity cascade;
truncate table if exists public.expenses restart identity cascade;
truncate table if exists public.transfers restart identity cascade;
truncate table if exists public.transactions restart identity cascade;
truncate table if exists public.float_baseline restart identity cascade;
truncate table if exists public.products restart identity cascade;
truncate table if exists public.suppliers restart identity cascade;
truncate table if exists public.users restart identity cascade;
truncate table if exists public.businesses restart identity cascade;

commit;

-- Optional hard reset (disabled on purpose):
-- If you also want to delete auth accounts, uncomment and run separately.
-- delete from auth.users;
