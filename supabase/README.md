# Instalación de Supabase

Existe un único documento de instalación:

`supabase/SIEMC_INSTALACION.sql`

Para instalar SIEMC:

1. Crear un proyecto nuevo en Supabase.
2. Abrir **SQL Editor**.
3. Copiar y ejecutar completo `SIEMC_INSTALACION.sql`.
4. Copiar la URL y la clave pública del proyecto a `.env.local`.
5. Configurar la cuenta única en **Authentication > Users** usando la identidad
   técnica `NOMBRE_DE_USUARIO@siemc.local` y una contraseña segura.
6. Desactivar **Allow new users to sign up** en la configuración de Auth.
7. Reiniciar la aplicación.

En la pantalla de acceso solo se escribe `NOMBRE_DE_USUARIO`; el sufijo técnico
`@siemc.local` se agrega internamente y nunca se muestra al operador.

No deben ejecutarse archivos SQL individuales de los módulos. Esos archivos
son las fuentes definitivas usadas por `npm.cmd run sql:build` para reconstruir
el instalador único.

El instalador puede volver a ejecutarse para actualizar las RPC y triggers. No
elimina tablas ni datos existentes.
