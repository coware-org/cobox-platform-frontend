import { fleetApi } from '@/services';
import { unwrapBffResource } from '@/utils';
import type {
  Alert,
  AlertDetail,
  AlertStatus,
  AlertsSummary,
  CreateIncidentFromAlertResult,
  ResolveAlertPayload,
} from '../types';

import { mapAlerts, toAlertDetail } from './alertMappers';

function unwrapResource(data: unknown, keys: string[]): Record<string, unknown> | null {
  return unwrapBffResource(data, keys);
}

export const alertsService = {
  async getAlerts(status?: AlertStatus): Promise<AlertsSummary> {
    const { data } = await fleetApi.get<unknown>(
      '/api/v1/desktop/smartvision/alerts',
      { params: status ? { status } : undefined },
    );
    return mapAlerts(data);
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
      { notes: payload.resolutionNotes },
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