-- SIEMC · Personal y salarios

create unique index personal_codigo_uq
  on public.personal (lower(codigo));

create index personal_estado_nombre_idx
  on public.personal (estado, nombre_completo);

create index personal_salarios_personal_vigencia_idx
  on public.personal_salarios (
    personal_id,
    vigente_desde desc,
    vigente_hasta
  );
