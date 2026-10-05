import { Badge } from '@/components/ui';
import type { EvidenceAnalysisViewStatus } from '../types';

const labelByStatus: Partial<Record<EvidenceAnalysisViewStatus, string>> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  REVIEW_REQUIRED: 'Requiere revisión',
  RECAPTURE_REQUIRED: 'Requiere recaptura',
  FRAUD_SUSPECTED: 'Fraude sospechado',
  DEGRADED: 'Degradada',
};

const classByStatus: Partial<Record<EvidenceAnalysisViewStatus, string>> = {
  PENDING: 'bg-slate-100 text-slate-700 border border-slate-200',
  PROCESSING: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-[#DFF6F1] text-[#0F766E] border border-teal-200',
  FAILED: 'bg-red-50 text-[#EF4444] border border-red-200',
  REVIEW_REQUIRED: 'bg-amber-50 text-amber-700 border border-amber-200',
  RECAPTURE_REQUIRED: 'bg-purple-50 text-purple-700 border border-purple-200',
  FRAUD_SUSPECTED: 'bg-purple-50 text-purple-700 border border-purple-200',
  DEGRADED: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const unknownClasses = 'bg-slate-100 text-slate-700 border border-slate-200';

function humanize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type EvidenceAnalysisStatusBadgeProps = {
  status: string | null | undefined;
};

/**
 * Estado del ANALISIS de evidencia. Nunca se reutiliza para el estado de la
 * alerta ni para el estado del incidente.
 */
export function EvidenceAnalysisStatusBadge({
  status,
}: EvidenceAnalysisStatusBadgeProps) {
  if (!status) {
    return <Badge className={unknownClasses}>Sin estado</Badge>;
  }

  const key = status as EvidenceAnalysisViewStatus;
  const label = labelByStatus[key] ?? humanize(status);
  const className = classByStatus[key] ?? unknownClasses;

  return (
    <Badge className={className} title={status}>
      {label}
    </Badge>
  );
}