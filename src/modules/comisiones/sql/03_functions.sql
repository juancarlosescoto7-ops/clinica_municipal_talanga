-- SIEMC · Proveedores y comisiones
-- No se crean permisos, roles ni políticas RLS.

create trigger proveedores_actualizar_updated_at
before update on public.proveedores
for each row
execute function public.siemc_actualizar_updated_at();

create trigger comision_liquidaciones_actualizar_updated_at
before update on public.comision_liquidaciones
for each row
execute function public.siemc_actualizar_updated_at();

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
