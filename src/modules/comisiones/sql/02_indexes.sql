-- SIEMC · Proveedores y comisiones

create unique index proveedores_codigo_uq
  on public.proveedores (lower(codigo));

create index proveedores_especialidad_estado_idx
  on public.proveedores (especialidad, estado, nombre_completo);

create index proveedor_comision_tarifas_busqueda_idx
  on public.proveedor_comision_tarifas (
    proveedor_id,
    servicio_id,
    vigente_desde desc,
    vigente_hasta
  );

drop index if exists public.atencion_servicio_comisiones_asignacion_uq;

create unique index atencion_servicio_comisiones_asignacion_uq
  on public.atencion_servicio_comisiones (
    atencion_servicio_id,
    proveedor_id
  );

create index atencion_servicio_comisiones_proveedor_fecha_idx
  on public.atencion_servicio_comisiones (proveedor_id, created_at desc);

create unique index comision_liquidaciones_periodo_uq
  on public.comision_liquidaciones (periodo);

create index comision_liquidaciones_estado_periodo_idx
  on public.comision_liquidaciones (estado, periodo desc);

create index comision_liquidacion_detalles_proveedor_idx
  on public.comision_liquidacion_detalles (proveedor_id, liquidacion_id);
