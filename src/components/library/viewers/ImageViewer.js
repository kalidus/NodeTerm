import React, { useCallback, useEffect, useRef, useState } from 'react';

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];

function nextZoom(current, direction) {
  if (direction > 0) {
    return ZOOM_STEPS.find((z) => z > current + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  const lower = [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001);
  return lower ?? ZOOM_STEPS[0];
}

/**
 * Visor de imágenes con zoom, arrastre y rotación.
 * Expone sus controles al contenedor mediante `onControlsChange`.
 */
const ImageViewer = ({ url, label, onControlsChange }) => {
  const [zoom, setZoom] = useState(0); // 0 = ajustar a ventana
  const [rotation, setRotation] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  const fit = zoom === 0;

  const zoomIn = useCallback(() => setZoom((z) => nextZoom(z || 1, 1)), []);
  const zoomOut = useCallback(() => setZoom((z) => nextZoom(z || 1, -1)), []);
  const resetZoom = useCallback(() => setZoom(0), []);
  const actualSize = useCallback(() => setZoom(1), []);
  const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);

  useEffect(() => {
    if (typeof onControlsChange !== 'function') return undefined;
    onControlsChange([
      { id: 'zoom-out', icon: 'pi pi-search-minus', title: 'Alejar', onClick: zoomOut },
      {
        id: 'zoom-level',
        label: fit ? 'Ajustar' : `${Math.round(zoom * 100)}%`,
        title: 'Tamaño real',
        onClick: actualSize
      },
      { id: 'zoom-in', icon: 'pi pi-search-plus', title: 'Acercar', onClick: zoomIn },
      { id: 'fit', icon: 'pi pi-window-maximize', title: 'Ajustar a ventana', active: fit, onClick: resetZoom },
      { id: 'rotate', icon: 'pi pi-replay', title: 'Rotar 90°', onClick: rotate }
    ]);
    return () => onControlsChange([]);
  }, [onControlsChange, zoom, fit, zoomIn, zoomOut, resetZoom, actualSize, rotate]);

  const handleWheel = useCallback((event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom((z) => nextZoom(z || 1, event.deltaY < 0 ? 1 : -1));
  }, []);

  const handleMouseDown = useCallback((event) => {
    const stage = stageRef.current;
    if (!stage || event.button !== 0) return;
    const canPan = stage.scrollWidth > stage.clientWidth || stage.scrollHeight > stage.clientHeight;
    if (!canPan) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: stage.scrollLeft,
      top: stage.scrollTop
    };
    setGrabbing(true);
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!grabbing) return undefined;
    const onMove = (event) => {
      const start = dragRef.current;
      const stage = stageRef.current;
      if (!start || !stage) return;
      stage.scrollLeft = start.left - (event.clientX - start.x);
      stage.scrollTop = start.top - (event.clientY - start.y);
    };
    const onUp = () => {
      dragRef.current = null;
      setGrabbing(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [grabbing]);

  const transform = [
    !fit ? `scale(${zoom})` : '',
    rotation ? `rotate(${rotation}deg)` : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={stageRef}
      className={`library-viewer__image-stage${grabbing ? ' is-grabbing' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      <div className="library-viewer__image-wrap">
        <img
          className={`library-viewer__image${fit ? ' is-fit' : ''}`}
          src={url}
          alt={label}
          draggable={false}
          style={transform ? { transform } : undefined}
        />
      </div>
    </div>
  );
};

export default React.memo(ImageViewer);
