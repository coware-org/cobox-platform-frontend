import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import { evidencePhotoService } from '../services/evidencePhotoService';
import { downloadRenewalDelay } from '../services/evidenceDownload';

export function useEvidencePhoto(evidenceId: string) {
  const { user, isAuthenticated } = useAuth0();
  const query = useQuery({
    queryKey: ['evidence-photo', user?.sub ?? 'anonymous', evidenceId],
    queryFn: ({ signal }) => evidencePhotoService.getDownloadTicket(evidenceId, signal),
    enabled: isAuthenticated && Boolean(evidenceId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const ticket = query.data;
  const { refetch } = query;

  useEffect(() => {
    if (!ticket || query.isError || !isAuthenticated) return;
    const timer = window.setTimeout(() => void refetch(), downloadRenewalDelay(ticket));
    return () => window.clearTimeout(timer);
  }, [ticket, refetch, query.isError, isAuthenticated]);

  return query;
}
