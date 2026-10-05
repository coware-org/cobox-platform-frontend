# Evidencias para gestión

Rama: `feature/manager-evidence-flow`, creada desde `origin/dev` (rama de integración del repositorio).

## Comportamiento implementado

- Historial y alertas leen las respuestas anidadas de Desktop BFF y conservan el contexto parcial.
- La identidad de la foto es `clientEvidenceId`; una alerta se identifica por `alertId`.
- El historial abre el detalle mediante `?evidenceId=...`, preservando los otros parámetros al cerrarlo.
- Historial, alertas e incidentes comparten foto y resultado de IA. Sus errores son independientes.
- El detalle directo actualiza los resultados sin eliminar nombres o datos enriquecidos del BFF.
- Estados y filtros usan `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REVIEW_REQUIRED`, `RECAPTURE_REQUIRED`, `FRAUD_SUSPECTED`, `DEGRADED`. Un estado desconocido se muestra sin inventar una equivalencia.
- Consultas activas con análisis pendientes se actualizan cada 5 segundos. Los estados finales y errores detienen el refresco periódico. Se conserva actualización manual.
- Confianza se presenta sobre 100; fraude sobre 1. No se infiere la escala por el valor del puntaje.

## Descarga

`GET /api/v1/mobile/evidence/{clientEvidenceId}/download-url` se invoca con el JWT mediante el cliente API existente. La foto usa el GET firmado directamente; no se transmite el JWT a S3.

Se valida identidad, método GET, MIME, URL HTTP(S) y vencimiento. `ResponseContentType` se tolera como dato opcional del contrato actual, no como cabecera de la imagen. Cualquier otra cabecera obligatoria requiere acordar un contrato compatible con el visor.

La URL se conserva solo en memoria, por usuario y evidencia, y se elimina de la caché cuando deja de usarse. Se renueva 10 segundos antes de vencer. Un error de carga de la imagen permite una renovación automática; después se ofrece reintento manual. El cambio de sesión limpia las consultas.

## Contratos pendientes de backend

- Coordinación persistente entre confirmación y llegada de contexto Edge.
- Permisos de la identidad técnica de AI Validation para consultar Edge.
- Entrega de eventos, reintentos y DLQ.
- Garantía de evidencia confirmada y objeto existente antes de descargar.
- OCR (`ocrText`) y etiquetas (`detectedLabels`): el frontend ya los acepta y muestra cuando existen, pero el backend actual los omite.
- Estados nuevos como `WAITING_CONTEXT`: acordarlos antes de incorporarlos a filtros y refresco periódico.
- El 404 de análisis no distingue todavía procesamiento no registrado de evidencia inexistente; se muestra ausencia de análisis y se ofrece actualización manual.

## Verificación

Con Node.js 24 y las dependencias del proyecto instaladas:

```sh
npm test
npm run build
npm run lint
```

Las pruebas usan el runner nativo de Node y Vite para renderizar componentes con respuestas simuladas. Vite puede abrir un puerto local temporal incluso en modo middleware, por lo que esa suite necesita permiso de red local en un sandbox restrictivo. No consulta AWS, Auth0 ni servicios desplegados.

Los fixtures están en `tests/fixtures/smartvision.json`. Cubren identidad, contratos anidados, contexto parcial, estados, renovación de URL, separación de errores y autorización de la petición de descarga. El lint global presenta errores preexistentes en otros módulos; los archivos de esta funcionalidad se comprueban por separado.

## Prueba conjunta pendiente

1. Subir una foto desde la app móvil y conservar su `clientEvidenceId`.
2. Abrir el historial como manager y visualizar foto y análisis de esa evidencia.
3. Repetir desde una alerta y un enlace directo, con y sin contexto completo.
4. Comprobar una URL vencida, acceso denegado, objeto ausente y fallo temporal de IA.
5. Confirmar la transición desde procesamiento pendiente hasta resultado final.
6. Verificar que el análisis sin alerta también aparece en el historial.

El `package-lock.json` tenía cambios locales antes de esta tarea y no se incluye en el commit.
