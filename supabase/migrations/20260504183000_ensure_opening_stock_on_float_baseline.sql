alter table if exists public.float_baseline
  add column if not exists opening_stock jsonb not null default '[]'::jsonb,
  add column if not exists opening_stock_date date;

notify pgrst, 'reload schema';
