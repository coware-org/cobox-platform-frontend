import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixtures from './fixtures/smartvision.json' with { type: 'json' };
import { isAnalysisPending, mapEvidenceAnalyses, mergeEvidenceDetail, toAiEvidenceAnalysisView } from '../src/features/evidence-analyses/services/evidenceMappers.ts';
import { mapAlerts, toAlertDetail } from '../src/features/alerts/services/alertMappers.ts';
import { downloadRenewalDelay, parseDownloadTicket } from '../src/features/evidence-analyses/services/evidenceDownload.ts';

const evidenceId = fixtures.analyses[0].analysis.clientEvidenceId;
const now = Date.parse('2026-10-05T15:00:00Z');
const download = {
  clientEvidenceId: evidenceId, objectKey: 'private/evidence', httpMethod: 'GET',
  downloadUrl: 'https://bucket.example.test/photo?signature=example',
  expiresAt: '2026-10-05T15:15:00Z', mimeType: 'image/jpeg', sizeBytes: 1200,
  requiredHeaders: { ResponseContentType: 'image/jpeg' },
};

test('el BFF conserva la identidad y los puntajes sin depender de analysisId', () => {
  const { analyses } = mapEvidenceAnalyses(fixtures.analyses);
  assert.equal(analyses[0].clientEvidenceId, evidenceId);
  assert.equal(analyses[0].evidenceId, evidenceId);
  assert.equal(analyses[0].analysisId, null);
  assert.equal(analyses[0].status, 'REVIEW_REQUIRED');
  assert.equal(analyses[0].confidence, 70);
  assert.equal(analyses[0].fraudScore, 0.2);
  assert.equal(analyses[0].routeTitle, 'Ruta Lima');
  assert.equal(analyses[0].vehiclePlate, 'ABC-123');
  assert.equal(analyses[0].driverName, 'driver@example.test');
});

test('contexto parcial mantiene la fila y expone sus secciones degradadas', () => {
  const result = mapEvidenceAnalyses({ data: fixtures.analyses });
  assert.equal(result.analyses[1].driverId, 8);
  assert.equal(result.analyses[1].driverName, null);
  assert.equal(result.analyses[1].confidence, null);
  assert.equal(result.analyses[1].processedAt, null);
  assert.deepEqual(result.degradedSections, fixtures.analyses[1].degradedSections);
});

test('las respuestas inválidas muestran error en vez de una lista vacía', () => {
  assert.throws(() => mapEvidenceAnalyses({ unexpected: [] }), /formato inválido/);
  assert.throws(() => mapEvidenceAnalyses([{ analysis: { status: 'COMPLETED' } }]), /identifica/);
  assert.deepEqual(mapEvidenceAnalyses([]).analyses, []);
});

test('alertas anidadas y detalle directo conducen a la misma evidencia', () => {
  const list = mapAlerts({ alerts: fixtures.alerts });
  const detail = toAlertDetail(fixtures.alerts[0].alert);
  assert.equal(list.alerts[0].alertId, detail.alertId);
  assert.equal(list.alerts[0].evidenceId, detail.evidenceId);
  assert.equal(list.alerts[0].analysisSummary, 'AI result is ambiguous');
  assert.equal(list.alerts[0].vehiclePlate, 'ABC-123');
  assert.equal(detail.id, null);
  assert.throws(() => mapAlerts([{}]), /identificador/);
});

test('campos ausentes no inventan fechas ni resultados de IA', () => {
  const view = toAiEvidenceAnalysisView({ clientEvidenceId: evidenceId, status: 'PROCESSING' });
  assert.equal(view.createdAt, null);
  assert.equal(view.processedAt, null);
  assert.equal(view.summary, null);
  const alert = toAlertDetail({ alertId: 'alert', clientEvidenceId: evidenceId });
  assert.equal(alert.createdAt, '');
  assert.equal(alert.aiConfidence, null);
});

test('el detalle actualizado conserva contexto, OCR y puntajes cero', () => {
  const context = mapEvidenceAnalyses(fixtures.analyses).analyses[0];
  const updated = toAiEvidenceAnalysisView({
    ...fixtures.analyses[0].analysis, status: 'COMPLETED', confidenceScore: 0, fraudScore: 0,
    ocrText: 'Recibido por cliente', detectedLabels: ['Document', null, 5],
  });
  const merged = mergeEvidenceDetail(context, updated);
  assert.equal(merged?.vehiclePlate, 'ABC-123');
  assert.equal(merged?.driverName, 'driver@example.test');
  assert.equal(merged?.confidence, 0);
  assert.equal(merged?.fraudScore, 0);
  assert.equal(merged?.ocrText, 'Recibido por cliente');
  assert.deepEqual(merged?.detectedLabels, ['Document']);
});

test('una evidencia distinta nunca hereda contexto de la selección anterior', () => {
  const context = mapEvidenceAnalyses(fixtures.analyses).analyses[0];
  const updated = toAiEvidenceAnalysisView(fixtures.analyses[1].analysis);
  const merged = mergeEvidenceDetail(context, updated);
  assert.equal(merged?.driverId, 8);
  assert.equal(merged?.vehiclePlate, null);
  assert.equal(mergeEvidenceDetail(context), context);
});

test('los estados nuevos se conservan y los finales dejan de requerir polling', () => {
  const pending = ['PENDING', 'PROCESSING'];
  const terminal = ['COMPLETED', 'FAILED', 'REVIEW_REQUIRED', 'RECAPTURE_REQUIRED', 'FRAUD_SUSPECTED', 'DEGRADED'];
  for (const status of pending) assert.equal(isAnalysisPending(status), true);
  for (const status of terminal) assert.equal(isAnalysisPending(status), false);
  const unknown = toAiEvidenceAnalysisView({ clientEvidenceId: evidenceId, status: 'FUTURE_STATUS' });
  assert.equal(unknown.status, 'FUTURE_STATUS');
  assert.equal(isAnalysisPending(unknown.status), false);
});

test('la URL de foto funciona con el contrato actual y el corregido sin cabeceras', () => {
  assert.equal(parseDownloadTicket(download, evidenceId, now).downloadUrl, download.downloadUrl);
  assert.equal(parseDownloadTicket({ ...download, requiredHeaders: {} }, evidenceId, now).mimeType, 'image/jpeg');
});

test('URLs vencidas, identidad ajena y protocolos inseguros se rechazan', () => {
  assert.throws(() => parseDownloadTicket(download, 'other', now), /corresponde/);
  assert.throws(() => parseDownloadTicket({ ...download, httpMethod: 'PUT' }, evidenceId, now), /corresponde/);
  assert.throws(() => parseDownloadTicket({ ...download, downloadUrl: 'javascript:alert(1)' }, evidenceId, now), /válida/);
  assert.throws(() => parseDownloadTicket({ ...download, expiresAt: 'invalid' }, evidenceId, now), /vencida/);
  assert.throws(() => parseDownloadTicket(download, evidenceId, now + 900_000), /vencida/);
  assert.throws(() => parseDownloadTicket({ ...download, requiredHeaders: { Authorization: 'secret' } }, evidenceId, now), /cabeceras/);
});

test('la renovación se programa antes del vencimiento y no usa el reloj de subida', () => {
  const ticket = parseDownloadTicket(download, evidenceId, now);
  assert.equal(downloadRenewalDelay(ticket, now), 890_000);
  assert.equal(downloadRenewalDelay(ticket, now + 899_000), 0);
});


test('los avisos repetidos de contexto parcial no duplican mensajes en la pantalla', () => {
  const result = mapEvidenceAnalyses([fixtures.analyses[1], fixtures.analyses[1]]);
  assert.equal(result.degradedSections.length, 1);
});
