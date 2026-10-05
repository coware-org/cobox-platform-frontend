import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ExternalLink } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { useEvidencePhoto } from '../hooks/useEvidencePhoto';
import { downloadRenewalDelay } from '../services/evidenceDownload';

function downloadError(error: unknown) {
  if (isAxiosError(error)) {
    switch (error.response?.status) {
      case 401: return 'Tu sesión no permite descargar la foto. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para ver esta evidencia.';
      case 404: return 'La foto no está disponible en el almacenamiento.';
      case 409: return 'La subida de esta evidencia todavía no está confirmada.';
    }
  }
  return 'No se pudo descargar la foto. Puedes reintentar sin cerrar el análisis.';
}

/** El token autoriza download-url; el navegador recibe S3 sin enviarle el JWT. */
export function EvidencePhoto({ evidenceId }: { evidenceId: string }) {
  const query = useEvidencePhoto(evidenceId);
  const retried = useRef(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const ticket = query.data;
  const url = ticket && downloadRenewalDelay(ticket) > 0 ? ticket.downloadUrl : null;
  const failed = query.isError || (url != null && failedUrl === url);

  const refresh = () => {
    setFailedUrl(null);
    setLoadedUrl(null);
    void query.refetch();
  };

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-3" aria-label="Foto de la evidencia">
      <h3 className="text-sm font-semibold text-gray-900">Foto de la evidencia</h3>
      {query.isFetching ? (
        <div role="status"><Skeleton className="h-48 w-full" /><span className="sr-only">Cargando foto</span></div>
      ) : failed ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-red-800">{downloadError(query.error)}</p>
          <Button variant="secondary" disabled={query.isFetching} onClick={() => { retried.current = false; refresh(); }}>
            Reintentar foto
          </Button>
        </div>
      ) : !url ? (
        <div role="status"><Skeleton className="h-48 w-full" /><span className="sr-only">Cargando foto</span></div>
      ) : ticket?.mimeType.startsWith('image/') ? (
        <>
          {loadedUrl !== url ? <div role="status"><Skeleton className="h-48 w-full" /><span className="sr-only">Cargando foto</span></div> : null}
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ampliar foto de la evidencia">
            <img key={url} src={url} alt="Foto de la evidencia de entrega" referrerPolicy="no-referrer"
              className={`max-h-96 w-full rounded-lg object-contain ${loadedUrl !== url ? 'hidden' : ''}`}
              onLoad={() => setLoadedUrl(url)}
              onError={() => {
                if (!retried.current) {
                  retried.current = true;
                  refresh();
                } else setFailedUrl(url);
              }} />
          </a>
        </>
      ) : <p className="text-sm text-gray-600">Esta evidencia es un documento. Puedes abrirlo en otra pestaña.</p>}
      {url && !failed && !query.isFetching ? (
        <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir evidencia
        </a>
      ) : null}
    </section>
  );
}
