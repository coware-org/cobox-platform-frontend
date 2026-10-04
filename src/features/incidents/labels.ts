import type { IncidentStatus } from './types';

/** Etiquetas del estado del INCIDENTE (no confundir con alerta ni analisis). */
export const incidentStatusLabels: Record<IncidentStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  ESCALATED: 'Escalado',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

/** Transiciones de estado validas segun el backend. */
export const incidentStatusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['ESCALATED', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [], // Estado final
};