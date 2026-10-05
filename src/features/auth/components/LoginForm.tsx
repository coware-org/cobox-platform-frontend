import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui';

export function LoginForm() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
  } = useAuth0();

  const returnTo = '/dashboard';

  const login = () =>
    loginWithRedirect({ appState: { returnTo } });
  const signup = () =>
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: { screen_hint: 'signup' },
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-slate-500">Cargando...</p>
        <Button type="button" disabled className="w-full">
          Cargando...
        </Button>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm font-medium text-[#EF4444]">{error.message}</p>
      ) : null}
      <Button type="button" onClick={login} className="w-full">
        Ingresar
      </Button>
      <Button
        type="button"
        onClick={signup}
        variant="secondary"
        className="w-full"
      >
        Registrarse
      </Button>
    </div>
  );
}