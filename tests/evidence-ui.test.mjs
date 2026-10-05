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
