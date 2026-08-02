# SQL — Pacientes y atenciones

## Orden

1. `01_tables.sql`
2. `02_indexes.sql`
3. `03_functions.sql`

Estos archivos son la fuente autoritativa y alimentan el instalador general.

## Tablas

### `pacientes`

Identidad y datos básicos de contacto del ciudadano. El documento se normaliza
antes de insertarse y es único por tipo y número.

### `atenciones`

Registra cada llegada atendible de un paciente. El correlativo
`numero_atencion` es una identidad numérica y su estado inicial es
`pendiente_pago`. Los estados terminales del flujo guiado son `pagada`,
`no_cobrada`, `abandonada` y `anulada`.

### `atencion_eventos`

Conserva creación, abandono, pago, anulación y registro de no cobro.

## Índices

- Documento único del paciente.
- Búsqueda por nombres y apellidos.
- Orden cronológico de pacientes.
- Correlativo único de atención.
- Atenciones por paciente y fecha.
- Atenciones por estado y fecha.
- Eventos por atención y fecha.

## RPC

### `registrar_paciente_atencion`

- Objetivo: registrar un paciente y, opcionalmente, su primera atención en una
  transacción.
- Parámetros: documento, nombres, apellidos, nacimiento, contacto, opción de
  atención y observaciones.
- Retorno: identificadores de paciente y atención, correlativo y estado.
- Tablas: `pacientes`, `atenciones`, `atencion_eventos`.
- Validaciones: documento, datos básicos, fecha, contacto, duplicidad y
  longitudes.
- Excepciones: códigos textuales como `PACIENTE_DOCUMENTO_DUPLICADO`.
- Servicio: `createPatientsService().registerPatient`.

### `crear_atencion_paciente`

- Objetivo: crear una atención para un paciente existente.
- Parámetros: paciente y observaciones.
- Retorno: identificadores, correlativo y estado.
- Tablas: `pacientes`, `atenciones`, `atencion_eventos`.
- Validaciones: existencia del paciente y longitud de observaciones.
- Excepciones: `PACIENTE_NO_EXISTE`, `OBSERVACIONES_INVALIDAS`.
- Servicio: `createPatientsService().createAttention`.

### `registrar_abandono_atencion`

- Objetivo: cambiar una atención elegible a `abandonada` de forma
  transaccional.
- Parámetros: atención y motivo.
- Retorno: paciente, atención, correlativo y estado final.
- Tablas: `atenciones`, `atencion_eventos`.
- Validaciones: motivo de 10–300 caracteres y estado anterior permitido.
- Excepciones: `ATENCION_NO_EXISTE`, `MOTIVO_ABANDONO_INVALIDO`,
  `ESTADO_NO_PERMITE_ABANDONO`.
- Servicio: `createPatientsService().abandonAttention`.

### `buscar_pacientes`

- Objetivo: búsqueda paginada por prefijo de documento, nombres o apellidos.
- Parámetros: búsqueda, límite y desplazamiento.
- Retorno: paciente, última atención y total de resultados.
- Tablas: `pacientes`, `atenciones`.
- Validaciones: límite controlado entre 1 y 100.
- Excepciones: `BUSQUEDA_INVALIDA`.
- Servicio: `createPatientsService().searchPatients`.

### `obtener_historial_paciente`

- Objetivo: listar las atenciones de un paciente con el total de eventos.
- Parámetros: paciente.
- Retorno: datos de cada atención y cantidad de eventos.
- Tablas: `pacientes`, `atenciones`, `atencion_eventos`.
- Validaciones: existencia del paciente.
- Excepciones: `PACIENTE_NO_EXISTE`.
- Servicio: `createPatientsService().getPatientHistory`.

## Seguridad

No se crean autenticación, roles, permisos, funciones `security definer` ni
políticas RLS.
