-- SIEMC · Informes mensuales

create unique index informes_mensuales_periodo_uq
  on public.informes_mensuales (periodo);

create index informes_mensuales_generado_idx
  on public.informes_mensuales (generado_en desc);

create index informe_mensual_servicios_informe_idx
  on public.informe_mensual_servicios (informe_id, categoria);

create index informe_mensual_comisiones_informe_idx
  on public.informe_mensual_comisiones (informe_id, especialidad);

create index informe_mensual_salarios_informe_idx
  on public.informe_mensual_salarios (informe_id, cargo);

create index informe_mensual_diario_informe_fecha_idx
  on public.informe_mensual_diario (informe_id, fecha);
