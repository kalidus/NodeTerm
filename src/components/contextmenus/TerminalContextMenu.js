import React from 'react';

const TerminalContextMenu = ({
  terminalContextMenu,
  setTerminalContextMenu,
  onCopy,
  onPaste,
  onSelectAll,
  onClear,
  onStartRecording,
  onStopRecording,
  isRecording = false,
  handleToggleBroadcast,
  handleToggleBroadcastTarget,
  getAllTabs,
  onShowSystemMonitor,
  isSSHSession = false
}) => {
  if (!terminalContextMenu) return null;

  const allTabs = getAllTabs ? getAllTabs() : [];

  let parentTab = allTabs.find(t => t.key === terminalContextMenu.tabKey);
  if (!parentTab) {
    parentTab = allTabs.find(tab => {
      if (tab.type !== 'split') return false;

      const hasChild = (node) => {
        if (!node) return false;
        if (node.key === terminalContextMenu.tabKey) return true;
        if (node.type === 'split') return hasChild(node.first) || hasChild(node.second);
        return false;
      };

      if (tab.first || tab.second) {
        return hasChild(tab.first) || hasChild(tab.second);
      } else if (Array.isArray(tab.terminals)) {
        return tab.terminals.some(t => t.key === terminalContextMenu.tabKey);
      } else if (tab.leftTerminal && tab.rightTerminal) {
        return tab.leftTerminal.key === terminalContextMenu.tabKey ||
          tab.rightTerminal.key === terminalContextMenu.tabKey;
      }
      return false;
    });
  }

  const isBroadcasting = parentTab ? parentTab.isBroadcastActive : false;

  const handleCopy = () => {
    onCopy(terminalContextMenu.tabKey);
  };

  const handlePaste = () => {
    onPaste(terminalContextMenu.tabKey);
  };

  const handleSelectAll = () => {
    onSelectAll(terminalContextMenu.tabKey);
  };

  const handleClear = () => {
    onClear(terminalContextMenu.tabKey);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      onStopRecording && onStopRecording(terminalContextMenu.tabKey);
    } else {
      onStartRecording && onStartRecording(terminalContextMenu.tabKey);
    }
  };

  const extractTerminals = (tab) => {
    const list = [];
    if (!tab) return list;
    if (tab.type === 'terminal' || tab.type === 'local-terminal') {
      list.push({ key: tab.key, label: tab.label || tab.key });
    } else if (tab.type === 'split') {
      if (tab.first || tab.second) {
        if (tab.first) list.push(...extractTerminals(tab.first));
        if (tab.second) list.push(...extractTerminals(tab.second));
      } else if (Array.isArray(tab.terminals)) {
        tab.terminals.forEach(t => list.push(...extractTerminals(t)));
      } else if (tab.leftTerminal && tab.rightTerminal) {
        list.push(...extractTerminals(tab.leftTerminal));
        list.push(...extractTerminals(tab.rightTerminal));
      }
    }
    return list;
  };

  const terminalsInGroup = isBroadcasting && parentTab ? extractTerminals(parentTab) : [];

  return (
    <>
      <div
        className="terminal-context-menu"
        style={{
          position: 'fixed',
          left: terminalContextMenu.mouseX,
          top: terminalContextMenu.mouseY,
          zIndex: 9999,
          minWidth: '180px',
          overflow: 'hidden'
        }}
        onMouseLeave={() => setTerminalContextMenu(null)}
      >
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleCopy}
        >
          <i className="pi pi-copy" style={{ width: '16px' }}></i>
          Copiar selección
        </div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handlePaste}
        >
          <i className="pi pi-clone" style={{ width: '16px' }}></i>
          Pegar
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleSelectAll}
        >
          <i className="pi pi-list" style={{ width: '16px' }}></i>
          Seleccionar todo
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleClear}
        >
          <i className="pi pi-trash" style={{ width: '16px' }}></i>
          Limpiar terminal
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        {(onStartRecording || onStopRecording) && (
          <div
            className="menu-item"
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: isRecording ? '#d32f2f' : '#4caf50'
            }}
            onClick={handleToggleRecording}
          >
            <i className={isRecording ? 'pi pi-stop-circle' : 'pi pi-circle'} style={{ width: '16px', color: isRecording ? '#d32f2f' : '#4caf50' }}></i>
            {isRecording ? '⏹ Detener grabación' : '⏺ Iniciar grabación'}
          </div>
        )}
        {handleToggleBroadcast && (
          <>
            <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
            <div
              className="menu-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (parentTab) {
                  handleToggleBroadcast(parentTab.key);
                }
              }}
            >
              <i className={`pi ${isBroadcasting ? 'pi-eye-slash' : 'pi-wifi'}`} style={{ width: '16px' }}></i>
              {isBroadcasting ? 'Desactivar Broadcast (Input simultáneo)' : 'Activar Broadcast (Input simultáneo)'}
            </div>

            {isBroadcasting && terminalsInGroup.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <div className="menu-header" style={{ padding: '8px 12px 4px 12px', fontWeight: 'bold', fontSize: '11px', color: 'var(--ui-context-text)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Destinos del Broadcast
                </div>
                {terminalsInGroup.map(term => {
                  const isExcluded = parentTab.broadcastExcludedTargets?.includes(term.key);
                  const isChecked = !isExcluded;

                  return (
                    <div
                      key={term.key}
                      className="menu-item"
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleToggleBroadcastTarget) {
                          handleToggleBroadcastTarget(parentTab.key, term.key);
                        }
                      }}
                    >
                      <i className={`pi ${isChecked ? 'pi-check-square' : 'pi-stop'}`} style={{ width: '16px', color: isChecked ? '#4caf50' : 'inherit', opacity: isChecked ? 1 : 0.5 }}></i>
                      <span style={{ opacity: isChecked ? 1 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {term.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SSH System Monitor */}
        {isSSHSession && onShowSystemMonitor && (
          <>
            <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }} />
            <div
              className="menu-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#58a6ff'
              }}
              onClick={() => {
                onShowSystemMonitor(terminalContextMenu.tabKey);
                setTerminalContextMenu(null);
              }}
            >
              <i className="pi pi-chart-bar" style={{ width: '16px', color: '#58a6ff' }} />
              Monitor del Sistema
            </div>
          </>
        )}
      </div>

      {/* Overlay para cerrar menú al hacer clic fuera */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
        onClick={() => setTerminalContextMenu(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setTerminalContextMenu(null);
        }}
      />
    </>
  );
};

export default TerminalContextMenu;
