-- SIEMC · Fase 3 · Caja y pagos
-- Requiere las fases 1 y 2.

create table public.caja_sesiones (
  id uuid primary key default gen_random_uuid(),
  codigo_caja text not null default 'PRINCIPAL',
  estado text not null default 'abierta',
  monto_inicial numeric(12, 2) not null,
  abierta_en timestamptz not null default now(),
  observaciones_apertura text,
  cerrada_en timestamptz,
  efectivo_esperado numeric(12, 2),
  efectivo_declarado numeric(12, 2),
  diferencia numeric(12, 2),
  observaciones_cierre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caja_sesiones_codigo_check
    check (codigo_caja ~ '^[A-Z0-9-]{3,30}$'),
  constraint caja_sesiones_estado_check
    check (estado in ('abierta', 'cerrada')),
  constraint caja_sesiones_monto_inicial_check
    check (monto_inicial >= 0 and monto_inicial <= 9999999.99),
  constraint caja_sesiones_observaciones_apertura_check
    check (
      observaciones_apertura is null
      or char_length(btrim(observaciones_apertura)) between 1 and 500
    ),
  constraint caja_sesiones_observaciones_cierre_check
    check (
      observaciones_cierre is null
      or char_length(btrim(observaciones_cierre)) between 1 and 500
    ),
  constraint caja_sesiones_cierre_check
    check (
      (
        estado = 'abierta'
        and cerrada_en is null
        and efectivo_esperado is null
        and efectivo_declarado is null
        and diferencia is null
        and observaciones_cierre is null
      )
      or (
        estado = 'cerrada'
        and cerrada_en is not null
        and efectivo_esperado is not null
        and efectivo_declarado is not null
        and diferencia = efectivo_declarado - efectivo_esperado
      )
    )
);

create table public.recibos (
  id uuid primary key default gen_random_uuid(),
  numero_recibo bigint generated always as identity,
  caja_sesion_id uuid not null
    references public.caja_sesiones (id)
    on update restrict
    on delete restrict,
  atencion_id uuid not null
    references public.atenciones (id)
    on update restrict
    on delete restrict,
  total numeric(12, 2) not null,
  moneda text not null default 'HNL',
  estado text not null default 'valido',
  observaciones text,
  emitido_en timestamptz not null default now(),
  anulado_en timestamptz,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recibos_total_check
    check (total > 0 and total <= 9999999.99),
  constraint recibos_moneda_check
    check (moneda = 'HNL'),
  constraint recibos_estado_check
    check (estado in ('valido', 'anulado')),
  constraint recibos_observaciones_check
    check (
      observaciones is null
      or char_length(btrim(observaciones)) between 1 and 500
    ),
  constraint recibos_anulacion_check
    check (
      (
        estado = 'valido'
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

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  recibo_id uuid not null
    references public.recibos (id)
    on update restrict
    on delete restrict,
  metodo text not null,
  monto numeric(12, 2) not null,
  monto_recibido numeric(12, 2),
  cambio numeric(12, 2),
  banco text,
  referencia_transferencia text,
  fecha_transferencia date,
  created_at timestamptz not null default now(),
  constraint pagos_metodo_check
    check (metodo in ('efectivo', 'transferencia')),
  constraint pagos_monto_check
    check (monto > 0 and monto <= 9999999.99),
  constraint pagos_detalle_metodo_check
    check (
      (
        metodo = 'efectivo'
        and monto_recibido is not null
        and monto_recibido >= monto
        and cambio = monto_recibido - monto
        and banco is null
        and referencia_transferencia is null
        and fecha_transferencia is null
      )
      or (
        metodo = 'transferencia'
        and monto_recibido is null
        and cambio is null
        and banco is not null
        and char_length(btrim(banco)) between 2 and 100
        and referencia_transferencia is not null
        and char_length(btrim(referencia_transferencia)) between 3 and 100
        and fecha_transferencia is not null
      )
    )
);

create table public.caja_denominaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  tipo text not null,
  valor numeric(12, 2) not null,
  etiqueta text not null,
  orden smallint not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  constraint caja_denominaciones_codigo_check
    check (codigo ~ '^[a-z0-9-]{3,30}$'),
  constraint caja_denominaciones_tipo_check
    check (tipo in ('billete', 'moneda')),
  constraint caja_denominaciones_valor_check
    check (valor > 0 and valor <= 999999.99),
  constraint caja_denominaciones_etiqueta_check
    check (char_length(btrim(etiqueta)) between 2 and 50),
  constraint caja_denominaciones_orden_check
    check (orden > 0)
);

create table public.caja_conteos (
  id uuid primary key default gen_random_uuid(),
  caja_sesion_id uuid not null
    references public.caja_sesiones (id)
    on update restrict
    on delete restrict,
  total_declarado numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint caja_conteos_total_check
    check (total_declarado >= 0 and total_declarado <= 9999999.99)
);

create table public.caja_conteo_detalles (
  id uuid primary key default gen_random_uuid(),
  conteo_id uuid not null
    references public.caja_conteos (id)
    on update restrict
    on delete restrict,
  denominacion_id uuid not null
    references public.caja_denominaciones (id)
    on update restrict
    on delete restrict,
  codigo_denominacion text not null,
  tipo text not null,
  valor_unitario numeric(12, 2) not null,
  cantidad integer not null,
  subtotal numeric(12, 2)
    generated always as (valor_unitario * cantidad) stored,
  created_at timestamptz not null default now(),
  constraint caja_conteo_detalles_tipo_check
    check (tipo in ('billete', 'moneda')),
  constraint caja_conteo_detalles_valor_check
    check (valor_unitario > 0),
  constraint caja_conteo_detalles_cantidad_check
    check (cantidad between 1 and 10000)
);

