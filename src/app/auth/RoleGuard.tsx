import type { JSX, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useDispatch } from 'react-redux';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { logout } from '@/features/auth/store/authSlice';
import type { CoboxRole } from './roles';
import { useCoboxRoles } from './roles';

export type RoleGuardProps = {
  require: CoboxRole | readonly CoboxRole[];
  fallback?: 'forbidden' | 'login';
  children: ReactNode;
};

function requiredRoles(require: CoboxRole | readonly CoboxRole[]): readonly CoboxRole[] {
  return typeof require === 'string' ? [require] : require;
}

export function RoleGuard({ require: required, fallback = 'forbidden', children }: RoleGuardProps): JSX.Element {
  const { roles, hasRole: hasRequiredRole, isLoading, isAuthenticated } = useCoboxRoles();
  const dispatch = useDispatch();
  const { logout: auth0Logout } = useAuth0();

  // Mismo cierre de sesion que el Sidebar: limpiar la copia local antes de
  // terminar la sesion de Auth0.
  const handleLogout = () => {
    dispatch(logout());
    auth0Logout({ logoutParams: { returnTo: window.location.origin + '/auth/login' } });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  const granted = requiredRoles(required).some(hasRequiredRole);

  if (!granted) {
    // A missing role must never bounce to a driver-only area, so we stay here.
    if (fallback === 'login') return <Navigate to="/auth/login" replace />;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-[#EF4444]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-950">403 · No tienes permisos para esta sección</h2>
          <p className="mt-2 text-sm text-[#64748B]">Tu cuenta no tiene acceso a esta sección. Si crees que es un error, pide a un gestor que revise tus roles.</p>
          {/* /dashboard exige ROLE_MANAGER: volver ahi reproduciria este mismo 403
              sin barra lateral. Un conductor vuelve a su panel; el resto cierra sesion. */}
          {roles.includes('ROLE_DRIVER') ? (
            <Link to="/driver" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#0F766E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0b5f59]">
              Ir a mi panel de conductor
            </Link>
          ) : (
            <Button type="button" onClick={handleLogout} className="mt-6">
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}