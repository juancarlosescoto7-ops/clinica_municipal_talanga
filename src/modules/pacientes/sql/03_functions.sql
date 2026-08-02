-- SIEMC · Fase 1 · Pacientes y atenciones
-- Funciones invocadoras. No se crean permisos, roles ni políticas RLS.

create or replace function public.siemc_actualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger pacientes_actualizar_updated_at
before update on public.pacientes
for each row
execute function public.siemc_actualizar_updated_at();

create trigger atenciones_actualizar_updated_at
before update on public.atenciones
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.registrar_paciente_atencion(
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_fecha_nacimiento date,
  p_telefono text default null,
  p_correo text default null,
  p_direccion text default null,
  p_crear_atencion boolean default true,
  p_observaciones_atencion text default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_tipo_documento text := lower(btrim(coalesce(p_tipo_documento, '')));
  v_numero_documento text := upper(regexp_replace(btrim(coalesce(p_numero_documento, '')), '\s+', '', 'g'));
  v_nombres text := regexp_replace(btrim(coalesce(p_nombres, '')), '\s+', ' ', 'g');
  v_apellidos text := regexp_replace(btrim(coalesce(p_apellidos, '')), '\s+', ' ', 'g');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_correo text := lower(nullif(btrim(coalesce(p_correo, '')), ''));
  v_direccion text := nullif(regexp_replace(btrim(coalesce(p_direccion, '')), '\s+', ' ', 'g'), '');
  v_observaciones text := nullif(btrim(coalesce(p_observaciones_atencion, '')), '');
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
  v_paciente_id uuid;
  v_atencion_id uuid;
  v_numero_atencion bigint;
  v_estado text;
begin
  if v_tipo_documento not in ('identidad', 'pasaporte', 'residencia', 'otro') then
    raise exception using
      errcode = 'P0001',
      message = 'TIPO_DOCUMENTO_INVALIDO';
  end if;

  if v_tipo_documento = 'identidad' and v_numero_documento !~ '^[0-9]{13}$' then
    raise exception using
      errcode = 'P0001',
      message = 'IDENTIDAD_INVALIDA';
  end if;

  if v_tipo_documento <> 'identidad' and v_numero_documento !~ '^[A-Z0-9-]{4,30}$' then
    raise exception using
      errcode = 'P0001',
      message = 'DOCUMENTO_INVALIDO';
  end if;

  if char_length(v_nombres) not between 2 and 100 then
    raise exception using
      errcode = 'P0001',
      message = 'NOMBRES_INVALIDOS';
  end if;

  if char_length(v_apellidos) not between 2 and 100 then
    raise exception using
      errcode = 'P0001',
      message = 'APELLIDOS_INVALIDOS';
  end if;

  if p_fecha_nacimiento is null or p_fecha_nacimiento > current_date then
    raise exception using
      errcode = 'P0001',
      message = 'FECHA_NACIMIENTO_INVALIDA';
  end if;

  if v_telefono is not null and (
    v_telefono !~ '^[0-9+() -]{8,20}$'
    or char_length(regexp_replace(v_telefono, '[^0-9]', '', 'g')) < 8
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'TELEFONO_INVALIDO';
  end if;

  if v_correo is not null and (
    char_length(v_correo) > 160
    or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CORREO_INVALIDO';
  end if;

  if v_direccion is not null and char_length(v_direccion) > 250 then
    raise exception using
      errcode = 'P0001',
      message = 'DIRECCION_INVALIDA';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_INVALIDAS';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  if exists (
    select 1
    from public.pacientes as p
    where p.tipo_documento = v_tipo_documento
      and lower(p.numero_documento) = lower(v_numero_documento)
  ) then
    raise exception using
      errcode = '23505',
      message = 'PACIENTE_DOCUMENTO_DUPLICADO';
  end if;

  insert into public.pacientes (
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    fecha_nacimiento,
    telefono,
    correo,
    direccion
  )
  values (
    v_tipo_documento,
    v_numero_documento,
    v_nombres,
    v_apellidos,
    p_fecha_nacimiento,
    v_telefono,
    v_correo,
    v_direccion
  )
  returning id into v_paciente_id;

  if p_crear_atencion then
    insert into public.atenciones (
      paciente_id,
      observaciones,
      categoria_tarifaria
    )
    values (
      v_paciente_id,
      v_observaciones,
      v_categoria_tarifaria
    )
    returning id, atenciones.numero_atencion, atenciones.estado
    into v_atencion_id, v_numero_atencion, v_estado;

    insert into public.atencion_eventos (
      atencion_id,
      tipo_evento,
      estado_anterior,
      estado_nuevo,
      detalle
    )
    values (
      v_atencion_id,
      'atencion_creada',
      null,
      v_estado,
      jsonb_build_object('origen', 'registro_paciente')
    );
  end if;

  return query
  select
    v_paciente_id,
    v_atencion_id,
    v_numero_atencion,
    v_estado;
end;
$$;

create or replace function public.crear_atencion_paciente(
  p_paciente_id uuid,
  p_observaciones text default null,
  p_categoria_tarifaria text default 'general'
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_observaciones text := nullif(btrim(coalesce(p_observaciones, '')), '');
  v_categoria_tarifaria text := lower(btrim(coalesce(p_categoria_tarifaria, 'general')));
  v_atencion_id uuid;
  v_numero_atencion bigint;
  v_estado text;
begin
  if p_paciente_id is null or not exists (
    select 1
    from public.pacientes as p
    where p.id = p_paciente_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PACIENTE_NO_EXISTE';
  end if;

  if v_observaciones is not null and char_length(v_observaciones) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'OBSERVACIONES_INVALIDAS';
  end if;

  if v_categoria_tarifaria not in ('general', 'tercera_edad', 'policia') then
    raise exception using
      errcode = 'P0001',
      message = 'CATEGORIA_TARIFARIA_INVALIDA';
  end if;

  insert into public.atenciones (
    paciente_id,
    observaciones,
    categoria_tarifaria
  )
  values (
    p_paciente_id,
    v_observaciones,
    v_categoria_tarifaria
  )
  returning id, atenciones.numero_atencion, atenciones.estado
  into v_atencion_id, v_numero_atencion, v_estado;

  insert into public.atencion_eventos (
    atencion_id,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  values (
    v_atencion_id,
    'atencion_creada',
    null,
    v_estado,
    jsonb_build_object('origen', 'paciente_existente')
  );

  return query
  select
    p_paciente_id,
    v_atencion_id,
    v_numero_atencion,
    v_estado;
end;
$$;

create or replace function public.registrar_abandono_atencion(
  p_atencion_id uuid,
  p_motivo text
)
returns table (
  paciente_id uuid,
  atencion_id uuid,
  numero_atencion bigint,
  estado text
)
language plpgsql
as $$
declare
  v_motivo text := regexp_replace(btrim(coalesce(p_motivo, '')), '\s+', ' ', 'g');
  v_paciente_id uuid;
  v_numero_atencion bigint;
  v_estado_anterior text;
begin
  if char_length(v_motivo) not between 10 and 300 then
    raise exception using
      errcode = 'P0001',
      message = 'MOTIVO_ABANDONO_INVALIDO';
  end if;

  select
    a.paciente_id,
    a.numero_atencion,
    a.estado
  into
    v_paciente_id,
    v_numero_atencion,
    v_estado_anterior
  from public.atenciones as a
  where a.id = p_atencion_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ATENCION_NO_EXISTE';
  end if;

  if v_estado_anterior not in ('registrada', 'pendiente_pago') then
    raise exception using
      errcode = 'P0001',
      message = 'ESTADO_NO_PERMITE_ABANDONO';
  end if;

  update public.atenciones
  set
    estado = 'abandonada',
    motivo_abandono = v_motivo,
    abandonada_en = now()
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
    'abandono_registrado',
    v_estado_anterior,
    'abandonada',
    jsonb_build_object('motivo', v_motivo)
  );

  return query
  select
    v_paciente_id,
    p_atencion_id,
    v_numero_atencion,
    'abandonada'::text;
end;
$$;

create or replace function public.buscar_pacientes(
  p_busqueda text default null,
  p_limite integer default 20,
  p_desplazamiento integer default 0
)
returns table (
  paciente_id uuid,
  tipo_documento text,
  numero_documento text,
  nombres text,
  apellidos text,
  fecha_nacimiento date,
  telefono text,
  ultima_atencion_id uuid,
  ultimo_numero_atencion bigint,
  ultimo_estado text,
  ultima_atencion_en timestamptz,
  total_resultados bigint
)
language plpgsql
stable
as $$
declare
  v_busqueda text := lower(nullif(btrim(coalesce(p_busqueda, '')), ''));
  v_limite integer := least(greatest(coalesce(p_limite, 20), 1), 100);
  v_desplazamiento integer := greatest(coalesce(p_desplazamiento, 0), 0);
begin
  if v_busqueda is not null and char_length(v_busqueda) > 100 then
    raise exception using
      errcode = 'P0001',
      message = 'BUSQUEDA_INVALIDA';
  end if;

  return query
  select
    p.id,
    p.tipo_documento,
    p.numero_documento,
    p.nombres,
    p.apellidos,
    p.fecha_nacimiento,
    p.telefono,
    ultima.id,
    ultima.numero_atencion,
    ultima.estado,
    ultima.created_at,
    count(*) over ()
  from public.pacientes as p
  left join lateral (
    select
      a.id,
      a.numero_atencion,
      a.estado,
      a.created_at
    from public.atenciones as a
    where a.paciente_id = p.id
    order by a.created_at desc
    limit 1
  ) as ultima on true
  where
    v_busqueda is null
    or lower(p.numero_documento) like v_busqueda || '%'
    or lower(p.nombres) like v_busqueda || '%'
    or lower(p.apellidos) like v_busqueda || '%'
  order by p.created_at desc
  limit v_limite
  offset v_desplazamiento;
end;
$$;

create or replace function public.obtener_historial_paciente(
  p_paciente_id uuid
)
returns table (
  atencion_id uuid,
  numero_atencion bigint,
  estado text,
  observaciones text,
  motivo_abandono text,
  abandonada_en timestamptz,
  creada_en timestamptz,
  total_eventos bigint
)
language plpgsql
stable
as $$
begin
  if p_paciente_id is null or not exists (
    select 1
    from public.pacientes as p
    where p.id = p_paciente_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PACIENTE_NO_EXISTE';
  end if;

  return query
  select
    a.id,
    a.numero_atencion,
    a.estado,
    a.observaciones,
    a.motivo_abandono,
    a.abandonada_en,
    a.created_at,
    count(e.id)
  from public.atenciones as a
  left join public.atencion_eventos as e
    on e.atencion_id = a.id
  where a.paciente_id = p_paciente_id
  group by
    a.id,
    a.numero_atencion,
    a.estado,
    a.observaciones,
    a.motivo_abandono,
    a.abandonada_en,
    a.created_at
  order by a.created_at desc;
end;
$$;
