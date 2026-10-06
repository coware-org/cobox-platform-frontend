# Requirements — dimensional-evidence-validation-web

## Introduction

Esta especificación cubre el recorte solo-frontend web de la validación dimensional de evidencias. El backend expone 7 campos aditivos y nulables de validación dimensional (evaluación visual, confianza visual, evaluación geográfica, evaluación contextual, veredicto, códigos de motivo y recomendación), más `validationSummary`, que es un campo **preexistente** del contrato (`AiEvidenceAnalysisResource.validationSummary: string | null`) cuya definición se **sobrescribe** en esta spec como fuente única del resumen dimensional y que por tanto no cuenta como octavo campo dimensional. El frontend web debe tipar, mapear, visualizar y etiquetar en español (es-PE) dichos campos en el detalle de análisis de evidencia, con degradación total para registros pre-V3 que no traen los 7 campos, sin alterar el flujo de estado existente y sin incluir backend ni Flutter.

Alcance: solo `cobox-platform-frontend` web. Excluye backend y Flutter. `captureSource` **no está publicado** por `desktop-bff` en esta versión: se persiste en BD (`capture_source`) pero el recurso publicado no lo expone; se documenta como campo pasivo no exigible y el chip «Origen» queda condicional a presencia real (FB-001). `locationSource` no forma parte del recurso publicado y se trata como campo pasivo conservado únicamente en el payload crudo (FB-LOCATION-SOURCE-PASIVO).

## Glosario verificable

- **Campos dimensionales — lista cerrada (7 campos nuevos):** (1) evaluación visual, (2) confianza visual (0-1), (3) evaluación geográfica, (4) evaluación contextual, (5) veredicto, (6) códigos de motivo (7 códigos), (7) recomendación. La lista es **cerrada**: el contrato dimensional son exactamente esos 7 campos nuevos, ni 6 ni 8; el nombre de cada campo en el contrato se resolverá en `design.md` contra el backend D2/R5 (FB-FIELD-COUNT-GLOSSARY).
- **`validationSummary` (preexistente, no nuevo):** ya existía en el contrato y en el mapper (`summary: textField(source, 'validationSummary', 'aiSummary')`); esta spec **sobrescribe su definición** como fuente única del resumen dimensional y **no lo agrega** como octavo campo de la lista cerrada (FB-FIELD-COUNT-GLOSSARY, FB-SUMMARY-SINGLE-SOURCE).
- **`captureSource` (persistido en BD, no publicado — FB-001):** metadato de captura opcional `'CAMERA' | 'GALLERY' | null`, no es un eje dimensional ni participa en el semáforo del veredicto. **Procedencia verificada 2026-10-06:** `EvidenceAnalysis` persiste la columna `capture_source`, pero `SmartVisionAnalysisResource` (desktop-bff) no la mapea ni la expone (`grep captureSource` en `desktop-bff-service/src/main` = 0 resultados). Por tanto no forma parte del contrato HTTP publicado: si llega ausente —caso esperado actual— el chip «Origen» se omite y el resto de la sección dimensional se renderiza sin degradación alguna. El chip «Origen» queda condicional a presencia real y no es exigible en E2E hasta que el backend lo exponga (opción B: mapper + recurso + test de contrato, sin migración). Esta nota sustituye FB-CAPTURE-SOURCE-PROVENANCE en lo relativo a la publicación.
- **Glosario de contrato HTTP (camelCase estricto) — 8 nombres publicados (FB-001):** `visualAssessment`, `visualConfidence`, `geographicAssessment`, `contextAssessment`, `verdict`, `reasonCodes`, `recommendation`, `validationSummary`. Esta lista es **exacta y cerrada**, verificada contra `SmartVisionAnalysisResource.java:115-189` (14 base + 7 dimensionales, sin `captureSource`); los nombres `overallVerdict`, `analysisSummary`, `consistencyScore`, `rationale`, `summary` y `captureSource` **no existen** en el recurso publicado y quedan prohibidos como claves de lectura en la ruta dimensional (FB-GLOSSARY-VERIFIED-9, FB-001). El recurso publicado expone exclusivamente claves camelCase. Los nombres snake_case (`visual_assessment`, `visual_confidence`, `geographic_assessment`, `context_assessment`, `verdict`, `reason_codes`, `recommendation`, `validation_summary`, `capture_source`, `location_source`) son **nombres de columna de BD**, no claves publicadas: quedan prohibidos como claves de lectura en la ruta dimensional y solo se admiten en documentación de origen (FB-WIRE-CAMELCASE).
- **`locationSource` (no publicado, pasivo):** no forma parte del recurso publicado `SmartVisionAnalysisResource`; ningún campo expuesto lo declara. No SHALL tiparse en la interfaz dimensional, ni proyectarse, ni renderizarse, y no admite regla de render condicional ni excepción asociada. Si aparece en la carga útil se conserva **únicamente en el payload crudo**, sin lanzar excepción (FB-LOCATION-SOURCE-PASIVO).
- **`reasonCodes` (canónico `string[]` — FB-002):** el backend lo entrega como lista (`List<String>`). La forma canónica es `Array`, que se consume **sin `JSON.parse`**; la variante `string` es un `VARCHAR` crudo de contingencia y no parte del contrato. `null`/`undefined` → `[]`. **Equivalencia pre-V3 (FB-002):** el backend publica `reasonCodes` como `[]` —nunca `null`— cuando no hay evaluación (`AiValidationQueryServiceImpl.toResource`: `null → List.of`, única excepción a «lo no disponible es null»); por tanto un `[]` entrante SHALL tratarse como **ausente**, igual que `null`, a efectos de detección pre-V3 y degradación gris.
- **Códigos de motivo fuera del catálogo:** no se descartan. `parseReasonCodes` los devuelve en `unknown` y la UI los muestra como «Motivo no catalogado: {código}» (FB-REASONCODES-UNKNOWN-VISIBLE).
- **Insignia de veredicto vs acción operativa (campos distintos):** el **veredicto** (`verdict`) es la insignia principal del semáforo; la **acción operativa** es la recomendación (`AUTO_APPROVE` / `MANUAL_REVIEW` / `REJECT`) y se renderiza en un elemento separado, etiquetado «Acción operativa», con prefijo «Acción: ». Son dos campos derivados con orígenes distintos: no SHALL colapsarse en una sola línea ni derivarse uno del otro (FB-VERDICT-ACTION-SPLIT).
- **Valores contractuales:**
  - Visual: `COMPATIBLE` / `INCOMPATIBLE` / `UNDETERMINED`.
  - Geográfico: `MATCH` / `MISMATCH` / `UNVERIFIABLE`.
  - Contextual: `COMPATIBLE` / `PARTIAL` / `INCONSISTENT`.
  - Veredicto: `COMPATIBLE` / `REVIEW_REQUIRED` / `INCONSISTENT`.
  - Recomendación / acción operativa: `AUTO_APPROVE` → «Acción: Proceder con cierre automático», `MANUAL_REVIEW` → «Acción: Inspeccionar evidencia manualmente», `REJECT` → «Acción: Solicitar aclaración o desestimar» (FB-VERDICT-ACTION-SPLIT).
  - Códigos de motivo (7): `VISUAL_INCOMPATIBLE_SCENE`, `VISUAL_UNDETERMINED`, `GEO_MISMATCH`, `GEO_UNVERIFIABLE`, `GALLERY_CAPTURE_LOCATION_UNVERIFIED`, `CONTEXT_TEMPORAL_MISMATCH`, `CONTEXT_PARTIAL_DATA`.
- **Matriz semáforo del veredicto:** verde = `COMPATIBLE`, ámbar = `REVIEW_REQUIRED`, rojo = `INCONSISTENT`, gris = ausente/nulo (registro pre-V3 o sin veredicto).
- **Matriz de ejes:** visual verde = `COMPATIBLE`, rojo = `INCOMPATIBLE`, gris = `UNDETERMINED`; geográfico verde = `MATCH`, rojo = `MISMATCH`, gris = `UNVERIFIABLE`; contextual verde = `COMPATIBLE`, rojo = `INCONSISTENT`, gris = `PARTIAL`.
- **Colisión nominal:** el estado del flujo de análisis (`Estado del análisis`) y el veredicto dimensional (`Veredicto`) son conceptos distintos aunque compartan la etiqueta `REVIEW_REQUIRED`. Deben mostrarse con insignias y secciones separadas y no deben mezclarse ni reutilizarse.
- **Registro pre-V3 (FB-002):** análisis cuyos 6 escalares dimensionales están ausentes o nulos Y `reasonCodes` es `null` o `[]`. La ausencia de `validationSummary` **no** degrada por sí sola a pre-V3, porque `validationSummary` no pertenece a la lista cerrada. Un `reasonCodes: []` entrante no cuenta como campo presente.
- **Integración desktop-bff (FB-006):** la Web consume exclusivamente `desktop-bff-service`, nunca `ai-validation-service` directo. Fuente del historial: `GET /api/v1/desktop/smartvision/evidence-analyses` (base `/api/v1/desktop`, `DesktopDashboardController`), solo lectura, rol `MANAGER`, token del llamante propagado. Rutas hermanas: `GET /smartvision/alerts`, `GET /dashboard/operations`, `GET /routes/{id}/overview`, `GET /vehicles/{id}/health`.
- **Envelope `SmartVisionAnalysisOverviewResource` (FB-006):** cada fila trae 7 campos siempre presentes: `analysis`, `alerts`, `driver`, `route`, `vehicle`, `order`, `degradedSections`. `alerts: []` nunca `null`; `degradedSections: []` cuando todo resolvió —su presencia distingue «sin contexto todavía» de «falló la lectura» (`section: driver|route|vehicle|order` + `reason`); `driver`/`route`/`vehicle`/`order` en `null` si no hay dato. Sin `analysisId`: la identidad es `clientEvidenceId` (UUID). El detalle dimensional se alimenta de `fila.analysis`.
- **Ámbar permanente transitorio (FB-007, sustituye FB-003):** `incidentId` **no es obligatorio** (opción b vigente 2026-10-06, `IncidentContextEvaluator.java:61-65`): su ausencia nunca produce `PARTIAL` ni `INCONSISTENT` por sí sola. El contexto es `COMPATIBLE` con `capturedAt` + alguna cota temporal (`declaredAt`/`uploadedAt`) + `evidenceType`; por tanto una foto **CAMERA completa sí alcanza veredicto `COMPATIBLE`/verde**. El ámbar permanente esperado queda acotado a **GALERÍA** (`capturedAt = null` por contrato → `PARTIAL` → `REVIEW_REQUIRED`) o a faltantes reales. El verde es exigible en E2E para el caso CAMERA completo.
- **Rechazo explícito (FB-007):** no se incorporan como `reasonCodes` los códigos `VISUAL_COMPATIBLE_SCENE`, `VISUAL_LOW_CONFIDENCE`, `GEO_MATCH`, `CONTEXT_COMPATIBLE`, `textract_error` ni `rekognition_error` mencionados en el punto 5 del paquete: el vocabulario cerrado de 7 se mantiene según `ReasonCodes.java` y `EvidenceAnalysisWireContractTests` (`esConocido("VISUAL_COMPATIBLE_SCENE") == false`); `textract_error`/`rekognition_error` son solo tags de log/métrica, jamás motivos publicados.

---

### Requirement 1: Contratos dimensionales opcionales y nulables (R-WEB-1)

**Objective:** As a desarrollador frontend, I want que el recurso de análisis y la vista de detalle acepten los 7 campos dimensionales como opcionales y nulables, so that los registros pre-V3 y post-V3 compartan el mismo contrato sin rupturas de tipado.

**Acceptance Criteria:**

- WHEN el recurso de análisis incluye los 7 campos de la lista cerrada del glosario con valores del glosario THEN el sistema SHALL aceptarlos sin error de tipado ni validación, y el contrato SHALL quedar fijado en esos 7 campos nuevos más `validationSummary` preexistente sobrescrito, sin admitir una derivación de 6 u 8 campos dimensionales (FB-FIELD-COUNT-GLOSSARY).
- WHEN el recurso de análisis omite todos o parte de los 7 campos dimensionales (nulos o ausentes) THEN el sistema SHALL aceptarlo como registro pre-V3 válido sin exigir valores por defecto inventados.
- WHEN la confianza visual está presente THEN el sistema SHALL evaluarla con el predicado exacto de ruta dimensional `typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1` y, solo si el predicado es verdadero, SHALL aceptarla vía `toVisualConfidence`; el valor exacto `0` es una confianza válida y SHALL aceptarse como tal, y si es de tipo no numérico (cadena, booleano, objeto), `NaN`, `±Infinity` o está fuera de rango THEN el sistema SHALL normalizarla a null sin aplicar clamp, sin lanzar excepción y sin valor por defecto inventado (FB-CONFIDENCE-FORMAT, FB-CONFIDENCE-ZERO).
- IF la confianza visual recibida es un número fuera del rango [0,1] — incluidos `1.1`, `2.5` y `92.5` (típicos de la escala legacy 0–100) — THEN el sistema SHALL normalizarla a `null` y SHALL NOT aplicar clamp para forzarla dentro del rango, SHALL NOT reescalar el valor y SHALL NOT dividirlo por 100 para "convertirlo" a escala 0-1 (FB-CONFIDENCE-SHIELD-REJECTED).
- IF se resuelve la confianza visual en la ruta dimensional THEN el sistema SHALL usar el predicado explícito anterior y SHALL NOT usar truthiness (`confidence || fallback`), ni `||`, ni coalescencia `??` como sustituto de ese predicado, porque esas formas convierten el `0` exacto en `null` o en el valor legacy (FB-CONFIDENCE-ZERO).
- IF un campo dimensional trae un valor fuera del glosario THEN el sistema SHALL tratarlo como ausente (comportamiento neutro) y no SHALL romper el renderizado del detalle.
- WHERE el contrato se consume en la vista de detalle THEN el sistema SHALL exponer los 7 campos como opcionales/nulables sin convertirlos en obligatorios.
- WHEN la carga incluye `captureSource` con valor `'CAMERA' | 'GALLERY'` THEN el sistema SHALL aceptarlo como campo opcional tipado sin contabilizarlo como campo de la lista cerrada dimensional; y si trae otro valor, null o está ausente —caso esperado actual porque el recurso no lo publica (FB-001)— THEN el sistema SHALL omitir el chip «Origen» sin degradar la sección y SHALL tratarlo como ausente (FB-CAPTURE-SOURCE, FB-001).
- WHERE el recurso publicado trae `locationSource` THEN el sistema SHALL ignorarlo por completo: no SHALL tiparlo en el modelo dimensional, no SHALL mapearlo, no SHALL proyectarlo y no SHALL mostrarlo (FB-CAPTURE-SOURCE, FB-LOCATION-SOURCE-PASIVO).
- IF la carga útil trae una clave no reconocida por el glosario de contrato HTTP (incluida `locationSource`) THEN el sistema SHALL conservarla solo en el payload crudo y SHALL NOT tiparla, SHALL NOT proyectarla, SHALL NOT renderizarla y SHALL NOT lanzar excepción por su presencia (FB-LOCATION-SOURCE-PASIVO).
- WHERE el recurso se deserializa por HTTP THEN el sistema SHALL leer únicamente claves camelCase del glosario de contrato HTTP y SHALL NOT leer claves snake_case, porque corresponden a nombres de columna de BD y no a claves publicadas (FB-WIRE-CAMELCASE).

### Requirement 2: Mapeo nulable y resumen priorizado (R-WEB-2)

**Objective:** As a usuario analista, I want que los datos dimensionales se mapeen de forma segura desde cualquier carga útil, so that nunca vea una pantalla rota por nulos, arreglos o resúmenes faltantes.

**Acceptance Criteria:**

- WHEN la carga útil trae los campos dimensionales como nulos, ausentes o con tipos mixtos THEN el sistema SHALL mapearlos a una vista de detalle sin lanzar excepciones.
- WHEN los códigos de motivo llegan como `Array` canónico, `string` de contingencia, `null`, `[]` o tipo inválido THEN el sistema SHALL normalizarlos con `parseReasonCodes` sin lanzar excepción: `Array` primero y **sin `JSON.parse`** por ser la forma canónica `string[]` (`List<String>`), `string` solo como contingencia `VARCHAR` crudo envuelta en `try/catch`, `null`/`undefined`/`[]` → `{ known: [], unknown: [] }` (ausente, FB-002), y si el `try/catch` no produce un arreglo utilizable THEN el sistema SHALL interpretarlo como código único (FB-REASONCODES-CANONICAL, FB-002).
- IF `parseReasonCodes` procesa cualquier valor THEN el sistema SHALL devolver siempre el contrato `{ known, unknown }`, con ambos arreglos siempre presentes (mínimo `[]` cada uno), `known` deduplicado contra el catálogo de 7 códigos del glosario y `unknown` deduplicado por orden de aparición; ambos SHALL deduplicar preservando el orden de aparición, `unknown` SHALL NOT fusionarse con `known` ni filtrarse, y el sistema SHALL NOT descartar ningún código de texto (FB-REASONCODES-UNKNOWN-VISIBLE).
- IF `parseReasonCodes` recibe cualquier valor THEN el sistema SHALL retornar sin lanzar excepción (garantía never-throw), incluidos tipos inesperados, y SHALL devolver siempre ambos arreglos aunque estén vacíos.
- NOTA este criterio **sustituye el descarte** introducido por FB-REASONCODES-PARSER (que autorizaba descartar texto no parseable) y preserva las demás garantías de ese item: tolerancia a `string`/`Array`/`null`, dedup, orden de aparición y never-throw (FB-REASONCODES-UNKNOWN-VISIBLE).
- WHEN existe un resumen de validación dimensional no vacío (`validationSummary`) THEN el sistema SHALL mostrarlo como resumen principal del análisis. El texto ya es plantilla ES del backend (`VerdictResolver.resumenDe`: 3 bases — compatible / datos insuficientes / contradicción — + « Motivos: … », tope 2000 con recorte de cola); el frontend no SHALL retraducirlo ni componerlo, solo mostrarlo (FB-004).
- WHERE `validationSummary` está definida THEN el sistema SHALL tratarla como fuente única (single-source) del resumen dimensional y no SHALL recurrir a `aiSummary` ni a ningún otro resumen general como fuente alternativa, de respaldo o de relleno (FB-SUMMARY-SINGLE-SOURCE).
- WHEN `validationSummary` está ausente, nula o vacía THEN el sistema SHALL mostrar el texto neutro «Sin resumen registrado» y no SHALL completar el resumen desde otra fuente.
- WHEN se fusiona el detalle de evidencia con datos dimensionales parciales THEN el sistema SHALL preservar los valores dimensionales presentes y no SHALL sobrescribirlos con nulos ni rellenarlos con valores por defecto cruzados de otras fuentes.

### Requirement 3: Insignia de veredicto semáforo separada del estado (R-WEB-3)

**Objective:** As a usuario analista, I want distinguir de un vistazo el veredicto dimensional mediante un semáforo de colores, so that no lo confunda con el estado del flujo de análisis.

**Acceptance Criteria:**

- WHEN el veredicto es `COMPATIBLE` THEN el sistema SHALL mostrar la insignia de veredicto en verde. Este caso es alcanzable para foto CAMERA completa sin `incidentId` (opción b vigente) y es exigible en E2E (FB-007, sustituye FB-003).
- WHEN el veredicto es `REVIEW_REQUIRED` THEN el sistema SHALL mostrar la insignia de veredicto en ámbar.
- WHEN el veredicto es `INCONSISTENT` THEN el sistema SHALL mostrar la insignia de veredicto en rojo.
- WHEN el veredicto está ausente o es nulo THEN el sistema SHALL mostrar la insignia de veredicto en gris neutro (sin veredicto).
- WHERE la insignia de veredicto y la insignia de estado del flujo coexisten THEN el sistema SHALL renderizarlas como elementos visualmente separados con etiquetas distintas (`Veredicto` vs `Estado del análisis`).
- WHERE se renderiza el veredicto THEN el sistema SHALL etiquetar su insignia como «Veredicto» y SHALL aplicar las etiquetas es-PE de FB-LABELS-ESPE, sin mezclar el valor crudo con el de la acción operativa (FB-VERDICT-ACTION-SPLIT).
- WHERE se renderiza la recomendación THEN el sistema SHALL emitirla en un elemento separado, etiquetado «Acción operativa», con el prefijo «Acción: », y SHALL NOT colapsar veredicto y acción en una sola línea ni derivar uno del otro (FB-VERDICT-ACTION-SPLIT).

### Requirement 4: Desglose de tres ejes dimensionales (R-WEB-4)

**Objective:** As a usuario analista, I want ver el desglose visual, geográfico y contextual con su indicador de color, so that entienda qué eje aporta compatibilidad o riesgo.

**Acceptance Criteria:**

- WHEN el desglose dimensional está disponible THEN el sistema SHALL mostrar los tres ejes (visual, geográfico, contextual) con su valor y su indicador de color según la matriz de ejes.
- WHEN la evaluación visual es `UNDETERMINED` THEN el sistema SHALL mostrar su indicador en gris.
- WHEN la evaluación geográfica es `UNVERIFIABLE` THEN el sistema SHALL mostrar su indicador en gris.
- WHEN la evaluación contextual es `PARTIAL` THEN el sistema SHALL mostrar su indicador en gris. Caso esperado permanente para GALERÍA (`capturedAt = null`) o faltantes reales (`capturedAt`/cota/`evidenceType`); no aplica a CAMERA completa (FB-007).
- WHEN uno o más ejes están ausentes o son nulos THEN el sistema SHALL mostrar esos ejes en estado neutro gris sin ocultar los ejes con valor.
- WHEN la confianza visual es un número finito en [0,1] THEN el sistema SHALL mostrarla en el eje visual como porcentaje entero vía `formatConfidence01` calculado como `Math.round(v*100)` y sin decimales (p. ej. `0.92` → «92%»), y WHEN es `0` exacto THEN el sistema SHALL formatearlo como «0%» porque `0` es una confianza válida y no una ausencia, y WHEN es null THEN el sistema SHALL mostrar el eje visual en gris con el texto neutro «—», sin `%` y sin romper los otros ejes (FB-CONFIDENCE-ZERO).
- IF se formatea o resuelve la confianza visual en la ruta dimensional THEN el sistema SHALL NOT usar truthiness (`confidence || fallback`), ni `??`, ni `||` para decidir entre la confianza dimensional y su respaldo, y SHALL NOT confabular un valor por defecto para el caso `0` (FB-CONFIDENCE-ZERO).
- IF se formatea la confianza visual THEN el sistema SHALL usar exclusivamente `formatConfidence01` con `null → "—"` y no SHALL usar el formateador legacy `formatScore(v,1)` ni multiplicar valores legacy 0–100.
- WHERE la sección dimensional renderiza THEN el sistema SHALL consumir la confianza exclusivamente desde la confianza visual dimensional (0-1) y no SHALL leer, reescalar ni presentar el `confidenceScore` / `fraudScore` legacy (0-100) como confianza visual dentro de la sección dimensional (FB-CONFIDENCE-FORMAT).
- WHERE la sección dimensional renderiza THEN el sistema SHALL NOT dividir por 100 ni reescalar de ningún modo los valores de confianza recibidos: el valor publicado ya es 0-1 y se consume tal cual, de modo que cualquier valor fuera de ese rango se rechaza a `null` por el predicado estricto y nunca se "normaliza" ni se convierte a porcentaje (FB-CONFIDENCE-SHIELD-REJECTED).
- WHEN `captureSource` es `'CAMERA'` o `'GALLERY'` THEN el sistema SHALL mostrar el chip «Origen» con la etiqueta «Cámara» o «Galería» respectivamente dentro de la sección dimensional.
- WHEN `captureSource` es null o está ausente —caso esperado actual porque el recurso no lo publica (FB-001)— THEN el sistema SHALL omitir el chip «Origen» y no SHALL renderizar un chip vacío ni «Origen: —». El chip no es exigible en E2E hasta que el backend lo exponga.
- WHERE la sección dimensional muestra el chip «Origen» THEN el sistema SHALL tratarlo como metadato de captura y no SHALL presentarlo como uno de los tres ejes ni como veredicto (FB-CAPTURE-SOURCE).

### Requirement 5: Etiquetas en español es-PE (R-WEB-5)

**Objective:** As a usuario analista peruano, I want leer veredictos, motivos, recomendaciones y dimensiones en español, so that comprenda el resultado sin traducir códigos técnicos. `validationSummary` queda excluida de esta tabla porque ya es plantilla ES del backend y el frontend solo la muestra (FB-004).

**Acceptance Criteria:**

- WHEN se muestra un código de motivo THEN el sistema SHALL etiquetarlo en español es-PE según: `VISUAL_INCOMPATIBLE_SCENE` → «Escena visual incompatible», `VISUAL_UNDETERMINED` → «Escena no determinable», `GEO_MISMATCH` → «Ubicación no coincide», `GEO_UNVERIFIABLE` → «Ubicación no verificable», `GALLERY_CAPTURE_LOCATION_UNVERIFIED` → «Foto galería sin ubicación verificable», `CONTEXT_TEMPORAL_MISMATCH` → «Fecha inconsistente», `CONTEXT_PARTIAL_DATA` → «Datos parciales».
- WHEN se muestra la recomendación THEN el sistema SHALL presentarla en la línea «Acción operativa» con el prefijo «Acción: » y uno de estos tres textos exactos según el valor contractual: `AUTO_APPROVE` → «Acción: Proceder con cierre automático», `MANUAL_REVIEW` → «Acción: Inspeccionar evidencia manualmente», `REJECT` → «Acción: Solicitar aclaración o desestimar»; esta redacción exacta sustituye la redacción genérica anterior de recomendación (FB-VERDICT-ACTION-SPLIT).
- WHEN se muestra el veredicto dimensional THEN el sistema SHALL etiquetarlo en español es-PE según: `COMPATIBLE` → «Aprobación sugerida», `REVIEW_REQUIRED` → «Revisión requerida», `INCONSISTENT` → «Rechazo sugerido» (FB-LABELS-ESPE).
- WHERE se muestra el veredicto dimensional THEN el sistema SHALL incluir la nota «CoBox asiste, no decide», que aclara que la evaluación es una sugerencia asistida y no una decisión automática final (FB-LABELS-ESPE).
- WHEN se muestran las dimensiones y el veredicto THEN el sistema SHALL presentarlos con etiquetas en español y no SHALL dejar códigos crudos en inglés como texto principal visible.
- IF un código de motivo no está catalogado en el glosario THEN el sistema SHALL mostrarlo como «Motivo no catalogado: {código}» con el código crudo visible, SHALL NOT omitirlo y SHALL NOT presentarlo como si tuviera etiqueta es-PE (FB-REASONCODES-UNKNOWN-VISIBLE).
- WHERE falta una etiqueta para un valor contractual desconocido que no sea un código de motivo THEN el sistema SHALL mostrar un texto neutro en español sin romper el renderizado.

### Requirement 6: Integración en el detalle sin mover el estado existente (R-WEB-6)

**Objective:** As a usuario analista, I want ver la validación dimensional como una sección propia dentro del detalle de análisis, so that conserve el encabezado de estado existente y distinga estado de veredicto.

**Acceptance Criteria:**

- WHEN el detalle de análisis incluye datos dimensionales THEN el sistema SHALL mostrar una sección titulada «Validación dimensional» separada del encabezado.
- WHERE el encabezado «Estado del análisis» existe THEN el sistema SHALL mantenerlo en su posición y formato actuales sin desplazarlo ni reemplazarlo por el veredicto.
- WHEN coexisten estado del flujo y veredicto dimensional THEN el sistema SHALL etiquetarlos de forma distinta de modo que `REVIEW_REQUIRED` del veredicto no se confunda con un estado del flujo del mismo nombre.
- WHEN el registro es pre-V3 sin datos dimensionales THEN el sistema SHALL mostrar la sección en estado neutro degradado (gris / sin veredicto) u omitir los valores ausentes, y no SHALL mostrar errores ni secciones vacías rotas.

### Requirement 7: Fuente de verdad y degradación pre-V3 (R-WEB-7)

**Objective:** As a operador de la plataforma, I want que el frontend tolere registros sin los 7 campos y use la ruta de datos oficial, so that la vista siga estable durante la transición pre/post-V3 y no anticipe campos futuros.

**Acceptance Criteria:**

- WHERE los datos provienen del canal oficial web THEN el sistema SHALL considerar dicha carga como verdad y no SHALL exigir una ruta alternativa para resolver los 7 campos.
- WHEN la carga útil no incluye ninguno de los 6 escalares dimensionales (nulos/ausentes) y `reasonCodes` es `null` o `[]` THEN el sistema SHALL renderizar el detalle completo (resumen, estado, evidencias) sin insignias dimensionales en color activo y sin errores (FB-002).
- WHEN la carga útil incluye solo un subconjunto de los 7 campos THEN el sistema SHALL mostrar los presentes y degradar solo los ausentes a gris neutro.
- WHEN la carga incluye `captureSource` con valor `'CAMERA' | 'GALLERY'` THEN el sistema SHALL exponerlo como metadato de captura opcional; WHEN es null o está ausente —caso esperado actual (FB-001)— THEN el sistema SHALL omitirlo sin exigirlo ni romper el renderizado, y el chip «Origen» no es exigible en E2E hasta que el backend lo publique (FB-CAPTURE-SOURCE, FB-001).
- IF la carga incluye `locationSource` u otro campo no publicado THEN el sistema SHALL ignorarlo por completo y no SHALL mostrarlo ni exigirlo en esta versión, conservándolo solo en el payload crudo según R-WEB-1 (FB-LOCATION-SOURCE-PASIVO).

### Requirement 8: Calidad verificada por pruebas (R-WEB-8)

**Objective:** As a responsable de calidad, I want que el mapeo y el renderizado dimensional estén cubiertos por pruebas automatizadas, so that la tolerancia a nulos y el semáforo no regresen defectos.

**Acceptance Criteria:**

- WHEN se ejecutan las pruebas del mapeo THEN el sistema SHALL verificar la tolerancia a nulos/ausentes, `parseReasonCodes` (`Array` canónico sin `JSON.parse`, `string` de contingencia con `try/catch` → código único, `null`/`[]` → `[]` ausente (FB-002), contrato `{ known, unknown }` con ambos arreglos siempre presentes, dedup preservando orden, nunca descartar texto y never-throw) y el carácter single-source de `validationSummary` incluido el caso ausente → «Sin resumen registrado» y la ausencia de fallback a `aiSummary` (FB-REASONCODES-CANONICAL, FB-REASONCODES-UNKNOWN-VISIBLE, FB-002).
- WHEN se ejecutan las pruebas de confianza THEN el sistema SHALL verificar `toVisualConfidence(0) === 0` y `formatConfidence01(0) === '0%'`, que el `0` exacto no se degrada a `null`, a «—» ni al valor legacy, y que la ruta dimensional no usa truthiness ni `??` (FB-CONFIDENCE-ZERO).
- WHEN se ejecutan las pruebas de confianza THEN el sistema SHALL verificar el predicado estricto completo: `toVisualConfidence(92.5) === null`, `toVisualConfidence(2.5) === null`, `toVisualConfidence(1.1) === null`, `toVisualConfidence(-0.1) === null`, `toVisualConfidence(NaN) === null`, `toVisualConfidence(Infinity) === null`, `toVisualConfidence('0.92') === null` y `toVisualConfidence(null) === null`; y SHALL verificar el formateo: `formatConfidence01(0.925) === '93%'`, `formatConfidence01(0.92) === '92%'`, `formatConfidence01(0) === '0%'` y `formatConfidence01(null) === '—'`. Ningún caso rechazado por rango SHALL producir clamp, reescala ni división por 100 (FB-CONFIDENCE-SHIELD-REJECTED).
- WHEN se ejecutan las pruebas de renderizado de motivos THEN el sistema SHALL verificar que un código de motivo no catalogado se muestra como «Motivo no catalogado: {código}» y no se omite (FB-REASONCODES-UNKNOWN-VISIBLE).
- WHEN se ejecutan las pruebas de renderizado THEN el sistema SHALL verificar la matriz semáforo del veredicto (verde documentado pero no exigible en E2E por FB-003 / ámbar / rojo / gris), los indicadores grises de `UNDETERMINED`/`UNVERIFIABLE`/`PARTIAL`, la separación visual entre estado y veredicto, el `formatConfidence01` entero sin decimales con `null` → «—» y `0` → «0%», la ausencia de `confidenceScore` legacy en la sección dimensional, el chip «Origen» condicional de `captureSource` (no exigible en E2E por FB-001), la separación entre insignia «Veredicto» y línea «Acción operativa» con sus tres textos exactos, y las etiquetas es-PE del veredicto con la nota «CoBox asiste, no decide» (FB-VERDICT-ACTION-SPLIT, FB-001, FB-003).
- WHEN se ejecutan las pruebas con una carga pre-V3 (6 escalares ausentes/nulos y `reasonCodes` `null` o `[]`) THEN el sistema SHALL verificar que el detalle renderiza sin errores (FB-002).
