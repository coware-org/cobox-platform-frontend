import { SeverityBadge } from '@/components/common';
import type { IncidentSeverity } from '../types';

type IncidentSeverityBadgeProps = {
  severity: IncidentSeverity;
};

export function IncidentSeverityBadge({ severity }: IncidentSeverityBadgeProps) {
  return <SeverityBadge severity={severity} />;
}