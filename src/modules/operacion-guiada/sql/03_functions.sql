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
