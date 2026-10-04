import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCheck,
  History,
  Inbox,
  Plus,
} from 'lucide-react';
import {
  DetailDrawer,
  DetailField,
  DetailSection,
} from '@/components/common';
import { Button, Skeleton, useToast } from '@/components/ui';
import { EvidenceAnalysisDetail } from '@/features/evidence-analyses/components';
import { useEvidenceAnalysisDetail } from '@/features/evidence-analyses/hooks';
import type { EvidenceAnalysisDetailView } from '@/features/evidence-analyses/types';
import {
  IncidentSeverityBadge,
  IncidentStatusBadge,
} from '@/features/incidents/components';
import { useIncidentBySourceAlert } from '@/features/incidents/hooks';
import type { Alert, AlertDetail } from '../types';
import {
  useAcknowledgeAlert,
  useAlertDetail,
  useCreateIncidentFromAlert,
  useResolveAlert,
} from '../hooks';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { AlertStatusBadge } from './AlertStatusBadge';
import { CreateIncidentFromAlertDialog } from './CreateIncidentFromAlertDialog';
import { ResolveAlertDialog } from './ResolveAlertDialog';

type AlertDetailDrawerProps = {
  alertId: string;
  /** Fila del listado: permite pintar de inmediato mientras carga el detalle. */
  fallbackAlert?: Alert | null;
  onClose: () => void;
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

/**
 * Vista de evidencia construida desde el propio detalle de la alerta, para
 * mostrar lo que sabemos cuando ai-validation aun no expone el analisis.
 */
function toAlertEvidenceView(alert: AlertDetail): EvidenceAnalysisDetailView {
  return {
    analysisId: alert.analysisId,
    evidenceId: alert.evidenceId,
    evidenceUrl: alert.evidenceUrl,
    thumbnailUrl: null,
    objectKey: null,
    evidenceType: null,
    status: null,
    provider: null,
    driverId: alert.driverId,
    driverName: alert.driverName,
    routeId: alert.routeId,
    routeTitle: alert.routeTitle,
    vehicleId: alert.vehicleId,
    vehiclePlate: alert.vehiclePlate,
    orderId: alert.orderId,
    orderLabel: alert.orderLabel,
    confidence: alert.aiConfidence,
    fraudScore: null,
    summary: alert.analysisSummary,
    failureReason: null,
    detectedLabels: null,
    analysisData: alert.analysisData,
    createdAt: alert.createdAt,
    processedAt: null,
  };
}

export function AlertDetailDrawer({
  alertId,
  fallbackAlert,
  onClose,
}: AlertDetailDrawerProps) {
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const detailQuery = useAlertDetail(alertId);
  const detail = detailQuery.data;
  const alert = detail ?? fallbackAlert ?? null;
  const evidenceId = detail?.evidenceId ?? null;

  const evidenceQuery = useEvidenceAnalysisDetail(evidenceId);
  const incidentQuery = useIncidentBySourceAlert(alertId);
  const incident = incidentQuery.data ?? null;

  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const createIncidentMutation = useCreateIncidentFromAlert();

  const isMutating =
    acknowledgeMutation.isPending ||
    resolveMutation.isPending ||
    createIncidentMutation.isPending;

  const isAlertMissing = isAxiosError(detailQuery.error) && detailQuery.error.response?.status === 404;
  const evidenceView =
    evidenceQuery.data ??
    (evidenceQuery.isError && detail ? toAlertEvidenceView(detail) : null);

  const goToIncident = () => {
    navigate(`/incidents?sourceAlertId=${encodeURIComponent(alertId)}`);
  };

  const handleAcknowledge = async () => {
    try {
      await acknowledgeMutation.mutateAsync(alertId);
      toast({ title: 'Alerta reconocida', type: 'success' });
    } catch (error) {
      toast({
        title:
          (error as { message?: string }).message ??
          'Error al reconocer la alerta',
        type: 'error',
      });
    }
  };

  const handleResolve = async (notes: string) => {
    try {
      await resolveMutation.mutateAsync({
        alertId,
        payload: { resolutionNotes: notes },
      });
      setIsResolveOpen(false);
      toast({ title: 'Alerta resuelta correctamente', type: 'success' });
    } catch (error) {
      toast({
        title: (error as { message?: string }).message ?? 'Error al resolver la alerta',
        type: 'error',
      });
    }
  };

  const handleCreateIncident = async () => {
    if (incident || alert?.linkedIncidentId) {
      setIsCreateIncidentOpen(false);
      goToIncident();
      return;
    }

    try {
      const result = await createIncidentMutation.mutateAsync(alertId);
      setIsCreateIncidentOpen(false);
      toast({
        title: result.created
          ? 'Incidente creado desde la alerta'
          : 'La alerta ya tenia un incidente vinculado',
        type: 'success',
      });
      goToIncident();
    } catch (error) {
      toast({
        title:
          (error as { message?: string }).message ??
          'Error al crear el incidente desde la alerta',
        type: 'error',
      });
    }
  };

  const hasIncident = Boolean(incident || alert?.linkedIncidentId);
  const canAcknowledge = alert?.status === 'OPEN';
  const canResolve = alert?.status !== 'RESOLVED';

  return (
    <>
      <DetailDrawer
        title="Detalle de alerta"
        subtitle={
          <span className="font-mono break-all">{alertId}</span>
        }
        onClose={onClose}
        footer={
          alert ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Las acciones modifican el estado de la alerta. El analisis de
                evidencia y el incidente conservan su estado propio.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!canAcknowledge || isMutating}
                  onClick={handleAcknowledge}
                >
                  {acknowledgeMutation.isPending ? 'Reconociendo...' : 'Reconocer'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!canResolve || isMutating}
                  onClick={() => setIsResolveOpen(true)}
                >
                  <CheckCheck className="h-4 w-4" />
                  Resolver
                </Button>
                <Button
                  className="w-full"
                  disabled={isMutating}
                  onClick={() => setIsCreateIncidentOpen(true)}
                >
                  {hasIncident ? (
                    <Inbox className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {hasIncident ? 'Ir al incidente' : 'Crear incidente'}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {/* ALERTA */}
        <DetailSection title="Alerta">
          {detailQuery.isLoading && !alert ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24" />
            </div>
          ) : null}

          {detailQuery.isError && !alert ? (
            <div className="space-y-3 rounded-lg border border-dashed border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                {isAlertMissing
                  ? 'La alerta solicitada no existe o ya no esta disponible.'
                  : 'No se pudo cargar el detalle de la alerta.'}
              </p>
              <Button
                variant="secondary"
                className="h-8"
                onClick={() => void detailQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : null}

          {alert ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Estado</span>
                <AlertStatusBadge status={alert.status} />
                <span className="text-xs font-medium text-gray-500">Severidad</span>
                <AlertSeverityBadge severity={alert.severity} />
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Tipo">{alert.type ?? '-'}</DetailField>
                <DetailField label="Fecha">{formatDate(alert.createdAt)}</DetailField>
                <DetailField label="Conductor">
                  {alert.driverName ??
                    (alert.driverId ? `Conductor #${alert.driverId}` : '-')}
                </DetailField>
                <DetailField label="Vehiculo">
                  {alert.vehiclePlate ??
                    (alert.vehicleId ? `Vehiculo #${alert.vehicleId}` : '-')}
                </DetailField>
                <DetailField label="Ruta">
                  {alert.routeTitle ??
                    (alert.routeId ? `Ruta #${alert.routeId}` : '-')}
                </DetailField>
                <DetailField label="Orden">
                  {alert.orderLabel ??
                    (alert.orderId ? `Orden #${alert.orderId}` : '-')}
                </DetailField>
                <DetailField label="Reconocida">
                  {formatDate(alert.acknowledgedAt)}
                </DetailField>
                <DetailField label="Resuelta">
                  {formatDate(alert.resolvedAt)}
                </DetailField>
              </dl>

              {alert.message && alert.message !== alert.analysisSummary ? (
                <DetailField label="Mensaje">{alert.message}</DetailField>
              ) : null}

              {detail?.resolutionNotes ? (
                <DetailField label="Notas de resolucion">
                  {detail.resolutionNotes}
                </DetailField>
              ) : null}
            </>
          ) : null}
        </DetailSection>

        {/* EVIDENCIA / IA */}
        <DetailSection
          title="Evidencia / IA"
          description="Estado y resultado del analisis de evidencia"
          actions={
            evidenceId ? (
              <Button
                variant="ghost"
                className="h-8 w-auto px-2 text-xs"
                onClick={() =>
                  navigate(
                    `/evidence-analyses?evidenceId=${encodeURIComponent(evidenceId)}`,
                  )
                }
              >
                <History className="h-4 w-4" />
                Historial
              </Button>
            ) : null
          }
        >
          {alert && !evidenceId ? (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] p-3 text-sm text-gray-500">
              Esta alerta no tiene evidencia asociada en ai-validation.
            </p>
          ) : (
            <EvidenceAnalysisDetail
              analysis={evidenceView}
              isLoading={evidenceQuery.isLoading}
              error={evidenceQuery.error}
              onRetry={() => void evidenceQuery.refetch()}
            />
          )}
        </DetailSection>

        {/* INCIDENTE VINCULADO */}
        <DetailSection
          title="Incidente vinculado"
          description="Estado propio del incidente, independiente de la alerta"
        >
          {incidentQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20" />
            </div>
          ) : null}

          {incidentQuery.isError ? (
            <div className="space-y-3 rounded-lg border border-dashed border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                No se pudo consultar el incidente de esta alerta.
              </p>
              <Button
                variant="secondary"
                className="h-8"
                onClick={() => void incidentQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : null}

          {!incidentQuery.isLoading && !incidentQuery.isError && incident ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Estado</span>
                <IncidentStatusBadge status={incident.status} />
                <span className="text-xs font-medium text-gray-500">Severidad</span>
                <IncidentSeverityBadge severity={incident.severity} />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Tipo">{incident.type}</DetailField>
                <DetailField label="Reportado">
                  {formatDate(incident.reportedAt)}
                </DetailField>
                <DetailField label="Responsable">
                  {incident.responsibleUserId
                    ? `Usuario #${incident.responsibleUserId}`
                    : 'Sin asignar'}
                </DetailField>
              </dl>
              <DetailField label="Descripcion">
                {incident.description}
              </DetailField>
              <Button variant="secondary" className="w-full" onClick={goToIncident}>
                <BrainCircuit className="h-4 w-4" />
                Ir al incidente
              </Button>
            </>
          ) : null}

          {!incidentQuery.isLoading && !incidentQuery.isError && !incident ? (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] p-3 text-sm text-gray-500">
              Esta alerta todavia no tiene un incidente vinculado.
            </p>
          ) : null}
        </DetailSection>
      </DetailDrawer>

      <ResolveAlertDialog
        open={isResolveOpen}
        isSubmitting={resolveMutation.isPending}
        onClose={() => setIsResolveOpen(false)}
        onSubmit={handleResolve}
      />

      <CreateIncidentFromAlertDialog
        open={isCreateIncidentOpen}
        isSubmitting={createIncidentMutation.isPending}
        alreadyLinked={hasIncident}
        linkedIncidentId={incident?.incidentId ?? alert?.linkedIncidentId ?? null}
        onClose={() => setIsCreateIncidentOpen(false)}
        onConfirm={handleCreateIncident}
      />
    </>
  );
}