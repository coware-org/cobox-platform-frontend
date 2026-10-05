import type { DegradedSection } from '@/types';

export const evidenceAnalysisStatuses = [
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED',
  'RECAPTURE_REQUIRED', 'FRAUD_SUSPECTED', 'DEGRADED',
] as const;

export type EvidenceAnalysisStatus = typeof evidenceAnalysisStatuses[number];
export type AiEvidenceAnalysisStatus = EvidenceAnalysisStatus;
export type EvidenceAnalysisViewStatus = EvidenceAnalysisStatus;

/** Contrato REST de ai-validation, independiente del contexto del BFF. */
export type AiEvidenceAnalysisResource = {
  clientEvidenceId: string;
  objectKey: string;
  driverId: number | null;
  orderId: number | null;
  routeId: number | null;
  evidenceType: string | null;
  status: string;
  provider: string | null;
  confidenceScore: number | null;
  fraudScore: number | null;
  validationSummary: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  ocrText?: string | null;
  detectedLabels?: string[];
};

export type EvidenceAnalysis = EvidenceAnalysisDetailView & {
  clientEvidenceId: string;
};

/**
 * Modelo de vista unificado del analisis de evidencia. Es lo que consume el
 * componente de detalle compartido, tanto desde el historial completo como
 * desde el detalle de una alerta de SmartVision.
 */
export type EvidenceAnalysisDetailView = {
  analysisId: string | null;
  evidenceId: string | null;
  evidenceUrl: string | null;
  thumbnailUrl: string | null;
  objectKey: string | null;
  evidenceType: string | null;
  status: string | null;
  provider: string | null;
  driverId: number | null;
  driverName: string | null;
  routeId: number | null;
  routeTitle: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  orderId: number | null;
  orderLabel: string | null;
  confidence: number | null;
  fraudScore: number | null;
  summary: string | null;
  failureReason: string | null;
  detectedLabels: string[] | null;
  analysisData: Record<string, unknown> | null;
  createdAt: string | null;
  processedAt: string | null;
  ocrText?: string | null;
  degradedSections?: DegradedSection[];
};

export type EvidenceAnalysesSummary = {
  analyses: EvidenceAnalysis[];
  degradedSections: DegradedSection[];
};

export type EvidenceAnalysisFilters = {
  status?: EvidenceAnalysisStatus;
  driverId?: number;
  routeId?: number;
  orderId?: number;
};