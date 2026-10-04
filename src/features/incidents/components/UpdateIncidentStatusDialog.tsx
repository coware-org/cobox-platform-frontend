import { useState } from "react";
import { Button, Dialog, Select } from "@/components/ui";
import { incidentStatusLabels, incidentStatusTransitions } from "../labels";
import type { IncidentStatus, UpdateIncidentStatusPayload } from "../types";

type UpdateIncidentStatusDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  currentStatus: IncidentStatus;
  onClose: () => void;
  onSubmit: (payload: UpdateIncidentStatusPayload) => void;
};

export function UpdateIncidentStatusDialog({
  open,
  isSubmitting,
  currentStatus,
  onClose,
  onSubmit,
}: UpdateIncidentStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<IncidentStatus | "">("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newStatus || newStatus === currentStatus) {
      return;
    }

    onSubmit({ status: newStatus as IncidentStatus });
    setNewStatus("");
  };

  const availableTransitions = incidentStatusTransitions[currentStatus];

  return (
    <Dialog open={open} title="Cambiar Estado de Incidencia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
          <p className="text-sm text-blue-900">
            Estado actual:{" "}
            <span className="font-semibold">
              {incidentStatusLabels[currentStatus]}
            </span>
          </p>
        </div>

        {availableTransitions.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">
            Este incidente está en estado final y no puede cambiar.
          </p>
        ) : (
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nuevo Estado
            </label>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar estado...</option>
              {availableTransitions.map((status) => (
                <option key={status} value={status}>
                  {incidentStatusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting || !newStatus || availableTransitions.length === 0
            }
          >
            {isSubmitting ? "Actualizando..." : "Actualizar Estado"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
