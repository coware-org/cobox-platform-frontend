import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsKeys } from '@/features/incidents/hooks';
import { alertsService } from '../services/alertsService';
import type {
  AlertStatus,
  ResolveAlertPayload,
} from '../types';

export const alertsKeys = {
  all: ['alerts'] as const,
  list: (status?: AlertStatus) => ['alerts', status ?? 'all'] as const,
  detail: (alertId: string) => ['alerts', 'detail', alertId] as const,
};

/**
 * Bandeja de alertas de SmartVision. Es la unica fuente de listado de alertas
 * del frontend: la usan tanto el inbox de SmartVision IA como sus KPIs.
 */
export function useAlerts(status?: AlertStatus) {
  return useQuery({
    queryKey: alertsKeys.list(status),
    queryFn: () => alertsService.getAlerts(status),
  });
}

/**
 * Detalle de la alerta (ai-validation): evidencia, analisis, resolucion e
 * incidente vinculado. Se carga solo al abrir el detalle integrado.
 */
export function useAlertDetail(alertId?: string | null) {
  return useQuery({
    queryKey: alertsKeys.detail(alertId ?? 'none'),
    queryFn: () => alertsService.getAlertDetail(alertId as string),
    enabled: Boolean(alertId),
  });
}

/**
 * Refresca la alerta en la vista detalle y en la bandeja, y despues invalida
 * todas las claves de alertas (listados filtrados + detalle).
 */
function useAlertMutationCache() {
  const queryClient = useQueryClient();

  return async () => {
    // La respuesta de una mutación es plana: invalidar conserva el contexto del BFF
    // hasta que llegue el listado actualizado, sin sobrescribirlo con campos null.
    await queryClient.invalidateQueries({ queryKey: alertsKeys.all });
  };
}

export function useAcknowledgeAlert() {
  const refreshAlert = useAlertMutationCache();

  return useMutation({
    mutationFn: (alertId: string) => alertsService.acknowledgeAlert(alertId),
    onSuccess: () => refreshAlert(),
  });
}

export function useResolveAlert() {
  const refreshAlert = useAlertMutationCache();

  return useMutation({
    mutationFn: ({
      alertId,
      payload,
    }: {
      alertId: string;
      payload: ResolveAlertPayload;
    }) => alertsService.resolveAlert(alertId, payload),
    onSuccess: () => refreshAlert(),
  });
}

export function useCreateIncidentFromAlert() {
  const queryClient = useQueryClient();
  const refreshAlert = useAlertMutationCache();

  return useMutation({
    mutationFn: (alertId: string) =>
      alertsService.createIncidentFromAlert(alertId),
    onSuccess: async (_result, alertId) => {
      // Crear el incidente modifica la alerta (linkedIncidentId) y agrega un
      // registro en la bandeja de incidentes.
      await refreshAlert();
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
      await queryClient.invalidateQueries({
        queryKey: incidentsKeys.bySourceAlert(alertId),
      });
    },
  });
}