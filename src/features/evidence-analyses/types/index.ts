import type { DegradedSection } from '@/types';

export const evidenceAnalysisStatuses = [
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED',
  'RECAPTURE_REQUIRED', 'FRAUD_SUSPECTED', 'DEGRADED',
] as const;

export type EvidenceAnalysisStatus = typeof evidenceAnalysisStatuses[number];
export type AiEvidenceAnalysisStatus = EvidenceAnalysisStatus;
export type EvidenceAnalysisViewStatus = EvidenceAnalysisStatus;

export type VisualAssessmentValue = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNDETERMINED';
export type GeographicAssessmentValue = 'MATCH' | 'MISMATCH' | 'UNVERIFIABLE';
export type ContextAssessmentValue = 'COMPATIBLE' | 'PARTIAL' | 'INCONSISTENT';
export type DimensionalVerdictValue = 'COMPATIBLE' | 'REVIEW_REQUIRED' | 'INCONSISTENT';
export type DimensionalRecommendationValue = 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
export type CaptureSourceValue = 'CAMERA' | 'GALLERY';
export type ReasonCode =
  | 'VISUAL_INCOMPATIBLE_SCENE'
  | 'VISUAL_UNDETERMINED'
  | 'GEO_MISMATCH'
  | 'GEO_UNVERIFIABLE'
  | 'GALLERY_CAPTURE_LOCATION_UNVERIFIED'
  | 'CONTEXT_TEMPORAL_MISMATCH'
  | 'CONTEXT_PARTIAL_DATA';
export type ReasonCodesResult = { known: ReasonCode[]; unknown: string[] };

export type DimensionalValidation = {
  visualAssessment: VisualAssessmentValue | null;
  visualConfidence: number | null;
  geographicAssessment: GeographicAssessmentValue | null;
  contextAssessment: ContextAssessmentValue | null;
  verdict: DimensionalVerdictValue | null;
  reasonCodes: ReasonCodesResult;
  recommendation: DimensionalRecommendationValue | null;
  captureSource: CaptureSourceValue | null;
};

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
  visualAssessment?: string | null;
  visualConfidence?: number | null;
  geographicAssessment?: string | null;
  contextAssessment?: string | null;
  verdict?: string | null;
  reasonCodes?: string[] | string | null;
  recommendation?: string | null;
  captureSource?: string | null;
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
  dimensional: DimensionalValidation | null;
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