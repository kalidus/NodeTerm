import React, { Suspense } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import {
  LazyHomeTab,
  LazyFileExplorer,
  LazySplitLayout,
  LazyRdpSessionTab,
  LazyGuacamoleTerminal,
  LazyIronRdpCanvasTab,
  LazyVncCanvasTab,
  LazyGuacamoleTab,
  LazyTerminalComponent,
  LazyPowerShellTerminal,
  LazyWSLTerminal,
  LazyUbuntuTerminal,
  LazyCygwinTerminal,
  LazyDockerTerminal,
  LazyClaudeTerminal,
  LazyOpenCodeTerminal,
  LazyCodexCliTerminal,
  LazyAntigravityCliTerminal,
  LazyHermesCliTerminal,
  LazyAuditTab,
  LazyRecordingPlayerTab,
  LazyGlobalAuditTab,
  LazyAnythingLLMTab,
  LazyOpenWebUITab,
  LazyLibreChatTab,
  LazyAgentZeroTab,
  LazyOpenClawTab,
  LazyOpenNotebookTab,
  LazySSHTunnelTab,
  LazyNetworkToolTab,
  LazyTiptapDocumentEditor,
  LazySettingsContent,
  LazyBrowserTab
} from './tabLoaders';
import { themes } from '../themes';
import { TAB_TYPES } from '../utils/constants';
import { recordRecentPassword, isFavorite, toggleFavorite } from '../utils/connectionStore';
import { getNetworkById, CRYPTO_NETWORK_OPTIONS } from '../utils/cryptoNetworks';

import { countConnections } from '../utils/connectionCounter';
import { writeText as clipboardWriteText } from '../utils/clipboard';
import EditConnectionTabContent from './EditConnectionTabContent';
import PasswordTabContent from './PasswordTabContent';


const TabContentRendererInner = React.memo(({
  tab,
  isActiveTab,
  // HomeTab props
  onCreateSSHConnection,
  openFolderDialog,
  onOpenRdpConnection,
  onOpenSSHTunnel,
  onOpenVncConnection,
  onOpenFileConnection,
  handleLoadGroupFromFavorites,
  openEditRdpDialog,
  openEditSSHDialog,
  nodes,
  localFontFamily,
  localFontSize,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localDockerTerminalTheme,
  dockerFontFamily,
  dockerFontSize,
  // FileExplorer props
  iconTheme,
  explorerFont,
  explorerColorTheme,
  setExplorerColorTheme,
  explorerFontSize,
  // SplitLayout props
  fontFamily,
  fontSize,
  terminalTheme,
  handleTerminalContextMenu,
  showTerminalContextMenu,
  terminalRefs,
  statusBarIconTheme,
  handleCloseSplitPanel,
  // RDP props
  rdpTabs,
  findNodeByKey,
  // Recording props
  onOpenRecordingPlayer,
  setSshTabs,
  // Tab activation props
  setActiveTabIndex,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setGroupActiveIndices,
  setOpenTabOrder,
  activeGroupId,
  activeTabIndex,
  // Tab group props
  activeIds,
  openInSplit,
  handleToggleBroadcast,
  handleBroadcastData,
  onShowSystemMonitor,
  onShowFileExplorer,
  handleToggleBroadcastTarget,
  getAllTabs,
  masterKey,
  secureStorage,
  // Para Quick Actions
  onStartRecording,
  onStopRecording,
  isRecordingTab,
  onToggleBroadcast,
  isMinimalMode,
  settingsTabProps,
  // Edit connection tab handlers
  handleSaveSshToSidebar,
  handleSaveRdpToSidebar,
  handleSaveVncToSidebar,
  handleSaveFileConnectionToSidebar,
  handleSaveSSHTunnelToSidebar,
  handleTabClose
}) => {
  // 🚀 OPTIMIZACIÓN: Calcular conteos una sola vez cuando cambian los nodos o pestañas RDP
  const counts = React.useMemo(() => {
    if (tab.type !== 'home') return null;
    return countConnections(nodes, rdpTabs);
  }, [tab.type, nodes, rdpTabs]);

  if (tab.type === 'home') {
    return (
      <LazyHomeTab
        isActiveTab={isActiveTab}
        activeIds={activeIds}
        isMinimalMode={isMinimalMode}
        onCreateSSHConnection={onCreateSSHConnection}
        onOpenSSHTunnel={onOpenSSHTunnel}
        onCreateFolder={() => openFolderDialog(null)}
        onCreateRdpConnection={onOpenRdpConnection}
        onCreateVncConnection={onOpenVncConnection}
        onLoadGroup={handleLoadGroupFromFavorites}
        sidebarNodes={nodes}
        onOpenFileExplorer={() => {
          // Si HomeTab necesita abrir el explorador de archivos, asumimos
          // que NodeTermStatus sabe el key o abrimos el del grupo activo.
          // O lo que haga onShowFileExplorer genérico.
          // El user reportó que el explorador se abre con NodeTermStatus.
          if (onShowFileExplorer) onShowFileExplorer(null);
        }}
        onEditConnection={(connection) => {
          if (!connection) return;
          const connType = (connection.type || '').toLowerCase();
          if (connType === 'rdp-guacamole' || connType === 'rdp' || connType === 'web-rdp' || connType === 'vnc-guacamole' || connType === 'vnc' || connType === 'web-vnc') {
            const tempNode = {
              key: `temp_${connType}_${Date.now()}`,
              label: connection.name || `${connection.host}:${connection.port || (connType.includes('vnc') ? 5900 : 3389)}`,
              data: {
                type: connType.includes('vnc') ? 'vnc' : 'rdp',
                server: connection.host,
                hostname: connection.host,
                username: connection.username,
                password: connection.password,
                port: connection.port || (connType.includes('vnc') ? 5900 : 3389),
                clientType: connection.clientType || (connType.includes('vnc') ? 'web-vnc' : 'web-rdp')
              }
            };
            if (openEditRdpDialog) openEditRdpDialog(tempNode);
            return;
          }
          if (connType === 'ssh' || connType === 'explorer') {
            const tempNode = {
              key: `temp_ssh_${Date.now()}`,
              label: connection.name || `${connection.username}@${connection.host}`,
              data: {
                type: 'ssh',
                host: connection.host || connection.hostname || '',
                user: connection.username || connection.user || '',
                username: connection.username || connection.user || '',
                password: connection.password || '',
                port: connection.port || 22,
                remoteFolder: connection.remoteFolder || '',
                useBastionWallix: connection.useBastionWallix || false,
                bastionHost: connection.bastionHost || '',
                bastionUser: connection.bastionUser || '',
                targetServer: connection.targetServer || '',
                description: connection.description || '',
                customIcon: connection.customIcon || null
              }
            };
            if (openEditSSHDialog) openEditSSHDialog(tempNode);
            return;
          }
          // Fallback para sftp, ftp, scp, ssh-tunnel u otros
          const tempNode = {
            key: `temp_${connType || 'custom'}_${Date.now()}`,
            label: connection.name || `${connection.username || ''}@${connection.host || ''}`,
            data: {
              ...connection,
              type: connType
            }
          };
          if (openEditSSHDialog) openEditSSHDialog(tempNode);
        }}
        sshConnectionsCount={counts?.ssh || 0}
        foldersCount={counts?.folders || 0}
        rdpConnectionsCount={counts?.rdp || 0}
        localFontFamily={localFontFamily}
        localFontSize={localFontSize}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
        localPowerShellTheme={localPowerShellTheme}
        setLocalPowerShellTheme={setLocalPowerShellTheme}
        onOpenSettings={() => {
          try {
            window.dispatchEvent(new CustomEvent('open-settings-dialog'));
          } catch (e) { /* noop */ }
        }}
        masterKey={masterKey}
        secureStorage={secureStorage}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        terminalRefs={terminalRefs}
      />
    );
  }

  if (tab.type === 'explorer' || tab.isExplorerInSSH) {
    return (
      <LazyFileExplorer
        tabId={tab.key}
        tab={tab}
        sshConfig={tab.sshConfig}
        isStandaloneTab={true}
        iconTheme={iconTheme}
        explorerFont={explorerFont}
        explorerColorTheme={explorerColorTheme}
        setExplorerColorTheme={setExplorerColorTheme}
        explorerFontSize={explorerFontSize}
      />
    );
  }

  // Document editor tab
  if (tab.type === TAB_TYPES.DOCUMENT && tab.documentData) {
    return (
      <LazyTiptapDocumentEditor
        key={tab.documentData.key}
        documentKey={tab.documentData.key}
        documentData={tab.documentData}
      />
    );
  }

  // Browser tab
  if (tab.type === TAB_TYPES.BROWSER && tab.browserData) {
    return (
      <LazyBrowserTab
        tabId={tab.key}
        browserData={tab.browserData}
      />
    );
  }

  // Secret info tab (password, crypto_wallet, api_key, secure_note)
  if (tab.type === TAB_TYPES.PASSWORD && tab.passwordData) {
    return (
      <PasswordTabContent
        tab={tab}
        masterKey={masterKey}
        secureStorage={secureStorage}
        setSshTabs={setSshTabs}
      />
    );
  }

  // Password folder tab - muestra todos los passwords de una carpeta con paginación y selección de layout
  if (tab.type === TAB_TYPES.PASSWORD_FOLDER && tab.folderData) {
    const { folderLabel, passwords } = tab.folderData;

    // Estado de Layout (grid o list), recordado en localStorage
    const [layoutMode, setLayoutMode] = React.useState(() => {
      try {
        return localStorage.getItem('nodeterm_password_layout_mode') || 'list';
      } catch (e) {
        return 'list';
      }
    });

    const handleSetLayoutMode = (mode) => {
      setLayoutMode(mode);
      try {
        localStorage.setItem('nodeterm_password_layout_mode', mode);
      } catch (e) { /* noop */ }
      setCurrentPage(1); // Resetear página
    };

    // Estado de Layout global (para adaptar bordes, sombras, etc. al estilo activo de NodeTerm)
    const [uiLayout, setUiLayout] = React.useState(() => {
      try {
        return localStorage.getItem('ui_layout') || 'unified';
      } catch (e) {
        return 'unified';
      }
    });

    React.useEffect(() => {
      const handleLayoutChange = () => {
        try {
          setUiLayout(localStorage.getItem('ui_layout') || 'unified');
        } catch (e) { /* noop */ }
      };
      window.addEventListener('layout-changed', handleLayoutChange);
      window.addEventListener('settings-updated', handleLayoutChange);
      return () => {
        window.removeEventListener('layout-changed', handleLayoutChange);
        window.removeEventListener('settings-updated', handleLayoutChange);
      };
    }, []);

    // Estado para paginación, búsqueda y ordenación
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortField, setSortField] = React.useState('label'); // 'label', 'username', 'url', etc.
    const [sortDirection, setSortDirection] = React.useState('asc'); // 'asc' or 'desc'
    const ITEMS_PER_PAGE = layoutMode === 'grid' ? 24 : 20;

    const handleSort = (field) => {
      if (sortField === field) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setCurrentPage(1);
    };

    // Resetear página, búsqueda y ordenación cuando cambie la carpeta
    React.useEffect(() => {
      setCurrentPage(1);
      setSearchTerm('');
      setSortField('label');
      setSortDirection('asc');
    }, [tab.folderData?.folderKey]);

    // Filtrar contraseñas
    const filteredPasswords = React.useMemo(() => {
      if (!searchTerm) return passwords;
      const term = searchTerm.toLowerCase();
      return passwords.filter(p => 
        (p.label && p.label.toLowerCase().includes(term)) ||
        (p.username && p.username.toLowerCase().includes(term)) ||
        (p.url && p.url.toLowerCase().includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    }, [passwords, searchTerm]);

    // Ordenar contraseñas
    const sortedPasswords = React.useMemo(() => {
      const sorted = [...filteredPasswords];
      if (!sortField) return sorted;

      sorted.sort((a, b) => {
        let valA = (a[sortField] || '').toString().toLowerCase();
        let valB = (b[sortField] || '').toString().toLowerCase();
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      return sorted;
    }, [filteredPasswords, sortField, sortDirection]);

    // Calcular paginación
    const totalPages = Math.ceil(sortedPasswords.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPasswords = sortedPasswords.slice(startIndex, endIndex);

    const copyToClipboard = async (text, fieldName, passwordData = null) => {
      try {
        await clipboardWriteText(text);

        // Registrar como reciente cuando se copia (para cualquier tipo de secreto)
        if ((fieldName === 'Contraseña' || fieldName === 'Seed Phrase' || fieldName === 'Private Key' || fieldName === 'API Key') && passwordData) {
          try {
            recordRecentPassword({
              id: passwordData.id,
              name: passwordData.name || passwordData.label,
              username: passwordData.username,
              password: passwordData.password,
              url: passwordData.url,
              group: passwordData.group,
              notes: passwordData.notes,
              type: passwordData.type || 'password',
              icon: passwordData.icon || 'pi-key'
            }, 5);
          } catch (e) {
            console.warn('Error registrando secreto reciente:', e);
          }
        }

        // Show success toast if available
        if (window.toast?.current?.show) {
          window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: `${fieldName} copiado al portapapeles`, life: 1500 });
        }
      } catch (err) {
        console.error('Failed to copy:', err);
      }
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

    // --- SUB-COMPONENTE: CARD LAYOUT (Opcion 1) ---
    const PasswordCard = ({ password }) => {
      const [showPassword, setShowPassword] = React.useState(false);
      const [copiedUser, setCopiedUser] = React.useState(false);
      const [copiedPass, setCopiedPass] = React.useState(false);
      const [isHovered, setIsHovered] = React.useState(false);

      const handleCopyUser = async (e) => {
        e.stopPropagation();
        await copyToClipboard(password.username, 'Usuario');
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 1500);
      };

      const handleCopyPass = async (e) => {
        e.stopPropagation();
        await copyToClipboard(password.password, 'Contraseña', password);
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 1500);
      };

      const actionButtonStyle = {
        padding: '6px',
        borderRadius: '6px',
        border: '1px solid var(--ui-content-border)',
        background: 'var(--ui-button-secondary)',
        color: 'var(--ui-button-secondary-text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        minWidth: '28px',
        minHeight: '28px'
      };

      // Adaptar estilos según el layout global de la UI
      const isCyberpunk = uiLayout === 'cyberpunk';
      const isUnified = uiLayout === 'unified' || uiLayout === 'unified-app-rounded';
      const isUnifiedRounded = uiLayout === 'unified-rounded';
      
      let borderRadius = '12px';
      if (isCyberpunk || isUnified) {
        borderRadius = '0px';
      } else if (isUnifiedRounded) {
        borderRadius = '8px';
      }
      
      let borderStyle = isHovered ? '1px solid var(--ui-button-primary)' : '1px solid var(--ui-content-border)';
      if (isCyberpunk) {
        borderStyle = isHovered ? '1px solid #00f0ff' : '1px solid rgba(255, 0, 85, 0.4)';
      } else if (isUnified || isUnifiedRounded) {
        borderStyle = isHovered ? '1px solid var(--ui-button-primary)' : '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))';
      }
      
      let shadowStyle = isHovered ? '0 8px 24px rgba(0, 0, 0, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.05)';
      if (isCyberpunk) {
        shadowStyle = isHovered ? '0 0 15px rgba(0, 240, 255, 0.35)' : 'none';
      } else if (isUnified || isUnifiedRounded) {
        shadowStyle = 'none';
      }

      return (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            background: 'var(--ui-dialog-bg)',
            border: borderStyle,
            borderRadius: borderRadius,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered && !isUnified && !isUnifiedRounded ? 'translateY(-2px)' : 'none',
            boxShadow: shadowStyle,
            minHeight: '170px',
            justifyContent: 'space-between',
            fontFamily: isCyberpunk ? 'monospace' : 'inherit'
          }}
        >
          {/* Top Row: Icon and Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: isCyberpunk || isUnified ? '0px' : (isUnifiedRounded ? '6px' : '8px'),
              background: 'var(--ui-sidebar-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              {getPasswordIcon(password)}
            </div>
            
            {/* Quick Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              opacity: isHovered ? 1 : 0.8,
              transition: 'opacity 0.2s' 
            }}>
              {password.url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.electron?.import?.openExternal?.(password.url);
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--ui-button-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--ui-button-secondary)'}
                  title="Abrir enlace externo"
                  style={{
                    ...actionButtonStyle,
                    borderRadius: isCyberpunk || isUnified ? '0px' : '6px'
                  }}
                >
                  <span className="pi pi-external-link" style={{ fontSize: '11px' }}></span>
                </button>
              )}
              
              {password.username && (
                <button
                  onClick={handleCopyUser}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--ui-button-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--ui-button-secondary)'}
                  title="Copiar usuario"
                  style={{
                    ...actionButtonStyle,
                    borderRadius: isCyberpunk || isUnified ? '0px' : '6px'
                  }}
                >
                  <span className={copiedUser ? "pi pi-check" : "pi pi-user"} style={{ fontSize: '11px', color: copiedUser ? '#4caf50' : 'inherit' }}></span>
                </button>
              )}

              {password.password && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--ui-button-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--ui-button-secondary)'}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{
                      ...actionButtonStyle,
                      borderRadius: isCyberpunk || isUnified ? '0px' : '6px'
                    }}
                  >
                    <span className={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} style={{ fontSize: '11px' }}></span>
                  </button>
                  <button
                    onClick={handleCopyPass}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--ui-button-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--ui-button-secondary)'}
                    title="Copiar contraseña"
                    style={{
                      ...actionButtonStyle,
                      borderRadius: isCyberpunk || isUnified ? '0px' : '6px'
                    }}
                  >
                    <span className={copiedPass ? "pi pi-check" : "pi pi-key"} style={{ fontSize: '11px', color: copiedPass ? '#4caf50' : 'inherit' }}></span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Title and Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              color: 'var(--ui-dialog-text)',
              fontSize: '14px',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }} title={password.label}>
              {password.label}
            </span>
            <span style={{
              color: 'var(--ui-dialog-text)',
              opacity: 0.6,
              fontSize: '11px',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {password.username || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>sin usuario</span>}
            </span>
          </div>

          {/* Password Value (Hidden/Shown) */}
          <div style={{ 
            background: 'var(--ui-sidebar-hover)', 
            padding: '6px 10px', 
            borderRadius: isCyberpunk || isUnified ? '0px' : (isUnifiedRounded ? '6px' : '6px'), 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontFamily: 'monospace',
            fontSize: '11px',
            border: isCyberpunk ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid var(--ui-content-border)',
            minHeight: '28px'
          }}>
            <span style={{ 
              color: 'var(--ui-dialog-text)',
              letterSpacing: showPassword ? 'normal' : '3px',
              fontSize: showPassword ? '11px' : '13px'
            }}>
              {password.password 
                ? (showPassword ? password.password : '••••••••••••') 
                : <span style={{ fontStyle: 'italic', opacity: 0.4 }}>sin contraseña</span>
              }
            </span>
          </div>

          {/* Notes or URL */}
          {(password.notes || password.url) && (
            <div style={{ 
              fontSize: '10px', 
              color: 'var(--ui-dialog-text)', 
              opacity: 0.5,
              borderTop: isCyberpunk ? '1px dashed #ff0055' : '1px solid var(--ui-content-border)',
              paddingTop: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              overflow: 'hidden'
            }}>
              {password.url && (
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={password.url}>
                  🔗 {password.url}
                </span>
              )}
              {password.notes && (
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={password.notes}>
                  📝 {password.notes}
                </span>
              )}
            </div>
          )}
        </div>
      );
    };

    // --- SUB-COMPONENTE: TABLE LIST ROW LAYOUT (Opcion 2) ---
    const PasswordListRow = ({ password, index }) => {
      const [showPassword, setShowPassword] = React.useState(false);
      const [copiedUser, setCopiedUser] = React.useState(false);
      const [copiedPass, setCopiedPass] = React.useState(false);
      const [isHovered, setIsHovered] = React.useState(false);

      const handleCopyUser = async (e) => {
        e.stopPropagation();
        await copyToClipboard(password.username, 'Usuario');
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 1500);
      };

      const handleCopyPass = async (e) => {
        e.stopPropagation();
        await copyToClipboard(password.password, 'Contraseña', password);
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 1500);
      };

      const isCyberpunk = uiLayout === 'cyberpunk';
      const isUnified = uiLayout === 'unified' || uiLayout === 'unified-app-rounded';
      const isUnifiedRounded = uiLayout === 'unified-rounded';

      const actionButtonStyle = {
        width: '28px',
        height: '28px',
        borderRadius: isCyberpunk || isUnified ? '0px' : '50%',
        border: 'none',
        background: 'transparent',
        color: 'var(--ui-dialog-text)',
        opacity: 0.65,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease-in-out',
        fontSize: '11px'
      };

      let borderBottomStyle = isCyberpunk 
        ? '1px solid rgba(255, 0, 85, 0.2)' 
        : (isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--ui-content-border)');

      return (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: borderBottomStyle,
            background: isHovered 
              ? 'var(--ui-sidebar-hover)' 
              : (index % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
            transition: 'background-color 0.2s',
            minHeight: '48px',
            fontFamily: isCyberpunk ? 'monospace' : 'inherit'
          }}
        >
          {/* Columna Icono */}
          <div style={{ width: '32px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>
              {getPasswordIcon(password)}
            </span>
          </div>

          {/* Columna Título */}
          <div style={{ flex: '2', marginRight: '16px', minWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--ui-dialog-text)', fontSize: '13px', fontWeight: '500' }}>
              {password.label}
            </span>
          </div>

          {/* Columna Usuario */}
          <div style={{ flex: '1.5', marginRight: '16px', minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--ui-dialog-text)', opacity: 0.8, fontSize: '12px', fontFamily: 'monospace' }}>
              {password.username || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>-</span>}
            </span>
          </div>

          {/* Columna URL */}
          <div style={{ flex: '2', marginRight: '16px', minWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                {password.url}
              </span>
            ) : (
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '12px', opacity: 0.5 }}>-</span>
            )}
          </div>

          {/* Columna Notas */}
          <div style={{ flex: '2', marginRight: '16px', minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--ui-dialog-text)', opacity: 0.6, fontSize: '12px' }}>
              {password.notes || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>-</span>}
            </span>
          </div>

          {/* Columna Contraseña */}
          <div style={{ flex: '1.5', marginRight: '16px', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--ui-dialog-text)', fontSize: '12px', fontFamily: 'monospace', letterSpacing: showPassword ? 'normal' : '2px' }}>
              {password.password 
                ? (showPassword ? password.password : '••••••••') 
                : <span style={{ fontStyle: 'italic', opacity: 0.4 }}>-</span>
              }
            </span>
          </div>

          {/* Columna Acciones */}
          <div style={{ width: '120px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {password.username && (
              <button
                onClick={handleCopyUser}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = 'var(--ui-button-primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.opacity = '0.65';
                  e.currentTarget.style.color = 'var(--ui-dialog-text)';
                }}
                title="Copiar usuario"
                style={actionButtonStyle}
              >
                <span className={copiedUser ? "pi pi-check" : "pi pi-user"} style={{ color: copiedUser ? '#4caf50' : 'inherit' }}></span>
              </button>
            )}

            {password.password && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.65';
                  }}
                  title={showPassword ? "Ocultar" : "Mostrar"}
                  style={actionButtonStyle}
                >
                  <span className={showPassword ? "pi pi-eye-slash" : "pi pi-eye"}></span>
                </button>
                <button
                  onClick={handleCopyPass}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = 'var(--ui-button-primary)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.65';
                    e.currentTarget.style.color = 'var(--ui-dialog-text)';
                  }}
                  title="Copiar contraseña"
                  style={actionButtonStyle}
                >
                  <span className={copiedPass ? "pi pi-check" : "pi pi-key"} style={{ color: copiedPass ? '#4caf50' : 'inherit' }}></span>
                </button>
              </>
            )}
          </div>
        </div>
      );
    };

    const TableHeader = ({ field, label, flex = '1' }) => {
      const isSorted = sortField === field;
      const isCyberpunk = uiLayout === 'cyberpunk';

      return (
        <div
          onClick={() => handleSort(field)}
          style={{
            flex,
            marginRight: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            color: isSorted ? 'var(--ui-button-primary)' : 'var(--ui-dialog-text)',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'color 0.2s',
            fontFamily: isCyberpunk ? 'monospace' : 'inherit'
          }}
          onMouseOver={(e) => !isSorted && (e.currentTarget.style.color = 'var(--ui-button-primary)')}
          onMouseOut={(e) => !isSorted && (e.currentTarget.style.color = 'var(--ui-dialog-text)')}
        >
          <span>{label}</span>
          <i className={isSorted 
            ? (sortDirection === 'asc' ? "pi pi-sort-amount-up" : "pi pi-sort-amount-down") 
            : "pi pi-sort-alt"
          } style={{ fontSize: '10px', opacity: isSorted ? 1 : 0.4 }}></i>
        </div>
      );
    };

    const PaginationButton = ({ onClick, disabled, children }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          borderRadius: uiLayout === 'cyberpunk' || uiLayout === 'unified' || uiLayout === 'unified-app-rounded' ? 0 : (uiLayout === 'unified-rounded' ? 6 : 6),
          border: uiLayout === 'unified' || uiLayout === 'unified-rounded' || uiLayout === 'unified-app-rounded' ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--ui-content-border)',
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

    const isCyberpunk = uiLayout === 'cyberpunk';
    const isUnified = uiLayout === 'unified' || uiLayout === 'unified-app-rounded';
    const isUnifiedRounded = uiLayout === 'unified-rounded';

    return (
      <div style={{
        padding: '24px',
        background: 'var(--ui-content-bg)',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header Title Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="pi pi-folder-open" style={{ fontSize: '28px', color: 'var(--ui-button-primary)' }}></span>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--ui-dialog-text)', 
            fontSize: '24px',
            fontFamily: isCyberpunk ? 'monospace' : 'inherit'
          }}>{folderLabel}</h2>
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? 8 : 12),
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--ui-button-primary)',
              fontSize: '12px',
              fontWeight: '600',
              fontFamily: isCyberpunk ? 'monospace' : 'inherit',
              border: isCyberpunk ? '1px solid #00f0ff' : 'none'
            }}>
              {passwords.length} {passwords.length === 1 ? 'password' : 'passwords'}
            </span>

            {/* Layout switch button group */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--ui-dialog-bg, rgba(0,0,0,0.2))', 
              borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '6px' : '8px'), 
              padding: '2px', 
              border: isCyberpunk ? '1px solid #ff0055' : (isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--ui-content-border, #555)'),
              alignItems: 'center',
              gap: '2px'
            }}>
              <button
                onClick={() => handleSetLayoutMode('grid')}
                title="Vista Cuadrícula (Tarjetas)"
                style={{
                  padding: '6px 12px',
                  borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '4px' : '6px'),
                  border: 'none',
                  background: layoutMode === 'grid' ? 'var(--ui-button-primary)' : 'transparent',
                  color: layoutMode === 'grid' ? '#fff' : 'var(--ui-dialog-text)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: layoutMode === 'grid' ? 1 : 0.6
                }}
              >
                <i className="pi pi-th-large" style={{ fontSize: '11px' }}></i>
                <span>Tarjetas</span>
              </button>
              <button
                onClick={() => handleSetLayoutMode('list')}
                title="Vista Lista (Tabla)"
                style={{
                  padding: '6px 12px',
                  borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '4px' : '6px'),
                  border: 'none',
                  background: layoutMode === 'list' ? 'var(--ui-button-primary)' : 'transparent',
                  color: layoutMode === 'list' ? '#fff' : 'var(--ui-dialog-text)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: layoutMode === 'list' ? 1 : 0.6
                }}
              >
                <i className="pi pi-list" style={{ fontSize: '11px' }}></i>
                <span>Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <span className="pi pi-search" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ui-dialog-text)',
            opacity: 0.5,
            fontSize: '13px'
          }}></span>
          <input
            type="text"
            placeholder="Buscar contraseñas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '6px' : '8px'),
              border: isCyberpunk 
                ? '1px solid #ff0055' 
                : (isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--ui-content-border)'),
              background: 'var(--ui-dialog-bg)',
              color: 'var(--ui-dialog-text)',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: isCyberpunk ? 'monospace' : 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = isCyberpunk ? '#00f0ff' : 'var(--ui-button-primary)'}
            onBlur={(e) => e.target.style.borderColor = isCyberpunk ? '#ff0055' : (isUnified || isUnifiedRounded ? 'rgba(255,255,255,0.06)' : 'var(--ui-content-border)')}
          />
          {searchTerm && (
            <span 
              className="pi pi-times" 
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ui-dialog-text)',
                opacity: 0.5,
                cursor: 'pointer',
                fontSize: '11px'
              }}
            ></span>
          )}
        </div>

        {sortedPasswords.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--ui-dialog-text)',
            opacity: 0.7,
            fontSize: '14px',
            fontFamily: isCyberpunk ? 'monospace' : 'inherit'
          }}>
            <span className="pi pi-inbox" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5 }}></span>
            No se encontraron passwords
          </div>
        ) : (
          <>
            {layoutMode === 'grid' ? (
              /* GRID CARDS VIEW */
              <div style={{
                flex: 1,
                overflow: 'auto',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px',
                  padding: '4px'
                }}>
                  {currentPasswords.map((password, index) => (
                    <PasswordCard
                      key={password.key || index}
                      password={password}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* PREMIUM TABLE LIST VIEW */
              <div style={{
                flex: 1,
                overflow: 'auto',
                marginBottom: '16px',
                background: 'var(--ui-dialog-bg)',
                borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '8px' : '8px'),
                border: isCyberpunk 
                  ? '1px solid #ff0055' 
                  : (isUnified || isUnifiedRounded ? 'none' : '1px solid var(--ui-content-border)'),
                boxShadow: isCyberpunk 
                  ? '0 0 10px rgba(255, 0, 85, 0.15)' 
                  : (isUnified || isUnifiedRounded ? 'none' : 'none'),
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* headers */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--ui-sidebar-hover)',
                  borderBottom: isCyberpunk 
                    ? '2px solid #ff0055' 
                    : (isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.06)' : '2px solid var(--ui-content-border)'),
                  borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? '8px 8px 0 0' : '8px 8px 0 0'),
                  opacity: 0.9
                }}>
                  <div style={{ width: '32px' }}></div>
                  <TableHeader field="label" label="Título" flex="2" />
                  <TableHeader field="username" label="Usuario" flex="1.5" />
                  <TableHeader field="url" label="URL" flex="2" />
                  <TableHeader field="notes" label="Notas" flex="2" />
                  <TableHeader field="password" label="Contraseña" flex="1.5" />
                  <div style={{ 
                    width: '120px', 
                    textAlign: 'right', 
                    fontWeight: '600', 
                    fontSize: '12px', 
                    color: 'var(--ui-dialog-text)', 
                    userSelect: 'none',
                    fontFamily: isCyberpunk ? 'monospace' : 'inherit'
                  }}>Acciones</div>
                </div>
                {/* rows */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {currentPasswords.map((password, index) => (
                    <PasswordListRow
                      key={password.key || index}
                      password={password}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '16px 0',
                borderTop: isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--ui-content-border)',
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
                  background: 'var(--ui-dialog-bg)',
                  borderRadius: isCyberpunk || isUnified ? 0 : (isUnifiedRounded ? 6 : 6),
                  border: isUnified || isUnifiedRounded ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--ui-content-border)',
                  color: 'var(--ui-dialog-text)',
                  fontSize: '13px',
                  fontWeight: '500',
                  fontFamily: isCyberpunk ? 'monospace' : 'inherit'
                }}>
                  Página {currentPage} de {totalPages}
                  <span style={{ color: 'var(--text-color-secondary)', marginLeft: '8px', opacity: 0.7 }}>
                    ({startIndex + 1}-{Math.min(endIndex, sortedPasswords.length)} de {sortedPasswords.length})
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
      <LazySplitLayout
        // Nuevo sistema: árbol de splits anidados
        first={tab.first}
        second={tab.second}
        orientation={tab.orientation || 'vertical'}
        // Legacy: compatibilidad con sistemas anteriores
        terminals={tab.terminals}
        leftTerminal={tab.leftTerminal}
        rightTerminal={tab.rightTerminal}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey, showTerminalContextMenu)}
        terminalRefs={terminalRefs}
        statusBarIconTheme={statusBarIconTheme}
        splitterColor={terminalTheme.theme?.background || '#2d2d2d'}
        // Nuevo sistema: callback con path en el árbol
        onClosePanel={(path) => handleCloseSplitPanel(tab.key, path)}
        // Legacy: callbacks antiguos
        onCloseLeft={() => handleCloseSplitPanel(tab.key, 'left')}
        onCloseRight={() => handleCloseSplitPanel(tab.key, 'right')}
        path={[]}
        openInSplit={openInSplit}
        isBroadcastActive={tab.isBroadcastActive || false}
        onBroadcastData={handleBroadcastData}
        onToggleBroadcast={() => onToggleBroadcast && onToggleBroadcast(tab.key)}
        onToggleBroadcastTarget={(targetId) => handleToggleBroadcastTarget && handleToggleBroadcastTarget(tab.key, targetId)}
        broadcastExcludedTargets={tab.broadcastExcludedTargets || []}
      />
    );
  }

  if (tab.type === 'rdp') {
    return (
      <LazyRdpSessionTab
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

  if (tab.type === 'iron-rdp' || tab.type === 'rdp-iron' || tab.type === 'rdp-guacamole' || tab.type === 'vnc-guacamole' || tab.type === 'vnc') {
    const isVnc = tab.type === 'vnc-guacamole' || tab.type === 'vnc';
    const clientType = tab.rdpConfig?.clientType || tab.vncConfig?.clientType;
    const isWebRdp = clientType === 'web-rdp' || tab.type === 'iron-rdp' || tab.type === 'rdp-iron';
    const isWebVnc = isVnc && (clientType === 'web-vnc' || !clientType || clientType !== 'guacamole');

    if (isWebVnc) {
      return (
        <LazyVncCanvasTab
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          vncConfig={tab.vncConfig || tab.rdpConfig}
          isActive={isActiveTab}
          onClose={() => handleTabClose && handleTabClose(tab)}
        />
      );
    }

    if (isWebRdp && !isVnc) {
      return (
        <LazyIronRdpCanvasTab
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          rdpConfig={tab.rdpConfig}
          isActive={isActiveTab}
          onClose={() => handleTabClose && handleTabClose(tab)}
        />
      );
    }
    return (
      <LazyGuacamoleTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        rdpConfig={tab.rdpConfig || tab.vncConfig}
        isActive={isActiveTab}
      />
    );
  }

  if (tab.type === 'guacamole') {
    return (
      <LazyGuacamoleTab
        config={tab.config}
        tabId={tab.tabId}
      />
    );
  }

  // Terminal local independiente
  // Docker Terminal
  if (tab.type === 'docker') {
    const dockerTheme = themes[localDockerTerminalTheme]?.theme || themes['Default Dark']?.theme;

    return (
      <LazyDockerTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        fontFamily={dockerFontFamily}
        fontSize={dockerFontSize}
        theme={dockerTheme}
        dockerInfo={tab.distroInfo}
        onBroadcastData={handleBroadcastData}
        isBroadcastActive={tab.isBroadcastActive}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
      />
    );
  }

  if (tab.type === 'local-terminal') {
    const terminalType = tab.terminalType || 'powershell';

    // PowerShell o terminal genérico
    if (terminalType === 'powershell' || terminalType === 'linux-terminal') {
      // Obtener el tema correcto
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;

      return (
        <LazyPowerShellTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onBroadcastData={handleBroadcastData}
          isBroadcastActive={tab.isBroadcastActive}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    // WSL genérico
    if (terminalType === 'wsl') {
      // Obtener el tema correcto
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;

      return (
        <LazyWSLTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={linuxTheme}
          onBroadcastData={handleBroadcastData}
          isBroadcastActive={tab.isBroadcastActive}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    // Ubuntu o distribución WSL con información completa desde tab.distroInfo
    if (terminalType === 'ubuntu' || terminalType === 'wsl-distro' || terminalType === 'debian') {
      // Obtener el tema correcto
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;

      return (
        <LazyUbuntuTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          ubuntuInfo={tab.distroInfo}
          theme={linuxTheme}
          onBroadcastData={handleBroadcastData}
          isBroadcastActive={tab.isBroadcastActive}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    // Cygwin Terminal
    if (terminalType === 'cygwin') {
      const linuxTheme = themes[localLinuxTerminalTheme]?.theme || themes['Default Dark']?.theme;

      return (
        <LazyCygwinTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={linuxTheme}
          onBroadcastData={handleBroadcastData}
          isBroadcastActive={tab.isBroadcastActive}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    if (terminalType === 'claude') {
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      return (
        <LazyClaudeTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onBroadcastData={handleBroadcastData}
          isBroadcastActive={tab.isBroadcastActive}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    if (terminalType === 'opencode') {
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      return (
        <LazyOpenCodeTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    if (terminalType === 'codexcli') {
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      return (
        <LazyCodexCliTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    if (terminalType === 'antigravitycli') {
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      return (
        <LazyAntigravityCliTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    if (terminalType === 'hermescli') {
      const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;
      return (
        <LazyHermesCliTerminal
          ref={el => terminalRefs.current[tab.key] = el}
          tabId={tab.key}
          fontFamily={localFontFamily}
          fontSize={localFontSize}
          theme={powerShellTheme}
          onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
        />
      );
    }

    // Fallback a PowerShell
    const powerShellTheme = themes[localPowerShellTheme]?.theme || themes['Default Dark']?.theme;

    return (
      <LazyPowerShellTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        fontFamily={localFontFamily}
        fontSize={localFontSize}
        theme={powerShellTheme}
        onBroadcastData={handleBroadcastData}
        isBroadcastActive={tab.isBroadcastActive}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey || tab.key, showTerminalContextMenu)}
      />
    );
  }

  // Tab de auditoría global de grabaciones
  if (tab.type === 'audit-global' && tab.recordings) {
    return (
      <LazyGlobalAuditTab
        recordings={tab.recordings}
        onPlayRecording={(recording) => {
          // Crear nueva pestaña para reproducir la grabación
          if (setSshTabs) {
            const tabId = `player_${recording.id}_${Date.now()}`;
            const newTab = {
              key: tabId,
              label: `▶️ ${recording.title || recording.metadata?.title || 'Reproducción'}`,
              type: 'recording-player',
              recording: recording,
              createdAt: Date.now(),
              groupId: null
            };

            // Guardar estado del grupo actual antes de cambiar
            if (activeGroupId !== null && setGroupActiveIndices) {
              const currentGroupKey = activeGroupId || 'no-group';
              setGroupActiveIndices(prev => ({
                ...prev,
                [currentGroupKey]: activeTabIndex
              }));
            }

            // Crear la pestaña y activarla
            setSshTabs(prevTabs => [newTab, ...prevTabs]);

            // Activar la nueva pestaña
            if (setLastOpenedTabKey) setLastOpenedTabKey(tabId);
            if (setOnCreateActivateTabKey) setOnCreateActivateTabKey(tabId);
            if (setActiveTabIndex) setActiveTabIndex(1);
            if (setGroupActiveIndices) {
              setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
            }
            if (setOpenTabOrder) {
              setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
            }
          }
        }}
      />
    );
  }

  // Tab de auditoría de grabaciones
  if (tab.type === 'audit' && tab.connectionInfo) {
    return (
      <LazyAuditTab
        connectionInfo={tab.connectionInfo}
        onPlayRecording={(recording) => {
          // Crear nueva pestaña para reproducir la grabación
          if (setSshTabs) {
            const tabId = `player_${recording.id}_${Date.now()}`;
            const newTab = {
              key: tabId,
              label: `▶️ ${recording.title || recording.metadata?.title || 'Reproducción'}`,
              type: 'recording-player',
              recording: recording,
              createdAt: Date.now(),
              groupId: null
            };

            // Guardar estado del grupo actual antes de cambiar
            if (activeGroupId !== null && setGroupActiveIndices) {
              const currentGroupKey = activeGroupId || 'no-group';
              setGroupActiveIndices(prev => ({
                ...prev,
                [currentGroupKey]: activeTabIndex
              }));
            }

            // Crear la pestaña y activarla
            setSshTabs(prevTabs => [newTab, ...prevTabs]);

            // Activar la nueva pestaña
            if (setLastOpenedTabKey) setLastOpenedTabKey(tabId);
            if (setOnCreateActivateTabKey) setOnCreateActivateTabKey(tabId);
            if (setActiveTabIndex) setActiveTabIndex(1);
            if (setGroupActiveIndices) {
              setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
            }
            if (setOpenTabOrder) {
              setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
            }
          }
        }}
      />
    );
  }

  // Tab de reproducción de grabaciones
  if (tab.type === 'recording-player' && tab.recording) {
    return (
      <LazyRecordingPlayerTab
        recording={tab.recording}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
      />
    );
  }

  // Tab de túnel SSH
  if (tab.type === 'ssh-tunnel') {
    return (
      <LazySSHTunnelTab
        key={tab.key}
        tunnelConfig={tab.tunnelConfig}
        tunnelId={tab.tunnelId}
        onClose={() => {
          // El cierre de la pestaña se maneja externamente
        }}
        onStatusChange={(status) => {
          // Opcionalmente actualizar el estado del nodo en el sidebar
        }}
      />
    );
  }

  // Terminal SSH (type: 'terminal' con sshConfig)
  if (tab.type === 'terminal' && tab.sshConfig) {
    return (
      <LazyTerminalComponent
        key={tab.key}
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        sshConfig={tab.sshConfig}
        fontFamily={fontFamily}
        fontSize={fontSize}
        theme={terminalTheme.theme}
        onContextMenu={(e, tabKey) => handleTerminalContextMenu(e, tabKey, showTerminalContextMenu)}
        active={isActiveTab}
        statusBarIconTheme={statusBarIconTheme}
        // Quick Actions props
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        isRecording={isRecordingTab ? isRecordingTab(tab.key) : false}
        onShowSystemMonitor={() => onShowSystemMonitor && onShowSystemMonitor(tab.key)}
        onShowFileExplorer={() => onShowFileExplorer && onShowFileExplorer(tab.key)}
        onToggleBroadcast={() => onToggleBroadcast && onToggleBroadcast(tab.key)}
        isBroadcastActive={tab.isBroadcastActive}
        onDrop={(e) => {
          // Manejador de Drop para convertir pestaña simple en split
          const draggedNode = (window.draggedConnectionNodeRef && window.draggedConnectionNodeRef.current) ||
            (window.draggedSSHNodeRef && window.draggedSSHNodeRef.current);

          let isSupportedType = false;
          if (!draggedNode && e.dataTransfer.types) {
            isSupportedType = e.dataTransfer.types.includes('application/nodeterm-connection') ||
              e.dataTransfer.types.includes('application/nodeterm-ssh-node');
          }

          if ((draggedNode || isSupportedType) && openInSplit) {
            e.preventDefault();
            e.stopPropagation();

            let nodeData = draggedNode;
            if (!nodeData) {
              try {
                if (e.dataTransfer.types.includes('application/nodeterm-connection')) {
                  nodeData = JSON.parse(e.dataTransfer.getData('application/nodeterm-connection'));
                } else if (e.dataTransfer.types.includes('application/nodeterm-ssh-node')) {
                  nodeData = JSON.parse(e.dataTransfer.getData('application/nodeterm-ssh-node'));
                }
              } catch (err) {
                console.warn('Error parsing drop data:', err);
              }
            }

            if (nodeData && (nodeData.type === 'ssh-node' || nodeData.connectionType === 'ssh')) {
              const sshNode = {
                key: nodeData.key,
                label: nodeData.label,
                data: nodeData.data
              };

              const rect = e.currentTarget.getBoundingClientRect();
              const isVerticalSplit = rect.width > rect.height;
              const splitOrientation = isVerticalSplit ? 'vertical' : 'horizontal';

              openInSplit(sshNode, tab, splitOrientation);

              if (window.draggedConnectionNodeRef) window.draggedConnectionNodeRef.current = null;
              if (window.draggedSSHNodeRef) window.draggedSSHNodeRef.current = null;
            }
          }
        }}
        onDragOver={(e) => {
          const hasNode = (window.draggedConnectionNodeRef && window.draggedConnectionNodeRef.current) ||
            (window.draggedSSHNodeRef && window.draggedSSHNodeRef.current);
          const hasType = e.dataTransfer.types && (
            e.dataTransfer.types.includes('application/nodeterm-connection') ||
            e.dataTransfer.types.includes('application/nodeterm-ssh-node')
          );

          if (hasNode || hasType) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        handleToggleBroadcastTarget={handleToggleBroadcastTarget}
        getAllTabs={getAllTabs}
        onBroadcastData={handleBroadcastData}
      />
    );
  }

  if (tab.type === 'anything-llm') {
    return <LazyAnythingLLMTab />;
  }

  if (tab.type === 'openwebui') {
    return <LazyOpenWebUITab />;
  }

  if (tab.type === 'librechat') {
    return <LazyLibreChatTab />;
  }

  if (tab.type === 'agentzero') {
    return <LazyAgentZeroTab />;
  }

  if (tab.type === 'openclaw') {
    return <LazyOpenClawTab />;
  }

  if (tab.type === 'open-notebook') {
    return <LazyOpenNotebookTab />;
  }

  // Herramienta de red (network-tool)
  if (tab.type === 'network-tool') {
    return <LazyNetworkToolTab tab={tab} />;
  }

  // Editar conexión (edit-connection)
  if (tab.type === 'edit-connection') {
    return (
      <EditConnectionTabContent
        tab={tab}
        nodes={nodes}
        handleSaveSshToSidebar={handleSaveSshToSidebar}
        handleSaveRdpToSidebar={handleSaveRdpToSidebar}
        handleSaveVncToSidebar={handleSaveVncToSidebar}
        handleSaveFileConnectionToSidebar={handleSaveFileConnectionToSidebar}
        handleSaveSSHTunnelToSidebar={handleSaveSSHTunnelToSidebar}
        onOpenSSHConnection={onCreateSSHConnection}
        onOpenRdpConnection={onOpenRdpConnection}
        onOpenVncConnection={onOpenVncConnection}
        onOpenFileConnection={onOpenFileConnection}
        onOpenSSHTunnel={onOpenSSHTunnel}
        handleTabClose={handleTabClose}
        iconTheme={iconTheme}
      />
    );
  }

  // Configuración (settings)
  if (tab.type === 'settings') {
    return (
      <LazySettingsContent
        isEmbedded={true}
        visible={isActiveTab}
        propMainTab={tab.mainTab}
        propSubTab={tab.subTab}
        {...settingsTabProps}
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
        Esta pestaña fue creada con una estructura antigua.<br />
        Cierra esta pestaña y crea una nueva.
      </div>
    </div>
  );
});

const TabContentRenderer = (props) => (
  <Suspense fallback={null}>
    <TabContentRendererInner {...props} />
  </Suspense>
);

export default TabContentRenderer;
