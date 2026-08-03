# Persistencia del flujo guiado

> El frontend activo consume el `RpcExecutor` real de Supabase. La instalación
> de un proyecto nuevo se realiza únicamente con
> `supabase/SIEMC_INSTALACION.sql`.

## Principio

La interfaz opera como un solo recorrido asistido. La separación por módulos
se utiliza para asignar propiedad sobre los datos y mantener el código, no
para obligar al usuario a navegar por subsistemas aislados.

## Dependencias

```text
Pacientes → Servicios → Caja → Arqueos → Depósitos
                └─────→ Comisiones
Servicios ────────────→ Comisiones

Personal ──────────────────────────────→ Informes
Servicios + Caja + Comisiones ─────────→ Informes

Operación guiada orquesta todos los módulos operativos.
```

## Inventario

| Módulo | Tablas propias | RPC principales | Servicio TypeScript |
|---|---|---|---|
| Pacientes | `pacientes`, `atenciones`, `atencion_eventos` | registro, nueva atención, abandono, búsqueda, historial | `pacientes.service.ts` |
| Servicios | `servicios`, `servicio_tarifas`, `atencion_servicios` | catálogo, tarifas, asignación a atención | `servicios.service.ts` |
| Personal | `personal`, `personal_salarios` | alta, actualización, salario vigente e historial | `personal.service.ts` |
| Caja | `caja_sesiones`, `recibos`, `pagos`, conteos y denominaciones | apertura, cobro, anulación y cierres | `caja.service.ts` |
| Comisiones | proveedores, tarifas, comisiones capturadas y liquidaciones | proveedor, tarifa, asignación, generación, ajuste y liquidación | `comisiones.service.ts` |
| Arqueos | `arqueos` | generar, confirmar, obtener y listar | `arqueos.service.ts` |
| Depósitos | `depositos`, `deposito_arqueos` | saldos pendientes, registrar, consultar y anular | `depositos.service.ts` |
| Operación guiada | ninguna | servicio guiado, no cobro, estado y cierre de jornada | `operacion-guiada.service.ts` |
| Informes | encabezado y tres detalles mensuales | generar, obtener y listar | `reportes.service.ts` |

## Flujo transaccional

1. `abrir_caja`.
2. `registrar_paciente_guiado`, que crea la ficha o reutiliza el paciente
   existente y siempre genera una atención nueva.
3. `registrar_servicio_guiado`, que asigna tarifa y proveedor/comisión.
4. `registrar_pago_atencion`, `registrar_no_cobrado_atencion` o
   `registrar_abandono_atencion`.
5. Se repite desde el paciente.
6. Antes del cierre, `anular_recibo` puede dejar sin efecto un procedimiento
   pagado sin eliminar el paciente ni la evidencia financiera.
7. `cerrar_jornada_guiada` cierra Caja, genera y confirma Arqueo y registra el
   Depósito opcional en la misma transacción.
8. `generar_informe_mensual` conserva el corte de exámenes, ingresos,
   comisiones, salarios y ganancia general.

## SQL

Cada módulo es dueño de `sql/01_tables.sql`, `02_indexes.sql`,
`03_functions.sql` y sus datos iniciales cuando correspondan.

El único instalador manual es `supabase/SIEMC_INSTALACION.sql`. Se reconstruye
con `npm run sql:build`. El comando no ejecuta SQL ni se conecta a Supabase.

## Pendiente de infraestructura

- Aplicar y validar el SQL en un proyecto Supabase.
- Conectar la maqueta al `RpcExecutor`.
- Configurar autenticación, permisos y políticas RLS.
- Crear Storage y políticas para evidencias de depósitos.
- Definir exportación PDF/CSV del informe.
