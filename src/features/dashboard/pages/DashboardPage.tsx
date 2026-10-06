import { AlertCircle, ClipboardList, RefreshCw, Route, Truck, Users, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button, Card, Skeleton } from '@/components/ui';
import { ApiErrorState } from '@/components/shared';
import { cn } from '@/utils';
import {
  DashboardKpiCard,
  DashboardStatusBadge,
  DashboardStatusChart,
  RouteOverviewPanel,
  VehicleHealthPanel,
} from '../components';
import { useDashboardOperations } from '../hooks';
import type { IncidentSummary, MaintenanceOrderSummary, OrderSummary, RouteSummary } from '../types';
import { formatCurrency, formatDateTime, formatWeight } from '../utils/formatters';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72" />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-4 text-sm font-semibold text-slate-950">{title}</h2>
      {empty ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
          No hay informacion disponible.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">{children}</div>
      )}
    </Card>
  );
}

function ActiveRoutesList({ routes, onSelectRoute }: { routes: RouteSummary[]; onSelectRoute: (routeId: number) => void }) {
  return (
    <SectionCard title="Rutas activas" empty={routes.length === 0}>
      {routes.map((route) => (
        <button
          key={route.id}
          type="button"
          className="flex w-full gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-slate-50"
          onClick={() => onSelectRoute(route.id)}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
            <Route className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{route.title ?? `Ruta #${route.id}`}</p>
              <DashboardStatusBadge value={route.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Vehiculo #{route.vehicleId ?? '-'} · Conductor #{route.driverId ?? '-'} ·{' '}
              {route.finishedOrderIds.length}/{route.orderIds.length} ordenes finalizadas
            </p>
          </div>
        </button>
      ))}
    </SectionCard>
  );
}

function RecentOrdersList({ orders }: { orders: OrderSummary[] }) {
  return (
    <SectionCard title="Ordenes recientes" empty={orders.length === 0}>
      {orders.map((order) => (
        <div key={order.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">Orden #{order.id}</p>
              <DashboardStatusBadge value={order.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {order.city ?? 'Ciudad no registrada'}, {order.country ?? 'Pais no registrado'} ·{' '}
              {formatWeight(order.weightKg)}
            </p>
          </div>
        </div>
      ))}
    </SectionCard>
  );
}

function OpenIncidentsList({ incidents }: { incidents: IncidentSummary[] }) {
  return (
    <SectionCard title="Incidentes abiertos" empty={incidents.length === 0}>
      {incidents.map((incident) => (
        <div key={incident.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#EF4444]">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{incident.type ?? `Incidente #${incident.id}`}</p>
              <DashboardStatusBadge value={incident.status} />
              <DashboardStatusBadge value={incident.severity} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Reportado {formatDateTime(incident.reportedAt)} · Responsable #{incident.responsibleUserId ?? '-'}
            </p>
          </div>
        </div>
      ))}
    </SectionCard>
  );
}

function OpenMaintenanceList({ orders }: { orders: MaintenanceOrderSummary[] }) {
  return (
    <SectionCard title="Mantenimiento abierto" empty={orders.length === 0}>
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
              Vehiculo #{order.vehicleId ?? '-'} · Tecnico #{order.technicianId ?? '-'} ·{' '}
              {formatCurrency(order.totalCostAmount, order.totalCostCurrency)}
            </p>
          </div>
        </div>
      ))}
    </SectionCard>
  );
}

export function DashboardPage() {
  const dashboardQuery = useDashboardOperations();
  const [selectedRouteId, setSelectedRouteId] = useState<number>();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>();
  const data = dashboardQuery.data;

  const closeDetailsPanel = () => {
    setSelectedRouteId(undefined);
    setSelectedVehicleId(undefined);
  };

  const selectRoute = (routeId: number) => {
    setSelectedRouteId(routeId);
    setSelectedVehicleId(undefined);
  };

  if (dashboardQuery.isLoading) return <DashboardSkeleton />;

  if (dashboardQuery.isError || !data) {
    return <ApiErrorState onRetry={() => void dashboardQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Dashboard operacional</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generado {formatDateTime(data.generatedAt)}
            {dashboardQuery.isFetching ? ' · Actualizando...' : ''}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void dashboardQuery.refetch()}
          disabled={dashboardQuery.isFetching}
          className="w-full md:w-auto"
        >
          <RefreshCw className={cn('h-4 w-4', dashboardQuery.isFetching && 'animate-spin')} aria-hidden="true" />
          Refrescar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DashboardKpiCard title="Vehiculos" value={data.fleet.totalVehicles} detail="Unidades registradas" icon={Truck} tone="teal" />
        <DashboardKpiCard title="Conductores" value={data.fleet.totalDrivers} detail="Conductores registrados" icon={Users} tone="blue" />
        <DashboardKpiCard title="Rutas activas" value={data.fleet.activeRoutes.length} detail={`${data.fleet.totalRoutes} rutas totales`} icon={Route} tone="blue" />
        <DashboardKpiCard title="Ordenes" value={data.deliveries.totalOrders} detail="Ordenes agregadas" icon={ClipboardList} tone="teal" />
        <DashboardKpiCard title="Incidentes" value={data.incidents.openIncidents.length} detail={`${data.incidents.totalIncidents} incidentes totales`} icon={AlertCircle} tone="red" />
        <DashboardKpiCard title="Mantenimiento" value={data.maintenance.totalOpenWork} detail="Trabajos abiertos" icon={Wrench} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardStatusChart title="Vehiculos por estado" data={data.fleet.vehiclesByStatus} emptyMessage="Sin estados de vehiculos." />
        <DashboardStatusChart title="Rutas por estado" data={data.fleet.routesByStatus} emptyMessage="Sin estados de rutas." color="#2563EB" />
        <DashboardStatusChart title="Ordenes por estado" data={data.deliveries.ordersByStatus} emptyMessage="Sin estados de ordenes." />
        <DashboardStatusChart title="Incidentes por severidad" data={data.incidents.incidentsBySeverity} emptyMessage="Sin severidades de incidentes." color="#EF4444" />
        <DashboardStatusChart title="Mantenimiento por estado" data={data.maintenance.ordersByStatus} emptyMessage="Sin estados de mantenimiento." color="#D97706" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActiveRoutesList routes={data.fleet.activeRoutes} onSelectRoute={selectRoute} />
        <RecentOrdersList orders={data.deliveries.recentOrders} />
        <OpenIncidentsList incidents={data.incidents.openIncidents} />
        <OpenMaintenanceList orders={data.maintenance.openOrders} />
      </div>

      {selectedRouteId !== undefined && selectedVehicleId === undefined ? (
        <RouteOverviewPanel routeId={selectedRouteId} onClose={closeDetailsPanel} onOpenVehicle={setSelectedVehicleId} />
      ) : null}

      {selectedVehicleId !== undefined ? <VehicleHealthPanel vehicleId={selectedVehicleId} onClose={closeDetailsPanel} /> : null}
    </div>
  );
}
