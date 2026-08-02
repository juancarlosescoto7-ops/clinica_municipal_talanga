-- SIEMC · Fase 3 · Caja y pagos

create unique index caja_sesiones_abierta_codigo_uq
  on public.caja_sesiones (codigo_caja)
  where estado = 'abierta';

create index caja_sesiones_apertura_idx
  on public.caja_sesiones (abierta_en desc);

create unique index recibos_numero_uq
  on public.recibos (numero_recibo);

create unique index recibos_atencion_valida_uq
  on public.recibos (atencion_id)
  where estado = 'valido';

create index recibos_caja_emision_idx
  on public.recibos (caja_sesion_id, emitido_en desc);

create index recibos_estado_emision_idx
  on public.recibos (estado, emitido_en desc);

create unique index pagos_recibo_uq
  on public.pagos (recibo_id);

create index pagos_metodo_fecha_idx
  on public.pagos (metodo, created_at desc);

create unique index pagos_transferencia_referencia_uq
  on public.pagos (lower(banco), lower(referencia_transferencia))
  where metodo = 'transferencia';

create unique index caja_denominaciones_codigo_uq
  on public.caja_denominaciones (codigo);

create unique index caja_denominaciones_valor_uq
  on public.caja_denominaciones (valor);

create index caja_denominaciones_orden_idx
  on public.caja_denominaciones (activa, orden);

create unique index caja_conteos_sesion_uq
  on public.caja_conteos (caja_sesion_id);

create unique index caja_conteo_detalles_denominacion_uq
  on public.caja_conteo_detalles (conteo_id, denominacion_id);

