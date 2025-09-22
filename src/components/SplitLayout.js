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

  // Forzar fit de los terminales después de que se monten
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leftTerminalRef.current?.fit) {
        leftTerminalRef.current.fit();
      }
      if (rightTerminalRef.current?.fit) {
        rightTerminalRef.current.fit();
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [leftTerminal.key, rightTerminal.key]);

  // Asegurar que los terminales se inicialicen correctamente
  useEffect(() => {
    const timer = setTimeout(() => {
      // Forzar focus en el terminal izquierdo para asegurar que se inicialice
      if (leftTerminalRef.current?.focus) {
        leftTerminalRef.current.focus();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [leftTerminal.key]);

  // Configuración del gutter específica para terminales
  const gutterStyle = {
    transition: 'none',
    background: 'transparent',
    borderColor: 'transparent',
    width: orientation === 'vertical' ? '6px' : '100%',
    height: orientation === 'horizontal' ? '8px' : '100%',
    cursor: orientation === 'vertical' ? 'col-resize' : 'row-resize',
    margin: orientation === 'vertical' ? '0 -4px' : '0',
    position: 'relative',
    zIndex: 10
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
      bottom: '-4px',
      left: 0,
      width: '100%',
      height: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      cursor: 'row-resize',
      zIndex: 1000,
      userSelect: 'none',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
          
          {/* Handle de resize horizontal */}
          <div 
            style={horizontalHandleStyle}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.target.style.borderTopColor = 'rgba(255, 255, 255, 0.4)';
              e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderTopColor = 'rgba(255, 255, 255, 0.2)';
              e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.2)';
            }}
            title="Arrastra para redimensionar"
          >
            {/* Indicador visual horizontal */}
            <div style={{
              width: '40px',
              height: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '1px',
              opacity: 0.8
            }} />
          </div>
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
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </div>
    );
  }

  // Implementación simple sin PrimeReact para vertical
  if (orientation === 'vertical') {
    const [leftSize, setLeftSize] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // Buscar el contenedor split
      const container = document.querySelector('.split-container');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newLeftSize = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftSize(Math.max(20, Math.min(80, newLeftSize)));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging]);
    
    return (
      <div className="split-container" style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden'
      }}>
        {/* Panel izquierdo */}
        <div style={{
          width: `${leftSize}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: '200px'
        }}>
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
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
        
        {/* Gutter */}
        <div 
          style={{
            width: '6px',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.target.style.borderLeftColor = 'rgba(255, 255, 255, 0.4)';
            e.target.style.borderRightColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.target.style.borderLeftColor = 'rgba(255, 255, 255, 0.2)';
            e.target.style.borderRightColor = 'rgba(255, 255, 255, 0.2)';
          }}
          title="Arrastra para redimensionar"
        >
          {/* Indicador visual del gutter */}
          <div style={{
            width: '2px',
            height: '40px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '1px',
            opacity: 0.8
          }} />
        </div>
        
        {/* Panel derecho */}
        <div style={{
          width: `${100 - leftSize}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: '200px'
        }}>
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
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </div>
    );
  }

  // PrimeReact Splitter para horizontal (mantener como estaba)
  return (
    <Splitter
      style={{ height: '100%', width: '100%', border: 'none' }}
      layout={orientation}
      onResize={handleResize}
      className="terminal-splitter"
      pt={{
        gutter: {
          style: gutterStyle
        },
        root: {
          style: {
            border: 'none',
            height: '100%',
            width: '100%'
          }
        }
      }}
    >
      <SplitterPanel
        size={(enableCollapse && isCollapsed) ? collapsedSize : defaultSize}
        minSize={(enableCollapse && isCollapsed) ? collapsedSize : 200}
        maxSize={(enableCollapse && isCollapsed) ? collapsedSize : 90}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          transition: 'all 0.2s ease',
          minWidth: '200px',
          overflow: 'hidden'
        }}
        pt={{
          root: {
            style: {
              height: '100%',
              minWidth: '200px',
              overflow: 'hidden'
            }
          }
        }}
      >
        {/* Contenido del panel izquierdo para horizontal */}
        <div style={{ 
          flex: 1, 
          minHeight: 0, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden'
        }}>
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
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </SplitterPanel>
      
      <SplitterPanel 
        minSize={200}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: theme?.background || undefined,
          minWidth: '200px',
          overflow: 'hidden'
        }}
        pt={{
          root: {
            style: {
              height: '100%',
              minWidth: '200px',
              overflow: 'hidden'
            }
          }
        }}
      >
        {/* Contenido del panel derecho para horizontal */}
        <div style={{ 
          flex: 1, 
          minHeight: 0,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
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
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
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