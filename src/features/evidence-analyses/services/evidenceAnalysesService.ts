import { fleetApi } from '@/services';
import { unwrapBffResource } from '@/utils';
import type { EvidenceAnalysisDetailView, EvidenceAnalysisFilters, EvidenceAnalysesSummary } from '../types';
import { mapEvidenceAnalyses, toAiEvidenceAnalysisView } from './evidenceMappers';
export { toEvidenceAnalysisView, toAiEvidenceAnalysisView, mergeEvidenceDetail } from './evidenceMappers';

export const evidenceAnalysesService = {
  async getEvidenceAnalyses(filters: EvidenceAnalysisFilters = {}, signal?: AbortSignal): Promise<EvidenceAnalysesSummary> {
    const { data } = await fleetApi.get<unknown>('/api/v1/desktop/smartvision/evidence-analyses', { params: filters, signal });
    return mapEvidenceAnalyses(data);
  },

  async getAiEvidenceAnalysis(clientEvidenceId: string, signal?: AbortSignal): Promise<EvidenceAnalysisDetailView> {
    const { data } = await fleetApi.get<unknown>(`/api/v1/ai-validation/evidence-analyses/${encodeURIComponent(clientEvidenceId)}`, { signal });
    const resource = unwrapBffResource(data, ['value', 'data', 'analysis', 'evidenceAnalysis', 'resource']);
    const view = toAiEvidenceAnalysisView(resource);
    if (view.evidenceId !== clientEvidenceId) throw new Error('El análisis recibido no corresponde a esta evidencia.');
    return view;
  },
};
