import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { BrainCircuit, Eye, RefreshCw, TriangleAlert } from 'lucide-react';
import { ApiErrorState } from '@/components/shared';
import {
  DegradedSectionsBanner,
  EmptyState,
} from '@/components/common';
import { Button, Card, Select, Skeleton } from '@/components/ui';
import { cn } from '@/utils';
import {
  AlertDetailDrawer,
  AlertSeverityBadge,
  AlertStatusBadge,
} from '@/features/alerts/components';
import { useAlerts } from '@/features/alerts/hooks';
import type { Alert, AlertStatus } from '@/features/alerts/types';
import { CategoryProgress, StatsCard } from '../components';
import { useSmartVisionSummary } from '../hooks';

const columnHelper = createColumnHelper<Alert>();

const statusOptions: { value: '' | AlertStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'OPEN', label: 'Abiertas' },
  { value: 'ACKNOWLEDGED', label: 'Reconocidas' },
  { value: 'RESOLVED', label: 'Resueltas' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function SmartVisionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function SmartVisionPage() {
  const [searchParams] = useSearchParams();
  const alertIdParam = searchParams.get('alertId');

  const [statusFilter, setStatusFilter] = useState<'' | AlertStatus>('');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alertIdParam,
  );

  // Indicadores: siempre sobre el total de alertas (sin filtro de estado).
  const summary = useSmartVisionSummary();
  // Listado: respeta el filtro por estado.
  const alertsQuery = useAlerts(statusFilter || undefined);

  const alerts = useMemo(
    () => alertsQuery.data?.alerts ?? [],
    [alertsQuery.data],
  );
  const degradedSections = alertsQuery.data?.degradedSections ?? [];

  // Permite abrir el detalle desde navegacion contextual (?alertId=...).
  useEffect(() => {
    if (alertIdParam) setSelectedAlertId(alertIdParam);
  }, [alertIdParam]);

  const selectedAlert = useMemo(
    () =>
      selectedAlertId
        ? (alerts.find((alert) => alert.alertId === selectedAlertId) ?? null)
        : null,
    [alerts, selectedAlertId],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('severity', {
        header: 'Severidad',
        cell: (info) => <AlertSeverityBadge severity={info.getValue()} />,
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => <AlertStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('type', {
        header: 'Tipo',
        cell: (info) => {
          const row = info.row.original;
          const label = row.type ?? row.analysisSummary ?? '-';
          return (
            <span className="block max-w-[18rem] truncate text-sm text-gray-700">
              {label}
            </span>
          );
        },
      }),
      columnHelper.accessor('driverName', {
        header: 'Conductor',
        cell: (info) => {
          const row = info.row.original;
          const label = row.driverName
            ? row.driverName
            : row.driverId
              ? `Conductor #${row.driverId}`
              : '-';
          return <span className="text-sm text-gray-600">{label}</span>;
        },
      }),
      columnHelper.accessor('vehiclePlate', {
        header: 'Vehiculo',
        cell: (info) => {
          const row = info.row.original;
          const label = row.vehiclePlate
            ? row.vehiclePlate
            : row.vehicleId
              ? `Vehiculo #${row.vehicleId}`
              : '-';
          return <span className="text-sm text-gray-600">{label}</span>;
        },
      }),
      columnHelper.accessor('routeTitle', {
        header: 'Ruta',
        cell: (info) => {
          const row = info.row.original;
          const label = row.routeTitle
            ? row.routeId
              ? `${row.routeTitle} (#${row.routeId})`
              : row.routeTitle
            : row.routeId
              ? `Ruta #${row.routeId}`
              : '-';
          return <span className="text-sm text-gray-600">{label}</span>;
        },
      }),
      columnHelper.accessor('orderLabel', {
        header: 'Orden',
        cell: (info) => {
          const row = info.row.original;
          const label = row.orderLabel
            ? row.orderLabel
            : row.orderId
              ? `Orden #${row.orderId}`
              : '-';
          return <span className="text-sm text-gray-600">{label}</span>;
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Fecha',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            onClick={() => setSelectedAlertId(info.row.original.alertId)}
            className="rounded-md p-1 text-[#0F766E] hover:bg-[#DFF6F1]"
            title="Ver detalle"
            aria-label={`Ver detalle de la alerta ${info.row.original.alertId}`}
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: alerts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const isInitialLoading =
    alertsQuery.isLoading && !alertsQuery.data && summary.isLoading;

  if (summary.isError && alertsQuery.isError) {
    return (
      <ApiErrorState
        title="No se pudo cargar SmartVision"
        message="No pudimos consultar la bandeja de alertas de SmartVision. Verifica que el gateway exponga /api/v1/desktop/smartvision y que tu sesion tenga un token valido."
        onRetry={() => {
          void summary.refetch();
          void alertsQuery.refetch();
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
              SmartVision IA
            </h1>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              Bandeja principal de alertas de IA
              {alertsQuery.isFetching || summary.isFetching
                ? ' · Actualizando...'
                : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as '' | AlertStatus)
            }
            className="w-full sm:w-44"
            aria-label="Filtrar alertas por estado"
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              void summary.refetch();
              void alertsQuery.refetch();
            }}
            disabled={alertsQuery.isFetching || summary.isFetching}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (alertsQuery.isFetching || summary.isFetching) && 'animate-spin',
              )}
            />
            Refrescar
          </Button>
        </div>
      </div>

      <DegradedSectionsBanner sections={degradedSections} />

      {isInitialLoading ? (
        <SmartVisionSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summary.kpis.map((kpi, index) => (
              <StatsCard key={kpi.id} kpi={kpi} index={index} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#111827]">
                  Alertas
                </h2>
                <span className="text-sm text-[#6B7280]">
                  {alerts.length} resultados
                </span>
              </div>

              {alertsQuery.isError && alerts.length === 0 ? (
                <ApiErrorState
                  title="Error al cargar alertas"
                  message="No pudimos cargar la bandeja de alertas."
                  onRetry={() => void alertsQuery.refetch()}
                />
              ) : alerts.length === 0 ? (
                <EmptyState
                  title="No hay alertas para mostrar"
                  description={
                    statusFilter
                      ? 'Ninguna alerta coincide con el filtro de estado seleccionado.'
                      : 'Cuando SmartVision detecte una anomalia en una evidencia, aparecera aqui.'
                  }
                />
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-gray-200">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="px-4 py-3 text-left font-semibold text-gray-700"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {alertsQuery.isFetching ? (
                          <tr>
                            <td colSpan={columns.length} className="px-4 py-4">
                              <Skeleton className="h-8 w-full" />
                            </td>
                          </tr>
                        ) : (
                          table.getRowModel().rows.map((row) => (
                            <tr
                              key={row.id}
                              onClick={() =>
                                setSelectedAlertId(row.original.alertId)
                              }
                              className={cn(
                                'cursor-pointer hover:bg-slate-50',
                                selectedAlertId === row.original.alertId &&
                                  'bg-[#DFF6F1]/50',
                              )}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-4 py-3">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-[#111827]">
                  Distribucion por categoria
                </h2>
                <Card className="p-5 shadow-sm">
                  <CategoryProgress categories={summary.categories} />
                </Card>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold text-[#111827]">
                  Alertas de alta severidad
                </h2>
                <Card className="divide-y divide-gray-200">
                  {summary.isLoading ? (
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  ) : summary.highSeverityAlerts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">
                      Sin alertas de severidad alta o critica.
                    </p>
                  ) : (
                    summary.highSeverityAlerts
                      .slice(0, 8)
                      .map((alert) => (
                        <button
                          key={alert.alertId}
                          type="button"
                          onClick={() => setSelectedAlertId(alert.alertId)}
                          className={cn(
                            'flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50',
                            selectedAlertId === alert.alertId && 'bg-[#DFF6F1]/50',
                          )}
                        >
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-900">
                              {alert.type ?? 'Sin categoria'}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {alert.driverName ?? 'Conductor sin asignar'} ·{' '}
                              {formatDateTime(alert.createdAt)}
                            </span>
                          </span>
                          <AlertStatusBadge status={alert.status} />
                        </button>
                      ))
                  )}
                </Card>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedAlertId ? (
        <AlertDetailDrawer
          alertId={selectedAlertId}
          fallbackAlert={selectedAlert}
          onClose={() => setSelectedAlertId(null)}
        />
      ) : null}
    </section>
  );
}