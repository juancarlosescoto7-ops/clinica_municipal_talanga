-- SIEMC · Autenticación y permisos para el acceso interno único.
-- Debe ejecutarse después de crear todas las tablas, secuencias y funciones.

-- PUBLIC incluye a todos los roles. Es necesario retirar sus permisos para que
-- una revocación aplicada únicamente a anon no sea anulada por esa herencia.
revoke usage on schema public from public;
revoke all privileges on all tables in schema public from public, anon;
revoke all privileges on all sequences in schema public from public, anon;
revoke execute on all functions in schema public from public, anon;

-- La cuenta interna autenticada utiliza las RPC existentes, que son funciones
-- invocadoras y por ello necesitan permisos sobre sus tablas y secuencias.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select, update on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Mantener la misma política para objetos que se agreguen en futuras versiones.
alter default privileges in schema public
  revoke all privileges on tables from public, anon;
alter default privileges in schema public
  revoke all privileges on sequences from public, anon;
alter default privileges in schema public
  revoke execute on functions from public, anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select, update on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;
