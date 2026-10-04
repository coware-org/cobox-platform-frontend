import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../services/ordersService';
import { useRoutes } from '@/features/routes/hooks';
import { useDrivers } from '@/features/drivers/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import type { Driver } from '@/features/drivers/types';
import type { Route } from '@/features/routes/types';
import type { Vehicle } from '@/features/vehicles/types';
import type { CreateOrderPayload, MarkAsCompletedPayload, Order } from '../types';

function getDriverDisplayName(driver: Driver): string {
  return driver.fullName ?? driver.email;
}

/**
 * Indexa las ordenes por id a partir de las rutas que las contienen.
 * Una orden sigue perteneciendo a su ruta aunque ya figure en `finishedOrderIds`,
 * por lo que se consideran ambas listas.
 */
function indexRoutesByOrderId(routes: Route[]): Map<string, Route> {
  const routeByOrderId = new Map<string, Route>();

  for (const route of routes) {
    for (const orderId of [...(route.orderIds ?? []), ...(route.finishedOrderIds ?? [])]) {
      if (!routeByOrderId.has(orderId)) {
        routeByOrderId.set(orderId, route);
      }
    }
  }

  return routeByOrderId;
}

/**
 * Cruza Orden -> Ruta -> Conductor/Vehiculo. La orden nunca duplica estos datos:
 * los hereda de la ruta que tiene asignada actualmente.
 */
function resolveAssignment(
  order: Order,
  routeByOrderId: Map<string, Route>,
  driverById: Map<string, Driver>,
  vehicleById: Map<string, Vehicle>,
): Order['assignment'] {
  const route = routeByOrderId.get(order.id);
  const apiAssignment = order.assignment;

  if (!route) {
    return apiAssignment;
  }

  const driver = route.driverId ? driverById.get(route.driverId) : undefined;
  const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : undefined;

  return {
    routeId: route.id,
    routeTitle: route.title,
    driverId: route.driverId ?? apiAssignment.driverId,
    driverName: driver
      ? getDriverDisplayName(driver)
      : route.driverId
        ? apiAssignment.driverName ?? `Conductor #${route.driverId}`
        : null,
    driverEmail: driver?.email ?? apiAssignment.driverEmail,
    driverLicenceNumber: driver?.licenceNumber ?? apiAssignment.driverLicenceNumber,
    vehicleId: route.vehicleId ?? apiAssignment.vehicleId,
    vehiclePlate: vehicle
      ? vehicle.plateNumber
      : route.vehicleId
        ? apiAssignment.vehiclePlate ?? `Vehículo #${route.vehicleId}`
        : null,
  };
}

export function useOrders() {
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: ordersService.getOrders,
  });

  const routesQuery = useRoutes();
  const driversQuery = useDrivers();
  const vehiclesQuery = useVehicles();

  const isError = ordersQuery.isError || routesQuery.isError || driversQuery.isError || vehiclesQuery.isError;
  const isLoading = ordersQuery.isLoading || routesQuery.isLoading || driversQuery.isLoading || vehiclesQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      ordersQuery.refetch(),
      routesQuery.refetch(),
      driversQuery.refetch(),
      vehiclesQuery.refetch(),
    ]);
  };

  // Cruce de información — memoizado para evitar recalcular en cada render
  // y mantener una referencia estable del array (evita re-renders en cascada
  // y que se cuelgue la página al hacer click en "Acciones").
  const data = ordersQuery.data;
  const routes = routesQuery.data;
  const drivers = driversQuery.data;
  const vehicles = vehiclesQuery.data;

  const enrichedOrders: Order[] = useMemo(() => {
    const routeByOrderId = indexRoutesByOrderId(routes ?? []);
    const driverById = new Map((drivers ?? []).map((driver) => [driver.id, driver]));
    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

    return (data ?? []).map((order) => ({
      ...order,
      assignment: resolveAssignment(order, routeByOrderId, driverById, vehicleById),
    }));
  }, [data, routes, drivers, vehicles]);

  return {
    data: enrichedOrders,
    isLoading,
    isError,
    refetch,
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersService.createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Solo el estado proviene de la respuesta de la orden: la asignación se conserva
 * porque su fuente de verdad es la ruta (`useRoutes`), no el PATCH de estado.
 */
function updateOrderStatus(cache: Order[], updatedOrder: Order): Order[] {
  return cache.map((order) => (order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order));
}

export function useMarkOrderReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersService.markReadyForDispatch(orderId),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData<Order[]>(['orders'], (current) =>
        updateOrderStatus(current ?? [], updatedOrder),
      );
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useMarkOrderInTransit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersService.markInTransit(orderId),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData<Order[]>(['orders'], (current) =>
        updateOrderStatus(current ?? [], updatedOrder),
      );
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useMarkOrderCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: MarkAsCompletedPayload }) =>
      ordersService.markCompleted(orderId, payload),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData<Order[]>(['orders'], (current) =>
        updateOrderStatus(current ?? [], updatedOrder),
      );
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      // También invalidamos rutas porque finalizar una orden puede completar la ruta en el backend
      void queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}
