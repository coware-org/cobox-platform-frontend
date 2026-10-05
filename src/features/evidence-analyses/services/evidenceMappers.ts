import { degradedSections, numberField, operationalContext, record, resourceList, textField, uniqueDegradedSections } from '../../../utils/smartvision.ts';
import type { EvidenceAnalysis, EvidenceAnalysisDetailView, EvidenceAnalysesSummary } from '../types';

export function toAiEvidenceAnalysisView(data: unknown): EvidenceAnalysisDetailView {
  const source = record(data);
  const labels = source.detectedLabels;
  return {
    analysisId: textField(source, 'analysisId'),
    evidenceId: textField(source, 'clientEvidenceId', 'evidenceId'),
    evidenceUrl: textField(source, 'evidenceUrl'),
    thumbnailUrl: textField(source, 'thumbnailUrl'),
    objectKey: textField(source, 'objectKey'),
    evidenceType: textField(source, 'evidenceType'),
    status: textField(source, 'status'),
    provider: textField(source, 'provider'),
    ...operationalContext({}, source),
    confidence: numberField(source, 'confidenceScore', 'aiConfidence'),
    fraudScore: numberField(source, 'fraudScore'),
    summary: textField(source, 'validationSummary', 'aiSummary'),
    failureReason: textField(source, 'failureReason'),
    detectedLabels: Array.isArray(labels) ? labels.filter((label): label is string => typeof label === 'string') : null,
    ocrText: textField(source, 'ocrText'),
    analysisData: source.analysisData == null ? null : record(source.analysisData),
    createdAt: textField(source, 'createdAt'),
    processedAt: textField(source, 'completedAt', 'processedAt'),
  };
}

export function toEvidenceAnalysis(data: unknown): EvidenceAnalysis {
  const outer = record(data);
  const source = outer.analysis == null ? outer : record(outer.analysis);
  const view = toAiEvidenceAnalysisView(source);
  if (!view.evidenceId) throw new Error('El análisis recibido no identifica su evidencia.');
  return {
    ...view,
    ...operationalContext(outer, source),
    clientEvidenceId: view.evidenceId,
    degradedSections: degradedSections(outer),
  };
}

export function toEvidenceAnalysisView(record: EvidenceAnalysis): EvidenceAnalysisDetailView {
  return record;
}

export function mapEvidenceAnalyses(data: unknown): EvidenceAnalysesSummary {
  const analyses = resourceList(data, 'analyses').map(toEvidenceAnalysis);
  return {
    analyses,
    degradedSections: uniqueDegradedSections([...degradedSections(data), ...analyses.flatMap((analysis) => analysis.degradedSections ?? [])]),
  };
}

/** El detalle directo actualiza resultados sin perder el contexto enriquecido. */
export function mergeEvidenceDetail(context: EvidenceAnalysisDetailView | null, detail?: EvidenceAnalysisDetailView): EvidenceAnalysisDetailView | null {
  if (!detail) return context;
  if (!context || context.evidenceId !== detail.evidenceId) return detail;
  return {
    ...context, ...detail,
    driverName: detail.driverName ?? context.driverName,
    routeTitle: detail.routeTitle ?? context.routeTitle,
    vehicleId: detail.vehicleId ?? context.vehicleId,
    vehiclePlate: detail.vehiclePlate ?? context.vehiclePlate,
    orderLabel: detail.orderLabel ?? context.orderLabel,
    degradedSections: context.degradedSections,
  };
}

export function isAnalysisPending(status?: string | null) {
  return status === 'PENDING' || status === 'PROCESSING';
}
