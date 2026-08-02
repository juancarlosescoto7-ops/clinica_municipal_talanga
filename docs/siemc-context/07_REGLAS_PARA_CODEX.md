# Reglas para Codex

## Stack
- Next.js.
- TypeScript.
- npm.
- Supabase.

## Sí debe
- Crear páginas, componentes y formularios.
- Crear servicios y tipos.
- Configurar el cliente y los adaptadores necesarios para la persistencia.
- Crear tablas, índices y RPC.
- Crear migraciones.
- Documentar pruebas manuales.
- Mantener organización modular.

## No debe
- Crear autenticación hasta que se solicite.
- Crear roles, permisos o RLS.
- Utilizar credenciales reales o realizar llamadas a Supabase.
- Ejecutar SQL.
- Probar.
- Desplegar.
- Configurar GitHub o Vercel.
- Crear NestJS.
- Crear microservicios.
- Instalar librerías innecesarias.
- Modificar módulos anteriores sin autorización.
- Afirmar que algo funciona o fue probado.

## Código
- TypeScript estricto.
- Evitar any.
- Componentes pequeños.
- Servicios por módulo.
- Nombres claros.
- Sin abstracciones prematuras.

## Dependencias
Antes de instalar:
1. Confirmar que realmente es necesaria.
2. Explicar su función.
3. Instalar con npm.
4. Evitar librerías duplicadas.

## Informe final
- Archivos creados.
- Archivos modificados.
- Componentes.
- Servicios.
- Tablas.
- RPC.
- Migraciones.
- Dependencias.
- Pendientes.
- Pruebas ejecutadas: ninguna.
