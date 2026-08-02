-- SIEMC · Informes mensuales
-- Requiere Personal, Comisiones y Caja.

create table public.informes_mensuales (
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

create table public.informe_mensual_servicios (
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

create table public.informe_mensual_comisiones (
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

create table public.informe_mensual_salarios (
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

create table public.informe_mensual_diario (
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
