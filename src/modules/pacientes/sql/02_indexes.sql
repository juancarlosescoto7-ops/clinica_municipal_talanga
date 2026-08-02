-- SIEMC · Fase 1 · Pacientes y atenciones

create unique index pacientes_documento_uq
  on public.pacientes (tipo_documento, lower(numero_documento));

create index pacientes_nombres_busqueda_idx
  on public.pacientes (lower(nombres) text_pattern_ops);

create index pacientes_apellidos_busqueda_idx
  on public.pacientes (lower(apellidos) text_pattern_ops);

create index pacientes_creados_idx
  on public.pacientes (created_at desc);

create unique index atenciones_numero_uq
  on public.atenciones (numero_atencion);

create index atenciones_paciente_fecha_idx
  on public.atenciones (paciente_id, created_at desc);

create index atenciones_estado_fecha_idx
  on public.atenciones (estado, created_at desc);

create index atencion_eventos_atencion_fecha_idx
  on public.atencion_eventos (atencion_id, created_at desc);

