-- SIEMC · Arqueos diarios

create unique index arqueos_numero_uq
  on public.arqueos (numero_arqueo);

create unique index arqueos_caja_sesion_uq
  on public.arqueos (caja_sesion_id);

create index arqueos_fecha_estado_idx
  on public.arqueos (fecha desc, estado);
