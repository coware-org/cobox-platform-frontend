import type {
  CaptureSourceValue,
  ContextAssessmentValue,
  DimensionalRecommendationValue,
  DimensionalValidation,
  DimensionalVerdictValue,
  GeographicAssessmentValue,
  ReasonCode,
  ReasonCodesResult,
  VisualAssessmentValue,
} from '../types';

const VISUAL_VOCAB: readonly VisualAssessmentValue[] = ['COMPATIBLE', 'INCOMPATIBLE', 'UNDETERMINED'];
const GEO_VOCAB: readonly GeographicAssessmentValue[] = ['MATCH', 'MISMATCH', 'UNVERIFIABLE'];
const CONTEXT_VOCAB: readonly ContextAssessmentValue[] = ['COMPATIBLE', 'PARTIAL', 'INCONSISTENT'];
const VERDICT_VOCAB: readonly DimensionalVerdictValue[] = ['COMPATIBLE', 'REVIEW_REQUIRED', 'INCONSISTENT'];
const RECOMMENDATION_VOCAB: readonly DimensionalRecommendationValue[] = ['AUTO_APPROVE', 'MANUAL_REVIEW', 'REJECT'];
const REASON_CODE_VOCAB: readonly ReasonCode[] = [
  'VISUAL_INCOMPATIBLE_SCENE',
  'VISUAL_UNDETERMINED',
  'GEO_MISMATCH',
  'GEO_UNVERIFIABLE',
  'GALLERY_CAPTURE_LOCATION_UNVERIFIED',
  'CONTEXT_TEMPORAL_MISMATCH',
  'CONTEXT_PARTIAL_DATA',
];

export function toVisualConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return null;
  return value;
}

export function formatConfidence01(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

function vocabField<T extends string>(source: Record<string, unknown>, key: string, vocab: readonly T[]): T | null {
  const value = source[key];
  return typeof value === 'string' && (vocab as readonly string[]).includes(value) ? (value as T) : null;
}

function captureSourceValue(source: Record<string, unknown>): CaptureSourceValue | null {
  const value = source.captureSource;
  return value === 'CAMERA' || value === 'GALLERY' ? value : null;
}

function isReasonCode(value: string): value is ReasonCode {
  return (REASON_CODE_VOCAB as readonly string[]).includes(value);
}

function canonicalReasonItems(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [value];
  }
  if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  if (typeof parsed === 'string' && parsed) return [parsed];
  return [value];
}

export function parseReasonCodes(value: unknown): ReasonCodesResult {
  const known: ReasonCode[] = [];
  const unknown: string[] = [];
  const seenKnown = new Set<ReasonCode>();
  const seenUnknown = new Set<string>();
  for (const item of canonicalReasonItems(value)) {
    if (isReasonCode(item)) {
      if (!seenKnown.has(item)) {
        seenKnown.add(item);
        known.push(item);
      }
    } else if (!seenUnknown.has(item)) {
      seenUnknown.add(item);
      unknown.push(item);
    }
  }
  return { known, unknown };
}

export function toDimensionalValidation(source: Record<string, unknown>): DimensionalValidation | null {
  const reasonCodes = parseReasonCodes(source.reasonCodes);
  const dimensional: DimensionalValidation = {
    visualAssessment: vocabField(source, 'visualAssessment', VISUAL_VOCAB),
    visualConfidence: toVisualConfidence(source.visualConfidence),
    geographicAssessment: vocabField(source, 'geographicAssessment', GEO_VOCAB),
    contextAssessment: vocabField(source, 'contextAssessment', CONTEXT_VOCAB),
    verdict: vocabField(source, 'verdict', VERDICT_VOCAB),
    reasonCodes,
    recommendation: vocabField(source, 'recommendation', RECOMMENDATION_VOCAB),
    captureSource: captureSourceValue(source),
  };
  const hasData =
    dimensional.visualAssessment !== null ||
    dimensional.visualConfidence !== null ||
    dimensional.geographicAssessment !== null ||
    dimensional.contextAssessment !== null ||
    dimensional.verdict !== null ||
    reasonCodes.known.length > 0 ||
    reasonCodes.unknown.length > 0 ||
    dimensional.recommendation !== null;
  return hasData ? dimensional : null;
}

function hasReasonCodes(codes: ReasonCodesResult): boolean {
  return codes.known.length > 0 || codes.unknown.length > 0;
}

export function mergeDimensional(context: DimensionalValidation | null, detail: DimensionalValidation | null): DimensionalValidation | null {
  if (!detail) return context;
  if (!context) return detail;
  return {
    visualAssessment: detail.visualAssessment ?? context.visualAssessment,
    visualConfidence: detail.visualConfidence ?? context.visualConfidence,
    geographicAssessment: detail.geographicAssessment ?? context.geographicAssessment,
    contextAssessment: detail.contextAssessment ?? context.contextAssessment,
    verdict: detail.verdict ?? context.verdict,
    reasonCodes: hasReasonCodes(detail.reasonCodes)
      ? detail.reasonCodes
      : hasReasonCodes(context.reasonCodes)
        ? context.reasonCodes
        : { known: [], unknown: [] },
    recommendation: detail.recommendation ?? context.recommendation,
    captureSource: detail.captureSource ?? context.captureSource,
  };
}