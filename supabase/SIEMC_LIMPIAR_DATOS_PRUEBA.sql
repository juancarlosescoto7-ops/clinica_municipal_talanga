-- SIEMC · LIMPIEZA DE DATOS PARA PRUEBAS
--
-- ADVERTENCIA: este archivo elimina permanentemente todos los registros
-- operativos del sistema. Úselo únicamente cuando desee comenzar una prueba
-- desde cero.
--
-- ELIMINA:
--   - pacientes, atenciones, eventos y servicios asignados;
--   - sesiones de caja, recibos, pagos y conteos;
--   - arqueos y depósitos;
--   - comisiones generadas y liquidaciones;
--   - informes mensuales generados.
--
-- CONSERVA:
--   - servicios y sus tarifas;
--   - empleados y sus salarios;
--   - proveedores y sus tarifas de comisión;
--   - denominaciones de billetes y monedas;
--   - tablas, funciones, índices y demás configuración del sistema.
--
-- No se utiliza CASCADE intencionalmente. Si el sistema incorpora una tabla
-- operativa nueva relacionada, la limpieza fallará de forma segura hasta que
-- esa tabla sea revisada y agregada explícitamente a este archivo.

begin;

-- Evita esperar indefinidamente si otra sesión está usando estas tablas.
set local lock_timeout = '10s';

truncate table
  public.informe_mensual_servicios,
  public.informe_mensual_comisiones,
  public.informe_mensual_salarios,
  public.informes_mensuales,
  public.deposito_arqueos,
  public.depositos,
  public.comision_liquidacion_detalles,
  public.comision_liquidaciones,
  public.arqueos,
  public.caja_conteo_detalles,
  public.caja_conteos,
  public.pagos,
  public.recibos,
  public.atencion_servicio_comisiones,
  public.atencion_eventos,
  public.atencion_servicios,
  public.atenciones,
  public.caja_sesiones,
  public.pacientes
restart identity;

commit;

-- Resultado esperado: todos los valores operativos deben quedar en cero.
select
  (select count(*) from public.pacientes) as pacientes,
  (select count(*) from public.atenciones) as atenciones,
  (select count(*) from public.caja_sesiones) as sesiones_caja,
  (select count(*) from public.recibos) as recibos,
  (select count(*) from public.pagos) as pagos,
  (select count(*) from public.arqueos) as arqueos,
  (select count(*) from public.depositos) as depositos,
  (select count(*) from public.comision_liquidaciones) as liquidaciones,
  (select count(*) from public.informes_mensuales) as informes;

-- Estos valores se muestran para confirmar que la configuración se conservó.
select
  (select count(*) from public.servicios) as servicios,
  (select count(*) from public.servicio_tarifas) as tarifas_servicios,
  (select count(*) from public.personal) as empleados,
  (select count(*) from public.personal_salarios) as salarios,
  (select count(*) from public.proveedores) as proveedores,
  (select count(*) from public.proveedor_comision_tarifas) as tarifas_comision,
  (select count(*) from public.caja_denominaciones) as denominaciones;
