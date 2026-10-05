import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeProfile, profilePhotoUrl, roleLabel, toProfilePayload } from '../src/features/profile/services/profileMappers.ts';
import type { UserProfile } from '../src/features/profile/types/index.ts';

const google = {
  sub: 'google-oauth2|example', email: 'jhon@example.test', email_verified: true,
  name: 'Jhon Galvez', given_name: 'Jhon', family_name: 'Galvez', nickname: 'jhon',
  picture: 'https://lh3.googleusercontent.com/example=s96-c',
};
const stored: UserProfile = {
  id: 42, auth0Subject: google.sub, email: google.email, firstName: 'Juan', lastName: 'Gálvez',
  phone: '+51999999999', roles: ['ROLE_MANAGER'], active: true, profilePhotoUrl: 'https://images.example.test/custom.jpg',
};

test('Google proporciona nombre, foto y correo verificado sin un perfil interno', () => {
  const profile = composeProfile(google);
  assert.equal(profile.name, 'Jhon Galvez');
  assert.equal(profile.photoUrl, google.picture);
  assert.equal(profile.emailVerified, true);
  assert.equal(profile.id, null);
  assert.equal(profile.auth0Subject, google.sub);
  assert.deepEqual(profile.roles, []);
});

test('las ediciones de CoBox y sus roles tienen prioridad sobre Google', () => {
  const profile = composeProfile(google, stored);
  assert.equal(profile.name, 'Juan Gálvez');
  assert.equal(profile.photoUrl, stored.profilePhotoUrl);
  assert.equal(profile.phone, stored.phone);
  assert.deepEqual(profile.roles, ['ROLE_MANAGER']);
  assert.equal(profile.id, 42);
});

test('Auth0 completa campos vacíos individualmente sin sustituir los existentes', () => {
  const profile = composeProfile(google, { ...stored, firstName: '  ', profilePhotoUrl: null });
  assert.equal(profile.firstName, 'Jhon');
  assert.equal(profile.lastName, 'Gálvez');
  assert.equal(profile.photoUrl, google.picture);
});

test('usuario y contraseña funciona sin nombre detallado ni foto', () => {
  const profile = composeProfile({ sub: 'auth0|example', email: 'password@example.test', nickname: 'password', email_verified: false });
  assert.equal(profile.name, 'password');
  assert.equal(profile.emailVerified, false);
  assert.equal(profile.photoUrl, null);
  assert.equal(profile.firstName, '');
  assert.equal(profile.lastName, '');
});

test('verificación ausente es desconocida y no se aplica a un correo interno diferente', () => {
  assert.equal(composeProfile({ sub: google.sub }, stored).emailVerified, null);
  assert.equal(composeProfile({ sub: google.sub, email_verified: true }, stored).emailVerified, null);
  const profile = composeProfile({ ...google, email: 'new@example.test' }, stored);
  assert.equal(profile.email, 'new@example.test');
  assert.equal(profile.emailVerified, true);
});

test('otra cuenta nunca hereda el ID, roles, nombre ni foto guardados', () => {
  const profile = composeProfile({ sub: 'auth0|other', email: 'other@example.test' }, stored);
  assert.equal(profile.name, 'other@example.test');
  assert.equal(profile.id, null);
  assert.equal(profile.phone, '');
  assert.equal(profile.photoUrl, null);
  assert.deepEqual(profile.roles, []);
  assert.equal(composeProfile({}, stored).email, '');
});

test('guardar envía el contrato IAM, normaliza los campos y conserva la foto propia', () => {
  const payload = toProfilePayload(composeProfile(google, stored), { firstName: ' Juan ', lastName: ' Gálvez ', phone: ' ' });
  assert.deepEqual(payload, {
    email: google.email, firstName: 'Juan', lastName: 'Gálvez', phone: null, profilePhotoUrl: stored.profilePhotoUrl,
  });
  assert.ok(!('name' in payload) && !('locale' in payload) && !('roles' in payload) && !('auth0Subject' in payload));
});

test('crear el perfil importa la foto de Google únicamente al guardar', () => {
  const profile = composeProfile(google);
  const payload = toProfilePayload(profile, { firstName: profile.firstName, lastName: profile.lastName, phone: '' });
  assert.equal(payload.profilePhotoUrl, google.picture);
  const withoutPhoto = composeProfile({ ...google, picture: undefined });
  assert.ok(!('profilePhotoUrl' in toProfilePayload(withoutPhoto, { firstName: 'Jhon', lastName: 'Galvez', phone: '' })));
});

test('campos requeridos y límites del backend se validan antes de guardar', () => {
  const profile = composeProfile(google);
  assert.throws(() => toProfilePayload(profile, { firstName: ' ', lastName: 'Galvez', phone: '' }), /obligatorios/);
  assert.throws(() => toProfilePayload(profile, { firstName: 'Jhon', lastName: ' ', phone: '' }), /obligatorios/);
  assert.throws(() => toProfilePayload(profile, { firstName: 'a'.repeat(61), lastName: 'Galvez', phone: '' }), /60 caracteres/);
  assert.throws(() => toProfilePayload(profile, { firstName: 'Jhon', lastName: 'Galvez', phone: '1'.repeat(21) }), /20 caracteres/);
  assert.throws(() => toProfilePayload(composeProfile({}), { firstName: 'Jhon', lastName: 'Galvez', phone: '' }), /correo/);
});

test('fotos inválidas usan respaldo y los roles nuevos conservan su nombre', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,abc', 'http://example.test/photo', 'invalid']) {
    assert.equal(profilePhotoUrl(url), null);
  }
  assert.equal(composeProfile(google, { ...stored, profilePhotoUrl: 'invalid' }).photoUrl, google.picture);
  assert.equal(roleLabel('ROLE_MANAGER'), 'Gestor');
  assert.equal(roleLabel('ROLE_DRIVER'), 'Conductor');
  assert.equal(roleLabel('ROLE_CLIENT'), 'Cliente');
  assert.equal(roleLabel('ROLE_FUTURE'), 'ROLE_FUTURE');
});
