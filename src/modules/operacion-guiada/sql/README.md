# SQL · Operación guiada

Este módulo no crea tablas ni índices. Sus funciones orquestan en transacciones
los módulos Pacientes, Servicios, Comisiones, Caja, Arqueos y Depósitos.

`registrar_paciente_guiado` reutiliza una ficha cuando el documento ya existe
y crea una atención independiente con la categoría tarifaria seleccionada.
`obtener_jornada_guiada` devuelve tanto movimientos válidos como anulados para
que la interfaz mantenga la trazabilidad sin sumarlos a los totales.
