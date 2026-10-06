# Implementation Plan

- [x] 1. Fijar el contrato dimensional en el modelo de vista
  - [x] 1.1 Aceptar los 7 campos dimensionales como opcionales y nulables en el tipo de recurso HTTP, leyendo exclusivamente claves camelCase del glosario; `captureSource` se tipa opcional fuera de la lista cerrada y `locationSource` no se tipa
    - Valores fuera de vocabulario y claves no reconocidas quedan como ausentes, sin excepción
    - _Requirements: R-WEB-1_
  - [x] 1.2 Definir el subobjeto de vista de validación dimensional con sus vocabularios cerrados por eje y la regla de presencia (un `reasonCodes` vacío cuenta como ausente y una confianza inválida cuenta como ausente)
    - El objeto es `null` cuando ningún campo de los 7 está presente
    - _Requirements: R-WEB-1, R-WEB-2_

- [x] 2. Construir los helpers puros de validación dimensional
  - [x] 2.1 Implementar la resolución estricta de la confianza visual (0-1 finita, `0` válido, fuera de rango o de tipo incorrecto → `null` sin clamp, sin reescala y sin división por 100) y su formateo a porcentaje entero con `null` → «—»
    - _Requirements: R-WEB-1_
  - [x] 2.2 Implementar el normalizador de códigos de motivo: arreglo canónico sin `JSON.parse`, cadena de contingencia envuelta en `try/catch` que degrada a código único, `null`/vacío → ausente, contrato `{ known, unknown }` con ambos arreglos siempre presentes, deduplicación preservando orden, texto desconocido nunca descartado y garantía de nunca lanzar
    - _Requirements: R-WEB-2_
  - [x] 2.3 Implementar el constructor del objeto dimensional que aplica los vocabularios cerrados, normaliza la confianza y devuelve `null` cuando no hay datos dimensionales
    - _Requirements: R-WEB-1, R-WEB-2_

- [x] 3. Integrar el mapeo dimensional en el mapper existente
  - [x] 3.1 Mapear el objeto dimensional desde el recurso en la vista de detalle y hacer de `validationSummary` la fuente única del resumen, retirando el respaldo a `aiSummary`
    - _Requirements: R-WEB-2_
  - [x] 3.2 Ajustar la fusión de detalle para que los campos dimensionales presentes del contexto nunca se sobrescriban con nulos del detalle actualizado
    - _Requirements: R-WEB-2_

- [x] 4. Renderizar la sección «Validación dimensional»
  - [x] 4.1 Mostrar los tres ejes (visual, geográfico, contextual) con su valor y su indicador de color según la matriz de ejes, y la confianza visual con porcentaje entero o «—» en gris, sin leer la confianza legacy
    - _Requirements: R-WEB-3_
  - [x] 4.2 Mostrar el veredicto y la acción operativa en elementos separados, con etiqueta «Veredicto» distintа de «Estado del análisis» y valores en español
    - _Requirements: R-WEB-3, R-WEB-4_
  - [x] 4.3 Mostrar los motivos: códigos del catálogo con etiqueta en español y códigos desconocidos con el texto crudo visible; mostrar el chip «Origen» solo cuando hay origen de captura real y omitirlo por completo cuando no lo hay
    - _Requirements: R-WEB-3_

- [x] 5. Integrar la sección en el detalle sin alterar lo existente
  - [x] 5.1 Insertar la sección inmediatamente después del encabezado «Estado del análisis» y solo cuando el registro trae datos dimensionales, conservando foto, banner de secciones degradadas, resumen, motivos de fallo, etiquetas, OCR y encabezado en su posición y formato actuales
    - _Requirements: R-WEB-4_
  - [x] 5.2 Degradar a gris neutro los ejes y valores ausentes sin ocultar los presentes y sin errores de render
    - _Requirements: R-WEB-4_

- [x] 6. Verificar la gestión de evidencias de foto por el rol manager
  - [x] 6.1 Comprobar sin cambiar código que la ruta del historial está protegida por `ROLE_MANAGER`, que el historial consume el endpoint desktop-bff con token propagado, que el envelope de 7 campos y sus secciones degradadas se resuelven, que la foto se carga vía ticket con sus estados de carga/error y que los fallos de servicio muestran el estado de error existente
    - _Requirements: R-WEB-5_

- [x] 7. Pruebas y verificación de regresión
  - [x] 7.1 Pruebas unitarias de los helpers y del mapper: tablas de confianza (incluido `0` y los rechazos de rango), normalizador de motivos (canónico, contingencia, dedup, orden, nunca lanza), presencia dimensional, vocabulario fuera de catálogo, resumen single-source y fusión que preserva presentes
    - _Requirements: R-WEB-1, R-WEB-2_
  - [x] 7.2 Pruebas de renderizado: sección visible con datos y oculta sin datos, ejes grises, confianza `0%`/«—», chip «Origen» omitido, etiquetas «Estado del análisis» vs «Veredicto» separadas y motivo no catalogado visible
    - _Requirements: R-WEB-3, R-WEB-4_
  - [x] 7.3 Regresión completa del proyecto: suite de tests, lint y build en verde
    - _Requirements: R-WEB-1, R-WEB-2, R-WEB-3, R-WEB-4, R-WEB-5_
