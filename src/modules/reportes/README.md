# Reportes

> Estado actual (2026-07-31): la pantalla obtiene y genera informes mensuales
> persistidos mediante las RPC reales de Supabase; ya no presenta el resumen
> estático como fuente de datos.

El informe mensual se guarda como una instantánea para conservar los valores
que fueron presentados en el momento de su generación. Incluye encabezado
institucional, pacientes, exámenes médicos y psicológicos, ingresos,
comisiones por proveedor, salarios y ganancia general.

## SQL

1. `sql/01_tables.sql`
2. `sql/02_indexes.sql`
3. `sql/03_functions.sql`

Las RPC persistentes son `generar_informe_mensual`,
`obtener_informe_mensual` y `listar_informes_mensuales`.

Centro de consultas con catálogo, filtros, indicadores, tablas y tendencias.

## Incluye

- Ruta `/clinica/reportes`.
- Ocho tarjetas de reportes documentados.
- Catálogo limitado a la operación y las finanzas de SIEMC.
- Indicadores mensuales de referencia.
- Filtros de período y estado.
- Vista previa intercambiable por categoría.
- Tabla y barras visuales.
- Tipos TypeScript y servicio RPC persistente.
- Informe mensual consolidado.

## Pendiente

- Exportación CSV/PDF e impresión.
- Instalación y validación del SQL definitivo en el proyecto nuevo.

## Componentes

- `reports-workspace.tsx`
- `report-catalog.tsx`
- `report-table.tsx`

## Dependencias

Servicios, Personal, Comisiones y Caja.

## Revisión manual sugerida

1. Abrir `/clinica/reportes`.
2. Seleccionar cada tarjeta del catálogo.
3. Revisar cambios en la tabla de vista previa.
4. Revisar filtros, métricas, barras y diseño móvil.

No se ejecutaron pruebas.
