import { useQuery } from '@tanstack/react-query';
import { evidenceAnalysesService } from '../services/evidenceAnalysesService';
import type { EvidenceAnalysisFilters } from '../types';

export const evidenceAnalysesKeys = {
  all: ['evidence-analyses'] as const,
  list: (filters: EvidenceAnalysisFilters = {}) =>
    [
      'evidence-analyses',
      'list',
      filters.status ?? 'all',
      filters.driverId ?? 'all',
      filters.routeId ?? 'all',
      filters.orderId ?? 'all',
    ] as const,
  detail: (evidenceId: string) =>
    ['evidence-analyses', 'detail', evidenceId] as const,
};

export function useEvidenceAnalyses(filters: EvidenceAnalysisFilters = {}) {
  return useQuery({
    queryKey: evidenceAnalysesKeys.list(filters),
    queryFn: () => evidenceAnalysesService.getEvidenceAnalyses(filters),
  });
}

/**
 * Analisis puntual de una evidencia (ai-validation). Se usa desde el detalle
 * de la alerta de SmartVision y desde la navegacion contextual de incidentes.
 */
export function useEvidenceAnalysisDetail(evidenceId?: string | null) {
  return useQuery({
    queryKey: evidenceAnalysesKeys.detail(evidenceId ?? 'none'),
    queryFn: () =>
      evidenceAnalysesService.getAiEvidenceAnalysis(evidenceId as string),
    enabled: Boolean(evidenceId),
    retry: false,
  });
}