-- SIEMC · Fase 3 · Denominaciones iniciales HNL
-- El catálogo permanece editable mediante SQL futuro si cambia la circulación.

insert into public.caja_denominaciones (
  codigo,
  tipo,
  valor,
  etiqueta,
  orden
)
values
  ('bill-500', 'billete', 500.00, 'L 500', 1),
  ('bill-200', 'billete', 200.00, 'L 200', 2),
  ('bill-100', 'billete', 100.00, 'L 100', 3),
  ('bill-50', 'billete', 50.00, 'L 50', 4),
  ('bill-20', 'billete', 20.00, 'L 20', 5),
  ('bill-10', 'billete', 10.00, 'L 10', 6),
  ('bill-5', 'billete', 5.00, 'L 5', 7),
  ('bill-2', 'billete', 2.00, 'L 2', 8),
  ('bill-1', 'billete', 1.00, 'L 1', 9),
  ('coin-050', 'moneda', 0.50, '50 centavos', 10),
  ('coin-020', 'moneda', 0.20, '20 centavos', 11),
  ('coin-010', 'moneda', 0.10, '10 centavos', 12),
  ('coin-005', 'moneda', 0.05, '5 centavos', 13)
on conflict do nothing;
