import type { OrderStatus } from '../../orders/types/index.ts';
import type { RouteStatus } from '../types/index.ts';

/**
 * Vista minima de la ruta que necesita el calculo del plan. Se declara aqui,
 * en vez de reusar el recurso completo, para que el modulo no dependa de la
 * forma del recurso y sus pruebas puedan construir casos minimos.
 */
export type RouteAssignmentSnapshot = {
  id: string;
  status: RouteStatus;
  vehicleId: string | null;
  driverId: string | null;
  orderIds: string[];
  finishedOrderIds: string[];
};

/** Proyeccion de la orden necesaria para decidir si exige marcado previo. */
export type OrderCandidate = {
  id: string;
  status: OrderStatus;
};

export type RouteAssignmentSelection = {
  orderIds: string[];
  vehicleId: string;
  driverId: string;
  startRoute: boolean;
};

export type RouteAssignmentPlan = {
  orderIdsToMarkReady: string[];
  orderIdsToAdd: string[];
  vehicleIdToAssign: string | null;
  driverIdToAssign: string | null;
  shouldStartRoute: boolean;
};

const ASSIGNABLE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'RECEIVED',
  'PROCESSING',
  'READY_FOR_DISPATCH',
]);

const NEEDS_READY_MARK_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['RECEIVED', 'PROCESSING']);

function isAssignableStatus(status: OrderStatus): boolean {
  return ASSIGNABLE_ORDER_STATUSES.has(status);
}

function needsReadyMark(status: OrderStatus): boolean {
  return NEEDS_READY_MARK_STATUSES.has(status);
}

/**
 * Compara la seleccion del usuario contra el estado vigente de la ruta y
 * devuelve unicamente las operaciones pendientes, en orden reproducible.
 *
 * El plan es un valor puro: no muta sus entradas, no realiza entrada-salida y
 * no lanza ante datos incompletos. Un plan vacio significa que guardar no tiene
 * nada que hacer, y por lo tanto no debe producir ninguna peticion.
 */
export function buildPlan(
  route: RouteAssignmentSnapshot,
  selection: RouteAssignmentSelection,
  orders: readonly OrderCandidate[],
): RouteAssignmentPlan {
  const assignedOrderIds = new Set([...(route.orderIds ?? []), ...(route.finishedOrderIds ?? [])]);
  const statusByOrderId = new Map(orders.map((order) => [order.id, order.status]));

  const orderIdsToAdd: string[] = [];
  const orderIdsToMarkReady: string[] = [];

  for (const orderId of selection.orderIds) {
    if (assignedOrderIds.has(orderId)) continue;

    const status = statusByOrderId.get(orderId);
    if (status === undefined || !isAssignableStatus(status)) continue;

    orderIdsToAdd.push(orderId);
    if (needsReadyMark(status)) orderIdsToMarkReady.push(orderId);
  }

  const vehicleIdToAssign =
    selection.vehicleId && selection.vehicleId !== route.vehicleId ? selection.vehicleId : null;
  const driverIdToAssign =
    selection.driverId && selection.driverId !== route.driverId ? selection.driverId : null;

  return {
    orderIdsToMarkReady,
    orderIdsToAdd,
    vehicleIdToAssign,
    driverIdToAssign,
    shouldStartRoute: selection.startRoute && route.status === 'PLANNED',
  };
}

export function isPlanEmpty(plan: RouteAssignmentPlan): boolean {
  return (
    plan.orderIdsToMarkReady.length === 0 &&
    plan.orderIdsToAdd.length === 0 &&
    plan.vehicleIdToAssign === null &&
    plan.driverIdToAssign === null &&
    !plan.shouldStartRoute
  );
}

export function candidateOrdersForRoute<T extends OrderCandidate>(
  orders: readonly T[],
  route: RouteAssignmentSnapshot,
): T[] {
  const assignedOrderIds = new Set([...(route.orderIds ?? []), ...(route.finishedOrderIds ?? [])]);

  return orders.filter((order) => !assignedOrderIds.has(order.id) && isAssignableStatus(order.status));
}

export function assignableVehicles<T extends { id: string; status: string }>(
  vehicles: readonly T[],
  route: RouteAssignmentSnapshot,
): T[] {
  return vehicles.filter(
    (vehicle) => vehicle.status === 'OPERATIONAL' || vehicle.id === route.vehicleId,
  );
}

export function assignableDrivers<T extends { id: string; status: string }>(
  drivers: readonly T[],
  route: RouteAssignmentSnapshot,
): T[] {
  return drivers.filter((driver) => driver.status === 'AVAILABLE' || driver.id === route.driverId);
}

export function candidateRoutesForOrder<T extends RouteAssignmentSnapshot>(
  routes: readonly T[],
  orderId: string,
): T[] {
  return routes.filter((route) => route.status !== 'COMPLETED' && !(route.orderIds ?? []).includes(orderId));
}
