-- SIEMC · Reimpresión de recibos

create table public.recibo_reimpresiones (
  id uuid primary key default gen_random_uuid(),
  recibo_id uuid not null
    references public.recibos (id)
    on update restrict
    on delete restrict,
  operador_id uuid not null,
  reimpreso_en timestamptz not null default now()
);
