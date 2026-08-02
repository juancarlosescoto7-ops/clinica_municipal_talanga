-- SIEMC · Fase 2 · Servicios y tarifas
-- Requiere las tablas de Pacientes y atenciones de la fase 1.

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servicios_codigo_check
    check (codigo ~ '^[A-Z0-9-]{3,20}$'),
  constraint servicios_nombre_check
    check (char_length(btrim(nombre)) between 3 and 120),
  constraint servicios_descripcion_check
    check (
      descripcion is null
      or char_length(btrim(descripcion)) between 1 and 500
    ),
  constraint servicios_estado_check
    check (estado in ('activo', 'inactivo'))
);

create table public.servicio_tarifas (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null
    references public.servicios (id)
    on update restrict
    on delete restrict,
  monto numeric(12, 2) not null,
  moneda text not null default 'HNL',
  categoria_tarifaria text not null default 'general',
  vigente_desde date not null,
  vigente_hasta date,
  created_at timestamptz not null default now(),
  constraint servicio_tarifas_monto_check
    check (monto > 0 and monto <= 999999.99),
  constraint servicio_tarifas_moneda_check
    check (moneda = 'HNL'),
  constraint servicio_tarifas_categoria_check
    check (
      categoria_tarifaria in (
        'general',
        'tercera_edad',
        'policia'
      )
    ),
  constraint servicio_tarifas_vigencia_check
    check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  constraint servicio_tarifas_id_servicio_uq
    unique (id, servicio_id)
);

create table public.atencion_servicios (
  id uuid primary key default gen_random_uuid(),
  atencion_id uuid not null
    references public.atenciones (id)
    on update restrict
    on delete restrict,
  servicio_id uuid not null
    references public.servicios (id)
    on update restrict
    on delete restrict,
  tarifa_id uuid not null,
  cantidad smallint not null default 1,
  monto_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2)
    generated always as (cantidad * monto_unitario) stored,
  moneda text not null default 'HNL',
  created_at timestamptz not null default now(),
  constraint atencion_servicios_tarifa_servicio_fk
    foreign key (tarifa_id, servicio_id)
    references public.servicio_tarifas (id, servicio_id)
    on update restrict
    on delete restrict,
  constraint atencion_servicios_cantidad_check
    check (cantidad between 1 and 10),
  constraint atencion_servicios_monto_check
    check (monto_unitario > 0 and monto_unitario <= 999999.99),
  constraint atencion_servicios_moneda_check
    check (moneda = 'HNL')
);
