# SQL — Caja y pagos

## Dependencias

Requiere:

- Pacientes: `atenciones`, `pacientes`, `atencion_eventos` y
  `siemc_actualizar_updated_at()`.
- Servicios: `atencion_servicios` y `servicios`.

No modifica esas estructuras.

## Orden

1. `01_tables.sql`
2. `02_indexes.sql`
3. `03_functions.sql`
4. `04_seed.sql`
5. `05_guided_functions.sql`

Estos archivos alimentan el instalador general y no se pegan individualmente.

## Tablas

### `caja_sesiones`

Registra apertura, fondo inicial, cierre, efectivo esperado, efectivo declarado
y diferencia. Solo puede existir una sesión `PRINCIPAL` abierta.

### `recibos`

Conserva el correlativo, atención, total y estado del comprobante. Una
anulación mantiene el recibo y exige motivo y fecha.

### `pagos`

Registra un único pago completo por recibo. Admite efectivo o transferencia.
El efectivo conserva monto recibido y cambio; la transferencia conserva banco,
referencia y fecha.

### `caja_denominaciones`

Catálogo configurable utilizado por el conteo de cierre.

### `caja_conteos`

Encabezado de conteo asociado de forma única a una sesión.

### `caja_conteo_detalles`

Cantidad por denominación con valor y subtotal históricos.

## Índices

Catorce índices explícitos controlan:

- Caja abierta única.
- Orden cronológico de sesiones.
- Correlativo de recibos.
- Recibo válido único por atención.
- Recibos por sesión y estado.
- Pago único por recibo.
- Pagos por método.
- Referencia bancaria única.
- Código y valor de denominación.
- Orden del catálogo.
- Conteo único por sesión.
- Denominación única por conteo.

## RPC

### `abrir_caja`

- Objetivo: abrir la caja principal con fondo inicial.
- Parámetros: monto y observaciones.
- Retorno: sesión abierta.
- Tablas: `caja_sesiones`.
- Validaciones: monto, observaciones y ausencia de otra caja abierta.
- Servicio: `createCashService().openCashRegister`.

### `obtener_caja_actual`

- Objetivo: obtener la sesión principal abierta.
- Parámetros: ninguno.
- Retorno: cero o una sesión.
- Tablas: `caja_sesiones`.
- Servicio: `createCashService().getCurrentCashRegister`.

### `listar_atenciones_pendientes_cobro`

- Objetivo: listar atenciones con servicios y total cobrable.
- Parámetros: ninguno.
- Retorno: paciente, atención, servicios y total.
- Tablas: `atenciones`, `pacientes`, `atencion_servicios`, `servicios`,
  `recibos`.
- Servicio: `createCashService().listPendingCharges`.

### `registrar_pago_atencion`

- Objetivo: cobrar la totalidad, emitir recibo y cambiar la atención a
  `pagada` en una transacción.
- Parámetros: atención, método, efectivo o transferencia y observaciones.
- Retorno: recibo y detalle del pago.
- Tablas: `caja_sesiones`, `atenciones`, `atencion_servicios`, `recibos`,
  `pagos`, `atencion_eventos`.
- Validaciones: caja abierta, atención pendiente, servicios, total, método,
  efectivo suficiente y datos bancarios.
- Servicio: `createCashService().registerPayment`.

### `anular_recibo`

- Objetivo: anular sin eliminar el recibo y su pago, y marcar la atención
  completa como `anulada`. La ficha del paciente no se modifica.
- Parámetros: recibo, motivo y clave administrativa.
- Retorno: recibo anulado.
- Tablas: `caja_sesiones`, `recibos`, `pagos`, `atenciones`,
  `atencion_eventos`.
- Validaciones: clave coincidente con `siemc_clave_anulacion` en Supabase
  Vault, recibo válido, caja abierta, atención aún pagada y motivo.
- Seguridad: la firma histórica sin clave se elimina. La RPC usa
  `security definer` con `search_path` vacío exclusivamente para consultar el
  secreto cifrado; los roles del navegador no tienen acceso directo a Vault.
- Servicio: `createCashService().annulReceipt`.

### `cerrar_caja`

- Objetivo: guardar conteo, calcular efectivo esperado/declarado y cerrar.
- Parámetros: arreglo JSON de códigos/cantidades y observaciones.
- Retorno: sesión cerrada y conteo.
- Tablas: `caja_sesiones`, `recibos`, `pagos`, `caja_denominaciones`,
  `caja_conteos`, `caja_conteo_detalles`.
- Validaciones: caja abierta, catálogo, cantidades y duplicados.
- Servicio: `createCashService().closeCashRegister`.

### `listar_recibos_caja`

- Objetivo: consultar recibos y medios de pago de una sesión.
- Parámetros: sesión.
- Retorno: recibos válidos y anulados.
- Tablas: `caja_sesiones`, `recibos`, `pagos`.
- Servicio: `createCashService().listReceipts`.

### `cerrar_caja_con_total`

- Objetivo: cerrar desde el flujo guiado con el efectivo total contado, sin
  exigir desglose por denominación.
- Retorno: el mismo contrato de cierre y un conteo sin detalles.
- Servicio: `createCashService().closeCashRegisterWithTotal`.

## Seed

`04_seed.sql` carga denominaciones HNL para el conteo manual. El catálogo se
mantiene en tabla para poder inactivar o ampliar valores mediante una
migración autorizada si cambia la circulación.

## Seguridad

Las funciones son invocadoras salvo `anular_recibo`, que requiere privilegios
del propietario para verificar Supabase Vault. No expone ni retorna la clave.
