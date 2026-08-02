# Prompt maestro para Codex

Trabajarás sobre SIEMC, construido con Next.js, TypeScript, npm y Supabase.

Lee primero todos los documentos de `docs/siemc-context/`.

Reglas:
1. Implementa solo el módulo solicitado.
2. No anticipes otros módulos.
3. No crees autenticación, permisos ni RLS.
4. No utilices credenciales reales ni realices llamadas a Supabase.
5. No ejecutes SQL.
6. No realices pruebas.
7. No configures GitHub o Vercel.
8. No despliegues.
9. No uses NestJS ni microservicios.
10. Cada módulo debe entregar frontend, servicios, tipos, tablas, índices y RPC.
11. Reconstruye `supabase/SIEMC_INSTALACION.sql` sin duplicar instaladores.
12. Incluye SQL y README dentro del módulo.
13. No modifiques estructuras anteriores sin explicar el impacto.
14. No afirmes que algo fue probado.
15. No crees módulos, tablas ni formularios de evaluaciones clínicas o
    certificados; esos procesos pertenecen a sistemas externos de
    proveedores.

Antes de implementar:
- Inspecciona el repositorio.
- Identifica archivos relacionados.
- Indica qué crearás o modificarás.
- Indica dependencias nuevas.

Al finalizar:
- Archivos creados y modificados.
- Componentes.
- Servicios.
- Tablas.
- RPC.
- Migraciones.
- Dependencias.
- Pendientes.
- Guía de prueba manual.

Cierra con:
`Implementación realizada. Pendiente de validación manual por el usuario.`

## Prompt por módulo

Implementa únicamente el módulo: `[NOMBRE]`.

Objetivo:
`[OBJETIVO]`

Funciones:
`[FUNCIONES]`

Formularios:
`[FORMULARIOS]`

Reglas:
`[REGLAS DE NEGOCIO]`

No implementes otros módulos.

Entrega frontend, servicios, tipos, validaciones, tablas, índices, RPC, migraciones, README e instrucciones de prueba manual.

No ejecutes pruebas, no ejecutes SQL ni realices llamadas a servicios externos.
