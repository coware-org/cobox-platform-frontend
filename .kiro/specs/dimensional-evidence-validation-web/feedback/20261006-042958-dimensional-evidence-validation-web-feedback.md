# Feedback Report — dimensional-evidence-validation-web

- **Archivo JSON:** `feedback/20261006-042958-dimensional-evidence-validation-web-feedback.json`
- **Generado:** 2026-10-06T04:29:58Z
- **Modo:** report (no aplicado a `requirements.md`)

## Estado de la spec (verificado)

- Existe: `.kiro/specs/dimensional-evidence-validation-web/`
  - `requirements.md` — existe
  - `spec.json` — existe
  - `design.md` — ausente (anotado explícito)
  - `tasks.md` — ausente (anotado explícito)

## Resumen

- **Total items:** 1
- **Por severidad:** major: 1
- **Approvals a resetear:** `requirements`, `design`

## Detalle por item

### FB-VISUAL-CONFIDENCE-SCALE — Rango visualConfidence 0-1 vs confidenceScore 0-100

- **Severity:** major
- **Targets:** requirements, design
- **Impact:** Riesgo confirmado de doble escala en `EvidenceAnalysisDetail.tsx` `formatScore(value, scale)`: confidence legacy 0-100 usa factor 1 mientras visualConfidence 0-1 requiere factor 100. Riesgo de sub-render: `0.92 → 1%` y `92 → 9200%`. Evidencia validada por arquitecto: `formatScore` en `Detail.tsx:27-31`, confidence factor 1 líneas 117-118, fraudScore factor 100 línea 119, mapper `numberField` sin normalización.
- **Recommendation:** `toVisualConfidence` solo acepta finito en `[0,1]`, sino `null`, sin clamp/throw; `formatConfidence01` como `v*100` con `null → "—"`; prohibir `formatScore(v,1)` para visualConfidence y prohibir multiplicar legacy.
- **Updates:**
  - **requirements:**
    - Actualizar R-WEB-1 (EARS): definir visualConfidence en `[0,1]` con `toVisualConfidence → null` si no finito en rango, sin clamp/throw.
    - Actualizar R-WEB-4 (EARS): definir `formatConfidence01` como `v*100` con `null → "—"` y prohibir `formatScore(v,1)` para visualConfidence y prohibir multiplicar legacy.
  - **design:**
    - Agregar sección `Escalas de confianza`: visualConfidence 0-1 (`formatConfidence01`) vs confidenceScore/fraudScore legacy 0-100 (`formatScore` factor 1/100), regla de prohibición de mezcla y matriz de conversión.

## Siguiente paso

Aplicar con `spec-feedback --mode apply` cuando se apruebe. No se modificó `requirements.md` en este reporte.
