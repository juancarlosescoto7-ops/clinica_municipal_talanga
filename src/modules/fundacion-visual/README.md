# Sistema visual de SIEMC

## Objetivo

Definir la identidad, la navegación y el lenguaje visual compartido por toda
la aplicación de la Clínica Municipal.

## Diseño vigente

- Estética contemporánea inspirada en la claridad de ChatGPT y Apple, sin
  replicar sus marcas o elementos propietarios.
- Base casi monocromática, navegación lateral clara y mayor espacio en blanco.
- Verde azulado oscuro reservado para identidad, foco, estado activo y
  acciones principales.
- Superficies translúcidas, bordes sutiles, desenfoque moderado y sombras de
  baja intensidad.
- Dos categorías tipográficas del sistema: sans serif para la interfaz y
  monoespaciada para códigos, identificadores y datos tabulares.
- Botones de acción en forma de píldora y jerarquías visuales compactas.
- Diseño adaptable para escritorio, tableta y móvil.
- Foco visible, enlace para saltar al contenido y reducción de movimiento.

El tema claro u oscuro se selecciona desde la barra superior. La primera visita
respeta la preferencia del sistema y las selecciones posteriores se conservan
en el navegador. Las vistas de impresión permanecen en tema claro.

## Componentes

### `ClinicShell`

Contiene:

- Identidad SIEMC.
- Navegación principal.
- Resumen institucional.
- Encabezado del espacio de trabajo.
- Contenedor del contenido principal.
- Estado visible de la jornada: apertura pendiente, jornada activa o caja
  cerrada.

### `ClinicNavigation`

Determina el destino activo y presenta los siete módulos vigentes agrupados
por periodicidad:

- Operación diaria: Caja y pagos; Pacientes y atenciones.
- Control al finalizar el día: Arqueo diario; Depósitos.
- Control al finalizar el mes: Reportes; Comisiones.
- Configuración: Servicios y tarifas.

Mientras la apertura está pendiente, Caja es la única ruta habilitada.

### `ClinicWorkspaceShell`

Coordina el estado de Caja con la navegación. Si se intenta acceder directamente
a otra ruta antes de la apertura, sustituye el destino por `/clinica/caja`.

## Servicio

### `getClinicNavigation`

Retorna secciones de navegación tipadas y ordenadas por periodicidad.

### `CLINIC_ENTRY_PATH`

Define `/clinica/caja` como punto de entrada obligatorio. No realiza peticiones
HTTP ni se conecta a Supabase o servicios externos.

## Tipos

### `NavigationItem`

Define cada elemento mediante `label`, `href`, `icon`, `type` y la condición
opcional `isEntryPoint`.

### `ClinicRouteType`

Limita las categorías a `daily-operation`, `end-of-day-control`,
`month-end-control` y `configuration`.

### `ClinicPath`

Limita los destinos a las rutas registradas en `CLINIC_PATHS`.

## Base de datos

- Tablas: ninguna.
- Índices: ninguno.
- RPC: ninguna.
- Seeds: ninguno.

Este módulo no contiene SQL porque no modifica la base de datos.

## Dependencias

No se agregaron dependencias. Las dos categorías tipográficas utilizan fuentes
disponibles en el sistema.

## Revisión manual sugerida

Codex no ejecutó estas instrucciones.

1. Ejecutar `npm.cmd run dev`.
2. Abrir `http://localhost:3000/clinica`.
3. Confirmar la redirección inmediata a `/clinica/caja`.
4. Confirmar que Caja sea la única ruta disponible antes de la apertura.
5. Abrir Caja y comprobar que se habiliten las demás rutas.
6. Navegar entre módulos y regresar a Caja para confirmar que la sesión se
   conserva durante la navegación.
7. Cerrar Caja y comprobar que Arqueos y Depósitos continúen disponibles.
8. Revisar los cuatro grupos de navegación en escritorio y móvil.
9. Recargar el navegador y confirmar que la jornada vuelve a requerir apertura.

## Pendientes

- Validación visual manual por el usuario.
- Ajustes corporativos derivados de esa revisión.
- Persistencia posterior del estado de jornada mediante el servicio real.
