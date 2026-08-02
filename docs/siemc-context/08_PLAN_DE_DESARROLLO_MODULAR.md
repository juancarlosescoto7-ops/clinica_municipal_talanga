# Plan de desarrollo modular

## Etapa actual: contrato de persistencia del flujo guiado

La maqueta sigue funcionando en memoria, pero ya cuenta con el contrato
completo de tablas, índices, RPC, tipos y servicios para apertura, bucle
paciente → servicio → cobro, cierre con arqueo y depósito e informe mensual.

Cada módulo de persistencia debe entregar, dentro de su propio alcance:

- Tablas y restricciones.
- Índices.
- RPC.
- SQL autoritativo en `src/modules/<modulo>/sql/`.
- Instalador general `supabase/SIEMC_INSTALACION.sql`.
- Tipos TypeScript.
- Servicios de acceso a datos.
- Integración del frontend con esos servicios.
- README e instrucciones de validación manual.

Los SQL modulares no se pegan individualmente. El instalador general se
reconstruye desde esas fuentes y es el único archivo manual para Supabase.

Codex no ejecuta SQL, no utiliza credenciales reales ni realiza llamadas a
Supabase. El usuario aplica el instalador y valida
manualmente cada módulo.

## Orden de dependencias

1. Pacientes y atenciones.
2. Servicios y tarifas.
3. Personal y salarios.
4. Caja y pagos.
5. Proveedores y comisiones.
6. Arqueos.
7. Depósitos.
8. Operación guiada.
9. Informes.
10. Autenticación, roles, permisos y RLS.

La conexión real del frontend, la aplicación de SQL en Supabase, Storage para
evidencias y las políticas de seguridad se mantienen como una etapa separada.

Los procesos clínicos administrados por proveedores externos, incluidas las
evaluaciones clínicas y los certificados, permanecen fuera de SIEMC.
