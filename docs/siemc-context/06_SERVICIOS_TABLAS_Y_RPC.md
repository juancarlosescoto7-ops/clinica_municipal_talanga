# Servicios, tablas y RPC

## Entrega obligatoria por módulo
- Frontend.
- Servicios.
- Tipos.
- Tablas.
- Índices.
- RPC.
- Seeds indispensables.
- README.
- Guía de prueba manual.

## SQL del módulo
```text
src/modules/<modulo>/sql/
├── 01_tables.sql
├── 02_indexes.sql
├── 03_functions.sql
├── 04_seed.sql
└── README.md
```

Solo crear los archivos necesarios.

## Fuente autoritativa e instalador
```text
src/modules/<modulo>/sql/       # fuente editable
supabase/SIEMC_INSTALACION.sql  # único instalador manual
```

`scripts/build-supabase-sql.mjs` produce un solo instalador completo a partir
de las fuentes modulares, pero no ejecuta SQL.

## Tablas
- Crear solo las del módulo solicitado.
- Reutilizar estructuras existentes.
- Definir PK, FK, NOT NULL, UNIQUE y CHECK.
- No usar DROP sin autorización.
- No anticipar módulos futuros.

## Persistencia del flujo guiado

La persistencia se organiza por dominio aunque la interfaz funcione como un
solo proceso asistido:

1. Pacientes y atenciones.
2. Servicios y tarifas.
3. Personal y salarios.
4. Caja y pagos.
5. Proveedores y comisiones.
6. Arqueos.
7. Depósitos.
8. Operación guiada como orquestador.
9. Informes mensuales.

Cada módulo conserva sus tablas, índices, RPC, tipos y servicio. La operación
guiada no duplica entidades: coordina sus RPC dentro de transacciones.

## RPC
Usar RPC cuando:
- Se modifican varias tablas.
- Se generan correlativos.
- Hay validaciones críticas.
- Existe lógica financiera.
- La operación debe ser transaccional.

Cada RPC debe documentar:
- Objetivo.
- Parámetros.
- Retorno.
- Tablas afectadas.
- Validaciones.
- Excepciones.
- Servicio que la consume.

## Cliente compartido de Supabase

- Variables públicas: `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Plantilla versionada: `.env.example`.
- Credenciales locales: `.env.local`, excluido de Git.
- Cliente diferido: `src/services/supabase.ts`.
- Adaptador compartido: `src/services/supabase-rpc-executor.ts`.
- Los módulos dependen de `RpcExecutor` y no importan directamente el SDK.
- Nunca se utiliza una clave secreta o `service_role` en el navegador.
- Crear el cliente no autoriza a Codex a realizar llamadas reales.

## Prohibiciones
Codex no debe utilizar credenciales reales, realizar llamadas a Supabase,
ejecutar SQL, probar RPC, activar RLS ni afirmar que algo fue validado.

## Cierre obligatorio
Implementación realizada. Pendiente de validación manual por el usuario.
