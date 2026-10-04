import { fleetApi } from '@/services';
import type {
  BackendDriverResource,
  BackendRouteResource,
  CreateDriverPayload,
  Driver,
  DriverRoute,
} from '../types';

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && 'value' in value && Array.isArray(value.value)) return value.value;
  if (value && typeof value === 'object' && 'data' in value && Array.isArray(value.data)) return value.data;
  return [];
}

function firstText(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return '';
}

function toDriver(resource: BackendDriverResource): Driver {
  const fullName = firstText(resource.fullName) || null;

  return {
    id: String(resource.id),
    email: firstText(resource.email) || fullName || '',
    fullName,
    licenceNumber: firstText(resource.licenceNumber),
    status: resource.driverStatus,
  };
}

function toDriverRoute(resource: BackendRouteResource): DriverRoute {
  return {
    id: String(resource.id),
    title: resource.title ?? `Ruta #${resource.id}`,
    vehicleId: resource.vehicleId == null ? null : String(resource.vehicleId),
    driverId: resource.driverId == null ? null : String(resource.driverId),
    orderIds: ensureArray<{ orderId: number }>(resource.ordersIds).map((order) => String(order.orderId)),
    finishedOrderIds: ensureArray<{ orderId: number }>(resource.finishedOrderIds).map((order) => String(order.orderId)),
    status: resource.routeStatus,
  };
}

export const driversService = {
  async getDrivers(): Promise<Driver[]> {
    const { data } = await fleetApi.get<BackendDriverResource[] | { value?: BackendDriverResource[]; data?: BackendDriverResource[] }>(
      '/api/v1/drivers',
    );
    return ensureArray<BackendDriverResource>(data).map(toDriver);
  },

  async createDriver(payload: CreateDriverPayload): Promise<Driver> {
    const { data } = await fleetApi.post<BackendDriverResource>('/api/v1/drivers', payload);
    return toDriver(data);
  },

  async getDriverById(driverId: string): Promise<Driver> {
    const { data } = await fleetApi.get<BackendDriverResource>(`/api/v1/drivers/${driverId}`);
    return toDriver(data);
  },

  async getRoutesByDriverId(driverId: string): Promise<DriverRoute[]> {
    const { data } = await fleetApi.get<BackendRouteResource[] | { value?: BackendRouteResource[]; data?: BackendRouteResource[] }>(
      `/api/v1/drivers/${driverId}/routes`,
    );
    return ensureArray<BackendRouteResource>(data).map(toDriverRoute);
  },
};
