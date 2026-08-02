-- SIEMC · Depósitos bancarios
-- Requiere el módulo Arqueos.

create table public.depositos (
  id uuid primary key default gen_random_uuid(),
  numero_deposito bigint generated always as identity,
  fecha_deposito date not null,
  banco text not null,
  referencia text not null,
  monto_esperado numeric(12, 2) not null,
  monto_depositado numeric(12, 2) not null,
  diferencia numeric(12, 2)
    generated always as (monto_depositado - monto_esperado) stored,
  estado text not null default 'registrado',
  evidencia_url text,
  observaciones text,
  anulado_en timestamptz,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint depositos_banco_check
    check (char_length(btrim(banco)) between 2 and 100),
  constraint depositos_referencia_check
    check (char_length(btrim(referencia)) between 3 and 100),
  constraint depositos_montos_check
    check (
      monto_esperado > 0
      and monto_esperado <= 99999999.99
      and monto_depositado > 0
      and monto_depositado <= 99999999.99
    ),
  constraint depositos_estado_check
    check (estado in ('registrado', 'conciliado', 'con_diferencia', 'anulado')),
  constraint depositos_evidencia_check
    check (
      evidencia_url is null
      or char_length(btrim(evidencia_url)) between 5 and 500
    ),
  constraint depositos_observaciones_check
    check (
      observaciones is null
      or char_length(btrim(observaciones)) between 1 and 500
    ),
  constraint depositos_anulacion_check
    check (
      (
        estado <> 'anulado'
        and anulado_en is null
        and motivo_anulacion is null
      )
      or (
        estado = 'anulado'
        and anulado_en is not null
        and motivo_anulacion is not null
        and char_length(btrim(motivo_anulacion)) between 10 and 300
      )
    )
);

create table public.deposito_arqueos (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null
    references public.depositos (id)
    on update restrict
    on delete restrict,
  arqueo_id uuid not null
    references public.arqueos (id)
    on update restrict
    on delete restrict,
  monto_aplicado numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint deposito_arqueos_monto_check
    check (monto_aplicado > 0 and monto_aplicado <= 99999999.99),
  constraint deposito_arqueos_relacion_uq
    unique (deposito_id, arqueo_id)
);
