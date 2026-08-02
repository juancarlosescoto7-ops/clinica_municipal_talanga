# Servicios y tarifas

> `ServicesWorkspace` lee y escribe el catálogo y las tarifas mediante el
> ejecutor real de Supabase. El contrato definitivo se instala con
> `supabase/SIEMC_INSTALACION.sql`.

## Objetivo

Administrar el catálogo de servicios de la Clínica Municipal y conservar el
historial de precios por períodos de vigencia, dejando preparada la relación
entre atenciones y montos cobrables.

## Alcance

- Crear y editar servicios.
- Activar o inactivar servicios.
- Buscar por código o nombre.
- Filtrar por estado.
- Programar tarifas en HNL.
- Definir vigencias con fecha final opcional.
- Consultar tarifas vigentes, programadas y vencidas.
- Preparar la asignación transaccional de servicios a atenciones.

No incluye pagos, recibos, aperturas, cierres ni otras funciones de Caja.

## Ruta

`/clinica/servicios`

## Formularios

### Servicio

- Código único de 3–20 caracteres.
- Nombre único de 3–120 caracteres.
- Descripción opcional.
- Estado activo o inactivo.

### Tarifa y vigencia

- Servicio seleccionado.
- Monto positivo en HNL.
- Fecha inicial obligatoria.
- Fecha final opcional e inclusiva.

## Reglas implementadas

- Código y nombre son únicos sin distinguir mayúsculas.
- Los códigos se normalizan a mayúsculas y guiones.
- Un servicio inactivo conserva todas sus tarifas.
- Las tarifas son versiones históricas y no se sobrescriben.
- Dos vigencias del mismo servicio no pueden solaparse.
- Una fecha final vacía representa vigencia indefinida.
- La asignación exige una atención `registrada` o `pendiente_pago`.
- Solo pueden asignarse servicios activos con tarifa vigente.
- El monto aplicado se copia a `atencion_servicios` para que cambios futuros
  de tarifa no modifiquen el importe histórico.
- Un servicio solo puede aparecer una vez por atención; la cantidad admite
  valores de 1 a 10.
- No se implementan eliminaciones.

## Componentes

- `ServicesWorkspace`: coordina catálogo, métricas, filtros y estado local.
- `ServiceForm`: alta y edición del catálogo.
- `RateForm`: monto y período de vigencia.
- `ServicesTable`: catálogo con tarifa vigente y acciones.
- `RateHistoryPanel`: versiones tarifarias del servicio.
- `ServiceStatusBadge` y `RateValidityBadge`: estados visuales.
- `ModuleDialog`: componente compartido con Pacientes.

## Servicios

### `servicios-session.service.ts`

Implementación temporal en memoria consumida por el frontend. Permite revisar
catálogo, edición, tarifas y solapamientos sin conectarse a Supabase. Los datos
desaparecen al recargar.

### `servicios.service.ts`

Contrato basado en el `RpcExecutor` compartido de `src/types/rpc.ts`. No
importa, configura ni instancia Supabase.

Consume:

- `crear_servicio`
- `actualizar_servicio`
- `programar_tarifa_servicio`
- `listar_catalogo_servicios`
- `obtener_tarifas_servicio`
- `asignar_servicio_atencion`

## Tipos y validaciones

- Modelos estrictos para servicios, tarifas, vigencias y asignaciones.
- Validaciones TypeScript sin librerías adicionales.
- Montos locales manejados en centavos para evitar errores de punto flotante
  en la presentación.
- Sin uso de `any`.

## Tablas

- `servicios`
- `servicio_tarifas`
- `atencion_servicios`

La última tabla referencia `atenciones` sin modificar su estructura.

## Índices

Ocho índices explícitos para unicidad, catálogo, rangos de vigencia y
asignaciones. La restricción compuesta de `servicio_tarifas` crea además el
índice requerido por su clave foránea compuesta.

## RPC

Seis RPC documentadas en `sql/README.md`. Las escrituras críticas se realizan
de forma transaccional.

El trigger `servicio_tarifas_validar_vigencia` bloquea el servicio durante la
validación y evita períodos superpuestos incluso fuera de la RPC.

## Impacto sobre módulos existentes

- La navegación incorpora Servicios y tarifas.
- El pie lateral conserva el resumen institucional.
- `ModuleDialog` pasa de Pacientes a `src/components/shared/`.
- `RpcExecutor` pasa de los tipos de Pacientes a `src/types/rpc.ts`.
- El servicio de Pacientes actualiza únicamente su importación.
- Las tablas de Pacientes y atenciones no se modifican.

## Dependencias

No se agregaron dependencias. Se reutilizan Next.js, React y TypeScript.

## Guía de prueba manual

Codex no ejecutó estos pasos.

1. Ejecutar `npm.cmd run dev`.
2. Abrir `http://localhost:3000/clinica/servicios`.
3. Confirmar que la navegación resalta Servicios y tarifas.
4. Abrir Nuevo servicio e intentar guardar el formulario vacío.
5. Crear un servicio activo con código `EVAL-MED`.
6. Intentar repetir el código o el nombre y confirmar el mensaje.
7. Editar la descripción y cambiar el estado a inactivo.
8. Volver a activarlo.
9. Programar una tarifa vigente con monto válido.
10. Confirmar que aparece en el catálogo y en el historial.
11. Intentar crear otra tarifa con fechas superpuestas.
12. Programar una tarifa futura sin solapamiento.
13. Confirmar las etiquetas Vigente y Programada.
14. Buscar el servicio por código y nombre.
15. Filtrar servicios activos e inactivos.
16. Recargar y confirmar que los datos locales desaparecen.
17. Revisar la interfaz en escritorio y móvil.

## Pendientes

- Validación manual de formularios y diseño en el proyecto nuevo.
- Exposición visual independiente de la asignación a atención; el flujo
  guiado ya realiza esta operación.
