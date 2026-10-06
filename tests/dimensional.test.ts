import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatConfidence01,
  parseReasonCodes,
  toDimensionalValidation,
  toVisualConfidence,
} from '../src/features/evidence-analyses/services/dimensional.ts';
import {
  mergeEvidenceDetail,
  toAiEvidenceAnalysisView,
} from '../src/features/evidence-analyses/services/evidenceMappers.ts';

test('la confianza visual acepta solo números finitos en [0,1] y 0 es válido', () => {
  assert.equal(toVisualConfidence(0), 0);
  assert.equal(toVisualConfidence(0.92), 0.92);
  assert.equal(toVisualConfidence(1), 1);
});

test('la confianza visual rechaza sin clamp, reescala ni división por 100', () => {
  for (const value of [92.5, 2.5, 1.1, -0.1, NaN, Infinity, -Infinity, '0.92', true, {}, [], null, undefined]) {
    assert.equal(toVisualConfidence(value), null, `debería rechazar ${String(value)}`);
  }
});

test('la confianza visual se formatea como porcentaje entero o em dash', () => {
  assert.equal(formatConfidence01(0), '0%');
  assert.equal(formatConfidence01(0.5), '50%');
  assert.equal(formatConfidence01(0.92), '92%');
  assert.equal(formatConfidence01(0.925), '93%');
  assert.equal(formatConfidence01(1), '100%');
  assert.equal(formatConfidence01(null), '—');
});

test('los códigos de motivo se normalizan como arreglo canónico sin JSON.parse', () => {
  const parsed = parseReasonCodes([
    'VISUAL_INCOMPATIBLE_SCENE', 'GEO_MISMATCH', 'VISUAL_INCOMPATIBLE_SCENE', 5, null, '{"x":1}',
  ]);
  assert.deepEqual(parsed, {
    known: ['VISUAL_INCOMPATIBLE_SCENE', 'GEO_MISMATCH'],
    unknown: ['{"x":1}'],
  });
});

test('la contingencia string parsea JSON válido y degrada a código único si no', () => {
  assert.deepEqual(parseReasonCodes('["GEO_MISMATCH","CONTEXT_PARTIAL_DATA"]'), {
    known: ['GEO_MISMATCH', 'CONTEXT_PARTIAL_DATA'],
    unknown: [],
  });
  assert.deepEqual(parseReasonCodes('no es json'), { known: [], unknown: ['no es json'] });
  assert.deepEqual(parseReasonCodes('"texto"'), { known: [], unknown: ['texto'] });
});

test('null, undefined, vacío y string vacío equivalen a ausente', () => {
  for (const value of [null, undefined, [], '']) {
    assert.deepEqual(parseReasonCodes(value), { known: [], unknown: [] });
  }
});

test('los motivos desconocidos no se descartan y la deduplicación preserva orden', () => {
  assert.deepEqual(parseReasonCodes(['FOO', 'GEO_MISMATCH', 'FOO', 'BAR', 'GEO_MISMATCH', 'CONTEXT_PARTIAL_DATA']), {
    known: ['GEO_MISMATCH', 'CONTEXT_PARTIAL_DATA'],
    unknown: ['FOO', 'BAR'],
  });
});

test('parseReasonCodes nunca lanza y siempre devuelve ambos arreglos', () => {
  for (const value of [123, {}, { a: 1 }, Symbol('x'), () => {}, NaN]) {
    assert.deepEqual(parseReasonCodes(value), { known: [], unknown: [] });
  }
});

test('el objeto dimensional se construye con vocabulario cerrado y reasonCodes', () => {
  const dimensional = toDimensionalValidation({
    visualAssessment: 'COMPATIBLE',
    visualConfidence: 0.92,
    geographicAssessment: 'MATCH',
    contextAssessment: 'PARTIAL',
    verdict: 'COMPATIBLE',
    reasonCodes: ['VISUAL_INCOMPATIBLE_SCENE', 'NO_EXISTE'],
    recommendation: 'AUTO_APPROVE',
    captureSource: 'CAMERA',
  });
  assert.deepEqual(dimensional, {
    visualAssessment: 'COMPATIBLE',
    visualConfidence: 0.92,
    geographicAssessment: 'MATCH',
    contextAssessment: 'PARTIAL',
    verdict: 'COMPATIBLE',
    reasonCodes: { known: ['VISUAL_INCOMPATIBLE_SCENE'], unknown: ['NO_EXISTE'] },
    recommendation: 'AUTO_APPROVE',
    captureSource: 'CAMERA',
  });
});

test('los valores fuera de catálogo por eje degeneran a null', () => {
  const dimensional = toDimensionalValidation({
    visualAssessment: 'FOO',
    visualConfidence: 92.5,
    geographicAssessment: 'MISMATCH_PARCIAL',
    contextAssessment: 'COMPATIBLE',
    verdict: 'ESPERANDO',
    recommendation: 'DEFERIR',
    reasonCodes: [42],
    captureSource: 'ROTATED',
  });
  assert.deepEqual(dimensional, {
    visualAssessment: null,
    visualConfidence: null,
    geographicAssessment: null,
    contextAssessment: 'COMPATIBLE',
    verdict: null,
    reasonCodes: { known: [], unknown: [] },
    recommendation: null,
    captureSource: null,
  });
});

test('el objeto dimensional es null cuando no hay ninguno de los 7 campos', () => {
  assert.equal(toDimensionalValidation({ reasonCodes: [] }), null);
  assert.equal(toDimensionalValidation({ reasonCodes: null, captureSource: 'CAMERA' }), null);
  assert.equal(toDimensionalValidation({ captureSource: null }), null);
  assert.equal(toDimensionalValidation({ visualConfidence: 92.5 }), null);
});

test('un subconjunto parcial construye objeto presente con nulos y la confianza 0 cuenta', () => {
  const dimensional = toDimensionalValidation({ visualConfidence: 0 });
  assert.equal(dimensional?.visualConfidence, 0);
  assert.equal(dimensional?.visualAssessment, null);
  const parcial = toDimensionalValidation({ contextAssessment: 'INCONSISTENT', reasonCodes: [] });
  assert.deepEqual(parcial?.reasonCodes, { known: [], unknown: [] });
  const soloOrigen = toDimensionalValidation({ captureSource: 'GALLERY' });
  assert.equal(soloOrigen, null);
});

test('el mapper popula el objeto dimensional y mantiene validationSummary como fuente única', () => {
  const view = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'COMPLETED',
    visualAssessment: 'UNDETERMINED',
    visualConfidence: 0.925,
    geographicAssessment: 'UNVERIFIABLE',
    contextAssessment: 'PARTIAL',
    verdict: 'REVIEW_REQUIRED',
    reasonCodes: [
      'GALLERY_CAPTURE_LOCATION_UNVERIFIED',
      'CONTEXT_PARTIAL_DATA',
    ],
    recommendation: 'MANUAL_REVIEW',
    validationSummary: 'Resumen del backend',
    aiSummary: 'Resumen heredado',
  });
  assert.equal(view.summary, 'Resumen del backend');
  assert.equal(view.dimensional?.contextAssessment, 'PARTIAL');
  assert.deepEqual(view.dimensional?.reasonCodes.known, [
    'GALLERY_CAPTURE_LOCATION_UNVERIFIED',
    'CONTEXT_PARTIAL_DATA',
  ]);
});

test('el mapper no cae a aiSummary ni inventa datos dimensionales', () => {
  const view = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'COMPLETED',
    aiSummary: 'Resumen heredado',
  });
  assert.equal(view.summary, null);
  assert.equal(view.dimensional, null);
});

test('la fusión conserva dimensional y contexto cuando el detalle actualizado no aporta', () => {
  const context = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'COMPLETED',
    visualAssessment: 'COMPATIBLE',
    visualConfidence: 0.92,
    verdict: 'COMPATIBLE',
    reasonCodes: ['CONTEXT_PARTIAL_DATA'],
    driverName: 'Conductor',
  });
  const updated = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'COMPLETED',
  });
  const merged = mergeEvidenceDetail(context, updated);
  assert.equal(merged?.driverName, 'Conductor');
  assert.equal(merged?.dimensional?.visualAssessment, 'COMPATIBLE');
  assert.equal(merged?.dimensional?.visualConfidence, 0.92);
  assert.deepEqual(merged?.dimensional?.reasonCodes.known, ['CONTEXT_PARTIAL_DATA']);
});

test('la fusión actualiza dimensional cuando el detalle trae valores nuevos', () => {
  const context = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'REVIEW_REQUIRED',
    verdict: 'REVIEW_REQUIRED',
    visualAssessment: 'COMPATIBLE',
  });
  const updated = toAiEvidenceAnalysisView({
    clientEvidenceId: 'evidencia',
    status: 'COMPLETED',
    visualAssessment: 'INCOMPATIBLE',
    verdict: 'INCONSISTENT',
    reasonCodes: ['VISUAL_INCOMPATIBLE_SCENE'],
  });
  const merged = mergeEvidenceDetail(context, updated);
  assert.equal(merged?.dimensional?.visualAssessment, 'INCOMPATIBLE');
  assert.equal(merged?.dimensional?.verdict, 'INCONSISTENT');
  assert.deepEqual(merged?.dimensional?.reasonCodes.known, ['VISUAL_INCOMPATIBLE_SCENE']);
});