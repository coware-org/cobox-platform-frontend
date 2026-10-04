import { Dialog, Button, Select } from '@/components/ui';
import type { Route } from '@/features/routes/types';

type AssignRouteToOrderDialogProps = {
  open: boolean;
  orderId: string;
  routes: Route[];
  isSubmitting: boolean;
  isLoading: boolean;
  selectedRouteId: string;
  onSelectedRouteChange: (routeId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

/**
 * Asigna una ruta a la orden seleccionada. El conductor y el vehículo no se
 * eligen aquí: la orden los hereda de la ruta elegida.
 */
export function AssignRouteToOrderDialog({
  open,
  orderId,
  routes,
  isSubmitting,
  isLoading,
  selectedRouteId,
  onSelectedRouteChange,
  onClose,
  onSubmit,
}: AssignRouteToOrderDialogProps) {
  const candidateRoutes = routes.filter((route) => route.status !== 'COMPLETED' && !route.orderIds.includes(orderId));

  return (
    <Dialog open={open} title="Asignar ruta a la orden" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Orden #{orderId}</p>
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Cargando rutas disponibles...
          </div>
        ) : candidateRoutes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No hay rutas disponibles. Crea una ruta en Gestion de rutas antes de asignarla.
          </div>
        ) : (
          <Select value={selectedRouteId} onChange={(event) => onSelectedRouteChange(event.target.value)} className="w-full">
            <option value="">Selecciona una ruta</option>
            {candidateRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.title} - Ruta #{route.id}
              </option>
            ))}
          </Select>
        )}
        <p className="text-xs text-[#64748B]">
          El conductor y el vehículo se heredan de la ruta seleccionada.
        </p>
        <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={!selectedRouteId || isSubmitting || isLoading}>
            Asignar ruta
          </Button>
        </div>
      </div>
    </Dialog>
  );
}