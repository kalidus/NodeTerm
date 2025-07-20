import React, { useRef, useState } from 'react';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import TerminalComponent from './TerminalComponent';

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
  onManualResize = null // Callback para notificar redimensionamiento manual
}) => {
  const leftTerminalRef = useRef(null);
  const rightTerminalRef = useRef(null);
  const containerRef = useRef(null);
  
  // Estado para el tamaño del panel izquierdo/superior
  const [internalPaneSize, setInternalPaneSize] = useState(
    orientation === 'vertical' ? 400 : 300
  );
  
  // Usar tamaño externo si se proporciona, sino usar el interno
  const primaryPaneSize = externalPaneSize !== null ? externalPaneSize : internalPaneSize;

  const handleResize = (event, { size }) => {
    const newSize = orientation === 'vertical' ? size.width : size.height;
    
    // Si había un tamaño externo activo y el usuario redimensiona manualmente,
    // notificar que quiere volver al modo manual
    if (externalPaneSize !== null && onManualResize) {
      onManualResize();
    }
    
    // Actualizar el tamaño interno
    setInternalPaneSize(newSize);
  };

  const isVertical = orientation === 'vertical';
  const containerStyle = {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: isVertical ? 'row' : 'column',
    overflow: 'hidden'
  };

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
    minHeight: isVertical ? 'auto' : '40px', // Altura mínima para mostrar las pestañas
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: externalPaneSize !== null ? 'all 0.1s ease' : 'none'
  };

  const resizeHandleStyle = {
    position: 'absolute',
    backgroundColor: '#ddd',
    zIndex: 1000,
    transition: 'background-color 0.2s ease',
    ...(isVertical ? {
      width: '4px',
      height: '100%',
      right: '-2px',
      top: 0,
      cursor: 'col-resize'
    } : {
      height: '6px', // Ligeramente más gruesa para mejor accesibilidad
      width: '100%',
      bottom: '-3px',
      left: 0,
      cursor: 'row-resize'
    })
  };

  const minPanelSize = 10; // Tamaño mínimo para mantener la barra siempre accesible
  const minTerminalSize = 40; // Altura mínima para mostrar pestañas del terminal
  const [containerSize, setContainerSize] = useState(0);

  // Actualizar el tamaño del contenedor al montar y redimensionar
  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize(isVertical ? containerRef.current.offsetWidth : containerRef.current.offsetHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isVertical]);

  // Para horizontal: permitir que el dashboard vaya hasta casi toda la pantalla (dejando 40px para terminal)
  // Para vertical: usar límites normales
  const maxPrimaryPaneSize = isVertical 
    ? Math.max(containerSize - minPanelSize, minPanelSize)
    : Math.max(containerSize - minTerminalSize, minPanelSize);

  return (
    <div ref={containerRef} style={containerStyle}>
      <Resizable
        width={isVertical ? primaryPaneSize : 0}
        height={isVertical ? 0 : primaryPaneSize}
        onResize={handleResize}
        resizeHandles={[isVertical ? 'e' : 's']}
        handle={
          <div 
            style={resizeHandleStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#bbb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ddd';
            }}
          />
        }
        minConstraints={isVertical ? [minPanelSize, 0] : [0, minPanelSize]}
        maxConstraints={isVertical ? [maxPrimaryPaneSize, 0] : [0, maxPrimaryPaneSize]}
      >
        <div style={primaryPaneStyle}>
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
        </div>
      </Resizable>
      
      <div style={secondaryPaneStyle}>
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
};

export default SplitLayout; 