import { SeverityBadge } from '@/components/common';
import type { AlertSeverity } from '../types';

type AlertSeverityBadgeProps = {
  severity: AlertSeverity;
};

export function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  return <SeverityBadge severity={severity} />;
}