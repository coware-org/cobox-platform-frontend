import { PageHeader } from '@/components/common';
import { Button, Card, Skeleton, useToast } from '@/components/ui';
import { ProfileAvatar, ProfileForm } from '../components';
import { useAccountProfile, useUpdateProfile } from '../hooks';
import { roleLabel } from '../services/profileMappers';
import type { UpdateProfilePayload } from '../types';

export function ProfilePage() {
  const { toast } = useToast();
  const profileQuery = useAccountProfile();
  const updateMutation = useUpdateProfile();
  const profile = profileQuery.account;

  const handleSubmit = async (payload: UpdateProfilePayload): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync(payload);
      toast({ title: 'Perfil actualizado', type: 'success' });
      return true;
    } catch {
      toast({ title: 'No se pudo guardar el perfil. Inténtalo nuevamente.', type: 'error' });
      return false;
    }
  };

  return (
    <>
      <PageHeader title="Perfil de usuario" description="Datos personales y resumen de tu cuenta." />
      <div className="px-4 md:px-8 py-6 space-y-6">
        {profileQuery.isLoading ? (
          <Card className="p-5" aria-label="Cargando perfil"><Skeleton className="h-40 w-full" /></Card>
        ) : profile ? (
          <>
            <Card className="flex items-center gap-4 p-5">
              <ProfileAvatar key={profile.auth0Subject} name={profile.name} photoUrl={profile.photoUrl} className="h-20 w-20 text-2xl" />
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold text-slate-950">{profile.name}</h2>
                <p className="break-all text-sm text-slate-500">{profile.email || 'Correo no disponible'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {profile.emailVerified === true ? 'Correo verificado' : profile.emailVerified === false ? 'Correo no verificado' : 'Verificación del correo no disponible'}
                </p>
              </div>
            </Card>
            {profileQuery.isSuccess && profileQuery.data === null ? (
              <p className="text-sm text-slate-600">Completa y guarda tus datos para crear tu perfil en CoBox.</p>
            ) : null}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {profileQuery.isError ? (
                  <Card className="p-5 space-y-3">
                    <p role="alert" className="text-sm text-[#EF4444]">No se pudo cargar el perfil de CoBox. Inténtalo nuevamente.</p>
                    <Button type="button" disabled={profileQuery.isFetching} onClick={() => void profileQuery.refetch()}>
                      {profileQuery.isFetching ? 'Cargando...' : 'Reintentar'}
                    </Button>
                  </Card>
                ) : null}
                {profileQuery.isError && profileQuery.data === undefined ? null : (
                  <ProfileForm key={profile.auth0Subject} profile={profile} isSubmitting={updateMutation.isPending} disabled={profileQuery.isError} onSubmit={handleSubmit} />
                )}
              </div>
              <Card className="p-5 space-y-3">
                <h2 className="text-sm font-semibold uppercase text-slate-500">Resumen de cuenta</h2>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Roles en CoBox</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {profile.roles.length ? profile.roles.map((role) => (
                      <span key={role} className="rounded bg-[#DFF6F1] px-2 py-0.5 text-xs font-medium text-[#0F766E]">{roleLabel(role)}</span>
                    )) : <p className="text-sm text-slate-500">No disponible</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">ID de CoBox</p>
                  <p className="mt-1 font-mono text-xs text-slate-900">{profile.id ?? 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">ID de Auth0</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-900">{profile.auth0Subject}</p>
                </div>
                {profile.active !== null ? (
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Estado de la cuenta en CoBox</p>
                    <p className="mt-1 text-sm text-slate-900">{profile.active ? 'Activa' : 'Inactiva'}</p>
                  </div>
                ) : null}
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-5"><p className="text-sm text-slate-500">Inicia sesión para ver tu perfil.</p></Card>
        )}
      </div>
    </>
  );
}
