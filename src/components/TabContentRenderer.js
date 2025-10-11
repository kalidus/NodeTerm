import React from 'react';
import HomeTab from './HomeTab';
import FileExplorer from './FileExplorer';
import SplitLayout from './SplitLayout';
import RdpSessionTab from './RdpSessionTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import GuacamoleTab from './GuacamoleTab';
import TerminalComponent from './TerminalComponent';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';
import UbuntuTerminal from './UbuntuTerminal';
import CygwinTerminal from './CygwinTerminal';
import { themes } from '../themes';
import { TAB_TYPES } from '../utils/constants';

const TabContentRenderer = React.memo(({
  tab,
  isActiveTab,
  // HomeTab props
  onCreateSSHConnection,
  openFolderDialog,
  onOpenRdpConnection,
  handleLoadGroupFromFavorites,
  openEditRdpDialog,
  openEditSSHDialog,
  nodes,
  localFontFamily,
  localFontSize,
  localLinuxTerminalTheme,
  localPowerShellTheme,
  // FileExplorer props
  iconTheme,
  explorerFont,
  explorerColorTheme,
  explorerFontSize,
  // SplitLayout props
  fontFamily,
  fontSize,
  terminalTheme,
  handleTerminalContextMenu,
  showTerminalContextMenu,
  sshStatsByTabId,
  terminalRefs,
  statusBarIconTheme,
  handleCloseSplitPanel,
  // RDP props
  rdpTabs,
  findNodeByKey,
  // Terminal props
  sshStatsByTabId: terminalSshStatsByTabId
}) => {
  if (tab.type === 'home') {
    return (
      <HomeTab
        onCreateSSHConnection={onCreateSSHConnection}
        onCreateFolder={() => openFolderDialog(null)}
        onCreateRdpConnection={onOpenRdpConnection}
        onLoadGroup={handleLoadGroupFromFavorites}
        onEditConnection={(connection) => {
          // Intentar construir un nodo temporal según el tipo para reutilizar los editores existentes
          if (!connection) return;
          if (connection.type === 'rdp-guacamole' || connection.type === 'rdp') {
            const tempNode = {
              key: `temp_rdp_${Date.now()}`,
              label: connection.name || `${connection.host}:${connection.port || 3389}`,
              data: {
                type: 'rdp',
                server: connection.host,
                hostname: connection.host,
                username: connection.username,
                password: connection.password,
                port: connection.port || 3389,
                clientType: 'guacamole'
              }
            };
            openEditRdpDialog(tempNode);
            return;
          }
          if (connection.type === 'ssh' || connection.type === 'explorer') {
            // Reutilizar diálogo de edición SSH
            const tempNode = {
              key: `temp_ssh_${Date.now()}`,
              label: connection.name || `${connection.username}@${connection.host}`,
              data: {
                type: 'ssh',
                host: connection.host,
                user: connection.username,
                password: connection.password,
                port: connection.port || 22,
                remoteFolder: ''
              }
            };
            openEditSSHDialog(tempNode);
          }
        }}
        // Pasar ids activos al hub para mostrar estado en los listados
        // (ConnectionHistory acepta activeIds desde HomeTab; aquí lo calculamos y lo inyectamos a través del DOM global)
        sshConnectionsCount={(() => {
          // Contar sesiones SSH únicas (sin incluir exploradores)
          const uniqueSSHSessions = new Set();
          nodes.forEach(node => {
            if (node.data && node.data.type === 'ssh') {
              uniqueSSHSessions.add(node.key);
            }
            // Función recursiva para contar en hijos
            const countInChildren = (children) => {
              if (children && children.length > 0) {
                children.forEach(child => {
                  if (child.data && child.data.type === 'ssh') {
                    uniqueSSHSessions.add(child.key);
                  }
                  countInChildren(child.children);
                });
              }
            };
            countInChildren(node.children);
          });
          return uniqueSSHSessions.size;
        })()}
        foldersCount={(() => {
          // Contar carpetas únicas
          let folderCount = 0;
          const countFolders = (nodeList) => {
            nodeList.forEach(node => {
              if (node.droppable && (!node.data || node.data.type !== 'ssh')) {
                folderCount++;
              }
              if (node.children && node.children.length > 0) {
                countFolders(node.children);
              }
            });
          };
          countFolders(nodes);
          return folderCount;
        })()}
        localFontFamily={localFontFamily}
        localFontSize={localFontSize}
        localTerminalTheme={localLinuxTerminalTheme}
        localPowerShellTheme={localPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
      />
    );
  }

  if (tab.type === 'explorer' || tab.isExplorerInSSH) {
    return (
      <FileExplorer
        sshConfig={tab.sshConfig}
        tabId={tab.key}
        iconTheme={iconTheme}
        explorerFont={explorerFont}
        explorerColorTheme={explorerColorTheme}
        explorerFontSize={explorerFontSize}
      />
    );
  }

  // Password info tab
  if (tab.type === TAB_TYPES.PASSWORD && tab.passwordData) {
    const p = tab.passwordData;
    const copyToClipboard = async (text, fieldName) => {
      try {
        if (window.electron?.clipboard?.writeText) {
          await window.electron.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(text);
        }
        // Show success toast if available
        if (window.toast?.current?.show) {
          window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: `${fieldName} copiado al portapapeles`, life: 1500 });
        }
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const Row = ({ label, value, copy }) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
        <div style={{ width: 120, color: '#9aa0a6', fontWeight: '500' }}>{label}</div>
        <div style={{ flex: 1, color: '#e8eaed', fontFamily: 'monospace', fontSize: '14px' }}>{value || '-'}</div>
        {copy && value && (
          <button 
            onClick={() => copyToClipboard(value, label)} 
            style={{ 
              padding: '6px 12px', 
              borderRadius: 6, 
              border: '1px solid #555', 
              background: '#3a3a3a', 
              color: '#fff', 
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#4a4a4a'}
            onMouseOut={(e) => e.target.style.background = '#3a3a3a'}
          >
            Copiar
          </button>
        )}
      </div>
    );

    return (
      <div style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        height: '100%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span className="pi pi-key" style={{ fontSize: '24px', color: '#ffc107' }}></span>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>{p.title}</h2>
        </div>
        
        <div style={{ 
          background: '#2a2a2a', 
          borderRadius: 12, 
          padding: 20, 
          border: '1px solid #444',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <Row label="Usuario" value={p.username} copy />
          <Row label="Contraseña" value={p.password} copy />
          <Row label="URL" value={p.url} />
          <Row label="Grupo" value={p.group} />
          <Row label="Notas" value={p.notes} />
        </div>
        
        {p.url && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button 
              onClick={() => window.electron?.import?.openExternal?.(p.url)} 
              style={{ 
                padding: '12px 24px', 
                borderRadius: 8, 
                border: 'none', 
                background: 'linear-gradient(135deg, #007ad9 0%, #0056b3 100%)', 
                color: '#fff', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,122,217,0.3)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span className="pi pi-external-link" style={{ marginRight: 8 }}></span>
              Abrir URL
            </button>
          </div>
        )}
      </div>
    );
  }

  // Password folder tab - muestra todos los passwords de una carpeta con paginación
  if (tab.type === TAB_TYPES.PASSWORD_FOLDER && tab.folderData) {
    const { folderLabel, passwords } = tab.folderData;
    
    // Estado para paginación
    const [currentPage, setCurrentPage] = React.useState(1);
    const ITEMS_PER_PAGE = 20; // Mostrar 20 passwords por página
    
    // Calcular paginación
    const totalPages = Math.ceil(passwords.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPasswords = passwords.slice(startIndex, endIndex);
    
    // Resetear página cuando cambie la carpeta
    React.useEffect(() => {
      setCurrentPage(1);
    }, [tab.key]);
    
    const copyToClipboard = async (text, fieldName) => {
      try {
        if (window.electron?.clipboard?.writeText) {
          await window.electron.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(text);
        }
        // Show success toast if available
        if (window.toast?.current?.show) {
          window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: `${fieldName} copiado al portapapeles`, life: 1500 });
        }
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const PasswordCard = ({ password }) => (
      <div style={{ 
        background: '#2a2a2a', 
        borderRadius: 8, 
        padding: '16px', 
        border: '1px solid #444',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.2s',
        marginBottom: '12px'
      }}
      onMouseOver={(e) => e.currentTarget.style.borderColor = '#ffc107'}
      onMouseOut={(e) => e.currentTarget.style.borderColor = '#444'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pi pi-key" style={{ fontSize: '16px', color: '#ffc107' }}></span>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>{password.label}</h3>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {password.username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#9aa0a6', fontSize: '12px', minWidth: '80px' }}>Usuario:</span>
              <span style={{ flex: 1, color: '#e8eaed', fontFamily: 'monospace', fontSize: '13px' }}>{password.username}</span>
              <button 
                onClick={() => copyToClipboard(password.username, 'Usuario')} 
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: 4, 
                  border: '1px solid #555', 
                  background: '#3a3a3a', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#4a4a4a'}
                onMouseOut={(e) => e.target.style.background = '#3a3a3a'}
              >
                <span className="pi pi-copy" style={{ fontSize: '10px' }}></span>
              </button>
            </div>
          )}
          
          {password.password && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#9aa0a6', fontSize: '12px', minWidth: '80px' }}>Contraseña:</span>
              <span style={{ flex: 1, color: '#e8eaed', fontFamily: 'monospace', fontSize: '13px' }}>{'•'.repeat(password.password.length)}</span>
              <button 
                onClick={() => copyToClipboard(password.password, 'Contraseña')} 
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: 4, 
                  border: '1px solid #555', 
                  background: '#3a3a3a', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#4a4a4a'}
                onMouseOut={(e) => e.target.style.background = '#3a3a3a'}
              >
                <span className="pi pi-copy" style={{ fontSize: '10px' }}></span>
              </button>
            </div>
          )}
          
          {password.url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#9aa0a6', fontSize: '12px', minWidth: '80px' }}>URL:</span>
              <span 
                style={{ 
                  flex: 1, 
                  color: '#64b5f6', 
                  fontSize: '12px', 
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                onClick={() => window.electron?.import?.openExternal?.(password.url)}
              >
                {password.url}
              </span>
            </div>
          )}
          
          {password.notes && (
            <div style={{ display: 'flex', gap: 8, marginTop: '4px' }}>
              <span style={{ color: '#9aa0a6', fontSize: '12px', minWidth: '80px' }}>Notas:</span>
              <span style={{ flex: 1, color: '#b0b0b0', fontSize: '12px' }}>{password.notes}</span>
            </div>
          )}
        </div>
      </div>
    );

    const PaginationButton = ({ onClick, disabled, children }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid #555',
          background: disabled ? '#2a2a2a' : '#3a3a3a',
          color: disabled ? '#666' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1
        }}
        onMouseOver={(e) => !disabled && (e.target.style.background = '#4a4a4a')}
        onMouseOut={(e) => !disabled && (e.target.style.background = '#3a3a3a')}
      >
        {children}
      </button>
    );

    return (
      <div style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span className="pi pi-folder-open" style={{ fontSize: '28px', color: '#64b5f6' }}></span>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>{folderLabel}</h2>
          <span style={{ 
            marginLeft: 'auto',
            padding: '4px 12px',
            borderRadius: 12,
            background: 'rgba(100, 181, 246, 0.2)',
            color: '#64b5f6',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {passwords.length} {passwords.length === 1 ? 'password' : 'passwords'}
          </span>
        </div>
        
        {passwords.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#9aa0a6',
            fontSize: '14px'
          }}>
            <span className="pi pi-inbox" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5 }}></span>
            No hay passwords en esta carpeta
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'auto', marginBottom: '16px' }}>
              {currentPasswords.map((password, index) => (
                <PasswordCard key={password.key || index} password={password} />
              ))}
            </div>
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                padding: '16px 0',
                borderTop: '1px solid #333',
                marginTop: 'auto'
              }}>
                <PaginationButton 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                >
                  <span className="pi pi-angle-double-left"></span>
                </PaginationButton>
                
                <PaginationButton 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                >
                  <span className="pi pi-angle-left"></span>
                </PaginationButton>
                
                <div style={{ 
                  padding: '8px 16px',
                  background: '#2a2a2a',
                  borderRadius: 6,
                  border: '1px solid #555',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  Página {currentPage} de {totalPages}
                  <span style={{ color: '#9aa0a6', marginLeft: '8px' }}>
                    ({startIndex + 1}-{Math.min(endIndex, passwords.length)} de {passwords.length})
                  </span>
                </div>
                
                <PaginationButton 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                >
                  <span className="pi pi-angle-right"></span>
                </PaginationButton>
                
                <PaginationButton 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                >
                  <span className="pi pi-angle-double-right"></span>
                </PaginationButton>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (tab.type === 'split') {
    return (
      <SplitLayout
        leftTerminal={tab.leftTerminal}
        rightTerminal={tab.rightTerminal}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey, showTerminalContextMenu)}
        sshStatsByTabId={sshStatsByTabId}
        terminalRefs={terminalRefs}
        orientation={tab.orientation || 'vertical'}
        statusBarIconTheme={statusBarIconTheme}
        splitterColor={terminalTheme.theme?.background || '#2d2d2d'}
        onCloseLeft={() => handleCloseSplitPanel(tab.key, 'left')}
        onCloseRight={() => handleCloseSplitPanel(tab.key, 'right')}
      />
    );
  }

  if (tab.type === 'rdp') {
    return (
      <RdpSessionTab
        rdpConfig={tab.rdpConfig}
        tabId={tab.key}
        connectionStatus={tab.connectionStatus}
        connectionInfo={tab.connectionInfo}
        onEditConnection={(rdpConfig, tabId) => {
          // Buscar la pestaña RDP para obtener el originalKey
          const rdpTab = rdpTabs.find(tab => tab.key === tabId);
          if (rdpTab && rdpTab.originalKey) {
            // Buscar el nodo original en la sidebar
            const originalNode = findNodeByKey(nodes, rdpTab.originalKey);
            if (originalNode) {
              openEditRdpDialog(originalNode);
            } else {
              // Fallback: crear nodo temporal si no se encuentra el original
              const tempNode = {
                key: rdpTab.originalKey,
                label: rdpConfig.name || `${rdpConfig.server}:${rdpConfig.port}`,
                data: {
                  type: 'rdp',
                  ...rdpConfig
                }
              };
              openEditRdpDialog(tempNode);
            }
          } else {
            // Fallback: crear nodo temporal si no hay originalKey
            const tempNode = {
              key: tabId,
              label: rdpConfig.name || `${rdpConfig.server}:${rdpConfig.port}`,
              data: {
                type: 'rdp',
                ...rdpConfig
              }
            };
            openEditRdpDialog(tempNode);
          }
        }}
      />
    );
  }

  if (tab.type === 'rdp-guacamole') {
    return (
      <GuacamoleTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        rdpConfig={tab.rdpConfig}
        isActive={isActiveTab}
      />
    );
  }

  if (tab.type === 'guacamole') {
    return (
      <GuacamoleTab
        config={tab.config}
        tabId={tab.tabId}
      />
    );
  }

  // Terminal local independiente
  if (tab.type === 'local-terminal') {
    const terminalType = tab.terminalType || 'powershell';
    
    // PowerShell o terminal genérico
    if (terminalType === 'powershell' || terminalType === 'linux-terminal') {
      // Obtener el tema correcto
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      
      return (
        <PowerShellTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
        />
      );
    }
    
    // WSL genérico
    if (terminalType === 'wsl') {
      // Obtener el tema correcto
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;
      
      return (
        <WSLTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={linuxTheme}
        />
      );
    }
    
    // Ubuntu o distribución WSL con información completa desde tab.distroInfo
    if (terminalType === 'ubuntu' || terminalType === 'wsl-distro') {
      // Obtener el tema correcto
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;
      
      return (
        <UbuntuTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          ubuntuInfo={tab.distroInfo}
          theme={linuxTheme}
        />
      );
    }

    // Cygwin Terminal
    if (terminalType === 'cygwin') {
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;

      return (
        <CygwinTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={linuxTheme}
        />
      );
    }
    
    // Fallback a PowerShell
    const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
    
    return (
      <PowerShellTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        fontFamily={localFontFamily}
        fontSize={localFontSize}
        theme={powerShellTheme}
      />
    );
  }

  // Terminal SSH (type: 'terminal' con sshConfig)
  if (tab.type === 'terminal' && tab.sshConfig) {
    return (
      <TerminalComponent
        key={tab.key}
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        sshConfig={tab.sshConfig}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey, showTerminalContextMenu)}
        active={isActiveTab}
        stats={terminalSshStatsByTabId[tab.key]}
        statusBarIconTheme={statusBarIconTheme}
      />
    );
  }

  // Si llegamos aquí y no es SSH, mostrar error
  console.error('❌ Tipo de pestaña no soportado:', { 
    tabKey: tab.key, 
    type: tab.type, 
    terminalType: tab.terminalType,
    fullTab: tab 
  });

  // Mensaje de error para tipos no soportados
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%', 
      color: '#fff',
      flexDirection: 'column',
      gap: '10px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '18px' }}>⚠️ Tipo de terminal no soportado</div>
      <div style={{ fontSize: '14px', opacity: 0.7 }}>
        type: <code>{tab.type || 'undefined'}</code>
      </div>
      <div style={{ fontSize: '14px', opacity: 0.7 }}>
        terminalType: <code>{tab.terminalType || 'undefined'}</code>
      </div>
      <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '20px' }}>
        Esta pestaña fue creada con una estructura antigua.<br/>
        Cierra esta pestaña y crea una nueva.
      </div>
    </div>
  );
});

export default TabContentRenderer;
