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
  externalPaneSize = null // Nuevo prop para controlar el tamaño externamente
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
    // Solo actualizar el tamaño interno si no se está usando tamaño externo
    if (externalPaneSize === null) {
      setInternalPaneSize(orientation === 'vertical' ? size.width : size.height);
    }
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
    transition: externalPaneSize !== null ? 'all 0.3s ease' : 'none'
  };

  const secondaryPaneStyle = {
    width: isVertical ? `calc(100% - ${primaryPaneSize}px)` : '100%',
    height: isVertical ? '100%' : `calc(100% - ${primaryPaneSize}px)`,
    minHeight: isVertical ? 'auto' : '40px', // Altura mínima para mostrar las pestañas
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: externalPaneSize !== null ? 'all 0.3s ease' : 'none'
  };

  const resizeHandleStyle = {
    position: 'absolute',
    backgroundColor: '#ddd',
    zIndex: 1,
    ...(isVertical ? {
      width: '4px',
      height: '100%',
      right: '-2px',
      top: 0,
      cursor: 'col-resize'
    } : {
      height: '4px',
      width: '100%',
      bottom: '-2px',
      left: 0,
      cursor: 'row-resize'
    })
  };

  const minPanelSize = 50;
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

  const maxPrimaryPaneSize = Math.max(containerSize - minPanelSize, minPanelSize);

  return (
    <div ref={containerRef} style={containerStyle}>
      <Resizable
        width={isVertical ? primaryPaneSize : 0}
        height={isVertical ? 0 : primaryPaneSize}
        onResize={handleResize}
        resizeHandles={[isVertical ? 'e' : 's']}
        handle={<div style={resizeHandleStyle} />}
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