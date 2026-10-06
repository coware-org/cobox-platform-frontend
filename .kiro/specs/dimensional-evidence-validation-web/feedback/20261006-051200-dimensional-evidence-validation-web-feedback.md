# Feedback Report — dimensional-evidence-validation-web

- **Feature:** `dimensional-evidence-validation-web`
- **Base:** `20261006-051200-dimensional-evidence-validation-web-feedback`
- **Generated at (UTC):** 2026-10-06T05:12:00Z
- **Fase actual:** `requirements-generated` (`design.md` y `tasks.md` ausentes)
- **Modo:** `report` — **no aplicado** a `requirements.md`

## Conteo por severidad

| Severidad | Cantidad | IDs |
| :--- | :--- | :--- |
| blocker | 1 | FB-REASONCODES-UNKNOWN-VISIBLE |
| major | 4 | FB-WIRE-CAMELCASE, FB-LOCATION-SOURCE-PASIVO, FB-REASONCODES-CANONICAL, FB-CONFIDENCE-ZERO |
| minor | 1 | FB-VERDICT-ACTION-SPLIT |
| **Total** | **6** | |

## Approvals a resetear

`["requirements", "design"]` — el feedback invalida la aprobación vigente de requisitos y bloquea la generación/aprobación de diseño hasta que se resuelvan blocker y major.

## Estado del spec

| Artefacto | Estado |
| :--- | :--- |
| `requirements.md` | presente (16904 B, generado 2026-10-06) |
| `design.md` | **ausente** |
| `tasks.md` | **ausente** |
| `spec.json` | fase `requirements-generated`, `design.approved=false`, `tasks.approved=false` |

## Detalle por item

### 1. FB-WIRE-CAMELCASE — Contrato HTTP estrictamente camelCase — `major`

El contrato HTTP publicado usa exclusivamente claves camelCase; los nombres snake_case son nombres de columna de BD. Validado contra `SmartVisionAnalysisResource`, que expone sus campos en camelCase.

- **Impacto:** un glosario que mezcle ambos estilos induce mapeo incorrecto y falla silenciosa (`undefined`, 404) en ejecución.
- **Recomendación:** fijar en el glosario HTTP los **9 nombres camelCase** — `analysisSummary`, `validationSummary`, `visualConfidence`, `reasonCodes`, `captureSource`, `overallVerdict`, `consistencyScore`, `summary`, `rationale` — y **prohibir la lectura de claves snake_case** en la ruta dimensional. snake_case solo se admite como nombre de columna en documentación de origen.
- **Requisitos afectados:** R-WEB-1 (glosario camelCase + prohibición snake_case).
- **Diseño:** sección «Glosario de contrato HTTP (camelCase)» con tabla de 9 nombres publicados, tabla de equivalencias prohibidas y regla de prohibición.

### 2. FB-LOCATION-SOURCE-PASIVO — `locationSource` no publicado — `major`

`locationSource` **no existe** en `SmartVisionAnalysisResource` publicado.

- **Impacto:** tipar, proyectar o renderizar `locationSource` produce siempre `undefined` y añade superficie muerta; una regla de render condicional o de excepción para un campo inexistente es código inaplicable que el revisor debe rechazar.
- **Recomendación:** **no tipar** `locationSource`. Si llega en la carga útil, se conserva **solo en el payload crudo**, sin proyectar, sin tipar y sin renderizar, **sin lanzar excepción**. Eliminar cualquier excepción o render condicional asociado.
- **Requisitos afectados:** R-WEB-1 (declaración de campo no publicado + comportamiento pasivo).
- **Diseño:** sección «Campos no publicados».

### 3. FB-REASONCODES-CANONICAL — `reasonCodes` canónico `string[]` — `major`

El backend entrega `reasonCodes` como canónico `string[]` (`List<String>`); la variante `string` es VARCHAR crudo de contingencia.

- **Impacto:** invertir la prioridad (string primero, Array después) mete `JSON.parse` en la ruta feliz y subordina el caso normal a un `try/catch`, además de arriesgar la pérdida de orden de la lista.
- **Recomendación:** declarar el canónico como `string[]`; intentar **Array primero, sin `JSON.parse`**. Tratar `string` únicamente como contingencia VARCHAR cruda envuelta en `try/catch`; si tras el parseo el valor no es un array, se interpreta como **código único**. `null`/`undefined` → `[]`.
- **Requisitos afectados:** R-WEB-2 (contrato canónico + orden de parseo).
- **Diseño:** sección «Contrato de reasonCodes».

### 4. FB-REASONCODES-UNKNOWN-VISIBLE — Nada de texto se descarta — `blocker`

**Sustituye el descarte introducido por `FB-REASONCODES-PARSER`**, que autorizaba descartar texto no parseable.

- **Impacto:** un código de motivo no catalogado es exactamente lo que un revisor necesita ver. Filtrar a los 7 conocidos sin mostrar el resto vuelve la UI indistinguible entre «sin motivos» y «motivos no reconocidos».
- **Recomendación:** `parseReasonCodes` devuelve **`{ known, unknown }`** — `known` deduplicado contra el catálogo de 7, `unknown` deduplicado **por orden de aparición**. **Nunca descarta texto y nunca lanza.** El labeler aplica las 7 etiquetas es-PE a `known` y renderiza cada desconocido como **«Motivo no catalogado: {código}»**.
- **Requisitos afectados:** R-WEB-2 (parser de dos etapas, sustituir el descarte previo).
- **Diseño:** sección «Parser de dos etapas» con contrato, dedup por orden, garantía never-throw y regla de visibilidad.

### 5. FB-CONFIDENCE-ZERO — `visualConfidence` 0 exacto es válido — `major`

`0` es un valor exacto válido en la escala `[0,1]`, no un ausente.

- **Impacto:** un predicado por truthiness (`confidence || fallback`) o un `??` coalescente convierte `0` en `null` o en el valor legacy, mostrando «—» o un porcentaje incorrecto para una confianza medida en cero.
- **Recomendación:** predicado único en ruta dimensional — `typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1`. El `0` exacto se formatea como **`0%`**. **Prohibir truthiness y `??`** en el camino dimensional.
- **AC nuevos (R-WEB-8):** `toVisualConfidence(0) === 0` y `formatConfidence01(0) === '0%'`.
- **Requisitos afectados:** R-WEB-1 (predicado), R-WEB-4 (`0%`), R-WEB-8 (AC nuevos).
- **Diseño:** sección «Predicado dimensional de confianza» con tabla de banned patterns y caso de borde `0`.

### 6. FB-VERDICT-ACTION-SPLIT — Veredicto y acción separados — `minor`

El veredicto y la acción operativa son dos campos derivados con orígenes distintos, no un par único.

- **Impacto:** colapsarlos en una sola línea o derivar uno del otro pierde la acción cuando el veredicto no se conoce o cuando el mapeo de acción cambia, y contradice la nota «CoBox asiste, no decide» al presentar la acción como si fuera el veredicto.
- **Recomendación:** renderizar **dos elementos separados**:
  - badge etiquetado **«Veredicto»** con las etiquetas es-PE de `FB-LABELS-ESPE`;
  - línea independiente **«Acción operativa»** con los textos exactos:
    - «Acción: Proceder con cierre automático»
    - «Acción: Inspeccionar evidencia manualmente»
    - «Acción: Solicitar aclaración o desestimar»
  - **No colapsar ni derivar uno del otro.**
- **Requisitos afectados:** R-WEB-3 (badge + línea separada), R-WEB-5 (textos exactos de acción y de motivo no catalogado).
- **Diseño:** sección «Separación veredicto/acción».

## Trazabilidad requisito → item

| Requisito | Items |
| :--- | :--- |
| R-WEB-1 | FB-WIRE-CAMELCASE, FB-LOCATION-SOURCE-PASIVO, FB-CONFIDENCE-ZERO |
| R-WEB-2 | FB-REASONCODES-CANONICAL, FB-REASONCODES-UNKNOWN-VISIBLE |
| R-WEB-3 | FB-VERDICT-ACTION-SPLIT |
| R-WEB-4 | FB-CONFIDENCE-ZERO |
| R-WEB-5 | FB-VERDICT-ACTION-SPLIT |
| R-WEB-8 | FB-CONFIDENCE-ZERO (AC nuevos) |

## Item sustituido

| Item previo | Sustituido por | Motivo |
| :--- | :--- | :--- |
| FB-REASONCODES-PARSER | FB-REASONCODES-UNKNOWN-VISIBLE | El descarte de texto no parseable se resuelve como blocker: la evidencia no catalogada debe ser visible. |

## Próximo paso

`apply` para volcar los 6 items en `requirements.md`, con reset de aprobaciones de `requirements` y `design`. No se ha modificado ningún documento del spec en este turno.
