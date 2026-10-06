# Feedback — dimensional-evidence-validation-web (paquete de integración backend)

- Generado: 2026-10-06T06:20:00Z
- Origen: paquete de integración Web provisto por el backend + verificación contra código (`DesktopDashboardController.java`, `SmartVisionAnalysisOverviewResource.java`, `IncidentContextEvaluator.java`, `ReasonCodes.java`, `EvidenceAnalysisWireContractTests.java`).
- Total: 2 ítems (2 major).
- Reseteos recomendados: `requirements`, `design`.

## FB-006 — Contrato de integración desktop-bff (major)

La spec no nombra endpoint, rol ni envelope. El contrato real: `GET /api/v1/desktop/smartvision/evidence-analyses`, rol `MANAGER`, solo lectura vía `desktop-bff`, envelope de 7 campos (`analysis`, `alerts`, `driver`, `route`, `vehicle`, `order`, `degradedSections`), `alerts: []` nunca null, `degradedSections: []` como discriminador, identidad `clientEvidenceId`.

- Requirements: agregar glosario de integración + tipado del envelope + alimentar detalle desde `fila.analysis`.

## FB-007 — Corregir ámbar permanente: verde alcanzable sin incidentId (major)

FB-003 quedó pesimista por la nota vieja de `tasks.md` 1.5. El código vigente (opción b) dice `incidentId` no obligatorio; `COMPATIBLE` exige `capturedAt` + cota + `evidenceType`. CAMERA completa alcanza verde; solo GALERÍA queda en ámbar permanente.

- Requirements: sustituir nota de ámbar permanente; verde exigible en E2E para CAMERA completo.
- Rechazo explícito: no se incorporan los códigos extra del punto 5 del paquete (vocabulario cerrado de 7 se mantiene).
