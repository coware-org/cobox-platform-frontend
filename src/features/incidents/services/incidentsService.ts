import { isAxiosError } from "axios";
import { fleetApi } from "@/services";
import { unwrapBffList, unwrapBffResource } from "@/utils";
import type {
  BackendIncidentResource,
  CreateIncidentPayload,
  UpdateIncidentStatusPayload,
  AssignResponsiblePayload,
  Incident,
} from "../types";

const WRAPPER_KEYS = ["value", "data", "incident", "resource"];

/**
 * Mapea la respuesta del backend a nuestro modelo de dominio
 */
function toIncident(backend: BackendIncidentResource | Record<string, unknown>): Incident {
  const source = backend as Record<string, unknown>;

  return {
    id: Number(source.id ?? 0),
    incidentId: String(source.incidentId ?? ""),
    type: String(source.type ?? ""),
    description: String(source.description ?? ""),
    reportedAt: String(source.reportedAt ?? ""),
    severity: (source.severity as Incident["severity"]) ?? "LOW",
    status: (source.status as Incident["status"]) ?? "OPEN",
    responsibleUserId:
      typeof source.responsibleUserId === "number"
        ? source.responsibleUserId
        : undefined,
    sourceType: (source.sourceType as Incident["sourceType"]) ?? "MANUAL",
    sourceAlertId:
      typeof source.sourceAlertId === "string" ? source.sourceAlertId : null,
    sourceClientEvidenceId:
      typeof source.sourceClientEvidenceId === "string"
        ? source.sourceClientEvidenceId
        : null,
  };
}

/**
 * Normaliza el recurso de incidente ante respuestas planas o envueltas
 * por el BFF en {value|data|incident|resource}.
 */
function toIncidentFromResponse(data: unknown): Incident | null {
  const resource = unwrapBffResource(data, WRAPPER_KEYS);
  if (!resource || !resource.incidentId) return null;
  return toIncident(resource);
}

export const incidentsService = {
  /**
   * Obtiene todas las incidencias
   */
  async getIncidents(): Promise<Incident[]> {
    const { data } = await fleetApi.get("/api/v1/incidents");
    const list = unwrapBffList<BackendIncidentResource>(data, [
      "value",
      "data",
      "incidents",
    ]);
    return list
      .map(toIncidentFromResponse)
      .filter((incident): incident is Incident => incident !== null);
  },

  /**
   * Obtiene una incidencia por su UUID (incidentId del backend)
   */
  async getIncidentById(incidentId: string): Promise<Incident> {
    const { data } = await fleetApi.get(
      `/api/v1/incidents/${incidentId}`,
    );
    const incident = toIncidentFromResponse(data);
    if (!incident) {
      throw new Error("No se pudo leer la incidencia solicitada");
    }
    return incident;
  },

  /**
   * Crea una nueva incidencia
   */
  async createIncident(payload: CreateIncidentPayload): Promise<Incident> {
    const { data } = await fleetApi.post("/api/v1/incidents", payload);
    const incident = toIncidentFromResponse(data);
    if (!incident) {
      throw new Error("No se pudo leer la incidencia creada");
    }
    return incident;
  },

  /**
   * Actualiza el estado de una incidencia
   */
  async updateStatus(
    incidentId: string,
    payload: UpdateIncidentStatusPayload,
  ): Promise<Incident> {
    const { data } = await fleetApi.patch(
      `/api/v1/incidents/${incidentId}/status`,
      payload,
    );
    const incident = toIncidentFromResponse(data);
    if (!incident) {
      throw new Error("No se pudo leer la incidencia actualizada");
    }
    return incident;
  },

  /**
   * Asigna un responsable a la incidencia
   */
  async assignResponsible(
    incidentId: string,
    payload: AssignResponsiblePayload,
  ): Promise<Incident> {
    const { data } = await fleetApi.patch(
      `/api/v1/incidents/${incidentId}/assign`,
      payload,
    );
    const incident = toIncidentFromResponse(data);
    if (!incident) {
      throw new Error("No se pudo leer la incidencia actualizada");
    }
    return incident;
  },

  async getBySourceAiAlert(alertId: string): Promise<Incident | null> {
    try {
      const { data } = await fleetApi.get(
        `/api/v1/incidents/source/ai-alert/${alertId}`,
      );
      return toIncidentFromResponse(data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
};

// Exportar alias para compatibilidad
export const incidentsApi = incidentsService;
