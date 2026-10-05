import { fleetApi } from '@/services';
import { parseDownloadTicket } from './evidenceDownload';

export const evidencePhotoService = {
  async getDownloadTicket(evidenceId: string, signal?: AbortSignal) {
    const { data } = await fleetApi.get<unknown>(
      `/api/v1/mobile/evidence/${encodeURIComponent(evidenceId)}/download-url`, { signal },
    );
    return parseDownloadTicket(data, evidenceId);
  },
};
