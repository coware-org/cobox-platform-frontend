import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Clock, ExternalLink, User } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import {
  DetailDrawer,
  DetailField,
  DetailSection,
} from '@/components/common';
import {
  EvidenceAnalysisDetail,
  useEvidenceAnalysisDetail,
} from '@/features/evidence-analyses';
import type { Incident } from '../types';
import { IncidentSeverityBadge } from './IncidentSeverityBadge';
import { IncidentStatusBadge } from './IncidentStatusBadge';

type IncidentDetailPanelProps = {
  incident: Incident;
  isUpdating?: boolean;
  onClose: () => void;
  onChangeStatus: () => void;
  onAssignResponsible: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function IncidentDetailPanel({
  incident,
  isUpdating = false,
  onClose,
  onChangeStatus,
  onAssignResponsible,
}: IncidentDetailPanelProps) {
  const navigate = useNavigate();

  const isAiOrigin = incident.sourceType === 'AI_ALERT';
  const evidenceId = isAiOrigin ? incident.sourceClientEvidenceId : null;
  const analysisQuery = useEvidenceAnalysisDetail(evidenceId);

  return (
    <DetailDrawer
      title="Detalle de incidencia"
      subtitle={<span className="font-mono break-all">{incident.incidentId}</span>}
      onClose={onClose}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onChangeStatus} disabled={isUpdating}>
            <Clock className="h-4 w-4" />
            Cambiar estado
          </Button>
          <Button variant="secondary" onClick={onAssignResponsible} disabled={isUpdating}>
            <User className="h-4 w-4" />
            Asignar responsable
          </Button>
        </div>
      }
    >
      <DetailSection
        title="Incidente"
        description="Estado propio del incidente, independiente de la alerta y del análisis"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Estado</span>
          <IncidentStatusBadge status={incident.status} />
          <span className="text-xs font-medium text-gray-500">Severidad</span>
          <IncidentSeverityBadge severity={incident.severity} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Tipo">{incident.type}</DetailField>
          <DetailField label="Reportado">{formatDate(incident.reportedAt)}</DetailField>
          <DetailField label="Responsable">
            {incident.responsibleUserId
              ? `Usuario #${incident.responsibleUserId}`
              : 'Sin asignar'}
          </DetailField>
          <DetailField label="Origen">
            {incident.sourceType === 'AI_ALERT' ? (
              <Badge className="border border-purple-200 bg-purple-50 text-purple-700">
                Alerta IA
              </Badge>
            ) : (
              <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                Manual
              </Badge>
            )}
          </DetailField>
        </dl>

        <DetailField label="Descripción">
          {incident.description}
        </DetailField>
      </DetailSection>

      {isAiOrigin ? (
        <DetailSection
          title="Origen IA"
          description="Alerta, evidencia y análisis asociados a este incidente"
        >
          {incident.sourceAlertId ? (
            <div className="space-y-2">
              <DetailField label="Alerta origen">
                <span className="font-mono text-xs break-all">
                  {incident.sourceAlertId}
                </span>
              </DetailField>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/smartvision?alertId=${encodeURIComponent(incident.sourceAlertId as string)}`,
                  )
                }
              >
                <BrainCircuit className="h-4 w-4" />
                Ver alerta en SmartVision
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] p-3 text-sm text-gray-500">
              Este incidente no registra alerta de origen.
            </p>
          )}

          {evidenceId ? (
            <div className="space-y-2">
              <DetailField label="Evidencia origen">
                <span className="font-mono text-xs break-all">{evidenceId}</span>
              </DetailField>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/evidence-analyses?evidenceId=${encodeURIComponent(evidenceId)}`,
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                Ver análisis en el historial
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] p-3 text-sm text-gray-500">
              Este incidente no registra evidencia de origen.
            </p>
          )}
        </DetailSection>
      ) : null}

      {evidenceId ? (
        <DetailSection
          title="Análisis asociado"
          description="Mismo componente de detalle que usa SmartVision IA"
        >
          <EvidenceAnalysisDetail
            evidenceId={evidenceId}
            analysis={analysisQuery.data}
            isLoading={analysisQuery.isLoading}
            error={analysisQuery.error}
            onRetry={() => void analysisQuery.refetch()}
            emptyMessage="La evidencia de origen no tiene análisis de IA registrado."
            showContext={false}
          />
        </DetailSection>
      ) : null}
    </DetailDrawer>
  );
}