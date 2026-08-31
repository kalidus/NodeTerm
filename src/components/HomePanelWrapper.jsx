import React, { useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';

/**
 * Componente envoltorio para paneles móviles y redimensionables del Dashboard de Home.
 * Integra react-rnd, gestión de zIndex, estilos de marco (macOS, Gnome, Windows, etc.)
 * y soporte para maximizar/restaurar.
 */
const HomePanelWrapper = ({
  id,
  title = '',
  titleIcon = null,
  path = '',
  panelState = {},
  onLayoutChange,
  onBringToFront,
  onClose,
  onToggleMaximize,
  terminalFrameStyle = 'macos',
  snapToGrid = true,
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

  const {
    x = 0,
    y = 0,
    width = 400,
    height = 300,
    zIndex = 10,
    isMaximized = false
  } = panelState;

  const handleDragStart = useCallback(() => {
    if (onBringToFront) {
      onBringToFront(id);
    }
  }, [id, onBringToFront]);

  const handleDragStop = useCallback((e, d) => {
    if (isMaximized) return;
    if (onLayoutChange) {
      onLayoutChange(id, {
        ...panelState,
        x: d.x,
        y: d.y
      });
    }
  }, [id, isMaximized, onLayoutChange, panelState]);

  const handleResizeStop = useCallback((e, direction, ref, delta, position) => {
    if (isMaximized) return;
    const newWidth = ref.offsetWidth;
    const newHeight = ref.offsetHeight;

    if (onLayoutChange) {
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
  }, [id, isMaximized, onLayoutChange, panelState]);

  const handleHeaderDoubleClick = useCallback((e) => {
    // Si se hace doble clic sobre un elemento con .no-drag, no maximizar
    if (e.target.closest('.no-drag')) return;
    if (onToggleMaximize) {
      onToggleMaximize(id);
    }
  }, [id, onToggleMaximize]);

  const gridStep = snapToGrid ? [10, 10] : [1, 1];

  const renderFrameControls = () => {
    if (hideHeader) return null;

    const handleClose = (e) => {
      e.stopPropagation();
      onClose?.(id);
    };

    const handleMax = (e) => {
      e.stopPropagation();
      onToggleMaximize?.(id);
    };

    switch (terminalFrameStyle) {
      case 'macos':
        return (
          <div className="traffic-lights no-drag" onMouseDown={(e) => e.stopPropagation()}>
            <div
              className="traffic-dot red"
              onClick={handleClose}
              title="Ocultar panel"
            />
            <div className="traffic-dot yellow" />
            <div
              className="traffic-dot green"
              onClick={handleMax}
              title={isMaximized ? "Restaurar tamaño" : "Maximizar"}
            />
          </div>
        );

      case 'gnome':
        return (
          <div className="gnome-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            <div
              className="gnome-dot"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-window-maximize"} style={{ fontSize: '9px' }} />
            </div>
            <div
              className="gnome-dot close"
              title="Ocultar"
              onClick={handleClose}
            >
              <i className="pi pi-times" />
            </div>
          </div>
        );

      case 'kde':
        return (
          <div className="kde-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
            <div
              className="kde-dot maximize"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              <div className="custom-icon icon-max" />
            </div>
            <div
              className="kde-dot close"
              title="Ocultar"
              onClick={handleClose}
            >
              <div className="custom-icon icon-close" />
            </div>
          </div>
        );

      case 'windows':
        return (
          <div className="windows-controls no-drag" onMouseDown={(e) => e.stopPropagation()}>
            <div
              className="win-dot maximize"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              <div className="custom-icon icon-max" />
            </div>
            <div
              className="win-dot close"
              title="Ocultar"
              onClick={handleClose}
            >
              <div className="custom-icon icon-close" />
            </div>
          </div>
        );

      case 'matcha':
        return (
          <div className="matcha-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            <div
              className="matcha-dot"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-window-maximize"} style={{ fontSize: '9px' }} />
            </div>
            <div className="matcha-dot" onClick={handleClose} title="Ocultar">
              <i className="pi pi-times" />
            </div>
          </div>
        );

      case 'futuristic':
        return (
          <div className="futuristic-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            <div
              className="cyber-dot"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              {isMaximized ? "RST" : "MAX"}
            </div>
            <div className="cyber-dot" title="Ocultar" onClick={handleClose}>
              EXE
            </div>
          </div>
        );

      case 'modern':
        return (
          <div className="modern-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
            <div
              className="glass-dot"
              title={isMaximized ? "Restaurar" : "Maximizar"}
              onClick={handleMax}
            >
              <i className={isMaximized ? "pi pi-window-minimize" : "pi pi-window-maximize"} style={{ fontSize: '10px' }} />
            </div>
            <div className="glass-dot" title="Ocultar" onClick={handleClose}>
              <i className="pi pi-times" />
            </div>
          </div>
        );

      case 'minimal':
        return <div className="minimal-controls no-drag" />;

      case 'retro':
        return (
          <div className="retro-controls no-drag" onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div
              className={`retro-switch ${isMaximized ? 'on' : ''}`}
              title={isMaximized ? "Restaurar CRT" : "Maximizar CRT"}
              onClick={handleMax}
              style={{ border: '2px solid #0f0' }}
            />
            <span style={{ fontSize: '9px', color: '#0f0', fontFamily: 'monospace' }}>
              {isMaximized ? "MAX" : "NORM"}
            </span>
            <div
              className="retro-switch on"
              title="OFF"
              onClick={handleClose}
            />
          </div>
        );

      default:
        return (
          <div className="traffic-lights no-drag" onMouseDown={(e) => e.stopPropagation()}>
            <div className="traffic-dot red" onClick={handleClose} title="Ocultar" />
            <div className="traffic-dot yellow" />
            <div className="traffic-dot green" onClick={handleMax} title="Maximizar" />
          </div>
        );
    }
  };

  return (
    <Rnd
      ref={rndRef}
      size={
        isMaximized
          ? { width: '100%', height: '100%' }
          : { width, height }
      }
      position={
        isMaximized
          ? { x: 0, y: 0 }
          : { x, y }
      }
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStart={handleDragStart}
      onResizeStop={handleResizeStop}
      minWidth={minWidth}
      minHeight={minHeight}
      bounds={bounds}
      dragGrid={gridStep}
      resizeGrid={gridStep}
      dragHandleClassName="home-panel-drag-handle"
      cancel=".no-drag, input, textarea, button, .p-inputtext, select"
      disableDragging={disableDragging || isMaximized}
      enableResizing={
        disableResizing || isMaximized
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
      style={{
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        transition: isMaximized ? 'all 0.2s ease' : 'none',
        ...style
      }}
      onMouseDown={handleDragStart}
    >
      <div
        className={`home-panel-frame recents-terminal-frame ${terminalFrameStyle} ${isMaximized ? 'is-maximized' : ''} ${className}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMaximized ? 0 : undefined,
          ...(frameBackground ? { background: frameBackground } : {})
        }}
      >
        {!hideHeader && (
          <div
            className="home-panel-drag-handle recents-terminal-header"
            onDoubleClick={handleHeaderDoubleClick}
            style={{
              cursor: isMaximized ? 'default' : 'grab',
              userSelect: 'none',
              borderRadius: isMaximized ? 0 : undefined,
              flexShrink: 0
            }}
          >
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
          </div>
        )}

        <div
          className="home-panel-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
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
