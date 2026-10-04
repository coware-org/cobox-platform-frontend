import { fleetApi } from '@/services';
import { unwrapBffResource } from '@/utils';
import type { DegradedSection } from '@/types';
import type {
  AiEvidenceAnalysisResource,
  BackendEvidenceAnalysisResource,
  EvidenceAnalysis,
  EvidenceAnalysisDetailView,
  EvidenceAnalysisFilters,
  EvidenceAnalysesSummary,
} from '../types';

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function pickRecord(
  source: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function pickLabels(source: Record<string, unknown>): string[] | null {
  const value = source.detectedLabels;
  return Array.isArray(value) && value.length > 0
    ? value.map((label) => String(label))
    : null;
}

/**
 * El BFF puede devolver el recurso suelto o envuelto en {value|data|...}.
 */
function unwrapResource(
  data: unknown,
  keys: string[],
): Record<string, unknown> | null {
  return unwrapBffResource(data, keys);
}

function toEvidenceAnalysis(
  backend: BackendEvidenceAnalysisResource,
): EvidenceAnalysis {
  return {
    id: backend.id,
    analysisId: backend.analysisId,
    status: backend.status,
    driverId: backend.driverId ?? null,
    driverName: backend.driverName ?? null,
    routeId: backend.routeId ?? null,
    routeTitle: backend.routeTitle ?? null,
    vehicleId: backend.vehicleId ?? null,
    vehiclePlate: backend.vehiclePlate ?? null,
    orderId: backend.orderId ?? null,
    orderLabel: backend.orderLabel ?? null,
    evidenceUrl: backend.evidenceUrl ?? null,
    thumbnailUrl: backend.thumbnailUrl ?? null,
    aiSummary: backend.aiSummary ?? null,
    aiConfidence: backend.aiConfidence ?? null,
    analysisData: backend.analysisData ?? null,
    detectedLabels: backend.detectedLabels ?? null,
    createdAt: backend.createdAt,
    processedAt: backend.processedAt ?? null,
  };
}

/**
 * Vista unificada a partir de un registro del historial (desktop BFF).
 * `analysisData` es el blob que el BFF guarda con los scores del proveedor,
 * por eso se leen como respaldo cuando las columnas planas vienen vacias.
 */
export function toEvidenceAnalysisView(
  record: EvidenceAnalysis,
): EvidenceAnalysisDetailView {
  const source = record as unknown as Record<string, unknown>;
  const blob = (record.analysisData ?? null) as Record<string, unknown> | null;

  return {
    analysisId: record.analysisId ?? null,
    evidenceId: pickString(source, ['evidenceId', 'clientEvidenceId']),
    evidenceUrl: record.evidenceUrl ?? null,
    thumbnailUrl: record.thumbnailUrl ?? null,
    objectKey: pickString(source, ['objectKey']),
    evidenceType: pickString(source, ['evidenceType']),
    status: record.status ?? null,
    provider: pickString(source, ['provider']),
    driverId: record.driverId ?? null,
    driverName: record.driverName ?? null,
    routeId: record.routeId ?? null,
    routeTitle: record.routeTitle ?? null,
    vehicleId: record.vehicleId ?? null,
    vehiclePlate: record.vehiclePlate ?? null,
    orderId: record.orderId ?? null,
    orderLabel: record.orderLabel ?? null,
    confidence:
      record.aiConfidence ??
      (blob ? pickNumber(blob, ['confidenceScore', 'confidence']) : null),
    fraudScore: blob ? pickNumber(blob, ['fraudScore', 'fraud_score']) : null,
    summary:
      record.aiSummary ??
      (blob ? pickString(blob, ['validationSummary', 'summary']) : null),
    failureReason: blob ? pickString(blob, ['failureReason']) : null,
    detectedLabels: record.detectedLabels ?? null,
    analysisData: record.analysisData ?? null,
    createdAt: record.createdAt ?? null,
    processedAt: record.processedAt ?? null,
  };
}

/** Vista unificada a partir del analisis puntual de ai-validation. */
export function toAiEvidenceAnalysisView(
  resource: AiEvidenceAnalysisResource,
): EvidenceAnalysisDetailView {
  const source = resource as unknown as Record<string, unknown>;
  const blob = pickRecord(source, ['analysisData', 'analysis']);

  return {
    analysisId: pickString(source, ['analysisId']),
    evidenceId: pickString(source, ['clientEvidenceId', 'evidenceId']),
    evidenceUrl: pickString(source, ['evidenceUrl']),
    thumbnailUrl: pickString(source, ['thumbnailUrl']),
    objectKey: pickString(source, ['objectKey']),
    evidenceType: pickString(source, ['evidenceType']),
    status: pickString(source, ['status']),
    provider: pickString(source, ['provider']),
    driverId: pickNumber(source, ['driverId']),
    driverName: pickString(source, ['driverName']),
    routeId: pickNumber(source, ['routeId']),
    routeTitle: pickString(source, ['routeTitle']),
    vehicleId: pickNumber(source, ['vehicleId']),
    vehiclePlate: pickString(source, ['vehiclePlate']),
    orderId: pickNumber(source, ['orderId']),
    orderLabel: pickString(source, ['orderLabel']),
    confidence: pickNumber(source, ['confidenceScore', 'aiConfidence']),
    fraudScore: pickNumber(source, ['fraudScore']),
    summary: pickString(source, ['validationSummary']),
    failureReason: pickString(source, ['failureReason']),
    detectedLabels: pickLabels(source),
    analysisData: blob,
    createdAt: pickString(source, ['createdAt']),
    processedAt: pickString(source, ['completedAt', 'processedAt']),
  };
}

type EnvelopeLike<T> = {
  value?: T[];
  data?: T[];
  analyses?: T[];
  degradedSections?: DegradedSection[];
};

function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const env = data as EnvelopeLike<T>;
    if (Array.isArray(env.analyses)) return env.analyses;
    if (Array.isArray(env.value)) return env.value;
    if (Array.isArray(env.data)) return env.data;
  }
  return [];
}

function extractDegradedSections(data: unknown): DegradedSection[] {
  if (data && typeof data === 'object') {
    const env = data as EnvelopeLike<unknown>;
    if (Array.isArray(env.degradedSections)) return env.degradedSections;
  }
  return [];
}

export const evidenceAnalysesService = {
  /** Historial completo de analisis de evidencia, incluidos los que no generan alerta. */
  async getEvidenceAnalyses(
    filters: EvidenceAnalysisFilters = {},
  ): Promise<EvidenceAnalysesSummary> {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.driverId) params.driverId = filters.driverId;
    if (filters.routeId) params.routeId = filters.routeId;
    if (filters.orderId) params.orderId = filters.orderId;

    const { data } = await fleetApi.get<unknown>(
      '/api/v1/desktop/smartvision/evidence-analyses',
      { params },
    );
    const analyses = ensureArray<BackendEvidenceAnalysisResource>(data).map(
      toEvidenceAnalysis,
    );
    const degradedSections = extractDegradedSections(data);
    return { analyses, degradedSections };
  },

  /** Analisis puntual de ai-validation para una evidencia concreta. */
  async getAiEvidenceAnalysis(
    clientEvidenceId: string,
  ): Promise<EvidenceAnalysisDetailView> {
    const { data } = await fleetApi.get<unknown>(
      `/api/v1/ai-validation/evidence-analyses/${clientEvidenceId}`,
    );
    const resource = unwrapResource(data, [
      'value',
      'data',
      'analysis',
      'evidenceAnalysis',
      'resource',
    ]);

    if (!resource || Object.keys(resource).length === 0) {
      throw new Error(
        'El analisis de evidencia llego vacio o con un formato no reconocido.',
      );
    }

    return toAiEvidenceAnalysisView(resource as AiEvidenceAnalysisResource);
  },
};