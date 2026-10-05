import { Badge } from '@/components/ui';
import type { AlertStatus } from '../types';

type AlertStatusBadgeProps = {
  status: AlertStatus;
};

const statusLabels: Record<AlertStatus, string> = {
  OPEN: 'Abierta',
  ACKNOWLEDGED: 'Reconocida',
  RESOLVED: 'Resuelta',
};

const statusClasses: Record<AlertStatus, string> = {
  OPEN: 'bg-red-50 text-red-700 border border-red-200',
  ACKNOWLEDGED: 'bg-amber-50 text-amber-700 border border-amber-200',
  RESOLVED: 'bg-[#DFF6F1] text-[#0F766E] border border-teal-200',
};

export function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  return <Badge className={statusClasses[status]}>{statusLabels[status] ?? status ?? 'Sin estado'}</Badge>;
}