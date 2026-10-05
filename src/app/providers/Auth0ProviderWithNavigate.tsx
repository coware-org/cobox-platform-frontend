import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

type Auth0ProviderWithNavigateProps = {
  domain: string;
  clientId: string;
  audience?: string;
  children: ReactNode;
};

export function Auth0ProviderWithNavigate({
  domain,
  clientId,
  audience,
  children,
}: Auth0ProviderWithNavigateProps) {
  const navigate = useNavigate();

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
        ...(audience ? { audience } : {}),
      }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        navigate(appState?.returnTo ?? '/dashboard');
      }}
    >
      {children}
    </Auth0Provider>
  );
}
