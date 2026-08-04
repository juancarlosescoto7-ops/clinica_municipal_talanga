-- SIEMC · INSTALACIÓN ÚNICA Y DEFINITIVA
-- Copiar y pegar este archivo completo en Supabase SQL Editor.
-- Puede ejecutarse en un proyecto nuevo o repetirse para actualizar RPC.
-- No elimina tablas ni datos existentes.
-- Archivo generado. No editar manualmente.
-- Los archivos fuente viven en src/modules/<modulo>/sql/.

create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;

begin;

-- ============================================================================
-- Fuente: src/modules/pacientes/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Fase 1 · Pacientes y atenciones
-- Define únicamente estructuras pertenecientes a este módulo.

create table if not exists public.pacientes (
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

create table if not exists public.atenciones (
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

create table if not exists public.atencion_eventos (
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

-- ============================================================================
-- Fuente: src/modules/pacientes/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Fase 1 · Pacientes y atenciones

create unique index if not exists pacientes_documento_uq
  on public.pacientes (tipo_documento, lower(numero_documento));

create index if not exists pacientes_nombres_busqueda_idx
  on public.pacientes (lower(nombres) text_pattern_ops);

create index if not exists pacientes_apellidos_busqueda_idx
  on public.pacientes (lower(apellidos) text_pattern_ops);

create index if not exists pacientes_creados_idx
  on public.pacientes (created_at desc);

create unique index if not exists atenciones_numero_uq
  on public.atenciones (numero_atencion);

create index if not exists atenciones_paciente_fecha_idx
  on public.atenciones (paciente_id, created_at desc);

create index if not exists atenciones_estado_fecha_idx
  on public.atenciones (estado, created_at desc);

create index if not exists atencion_eventos_atencion_fecha_idx
  on public.atencion_eventos (atencion_id, created_at desc);

-- ============================================================================
-- Fuente: src/modules/pacientes/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Fase 1 · Pacientes y atenciones
-- Funciones invocadoras. No se crean permisos, roles ni políticas RLS.

create or replace function public.siemc_actualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pacientes_actualizar_updated_at on public.pacientes;

create trigger pacientes_actualizar_updated_at
before update on public.pacientes
for each row
execute function public.siemc_actualizar_updated_at();

drop trigger if exists atenciones_actualizar_updated_at on public.atenciones;

create trigger atenciones_actualizar_updated_at
before update on public.atenciones
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.registrar_paciente_atencion(
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_fecha_nacimiento date,
  p_telefono text default null,
  p_correo text default null,
  p_direccion text default null,
  p_crear_atencion boolean default true,
  p_observaciones_atencion text default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_tipo_documento text := lower(btrim(coalesce(p_tipo_documento, '')));
  v_numero_documento text := upper(regexp_replace(btrim(coalesce(p_numero_documento, '')), '\s+', '', 'g'));
  v_nombres text := regexp_replace(btrim(coalesce(p_nombres, '')), '\s+', ' ', 'g');
  v_apellidos text := regexp_replace(btrim(coalesce(p_apellidos, '')), '\s+', ' ', 'g');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_correo text := lower(nullif(btrim(coalesce(p_correo, '')), ''));
  v_direccion text := nullif(regexp_replace(btrim(coalesce(p_direccion, '')), '\s+', ' ', 'g'), '');
  v_observaciones text := nullif(btrim(coalesce(p_observaciones_atencion, '')), '');
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
  v_paciente_id uuid;
  v_atencion_id uuid;
  v_numero_atencion bigint;
  v_estado text;
begin
  if v_tipo_documento not in ('identidad', 'pasaporte', 'residencia', 'otro') then
    raise exception using
      errcode = 'P0001',
      message = 'TIPO_DOCUMENTO_INVALIDO';
  end if;

  if v_tipo_documento = 'identidad' and v_numero_documento !~ '^[0-9]{13}$' then
    raise exception using
      errcode = 'P0001',
      message = 'IDENTIDAD_INVALIDA';
  end if;

  if v_tipo_documento <> 'identidad' and v_numero_documento !~ '^[A-Z0-9-]{4,30}$' then
    raise exception using
      errcode = 'P0001',
      message = 'DOCUMENTO_INVALIDO';
  end if;

  if char_length(v_nombres) not between 2 and 100 then
    raise exception using
      errcode = 'P0001',
      message = 'NOMBRES_INVALIDOS';
  end if;

  if char_length(v_apellidos) not between 2 and 100 then
    raise exception using
      errcode = 'P0001',
      message = 'APELLIDOS_INVALIDOS';
  end if;

  if p_fecha_nacimiento is null or p_fecha_nacimiento > current_date then
    raise exception using
      errcode = 'P0001',
      message = 'FECHA_NACIMIENTO_INVALIDA';
  end if;

  if v_telefono is not null and (
    v_telefono !~ '^[0-9+() -]{8,20}$'
    or char_length(regexp_replace(v_telefono, '[^0-9]', '', 'g')) < 8
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'TELEFONO_INVALIDO';
  end if;

  if v_correo is not null and (
    char_length(v_correo) > 160
    or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CORREO_INVALIDO';
  end if;

  if v_direccion is not null and char_length(v_direccion) > 250 then
    raise exception using
      errcode = 'P0001',
      message = 'DIRECCION_INVALIDA';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_INVALIDAS';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  if exists (
    select 1
    from public.pacientes as p
    where p.tipo_documento = v_tipo_documento
      and lower(p.numero_documento) = lower(v_numero_documento)
  ) then
    raise exception using
      errcode = '23505',
      message = 'PACIENTE_DOCUMENTO_DUPLICADO';
  end if;

  insert into public.pacientes (
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    fecha_nacimiento,
    telefono,
    correo,
    direccion
  )
  values (
    v_tipo_documento,
    v_numero_documento,
    v_nombres,
    v_apellidos,
    p_fecha_nacimiento,
    v_telefono,
    v_correo,
    v_direccion
  )
  returning id into v_paciente_id;

  if p_crear_atencion then
    insert into public.atenciones (
      paciente_id,
      observaciones,
      categoria_tarifaria
    )
    values (
      v_paciente_id,
      v_observaciones,
      v_categoria_tarifaria
    )
    returning id, atenciones.numero_atencion, atenciones.estado
    into v_atencion_id, v_numero_atencion, v_estado;

    insert into public.atencion_eventos (
      atencion_id,
      tipo_evento,
      estado_anterior,
      estado_nuevo,
      detalle
    )
    values (
      v_atencion_id,
      'atencion_creada',
      null,
      v_estado,
      jsonb_build_object('origen', 'registro_paciente')
    );
  end if;

  return query
  select
    v_paciente_id,
    v_atencion_id,
    v_numero_atencion,
    v_estado;
end;
$$;

create or replace function public.crear_atencion_paciente(
  p_paciente_id uuid,
  p_observaciones text default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_observaciones text := nullif(btrim(coalesce(p_observaciones, '')), '');
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
  v_atencion_id uuid;
  v_numero_atencion bigint;
  v_estado text;
begin
  if p_paciente_id is null or not exists (
    select 1
    from public.pacientes as p
    where p.id = p_paciente_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PACIENTE_NO_EXISTE';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_INVALIDAS';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  insert into public.atenciones (
    paciente_id,
    observaciones,
    categoria_tarifaria
  )
  values (
    p_paciente_id,
    v_observaciones,
    v_categoria_tarifaria
  )
  returning id, atenciones.numero_atencion, atenciones.estado
  into v_atencion_id, v_numero_atencion, v_estado;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    v_atencion_id,
    'atencion_creada',
    null,
    v_estado,
    jsonb_build_object('origen', 'paciente_existente')
  );

  return query
  select
    p_paciente_id,
    v_atencion_id,
    v_numero_atencion,
    v_estado;
end;
$$;

create or replace function public.registrar_abandono_atencion(
  p_atencion_id uuid,
  p_motivo text
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_motivo text := regexp_replace(btrim(coalesce(p_motivo, '')), '\s+', ' ', 'g');
  v_paciente_id uuid;
  v_numero_atencion bigint;
  v_estado_anterior text;
begin
  if char_length(v_motivo) not between 10 and 300 then
    raise exception using
      errcode = 'P0001',
      message = 'MOTIVO_ABANDONO_INVALIDO';
  end if;

  select
    a.paciente_id,
    a.numero_atencion,
    a.estado
  into
    v_paciente_id,
    v_numero_atencion,
    v_estado_anterior
  from public.atenciones as a
  where a.id = p_atencion_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_NO_EXISTE';
  end if;

  if v_estado_anterior not in ('registrada', 'pendiente_pago') then
    raise exception using
      errcode = 'P0001',
      message = 'ESTADO_NO_PERMITE_ABANDONO';
  end if;

  update public.atenciones
  set
    estado = 'abandonada',
    motivo_abandono = v_motivo,
    abandonada_en = now()
  where id = p_atencion_id;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    p_atencion_id,
    'abandono_registrado',
    v_estado_anterior,
    'abandonada',
    jsonb_build_object('motivo', v_motivo)
  );

  return query
  select
    v_paciente_id,
    p_atencion_id,
    v_numero_atencion,
    'abandonada'::text;
end;
$$;

create or replace function public.buscar_pacientes(
  p_busqueda text default null,
  p_limite integer default 20,
  p_desplazamiento integer default 0
)
returns table (
  paciente_id uuid,
  tipo_documento text,
  numero_documento text,
  nombres text,
  apellidos text,
  fecha_nacimiento date,
  telefono text,
  ultima_atencion_id uuid,
  ultimo_numero_atencion bigint,
  ultimo_estado text,
  ultima_atencion_en timestamptz,
  total_resultados bigint
)
language plpgsql
stable
as $$
declare
  v_busqueda text := lower(nullif(btrim(coalesce(p_busqueda, '')), ''));
  v_limite integer := least(greatest(coalesce(p_limite, 20), 1), 100);
  v_desplazamiento integer := greatest(coalesce(p_desplazamiento, 0), 0);
begin
  if v_busqueda is not null and char_length(v_busqueda) > 100 then
    raise exception using
      errcode = 'P0001',
      message = 'BUSQUEDA_INVALIDA';
  end if;

  return query
  select
    p.id,
    p.tipo_documento,
    p.numero_documento,
    p.nombres,
    p.apellidos,
    p.fecha_nacimiento,
    p.telefono,
    ultima.id,
    ultima.numero_atencion,
    ultima.estado,
    ultima.created_at,
    count(*) over ()
  from public.pacientes as p
  left join lateral (
    select
      a.id,
      a.numero_atencion,
      a.estado,
      a.created_at
    from public.atenciones as a
    where a.paciente_id = p.id
    order by a.created_at desc
    limit 1
  ) as ultima on true
  where
    v_busqueda is null
    or lower(p.numero_documento) like v_busqueda || '%'
    or lower(p.nombres) like v_busqueda || '%'
    or lower(p.apellidos) like v_busqueda || '%'
  order by p.created_at desc
  limit v_limite
  offset v_desplazamiento;
end;
$$;

create or replace function public.obtener_historial_paciente(
  p_paciente_id uuid
)
returns table (
  atencion_id uuid,
  numero_atencion bigint,
  estado text,
  observaciones text,
  motivo_abandono text,
  abandonada_en timestamptz,
  creada_en timestamptz,
  total_eventos bigint
)
language plpgsql
stable
as $$
begin
  if p_paciente_id is null or not exists (
    select 1
    from public.pacientes as p
    where p.id = p_paciente_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PACIENTE_NO_EXISTE';
  end if;

  return query
  select
    a.id,
    a.numero_atencion,
    a.estado,
    a.observaciones,
    a.motivo_abandono,
    a.abandonada_en,
    a.created_at,
    count(e.id)
  from public.atenciones as a
  left join public.atencion_eventos as e
    on e.atencion_id = a.id
  where a.paciente_id = p_paciente_id
  group by
    a.id,
    a.numero_atencion,
    a.estado,
    a.observaciones,
    a.motivo_abandono,
    a.abandonada_en,
    a.created_at
  order by a.created_at desc;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/servicios/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Fase 2 · Servicios y tarifas
-- Requiere las tablas de Pacientes y atenciones de la fase 1.

create table if not exists public.servicios (
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

create table if not exists public.servicio_tarifas (
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

create table if not exists public.atencion_servicios (
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

-- ============================================================================
-- Fuente: src/modules/servicios/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Fase 2 · Servicios y tarifas

create unique index if not exists servicios_codigo_uq
  on public.servicios (lower(codigo));

create unique index if not exists servicios_nombre_uq
  on public.servicios (lower(nombre));

create index if not exists servicios_estado_nombre_idx
  on public.servicios (estado, lower(nombre));

create index if not exists servicio_tarifas_servicio_desde_idx
  on public.servicio_tarifas (
    servicio_id,
    categoria_tarifaria,
    vigente_desde desc
  );

create index if not exists servicio_tarifas_vigencia_idx
  on public.servicio_tarifas (
    servicio_id,
    categoria_tarifaria,
    vigente_desde,
    vigente_hasta
  );

create unique index if not exists atencion_servicios_atencion_servicio_uq
  on public.atencion_servicios (atencion_id, servicio_id);

create index if not exists atencion_servicios_servicio_idx
  on public.atencion_servicios (servicio_id, created_at desc);

create index if not exists atencion_servicios_tarifa_idx
  on public.atencion_servicios (tarifa_id);

-- ============================================================================
-- Fuente: src/modules/servicios/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Fase 2 · Servicios y tarifas
-- Funciones invocadoras. No se crean permisos, roles ni políticas RLS.

drop trigger if exists servicios_actualizar_updated_at on public.servicios;

create trigger servicios_actualizar_updated_at
before update on public.servicios
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.validar_vigencia_tarifa_servicio()
returns trigger
language plpgsql
as $$
begin
  perform 1
  from public.servicios as s
  where s.id = new.servicio_id
  for update;

  if exists (
    select 1
    from public.servicio_tarifas as t
    where t.servicio_id = new.servicio_id
      and t.categoria_tarifaria = new.categoria_tarifaria
      and t.id <> new.id
      and daterange(
        t.vigente_desde,
        coalesce(t.vigente_hasta, 'infinity'::date),
        '[]'
      ) && daterange(
        new.vigente_desde,
        coalesce(new.vigente_hasta, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'VIGENCIA_TARIFA_SUPERPUESTA';
  end if;

  return new;
end;
$$;

drop trigger if exists servicio_tarifas_validar_vigencia on public.servicio_tarifas;

create trigger servicio_tarifas_validar_vigencia
before insert or update on public.servicio_tarifas
for each row
execute function public.validar_vigencia_tarifa_servicio();

create or replace function public.crear_servicio(
  p_codigo text,
  p_nombre text,
  p_descripcion text default null
)
returns table (
  servicio_id uuid,
  codigo text,
  nombre text,
  descripcion text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_descripcion text := nullif(regexp_replace(btrim(coalesce(p_descripcion, '')), '\s+', ' ', 'g'), '');
  v_servicio public.servicios%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$' then
    raise exception using
      errcode = 'P0001',
      message = 'CODIGO_SERVICIO_INVALIDO';
  end if;

  if char_length(v_nombre) not between 3 and 120 then
    raise exception using
      errcode = 'P0001',
      message = 'NOMBRE_SERVICIO_INVALIDO';
  end if;

  if v_descripcion is not null and char_length(v_descripcion) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'DESCRIPCION_SERVICIO_INVALIDA';
  end if;

  if exists (
    select 1
    from public.servicios as s
    where lower(s.codigo) = lower(v_codigo)
  ) then
    raise exception using
      errcode = '23505',
      message = 'CODIGO_SERVICIO_DUPLICADO';
  end if;

  if exists (
    select 1
    from public.servicios as s
    where lower(s.nombre) = lower(v_nombre)
  ) then
    raise exception using
      errcode = '23505',
      message = 'NOMBRE_SERVICIO_DUPLICADO';
  end if;

  insert into public.servicios (
    codigo,
    nombre,
    descripcion
  )
  values (
    v_codigo,
    v_nombre,
    v_descripcion
  )
  returning * into v_servicio;

  return query
  select
    v_servicio.id,
    v_servicio.codigo,
    v_servicio.nombre,
    v_servicio.descripcion,
    v_servicio.estado,
    v_servicio.created_at,
    v_servicio.updated_at;
end;
$$;

create or replace function public.actualizar_servicio(
  p_servicio_id uuid,
  p_codigo text,
  p_nombre text,
  p_descripcion text,
  p_estado text
)
returns table (
  servicio_id uuid,
  codigo text,
  nombre text,
  descripcion text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_descripcion text := nullif(regexp_replace(btrim(coalesce(p_descripcion, '')), '\s+', ' ', 'g'), '');
  v_estado text := lower(btrim(coalesce(p_estado, '')));
  v_servicio public.servicios%rowtype;
begin
  select *
  into v_servicio
  from public.servicios as s
  where s.id = p_servicio_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_NO_EXISTE';
  end if;

  if v_codigo !~ '^[A-Z0-9-]{3,20}$' then
    raise exception using
      errcode = 'P0001',
      message = 'CODIGO_SERVICIO_INVALIDO';
  end if;

  if char_length(v_nombre) not between 3 and 120 then
    raise exception using
      errcode = 'P0001',
      message = 'NOMBRE_SERVICIO_INVALIDO';
  end if;

  if v_descripcion is not null and char_length(v_descripcion) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'DESCRIPCION_SERVICIO_INVALIDA';
  end if;

  if v_estado not in ('activo', 'inactivo') then
    raise exception using
      errcode = 'P0001',
      message = 'ESTADO_SERVICIO_INVALIDO';
  end if;

  if exists (
    select 1
    from public.servicios as s
    where s.id <> p_servicio_id
      and lower(s.codigo) = lower(v_codigo)
  ) then
    raise exception using
      errcode = '23505',
      message = 'CODIGO_SERVICIO_DUPLICADO';
  end if;

  if exists (
    select 1
    from public.servicios as s
    where s.id <> p_servicio_id
      and lower(s.nombre) = lower(v_nombre)
  ) then
    raise exception using
      errcode = '23505',
      message = 'NOMBRE_SERVICIO_DUPLICADO';
  end if;

  update public.servicios
  set
    codigo = v_codigo,
    nombre = v_nombre,
    descripcion = v_descripcion,
    estado = v_estado
  where id = p_servicio_id
  returning * into v_servicio;

  return query
  select
    v_servicio.id,
    v_servicio.codigo,
    v_servicio.nombre,
    v_servicio.descripcion,
    v_servicio.estado,
    v_servicio.created_at,
    v_servicio.updated_at;
end;
$$;

create or replace function public.programar_tarifa_servicio(
  p_servicio_id uuid,
  p_monto numeric,
  p_vigente_desde date,
  p_vigente_hasta date default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  tarifa_id uuid,
  servicio_id uuid,
  monto numeric,
  moneda text,
  categoria_tarifaria text,
  vigente_desde date,
  vigente_hasta date,
  estado_vigencia text,
  created_at timestamptz
)
language plpgsql
as $$
declare
  v_tarifa public.servicio_tarifas%rowtype;
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
begin
  if p_servicio_id is null or not exists (
    select 1
    from public.servicios as s
    where s.id = p_servicio_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_NO_EXISTE';
  end if;

  if p_monto is null or p_monto <= 0 or p_monto > 999999.99 then
    raise exception using
      errcode = 'P0001',
      message = 'MONTO_TARIFA_INVALIDO';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  if p_vigente_desde is null then
    raise exception using
      errcode = 'P0001',
      message = 'FECHA_INICIAL_REQUERIDA';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < p_vigente_desde then
    raise exception using
      errcode = 'P0001',
      message = 'RANGO_VIGENCIA_INVALIDO';
  end if;

  insert into public.servicio_tarifas (
    servicio_id,
    monto,
    categoria_tarifaria,
    vigente_desde,
    vigente_hasta
  )
  values (
    p_servicio_id,
    round(p_monto, 2),
    v_categoria_tarifaria,
    p_vigente_desde,
    p_vigente_hasta
  )
  returning * into v_tarifa;

  return query
  select
    v_tarifa.id,
    v_tarifa.servicio_id,
    v_tarifa.monto,
    v_tarifa.moneda,
    v_tarifa.categoria_tarifaria,
    v_tarifa.vigente_desde,
    v_tarifa.vigente_hasta,
    case
      when v_tarifa.vigente_desde > current_date then 'programada'
      when v_tarifa.vigente_hasta is not null
        and v_tarifa.vigente_hasta < current_date then 'vencida'
      else 'vigente'
    end,
    v_tarifa.created_at;
end;
$$;

create or replace function public.listar_catalogo_servicios(
  p_busqueda text default null,
  p_estado text default null,
  p_fecha_referencia date default current_date,
  p_limite integer default 20,
  p_desplazamiento integer default 0,
  p_categoria_tarifaria text default 'general'
)
returns table (
  servicio_id uuid,
  codigo text,
  nombre text,
  descripcion text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz,
  tarifa_vigente_id uuid,
  monto_vigente numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  categoria_tarifaria text,
  total_resultados bigint
)
language plpgsql
stable
as $$
declare
  v_busqueda text := lower(nullif(btrim(coalesce(p_busqueda, '')), ''));
  v_estado text := lower(nullif(btrim(coalesce(p_estado, '')), ''));
  v_fecha date := coalesce(p_fecha_referencia, current_date);
  v_limite integer := least(greatest(coalesce(p_limite, 20), 1), 100);
  v_desplazamiento integer := greatest(coalesce(p_desplazamiento, 0), 0);
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
begin
  if v_busqueda is not null and char_length(v_busqueda) > 120 then
    raise exception using
      errcode = 'P0001',
      message = 'BUSQUEDA_INVALIDA';
  end if;

  if v_estado is not null and v_estado not in ('activo', 'inactivo') then
    raise exception using
      errcode = 'P0001',
      message = 'FILTRO_ESTADO_INVALIDO';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  return query
  select
    s.id,
    s.codigo,
    s.nombre,
    s.descripcion,
    s.estado,
    s.created_at,
    s.updated_at,
    tarifa.id,
    tarifa.monto,
    tarifa.moneda,
    tarifa.vigente_desde,
    tarifa.vigente_hasta,
    tarifa.categoria_tarifaria,
    count(*) over ()
  from public.servicios as s
  left join lateral (
    select
      t.id,
      t.monto,
      t.moneda,
      t.vigente_desde,
      t.vigente_hasta,
      t.categoria_tarifaria
    from public.servicio_tarifas as t
    where t.servicio_id = s.id
      and t.categoria_tarifaria = v_categoria_tarifaria
      and t.vigente_desde <= v_fecha
      and (t.vigente_hasta is null or t.vigente_hasta >= v_fecha)
    order by t.vigente_desde desc
    limit 1
  ) as tarifa on true
  where
    (v_estado is null or s.estado = v_estado)
    and (
      v_busqueda is null
      or lower(s.codigo) like v_busqueda || '%'
      or lower(s.nombre) like v_busqueda || '%'
    )
  order by s.nombre
  limit v_limite
  offset v_desplazamiento;
end;
$$;

create or replace function public.obtener_tarifas_servicio(
  p_servicio_id uuid,
  p_fecha_referencia date default current_date
)
returns table (
  tarifa_id uuid,
  servicio_id uuid,
  monto numeric,
  moneda text,
  categoria_tarifaria text,
  vigente_desde date,
  vigente_hasta date,
  estado_vigencia text,
  created_at timestamptz
)
language plpgsql
stable
as $$
declare
  v_fecha date := coalesce(p_fecha_referencia, current_date);
begin
  if p_servicio_id is null or not exists (
    select 1
    from public.servicios as s
    where s.id = p_servicio_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_NO_EXISTE';
  end if;

  return query
  select
    t.id,
    t.servicio_id,
    t.monto,
    t.moneda,
    t.categoria_tarifaria,
    t.vigente_desde,
    t.vigente_hasta,
    case
      when t.vigente_desde > v_fecha then 'programada'
      when t.vigente_hasta is not null and t.vigente_hasta < v_fecha
        then 'vencida'
      else 'vigente'
    end,
    t.created_at
  from public.servicio_tarifas as t
  where t.servicio_id = p_servicio_id
  order by t.vigente_desde desc;
end;
$$;

create or replace function public.asignar_servicio_atencion(
  p_atencion_id uuid,
  p_servicio_id uuid,
  p_cantidad integer default 1
)
returns table (
  atencion_servicio_id uuid,
  atencion_id uuid,
  servicio_id uuid,
  tarifa_id uuid,
  cantidad smallint,
  monto_unitario numeric,
  subtotal numeric,
  moneda text
)
language plpgsql
as $$
declare
  v_estado_atencion text;
  v_categoria_tarifaria text;
  v_codigo_servicio text;
  v_estado_servicio text;
  v_tarifa_id uuid;
  v_monto numeric(12, 2);
  v_asignacion public.atencion_servicios%rowtype;
begin
  if p_cantidad is null or p_cantidad not between 1 and 10 then
    raise exception using
      errcode = 'P0001',
      message = 'CANTIDAD_SERVICIO_INVALIDA';
  end if;

  select a.estado, a.categoria_tarifaria
  into v_estado_atencion, v_categoria_tarifaria
  from public.atenciones as a
  where a.id = p_atencion_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_NO_EXISTE';
  end if;

  if v_estado_atencion not in ('registrada', 'pendiente_pago') then
    raise exception using
      errcode = 'P0001',
      message = 'ESTADO_ATENCION_NO_PERMITE_ASIGNACION';
  end if;

  select s.codigo, s.estado
  into v_codigo_servicio, v_estado_servicio
  from public.servicios as s
  where s.id = p_servicio_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_NO_EXISTE';
  end if;

  if v_estado_servicio <> 'activo' then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_INACTIVO';
  end if;

  select
    t.id,
    t.monto
  into
    v_tarifa_id,
    v_monto
  from public.servicio_tarifas as t
  where t.servicio_id = p_servicio_id
    and (
      t.categoria_tarifaria = v_categoria_tarifaria
      or (
        v_codigo_servicio = 'EX-SANGRE'
        and t.categoria_tarifaria = 'general'
      )
    )
    and t.vigente_desde <= current_date
    and (t.vigente_hasta is null or t.vigente_hasta >= current_date)
  order by
    case when t.categoria_tarifaria = v_categoria_tarifaria then 0 else 1 end,
    t.vigente_desde desc
  limit 1;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'SERVICIO_SIN_TARIFA_VIGENTE';
  end if;

  if exists (
    select 1
    from public.atencion_servicios as ats
    where ats.atencion_id = p_atencion_id
      and ats.servicio_id = p_servicio_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'SERVICIO_YA_ASIGNADO_ATENCION';
  end if;

  insert into public.atencion_servicios (
    atencion_id,
    servicio_id,
    tarifa_id,
    cantidad,
    monto_unitario
  )
  values (
    p_atencion_id,
    p_servicio_id,
    v_tarifa_id,
    p_cantidad,
    v_monto
  )
  returning * into v_asignacion;

  return query
  select
    v_asignacion.id,
    v_asignacion.atencion_id,
    v_asignacion.servicio_id,
    v_asignacion.tarifa_id,
    v_asignacion.cantidad,
    v_asignacion.monto_unitario,
    v_asignacion.subtotal,
    v_asignacion.moneda;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/servicios/sql/04_seed.sql
-- ============================================================================

-- SIEMC · Servicios y tarifas vigentes

insert into public.servicios (codigo, nombre, descripcion)
values
  (
    'EX-MED',
    'Exámenes médicos',
    'Evaluación médica y psicológica para certificación municipal'
  ),
  (
    'EX-SANGRE',
    'Examen de tipo de sangre',
    'Determinación de grupo sanguíneo y factor Rh'
  )
on conflict do nothing;

update public.servicios as s
set
  nombre = v.nombre,
  descripcion = v.descripcion,
  estado = 'activo'
from (
  values
    (
      'EX-MED'::text,
      'Exámenes médicos'::text,
      'Evaluación médica y psicológica para certificación municipal'::text
    ),
    (
      'EX-SANGRE'::text,
      'Examen de tipo de sangre'::text,
      'Determinación de grupo sanguíneo y factor Rh'::text
    )
) as v(codigo, nombre, descripcion)
where s.codigo = v.codigo;

update public.servicios
set estado = 'inactivo'
where codigo = 'EX-PSI';

-- Corrige las tarifas abiertas de instalaciones anteriores.
update public.servicio_tarifas as t
set monto = v.monto
from public.servicios as s
join (
  values
    ('EX-MED'::text, 'general'::text, 500.00::numeric),
    ('EX-MED'::text, 'tercera_edad'::text, 350.00::numeric),
    ('EX-MED'::text, 'policia'::text, 250.00::numeric),
    ('EX-SANGRE'::text, 'general'::text, 50.00::numeric)
) as v(codigo, categoria_tarifaria, monto)
  on v.codigo = s.codigo
where t.servicio_id = s.id
  and t.categoria_tarifaria = v.categoria_tarifaria
  and t.vigente_hasta is null;

insert into public.servicio_tarifas (
  servicio_id,
  monto,
  categoria_tarifaria,
  vigente_desde
)
select
  s.id,
  v.monto,
  v.categoria_tarifaria,
  date '2026-01-01'
from (
  values
    ('EX-MED'::text, 'general'::text, 500.00::numeric),
    ('EX-MED'::text, 'tercera_edad'::text, 350.00::numeric),
    ('EX-MED'::text, 'policia'::text, 250.00::numeric),
    ('EX-SANGRE'::text, 'general'::text, 50.00::numeric)
) as v(codigo, categoria_tarifaria, monto)
join public.servicios as s on s.codigo = v.codigo
where not exists (
  select 1
  from public.servicio_tarifas as t
  where t.servicio_id = s.id
    and t.categoria_tarifaria = v.categoria_tarifaria
    and t.vigente_hasta is null
);

-- ============================================================================
-- Fuente: src/modules/personal/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Personal y salarios

create table if not exists public.personal (
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

create table if not exists public.personal_salarios (
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

-- ============================================================================
-- Fuente: src/modules/personal/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Personal y salarios

create unique index if not exists personal_codigo_uq
  on public.personal (lower(codigo));

create index if not exists personal_estado_nombre_idx
  on public.personal (estado, nombre_completo);

create index if not exists personal_salarios_personal_vigencia_idx
  on public.personal_salarios (
    personal_id,
    vigente_desde desc,
    vigente_hasta
  );

-- ============================================================================
-- Fuente: src/modules/personal/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Personal y salarios
-- Requiere public.siemc_actualizar_updated_at() del módulo Pacientes.

drop trigger if exists personal_actualizar_updated_at on public.personal;

create trigger personal_actualizar_updated_at
before update on public.personal
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.validar_vigencia_salario_personal()
returns trigger
language plpgsql
as $$
begin
  perform 1
  from public.personal as p
  where p.id = new.personal_id
  for update;

  if exists (
    select 1
    from public.personal_salarios as s
    where s.personal_id = new.personal_id
      and s.id <> new.id
      and daterange(
        s.vigente_desde,
        coalesce(s.vigente_hasta, 'infinity'::date),
        '[]'
      ) && daterange(
        new.vigente_desde,
        coalesce(new.vigente_hasta, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'VIGENCIA_SALARIO_SUPERPUESTA';
  end if;

  return new;
end;
$$;

drop trigger if exists personal_salarios_validar_vigencia on public.personal_salarios;

create trigger personal_salarios_validar_vigencia
before insert or update on public.personal_salarios
for each row
execute function public.validar_vigencia_salario_personal();

create or replace function public.crear_personal(
  p_codigo text,
  p_nombre_completo text,
  p_cargo text
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_cargo text := regexp_replace(btrim(coalesce(p_cargo, '')), '\s+', ' ', 'g');
  v_personal public.personal%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$' then
    raise exception using errcode = 'P0001', message = 'CODIGO_PERSONAL_INVALIDO';
  end if;

  if char_length(v_nombre) not between 3 and 160 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_PERSONAL_INVALIDO';
  end if;

  if char_length(v_cargo) not between 2 and 100 then
    raise exception using errcode = 'P0001', message = 'CARGO_PERSONAL_INVALIDO';
  end if;

  insert into public.personal (codigo, nombre_completo, cargo)
  values (v_codigo, v_nombre, v_cargo)
  returning * into v_personal;

  return query
  select
    v_personal.id,
    v_personal.codigo,
    v_personal.nombre_completo,
    v_personal.cargo,
    v_personal.estado,
    v_personal.created_at,
    v_personal.updated_at;
end;
$$;

create or replace function public.actualizar_personal(
  p_personal_id uuid,
  p_codigo text,
  p_nombre_completo text,
  p_cargo text,
  p_estado text
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_cargo text := regexp_replace(btrim(coalesce(p_cargo, '')), '\s+', ' ', 'g');
  v_estado text := lower(btrim(coalesce(p_estado, '')));
  v_personal public.personal%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$'
    or char_length(v_nombre) not between 3 and 160
    or char_length(v_cargo) not between 2 and 100
    or v_estado not in ('activo', 'inactivo') then
    raise exception using errcode = 'P0001', message = 'DATOS_PERSONAL_INVALIDOS';
  end if;

  update public.personal
  set
    codigo = v_codigo,
    nombre_completo = v_nombre,
    cargo = v_cargo,
    estado = v_estado
  where id = p_personal_id
  returning * into v_personal;

  if not found then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  return query
  select
    v_personal.id,
    v_personal.codigo,
    v_personal.nombre_completo,
    v_personal.cargo,
    v_personal.estado,
    v_personal.created_at,
    v_personal.updated_at;
end;
$$;

create or replace function public.programar_salario_personal(
  p_personal_id uuid,
  p_monto numeric,
  p_vigente_desde date,
  p_vigente_hasta date default null
)
returns table (
  salario_id uuid,
  personal_id uuid,
  monto numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz
)
language plpgsql
as $$
declare
  v_salario public.personal_salarios%rowtype;
begin
  if not exists (
    select 1 from public.personal as p where p.id = p_personal_id
  ) then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  if p_monto is null or p_monto < 0 or p_monto > 9999999.99 then
    raise exception using errcode = 'P0001', message = 'SALARIO_INVALIDO';
  end if;

  if p_vigente_desde is null
    or (p_vigente_hasta is not null and p_vigente_hasta < p_vigente_desde) then
    raise exception using errcode = 'P0001', message = 'VIGENCIA_SALARIO_INVALIDA';
  end if;

  insert into public.personal_salarios (
    personal_id,
    monto,
    vigente_desde,
    vigente_hasta
  )
  values (
    p_personal_id,
    p_monto,
    p_vigente_desde,
    p_vigente_hasta
  )
  returning * into v_salario;

  return query
  select
    v_salario.id,
    v_salario.personal_id,
    v_salario.monto,
    v_salario.moneda,
    v_salario.vigente_desde,
    v_salario.vigente_hasta,
    v_salario.created_at;
end;
$$;

create or replace function public.listar_personal_salarios(
  p_busqueda text default null,
  p_estado text default null,
  p_fecha_referencia date default current_date,
  p_limite integer default 50,
  p_desplazamiento integer default 0
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  salario_id uuid,
  salario_vigente numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  total_resultados bigint
)
language plpgsql
stable
as $$
declare
  v_busqueda text := lower(nullif(btrim(coalesce(p_busqueda, '')), ''));
  v_estado text := lower(nullif(btrim(coalesce(p_estado, '')), ''));
  v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 200);
  v_desplazamiento integer := greatest(coalesce(p_desplazamiento, 0), 0);
begin
  if v_estado is not null and v_estado not in ('activo', 'inactivo') then
    raise exception using errcode = 'P0001', message = 'ESTADO_PERSONAL_INVALIDO';
  end if;

  return query
  select
    p.id,
    p.codigo,
    p.nombre_completo,
    p.cargo,
    p.estado,
    s.id,
    s.monto,
    s.moneda,
    s.vigente_desde,
    s.vigente_hasta,
    count(*) over ()
  from public.personal as p
  left join lateral (
    select ps.*
    from public.personal_salarios as ps
    where ps.personal_id = p.id
      and ps.vigente_desde <= p_fecha_referencia
      and (ps.vigente_hasta is null or ps.vigente_hasta >= p_fecha_referencia)
    order by ps.vigente_desde desc
    limit 1
  ) as s on true
  where (v_estado is null or p.estado = v_estado)
    and (
      v_busqueda is null
      or lower(p.codigo) like '%' || v_busqueda || '%'
      or lower(p.nombre_completo) like '%' || v_busqueda || '%'
      or lower(p.cargo) like '%' || v_busqueda || '%'
    )
  order by p.nombre_completo
  limit v_limite
  offset v_desplazamiento;
end;
$$;

create or replace function public.obtener_historial_salarios_personal(
  p_personal_id uuid
)
returns table (
  salario_id uuid,
  personal_id uuid,
  monto numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz
)
language plpgsql
stable
as $$
begin
  if not exists (
    select 1 from public.personal as p where p.id = p_personal_id
  ) then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  return query
  select
    s.id,
    s.personal_id,
    s.monto,
    s.moneda,
    s.vigente_desde,
    s.vigente_hasta,
    s.created_at
  from public.personal_salarios as s
  where s.personal_id = p_personal_id
  order by s.vigente_desde desc;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/personal/sql/04_seed.sql
-- ============================================================================

-- SIEMC · Personal y salarios base vigentes

insert into public.personal (codigo, nombre_completo, cargo)
values
  ('PER-MED', 'Ronald Deris Reyes', 'Médico'),
  ('PER-PSI', 'Suamy Michelle Barahona', 'Psicóloga'),
  ('PER-COB', 'Cinthia Raquel Villanueva', 'Cobros'),
  ('PER-CAP', 'Kellyn Maryori', 'Captadora')
on conflict do nothing;

insert into public.personal_salarios (
  personal_id,
  monto,
  vigente_desde
)
select p.id, v.monto, date '2026-01-01'
from (
  values
    ('PER-MED'::text, 22500.00::numeric),
    ('PER-PSI'::text, 16000.00::numeric),
    ('PER-COB'::text, 10000.00::numeric),
    ('PER-CAP'::text, 8000.00::numeric)
) as v(codigo, monto)
join public.personal as p on p.codigo = v.codigo
where not exists (
  select 1
  from public.personal_salarios as s
  where s.personal_id = p.id
    and s.vigente_hasta is null
);

-- ============================================================================
-- Fuente: src/modules/caja/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Fase 3 · Caja y pagos
-- Requiere las fases 1 y 2.

create table if not exists public.caja_sesiones (
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

create table if not exists public.recibos (
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

create table if not exists public.pagos (
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

create table if not exists public.caja_denominaciones (
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

create table if not exists public.caja_conteos (
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

create table if not exists public.caja_conteo_detalles (
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

-- ============================================================================
-- Fuente: src/modules/caja/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Fase 3 · Caja y pagos

create unique index if not exists caja_sesiones_abierta_codigo_uq
  on public.caja_sesiones (codigo_caja)
  where estado = 'abierta';

create index if not exists caja_sesiones_apertura_idx
  on public.caja_sesiones (abierta_en desc);

create unique index if not exists recibos_numero_uq
  on public.recibos (numero_recibo);

create unique index if not exists recibos_atencion_valida_uq
  on public.recibos (atencion_id)
  where estado = 'valido';

create index if not exists recibos_caja_emision_idx
  on public.recibos (caja_sesion_id, emitido_en desc);

create index if not exists recibos_estado_emision_idx
  on public.recibos (estado, emitido_en desc);

create unique index if not exists pagos_recibo_uq
  on public.pagos (recibo_id);

create index if not exists pagos_metodo_fecha_idx
  on public.pagos (metodo, created_at desc);

create unique index if not exists pagos_transferencia_referencia_uq
  on public.pagos (lower(banco), lower(referencia_transferencia))
  where metodo = 'transferencia';

create unique index if not exists caja_denominaciones_codigo_uq
  on public.caja_denominaciones (codigo);

create unique index if not exists caja_denominaciones_valor_uq
  on public.caja_denominaciones (valor);

create index if not exists caja_denominaciones_orden_idx
  on public.caja_denominaciones (activa, orden);

create unique index if not exists caja_conteos_sesion_uq
  on public.caja_conteos (caja_sesion_id);

create unique index if not exists caja_conteo_detalles_denominacion_uq
  on public.caja_conteo_detalles (conteo_id, denominacion_id);

-- ============================================================================
-- Fuente: src/modules/caja/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Fase 3 · Caja y pagos
-- Funciones de caja. La anulación usa SECURITY DEFINER exclusivamente para
-- verificar un secreto cifrado de Supabase Vault con search_path vacío.

drop trigger if exists caja_sesiones_actualizar_updated_at on public.caja_sesiones;

create trigger caja_sesiones_actualizar_updated_at
before update on public.caja_sesiones
for each row
execute function public.siemc_actualizar_updated_at();

drop trigger if exists recibos_actualizar_updated_at on public.recibos;

create trigger recibos_actualizar_updated_at
before update on public.recibos
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.siemc_proteger_anulacion_administrativa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('siemc.anulacion_autorizada', true)
    is distinct from 'true' then
    raise exception using
      errcode = 'P0001',
      message = 'ANULACION_REQUIERE_CLAVE_ADMINISTRATIVA';
  end if;

  return new;
end;
$$;

drop trigger if exists recibos_proteger_anulacion_administrativa on public.recibos;

create trigger recibos_proteger_anulacion_administrativa
before update of estado on public.recibos
for each row
when (old.estado is distinct from new.estado and new.estado = 'anulado')
execute function public.siemc_proteger_anulacion_administrativa();

drop trigger if exists atenciones_proteger_anulacion_administrativa on public.atenciones;

create trigger atenciones_proteger_anulacion_administrativa
before update of estado on public.atenciones
for each row
when (old.estado is distinct from new.estado and new.estado = 'anulada')
execute function public.siemc_proteger_anulacion_administrativa();

create or replace function public.abrir_caja(
  p_monto_inicial numeric,
  p_observaciones text default null
)
returns table (
  caja_sesion_id uuid,
  codigo_caja text,
  estado text,
  monto_inicial numeric,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric
)
language plpgsql
as $$
declare
  v_observaciones text := nullif(regexp_replace(btrim(coalesce(p_observaciones, '')), '\s+', ' ', 'g'), '');
  v_caja public.caja_sesiones%rowtype;
begin
  if p_monto_inicial is null
    or p_monto_inicial < 0
    or p_monto_inicial > 9999999.99 then
    raise exception using
      errcode = 'P0001',
      message = 'MONTO_INICIAL_INVALIDO';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_APERTURA_INVALIDAS';
  end if;

  if exists (
    select 1
    from public.caja_sesiones as cs
    where cs.codigo_caja = 'PRINCIPAL'
      and cs.estado = 'abierta'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CAJA_YA_ABIERTA';
  end if;

  insert into public.caja_sesiones (
    codigo_caja,
    monto_inicial,
    observaciones_apertura
  )
  values (
    'PRINCIPAL',
    round(p_monto_inicial, 2),
    v_observaciones
  )
  returning * into v_caja;

  return query
  select
    v_caja.id,
    v_caja.codigo_caja,
    v_caja.estado,
    v_caja.monto_inicial,
    v_caja.abierta_en,
    v_caja.cerrada_en,
    v_caja.efectivo_esperado,
    v_caja.efectivo_declarado,
    v_caja.diferencia;
end;
$$;

create or replace function public.obtener_caja_actual()
returns table (
  caja_sesion_id uuid,
  codigo_caja text,
  estado text,
  monto_inicial numeric,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric
)
language sql
stable
as $$
  select
    cs.id,
    cs.codigo_caja,
    cs.estado,
    cs.monto_inicial,
    cs.abierta_en,
    cs.cerrada_en,
    cs.efectivo_esperado,
    cs.efectivo_declarado,
    cs.diferencia
  from public.caja_sesiones as cs
  where cs.codigo_caja = 'PRINCIPAL'
    and cs.estado = 'abierta'
  order by cs.abierta_en desc
  limit 1;
$$;

create or replace function public.listar_atenciones_pendientes_cobro()
returns table (
  atencion_id uuid,
  numero_atencion bigint,
  paciente_id uuid,
  paciente_nombre text,
  numero_documento text,
  servicios jsonb,
  total numeric
)
language sql
stable
as $$
  select
    a.id,
    a.numero_atencion,
    p.id,
    concat_ws(' ', p.nombres, p.apellidos),
    p.numero_documento,
    jsonb_agg(
      jsonb_build_object(
        'codigo', s.codigo,
        'nombre', s.nombre,
        'cantidad', ats.cantidad,
        'subtotal', ats.subtotal
      )
      order by s.nombre
    ),
    sum(ats.subtotal)
  from public.atenciones as a
  join public.pacientes as p
    on p.id = a.paciente_id
  join public.atencion_servicios as ats
    on ats.atencion_id = a.id
  join public.servicios as s
    on s.id = ats.servicio_id
  where a.estado = 'pendiente_pago'
    and not exists (
      select 1
      from public.recibos as r
      where r.atencion_id = a.id
        and r.estado = 'valido'
    )
  group by
    a.id,
    a.numero_atencion,
    p.id,
    p.nombres,
    p.apellidos,
    p.numero_documento,
    a.created_at
  order by a.created_at;
$$;

create or replace function public.registrar_pago_atencion(
  p_atencion_id uuid,
  p_metodo text,
  p_monto_recibido numeric default null,
  p_banco text default null,
  p_referencia_transferencia text default null,
  p_fecha_transferencia date default null,
  p_observaciones text default null
)
returns table (
  recibo_id uuid,
  numero_recibo bigint,
  caja_sesion_id uuid,
  atencion_id uuid,
  total numeric,
  estado text,
  metodo text,
  monto_recibido numeric,
  cambio numeric,
  banco text,
  referencia_transferencia text,
  fecha_transferencia date,
  emitido_en timestamptz,
  anulado_en timestamptz,
  motivo_anulacion text
)
language plpgsql
as $$
declare
  v_metodo text := lower(btrim(coalesce(p_metodo, '')));
  v_banco text := nullif(regexp_replace(btrim(coalesce(p_banco, '')), '\s+', ' ', 'g'), '');
  v_referencia text := nullif(btrim(coalesce(p_referencia_transferencia, '')), '');
  v_observaciones text := nullif(regexp_replace(btrim(coalesce(p_observaciones, '')), '\s+', ' ', 'g'), '');
  v_caja_id uuid;
  v_estado_atencion text;
  v_total numeric(12, 2);
  v_recibo public.recibos%rowtype;
  v_pago public.pagos%rowtype;
begin
  select cs.id
  into v_caja_id
  from public.caja_sesiones as cs
  where cs.codigo_caja = 'PRINCIPAL'
    and cs.estado = 'abierta'
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CAJA_NO_ABIERTA';
  end if;

  select a.estado
  into v_estado_atencion
  from public.atenciones as a
  where a.id = p_atencion_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_NO_EXISTE';
  end if;

  if v_estado_atencion <> 'pendiente_pago' then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_NO_PENDIENTE_PAGO';
  end if;

  select sum(ats.subtotal)
  into v_total
  from public.atencion_servicios as ats
  where ats.atencion_id = p_atencion_id;

  if v_total is null or v_total <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_SIN_SERVICIOS_COBRABLES';
  end if;

  if exists (
    select 1
    from public.recibos as r
    where r.atencion_id = p_atencion_id
      and r.estado = 'valido'
  ) then
    raise exception using
      errcode = '23505',
      message = 'ATENCION_CON_RECIBO_VALIDO';
  end if;

  if v_metodo not in ('efectivo', 'transferencia') then
    raise exception using
      errcode = 'P0001',
      message = 'METODO_PAGO_INVALIDO';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_PAGO_INVALIDAS';
  end if;

  if v_metodo = 'efectivo' then
    if p_monto_recibido is null or p_monto_recibido < v_total then
      raise exception using
        errcode = 'P0001',
        message = 'EFECTIVO_RECIBIDO_INSUFICIENTE';
    end if;

    v_banco := null;
    v_referencia := null;
    p_fecha_transferencia := null;
  else
    if v_banco is null or char_length(v_banco) not between 2 and 100 then
      raise exception using
        errcode = 'P0001',
        message = 'BANCO_TRANSFERENCIA_INVALIDO';
    end if;

    if v_referencia is null
      or char_length(v_referencia) not between 3 and 100 then
      raise exception using
        errcode = 'P0001',
        message = 'REFERENCIA_TRANSFERENCIA_INVALIDA';
    end if;

    if p_fecha_transferencia is null
      or p_fecha_transferencia > current_date then
      raise exception using
        errcode = 'P0001',
        message = 'FECHA_TRANSFERENCIA_INVALIDA';
    end if;

    p_monto_recibido := null;
  end if;

  insert into public.recibos (
    caja_sesion_id,
    atencion_id,
    total,
    observaciones
  )
  values (
    v_caja_id,
    p_atencion_id,
    v_total,
    v_observaciones
  )
  returning * into v_recibo;

  insert into public.pagos (
    recibo_id,
    metodo,
    monto,
    monto_recibido,
    cambio,
    banco,
    referencia_transferencia,
    fecha_transferencia
  )
  values (
    v_recibo.id,
    v_metodo,
    v_total,
    p_monto_recibido,
    case
      when v_metodo = 'efectivo' then p_monto_recibido - v_total
      else null
    end,
    v_banco,
    v_referencia,
    p_fecha_transferencia
  )
  returning * into v_pago;

  update public.atenciones
  set estado = 'pagada'
  where id = p_atencion_id;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    p_atencion_id,
    'pago_registrado',
    'pendiente_pago',
    'pagada',
    jsonb_build_object(
      'recibo_id', v_recibo.id,
      'numero_recibo', v_recibo.numero_recibo,
      'metodo', v_metodo,
      'total', v_total
    )
  );

  return query
  select
    v_recibo.id,
    v_recibo.numero_recibo,
    v_recibo.caja_sesion_id,
    v_recibo.atencion_id,
    v_recibo.total,
    v_recibo.estado,
    v_pago.metodo,
    v_pago.monto_recibido,
    v_pago.cambio,
    v_pago.banco,
    v_pago.referencia_transferencia,
    v_pago.fecha_transferencia,
    v_recibo.emitido_en,
    v_recibo.anulado_en,
    v_recibo.motivo_anulacion;
end;
$$;

-- Eliminar la firma histórica sin clave para impedir que pueda invocarse como
-- una ruta alternativa sin autorización administrativa.
drop function if exists public.anular_recibo(uuid, text);

create or replace function public.anular_recibo(
  p_recibo_id uuid,
  p_motivo text,
  p_clave_administrativa text
)
returns table (
  recibo_id uuid,
  numero_recibo bigint,
  caja_sesion_id uuid,
  atencion_id uuid,
  total numeric,
  estado text,
  metodo text,
  monto_recibido numeric,
  cambio numeric,
  banco text,
  referencia_transferencia text,
  fecha_transferencia date,
  emitido_en timestamptz,
  anulado_en timestamptz,
  motivo_anulacion text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text := regexp_replace(btrim(coalesce(p_motivo, '')), '\s+', ' ', 'g');
  v_clave_configurada text;
  v_recibo public.recibos%rowtype;
  v_pago public.pagos%rowtype;
  v_estado_caja text;
  v_estado_atencion text;
begin
  if char_length(coalesce(p_clave_administrativa, '')) not between 12 and 128 then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_INVALIDA';
  end if;

  select secreto.decrypted_secret
  into v_clave_configurada
  from vault.decrypted_secrets as secreto
  where secreto.name = 'siemc_clave_anulacion'
  order by secreto.updated_at desc
  limit 1;

  if v_clave_configurada is null then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_NO_CONFIGURADA';
  end if;

  if p_clave_administrativa <> v_clave_configurada then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_INVALIDA';
  end if;

  perform pg_catalog.set_config(
    'siemc.anulacion_autorizada',
    'true',
    true
  );

  if char_length(v_motivo) not between 10 and 300 then
    raise exception using
      errcode = 'P0001',
      message = 'MOTIVO_ANULACION_INVALIDO';
  end if;

  select *
  into v_recibo
  from public.recibos as r
  where r.id = p_recibo_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RECIBO_NO_EXISTE';
  end if;

  if v_recibo.estado <> 'valido' then
    raise exception using
      errcode = 'P0001',
      message = 'RECIBO_NO_VALIDO';
  end if;

  select cs.estado
  into v_estado_caja
  from public.caja_sesiones as cs
  where cs.id = v_recibo.caja_sesion_id
  for update;

  if v_estado_caja <> 'abierta' then
    raise exception using
      errcode = 'P0001',
      message = 'CAJA_RECIBO_CERRADA';
  end if;

  select a.estado
  into v_estado_atencion
  from public.atenciones as a
  where a.id = v_recibo.atencion_id
  for update;

  if v_estado_atencion <> 'pagada' then
    raise exception using
      errcode = 'P0001',
      message = 'ESTADO_ATENCION_NO_PERMITE_ANULACION';
  end if;

  select *
  into v_pago
  from public.pagos as p
  where p.recibo_id = v_recibo.id;

  update public.recibos
  set
    estado = 'anulado',
    anulado_en = now(),
    motivo_anulacion = v_motivo
  where id = v_recibo.id
  returning * into v_recibo;

  update public.atenciones
  set estado = 'anulada'
  where id = v_recibo.atencion_id;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    v_recibo.atencion_id,
    'procedimiento_anulado',
    'pagada',
    'anulada',
    jsonb_build_object(
      'recibo_id', v_recibo.id,
      'numero_recibo', v_recibo.numero_recibo,
      'motivo', v_motivo,
      'operador_id', auth.uid()
    )
  );

  return query
  select
    v_recibo.id,
    v_recibo.numero_recibo,
    v_recibo.caja_sesion_id,
    v_recibo.atencion_id,
    v_recibo.total,
    v_recibo.estado,
    v_pago.metodo,
    v_pago.monto_recibido,
    v_pago.cambio,
    v_pago.banco,
    v_pago.referencia_transferencia,
    v_pago.fecha_transferencia,
    v_recibo.emitido_en,
    v_recibo.anulado_en,
    v_recibo.motivo_anulacion;
end;
$$;

create or replace function public.cerrar_caja(
  p_conteo jsonb,
  p_observaciones text default null
)
returns table (
  caja_sesion_id uuid,
  codigo_caja text,
  estado text,
  monto_inicial numeric,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric,
  conteo_id uuid
)
language plpgsql
as $$
declare
  v_observaciones text := nullif(regexp_replace(btrim(coalesce(p_observaciones, '')), '\s+', ' ', 'g'), '');
  v_caja public.caja_sesiones%rowtype;
  v_conteo_id uuid;
  v_efectivo_esperado numeric(12, 2);
  v_efectivo_declarado numeric(12, 2);
begin
  if p_conteo is null or jsonb_typeof(p_conteo) <> 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'CONTEO_INVALIDO';
  end if;

  if jsonb_array_length(p_conteo) > 100 then
    raise exception using
      errcode = 'P0001',
      message = 'CONTEO_EXCEDE_LIMITE';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_CIERRE_INVALIDAS';
  end if;

  select *
  into v_caja
  from public.caja_sesiones as cs
  where cs.codigo_caja = 'PRINCIPAL'
    and cs.estado = 'abierta'
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CAJA_NO_ABIERTA';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_conteo) as x(codigo text, cantidad integer)
    where x.codigo is null
      or x.cantidad is null
      or x.cantidad < 0
      or x.cantidad > 10000
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DETALLE_CONTEO_INVALIDO';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_conteo) as x(codigo text, cantidad integer)
    group by x.codigo
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DENOMINACION_CONTEO_DUPLICADA';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_conteo) as x(codigo text, cantidad integer)
    left join public.caja_denominaciones as d
      on d.codigo = x.codigo
      and d.activa
    where d.id is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DENOMINACION_CONTEO_NO_EXISTE';
  end if;

  insert into public.caja_conteos (
    caja_sesion_id,
    total_declarado
  )
  values (
    v_caja.id,
    0
  )
  returning id into v_conteo_id;

  insert into public.caja_conteo_detalles (
    conteo_id,
    denominacion_id,
    codigo_denominacion,
    tipo,
    valor_unitario,
    cantidad
  )
  select
    v_conteo_id,
    d.id,
    d.codigo,
    d.tipo,
    d.valor,
    x.cantidad
  from jsonb_to_recordset(p_conteo) as x(codigo text, cantidad integer)
  join public.caja_denominaciones as d
    on d.codigo = x.codigo
    and d.activa
  where x.cantidad > 0;

  select coalesce(sum(cd.subtotal), 0)
  into v_efectivo_declarado
  from public.caja_conteo_detalles as cd
  where cd.conteo_id = v_conteo_id;

  select
    v_caja.monto_inicial
    + coalesce(
      sum(pg.monto) filter (
        where r.estado = 'valido'
          and pg.metodo = 'efectivo'
      ),
      0
    )
  into v_efectivo_esperado
  from public.recibos as r
  join public.pagos as pg
    on pg.recibo_id = r.id
  where r.caja_sesion_id = v_caja.id;

  v_efectivo_esperado := coalesce(
    v_efectivo_esperado,
    v_caja.monto_inicial
  );

  update public.caja_conteos
  set total_declarado = v_efectivo_declarado
  where id = v_conteo_id;

  update public.caja_sesiones
  set
    estado = 'cerrada',
    cerrada_en = now(),
    efectivo_esperado = v_efectivo_esperado,
    efectivo_declarado = v_efectivo_declarado,
    diferencia = v_efectivo_declarado - v_efectivo_esperado,
    observaciones_cierre = v_observaciones
  where id = v_caja.id
  returning * into v_caja;

  return query
  select
    v_caja.id,
    v_caja.codigo_caja,
    v_caja.estado,
    v_caja.monto_inicial,
    v_caja.abierta_en,
    v_caja.cerrada_en,
    v_caja.efectivo_esperado,
    v_caja.efectivo_declarado,
    v_caja.diferencia,
    v_conteo_id;
end;
$$;

create or replace function public.listar_recibos_caja(
  p_caja_sesion_id uuid
)
returns table (
  recibo_id uuid,
  numero_recibo bigint,
  caja_sesion_id uuid,
  atencion_id uuid,
  total numeric,
  estado text,
  metodo text,
  monto_recibido numeric,
  cambio numeric,
  banco text,
  referencia_transferencia text,
  fecha_transferencia date,
  emitido_en timestamptz,
  anulado_en timestamptz,
  motivo_anulacion text
)
language plpgsql
stable
as $$
begin
  if p_caja_sesion_id is null or not exists (
    select 1
    from public.caja_sesiones as cs
    where cs.id = p_caja_sesion_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CAJA_SESION_NO_EXISTE';
  end if;

  return query
  select
    r.id,
    r.numero_recibo,
    r.caja_sesion_id,
    r.atencion_id,
    r.total,
    r.estado,
    pg.metodo,
    pg.monto_recibido,
    pg.cambio,
    pg.banco,
    pg.referencia_transferencia,
    pg.fecha_transferencia,
    r.emitido_en,
    r.anulado_en,
    r.motivo_anulacion
  from public.recibos as r
  join public.pagos as pg
    on pg.recibo_id = r.id
  where r.caja_sesion_id = p_caja_sesion_id
  order by r.emitido_en desc;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/caja/sql/04_seed.sql
-- ============================================================================

-- SIEMC · Fase 3 · Denominaciones iniciales HNL
-- El catálogo permanece editable mediante SQL futuro si cambia la circulación.

insert into public.caja_denominaciones (
  codigo,
  tipo,
  valor,
  etiqueta,
  orden
)
values
  ('bill-500', 'billete', 500.00, 'L 500', 1),
  ('bill-200', 'billete', 200.00, 'L 200', 2),
  ('bill-100', 'billete', 100.00, 'L 100', 3),
  ('bill-50', 'billete', 50.00, 'L 50', 4),
  ('bill-20', 'billete', 20.00, 'L 20', 5),
  ('bill-10', 'billete', 10.00, 'L 10', 6),
  ('bill-5', 'billete', 5.00, 'L 5', 7),
  ('bill-2', 'billete', 2.00, 'L 2', 8),
  ('bill-1', 'billete', 1.00, 'L 1', 9),
  ('coin-050', 'moneda', 0.50, '50 centavos', 10),
  ('coin-020', 'moneda', 0.20, '20 centavos', 11),
  ('coin-010', 'moneda', 0.10, '10 centavos', 12),
  ('coin-005', 'moneda', 0.05, '5 centavos', 13)
on conflict do nothing;

-- ============================================================================
-- Fuente: src/modules/caja/sql/05_guided_functions.sql
-- ============================================================================

-- SIEMC · Caja · Cierre simplificado para operación guiada

create or replace function public.cerrar_caja_con_total(
  p_efectivo_declarado numeric,
  p_observaciones text default null
)
returns table (
  caja_sesion_id uuid,
  codigo_caja text,
  estado text,
  monto_inicial numeric,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric,
  conteo_id uuid
)
language plpgsql
as $$
declare
  v_observaciones text := nullif(
    regexp_replace(btrim(coalesce(p_observaciones, '')), '\s+', ' ', 'g'),
    ''
  );
  v_caja public.caja_sesiones%rowtype;
  v_conteo_id uuid;
  v_efectivo_esperado numeric(12, 2);
begin
  if p_efectivo_declarado is null
    or p_efectivo_declarado < 0
    or p_efectivo_declarado > 9999999.99 then
    raise exception using errcode = 'P0001', message = 'EFECTIVO_DECLARADO_INVALIDO';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using errcode = 'P0001', message = 'OBSERVACIONES_CIERRE_INVALIDAS';
  end if;

  select *
  into v_caja
  from public.caja_sesiones as cs
  where cs.codigo_caja = 'PRINCIPAL'
    and cs.estado = 'abierta'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CAJA_NO_ABIERTA';
  end if;

  select
    v_caja.monto_inicial
      + coalesce(
        sum(p.monto) filter (
          where r.estado = 'valido' and p.metodo = 'efectivo'
        ),
        0
      )
  into v_efectivo_esperado
  from public.recibos as r
  join public.pagos as p on p.recibo_id = r.id
  where r.caja_sesion_id = v_caja.id;

  v_efectivo_esperado := coalesce(v_efectivo_esperado, v_caja.monto_inicial);

  insert into public.caja_conteos (caja_sesion_id, total_declarado)
  values (v_caja.id, p_efectivo_declarado)
  returning id into v_conteo_id;

  update public.caja_sesiones
  set
    estado = 'cerrada',
    cerrada_en = now(),
    efectivo_esperado = v_efectivo_esperado,
    efectivo_declarado = p_efectivo_declarado,
    diferencia = p_efectivo_declarado - v_efectivo_esperado,
    observaciones_cierre = v_observaciones
  where id = v_caja.id
  returning * into v_caja;

  return query
  select
    v_caja.id,
    v_caja.codigo_caja,
    v_caja.estado,
    v_caja.monto_inicial,
    v_caja.abierta_en,
    v_caja.cerrada_en,
    v_caja.efectivo_esperado,
    v_caja.efectivo_declarado,
    v_caja.diferencia,
    v_conteo_id;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/comisiones/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Proveedores y comisiones
-- Requiere los módulos Servicios y Caja.

create table if not exists public.proveedores (
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

create table if not exists public.proveedor_comision_tarifas (
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

create table if not exists public.atencion_servicio_comisiones (
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

create table if not exists public.comision_liquidaciones (
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

create table if not exists public.comision_liquidacion_detalles (
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

-- ============================================================================
-- Fuente: src/modules/comisiones/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Proveedores y comisiones

create unique index if not exists proveedores_codigo_uq
  on public.proveedores (lower(codigo));

create index if not exists proveedores_especialidad_estado_idx
  on public.proveedores (especialidad, estado, nombre_completo);

create index if not exists proveedor_comision_tarifas_busqueda_idx
  on public.proveedor_comision_tarifas (
    proveedor_id,
    servicio_id,
    vigente_desde desc,
    vigente_hasta
  );

drop index if exists public.atencion_servicio_comisiones_asignacion_uq;

create unique index if not exists atencion_servicio_comisiones_asignacion_uq
  on public.atencion_servicio_comisiones (
    atencion_servicio_id,
    proveedor_id
  );

create index if not exists atencion_servicio_comisiones_proveedor_fecha_idx
  on public.atencion_servicio_comisiones (proveedor_id, created_at desc);

create unique index if not exists comision_liquidaciones_periodo_uq
  on public.comision_liquidaciones (periodo);

create index if not exists comision_liquidaciones_estado_periodo_idx
  on public.comision_liquidaciones (estado, periodo desc);

create index if not exists comision_liquidacion_detalles_proveedor_idx
  on public.comision_liquidacion_detalles (proveedor_id, liquidacion_id);

-- ============================================================================
-- Fuente: src/modules/comisiones/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Proveedores y comisiones
-- No se crean permisos, roles ni políticas RLS.

drop trigger if exists proveedores_actualizar_updated_at on public.proveedores;

create trigger proveedores_actualizar_updated_at
before update on public.proveedores
for each row
execute function public.siemc_actualizar_updated_at();

drop trigger if exists comision_liquidaciones_actualizar_updated_at on public.comision_liquidaciones;

create trigger comision_liquidaciones_actualizar_updated_at
before update on public.comision_liquidaciones
for each row
execute function public.siemc_actualizar_updated_at();

drop trigger if exists comision_liquidacion_detalles_actualizar_updated_at on public.comision_liquidacion_detalles;

create trigger comision_liquidacion_detalles_actualizar_updated_at
before update on public.comision_liquidacion_detalles
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.validar_vigencia_comision_proveedor()
returns trigger
language plpgsql
as $$
begin
  perform 1
  from public.proveedores as p
  where p.id = new.proveedor_id
  for update;

  if exists (
    select 1
    from public.proveedor_comision_tarifas as t
    where t.proveedor_id = new.proveedor_id
      and t.servicio_id = new.servicio_id
      and t.id <> new.id
      and daterange(
        t.vigente_desde,
        coalesce(t.vigente_hasta, 'infinity'::date),
        '[]'
      ) && daterange(
        new.vigente_desde,
        coalesce(new.vigente_hasta, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'VIGENCIA_COMISION_SUPERPUESTA';
  end if;

  return new;
end;
$$;

drop trigger if exists proveedor_comision_tarifas_validar_vigencia on public.proveedor_comision_tarifas;

create trigger proveedor_comision_tarifas_validar_vigencia
before insert or update on public.proveedor_comision_tarifas
for each row
execute function public.validar_vigencia_comision_proveedor();

create or replace function public.crear_proveedor(
  p_codigo text,
  p_nombre_completo text,
  p_especialidad text
)
returns table (
  proveedor_id uuid,
  codigo text,
  nombre_completo text,
  especialidad text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_especialidad text := lower(btrim(coalesce(p_especialidad, '')));
  v_proveedor public.proveedores%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$'
    or char_length(v_nombre) not between 3 and 160
    or v_especialidad not in ('medicina', 'psicologia') then
    raise exception using errcode = 'P0001', message = 'DATOS_PROVEEDOR_INVALIDOS';
  end if;

  insert into public.proveedores (codigo, nombre_completo, especialidad)
  values (v_codigo, v_nombre, v_especialidad)
  returning * into v_proveedor;

  return query
  select
    v_proveedor.id,
    v_proveedor.codigo,
    v_proveedor.nombre_completo,
    v_proveedor.especialidad,
    v_proveedor.estado,
    v_proveedor.created_at,
    v_proveedor.updated_at;
end;
$$;

create or replace function public.actualizar_proveedor(
  p_proveedor_id uuid,
  p_codigo text,
  p_nombre_completo text,
  p_especialidad text,
  p_estado text
)
returns table (
  proveedor_id uuid,
  codigo text,
  nombre_completo text,
  especialidad text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_especialidad text := lower(btrim(coalesce(p_especialidad, '')));
  v_estado text := lower(btrim(coalesce(p_estado, '')));
  v_proveedor public.proveedores%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$'
    or char_length(v_nombre) not between 3 and 160
    or v_especialidad not in ('medicina', 'psicologia')
    or v_estado not in ('activo', 'inactivo') then
    raise exception using errcode = 'P0001', message = 'DATOS_PROVEEDOR_INVALIDOS';
  end if;

  update public.proveedores
  set
    codigo = v_codigo,
    nombre_completo = v_nombre,
    especialidad = v_especialidad,
    estado = v_estado
  where id = p_proveedor_id
  returning * into v_proveedor;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROVEEDOR_NO_EXISTE';
  end if;

  return query
  select
    v_proveedor.id,
    v_proveedor.codigo,
    v_proveedor.nombre_completo,
    v_proveedor.especialidad,
    v_proveedor.estado,
    v_proveedor.created_at,
    v_proveedor.updated_at;
end;
$$;

create or replace function public.programar_tarifa_comision_proveedor(
  p_proveedor_id uuid,
  p_servicio_id uuid,
  p_monto_unitario numeric,
  p_vigente_desde date,
  p_vigente_hasta date default null
)
returns table (
  tarifa_comision_id uuid,
  proveedor_id uuid,
  servicio_id uuid,
  monto_unitario numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz
)
language plpgsql
as $$
declare
  v_tarifa public.proveedor_comision_tarifas%rowtype;
begin
  if not exists (
    select 1 from public.proveedores as p where p.id = p_proveedor_id
  ) then
    raise exception using errcode = 'P0001', message = 'PROVEEDOR_NO_EXISTE';
  end if;

  if not exists (
    select 1 from public.servicios as s where s.id = p_servicio_id
  ) then
    raise exception using errcode = 'P0001', message = 'SERVICIO_NO_EXISTE';
  end if;

  if p_monto_unitario is null
    or p_monto_unitario < 0
    or p_monto_unitario > 999999.99 then
    raise exception using errcode = 'P0001', message = 'COMISION_INVALIDA';
  end if;

  if p_vigente_desde is null
    or (p_vigente_hasta is not null and p_vigente_hasta < p_vigente_desde) then
    raise exception using errcode = 'P0001', message = 'VIGENCIA_COMISION_INVALIDA';
  end if;

  insert into public.proveedor_comision_tarifas (
    proveedor_id,
    servicio_id,
    monto_unitario,
    vigente_desde,
    vigente_hasta
  )
  values (
    p_proveedor_id,
    p_servicio_id,
    p_monto_unitario,
    p_vigente_desde,
    p_vigente_hasta
  )
  returning * into v_tarifa;

  return query
  select
    v_tarifa.id,
    v_tarifa.proveedor_id,
    v_tarifa.servicio_id,
    v_tarifa.monto_unitario,
    v_tarifa.moneda,
    v_tarifa.vigente_desde,
    v_tarifa.vigente_hasta,
    v_tarifa.created_at;
end;
$$;

create or replace function public.asignar_proveedor_atencion_servicio(
  p_atencion_servicio_id uuid,
  p_proveedor_id uuid
)
returns table (
  comision_id uuid,
  atencion_servicio_id uuid,
  proveedor_id uuid,
  servicio_id uuid,
  tarifa_comision_id uuid,
  cantidad smallint,
  comision_unitaria numeric,
  total numeric,
  moneda text
)
language plpgsql
as $$
declare
  v_asignacion public.atencion_servicios%rowtype;
  v_estado_atencion text;
  v_proveedor public.proveedores%rowtype;
  v_tarifa public.proveedor_comision_tarifas%rowtype;
  v_comision public.atencion_servicio_comisiones%rowtype;
begin
  select ats.*
  into v_asignacion
  from public.atencion_servicios as ats
  where ats.id = p_atencion_servicio_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ATENCION_SERVICIO_NO_EXISTE';
  end if;

  select a.estado
  into v_estado_atencion
  from public.atenciones as a
  where a.id = v_asignacion.atencion_id
  for update;

  if v_estado_atencion not in ('registrada', 'pendiente_pago') then
    raise exception using errcode = 'P0001', message = 'ESTADO_NO_PERMITE_PROVEEDOR';
  end if;

  select *
  into v_proveedor
  from public.proveedores as p
  where p.id = p_proveedor_id
  for update;

  if not found or v_proveedor.estado <> 'activo' then
    raise exception using errcode = 'P0001', message = 'PROVEEDOR_NO_DISPONIBLE';
  end if;

  select *
  into v_tarifa
  from public.proveedor_comision_tarifas as t
  where t.proveedor_id = p_proveedor_id
    and t.servicio_id = v_asignacion.servicio_id
    and t.vigente_desde <= current_date
    and (t.vigente_hasta is null or t.vigente_hasta >= current_date)
  order by t.vigente_desde desc
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'TARIFA_COMISION_NO_VIGENTE';
  end if;

  insert into public.atencion_servicio_comisiones (
    atencion_servicio_id,
    proveedor_id,
    servicio_id,
    tarifa_comision_id,
    cantidad,
    comision_unitaria
  )
  values (
    v_asignacion.id,
    p_proveedor_id,
    v_asignacion.servicio_id,
    v_tarifa.id,
    v_asignacion.cantidad,
    v_tarifa.monto_unitario
  )
  returning * into v_comision;

  return query
  select
    v_comision.id,
    v_comision.atencion_servicio_id,
    v_comision.proveedor_id,
    v_comision.servicio_id,
    v_comision.tarifa_comision_id,
    v_comision.cantidad,
    v_comision.comision_unitaria,
    v_comision.total,
    v_comision.moneda;
end;
$$;

create or replace function public.listar_proveedores(
  p_busqueda text default null,
  p_especialidad text default null,
  p_estado text default null,
  p_limite integer default 50,
  p_desplazamiento integer default 0
)
returns table (
  proveedor_id uuid,
  codigo text,
  nombre_completo text,
  especialidad text,
  estado text,
  total_resultados bigint
)
language sql
stable
as $$
  select
    p.id,
    p.codigo,
    p.nombre_completo,
    p.especialidad,
    p.estado,
    count(*) over ()
  from public.proveedores as p
  where (
      nullif(btrim(coalesce(p_busqueda, '')), '') is null
      or lower(p.codigo) like '%' || lower(btrim(p_busqueda)) || '%'
      or lower(p.nombre_completo) like '%' || lower(btrim(p_busqueda)) || '%'
    )
    and (
      nullif(btrim(coalesce(p_especialidad, '')), '') is null
      or p.especialidad = lower(btrim(p_especialidad))
    )
    and (
      nullif(btrim(coalesce(p_estado, '')), '') is null
      or p.estado = lower(btrim(p_estado))
    )
  order by p.nombre_completo
  limit least(greatest(coalesce(p_limite, 50), 1), 200)
  offset greatest(coalesce(p_desplazamiento, 0), 0);
$$;

create or replace function public.generar_liquidacion_comisiones(
  p_periodo date
)
returns table (
  liquidacion_id uuid,
  periodo date,
  estado text,
  total_comisiones numeric,
  total_proveedores bigint,
  total_servicios bigint
)
language plpgsql
as $$
declare
  v_periodo date := date_trunc('month', p_periodo)::date;
  v_fin date := (v_periodo + interval '1 month')::date;
  v_liquidacion public.comision_liquidaciones%rowtype;
begin
  if p_periodo is null then
    raise exception using errcode = 'P0001', message = 'PERIODO_INVALIDO';
  end if;

  select *
  into v_liquidacion
  from public.comision_liquidaciones as l
  where l.periodo = v_periodo
  for update;

  if not found then
    insert into public.comision_liquidaciones (periodo)
    values (v_periodo)
    returning * into v_liquidacion;
  end if;

  if v_liquidacion.estado in ('en_revision', 'liquidada') then
    return query
    select
      v_liquidacion.id,
      v_liquidacion.periodo,
      v_liquidacion.estado,
      v_liquidacion.total_comisiones,
      count(d.id),
      coalesce(sum(d.servicios_cantidad), 0)::bigint
    from public.comision_liquidacion_detalles as d
    where d.liquidacion_id = v_liquidacion.id;
    return;
  end if;

  delete from public.comision_liquidacion_detalles as d
  where d.liquidacion_id = v_liquidacion.id;

  insert into public.comision_liquidacion_detalles (
    liquidacion_id,
    proveedor_id,
    servicios_cantidad,
    comision_calculada
  )
  select
    v_liquidacion.id,
    c.proveedor_id,
    sum(c.cantidad)::integer,
    sum(c.total)
  from public.atencion_servicio_comisiones as c
  join public.atencion_servicios as ats
    on ats.id = c.atencion_servicio_id
  join public.recibos as r
    on r.atencion_id = ats.atencion_id
    and r.estado = 'valido'
    and r.emitido_en >= v_periodo
    and r.emitido_en < v_fin
  group by c.proveedor_id;

  update public.comision_liquidaciones as l
  set
    total_comisiones = coalesce((
      select sum(d.total)
      from public.comision_liquidacion_detalles as d
      where d.liquidacion_id = l.id
    ), 0),
    generada_en = now()
  where l.id = v_liquidacion.id
  returning * into v_liquidacion;

  return query
  select
    v_liquidacion.id,
    v_liquidacion.periodo,
    v_liquidacion.estado,
    v_liquidacion.total_comisiones,
    count(d.id),
    coalesce(sum(d.servicios_cantidad), 0)::bigint
  from public.comision_liquidacion_detalles as d
  where d.liquidacion_id = v_liquidacion.id;
end;
$$;

create or replace function public.obtener_liquidacion_comisiones(
  p_periodo date
)
returns table (
  liquidacion_id uuid,
  periodo date,
  estado text,
  total_comisiones numeric,
  proveedor_id uuid,
  proveedor_nombre text,
  especialidad text,
  servicios_cantidad integer,
  comision_calculada numeric,
  ajuste numeric,
  total numeric,
  observaciones text
)
language sql
stable
as $$
  select
    l.id,
    l.periodo,
    l.estado,
    l.total_comisiones,
    d.proveedor_id,
    p.nombre_completo,
    p.especialidad,
    d.servicios_cantidad,
    d.comision_calculada,
    d.ajuste,
    d.total,
    d.observaciones
  from public.comision_liquidaciones as l
  left join public.comision_liquidacion_detalles as d
    on d.liquidacion_id = l.id
  left join public.proveedores as p
    on p.id = d.proveedor_id
  where l.periodo = date_trunc('month', p_periodo)::date
  order by p.nombre_completo;
$$;

create or replace function public.ajustar_comision_liquidacion(
  p_liquidacion_id uuid,
  p_proveedor_id uuid,
  p_ajuste numeric,
  p_observaciones text
)
returns table (
  detalle_id uuid,
  comision_calculada numeric,
  ajuste numeric,
  total numeric,
  observaciones text
)
language plpgsql
as $$
declare
  v_estado text;
  v_detalle public.comision_liquidacion_detalles%rowtype;
  v_observaciones text := nullif(btrim(coalesce(p_observaciones, '')), '');
begin
  select l.estado
  into v_estado
  from public.comision_liquidaciones as l
  where l.id = p_liquidacion_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'LIQUIDACION_NO_EXISTE';
  end if;

  if v_estado = 'liquidada' then
    raise exception using errcode = 'P0001', message = 'LIQUIDACION_YA_CERRADA';
  end if;

  update public.comision_liquidacion_detalles
  set ajuste = coalesce(p_ajuste, 0), observaciones = v_observaciones
  where liquidacion_id = p_liquidacion_id
    and proveedor_id = p_proveedor_id
  returning * into v_detalle;

  if not found then
    raise exception using errcode = 'P0001', message = 'DETALLE_LIQUIDACION_NO_EXISTE';
  end if;

  update public.comision_liquidaciones as l
  set
    estado = 'en_revision',
    total_comisiones = (
      select coalesce(sum(d.total), 0)
      from public.comision_liquidacion_detalles as d
      where d.liquidacion_id = l.id
    )
  where l.id = p_liquidacion_id;

  return query
  select
    v_detalle.id,
    v_detalle.comision_calculada,
    v_detalle.ajuste,
    v_detalle.total,
    v_detalle.observaciones;
end;
$$;

create or replace function public.liquidar_comisiones(
  p_liquidacion_id uuid,
  p_observaciones text default null
)
returns table (
  liquidacion_id uuid,
  periodo date,
  estado text,
  total_comisiones numeric,
  liquidada_en timestamptz
)
language plpgsql
as $$
declare
  v_liquidacion public.comision_liquidaciones%rowtype;
  v_observaciones text := nullif(btrim(coalesce(p_observaciones, '')), '');
begin
  update public.comision_liquidaciones as l
  set
    estado = 'liquidada',
    liquidada_en = now(),
    observaciones = v_observaciones
  where l.id = p_liquidacion_id
    and l.estado <> 'liquidada'
  returning l.* into v_liquidacion;

  if not found then
    raise exception using errcode = 'P0001', message = 'LIQUIDACION_NO_DISPONIBLE';
  end if;

  return query
  select
    v_liquidacion.id,
    v_liquidacion.periodo,
    v_liquidacion.estado,
    v_liquidacion.total_comisiones,
    v_liquidacion.liquidada_en;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/comisiones/sql/04_seed.sql
-- ============================================================================

-- SIEMC · Proveedores y comisiones vigentes

insert into public.proveedores (
  codigo,
  nombre_completo,
  especialidad
)
values
  ('PSI-SUA', 'Suamy Michelle Barahona', 'psicologia'),
  ('MED-RON', 'Ronald Deris Reyes', 'medicina')
on conflict do nothing;

-- Cada examen médico válido genera comisión para ambos profesionales.
update public.proveedor_comision_tarifas as t
set monto_unitario = v.comision
from public.proveedores as p
join public.servicios as s on s.codigo = 'EX-MED'
join (
  values
    ('PSI-SUA'::text, 60.00::numeric),
    ('MED-RON'::text, 70.00::numeric)
) as v(proveedor_codigo, comision)
  on v.proveedor_codigo = p.codigo
where t.proveedor_id = p.id
  and t.servicio_id = s.id
  and t.vigente_hasta is null;

insert into public.proveedor_comision_tarifas (
  proveedor_id,
  servicio_id,
  monto_unitario,
  vigente_desde
)
select
  p.id,
  s.id,
  v.comision,
  date '2026-01-01'
from (
  values
    ('PSI-SUA'::text, 'EX-MED'::text, 60.00::numeric),
    ('MED-RON'::text, 'EX-MED'::text, 70.00::numeric)
) as v(proveedor_codigo, servicio_codigo, comision)
join public.proveedores as p on p.codigo = v.proveedor_codigo
join public.servicios as s on s.codigo = v.servicio_codigo
where not exists (
  select 1
  from public.proveedor_comision_tarifas as t
  where t.proveedor_id = p.id
    and t.servicio_id = s.id
    and t.vigente_hasta is null
);

-- ============================================================================
-- Fuente: src/modules/arqueos/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Arqueos diarios
-- Requiere el módulo Caja.

create table if not exists public.arqueos (
  id uuid primary key default gen_random_uuid(),
  numero_arqueo bigint generated always as identity,
  caja_sesion_id uuid not null
    references public.caja_sesiones (id)
    on update restrict
    on delete restrict,
  fecha date not null,
  total_efectivo numeric(12, 2) not null,
  total_transferencias numeric(12, 2) not null,
  total_cobrado numeric(12, 2) not null,
  efectivo_esperado numeric(12, 2) not null,
  efectivo_declarado numeric(12, 2) not null,
  diferencia numeric(12, 2) not null,
  estado text not null default 'borrador',
  justificacion text,
  confirmado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arqueos_totales_check
    check (
      total_efectivo >= 0
      and total_transferencias >= 0
      and total_cobrado = total_efectivo + total_transferencias
      and efectivo_esperado >= 0
      and efectivo_declarado >= 0
      and diferencia = efectivo_declarado - efectivo_esperado
    ),
  constraint arqueos_estado_check
    check (estado in ('borrador', 'confirmado', 'con_diferencia')),
  constraint arqueos_confirmacion_check
    check (
      (
        estado = 'borrador'
        and confirmado_en is null
        and justificacion is null
      )
      or (
        estado = 'confirmado'
        and confirmado_en is not null
        and diferencia = 0
      )
      or (
        estado = 'con_diferencia'
        and confirmado_en is not null
        and diferencia <> 0
        and justificacion is not null
        and char_length(btrim(justificacion)) between 10 and 500
      )
  )
);

-- Compatibilidad con instalaciones anteriores donde `arqueos` ya existía con
-- una estructura parcial. Las columnas financieras se agregan como anulables
-- para conservar filas históricas que no tienen equivalencia exacta; todos
-- los nuevos arqueos creados por las RPC completan estos campos.
alter table public.arqueos
  add column if not exists numero_arqueo bigint
  generated always as identity;

alter table public.arqueos
  add column if not exists caja_sesion_id uuid
  references public.caja_sesiones (id)
  on update restrict
  on delete restrict;

alter table public.arqueos
  add column if not exists fecha date,
  add column if not exists total_efectivo numeric(12, 2),
  add column if not exists total_transferencias numeric(12, 2),
  add column if not exists total_cobrado numeric(12, 2),
  add column if not exists efectivo_esperado numeric(12, 2),
  add column if not exists efectivo_declarado numeric(12, 2),
  add column if not exists diferencia numeric(12, 2),
  add column if not exists estado text default 'borrador',
  add column if not exists justificacion text,
  add column if not exists confirmado_en timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- ============================================================================
-- Fuente: src/modules/arqueos/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Arqueos diarios

create unique index if not exists arqueos_numero_uq
  on public.arqueos (numero_arqueo);

create unique index if not exists arqueos_caja_sesion_uq
  on public.arqueos (caja_sesion_id);

create index if not exists arqueos_fecha_estado_idx
  on public.arqueos (fecha desc, estado);

-- ============================================================================
-- Fuente: src/modules/arqueos/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Arqueos diarios

drop trigger if exists arqueos_actualizar_updated_at on public.arqueos;

create trigger arqueos_actualizar_updated_at
before update on public.arqueos
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.generar_arqueo_caja(
  p_caja_sesion_id uuid
)
returns table (
  arqueo_id uuid,
  numero_arqueo bigint,
  caja_sesion_id uuid,
  fecha date,
  total_efectivo numeric,
  total_transferencias numeric,
  total_cobrado numeric,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric,
  estado text,
  justificacion text,
  confirmado_en timestamptz
)
language plpgsql
as $$
declare
  v_caja public.caja_sesiones%rowtype;
  v_arqueo public.arqueos%rowtype;
  v_total_efectivo numeric(12, 2);
  v_total_transferencias numeric(12, 2);
begin
  select *
  into v_caja
  from public.caja_sesiones as cs
  where cs.id = p_caja_sesion_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CAJA_SESION_NO_EXISTE';
  end if;

  if v_caja.estado <> 'cerrada' then
    raise exception using errcode = 'P0001', message = 'CAJA_NO_CERRADA';
  end if;

  select
    coalesce(sum(p.monto) filter (where p.metodo = 'efectivo'), 0),
    coalesce(sum(p.monto) filter (where p.metodo = 'transferencia'), 0)
  into v_total_efectivo, v_total_transferencias
  from public.recibos as r
  join public.pagos as p on p.recibo_id = r.id
  where r.caja_sesion_id = v_caja.id
    and r.estado = 'valido';

  select *
  into v_arqueo
  from public.arqueos as a
  where a.caja_sesion_id = v_caja.id
  for update;

  if not found then
    insert into public.arqueos (
      caja_sesion_id,
      fecha,
      total_efectivo,
      total_transferencias,
      total_cobrado,
      efectivo_esperado,
      efectivo_declarado,
      diferencia
    )
    values (
      v_caja.id,
      (v_caja.cerrada_en at time zone 'America/Tegucigalpa')::date,
      v_total_efectivo,
      v_total_transferencias,
      v_total_efectivo + v_total_transferencias,
      v_caja.efectivo_esperado,
      v_caja.efectivo_declarado,
      v_caja.diferencia
    )
    returning * into v_arqueo;
  end if;

  return query
  select
    v_arqueo.id,
    v_arqueo.numero_arqueo,
    v_arqueo.caja_sesion_id,
    v_arqueo.fecha,
    v_arqueo.total_efectivo,
    v_arqueo.total_transferencias,
    v_arqueo.total_cobrado,
    v_arqueo.efectivo_esperado,
    v_arqueo.efectivo_declarado,
    v_arqueo.diferencia,
    v_arqueo.estado,
    v_arqueo.justificacion,
    v_arqueo.confirmado_en;
end;
$$;

create or replace function public.confirmar_arqueo(
  p_arqueo_id uuid,
  p_justificacion text default null
)
returns table (
  arqueo_id uuid,
  numero_arqueo bigint,
  caja_sesion_id uuid,
  fecha date,
  total_efectivo numeric,
  total_transferencias numeric,
  total_cobrado numeric,
  efectivo_esperado numeric,
  efectivo_declarado numeric,
  diferencia numeric,
  estado text,
  justificacion text,
  confirmado_en timestamptz
)
language plpgsql
as $$
declare
  v_arqueo public.arqueos%rowtype;
  v_justificacion text := nullif(
    regexp_replace(btrim(coalesce(p_justificacion, '')), '\s+', ' ', 'g'),
    ''
  );
begin
  select *
  into v_arqueo
  from public.arqueos as a
  where a.id = p_arqueo_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ARQUEO_NO_EXISTE';
  end if;

  if v_arqueo.estado <> 'borrador' then
    raise exception using errcode = 'P0001', message = 'ARQUEO_YA_CONFIRMADO';
  end if;

  if v_arqueo.diferencia <> 0
    and (
      v_justificacion is null
      or char_length(v_justificacion) not between 10 and 500
    ) then
    raise exception using errcode = 'P0001', message = 'JUSTIFICACION_REQUERIDA';
  end if;

  update public.arqueos as a
  set
    estado = case
      when a.diferencia = 0 then 'confirmado'
      else 'con_diferencia'
    end,
    justificacion = case
      when a.diferencia = 0 then null
      else v_justificacion
    end,
    confirmado_en = now()
  where a.id = p_arqueo_id
  returning a.* into v_arqueo;

  return query
  select
    v_arqueo.id,
    v_arqueo.numero_arqueo,
    v_arqueo.caja_sesion_id,
    v_arqueo.fecha,
    v_arqueo.total_efectivo,
    v_arqueo.total_transferencias,
    v_arqueo.total_cobrado,
    v_arqueo.efectivo_esperado,
    v_arqueo.efectivo_declarado,
    v_arqueo.diferencia,
    v_arqueo.estado,
    v_arqueo.justificacion,
    v_arqueo.confirmado_en;
end;
$$;

create or replace function public.obtener_arqueo(
  p_arqueo_id uuid
)
returns setof public.arqueos
language sql
stable
as $$
  select a.*
  from public.arqueos as a
  where a.id = p_arqueo_id;
$$;

create or replace function public.listar_arqueos(
  p_desde date default null,
  p_hasta date default null,
  p_estado text default null
)
returns setof public.arqueos
language sql
stable
as $$
  select a.*
  from public.arqueos as a
  where (p_desde is null or a.fecha >= p_desde)
    and (p_hasta is null or a.fecha <= p_hasta)
    and (
      nullif(btrim(coalesce(p_estado, '')), '') is null
      or a.estado = lower(btrim(p_estado))
    )
  order by a.fecha desc, a.numero_arqueo desc;
$$;

-- ============================================================================
-- Fuente: src/modules/depositos/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Depósitos bancarios
-- Requiere el módulo Arqueos.

create table if not exists public.depositos (
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

create table if not exists public.deposito_arqueos (
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

-- ============================================================================
-- Fuente: src/modules/depositos/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Depósitos bancarios

create unique index if not exists depositos_numero_uq
  on public.depositos (numero_deposito);

create unique index if not exists depositos_banco_referencia_uq
  on public.depositos (lower(banco), lower(referencia))
  where estado <> 'anulado';

create index if not exists depositos_fecha_estado_idx
  on public.depositos (fecha_deposito desc, estado);

create index if not exists deposito_arqueos_arqueo_idx
  on public.deposito_arqueos (arqueo_id, deposito_id);

-- ============================================================================
-- Fuente: src/modules/depositos/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Depósitos bancarios

drop trigger if exists depositos_actualizar_updated_at on public.depositos;

create trigger depositos_actualizar_updated_at
before update on public.depositos
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.listar_arqueos_pendientes_deposito()
returns table (
  arqueo_id uuid,
  numero_arqueo bigint,
  fecha date,
  efectivo_recaudado numeric,
  monto_asignado numeric,
  monto_disponible numeric
)
language sql
stable
as $$
  select
    a.id,
    a.numero_arqueo,
    a.fecha,
    a.total_efectivo,
    coalesce(sum(da.monto_aplicado) filter (where d.estado <> 'anulado'), 0),
    a.total_efectivo
      - coalesce(sum(da.monto_aplicado) filter (where d.estado <> 'anulado'), 0)
  from public.arqueos as a
  left join public.deposito_arqueos as da on da.arqueo_id = a.id
  left join public.depositos as d on d.id = da.deposito_id
  where a.estado in ('confirmado', 'con_diferencia')
  group by a.id
  having a.total_efectivo
    - coalesce(sum(da.monto_aplicado) filter (where d.estado <> 'anulado'), 0) > 0
  order by a.fecha, a.numero_arqueo;
$$;

create or replace function public.registrar_deposito(
  p_fecha_deposito date,
  p_banco text,
  p_referencia text,
  p_monto_depositado numeric,
  p_asignaciones jsonb,
  p_evidencia_url text default null,
  p_observaciones text default null
)
returns table (
  deposito_id uuid,
  numero_deposito bigint,
  fecha_deposito date,
  banco text,
  referencia text,
  monto_esperado numeric,
  monto_depositado numeric,
  diferencia numeric,
  estado text,
  evidencia_url text,
  observaciones text
)
language plpgsql
as $$
declare
  v_banco text := regexp_replace(btrim(coalesce(p_banco, '')), '\s+', ' ', 'g');
  v_referencia text := upper(regexp_replace(btrim(coalesce(p_referencia, '')), '\s+', '', 'g'));
  v_evidencia text := nullif(btrim(coalesce(p_evidencia_url, '')), '');
  v_observaciones text := nullif(btrim(coalesce(p_observaciones, '')), '');
  v_monto_esperado numeric(12, 2);
  v_deposito public.depositos%rowtype;
  v_asignacion record;
  v_disponible numeric(12, 2);
begin
  if p_fecha_deposito is null or p_fecha_deposito > current_date then
    raise exception using errcode = 'P0001', message = 'FECHA_DEPOSITO_INVALIDA';
  end if;

  if char_length(v_banco) not between 2 and 100
    or char_length(v_referencia) not between 3 and 100 then
    raise exception using errcode = 'P0001', message = 'DATOS_DEPOSITO_INVALIDOS';
  end if;

  if p_monto_depositado is null
    or p_monto_depositado <= 0
    or p_monto_depositado > 99999999.99 then
    raise exception using errcode = 'P0001', message = 'MONTO_DEPOSITO_INVALIDO';
  end if;

  if p_asignaciones is null
    or jsonb_typeof(p_asignaciones) <> 'array'
    or jsonb_array_length(p_asignaciones) = 0
    or jsonb_array_length(p_asignaciones) > 100 then
    raise exception using errcode = 'P0001', message = 'ASIGNACIONES_DEPOSITO_INVALIDAS';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_asignaciones)
      as x(arqueo_id uuid, monto numeric)
    where x.arqueo_id is null or x.monto is null or x.monto <= 0
  ) or exists (
    select 1
    from jsonb_to_recordset(p_asignaciones)
      as x(arqueo_id uuid, monto numeric)
    group by x.arqueo_id
    having count(*) > 1
  ) then
    raise exception using errcode = 'P0001', message = 'DETALLE_DEPOSITO_INVALIDO';
  end if;

  for v_asignacion in
    select x.arqueo_id, x.monto
    from jsonb_to_recordset(p_asignaciones)
      as x(arqueo_id uuid, monto numeric)
  loop
    perform 1
    from public.arqueos as a
    where a.id = v_asignacion.arqueo_id
      and a.estado in ('confirmado', 'con_diferencia')
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'ARQUEO_NO_DISPONIBLE';
    end if;

    select
      a.total_efectivo
        - coalesce(sum(da.monto_aplicado) filter (where d.estado <> 'anulado'), 0)
    into v_disponible
    from public.arqueos as a
    left join public.deposito_arqueos as da on da.arqueo_id = a.id
    left join public.depositos as d on d.id = da.deposito_id
    where a.id = v_asignacion.arqueo_id
      and a.estado in ('confirmado', 'con_diferencia')
    group by a.id;

    if not found then
      raise exception using errcode = 'P0001', message = 'ARQUEO_NO_DISPONIBLE';
    end if;

    if v_asignacion.monto > v_disponible then
      raise exception using errcode = 'P0001', message = 'MONTO_EXCEDE_ARQUEO';
    end if;
  end loop;

  select sum(x.monto)
  into v_monto_esperado
  from jsonb_to_recordset(p_asignaciones)
    as x(arqueo_id uuid, monto numeric);

  insert into public.depositos (
    fecha_deposito,
    banco,
    referencia,
    monto_esperado,
    monto_depositado,
    estado,
    evidencia_url,
    observaciones
  )
  values (
    p_fecha_deposito,
    v_banco,
    v_referencia,
    v_monto_esperado,
    p_monto_depositado,
    case
      when p_monto_depositado = v_monto_esperado then 'conciliado'
      else 'con_diferencia'
    end,
    v_evidencia,
    v_observaciones
  )
  returning * into v_deposito;

  insert into public.deposito_arqueos (
    deposito_id,
    arqueo_id,
    monto_aplicado
  )
  select
    v_deposito.id,
    x.arqueo_id,
    x.monto
  from jsonb_to_recordset(p_asignaciones)
    as x(arqueo_id uuid, monto numeric);

  return query
  select
    v_deposito.id,
    v_deposito.numero_deposito,
    v_deposito.fecha_deposito,
    v_deposito.banco,
    v_deposito.referencia,
    v_deposito.monto_esperado,
    v_deposito.monto_depositado,
    v_deposito.diferencia,
    v_deposito.estado,
    v_deposito.evidencia_url,
    v_deposito.observaciones;
end;
$$;

create or replace function public.obtener_deposito(
  p_deposito_id uuid
)
returns table (
  deposito jsonb,
  asignaciones jsonb
)
language sql
stable
as $$
  select
    to_jsonb(d),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'arqueo_id', a.id,
          'numero_arqueo', a.numero_arqueo,
          'fecha', a.fecha,
          'monto_aplicado', da.monto_aplicado
        )
        order by a.fecha, a.numero_arqueo
      ) filter (where da.id is not null),
      '[]'::jsonb
    )
  from public.depositos as d
  left join public.deposito_arqueos as da on da.deposito_id = d.id
  left join public.arqueos as a on a.id = da.arqueo_id
  where d.id = p_deposito_id
  group by d.id;
$$;

create or replace function public.listar_depositos(
  p_desde date default null,
  p_hasta date default null,
  p_estado text default null
)
returns setof public.depositos
language sql
stable
as $$
  select d.*
  from public.depositos as d
  where (p_desde is null or d.fecha_deposito >= p_desde)
    and (p_hasta is null or d.fecha_deposito <= p_hasta)
    and (
      nullif(btrim(coalesce(p_estado, '')), '') is null
      or d.estado = lower(btrim(p_estado))
    )
  order by d.fecha_deposito desc, d.numero_deposito desc;
$$;

create or replace function public.anular_deposito(
  p_deposito_id uuid,
  p_motivo text
)
returns setof public.depositos
language plpgsql
as $$
declare
  v_motivo text := regexp_replace(btrim(coalesce(p_motivo, '')), '\s+', ' ', 'g');
  v_deposito public.depositos%rowtype;
begin
  if char_length(v_motivo) not between 10 and 300 then
    raise exception using errcode = 'P0001', message = 'MOTIVO_ANULACION_INVALIDO';
  end if;

  update public.depositos
  set
    estado = 'anulado',
    anulado_en = now(),
    motivo_anulacion = v_motivo
  where id = p_deposito_id
    and estado <> 'anulado'
  returning * into v_deposito;

  if not found then
    raise exception using errcode = 'P0001', message = 'DEPOSITO_NO_DISPONIBLE';
  end if;

  return next v_deposito;
end;
$$;

-- ============================================================================
-- Fuente: src/modules/operacion-guiada/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Operación guiada
-- Este módulo no es dueño de tablas. Orquesta las estructuras de los módulos
-- Pacientes, Servicios, Comisiones, Caja, Arqueos y Depósitos.

-- ============================================================================
-- Fuente: src/modules/operacion-guiada/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Operación guiada
-- No requiere índices propios porque no crea tablas.

-- ============================================================================
-- Fuente: src/modules/operacion-guiada/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Operación guiada
-- RPC transaccionales que avanzan el flujo de trabajo.

create or replace function public.registrar_paciente_guiado(
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_fecha_nacimiento date,
  p_telefono text default null,
  p_correo text default null,
  p_direccion text default null,
  p_observaciones_atencion text default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text,
  tipo_documento text,
  numero_documento text,
  nombres text,
  apellidos text,
  fecha_nacimiento date
)
language plpgsql
as $$
declare
  v_tipo_documento text := lower(btrim(coalesce(p_tipo_documento, '')));
  v_numero_documento text := upper(
    regexp_replace(btrim(coalesce(p_numero_documento, '')), '\s+', '', 'g')
  );
  v_paciente public.pacientes%rowtype;
  v_atencion record;
begin
  -- La ficha del paciente es permanente. Si el documento ya existe, se crea
  -- únicamente una atención nueva con la categoría tarifaria seleccionada.
  select p.*
  into v_paciente
  from public.pacientes as p
  where p.tipo_documento = v_tipo_documento
    and lower(p.numero_documento) = lower(v_numero_documento)
  for update;

  if found then
    select *
    into v_atencion
    from public.crear_atencion_paciente(
      v_paciente.id,
      p_observaciones_atencion,
      p_categoria_tarifaria
    );
  else
    select *
    into v_atencion
    from public.registrar_paciente_atencion(
      p_tipo_documento,
      p_numero_documento,
      p_nombres,
      p_apellidos,
      p_fecha_nacimiento,
      p_telefono,
      p_correo,
      p_direccion,
      true,
      p_observaciones_atencion,
      p_categoria_tarifaria
    );

    select p.*
    into v_paciente
    from public.pacientes as p
    where p.id = v_atencion.paciente_id;
  end if;

  return query
  select
    v_paciente.id,
    v_atencion.atencion_id,
    v_atencion.numero_atencion,
    v_atencion.estado,
    v_paciente.tipo_documento,
    v_paciente.numero_documento,
    v_paciente.nombres,
    v_paciente.apellidos,
    v_paciente.fecha_nacimiento;
end;
$$;

create or replace function public.registrar_servicio_guiado(
  p_atencion_id uuid,
  p_servicio_id uuid,
  p_proveedor_id uuid,
  p_cantidad integer default 1
)
returns table (
  atencion_servicio_id uuid,
  atencion_id uuid,
  servicio_id uuid,
  tarifa_id uuid,
  cantidad smallint,
  monto_unitario numeric,
  subtotal numeric,
  moneda text,
  proveedor_id uuid,
  comision_id uuid,
  comision_unitaria numeric,
  comision_total numeric
)
language plpgsql
as $$
declare
  v_servicio record;
  v_proveedor record;
  v_codigo_servicio text;
  v_proveedor_id uuid;
  v_comision_id uuid;
  v_comision_unitaria numeric;
  v_comision_total numeric;
begin
  select *
  into v_servicio
  from public.asignar_servicio_atencion(
    p_atencion_id,
    p_servicio_id,
    p_cantidad
  );

  select s.codigo
  into v_codigo_servicio
  from public.servicios as s
  where s.id = v_servicio.servicio_id;

  -- El examen médico genera una comisión independiente para cada profesional
  -- que tenga una tarifa vigente. El examen de sangre no requiere proveedor.
  for v_proveedor in
    select pct.proveedor_id
    from public.proveedor_comision_tarifas as pct
    join public.proveedores as p on p.id = pct.proveedor_id
    where pct.servicio_id = v_servicio.servicio_id
      and p.estado = 'activo'
      and pct.vigente_desde <= current_date
      and (pct.vigente_hasta is null or pct.vigente_hasta >= current_date)
    order by p.especialidad, p.nombre_completo
  loop
    perform 1
    from public.asignar_proveedor_atencion_servicio(
      v_servicio.atencion_servicio_id,
      v_proveedor.proveedor_id
    );
  end loop;

  select
    c.proveedor_id,
    c.id,
    c.comision_unitaria,
    c.total
  into
    v_proveedor_id,
    v_comision_id,
    v_comision_unitaria,
    v_comision_total
  from public.atencion_servicio_comisiones as c
  where c.atencion_servicio_id = v_servicio.atencion_servicio_id
  order by c.created_at, c.id
  limit 1;

  if v_codigo_servicio = 'EX-MED' and v_proveedor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'EXAMEN_MEDICO_SIN_COMISIONES_VIGENTES';
  end if;

  return query
  select
    v_servicio.atencion_servicio_id,
    v_servicio.atencion_id,
    v_servicio.servicio_id,
    v_servicio.tarifa_id,
    v_servicio.cantidad,
    v_servicio.monto_unitario,
    v_servicio.subtotal,
    v_servicio.moneda,
    v_proveedor_id,
    v_comision_id,
    v_comision_unitaria,
    v_comision_total;
end;
$$;

create or replace function public.registrar_servicios_guiados(
  p_atencion_id uuid,
  p_asignaciones jsonb
)
returns table (
  atencion_servicio_id uuid,
  atencion_id uuid,
  servicio_id uuid,
  tarifa_id uuid,
  cantidad smallint,
  monto_unitario numeric,
  subtotal numeric,
  moneda text,
  proveedor_id uuid,
  comision_id uuid,
  comision_unitaria numeric,
  comision_total numeric
)
language plpgsql
as $$
declare
  v_asignacion jsonb;
begin
  if p_atencion_id is null then
    raise exception using errcode = 'P0001', message = 'ATENCION_NO_EXISTE';
  end if;

  if p_asignaciones is null
    or jsonb_typeof(p_asignaciones) <> 'array'
    or jsonb_array_length(p_asignaciones) not between 1 and 10 then
    raise exception using errcode = 'P0001', message = 'ASIGNACIONES_INVALIDAS';
  end if;

  for v_asignacion in
    select value from jsonb_array_elements(p_asignaciones)
  loop
    return query
    select r.*
    from public.registrar_servicio_guiado(
      p_atencion_id,
      nullif(v_asignacion ->> 'servicio_id', '')::uuid,
      nullif(v_asignacion ->> 'proveedor_id', '')::uuid,
      coalesce(nullif(v_asignacion ->> 'cantidad', '')::integer, 1)
    ) as r;
  end loop;
end;
$$;

create or replace function public.registrar_no_cobrado_atencion(
  p_atencion_id uuid,
  p_motivo text default null
)
returns table (
  atencion_id uuid,
  numero_atencion bigint,
  paciente_id uuid,
  estado text,
  motivo text,
  actualizado_en timestamptz
)
language plpgsql
as $$
declare
  v_atencion public.atenciones%rowtype;
  v_motivo text := nullif(
    regexp_replace(btrim(coalesce(p_motivo, '')), '\s+', ' ', 'g'),
    ''
  );
  v_actualizado_en timestamptz := now();
begin
  select *
  into v_atencion
  from public.atenciones as a
  where a.id = p_atencion_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ATENCION_NO_EXISTE';
  end if;

  if v_atencion.estado <> 'pendiente_pago' then
    raise exception using errcode = 'P0001', message = 'ESTADO_NO_PERMITE_NO_COBRO';
  end if;

  if not exists (
    select 1
    from public.atencion_servicios as ats
    where ats.atencion_id = p_atencion_id
  ) then
    raise exception using errcode = 'P0001', message = 'ATENCION_SIN_SERVICIOS';
  end if;

  if exists (
    select 1
    from public.recibos as r
    where r.atencion_id = p_atencion_id
      and r.estado = 'valido'
  ) then
    raise exception using errcode = 'P0001', message = 'ATENCION_CON_RECIBO_VALIDO';
  end if;

  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception using errcode = 'P0001', message = 'MOTIVO_NO_COBRO_INVALIDO';
  end if;

  update public.atenciones
  set estado = 'no_cobrada'
  where id = p_atencion_id;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    p_atencion_id,
    'no_cobro_registrado',
    v_atencion.estado,
    'no_cobrada',
    jsonb_build_object('motivo', v_motivo)
  );

  return query
  select
    v_atencion.id,
    v_atencion.numero_atencion,
    v_atencion.paciente_id,
    'no_cobrada'::text,
    v_motivo,
    v_actualizado_en;
end;
$$;

create or replace function public.listar_servicios_guiados_disponibles(
  p_fecha_referencia date default current_date,
  p_categoria_tarifaria text default 'general'
)
returns table (
  servicio_id uuid,
  codigo text,
  nombre text,
  descripcion text,
  tarifa_id uuid,
  monto numeric,
  moneda text,
  categoria_tarifaria text,
  proveedor_id uuid,
  proveedor_nombre text,
  especialidad text,
  comision_unitaria numeric
)
language plpgsql
stable
as $$
declare
  v_fecha date := coalesce(p_fecha_referencia, current_date);
  v_categoria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
begin
  if v_categoria not in ('general', 'tercera_edad', 'policia') then
    raise exception using errcode = 'P0001', message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  return query
  select
    s.id,
    s.codigo,
    s.nombre,
    s.descripcion,
    tarifa.id,
    tarifa.monto,
    tarifa.moneda,
    tarifa.categoria_tarifaria,
    proveedor.proveedor_id,
    proveedor.proveedor_nombre,
    proveedor.especialidad,
    proveedor.comision_unitaria
  from public.servicios as s
  join lateral (
    select t.*
    from public.servicio_tarifas as t
    where t.servicio_id = s.id
      and (
        t.categoria_tarifaria = v_categoria
        or (
          s.codigo = 'EX-SANGRE'
          and t.categoria_tarifaria = 'general'
        )
      )
      and t.vigente_desde <= v_fecha
      and (t.vigente_hasta is null or t.vigente_hasta >= v_fecha)
    order by
      case when t.categoria_tarifaria = v_categoria then 0 else 1 end,
      t.vigente_desde desc
    limit 1
  ) as tarifa on true
  left join lateral (
    select
      (array_agg(p.id order by p.especialidad, p.nombre_completo))[1]
        as proveedor_id,
      string_agg(
        p.nombre_completo,
        ' y '
        order by p.especialidad, p.nombre_completo
      ) as proveedor_nombre,
      (array_agg(p.especialidad order by p.especialidad))[1]
        as especialidad,
      coalesce(sum(pct.monto_unitario), 0) as comision_unitaria
    from public.proveedor_comision_tarifas as pct
    join public.proveedores as p on p.id = pct.proveedor_id
    where pct.servicio_id = s.id
      and p.estado = 'activo'
      and pct.vigente_desde <= v_fecha
      and (pct.vigente_hasta is null or pct.vigente_hasta >= v_fecha)
  ) as proveedor on true
  where s.estado = 'activo'
  order by s.nombre;
end;
$$;

create or replace function public.obtener_jornada_guiada()
returns table (
  jornada jsonb
)
language plpgsql
stable
as $$
declare
  v_caja public.caja_sesiones%rowtype;
begin
  select *
  into v_caja
  from public.caja_sesiones as cs
  where cs.codigo_caja = 'PRINCIPAL'
  order by
    case when cs.estado = 'abierta' then 0 else 1 end,
    cs.abierta_en desc
  limit 1;

  if not found then
    return query
    select jsonb_build_object(
      'caja', null,
      'resumen', jsonb_build_object(
        'pacientes', 0,
        'pagadas', 0,
        'no_cobradas', 0,
        'abandonadas', 0,
        'anuladas', 0,
        'total_cobrado', 0,
        'efectivo', 0,
        'transferencias', 0
      ),
      'deposito', null,
      'atenciones', '[]'::jsonb
    );
    return;
  end if;

  return query
  with atenciones_jornada as (
    select a.*
    from public.atenciones as a
    where a.created_at >= v_caja.abierta_en
      and a.created_at <= coalesce(v_caja.cerrada_en, now())
  ),
  pagos_jornada as (
    select distinct on (r.atencion_id)
      r.atencion_id,
      r.id as recibo_id,
      r.numero_recibo,
      r.total,
      r.estado as recibo_estado,
      r.emitido_en,
      r.anulado_en,
      r.motivo_anulacion,
      p.metodo,
      p.banco,
      p.referencia_transferencia
    from public.recibos as r
    join public.pagos as p on p.recibo_id = r.id
    where r.caja_sesion_id = v_caja.id
    order by
      r.atencion_id,
      (r.estado = 'valido') desc,
      r.emitido_en desc
  ),
  resumen as (
    select
      count(distinct aj.paciente_id) as pacientes,
      count(*) filter (where aj.estado = 'pagada') as pagadas,
      count(*) filter (where aj.estado = 'no_cobrada') as no_cobradas,
      count(*) filter (where aj.estado = 'abandonada') as abandonadas,
      count(*) filter (where aj.estado = 'anulada') as anuladas,
      coalesce(sum(pj.total) filter (where pj.recibo_estado = 'valido'), 0)
        as total_cobrado,
      coalesce(sum(pj.total) filter (
        where pj.recibo_estado = 'valido' and pj.metodo = 'efectivo'
      ), 0) as efectivo,
      coalesce(sum(pj.total) filter (
        where pj.recibo_estado = 'valido' and pj.metodo = 'transferencia'
      ), 0) as transferencias
    from atenciones_jornada as aj
    left join pagos_jornada as pj on pj.atencion_id = aj.id
  )
  select jsonb_build_object(
    'caja', jsonb_build_object(
      'id', v_caja.id,
      'estado', v_caja.estado,
      'monto_inicial', v_caja.monto_inicial,
      'abierta_en', v_caja.abierta_en,
      'observaciones_apertura', v_caja.observaciones_apertura,
      'cerrada_en', v_caja.cerrada_en,
      'efectivo_esperado', v_caja.efectivo_esperado,
      'efectivo_declarado', v_caja.efectivo_declarado,
      'diferencia', v_caja.diferencia,
      'observaciones_cierre', v_caja.observaciones_cierre
    ),
    'resumen', to_jsonb(resumen),
    'deposito', (
      select jsonb_build_object(
        'id', d.id,
        'numero', d.numero_deposito,
        'fecha', d.fecha_deposito,
        'banco', d.banco,
        'referencia', d.referencia,
        'monto_depositado', d.monto_depositado,
        'monto_aplicado', da.monto_aplicado,
        'estado', d.estado,
        'evidencia_url', d.evidencia_url,
        'observaciones', d.observaciones
      )
      from public.arqueos as a
      join public.deposito_arqueos as da on da.arqueo_id = a.id
      join public.depositos as d on d.id = da.deposito_id
      where a.caja_sesion_id = v_caja.id
        and d.estado <> 'anulado'
      order by d.created_at desc
      limit 1
    ),
    'atenciones', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'atencion_id', aj.id,
          'numero_atencion', aj.numero_atencion,
          'estado', aj.estado,
          'categoria_tarifaria', aj.categoria_tarifaria,
          'creada_en', aj.created_at,
          'motivo_abandono', aj.motivo_abandono,
          'paciente', jsonb_build_object(
            'id', p.id,
            'numero_documento', p.numero_documento,
            'nombre_completo', p.nombres || ' ' || p.apellidos,
            'nombres', p.nombres,
            'apellidos', p.apellidos,
            'fecha_nacimiento', p.fecha_nacimiento
          ),
          'servicios', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'atencion_servicio_id', ats.id,
                'servicio_id', s.id,
                'codigo', s.codigo,
                'nombre', s.nombre,
                'cantidad', ats.cantidad,
                'monto_unitario', ats.monto_unitario,
                'subtotal', ats.subtotal,
                'proveedor_id', proveedor.proveedor_id,
                'proveedor_nombre', proveedor.proveedor_nombre
              )
              order by ats.created_at
            )
            from public.atencion_servicios as ats
            join public.servicios as s on s.id = ats.servicio_id
            left join lateral (
              select
                (array_agg(pr.id order by pr.nombre_completo))[1]
                  as proveedor_id,
                string_agg(
                  distinct pr.nombre_completo,
                  ' y '
                  order by pr.nombre_completo
                ) as proveedor_nombre
              from public.atencion_servicio_comisiones as c
              join public.proveedores as pr on pr.id = c.proveedor_id
              where c.atencion_servicio_id = ats.id
            ) as proveedor on true
            where ats.atencion_id = aj.id
          ), '[]'::jsonb),
          'pago', case
            when pj.recibo_id is null then null
            else jsonb_build_object(
              'recibo_id', pj.recibo_id,
              'numero_recibo', pj.numero_recibo,
              'total', pj.total,
              'estado', pj.recibo_estado,
              'metodo', pj.metodo,
              'banco', pj.banco,
              'referencia', pj.referencia_transferencia,
              'emitido_en', pj.emitido_en,
              'anulado_en', pj.anulado_en,
              'motivo_anulacion', pj.motivo_anulacion
            )
          end
        )
        order by aj.created_at
      )
      from atenciones_jornada as aj
      join public.pacientes as p on p.id = aj.paciente_id
      left join pagos_jornada as pj on pj.atencion_id = aj.id
    ), '[]'::jsonb)
  )
  from resumen;
end;
$$;

create or replace function public.cerrar_jornada_guiada(
  p_efectivo_declarado numeric,
  p_deposito jsonb default null,
  p_observaciones text default null
)
returns table (
  resultado jsonb
)
language plpgsql
as $$
declare
  v_cierre record;
  v_arqueo record;
  v_arqueo_confirmado record;
  v_deposito record;
  v_deposito_id uuid;
  v_numero_deposito bigint;
  v_monto_depositado numeric;
  v_monto_aplicado numeric;
  v_fecha_deposito date;
begin
  select *
  into v_cierre
  from public.cerrar_caja_con_total(
    p_efectivo_declarado,
    p_observaciones
  );

  select *
  into v_arqueo
  from public.generar_arqueo_caja(v_cierre.caja_sesion_id);

  select *
  into v_arqueo_confirmado
  from public.confirmar_arqueo(
    v_arqueo.arqueo_id,
    case when v_arqueo.diferencia <> 0 then p_observaciones else null end
  );

  if p_deposito is not null and p_deposito <> '{}'::jsonb then
    if jsonb_typeof(p_deposito) <> 'object' then
      raise exception using errcode = 'P0001', message = 'DEPOSITO_CIERRE_INVALIDO';
    end if;

    v_monto_depositado := nullif(p_deposito ->> 'monto_depositado', '')::numeric;
    v_monto_aplicado := coalesce(
      nullif(p_deposito ->> 'monto_aplicado', '')::numeric,
      v_monto_depositado
    );
    v_fecha_deposito := coalesce(
      nullif(p_deposito ->> 'fecha_deposito', '')::date,
      current_date
    );

    select *
    into v_deposito
    from public.registrar_deposito(
      v_fecha_deposito,
      p_deposito ->> 'banco',
      p_deposito ->> 'referencia',
      v_monto_depositado,
      jsonb_build_array(
        jsonb_build_object(
          'arqueo_id', v_arqueo.arqueo_id,
          'monto', v_monto_aplicado
        )
      ),
      p_deposito ->> 'evidencia_url',
      p_deposito ->> 'observaciones'
    );

    v_deposito_id := v_deposito.deposito_id;
    v_numero_deposito := v_deposito.numero_deposito;
  end if;

  return query
  select jsonb_build_object(
    'caja_sesion_id', v_cierre.caja_sesion_id,
    'conteo_id', v_cierre.conteo_id,
    'arqueo_id', v_arqueo_confirmado.arqueo_id,
    'estado_arqueo', v_arqueo_confirmado.estado,
    'total_cobrado', v_arqueo_confirmado.total_cobrado,
    'efectivo_recaudado', v_arqueo_confirmado.total_efectivo,
    'transferencias', v_arqueo_confirmado.total_transferencias,
    'efectivo_esperado', v_cierre.efectivo_esperado,
    'efectivo_declarado', v_cierre.efectivo_declarado,
    'diferencia', v_cierre.diferencia,
    'deposito_id', v_deposito_id,
    'numero_deposito', v_numero_deposito
  );
end;
$$;

-- ============================================================================
-- Fuente: src/modules/reimpresion/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Reimpresión de recibos

create table if not exists public.recibo_reimpresiones (
  id uuid primary key default gen_random_uuid(),
  recibo_id uuid not null
    references public.recibos (id)
    on update restrict
    on delete restrict,
  operador_id uuid not null,
  reimpreso_en timestamptz not null default now()
);

-- ============================================================================
-- Fuente: src/modules/reimpresion/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Índices para auditoría de reimpresiones

create index if not exists recibo_reimpresiones_recibo_fecha_idx
  on public.recibo_reimpresiones (recibo_id, reimpreso_en desc);

-- ============================================================================
-- Fuente: src/modules/reimpresion/sql/03_functions.sql
-- ============================================================================

-- SIEMC · RPC de reimpresión protegida y verificación pública

create or replace function public.reimprimir_recibo(
  p_numero_recibo bigint,
  p_clave_administrativa text
)
returns table (
  recibo_id uuid,
  numero_recibo bigint,
  atencion_id uuid,
  numero_atencion bigint,
  emitido_en timestamptz,
  paciente_nombre text,
  numero_documento text,
  categoria_tarifaria text,
  servicios jsonb,
  total numeric,
  estado text,
  metodo text,
  monto_recibido numeric,
  cambio numeric,
  banco text,
  referencia_transferencia text,
  fecha_transferencia date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clave_configurada text;
  v_recibo public.recibos%rowtype;
  v_servicios jsonb;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'REIMPRESION_REQUIERE_AUTENTICACION';
  end if;

  if char_length(coalesce(p_clave_administrativa, '')) not between 12 and 128 then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_INVALIDA';
  end if;

  select secreto.decrypted_secret
  into v_clave_configurada
  from vault.decrypted_secrets as secreto
  where secreto.name = 'siemc_clave_anulacion'
  order by secreto.updated_at desc
  limit 1;

  if v_clave_configurada is null then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_NO_CONFIGURADA';
  end if;

  if p_clave_administrativa <> v_clave_configurada then
    raise exception using
      errcode = 'P0001',
      message = 'CLAVE_ANULACION_INVALIDA';
  end if;

  if p_numero_recibo is null or p_numero_recibo <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'NUMERO_RECIBO_INVALIDO';
  end if;

  select r.*
  into v_recibo
  from public.recibos as r
  where r.numero_recibo = p_numero_recibo;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RECIBO_NO_EXISTE';
  end if;

  if v_recibo.estado <> 'valido' then
    raise exception using
      errcode = 'P0001',
      message = 'RECIBO_NO_VALIDO';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'codigo', s.codigo,
        'nombre', s.nombre,
        'cantidad', ats.cantidad,
        'monto_unitario', ats.monto_unitario,
        'subtotal', ats.subtotal
      )
      order by ats.created_at, ats.id
    ),
    '[]'::jsonb
  )
  into v_servicios
  from public.atencion_servicios as ats
  join public.servicios as s
    on s.id = ats.servicio_id
  where ats.atencion_id = v_recibo.atencion_id;

  insert into public.recibo_reimpresiones (
    recibo_id,
    operador_id
  )
  values (
    v_recibo.id,
    auth.uid()
  );

  return query
  select
    v_recibo.id,
    v_recibo.numero_recibo,
    a.id,
    a.numero_atencion,
    v_recibo.emitido_en,
    concat_ws(' ', p.nombres, p.apellidos),
    p.numero_documento,
    a.categoria_tarifaria,
    v_servicios,
    v_recibo.total,
    v_recibo.estado,
    pg.metodo,
    pg.monto_recibido,
    pg.cambio,
    pg.banco,
    pg.referencia_transferencia,
    pg.fecha_transferencia
  from public.atenciones as a
  join public.pacientes as p
    on p.id = a.paciente_id
  join public.pagos as pg
    on pg.recibo_id = v_recibo.id
  where a.id = v_recibo.atencion_id;
end;
$$;

create or replace function public.verificar_recibo_publico(
  p_recibo_id uuid
)
returns table (
  recibo_id uuid,
  numero_recibo bigint,
  emitido_en timestamptz,
  total numeric,
  moneda text,
  estado text,
  es_valido boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.numero_recibo,
    r.emitido_en,
    r.total,
    r.moneda,
    r.estado,
    r.estado = 'valido'
  from public.recibos as r
  where r.id = p_recibo_id;
$$;

-- ============================================================================
-- Fuente: src/modules/reportes/sql/01_tables.sql
-- ============================================================================

-- SIEMC · Informes mensuales
-- Requiere Personal, Comisiones y Caja.

create table if not exists public.informes_mensuales (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  encabezado text not null,
  pacientes_atendidos integer not null default 0,
  examenes_medicos integer not null default 0,
  examenes_tipo_sangre integer not null default 0,
  ingresos_brutos numeric(12, 2) not null default 0,
  total_comisiones numeric(12, 2) not null default 0,
  total_salarios numeric(12, 2) not null default 0,
  ganancia_general numeric(12, 2) not null default 0,
  estado text not null default 'generado',
  generado_en timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint informes_mensuales_periodo_check
    check (periodo = date_trunc('month', periodo)::date),
  constraint informes_mensuales_encabezado_check
    check (char_length(btrim(encabezado)) between 50 and 1000),
  constraint informes_mensuales_conteos_check
    check (
      pacientes_atendidos >= 0
      and examenes_medicos >= 0
      and examenes_tipo_sangre >= 0
    ),
  constraint informes_mensuales_totales_check
    check (
      ingresos_brutos >= 0
      and total_comisiones >= 0
      and total_salarios >= 0
      and ganancia_general
        = ingresos_brutos - total_comisiones - total_salarios
    ),
  constraint informes_mensuales_estado_check
    check (estado = 'generado')
);

-- Migra instalaciones anteriores sin perder los informes ya generados.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'informes_mensuales'
      and column_name = 'examenes_psicologicos'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'informes_mensuales'
      and column_name = 'examenes_tipo_sangre'
  ) then
    alter table public.informes_mensuales
      rename column examenes_psicologicos to examenes_tipo_sangre;
  end if;
end;
$$;

create table if not exists public.informe_mensual_servicios (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null
    references public.informes_mensuales (id)
    on update restrict
    on delete restrict,
  servicio_id uuid not null
    references public.servicios (id)
    on update restrict
    on delete restrict,
  categoria text not null,
  cantidad integer not null,
  ingreso numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint informe_mensual_servicios_categoria_check
    check (
      categoria in (
        'general',
        'tercera_edad',
        'policia',
        'medico',
        'psicologico',
        'tipo_sangre'
      )
    ),
  constraint informe_mensual_servicios_totales_check
    check (cantidad >= 0 and ingreso >= 0),
  constraint informe_mensual_servicios_relacion_uq
    unique (informe_id, servicio_id, categoria)
);

-- Las categorías de los informes nuevos son las categorías tarifarias. Se
-- conservan los valores anteriores para que los cortes históricos sigan siendo
-- consultables.
alter table public.informe_mensual_servicios
  drop constraint if exists informe_mensual_servicios_categoria_check;

alter table public.informe_mensual_servicios
  add constraint informe_mensual_servicios_categoria_check
  check (
    categoria in (
      'general',
      'tercera_edad',
      'policia',
      'medico',
      'psicologico',
      'tipo_sangre'
    )
  );

create table if not exists public.informe_mensual_comisiones (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null
    references public.informes_mensuales (id)
    on update restrict
    on delete restrict,
  proveedor_id uuid not null
    references public.proveedores (id)
    on update restrict
    on delete restrict,
  especialidad text not null,
  servicios_cantidad integer not null,
  comision_total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint informe_mensual_comisiones_especialidad_check
    check (especialidad in ('medicina', 'psicologia')),
  constraint informe_mensual_comisiones_totales_check
    check (servicios_cantidad >= 0 and comision_total >= 0),
  constraint informe_mensual_comisiones_proveedor_uq
    unique (informe_id, proveedor_id)
);

create table if not exists public.informe_mensual_salarios (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null
    references public.informes_mensuales (id)
    on update restrict
    on delete restrict,
  personal_id uuid not null
    references public.personal (id)
    on update restrict
    on delete restrict,
  nombre_completo text not null,
  cargo text not null,
  salario numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint informe_mensual_salarios_monto_check
    check (salario >= 0),
  constraint informe_mensual_salarios_personal_uq
    unique (informe_id, personal_id)
);

create table if not exists public.informe_mensual_diario (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null
    references public.informes_mensuales (id)
    on update restrict
    on delete restrict,
  fecha date not null,
  pacientes_atendidos integer not null default 0,
  recibos_validos integer not null default 0,
  examenes_medicos_general integer not null default 0,
  examenes_medicos_tercera_edad integer not null default 0,
  examenes_medicos_policia integer not null default 0,
  examenes_tipo_sangre integer not null default 0,
  examenes_medicos_anulados integer not null default 0,
  examenes_tipo_sangre_anulados integer not null default 0,
  recibos_anulados integer not null default 0,
  atenciones_no_cobradas integer not null default 0,
  ingresos numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint informe_mensual_diario_conteos_check
    check (
      pacientes_atendidos >= 0
      and recibos_validos >= 0
      and examenes_medicos_general >= 0
      and examenes_medicos_tercera_edad >= 0
      and examenes_medicos_policia >= 0
      and examenes_tipo_sangre >= 0
      and examenes_medicos_anulados >= 0
      and examenes_tipo_sangre_anulados >= 0
      and recibos_anulados >= 0
      and atenciones_no_cobradas >= 0
      and ingresos >= 0
    ),
  constraint informe_mensual_diario_fecha_uq
    unique (informe_id, fecha)
);

-- ============================================================================
-- Fuente: src/modules/reportes/sql/02_indexes.sql
-- ============================================================================

-- SIEMC · Informes mensuales

create unique index if not exists informes_mensuales_periodo_uq
  on public.informes_mensuales (periodo);

create index if not exists informes_mensuales_generado_idx
  on public.informes_mensuales (generado_en desc);

create index if not exists informe_mensual_servicios_informe_idx
  on public.informe_mensual_servicios (informe_id, categoria);

create index if not exists informe_mensual_comisiones_informe_idx
  on public.informe_mensual_comisiones (informe_id, especialidad);

create index if not exists informe_mensual_salarios_informe_idx
  on public.informe_mensual_salarios (informe_id, cargo);

create index if not exists informe_mensual_diario_informe_fecha_idx
  on public.informe_mensual_diario (informe_id, fecha);

-- ============================================================================
-- Fuente: src/modules/reportes/sql/03_functions.sql
-- ============================================================================

-- SIEMC · Informes mensuales

drop trigger if exists informes_mensuales_actualizar_updated_at on public.informes_mensuales;

create trigger informes_mensuales_actualizar_updated_at
before update on public.informes_mensuales
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.generar_informe_mensual(
  p_periodo date
)
returns table (
  informe_id uuid,
  periodo date,
  pacientes_atendidos integer,
  examenes_medicos integer,
  examenes_tipo_sangre integer,
  ingresos_brutos numeric,
  total_comisiones numeric,
  total_salarios numeric,
  ganancia_general numeric,
  generado_en timestamptz
)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_periodo date := date_trunc('month', p_periodo)::date;
  v_fin date := (v_periodo + interval '1 month')::date;
  v_fecha_corte date := (v_fin - interval '1 day')::date;
  v_encabezado text :=
    'Informe mensual de la Clínica Municipal sobre los exámenes médicos y '
    || 'exámenes de tipo de sangre respaldados por recibos válidos, las '
    || 'personas atendidas, las comisiones de los profesionales, los salarios '
    || 'del personal y el resultado financiero del período.';
  v_informe public.informes_mensuales%rowtype;
  v_pacientes integer;
  v_medicos integer;
  v_tipo_sangre integer;
  v_ingresos numeric(12, 2);
  v_comisiones numeric(12, 2);
  v_salarios numeric(12, 2);
begin
  if p_periodo is null then
    raise exception using errcode = 'P0001', message = 'PERIODO_INVALIDO';
  end if;

  perform 1
  from public.generar_liquidacion_comisiones(v_periodo);

  select i.*
  into v_informe
  from public.informes_mensuales as i
  where i.periodo = v_periodo
  for update;

  if not found then
    insert into public.informes_mensuales (
      periodo,
      encabezado
    )
    values (
      v_periodo,
      v_encabezado
    )
    returning * into v_informe;
  else
    update public.informes_mensuales as i
    set
      encabezado = v_encabezado,
      generado_en = now()
    where i.id = v_informe.id
    returning i.* into v_informe;
  end if;

  delete from public.informe_mensual_diario as d
  where d.informe_id = v_informe.id;

  delete from public.informe_mensual_servicios as d
  where d.informe_id = v_informe.id;

  delete from public.informe_mensual_comisiones as d
  where d.informe_id = v_informe.id;

  delete from public.informe_mensual_salarios as d
  where d.informe_id = v_informe.id;

  -- Solo los servicios respaldados por recibos válidos forman parte de los
  -- conteos operativos y financieros del informe.
  insert into public.informe_mensual_servicios (
    informe_id,
    servicio_id,
    categoria,
    cantidad,
    ingreso
  )
  select
    v_informe.id,
    ats.servicio_id,
    a.categoria_tarifaria,
    sum(ats.cantidad)::integer,
    sum(ats.subtotal)
  from public.recibos as r
  join public.atenciones as a on a.id = r.atencion_id
  join public.atencion_servicios as ats on ats.atencion_id = a.id
  where r.estado = 'valido'
    and r.emitido_en >= v_periodo
    and r.emitido_en < v_fin
  group by ats.servicio_id, a.categoria_tarifaria;

  insert into public.informe_mensual_diario (
    informe_id,
    fecha,
    pacientes_atendidos,
    recibos_validos,
    examenes_medicos_general,
    examenes_medicos_tercera_edad,
    examenes_medicos_policia,
    examenes_tipo_sangre,
    examenes_medicos_anulados,
    examenes_tipo_sangre_anulados,
    recibos_anulados,
    atenciones_no_cobradas,
    ingresos
  )
  with fechas as (
    select gs::date as fecha
    from generate_series(
      v_periodo,
      v_fin - interval '1 day',
      interval '1 day'
    ) as gs
  )
  select
    v_informe.id,
    f.fecha,
    (
      select count(distinct a.paciente_id)::integer
      from public.recibos as r
      join public.atenciones as a on a.id = r.atencion_id
      where r.estado = 'valido'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select count(*)::integer
      from public.recibos as r
      where r.estado = 'valido'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atenciones as a on a.id = r.atencion_id
      join public.atencion_servicios as ats on ats.atencion_id = a.id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'valido'
        and s.codigo = 'EX-MED'
        and a.categoria_tarifaria = 'general'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atenciones as a on a.id = r.atencion_id
      join public.atencion_servicios as ats on ats.atencion_id = a.id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'valido'
        and s.codigo = 'EX-MED'
        and a.categoria_tarifaria = 'tercera_edad'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atenciones as a on a.id = r.atencion_id
      join public.atencion_servicios as ats on ats.atencion_id = a.id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'valido'
        and s.codigo = 'EX-MED'
        and a.categoria_tarifaria = 'policia'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atencion_servicios as ats on ats.atencion_id = r.atencion_id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'valido'
        and s.codigo = 'EX-SANGRE'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atencion_servicios as ats on ats.atencion_id = r.atencion_id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'anulado'
        and s.codigo = 'EX-MED'
        and r.anulado_en >= f.fecha
        and r.anulado_en < f.fecha + 1
    ),
    (
      select coalesce(sum(ats.cantidad), 0)::integer
      from public.recibos as r
      join public.atencion_servicios as ats on ats.atencion_id = r.atencion_id
      join public.servicios as s on s.id = ats.servicio_id
      where r.estado = 'anulado'
        and s.codigo = 'EX-SANGRE'
        and r.anulado_en >= f.fecha
        and r.anulado_en < f.fecha + 1
    ),
    (
      select count(*)::integer
      from public.recibos as r
      where r.estado = 'anulado'
        and r.anulado_en >= f.fecha
        and r.anulado_en < f.fecha + 1
    ),
    (
      select count(*)::integer
      from public.atenciones as a
      where a.estado in ('no_cobrada', 'abandonada', 'anulada')
        and coalesce(a.abandonada_en, a.updated_at, a.created_at) >= f.fecha
        and coalesce(a.abandonada_en, a.updated_at, a.created_at) < f.fecha + 1
    ),
    (
      select coalesce(sum(r.total), 0)
      from public.recibos as r
      where r.estado = 'valido'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    )
  from fechas as f
  where exists (
      select 1
      from public.recibos as r
      where r.estado = 'valido'
        and r.emitido_en >= f.fecha
        and r.emitido_en < f.fecha + 1
    )
    or exists (
      select 1
      from public.recibos as r
      where r.estado = 'anulado'
        and r.anulado_en >= f.fecha
        and r.anulado_en < f.fecha + 1
    )
    or exists (
      select 1
      from public.atenciones as a
      where a.estado in ('no_cobrada', 'abandonada', 'anulada')
        and coalesce(a.abandonada_en, a.updated_at, a.created_at) >= f.fecha
        and coalesce(a.abandonada_en, a.updated_at, a.created_at) < f.fecha + 1
    );

  insert into public.informe_mensual_comisiones (
    informe_id,
    proveedor_id,
    especialidad,
    servicios_cantidad,
    comision_total
  )
  select
    v_informe.id,
    d.proveedor_id,
    p.especialidad,
    d.servicios_cantidad,
    d.total
  from public.comision_liquidaciones as l
  join public.comision_liquidacion_detalles as d
    on d.liquidacion_id = l.id
  join public.proveedores as p on p.id = d.proveedor_id
  where l.periodo = v_periodo;

  insert into public.informe_mensual_salarios (
    informe_id,
    personal_id,
    nombre_completo,
    cargo,
    salario
  )
  select
    v_informe.id,
    p.id,
    p.nombre_completo,
    p.cargo,
    s.monto
  from public.personal as p
  join lateral (
    select ps.monto
    from public.personal_salarios as ps
    where ps.personal_id = p.id
      and ps.vigente_desde <= v_fecha_corte
      and (ps.vigente_hasta is null or ps.vigente_hasta >= v_fecha_corte)
    order by ps.vigente_desde desc
    limit 1
  ) as s on true
  where p.estado = 'activo';

  select count(distinct a.paciente_id)::integer
  into v_pacientes
  from public.recibos as r
  join public.atenciones as a on a.id = r.atencion_id
  where r.estado = 'valido'
    and r.emitido_en >= v_periodo
    and r.emitido_en < v_fin;

  select
    coalesce(sum(d.cantidad) filter (where s.codigo = 'EX-MED'), 0)::integer,
    coalesce(sum(d.cantidad) filter (where s.codigo = 'EX-SANGRE'), 0)::integer
  into v_medicos, v_tipo_sangre
  from public.informe_mensual_servicios as d
  join public.servicios as s on s.id = d.servicio_id
  where d.informe_id = v_informe.id;

  select coalesce(sum(r.total), 0)
  into v_ingresos
  from public.recibos as r
  where r.estado = 'valido'
    and r.emitido_en >= v_periodo
    and r.emitido_en < v_fin;

  select coalesce(sum(c.comision_total), 0)
  into v_comisiones
  from public.informe_mensual_comisiones as c
  where c.informe_id = v_informe.id;

  select coalesce(sum(s.salario), 0)
  into v_salarios
  from public.informe_mensual_salarios as s
  where s.informe_id = v_informe.id;

  update public.informes_mensuales as i
  set
    pacientes_atendidos = coalesce(v_pacientes, 0),
    examenes_medicos = coalesce(v_medicos, 0),
    examenes_tipo_sangre = coalesce(v_tipo_sangre, 0),
    ingresos_brutos = coalesce(v_ingresos, 0),
    total_comisiones = coalesce(v_comisiones, 0),
    total_salarios = coalesce(v_salarios, 0),
    ganancia_general = coalesce(v_ingresos, 0)
      - coalesce(v_comisiones, 0)
      - coalesce(v_salarios, 0),
    generado_en = now()
  where i.id = v_informe.id
  returning i.* into v_informe;

  return query
  select
    v_informe.id,
    v_informe.periodo,
    v_informe.pacientes_atendidos,
    v_informe.examenes_medicos,
    v_informe.examenes_tipo_sangre,
    v_informe.ingresos_brutos,
    v_informe.total_comisiones,
    v_informe.total_salarios,
    v_informe.ganancia_general,
    v_informe.generado_en;
end;
$$;

create or replace function public.obtener_informe_mensual(
  p_periodo date
)
returns table (
  informe jsonb
)
language sql
stable
as $$
  select jsonb_build_object(
    'id', i.id,
    'periodo', i.periodo,
    'encabezado', i.encabezado,
    'generado_en', i.generado_en,
    'pacientes_atendidos', i.pacientes_atendidos,
    'recibos_validos', coalesce((
      select sum(d.recibos_validos)
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), 0),
    'recibos_anulados', coalesce((
      select sum(d.recibos_anulados)
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), 0),
    'atenciones_no_cobradas', coalesce((
      select sum(d.atenciones_no_cobradas)
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), 0),
    'examenes_medicos', i.examenes_medicos,
    'examenes_tipo_sangre', i.examenes_tipo_sangre,
    'examenes_medicos_anulados', coalesce((
      select sum(d.examenes_medicos_anulados)
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), 0),
    'examenes_tipo_sangre_anulados', coalesce((
      select sum(d.examenes_tipo_sangre_anulados)
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), 0),
    'ingresos_brutos', i.ingresos_brutos,
    'total_comisiones', i.total_comisiones,
    'total_salarios', i.total_salarios,
    'ganancia_general', i.ganancia_general,
    'servicios', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'servicio_id', d.servicio_id,
          'codigo', s.codigo,
          'nombre', s.nombre,
          'categoria_tarifaria', d.categoria,
          'cantidad', d.cantidad,
          'ingreso', d.ingreso
        )
        order by
          s.codigo,
          case d.categoria
            when 'general' then 1
            when 'tercera_edad' then 2
            when 'policia' then 3
            else 4
          end
      )
      from public.informe_mensual_servicios as d
      join public.servicios as s on s.id = d.servicio_id
      where d.informe_id = i.id
    ), '[]'::jsonb),
    'detalle_diario', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'fecha', d.fecha,
          'pacientes_atendidos', d.pacientes_atendidos,
          'recibos_validos', d.recibos_validos,
          'examenes_medicos_general', d.examenes_medicos_general,
          'examenes_medicos_tercera_edad', d.examenes_medicos_tercera_edad,
          'examenes_medicos_policia', d.examenes_medicos_policia,
          'examenes_tipo_sangre', d.examenes_tipo_sangre,
          'examenes_medicos_anulados', d.examenes_medicos_anulados,
          'examenes_tipo_sangre_anulados', d.examenes_tipo_sangre_anulados,
          'recibos_anulados', d.recibos_anulados,
          'atenciones_no_cobradas', d.atenciones_no_cobradas,
          'ingresos', d.ingresos
        )
        order by d.fecha
      )
      from public.informe_mensual_diario as d
      where d.informe_id = i.id
    ), '[]'::jsonb),
    'comisiones', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'proveedor_id', d.proveedor_id,
          'proveedor', p.nombre_completo,
          'especialidad', d.especialidad,
          'servicios', d.servicios_cantidad,
          'comision_promedio', case
            when d.servicios_cantidad = 0 then 0
            else d.comision_total / d.servicios_cantidad
          end,
          'total', d.comision_total
        )
        order by d.especialidad, p.nombre_completo
      )
      from public.informe_mensual_comisiones as d
      join public.proveedores as p on p.id = d.proveedor_id
      where d.informe_id = i.id
    ), '[]'::jsonb),
    'salarios', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'personal_id', d.personal_id,
          'persona', d.nombre_completo,
          'cargo', d.cargo,
          'salario', d.salario
        )
        order by d.cargo, d.nombre_completo
      )
      from public.informe_mensual_salarios as d
      where d.informe_id = i.id
    ), '[]'::jsonb)
  )
  from public.informes_mensuales as i
  where i.periodo = date_trunc('month', p_periodo)::date;
$$;

create or replace function public.listar_informes_mensuales()
returns setof public.informes_mensuales
language sql
stable
as $$
  select i.*
  from public.informes_mensuales as i
  order by i.periodo desc;
$$;

-- ============================================================================
-- Fuente: src/modules/autenticacion/sql/01_permissions.sql
-- ============================================================================

-- SIEMC · Autenticación y permisos para el acceso interno único.
-- Debe ejecutarse después de crear todas las tablas, secuencias y funciones.

-- PUBLIC incluye a todos los roles. Es necesario retirar sus permisos para que
-- una revocación aplicada únicamente a anon no sea anulada por esa herencia.
revoke usage on schema public from public;
revoke all privileges on all tables in schema public from public, anon;
revoke all privileges on all sequences in schema public from public, anon;
revoke execute on all functions in schema public from public, anon;

-- Los operadores autenticados nunca pueden leer directamente los secretos.
-- La anulación accede a su clave únicamente dentro de la RPC protegida.
revoke usage on schema vault from public, anon, authenticated;
revoke all privileges on all tables in schema vault
  from public, anon, authenticated;

-- La cuenta interna autenticada utiliza las RPC existentes, que son funciones
-- invocadoras y por ello necesitan permisos sobre sus tablas y secuencias.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select, update on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Los movimientos financieros no se actualizan ni eliminan directamente
-- desde el Data API. La RPC protegida conserva los privilegios de su dueño.
revoke update, delete on public.recibos from authenticated;
revoke update, delete on public.pagos from authenticated;
revoke select, insert, update, delete
  on public.recibo_reimpresiones from authenticated;

-- El QR puede comprobarse sin iniciar sesión. La RPC SECURITY DEFINER expone
-- exclusivamente los datos mínimos del comprobante y no habilita sus tablas.
grant usage on schema public to anon;
grant execute on function public.verificar_recibo_publico(uuid) to anon;

-- Mantener la misma política para objetos que se agreguen en futuras versiones.
alter default privileges in schema public
  revoke all privileges on tables from public, anon;
alter default privileges in schema public
  revoke all privileges on sequences from public, anon;
alter default privileges in schema public
  revoke execute on functions from public, anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select, update on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

commit;

-- Publicar inmediatamente las RPC y columnas nuevas en Supabase Data API.
notify pgrst, 'reload schema';
