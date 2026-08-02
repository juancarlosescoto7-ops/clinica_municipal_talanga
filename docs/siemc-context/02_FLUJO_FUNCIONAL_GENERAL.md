# Flujo funcional general

## Jornada guiada

1. La persona usuaria abre la caja principal.
2. El sistema presenta automáticamente el registro de paciente.
3. Al registrar el paciente, el sistema presenta la creación o asignación del
   servicio.
4. En ese punto la persona usuaria puede:
   - registrar un abandono justificado; o
   - seleccionar uno o más servicios y continuar.
5. Al crear el servicio, el sistema presenta automáticamente el cobro.
6. En el cobro la persona usuaria puede:
   - cobrar en efectivo o transferencia y emitir el recibo; o
   - registrar el servicio como no cobrado.
7. Cualquiera de esos resultados cierra la atención actual y devuelve
   automáticamente al registro del siguiente paciente.
8. El bucle paciente → servicio → cobro continúa hasta que la persona usuaria
   selecciona **Cerrar jornada**.

No se permite cerrar la jornada con una atención sin resolver.

## Cierre guiado

1. El sistema presenta todas las atenciones de la jornada.
2. Muestra totales cobrados, efectivo, transferencias, no cobrados y
   abandonos.
3. La persona usuaria registra el efectivo contado.
4. Si existe un depósito bancario, registra monto, banco y referencia.
5. El sistema calcula la diferencia y confirma el cierre.

## Cierre mensual

El sistema genera un solo informe mensual con:

- pacientes atendidos;
- exámenes médicos registrados;
- exámenes psicológicos registrados;
- ingresos percibidos;
- comisiones por médico y psicólogo;
- salarios del personal;
- ganancia general estimada.

El informe evidencia servicios administrativos registrados en SIEMC. No
contiene resultados clínicos ni sustituye documentos de los proveedores.

## Regla central
Todo cobro debe corresponder a una atención registrada y a servicios con
tarifa vigente.

SIEMC no almacena resultados clínicos ni documentos emitidos por los
proveedores.

## Estados de atención
- registrada
- pendiente_pago
- pagada
- no_cobrada
- abandonada
- anulada

## Conciliaciones
- Registrados = pagados + no cobrados + abandonados + anulados justificados.
- Recibos válidos = efectivo + transferencias + otros medios.
- Total a depositar = total depositado + diferencia justificada.
- Servicios pagados = base de cálculo de obligaciones con proveedores.
