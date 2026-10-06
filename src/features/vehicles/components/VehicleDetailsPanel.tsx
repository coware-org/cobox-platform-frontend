import { useState } from 'react';
import { Package, Truck, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ApiErrorState } from '@/components/shared';
import { Button, Card, Skeleton } from '@/components/ui';
import { useVehicle, useVehicleHealth } from '../hooks';
import type { Vehicle, VehicleHealthOrderSummary, VehicleHealthScheduleSummary } from '../types';
import { VehicleStatusBadge } from './VehicleStatusBadge';

type VehicleDetailsPanelProps = {
  vehicleId: string;
  onClose: () => void;
  onChangeStatus: (vehicle: Vehicle) => void;
};

function formatCapacity(value: number) {
  return `${value.toLocaleString('es-PE')} kg`;
}

function priorityTone(priority?: string | null): string {
  return priority === 'HIGH'
    ? 'text-[#EF4444]'
    : priority === 'MEDIUM'
      ? 'text-amber-700'
      : 'text-slate-600';
}

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-36" />
    </div>
  );
}

function OpenOrderRow({ order }: { order: VehicleHealthOrderSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm font-medium text-slate-950">{order.maintenanceType ?? `Orden #${order.id}`}</span>
      {order.priority ? (
        <span className={`text-xs font-semibold uppercase ${priorityTone(order.priority)}`}>{order.priority}</span>
      ) : null}
      {order.status ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{order.status}</span>
      ) : null}
      {order.technicianId !== null ? (
        <span className="text-xs text-slate-500">Tecnico #{order.technicianId}</span>
      ) : null}
    </div>
  );
}

function ScheduleRow({ schedule }: { schedule: VehicleHealthScheduleSummary }) {
  const [now] = useState(() => Date.now());
  const next = schedule.nextEvaluationAt ? new Date(schedule.nextEvaluationAt) : null;
  const isOverdue = next ? next.getTime() < now : false;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm font-medium text-slate-950">
        {schedule.nextEvaluationAt ? new Date(schedule.nextEvaluationAt).toLocaleDateString('es-PE') : 'Sin fecha'}
      </span>
      {next ? (
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            isOverdue ? 'bg-red-50 text-[#EF4444]' : 'bg-[#DFF6F1] text-[#0F766E]'
          }`}
        >
          {isOverdue ? 'Vencido' : 'Programado'}
        </span>
      ) : null}
      {schedule.status ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{schedule.status}</span>
      ) : null}
    </div>
  );
}

function HistoryRow({ order }: { order: VehicleHealthOrderSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm font-medium text-slate-950">{order.maintenanceType ?? `Orden #${order.id}`}</span>
      {order.status ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{order.status}</span>
      ) : null}
      {order.closingOdometer !== null ? (
        <span className="text-xs text-slate-500">Odometro {order.closingOdometer.toLocaleString('es-PE')} km</span>
      ) : null}
    </div>
  );
}

export function VehicleDetailsPanel({ vehicleId, onClose, onChangeStatus }: VehicleDetailsPanelProps) {
  const vehicleQuery = useVehicle(vehicleId);
  const healthQuery = useVehicleHealth(vehicleId);
  const vehicle = vehicleQuery.data;
  const isNotFound = isAxiosError(vehicleQuery.error) && vehicleQuery.error.response?.status === 404;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30">
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">Detalle de vehiculo</h2>
            <p className="mt-1 text-sm text-slate-500">Vehiculo #{vehicleId}</p>
          </div>
          <Button variant="ghost" className="h-9 w-9 shrink-0 px-0" aria-label="Cerrar panel" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {vehicleQuery.isLoading ? <PanelSkeleton /> : null}

          {vehicleQuery.isError ? (
            <ApiErrorState
              title={isNotFound ? 'Vehiculo no encontrado' : 'No se pudo cargar el vehiculo'}
              message={isNotFound ? 'El vehiculo seleccionado ya no existe o no esta disponible.' : undefined}
              onRetry={() => void vehicleQuery.refetch()}
            />
          ) : null}

          {vehicle ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DFF6F1] text-[#0F766E]">
                    <Truck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{vehicle.plateNumber}</h3>
                      <VehicleStatusBadge status={vehicle.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Capacidad: {formatCapacity(vehicle.capacityKg)}</p>
                  </div>
                </div>
              </Card>

              <Card className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    Placa
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-950">{vehicle.plateNumber}</p>
                </div>
                <div>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <Package className="h-4 w-4" aria-hidden="true" />
                    Capacidad
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-950">{formatCapacity(vehicle.capacityKg)}</p>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-950">Salud del vehiculo</h3>
                <div className="mt-3">
                  {healthQuery.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : healthQuery.isError ? (
                    <p className="text-sm text-[#EF4444]">No se pudo cargar la salud del vehiculo</p>
                  ) : healthQuery.data ? (
                    <div className="space-y-4">
                      <div>
                        <p className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                          <span>Mantenimientos abiertos</span>
                          <span>{healthQuery.data.openMaintenanceOrders.length}</span>
                        </p>
                        {healthQuery.data.openMaintenanceOrders.length > 0 ? (
                          <div className="mt-1">
                            {healthQuery.data.openMaintenanceOrders.map((order) => (
                              <OpenOrderRow key={order.id} order={order} />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Proximo mantenimiento</p>
                        {healthQuery.data.maintenanceSchedule && healthQuery.data.maintenanceSchedule.length > 0 ? (
                          <div className="mt-1">
                            {healthQuery.data.maintenanceSchedule.map((schedule) => (
                              <ScheduleRow key={schedule.id} schedule={schedule} />
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-slate-500">Sin programacion registrada</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Historial reciente</p>
                        {healthQuery.data.maintenanceHistory.slice(0, 3).length > 0 ? (
                          <div className="mt-1">
                            {healthQuery.data.maintenanceHistory.slice(0, 3).map((order) => (
                              <HistoryRow key={order.id} order={order} />
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-slate-500">Sin historial registrado</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Button className="w-full" disabled={vehicle.status === 'ON_ROUTE'} onClick={() => onChangeStatus(vehicle)}>
                Cambiar estado
              </Button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}