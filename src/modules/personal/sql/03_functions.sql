-- SIEMC · Personal y salarios
-- Requiere public.siemc_actualizar_updated_at() del módulo Pacientes.

create trigger personal_actualizar_updated_at
before update on public.personal
for each row
execute function public.siemc_actualizar_updated_at();

create or replace function public.validar_vigencia_salario_personal()
returns trigger
language plpgsql
as $$
begin
  perform 1
  from public.personal as p
  where p.id = new.personal_id
  for update;

  if exists (
    select 1
    from public.personal_salarios as s
    where s.personal_id = new.personal_id
      and s.id <> new.id
      and daterange(
        s.vigente_desde,
        coalesce(s.vigente_hasta, 'infinity'::date),
        '[]'
      ) && daterange(
        new.vigente_desde,
        coalesce(new.vigente_hasta, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'VIGENCIA_SALARIO_SUPERPUESTA';
  end if;

  return new;
end;
$$;

create trigger personal_salarios_validar_vigencia
before insert or update on public.personal_salarios
for each row
execute function public.validar_vigencia_salario_personal();

create or replace function public.crear_personal(
  p_codigo text,
  p_nombre_completo text,
  p_cargo text
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_cargo text := regexp_replace(btrim(coalesce(p_cargo, '')), '\s+', ' ', 'g');
  v_personal public.personal%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$' then
    raise exception using errcode = 'P0001', message = 'CODIGO_PERSONAL_INVALIDO';
  end if;

  if char_length(v_nombre) not between 3 and 160 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_PERSONAL_INVALIDO';
  end if;

  if char_length(v_cargo) not between 2 and 100 then
    raise exception using errcode = 'P0001', message = 'CARGO_PERSONAL_INVALIDO';
  end if;

  insert into public.personal (codigo, nombre_completo, cargo)
  values (v_codigo, v_nombre, v_cargo)
  returning * into v_personal;

  return query
  select
    v_personal.id,
    v_personal.codigo,
    v_personal.nombre_completo,
    v_personal.cargo,
    v_personal.estado,
    v_personal.created_at,
    v_personal.updated_at;
end;
$$;

create or replace function public.actualizar_personal(
  p_personal_id uuid,
  p_codigo text,
  p_nombre_completo text,
  p_cargo text,
  p_estado text
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_codigo text := upper(regexp_replace(btrim(coalesce(p_codigo, '')), '\s+', '-', 'g'));
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre_completo, '')), '\s+', ' ', 'g');
  v_cargo text := regexp_replace(btrim(coalesce(p_cargo, '')), '\s+', ' ', 'g');
  v_estado text := lower(btrim(coalesce(p_estado, '')));
  v_personal public.personal%rowtype;
begin
  if v_codigo !~ '^[A-Z0-9-]{3,20}$'
    or char_length(v_nombre) not between 3 and 160
    or char_length(v_cargo) not between 2 and 100
    or v_estado not in ('activo', 'inactivo') then
    raise exception using errcode = 'P0001', message = 'DATOS_PERSONAL_INVALIDOS';
  end if;

  update public.personal
  set
    codigo = v_codigo,
    nombre_completo = v_nombre,
    cargo = v_cargo,
    estado = v_estado
  where id = p_personal_id
  returning * into v_personal;

  if not found then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  return query
  select
    v_personal.id,
    v_personal.codigo,
    v_personal.nombre_completo,
    v_personal.cargo,
    v_personal.estado,
    v_personal.created_at,
    v_personal.updated_at;
end;
$$;

create or replace function public.programar_salario_personal(
  p_personal_id uuid,
  p_monto numeric,
  p_vigente_desde date,
  p_vigente_hasta date default null
)
returns table (
  salario_id uuid,
  personal_id uuid,
  monto numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz
)
language plpgsql
as $$
declare
  v_salario public.personal_salarios%rowtype;
begin
  if not exists (
    select 1 from public.personal as p where p.id = p_personal_id
  ) then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  if p_monto is null or p_monto < 0 or p_monto > 9999999.99 then
    raise exception using errcode = 'P0001', message = 'SALARIO_INVALIDO';
  end if;

  if p_vigente_desde is null
    or (p_vigente_hasta is not null and p_vigente_hasta < p_vigente_desde) then
    raise exception using errcode = 'P0001', message = 'VIGENCIA_SALARIO_INVALIDA';
  end if;

  insert into public.personal_salarios (
    personal_id,
    monto,
    vigente_desde,
    vigente_hasta
  )
  values (
    p_personal_id,
    p_monto,
    p_vigente_desde,
    p_vigente_hasta
  )
  returning * into v_salario;

  return query
  select
    v_salario.id,
    v_salario.personal_id,
    v_salario.monto,
    v_salario.moneda,
    v_salario.vigente_desde,
    v_salario.vigente_hasta,
    v_salario.created_at;
end;
$$;

create or replace function public.listar_personal_salarios(
  p_busqueda text default null,
  p_estado text default null,
  p_fecha_referencia date default current_date,
  p_limite integer default 50,
  p_desplazamiento integer default 0
)
returns table (
  personal_id uuid,
  codigo text,
  nombre_completo text,
  cargo text,
  estado text,
  salario_id uuid,
  salario_vigente numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  total_resultados bigint
)
language plpgsql
stable
as $$
declare
  v_busqueda text := lower(nullif(btrim(coalesce(p_busqueda, '')), ''));
  v_estado text := lower(nullif(btrim(coalesce(p_estado, '')), ''));
  v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 200);
  v_desplazamiento integer := greatest(coalesce(p_desplazamiento, 0), 0);
begin
  if v_estado is not null and v_estado not in ('activo', 'inactivo') then
    raise exception using errcode = 'P0001', message = 'ESTADO_PERSONAL_INVALIDO';
  end if;

  return query
  select
    p.id,
    p.codigo,
    p.nombre_completo,
    p.cargo,
    p.estado,
    s.id,
    s.monto,
    s.moneda,
    s.vigente_desde,
    s.vigente_hasta,
    count(*) over ()
  from public.personal as p
  left join lateral (
    select ps.*
    from public.personal_salarios as ps
    where ps.personal_id = p.id
      and ps.vigente_desde <= p_fecha_referencia
      and (ps.vigente_hasta is null or ps.vigente_hasta >= p_fecha_referencia)
    order by ps.vigente_desde desc
    limit 1
  ) as s on true
  where (v_estado is null or p.estado = v_estado)
    and (
      v_busqueda is null
      or lower(p.codigo) like '%' || v_busqueda || '%'
      or lower(p.nombre_completo) like '%' || v_busqueda || '%'
      or lower(p.cargo) like '%' || v_busqueda || '%'
    )
  order by p.nombre_completo
  limit v_limite
  offset v_desplazamiento;
end;
$$;

create or replace function public.obtener_historial_salarios_personal(
  p_personal_id uuid
)
returns table (
  salario_id uuid,
  personal_id uuid,
  monto numeric,
  moneda text,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz
)
language plpgsql
stable
as $$
begin
  if not exists (
    select 1 from public.personal as p where p.id = p_personal_id
  ) then
    raise exception using errcode = 'P0001', message = 'PERSONAL_NO_EXISTE';
  end if;

  return query
  select
    s.id,
    s.personal_id,
    s.monto,
    s.moneda,
    s.vigente_desde,
    s.vigente_hasta,
    s.created_at
  from public.personal_salarios as s
  where s.personal_id = p_personal_id
  order by s.vigente_desde desc;
end;
$$;
