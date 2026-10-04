import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { Button, Card, Input, Select, Skeleton } from '@/components/ui';
import { ApiErrorState } from '@/components/shared';
import {
  DegradedSectionsBanner,
  DetailDrawer,
  EmptyState,
  PageHeader,
} from '@/components/common';
import { toEvidenceAnalysisView } from '../services';
import { useEvidenceAnalyses, useEvidenceAnalysisDetail } from '../hooks';
import type {
  EvidenceAnalysis,
  EvidenceAnalysisFilters,
  EvidenceAnalysisStatus,
} from '../types';
import {
  EvidenceAnalysisDetail,
  EvidenceAnalysisStatusBadge,
} from '../components';

const columnHelper = createColumnHelper<EvidenceAnalysis>();

const statusOptions: EvidenceAnalysisStatus[] = [
  'PENDING',
  'PROCESSED',
  'FLAGGED',
  'REJECTED',
];

const toFilterNumber = (value: string): number | undefined => {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function EvidenceAnalysesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const evidenceIdParam = searchParams.get('evidenceId');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [driverIdInput, setDriverIdInput] = useState('');
  const [routeIdInput, setRouteIdInput] = useState('');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const filters = useMemo<EvidenceAnalysisFilters>(
    () => ({
      status: (statusFilter || undefined) as EvidenceAnalysisStatus | undefined,
      driverId: toFilterNumber(driverIdInput),
      routeId: toFilterNumber(routeIdInput),
      orderId: toFilterNumber(orderIdInput),
    }),
    [statusFilter, driverIdInput, routeIdInput, orderIdInput],
  );

  const query = useEvidenceAnalyses(filters);
  const analyses = useMemo(() => query.data?.analyses ?? [], [query.data]);

  const selectedRecord = useMemo(
    () =>
      selectedAnalysisId
        ? (analyses.find(
            (analysis) => analysis.analysisId === selectedAnalysisId,
          ) ?? null)
        : null,
    [analyses, selectedAnalysisId],
  );

  /**
   * Navegacion contextual: /evidence-analyses?evidenceId=...
   * El historial del BFF no expone el id de evidencia, asi que el deep link
   * se resuelve con el analisis puntual de ai-validation (mismo componente).
   */
  const needsExternalDetail = Boolean(evidenceIdParam) && !selectedRecord;
  const detailQuery = useEvidenceAnalysisDetail(
    needsExternalDetail ? evidenceIdParam : null,
  );

  const columns = [
    columnHelper.accessor('analysisId', {
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-xs">
          {info.getValue().slice(0, 8)}...
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => <EvidenceAnalysisStatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('driverName', {
      header: 'Conductor',
      cell: (info) => {
        const row = info.row.original;
        const value = row.driverName ?? (row.driverId ? `Conductor #${row.driverId}` : '-');
        return <span className="text-sm text-gray-600">{value}</span>;
      },
    }),
    columnHelper.accessor('routeTitle', {
      header: 'Ruta',
      cell: (info) => {
        const row = info.row.original;
        const value = row.routeTitle ?? (row.routeId ? `Ruta #${row.routeId}` : '-');
        return <span className="text-sm text-gray-600">{value}</span>;
      },
    }),
    columnHelper.accessor('vehiclePlate', {
      header: 'Vehiculo',
      cell: (info) => {
        const row = info.row.original;
        const value = row.vehiclePlate ?? (row.vehicleId ? `Vehiculo #${row.vehicleId}` : '-');
        return <span className="text-sm text-gray-600">{value}</span>;
      },
    }),
    columnHelper.accessor('orderLabel', {
      header: 'Orden',
      cell: (info) => {
        const row = info.row.original;
        const value = row.orderLabel ?? (row.orderId ? `Orden #${row.orderId}` : '-');
        return <span className="text-sm text-gray-600">{value}</span>;
      },
    }),
    columnHelper.accessor('detectedLabels', {
      header: 'Etiquetas',
      cell: (info) => {
        const labels = info.getValue() ?? [];
        return (
          <span className="block max-w-xs truncate text-sm text-gray-600">
            {labels.length > 0 ? labels.join(', ') : '-'}
          </span>
        );
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Creado',
      cell: (info) => (
        <span className="text-sm text-gray-600">
          {new Date(info.getValue()).toLocaleString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          type="button"
          onClick={() => setSelectedAnalysisId(info.row.original.analysisId)}
          className="rounded-md p-1 text-blue-600 hover:bg-blue-900"
          title="Ver detalles"
          aria-label={`Ver detalle del analisis ${info.row.original.analysisId}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: analyses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasFilters =
    statusFilter !== '' ||
    driverIdInput !== '' ||
    routeIdInput !== '' ||
    orderIdInput !== '';

  if (query.isError) {
    return (
      <ApiErrorState
        title="Error al cargar análisis"
        message="No pudimos cargar la lista de análisis de evidencia."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Historial de Análisis"
        description="Todos los análisis de evidencia de IA, incluidos los que no generan alerta"
      />

      <div className="space-y-6 px-4 py-6 md:px-8">
        <DegradedSectionsBanner sections={query.data?.degradedSections} />

        <Card className="p-4">
          <div className="flex flex-col items-end gap-4 md:flex-row">
            <div className="w-full md:w-48">
              <label
                htmlFor="analysis-status-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Estado
              </label>
              <Select
                id="analysis-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full md:w-40">
              <label
                htmlFor="driver-id-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Conductor ID
              </label>
              <Input
                id="driver-id-filter"
                type="number"
                min={1}
                placeholder="ID"
                value={driverIdInput}
                onChange={(event) => setDriverIdInput(event.target.value)}
              />
            </div>

            <div className="w-full md:w-40">
              <label
                htmlFor="route-id-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Ruta ID
              </label>
              <Input
                id="route-id-filter"
                type="number"
                min={1}
                placeholder="ID"
                value={routeIdInput}
                onChange={(event) => setRouteIdInput(event.target.value)}
              />
            </div>

            <div className="w-full md:w-40">
              <label
                htmlFor="order-id-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Orden ID
              </label>
              <Input
                id="order-id-filter"
                type="number"
                min={1}
                placeholder="ID"
                value={orderIdInput}
                onChange={(event) => setOrderIdInput(event.target.value)}
              />
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter('');
                setDriverIdInput('');
                setRouteIdInput('');
                setOrderIdInput('');
              }}
              disabled={!hasFilters}
            >
              Limpiar
            </Button>
          </div>
        </Card>

        {query.isLoading ? (
          <Card className="overflow-hidden">
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        ) : analyses.length === 0 ? (
          <EmptyState
            title="No hay análisis de evidencia para mostrar"
            description={
              hasFilters
                ? 'Ninguno de los análisis coincide con los filtros aplicados.'
                : 'Aún no se han registrado análisis de evidencia.'
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
                          className="px-6 py-3 text-left font-semibold text-gray-700"
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
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() =>
                        setSelectedAnalysisId(row.original.analysisId)
                      }
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {selectedRecord ? (
        <DetailDrawer
          title="Detalle de análisis"
          subtitle={
            <span className="font-mono break-all">{selectedRecord.analysisId}</span>
          }
          onClose={() => setSelectedAnalysisId(null)}
          width="md:w-[36rem]"
        >
          <EvidenceAnalysisDetail analysis={toEvidenceAnalysisView(selectedRecord)} />
        </DetailDrawer>
      ) : null}

      {needsExternalDetail && evidenceIdParam ? (
        <DetailDrawer
          title="Detalle de análisis"
          subtitle={
            <span className="font-mono break-all">{evidenceIdParam}</span>
          }
          onClose={() => setSearchParams({})}
          width="md:w-[36rem]"
        >
          <EvidenceAnalysisDetail
            analysis={detailQuery.data}
            isLoading={detailQuery.isLoading}
            error={detailQuery.error}
            onRetry={() => void detailQuery.refetch()}
            emptyMessage="No encontramos un análisis para esta evidencia."
          />
        </DetailDrawer>
      ) : null}
    </div>
  );
}