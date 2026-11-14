import { useCallback, useEffect, useRef } from 'react';

/**
 * Auto-scroll del árbol de conexiones mientras se arrastra cerca de los bordes.
 */
export function useTreeDragAutoScroll({
  handleDragHoverExpandOver,
  handleDragHoverExpandLeave,
  clearDragHoverExpand
}) {
  const treeContainerRef = useRef(null);
  const dragAutoScrollRafRef = useRef(null);
  const dragAutoScrollSpeedRef = useRef(0);
  const dragAutoScrollActiveRef = useRef(false);

  const stopTreeDragAutoScroll = useCallback(() => {
    dragAutoScrollSpeedRef.current = 0;
    if (treeContainerRef.current) {
      treeContainerRef.current.classList.remove('drag-autoscroll-active');
    }
    if (dragAutoScrollRafRef.current) {
      cancelAnimationFrame(dragAutoScrollRafRef.current);
      dragAutoScrollRafRef.current = null;
    }
    dragAutoScrollActiveRef.current = false;
  }, []);

  const stopTreeDragInteraction = useCallback(() => {
    stopTreeDragAutoScroll();
    clearDragHoverExpand();
  }, [clearDragHoverExpand, stopTreeDragAutoScroll]);

  const runTreeDragAutoScroll = useCallback(() => {
    const container = treeContainerRef.current;
    if (!container) {
      stopTreeDragAutoScroll();
      return;
    }

    const speed = dragAutoScrollSpeedRef.current;
    if (!speed) {
      stopTreeDragAutoScroll();
      return;
    }

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    if (maxScrollTop <= 0) {
      stopTreeDragAutoScroll();
      return;
    }

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop + speed));
    container.scrollTop = nextScrollTop;

    if ((nextScrollTop <= 0 && speed < 0) || (nextScrollTop >= maxScrollTop && speed > 0)) {
      stopTreeDragAutoScroll();
      return;
    }

    dragAutoScrollRafRef.current = requestAnimationFrame(runTreeDragAutoScroll);
  }, [stopTreeDragAutoScroll]);

  const handleTreeContainerDragOver = useCallback((e) => {
    const container = treeContainerRef.current;
    if (!container) return;

    e.preventDefault();
    handleDragHoverExpandOver(e);

    const rect = container.getBoundingClientRect();
    const threshold = 72;
    const maxSpeed = 14;
    const pointerY = e.clientY;
    const distanceTop = pointerY - rect.top;
    const distanceBottom = rect.bottom - pointerY;

    let nextSpeed = 0;
    if (distanceTop >= 0 && distanceTop < threshold) {
      const ratio = (threshold - distanceTop) / threshold;
      nextSpeed = -Math.max(1, ratio * maxSpeed);
    } else if (distanceBottom >= 0 && distanceBottom < threshold) {
      const ratio = (threshold - distanceBottom) / threshold;
      nextSpeed = Math.max(1, ratio * maxSpeed);
    }

    dragAutoScrollSpeedRef.current = nextSpeed;

    if (nextSpeed !== 0) {
      container.classList.add('drag-autoscroll-active');
      if (!dragAutoScrollActiveRef.current) {
        dragAutoScrollActiveRef.current = true;
        dragAutoScrollRafRef.current = requestAnimationFrame(runTreeDragAutoScroll);
      }
    } else {
      stopTreeDragAutoScroll();
    }
  }, [handleDragHoverExpandOver, runTreeDragAutoScroll, stopTreeDragAutoScroll]);

  const handleTreeContainerDragLeave = useCallback((e) => {
    const container = treeContainerRef.current;
    if (!container) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleDragHoverExpandLeave(e);
    stopTreeDragInteraction();
  }, [handleDragHoverExpandLeave, stopTreeDragInteraction]);

  useEffect(() => {
    return () => {
      stopTreeDragInteraction();
    };
  }, [stopTreeDragInteraction]);

  return {
    treeContainerRef,
    handleTreeContainerDragOver,
    handleTreeContainerDragLeave,
    stopTreeDragInteraction,
    stopTreeDragAutoScroll
  };
}
