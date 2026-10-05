import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Auth0Context } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import { vite } from './helpers/vite.mjs';

const { ProfilePage } = await vite.ssrLoadModule('/src/features/profile/pages/ProfilePage.tsx');
const { ProfileAvatar } = await vite.ssrLoadModule('/src/features/profile/components/ProfileAvatar.tsx');
const { Topbar } = await vite.ssrLoadModule('/src/components/layouts/Topbar.tsx');
const { ToastContext } = await vite.ssrLoadModule('/src/components/ui/toast-context.ts');
const { fleetApi } = await vite.ssrLoadModule('/src/services/api.ts');
const { profileService } = await vite.ssrLoadModule('/src/features/profile/services/profileService.ts');
const { setAuthTokenGetter } = await vite.ssrLoadModule('/src/lib/auth0Token.ts');
const google = {
  sub: 'google-oauth2|example', email: 'jhon@example.test', email_verified: true,
  name: 'Jhon Galvez', given_name: 'Jhon', family_name: 'Galvez', picture: 'https://images.example.test/google.jpg',
};
const stored = {
  id: 42, auth0Subject: google.sub, email: google.email, firstName: 'Juan', lastName: 'Gálvez',
  phone: '', roles: ['ROLE_MANAGER'], active: true, profilePhotoUrl: 'https://images.example.test/custom.jpg',
};

function renderAccount(Component, { user = google, profile = stored, loading = false, client = new QueryClient(), seed = true } = {}) {
  if (seed) client.setQueryData(['profile', 'me', user.sub], profile);
  const html = renderToStaticMarkup(
    createElement(Auth0Context.Provider, { value: { user, isAuthenticated: true, isLoading: loading } },
      createElement(QueryClientProvider, { client },
        createElement(MemoryRouter, null,
          createElement(ToastContext.Provider, { value: { toast: () => {} } }, createElement(Component)),
        ),
      ),
    ),
  );
  client.clear();
  return html;
}

test('barra superior muestra el perfil real y enlaza a la página de perfil', () => {
  const html = renderAccount(Topbar);
  assert.match(html, /Juan Gálvez/);
  assert.match(html, /Gestor/);
  assert.match(html, /custom\.jpg/);
  assert.match(html, /href="\/profile"/);
  assert.doesNotMatch(html, /Admin Usuario|Administrador/);
});

test('perfil separa IDs, muestra la verificación y elimina campos sin persistencia', () => {
  const html = renderAccount(ProfilePage);
  assert.match(html, /Correo verificado/);
  assert.match(html, /ID de CoBox/);
  assert.match(html, />42</);
  assert.match(html, /ID de Auth0/);
  assert.match(html, /google-oauth2\|example/);
  assert.match(html, /id="profile-firstName"[^>]*value="Juan"/);
  assert.match(html, /id="profile-lastName"[^>]*value="Gálvez"/);
  assert.doesNotMatch(html, /profile-name"|profile-locale|Idioma \/ Region/);
});

test('un perfil inexistente permite completar los datos de Google', () => {
  const html = renderAccount(ProfilePage, { profile: null });
  assert.match(html, /crear tu perfil en CoBox/);
  assert.match(html, /id="profile-firstName"[^>]*value="Jhon"/);
  assert.match(html, /id="profile-lastName"[^>]*value="Galvez"/);
  assert.match(html, /google\.jpg/);
  assert.match(html, /<form/);
});

test('usuario y contraseña muestra respaldo y solicita nombres faltantes', () => {
  const html = renderAccount(ProfilePage, { user: { sub: 'auth0|example', nickname: 'usuario', email: 'password@example.test', email_verified: false }, profile: null });
  assert.match(html, /Correo no verificado/);
  assert.match(html, /Avatar de usuario/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /id="profile-firstName"[^>]*required=""[^>]*value=""/);
});

test('la cuenta sin claim de verificación muestra estado desconocido', () => {
  const html = renderAccount(ProfilePage, { user: { ...google, email_verified: undefined } });
  assert.match(html, /Verificación del correo no disponible/);
  assert.doesNotMatch(html, /Correo verificado|Correo no verificado/);
});

test('durante la carga se muestra un estado accesible', () => {
  const html = renderAccount(Topbar, { loading: true });
  assert.match(html, /aria-label="Cargando cuenta"/);
  assert.doesNotMatch(html, /Juan Gálvez/);
});

test('un error de permisos conserva la identidad y ofrece reintento sin formulario ni skeleton perpetuo', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await client.fetchQuery({
    queryKey: ['profile', 'me', google.sub],
    queryFn: () => Promise.reject(new AxiosError('Forbidden', undefined, undefined, undefined, { status: 403 })),
  }).catch(() => {});
  const html = renderAccount(ProfilePage, { client, seed: false });
  assert.match(html, /Jhon Galvez/);
  assert.match(html, /No se pudo cargar el perfil de CoBox/);
  assert.match(html, /Reintentar/);
  assert.doesNotMatch(html, /<form|Cargando perfil|crear tu perfil/);
});

test('la caché del usuario anterior no aparece al cambiar de cuenta', () => {
  const client = new QueryClient();
  client.setQueryData(['profile', 'me', google.sub], stored);
  const html = renderAccount(Topbar, { client, user: { sub: 'auth0|other', name: 'Otra persona', email: 'other@example.test' }, profile: null });
  assert.match(html, /Otra persona/);
  assert.doesNotMatch(html, /Juan|Gálvez|Gestor|custom\.jpg/);
});

test('un error de actualización mantiene montado el formulario previo y bloquea el guardado', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['profile', 'me', google.sub], stored);
  await client.fetchQuery({
    queryKey: ['profile', 'me', google.sub], staleTime: 0,
    queryFn: () => Promise.reject(new AxiosError('Network Error')),
  }).catch(() => {});
  const html = renderAccount(ProfilePage, { client, seed: false });
  assert.match(html, /Juan Gálvez/);
  assert.match(html, /No se pudo cargar el perfil de CoBox/);
  assert.match(html, /<form/);
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /type="submit"[^>]*disabled=""/);
});

test('avatar sin imagen proporciona iniciales accesibles', () => {
  const html = renderToStaticMarkup(createElement(ProfileAvatar, { name: 'Jhon Galvez', photoUrl: null }));
  assert.match(html, /aria-label="Avatar de Jhon Galvez"/);
  assert.match(html, />JG</);
  assert.doesNotMatch(html, /<img/);
});

test('servicio distingue perfil inexistente, denegación y fallo de red', async () => {
  const originalAdapter = fleetApi.defaults.adapter;
  try {
    for (const status of [404, 401, 403, 500]) {
      fleetApi.defaults.adapter = async (config) => {
        throw new AxiosError('error', undefined, config, undefined, { status });
      };
      if (status === 404) assert.equal(await profileService.getProfile(), null);
      else await assert.rejects(profileService.getProfile(), (error) => error.response.status === status);
    }
    fleetApi.defaults.adapter = async () => { throw new AxiosError('Network Error'); };
    await assert.rejects(profileService.getProfile(), /Network Error/);
  } finally {
    fleetApi.defaults.adapter = originalAdapter;
  }
});

test('el servicio guarda y vuelve a leer el perfil con JWT y el contrato existente', async () => {
  const originalAdapter = fleetApi.defaults.adapter;
  setAuthTokenGetter(async () => 'example-token');
  let saved;
  const calls = [];
  fleetApi.defaults.adapter = async (config) => {
    assert.equal(config.url, '/api/v1/users/me');
    assert.equal(config.headers.Authorization, 'Bearer example-token');
    calls.push(config.method);
    if (config.method === 'put') saved = JSON.parse(config.data);
    return { config, status: config.method === 'put' ? 201 : 200, statusText: 'OK', headers: {}, data: { ...stored, ...saved } };
  };
  try {
    const payload = { email: google.email, firstName: 'Jhon', lastName: 'Galvez', phone: null, profilePhotoUrl: google.picture };
    const updated = await profileService.updateProfile(payload);
    const reloaded = await profileService.getProfile();
    assert.deepEqual(saved, payload);
    assert.deepEqual(calls, ['put', 'get']);
    assert.equal(updated.id, 42);
    assert.deepEqual(reloaded, updated);
    assert.equal(reloaded.profilePhotoUrl, google.picture);
  } finally {
    fleetApi.defaults.adapter = originalAdapter;
    setAuthTokenGetter(null);
  }
});
