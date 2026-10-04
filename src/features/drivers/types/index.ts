export type BackendDriverStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'OFFLINE'
  | 'ON_ROUTE'
  | 'ON_BREAK'
  | 'UNAVAILABLE';

export type DriverStatus = BackendDriverStatus;

export type BackendDriverResource = {
  id: number;
  email: string | null;
  fullName?: string | null;
  licenceNumber: string | null;
  driverStatus: BackendDriverStatus;
};

export type CreateDriverPayload = {
  email: string;
  licenceNumber: string;
};

export type Driver = {
  id: string;
  email: string;
  fullName: string | null;
  licenceNumber: string;
  status: DriverStatus;
};

export type BackendOrderIdResource = {
  orderId: number;
};

export type BackendRouteResource = {
  id: number;
  title: string | null;
  vehicleId: number | null;
  driverId: number | null;
  ordersIds: BackendOrderIdResource[];
  finishedOrderIds: BackendOrderIdResource[];
  routeStatus: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
};

export type DriverRoute = {
  id: string;
  title: string;
  vehicleId: string | null;
  driverId: string | null;
  orderIds: string[];
  finishedOrderIds: string[];
  status: BackendRouteResource['routeStatus'];
};
