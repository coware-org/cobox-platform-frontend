import { useState } from "react";
import { Button, Dialog, Input } from "@/components/ui";
import type { AssignResponsiblePayload } from "../types";

type AssignResponsibleDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  currentResponsibleId?: number;
  onClose: () => void;
  onSubmit: (payload: AssignResponsiblePayload) => void;
};

export function AssignResponsibleDialog({
  open,
  isSubmitting,
  currentResponsibleId,
  onClose,
  onSubmit,
}: AssignResponsibleDialogProps) {
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const parsedId = Number(responsibleUserId);

    if (!responsibleUserId.trim() || !Number.isInteger(parsedId)) {
      setError("Debe especificar un ID de usuario válido");
      return;
    }

    if (parsedId === currentResponsibleId) {
      setError("El usuario ya está asignado a este incidente");
      return;
    }

    setError(null);
    onSubmit({ responsibleUserId: parsedId });
    setResponsibleUserId("");
  };

  return (
    <Dialog open={open} title="Asignar Usuario Responsable" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm font-medium text-[#DC2626] bg-red-50 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        {currentResponsibleId && (
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <p className="text-sm text-slate-900">
              Usuario actual:{" "}
              <span className="font-semibold">ID {currentResponsibleId}</span>
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="responsibleUserId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            ID del Usuario Responsable
          </label>
          <Input
            id="responsibleUserId"
            type="number"
            placeholder="ej: 123"
            value={responsibleUserId}
            onChange={(e) => setResponsibleUserId(e.target.value)}
            disabled={isSubmitting}
            min={1}
          />
          <p className="text-xs text-gray-500 mt-1">
            Ingrese el ID numérico del usuario responsable
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !responsibleUserId}>
            {isSubmitting ? "Asignando..." : "Asignar Responsable"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
