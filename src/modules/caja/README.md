# Caja y pagos

> Estado actual (2026-07-31): `/clinica/caja` usa la operación guiada conectada
> a Supabase y recupera la jornada remota al recargar. Los apartados de maqueta
> local más abajo se conservan solo como documentación histórica.

## Objetivo

Registrar la apertura y el cierre de la caja principal, cobrar atenciones por
efectivo o transferencia, emitir recibos y conservar las anulaciones sin
eliminar información.

## Alcance

- Abrir una única caja principal con fondo inicial.
- Consultar atenciones pendientes de cobro y su detalle de servicios.
- Registrar el pago completo en efectivo o transferencia.
- Calcular el cambio para pagos en efectivo.
- Emitir y consultar recibos.
- Anular recibos con motivo.
- Devolver a cobro una atención cuyo recibo fue anulado.
- Contar efectivo por denominación.
- Cerrar la caja con efectivo esperado, declarado y diferencia.
- Imprimir el cierre y arqueo diario con movimientos, conteo, anulaciones,
  observaciones y espacios de firma.

No incluye pagos parciales, medios de pago mixtos, depósitos bancarios,
impresión fiscal, facturación, autenticación ni permisos.

## Ruta

`/clinica/caja`

## Persistencia

La ruta activa usa la operación guiada y persiste pacientes, atenciones,
servicios, cobros, recibos, cierres, arqueos y depósitos en Supabase. Una
recarga recupera la última jornada de la caja `PRINCIPAL`.

## Formularios

### Apertura

- Monto inicial entre L 0.00 y L 9,999,999.99.
- Observaciones opcionales de hasta 500 caracteres.

### Pago en efectivo

- Atención pendiente seleccionada.
- Monto recibido igual o mayor que el total.
- Cambio calculado automáticamente.
- Observaciones opcionales.

### Pago por transferencia

- Atención pendiente seleccionada.
- Banco de 2 a 100 caracteres.
- Referencia de 3 a 100 caracteres.
- Fecha obligatoria que no puede estar en el futuro.
- Observaciones opcionales.

### Anulación

- Recibo válido de la caja abierta.
- Motivo de 10 a 300 caracteres.

### Cierre

- Cantidad de piezas por denominación, entre 0 y 10,000.
- Observaciones opcionales de hasta 500 caracteres.
- Resumen de efectivo esperado, declarado y diferencia.

## Reglas implementadas

- Solo puede existir una sesión `PRINCIPAL` abierta.
- No se cobra si la caja no está abierta.
- Solo se cobran atenciones en estado `pendiente_pago`.
- La atención debe tener al menos un servicio cobrable.
- Cada recibo contiene un único pago por el total de la atención.
- No se admiten pagos parciales ni combinación de métodos.
- Un pago válido cambia la atención a `pagada`.
- `pagada` cierra el cobro, salvo que el procedimiento sea anulado antes del
  cierre de caja.
- Solo puede existir un recibo válido por atención.
- El pago en efectivo exige monto suficiente y conserva el cambio.
- La transferencia exige banco, referencia y fecha válida.
- La referencia de transferencia es única cuando está informada.
- La anulación conserva recibo y pago como evidencia, exige motivo y cambia la
  atención de `pagada` a `anulada` sin modificar al paciente.
- Solo se anulan recibos mientras su caja continúa abierta.
- El cierre guarda el conteo y calcula la diferencia como declarado menos
  esperado.
- Los recibos anulados no forman parte del efectivo esperado.
- No se implementan eliminaciones.

## Componentes

- `CashWorkspace`: coordina la sesión, pagos, recibos, anulaciones y cierre.
- `CashSessionProvider`: comparte la sesión con el layout y conserva la
  apertura durante la navegación interna.
- `CashOpeningForm`: captura fondo inicial y observaciones.
- `PendingCharges`: presenta las atenciones de referencia pendientes y sus
  servicios.
- `PaymentForm`: alterna entre efectivo y transferencia y muestra el cambio.
- `ReceiptsTable`: presenta recibos válidos y anulados.
- `ReceiptAnnulmentForm`: solicita y valida el motivo.
- `CashClosingForm`: captura cantidades por denominación y resume el arqueo.
- `CashClosingPrint`: compone el documento detallado exclusivo para impresión.
- `ModuleDialog`: diálogo compartido reutilizado para operaciones modales.

## Servicios

### `caja-session.service.ts`

Implementación temporal en memoria consumida por el frontend. Contiene las dos
atenciones de referencia, abre y cierra la caja, registra pagos, emite recibos y
realiza anulaciones. No importa ni configura Supabase.

### `caja.service.ts`

Contrato de producción basado en el `RpcExecutor` compartido de
`src/types/rpc.ts`. Recibe el ejecutor por inyección y no crea conexiones.

Consume:

- `abrir_caja`
- `obtener_caja_actual`
- `listar_atenciones_pendientes_cobro`
- `registrar_pago_atencion`
- `anular_recibo`
- `cerrar_caja`
- `cerrar_caja_con_total`
- `listar_recibos_caja`

## Tipos y validaciones

- Modelos estrictos para sesiones, atenciones cobrables, pagos, recibos,
  denominaciones y conteos.
- Validaciones TypeScript sin librerías adicionales.
- Montos locales manejados en centavos para evitar errores de punto flotante
  en la presentación.
- Sin uso de `any`.

## Tablas

- `caja_sesiones`
- `recibos`
- `pagos`
- `caja_denominaciones`
- `caja_conteos`
- `caja_conteo_detalles`

Las tablas referencian estructuras de Pacientes y Servicios, pero no las
modifican.

## Índices

Catorce índices explícitos controlan la caja abierta, correlativos, recibos por
atención y sesión, pagos, referencias de transferencia, catálogo de
denominaciones y conteos.

## RPC

Ocho RPC documentadas en `sql/README.md`. El registro de pago, la anulación y
el cierre agrupan sus cambios en una sola transacción de PostgreSQL.

Los eventos `pago_registrado` y `procedimiento_anulado` se agregan a
`atencion_eventos`. La anulación conserva la ficha del paciente y el respaldo
histórico del recibo/pago, pero excluye ese movimiento de caja, arqueos,
reportes y comisiones.

## Clave administrativa de anulación

La anulación exige una clave independiente de la sesión normal. El valor no se
incluye en el frontend, el repositorio ni variables `NEXT_PUBLIC_*`.

Después de aplicar `supabase/SIEMC_INSTALACION.sql`, no es necesario que el
Dashboard muestre una sección llamada **Vault**. Abrir **SQL Editor**, reemplazar
únicamente el valor de ejemplo y ejecutar:

```sql
select vault.create_secret(
  'REEMPLAZAR_POR_UNA_CLAVE_PRIVADA_DE_12_O_MAS_CARACTERES',
  'siemc_clave_anulacion',
  'Clave administrativa para anular procedimientos en SIEMC'
);
```

La clave debe tener entre 12 y 128 caracteres. Para comprobar que fue creada
sin mostrar su valor:

```sql
select name, created_at, updated_at
from vault.secrets
where name = 'siemc_clave_anulacion';
```

Para rotarla, usar `vault.update_secret(...)` sobre el mismo registro y
conservar el nombre `siemc_clave_anulacion`.

Supabase guarda el secreto cifrado. La interfaz lo envía solamente al confirmar
una anulación y lo descarta al cerrar el diálogo.

Los servicios clínicos posteriores al pago son administrados externamente por
los proveedores y no generan transiciones adicionales dentro de SIEMC.

## Impacto sobre módulos existentes

- La navegación incorpora Caja y pagos.
- El pie lateral conserva el resumen institucional.
- Se reutilizan `RpcExecutor` y `ModuleDialog`.
- Las tablas, servicios y pantallas de Pacientes y Servicios no se modifican.
- Las RPC de Caja consumen `pacientes`, `atenciones`, `atencion_eventos`,
  `servicios` y `atencion_servicios`.

## Dependencias

No se agregaron dependencias. Se reutilizan Next.js, React y TypeScript.

## Guía de prueba manual

Codex no ejecutó estos pasos.

1. Ejecutar `npm.cmd run dev`.
2. Abrir `http://localhost:3000/clinica/caja`.
3. Confirmar que la navegación resalta Caja y pagos.
4. Intentar abrir la caja con un monto negativo y revisar la validación.
5. Abrirla con L 100.00 y una observación opcional.
6. Confirmar que aparecen dos atenciones pendientes de cobro.
7. Seleccionar la primera atención y elegir pago en efectivo.
8. Ingresar un monto menor que el total y revisar la validación.
9. Ingresar un monto mayor, confirmar el cambio y registrar el pago.
10. Revisar el recibo emitido y confirmar que la atención ya no está
    pendiente.
11. Pagar la segunda atención por transferencia con banco, referencia y fecha.
12. Intentar anular un recibo con un motivo corto y revisar la validación.
13. Anularlo con un motivo válido y confirmar que la atención vuelve a la
    lista de cobro.
14. Volver a cobrar la atención anulada si se desea revisar el ciclo completo.
15. Abrir el cierre y registrar cantidades por denominación.
16. Comparar efectivo esperado, declarado y diferencia.
17. Confirmar el cierre y revisar el resumen final.
18. Imprimir el cierre y revisar el detalle del arqueo, los recibos y las
    firmas en la vista previa del navegador.
19. Confirmar que las acciones de pago y anulación dejan de estar disponibles.
20. Recargar y confirmar que el estado local vuelve a su condición inicial.
21. Revisar la interfaz en escritorio y móvil.

## Pendientes

- Validación manual de formularios, reglas y diseño.
- Instalación y validación del SQL definitivo en el proyecto nuevo.
- Descarga directa del cierre en PDF sin usar el diálogo del navegador.
- Depósitos, retiros, movimientos adicionales y arqueos históricos.
- Confirmación de las reglas financieras antes de ampliar el alcance.
