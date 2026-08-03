-- SIEMC · Fase 3 · Caja y pagos
-- Funciones de caja. La anulación usa SECURITY DEFINER exclusivamente para
-- verificar un secreto cifrado de Supabase Vault con search_path vacío.

create trigger caja_sesiones_actualizar_updated_at
before update on public.caja_sesiones
for each row
execute function public.siemc_actualizar_updated_at();

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

create trigger recibos_proteger_anulacion_administrativa
before update of estado on public.recibos
for each row
when (old.estado is distinct from new.estado and new.estado = 'anulado')
execute function public.siemc_proteger_anulacion_administrativa();

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
