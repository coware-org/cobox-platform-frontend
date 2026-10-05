import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COBOX_ROLES, ROLES_CLAIM, hasRole, normalizeRole, readRolesFromIdToken } from '../src/app/auth/roles.ts';

/** Usuario de Auth0 con el claim de roles; `undefined` lo deja ausente. */
function idToken(claim: unknown): unknown {
  return claim === undefined ? {} : { [ROLES_CLAIM]: claim };
}

test('sin claim de roles el usuario no tiene ninguno', () => {
  assert.deepEqual(readRolesFromIdToken(idToken(undefined)), []);
  assert.deepEqual(readRolesFromIdToken({}), []);
});

test('el claim se lee del espacio de nombres de CoBox', () => {
  assert.equal(ROLES_CLAIM, 'https://cobox/roles');
  assert.deepEqual(readRolesFromIdToken({ 'https://cobox/roles': ['manager'] }), ['ROLE_MANAGER']);
});

test('un usuario que no es un objeto no concede roles', () => {
  for (const user of [null, undefined, 'manager', 42, true, () => 'ROLE_MANAGER']) {
    assert.deepEqual(readRolesFromIdToken(user), []);
  }
});

test('un claim que no es una lista no concede roles', () => {
  for (const claim of ['ROLE_MANAGER', { role: 'ROLE_MANAGER' }, 42, true]) {
    assert.deepEqual(readRolesFromIdToken(idToken(claim)), []);
  }
});

test('el nombre del rol se normaliza sin distinguir mayusculas, espacios ni repeticiones', () => {
  assert.deepEqual(readRolesFromIdToken(idToken(['manager'])), ['ROLE_MANAGER']);
  assert.deepEqual(readRolesFromIdToken(idToken(['ROLE_MANAGER'])), ['ROLE_MANAGER']);
  assert.deepEqual(readRolesFromIdToken(idToken(['ROLE_ROLE_MANAGER'])), ['ROLE_MANAGER']);
  assert.deepEqual(readRolesFromIdToken(idToken(['driver'])), ['ROLE_DRIVER']);
  assert.deepEqual(readRolesFromIdToken(idToken(['  role_driver  '])), ['ROLE_DRIVER']);
});

test('los nombres vacios o sin sufijo se descartan', () => {
  assert.equal(normalizeRole(''), null);
  assert.equal(normalizeRole('   '), null);
  assert.equal(normalizeRole('ROLE_'), null);
  assert.deepEqual(readRolesFromIdToken(idToken(['', '   ', 'ROLE_'])), []);
});

test('los roles repetidos se deduplican y se ordenan segun el catalogo', () => {
  assert.deepEqual(readRolesFromIdToken(idToken(['manager', 'ROLE_MANAGER'])), ['ROLE_MANAGER']);
  assert.deepEqual(readRolesFromIdToken(idToken(['manager', 'driver'])), ['ROLE_MANAGER', 'ROLE_DRIVER']);
});

test('un rol fuera del catalogo no se concede', () => {
  assert.equal(normalizeRole('ADMIN'), null);
  assert.deepEqual(readRolesFromIdToken(idToken(['ADMIN'])), []);
});

test('el rol cliente se concede con y sin prefijo', () => {
  assert.deepEqual(readRolesFromIdToken(idToken(['client', 'ROLE_CLIENT'])), ['ROLE_CLIENT']);
  assert.equal(normalizeRole('client'), 'ROLE_CLIENT');
  assert.equal(normalizeRole('ROLE_CLIENT'), 'ROLE_CLIENT');
  assert.equal(normalizeRole('ROLE_ROLE_CLIENT'), 'ROLE_CLIENT');
});

test('el catalogo de roles es cerrado y mantiene un orden fijo', () => {
  // Se compara contra literales, nunca contra el propio catalogo: si alguien
  // quita ROLE_CLIENT de COBOX_ROLES esta asercion debe fallar.
  assert.equal(COBOX_ROLES.length, 3);
  assert.deepEqual([...COBOX_ROLES], ['ROLE_MANAGER', 'ROLE_DRIVER', 'ROLE_CLIENT']);
  assert.deepEqual(readRolesFromIdToken(idToken(['ROLE_CLIENT', 'ROLE_MANAGER'])), ['ROLE_MANAGER', 'ROLE_CLIENT']);
});

test('las entradas invalidas se descartan sin interrumpir el resto', () => {
  const claim = ['ROLE_MANAGER', 42, null, undefined, { role: 'ROLE_MANAGER' }, 'ADMIN', 'ROLE_DRIVER'];
  assert.deepEqual(readRolesFromIdToken(idToken(claim)), ['ROLE_MANAGER', 'ROLE_DRIVER']);
});

test('hasRole solo concede el rol que se pide', () => {
  assert.equal(hasRole([], 'ROLE_MANAGER'), false);
  assert.equal(hasRole(['ROLE_DRIVER'], 'ROLE_MANAGER'), false);
  assert.equal(hasRole(['ROLE_MANAGER'], 'ROLE_MANAGER'), true);
  assert.equal(hasRole(['ROLE_MANAGER', 'ROLE_DRIVER'], 'ROLE_MANAGER'), true);
});

test('hasRole concede ROLE_CLIENT solo cuando el token lo trae', () => {
  assert.equal(hasRole([], 'ROLE_CLIENT'), false);
  assert.equal(hasRole(['ROLE_DRIVER'], 'ROLE_CLIENT'), false);
  assert.equal(hasRole(['ROLE_MANAGER'], 'ROLE_CLIENT'), false);
  assert.equal(hasRole(['ROLE_CLIENT'], 'ROLE_CLIENT'), true);
  assert.equal(hasRole(['ROLE_MANAGER', 'ROLE_CLIENT'], 'ROLE_CLIENT'), true);
});