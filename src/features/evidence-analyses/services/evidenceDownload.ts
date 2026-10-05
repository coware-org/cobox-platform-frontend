export type EvidenceDownloadTicket = {
  clientEvidenceId: string;
  downloadUrl: string;
  expiresAt: string;
  mimeType: string;
};

export const DOWNLOAD_EXPIRY_MARGIN_MS = 10_000;

export function parseDownloadTicket(data: unknown, evidenceId: string, now = Date.now()): EvidenceDownloadTicket {
  if (!data || typeof data !== 'object') throw new Error('No se recibió una autorización de descarga.');
  const value = data as Record<string, unknown>;
  if (value.clientEvidenceId !== evidenceId || value.httpMethod !== 'GET') {
    throw new Error('La autorización de descarga no corresponde a esta evidencia.');
  }
  if (typeof value.downloadUrl !== 'string' || !/^https?:\/\//i.test(value.downloadUrl)) {
    throw new Error('El servidor no devolvió una URL de descarga válida.');
  }
  if (typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= now + DOWNLOAD_EXPIRY_MARGIN_MS) {
    throw new Error('La autorización de descarga está vencida o próxima a vencer.');
  }
  if (typeof value.mimeType !== 'string') throw new Error('No se recibió el tipo de archivo de la evidencia.');
  const headers = value.requiredHeaders;
  if (headers && typeof headers === 'object' && Object.keys(headers).some((key) => key.toLowerCase() !== 'responsecontenttype')) {
    throw new Error('La descarga requiere cabeceras que el visor no puede enviar.');
  }
  return {
    clientEvidenceId: evidenceId, downloadUrl: value.downloadUrl,
    expiresAt: value.expiresAt, mimeType: value.mimeType,
  };
}

export function downloadRenewalDelay(ticket: EvidenceDownloadTicket, now = Date.now()) {
  return Math.max(0, Date.parse(ticket.expiresAt) - now - DOWNLOAD_EXPIRY_MARGIN_MS);
}
