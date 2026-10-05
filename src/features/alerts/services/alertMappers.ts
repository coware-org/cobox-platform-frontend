import { degradedSections, numberField, operationalContext, record, resourceList, textField, uniqueDegradedSections } from '../../../utils/smartvision.ts';
import type { Alert, AlertDetail, AlertStatus, AlertsSummary } from '../types';

export function toAlert(data: unknown): Alert {
  const outer = record(data);
  const source = outer.alert == null ? outer : record(outer.alert);
  const analysis = record(outer.analysis);
  const alertId = textField(source, 'alertId');
  if (!alertId) throw new Error('La alerta recibida no tiene un identificador.');
  return {
    id: numberField(source, 'id'), alertId,
    evidenceId: textField(source, 'clientEvidenceId', 'evidenceId') ?? textField(analysis, 'clientEvidenceId'),
    status: textField(source, 'status') as AlertStatus,
    severity: textField(source, 'severity') as Alert['severity'],
    type: textField(source, 'type'),
    message: textField(source, 'message'),
    ...operationalContext(outer, { ...analysis, ...source }),
    evidenceUrl: textField(source, 'evidenceUrl'),
    analysisSummary: textField(analysis, 'validationSummary') ?? textField(source, 'analysisSummary'),
    createdAt: textField(source, 'createdAt') ?? '',
    acknowledgedAt: textField(source, 'acknowledgedAt'),
    resolvedAt: textField(source, 'resolvedAt'),
    linkedIncidentId: textField(source, 'linkedIncidentId', 'linkedIncidentUuid'),
    degradedSections: degradedSections(outer),
  };
}

export function toAlertDetail(data: unknown): AlertDetail {
  const outer = record(data);
  const source = outer.alert == null ? outer : record(outer.alert);
  const base = toAlert(data);
  return {
    ...base,
    analysisId: textField(source, 'analysisId'),
    analysisData: source.analysisData == null ? null : record(source.analysisData),
    aiConfidence: numberField(record(outer.analysis), 'confidenceScore') ?? numberField(source, 'aiConfidence', 'confidenceScore'),
    incidentType: textField(source, 'incidentType'),
    acknowledgedBy: numberField(source, 'acknowledgedBy'),
    resolvedBy: numberField(source, 'resolvedBy'),
    resolutionNotes: textField(source, 'resolutionNotes'),
    linkedIncidentUuid: base.linkedIncidentId,
  };
}

export function mapAlerts(data: unknown): AlertsSummary {
  const alerts = resourceList(data, 'alerts').map(toAlert);
  return {
    alerts,
    degradedSections: uniqueDegradedSections([...degradedSections(data), ...alerts.flatMap((alert) => alert.degradedSections ?? [])]),
  };
}
