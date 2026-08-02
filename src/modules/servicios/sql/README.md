# SQL — Servicios y tarifas

## Dependencia

Requiere que el SQL de Pacientes y atenciones se aplique primero
porque `atencion_servicios`
referencia `public.atenciones` y reutiliza
`public.siemc_actualizar_updated_at()`.

## Orden

1. `01_tables.sql`
2. `02_indexes.sql`
3. `03_functions.sql`
4. `04_seed.sql`

Estos archivos alimentan el instalador general y no se pegan individualmente.

## Tablas

### `servicios`

Catálogo con código y nombre únicos, descripción opcional y estado activo o
inactivo.

### `servicio_tarifas`

Versiona montos en HNL mediante fechas inclusivas. Una fecha final nula
representa vigencia indefinida. El trigger
`servicio_tarifas_validar_vigencia` evita períodos superpuestos.

### `atencion_servicios`

Relaciona una atención existente con un servicio y la tarifa aplicada.
Conserva cantidad, monto unitario, moneda y subtotal. El monto es una copia
histórica y no cambia cuando aparecen tarifas posteriores.

## Índices

- Código único.
- Nombre único.
- Catálogo por estado y nombre.
- Tarifas por servicio y fecha.
- Búsqueda de vigencias.
- Servicio único por atención.
- Asignaciones por servicio y tarifa.

## RPC

### `crear_servicio`

- Objetivo: crear un elemento activo del catálogo.
- Parámetros: código, nombre y descripción.
- Retorno: servicio creado.
- Tablas: `servicios`.
- Validaciones: formato, longitudes y duplicidad.
- Servicio consumidor: `createServicesService().createService`.

### `actualizar_servicio`

- Objetivo: editar identidad, descripción y estado sin eliminar historial.
- Parámetros: servicio, código, nombre, descripción y estado.
- Retorno: servicio actualizado.
- Tablas: `servicios`.
- Validaciones: existencia, formato y duplicidad.
- Servicio consumidor: `createServicesService().updateService`.

### `programar_tarifa_servicio`

- Objetivo: crear una tarifa versionada.
- Parámetros: servicio, monto y vigencia.
- Retorno: tarifa y estado de vigencia.
- Tablas: `servicios`, `servicio_tarifas`.
- Validaciones: monto, fechas, existencia y solapamiento.
- Servicio consumidor: `createServicesService().scheduleRate`.

### `listar_catalogo_servicios`

- Objetivo: buscar y paginar servicios con su tarifa vigente.
- Parámetros: búsqueda, estado, fecha de referencia, límite y desplazamiento.
- Retorno: catálogo, tarifa vigente y total.
- Tablas: `servicios`, `servicio_tarifas`.
- Servicio consumidor: `createServicesService().listServices`.

### `obtener_tarifas_servicio`

- Objetivo: consultar el historial de tarifas y clasificar cada vigencia.
- Parámetros: servicio y fecha de referencia.
- Retorno: tarifas programadas, vigentes y vencidas.
- Tablas: `servicios`, `servicio_tarifas`.
- Servicio consumidor: `createServicesService().getServiceRates`.

### `asignar_servicio_atencion`

- Objetivo: vincular una atención con un servicio usando la tarifa vigente.
- Parámetros: atención, servicio y cantidad.
- Retorno: asignación, tarifa, monto y subtotal congelados.
- Tablas: `atenciones`, `servicios`, `servicio_tarifas`,
  `atencion_servicios`.
- Validaciones: estado de atención, servicio activo, tarifa vigente,
  cantidad y duplicidad.
- Servicio consumidor: `createServicesService().assignServiceToAttention`.

## Funciones internas

- `validar_vigencia_tarifa_servicio`: serializa cambios por servicio y evita
  solapamientos incluso si una escritura no usa la RPC.
- `siemc_actualizar_updated_at`: función del módulo Pacientes reutilizada por
  el trigger de `servicios`.

## Seguridad

No se crean autenticación, roles, permisos, funciones `security definer` ni
políticas RLS.
