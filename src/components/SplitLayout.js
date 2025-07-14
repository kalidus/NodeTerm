import React, { useRef, useEffect } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import TerminalComponent from './TerminalComponent';

const SplitLayout = ({ 
  leftTerminal, 
  rightTerminal, 
  fontFamily, 
  fontSize, 
  theme, 
  onContextMenu, 
  sshStatsByTabId,
  terminalRefs
}) => {
  const leftTerminalRef = useRef(null);
  const rightTerminalRef = useRef(null);

  // Exponer métodos para que el componente padre pueda interactuar con ambos terminales
  const handleResize = () => {
    if (leftTerminalRef.current) {
      leftTerminalRef.current.fit();
    }
    if (rightTerminalRef.current) {
      rightTerminalRef.current.fit();
    }
  };

  // Efecto para redimensionar terminales cuando se monta el componente
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleResize();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Efecto para escuchar cambios de tamaño en el splitter
  const handleSplitterResize = () => {
    // Pequeño delay para permitir que el CSS se aplique
    setTimeout(() => {
      handleResize();
    }, 50);
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Splitter 
        style={{ height: '100%' }} 
        onResizeEnd={handleSplitterResize}
        onResize={handleSplitterResize}
        className="split-terminal-splitter"
        pt={{
          gutter: {
            style: {
              background: 'var(--ui-sidebar-gutter-bg, #dee2e6)',
              borderColor: 'var(--ui-sidebar-border, #e0e0e0)',
              width: '4px',
              transition: 'background 0.2s'
            }
          }
        }}
      >
        <SplitterPanel size={50} minSize={20} style={{ height: '100%' }}>
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) {
                  terminalRefs.current[leftTerminal.key] = el;
                }
              }}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[leftTerminal.key]}
            />
          </div>
        </SplitterPanel>
        
        <SplitterPanel size={50} minSize={20} style={{ height: '100%' }}>
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) {
                  terminalRefs.current[rightTerminal.key] = el;
                }
              }}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId[rightTerminal.key]}
            />
          </div>
        </SplitterPanel>
      </Splitter>
    </div>
  );
};

// Métodos expuestos para el componente padre
SplitLayout.displayName = 'SplitLayout';

export default SplitLayout; 