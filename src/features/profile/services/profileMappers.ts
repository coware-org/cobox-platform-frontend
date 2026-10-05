import type { AccountProfile, IdentityProfile, ProfileValues, UpdateProfilePayload, UserProfile } from '../types/index.ts';

function text(value?: string | null): string {
  return value?.trim() ?? '';
}

export function profilePhotoUrl(value?: string | null): string | null {
  if (!text(value)) return null;
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function composeProfile(identity: IdentityProfile, stored?: UserProfile | null): AccountProfile {
  // A cached profile from another account must never supply visible or editable data.
  const profile = identity.sub && stored?.auth0Subject === identity.sub ? stored : null;
  const firstName = text(profile?.firstName) || text(identity.given_name);
  const lastName = text(profile?.lastName) || text(identity.family_name);
  const email = text(identity.email) || text(profile?.email);
  return {
    id: profile?.id ?? null,
    auth0Subject: identity.sub ?? '',
    name: [firstName, lastName].filter(Boolean).join(' ') || text(identity.name) || text(identity.nickname) || email || 'Usuario',
    firstName,
    lastName,
    email,
    emailVerified: text(identity.email) && typeof identity.email_verified === 'boolean' ? identity.email_verified : null,
    phone: text(profile?.phone),
    photoUrl: profilePhotoUrl(profile?.profilePhotoUrl) || profilePhotoUrl(identity.picture),
    roles: profile?.roles ?? [],
    active: profile?.active ?? null,
  };
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = { ROLE_CLIENT: 'Cliente', ROLE_DRIVER: 'Conductor', ROLE_MANAGER: 'Gestor' };
  return labels[role] ?? role;
}

export function toProfilePayload(profile: AccountProfile, values: ProfileValues): UpdateProfilePayload {
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const phone = values.phone.trim();
  if (!profile.email) throw new Error('No hay un correo disponible para guardar el perfil.');
  if (!firstName || !lastName) throw new Error('Los nombres y apellidos son obligatorios.');
  if (firstName.length > 60 || lastName.length > 60) throw new Error('Los nombres y apellidos admiten hasta 60 caracteres.');
  if (phone.length > 20) throw new Error('El teléfono admite hasta 20 caracteres.');
  return {
    email: profile.email,
    firstName,
    lastName,
    phone: phone || null,
    // Omission keeps an existing photo intact in IAM; saving can import the Google photo.
    ...(profile.photoUrl ? { profilePhotoUrl: profile.photoUrl } : {}),
  };
}
