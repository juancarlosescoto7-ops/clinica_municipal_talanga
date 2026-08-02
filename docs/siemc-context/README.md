# SIEMC — Contexto ligero para Codex

## Propósito
Paquete de contexto para construir el sistema de forma incremental con Next.js, TypeScript, npm y Supabase.

## Reglas esenciales
- Codex implementa únicamente el módulo solicitado.
- Cada módulo entrega frontend, servicios, tipos, tablas, índices y RPC.
- Codex no ejecuta SQL, no prueba, no despliega y no configura servicios externos.
- La autenticación se desarrollará al final.
- El usuario valida manualmente cada avance.
- Las evaluaciones clínicas y los certificados están fuera de SIEMC y
  pertenecen a sistemas externos de proveedores.

## Orden de lectura
1. 01_CONTEXTO_DEL_PROYECTO.md
2. 02_FLUJO_FUNCIONAL_GENERAL.md
3. 03_ESTRUCTURA_FRONTEND.md
4. 04_MODULOS_Y_FORMULARIOS.md
5. 05_COMPONENTES_REUTILIZABLES.md
6. 06_SERVICIOS_TABLAS_Y_RPC.md
7. 07_REGLAS_PARA_CODEX.md
8. 08_PLAN_DE_DESARROLLO_MODULAR.md
9. 09_PROMPT_MAESTRO_CODEX.md
10. 10_PLANTILLA_SOLICITUD_MODULO.md
