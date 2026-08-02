-- SIEMC · Fase 2 · Servicios y tarifas
-- Funciones invocadoras. No se crean permisos, roles ni políticas RLS.

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
