# Pacientes y atenciones

## Objetivo

Controlar el registro inicial del ciudadano y cada atención generada desde su
llegada, antes de que intervengan caja u otros módulos.

## Alcance

- Registro de paciente.
- Búsqueda por nombre, apellido o documento.
- Creación opcional de una atención junto con el paciente.
- Creación de atenciones adicionales para pacientes existentes.
- Registro de abandono justificado.
- Historial de atenciones y eventos.
- Indicadores de la sesión actual.

No incluye catálogo de servicios, tarifas, pagos, procesos clínicos externos,
autenticación, permisos ni RLS.

## Ruta

`/clinica/pacientes`

## Formularios

### Registro de paciente

Campos:

- Tipo y número de documento.
- Nombre completo en un único campo.
- Fecha de nacimiento escrita como `DD/MM/AAAA`.
- Teléfono, correo y dirección opcionales.
- Opción de crear la atención inicial.
- Observaciones opcionales de la atención.

### Creación de atención

- Paciente seleccionado.
- Observaciones opcionales.
- Estado inicial fijo: `pendiente_pago`.

### Abandono

- Atención seleccionada.
- Justificación obligatoria de 10–300 caracteres.

### Búsqueda e historial

- Búsqueda local por nombre o documento.
- Vista de datos básicos.
- Lista cronológica de atenciones y eventos.

## Reglas implementadas

- El documento es único por tipo y número normalizado.
- La identidad hondureña contiene exactamente 13 dígitos.
- Otros documentos admiten 4–30 letras, números o guiones.
- La fecha de nacimiento es obligatoria y no puede ser futura.
- Las nuevas atenciones comienzan en `pendiente_pago`.
- `pagada` es el estado terminal del ciclo interno de SIEMC.
- Solo una atención `registrada` o `pendiente_pago` puede marcarse como
  abandonada.
- El abandono conserva motivo, fecha y evento.
- No existe eliminación desde el frontend ni desde las RPC.

## Componentes

- `PatientsWorkspace`: coordina estado local, métricas, búsqueda y diálogos.
- `PatientRegistrationForm`: captura y valida el paciente.
- `CreateAttentionForm`: genera una atención para un paciente existente.
- `AbandonmentForm`: solicita y valida la justificación.
- `PatientTable`: directorio y accesos a acciones.
- `RecentAttentions`: seguimiento de atenciones de la sesión.
- `PatientHistoryPanel`: historial cronológico.
- `ModuleDialog`: contenedor compartido de los formularios y del historial.
- `StatusBadge`: presentación de estados.

Los componentes específicos permanecen dentro del módulo. `ModuleDialog`
reside en `src/components/shared/` porque es utilizado por Pacientes y
Servicios.

## Servicios

### `pacientes-session.service.ts`

Implementación temporal en memoria consumida por el frontend. Permite revisar
los flujos sin conectarse a Supabase. Los datos desaparecen al recargar.

### `pacientes.service.ts`

Contrato de producción basado en un `RpcExecutor` inyectado. No importa,
configura ni instancia ningún cliente externo.

`RpcExecutor` reside en `src/types/rpc.ts` porque también lo consume el módulo
Servicios y tarifas. Su contrato no cambió.

Consume las RPC:

- `registrar_paciente_atencion`
- `crear_atencion_paciente`
- `registrar_abandono_atencion`
- `buscar_pacientes`
- `obtener_historial_paciente`

## Tipos y validaciones

- Modelos TypeScript para pacientes, atenciones, eventos, estados y respuestas
  RPC.
- Validaciones nativas sin dependencias adicionales.
- Normalización de documentos, espacios, correo y campos opcionales.
- Sin uso de `any`.

## Tablas

- `pacientes`
- `atenciones`
- `atencion_eventos`

Detalles completos en `sql/README.md`.

## Índices

Ocho índices para documento único, búsqueda, correlativo, estados, historial y
orden cronológico.

## RPC

Cinco RPC documentadas en `sql/README.md`. Las operaciones de escritura
modifican todas las tablas necesarias dentro de una sola transacción de
PostgreSQL.

## Impacto sobre la navegación base

Se actualizó la navegación base para:

- Añadir la ruta de Pacientes y atenciones.
- Usar iconos por elemento.
- Calcular el enlace activo con la ruta actual.
- Mantener el resumen institucional en el pie lateral.

No se alteró el contenido de la portada `/clinica` ni sus estilos.

## Revisión de alcance

Los estados de evaluaciones y certificados fueron retirados. Los proveedores
gestionan esos procesos en sistemas externos; SIEMC termina el ciclo de la
atención cuando el pago queda confirmado.

El instalador general no crea evaluaciones ni certificados porque esos
procesos pertenecen a los sistemas externos de los proveedores.

## Dependencias

No se agregaron dependencias. Se reutilizan Next.js, React y TypeScript.

## Guía de prueba manual

Codex no ejecutó estos pasos.

1. Ejecutar `npm.cmd run dev`.
2. Abrir `http://localhost:3000/clinica/pacientes`.
3. Confirmar que la navegación resalta Pacientes y atenciones.
4. Abrir Registrar paciente e intentar enviar el formulario vacío.
5. Confirmar los mensajes de campos obligatorios.
6. Registrar un paciente con una identidad de 13 dígitos y atención inicial.
7. Confirmar que aparecen un paciente y una atención pendiente de pago.
8. Buscarlo por parte del nombre y luego por el documento.
9. Abrir su historial y revisar el evento de creación.
10. Crear una segunda atención desde la fila del paciente.
11. Registrar el abandono con menos de 10 caracteres y confirmar el mensaje.
12. Registrar una justificación válida.
13. Confirmar el estado abandonada y el evento del historial.
14. Intentar registrar de nuevo el mismo tipo y número de documento.
15. Recargar el navegador y confirmar que los datos locales desaparecen.
16. Revisar la interfaz en escritorio y móvil.

## Pendientes

- Validación manual del frontend por el usuario.
- Validación y ejecución futura del SQL por el usuario.
- Provisión de un ejecutor RPC cuando se autorice conectar Supabase.
- Sustitución del servicio local por el servicio RPC.
- Confirmación de campos y reglas del módulo.
