import { useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const ROLES_CLAIM = 'https://cobox/roles' as const;

export const COBOX_ROLES = ['ROLE_MANAGER', 'ROLE_DRIVER', 'ROLE_CLIENT'] as const;
export type CoboxRole = (typeof COBOX_ROLES)[number];

const ROLE_PREFIX = 'ROLE_';

type IdTokenWithRoles = { [ROLES_CLAIM]?: unknown };

export function normalizeRole(value: unknown): CoboxRole | null {
  if (typeof value !== 'string') return null;

  let candidate = value.trim().toUpperCase();
  if (!candidate) return null;

  // IAM can repeat the prefix (ROLE_ROLE_MANAGER); strip every occurrence.
  while (candidate.startsWith(ROLE_PREFIX)) {
    const stripped = candidate.slice(ROLE_PREFIX.length);
    if (!stripped) break;
    candidate = stripped;
  }
  if (!candidate) return null;

  const canonical = `${ROLE_PREFIX}${candidate}`;
  // The catalogue is closed: anything else is a stale or unknown claim.
  return COBOX_ROLES.find((role) => role === canonical) ?? null;
}

export function readRolesFromIdToken(user: unknown): CoboxRole[] {
  if (typeof user !== 'object' || user === null) return [];

  const claim: unknown = (user as IdTokenWithRoles)[ROLES_CLAIM];
  if (!Array.isArray(claim)) return [];
  const entries: readonly unknown[] = claim;

  const granted = new Set<CoboxRole>();
  for (const entry of entries) {
    // Non-string entries normalise to null and are skipped instead of throwing.
    const role = normalizeRole(entry);
    if (role) granted.add(role);
  }

  // Filtering the catalogue dedupes and sorts the roles in a single pass.
  return COBOX_ROLES.filter((role) => granted.has(role));
}

export function hasRole(roles: readonly CoboxRole[], required: CoboxRole): boolean {
  return roles.includes(required);
}

export function useCoboxRoles(): {
  roles: CoboxRole[];
  hasRole: (required: CoboxRole) => boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const { user, isLoading, isAuthenticated } = useAuth0();
  const roles = useMemo(() => readRolesFromIdToken(user), [user]);
  const checkRole = useCallback((required: CoboxRole) => hasRole(roles, required), [roles]);

  // Sin este useMemo cada render entrega un objeto nuevo y rompe la identidad
  // de los consumidores que dependen de useCoboxRoles().
  return useMemo(
    () => ({ roles, hasRole: checkRole, isLoading, isAuthenticated }),
    [roles, checkRole, isLoading, isAuthenticated],
  );
}