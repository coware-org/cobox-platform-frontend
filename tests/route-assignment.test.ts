import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assignableDrivers,
  assignableVehicles,
  buildPlan,
  candidateOrdersForRoute,
  candidateRoutesForOrder,
  isPlanEmpty,
} from '../src/features/routes/services/routeAssignmentPlan.ts';
import type {
  RouteAssignmentPlan,
  RouteAssignmentSelection,
  RouteAssignmentSnapshot,
} from '../src/features/routes/services/routeAssignmentPlan.ts';
import type { OrderStatus, RouteStatus } from '../src/features/routes/types/index.ts';
import type { VehicleStatus } from '../src/features/vehicles/types/index.ts';
import type { DriverStatus } from '../src/features/drivers/types/index.ts';

function route(overrides: Partial<RouteAssignmentSnapshot> = {}): RouteAssignmentSnapshot {
  return {
    id: '1',
    status: 'PLANNED' as RouteStatus,
    vehicleId: null,
    driverId: null,
    orderIds: [],
    finishedOrderIds: [],
    ...overrides,
  };
}

function selection(overrides: Partial<RouteAssignmentSelection> = {}): RouteAssignmentSelection {
  return { orderIds: [], vehicleId: '', driverId: '', startRoute: false, ...overrides };
}

function order(id: string, status: string, city = 'Lima') {
  return { id, status: status as OrderStatus, city, country: 'PE', addressLine: `Av. ${id}`, weightKg: 10 };
}

function emptyPlan(): RouteAssignmentPlan {
  return { orderIdsToMarkReady: [], orderIdsToAdd: [], vehicleIdToAssign: null, driverIdToAssign: null, shouldStartRoute: false };
}

test('sin cambios, el plan no emite ninguna operacion', () => {
  const plan = buildPlan(
    route({ orderIds: ['10'], vehicleId: '7', driverId: '3' }),
    selection({ orderIds: ['10'], vehicleId: '7', driverId: '3' }),
    [order('10', 'READY_FOR_DISPATCH')],
  );

  assert.deepEqual(plan, emptyPlan());
  assert.equal(isPlanEmpty(plan), true);
});

test('el plan vacio se detecta en las cinco operaciones', () => {
  assert.equal(isPlanEmpty(emptyPlan()), true);
  assert.equal(isPlanEmpty({ ...emptyPlan(), orderIdsToAdd: ['1'] }), false);
  assert.equal(isPlanEmpty({ ...emptyPlan(), orderIdsToMarkReady: ['1'] }), false);
  assert.equal(isPlanEmpty({ ...emptyPlan(), vehicleIdToAssign: '1' }), false);
  assert.equal(isPlanEmpty({ ...emptyPlan(), driverIdToAssign: '1' }), false);
  assert.equal(isPlanEmpty({ ...emptyPlan(), shouldStartRoute: true }), false);
});

test('sin ordenes seleccionadas se pueden emitir solo cambios de vehiculo y conductor', () => {
  const plan = buildPlan(route(), selection({ vehicleId: '9' }), []);

  assert.deepEqual(plan.orderIdsToAdd, []);
  assert.equal(plan.vehicleIdToAssign, '9');
  assert.equal(plan.driverIdToAssign, null);
  assert.equal(isPlanEmpty(plan), false);
});

test('se omiten las ordenes que ya pertenecen a la ruta, incluidas las finalizadas', () => {
  const plan = buildPlan(
    route({ orderIds: ['10'], finishedOrderIds: ['11'] }),
    selection({ orderIds: ['10', '11', '12'] }),
    [order('10', 'READY_FOR_DISPATCH'), order('11', 'READY_FOR_DISPATCH'), order('12', 'READY_FOR_DISPATCH')],
  );

  assert.deepEqual(plan.orderIdsToAdd, ['12']);
});

test('se ignoran los identificadores de orden desconocidos', () => {
  const plan = buildPlan(route(), selection({ orderIds: ['999'] }), [order('10', 'READY_FOR_DISPATCH')]);

  assert.deepEqual(plan.orderIdsToAdd, []);
  assert.equal(isPlanEmpty(plan), true);
});

test('las ordenes en RECEIVED y PROCESSING requieren marcado previo', () => {
  const plan = buildPlan(
    route(),
    selection({ orderIds: ['1', '2', '3'] }),
    [order('1', 'RECEIVED'), order('2', 'PROCESSING'), order('3', 'READY_FOR_DISPATCH')],
  );

  assert.deepEqual(plan.orderIdsToMarkReady, ['1', '2']);
  assert.deepEqual(plan.orderIdsToAdd, ['1', '2', '3']);
});

test('nunca se marcan ordenes en transito, entregadas ni canceladas', () => {
  const plan = buildPlan(
    route(),
    selection({ orderIds: ['1', '2', '3'] }),
    [order('1', 'IN_TRANSIT'), order('2', 'DELIVERED'), order('3', 'CANCELLED')],
  );

  assert.deepEqual(plan.orderIdsToMarkReady, []);
  assert.deepEqual(plan.orderIdsToAdd, []);
  assert.equal(isPlanEmpty(plan), true);
});

test('el plan conserva el orden de la seleccion del usuario', () => {
  const plan = buildPlan(
    route(),
    selection({ orderIds: ['30', '10', '20'] }),
    [order('10', 'RECEIVED'), order('20', 'PROCESSING'), order('30', 'READY_FOR_DISPATCH')],
  );

  assert.deepEqual(plan.orderIdsToMarkReady, ['10', '20']);
  assert.deepEqual(plan.orderIdsToAdd, ['30', '10', '20']);
});

test('el vehiculo y el conductor se emiten solo cuando difieren del valor vigente', () => {
  const same = buildPlan(
    route({ vehicleId: '7', driverId: '3' }),
    selection({ vehicleId: '7', driverId: '3' }),
    [],
  );
  assert.equal(same.vehicleIdToAssign, null);
  assert.equal(same.driverIdToAssign, null);

  const changed = buildPlan(
    route({ vehicleId: '7', driverId: '3' }),
    selection({ vehicleId: '8', driverId: '4' }),
    [],
  );
  assert.equal(changed.vehicleIdToAssign, '8');
  assert.equal(changed.driverIdToAssign, '4');

  const cleared = buildPlan(route({ vehicleId: '7', driverId: '3' }), selection(), []);
  assert.equal(cleared.vehicleIdToAssign, null);
  assert.equal(cleared.driverIdToAssign, null);
});

test('el inicio de ruta solo procede desde el estado PLANNED', () => {
  const planned = buildPlan(route({ status: 'PLANNED' as RouteStatus }), selection({ startRoute: true }), []);
  assert.equal(planned.shouldStartRoute, true);

  const inProgress = buildPlan(route({ status: 'IN_PROGRESS' as RouteStatus }), selection({ startRoute: true }), []);
  assert.equal(inProgress.shouldStartRoute, false);
  assert.equal(isPlanEmpty(inProgress), true);

  const completed = buildPlan(route({ status: 'COMPLETED' as RouteStatus }), selection({ startRoute: true }), []);
  assert.equal(completed.shouldStartRoute, false);
});

test('no se inicia la ruta si el usuario no lo pide', () => {
  const plan = buildPlan(route({ status: 'PLANNED' as RouteStatus }), selection(), []);

  assert.equal(plan.shouldStartRoute, false);
});

test('las candidatas de orden excluyen las asignables que ya estan en la ruta', () => {
  const candidates = candidateOrdersForRoute(
    [order('10', 'READY_FOR_DISPATCH'), order('11', 'PROCESSING'), order('12', 'IN_TRANSIT'), order('13', 'RECEIVED')],
    route({ orderIds: ['10'], finishedOrderIds: ['11'] }),
  );

  assert.deepEqual(candidates.map((item) => item.id), ['13']);
});

test('las candidatas de orden descartan transito, entregadas y canceladas', () => {
  const candidates = candidateOrdersForRoute(
    [order('1', 'IN_TRANSIT'), order('2', 'DELIVERED'), order('3', 'CANCELLED'), order('4', 'READY_FOR_DISPATCH')],
    route(),
  );

  assert.deepEqual(candidates.map((item) => item.id), ['4']);
});

test('los vehiculos asignables incluyen el ya asignado aunque no sea operativo', () => {
  const vehicles = [
    { id: '1', plateNumber: 'AAA-1', capacityKg: 100, status: 'OPERATIONAL' as VehicleStatus },
    { id: '2', plateNumber: 'BBB-2', capacityKg: 100, status: 'IN_MAINTENANCE' as VehicleStatus },
    { id: '3', plateNumber: 'CCC-3', capacityKg: 100, status: 'ON_ROUTE' as VehicleStatus },
  ];

  assert.deepEqual(
    assignableVehicles(vehicles, route({ vehicleId: '3' })).map((vehicle) => vehicle.id),
    ['1', '3'],
  );
});

test('los conductores asignables incluyen el ya asignado aunque no este disponible', () => {
  const drivers = [
    { id: '1', email: 'a@test', fullName: null, licenceNumber: 'L1', status: 'AVAILABLE' as DriverStatus },
    { id: '2', email: 'b@test', fullName: null, licenceNumber: 'L2', status: 'ASSIGNED' as DriverStatus },
    { id: '3', email: 'c@test', fullName: null, licenceNumber: 'L3', status: 'OFFLINE' as DriverStatus },
  ];

  assert.deepEqual(
    assignableDrivers(drivers, route({ driverId: '3' })).map((driver) => driver.id),
    ['1', '3'],
  );
});

test('las rutas para una orden excluyen las completadas y las que ya la contienen', () => {
  const routes = [
    { ...route({ id: '1' }) },
    { ...route({ id: '2', status: 'COMPLETED' as RouteStatus }) },
    { ...route({ id: '3', orderIds: ['50'] }) },
    { ...route({ id: '4', status: 'IN_PROGRESS' as RouteStatus }) },
  ];

  assert.deepEqual(
    candidateRoutesForOrder(routes, '50').map((item) => item.id),
    ['1', '4'],
  );
});

test('los filtros de candidatos toleran colecciones vacias', () => {
  assert.deepEqual(candidateOrdersForRoute([], route()), []);
  assert.deepEqual(assignableVehicles([], route()), []);
  assert.deepEqual(assignableDrivers([], route()), []);
  assert.deepEqual(candidateRoutesForOrder([], '1'), []);
});
