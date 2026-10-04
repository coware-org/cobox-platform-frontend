import { fleetApi } from '@/services';
import { unwrapBffResource } from '@/utils';
import type { DegradedSection } from '@/types';
import type {
  Alert,
  AlertDetail,
  AlertStatus,
  AlertsSummary,
  BackendAlertDetailResource,
  BackendAlertResource,
  CreateIncidentFromAlertResult,
  ResolveAlertPayload,
} from '../types';

function pickString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function pickNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
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

/**
 * El BFF puede devolver la alerta suelta o envuelta en {value|data|alert|resource}.
 * Se normaliza siempre al modelo de dominio del frontend.
 */
function unwrapResource(data: unknown, keys: string[]): Record<string, unknown> | null {
  return unwrapBffResource(data, keys);
}

function toAlert(backend: BackendAlertResource | Record<string, unknown>): Alert {
  const source = backend as Record<string, unknown>;
  const alertId = pickString(source, ['alertId', 'id']) ?? '';
  const analysisSummary = pickString(source, ['analysisSummary', 'summary']);

  return {
    id: pickNumber(source, ['id']) ?? 0,
    alertId,
    status: (source.status as AlertStatus) ?? 'OPEN',
    severity: (source.severity as Alert['severity']) ?? 'LOW',
    type: pickString(source, ['type', 'alertType', 'category', 'detectionType']),
    message: pickString(source, ['message', 'description']) ?? analysisSummary,
    driverId: pickNumber(source, ['driverId']),
    driverName: pickString(source, ['driverName']),
    routeId: pickNumber(source, ['routeId']),
    routeTitle: pickString(source, ['routeTitle']),
    vehicleId: pickNumber(source, ['vehicleId']),
    vehiclePlate: pickString(source, ['vehiclePlate']),
    orderId: pickNumber(source, ['orderId']),
    orderLabel: pickString(source, ['orderLabel']),
    evidenceUrl: pickString(source, ['evidenceUrl', 'thumbnailUrl']),
    analysisSummary,
    createdAt: pickString(source, ['createdAt']) ?? new Date().toISOString(),
    acknowledgedAt: pickString(source, ['acknowledgedAt']),
    resolvedAt: pickString(source, ['resolvedAt']),
    linkedIncidentId: pickString(source, [
      'linkedIncidentId',
      'linkedIncidentUuid',
    ]),
  };
}

function toAlertDetail(
  backend: BackendAlertDetailResource | Record<string, unknown>,
): AlertDetail {
  const source = backend as Record<string, unknown>;
  const base = toAlert(source);

  return {
    ...base,
    evidenceId: pickString(source, ['evidenceId', 'clientEvidenceId']),
    analysisId: pickString(source, ['analysisId']),
    analysisData: pickRecord(source, ['analysisData', 'analysis']),
    aiConfidence: pickNumber(source, ['aiConfidence', 'confidenceScore']),
    incidentType: pickString(source, ['incidentType']),
    acknowledgedBy: pickNumber(source, ['acknowledgedBy']),
    resolvedBy: pickNumber(source, ['resolvedBy']),
    resolutionNotes: pickString(source, ['resolutionNotes']),
    linkedIncidentUuid: pickString(source, [
      'linkedIncidentUuid',
      'linkedIncidentId',
    ]),
  };
}

type EnvelopeLike<T> = {
  value?: T[];
  data?: T[];
  alerts?: T[];
  degradedSections?: DegradedSection[];
};

function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const env = data as EnvelopeLike<T>;
    if (Array.isArray(env.value)) return env.value;
    if (Array.isArray(env.data)) return env.data;
    if (Array.isArray(env.alerts)) return env.alerts;
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

export const alertsService = {
  async getAlerts(status?: AlertStatus): Promise<AlertsSummary> {
    const { data } = await fleetApi.get<unknown>(
      '/api/v1/desktop/smartvision/alerts',
      { params: status ? { status } : undefined },
    );
    const alerts = ensureArray<Record<string, unknown>>(data).map(toAlert);
    const degradedSections = extractDegradedSections(data);
    return { alerts, degradedSections };
  },

  async getAlertDetail(alertId: string): Promise<AlertDetail> {
    const { data } = await fleetApi.get<unknown>(
      `/api/v1/ai-validation/alerts/${alertId}`,
    );
    const resource = unwrapResource(data, ['value', 'data', 'alert', 'resource']);

    if (!resource) {
      throw new Error(
        'El detalle de la alerta llego vacio o con un formato no reconocido.',
      );
    }

    return toAlertDetail(resource);
  },

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    const { data } = await fleetApi.patch<unknown>(
      `/api/v1/ai-validation/alerts/${alertId}/acknowledge`,
    );
    const resource = unwrapResource(data, ['value', 'data', 'alert', 'resource']);
    return toAlertDetail(resource ?? { alertId, status: 'ACKNOWLEDGED' });
  },

  async resolveAlert(
    alertId: string,
    payload: ResolveAlertPayload,
  ): Promise<Alert> {
    const { data } = await fleetApi.patch<unknown>(
      `/api/v1/ai-validation/alerts/${alertId}/resolve`,
      { resolutionNotes: payload.resolutionNotes },
    );
    const resource = unwrapResource(data, ['value', 'data', 'alert', 'resource']);
    return toAlertDetail(resource ?? { alertId, status: 'RESOLVED' });
  },

  async createIncidentFromAlert(
    alertId: string,
  ): Promise<CreateIncidentFromAlertResult> {
    const response = await fleetApi.post<unknown>(
      `/api/v1/ai-validation/alerts/${alertId}/incident`,
    );
    const resource =
      unwrapResource(response.data, ['value', 'data', 'incident', 'resource']) ?? {};

    const incidentId = String(resource.id ?? resource.incidentId ?? '');
    const incidentUuid = String(
      resource.incidentId ?? resource.incidentUuid ?? incidentId,
    );
    const created =
      resource.created === true ||
      resource.alreadyExists === false ||
      response.status === 201;

    return { incidentId, incidentUuid, created };
  },
};