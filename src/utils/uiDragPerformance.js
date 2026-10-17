/**
 * Marca el body durante drags de UI (splits, paneles) para degradar efectos
 * caros (backdrop-filter) y mantener FPS en cualquier SO.
 */
export function setUiDragging(active) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('nodeterm-ui-dragging', !!active);
}
