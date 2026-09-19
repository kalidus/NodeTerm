import React, { useRef, useCallback, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import { getAvailableResizeBounds } from '../utils/homeTabSnapping';

/**
 * Componente envoltorio para paneles móviles y redimensionables del Dashboard de Home.
 * Integra react-rnd, gestión de zIndex, estilos de marco (macOS, Gnome, Windows, etc.)
 * y soporte para maximizar/restaurar y minimizar/colapsar.
 */
const HomePanelWrapper = ({
  id,
  title = '',
  titleIcon = null,
  path = '',
  panelState = {},
  allPanels = null,
  containerBounds = null,
  onLayoutChange,
  onBringToFront,
  onClose,
  onToggleMaximize,
  onToggleMinimize,
  onMinimize,
  closable = true,
  terminalFrameStyle = 'macos',
  snapToGrid = true,
  smartSnap = true,
  onDragging = null,
  onDragEnd = null,
  onResizing = null,
  onResizeEnd = null,
  minWidth = 260,
  minHeight = 90,
  bounds = 'parent',
  headerRight = null,
  headerLeft = null,
  frameBackground = null,
  className = '',
  style = {},
  bodyStyle = {},
  themeColors = {},
  disableDragging = false,
  disableResizing = false,
  hideHeader = false,
  children
}) => {
  const rndRef = useRef(null);
  const [internalMinimized, setInternalMinimized] = useState(false);

  const {
    x = 0,
    y = 0,
    width = 400,
    height = 300,
    zIndex = 10,
    isMaximized = false,
    isMinimized: stateMinimized
  } = panelState;

  const isMinimized = typeof stateMinimized === 'boolean' ? stateMinimized : internalMinimized;
  const allowOverlap = id === 'terminal';
  const fillParent = isMaximized && (allowOverlap || !panelState.originalBounds);
  const minimizedHeight = 30;

  // Cálculo dinámico de límites máximos anti-colisión para impedir sobreponerse al redimensionar
  const maxConstraints = useMemo(() => {
    if (allowOverlap || !allPanels || !containerBounds || isMaximized || isMinimized) {
      return { maxWidth: undefined, maxHeight: undefined };
    }
    const boundsLimit = getAvailableResizeBounds(id, { x, y, width, height }, allPanels, containerBounds);
    return {
      maxWidth: Math.max(width, Math.max(minWidth, boundsLimit.maxWidth)),
      maxHeight: Math.max(height, Math.max(minHeight, boundsLimit.maxHeight))
    };
  }, [id, x, y, width, height, isMaximized, isMinimized, allPanels, containerBounds, minWidth, minHeight, allowOverlap]);

  const handleDragStart = useCallback(() => {
    if (onBringToFront) {
      onBringToFront(id);
    }
  }, [id, onBringToFront]);

  const handleDrag = useCallback((e, d) => {
    if (isMaximized) return;
    if (onDragging) {
      const curW = rndRef.current?.resizableElement?.current?.offsetWidth || width;
      const curH = rndRef.current?.resizableElement?.current?.offsetHeight || (isMinimized ? minimizedHeight : height);
      onDragging(id, { x: d.x, y: d.y, width: curW, height: curH });
    }
  }, [id, isMaximized, isMinimized, onDragging, width, height]);

  const handleDragStop = useCallback((e, d) => {
    if (isMaximized) return;
    if (onDragEnd) {
      onDragEnd(id, { x: d.x, y: d.y, width, height: isMinimized ? minimizedHeight : height });
    } else if (onLayoutChange) {
      onLayoutChange(id, {
        ...panelState,
        x: d.x,
        y: d.y
      });
    }
  }, [id, isMaximized, isMinimized, onDragEnd, onLayoutChange, panelState, width, height]);

  const handleResize = useCallback((e, direction, ref, delta, position) => {
    if (isMaximized || isMinimized) return;
    if (!allowOverlap && allPanels && containerBounds) {
      const boundsLimit = getAvailableResizeBounds(id, { x, y, width, height }, allPanels, containerBounds);
      if ((direction.includes('left') || direction.includes('Left')) && position.x < boundsLimit.minLeft) {
        const clampedX = boundsLimit.minLeft;
        const clampedW = Math.max(minWidth, (x + width) - clampedX);
        ref.style.left = `${clampedX}px`;
        ref.style.width = `${clampedW}px`;
      }
      if ((direction.includes('top') || direction.includes('Top')) && position.y < boundsLimit.minTop) {
        const clampedY = boundsLimit.minTop;
        const clampedH = Math.max(minHeight, (y + height) - clampedY);
        ref.style.top = `${clampedY}px`;
        ref.style.height = `${clampedH}px`;
      }
      if ((direction.includes('right') || direction.includes('Right')) && (position.x + ref.offsetWidth) > boundsLimit.maxRight) {
        const clampedW = Math.max(minWidth, boundsLimit.maxRight - position.x);
        ref.style.width = `${clampedW}px`;
      }
      if ((direction.includes('bottom') || direction.includes('Bottom')) && (position.y + ref.offsetHeight) > boundsLimit.maxBottom) {
        const clampedH = Math.max(minHeight, boundsLimit.maxBottom - position.y);
        ref.style.height = `${clampedH}px`;
      }
    }
    if (onResizing) {
      onResizing(id, {
        x: position.x,
        y: position.y,
        width: ref.offsetWidth,
        height: ref.offsetHeight
      }, direction);
    }
  }, [id, isMaximized, isMinimized, onResizing, allPanels, containerBounds, x, y, width, height, minWidth, minHeight, allowOverlap]);

  const handleResizeStop = useCallback((e, direction, ref, delta, position) => {
    if (isMaximized || isMinimized) return;
    const newWidth = ref.offsetWidth;
    const newHeight = ref.offsetHeight;

    if (onResizeEnd) {
      onResizeEnd(id, {
        x: position.x,
        y: position.y,
        width: newWidth,
        height: newHeight
      }, direction);
    } else if (onLayoutChange) {
      onLayoutChange(id, {
        ...panelState,
        width: newWidth,
        height: newHeight,
        x: position.x,
        y: position.y
      });
    }

    // Notificar a componentes hijos (como xterm o gráficas) para que recalculen dimensiones
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }, [id, isMaximized, isMinimized, onResizeEnd, onLayoutChange, panelState]);

  const handleMin = useCallback((e) => {
    e?.stopPropagation();
    if (onToggleMinimize) {
      onToggleMinimize(id);
    } else if (onMinimize) {
      onMinimize(id);
    } else {
      setInternalMinimized(prev => !prev);
    }
  }, [id, onToggleMinimize, onMinimize]);

  const handleClose = useCallback((e) => {
    e?.stopPropagation();
    if (!closable) {
      handleMin(e);
      return;
    }
    onClose?.(id);
  }, [id, onClose, closable, handleMin]);

  const handleMax = useCallback((e) => {
    e?.stopPropagation();
    if (isMinimized) {
      handleMin(e);
    }
    onToggleMaximize?.(id);
  }, [id, isMinimized, handleMin, onToggleMaximize]);

  const handleHeaderDoubleClick = useCallback((e) => {
    // Si se hace doble clic sobre un elemento con .no-drag, no maximizar ni minimizar
    if (e.target.closest('.no-drag')) return;
    if (isMinimized) {
      handleMin(e);
      return;
    }
    if (onToggleMaximize) {
      onToggleMaximize(id);
    }
  }, [id, isMinimized, handleMin, onToggleMaximize]);

  // Si smartSnap está activo, el grid fino 1x1 permite que la imantación magnética sea fluida y exacta
  const gridStep = smartSnap ? [1, 1] : (snapToGrid ? [10, 10] : [1, 1]);

  const renderFrameControls = () => {
    if (hideHeader) return null;

    switch (terminalFrameStyle) {
      case 'macos':
        return (
          <div className="traffic-lights no-drag" onMouseDown={(e) => e.stopPropagation()}>
            {closable && (
              <div
                className="traffic-dot red"
                onClick={handleClose}
                title="Cerrar / Ocultar panel"
              />
            )}
            <div
              className="traffic-dot yellow"
              onClick={handleMin}
              title={isMinimized ? "Restaurar tamaño" : "Minimizar panel"}
            />
            <div
              className="traffic-dot green"
              onClick={handleMax}
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
            />
          </div>
        );

      case 'gnome':
        return (
          <div className="gnome-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div
              className="gnome-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <i className="pi pi-minus" style={{ fontSize: '8px' }} />
            </div>
            <div
              className="gnome-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-stop"} style={{ fontSize: '8px' }} />
            </div>
            {closable && (
              <div
                className="gnome-dot close"
                title="Cerrar"
                onClick={handleClose}
              >
                <i className="pi pi-times" style={{ fontSize: '9px' }} />
              </div>
            )}
          </div>
        );

      case 'kde':
        return (
          <div className="kde-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <div
              className="kde-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <div className="custom-icon icon-min" />
            </div>
            <div
              className="kde-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              <div className={`custom-icon ${isMaximized ? 'icon-restore' : 'icon-max'}`} />
            </div>
            {closable && (
              <div
                className="kde-dot close"
                title="Cerrar"
                onClick={handleClose}
              >
                <div className="custom-icon icon-close" />
              </div>
            )}
          </div>
        );

      case 'windows':
        return (
          <div className="windows-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className="win-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <div className="custom-icon icon-min" />
            </div>
            <div
              className="win-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              <div className={`custom-icon ${isMaximized ? 'icon-restore' : 'icon-max'}`} />
            </div>
            {closable && (
              <div
                className="win-dot close"
                title="Cerrar"
                onClick={handleClose}
              >
                <div className="custom-icon icon-close" />
              </div>
            )}
          </div>
        );

      case 'matcha':
        return (
          <div className="matcha-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div
              className="matcha-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <i className="pi pi-minus" style={{ fontSize: '9px' }} />
            </div>
            <div
              className="matcha-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-stop"} style={{ fontSize: '9px' }} />
            </div>
            {closable && (
              <div className="matcha-dot close" onClick={handleClose} title="Cerrar">
                <i className="pi pi-times" style={{ fontSize: '9px' }} />
              </div>
            )}
          </div>
        );

      case 'futuristic':
        return (
          <div className="futuristic-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div
              className="cyber-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              MIN
            </div>
            <div
              className="cyber-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              {isMaximized ? "RST" : "MAX"}
            </div>
            {closable && (
              <div className="cyber-dot close" title="Cerrar" onClick={handleClose}>
                EXE
              </div>
            )}
          </div>
        );

      case 'modern':
        return (
          <div className="modern-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <div
              className="glass-dot minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <i className="pi pi-minus" style={{ fontSize: '9px' }} />
            </div>
            <div
              className="glass-dot maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-stop"} style={{ fontSize: '9px' }} />
            </div>
            {closable && (
              <div className="glass-dot close" title="Cerrar" onClick={handleClose}>
                <i className="pi pi-times" style={{ fontSize: '9px' }} />
              </div>
            )}
          </div>
        );

      case 'minimal':
        return null;

      case 'retro':
        return (
          <div className="retro-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div
              className="retro-switch minimize"
              title={isMinimized ? "REST" : "MIN"}
              onClick={handleMin}
              style={{ border: '2px solid #0f0' }}
            />
            <div
              className={`retro-switch ${isMaximized ? 'on' : ''}`}
              title={isMaximized ? "Restaurar CRT" : "Ampliar CRT"}
              onClick={handleMax}
              style={{ border: '2px solid #0f0' }}
            />
            <span style={{ fontSize: '9px', color: '#0f0', fontFamily: 'monospace' }}>
              {isMinimized ? "MIN" : (isMaximized ? "MAX" : "NORM")}
            </span>
            {closable && (
              <div
                className="retro-switch on"
                title="OFF / Cerrar"
                onClick={handleClose}
              />
            )}
          </div>
        );

      case 'cyberpunk-pro':
        return (
          <div className="cyberpunk-pro-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="cyber-pro-tag">SYS</span>
            <div
              className="cyber-pro-btn minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              _
            </div>
            <div
              className="cyber-pro-btn maximize"
              title={isMaximized ? "Restaurar tamaño original" : "Ampliar al espacio libre"}
              onClick={handleMax}
            >
              {isMaximized ? "⬡" : "◈"}
            </div>
            {closable && (
              <div className="cyber-pro-btn close" title="Cerrar" onClick={handleClose}>
                ✕
              </div>
            )}
          </div>
        );

      case 'hologram':
      case 'holo-amber':
      case 'holo-emerald':
      case 'holo-crimson':
      case 'holo-violet':
      case 'plasma-cyan': {
        const ctrlClass = terminalFrameStyle === 'hologram' ? 'hologram-controls' : `${terminalFrameStyle}-controls`;
        return (
          <div className={`${ctrlClass} no-drag`} onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              className="holo-btn minimize"
              title={isMinimized ? "Restaurar" : "Minimizar HUD"}
              onClick={handleMin}
            >
              ─
            </div>
            <div
              className="holo-btn maximize"
              title={isMaximized ? "Restaurar HUD" : "Maximizar HUD"}
              onClick={handleMax}
            >
              {isMaximized ? "◈" : "⬡"}
            </div>
            {closable && (
              <div className="holo-btn close" title="Cerrar HUD" onClick={handleClose}>
                ✕
              </div>
            )}
          </div>
        );
      }

      case 'synthwave':
        return (
          <div className="synthwave-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div className="synth-dot min" onClick={handleMin} title={isMinimized ? "Restaurar" : "Minimizar"} />
            <div className="synth-dot max" onClick={handleMax} title={isMaximized ? "Restaurar tamaño original" : "Ampliar"} />
            {closable && (
              <div className="synth-dot close" onClick={handleClose} title="Cerrar" />
            )}
          </div>
        );

      case 'matrix':
        return (
          <div className="matrix-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              className="matrix-btn minimize"
              title={isMinimized ? "RESTORE [00]" : "MIN [01]"}
              onClick={handleMin}
            >
              {isMinimized ? "[00]" : "[01]"}
            </div>
            <div
              className="matrix-btn maximize"
              title={isMaximized ? "RESTORE [10]" : "MAX [10]"}
              onClick={handleMax}
            >
              {isMaximized ? "[10]" : "[02]"}
            </div>
            {closable && (
              <div className="matrix-btn close" title="EXIT [11]" onClick={handleClose}>
                [11]
              </div>
            )}
          </div>
        );

      case 'aurora-glass':
        return (
          <div className="aurora-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              className="aurora-pill minimize"
              title={isMinimized ? "Restaurar" : "Minimizar"}
              onClick={handleMin}
            >
              <i className="pi pi-minus" style={{ fontSize: '9px' }} />
            </div>
            <div
              className="aurora-pill maximize"
              title={isMaximized ? "Restaurar" : "Ampliar"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-stop"} style={{ fontSize: '9px' }} />
            </div>
            {closable && (
              <div className="aurora-pill close" title="Cerrar" onClick={handleClose}>
                <i className="pi pi-times" style={{ fontSize: '9px' }} />
              </div>
            )}
          </div>
        );

      case 'stealth':
        return (
          <div className="stealth-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              className="stealth-btn minimize"
              title={isMinimized ? "RESTORE" : "MIN"}
              onClick={handleMin}
            >
              —
            </div>
            <div
              className="stealth-btn maximize"
              title={isMaximized ? "RESTORE" : "MAX"}
              onClick={handleMax}
            >
              {isMaximized ? "—" : "□"}
            </div>
            {closable && (
              <div className="stealth-btn close" title="ABORT" onClick={handleClose}>
                ✕
              </div>
            )}
          </div>
        );

      case 'frameless':
        return (
          <div className="traffic-lights no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            {closable && (
              <div className="traffic-dot red" onClick={handleClose} title="Cerrar" />
            )}
            <div className="traffic-dot yellow" onClick={handleMin} title={isMinimized ? "Restaurar" : "Minimizar"} />
            <div className="traffic-dot green" onClick={handleMax} title={isMaximized ? "Restaurar tamaño original" : "Ampliar"} />
          </div>
        );

      default:
        return (
          <div className="traffic-lights no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            {closable && (
              <div className="traffic-dot red" onClick={handleClose} title="Cerrar" />
            )}
            <div className="traffic-dot yellow" onClick={handleMin} title={isMinimized ? "Restaurar" : "Minimizar"} />
            <div className="traffic-dot green" onClick={handleMax} title={isMaximized ? "Restaurar tamaño original" : "Ampliar"} />
          </div>
        );
    }
  };

  const isFramelessNonTerminal = terminalFrameStyle === 'frameless' && id !== 'terminal';

  return (
    <Rnd
      ref={rndRef}
      size={
        fillParent
          ? { width: '100%', height: '100%' }
          : { width, height: isMinimized ? minimizedHeight : height }
      }
      position={
        fillParent
          ? { x: 0, y: 0 }
          : { x, y }
      }
      maxWidth={isMaximized ? undefined : maxConstraints.maxWidth}
      maxHeight={isMaximized ? undefined : maxConstraints.maxHeight}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStart={handleDragStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      minWidth={isMinimized ? Math.min(minWidth, 260) : minWidth}
      minHeight={isMinimized ? minimizedHeight : minHeight}
      bounds={bounds}
      dragGrid={gridStep}
      resizeGrid={gridStep}
      dragHandleClassName="home-panel-drag-handle"
      cancel=".no-drag, input, textarea, button, .p-inputtext, select"
      disableDragging={disableDragging || isMaximized}
      enableResizing={
        disableResizing || isMaximized || isMinimized
          ? false
          : {
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true
            }
      }
      resizeHandleStyles={{
        right: { width: '12px', right: '-6px', zIndex: 30, cursor: 'ew-resize' },
        left: { width: '12px', left: '-6px', zIndex: 30, cursor: 'ew-resize' },
        bottom: { height: '12px', bottom: '-6px', zIndex: 30, cursor: 'ns-resize' },
        top: { height: '12px', top: '-6px', zIndex: 30, cursor: 'ns-resize' },
        bottomRight: { width: '14px', height: '14px', right: '-6px', bottom: '-6px', zIndex: 31, cursor: 'nwse-resize' },
        bottomLeft: { width: '14px', height: '14px', left: '-6px', bottom: '-6px', zIndex: 31, cursor: 'nesw-resize' },
        topRight: { width: '14px', height: '14px', right: '-6px', top: '-6px', zIndex: 31, cursor: 'nesw-resize' },
        topLeft: { width: '14px', height: '14px', left: '-6px', top: '-6px', zIndex: 31, cursor: 'nwse-resize' }
      }}
      style={{
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
          overflow: isMinimized ? 'hidden' : undefined,
          background: 'transparent',
          transition: isMaximized ? 'all 0.2s ease' : 'none',
        ...style
      }}
      onMouseDown={handleDragStart}
    >
      <div
        className={`home-panel-frame recents-terminal-frame ${terminalFrameStyle} ${isFramelessNonTerminal ? 'is-frameless-panel' : ''} ${isMaximized ? 'is-maximized' : ''} ${isMinimized ? 'is-minimized' : ''} ${className}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: isMinimized ? minimizedHeight : undefined,
          flex: isMinimized ? 'none' : undefined,
          borderRadius: isMaximized ? 0 : (isMinimized ? 12 : undefined),
          borderBottom: isMinimized ? 'none' : undefined,
          ['--home-panel-frame-bg']: isFramelessNonTerminal ? 'transparent' : (frameBackground || undefined),
          ...(frameBackground ? { background: isFramelessNonTerminal ? 'transparent' : frameBackground } : {})
        }}
      >
        {!hideHeader && (
          <div
            className="home-panel-drag-handle recents-terminal-header"
            onDoubleClick={handleHeaderDoubleClick}
            style={{
              cursor: isMaximized ? 'default' : 'grab',
              userSelect: 'none',
              borderRadius: isMaximized ? 0 : (isMinimized ? 12 : undefined),
              flexShrink: 0,
              height: isMinimized ? minimizedHeight : undefined
            }}
          >
            {terminalFrameStyle === 'macos' ? (
              // macOS: botones de tráfico a la izquierda
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderFrameControls()}
                  {headerLeft}
                </div>

                <div className="header-path" style={{ pointerEvents: 'none' }}>
                  {titleIcon && <span style={{ marginRight: '6px' }}>{titleIcon}</span>}
                  {path ? (
                    <>
                      <span className="path-tilde">~</span>
                      {path}
                    </>
                  ) : (
                    title
                  )}
                </div>

                <div
                  className="recents-header-right no-drag"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {headerRight}
                </div>
              </>
            ) : (
              // Todos los demás estilos: botones de acción a la derecha
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {headerLeft}
                </div>

                <div className="header-path" style={{ pointerEvents: 'none' }}>
                  {titleIcon && <span style={{ marginRight: '6px' }}>{titleIcon}</span>}
                  {path ? (
                    <>
                      <span className="path-tilde">~</span>
                      {path}
                    </>
                  ) : (
                    title
                  )}
                </div>

                <div
                  className="recents-header-right no-drag"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {headerRight}
                  {renderFrameControls()}
                </div>
              </>
            )}
          </div>
        )}

        <div
          className="home-panel-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: isMinimized ? 'none' : 'flex',
            flexDirection: 'column',
            position: 'relative',
            ...bodyStyle
          }}
        >
          {children}
        </div>
      </div>
    </Rnd>
  );
};

export default HomePanelWrapper;
