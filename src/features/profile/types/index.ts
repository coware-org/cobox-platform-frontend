export type UserProfile = {
  id: number;
  auth0Subject: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  roles: string[];
  profilePhotoUrl?: string | null;
  active: boolean;
};

export type UpdateProfilePayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
};

export type IdentityProfile = {
  sub?: string;
  name?: string;
  nickname?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

export type AccountProfile = {
  id: number | null;
  auth0Subject: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean | null;
  phone: string;
  photoUrl: string | null;
  roles: string[];
  active: boolean | null;
};

export type ProfileValues = Pick<UpdateProfilePayload, 'firstName' | 'lastName'> & { phone: string };
