import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Eye, Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { ApiErrorState, TablePagination } from '@/components/shared';
import { EmptyState, PageHeader } from '@/components/common';
import { usePagination } from '@/hooks';
import {
  useAssignResponsible,
  useCreateIncident,
  useIncidentBySourceAlert,
  useIncidents,
  useUpdateIncidentStatus,
} from '../hooks';
import type {
  AssignResponsiblePayload,
  CreateIncidentPayload,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  UpdateIncidentStatusPayload,
} from '../types';
import {
  AssignResponsibleDialog,
  CreateIncidentDialog,
  IncidentDetailPanel,
  IncidentSeverityBadge,
  IncidentStatusBadge,
  UpdateIncidentStatusDialog,
} from '../components';
import { incidentStatusLabels } from '../labels';

const columnHelper = createColumnHelper<Incident>();

const severityOptions: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const statusOptions: IncidentStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
];

export function IncidentsPage() {
  const [searchParams] = useSearchParams();
  const sourceAlertId = searchParams.get('sourceAlertId');

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | IncidentSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { toast } = useToast();
  const incidentsQuery = useIncidents();
  const sourceIncidentQuery = useIncidentBySourceAlert(sourceAlertId);

  const createIncidentMutation = useCreateIncident();
  const updateStatusMutation = useUpdateIncidentStatus();
  const assignMutation = useAssignResponsible();

  const incidents = useMemo(() => incidentsQuery.data ?? [], [incidentsQuery.data]);

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesSearch =
        incident.incidentId.toLowerCase().includes(term) ||
        incident.type.toLowerCase().includes(term) ||
        incident.description.toLowerCase().includes(term);
      const matchesSeverity =
        severityFilter === 'all' || incident.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, search, severityFilter, statusFilter]);

  const pagination = usePagination({ items: filteredIncidents });

  const activeIncident = useMemo(() => {
    if (!selectedIncident) return null;
    return (
      incidents.find((incident) => incident.incidentId === selectedIncident.incidentId) ??
      selectedIncident
    );
  }, [incidents, selectedIncident]);

  // Navegacion contextual: /incidents?sourceAlertId=... abre el incidente
  // originado por esa alerta de SmartVision. Se dispara una sola vez por
  // alerta para que cerrar el detalle no lo vuelva a abrir.
  const autoOpenedSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceAlertId || selectedIncident) return;
    if (autoOpenedSourceRef.current === sourceAlertId) return;

    const source = sourceIncidentQuery.data;
    if (!source?.incidentId) return;

    const match = incidents.find(
      (incident) => incident.incidentId === source.incidentId,
    );
    if (!match) return;

    autoOpenedSourceRef.current = sourceAlertId;
    setSelectedIncident(match);
  }, [sourceAlertId, sourceIncidentQuery.data, incidents, selectedIncident]);

  const severityMetrics = useMemo(() => {
    const active = incidents.filter(
      (incident) => incident.status !== 'CLOSED' && incident.status !== 'RESOLVED',
    );
    return {
      critical: active.filter((incident) => incident.severity === 'CRITICAL').length,
      high: active.filter((incident) => incident.severity === 'HIGH').length,
      medium: active.filter((incident) => incident.severity === 'MEDIUM').length,
      low: active.filter((incident) => incident.severity === 'LOW').length,
      totalActive: active.length,
    };
  }, [incidents]);

  const hasFilters =
    search.trim() !== '' || severityFilter !== 'all' || statusFilter !== 'all';

  const handleCreateSubmit = (payload: CreateIncidentPayload) => {
    createIncidentMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        toast({ title: 'Incidencia reportada correctamente', type: 'success' });
      },
      onError: (error: unknown) => {
        toast({
          title:
            (error as { message?: string }).message || 'Error al reportar incidencia',
          type: 'error',
        });
      },
    });
  };

  const handleStatusSubmit = (payload: UpdateIncidentStatusPayload) => {
    if (!activeIncident) return;
    updateStatusMutation.mutate(
      { incidentId: activeIncident.incidentId, payload },
      {
        onSuccess: (updated) => {
          setSelectedIncident(updated);
          setIsStatusOpen(false);
          toast({ title: 'Estado actualizado correctamente', type: 'success' });
        },
        onError: (error: unknown) => {
          toast({
            title: (error as { message?: string }).message || 'Error al cambiar estado',
            type: 'error',
          });
        },
      },
    );
  };

  const handleAssignSubmit = (payload: AssignResponsiblePayload) => {
    if (!activeIncident) return;
    assignMutation.mutate(
      { incidentId: activeIncident.incidentId, payload },
      {
        onSuccess: (updated) => {
          setSelectedIncident(updated);
          setIsAssignOpen(false);
          toast({ title: 'Responsable asignado correctamente', type: 'success' });
        },
        onError: (error: unknown) => {
          toast({
            title:
              (error as { message?: string }).message ||
              'Error al asignar responsable',
            type: 'error',
          });
        },
      },
    );
  };

  const columns = [
    columnHelper.accessor('incidentId', {
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-xs">{info.getValue().slice(0, 8)}...</span>
      ),
    }),
    columnHelper.accessor('type', {
      header: 'Tipo',
      cell: (info) => (
        <span className="block max-w-xs truncate text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('severity', {
      header: 'Severidad',
      cell: (info) => <IncidentSeverityBadge severity={info.getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => <IncidentStatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('sourceType', {
      header: 'Origen',
      cell: (info) => {
        const source = info.getValue();
        if (source === 'AI_ALERT') {
          return (
            <Badge className="border border-purple-200 bg-purple-50 text-purple-700">
              IA
            </Badge>
          );
        }
        return <span className="text-sm text-gray-500">Manual</span>;
      },
    }),
    columnHelper.accessor('responsibleUserId', {
      header: 'Responsable',
      cell: (info) => (
        <span className="text-sm text-gray-600">
          {info.getValue() ? `Usuario #${info.getValue()}` : '-'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          type="button"
          onClick={() => setSelectedIncident(info.row.original)}
          className="rounded-md p-1 text-blue-600 hover:bg-blue-900"
          title="Ver detalles"
          aria-label={`Ver detalle del incidente ${info.row.original.incidentId}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: pagination.pageItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // La página la controla usePagination: con `data` inestable TanStack entra
    // en un bucle infinito de auto-reset de paginación.
    manualPagination: true,
  });

  if (incidentsQuery.isError) {
    return (
      <ApiErrorState
        title="Error al cargar incidencias"
        message="No pudimos cargar la lista de incidencias"
        onRetry={() => incidentsQuery.refetch()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Gestión de Incidencias"
        description="Monitorea y gestiona las incidencias operativas, incluidas las originadas por IA"
      />

      <div className="space-y-6 px-4 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card className="p-4">
            <p className="text-xs font-medium text-gray-600">Total Activo</p>
            <p className="text-2xl font-bold text-gray-900">
              {severityMetrics.totalActive}
            </p>
          </Card>
          <Card className="border-l-4 border-l-purple-500 p-4">
            <p className="text-xs font-medium text-gray-600">Crítico</p>
            <p className="text-2xl font-bold text-purple-700">
              {severityMetrics.critical}
            </p>
          </Card>
          <Card className="border-l-4 border-l-red-500 p-4">
            <p className="text-xs font-medium text-gray-600">Alto</p>
            <p className="text-2xl font-bold text-red-700">
              {severityMetrics.high}
            </p>
          </Card>
          <Card className="border-l-4 border-l-amber-500 p-4">
            <p className="text-xs font-medium text-gray-600">Medio</p>
            <p className="text-2xl font-bold text-amber-700">
              {severityMetrics.medium}
            </p>
          </Card>
          <Card className="border-l-4 border-l-slate-500 p-4">
            <p className="text-xs font-medium text-gray-600">Bajo</p>
            <p className="text-2xl font-bold text-slate-700">
              {severityMetrics.low}
            </p>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col items-end gap-4 md:flex-row">
            <div className="flex-1">
              <label
                htmlFor="incident-search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="incident-search"
                  type="text"
                  placeholder="Buscar por tipo, descripción o ID..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label
                htmlFor="incident-severity-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Severidad
              </label>
              <Select
                id="incident-severity-filter"
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as 'all' | IncidentSeverity)
                }
              >
                <option value="all">Todas</option>
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity === 'LOW'
                      ? 'Baja'
                      : severity === 'MEDIUM'
                        ? 'Media'
                        : severity === 'HIGH'
                          ? 'Alta'
                          : 'Crítica'}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full md:w-48">
              <label
                htmlFor="incident-status-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Estado
              </label>
              <Select
                id="incident-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | IncidentStatus)
                }
              >
                <option value="all">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {incidentStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>

            <Button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4" />
              Reportar Incidencia
            </Button>
          </div>
        </Card>

        {incidentsQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <EmptyState
            title="No hay incidencias para mostrar"
            description={
              hasFilters
                ? 'Ninguna incidencia coincide con los filtros aplicados.'
                : 'Todavía no se han reportado incidencias.'
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
                      onClick={() => setSelectedIncident(row.original)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageChange={pagination.setPageIndex}
              onPageSizeChange={pagination.setPageSize}
            />
          </Card>
        )}
      </div>

      {activeIncident ? (
        <IncidentDetailPanel
          incident={activeIncident}
          isUpdating={
            updateStatusMutation.isPending || assignMutation.isPending
          }
          onClose={() => setSelectedIncident(null)}
          onChangeStatus={() => setIsStatusOpen(true)}
          onAssignResponsible={() => setIsAssignOpen(true)}
        />
      ) : null}

      <CreateIncidentDialog
        open={isCreateOpen}
        isSubmitting={createIncidentMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {activeIncident ? (
        <>
          <UpdateIncidentStatusDialog
            open={isStatusOpen}
            isSubmitting={updateStatusMutation.isPending}
            currentStatus={activeIncident.status}
            onClose={() => setIsStatusOpen(false)}
            onSubmit={handleStatusSubmit}
          />

          <AssignResponsibleDialog
            open={isAssignOpen}
            isSubmitting={assignMutation.isPending}
            currentResponsibleId={activeIncident.responsibleUserId}
            onClose={() => setIsAssignOpen(false)}
            onSubmit={handleAssignSubmit}
          />
        </>
      ) : null}
    </div>
  );
}