-- SIEMC · Servicios y tarifas vigentes

insert into public.servicios (codigo, nombre, descripcion)
values
  (
    'EX-MED',
    'Exámenes médicos',
    'Evaluación médica y psicológica para certificación municipal'
  ),
  (
    'EX-SANGRE',
    'Examen de tipo de sangre',
    'Determinación de grupo sanguíneo y factor Rh'
  )
on conflict do nothing;

update public.servicios as s
set
  nombre = v.nombre,
  descripcion = v.descripcion,
  estado = 'activo'
from (
  values
    (
      'EX-MED'::text,
      'Exámenes médicos'::text,
      'Evaluación médica y psicológica para certificación municipal'::text
    ),
    (
      'EX-SANGRE'::text,
      'Examen de tipo de sangre'::text,
      'Determinación de grupo sanguíneo y factor Rh'::text
    )
) as v(codigo, nombre, descripcion)
where s.codigo = v.codigo;

update public.servicios
set estado = 'inactivo'
where codigo = 'EX-PSI';

-- Corrige las tarifas abiertas de instalaciones anteriores.
update public.servicio_tarifas as t
set monto = v.monto
from public.servicios as s
join (
  values
    ('EX-MED'::text, 'general'::text, 500.00::numeric),
    ('EX-MED'::text, 'tercera_edad'::text, 350.00::numeric),
    ('EX-MED'::text, 'policia'::text, 250.00::numeric),
    ('EX-SANGRE'::text, 'general'::text, 50.00::numeric)
) as v(codigo, categoria_tarifaria, monto)
  on v.codigo = s.codigo
where t.servicio_id = s.id
  and t.categoria_tarifaria = v.categoria_tarifaria
  and t.vigente_hasta is null;

insert into public.servicio_tarifas (
  servicio_id,
  monto,
  categoria_tarifaria,
  vigente_desde
)
select
  s.id,
  v.monto,
  v.categoria_tarifaria,
  date '2026-01-01'
from (
  values
    ('EX-MED'::text, 'general'::text, 500.00::numeric),
    ('EX-MED'::text, 'tercera_edad'::text, 350.00::numeric),
    ('EX-MED'::text, 'policia'::text, 250.00::numeric),
    ('EX-SANGRE'::text, 'general'::text, 50.00::numeric)
) as v(codigo, categoria_tarifaria, monto)
join public.servicios as s on s.codigo = v.codigo
where not exists (
  select 1
  from public.servicio_tarifas as t
  where t.servicio_id = s.id
    and t.categoria_tarifaria = v.categoria_tarifaria
    and t.vigente_hasta is null
);
