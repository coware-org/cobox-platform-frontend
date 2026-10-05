import { Navigate, Outlet } from 'react-router-dom';
import { useCoboxRoles } from '@/app/auth';
import { Topbar } from './Topbar';

export function DriverLayout() {
  const { roles, isLoading, isAuthenticated } = useCoboxRoles();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || !roles.includes('ROLE_DRIVER')) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}