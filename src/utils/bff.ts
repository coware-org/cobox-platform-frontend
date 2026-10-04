/**
 * Utilidades para normalizar respuestas del BFF.
 *
 * El gateway devuelve los recursos de forma plana o envueltos en un sobre
 * ({ value }, { data }, { alert }, { resource }, ...). Estos helpers Centralizan
 * la tolerancia para que los services no dependan de la forma exacta del sobre.
 */

const DEFAULT_WRAPPER_KEYS = ['value', 'data', 'resource'];

/**
 * Devuelve el recurso interno de un sobre BFF.
 * Si la respuesta ya es plana, se devuelve tal cual.
 */
export function unwrapBffResource(
  data: unknown,
  keys: string[] = DEFAULT_WRAPPER_KEYS,
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const outer = data as Record<string, unknown>;
  for (const key of keys) {
    const nested = outer[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }

  return outer;
}

/**
 * Normaliza una lista de recursos: acepta el array plano o envuelto
 * ({ value }, { data }, o la clave semantica del recurso).
 */
export function unwrapBffList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== 'object') return [];

  const outer = data as Record<string, unknown>;
  for (const key of keys) {
    const nested = outer[key];
    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}