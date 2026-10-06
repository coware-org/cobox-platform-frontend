import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Eye,
  Plus,
  Search,
  Truck,
  User,
  Clock,
  CheckCircle2,
  Package,
  X,
  MapPin,
  RouteIcon,
} from 'lucide-react';
import { Badge, Button, Card, Input, Skeleton, useToast } from '@/components/ui';
import { ApiErrorState } from '@/components/shared';
import { RouteAssignmentDialog } from '@/features/routes/components';
import { useAssignRoutePlan, useRoutes } from '@/features/routes/hooks';
import type { RouteAssignmentSelection } from '@/features/routes/services';
import { useDrivers } from '@/features/drivers/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import {
  useOrders,
  useCreateOrder,
  useMarkOrderReady,
  useMarkOrderInTransit,
  useMarkOrderCompleted,
} from '../hooks';
import type { Order, OrderAssignment, OrderStatus } from '../types';
import {
  OrderTraceability,
  OrderFormDialog,
  CompleteOrderDialog,
} from '../components';
import { isAxiosError } from 'axios';

const columnHelper = createColumnHelper<Order>();

const statusLabels: Record<OrderStatus, string> = {
  RECEIVED: 'Recibido',
  PROCESSING: 'Procesando',
  READY_FOR_DISPATCH: 'Listo para despacho',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusClasses: Record<OrderStatus, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700 border border-slate-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  READY_FOR_DISPATCH: 'bg-blue-50 text-blue-700 border border-blue-200',
  IN_TRANSIT: 'bg-amber-50 text-[#F59E0B] border border-amber-200',
  DELIVERED: 'bg-[#DFF6F1] text-[#0F766E] border border-teal-200',
  CANCELLED: 'bg-red-50 text-[#DC2626] border border-red-200',
};

export function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isAssignRouteOpen, setIsAssignRouteOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { toast } = useToast();
  const ordersQuery = useOrders();
  const routesQuery = useRoutes();
  const driversQuery = useDrivers();
  const vehiclesQuery = useVehicles();

  const createOrderMutation = useCreateOrder();
  const markReadyMutation = useMarkOrderReady();
  const markInTransitMutation = useMarkOrderInTransit();
  const markCompletedMutation = useMarkOrderCompleted();
  const assignment = useAssignRoutePlan();

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);

  // El detalle se deriva de la lista viva para que lista y detalle muestren
  // siempre el mismo conductor/vehículo sin recargar la página.
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(term) ||
        order.addressLine.toLowerCase().includes(term) ||
        order.city.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const metrics = useMemo(() => {
    return {
      total: orders.length,
      ready: orders.filter((o) => o.status === 'READY_FOR_DISPATCH').length,
      transit: orders.filter((o) => o.status === 'IN_TRANSIT').length,
      delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    };
  }, [orders]);

  const handleCreateOrder = (payload: any) => {
    createOrderMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        toast({ title: 'Orden creada correctamente', type: 'success' });
      },
      onError: (error) => {
        const msg = isAxiosError(error)
          ? (error.response?.data as { message?: string })?.message ?? 'Error de validación del servidor'
          : 'Error al crear la orden';
        toast({ title: msg, type: 'error' });
      },
    });
  };

  const handleMarkReady = (orderId: string) => {
    markReadyMutation.mutate(orderId, {
      onSuccess: () => {
        toast({ title: 'Orden lista para despacho', type: 'success' });
      },
      onError: (err) => {
        const msg = isAxiosError(err)
          ? (err.response?.data as any)?.message ?? 'Error al actualizar estado'
          : 'Error en la petición';
        toast({ title: msg, type: 'error' });
      },
    });
  };

  const handleMarkInTransit = (orderId: string) => {
    markInTransitMutation.mutate(orderId, {
      onSuccess: () => {
        toast({ title: 'Orden iniciada en tránsito', type: 'success' });
      },
      onError: (err) => {
        const msg = isAxiosError(err)
          ? (err.response?.data as any)?.message ?? 'Error al iniciar tránsito'
          : 'Error en la petición';
        toast({ title: msg, type: 'error' });
      },
    });
  };

  const handleCompleteSubmit = (evidencePayload: any) => {
    if (!selectedOrder) return;
    markCompletedMutation.mutate(
      { orderId: selectedOrder.id, payload: evidencePayload },
      {
        onSuccess: () => {
          setIsCompleteOpen(false);
          toast({ title: 'Entrega registrada exitosamente', type: 'success' });
        },
        onError: (err) => {
          const msg = isAxiosError(err)
            ? (err.response?.data as any)?.message ?? 'Error al finalizar entrega'
            : 'Error en la petición';
          toast({ title: msg, type: 'error' });
        },
      }
    );
  };

  const openAssignRoute = () => {
    setSelectedRouteId('');
    setIsAssignRouteOpen(true);
  };

  // El dialogo entrega la seleccion completa; aqui solo se resuelve la ruta
  // elegida y se delega la ejecucion al mismo plan usado desde Gestion de rutas.
  const handleAssignRoute = (selection: RouteAssignmentSelection) => {
    if (!selectedOrder) return;

    const targetRoute = routes.find((route) => route.id === selectedRouteId);
    if (!targetRoute) {
      toast({ title: 'Selecciona una ruta valida', type: 'error' });
      return;
    }

    void assignment.submit({ route: targetRoute, selection, orders, title: targetRoute.title }).then((result) => {
      if (result.outcome === 'SUCCEEDED') {
        setIsAssignRouteOpen(false);
        setSelectedRouteId('');
      }
    });
  };

  const assignmentWarnings = selectedRouteId ? (assignment.warningsByRoute[selectedRouteId] ?? []) : [];
  const assignmentFailure =
    selectedRouteId && assignment.lastFailure?.routeId === selectedRouteId ? assignment.lastFailure : null;

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID / Código',
        cell: (info) => <span className="font-semibold text-slate-900">#{info.getValue()}</span>,
      }),
      columnHelper.accessor('addressLine', {
        header: 'Dirección de Destino',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-slate-800 font-medium">{info.getValue()}</span>
            <span className="text-xs text-[#64748B]">{info.row.original.city}, {info.row.original.country}</span>
          </div>
        ),
      }),
      columnHelper.accessor('weightKg', {
        header: 'Peso (Kg)',
        cell: (info) => <span className="text-slate-600 font-medium">{info.getValue()} kg</span>,
      }),
      columnHelper.display({
        id: 'driverVehicle',
        header: 'Conductor / Vehículo',
        cell: ({ row }) => <DriverVehicleCell assignment={row.original.assignment} />,
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const status = info.getValue();
          return <Badge className={statusClasses[status]}>{statusLabels[status]}</Badge>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-500"
              onClick={() => setSelectedOrderId(row.original.id)}
              aria-label="Ver detalle"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gestión de Órdenes</h1>
        <p className="mt-2 text-sm text-[#64748B]">Control del ciclo de vida y trazabilidad de los servicios de entrega.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Órdenes" value={metrics.total} icon={<Package className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Listas para Despacho" value={metrics.ready} icon={<Clock className="h-5 w-5" />} tone="indigo" />
        <MetricCard title="En Tránsito" value={metrics.transit} icon={<Truck className="h-5 w-5" />} tone="amber" />
        <MetricCard title="Entregadas con Éxito" value={metrics.delivered} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
      </div>

      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID o dirección..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as any)}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="RECEIVED">Recibido</option>
            <option value="PROCESSING">Procesando</option>
            <option value="READY_FOR_DISPATCH">Listo para despacho</option>
            <option value="IN_TRANSIT">En tránsito</option>
            <option value="DELIVERED">Entregado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Crear Orden
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={`overflow-hidden lg:col-span-2 ${selectedOrder ? '' : 'lg:col-span-3'}`}>
          {ordersQuery.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : ordersQuery.isError ? (
            <div className="p-5">
              <ApiErrorState onRetry={() => void ordersQuery.refetch()} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#64748B]">
              No se encontraron servicios en el período seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="border-b border-[#E2E8F0] px-6 py-4">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50 transition-colors">
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
          )}
        </Card>

        {selectedOrder && (
          <Card className="p-5 flex flex-col justify-between h-fit space-y-6">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Detalle de la Orden #{selectedOrder.id}</h2>
                <span className="text-xs text-[#64748B]">Cliente ID: {selectedOrder.clientId}</span>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedOrderId(null)}
                aria-label="Cerrar detalle"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">Destino</span>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-[#64748B] mt-0.5" />
                  <span className="text-sm text-slate-800">
                    {selectedOrder.addressLine}, {selectedOrder.city}, {selectedOrder.postalCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">Peso</span>
                  <span className="text-sm text-slate-800 font-medium">{selectedOrder.weightKg} kg</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">Estado Actual</span>
                  <Badge className={`mt-1 ${statusClasses[selectedOrder.status]}`}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">Instrucciones / Notas</span>
                <p className="text-sm text-slate-700 mt-1 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedOrder.notes || 'Sin instrucciones adicionales.'}
                </p>
              </div>

              <div className="border-t border-[#E2E8F0] pt-4">
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">Asignación Logística</span>
                <div className="space-y-2 mt-2">
                  <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <RouteIcon className="h-4 w-4 text-[#64748B] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium">Ruta:</span>
                      <span> {getRouteLabel(selectedOrder.assignment)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <User className="h-4 w-4 text-[#64748B] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium">Conductor:</span>
                      <span> {selectedOrder.assignment.driverName ?? 'Sin asignar'}</span>
                      {getDriverMeta(selectedOrder.assignment) ? (
                        <span className="block text-xs text-[#64748B]">{getDriverMeta(selectedOrder.assignment)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <Truck className="h-4 w-4 text-[#64748B] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium">Vehículo:</span>
                      <span> {selectedOrder.assignment.vehiclePlate ?? 'Sin asignar'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-4">
                <OrderTraceability order={selectedOrder} />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
              <Button
                className="w-full"
                variant={selectedOrder.assignment.routeId ? 'secondary' : 'primary'}
                onClick={openAssignRoute}
              >
                {selectedOrder.assignment.routeId ? 'Cambiar Ruta' : 'Asignar Ruta'}
              </Button>
              {selectedOrder.status === 'RECEIVED' && (
                <Button
                  className="w-full"
                  onClick={() => handleMarkReady(selectedOrder.id)}
                  disabled={markReadyMutation.isPending}
                >
                  Marcar como Listo para Despacho
                </Button>
              )}
              {selectedOrder.status === 'READY_FOR_DISPATCH' && (
                <Button
                  className="w-full"
                  onClick={() => handleMarkInTransit(selectedOrder.id)}
                  disabled={markInTransitMutation.isPending}
                >
                  Iniciar Tránsito
                </Button>
              )}
              {selectedOrder.status === 'IN_TRANSIT' && (
                <Button className="w-full" onClick={() => setIsCompleteOpen(true)}>
                  Confirmar y Entregar Orden
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <OrderFormDialog
        open={isCreateOpen}
        isSubmitting={createOrderMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateOrder}
      />

      {selectedOrder && (
        <CompleteOrderDialog
          open={isCompleteOpen}
          assignedRouteId={selectedOrder.assignment.routeId ?? undefined}
          routes={routes}
          isSubmitting={markCompletedMutation.isPending}
          onClose={() => setIsCompleteOpen(false)}
          onSubmit={handleCompleteSubmit}
        />
      )}

      {selectedOrder && (
        <RouteAssignmentDialog
          open={isAssignRouteOpen}
          route={null}
          routes={routes}
          lockedOrderId={selectedOrder.id}
          vehicles={vehicles}
          drivers={drivers}
          orders={orders}
          isSubmitting={assignment.isPending}
          isLoading={routesQuery.isLoading || vehiclesQuery.isLoading || driversQuery.isLoading}
          warnings={assignmentWarnings}
          failure={assignmentFailure}
          appliedOrderIds={assignment.appliedOrderIds}
          onSelectedRouteChange={setSelectedRouteId}
          onSelectedVehicleChange={() => undefined}
          onSelectedDriverChange={() => undefined}
          onDismissWarnings={() => {
            if (selectedRouteId) assignment.dismissWarnings(selectedRouteId);
          }}
          onClose={() => setIsAssignRouteOpen(false)}
          onSubmit={handleAssignRoute}
        />
      )}
    </section>
  );
}

function getRouteLabel(assignment: OrderAssignment): string {
  if (!assignment.routeId) return 'Sin asignar';
  return `${assignment.routeTitle ?? `Ruta #${assignment.routeId}`} (#${assignment.routeId})`;
}

function getDriverMeta(assignment: OrderAssignment): string | null {
  const details = [
    assignment.driverLicenceNumber,
    assignment.driverEmail && assignment.driverEmail !== assignment.driverName ? assignment.driverEmail : null,
  ].filter((value): value is string => Boolean(value));

  return details.length > 0 ? details.join(' · ') : null;
}

function DriverVehicleCell({ assignment }: { assignment: OrderAssignment }) {
  if (!assignment.routeId) {
    return <span className="text-[#64748B] italic">Sin asignar</span>;
  }

  return (
    <div className="flex flex-col text-xs">
      <span className="font-medium text-slate-800">Conductor: {assignment.driverName ?? 'Sin asignar'}</span>
      <span className="text-[#64748B]">Vehículo: {assignment.vehiclePlate ?? 'Sin asignar'}</span>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'green' | 'amber' | 'blue' | 'indigo';
};

const metricToneClasses: Record<MetricCardProps['tone'], string> = {
  green: 'bg-[#DFF6F1] text-[#0F766E]',
  amber: 'bg-amber-50 text-[#F59E0B]',
  blue: 'bg-blue-50 text-[#3B82F6]',
  indigo: 'bg-indigo-50 text-indigo-600',
};

function MetricCard({ title, value, icon, tone }: MetricCardProps) {
  return (
    <Card className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm text-[#64748B]">{title}</p>
        <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${metricToneClasses[tone]}`}>{icon}</div>
    </Card>
  );
}
