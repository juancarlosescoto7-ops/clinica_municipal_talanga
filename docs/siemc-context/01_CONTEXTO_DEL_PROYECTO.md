# Contexto del proyecto

## Nombre provisional
Sistema Integral de Operación y Control de la Clínica Municipal — SIEMC.

## Operación controlada por SIEMC
La Clínica Municipal opera mediante una jornada guiada. El sistema conduce a
la persona usuaria desde la apertura de caja hasta el registro del paciente,
la asignación del servicio, el cobro, el cierre, el depósito y el informe
mensual.

Las evaluaciones clínicas y la emisión de certificados son realizadas por
proveedores externos en sus propios sistemas de gestión. Esos procesos, sus
resultados y sus documentos no forman parte de SIEMC.

## Personal interno
- Captadora de pacientes.
- Administradora financiera.

## Proveedores externos
- Proveedores responsables de los servicios clínicos.
- No son empleados municipales.
- No registran expedientes, evaluaciones ni certificados en SIEMC.

## Problemas
- No existe certeza de que toda persona que llega sea registrada.
- Pueden existir cobros fuera del control municipal.
- Se sospechan remisiones hacia clínicas privadas.
- No existe conciliación completa entre pacientes, pagos, caja, arqueos,
  depósitos y obligaciones con proveedores.

## Objetivo
Controlar y asistir el proceso administrativo y financiero desde la llegada
del paciente hasta el depósito bancario y el resultado mensual, sin almacenar
información clínica y sin exigir navegación manual entre módulos.

## Enfoque de desarrollo
El código puede conservar separación por dominios, pero la interfaz se
construye alrededor de procesos integrados. Los módulos no deben presentarse
como destinos operativos aislados.

La etapa actual es una maqueta funcional en memoria. La persistencia se
implementará posteriormente.

Cada módulo debe incluir:
- Páginas.
- Componentes.
- Formularios.
- Tipos TypeScript.
- Servicios.
- Tablas SQL.
- Índices SQL.
- RPC SQL.
- Instrucciones de prueba manual.

## Límite funcional permanente
- No registrar evaluaciones médicas.
- No registrar evaluaciones psicológicas.
- No generar, imprimir, entregar ni sustituir certificados.
- No replicar los sistemas de gestión propios de los proveedores.

## Fuera de alcance inicial
- Autenticación.
- Roles y permisos.
- RLS.
- Pruebas automatizadas.
- Despliegue.
- Configuración de GitHub o Vercel.
- Ejecución o validación directa en Supabase.
