# Arqueo diario

Cada caja cerrada produce un único arqueo. El arqueo separa efectivo y
transferencias, conserva el efectivo esperado y declarado del cierre, y exige
justificación para confirmar una diferencia.

## Incluye

- Ruta `/clinica/arqueos`.
- Resumen de recibos y medios de pago.
- Composición del arqueo.
- Formulario de diferencia, justificación y confirmación.
- Historial de referencia.
- Tipos TypeScript y servicios local y persistente.
- Tablas, índices y RPC dentro del módulo.

## Componentes

- `daily-reconciliation-workspace.tsx`
- `reconciliation-summary.tsx`
- `reconciliation-form.tsx`

## SQL

1. `sql/01_tables.sql`
2. `sql/02_indexes.sql`
3. `sql/03_functions.sql`

Depende de Caja y no define autenticación, permisos ni RLS.

## Revisión manual sugerida

1. Abrir `/clinica/arqueos`.
2. Revisar métricas, tabla de composición e historial.
3. Cambiar el efectivo declarado y observar la diferencia visual.
4. Revisar el formulario y comportamiento responsivo.

No se ejecutaron pruebas.
