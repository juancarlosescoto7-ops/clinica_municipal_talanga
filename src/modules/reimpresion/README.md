# Reimpresión y verificación de recibos

El módulo agrega la ruta interna `/clinica/reimpresiones` y la ruta pública
`/verificar-recibo/[id]`.

## Reimpresión

- Busca por correlativo de recibo.
- Exige una sesión de operador y la misma clave administrativa utilizada por
  `anular_recibo`.
- Solo permite recibos con estado `valido`.
- Registra cada autorización en `recibo_reimpresiones`.
- Imprime las dos copias A4 con la marca `REIMPRESIÓN`.

## QR y validación pública

Todos los recibos, originales y reimpresiones, incluyen un QR SVG. Su valor es
la URL absoluta del proyecto más el UUID único del recibo. Por ello dos
recibos distintos no comparten QR; las dos copias físicas del mismo recibo sí
comparten su QR porque verifican el mismo comprobante.

La página pública consulta `verificar_recibo_publico` y solo muestra número,
fecha, monto, moneda y estado. No expone paciente, documento ni datos de pago.

## Instalación

Los SQL fuente se integran en `supabase/SIEMC_INSTALACION.sql` mediante
`npm.cmd run sql:build`. El instalador debe ejecutarse nuevamente en Supabase
para crear la bitácora, las RPC y sus permisos.
