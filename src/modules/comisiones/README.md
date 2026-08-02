# Comisiones

El módulo administra proveedores médicos y psicológicos, tarifas históricas
por servicio, la comisión capturada al prestar cada servicio y las
liquidaciones mensuales. Solo se liquidan servicios pertenecientes a
atenciones con recibo válido.

Orden SQL:

1. `sql/01_tables.sql`
2. `sql/02_indexes.sql`
3. `sql/03_functions.sql`
4. `sql/04_seed.sql`

Interfaz de servicios pagados, tarifas, ajustes y liquidaciones de
proveedores.

## Incluye

- Ruta `/clinica/comisiones`.
- Selector de período.
- Métricas de servicios pagados y montos de referencia.
- Tabla por proveedor y servicio.
- Desglose de cálculo.
- Formulario de ajuste, referencia y confirmación.
- Historial de referencia.
- Tipos TypeScript, servicio local de maqueta y servicio RPC persistente.
- Tablas, índices y RPC del dominio.

## Pendiente

- Aplicar el SQL en Supabase.
- Conectar la interfaz al servicio RPC.
- Autenticación, permisos y RLS.

## Componentes

- `commissions-workspace.tsx`
- `commission-summary.tsx`
- `provider-commissions-table.tsx`
- `commission-liquidation-panel.tsx`

## Dependencias

Servicios, Caja y la función compartida de actualización.

## Revisión manual sugerida

1. Abrir `/clinica/comisiones`.
2. Revisar métricas, tabla y períodos históricos.
3. Cambiar el proveedor del panel de liquidación.
4. Revisar formularios y adaptación móvil.

No se ejecutaron pruebas.
