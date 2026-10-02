import { useState, useEffect } from 'react';
import { Button, Dialog, Input } from '@/components/ui';
import type { Route } from '@/features/routes/types';

type CompleteOrderDialogProps = {
  open: boolean;
  assignedRouteId?: string;
  routes: Route[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { routeId: number; photoUrl: string; receiverName: string; signatureData: string }) => void;
};

export function CompleteOrderDialog({
  open,
  assignedRouteId,
  routes,
  isSubmitting,
  onClose,
  onSubmit,
}: CompleteOrderDialogProps) {
  const [routeId, setRouteId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync with assignedRouteId if provided
  useEffect(() => {
    if (assignedRouteId) {
      setRouteId(assignedRouteId);
    } else {
      setRouteId('');
    }
  }, [assignedRouteId, open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!routeId) {
      setError('Debe seleccionar o ingresar una ruta asociada');
      return;
    }
    if (!receiverName.trim()) {
      setError('El nombre del receptor es obligatorio');
      return;
    }
    if (!photoUrl.trim()) {
      setError('La evidencia fotografica de la entrega es obligatoria');
      return;
    }

    onSubmit({
      routeId: Number(routeId),
      photoUrl: photoUrl.trim(),
      receiverName: receiverName.trim(),
      signatureData: signatureData.trim(),
    });
  };

  return (
    <Dialog open={open} title="Finalizar y Entregar Orden" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm font-medium text-[#DC2626]">{error}</p>}
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Ruta Asociada</label>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">Seleccione una ruta</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.status === 'IN_PROGRESS' ? 'En progreso' : r.status === 'PLANNED' ? 'Pendiente' : 'Completada'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre de quien recibe</label>
          <Input
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Ej. Juan Carlos Pérez"
            className="mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Evidencia (Foto URL) *</label>
          <Input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Datos de Firma</label>
          <Input
            value={signatureData}
            onChange={(e) => setSignatureData(e.target.value)}
            placeholder="Opcional"
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : 'Completar Entrega'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
