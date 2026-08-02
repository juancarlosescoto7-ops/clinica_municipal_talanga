-- SIEMC · Depósitos bancarios

create unique index depositos_numero_uq
  on public.depositos (numero_deposito);

create unique index depositos_banco_referencia_uq
  on public.depositos (lower(banco), lower(referencia))
  where estado <> 'anulado';

create index depositos_fecha_estado_idx
  on public.depositos (fecha_deposito desc, estado);

create index deposito_arqueos_arqueo_idx
  on public.deposito_arqueos (arqueo_id, deposito_id);
