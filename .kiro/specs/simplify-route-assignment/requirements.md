# Requirements Document

## Introduction

Configurar una ruta para despachar ordenes exige hoy alrededor de doce clics repartidos en cuatro modales separados, y el recorrido esta duplicado en dos paginas con reglas de candidato distintas. Un despachista que entra por `/routes` debe crear la ruta y luego abrir un modal por cada dimension (orden, vehiculo, conductor), mientras que uno que entra por `/orders` primero tiene que marcar la orden como lista para despacho y despues descubrir que la ruta elegida probablemente no tiene vehiculo ni conductor asignados, lo que le obliga a volver a `/routes`.

Esta feature reemplaza ese recorrido por un unico dialogo de asignacion donde ordenes, vehiculo y conductor se configuran a la vez y se guardan con una sola accion. El beneficio central no es solo cosmetico: el guardado calcula un plan de cambios y omite todo lo que no varia realmente, de modo que reabrir el dialogo y pulsar Guardar sin tocar nada no dispara ninguna peticion.

La restriccion dura del trabajo es que no se agregan ni se eliminan endpoints. Todo el comportamiento nuevo se construye orquestando los siete endpoints de rutas y ordenes que el frontend ya consume.

## Requirements

### Requirement 1: Dialogo unico de asignacion
**Objective:** Como despachista, quiero configurar ordenes, vehiculo y conductor de una ruta en una sola pantalla, para dejar de saltar entre modales y completar el despacho de una sentada.

#### Acceptance Criteria

1. WHEN el despachista pulsa "Asignar" en una tarjeta de ruta THEN el sistema SHALL abrir un unico dialogo que muestre simultaneamente las secciones de ordenes, vehiculo y conductor.
2. WHILE el dialogo de asignacion esta abierto THE sistema SHALL mostrar las tres secciones de forma simultanea, sin navegacion por pasos ni asistente.
3. WHEN el dialogo de asignacion esta abierto THEN el sistema SHALL exponer un unico control de guardado que persiste las tres dimensiones.
4. WHEN el dialogo de asignacion esta abierto THEN el sistema SHALL preseleccionar los valores ya vigentes de la ruta (ordenes, vehiculo y conductor) para que el despachista solo tenga que cambiar lo que falta.
5. WHEN la feature esta desplegada THEN el sistema SHALL retirar de la tarjeta de ruta los modales separados de agregar orden, asignar vehiculo y registrar orden entregada.

### Requirement 2: Plan de cambios idempotente
**Objective:** Como despachista, quiero que guardar no haga nada cuando no cambie nada, para no generar trafico inutil ni ensuciar el historial de la ruta.

#### Acceptance Criteria

1. IF el despachista abre el dialogo y pulsa Guardar sin modificar ningun campo THEN el sistema SHALL no despachar ninguna peticion de red.
2. IF el plan de cambios no contiene ninguna accion THEN el sistema SHALL deshabilitar el control de guardado.
3. WHEN una orden seleccionada ya pertenece a la ruta THEN el sistema SHALL omitir su agregado.
4. WHEN el vehiculo seleccionado es el mismo que la ruta ya tiene asignado THEN el sistema SHALL omitir la asignacion de vehiculo.
5. WHEN el conductor seleccionado es el mismo que la ruta ya tiene asignado THEN el sistema SHALL omitir la asignacion de conductor.
6. IF el estado de la ruta no es "PLANNED" THEN el sistema SHALL omitir el inicio de la ruta, incluso si el despachista lo solicito.
7. WHEN se evalua un plan THEN el sistema SHALL emitir las ordenes a agregar, a marcar como listas, y las asignaciones de vehiculo y conductor en un orden determinista y reproducible.

### Requirement 3: Candidatos y filtros de seleccion
**Objective:** Como despachista, quiero ver solo las ordenes y recursos que realmente puedo asignar, para no ofrecerme candidatos invalidos que el backend va a rechazar.

#### Acceptance Criteria

1. WHEN el dialogo de asignacion lista ordenes candidatas THEN el sistema SHALL incluir las ordenes en estado "READY_FOR_DISPATCH", "RECEIVED" o "PROCESSING" que no pertenezcan a la ruta.
2. WHEN el dialogo de asignacion lista ordenes candidatas THEN el sistema SHALL excluir cualquier orden que ya figure en la lista de ordenes de la ruta o en su lista de ordenes finalizadas.
3. WHEN el dialogo de asignacion lista ordenes candidatas THEN el sistema SHALL excluir las ordenes en estado "IN_TRANSIT", "DELIVERED" o "CANCELLED".
4. WHEN el dialogo de asignacion lista vehiculos THEN el sistema SHALL incluir los vehiculos en estado "OPERATIONAL" junto con el vehiculo que la ruta ya tiene asignado.
5. WHEN el dialogo de asignacion lista conductores THEN el sistema SHALL incluir los conductores en estado "AVAILABLE" junto con el conductor que la ruta ya tiene asignado.
6. WHEN hay mas candidatas que las que caben en pantalla THEN el sistema SHALL ofrecer un filtro de busqueda dentro del dialogo.
7. WHEN el dialogo se abre en modo orden fija THEN el sistema SHALL mostrar un unico candidato, la orden en edicion, sin permitir quitarla de la seleccion.

### Requirement 4: Preparacion automatica del estado de la orden
**Objective:** Como despachista, quiero que las ordenes queden listas para despacho sin un paso previo, para no perder un clic en un estado que es un trampolin tecnico.

#### Acceptance Criteria

1. WHEN el plan incluye una orden seleccionada en estado "RECEIVED" o "PROCESSING" THEN el sistema SHALL invocar el endpoint de marcar lista para despacho antes de agregar esa orden a la ruta.
2. WHEN el plan incluye una orden seleccionada que ya esta en estado "READY_FOR_DISPATCH" THEN el sistema SHALL NOT invocar el endpoint de marcar lista para despacho.
3. THE sistema SHALL NOT invocar el endpoint de marcar lista para despacho sobre ordenes en estado "IN_TRANSIT", "DELIVERED" o "CANCELLED".
4. WHEN el marcado de una orden falla THEN el sistema SHALL omitir esa orden, SHALL NOT agregarla a la ruta y SHALL continuar con las ordenes restantes del plan.
5. WHEN el marcado de una orden falla THEN el sistema SHALL emitir una notificacion de advertencia que identifique la orden afectada por su identificador y la razon del rechazo.
6. WHEN el marcado de una orden falla THEN el sistema SHALL acumular la orden en una advertencia persistente del dialogo, junto con las demas que fallen en la misma ejecucion.
7. WHEN existen ordenes que no pudieron marcarse y el resto del plan se completo THEN el sistema SHALL mantener el dialogo abierto y SHALL presentar la advertencia de forma visible y persistente, no solo como aviso temporal.
8. WHEN el despachista intenta cerrar un dialogo que contiene advertencias pendientes THEN el sistema SHALL requerir confirmacion explicita antes de descartar el resultado parcial.

### Requirement 5: Ejecucion del plan y fallos parciales
**Objective:** Como despachista, quiero saber con precision que quedo aplicado cuando algo falla, para no dejar la ruta en un estado que no entiendo.

#### Acceptance Criteria

1. WHEN el despachista pulsa Guardar THEN el sistema SHALL ejecutar las acciones del plan en el orden marcado por la Requirement 2.7.
2. WHEN una accion del plan que no sea el marcado de estado falla THEN el sistema SHALL detener la secuencia y SHALL NOT ejecutar las acciones posteriores.
3. WHEN el marcado de estado de una orden falla THEN el sistema SHALL registrar el fallo de esa orden, SHALL emitir la advertencia de la Requirement 4.5 y SHALL continuar con el resto de la secuencia.
4. WHEN la secuencia se detiene por un fallo THEN el sistema SHALL mantener el dialogo abierto e informar que ordenes quedaron aplicadas y en que paso se produjo el fallo.
5. WHEN la secuencia termina con ordenes omitidas por fallo de marcado y sin otro fallo THEN el sistema SHALL NOT cerrar el dialogo, SHALL presentar la advertencia persistente de la Requirement 4.7 y SHALL reportar el resultado como parcial.
6. WHEN la ejecucion produce una advertencia de marcado de estado THEN el sistema SHALL distinguirla de un error que detiene la secuencia, tanto en el tipo de notificacion como en el texto.
7. WHEN todas las acciones del plan se completan sin fallos THEN el sistema SHALL cerrar el dialogo y notificar el resultado al despachista.
8. IF la carga de ordenes, vehiculos o conductores falla THEN el sistema SHALL mostrar un estado de error y SHALL NOT permitir el guardado.
9. WHILE una accion del plan esta en curso THE sistema SHALL impedir un segundo guardado concurrente.

### Requirement 6: Puntos de entrada
**Objective:** Como despachista, quiero completar la asignacion desde donde estoy mirando, para no saltar entre `/routes` y `/orders`.

#### Acceptance Criteria

1. WHEN el despachista abre el dialogo desde una tarjeta de ruta THEN el sistema SHALL fijar la ruta y SHALL ofrecer la seleccion multiple de ordenes.
2. WHEN el despachista abre el dialogo desde el detalle de una orden THEN el sistema SHALL fijar la orden y SHALL ofrecer la seleccion de ruta destino.
3. WHEN el dialogo se abre desde el detalle de una orden THEN el sistema SHALL informar que el conductor y el vehiculo quedan determinados por la ruta elegida.
4. WHEN el dialogo se abre desde el detalle de una orden THEN el sistema SHALL limitar las rutas ofrecidas a las no completadas y a las que no contengan ya la orden en edicion.
5. WHEN el despachista crea una ruta nueva THEN el sistema SHALL abrir el dialogo de asignacion para esa ruta recien creada.

### Requirement 7: Superficie de acciones
**Objective:** Como despachista, quiero menos controles ambiguos en la tarjeta de ruta, para ver de un vistazo que puedo hacer.

#### Acceptance Criteria

1. WHEN se renderiza una tarjeta de ruta THEN el sistema SHALL mostrar exactamente dos acciones: asignar e iniciar.
2. WHEN se renderiza una tarjeta de ruta THEN el sistema SHALL NOT mostrar los botones de agregar orden, asignar vehiculo, asignar conductor ni registrar entregada.
3. WHEN el panel de detalle de ruta lista una orden pendiente THEN el sistema SHALL ofrecer una accion para registrarla como entregada.
4. WHEN el despachista registra una orden pendiente como entregada THEN el sistema SHALL usar el endpoint de ordenes entregadas de la ruta.
5. WHEN se visualiza el detalle de un conductor THEN el sistema SHALL conservar el dialogo de asignacion de conductor existente, con su seleccion de ruta.

### Requirement 8: Uso exclusivo de endpoints existentes
**Objective:** Como administrador de la plataforma, quiero que esta feature no altere el contrato con el backend, para poder desplegarla sin coordinacion de API.

#### Acceptance Criteria

1. THE sistema SHALL implementar el comportamiento de asignacion unicamente mediante los endpoints de rutas y ordenes ya existentes.
2. THE sistema SHALL NOT introducir endpoints nuevos ni eliminar o renombrar endpoints existentes.
3. THE sistema SHALL NOT modificar el contrato ni el comportamiento del servicio de rutas ni de sus hooks de consulta y mutacion individuales.
4. WHEN la feature necessitate reutilizar un endpoint existente THEN el sistema SHALL orquestarlo desde una capa nueva, sin alterar su firma publica.

### Requirement 9: Fuente unica de datos de ordenes
**Objective:** Como despachista, quiero que la lista de ordenes sea consistente en toda la aplicacion, para no ver candidatos que ya cambiaron de estado.

#### Acceptance Criteria

1. WHEN la pagina de rutas necesite ordenes THEN el sistema SHALL obtenerlas mediante el hook de ordenes compartido, con la misma clave de cache que el resto de la aplicacion.
2. THE sistema SHALL NOT mantener una segunda consulta de ordenes con clave de cache propia.
3. WHEN una orden cambia de estado o de ruta THEN el sistema SHALL reflejar el cambio en el dialogo de asignacion sin requerir recarga manual de la pagina.

### Requirement 10: Notificaciones persistentes de resultado parcial
**Objective:** Como despachista, quiero ver las ordenes que quedaron fuera de mi asignacion aunque cierre el dialogo, para no perder de vista una entrega sin despachar.

#### Acceptance Criteria

1. WHEN el sistema debe informar de un resultado parcial THEN el sistema SHALL ofrecer una superficie de advertencia persistente en el dialogo, independiente de la notificacion efimera.
2. WHILE existen advertencias sin resolver THE sistema SHALL mantener visible la advertencia acumulada junto al control de guardado.
3. WHEN el despachista vuelve a abrir el dialogo de una ruta THEN el sistema SHALL mostrar las advertencias de la ultima ejecucion hasta que las descarte explicitamente.
4. WHEN el despachista descarta las advertencias THE sistema SHALL NOT requerir el guardado del plan para limpiarlas.
5. WHEN el dialogo se cierra con advertencias sin resolver THEN el sistema SHALL requerir confirmacion explicita antes de descartarlas.
6. WHEN se muestra una advertencia THEN el sistema SHALL enumerar cada orden afectada con su identificador y su motivo, en lugar de un texto agregado sin detalle.
7. THE sistema SHALL diferenciar visualmente una advertencia de un error, mediante icono, color y etiqueta, para que no se confundan.
8. WHEN el sistema emite notificaciones de resultado THE sistema SHALL soportar un tipo de advertencia distinguible del exito y del error.
9. WHEN el sistema emite notificaciones de resultado THE sistema SHALL NOT modificar el comportamiento de las notificaciones de exito y de error ya existentes en otras pantallas.
10. WHEN el sistema emite una advertencia THEN el sistema SHALL permitir informar un detalle por orden y SHALL NOT limitar el mensaje a un unico titulo recortado.

## Fuera de alcance

- Los cuatro filtros de la pagina de rutas (busqueda, conductor, vehiculo y estado) permanecen sin cambios. No son un paso del flujo y mezclarlos ensuciaria el diff de la logica de asignacion.
- La creacion de rutas desde dentro del dialogo de asignacion. El dialogo opera sobre una ruta existente; crear una ruta sigue siendo una accion separada que despues encadena la apertura del dialogo.
- Cualquier cambio en el modelo de datos, en la normalizacion de ids entre backend y UI, o en los estados de orden, ruta, vehiculo o conductor.
