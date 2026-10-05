import { apiClient } from '@/services';

export type SignInResponse = {
  id: number;
  email: string;
  token: string;
  roles: string[];
};

export const authService = {
  signIn: (email: string, password: string) =>
    apiClient.post<SignInResponse>('/api/v1/authentication/sign-in', { email, password }),
};
