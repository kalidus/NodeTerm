/** Máximo de paneles por pestaña. Ghostty no tiene tope; aquí cada panel es un xterm y un proceso. */
export const MAX_SPLIT_PANES = 8;

const MIN_RATIO = 20;
const MAX_RATIO = 80;

export function clampSplitRatio(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, n));
}

export function splitPathKey(path) {
  return path && path.length ? path.join('/') : 'root';
}

/**
 * Coloca el árbol de splits en porcentajes del contenedor.
 * orientation vertical = izquierda|derecha; horizontal = arriba/abajo.
 */
export function layoutSplitTree(node, sizes, rect = { x: 0, y: 0, w: 100, h: 100 }, path = []) {
  const panes = [];
  const gutters = [];

  const walk = (current, area, currentPath) => {
    if (!current) return;
    const isLeaf = current.type === 'terminal' || (!current.first && !current.second && current.key);
    if (isLeaf) {
      if (current.key) {
        panes.push({ key: current.key, node: current, path: currentPath, rect: area });
      }
      return;
    }

    const ratio = clampSplitRatio(sizes?.[splitPathKey(currentPath)] ?? 50);
    const stacked = current.orientation === 'horizontal';
    if (stacked) {
      const topH = area.h * ratio / 100;
      walk(current.first, { x: area.x, y: area.y, w: area.w, h: topH }, [...currentPath, 'first']);
      walk(current.second, { x: area.x, y: area.y + topH, w: area.w, h: area.h - topH }, [...currentPath, 'second']);
    } else {
      const leftW = area.w * ratio / 100;
      walk(current.first, { x: area.x, y: area.y, w: leftW, h: area.h }, [...currentPath, 'first']);
      walk(current.second, { x: area.x + leftW, y: area.y, w: area.w - leftW, h: area.h }, [...currentPath, 'second']);
    }

    gutters.push({
      path: currentPath,
      orientation: stacked ? 'horizontal' : 'vertical',
      parent: area,
      ratio,
    });
  };

  walk(node, rect, path);
  return { panes, gutters };
}

function rangesOverlap(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0) > 0.5;
}

export function neighborByRect(panes, key, direction) {
  const current = panes.find((pane) => pane.key === key);
  if (!current) return null;
  const cx = current.rect.x + current.rect.w / 2;
  const cy = current.rect.y + current.rect.h / 2;
  let best = null;
  let bestDist = Infinity;

  for (const pane of panes) {
    if (pane.key === key) continue;
    const px = pane.rect.x + pane.rect.w / 2;
    const py = pane.rect.y + pane.rect.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    if (direction === 'right' && dx <= 0.5) continue;
    if (direction === 'left' && dx >= -0.5) continue;
    if (direction === 'down' && dy <= 0.5) continue;
    if (direction === 'up' && dy >= -0.5) continue;
    if (direction === 'left' || direction === 'right') {
      if (!rangesOverlap(current.rect.y, current.rect.y + current.rect.h, pane.rect.y, pane.rect.y + pane.rect.h)) continue;
    } else if (!rangesOverlap(current.rect.x, current.rect.x + current.rect.w, pane.rect.x, pane.rect.x + pane.rect.w)) {
      continue;
    }
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = pane.key;
    }
  }
  return best;
}

export function resizeFocusedPane({ panes, gutters, focusedKey, direction, sizes }) {
  const pane = panes.find((item) => item.key === focusedKey);
  if (!pane) return null;
  const wantsRow = direction === 'left' || direction === 'right';

  for (let i = pane.path.length - 1; i >= 0; i -= 1) {
    const side = pane.path[i];
    const parentPath = pane.path.slice(0, i);
    const gutter = gutters.find((item) => splitPathKey(item.path) === splitPathKey(parentPath));
    if (!gutter) continue;
    const isRow = gutter.orientation !== 'horizontal';
    if (wantsRow !== isRow) continue;
    const key = splitPathKey(parentPath);
    const current = clampSplitRatio(sizes?.[key] ?? 50);
    const growFirst = direction === 'right' || direction === 'down';
    const delta = (side === 'first') === growFirst ? 5 : -5;
    return { key, value: clampSplitRatio(current + delta) };
  }
  return null;
}
