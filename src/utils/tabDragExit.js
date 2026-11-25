'use strict';

/** Píxeles más allá del borde para que la ventana nueva no quede encima del origen. */
const DETACH_NUDGE_PX = 48;

/**
 * Salida real de la ventana durante un drag HTML5.
 * Moverse entre pestañas deja relatedTarget en otro nodo y no cuenta.
 * @param {{ relatedTarget?: EventTarget|null, clientX?: number, clientY?: number }|null} event
 * @param {{ width?: number, height?: number }|null} viewport
 * @returns {{ edge: 'top'|'left'|'right'|'bottom', clientX: number, clientY: number }|null}
 */
function pointerLeftWindow(event, viewport) {
  if (!event || event.relatedTarget != null) return null;
  const width = viewport && Number(viewport.width);
  const height = viewport && Number(viewport.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const clientX = Number(event.clientX);
  const clientY = Number(event.clientY);
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  if (!(clientX <= 0 || clientY <= 0 || clientX >= width || clientY >= height)) return null;
  return {
    edge: crossedEdge(clientX, clientY, width, height),
    clientX,
    clientY
  };
}

function crossedEdge(clientX, clientY, width, height) {
  const overflow = {
    left: clientX <= 0 ? (0 - clientX) : -1,
    right: clientX >= width ? (clientX - width) : -1,
    top: clientY <= 0 ? (0 - clientY) : -1,
    bottom: clientY >= height ? (clientY - height) : -1
  };
  let best = 'top';
  let bestScore = -1;
  for (const edge of ['top', 'bottom', 'left', 'right']) {
    if (overflow[edge] > bestScore) {
      best = edge;
      bestScore = overflow[edge];
    }
  }
  return best;
}

function pointOutsideBounds(point, bounds) {
  if (!point || !bounds) return false;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  return point.x < bounds.x || point.y < bounds.y
    || point.x > bounds.x + bounds.width
    || point.y > bounds.y + bounds.height;
}

/**
 * Punto de pantalla para la ventana desprendida.
 * Si el cursor global ya está fuera de la ventana, se usa.
 * Si no, se parte del borde cruzado en coordenadas de la ventana y se empuja hacia fuera.
 * @param {{ x: number, y: number, width: number, height: number }|null} bounds
 * @param {{ x: number, y: number }|null} cursor
 * @param {{ edge?: string, clientX?: number, clientY?: number }|null} hint
 * @returns {{ x: number, y: number }}
 */
function resolveDetachPoint(bounds, cursor, hint) {
  const safe = bounds && Number.isFinite(bounds.x) && Number.isFinite(bounds.y)
    ? bounds
    : { x: 0, y: 0, width: 0, height: 0 };
  if (pointOutsideBounds(cursor, safe)) {
    return { x: cursor.x, y: cursor.y };
  }

  const width = Number.isFinite(safe.width) ? safe.width : 0;
  const height = Number.isFinite(safe.height) ? safe.height : 0;
  const clientX = hint && Number(hint.clientX);
  const clientY = hint && Number(hint.clientY);
  let x = safe.x + (Number.isFinite(clientX) ? clientX : width / 2);
  let y = safe.y + (Number.isFinite(clientY) ? clientY : 0);
  const edge = hint && hint.edge;
  if (edge === 'top') y = Math.min(y, safe.y) - DETACH_NUDGE_PX;
  else if (edge === 'bottom') y = Math.max(y, safe.y + height) + DETACH_NUDGE_PX;
  else if (edge === 'left') x = Math.min(x, safe.x) - DETACH_NUDGE_PX;
  else if (edge === 'right') x = Math.max(x, safe.x + width) + DETACH_NUDGE_PX;

  return { x: Math.round(x), y: Math.round(y) };
}

module.exports = {
  DETACH_NUDGE_PX,
  pointerLeftWindow,
  crossedEdge,
  pointOutsideBounds,
  resolveDetachPoint
};
