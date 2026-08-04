# SQL — Reimpresión de recibos

El módulo conserva una bitácora de cada reimpresión autorizada y ofrece dos
RPC:

- `reimprimir_recibo`: exige sesión autenticada y la misma clave privada de
  anulación almacenada como `siemc_clave_anulacion` en Supabase Vault. Solo
  retorna recibos vigentes y registra operador, recibo y fecha.
- `verificar_recibo_publico`: consulta por el UUID incluido en el QR y expone
  únicamente número, fecha, monto, moneda y estado. No retorna datos del
  paciente ni información bancaria.

La función pública puede ser ejecutada por `anon`; las tablas permanecen sin
acceso directo para dicho rol.
