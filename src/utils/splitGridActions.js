/**
 * Geometría de la cuadrícula de splits (máx. 4) y atajos de foco.
 * 2 vertical: [0 | 1]
 * 2 horizontal: [0 / 1]
 * 3: [0 | 1] / [2]
 * 4: [0 | 1] / [2 | 3]
 */

const STEP = 5;
const MIN = 20;
const MAX = 80;

function clamp(value) {
  return Math.max(MIN, Math.min(MAX, value));
}

export function neighborIndex(index, direction, count, orientation) {
  if (count <= 1 || index < 0 || index >= count) return null;
  const stacked = orientation === 'horizontal';

  if (count === 2) {
    if (stacked) {
      if (direction === 'up') return index === 1 ? 0 : null;
      if (direction === 'down') return index === 0 ? 1 : null;
      return null;
    }
    if (direction === 'left') return index === 1 ? 0 : null;
    if (direction === 'right') return index === 0 ? 1 : null;
    return null;
  }

  if (count === 3) {
    if (direction === 'left') return index === 1 ? 0 : null;
    if (direction === 'right') return index === 0 ? 1 : null;
    if (direction === 'down') return index === 0 || index === 1 ? 2 : null;
    if (direction === 'up') return index === 2 ? 0 : null;
    return null;
  }

  if (count === 4) {
    const map = {
      0: { right: 1, down: 2 },
      1: { left: 0, down: 3 },
      2: { right: 3, up: 0 },
      3: { left: 2, up: 1 },
    };
    const next = map[index]?.[direction];
    return Number.isInteger(next) ? next : null;
  }

  return null;
}

export function cycleIndex(index, count, delta) {
  if (count <= 1) return null;
  const start = index < 0 ? 0 : index;
  return (start + delta + count) % count;
}

/**
 * Crece o encoge el panel con foco. Devuelve solo los porcentajes que cambian.
 */
export function resizeGrid({
  count,
  orientation,
  index,
  direction,
  verticalSplit,
  horizontalSplit,
  verticalSplitBottom,
}) {
  if (count < 2 || index < 0) return null;
  const stacked = orientation === 'horizontal';

  const horizontalMove = (leftIndex, current) => {
    const isLeft = index === leftIndex;
    if (direction === 'right') return clamp(current + (isLeft ? STEP : -STEP));
    if (direction === 'left') return clamp(current + (isLeft ? -STEP : STEP));
    return null;
  };

  if (count === 2 && !stacked) {
    const next = horizontalMove(0, verticalSplit);
    if (direction !== 'left' && direction !== 'right') return null;
    return next == null ? null : { verticalSplit: next };
  }

  if (count === 2 && stacked) {
    if (direction === 'down') return { horizontalSplit: clamp(horizontalSplit + (index === 0 ? STEP : -STEP)) };
    if (direction === 'up') return { horizontalSplit: clamp(horizontalSplit + (index === 0 ? -STEP : STEP)) };
    return null;
  }

  if (count === 3) {
    if (index === 0 || index === 1) {
      if (direction === 'left' || direction === 'right') {
        const next = horizontalMove(0, verticalSplit);
        return next == null ? null : { verticalSplit: next };
      }
      if (direction === 'down') return { horizontalSplit: clamp(horizontalSplit + STEP) };
      if (direction === 'up') return { horizontalSplit: clamp(horizontalSplit - STEP) };
      return null;
    }
    if (direction === 'up') return { horizontalSplit: clamp(horizontalSplit - STEP) };
    if (direction === 'down') return { horizontalSplit: clamp(horizontalSplit + STEP) };
    return null;
  }

  if (count === 4) {
    const top = index < 2;
    if (direction === 'left' || direction === 'right') {
      const current = top ? verticalSplit : verticalSplitBottom;
      const next = horizontalMove(top ? 0 : 2, current);
      if (next == null) return null;
      return top ? { verticalSplit: next } : { verticalSplitBottom: next };
    }
    if (direction === 'down') return { horizontalSplit: clamp(horizontalSplit + (top ? STEP : -STEP)) };
    if (direction === 'up') return { horizontalSplit: clamp(horizontalSplit + (top ? -STEP : STEP)) };
  }

  return null;
}

/**
 * Atajos sin Ctrl (AltGr en teclado español es Ctrl+Alt) y sin Ctrl+Alt+flechas
 * (en Windows gira la pantalla).
 */
export function parseSplitShortcut(event) {
  if (!event || event.ctrlKey || event.metaKey || !event.altKey || event.isComposing) return null;
  const shift = !!event.shiftKey;
  const code = event.code || '';

  if (!shift && code.startsWith('Arrow')) {
    return { type: 'focus', direction: code.slice('Arrow'.length).toLowerCase() };
  }
  if (shift && code.startsWith('Arrow')) {
    return { type: 'resize', direction: code.slice('Arrow'.length).toLowerCase() };
  }
  if (!shift && (code === 'PageUp' || code === 'PageDown')) {
    return { type: 'cycle', delta: code === 'PageDown' ? 1 : -1 };
  }
  if (shift && (code === 'Enter' || code === 'NumpadEnter')) {
    return { type: 'zoom' };
  }
  if (shift && (code === 'Equal' || code === 'NumpadAdd' || event.key === '=' || event.key === '+')) {
    return { type: 'equalize' };
  }
  return null;
}
