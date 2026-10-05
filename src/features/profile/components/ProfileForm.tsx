import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { toProfilePayload } from '../services/profileMappers';
import type { AccountProfile, ProfileValues, UpdateProfilePayload } from '../types';

type ProfileFormProps = {
  profile: AccountProfile;
  isSubmitting: boolean;
  disabled?: boolean;
  onSubmit: (payload: UpdateProfilePayload) => Promise<boolean>;
};

export function ProfileForm({ profile, isSubmitting, disabled = false, onSubmit }: ProfileFormProps) {
  const [draft, setDraft] = useState<ProfileValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const values = draft ?? { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone };

  const edit = (field: keyof ProfileValues, value: string) => {
    setDraft({ ...values, [field]: value });
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || disabled) return;
    setError(null);
    try {
      const payload = toProfilePayload(profile, values);
      if (await onSubmit(payload)) setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    }
  };

  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <h2 className="font-semibold text-slate-950">Datos personales</h2>
        <p className="text-sm text-slate-500">Estos cambios se guardan en CoBox.</p>
        <div className="space-y-1">
          <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700">Correo de la cuenta</label>
          <Input id="profile-email" type="email" value={profile.email} readOnly />
        </div>
        <fieldset disabled={isSubmitting || disabled} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="profile-firstName" className="block text-sm font-medium text-slate-700">Nombres</label>
            <Input id="profile-firstName" autoComplete="given-name" value={values.firstName} required maxLength={60} onChange={(event) => edit('firstName', event.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="profile-lastName" className="block text-sm font-medium text-slate-700">Apellidos</label>
            <Input id="profile-lastName" autoComplete="family-name" value={values.lastName} required maxLength={60} onChange={(event) => edit('lastName', event.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700">Teléfono</label>
            <Input id="profile-phone" type="tel" autoComplete="tel" value={values.phone} maxLength={20} onChange={(event) => edit('phone', event.target.value)} />
          </div>
        </fieldset>
        {!profile.email ? <p role="alert" className="text-sm text-[#EF4444]">No hay un correo disponible para guardar el perfil.</p> : null}
        {error ? <p role="alert" className="text-sm text-[#EF4444]">{error}</p> : null}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || disabled || !profile.email}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Card>
  );
}
