# Operación guiada

> La pantalla activa usa las RPC reales de Supabase. Un proyecto nuevo se
> instala únicamente con `supabase/SIEMC_INSTALACION.sql`. El cierre recupera
> e imprime atenciones, cobros, diferencia, depósito y observaciones.

El módulo no crea entidades propias. Sus RPC coordinan, dentro de una sola
transacción, los pasos que atraviesan varios módulos.

## SQL

1. `sql/01_tables.sql` documenta que no hay tablas propias.
2. `sql/02_indexes.sql` documenta que no hay índices propios.
3. `sql/03_functions.sql` contiene las RPC de orquestación.

Las funciones principales son `registrar_servicio_guiado`,
`registrar_no_cobrado_atencion`, `obtener_jornada_guiada` y
`cerrar_jornada_guiada`.

La pantalla utiliza el servicio RPC persistente y vuelve a consultar Supabase
después de cada operación terminal.

## Recorrido

1. Abrir caja.
2. Registrar paciente.
3. Seleccionar el servicio o registrar abandono.
4. Cobrar en efectivo o transferencia, o registrar como no cobrado.
5. Volver automáticamente al siguiente paciente.
6. Cerrar jornada.
7. Registrar efectivo contado y depósito bancario opcional.
8. Consultar el informe mensual consolidado.

## Reglas de la maqueta

- No se permite cerrar con una atención activa.
- Un abandono requiere motivo.
- Un servicio requiere al menos una selección.
- Una transferencia requiere banco y referencia.
- Un depósito de cierre requiere banco y referencia.
- Pagada, no cobrada y abandonada terminan la atención y reinician el bucle.
- El estado se conserva mientras se navega dentro del layout de la clínica.
- La pantalla está conectada a `services/operacion-guiada.service.ts` y al
  ejecutor compartido de Supabase.

## Validación manual sugerida

### Cobro

1. Abrir caja con fondo inicial.
2. Registrar paciente.
3. Seleccionar examen médico.
4. Crear servicio.
5. Cobrar en efectivo.
6. Confirmar que vuelve al registro de paciente y aumenta el resumen.

### No cobrado

1. Registrar otro paciente.
2. Seleccionar examen psicológico.
3. Crear servicio.
4. Seleccionar `No cobrado`.
5. Confirmar el estado en la jornada.

### Abandono

1. Registrar otro paciente.
2. Seleccionar `Registrar abandono`.
3. Ingresar motivo y confirmar.
4. Confirmar el estado en la jornada.

### Cierre

1. Seleccionar `Cerrar jornada`.
2. Revisar todas las atenciones.
3. Registrar efectivo contado.
4. Registrar opcionalmente monto, banco y referencia de depósito.
5. Confirmar cierre.
6. Abrir el informe mensual y revisar servicios, comisiones, salarios y
   ganancia general.
