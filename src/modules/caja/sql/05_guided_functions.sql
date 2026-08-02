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
