import { ClipboardList, History, Truck, Wrench } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ApiErrorState } from '@/components/shared';
import { Card, Skeleton } from '@/components/ui';
import { useVehicleHealth } from '../hooks';
import type { MaintenanceOrderSummary } from '../types';
import { formatCurrency, formatDateTime, formatWeight } from '../utils/formatters';
import { DashboardDetailsPanel } from './DashboardDetailsPanel';
import { DashboardStatusBadge } from './DashboardStatusBadge';

type VehicleHealthPanelProps = {
  vehicleId: number;
  onClose: () => void;
};

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-44" />
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

function MaintenanceOrdersList({ orders }: { orders: MaintenanceOrderSummary[] }) {
  if (orders.length === 0) return <EmptyPanelSection message="No hay ordenes de mantenimiento para mostrar." />;

  return (
    <div className="divide-y divide-slate-100">
      {orders.map((order) => (
        <div key={order.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
            <Wrench className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{order.maintenanceType ?? `Orden #${order.id}`}</p>
              <DashboardStatusBadge value={order.status} />
              <DashboardStatusBadge value={order.priority} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Tecnico #{order.technicianId ?? '-'} · {formatCurrency(order.totalCostAmount, order.totalCostCurrency)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VehicleHealthPanel({ vehicleId, onClose }: VehicleHealthPanelProps) {
  const vehicleQuery = useVehicleHealth(vehicleId);
  const vehicleHealth = vehicleQuery.data;
  const isNotFound = isAxiosError(vehicleQuery.error) && vehicleQuery.error.response?.status === 404;

  return (
    <DashboardDetailsPanel title="Salud del vehiculo" subtitle={`Vehiculo #${vehicleId}`} onClose={onClose}>
      {vehicleQuery.isLoading ? <PanelSkeleton /> : null}

      {vehicleQuery.isError ? (
        <ApiErrorState
          title={isNotFound ? 'Vehiculo no encontrado' : 'No se pudo cargar el vehiculo'}
          message={isNotFound ? 'El vehiculo seleccionado ya no existe o no esta disponible.' : undefined}
          onRetry={() => void vehicleQuery.refetch()}
        />
      ) : null}

      {vehicleHealth ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">
                    {vehicleHealth.vehicle.plateNumber ?? `Vehiculo #${vehicleHealth.vehicle.id}`}
                  </h3>
                  <DashboardStatusBadge value={vehicleHealth.vehicle.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">Generado {formatDateTime(vehicleHealth.generatedAt)}</p>
                <p className="mt-3 text-sm text-slate-600">Capacidad: {formatWeight(vehicleHealth.vehicle.capacityKg)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <ClipboardList className="h-4 w-4 text-[#D97706]" aria-hidden="true" />
              Mantenimiento abierto
            </div>
            <MaintenanceOrdersList orders={vehicleHealth.openMaintenanceOrders} />
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <History className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              Historial de mantenimiento
            </div>
            <MaintenanceOrdersList orders={vehicleHealth.maintenanceHistory} />
          </Card>
        </div>
      ) : null}
    </DashboardDetailsPanel>
  );
}
