-- SIEMC · Informes mensuales

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
