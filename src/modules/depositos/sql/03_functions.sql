-- SIEMC · Depósitos bancarios

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
