# Servicios compartidos

## Supabase

La aplicación utiliza un cliente compartido y diferido para consumir las RPC
del esquema `public`.

### Variables requeridas

Crear `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<project-key>
```

Ambas variables son públicas porque el cliente se utilizará desde el
navegador. Nunca deben colocarse claves secretas o `service_role` en variables
con prefijo `NEXT_PUBLIC_`.

### `getSupabaseBrowserClient`

Crea una sola instancia de `SupabaseClient` cuando un módulo la solicita. La
importación del archivo no realiza peticiones de red.

La sesión se conserva en `sessionStorage` mientras la pestaña permanece abierta.
Al cerrar el navegador no se reutiliza la sesión anterior. La renovación
automática está activada y el proveedor de autenticación escucha los eventos de
Supabase para mantener sincronizada la interfaz. La detección de sesiones en la
URL permanece desactivada porque SIEMC no utiliza OAuth, enlaces mágicos ni
recuperación pública de contraseña.

### `getSupabaseBrowserRpcExecutor`

Adapta `supabase.rpc()` al contrato compartido `RpcExecutor`. Los servicios de
cada módulo reciben este contrato y no importan directamente el SDK.

## Alcance

- No contiene credenciales reales.
- No ejecuta SQL.
- No realiza llamadas durante la inicialización.
- Expone el cliente utilizado por el módulo de autenticación y por las RPC.
- La conexión efectiva ocurre únicamente cuando un módulo invoque una RPC.
