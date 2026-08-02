-- SIEMC · Fase 2 · Servicios y tarifas

create unique index servicios_codigo_uq
  on public.servicios (lower(codigo));

create unique index servicios_nombre_uq
  on public.servicios (lower(nombre));

create index servicios_estado_nombre_idx
  on public.servicios (estado, lower(nombre));

create index servicio_tarifas_servicio_desde_idx
  on public.servicio_tarifas (
    servicio_id,
    categoria_tarifaria,
    vigente_desde desc
  );

create index servicio_tarifas_vigencia_idx
  on public.servicio_tarifas (
    servicio_id,
    categoria_tarifaria,
    vigente_desde,
    vigente_hasta
  );

create unique index atencion_servicios_atencion_servicio_uq
  on public.atencion_servicios (atencion_id, servicio_id);

create index atencion_servicios_servicio_idx
  on public.atencion_servicios (servicio_id, created_at desc);

create index atencion_servicios_tarifa_idx
  on public.atencion_servicios (tarifa_id);
