export type OrderStatus = 'RECEIVED' | 'PROCESSING' | 'READY_FOR_DISPATCH' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export type BackendOrderDriverResource = {
  id?: number | null;
  fullName?: string | null;
  email?: string | null;
  licenceNumber?: string | null;
};

export type BackendOrderVehicleResource = {
  id?: number | null;
  plateNumber?: string | null;
  plate?: string | null;
};

export type BackendOrderRouteResource = {
  id?: number | null;
  title?: string | null;
  driverId?: number | null;
  vehicleId?: number | null;
};

export type BackendOrderResource = {
  id: number;
  clientId: number;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  referenceLatitude: number;
  referenceLongitude: number;
  notes: string;
  weightKg: number;
  orderStatus: OrderStatus;
  // La API puede exponer la asignación anidada; se usa como fuente y se
  // completa con el cruce Orden -> Ruta -> Conductor/Vehiculo.
  routeId?: number | null;
  route?: BackendOrderRouteResource | null;
  driver?: BackendOrderDriverResource | null;
  vehicle?: BackendOrderVehicleResource | null;
};

export type OrderAssignment = {
  routeId: string | null;
  routeTitle: string | null;
  driverId: string | null;
  driverName: string | null;
  driverEmail: string | null;
  driverLicenceNumber: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
};

export type Order = {
  id: string;
  clientId: number;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  referenceLatitude: number;
  referenceLongitude: number;
  notes: string;
  weightKg: number;
  status: OrderStatus;
  // Heredados de la ruta asignada (nunca se capturan manualmente en la orden).
  assignment: OrderAssignment;
};

export const UNASSIGNED_ORDER_ASSIGNMENT: OrderAssignment = {
  routeId: null,
  routeTitle: null,
  driverId: null,
  driverName: null,
  driverEmail: null,
  driverLicenceNumber: null,
  vehicleId: null,
  vehiclePlate: null,
};

export type CreateOrderPayload = {
  clientId: number;
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  referenceLatitude: number;
  referenceLongitude: number;
  notes: string;
  weightKg: number;
};

export type MarkAsCompletedPayload = {
  routeId: number;
  photoUrl: string;
  receiverName: string;
  signatureData: string;
};
