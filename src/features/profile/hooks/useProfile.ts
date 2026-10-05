import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { isAxiosError } from 'axios';
import { profileService } from '../services/profileService';
import { composeProfile } from '../services/profileMappers';
import type { UpdateProfilePayload } from '../types';

export function useProfile() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  return useQuery({
    queryKey: ['profile', 'me', user?.sub],
    enabled: !isLoading && isAuthenticated && !!user?.sub,
    staleTime: 60_000,
    retryOnMount: false,
    queryFn: async ({ signal }) => {
      const profile = await profileService.getProfile(signal);
      if (profile && profile.auth0Subject !== user?.sub) {
        throw new Error('El perfil recibido no corresponde a la cuenta actual.');
      }
      return profile;
    },
    retry: (count, error) => count < 1 && isAxiosError(error) && (!error.response || error.response.status >= 500),
  });
}

export function useAccountProfile() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const query = useProfile();
  return {
    ...query,
    account: isAuthenticated && user?.sub ? composeProfile(user, query.data) : null,
    isLoading: isLoading || query.isLoading,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth0();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const profile = await profileService.updateProfile(payload);
      if (profile.auth0Subject !== user?.sub) {
        throw new Error('El perfil guardado no corresponde a la cuenta actual.');
      }
      return profile;
    },
    onMutate: () => ({ queryKey: ['profile', 'me', user?.sub] as const }),
    onSuccess: (profile, _payload, context) => {
      if (context && profile.auth0Subject === context.queryKey[2]) {
        queryClient.setQueryData(context.queryKey, profile);
        void queryClient.invalidateQueries({ queryKey: context.queryKey, exact: true });
      }
    },
  });
}
