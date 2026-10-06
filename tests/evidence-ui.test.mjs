import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vite } from './helpers/vite.mjs';
import { AxiosError } from 'axios';

const { EvidenceAnalysisDetail } = await vite.ssrLoadModule('/src/features/evidence-analyses/components/EvidenceAnalysisDetail.tsx');
const { EvidenceAnalysisStatusBadge } = await vite.ssrLoadModule('/src/features/evidence-analyses/components/EvidenceAnalysisStatusBadge.tsx');
const { toAiEvidenceAnalysisView } = await vite.ssrLoadModule('/src/features/evidence-analyses/services/evidenceMappers.ts');
const evidenceId = '123e4567-e89b-42d3-a456-426614174000';

function renderDetail(props, photo, client = new QueryClient()) {
  if (photo) client.setQueryData(['evidence-photo', 'anonymous', evidenceId], photo);
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(EvidenceAnalysisDetail, { evidenceId, ...props })));
  client.clear();
  return html;
}

test('un fallo de IA no impide renderizar la foto autorizada', () => {
  const html = renderDetail({ error: new Error('IA indisponible') }, {
    clientEvidenceId: evidenceId, downloadUrl: 'https://bucket.example.test/image?signature=example',
    expiresAt: new Date(Date.now() + 60_000).toISOString(), mimeType: 'image/jpeg',
  });
  assert.match(html, /Foto de la evidencia de entrega/);
  assert.match(html, /IA indisponible/);
  assert.match(html, /https:\/\/bucket.example.test\/image/);
  assert.doesNotMatch(html, /Authorization|Bearer/);
});

test('el análisis permanece visible mientras la foto está cargando', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({ clientEvidenceId: evidenceId, status: 'COMPLETED', validationSummary: 'Entrega validada', confidenceScore: 1, fraudScore: 0.2 }) });
  assert.match(html, /Cargando foto/);
  assert.match(html, /Entrega validada/);
  assert.match(html, />1%</);
  assert.match(html, />20%</);
});

test('un fallo de actualización conserva el último resultado de IA', () => {
  const html = renderDetail({ error: new Error('timeout'), analysis: toAiEvidenceAnalysisView({ clientEvidenceId: evidenceId, status: 'REVIEW_REQUIRED', validationSummary: 'Revisar firma' }) });
  assert.match(html, /últimos datos disponibles/);
  assert.match(html, /Revisar firma/);
});

test('los estados desconocidos tienen una representación segura', () => {
  const html = renderToStaticMarkup(createElement(EvidenceAnalysisStatusBadge, { status: 'WAITING_CONTEXT' }));
  assert.match(html, /Waiting Context/);
});


test('una descarga denegada no oculta el resultado del análisis', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await client.fetchQuery({
    queryKey: ['evidence-photo', 'anonymous', evidenceId],
    queryFn: () => Promise.reject(new AxiosError('Forbidden', undefined, undefined, undefined, { status: 403 })),
  }).catch(() => {});
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({ clientEvidenceId: evidenceId, status: 'COMPLETED', validationSummary: 'Entrega validada' }) }, null, client);
  assert.match(html, /No tienes permiso/);
  assert.match(html, /Entrega validada/);
  assert.doesNotMatch(html, /<img/);
});

test('el servicio de foto usa JWT solo para pedir la autorización de descarga', async () => {
  const { fleetApi } = await vite.ssrLoadModule('/src/services/api.ts');
  const { setAuthTokenGetter } = await vite.ssrLoadModule('/src/lib/auth0Token.ts');
  const { evidencePhotoService } = await vite.ssrLoadModule('/src/features/evidence-analyses/services/evidencePhotoService.ts');
  const adapter = fleetApi.defaults.adapter;
  setAuthTokenGetter(async () => 'manager-token');
  let calls = 0;
  fleetApi.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, `/api/v1/mobile/evidence/${evidenceId}/download-url`);
    assert.equal(config.headers.Authorization, 'Bearer manager-token');
    return { config, status: 200, statusText: 'OK', headers: {}, data: {
      clientEvidenceId: evidenceId, httpMethod: 'GET', downloadUrl: 'https://bucket.example.test/image?signature=example',
      expiresAt: new Date(Date.now() + 60_000).toISOString(), mimeType: 'image/jpeg', requiredHeaders: {},
    } };
  };
  try {
    const ticket = await evidencePhotoService.getDownloadTicket(evidenceId);
    assert.equal(ticket.clientEvidenceId, evidenceId);
    assert.equal(calls, 1);
    assert.deepEqual(Object.keys(ticket).sort(), ['clientEvidenceId', 'downloadUrl', 'expiresAt', 'mimeType']);
  } finally {
    fleetApi.defaults.adapter = adapter;
    setAuthTokenGetter(null);
  }
});

test('la sección dimensional se muestra con sus ejes y omite el chip sin origen', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'COMPLETED',
    visualAssessment: 'COMPATIBLE', visualConfidence: 0.92,
    geographicAssessment: 'MATCH', contextAssessment: 'PARTIAL',
    verdict: 'COMPATIBLE', recommendation: 'AUTO_APPROVE',
    reasonCodes: ['CONTEXT_PARTIAL_DATA'], validationSummary: 'Entrega validada',
  }) });
  assert.match(html, /Validación dimensional/);
  assert.match(html, /92%/);
  assert.match(html, /Visual/);
  assert.match(html, /Geográfico/);
  assert.match(html, /Contextual/);
  assert.match(html, /Aprobación sugerida/);
  assert.doesNotMatch(html, /Origen/);
});

test('el chip Origen se muestra cuando hay origen de captura real', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'COMPLETED',
    visualAssessment: 'COMPATIBLE', captureSource: 'CAMERA',
    reasonCodes: [],
  }) });
  assert.match(html, /Origen/);
  assert.match(html, /Cámara/);
});

test('la sección dimensional se omite sin datos y el resto del detalle queda intacto', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'COMPLETED', validationSummary: 'Entrega validada',
    confidenceScore: 1, fraudScore: 0.2,
  }) });
  assert.doesNotMatch(html, /Validación dimensional/);
  assert.match(html, /Estado del analisis/);
  assert.match(html, /Entrega validada/);
});

test('veredicto y acción operativa se separan del estado del análisis', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'REVIEW_REQUIRED',
    verdict: 'REVIEW_REQUIRED', recommendation: 'MANUAL_REVIEW',
    reasonCodes: ['GEO_UNVERIFIABLE'],
  }) });
  assert.match(html, /Estado del analisis/);
  assert.match(html, /Veredicto/);
  assert.match(html, /Revisión requerida/);
  assert.match(html, /Acción:/);
  assert.match(html, /Inspeccionar evidencia manualmente/);
});

test('un motivo no catalogado se muestra con su código crudo', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'COMPLETED',
    reasonCodes: ['MOTIVO_DESCONOCIDO'],
  }) });
  assert.match(html, /MOTIVO_DESCONOCIDO/);
});

test('los ejes ausentes se degradan sin romper el renderizado', () => {
  const html = renderDetail({ analysis: toAiEvidenceAnalysisView({
    clientEvidenceId: evidenceId, status: 'COMPLETED',
    contextAssessment: 'INCONSISTENT', reasonCodes: [], captureSource: null,
  }) });
  assert.match(html, /Validación dimensional/);
  assert.match(html, /—/);
  assert.match(html, /Contextual/);
});
