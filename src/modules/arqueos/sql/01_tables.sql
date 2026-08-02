-- SIEMC · Arqueos diarios
-- Requiere el módulo Caja.

create table public.arqueos (
  id uuid primary key default gen_random_uuid(),
  numero_arqueo bigint generated always as identity,
  caja_sesion_id uuid not null
    references public.caja_sesiones (id)
    on update restrict
    on delete restrict,
  fecha date not null,
  total_efectivo numeric(12, 2) not null,
  total_transferencias numeric(12, 2) not null,
  total_cobrado numeric(12, 2) not null,
  efectivo_esperado numeric(12, 2) not null,
  efectivo_declarado numeric(12, 2) not null,
  diferencia numeric(12, 2) not null,
  estado text not null default 'borrador',
  justificacion text,
  confirmado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arqueos_totales_check
    check (
      total_efectivo >= 0
      and total_transferencias >= 0
      and total_cobrado = total_efectivo + total_transferencias
      and efectivo_esperado >= 0
      and efectivo_declarado >= 0
      and diferencia = efectivo_declarado - efectivo_esperado
    ),
  constraint arqueos_estado_check
    check (estado in ('borrador', 'confirmado', 'con_diferencia')),
  constraint arqueos_confirmacion_check
    check (
      (
        estado = 'borrador'
        and confirmado_en is null
        and justificacion is null
      )
      or (
        estado = 'confirmado'
        and confirmado_en is not null
        and diferencia = 0
      )
      or (
        estado = 'con_diferencia'
        and confirmado_en is not null
        and diferencia <> 0
        and justificacion is not null
        and char_length(btrim(justificacion)) between 10 and 500
      )
    )
);
