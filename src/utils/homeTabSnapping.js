/**
 * Motor de Snapping Magnético Inteligente y Auto-Alineación para paneles de HomeTab en NodeTerm.
 * 
 * Proporciona:
 * - Imantación en tiempo real a bordes de paneles hermanos y márgenes del canvas (con gap estándar de 12px).
 * - Imantación de alturas compartidas en la misma fila.
 * - Generación de guías visuales (líneas holográficas).
 * - Auto-nivelación de filas y distribución equitativa.
 */

export const SNAP_CONFIG = {
  THRESHOLD: 10,       // Distancia en px para activar la imantación
  GAP: 12,             // Separación estándar entre paneles contiguos
  CANVAS_PAD: 16       // Margen exterior con respecto al contenedor
};

export const MINIMIZED_PANEL_HEIGHT = 30;

const LAYOUT_META_KEYS = new Set(['canvasWidth', 'canvasHeight']);

export function isHomePanelState(id, value) {
  return Boolean(id) && !LAYOUT_META_KEYS.has(id) && value && typeof value === 'object';
}

export function attachCanvasSize(layout, canvasW, canvasH) {
  if (!layout || typeof layout !== 'object') return layout;
  return {
    ...layout,
    canvasWidth: canvasW,
    canvasHeight: canvasH
  };
}

export function getLayoutCanvasSize(layout) {
  const w = Number(layout?.canvasWidth);
  const h = Number(layout?.canvasHeight);
  if (w > 0 && h > 0) return { width: w, height: h };
  return null;
}

export function getVisiblePanelsBBox(layout) {
  let minX = Infinity;
  let minY = Infinity;
  let maxR = 0;
  let maxB = 0;
  let found = false;
  Object.entries(layout || {}).forEach(([id, panel]) => {
    if (!isHomePanelState(id, panel) || panel.visible === false) return;
    found = true;
    const x = Number(panel.x) || 0;
    const y = Number(panel.y) || 0;
    const w = Number(panel.width) || 0;
    const h = panel.isMinimized ? MINIMIZED_PANEL_HEIGHT : (Number(panel.height) || 0);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxR = Math.max(maxR, x + w);
    maxB = Math.max(maxB, y + h);
  });
  if (!found) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxR - minX),
    height: Math.max(1, maxB - minY)
  };
}

export function resolveLayoutSourceCanvas(layout, fallbackW, fallbackH) {
  const stored = getLayoutCanvasSize(layout);
  if (stored) return stored;
  const bbox = getVisiblePanelsBBox(layout);
  if (bbox.width > 0 && bbox.height > 0) {
    return {
      width: Math.max(1, bbox.x + bbox.width),
      height: Math.max(1, bbox.y + bbox.height)
    };
  }
  return {
    width: fallbackW > 0 ? fallbackW : 1200,
    height: fallbackH > 0 ? fallbackH : 800
  };
}

function scaleBounds(bounds, sx, sy) {
  if (!bounds) return bounds;
  return {
    x: (Number(bounds.x) || 0) * sx,
    y: (Number(bounds.y) || 0) * sy,
    width: (Number(bounds.width) || 0) * sx,
    height: (Number(bounds.height) || 0) * sy
  };
}

/**
 * Escala el layout de un canvas origen a un canvas destino, conservando la composicion.
 * Si tras minimos el bounding box no cabe, reduce el grupo de forma uniforme.
 */
export function scalePanelsToCanvas(layout, fromW, fromH, toW, toH) {
  if (!layout || toW <= 0 || toH <= 0) return layout;
  const srcW = fromW > 0 ? fromW : toW;
  const srcH = fromH > 0 ? fromH : toH;

  if (Math.abs(srcW - toW) < 2 && Math.abs(srcH - toH) < 2) {
    return attachCanvasSize(layout, toW, toH);
  }

  const sx = toW / srcW;
  const sy = toH / srcH;
  const next = attachCanvasSize({ ...layout }, toW, toH);

  Object.keys(next).forEach((id) => {
    const panel = next[id];
    if (!isHomePanelState(id, panel) || panel.visible === false) return;

    if (panel.isMaximized) {
      next[id] = {
        ...panel,
        x: 0,
        y: 0,
        width: toW,
        height: toH,
        originalBounds: scaleBounds(panel.originalBounds, sx, sy),
        preMinimizedHeight: panel.preMinimizedHeight
          ? panel.preMinimizedHeight * sy
          : panel.preMinimizedHeight
      };
      return;
    }

    const scaledW = Math.max(72, (Number(panel.width) || 160) * sx);
    const scaledH = panel.isMinimized
      ? MINIMIZED_PANEL_HEIGHT
      : Math.max(48, (Number(panel.height) || 90) * sy);

    next[id] = clampRectToCanvas(
      {
        ...panel,
        x: (Number(panel.x) || 0) * sx,
        y: (Number(panel.y) || 0) * sy,
        width: scaledW,
        height: scaledH,
        originalBounds: scaleBounds(panel.originalBounds, sx, sy),
        preMinimizedHeight: panel.preMinimizedHeight
          ? panel.preMinimizedHeight * sy
          : panel.preMinimizedHeight
      },
      toW,
      toH,
      Math.min(scaledW, toW),
      Math.min(scaledH, toH)
    );
  });

  const bbox = getVisiblePanelsBBox(next);
  if (bbox.width > toW + 1 || bbox.height > toH + 1) {
    const extra = Math.min(1, toW / Math.max(1, bbox.width), toH / Math.max(1, bbox.height));
    if (extra < 0.999) {
      Object.keys(next).forEach((id) => {
        const panel = next[id];
        if (!isHomePanelState(id, panel) || panel.visible === false || panel.isMaximized) return;
        const fittedW = Math.max(72, (Number(panel.width) || 160) * extra);
        const fittedH = panel.isMinimized
          ? MINIMIZED_PANEL_HEIGHT
          : Math.max(48, (Number(panel.height) || 90) * extra);
        next[id] = clampRectToCanvas(
          {
            ...panel,
            x: (Number(panel.x) || 0) * extra,
            y: (Number(panel.y) || 0) * extra,
            width: fittedW,
            height: fittedH
          },
          toW,
          toH,
          Math.min(fittedW, toW),
          Math.min(fittedH, toH)
        );
      });
    }
  }

  return ensureShowingPanelsPeek(raiseCoveredPanels(next), toW, toH);
}

export function isPanelShowing(id, panel) {
  if (!isHomePanelState(id, panel)) return false;
  if (panel.visible === false) return false;
  if (id === 'search' || id === 'terminal') return true;
  return panel.visible === true;
}

function panelRect(panel) {
  return {
    x: Number(panel.x) || 0,
    y: Number(panel.y) || 0,
    w: Number(panel.width) || 0,
    h: panel.isMinimized ? MINIMIZED_PANEL_HEIGHT : (Number(panel.height) || 0)
  };
}

function coverageRatio(outer, inner) {
  const a = panelRect(outer);
  const b = panelRect(inner);
  if (b.w < 8 || b.h < 8) return 0;
  const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (overlapX * overlapY) / Math.max(1, b.w * b.h);
}

/**
 * Si un panel visible queda casi cubierto por otro con z-index mayor o igual,
 * lo sube al frente para que no desaparezca al compactar el canvas.
 */
export function raiseCoveredPanels(layout) {
  const ids = Object.keys(layout || {}).filter((id) => isPanelShowing(id, layout[id]) && !layout[id].isMaximized);
  if (ids.length < 2) return layout;
  const next = { ...layout };
  let maxZ = 10;
  Object.values(next).forEach((p) => {
    if (p && typeof p.zIndex === 'number') maxZ = Math.max(maxZ, p.zIndex);
  });

  ids.forEach((id) => {
    const panel = next[id];
    const buried = ids.some((otherId) => {
      if (otherId === id) return false;
      const other = next[otherId];
      const zPanel = panel.zIndex || 0;
      const zOther = other.zIndex || 0;
      return zOther >= zPanel && coverageRatio(other, panel) >= 0.8;
    });
    if (buried) {
      maxZ += 1;
      next[id] = { ...panel, zIndex: maxZ };
    }
  });
  return next;
}

export function preserveShowingPanels(previous, next) {
  if (!next) return next;
  if (!previous) return next;
  const out = { ...next };
  Object.keys(previous).forEach((id) => {
    if (!isPanelShowing(id, previous[id]) || !isHomePanelState(id, out[id])) return;
    if (id === 'search' || id === 'terminal') {
      if (out[id].visible === false) {
        out[id] = { ...out[id], visible: true };
      }
      return;
    }
    if (out[id].visible !== true) {
      out[id] = { ...out[id], visible: true };
    }
  });
  return out;
}

/**
 * Si tras compactar un panel sigue tapado, lo trae al frente en cascada
 * para que se vea al menos la barra de titulo.
 */
export function ensureShowingPanelsPeek(layout, canvasW, canvasH) {
  if (!layout || canvasW <= 0 || canvasH <= 0) return layout;
  const next = { ...layout };
  const ids = Object.keys(next).filter((id) => isPanelShowing(id, next[id]) && !next[id].isMaximized);
  if (ids.length < 2) return next;

  let maxZ = 10;
  Object.values(next).forEach((p) => {
    if (p && typeof p.zIndex === 'number') maxZ = Math.max(maxZ, p.zIndex);
  });

  const STEP = 36;
  let cascade = 0;
  ids.forEach((id) => {
    const panel = next[id];
    const buried = ids.some((otherId) => {
      if (otherId === id) return false;
      const other = next[otherId];
      return (other.zIndex || 0) >= (panel.zIndex || 0) && coverageRatio(other, panel) >= 0.72;
    });
    if (!buried) return;

    cascade += 1;
    maxZ += 1;
    const ox = Math.min(Math.max(0, canvasW - 96), STEP * cascade);
    const oy = Math.min(Math.max(0, canvasH - 64), STEP * cascade);
    const capW = Math.min(Number(panel.width) || 160, Math.floor(canvasW * 0.86), Math.max(72, canvasW - ox));
    const capH = panel.isMinimized
      ? MINIMIZED_PANEL_HEIGHT
      : Math.min(Number(panel.height) || 90, Math.floor(canvasH * 0.86), Math.max(48, canvasH - oy));

    next[id] = clampRectToCanvas(
      {
        ...panel,
        x: ox,
        y: oy,
        width: Math.max(72, capW),
        height: Math.max(panel.isMinimized ? MINIMIZED_PANEL_HEIGHT : 48, capH),
        zIndex: maxZ
      },
      canvasW,
      canvasH,
      Math.min(Math.max(72, capW), canvasW),
      Math.min(Math.max(panel.isMinimized ? MINIMIZED_PANEL_HEIGHT : 48, capH), canvasH)
    );
  });

  return next;
}

/**
 * Recorta un rectangulo para que quede entero dentro del canvas.
 * Si el minimo supera el canvas, se reduce hasta caber.
 */
export function clampRectToCanvas(rect, canvasW, canvasH, minWidth = 160, minHeight = 90) {
  if (!rect || canvasW <= 0 || canvasH <= 0) return rect;
  const minW = Math.max(1, Math.min(minWidth, canvasW));
  const minH = Math.max(1, Math.min(minHeight, canvasH));
  const width = Math.min(canvasW, Math.max(minW, Math.round(Number(rect.width) || minW)));
  const height = Math.min(canvasH, Math.max(minH, Math.round(Number(rect.height) || minH)));
  const x = Math.max(0, Math.min(Math.round(Number(rect.x) || 0), canvasW - width));
  const y = Math.max(0, Math.min(Math.round(Number(rect.y) || 0), canvasH - height));
  return { ...rect, x, y, width, height };
}

/**
 * Ajusta el layout de paneles al canvas actual sin reorganizar filas ni columnas.
 * Los maximizados llenan el canvas; el resto mantiene px y se empuja/recorta si se sale.
 */
export function clampPanelsToCanvas(layout, canvasW, canvasH) {
  if (!layout || canvasW <= 0 || canvasH <= 0) return layout;
  const next = { ...layout };
  Object.keys(next).forEach((id) => {
    const panel = next[id];
    if (!isHomePanelState(id, panel) || panel.visible === false) return;
    if (panel.isMaximized) {
      next[id] = {
        ...panel,
        x: 0,
        y: 0,
        width: canvasW,
        height: canvasH
      };
      return;
    }
    const minW = panel.minWidth || 160;
    const minH = panel.isMinimized ? MINIMIZED_PANEL_HEIGHT : (panel.minHeight || 90);
    next[id] = {
      ...panel,
      ...clampRectToCanvas(panel, canvasW, canvasH, minW, minH)
    };
  });
  return next;
}

/**
 * Calcula la posición imantada magnéticamente durante el arrastre (drag).
 * 
 * @param {string} draggedId ID del panel en movimiento
 * @param {{x: number, y: number, width: number, height: number}} current Coordenadas actuales
 * @param {Record<string, any>} allPanels Mapa de todos los paneles
 * @param {{width: number, height: number}} containerBounds Límites del canvas contenedor
 * @param {Partial<typeof SNAP_CONFIG>} [customConfig] Configuración opcional
 * @returns {{ x: number, y: number, guides: Array<{ type: 'vertical'|'horizontal', pos: number, start: number, end: number, reason?: string }> }}
 */
export function calculateDragSnap(
  draggedId,
  current,
  allPanels,
  containerBounds,
  customConfig = {}
) {
  const cfg = { ...SNAP_CONFIG, ...customConfig };
  const { width: cW, height: cH } = containerBounds;
  const pW = current.width;
  const pH = current.height;

  let bestX = current.x;
  let minDiffX = cfg.THRESHOLD + 1;
  let guideX = null;

  let bestY = current.y;
  let minDiffY = cfg.THRESHOLD + 1;
  let guideY = null;

  // Filtrar paneles activos relevantes
  const otherPanels = Object.entries(allPanels || {}).filter(
    ([id, p]) => id !== draggedId && p && p.visible !== false && !p.isMaximized
  );

  // --- CANDIDATOS EN EL EJE X ---
  const xCandidates = [
    // Borde izquierdo del canvas
    { targetX: cfg.CANVAS_PAD, guideLine: cfg.CANVAS_PAD, reason: 'canvas-left' },
    // Borde derecho del canvas
    { targetX: cW - cfg.CANVAS_PAD - pW, guideLine: cW - cfg.CANVAS_PAD, reason: 'canvas-right' },
    // Centro del canvas
    { targetX: Math.round((cW - pW) / 2), guideLine: Math.round(cW / 2), reason: 'canvas-center' }
  ];

  otherPanels.forEach(([_, other]) => {
    const oX = other.x;
    const oR = other.x + other.width;
    const oMid = other.x + Math.round(other.width / 2);

    // 1. Alinear borde izquierdo con borde izquierdo
    xCandidates.push({ targetX: oX, guideLine: oX, reason: 'align-left', otherY1: other.y, otherY2: other.y + other.height });
    // 2. Alinear borde derecho con borde derecho
    xCandidates.push({ targetX: oR - pW, guideLine: oR, reason: 'align-right', otherY1: other.y, otherY2: other.y + other.height });
    // 3. Imantar a la derecha del vecino (respetando gap)
    xCandidates.push({ targetX: oR + cfg.GAP, guideLine: oR + cfg.GAP, reason: 'gap-right', otherY1: other.y, otherY2: other.y + other.height });
    // 4. Imantar a la izquierda del vecino (respetando gap)
    xCandidates.push({ targetX: oX - pW - cfg.GAP, guideLine: oX - cfg.GAP, reason: 'gap-left', otherY1: other.y, otherY2: other.y + other.height });
    // 5. Centros alineados
    xCandidates.push({ targetX: oMid - Math.round(pW / 2), guideLine: oMid, reason: 'align-center-x', otherY1: other.y, otherY2: other.y + other.height });
  });

  for (const cand of xCandidates) {
    const diff = Math.abs(current.x - cand.targetX);
    if (diff < minDiffX) {
      minDiffX = diff;
      bestX = cand.targetX;
      guideX = cand;
    }
  }

  // --- CANDIDATOS EN EL EJE Y ---
  const yCandidates = [
    // Borde superior del canvas
    { targetY: cfg.CANVAS_PAD, guideLine: cfg.CANVAS_PAD, reason: 'canvas-top' },
    // Borde inferior del canvas
    { targetY: cH - cfg.CANVAS_PAD - pH, guideLine: cH - cfg.CANVAS_PAD, reason: 'canvas-bottom' }
  ];

  otherPanels.forEach(([_, other]) => {
    const oY = other.y;
    const oB = other.y + other.height;
    const oMid = other.y + Math.round(other.height / 2);

    // 1. Alinear borde superior con borde superior
    yCandidates.push({ targetY: oY, guideLine: oY, reason: 'align-top', otherX1: other.x, otherX2: other.x + other.width });
    // 2. Alinear borde inferior con borde inferior
    yCandidates.push({ targetY: oB - pH, guideLine: oB, reason: 'align-bottom', otherX1: other.x, otherX2: other.x + other.width });
    // 3. Imantar debajo del vecino (respetando gap)
    yCandidates.push({ targetY: oB + cfg.GAP, guideLine: oB + cfg.GAP, reason: 'gap-bottom', otherX1: other.x, otherX2: other.x + other.width });
    // 4. Imantar encima del vecino (respetando gap)
    yCandidates.push({ targetY: oY - pH - cfg.GAP, guideLine: oY - cfg.GAP, reason: 'gap-top', otherX1: other.x, otherX2: other.x + other.width });
    // 5. Centros verticales alineados
    yCandidates.push({ targetY: oMid - Math.round(pH / 2), guideLine: oMid, reason: 'align-center-y', otherX1: other.x, otherX2: other.x + other.width });
  });

  for (const cand of yCandidates) {
    const diff = Math.abs(current.y - cand.targetY);
    if (diff < minDiffY) {
      minDiffY = diff;
      bestY = cand.targetY;
      guideY = cand;
    }
  }

  // Construir las líneas guía activas para visualización holográfica
  const guides = [];

  if (guideX && minDiffX <= cfg.THRESHOLD) {
    const startY = Math.min(bestY, guideX.otherY1 !== undefined ? guideX.otherY1 : 0);
    const endY = Math.max(bestY + pH, guideX.otherY2 !== undefined ? guideX.otherY2 : cH);
    guides.push({
      type: 'vertical',
      pos: guideX.guideLine,
      start: Math.max(0, startY - 10),
      end: Math.min(cH, endY + 10),
      reason: guideX.reason
    });
  } else {
    bestX = current.x;
  }

  if (guideY && minDiffY <= cfg.THRESHOLD) {
    const startX = Math.min(bestX, guideY.otherX1 !== undefined ? guideY.otherX1 : 0);
    const endX = Math.max(bestX + pW, guideY.otherX2 !== undefined ? guideY.otherX2 : cW);
    guides.push({
      type: 'horizontal',
      pos: guideY.guideLine,
      start: Math.max(0, startX - 10),
      end: Math.min(cW, endX + 10),
      reason: guideY.reason
    });
  } else {
    bestY = current.y;
  }

  const clamped = clampRectToCanvas(
    { x: bestX, y: bestY, width: pW, height: pH },
    cW,
    cH,
    pW,
    pH
  );

  return {
    x: clamped.x,
    y: clamped.y,
    guides
  };
}

/**
 * Calcula los límites de colisión y el espacio disponible para el redimensionado de un panel,
 * analizando los obstáculos vecinos que intersectan en el eje transversal y los márgenes del canvas.
 * 
 * @param {string} panelId ID del panel
 * @param {{x: number, y: number, width: number, height: number}} currentRect Posición y tamaño actual
 * @param {Record<string, any>} allPanels Mapa de todos los paneles
 * @param {{width: number, height: number}} containerBounds Dimensiones del canvas
 * @param {Partial<typeof SNAP_CONFIG>} [customConfig]
 * @returns {{ maxRight: number, maxBottom: number, minLeft: number, minTop: number, maxWidth: number, maxHeight: number }}
 */
export function getAvailableResizeBounds(
  panelId,
  currentRect,
  allPanels,
  containerBounds,
  customConfig = {}
) {
  const cfg = { ...SNAP_CONFIG, ...customConfig };
  const cW = containerBounds?.width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const cH = containerBounds?.height || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const { x, y, width, height } = currentRect;
  const currentRight = x + width;
  const currentBottom = y + height;

  let maxRight = cW - cfg.CANVAS_PAD;
  let maxBottom = cH - cfg.CANVAS_PAD;
  let minLeft = cfg.CANVAS_PAD;
  let minTop = cfg.CANVAS_PAD;

  if (!allPanels) {
    return {
      maxRight,
      maxBottom,
      minLeft,
      minTop,
      maxWidth: Math.max(160, maxRight - x),
      maxHeight: Math.max(90, maxBottom - y)
    };
  }

  const otherPanels = Object.entries(allPanels).filter(
    ([id, p]) => id !== panelId && p && p.visible !== false && !p.isMaximized
  );

  for (const [_, other] of otherPanels) {
    const oX = other.x;
    const oY = other.y;
    const oW = other.width;
    const oH = other.height;
    const oR = oX + oW;
    const oB = oY + oH;

    // Solapamiento en el eje vertical
    const vOverlap = Math.max(y, oY) < Math.min(currentBottom, oB) - 6;
    // Solapamiento en el eje horizontal
    const hOverlap = Math.max(x, oX) < Math.min(currentRight, oR) - 6;

    // Obstáculo a la DERECHA
    if (vOverlap && oX >= currentRight - 20) {
      const allowedRight = Math.max(currentRight, oX - cfg.GAP);
      if (allowedRight < maxRight) {
        maxRight = allowedRight;
      }
    }

    // Obstáculo ABAJO
    if (hOverlap && oY >= currentBottom - 20) {
      const allowedBottom = Math.max(currentBottom, oY - cfg.GAP);
      if (allowedBottom < maxBottom) {
        maxBottom = allowedBottom;
      }
    }

    // Obstáculo a la IZQUIERDA
    if (vOverlap && oR <= x + 20) {
      const allowedLeft = Math.min(x, oR + cfg.GAP);
      if (allowedLeft > minLeft) {
        minLeft = allowedLeft;
      }
    }

    // Obstáculo ARRIBA
    if (hOverlap && oB <= y + 20) {
      const allowedTop = Math.min(y, oB + cfg.GAP);
      if (allowedTop > minTop) {
        minTop = allowedTop;
      }
    }
  }

  maxRight = Math.max(currentRight, Math.max(x + 100, maxRight));
  maxBottom = Math.max(currentBottom, Math.max(y + 80, maxBottom));
  minLeft = Math.min(x, Math.min(currentRight - 100, minLeft));
  minTop = Math.min(y, Math.min(currentBottom - 80, minTop));

  return {
    maxRight,
    maxBottom,
    minLeft,
    minTop,
    maxWidth: Math.max(width, Math.max(160, Math.floor(maxRight - x))),
    maxHeight: Math.max(height, Math.max(90, Math.floor(maxBottom - y)))
  };
}

function pushResizeGuide(guides, matchedGuide, type, start, end, canvasLimit) {
  if (!matchedGuide) return;
  guides.push({
    type,
    pos: matchedGuide.guidePos,
    start: Math.max(0, start - 10),
    end: Math.min(canvasLimit, end + 10),
    reason: matchedGuide.reason
  });
}

/**
 * Imanta el resize a bordes de canvas y vecinos. No impide solapamiento.
 */
export function calculateResizeSnap(
  resizedId,
  current,
  direction,
  allPanels,
  containerBounds,
  customConfig = {}
) {
  const cfg = { ...SNAP_CONFIG, ...customConfig };
  const cW = containerBounds?.width || 0;
  const cH = containerBounds?.height || 0;
  const dir = direction || '';
  const panel = allPanels?.[resizedId] || {};
  const minW = panel.minWidth || 160;
  const minH = panel.minHeight || 90;

  let newX = current.x;
  let newY = current.y;
  let newW = current.width;
  let newH = current.height;
  const guides = [];

  const otherPanels = Object.entries(allPanels || {}).filter(
    ([id, p]) => id !== resizedId && p && p.visible !== false && !p.isMaximized
  );

  const isResizingRight = dir.includes('right') || dir.includes('Right');
  const isResizingBottom = dir.includes('bottom') || dir.includes('Bottom');
  const isResizingLeft = dir.includes('left') || dir.includes('Left');
  const isResizingTop = dir.includes('top') || dir.includes('Top');

  if (isResizingRight) {
    const currentRight = current.x + current.width;
    let bestRight = currentRight;
    let minDiffR = cfg.THRESHOLD + 1;
    let matchedGuide = null;

    const rightCandidates = [
      { target: cW, guidePos: cW, reason: 'canvas-right' },
      { target: cW - cfg.CANVAS_PAD, guidePos: cW - cfg.CANVAS_PAD, reason: 'canvas-pad-right' }
    ];

    otherPanels.forEach(([_, other]) => {
      rightCandidates.push({
        target: other.x - cfg.GAP,
        guidePos: other.x - cfg.GAP,
        reason: 'gap-left-of-neighbor',
        otherY1: other.y,
        otherY2: other.y + other.height
      });
      rightCandidates.push({
        target: other.x + other.width,
        guidePos: other.x + other.width,
        reason: 'align-right-with-neighbor',
        otherY1: other.y,
        otherY2: other.y + other.height
      });
    });

    for (const cand of rightCandidates) {
      const diff = Math.abs(currentRight - cand.target);
      if (diff < minDiffR) {
        minDiffR = diff;
        bestRight = cand.target;
        matchedGuide = cand;
      }
    }

    if (matchedGuide && minDiffR <= cfg.THRESHOLD) {
      newW = Math.max(minW, bestRight - current.x);
      pushResizeGuide(
        guides,
        matchedGuide,
        'vertical',
        Math.min(current.y, matchedGuide.otherY1 !== undefined ? matchedGuide.otherY1 : 0),
        Math.max(current.y + newH, matchedGuide.otherY2 !== undefined ? matchedGuide.otherY2 : cH),
        cH
      );
    }
  }

  if (isResizingBottom) {
    const currentBottom = current.y + current.height;
    let bestBottom = currentBottom;
    let minDiffB = cfg.THRESHOLD + 1;
    let matchedGuide = null;

    const bottomCandidates = [
      { target: cH, guidePos: cH, reason: 'canvas-bottom' },
      { target: cH - cfg.CANVAS_PAD, guidePos: cH - cfg.CANVAS_PAD, reason: 'canvas-pad-bottom' }
    ];

    otherPanels.forEach(([_, other]) => {
      bottomCandidates.push({
        target: other.y - cfg.GAP,
        guidePos: other.y - cfg.GAP,
        reason: 'gap-top-of-neighbor',
        otherX1: other.x,
        otherX2: other.x + other.width
      });
      bottomCandidates.push({
        target: other.y + other.height,
        guidePos: other.y + other.height,
        reason: 'align-bottom-with-neighbor',
        otherX1: other.x,
        otherX2: other.x + other.width
      });

      const shareRow = Math.abs(current.y - other.y) < 50;
      if (shareRow) {
        bottomCandidates.push({
          target: current.y + other.height,
          guidePos: current.y + other.height,
          reason: 'equal-height-row',
          otherX1: other.x,
          otherX2: other.x + other.width
        });
      }
    });

    for (const cand of bottomCandidates) {
      const diff = Math.abs(currentBottom - cand.target);
      if (diff < minDiffB) {
        minDiffB = diff;
        bestBottom = cand.target;
        matchedGuide = cand;
      }
    }

    if (matchedGuide && minDiffB <= cfg.THRESHOLD) {
      newH = Math.max(minH, bestBottom - current.y);
      pushResizeGuide(
        guides,
        matchedGuide,
        'horizontal',
        Math.min(current.x, matchedGuide.otherX1 !== undefined ? matchedGuide.otherX1 : 0),
        Math.max(current.x + newW, matchedGuide.otherX2 !== undefined ? matchedGuide.otherX2 : cW),
        cW
      );
    }
  }

  if (isResizingLeft) {
    const currentLeft = current.x;
    let bestLeft = currentLeft;
    let minDiffL = cfg.THRESHOLD + 1;
    let matchedGuide = null;

    const leftCandidates = [
      { target: 0, guidePos: 0, reason: 'canvas-left' },
      { target: cfg.CANVAS_PAD, guidePos: cfg.CANVAS_PAD, reason: 'canvas-pad-left' }
    ];

    otherPanels.forEach(([_, other]) => {
      leftCandidates.push({
        target: other.x + other.width + cfg.GAP,
        guidePos: other.x + other.width + cfg.GAP,
        reason: 'gap-right-of-neighbor',
        otherY1: other.y,
        otherY2: other.y + other.height
      });
      leftCandidates.push({
        target: other.x,
        guidePos: other.x,
        reason: 'align-left-with-neighbor',
        otherY1: other.y,
        otherY2: other.y + other.height
      });
    });

    for (const cand of leftCandidates) {
      const diff = Math.abs(currentLeft - cand.target);
      if (diff < minDiffL) {
        minDiffL = diff;
        bestLeft = cand.target;
        matchedGuide = cand;
      }
    }

    if (matchedGuide && minDiffL <= cfg.THRESHOLD) {
      const deltaX = current.x - bestLeft;
      newW = Math.max(minW, current.width + deltaX);
      newX = current.x + current.width - newW;
      pushResizeGuide(
        guides,
        matchedGuide,
        'vertical',
        Math.min(current.y, matchedGuide.otherY1 !== undefined ? matchedGuide.otherY1 : 0),
        Math.max(current.y + newH, matchedGuide.otherY2 !== undefined ? matchedGuide.otherY2 : cH),
        cH
      );
    }
  }

  if (isResizingTop) {
    const currentTop = current.y;
    let bestTop = currentTop;
    let minDiffT = cfg.THRESHOLD + 1;
    let matchedGuide = null;

    const topCandidates = [
      { target: 0, guidePos: 0, reason: 'canvas-top' },
      { target: cfg.CANVAS_PAD, guidePos: cfg.CANVAS_PAD, reason: 'canvas-pad-top' }
    ];

    otherPanels.forEach(([_, other]) => {
      topCandidates.push({
        target: other.y + other.height + cfg.GAP,
        guidePos: other.y + other.height + cfg.GAP,
        reason: 'gap-bottom-of-neighbor',
        otherX1: other.x,
        otherX2: other.x + other.width
      });
      topCandidates.push({
        target: other.y,
        guidePos: other.y,
        reason: 'align-top-with-neighbor',
        otherX1: other.x,
        otherX2: other.x + other.width
      });
    });

    for (const cand of topCandidates) {
      const diff = Math.abs(currentTop - cand.target);
      if (diff < minDiffT) {
        minDiffT = diff;
        bestTop = cand.target;
        matchedGuide = cand;
      }
    }

    if (matchedGuide && minDiffT <= cfg.THRESHOLD) {
      const deltaY = current.y - bestTop;
      newH = Math.max(minH, current.height + deltaY);
      newY = current.y + current.height - newH;
      pushResizeGuide(
        guides,
        matchedGuide,
        'horizontal',
        Math.min(current.x, matchedGuide.otherX1 !== undefined ? matchedGuide.otherX1 : 0),
        Math.max(current.x + newW, matchedGuide.otherX2 !== undefined ? matchedGuide.otherX2 : cW),
        cW
      );
    }
  }

  const clamped = clampRectToCanvas(
    { x: newX, y: newY, width: newW, height: newH },
    cW,
    cH,
    minW,
    minH
  );

  return {
    ...clamped,
    guides
  };
}

/**
 * Calcula las coordenadas y tamaño óptimos para ampliar un panel ocupando
 * el trozo de espacio disponible restante sin sobreponerse a ningún otro panel activo.
 * 
 * Explora la expansión horizontal-primero y vertical-primero para encontrar
 * el área libre máxima contigua disponible en el canvas.
 * 
 * @param {string} panelId ID del panel a ampliar
 * @param {Record<string, any>} allPanels Mapa de todos los paneles
 * @param {{width: number, height: number}} containerBounds Límites del canvas
 * @param {Partial<typeof SNAP_CONFIG>} [customConfig]
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function computeExpandedPanelBounds(
  panelId,
  allPanels,
  containerBounds,
  customConfig = {}
) {
  const cfg = { ...SNAP_CONFIG, ...customConfig };
  const cW = containerBounds?.width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const cH = containerBounds?.height || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const current = allPanels?.[panelId];
  if (!current) {
    return {
      x: cfg.CANVAS_PAD,
      y: cfg.CANVAS_PAD,
      width: Math.max(260, cW - cfg.CANVAS_PAD * 2),
      height: Math.max(140, cH - cfg.CANVAS_PAD * 2)
    };
  }

  const others = Object.entries(allPanels || {})
    .filter(([id, p]) => id !== panelId && p && p.visible !== false && !p.isMaximized)
    .map(([id, p]) => ({ id, ...p }));

  if (others.length === 0) {
    return {
      x: cfg.CANVAS_PAD,
      y: cfg.CANVAS_PAD,
      width: Math.max(260, cW - cfg.CANVAS_PAD * 2),
      height: Math.max(140, cH - cfg.CANVAS_PAD * 2)
    };
  }

  const curX = current.x;
  const curY = current.y;
  const curW = current.width;
  const curH = current.height;
  const curR = curX + curW;
  const curB = curY + curH;

  // --- ESTRATEGIA 1: Expansión Horizontal primero, luego Vertical ---
  let left1 = cfg.CANVAS_PAD;
  let right1 = cW - cfg.CANVAS_PAD;

  for (const o of others) {
    const vOverlap = Math.max(curY, o.y) < Math.min(curB, o.y + o.height) - 4;
    if (vOverlap) {
      if (o.x + o.width <= curX + 15) {
        left1 = Math.max(left1, o.x + o.width + cfg.GAP);
      } else if (o.x >= curR - 15) {
        right1 = Math.min(right1, o.x - cfg.GAP);
      }
    }
  }
  left1 = Math.min(left1, curX);
  right1 = Math.max(right1, curR);

  let top1 = cfg.CANVAS_PAD;
  let bottom1 = cH - cfg.CANVAS_PAD;
  for (const o of others) {
    const hOverlap = Math.max(left1, o.x) < Math.min(right1, o.x + o.width) - 4;
    if (hOverlap) {
      if (o.y + o.height <= curY + 15) {
        top1 = Math.max(top1, o.y + o.height + cfg.GAP);
      } else if (o.y >= curB - 15) {
        bottom1 = Math.min(bottom1, o.y - cfg.GAP);
      }
    }
  }
  top1 = Math.min(top1, curY);
  bottom1 = Math.max(bottom1, curB);

  const w1 = Math.max(curW, right1 - left1);
  const h1 = Math.max(curH, bottom1 - top1);
  const area1 = w1 * h1;

  // --- ESTRATEGIA 2: Expansión Vertical primero, luego Horizontal ---
  let top2 = cfg.CANVAS_PAD;
  let bottom2 = cH - cfg.CANVAS_PAD;

  for (const o of others) {
    const hOverlap = Math.max(curX, o.x) < Math.min(curR, o.x + o.width) - 4;
    if (hOverlap) {
      if (o.y + o.height <= curY + 15) {
        top2 = Math.max(top2, o.y + o.height + cfg.GAP);
      } else if (o.y >= curB - 15) {
        bottom2 = Math.min(bottom2, o.y - cfg.GAP);
      }
    }
  }
  top2 = Math.min(top2, curY);
  bottom2 = Math.max(bottom2, curB);

  let left2 = cfg.CANVAS_PAD;
  let right2 = cW - cfg.CANVAS_PAD;
  for (const o of others) {
    const vOverlap = Math.max(top2, o.y) < Math.min(bottom2, o.y + o.height) - 4;
    if (vOverlap) {
      if (o.x + o.width <= curX + 15) {
        left2 = Math.max(left2, o.x + o.width + cfg.GAP);
      } else if (o.x >= curR - 15) {
        right2 = Math.min(right2, o.x - cfg.GAP);
      }
    }
  }
  left2 = Math.min(left2, curX);
  right2 = Math.max(right2, curR);

  const w2 = Math.max(curW, right2 - left2);
  const h2 = Math.max(curH, bottom2 - top2);
  const area2 = w2 * h2;

  // Seleccionar la mejor opción
  let chosen;
  if (panelId === 'terminal') {
    chosen = (w1 >= w2 || area1 >= area2 * 0.9)
      ? { x: left1, y: top1, width: w1, height: h1 }
      : { x: left2, y: top2, width: w2, height: h2 };
  } else {
    chosen = area1 >= area2
      ? { x: left1, y: top1, width: w1, height: h1 }
      : { x: left2, y: top2, width: w2, height: h2 };
  }

  // Verificación final de seguridad anti-colisión
  for (const o of others) {
    const collidesX = Math.max(chosen.x, o.x) < Math.min(chosen.x + chosen.width, o.x + o.width);
    const collidesY = Math.max(chosen.y, o.y) < Math.min(chosen.y + chosen.height, o.y + o.height);
    if (collidesX && collidesY) {
      if (chosen.x < o.x && chosen.x + chosen.width > o.x) {
        chosen.width = Math.max(160, o.x - cfg.GAP - chosen.x);
      } else if (chosen.y < o.y && chosen.y + chosen.height > o.y) {
        chosen.height = Math.max(90, o.y - cfg.GAP - chosen.y);
      }
    }
  }

  return {
    x: Math.round(chosen.x),
    y: Math.round(chosen.y),
    width: Math.round(chosen.width),
    height: Math.round(chosen.height)
  };
}

/**
 * Auto-nivela y distribuye equitativamente todos los paneles que pertenecen a la fila inferior.
 * 
 * Detecta qué paneles están situados por debajo del terminal principal (o en la mitad inferior),
 * unifica su coordenada Y, unifica su altura (height) y distribuye el ancho disponible
 * de manera equitativa respetando el gap estándar de 12px.
 * 
 * @param {Record<string, any>} currentLayout Layout actual
 * @param {number} containerWidth Anchura del canvas
 * @param {number} containerHeight Altura del canvas
 * @param {string[]} [preferredPanelOrder] Orden preferido de izquierda a derecha
 * @returns {Record<string, any>} Layout actualizado
 */
export function autoEqualizeBottomRow(
  currentLayout,
  containerWidth,
  containerHeight,
  preferredPanelOrder = ['search', 'recents', 'sysmon', 'favorites']
) {
  if (!currentLayout || containerWidth <= 0 || containerHeight <= 0) return currentLayout;

  const pad = SNAP_CONFIG.CANVAS_PAD;
  const gap = SNAP_CONFIG.GAP;
  const next = { ...currentLayout };

  // Identificar paneles activos
  const activeKeys = Object.keys(next).filter((k) => next[k] && next[k].visible !== false && !next[k].isMaximized);

  // Si terminal está visible y está arriba, la fila inferior son los paneles debajo de él
  const terminal = next.terminal;
  const hasTerminal = terminal && terminal.visible !== false && !terminal.isMaximized;

  let bottomY = pad;
  let maxBottomH = 220;

  if (hasTerminal) {
    // Si terminal ocupa una posición superior
    const termBottom = terminal.y + terminal.height;
    bottomY = termBottom + gap;
    maxBottomH = Math.max(140, containerHeight - bottomY - pad);
  } else {
    // Si no hay terminal superior, buscar el punto Y más común en la mitad inferior
    bottomY = Math.max(pad, Math.floor(containerHeight * 0.55));
    maxBottomH = Math.max(140, containerHeight - bottomY - pad);
  }

  // Filtrar los paneles candidatos de la fila (excluyendo terminal principal si está arriba)
  const rowPanelKeys = activeKeys.filter((k) => {
    if (k === 'terminal' && hasTerminal && terminal.width > containerWidth * 0.6) {
      return false; // El terminal es el banner superior
    }
    const p = next[k];
    // Candidato si su centro Y está en la mitad inferior o debajo del terminal
    return p.y >= (bottomY - 60);
  });

  const count = rowPanelKeys.length;
  if (count === 0) return currentLayout;

  // Ordenar los paneles de izquierda a derecha
  rowPanelKeys.sort((a, b) => {
    const idxA = preferredPanelOrder.indexOf(a);
    const idxB = preferredPanelOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (next[a]?.x || 0) - (next[b]?.x || 0);
  });

  // Calcular anchura equitativa
  const totalAvailableW = containerWidth - pad * 2 - gap * (count - 1);
  const eachW = Math.max(180, Math.floor(totalAvailableW / count));

  // Determinar la altura estándar: usar la altura mayor entre los paneles de la fila (hasta maxBottomH)
  let standardH = 0;
  rowPanelKeys.forEach((k) => {
    if (next[k]?.height) standardH = Math.max(standardH, next[k].height);
  });
  if (standardH < 140 || standardH > maxBottomH) {
    standardH = maxBottomH;
  }

  // Asegurar que si el terminal está arriba, use toda la anchura útil
  if (hasTerminal && terminal.y <= pad + 30 && terminal.width > containerWidth * 0.6) {
    next.terminal = {
      ...terminal,
      x: pad,
      y: pad,
      width: containerWidth - pad * 2,
      height: Math.max(180, bottomY - gap - pad)
    };
  }

  // Asignar nuevas posiciones y medidas exactas a cada panel de la fila secuencialmente para evitar solapamientos
  let currentX = pad;
  rowPanelKeys.forEach((k, idx) => {
    const isLast = idx === count - 1;
    const panelMinWidth = next[k]?.minWidth || 160;
    const itemW = isLast ? Math.max(panelMinWidth, containerWidth - pad - currentX) : Math.max(panelMinWidth, eachW);

    next[k] = {
      ...next[k],
      x: currentX,
      y: bottomY,
      width: itemW,
      height: Math.max(next[k].minHeight || 90, standardH),
      isMaximized: false
    };

    currentX += itemW + gap;
  });

  return next;
}
