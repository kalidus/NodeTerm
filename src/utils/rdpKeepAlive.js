/** Cadencia del timer. El envío real espera el umbral de inactividad. */
const RDP_KEEP_ALIVE_INTERVAL_MS = 10000;

/** Sin input real durante este tiempo, el siguiente tick mueve el ratón 1 px y lo devuelve. */
const RDP_KEEP_ALIVE_IDLE_MS = 15000;

function keepAlivePoints(x, y) {
  const px = Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 1;
  const py = Number.isFinite(y) ? Math.max(0, Math.trunc(y)) : 1;
  const nudgeX = px === 0 ? 1 : px - 1;
  return [
    { x: nudgeX, y: py },
    { x: px, y: py }
  ];
}

/**
 * Decide el nudge de ratón que mantiene viva la sesión RDP (directo y bastión).
 * No incluye teclas: un Shift suelto puede dejar un modificador pulsado.
 * @param {{ idleMs?: number, x?: number, y?: number, pointerDown?: boolean, fileTransferArmed?: boolean, idleThresholdMs?: number }} [opts]
 * @returns {{ points: Array<{ x: number, y: number }> } | null}
 */
function planRdpKeepAlive(opts = {}) {
  if (opts.pointerDown || opts.fileTransferArmed) return null;
  const threshold = Number.isFinite(opts.idleThresholdMs)
    ? opts.idleThresholdMs
    : RDP_KEEP_ALIVE_IDLE_MS;
  if (!(opts.idleMs >= threshold)) return null;
  return { points: keepAlivePoints(opts.x, opts.y) };
}

module.exports = {
  RDP_KEEP_ALIVE_INTERVAL_MS,
  RDP_KEEP_ALIVE_IDLE_MS,
  planRdpKeepAlive
};
