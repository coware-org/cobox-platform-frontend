import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, Play, Search, Trash2, Truck, UserRound } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/components/ui';
import type { Driver } from '@/features/drivers/types';
import type { Order } from '@/features/orders/types';
import type { Vehicle } from '@/features/vehicles/types';
import type { RouteAssignmentFailure, OrderWarning } from '../hooks/useRouteAssignment';
import {
  assignableDrivers,
  assignableVehicles,
  buildPlan,
  candidateOrdersForRoute,
  candidateRoutesForOrder,
  isPlanEmpty,
} from '../services/routeAssignmentPlan';
import type { RouteAssignmentSelection, RouteAssignmentSnapshot } from '../services/routeAssignmentPlan';
import type { Route } from '../types';

type RouteAssignmentDialogProps = {
  open: boolean;
  /** Ruta fija (punto de entrada desde la tarjeta de ruta). */
  route: RouteAssignmentSnapshot | null;
  /** Rutas elegibles (punto de entrada desde el detalle de la orden). */
  routes: Route[];
  /** Orden fija y no descartable (punto de entrada desde el detalle de la orden). */
  lockedOrderId: string | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  orders: Order[];
  isSubmitting: boolean;
  isLoading?: boolean;
  warnings: OrderWarning[];
  failure: RouteAssignmentFailure | null;
  appliedOrderIds: string[];
  onSelectedRouteChange: (routeId: string) => void;
  onSelectedVehicleChange: (vehicleId: string) => void;
  onSelectedDriverChange: (driverId: string) => void;
  onDismissWarnings: () => void;
  onClose: () => void;
  onSubmit: (selection: RouteAssignmentSelection) => void;
};

const orderStatusLabels: Record<string, string> = {
  RECEIVED: 'Recibido',
  PROCESSING: 'Procesando',
  READY_FOR_DISPATCH: 'Listo para despacho',
};

function matchesSearch(order: Order, term: string): boolean {
  if (!term) return true;
  return (
    order.id.toLowerCase().includes(term) ||
    order.addressLine.toLowerCase().includes(term) ||
    order.city.toLowerCase().includes(term) ||
    orderStatusLabels[order.status]?.toLowerCase().includes(term) === true
  );
}

/**
 * Dialogo unico de asignacion. Configura ordenes, vehiculo y conductor a la vez
 * y delega la persistencia: el componente decide que seleccion mostrar, nunca
 * que operaciones ejecutar.
 *
 * Ambas variantes de entrada comparten el mismo calculo del plan, de modo que
 * la ruta fija y la orden fija producen resultados identicos para el mismo
 * estado.
 */
export function RouteAssignmentDialog({
  open,
  route,
  routes,
  lockedOrderId,
  vehicles,
  drivers,
  orders,
  isSubmitting,
  isLoading = false,
  warnings,
  failure,
  appliedOrderIds,
  onSelectedRouteChange,
  onSelectedVehicleChange,
  onSelectedDriverChange,
  onDismissWarnings,
  onClose,
  onSubmit,
}: RouteAssignmentDialogProps) {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [startRoute, setStartRoute] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isRouteFixed = route !== null;

  // Al abrir, la seleccion arranca en el estado vigente: el despachista solo
  // cambia lo que falta y el plan resultante sale vacio si no toca nada.
  // El reseteo se gatanta por identidad (ruta u orden en edicion), no por cada
  // refresco de `orders`, para no borrar la seleccion a mitad del guardado.
  const identityKey = `${route?.id ?? ''}|${lockedOrderId ?? ''}`;
  const lastIdentityKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastIdentityKey.current = null;
      return;
    }

    if (lastIdentityKey.current === identityKey) return;
    lastIdentityKey.current = identityKey;

    const inheritedRouteId =
      lockedOrderId ? (orders.find((order) => order.id === lockedOrderId)?.assignment.routeId ?? '') : '';

    const initialRouteId = route?.id ?? inheritedRouteId;

    setSelectedRouteId(initialRouteId);
    setSelectedOrderIds(route ? [...(route.orderIds ?? [])] : lockedOrderId ? [lockedOrderId] : []);
    setSelectedVehicleId(route?.vehicleId ?? '');
    setSelectedDriverId(route?.driverId ?? '');
    setStartRoute(false);
    setSearch('');
    setConfirmDiscard(false);

    onSelectedRouteChange(initialRouteId);
  }, [identityKey, lockedOrderId, onSelectedRouteChange, open, orders, route]);

  const selectedRoute = useMemo<RouteAssignmentSnapshot | null>(() => {
    if (route) return route;
    return routes.find((candidate) => candidate.id === selectedRouteId) ?? null;
  }, [route, routes, selectedRouteId]);

  const candidateOrders = useMemo(() => {
    if (lockedOrderId) {
      const found = orders.find((order) => order.id === lockedOrderId);
      return found ? [found] : [];
    }
    if (!selectedRoute) return [];
    return candidateOrdersForRoute(orders, selectedRoute);
  }, [lockedOrderId, orders, selectedRoute]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidateOrders.filter((order) => matchesSearch(order, term));
  }, [candidateOrders, search]);

  const availableVehicles = useMemo(
    () => (selectedRoute ? assignableVehicles(vehicles, selectedRoute) : []),
    [vehicles, selectedRoute],
  );

  const availableDrivers = useMemo(
    () => (selectedRoute ? assignableDrivers(drivers, selectedRoute) : []),
    [drivers, selectedRoute],
  );

  // La ruta que ya contiene la orden se excluye como candidata a cambiar, pero
  // sigue listada: es la que hay que mantener para poder completar vehiculo o
  // conductor sin desasignar la orden.
  const routeOptions = useMemo(() => {
    const inheritedRouteId = lockedOrderId ? (orders.find((order) => order.id === lockedOrderId)?.assignment.routeId ?? null) : null;
    const candidates = lockedOrderId ? candidateRoutesForOrder(routes, lockedOrderId) : routes;

    if (inheritedRouteId && !candidates.some((candidate) => candidate.id === inheritedRouteId)) {
      const inherited = routes.find((candidate) => candidate.id === inheritedRouteId);
      return inherited ? [inherited, ...candidates] : candidates;
    }

    return candidates;
  }, [lockedOrderId, orders, routes]);

  const plan = useMemo(() => {
    if (!selectedRoute) return null;
    return buildPlan(
      selectedRoute,
      { orderIds: selectedOrderIds, vehicleId: selectedVehicleId, driverId: selectedDriverId, startRoute },
      orders.map((order) => ({ id: order.id, status: order.status })),
    );
  }, [selectedRoute, selectedOrderIds, selectedVehicleId, selectedDriverId, startRoute, orders]);

  const lockedOrderStatusLabel = useMemo(() => {
  if (!lockedOrderId) return '';
  const status = orders.find((order) => order.id === lockedOrderId)?.status;
  return status ? (orderStatusLabels[status] ?? '') : '';
}, [lockedOrderId, orders]);

  const hasChanges = plan !== null && !isPlanEmpty(plan);
  const canSubmit = hasChanges && !isSubmitting && !isLoading && selectedRoute !== null;

  const toggleOrder = (orderId: string) => {
    if (lockedOrderId) return;
    setSelectedOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  };

  const requestClose = () => {
    if (warnings.length > 0 && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedRoute) return;
    onSubmit({ orderIds: selectedOrderIds, vehicleId: selectedVehicleId, driverId: selectedDriverId, startRoute });
  };

  return (
    <Dialog open={open} title="Asignar ruta" onClose={requestClose}>
      <div className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando datos de la ruta...</p>
        ) : null}

        {isRouteFixed && route ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold">Ruta:</span> {route.id} · {route.orderIds.length} orden(es) ·{' '}
            {route.finishedOrderIds.length} finalizada(s)
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="route-assignment-route">
              Ruta de destino
            </label>
            <Select
              id="route-assignment-route"
              value={selectedRouteId}
              onChange={(event) => {
                setSelectedRouteId(event.target.value);
                onSelectedVehicleChange('');
                onSelectedDriverChange('');
                setStartRoute(false);
                onSelectedRouteChange(event.target.value);
              }}
              className="w-full"
            >
              <option value="">Selecciona una ruta</option>
              {routeOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title} - Ruta #{candidate.id}
                </option>
              ))}
            </Select>
            {routeOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No hay rutas disponibles. Crea una ruta en Gestion de rutas antes de asignarla.
              </p>
            ) : (
              <p className="text-xs text-[#64748B]">El conductor y el vehiculo se heredan de la ruta seleccionada.</p>
            )}
          </div>
        )}

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ClipboardList className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            Ordenes
          </div>

          {lockedOrderId ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Orden #{lockedOrderId}</span>
              <span className="ml-2 text-[#64748B]">{lockedOrderStatusLabel}</span>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar orden por ID, destino o estado..."
                  className="pl-9"
                />
              </div>

              {candidateOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No hay ordenes disponibles para esta ruta. Las ordenes deben estar recibidas, en proceso o listas para despacho.
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Ninguna orden coincide con la busqueda.
                </div>
              ) : (
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {visibleOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => toggleOrder(order.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                          aria-pressed={isSelected}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              isSelected ? 'border-[#0F766E] bg-[#0F766E] text-white' : 'border-slate-300 bg-white'
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              Orden #{order.id} · {order.city}, {order.country}
                            </span>
                            <span className="block truncate text-xs text-[#64748B]">{order.addressLine}</span>
                          </span>
                          <span className="shrink-0 text-xs text-[#64748B]">
                            {order.weightKg} kg · {orderStatusLabels[order.status] ?? order.status}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {selectedOrderIds.length > 0 && candidateOrders.length !== selectedOrderIds.length ? (
                <p className="text-xs text-[#64748B]">
                  {selectedOrderIds.length} orden(es) incluidas. Las que ya pertenecen a la ruta se conservan sin volver a enviarlas.
                </p>
              ) : null}
            </>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-950" htmlFor="route-assignment-vehicle">
              <Truck className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              Vehiculo
            </label>
            <Select
              id="route-assignment-vehicle"
              value={selectedVehicleId}
              onChange={(event) => {
                setSelectedVehicleId(event.target.value);
                onSelectedVehicleChange(event.target.value);
              }}
              className="w-full"
              disabled={!selectedRoute}
            >
              <option value="">Selecciona un vehiculo</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} ({Number(vehicle.capacityKg ?? 0).toLocaleString('es-PE')} kg)
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-950" htmlFor="route-assignment-driver">
              <UserRound className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              Conductor
            </label>
            <Select
              id="route-assignment-driver"
              value={selectedDriverId}
              onChange={(event) => {
                setSelectedDriverId(event.target.value);
                onSelectedDriverChange(event.target.value);
              }}
              className="w-full"
              disabled={!selectedRoute}
            >
              <option value="">Selecciona un conductor</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName ?? driver.email} - {driver.licenceNumber}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedRoute?.status === 'PLANNED' ? (
          <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="route-assignment-start">
            <input
              id="route-assignment-start"
              type="checkbox"
              checked={startRoute}
              onChange={(event) => setStartRoute(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Iniciar la ruta al terminar
          </label>
        ) : null}

        {warnings.length > 0 ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#D97706]">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {warnings.length} orden(es) quedaron fuera de la ruta
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[#92400E]">
              {warnings.map((warning) => (
                <li key={warning.orderId}>
                  <span className="font-semibold">Orden #{warning.orderId}:</span> {warning.reason}
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              className="mt-2 h-8 px-2 text-xs"
              onClick={() => {
                onDismissWarnings();
                setConfirmDiscard(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Descartar avisos
            </Button>
          </div>
        ) : null}

        {failure ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-[#DC2626]">No se pudo completar la asignacion</p>
            <p className="mt-1 text-xs text-[#92400E]">{failure.reason}</p>
            {appliedOrderIds.length > 0 ? (
              <p className="mt-1 text-xs text-[#92400E]">
                Se aplicaron {appliedOrderIds.length} orden(es) antes del fallo.
              </p>
            ) : null}
          </div>
        ) : null}

        {confirmDiscard && warnings.length > 0 ? (
          <p className="text-xs font-medium text-[#D97706]">
            Hay avisos sin resolver. Confirma si quieres descartarlos y cerrar.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E8F0] pt-4">
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Guardar asignacion
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
