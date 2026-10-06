# Feedback Report — dimensional-evidence-validation-web

- **Archivo JSON:** `feedback/20261006-044125-dimensional-evidence-validation-web-feedback.json`
- **Generado:** 2026-10-06T04:41:25Z
- **Modo:** report (no aplicado a `requirements.md`)

## Estado de la spec (verificado)

- Existe: `.kiro/specs/dimensional-evidence-validation-web/`
  - `requirements.md` — existe (11584 bytes)
  - `spec.json` — existe
  - `design.md` — **ausente** (anotado explícito)
  - `tasks.md` — **ausente** (anotado explícito)
- `spec.json` fase actual: `requirements-generated`, `ready_for_implementation: false`
- Feedback previo aplicado: `FB-VISUAL-CONFIDENCE-SCALE` (`20261006-042958`, `last_applied_at: 2026-10-06T04:32:00Z`)

## Resumen

- **Total items:** 6
- **Por severidad:** blocker: 1 · major: 3 · minor: 2
- **Targets:** los 6 items apuntan a `requirements` + `design`
- **Origen:** items ya validados por el arquitecto contra backend D2/R5 y frontend

### Approvals a resetear

| Approval | Estado actual en `spec.json` | Acción |
|---|---|---|
| `requirements` | generated: true, approved: false | resetear a no aprobado |
| `design` | generated: false, approved: false | resetear (aún no generado) |

- **Approval resets declarados en el JSON:** `["requirements", "design"]`

## Detalle por item

### 1. FB-SUMMARY-SINGLE-SOURCE — validationSummary como única fuente sin fallback dual

- **Severity:** blocker
- **Targets:** requirements, design
- **Impact:** Riesgo de doble fuente de verdad si el mapper dimensional cae a `summary` legacy cuando `validationSummary` viene ausente o vacío. Validado contra backend D2/R5 y frontend: el contrato dimensional expone `validationSummary` como única fuente (summary/rationale). Un fallback dual reintroduciría divergencia con el glosario de 7 campos y rompería la trazabilidad del veredicto.
- **Recommendation:** Declarar `validationSummary` como single-source sin fallback dual: el mapper dimensional mapea `summary` exclusivamente desde `validationSummary`; el merge solo preserva campos presentes sin rellenar desde legacy.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-2 (EARS): definir `validationSummary` como single-source para summary dimensional; prohibir fallback dual a `summary` legacy.
  - **design:**
    - Agregar sección `Fuente de summary`: mapper dimensional lee únicamente `validationSummary`; prohibir fallback a `summary` legacy; definir merge que preserva presentes sin defaults cruzados.

### 2. FB-CAPTURE-SOURCE — captureSource opcional con chip Origen; locationSource sigue excluido

- **Severity:** major
- **Targets:** requirements, design
- **Impact:** `captureSource` (`CAMERA`/`GALLERY`/`null`) es metadato de captura útil para el chip Origen en la vista web y no colisiona con la exclusión vigente de `locationSource`. Validado contra backend D2/R5 y frontend: mantener la exclusión de `locationSource` preserva privacidad mientras exponer `captureSource` mejora contexto sin costo de contrato.
- **Recommendation:** Incluir `captureSource` como campo opcional tipado `'CAMERA' | 'GALLERY' | null` con chip Origen condicional; derogar su exclusión previa; mantener `locationSource` excluido.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-3 (EARS): admitir `captureSource` opcional `CAMERA`/`GALLERY`/`null` con render condicional; ratificar `locationSource` excluido.
  - **design:**
    - Agregar sección `Origen de captura`: `captureSource` opcional `CAMERA`/`GALLERY`/`null`, chip Origen solo si presente; confirmar `locationSource` excluido del mapper dimensional.

### 3. FB-FIELD-COUNT-GLOSSARY — Glosario: 7 nuevos enumerados + validationSummary preexistente

- **Severity:** minor
- **Targets:** requirements, design
- **Impact:** El glosario dimensional suma 7 campos nuevos enumerados por el arquitecto; `validationSummary` ya existía y solo se sobrescribe su definición single-source. Sin este conteo explícito, requirements/design pueden derivar en listas parciales (6 u 8) y romper la paridad backend D2/R5.
- **Recommendation:** Fijar glosario en 7 nuevos enumerados más `validationSummary` preexistente sobrescrito; referenciar la lista cerrada del arquitecto en requirements y design.
- **Updates:**
  - **requirements:**
    - Actualizar glosario R-WEB (EARS): fijar 7 nuevos enumerados + `validationSummary` preexistente sobrescrito como lista cerrada.
  - **design:**
    - Agregar tabla `Glosario dimensional`: listar los 7 campos nuevos enumerados + `validationSummary` (preexistente, definición sobrescrita single-source).

### 4. FB-CONFIDENCE-FORMAT — Formato de confianza 0-1 con null hacia em-dash

- **Severity:** major
- **Targets:** requirements, design
- **Impact:** Confusión de escala 0-1 vs legacy 0-100 confirmada en `EvidenceAnalysisDetail` (`formatScore` con factores 1/100) y mapper `numberField` sin normalización. Validado contra backend D2/R5 y frontend: sin regla estricta, `visualConfidence` 0.92 puede renderizar 1% y `confidence` legacy 92 puede escalar a 9200%.
- **Recommendation:** `toVisualConfidence` solo acepta finito en `[0,1]`, sino `null`, sin clamp/throw; `formatConfidence01` como `Math.round(v*100)` sin decimales con `null` hacia em-dash; prohibir `formatScore` legacy y multiplicación legacy en ruta dimensional.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-1 (EARS): `toVisualConfidence` finito en `[0,1]` sino `null`, sin clamp/throw.
    - Actualizar R-WEB-4 (EARS): `formatConfidence01` `Math.round(v*100)` sin decimales, `null` hacia em-dash; prohibir legacy en dimensional.
  - **design:**
    - Agregar sección `Escalas de confianza`: `visualConfidence` 0-1 con `formatConfidence01` (`Math.round(v*100)`, `null` hacia em-dash) vs legacy 0-100; prohibir `formatScore` legacy en ruta dimensional.

### 5. FB-REASONCODES-PARSER — parseReasonCodes tolerante con filtro a 7 y dedup

- **Severity:** major
- **Targets:** requirements, design
- **Impact:** `reasonCodes` llega en formas heterogéneas (string serializado, `Array`, `null`) según backend D2/R5 y cache frontend. Sin parser tolerante, un `JSON.parse` directo lanza y rompe el detalle dimensional; sin filtro a los 7 códigos del glosario ni dedup, se cuelan códigos legacy o duplicados.
- **Recommendation:** `parseReasonCodes` tolera string (`JSON.parse` con try/catch) / `Array` / `null` hacia `[]`, filtra a los 7 códigos válidos, aplica dedup preservando orden y nunca lanza.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-5 (EARS): definir `parseReasonCodes` tolerante (string/Array/null hacia `[]`), filtrado a 7, dedup, never-throw.
  - **design:**
    - Agregar sección `Parser reasonCodes`: string vía `JSON.parse` tolerante, `Array` directo, null/otro hacia `[]`; filtro a 7 códigos válidos + dedup en orden; garantía never-throw.

### 6. FB-LABELS-ESPE — Etiquetas de veredicto en español con nota CoBox asiste

- **Severity:** minor
- **Targets:** requirements, design
- **Impact:** Etiquetas actuales en inglés/técnicas reducen comprensión del revisor en español. Validado con arquitecto: el veredicto dimensional debe comunicar sugerencia asistida, no decisión automática final.
- **Recommendation:** Etiquetar veredicto como `Aprobación sugerida` / `Revisión requerida` / `Rechazo sugerido` e incluir nota `CoBox asiste` que aclara carácter sugerido.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-6 (EARS): fijar etiquetas ES y nota `CoBox asiste` para el veredicto dimensional.
  - **design:**
    - Agregar sección `Etiquetas de veredicto`: mapa veredicto hacia Aprobación sugerida / Revisión requerida / Rechazo sugerido + nota `CoBox asiste`.

## Cobertura de requirements

| Requirement | Item asociado |
|---|---|
| R-WEB-1 | FB-CONFIDENCE-FORMAT |
| R-WEB-2 | FB-SUMMARY-SINGLE-SOURCE |
| R-WEB-3 | FB-CAPTURE-SOURCE |
| R-WEB-4 | FB-CONFIDENCE-FORMAT |
| R-WEB-5 | FB-REASONCODES-PARSER |
| R-WEB-6 | FB-LABELS-ESPE |
| Glosario R-WEB | FB-FIELD-COUNT-GLOSSARY |

## Siguiente paso

Aplicar con `spec-feedback --mode apply` cuando se apruebe. **No se modificó `requirements.md` en este reporte.** `design.md` y `tasks.md` aún no han sido generados.