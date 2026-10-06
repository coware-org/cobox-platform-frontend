import { useEffect, useState } from "react";
import { Dialog, Button, Input, Select } from "@/components/ui";
import { vehicleSchema } from "../schemas/vehicle.schema";
import type { CreateVehiclePayload, Vehicle } from "@/modules/fleet.types";

type VehicleFormDialogProps = {
  open: boolean;
  initialVehicle?: Vehicle | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehiclePayload) => void;
};

type VehicleFormValues = {
  plate: string;
  capacity: string;
  status: CreateVehiclePayload["status"];
  model: string;
};

const emptyVehicle: VehicleFormValues = {
  plate: "",
  capacity: "",
  status: "operational",
  model: "",
};

function vehicleToForm(vehicle: Vehicle | null | undefined): VehicleFormValues {
  if (!vehicle) return { ...emptyVehicle };
  return {
    plate: vehicle.plate,
    capacity: vehicle.capacity === null || vehicle.capacity === undefined ? "" : String(vehicle.capacity),
    status: vehicle.status,
    model: vehicle.model,
  };
}

export function VehicleFormDialog({
  open,
  initialVehicle,
  isSubmitting,
  onClose,
  onSubmit,
}: VehicleFormDialogProps) {
  const [form, setForm] = useState<VehicleFormValues>(vehicleToForm(initialVehicle));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(vehicleToForm(initialVehicle));
      setError(null);
    }
  }, [open, initialVehicle]);

  const updateField = <K extends keyof VehicleFormValues>(field: K, value: VehicleFormValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    const payload: CreateVehiclePayload = {
      plate: form.plate,
      capacity: Number(form.capacity),
      status: form.status,
      model: form.model,
    };
    const result = vehicleSchema.safeParse(payload);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Formulario invalido");
      return;
    }

    setError(null);
    onSubmit(result.data);
  };

  return (
    <Dialog
      open={open}
      title={initialVehicle ? "Editar vehiculo" : "Agregar vehiculo"}
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Matricula
          <Input
            value={form.plate}
            onChange={(event) => updateField("plate", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Capacidad
          <Input
            type="number"
            value={form.capacity}
            onChange={(event) => updateField("capacity", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado
          <Select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value as VehicleFormValues["status"])}
          >
            <option value="operational">Operativo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="out_of_service">Fuera de servicio</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Modelo
          <Input
            value={form.model}
            onChange={(event) => updateField("model", event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm font-medium text-[#EF4444]">{error}</p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {initialVehicle ? 'Guardar cambios' : 'Agregar vehiculo'}
        </Button>
      </div>
    </Dialog>
  );
}
