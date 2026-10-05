import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { setAuthTokenGetter } from '@/lib';

export function Auth0TokenBridge({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();

  const queryClient = useQueryClient();
  const previousSubject = useRef<string | null | undefined>(undefined);
  const subject = isAuthenticated ? user?.sub ?? null : null;

  useEffect(() => {
    if (isLoading) return;
    if (previousSubject.current !== undefined && previousSubject.current !== subject) {
      queryClient.clear();
    }
    previousSubject.current = subject;
    if (isAuthenticated) {
      setAuthTokenGetter(async () => {
        const token = await getAccessTokenSilently();
        if (!token) throw new Error('No se recibió un token de acceso.');
        return token;
      });
    } else {
      setAuthTokenGetter(null);
    }
  }, [isAuthenticated, isLoading, subject, queryClient, getAccessTokenSilently]);

  return <>{children}</>;
}
