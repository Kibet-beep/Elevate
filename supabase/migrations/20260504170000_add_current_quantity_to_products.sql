alter table if exists public.products
  add column if not exists current_quantity numeric not null default 0;

comment on column public.products.current_quantity is 'Running on-hand stock quantity used by inventory, opening stock, and sales flows.';

notify pgrst, 'reload schema';
