import { fleetApi } from '@/services';
import {
  UNASSIGNED_ORDER_ASSIGNMENT,
  type BackendOrderResource,
  type CreateOrderPayload,
  type MarkAsCompletedPayload,
  type Order,
  type OrderAssignment,
} from '../types';

function firstText(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return null;
}

function optionalId(value: number | null | undefined): string | null {
  return value == null ? null : String(value);
}

/**
 * Traduce la asignación anidada que la API puede devolver en la orden.
 * La orden nunca guarda conductor ni vehículo por sí misma: solo refleja
 * lo que expone la ruta que tiene asignada.
 */
function toAssignment(backend: BackendOrderResource): OrderAssignment {
  const route = backend.route ?? null;
  const driver = backend.driver ?? null;
  const vehicle = backend.vehicle ?? null;

  const driverId = optionalId(driver?.id) ?? optionalId(route?.driverId);
  const vehicleId = optionalId(vehicle?.id) ?? optionalId(route?.vehicleId);
  const driverName = firstText(driver?.fullName, driver?.email);
  const vehiclePlate = firstText(vehicle?.plateNumber, vehicle?.plate);

  if (!route && !driver && !vehicle) {
    return { ...UNASSIGNED_ORDER_ASSIGNMENT, routeId: optionalId(backend.routeId) };
  }

  return {
    routeId: optionalId(route?.id) ?? optionalId(backend.routeId),
    routeTitle: firstText(route?.title),
    driverId,
    driverName,
    driverEmail: firstText(driver?.email),
    driverLicenceNumber: firstText(driver?.licenceNumber),
    vehicleId,
    vehiclePlate,
  };
}

function toOrder(backend: BackendOrderResource): Order {
  return {
    id: String(backend.id),
    clientId: backend.clientId,
    addressLine: backend.addressLine,
    city: backend.city,
    country: backend.country,
    postalCode: backend.postalCode,
    referenceLatitude: backend.referenceLatitude,
    referenceLongitude: backend.referenceLongitude,
    notes: backend.notes,
    weightKg: backend.weightKg,
    status: backend.orderStatus,
    assignment: toAssignment(backend),
  };
}

export const ordersService = {
  async getOrders(): Promise<Order[]> {
    const { data } = await fleetApi.get<BackendOrderResource[]>('/api/v1/orders');
    return (data || []).map(toOrder);
  },

  async getOrderById(orderId: string): Promise<Order> {
    const { data } = await fleetApi.get<BackendOrderResource>(`/api/v1/orders/${orderId}`);
    return toOrder(data);
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const { data } = await fleetApi.post<BackendOrderResource>('/api/v1/orders', payload);
    return toOrder(data);
  },

  async markReadyForDispatch(orderId: string): Promise<Order> {
    const { data } = await fleetApi.patch<BackendOrderResource>(`/api/v1/orders/${orderId}/ready-for-dispatch`);
    return toOrder(data);
  },

  async markInTransit(orderId: string): Promise<Order> {
    const { data } = await fleetApi.patch<BackendOrderResource>(`/api/v1/orders/${orderId}/in-transit`);
    return toOrder(data);
  },

  async markCompleted(orderId: string, payload: MarkAsCompletedPayload): Promise<Order> {
    const { data } = await fleetApi.patch<BackendOrderResource>(`/api/v1/orders/${orderId}/completed`, payload);
    return toOrder(data);
  },
};
