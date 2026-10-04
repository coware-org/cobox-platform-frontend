import { useMemo, useState } from 'react';

import {
  MapPinned,
  Play,
  RouteIcon,
  X,
  CheckCircle2,
  Clock,
  Navigation,
} from 'lucide-react';
import { Badge, Button, Card, Dialog, Select, Skeleton, useToast } from '@/components/ui';
import { ApiErrorState } from '@/components/shared';
import type { Route, RouteStatus } from '@/modules/fleet.types';
import { useDrivers } from '@/modules/drivers';
import { useVehicles } from '@/modules/vehicles';
import { useOrders } from '@/features/orders';
import { useAssignDriverToRoute, useAssignVehicleToRoute, useMarkRouteInProgress, useRoutes } from '../hooks';

const routeStatusLabels: Record<RouteStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
};

const routeStatusClasses: Record<RouteStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-blue-50 text-[#3B82F6] border border-blue-200',
  completed: 'bg-[#DFF6F1] text-[#0F766E] border border-teal-200',
};

export function RoutesPage() {
  const [vehicleRoute, setVehicleRoute] = useState<Route | null>(null);
  const [driverRoute, setDriverRoute] = useState<Route | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Filtros
  const [driverFilter, setDriverFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RouteStatus>('all');

  const routesQuery = useRoutes();
  const vehiclesQuery = useVehicles();
  const driversQuery = useDrivers();
  const ordersQuery = useOrders();

  const assignVehicle = useAssignVehicleToRoute();
  const assignDriver = useAssignDriverToRoute();
  const markInProgress = useMarkRouteInProgress();
  const { toast } = useToast();

  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'operational'),
    [vehicles],
  );
  const availableDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === 'available'),
    [drivers],
  );

  // Enriquecer rutas con datos de órdenes/paradas
  const enrichedRoutes = useMemo(() => {
    return routes.map((route) => {
      // El hook de useOrders ya resuelve la ruta asignada de cada orden
      const routeStops = orders.filter((order) => order.assignment.routeId === route.id);

      const driver = drivers.find((d) => String(d.id) === String(route.driverAssigned));
      const vehicle = vehicles.find((v) => String(v.id) === String(route.vehicleAssigned));

      const origin = 'Almacén Central CoBox';
      const destination = routeStops.length > 0 
        ? `${routeStops[routeStops.length - 1].addressLine}, ${routeStops[routeStops.length - 1].city}` 
        : 'Sin paradas';

      return {
        ...route,
        stops: routeStops,
        origin,
        destination,
        driverName: driver ? driver.name : (route.driverAssigned ? `Conductor #${route.driverAssigned}` : null),
        vehiclePlate: vehicle ? vehicle.plate : (route.vehicleAssigned ? `Vehículo #${route.vehicleAssigned}` : null),
      };
    });
  }, [routes, orders, drivers, vehicles]);

  // Filtrar rutas
  const filteredRoutes = useMemo(() => {
    return enrichedRoutes.filter((route) => {
      const matchesDriver = driverFilter === 'all' || String(route.driverAssigned) === driverFilter;
      const matchesVehicle = vehicleFilter === 'all' || String(route.vehicleAssigned) === vehicleFilter;
      const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
      return matchesDriver && matchesVehicle && matchesStatus;
    });
  }, [enrichedRoutes, driverFilter, vehicleFilter, statusFilter]);

  const activeSelectedRoute = useMemo(() => {
    if (!selectedRoute) return null;
    return enrichedRoutes.find((r) => r.id === selectedRoute.id) || null;
  }, [enrichedRoutes, selectedRoute]);

  const openVehicleModal = (route: Route) => {
    setVehicleRoute(route);
    setSelectedVehicleId(availableVehicles[0]?.id ?? '');
  };

  const openDriverModal = (route: Route) => {
    setDriverRoute(route);
    setSelectedDriverId(availableDrivers[0]?.id ?? '');
  };

  const handleAssignVehicle = () => {
    if (!vehicleRoute || !selectedVehicleId) {
      return;
    }

    assignVehicle.mutate(
      { routeId: vehicleRoute.id, vehicleId: selectedVehicleId },
      {
        onSuccess: () => {
          setVehicleRoute(null);
          toast({ title: 'Vehículo asignado a la ruta', type: 'success' });
        },
        onError: () => toast({ title: 'No se pudo asignar el vehículo', type: 'error' }),
      },
    );
  };

  const handleAssignDriver = () => {
    if (!driverRoute || !selectedDriverId) {
      return;
    }

    assignDriver.mutate(
      { routeId: driverRoute.id, driverId: selectedDriverId },
      {
        onSuccess: () => {
          setDriverRoute(null);
          toast({ title: 'Conductor asignado a la ruta', type: 'success' });
        },
        onError: () => toast({ title: 'No se pudo asignar el conductor', type: 'error' }),
      },
    );
  };

  const handleStartRoute = (routeId: string) => {
    markInProgress.mutate(routeId, {
      onSuccess: () => toast({ title: 'Ruta iniciada correctamente', type: 'success' }),
      onError: () => toast({ title: 'No se pudo iniciar la ruta', type: 'error' }),
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gestión de Rutas</h1>
        <p className="mt-2 text-sm text-[#64748B]">Monitoreo de despachos, asignaciones y avance de rutas en tiempo real.</p>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">Conductor</label>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">Todos los conductores</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">Vehículo</label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">Todos los vehículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completada</option>
          </select>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`grid gap-4 h-fit lg:col-span-2 ${selectedRoute ? '' : 'lg:col-span-3 md:grid-cols-2'}`}>
          {routesQuery.isError ? (
            <div className="lg:col-span-3">
              <ApiErrorState onRetry={() => void routesQuery.refetch()} />
            </div>
          ) : routesQuery.isLoading
            ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56" />)
            : filteredRoutes.map((route) => (
                <Card key={route.id} className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DFF6F1] text-[#0F766E]">
                          <RouteIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900">{route.code}</h2>
                          <p className="mt-1 text-xs text-[#64748B]">
                            {route.stops.length} paradas registradas
                          </p>
                        </div>
                      </div>
                      <Badge className={routeStatusClasses[route.status]}>{routeStatusLabels[route.status]}</Badge>
                    </div>

                    <div className="space-y-2 text-xs text-[#64748B]">
                      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-1.5">
                        <span className="font-medium text-slate-500">Destino final:</span>
                        <span className="text-slate-800 font-semibold">{route.destination}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-1.5">
                        <span className="font-medium text-slate-500">Conductor:</span>
                        <span className="text-slate-800 font-semibold">{route.driverName || 'Sin asignar'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-500">Vehículo:</span>
                        <span className="text-slate-800 font-semibold">{route.vehiclePlate || 'Sin asignar'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 pt-3 border-t border-[#E2E8F0]">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" className="h-9 text-xs" onClick={() => openVehicleModal(route)}>
                        Vehículo
                      </Button>
                      <Button variant="secondary" className="h-9 text-xs" onClick={() => openDriverModal(route)}>
                        Conductor
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-9 text-xs"
                        disabled={route.status !== 'pending' || markInProgress.isPending}
                        onClick={() => handleStartRoute(route.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Iniciar
                      </Button>
                      <Button variant="ghost" className="h-9 text-xs" onClick={() => setSelectedRoute(route)}>
                        Ver detalle
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

          {!routesQuery.isLoading && !routesQuery.isError && filteredRoutes.length === 0 ? (
            <Card className="p-10 text-center text-sm text-[#64748B] lg:col-span-3">
              No hay rutas registradas para los filtros seleccionados.
            </Card>
          ) : null}
        </div>

        {activeSelectedRoute && (
          <Card className="p-5 flex flex-col justify-between h-fit space-y-6">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Detalle de la Ruta</h2>
                <span className="text-xs text-[#64748B] font-semibold">{activeSelectedRoute.code}</span>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedRoute(null)}
                aria-label="Cerrar detalle"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#64748B] font-semibold block uppercase">Vehículo</span>
                  <span className="text-slate-800 font-medium">{activeSelectedRoute.vehiclePlate || 'Sin asignar'}</span>
                </div>
                <div>
                  <span className="text-[#64748B] font-semibold block uppercase">Conductor</span>
                  <span className="text-slate-800 font-medium">{activeSelectedRoute.driverName || 'Sin asignar'}</span>
                </div>
              </div>

              {/* Paradas */}
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-3">Cronología de Paradas</span>
                {activeSelectedRoute.stops.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic">No hay órdenes asignadas a esta ruta.</p>
                ) : (
                  <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                    {activeSelectedRoute.stops.map((stop, index) => (
                      <div key={stop.id} className="relative text-xs">
                        <span className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-[#E2E8F0]">
                          {stop.status === 'DELIVERED' ? (
                            <CheckCircle2 className="h-3 w-3 text-[#16A34A]" />
                          ) : stop.status === 'IN_TRANSIT' ? (
                            <Navigation className="h-3 w-3 text-[#2563EB]" />
                          ) : (
                            <Clock className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Parada #{index + 1} - Orden #{stop.id}</span>
                            <span className="text-[#64748B] font-medium">{stop.weightKg} kg</span>
                          </div>
                          <p className="text-[#64748B] mt-0.5">{stop.addressLine}, {stop.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geolocalización / Mapa Ligero */}
              {activeSelectedRoute.stops.some(s => s.referenceLatitude && s.referenceLongitude) && (
                <div className="border-t border-[#E2E8F0] pt-4">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-2">Puntos de Geolocalización</span>
                  <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                      <MapPinned className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Coordenadas de paradas en campo:</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {activeSelectedRoute.stops.map((stop, index) => (
                        <div key={stop.id} className="flex justify-between text-[10px] text-slate-600 bg-white p-1.5 border border-slate-100 rounded">
                          <span>Stop #{index + 1}</span>
                          <span>Lat: {stop.referenceLatitude.toFixed(4)}, Lng: {stop.referenceLongitude.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <Button
                className="w-full h-10 text-xs"
                disabled={activeSelectedRoute.status !== 'pending' || markInProgress.isPending}
                onClick={() => handleStartRoute(activeSelectedRoute.id)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Iniciar Ruta Completa
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(vehicleRoute)} title="Asignar vehículo a ruta" onClose={() => setVehicleRoute(null)}>
        <div className="space-y-4">
          <Select value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)} className="w-full">
            {availableVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} ({vehicle.capacity.toLocaleString('es-PE')} kg)
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
            <Button variant="secondary" onClick={() => setVehicleRoute(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignVehicle} disabled={!selectedVehicleId || assignVehicle.isPending}>
              Asignar vehículo
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(driverRoute)} title="Asignar conductor a ruta" onClose={() => setDriverRoute(null)}>
        <div className="space-y-4">
          <Select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)} className="w-full">
            {availableDrivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} - {driver.license}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
            <Button variant="secondary" onClick={() => setDriverRoute(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignDriver} disabled={!selectedDriverId || assignDriver.isPending}>
              Asignar conductor
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}


