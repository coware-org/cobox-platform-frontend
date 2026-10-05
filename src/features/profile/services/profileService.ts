import { isAxiosError } from 'axios';
import { fleetApi } from '@/services';
import type { UpdateProfilePayload, UserProfile } from '../types';

export const profileService = {
  async getProfile(signal?: AbortSignal): Promise<UserProfile | null> {
    try {
      const { data } = await fleetApi.get<UserProfile>('/api/v1/users/me', { signal });
      return data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await fleetApi.put<UserProfile>('/api/v1/users/me', payload);
    return data;
  },
};
