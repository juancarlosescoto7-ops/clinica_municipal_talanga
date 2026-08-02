-- SIEMC · Proveedores y comisiones
-- Requiere los módulos Servicios y Caja.

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre_completo text not null,
  especialidad text not null,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proveedores_codigo_check
    check (codigo ~ '^[A-Z0-9-]{3,20}$'),
  constraint proveedores_nombre_check
    check (char_length(btrim(nombre_completo)) between 3 and 160),
  constraint proveedores_especialidad_check
    check (especialidad in ('medicina', 'psicologia')),
  constraint proveedores_estado_check
    check (estado in ('activo', 'inactivo'))
);

create table public.proveedor_comision_tarifas (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null
    references public.proveedores (id)
    on update restrict
    on delete restrict,
  servicio_id uuid not null
    references public.servicios (id)
    on update restrict
    on delete restrict,
  monto_unitario numeric(12, 2) not null,
  moneda text not null default 'HNL',
  vigente_desde date not null,
  vigente_hasta date,
  created_at timestamptz not null default now(),
  constraint proveedor_comision_tarifas_monto_check
    check (monto_unitario >= 0 and monto_unitario <= 999999.99),
  constraint proveedor_comision_tarifas_moneda_check
    check (moneda = 'HNL'),
  constraint proveedor_comision_tarifas_vigencia_check
    check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  constraint proveedor_comision_tarifas_id_relacion_uq
    unique (id, proveedor_id, servicio_id)
);

create table public.atencion_servicio_comisiones (
  id uuid primary key default gen_random_uuid(),
  atencion_servicio_id uuid not null
    references public.atencion_servicios (id)
    on update restrict
    on delete restrict,
  proveedor_id uuid not null
    references public.proveedores (id)
    on update restrict
    on delete restrict,
  servicio_id uuid not null
    references public.servicios (id)
    on update restrict
    on delete restrict,
  tarifa_comision_id uuid not null,
  cantidad smallint not null,
  comision_unitaria numeric(12, 2) not null,
  total numeric(12, 2)
    generated always as (cantidad * comision_unitaria) stored,
  moneda text not null default 'HNL',
  created_at timestamptz not null default now(),
  constraint atencion_servicio_comisiones_tarifa_fk
    foreign key (tarifa_comision_id, proveedor_id, servicio_id)
    references public.proveedor_comision_tarifas (
      id,
      proveedor_id,
      servicio_id
    )
    on update restrict
    on delete restrict,
  constraint atencion_servicio_comisiones_cantidad_check
    check (cantidad between 1 and 10),
  constraint atencion_servicio_comisiones_monto_check
    check (comision_unitaria >= 0 and comision_unitaria <= 999999.99),
  constraint atencion_servicio_comisiones_moneda_check
    check (moneda = 'HNL')
);

create table public.comision_liquidaciones (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  estado text not null default 'borrador',
  total_comisiones numeric(12, 2) not null default 0,
  generada_en timestamptz not null default now(),
  liquidada_en timestamptz,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comision_liquidaciones_periodo_check
    check (periodo = date_trunc('month', periodo)::date),
  constraint comision_liquidaciones_estado_check
    check (estado in ('borrador', 'en_revision', 'liquidada')),
  constraint comision_liquidaciones_total_check
    check (total_comisiones >= 0 and total_comisiones <= 99999999.99),
  constraint comision_liquidaciones_observaciones_check
    check (
      observaciones is null
      or char_length(btrim(observaciones)) between 1 and 500
    ),
  constraint comision_liquidaciones_cierre_check
    check (
      (estado <> 'liquidada' and liquidada_en is null)
      or (estado = 'liquidada' and liquidada_en is not null)
    )
);

create table public.comision_liquidacion_detalles (
  id uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null
    references public.comision_liquidaciones (id)
    on update restrict
    on delete restrict,
  proveedor_id uuid not null
    references public.proveedores (id)
    on update restrict
    on delete restrict,
  servicios_cantidad integer not null,
  comision_calculada numeric(12, 2) not null,
  ajuste numeric(12, 2) not null default 0,
  total numeric(12, 2)
    generated always as (comision_calculada + ajuste) stored,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comision_liquidacion_detalles_cantidad_check
    check (servicios_cantidad >= 0),
  constraint comision_liquidacion_detalles_calculada_check
    check (comision_calculada >= 0),
  constraint comision_liquidacion_detalles_total_check
    check (comision_calculada + ajuste >= 0),
  constraint comision_liquidacion_detalles_observaciones_check
    check (
      observaciones is null
      or char_length(btrim(observaciones)) between 1 and 500
    ),
  constraint comision_liquidacion_detalles_proveedor_uq
    unique (liquidacion_id, proveedor_id)
);
