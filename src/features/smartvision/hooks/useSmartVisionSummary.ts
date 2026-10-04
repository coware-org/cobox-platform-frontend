import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Shield,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import type { Alert, AlertSeverity } from '@/features/alerts/types';
import { useAlerts } from '@/features/alerts/hooks';
import type { Category, CategoryColor, KpiData } from '../types';

const UNCATEGORIZED = '__uncategorized__';

const severityWeight: Record<AlertSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const severityColor: Record<AlertSeverity, CategoryColor> = {
  LOW: 'yellow',
  MEDIUM: 'orange',
  HIGH: 'red',
  CRITICAL: 'red',
};

export function isHighSeverity(severity: AlertSeverity) {
  return severity === 'HIGH' || severity === 'CRITICAL';
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'Sin alertas registradas';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Fecha no disponible';

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'Hace menos de 1 min';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function buildCategories(alerts: Alert[]): Category[] {
  const grouped = alerts.reduce<
    Record<string, { count: number; severity: AlertSeverity }>
  >((acc, alert) => {
    const id = alert.type ?? UNCATEGORIZED;
    const current = acc[id];
    if (!current) {
      acc[id] = { count: 1, severity: alert.severity };
      return acc;
    }

    current.count += 1;
    if (severityWeight[alert.severity] > severityWeight[current.severity]) {
      current.severity = alert.severity;
    }
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([id, data]) => ({
      id,
      name: id === UNCATEGORIZED ? 'Sin categoria' : humanize(id),
      count: data.count,
      color: severityColor[data.severity],
      icon:
        id.includes('FRAUD') || id.includes('MISMATCH')
          ? ShieldAlert
          : AlertTriangle,
    }))
    .sort((left, right) => right.count - left.count);
}

function buildKpis(alerts: Alert[]): KpiData[] {
  const openAlerts = alerts.filter((alert) => alert.status === 'OPEN');
  const acknowledged = alerts.filter(
    (alert) => alert.status === 'ACKNOWLEDGED',
  );
  const resolved = alerts.filter((alert) => alert.status === 'RESOLVED');
  const highSeverity = alerts.filter((alert) =>
    isHighSeverity(alert.severity),
  );
  const latestAlert = [...alerts].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];

  return [
    {
      id: 'total',
      title: 'Alertas totales',
      value: alerts.length,
      subtitle:
        latestAlert !== undefined
          ? `Ultima: ${formatRelativeTime(latestAlert.createdAt)}`
          : 'Sin alertas registradas',
      icon: alerts.length > 0 ? Eye : Shield,
      color: 'default',
    },
    {
      id: 'open-alerts',
      title: 'Alertas abiertas',
      value: openAlerts.length,
      subtitle: `${acknowledged.length} reconocidas`,
      icon: Activity,
      color: openAlerts.length > 0 ? 'orange' : 'green',
    },
    {
      id: 'high-severity',
      title: 'Severidad alta',
      value: highSeverity.length,
      subtitle: 'HIGH + CRITICAL sin filtrar',
      icon: TriangleAlert,
      color: highSeverity.length > 0 ? 'red' : 'green',
    },
    {
      id: 'resolved',
      title: 'Alertas resueltas',
      value: resolved.length,
      subtitle: `${alerts.length} alertas en total`,
      icon: CheckCircle2,
      color: resolved.length > 0 ? 'green' : 'default',
    },
    {
      id: 'latest',
      title: 'Ultima alerta',
      value: latestAlert ? formatDateTime(latestAlert.createdAt) : '-',
      subtitle: latestAlert
        ? humanize(latestAlert.type ?? 'sin categoria')
        : 'Esperando resultados de IA',
      icon: Clock,
      color: latestAlert
        ? isHighSeverity(latestAlert.severity)
          ? 'red'
          : latestAlert.severity === 'MEDIUM'
            ? 'orange'
            : 'default'
        : 'default',
    },
  ];
}

/**
 * Indicadores y distribucion de la bandeja de SmartVision.
 * Consume la MISMA consulta que el listado (`useAlerts`), por lo que nunca
 * se duplica la peticion de alertas.
 */
export function useSmartVisionSummary() {
  const query = useAlerts();
  const alerts = useMemo(() => query.data?.alerts ?? [], [query.data]);

  const kpis = useMemo(() => buildKpis(alerts), [alerts]);
  const categories = useMemo(() => buildCategories(alerts), [alerts]);
  const highSeverityAlerts = useMemo(
    () => alerts.filter((alert) => isHighSeverity(alert.severity)),
    [alerts],
  );

  return {
    kpis,
    categories,
    highSeverityAlerts,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}