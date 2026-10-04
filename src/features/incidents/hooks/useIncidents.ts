import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '../services/incidentsService';
import type {
  Incident,
  CreateIncidentPayload,
  UpdateIncidentStatusPayload,
  AssignResponsiblePayload,
} from '../types';

export const incidentsKeys = {
  all: ['incidents'] as const,
  detail: (incidentId: string) => ['incidents', 'detail', incidentId] as const,
  bySourceAlert: (alertId: string) =>
    ['incidents', 'source', 'ai-alert', alertId] as const,
};

/**
 * Hook para obtener todas las incidencias
 */
export function useIncidents() {
  return useQuery({
    queryKey: incidentsKeys.all,
    queryFn: () => incidentsService.getIncidents(),
  });
}

/**
 * Hook para obtener una incidencia por su ID (incidentId del backend)
 */
export function useIncidentById(incidentId: string | undefined) {
  return useQuery({
    queryKey: incidentsKeys.detail(incidentId ?? 'none'),
    queryFn: () => incidentsService.getIncidentById(incidentId as string),
    enabled: Boolean(incidentId),
  });
}

/**
 * Incidente originado por una alerta de IA. Devuelve `null` cuando el
 * backend responde 404 (aun no existe incidente para esa alerta).
 */
export function useIncidentBySourceAlert(alertId?: string | null) {
  return useQuery({
    queryKey: incidentsKeys.bySourceAlert(alertId ?? 'none'),
    queryFn: () => incidentsService.getBySourceAiAlert(alertId as string),
    enabled: Boolean(alertId),
  });
}

/**
 * Hook para crear una nueva incidencia
 */
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIncidentPayload) =>
      incidentsService.createIncident(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
  });
}

/**
 * Hook para actualizar el estado de una incidencia
 */
export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      payload,
    }: {
      incidentId: string;
      payload: UpdateIncidentStatusPayload;
    }) => incidentsService.updateStatus(incidentId, payload),
    onSuccess: async (updated) => {
      // Actualizacion optimista del listado y del detalle en cache.
      queryClient.setQueryData<Incident[]>(incidentsKeys.all, (current) =>
        (current ?? []).map((incident) =>
          incident.incidentId === updated.incidentId ? updated : incident,
        ),
      );
      queryClient.setQueryData(
        incidentsKeys.detail(updated.incidentId),
        updated,
      );
      if (updated.sourceAlertId) {
        queryClient.setQueryData(
          incidentsKeys.bySourceAlert(updated.sourceAlertId),
          updated,
        );
      }
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
  });
}

/**
 * Hook para asignar un responsable a una incidencia
 */
export function useAssignResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      payload,
    }: {
      incidentId: string;
      payload: AssignResponsiblePayload;
    }) => incidentsService.assignResponsible(incidentId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Incident[]>(incidentsKeys.all, (current) =>
        (current ?? []).map((incident) =>
          incident.incidentId === updated.incidentId ? updated : incident,
        ),
      );
      queryClient.setQueryData(
        incidentsKeys.detail(updated.incidentId),
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
  });
}

/**
 * Hook combinado para obtener y actualizar incidencias
 * Útil para componentes que necesitan múltiples operaciones
 */
export function useIncidentsManager() {
  const incidents = useIncidents();
  const createMutation = useCreateIncident();
  const updateStatusMutation = useUpdateIncidentStatus();
  const assignMutation = useAssignResponsible();

  return {
    incidents: incidents.data ?? [],
    isLoading:
      incidents.isLoading ||
      createMutation.isPending ||
      updateStatusMutation.isPending ||
      assignMutation.isPending,
    isError: incidents.isError,
    error: incidents.error,

    // Métodos
    create: createMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    assignResponsible: assignMutation.mutateAsync,
  };
}