-- SIEMC · Personal y salarios

create table public.personal (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre_completo text not null,
  cargo text not null,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_codigo_check
    check (codigo ~ '^[A-Z0-9-]{3,20}$'),
  constraint personal_nombre_check
    check (char_length(btrim(nombre_completo)) between 3 and 160),
  constraint personal_cargo_check
    check (char_length(btrim(cargo)) between 2 and 100),
  constraint personal_estado_check
    check (estado in ('activo', 'inactivo'))
);

create table public.personal_salarios (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null
    references public.personal (id)
    on update restrict
    on delete restrict,
  monto numeric(12, 2) not null,
  moneda text not null default 'HNL',
  vigente_desde date not null,
  vigente_hasta date,
  created_at timestamptz not null default now(),
  constraint personal_salarios_monto_check
    check (monto >= 0 and monto <= 9999999.99),
  constraint personal_salarios_moneda_check
    check (moneda = 'HNL'),
  constraint personal_salarios_vigencia_check
    check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  constraint personal_salarios_id_personal_uq
    unique (id, personal_id)
);
