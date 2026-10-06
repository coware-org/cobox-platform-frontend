import type { DimensionalValidation, ReasonCode } from '../types';
import { formatConfidence01 } from '../services/dimensional';

const veredictoLabels: Record<string, string> = {
  COMPATIBLE: 'Aprobación sugerida',
  REVIEW_REQUIRED: 'Revisión requerida',
  INCONSISTENT: 'Rechazo sugerido',
};

const accionLabels: Record<string, string> = {
  AUTO_APPROVE: 'Proceder con cierre automático',
  MANUAL_REVIEW: 'Inspeccionar evidencia manualmente',
  REJECT: 'Solicitar aclaración o desestimar',
};

const motivoLabels: Record<ReasonCode, string> = {
  VISUAL_INCOMPATIBLE_SCENE: 'Escena visual incompatible',
  VISUAL_UNDETERMINED: 'Escena no determinable',
  GEO_MISMATCH: 'Ubicación no coincide',
  GEO_UNVERIFIABLE: 'Ubicación no verificable',
  GALLERY_CAPTURE_LOCATION_UNVERIFIED: 'Foto galería sin ubicación verificable',
  CONTEXT_TEMPORAL_MISMATCH: 'Fecha inconsistente',
  CONTEXT_PARTIAL_DATA: 'Datos parciales',
};

const visualLabels: Record<string, string> = {
  COMPATIBLE: 'Compatible',
  INCOMPATIBLE: 'Incompatible',
  UNDETERMINED: 'No determinable',
};

const geoLabels: Record<string, string> = {
  MATCH: 'Coincide',
  MISMATCH: 'No coincide',
  UNVERIFIABLE: 'No verificable',
};

const contextLabels: Record<string, string> = {
  COMPATIBLE: 'Compatible',
  INCONSISTENT: 'Inconsistente',
  PARTIAL: 'Datos parciales',
};

function axisDot(value: string | null, ok: readonly string[], bad: readonly string[]): string {
  if (ok.includes(value ?? '')) return 'bg-green-500';
  if (bad.includes(value ?? '')) return 'bg-red-500';
  return 'bg-slate-300';
}

function AxisItem({
  label,
  value,
  confidence,
  dot,
}: {
  label: string;
  value: string;
  confidence?: string | null;
  dot: string;
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
      {confidence !== undefined ? (
        <p className="mt-1 text-xs text-gray-500">Confianza: {confidence}</p>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

export function EvidenceDimensionalSection({ dimensional }: { dimensional: DimensionalValidation }) {
  const reasons = [
    ...dimensional.reasonCodes.known.map((code) => ({ key: code, label: motivoLabels[code], unknown: false })),
    ...dimensional.reasonCodes.unknown.map((code) => ({ key: `unknown:${code}`, label: code, unknown: true })),
  ];

  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase text-[#64748B]">Validación dimensional</p>
        {dimensional.captureSource ? (
          <span className="inline-flex items-center rounded-full bg-[#DFF6F1] px-2 py-0.5 text-xs font-medium text-[#0F766E]">
            Origen: {dimensional.captureSource === 'CAMERA' ? 'Cámara' : 'Galería'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <AxisItem
          label="Visual"
          value={visualLabels[dimensional.visualAssessment ?? ''] ?? '—'}
          confidence={formatConfidence01(dimensional.visualConfidence)}
          dot={axisDot(dimensional.visualAssessment, ['COMPATIBLE'], ['INCOMPATIBLE'])}
        />
        <AxisItem
          label="Geográfico"
          value={geoLabels[dimensional.geographicAssessment ?? ''] ?? '—'}
          dot={axisDot(dimensional.geographicAssessment, ['MATCH'], ['MISMATCH'])}
        />
        <AxisItem
          label="Contextual"
          value={contextLabels[dimensional.contextAssessment ?? ''] ?? '—'}
          dot={axisDot(dimensional.contextAssessment, ['COMPATIBLE'], ['INCONSISTENT'])}
        />
      </div>

      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field
          label="Veredicto"
          value={veredictoLabels[dimensional.verdict ?? ''] ?? '—'}
        />
        <Field
          label="Acción operativa"
          value={dimensional.recommendation ? `Acción: ${accionLabels[dimensional.recommendation] ?? dimensional.recommendation}` : '—'}
        />
      </dl>

      {reasons.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">Motivos</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {reasons.map((reason) => (
              <span
                key={reason.key}
                className={
                  reason.unknown
                    ? 'inline-flex items-center rounded-full border border-dashed border-[#E5E7EB] bg-white px-2 py-0.5 text-xs font-medium text-slate-700'
                    : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700'
                }
              >
                {reason.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}