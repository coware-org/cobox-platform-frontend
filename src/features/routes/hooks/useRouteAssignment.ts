import { useCallback, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from '@/components/ui';
import { ordersService } from '@/features/orders/services';
import type { OrderStatus } from '@/features/orders/types';
import {
  useAddOrderToRoute,
  useAssignDriverToRoute,
  useAssignVehicleToRoute,
  useMarkRouteInProgress,
} from '../hooks';
import { buildPlan } from '../services/routeAssignmentPlan';
import type {
  OrderCandidate,
  RouteAssignmentPlan,
  RouteAssignmentSelection,
  RouteAssignmentSnapshot,
} from '../services/routeAssignmentPlan';

export type RouteAssignmentStep = 'MARK_ORDER_READY' | 'ADD_ORDER' | 'ASSIGN_VEHICLE' | 'ASSIGN_DRIVER' | 'START_ROUTE';

export type OrderWarning = {
  orderId: string;
  reason: string;
};

export type RouteAssignmentFailure = {
  routeId: string;
  step: RouteAssignmentStep;
  orderId: string | null;
  reason: string;
};

export type RouteAssignmentOutcome = 'SUCCEEDED' | 'PARTIAL' | 'FAILED';

export type SubmitRouteAssignmentInput = {
  route: RouteAssignmentSnapshot;
  selection: RouteAssignmentSelection;
  orders: OrderCandidate[];
  title?: string;
};

export type SubmitRouteAssignmentResult = {
  outcome: RouteAssignmentOutcome;
  appliedOrderIds: string[];
  warnings: OrderWarning[];
  failure: RouteAssignmentFailure | null;
  plan: RouteAssignmentPlan;
};

const stepLabels: Record<RouteAssignmentStep, string> = {
  MARK_ORDER_READY: 'marcar la orden como lista para despacho',
  ADD_ORDER: 'agregar la orden a la ruta',
  ASSIGN_VEHICLE: 'asignar el vehiculo',
  ASSIGN_DRIVER: 'asignar el conductor',
  START_ROUTE: 'iniciar la ruta',
};

function failureReason(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message && message.trim()) return message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function orderRef(orderId: string): string {
  return `Orden #${orderId}`;
}

/**
 * Ejecuta el plan de asignacion en orden y distingue dos clases de fallo:
 * el marcado de estado degrada una sola orden y continua, mientras que
 * cualquier otra operacion detiene la secuencia e informa el paso.
 *
 * Las advertencias se acumulan por ruta en memoria de la pagina, de modo que
 * sobreviven al cierre del dialogo y reaparecen al reabrirlo.
 */
export function useAssignRoutePlan() {
  const { toast } = useToast();
  const addOrderToRoute = useAddOrderToRoute();
  const assignVehicleToRoute = useAssignVehicleToRoute();
  const assignDriverToRoute = useAssignDriverToRoute();
  const markRouteInProgress = useMarkRouteInProgress();

  const [warningsByRoute, setWarningsByRoute] = useState<Record<string, OrderWarning[]>>({});
  const [lastFailure, setLastFailure] = useState<RouteAssignmentFailure | null>(null);
  const [appliedOrderIds, setAppliedOrderIds] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);

  const dismissWarnings = useCallback((routeId: string) => {
    setWarningsByRoute((current) => {
      if (!(routeId in current)) return current;
      const next = { ...current };
      delete next[routeId];
      return next;
    });
  }, []);

  const submit = useCallback(
    async (input: SubmitRouteAssignmentInput): Promise<SubmitRouteAssignmentResult> => {
      const { route, selection, orders } = input;
      const plan = buildPlan(route, selection, orders);

      const warnings: OrderWarning[] = [];
      const applied: string[] = [];

      if (inFlight.current) {
        return { outcome: 'FAILED', appliedOrderIds: [], warnings: [], failure: null, plan };
      }

      inFlight.current = true;
      setIsPending(true);
      setAppliedOrderIds([]);

      const statusByOrderId = new Map(orders.map((order) => [order.id, order.status]));
      const routeLabel = input.title ?? `Ruta #${route.id}`;

      const fail = async (step: RouteAssignmentStep, orderId: string | null, error: unknown): Promise<SubmitRouteAssignmentResult> => {
        const failure: RouteAssignmentFailure = {
          routeId: route.id,
          step,
          orderId,
          reason: failureReason(error, `No se pudo ${stepLabels[step]}.`),
        };
        setLastFailure(failure);

        const result: SubmitRouteAssignmentResult = {
          outcome: 'FAILED',
          appliedOrderIds: applied,
          warnings,
          failure,
          plan,
        };

        toast({
          title: failure.orderId ? `${orderRef(failure.orderId)}: ${failure.reason}` : failure.reason,
          type: 'error',
          details: applied.length > 0
            ? [`Ya se aplico en ${routeLabel}: ${applied.length} orden(es).`]
            : undefined,
        });

        return result;
      };

      try {
        for (const orderId of plan.orderIdsToMarkReady) {
          const status = statusByOrderId.get(orderId);
          if (status !== ('RECEIVED' satisfies OrderStatus) && status !== ('PROCESSING' satisfies OrderStatus)) {
            continue;
          }

          try {
            await ordersService.markReadyForDispatch(orderId);
          } catch (error) {
            warnings.push({ orderId, reason: failureReason(error, 'No se pudo marcar como lista para despacho.') });
          }
        }

        const warnedOrderIds = new Set(warnings.map((warning) => warning.orderId));

        for (const orderId of plan.orderIdsToAdd) {
          if (warnedOrderIds.has(orderId)) continue;

          try {
            await addOrderToRoute.mutateAsync({ routeId: route.id, payload: { orderId } });
            applied.push(orderId);
            setAppliedOrderIds([...applied]);
          } catch (error) {
            return await fail('ADD_ORDER', orderId, error);
          }
        }

        if (plan.vehicleIdToAssign) {
          try {
            await assignVehicleToRoute.mutateAsync({ routeId: route.id, payload: { vehicleId: plan.vehicleIdToAssign } });
          } catch (error) {
            return await fail('ASSIGN_VEHICLE', null, error);
          }
        }

        if (plan.driverIdToAssign) {
          try {
            await assignDriverToRoute.mutateAsync({ routeId: route.id, payload: { driverId: plan.driverIdToAssign } });
          } catch (error) {
            return await fail('ASSIGN_DRIVER', null, error);
          }
        }

        if (plan.shouldStartRoute) {
          try {
            await markRouteInProgress.mutateAsync(route.id);
          } catch (error) {
            return await fail('START_ROUTE', null, error);
          }
        }

        setWarningsByRoute((current) =>
          warnings.length > 0 ? { ...current, [route.id]: warnings } : current,
        );
        setLastFailure(null);

        if (warnings.length > 0) {
          toast({
            title: `${warnings.length} orden(es) quedaron fuera de ${routeLabel}.`,
            type: 'warning',
            details: warnings.map((warning) => `${orderRef(warning.orderId)}: ${warning.reason}`),
          });

          return { outcome: 'PARTIAL', appliedOrderIds: applied, warnings, failure: null, plan };
        }

        toast({ title: `Asignacion guardada en ${routeLabel}.`, type: 'success' });
        return { outcome: 'SUCCEEDED', appliedOrderIds: applied, warnings: [], failure: null, plan };
      } finally {
        inFlight.current = false;
        setIsPending(false);
      }
    },
    [addOrderToRoute, assignDriverToRoute, assignVehicleToRoute, markRouteInProgress, toast],
  );

  return useMemo(
    () => ({
      submit,
      dismissWarnings,
      isPending,
      appliedOrderIds,
      warningsByRoute,
      lastFailure,
    }),
    [submit, dismissWarnings, isPending, appliedOrderIds, warningsByRoute, lastFailure],
  );
}
