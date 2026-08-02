# Depósitos

Un depósito puede cubrir efectivo de uno o varios arqueos confirmados. Las
asignaciones evitan depositar dos veces el mismo efectivo y una anulación
libera nuevamente el saldo de los arqueos relacionados.

## Incluye

- Ruta `/clinica/depositos`.
- Métricas de depósito y conciliación.
- Arqueos origen.
- Formulario de banco, referencia, monto y evidencia.
- Cálculo de diferencia.
- Historial de referencia.
- Tipos TypeScript y servicios local y persistente.
- Tablas, índices y RPC dentro del módulo.

## Componentes

- `deposits-workspace.tsx`
- `deposit-summary.tsx`
- `deposit-registration-panel.tsx`

## SQL

1. `sql/01_tables.sql`
2. `sql/02_indexes.sql`
3. `sql/03_functions.sql`

Depende de Arqueos. El almacenamiento físico de evidencias y las políticas RLS
se resolverán cuando se conecte Supabase.

## Revisión manual sugerida

1. Abrir `/clinica/depositos`.
2. Revisar métricas, arqueos e historial.
3. Cambiar el monto depositado y observar la diferencia.
4. Revisar la zona de evidencia y la adaptación móvil.

No se ejecutaron pruebas.
