-- SIEMC · Fase 1 · Pacientes y atenciones
-- Define únicamente estructuras pertenecientes a este módulo.

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  tipo_documento text not null,
  numero_documento text not null,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date not null,
  telefono text,
  correo text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pacientes_tipo_documento_check
    check (tipo_documento in ('identidad', 'pasaporte', 'residencia', 'otro')),
  constraint pacientes_numero_documento_check
    check (char_length(btrim(numero_documento)) between 4 and 30),
  constraint pacientes_nombres_check
    check (char_length(btrim(nombres)) between 2 and 100),
  constraint pacientes_apellidos_check
    check (char_length(btrim(apellidos)) between 2 and 100),
  constraint pacientes_telefono_check
    check (telefono is null or char_length(btrim(telefono)) between 8 and 20),
  constraint pacientes_correo_check
    check (correo is null or char_length(btrim(correo)) between 5 and 160),
  constraint pacientes_direccion_check
    check (direccion is null or char_length(btrim(direccion)) <= 250)
);

create table public.atenciones (
  id uuid primary key default gen_random_uuid(),
  numero_atencion bigint generated always as identity,
  paciente_id uuid not null
    references public.pacientes (id)
    on update restrict
    on delete restrict,
  estado text not null default 'pendiente_pago',
  categoria_tarifaria text not null default 'general',
  observaciones text,
  motivo_abandono text,
  abandonada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atenciones_estado_check
    check (
      estado in (
        'registrada',
        'pendiente_pago',
        'pagada',
        'no_cobrada',
        'abandonada',
        'anulada'
      )
    ),
  constraint atenciones_categoria_tarifaria_check
    check (
      categoria_tarifaria in (
        'general',
        'tercera_edad',
        'policia'
      )
    ),
  constraint atenciones_observaciones_check
    check (
      observaciones is null
      or char_length(btrim(observaciones)) between 1 and 500
    ),
  constraint atenciones_abandono_check
    check (
      (
        estado = 'abandonada'
        and motivo_abandono is not null
        and char_length(btrim(motivo_abandono)) between 10 and 300
        and abandonada_en is not null
      )
      or (
        estado <> 'abandonada'
        and motivo_abandono is null
        and abandonada_en is null
      )
    )
);

create table public.atencion_eventos (
  id uuid primary key default gen_random_uuid(),
  atencion_id uuid not null
    references public.atenciones (id)
    on update restrict
    on delete restrict,
  tipo_evento text not null,
  estado_anterior text,
  estado_nuevo text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint atencion_eventos_tipo_check
    check (char_length(btrim(tipo_evento)) between 3 and 50),
  constraint atencion_eventos_estado_anterior_check
    check (
      estado_anterior is null
      or estado_anterior in (
        'registrada',
        'pendiente_pago',
        'pagada',
        'no_cobrada',
        'abandonada',
        'anulada'
      )
    ),
  constraint atencion_eventos_estado_nuevo_check
    check (
      estado_nuevo in (
        'registrada',
        'pendiente_pago',
        'pagada',
        'no_cobrada',
        'abandonada',
        'anulada'
      )
    ),
  constraint atencion_eventos_detalle_check
    check (jsonb_typeof(detalle) = 'object')
);
