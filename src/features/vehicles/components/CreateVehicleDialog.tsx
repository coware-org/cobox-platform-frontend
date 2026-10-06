import { useEffect, useState } from 'react';
import { Button, Dialog, Input } from '@/components/ui';
import type { CreateVehiclePayload } from '../types';
import { validateCreateVehicle } from '../validations';

type CreateVehicleDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehiclePayload) => void;
};

const emptyForm = {
  plateNumber: '',
  capacityKg: '',
};

export function CreateVehicleDialog({ open, isSubmitting, onClose, onSubmit }: CreateVehicleDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const payload = {
      plateNumber: form.plateNumber.trim(),
      capacityKg: Number(form.capacityKg),
    };
    const validationError = validateCreateVehicle(payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit(payload);
  };

  return (
    <Dialog open={open} title="Crear vehiculo" onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Placa
          <Input
            value={form.plateNumber}
            maxLength={50}
            onChange={(event) => setForm((current) => ({ ...current, plateNumber: event.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Capacidad kg
          <Input
            type="number"
            min={0}
            value={form.capacityKg}
            onChange={(event) => setForm((current) => ({ ...current, capacityKg: event.target.value }))}
          />
        </label>
      </div>
      {error ? <p className="mt-4 text-sm font-medium text-[#EF4444]">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          Crear vehiculo
        </Button>
      </div>
    </Dialog>
  );
}
