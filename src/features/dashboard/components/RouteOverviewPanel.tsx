import { ArrowRight, ClipboardList, Route, Truck, UserRound } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ApiErrorState } from '@/components/shared';
import { Button, Card, Skeleton } from '@/components/ui';
import { useRouteOverview } from '../hooks';
import type { OrderSummary } from '../types';
import { formatDateTime, formatWeight } from '../utils/formatters';
import { DashboardDetailsPanel } from './DashboardDetailsPanel';
import { DashboardStatusBadge } from './DashboardStatusBadge';

type RouteOverviewPanelProps = {
  routeId: number;
  onClose: () => void;
  onOpenVehicle: (vehicleId: number) => void;
};

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
      <Skeleton className="h-44" />
    </div>
  );
}

function EmptyPanelSection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function RouteOrdersList({ orders, finishedOrderIds }: { orders: OrderSummary[]; finishedOrderIds: number[] }) {
  if (orders.length === 0) return <EmptyPanelSection message="Esta ruta no tiene ordenes disponibles." />;

  return (
    <div className="divide-y divide-slate-100">
      {orders.map((order) => (
        <div key={order.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">Orden #{order.id}</p>
              <DashboardStatusBadge value={finishedOrderIds.includes(order.id) ? 'COMPLETED' : order.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {order.city ?? 'Ciudad no registrada'}, {order.country ?? 'Pais no registrado'} ·{' '}
              {formatWeight(order.weightKg)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RouteOverviewPanel({ routeId, onClose, onOpenVehicle }: RouteOverviewPanelProps) {
  const routeQuery = useRouteOverview(routeId);
  const routeOverview = routeQuery.data;
  const isNotFound = isAxiosError(routeQuery.error) && routeQuery.error.response?.status === 404;

  return (
    <DashboardDetailsPanel title="Detalle de ruta" subtitle={`Ruta #${routeId}`} onClose={onClose}>
      {routeQuery.isLoading ? <PanelSkeleton /> : null}

      {routeQuery.isError ? (
        <ApiErrorState
          title={isNotFound ? 'Ruta no encontrada' : 'No se pudo cargar la ruta'}
          message={isNotFound ? 'La ruta seleccionada ya no existe o no esta disponible.' : undefined}
          onRetry={() => void routeQuery.refetch()}
        />
      ) : null}

      {routeOverview ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                <Route className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">
                    {routeOverview.route.title ?? `Ruta #${routeOverview.route.id}`}
                  </h3>
                  <DashboardStatusBadge value={routeOverview.route.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">Generado {formatDateTime(routeOverview.generatedAt)}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {routeOverview.finishedOrderIds.length}/{routeOverview.route.orderIds.length} ordenes finalizadas
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <UserRound className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                Conductor
              </div>
              {routeOverview.driver ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="font-medium text-slate-950">{routeOverview.driver.email ?? `Conductor #${routeOverview.driver.id}`}</p>
                  <p>Licencia: {routeOverview.driver.licenceNumber ?? '-'}</p>
                  <DashboardStatusBadge value={routeOverview.driver.status} />
                </div>
              ) : (
                <EmptyPanelSection message="Sin conductor asignado." />
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Truck className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
                Vehiculo
              </div>
              {routeOverview.vehicle ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-950">{routeOverview.vehicle.plateNumber ?? `Vehiculo #${routeOverview.vehicle.id}`}</p>
                  <p>Capacidad: {formatWeight(routeOverview.vehicle.capacityKg)}</p>
                  <DashboardStatusBadge value={routeOverview.vehicle.status} />
                  <Button variant="secondary" className="w-full" onClick={() => onOpenVehicle(routeOverview.vehicle!.id)}>
                    Ver salud del vehiculo
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <EmptyPanelSection message="Sin vehiculo asignado." />
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-950">Ordenes de la ruta</h3>
            <RouteOrdersList orders={routeOverview.orders} finishedOrderIds={routeOverview.finishedOrderIds} />
          </Card>
        </div>
      ) : null}
    </DashboardDetailsPanel>
  );
}
