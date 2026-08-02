# Autenticación

SIEMC utiliza Supabase Auth con una sola cuenta interna. La interfaz solicita
únicamente nombre de usuario y contraseña; no ofrece registro, invitaciones ni
recuperación de contraseña.

## Identidad técnica

Supabase requiere correo o teléfono para autenticar contraseñas. SIEMC convierte
internamente cada usuario al dominio reservado `siemc.local`:

- Usuario visible: `administrador`
- Identidad que se crea en Supabase: `administrador@siemc.local`

El operador nunca necesita escribir ni conocer esa identidad técnica.

La sesión se mantiene durante la pestaña actual y se elimina al cerrar el
navegador. La interfaz escucha los eventos oficiales de autenticación de
Supabase para restaurar la sesión inicial, renovar el token y reflejar entradas
o salidas sin ejecutar validaciones paralelas que compitan entre sí.

## Crear la cuenta única

1. En Supabase Dashboard, abrir **Authentication > Users**.
2. Elegir **Add user > Create new user**.
3. Escribir `NOMBRE_DE_USUARIO@siemc.local` en el campo de correo.
4. Definir una contraseña segura y crear el usuario ya confirmado.
5. En la configuración de Auth, desactivar **Allow new users to sign up**.

No debe configurarse una clave `service_role` en el navegador ni en variables
`NEXT_PUBLIC_*`.

## Seguridad de base de datos

`sql/01_permissions.sql` retira el acceso a tablas, secuencias y RPC del rol
anónimo. Solamente las sesiones con rol `authenticated` pueden operar el sistema.
El archivo forma parte de `supabase/SIEMC_INSTALACION.sql`.
