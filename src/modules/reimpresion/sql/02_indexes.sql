-- SIEMC · Índices para auditoría de reimpresiones

create index recibo_reimpresiones_recibo_fecha_idx
  on public.recibo_reimpresiones (recibo_id, reimpreso_en desc);
