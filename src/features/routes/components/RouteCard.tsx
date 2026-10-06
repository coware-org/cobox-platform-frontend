import { ClipboardList, Play, RouteIcon, Truck, UserRound } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Route } from '../types';
import { RouteStatusBadge } from './RouteStatusBadge';

type RouteCardProps = {
  route: Route;
  driverLabel: string;
  vehicleLabel: string;
  onAssign: (route: Route) => void;
  onStartRoute: (routeId: string) => void;
  onViewDetails: (routeId: string) => void;
  isStarting?: boolean;
};

/**
 * La tarjeta expone solo dos acciones. Ordenes, vehiculo y conductor se
 * configuran juntos desde el dialogo de asignacion.
 */
export function RouteCard({
  route,
  driverLabel,
  vehicleLabel,
  onAssign,
  onStartRoute,
  onViewDetails,
  isStarting = false,
}: RouteCardProps) {
  const orderIds = route.orderIds ?? [];
  const finishedOrderIds = route.finishedOrderIds ?? [];

  return (
    <Card className="flex flex-col justify-between p-5 transition-colors hover:border-slate-300">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DFF6F1] text-[#0F766E]">
              <RouteIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onViewDetails(route.id)}
                className="block max-w-full text-left hover:underline"
                aria-label={`Ver detalle de la ruta ${route.title}`}
              >
                <h2 className="truncate font-bold text-slate-900">{route.title}</h2>
              </button>
              <p className="mt-1 text-xs text-[#64748B]">
                {finishedOrderIds.length}/{orderIds.length} ordenes finalizadas
              </p>
            </div>
          </div>
          <RouteStatusBadge status={route.status} />
        </div>

        <div className="space-y-2 text-xs text-[#64748B]">
          <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] pb-1.5">
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Conductor
            </span>
            <span className="truncate font-semibold text-slate-800">{driverLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] pb-1.5">
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              Vehiculo
            </span>
            <span className="truncate font-semibold text-slate-800">{vehicleLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              Ordenes
            </span>
            <span className="font-semibold text-slate-800">{orderIds.length}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#E2E8F0] pt-3">
        <Button
          className="h-9 text-xs"
          disabled={route.status === 'COMPLETED'}
          onClick={() => onAssign(route)}
        >
          Asignar
        </Button>
        <Button
          variant="secondary"
          className="h-9 text-xs"
          disabled={route.status !== 'PLANNED' || isStarting}
          onClick={() => onStartRoute(route.id)}
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Iniciar
        </Button>
      </div>
    </Card>
  );
}
