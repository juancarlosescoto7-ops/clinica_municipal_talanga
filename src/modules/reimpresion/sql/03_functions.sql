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
