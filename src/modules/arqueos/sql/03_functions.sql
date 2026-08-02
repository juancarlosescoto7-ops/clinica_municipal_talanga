-- SIEMC · Arqueos diarios

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
