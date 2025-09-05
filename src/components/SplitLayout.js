import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import TerminalComponent from './TerminalComponent';

// Utilidad para ajustar brillo de un color hex
function adjustColorBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const SplitLayout = ({ 
  leftTerminal, 
  rightTerminal, 
  fontFamily, 
  fontSize, 
  theme, 
  onContextMenu, 
  sshStatsByTabId,
  terminalRefs,
  orientation = 'vertical',
  statusBarIconTheme = 'classic',
  externalPaneSize = null, // Nuevo prop para controlar el tamaño externamente
  onManualResize = null, // Callback para notificar redimensionamiento manual
  splitterColor, // <-- nuevo prop
  onCloseLeft = null, // Callback para cerrar panel izquierdo
  onCloseRight = null // Callback para cerrar panel derecho
}) => {
  const leftTerminalRef = useRef(null);
  const rightTerminalRef = useRef(null);
  
  // Estado para funcionalidad de colapso (solo para vertical)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const enableCollapse = orientation === 'vertical'; // Solo colapso en vertical
  
  // Configuración del splitter basado en el sidebar que funciona perfecto
  const collapsedSize = 4; // Porcentaje cuando está colapsado (como el sidebar: 44px de ~1000px = ~4%)
  const defaultSize = orientation === 'vertical' ? 30 : 50; // Tamaño por defecto (50% para horizontal como antes)
  
  // Función para manejar resize del splitter
  const handleResize = useCallback((e) => {
    if (onManualResize) {
      onManualResize();
    }
  }, [onManualResize]);
  
  // Función para toggle del colapso (mantener funcionalidad)
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Aplicar optimizaciones del sidebar que funciona perfecto
  useEffect(() => {
    const splitterElement = document.querySelector('.terminal-splitter');
    if (!splitterElement) return;

    const handleResizeStart = (e) => {
      // Solo aplicar optimizaciones si el click es en el gutter (igual que el sidebar)
      if (e.target.classList.contains('p-splitter-gutter')) {
        splitterElement.classList.add('p-splitter-resizing');
        // Deshabilitar transiciones durante el redimensionamiento para fluidez
        document.documentElement.style.setProperty('--split-transition', 'none');
      }
    };

    const handleResizeEnd = () => {
      splitterElement.classList.remove('p-splitter-resizing');
      // Reactivar transiciones después del redimensionamiento
      document.documentElement.style.removeProperty('--split-transition');
    };

    // Eventos para detectar inicio y fin del redimensionamiento (igual que el sidebar)
    splitterElement.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mouseup', handleResizeEnd);
    
    return () => {
      splitterElement.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Configuración del gutter igual que el sidebar que funciona perfecto
  const gutterStyle = {
    transition: 'none', // Clave: sin transición como el sidebar
    background: splitterColor || 'var(--ui-sidebar-gutter-bg, #dee2e6)',
    borderColor: 'var(--ui-sidebar-border, #e0e0e0)',
    width: orientation === 'vertical' ? '2px' : '100%', // 2px como el sidebar
    height: orientation === 'horizontal' ? '2px' : '100%'
  };

  // Usar PrimeReact solo para vertical, sistema original para horizontal
  if (orientation === 'horizontal') {
    // Mantener sistema original para HomeTab
    const isVertical = orientation === 'vertical';
    const containerStyle = {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: isVertical ? 'row' : 'column',
      overflow: 'hidden'
    };

    const primaryPaneSize = externalPaneSize !== null ? externalPaneSize : 400;

    const primaryPaneStyle = {
      width: isVertical ? `${primaryPaneSize}px` : '100%',
      height: isVertical ? '100%' : `${primaryPaneSize}px`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: externalPaneSize !== null ? 'all 0.1s ease' : 'none'
    };

    const secondaryPaneStyle = {
      width: isVertical ? `calc(100% - ${primaryPaneSize}px)` : '100%',
      height: isVertical ? '100%' : `calc(100% - ${primaryPaneSize}px)`,
      minHeight: isVertical ? 'auto' : '40px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: externalPaneSize !== null ? 'all 0.1s ease' : 'none',
      background: theme?.background || undefined
    };

    // Necesitamos agregar el handle de resize horizontal
    const [internalPaneSize, setInternalPaneSize] = useState(400);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, size: 0 });
    
    const finalPrimaryPaneSize = externalPaneSize !== null ? externalPaneSize : internalPaneSize;
    
    // Actualizar los estilos con el tamaño final
    const finalPrimaryPaneStyle = {
      ...primaryPaneStyle,
      height: `${finalPrimaryPaneSize}px`,
      position: 'relative'
    };
    
    const finalSecondaryPaneStyle = {
      ...secondaryPaneStyle,
      height: `calc(100% - ${finalPrimaryPaneSize}px)`
    };

    // Handlers de resize horizontal
    const handleMouseDown = useCallback((e) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        size: finalPrimaryPaneSize
      });
      
      if (externalPaneSize !== null && onManualResize) {
        onManualResize();
      }
    }, [finalPrimaryPaneSize, externalPaneSize, onManualResize]);

    const handleMouseMove = useCallback((e) => {
      if (!isDragging) return;
      
      const delta = e.clientY - dragStart.y;
      const newSize = Math.round(dragStart.size + delta);
      
      const minSize = 100;
      const maxSize = window.innerHeight - 100;
      
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      setInternalPaneSize(clampedSize);
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
      if (isDragging) {
        setIsDragging(false);
      }
    }, [isDragging]);

    // Event listeners para el drag horizontal
    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Estilo del handle horizontal
    const horizontalHandleStyle = {
      position: 'absolute',
      bottom: '-3px',
      left: 0,
      width: '100%',
      height: '6px',
      backgroundColor: splitterColor || '#ddd',
      cursor: 'row-resize',
      zIndex: 1000,
      userSelect: 'none'
    };

    return (
      <div style={containerStyle}>
        <div style={finalPrimaryPaneStyle}>
          {leftTerminal.content ? (
            leftTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
              }}
              key={leftTerminal.key}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[leftTerminal.key]}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
          
          {/* Handle de resize horizontal */}
          <div 
            style={horizontalHandleStyle}
            onMouseDown={handleMouseDown}
          />
        </div>
        
        <div style={finalSecondaryPaneStyle}>
          {rightTerminal.content ? (
            rightTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
              }}
              key={rightTerminal.key}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[rightTerminal.key]}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </div>
    );
  }

  // PrimeReact Splitter solo para orientación vertical
  return (
    <Splitter
      style={{ height: '100%', width: '100%' }}
      layout={orientation}
      onResize={handleResize}
      className="terminal-splitter"
      pt={{
        gutter: {
          style: gutterStyle
        }
      }}
    >
      <SplitterPanel
        size={(enableCollapse && isCollapsed) ? collapsedSize : defaultSize}
        minSize={(enableCollapse && isCollapsed) ? collapsedSize : 10}
        maxSize={(enableCollapse && isCollapsed) ? collapsedSize : 90}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          transition: 'all 0.2s ease'
        }}
      >
        {/* Header del panel izquierdo con funcionalidad de colapso */}
        {(onCloseLeft || enableCollapse) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: (enableCollapse && isCollapsed) ? 'center' : 'space-between',
            padding: (enableCollapse && isCollapsed) ? '4px 2px' : '4px 8px',
            background: theme?.background || '#1e1e1e',
            borderBottom: `1px solid ${theme?.foreground || '#666'}33`,
            fontSize: '12px',
            color: theme?.foreground || '#fff',
            minHeight: '24px'
          }}>
            {(enableCollapse && isCollapsed) ? (
              // Botón para expandir cuando está colapsado
              <button
                onClick={handleToggleCollapse}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme?.foreground || '#fff',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '16px',
                  opacity: 0.7,
                  borderRadius: '3px'
                }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.7'}
                title="Expandir panel"
              >
                ▶
              </button>
            ) : (
              <>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {leftTerminal.label || leftTerminal.key}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {enableCollapse && (
                    <button
                      onClick={handleToggleCollapse}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme?.foreground || '#fff',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '12px',
                        opacity: 0.7
                      }}
                      onMouseEnter={e => e.target.style.opacity = '1'}
                      onMouseLeave={e => e.target.style.opacity = '0.7'}
                      title="Colapsar panel"
                    >
                      ◀
                    </button>
                  )}
                  {onCloseLeft && (
                    <button
                      onClick={() => onCloseLeft(leftTerminal.key)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme?.foreground || '#fff',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '14px',
                        opacity: 0.7
                      }}
                      onMouseEnter={e => e.target.style.opacity = '1'}
                      onMouseLeave={e => e.target.style.opacity = '0.7'}
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Contenido del panel izquierdo */}
        <div style={{ 
          flex: 1, 
          minHeight: 0, 
          display: (enableCollapse && isCollapsed) ? 'none' : 'flex', 
          flexDirection: 'column' 
        }}>
          {!(enableCollapse && isCollapsed) && (leftTerminal.content ? (
            leftTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
              }}
              key={leftTerminal.key}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[leftTerminal.key]}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          ))}
        </div>
      </SplitterPanel>
      
      <SplitterPanel style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        background: theme?.background || undefined
      }}>
        {/* Header del panel derecho */}
        {onCloseRight && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: theme?.background || '#1e1e1e',
            borderBottom: `1px solid ${theme?.foreground || '#666'}33`,
            fontSize: '12px',
            color: theme?.foreground || '#fff',
            minHeight: '24px'
          }}>
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {rightTerminal.label || rightTerminal.key}
            </span>
            <button
              onClick={() => onCloseRight(rightTerminal.key)}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme?.foreground || '#fff',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '14px',
                marginLeft: '8px',
                opacity: 0.7
              }}
              onMouseEnter={e => e.target.style.opacity = '1'}
              onMouseLeave={e => e.target.style.opacity = '0.7'}
            >
              ×
            </button>
          </div>
        )}
        
        {/* Contenido del panel derecho */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {rightTerminal.content ? (
            rightTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
              }}
              key={rightTerminal.key}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[rightTerminal.key]}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </SplitterPanel>
    </Splitter>
  );
};

export default SplitLayout; 