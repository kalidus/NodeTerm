/**
 * Copia un valor para IPC. Descarta funciones, nodos DOM y ciclos.
 */
export function cloneForIpc(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;
  const kind = typeof value;
  if (kind === 'function' || kind === 'symbol' || kind === 'bigint') return undefined;
  if (kind !== 'object') return value;
  if (depth > 10) return undefined;
  if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
  if (seen.has(value)) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (ArrayBuffer.isView(value)) return undefined;

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => cloneForIpc(item, depth + 1, seen));
  }

  const out = {};
  for (const key of Object.keys(value)) {
    if (!key || key.startsWith('_')) continue;
    try {
      const next = cloneForIpc(value[key], depth + 1, seen);
      if (next !== undefined) out[key] = next;
    } catch (_) {
      /* propiedad no legible */
    }
  }
  return out;
}
