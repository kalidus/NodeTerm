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
import AuditTab from './AuditTab';
import RecordingPlayerTab from './RecordingPlayerTab';
import GlobalAuditTab from './GlobalAuditTab';
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
  sshStatsByTabId: terminalSshStatsByTabId,
  // Recording props
  onOpenRecordingPlayer,
  setSshTabs
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
        rdpConnectionsCount={(() => {
          // Contar RDP guardados en el árbol + RDP abiertos en pestañas (únicos por host:port+user)
          const unique = new Set();
          const add = (host, port, user) => {
            const h = host || '';
            const p = port || 3389;
            const u = user || '';
            unique.add(`${h}:${p}|${u}`);
          };
          const looksLikeRdp = (data) => {
            if (!data) return false;
            if (data.type === 'rdp' || data.type === 'rdp-guacamole') return true;
            // Fallback heurística: servidor+puerto/clientType guacamole y NO ssh
            const hasServer = (data.server || data.hostname || data.host);
            const maybeRdpPort = (data.port && Number(data.port) === 3389);
            const isGuac = (data.clientType === 'guacamole');
            const nameLooksRdp = typeof data.name === 'string' && /rdp|windows|server|desktop|win/i.test(data.name);
            return ((hasServer && (maybeRdpPort || isGuac)) || nameLooksRdp) && data.type !== 'ssh';
          };

          const countRdpNodes = (nodeList) => {
            if (!Array.isArray(nodeList)) return;
            nodeList.forEach(node => {
              if (node && looksLikeRdp(node.data)) {
                add(node.data.host || node.data.server || node.data.hostname, node.data.port, node.data.user || node.data.username);
              }
              if (node.children && node.children.length > 0) countRdpNodes(node.children);
            });
          };
          countRdpNodes(nodes);
          // Incluir pestañas RDP activas
          if (Array.isArray(rdpTabs)) {
            rdpTabs.forEach(tab => {
              const cfg = tab.rdpConfig || {};
              add(cfg.server || cfg.host || cfg.hostname, cfg.port, cfg.username || cfg.user);
            });
          }
          return unique.size;
        })()}
        localFontFamily={localFontFamily}
        localFontSize={localFontSize}
        localTerminalTheme={localLinuxTerminalTheme}
        localPowerShellTheme={localPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        onOpenFileExplorer={() => {
          // Emit global intent; Sidebar/useConnectionManagement will handle actual opening
          try {
            window.dispatchEvent(new CustomEvent('open-explorer-dialog'));
          } catch (e) { /* noop */ }
        }}
        onOpenSettings={() => {
          try {
            window.dispatchEvent(new CustomEvent('open-settings-dialog'));
          } catch (e) { /* noop */ }
        }}
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
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ui-content-border)' }}>
        <div style={{ width: 120, color: 'var(--ui-dialog-text)', fontWeight: '500', opacity: 0.7 }}>{label}</div>
        <div style={{ flex: 1, color: 'var(--ui-dialog-text)', fontFamily: 'monospace', fontSize: '14px' }}>{value || '-'}</div>
        {copy && value && (
          <button 
            onClick={() => copyToClipboard(value, label)} 
            style={{ 
              padding: '6px 12px', 
              borderRadius: 6, 
              border: '1px solid var(--ui-content-border)', 
              background: 'var(--ui-button-secondary)', 
              color: 'var(--ui-button-secondary-text)', 
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'var(--ui-button-hover)'}
            onMouseOut={(e) => e.target.style.background = 'var(--ui-button-secondary)'}
          >
            Copiar
          </button>
        )}
      </div>
    );

    return (
      <div style={{ 
        padding: '24px', 
        background: 'var(--ui-content-bg)',
        height: '100%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span className="pi pi-key" style={{ fontSize: '24px', color: 'var(--ui-button-primary)' }}></span>
          <h2 style={{ margin: 0, color: 'var(--ui-dialog-text)', fontSize: '24px' }}>{p.title}</h2>
        </div>
        
        <div style={{ 
          background: 'var(--ui-dialog-bg)', 
          borderRadius: 12, 
          padding: 20, 
          border: '1px solid var(--ui-content-border)',
          boxShadow: '0 4px 12px var(--ui-dialog-shadow)'
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
                background: 'var(--ui-button-primary)', 
                color: 'var(--ui-button-primary-text)', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.background = 'var(--ui-button-hover)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'var(--ui-button-primary)';
              }}
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

    // Estado para fila seleccionada
    const [selectedRowIndex, setSelectedRowIndex] = React.useState(null);

    // Función para truncar texto
    const truncateText = (text, maxLength = 40) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Función para obtener icono según la URL o tipo
    const getPasswordIcon = (password) => {
      const label = password.label.toLowerCase();
      const url = password.url ? password.url.toLowerCase() : '';
      
      // Detectar por etiquetas comunes
      if (label.includes('cisco') || label.includes('ucs') || url.includes('cisco.com')) return '⚙️';
      if (label.includes('dell') || label.includes('poweredge')) return '🖥️';
      if (label.includes('vmware') || label.includes('vcenter') || label.includes('vsphere')) return '☁️';
      if (label.includes('windows') || label.includes('server') || label.includes('host')) return '🖥️';
      if (label.includes('router') || label.includes('switch') || label.includes('network')) return '📶';
      if (label.includes('database') || label.includes('mysql') || label.includes('oracle')) return '🗄️';
      if (label.includes('linux') || label.includes('ubuntu') || label.includes('centos')) return '⚡';
      if (label.includes('admin') || label.includes('administrator')) return '🛡️';
      
      // Detectar por URL
      if (url) {
        if (url.includes('github.com')) return '🐙';
        if (url.includes('google.com') || url.includes('gmail.com')) return '🌐';
        if (url.includes('microsoft.com') || url.includes('office.com') || url.includes('outlook.com')) return '🪟';
        if (url.includes('facebook.com')) return '📘';
        if (url.includes('twitter.com') || url.includes('x.com')) return '🐦';
        if (url.includes('linkedin.com')) return '💼';
        if (url.includes('amazon.com') || url.includes('aws.com')) return '📦';
        if (url.includes('docker.com') || url.includes('hub.docker.com')) return '🐳';
        if (url.includes('kubernetes') || url.includes('k8s')) return '⚓';
        if (url.includes('jenkins') || url.includes('ci/cd')) return '🔧';
        
        // Detectar por IPs internas
        if (url.includes('10.') || url.includes('192.168.') || url.includes('172.')) {
          if (url.includes(':443') || url.includes('https://')) return '🔒';
          return '🖥️';
        }
        
        // Detectar por protocolos
        if (url.startsWith('ssh://') || url.includes(':22')) return '💻';
        if (url.startsWith('rdp://') || url.includes(':3389')) return '🖥️';
        if (url.startsWith('https://')) return '🔒';
        if (url.startsWith('http://')) return '🌐';
        if (url.startsWith('ftp://') || url.startsWith('sftp://')) return '⬆️';
        if (url.startsWith('cmd://') || url.includes('.exe')) return '💻';
      }
      
      // Detectar por nombre de usuario
      if (password.username) {
        const username = password.username.toLowerCase();
        if (username === 'root' || username === 'admin' || username.includes('administrator')) return '👑';
        if (username.includes('service') || username.includes('svc_')) return '⚙️';
        if (username.includes('user') || username.includes('usr_')) return '👤';
      }
      
      // Iconos por defecto más variados
      const defaultIcons = ['🔑', '🔐', '🛡️', '🌐', '🖥️', '⚙️', '🗄️', '📊', '🔧', '⚡'];
      const hash = password.label.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return defaultIcons[Math.abs(hash) % defaultIcons.length];
    };

    // Función para obtener color del icono según el tipo (ahora los emojis ya tienen sus colores)
    const getIconColor = (password) => {
      // Los emojis ya tienen sus propios colores, pero podemos ajustar la opacidad si está seleccionado
      return 'transparent'; // Los emojis mantienen sus colores naturales
    };

    const PasswordTableRow = ({ password, index }) => {
      const isSelected = selectedRowIndex === index;
      const rowStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid var(--ui-content-border)',
        background: isSelected ? 'var(--ui-sidebar-selected)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        minHeight: '40px'
      };

      return (
        <div 
          style={rowStyle}
          onMouseEnter={(e) => !isSelected && (e.target.style.background = 'var(--ui-sidebar-hover)')}
          onMouseLeave={(e) => !isSelected && (e.target.style.background = 'transparent')}
          onClick={() => setSelectedRowIndex(isSelected ? null : index)}
        >
          {/* Columna Icono */}
          <div style={{ width: '24px', marginRight: '12px', display: 'flex', justifyContent: 'center' }}>
            <span style={{ 
              fontSize: '16px',
              filter: isSelected ? 'brightness(1.2) saturate(1.3)' : 'none'
            }}>
              {getPasswordIcon(password)}
            </span>
          </div>

          {/* Columna Título */}
          <div style={{ 
            flex: '0 0 200px', 
            marginRight: '12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ 
              color: 'var(--ui-dialog-text)', 
              fontSize: '13px', 
              fontWeight: '500'
            }}>
              {truncateText(password.label, 25)}
            </span>
          </div>

          {/* Columna Usuario */}
          <div style={{ 
            flex: '0 0 150px', 
            marginRight: '12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ 
              color: 'var(--ui-dialog-text)', 
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {truncateText(password.username, 20)}
            </span>
          </div>

          {/* Columna URL */}
          <div style={{ 
            flex: '0 0 180px', 
            marginRight: '12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            {password.url ? (
              <span 
                style={{ 
                  color: 'var(--ui-button-primary)', 
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.electron?.import?.openExternal?.(password.url);
                }}
              >
                {truncateText(password.url, 25)}
              </span>
            ) : (
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '12px' }}>-</span>
            )}
          </div>

          {/* Columna Notas */}
          <div style={{ 
            flex: '0 0 150px', 
            marginRight: '12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ 
              color: 'var(--ui-dialog-text)',
            opacity: 0.7, 
              fontSize: '12px'
            }}>
              {truncateText(password.notes, 20)}
            </span>
          </div>

          {/* Columna Contraseña */}
          <div style={{ 
            flex: '0 0 120px', 
            marginRight: '12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            {password.password ? (
              <span style={{ 
                color: 'var(--ui-dialog-text)', 
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {'•'.repeat(Math.min(password.password.length, 12))}
              </span>
            ) : (
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '12px' }}>-</span>
            )}
          </div>

          {/* Columna Acciones */}
          <div style={{ 
            flex: '0 0 60px', 
            display: 'flex', 
            gap: '4px',
            justifyContent: 'flex-end'
          }}>
            {password.username && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(password.username, 'Usuario');
                }}
                style={{ 
                  padding: '2px 6px', 
                  borderRadius: 3, 
                  border: '1px solid var(--ui-content-border)', 
                  background: 'var(--ui-button-secondary)', 
                  color: 'var(--ui-button-secondary-text)', 
                  cursor: 'pointer',
                  fontSize: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'var(--ui-button-hover)'}
                onMouseOut={(e) => e.target.style.background = 'var(--ui-button-secondary)'}
                title="Copiar usuario"
              >
                <span className="pi pi-user" style={{ fontSize: '10px' }}></span>
              </button>
            )}
            
            {password.password && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(password.password, 'Contraseña');
                }}
                style={{ 
                  padding: '2px 6px', 
                  borderRadius: 3, 
                  border: '1px solid var(--ui-content-border)', 
                  background: 'var(--ui-button-secondary)', 
                  color: 'var(--ui-button-secondary-text)', 
                  cursor: 'pointer',
                  fontSize: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'var(--ui-button-hover)'}
                onMouseOut={(e) => e.target.style.background = 'var(--ui-button-secondary)'}
                title="Copiar contraseña"
              >
                <span className="pi pi-key" style={{ fontSize: '10px' }}></span>
              </button>
            )}
          </div>
        </div>
      );
    };

    const PaginationButton = ({ onClick, disabled, children }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid var(--ui-content-border)',
          background: disabled ? 'var(--ui-content-bg)' : 'var(--ui-button-secondary)',
          color: disabled ? 'var(--text-color-secondary)' : 'var(--ui-button-secondary-text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1
        }}
        onMouseOver={(e) => !disabled && (e.target.style.background = 'var(--ui-button-hover)')}
        onMouseOut={(e) => !disabled && (e.target.style.background = 'var(--ui-button-secondary)')}
      >
        {children}
      </button>
    );

    return (
      <div style={{ 
        padding: '24px', 
        background: 'var(--ui-content-bg)',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span className="pi pi-folder-open" style={{ fontSize: '28px', color: 'var(--ui-button-primary)' }}></span>
          <h2 style={{ margin: 0, color: 'var(--ui-dialog-text)', fontSize: '24px' }}>{folderLabel}</h2>
          <span style={{ 
            marginLeft: 'auto',
            padding: '4px 12px',
            borderRadius: 12,
            background: 'var(--ui-button-primary)',
            opacity: 0.2,
            color: 'var(--ui-button-primary)',
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
            color: 'var(--ui-dialog-text)',
            opacity: 0.7,
            fontSize: '14px'
          }}>
            <span className="pi pi-inbox" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5 }}></span>
            No hay passwords en esta carpeta
          </div>
        ) : (
          <>
            {/* Encabezados de tabla */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px 12px 8px 12px',
              background: 'var(--ui-sidebar-hover)',
              borderBottom: '2px solid var(--ui-content-border)',
              marginBottom: '8px',
              borderRadius: '6px 6px 0 0'
            }}>
              {/* Columna Icono */}
              <div style={{ width: '24px', marginRight: '12px' }}></div>
              
              {/* Columna Título */}
              <div style={{ 
                flex: '0 0 200px', 
                marginRight: '12px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Título
                <span className="pi pi-sort-up" style={{ marginLeft: '8px', fontSize: '12px' }}></span>
              </div>

              {/* Columna Usuario */}
              <div style={{ 
                flex: '0 0 150px', 
                marginRight: '12px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Usuario
              </div>

              {/* Columna URL */}
              <div style={{ 
                flex: '0 0 180px', 
                marginRight: '12px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                URL
              </div>

              {/* Columna Notas */}
              <div style={{ 
                flex: '0 0 150px', 
                marginRight: '12px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Notas
              </div>

              {/* Columna Contraseña */}
              <div style={{ 
                flex: '0 0 120px', 
                marginRight: '12px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Contraseña
              </div>

              {/* Columna Acciones */}
              <div style={{ 
                flex: '0 0 60px',
                color: 'var(--ui-dialog-text)',
                fontSize: '13px',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Acciones
              </div>
            </div>

            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              marginBottom: '16px',
              background: 'var(--ui-dialog-bg)',
              borderRadius: '0 0 6px 6px'
            }}>
              {currentPasswords.map((password, index) => (
                <PasswordTableRow 
                  key={password.key || index} 
                  password={password} 
                  index={index}
                />
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
        isActive={isActiveTab}
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

  // Tab de auditoría global de grabaciones
  if (tab.type === 'audit-global' && tab.recordings) {
    return (
      <GlobalAuditTab
        recordings={tab.recordings}
        onPlayRecording={(recording) => {
          // Crear nueva pestaña para reproducir la grabación
          if (setSshTabs) {
            setSshTabs(prevTabs => {
              const tabId = `player_${recording.id}_${Date.now()}`;
              const newTab = {
                key: tabId,
                label: `▶️ ${recording.title || recording.metadata?.title || 'Reproducción'}`,
                type: 'recording-player',
                recording: recording,
                createdAt: Date.now(),
                groupId: null
              };
              return [newTab, ...prevTabs];
            });
          }
        }}
      />
    );
  }

  // Tab de auditoría de grabaciones
  if (tab.type === 'audit' && tab.connectionInfo) {
    return (
      <AuditTab
        connectionInfo={tab.connectionInfo}
        onPlayRecording={(recording) => {
          // Crear nueva pestaña para reproducir la grabación
          if (setSshTabs) {
            setSshTabs(prevTabs => {
              const tabId = `player_${recording.id}_${Date.now()}`;
              const newTab = {
                key: tabId,
                label: `▶️ ${recording.title || recording.metadata?.title || 'Reproducción'}`,
                type: 'recording-player',
                recording: recording,
                createdAt: Date.now(),
                groupId: null
              };
              return [newTab, ...prevTabs];
            });
          }
        }}
      />
    );
  }

  // Tab de reproducción de grabaciones
  if (tab.type === 'recording-player' && tab.recording) {
    return (
      <RecordingPlayerTab
        recording={tab.recording}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
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
