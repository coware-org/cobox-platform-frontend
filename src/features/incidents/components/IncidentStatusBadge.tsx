import { Badge } from '@/components/ui';
import { incidentStatusLabels } from '../labels';
import type { IncidentStatus } from '../types';

const statusClasses: Record<IncidentStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700 border border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-[#3B82F6] border border-blue-200',
  ESCALATED: 'bg-orange-50 text-orange-700 border border-orange-200',
  RESOLVED: 'bg-[#DFF6F1] text-[#0F766E] border border-teal-200',
  CLOSED: 'bg-gray-50 text-gray-700 border border-gray-200',
};

/**
 * Estado del INCIDENTE. Nunca se reutiliza para el estado de la alerta ni
 * para el estado del analisis de evidencia.
 */
export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge className={statusClasses[status]}>{incidentStatusLabels[status]}</Badge>
  );
}