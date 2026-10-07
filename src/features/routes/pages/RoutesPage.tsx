import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ApiErrorState } from '@/components/shared';
import { Button, Card, Input, Select, Skeleton, useToast } from '@/components/ui';
import { useDrivers } from '@/features/drivers';
import { useOrders } from '@/features/orders/hooks';
import { useVehicles } from '@/features/vehicles';
import { CreateRouteDialog, RouteAssignmentDialog, RouteCard, RouteDetailsPanel } from '../components';
import {
  useAddDeliveredOrderToRoute,
  useAssignRoutePlan,
  useCreateRoute,
  useMarkRouteInProgress,
  useRoutes,
} from '../hooks';
import type { CreateRoutePayload, Route, RouteStatus } from '../types';

const statusOptions: { value: 'all' | RouteStatus; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PLANNED', label: 'Planificadas' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completadas' },
];

export function RoutesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RouteStatus>('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailsRouteId, setDetailsRouteId] = useState<string>();
  const [assignmentRoute, setAssignmentRoute] = useState<Route | null>(null);

  const routesQuery = useRoutes();
  const driversQuery = useDrivers();
  const vehiclesQuery = useVehicles();
  const ordersQuery = useOrders();

  const createRoute = useCreateRoute();
  const markInProgress = useMarkRouteInProgress();
  const addDeliveredOrder = useAddDeliveredOrderToRoute();
  const assignment = useAssignRoutePlan();
  const { toast } = useToast();

  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const selectedRoute = useMemo(() => routes.find((route) => route.id === detailsRouteId), [routes, detailsRouteId]);

  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);

  const filteredRoutes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return routes.filter((route) => {
      const driver = route.driverId ? driverById.get(route.driverId) : null;
      const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : null;
      const matchesSearch =
        !term ||
        route.id.toLowerCase().includes(term) ||
        route.title.toLowerCase().includes(term) ||
        driver?.email.toLowerCase().includes(term) ||
        driver?.licenceNumber.toLowerCase().includes(term) ||
        vehicle?.plateNumber.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
      const matchesDriver = driverFilter === 'all' || route.driverId === driverFilter;
      const matchesVehicle = vehicleFilter === 'all' || route.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesDriver && matchesVehicle;
    });
  }, [driverById, driverFilter, routes, search, statusFilter, vehicleById, vehicleFilter]);

  const driverLabel = (route: Route) => {
    const driver = route.driverId ? driverById.get(route.driverId) : null;
    return driver ? `${driver.email} - ${driver.licenceNumber}` : route.driverId ? `Conductor #${route.driverId}` : 'Sin asignar';
  };

  const vehicleLabel = (route: Route) => {
    const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : null;
    return vehicle ? vehicle.plateNumber : route.vehicleId ? `Vehiculo #${route.vehicleId}` : 'Sin asignar';
  };

  // Crear la ruta y configurarla son pasos separados, pero la ruta recien creada
  // no sirve de nada vacia: en cuanto el backend la devuelve se abre la
  // asignacion para que quede lista para despachar sin cambiar de pantalla.
  const handleCreateRoute = (payload: CreateRoutePayload) => {
    createRoute.mutate(payload, {
      onSuccess: (createdRoute) => {
        setIsCreateOpen(false);
        toast({ title: 'Ruta creada correctamente', type: 'success' });
        setAssignmentRoute(createdRoute);
      },
      onError: () => toast({ title: 'No se pudo crear la ruta', type: 'error' }),
    });
  };

  const handleStartRoute = (routeId: string) => {
    markInProgress.mutate(routeId, {
      onSuccess: () => toast({ title: 'Ruta iniciada correctamente', type: 'success' }),
      onError: () => toast({ title: 'No se pudo iniciar la ruta', type: 'error' }),
    });
  };

  const handleMarkOrderDelivered = (routeId: string, orderId: string) => {
    addDeliveredOrder.mutate(
      { routeId, payload: { orderId } },
      {
        onSuccess: () => toast({ title: 'Orden registrada como entregada', type: 'success' }),
        onError: () => toast({ title: 'No se pudo registrar la orden entregada', type: 'error' }),
      },
    );
  };

  const handleSubmitAssignment = (selection: Parameters<typeof assignment.submit>[0]['selection']) => {
    if (!assignmentRoute) return;

    void assignment
      .submit({ route: assignmentRoute, selection, orders, title: assignmentRoute.title })
      .then((result) => {
        if (result.outcome === 'SUCCEEDED') setAssignmentRoute(null);
      });
  };

  const routeWarnings = assignmentRoute ? (assignment.warningsByRoute[assignmentRoute.id] ?? []) : [];
  const routeFailure = assignmentRoute && assignment.lastFailure?.routeId === assignmentRoute.id ? assignment.lastFailure : null;
  const isAssignmentsLoading = ordersQuery.isLoading || driversQuery.isLoading || vehiclesQuery.isLoading;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gestion de rutas</h1>
          <p className="mt-2 text-sm text-[#64748B]">Administra rutas, asignaciones y avance de entregas.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear ruta
        </Button>
      </div>

      <Card className="grid gap-4 p-5 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ruta, conductor o vehiculo..."
            className="pl-9"
          />
        </div>
        <Select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
          <option value="all">Todos los conductores</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.email}
            </option>
          ))}
        </Select>
        <Select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}>
          <option value="all">Todos los vehiculos</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | RouteStatus)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routesQuery.isError ? (
          <div className="md:col-span-2 xl:col-span-3">
            <ApiErrorState onRetry={() => void routesQuery.refetch()} />
          </div>
        ) : routesQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)
        ) : (
          filteredRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              driverLabel={driverLabel(route)}
              vehicleLabel={vehicleLabel(route)}
              onAssign={setAssignmentRoute}
              onViewDetails={setDetailsRouteId}
            />
          ))
        )}
      </div>

      {!routesQuery.isLoading && !routesQuery.isError && filteredRoutes.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#64748B]">No hay rutas para mostrar.</Card>
      ) : null}

      <CreateRouteDialog
        open={isCreateOpen}
        isSubmitting={createRoute.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateRoute}
      />

      <RouteAssignmentDialog
        open={assignmentRoute !== null}
        route={assignmentRoute}
        routes={routes}
        lockedOrderId={null}
        vehicles={vehicles}
        drivers={drivers}
        orders={orders}
        isSubmitting={assignment.isPending}
        isLoading={isAssignmentsLoading}
        warnings={routeWarnings}
        failure={routeFailure}
        appliedOrderIds={assignment.appliedOrderIds}
        onSelectedRouteChange={() => undefined}
        onSelectedVehicleChange={() => undefined}
        onSelectedDriverChange={() => undefined}
        onDismissWarnings={() => {
          if (assignmentRoute) assignment.dismissWarnings(assignmentRoute.id);
        }}
        onClose={() => setAssignmentRoute(null)}
        onSubmit={handleSubmitAssignment}
      />

      {detailsRouteId !== undefined ? (
        <RouteDetailsPanel
          routeId={detailsRouteId}
          driverLabel={selectedRoute ? driverLabel(selectedRoute) : 'Sin asignar'}
          vehicleLabel={selectedRoute ? vehicleLabel(selectedRoute) : 'Sin asignar'}
          isStarting={markInProgress.isPending}
          isMarkingDelivered={addDeliveredOrder.isPending}
          onClose={() => setDetailsRouteId(undefined)}
          onStartRoute={handleStartRoute}
          onMarkOrderDelivered={handleMarkOrderDelivered}
        />
      ) : null}
    </section>
  );
}
