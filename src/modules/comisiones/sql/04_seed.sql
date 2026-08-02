-- SIEMC · Proveedores y comisiones vigentes

insert into public.proveedores (
  codigo,
  nombre_completo,
  especialidad
)
values
  ('PSI-SUA', 'Suamy Michelle Barahona', 'psicologia'),
  ('MED-RON', 'Ronald Deris Reyes', 'medicina')
on conflict do nothing;

-- Cada examen médico válido genera comisión para ambos profesionales.
update public.proveedor_comision_tarifas as t
set monto_unitario = v.comision
from public.proveedores as p
join public.servicios as s on s.codigo = 'EX-MED'
join (
  values
    ('PSI-SUA'::text, 60.00::numeric),
    ('MED-RON'::text, 70.00::numeric)
) as v(proveedor_codigo, comision)
  on v.proveedor_codigo = p.codigo
where t.proveedor_id = p.id
  and t.servicio_id = s.id
  and t.vigente_hasta is null;

insert into public.proveedor_comision_tarifas (
  proveedor_id,
  servicio_id,
  monto_unitario,
  vigente_desde
)
select
  p.id,
  s.id,
  v.comision,
  date '2026-01-01'
from (
  values
    ('PSI-SUA'::text, 'EX-MED'::text, 60.00::numeric),
    ('MED-RON'::text, 'EX-MED'::text, 70.00::numeric)
) as v(proveedor_codigo, servicio_codigo, comision)
join public.proveedores as p on p.codigo = v.proveedor_codigo
join public.servicios as s on s.codigo = v.servicio_codigo
where not exists (
  select 1
  from public.proveedor_comision_tarifas as t
  where t.proveedor_id = p.id
    and t.servicio_id = s.id
    and t.vigente_hasta is null
);
