import { ClipboardList, Play, RouteIcon, Truck, UserRound, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ApiErrorState } from '@/components/shared';
import { Button, Card, Skeleton } from '@/components/ui';
import { useRoute } from '../hooks';
import { RouteStatusBadge } from './RouteStatusBadge';

type RouteDetailsPanelProps = {
  routeId: string;
  driverLabel: string;
  vehicleLabel: string;
  isStarting: boolean;
  isMarkingDelivered?: boolean;
  onClose: () => void;
  onStartRoute: (routeId: string) => void;
  onMarkOrderDelivered: (routeId: string, orderId: string) => void;
};

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-40" />
    </div>
  );
}

export function RouteDetailsPanel({
  routeId,
  driverLabel,
  vehicleLabel,
  isStarting,
  isMarkingDelivered = false,
  onClose,
  onStartRoute,
  onMarkOrderDelivered,
}: RouteDetailsPanelProps) {
  const routeQuery = useRoute(routeId);
  const route = routeQuery.data;
  const isNotFound = isAxiosError(routeQuery.error) && routeQuery.error.response?.status === 404;
  const orderIds = route?.orderIds ?? [];
  const finishedOrderIds = route?.finishedOrderIds ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30">
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">Detalle de ruta</h2>
            <p className="mt-1 text-sm text-slate-500">Ruta #{routeId}</p>
          </div>
          <Button variant="ghost" className="h-9 w-9 shrink-0 px-0" aria-label="Cerrar panel" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {routeQuery.isLoading ? <PanelSkeleton /> : null}

          {routeQuery.isError ? (
            <ApiErrorState
              title={isNotFound ? 'Ruta no encontrada' : 'No se pudo cargar la ruta'}
              message={isNotFound ? 'La ruta seleccionada ya no existe o no esta disponible.' : undefined}
              onRetry={() => void routeQuery.refetch()}
            />
          ) : null}

          {route ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DFF6F1] text-[#0F766E]">
                    <RouteIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{route.title}</h3>
                      <RouteStatusBadge status={route.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {finishedOrderIds.length}/{orderIds.length} ordenes finalizadas
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    Conductor
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-950">{driverLabel}</p>
                </div>
                <div>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    Vehiculo
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-950">{vehicleLabel}</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <ClipboardList className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                  Ordenes
                </div>
                {orderIds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Esta ruta no tiene ordenes asociadas.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {orderIds.map((orderId) => {
                      const isFinished = finishedOrderIds.includes(orderId);

                      return (
                        <div key={orderId} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="font-medium text-slate-950">Orden #{orderId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">{isFinished ? 'Entregada' : 'Pendiente'}</span>
                            {isFinished ? null : (
                              <Button
                                variant="secondary"
                                className="h-8 px-2 text-xs"
                                disabled={isMarkingDelivered}
                                onClick={() => onMarkOrderDelivered(route.id, orderId)}
                              >
                                Marcar entregada
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Button
                className="w-full"
                disabled={route.status !== 'PLANNED' || isStarting}
                onClick={() => onStartRoute(route.id)}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Iniciar ruta
              </Button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
