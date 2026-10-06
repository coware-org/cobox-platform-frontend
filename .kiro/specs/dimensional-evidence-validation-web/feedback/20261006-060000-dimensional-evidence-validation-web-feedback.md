# Feedback — dimensional-evidence-validation-web (alineación con backend)

- Generado: 2026-10-06T06:00:00Z
- Origen: contraste de `requirements.md` frontend vs backend `feat/dimensional-validation-1.0-3.1` (spec `dimensional-evidence-validation` + código `SmartVisionAnalysisResource.java`, `EvidenceAnalysis.java`, `VerdictResolver.java`, `ReasonCodes.java`, `AiValidationQueryServiceImpl.java`).
- Total: 5 ítems (1 blocker, 2 major, 1 minor, 1 info).
- Reseteos recomendados: `requirements`, `design`.

## FB-001 — D1 captureSource no publicado en desktop-bff (blocker)

El glosario afirma 9 publicados con `captureSource`, pero el recurso publica 14 base + 7 dimensionales sin `captureSource` (`grep` en `desktop-bff-service/src/main` = 0).

- Requirements:
  - Glosario a 8 exactos (retirar `captureSource` de publicados).
  - Documentar `captureSource` como columna BD no mapeada; chip «Origen» condicional, sin degradar sección.
  - `R-WEB-1/3/7`: chip no exigible en E2E actual. Alternativa B: pedir exposición en `desktop-bff`.

## FB-002 — D2 reasonCodes pre-V3 es [] no null (major)

Backend publica `[]` en pre-V3 (excepción documentada). Riesgo de detector de presencia ingenuo.

- Requirements:
  - `R-WEB-7`: `[] ≡ ausente`.
  - `R-WEB-2`: documentar `[]` entrante como ausente.

## FB-003 — D3 veredicto COMPATIBLE inalcanzable por hueco incidentId (major)

Sin `incidentId` en evento → contexto `PARTIAL` → veredicto `REVIEW_REQUIRED` permanente (nota 1.5 + test fijado).

- Requirements:
  - `R-WEB-3/4`: ámbar permanente = resultado honesto esperado.
  - `R-WEB-8`: verde no exigible en E2E hasta V4/decisión R3.3.

## FB-004 — M1 validationSummary es plantilla ES del backend (minor)

`VerdictResolver.resumenDe` ya genera ES + tope 2000.

- Requirements:
  - `R-WEB-2/5`: frontend no retraduce; solo single-source + fallback.

## FB-005 — M2 referencia de líneas desactualizada (info)

- Requirements: citar `SmartVisionAnalysisResource.java:115-189`.

## Siguiente paso

Aplicar con `spec-feedback --mode apply --report 20261006-060000-dimensional-evidence-validation-web-feedback.json` (requiere aprobación).
