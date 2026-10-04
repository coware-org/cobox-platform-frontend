import type { DegradedSection } from '@/types';

/** Estados expuestos por el BFF de escritorio (desktop/smartvision). */
export type EvidenceAnalysisStatus = 'PENDING' | 'PROCESSED' | 'FLAGGED' | 'REJECTED';

/** Estados expuestos por ai-validation para el analisis de una evidencia. */
export type AiEvidenceAnalysisStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVIEW_REQUIRED'
  | 'RECAPTURE_REQUIRED'
  | 'FRAUD_SUSPECTED'
  | 'DEGRADED';

/**
 * Union de estados posibles de un analisis de evidencia. El detalle
 * compartido acepta cualquiera de los dos origenes y nunca se mezcla con el
 * estado de la alerta ni con el estado del incidente.
 */
export type EvidenceAnalysisViewStatus =
  | EvidenceAnalysisStatus
  | AiEvidenceAnalysisStatus;

export type BackendEvidenceAnalysisResource = {
  id: number;
  analysisId: string;
  status: EvidenceAnalysisStatus;
  driverId?: number | null;
  driverName?: string | null;
  routeId?: number | null;
  routeTitle?: string | null;
  vehicleId?: number | null;
  vehiclePlate?: string | null;
  orderId?: number | null;
  orderLabel?: string | null;
  evidenceUrl?: string | null;
  thumbnailUrl?: string | null;
  aiSummary?: string | null;
  aiConfidence?: number | null;
  analysisData?: Record<string, unknown> | null;
  detectedLabels?: string[] | null;
  createdAt: string;
  processedAt?: string | null;
};

/** Respuesta de ai-validation para el analisis de una evidencia puntual. */
export type AiEvidenceAnalysisResource = {
  clientEvidenceId?: string | null;
  analysisId?: string | null;
  objectKey?: string | null;
  evidenceType?: string | null;
  status?: string | null;
  provider?: string | null;
  driverId?: number | null;
  orderId?: number | null;
  routeId?: number | null;
  evidenceUrl?: string | null;
  confidenceScore?: number | null;
  fraudScore?: number | null;
  validationSummary?: string | null;
  failureReason?: string | null;
  analysisData?: Record<string, unknown> | null;
  createdAt?: string | null;
  completedAt?: string | null;
};

export type EvidenceAnalysis = {
  id: number;
  analysisId: string;
  status: EvidenceAnalysisStatus;
  driverId?: number | null;
  driverName?: string | null;
  routeId?: number | null;
  routeTitle?: string | null;
  vehicleId?: number | null;
  vehiclePlate?: string | null;
  orderId?: number | null;
  orderLabel?: string | null;
  evidenceUrl?: string | null;
  thumbnailUrl?: string | null;
  aiSummary?: string | null;
  aiConfidence?: number | null;
  analysisData?: Record<string, unknown> | null;
  detectedLabels?: string[] | null;
  createdAt: string;
  processedAt?: string | null;
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