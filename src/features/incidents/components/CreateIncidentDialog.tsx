import { useState } from "react";
import { Button, Dialog, Input, Select } from "@/components/ui";
import type { CreateIncidentPayload, IncidentSeverity } from "../types";

type CreateIncidentDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateIncidentPayload) => void;
};

export function CreateIncidentDialog({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateIncidentDialogProps) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // Validaciones
    if (!type.trim()) {
      setError("El tipo de incidencia es obligatorio");
      return;
    }
    if (type.length > 255) {
      setError("El tipo no puede exceder 255 caracteres");
      return;
    }
    if (!description.trim()) {
      setError("La descripción es obligatoria");
      return;
    }
    if (description.length < 5) {
      setError("La descripción debe tener al menos 5 caracteres");
      return;
    }
    if (description.length > 2000) {
      setError("La descripción no puede exceder 2000 caracteres");
      return;
    }
    const parsedResponsibleId = Number(responsibleUserId);
    if (!responsibleUserId.trim() || !Number.isInteger(parsedResponsibleId)) {
      setError("Debe especificar un usuario responsable");
      return;
    }

    setError(null);
    onSubmit({
      type: type.trim(),
      description: description.trim(),
      severity,
      responsibleUserId: parsedResponsibleId,
    });

    // Reset form
    setType("");
    setDescription("");
    setSeverity("MEDIUM");
    setResponsibleUserId("");
  };

  return (
    <Dialog open={open} title="Reportar Nueva Incidencia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm font-medium text-[#DC2626] bg-red-50 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tipo de Incidencia
          </label>
          <Input
            id="type"
            type="text"
            placeholder="ej: Equipment Failure, Delivery Delay"
            value={type}
            onChange={(e) => setType(e.target.value)}
            maxLength={255}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">{type.length}/255</p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descripción
          </label>
          <textarea
            id="description"
            placeholder="Describa detalladamente el incidente..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            {description.length}/2000
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="severity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Severidad
            </label>
            <Select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              disabled={isSubmitting}
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="responsibleUserId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usuario Responsable (ID)
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
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Reportando..." : "Reportar Incidencia"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
