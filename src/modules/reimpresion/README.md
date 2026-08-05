# Reimpresión y verificación de recibos

El módulo agrega la ruta interna `/clinica/reimpresiones` y la ruta pública
`/verificar-recibo/[id]`.

## Reimpresión

- Busca por correlativo de recibo.
- Exige una sesión de operador y la misma clave administrativa utilizada por
  `anular_recibo`.
- Solo permite recibos con estado `valido`.
- Registra cada autorización en `recibo_reimpresiones`.
- Imprime temporalmente un recibo por página A5 horizontal en la EPSON LX-350,
  con la marca `REIMPRESIÓN`.
- Genera una sola página por recibo, sin escalar un documento tamaño carta.
- Los márgenes internos predeterminados son 8 mm verticales y 11 mm
  horizontales; pueden ajustarse mediante `marginsMm` en
  `GuidedReceiptPrint` para calibrar el área imprimible de la EPSON LX-350.

## QR y validación pública

Todos los recibos, originales y reimpresiones, incluyen un QR SVG. Su valor es
la URL absoluta del proyecto más el UUID único del recibo. Por ello dos
recibos distintos no comparten QR.

La página pública consulta `verificar_recibo_publico` y solo muestra número,
fecha, monto, moneda y estado. No expone paciente, documento ni datos de pago.

## Instalación

Los SQL fuente se integran en `supabase/SIEMC_INSTALACION.sql` mediante
`npm.cmd run sql:build`. El instalador debe ejecutarse nuevamente en Supabase
para crear la bitácora, las RPC y sus permisos.
