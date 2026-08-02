-- SIEMC · Personal y salarios base vigentes

insert into public.personal (codigo, nombre_completo, cargo)
values
  ('PER-MED', 'Ronald Deris Reyes', 'Médico'),
  ('PER-PSI', 'Suamy Michelle Barahona', 'Psicóloga'),
  ('PER-COB', 'Cinthia Raquel Villanueva', 'Cobros'),
  ('PER-CAP', 'Kellyn Maryori', 'Captadora')
on conflict do nothing;

insert into public.personal_salarios (
  personal_id,
  monto,
  vigente_desde
)
select p.id, v.monto, date '2026-01-01'
from (
  values
    ('PER-MED'::text, 22500.00::numeric),
    ('PER-PSI'::text, 16000.00::numeric),
    ('PER-COB'::text, 10000.00::numeric),
    ('PER-CAP'::text, 8000.00::numeric)
) as v(codigo, monto)
join public.personal as p on p.codigo = v.codigo
where not exists (
  select 1
  from public.personal_salarios as s
  where s.personal_id = p.id
    and s.vigente_hasta is null
);
