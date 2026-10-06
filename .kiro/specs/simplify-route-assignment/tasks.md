# Implementation Plan

## Referencia de cobertura

| Requisito | Tareas que lo cubren |
|---|---|
| 1. Dialogo unico de asignacion | 4, 5, 7 |
| 2. Plan de cambios idempotente | 2, 3, 4, 7 |
| 3. Candidatos y filtros de seleccion | 2, 4, 5 |
| 4. Preparacion automatica del estado | 2, 3, 6, 8 |
| 5. Ejecucion del plan y fallos parciales | 3, 6, 8 |
| 6. Puntos de entrada | 6, 7, 8 |
| 7. Superficie de acciones | 5, 7, 8 |
| 8. Uso exclusivo de endpoints existentes | 1, 3, 6, 7, 8 |
| 9. Fuente unica de datos de ordenes | 6, 7 |

---

- [x] 1. Blindar la capa de acceso a datos antes de tocar la interfaz
  - [x] 1.1 Capturar la linea base de verificacion del repositorio
    - Ejecutar la suite de pruebas, el analizador estatico y la compilacion de tipos, y anotar el estado previo a cualquier cambio
    - Confirmar que la suite existente pasa, de modo que un fallo posterior sea atribuible a esta feature
    - Confirmar que la compilacion de tipos incluye los proyectos referenciados y no solo la aplicacion
    - _Requirements: 8.3_

- [x] 2. Calcular el plan de cambios como logica pura y verificable
  - [x] 2.1 Definir la proyeccion de ruta que recibe el calculo del plan
    - Modelar la vista de ruta que el plan consume, derivada del recurso de ruta sin transformacion adicional
    - Incluir el identificador, el estado, el vehiculo, el conductor y las dos listas de ordenes de la ruta
    - Incluir la proyeccion minima de orden necesaria para decidir si requiere marcado previo
    - _Requirements: 8.4_

  - [x] 2.2 Calcular que operaciones son realmente necesarias
    - Descartar de la seleccion toda orden que ya figure en las ordenes de la ruta o entre sus ordenes finalizadas
    - Descartar toda orden en transito, entregada o cancelada, con independencia de la seleccion
    - Descartar todo identificador de orden que no exista en la coleccion conocida, para no agregar a ciegas
    - Clasificar las ordenes restantes entre las que requieren marcado previo y las que ya estan listas
    - Conservar el orden de la seleccion del usuario en ambos grupos, para que el plan sea reproducible
    - Emitir la asignacion de vehiculo solo cuando el valor seleccionado difiere del vigente
    - Emitir la asignacion de conductor solo cuando el valor seleccionado difiere del vigente
    - Habilitar el inicio de ruta solo cuando el usuario lo solicita y la ruta esta planificada
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 3.3, 4.2, 4.3_

  - [x] 2.3 Resolver si el plan merece ejecutarse
    - Determinar que el plan esta vacio unicamente cuando las cinco operaciones estan vacias o desactivadas
    - Verificar que una seleccion identica al estado vigente de la ruta produce un plan vacio
    - Verificar que un plan sin ordenes puede seguir emitiendo cambios de vehiculo o conductor
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Calcular los conjuntos de candidatos de cada dimension
    - Incluir como candidatas de orden las que estan listas para despacho, recibidas o en proceso, y no pertenecen a la ruta
    - Incluir los vehiculos operativos junto con el que la ruta ya tiene asignado, aunque su estado no sea operativo
    - Incluir los conductores disponibles junto con el que la ruta ya tiene asignado, aunque su estado no sea disponible
    - Limitar las rutas ofrecidas para una orden a las no completadas y a las que no contienen esa orden
    - _Requirements: 3.1, 3.4, 3.5, 6.4_

  - [x] 2.5 Cubrir el calculo del plan con pruebas unitarias
    - Cubrir el plan vacio cuando la seleccion replica el estado vigente
    - Cubrir el descarte de ordenes ya presentes, entre ellas las finalizadas y las de identificador desconocido
    - Cubrir la clasificacion de marcado previo y su omision para las ordenes ya listas
    - Cubrir la exclusion de ordenes en transito, entregadas y canceladas
    - Cubrir la reproducibilidad del orden de la seleccion
    - Cubrir la emision y omision de vehiculo y de conductor segun coincida o difiera del valor vigente
    - Cubrir el inicio de ruta solo desde el estado planificada
    - Cubrir la deteccion de plan vacio y el plan con ordenes vacias pero cambios de vehiculo o conductor
    - Cubrir los conjuntos de candidatos de ordenes, vehiculos, conductores y rutas, con el caso del recurso ya asignado con estado no admisible
    - Ejecutar la suite hasta que todos los casos pasen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 6.4_

- [x] 3. Orquestar el plan como secuencia con dos clases de fallo
  - [x] 3.1 Definir el resultado de la ejecucion y sus desenlaces
    - Modelar el paso fallido de la ejecucion y la advertencia de una orden omitida por fallo de marcado
    - Modelar los tres desenlaces: exito completo, resultado parcial por fallos de marcado y fallo que detiene
    - Definir el resultado de la ejecucion con las ordenes aplicadas, las advertencias acumuladas y el paso fallido
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 3.2 Ejecutar las marcas de estado tolerando el fallo por orden
    - Marcar como lista para despacho cada orden del plan que lo requiera, antes de agregarla a la ruta
    - Omitir la orden cuyo marcado falle, acumular su advertencia con el motivo y continuar con las demas
    - Extraer el motivo legible de la respuesta del servidor cuando exista, y usar un texto por defecto que nombre la orden cuando no exista
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 3.3 Ejecutar las operaciones esenciales deteniendose ante el primer fallo
    - Agregar a la ruta cada orden del plan, en el orden calculado, registrando las ordenes que el servidor confirme
    - Asignar el vehiculo y luego el conductor solo cuando el plan lo indique
    - Iniciar la ruta solo cuando el plan lo indique
    - Detener la secuencia ante el fallo de cualquiera de estas operaciones e informar en que paso se produjo y que ordenes quedaron aplicadas
    - Impedir una segunda ejecucion concurrente mientras la primera esta en curso
    - No invocar ninguna peticion cuando el plan este vacio
    - _Requirements: 2.1, 5.1, 5.2, 5.7, 5.9, 8.1, 8.2_

  - [x] 3.4 Acumular advertencias por ruta de forma persistente
    - Conservar las advertencias de la ultima ejecucion por ruta, para que reaparezcan al reabrir su dialogo
    - Permitir descartar las advertencias de una ruta sin exigir guardar el plan
    - Conservar las advertencias de una ejecucion parcial junto con las de ejecuciones previas no descartadas
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4. Extender el sistema de notificaciones para expresar advertencias
  - [x] 4.1 Anadir el tipo de advertencia conservando los existentes
    - Extender la union de tipos de notificacion con el valor de advertencia
    - Sustituir la seleccion binaria de icono y color por una resolucion por tipo, para admitir el tercer caso
    - Conservar sin cambios el icono, el color, la duracion y la estructura de las notificaciones de exito y de error
    - _Requirements: 10.7, 10.8, 10.9_

  - [x] 4.2 Permitir informar un detalle por orden
    - Admitir en la notificacion una lista opcional de lineas de detalle
    - Mostrar cada orden afectada con su identificador y su motivo, en lugar de un unico titulo recortado
    - Ampliar el ancho del aviso cuando exista detalle, sin alterar el ancho de los avisos existentes
    - _Requirements: 10.6, 10.10_

  - [x] 4.3 Notificar el resultado de la ejecucion con la severidad correcta
    - Notificar como exito el desenlace de exito completo
    - Notificar como advertencia el desenlace parcial, con el detalle de las ordenes omitidas
    - Notificar como error el desenlace que detiene la secuencia, con el paso fallido
    - Diferenciar visualmente la advertencia del error, con icono, color y etiqueta
    - _Requirements: 4.5, 5.6, 5.7, 10.7_

- [x] 5. Presentar la asignacion en un unico dialogo
  - [x] 5.1 Mostrar las tres dimensiones a la vez
    - Presentar simultaneamente las secciones de ordenes, vehiculo y conductor, sin navegacion por pasos
    - Exponer un unico control de guardado que persiste las tres dimensiones
    - Preseleccionar los valores ya vigentes de la ruta en las tres secciones
    - Mostrar el titulo y el estado de la ruta cuando la ruta en edicion sea fija
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Construir la lista de ordenes con filtro de busqueda
    - Listar las ordenes candidatas con su identificador, destino, peso y estado
    - Ofrecer un filtro de busqueda que reduzca la lista por identificador, direccion, ciudad y estado
    - Indicar de forma explicita cuando no hay ordenes candidatas y por que motivo
    - Mantener seleccion multiple e independiente sobre la lista filtrada
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 5.3 Ofrecer la variante de orden fija
    - Ocultar la lista de ordenes y mostrar un unico candidato, la orden en edicion, marcada y no descartable
    - Mostrar un selector de ruta destino inicializado en la ruta ya asignada a la orden cuando exista
    - Informar que el conductor y el vehiculo quedan determinados por la ruta elegida
    - Impedir guardar mientras no se haya elegido ruta
    - _Requirements: 3.7, 6.2, 6.3, 6.4_

  - [x] 5.4 Reflejar el estado del plan en los controles
    - Deshabilitar el control de guardado cuando el plan no contenga ninguna accion
    - Mostrar la opcion de iniciar la ruta al terminar, disponible solo desde el estado planificada
    - Deshabilitar los controles mientras una ejecucion este en curso
    - Mostrar un estado de error por seccion cuando falle la carga de ordenes, vehiculos o conductores, e impedir el guardado
    - _Requirements: 2.2, 5.6, 5.8, 5.9_

  - [x] 5.5 Presentar las advertencias y el resultado parcial dentro del dialogo
    - Mostrar la advertencia acumulada junto al control de guardado mientras existan advertencias sin resolver
    - Mantener el dialogo abierto tras un resultado parcial, en lugar de cerrarlo
    - Mostrar en el dialogo el paso en que se produjo un fallo y las ordenes que quedaron aplicadas
    - Pedir confirmacion explicita antes de descartar el resultado parcial al intentar cerrar
    - Permitir descartar las advertencias de forma explicita sin guardar
    - _Requirements: 4.6, 4.7, 4.8, 5.4, 5.5, 10.1, 10.2, 10.3, 10.5_

  - [x] 5.6 Cerrar el dialogo solo en el desenlace de exito completo
    - Cerrar el dialogo y confirmar el resultado cuando todas las acciones del plan se completen sin fallos
    - _Requirements: 1.3, 5.7_

- [x] 6. Redirigir el acceso al flujo desde la pagina de rutas
  - [x] 6.1 Sustituir el estado de accion multiple por uno solo
    - Reemplazar el discriminante de cuatro acciones por un unico estado de dialogo abierto con la ruta en edicion
    - Retirar los manejadores individuales de conductor, vehiculo, orden y orden entregada, y los estados de seleccion que solo los alimentaban
    - _Requirements: 1.5, 7.2_

  - [x] 6.2 Obtener ordenes desde la fuente unica
    - Reemplazar la consulta propia de ordenes por el hook compartido, con la misma clave de cache que el resto de la aplicacion
    - Confirmar que la eliminacion de la clave duplicada no deja sin invalidar la lista de ordenes tras una asignacion
    - Confirmar que un cambio de estado o de ruta de una orden se refleja en el dialogo sin recarga manual
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.3 Encadenar la creacion de ruta con el dialogo
    - Abrir el dialogo de asignacion para la ruta recien creada al confirmar su creacion
    - Mantener la creacion de ruta como accion separada, fuera del dialogo de asignacion
    - _Requirements: 6.5, 8.2_

  - [x] 6.4 Conservar las superficies ajenas al flujo
    - Dejar intactos el buscador y los filtros de estado, conductor y vehiculo
    - Conservar el panel de detalle de ruta y su accion de iniciar
    - _Requirements: 7.1, 8.3_

- [x] 7. Redirigir el acceso al flujo desde la pagina de ordenes
  - [x] 7.1 Reemplazar el dialogo de asignacion de ruta por el dialogo unico
    - Retirar el dialogo de asignacion de ruta a la orden y reutilizar el dialogo unico en su variante de orden fija
    - Retirar el dialogo de asignacion de vehiculo y el de ordenes entregadas de la tarjeta de ruta
    - Conservar el dialogo de asignacion de conductor, que sigue en uso desde el detalle de conductor
    - Verificar que la compilacion de tipos falla si el dialogo de conductor se retira por error
    - _Requirements: 1.5, 6.1, 6.2, 7.5, 8.2_

  - [x] 7.2 Derivar la seleccion del detalle de la orden
    - Abrir el dialogo con la orden ya fijada y la ruta ya asignada preseleccionada
    - Conservar el cierre del dialogo y la notificacion de resultado tras guardar
    - _Requirements: 6.2, 6.3_

- [x] 8. Reducir la superficie de acciones de la tarjeta y del detalle
  - [x] 8.1 Dejar dos acciones en la tarjeta de ruta
    - Mostrar unicamente las acciones de asignar e iniciar
    - Retirar de la tarjeta los botones de agregar orden, asignar vehiculo, asignar conductor y registrar entregada
    - Conservar en la tarjeta la lectura de ordenes finalizadas, vehiculo y conductor
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Trasladar el marcado de ordenes entregadas al detalle de ruta
    - Ofrecer una accion por orden pendiente para registrarla como entregada, sin abrir un dialogo adicional
    - Conservar el uso del endpoint de ordenes entregadas con su politica de cache actual
    - Adaptar el panel de detalle para recibir la coleccion de ordenes de la ruta, incluido el caso de una sola orden en la variante de orden fija
    - _Requirements: 7.3, 7.4, 8.2, 8.3_

  - [x] 8.3 Verificar el cierre de la feature
    - Ejecutar la suite de pruebas y confirmar que los casos nuevos pasan
    - Ejecutar el analizador estatico y confirmar que no quedan referencias a los componentes retirados
    - Ejecutar la compilacion de tipos y confirmar que valida las dos variantes de invocacion del dialogo
    - Confirmar que ninguna llamada de la feature usa un endpoint distinto de los siete previstos
    - Confirmar que el recorrido completo desde la tarjeta de ruta y desde el detalle de la orden produce el mismo plan para el mismo estado
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
