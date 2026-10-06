import { isAxiosError } from 'axios';
import { Button, Skeleton } from '@/components/ui';
import type { EvidenceAnalysisDetailView } from '../types';
import { EvidenceAnalysisStatusBadge } from './EvidenceAnalysisStatusBadge';
import { EvidencePhoto } from './EvidencePhoto';
import { EvidenceDimensionalSection } from './EvidenceDimensionalSection';

type EvidenceAnalysisDetailProps = {
  analysis?: EvidenceAnalysisDetailView | null;
  evidenceId?: string | null;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  showContext?: boolean;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatScore(value: number | null, scale: number) {
  if (value === null || value === undefined) return '-';
  const normalized = value * scale;
  return `${Math.round(normalized)}%`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function errorMessage(error: unknown, evidenceId?: string | null) {
  if (isAxiosError(error) && error.response?.status === 404) {
    return evidenceId
      ? `Todavía no hay un análisis registrado para la evidencia ${evidenceId}.`
      : 'Todavía no hay un análisis registrado para esta evidencia.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo cargar el analisis de evidencia.';
}

/**
 * Detalle compartido de analisis de evidencia. Lo usan:
 * - el historial completo de analisis (`/evidence-analyses`)
 * - el detalle integrado de la alerta en SmartVision IA
 * - el bloque "analisis asociado" del detalle de incidente
 */
function EvidenceAnalysisResult({
  analysis,
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'Esta evidencia aun no tiene un analisis de IA registrado.',
  showContext = true,
}: EvidenceAnalysisDetailProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{errorMessage(error, analysis?.evidenceId)}</p>
        {onRetry ? (
          <Button variant="secondary" className="h-8" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </div>
    );
  }

  if (!analysis) {
    return (
      <p className="rounded-lg border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
        {emptyMessage}
      </p>
    );
  }

  const labels = analysis.detectedLabels ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase text-[#64748B]">Estado del analisis</p>
          <EvidenceAnalysisStatusBadge status={analysis.status} />
        </div>
        <div className="flex flex-col gap-1 text-right">
          <p className="text-xs uppercase text-[#64748B]">Tipo</p>
          <p className="text-sm font-semibold text-[#111827]">
            {analysis.evidenceType ?? '-'}
          </p>
        </div>
      </div>

      {analysis.dimensional ? (
        <EvidenceDimensionalSection dimensional={analysis.dimensional} />
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Confianza (confidence)"
          value={formatScore(analysis.confidence, 1)}
        />
        <Field label="Fraude (fraud score)" value={formatScore(analysis.fraudScore, 100)} />
        <Field label="Fecha de analisis" value={formatDateTime(analysis.createdAt)} />
        <Field
          label="Fecha de finalizacion"
          value={formatDateTime(analysis.processedAt)}
        />
        <Field label="Proveedor" value={analysis.provider ?? '-'} />
        <Field label="Evidencia" value={analysis.evidenceId ?? '-'} />
      </dl>

      {showContext ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Conductor"
            value={
              analysis.driverName ??
              (analysis.driverId ? `Conductor #${analysis.driverId}` : '-')
            }
          />
          <Field
            label="Ruta"
            value={
              analysis.routeTitle ??
              (analysis.routeId ? `Ruta #${analysis.routeId}` : '-')
            }
          />
          <Field
            label="Vehiculo"
            value={
              analysis.vehiclePlate ??
              (analysis.vehicleId ? `Vehiculo #${analysis.vehicleId}` : '-')
            }
          />
          <Field
            label="Orden"
            value={
              analysis.orderLabel ??
              (analysis.orderId ? `Orden #${analysis.orderId}` : '-')
            }
          />
        </dl>
      ) : null}

      <div>
        <p className="text-xs font-medium text-gray-500">Resumen</p>
        <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-gray-900">
          {analysis.summary ?? 'Sin resumen registrado.'}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500">Motivo de fallo</p>
        <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-gray-900">
          {analysis.failureReason ?? 'Sin motivo de fallo registrado.'}
        </p>
      </div>

      {labels.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-500">Etiquetas detectadas</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.ocrText ? (
        <div>
          <p className="text-xs font-medium text-gray-500">Texto detectado</p>
          <p className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-sm text-gray-900">{analysis.ocrText}</p>
        </div>
      ) : null}
    </div>
  );
}

export function EvidenceAnalysisDetail(props: EvidenceAnalysisDetailProps) {
  const evidenceId = props.evidenceId ?? props.analysis?.evidenceId;
  return (
    <div className="space-y-5">
      {evidenceId ? <EvidencePhoto key={evidenceId} evidenceId={evidenceId} /> : null}
      {props.error && props.analysis ? <p role="alert" className="text-sm text-red-800">No se pudo actualizar el análisis. Se muestran los últimos datos disponibles.</p> : null}
      <EvidenceAnalysisResult {...props} error={props.analysis ? null : props.error} />
      {props.onRetry && props.analysis && !props.isLoading ? (
        <Button variant="secondary" onClick={props.onRetry}>Actualizar análisis</Button>
      ) : null}
    </div>
  );
}
