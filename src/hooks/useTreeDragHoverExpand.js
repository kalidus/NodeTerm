import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_DELAY_MS = 600;
const FOLDER_SELECTOR = '[data-node-key][data-node-type="folder"]';

function folderKeyFromElement(el) {
  if (!(el instanceof Element)) return null;

  let folderEl = el.closest(FOLDER_SELECTOR);
  if (!folderEl) {
    const content = el.closest('.p-treenode-content');
    folderEl = content?.querySelector(FOLDER_SELECTOR) ?? null;
  }
  if (!folderEl) {
    const nodeLi = el.closest('.p-treenode');
    folderEl = nodeLi?.querySelector(FOLDER_SELECTOR) ?? null;
  }
  if (!folderEl) {
    const droppoint = el.closest('.p-treenode-droppoint');
    if (droppoint) {
      const sibling =
        (droppoint.nextElementSibling?.classList?.contains('p-treenode') && droppoint.nextElementSibling)
        || (droppoint.previousElementSibling?.classList?.contains('p-treenode') && droppoint.previousElementSibling)
        || null;
      folderEl = sibling?.querySelector?.(FOLDER_SELECTOR) ?? null;
    }
  }

  const key = folderEl?.getAttribute('data-node-key');
  if (!key || key.includes('-show-more')) return null;
  return key;
}

/**
 * Auto-expande carpetas colapsadas al mantener el cursor encima durante un drag
 * (comportamiento típico de exploradores de archivos).
 *
 * Importante: PrimeReact hace stopPropagation en dragover de nodos droppable,
 * así que los consumidores deben usar onDragOverCapture.
 */
export function useTreeDragHoverExpand({
  expandedKeys,
  setExpandedKeys,
  delayMs = DEFAULT_DELAY_MS,
  onFolderExpand
} = {}) {
  const timerRef = useRef(null);
  const pendingKeyRef = useRef(null);
  const dragKeyRef = useRef(null);
  const expandedKeysRef = useRef(expandedKeys);
  const onFolderExpandRef = useRef(onFolderExpand);

  expandedKeysRef.current = expandedKeys;
  onFolderExpandRef.current = onFolderExpand;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingKeyRef.current = null;
  }, []);

  const clearDragHoverExpand = useCallback(() => {
    clearTimer();
    dragKeyRef.current = null;
  }, [clearTimer]);

  useEffect(() => () => clearDragHoverExpand(), [clearDragHoverExpand]);

  const resolveFolderKey = useCallback((event) => {
    const fromPoint =
      typeof document !== 'undefined' && event?.clientX != null && event?.clientY != null
        ? document.elementFromPoint(event.clientX, event.clientY)
        : null;
    return folderKeyFromElement(fromPoint) || folderKeyFromElement(event?.target);
  }, []);

  const noteDragStartKey = useCallback((event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return;
    const keyEl = target.closest('[data-node-key]')
      || (target.hasAttribute?.('data-node-key') ? target : null)
      || target.querySelector?.('[data-node-key]');
    if (keyEl) {
      dragKeyRef.current = keyEl.getAttribute('data-node-key');
    }
  }, []);

  const expandFolder = useCallback((key) => {
    if (!key || !setExpandedKeys) return;
    const current = expandedKeysRef.current || {};
    if (current[key]) return;
    setExpandedKeys((prev) => {
      if (prev?.[key]) return prev;
      return { ...prev, [key]: true };
    });
    try {
      onFolderExpandRef.current?.(key);
    } catch (_) {
      /* ignore expand side-effect errors */
    }
  }, [setExpandedKeys]);

  const handleDragHoverExpandOver = useCallback((event) => {
    const key = resolveFolderKey(event);
    if (!key || key === dragKeyRef.current) {
      clearTimer();
      return;
    }
    if (expandedKeysRef.current?.[key]) {
      clearTimer();
      return;
    }
    if (pendingKeyRef.current === key && timerRef.current) {
      return;
    }
    clearTimer();
    pendingKeyRef.current = key;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingKeyRef.current = null;
      expandFolder(key);
    }, delayMs);
  }, [clearTimer, delayMs, expandFolder, resolveFolderKey]);

  const handleDragLeave = useCallback((event) => {
    const related = event?.relatedTarget;
    const current = event?.currentTarget;
    if (current instanceof Element && related instanceof Node && current.contains(related)) {
      return;
    }
    clearTimer();
  }, [clearTimer]);

  const bindDragHoverExpandProps = {
    onDragStartCapture: noteDragStartKey,
    onDragOverCapture: handleDragHoverExpandOver,
    onDragLeave: handleDragLeave,
    onDrop: clearDragHoverExpand,
    onDragEnd: clearDragHoverExpand
  };

  return {
    bindDragHoverExpandProps,
    clearDragHoverExpand,
    noteDragStartKey,
    handleDragHoverExpandOver,
    handleDragHoverExpandLeave: handleDragLeave
  };
}

export default useTreeDragHoverExpand;
