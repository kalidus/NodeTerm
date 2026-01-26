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
import DockerTerminal from './DockerTerminal';
import AuditTab from './AuditTab';
import RecordingPlayerTab from './RecordingPlayerTab';
import GlobalAuditTab from './GlobalAuditTab';
import AIChatTab from './AIChatTab';
import AnythingLLMTab from './AnythingLLMTab';
import OpenWebUITab from './OpenWebUITab';
import SSHTunnelTab from './SSHTunnelTab';
import { themes } from '../themes';
import { TAB_TYPES } from '../utils/constants';
import { recordRecentPassword } from '../utils/connectionStore';
import { getNetworkById } from '../utils/cryptoNetworks';

const TabContentRenderer = React.memo(({
  tab,
  isActiveTab,
  // HomeTab props
  onCreateSSHConnection,
  openFolderDialog,
  onOpenRdpConnection,
  onOpenVncConnection,
  handleLoadGroupFromFavorites,
  openEditRdpDialog,
  openEditSSHDialog,
  nodes,
  localFontFamily,
  localFontSize,
  localLinuxTerminalTheme,
  localPowerShellTheme,
  localDockerTerminalTheme,
  dockerFontFamily,
  dockerFontSize,
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
  setShowCreateGroupDialog,
  activeIds
}) => {
  if (tab.type === 'home') {
    return (
      <HomeTab
        isActiveTab={isActiveTab}
        activeIds={activeIds}
        onCreateSSHConnection={onCreateSSHConnection}
        onCreateFolder={() => openFolderDialog(null)}
        onCreateRdpConnection={onOpenRdpConnection}
        onCreateVncConnection={onOpenVncConnection}
        onLoadGroup={handleLoadGroupFromFavorites}
        sidebarNodes={nodes}
        onEditConnection={(connection) => {
          // Intentar construir un nodo temporal según el tipo para reutilizar los editores existentes
          if (!connection) return;
          if (connection.type === 'rdp-guacamole' || connection.type === 'rdp' || connection.type === 'vnc-guacamole' || connection.type === 'vnc') {
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
            // Incluir todos los campos de la conexión para que la edición muestre la información correcta
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
                // Campos para conexiones Wallix/Bastion
                useBastionWallix: connection.useBastionWallix || false,
                bastionHost: connection.bastionHost || '',
                bastionUser: connection.bastionUser || '',
                targetServer: connection.targetServer || '',
                // Campos adicionales
                description: connection.description || '',
                customIcon: connection.customIcon || null
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
            if (data.type === 'rdp' || data.type === 'rdp-guacamole' || data.type === 'vnc' || data.type === 'vnc-guacamole') return true;
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
        setShowCreateGroupDialog={setShowCreateGroupDialog}
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

  // Secret info tab (password, crypto_wallet, api_key, secure_note)
  if (tab.type === TAB_TYPES.PASSWORD && tab.passwordData) {
    const p = tab.passwordData;
    const secretType = p.type || 'password';

    const copyToClipboard = async (text, fieldName) => {
      try {
        if (window.electron?.clipboard?.writeText) {
          await window.electron.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(text);
        }

        // Registrar como reciente cuando se copia (para cualquier tipo de secreto)
        if (fieldName === 'Contraseña' || fieldName === 'Seed Phrase' || fieldName === 'Private Key' || fieldName === 'API Key') {
          try {
            recordRecentPassword({
              id: p.id,
              name: p.name || p.label,
              username: p.username,
              password: p.password,
              url: p.url,
              group: p.group,
              notes: p.notes,
              type: secretType || p.type || 'password',
              icon: p.icon || 'pi-key'
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

    const Row = ({ label, value, copy, masked = false, mono = true }) => {
      const [showValue, setShowValue] = React.useState(!masked);
      const displayValue = masked && !showValue ? '••••••••••••' : value;

      return (
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid var(--ui-content-border)'
        }}>
          <div style={{
            width: 140,
            color: 'var(--ui-dialog-text)',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            {label}
          </div>
          <div style={{
            flex: 1,
            color: 'var(--ui-dialog-text)',
            fontFamily: mono ? 'monospace' : 'inherit',
            fontSize: '14px',
            wordBreak: 'break-all',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {displayValue || '-'}
            {masked && value && (
              <button
                onClick={() => setShowValue(!showValue)}
                style={{
                  padding: '4px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: '#9C27B0',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(156, 39, 176, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                {showValue ? '👁️' : '👁️‍🗨️'}
              </button>
            )}
          </div>
          {copy && value && (
            <button
              onClick={() => copyToClipboard(value, label)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: '1px solid var(--ui-content-border)',
                background: 'var(--ui-button-secondary)',
                color: 'var(--ui-button-secondary-text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                minWidth: '70px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--ui-button-hover)';
                e.target.style.borderColor = 'var(--ui-button-primary)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--ui-button-secondary)';
                e.target.style.borderColor = 'var(--ui-content-border)';
              }}
            >
              Copiar
            </button>
          )}
        </div>
      );
    };

    // Determinar icono y color según tipo
    const getIconInfo = () => {
      switch (secretType) {
        case 'crypto_wallet':
          const network = getNetworkById(p.network);
          return { icon: 'pi pi-wallet', color: network?.color || '#F7931A' };
        case 'api_key':
          return { icon: 'pi pi-key', color: '#00BCD4' };
        case 'secure_note':
          return { icon: 'pi pi-file-edit', color: '#9C27B0' };
        default:
          return { icon: 'pi pi-lock', color: '#E91E63' };
      }
    };

    const iconInfo = getIconInfo();

    return (
      <div style={{
        padding: '24px',
        background: 'var(--ui-content-bg)',
        height: '100%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span className={iconInfo.icon} style={{ fontSize: '24px', color: iconInfo.color }}></span>
          <h2 style={{ margin: 0, color: 'var(--ui-dialog-text)', fontSize: '24px', fontWeight: '600' }}>{p.title}</h2>
          {secretType === 'crypto_wallet' && p.network && (
            <span style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: getNetworkById(p.network)?.color || '#F7931A',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              {getNetworkById(p.network)?.symbol || p.network}
            </span>
          )}
        </div>

        <div style={{
          background: 'var(--ui-dialog-bg)',
          borderRadius: 12,
          padding: '24px 20px',
          border: '1px solid var(--ui-content-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Vista para PASSWORD */}
          {secretType === 'password' && (
            <>
              <Row label="Usuario" value={p.username} copy />
              <Row label="Contraseña" value={p.password} copy masked />
              <Row label="URL" value={p.url} />
              <Row label="Grupo" value={p.group} mono={false} />
              {p.notes && <Row label="Notas" value={p.notes} mono={false} />}
            </>
          )}

          {/* Vista para CRYPTO WALLET */}
          {secretType === 'crypto_wallet' && (
            <>
              <Row label="Red" value={getNetworkById(p.network)?.name || p.network} mono={false} />
              {p.address && <Row label="Dirección" value={p.address} copy />}

              {/* Seed Phrase en campos individuales */}
              {p.seedPhrase && (() => {
                const words = p.seedPhrase.trim().split(/\s+/).filter(w => w.length > 0);
                const wordCount = words.length;
                const [showSeedPhrase, setShowSeedPhrase] = React.useState(false);

                return (
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--ui-content-border)' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: 140,
                        color: 'var(--ui-dialog-text)',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Seed Phrase
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                          style={{
                            padding: '4px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'transparent',
                            color: '#9C27B0',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(156, 39, 176, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'transparent';
                          }}
                        >
                          {showSeedPhrase ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(p.seedPhrase, 'Seed Phrase')}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 6,
                            border: '1px solid var(--ui-content-border)',
                            background: 'var(--ui-button-secondary)',
                            color: 'var(--ui-button-secondary-text)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            minWidth: '70px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--ui-button-hover)';
                            e.target.style.borderColor = 'var(--ui-button-primary)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'var(--ui-button-secondary)';
                            e.target.style.borderColor = 'var(--ui-content-border)';
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    {/* Grid de palabras */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px'
                    }}>
                      {Array(wordCount).fill(null).map((_, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              color: 'var(--ui-button-primary)',
                              fontWeight: '600',
                              fontSize: '12px',
                              minWidth: '24px'
                            }}>
                              {index + 1}.
                            </span>
                            <button
                              onClick={async () => {
                                const word = words[index];
                                if (word) {
                                  try {
                                    if (window.electron?.clipboard?.writeText) {
                                      await window.electron.clipboard.writeText(word);
                                    } else {
                                      await navigator.clipboard.writeText(word);
                                    }
                                    if (window.toast?.current?.show) {
                                      window.toast.current.show({
                                        severity: 'success',
                                        summary: 'Copiado',
                                        detail: `Palabra ${index + 1} copiada`,
                                        life: 1500
                                      });
                                    }
                                  } catch (err) {
                                    console.error('Error copiando:', err);
                                  }
                                }
                              }}
                              style={{
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--ui-button-primary)',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                minWidth: 'auto',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(var(--ui-button-primary-rgb), 0.1)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'transparent';
                              }}
                              title={`Copiar palabra ${index + 1}`}
                            >
                              📋
                            </button>
                          </div>
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--ui-content-border)',
                            background: 'var(--ui-dialog-bg)',
                            color: 'var(--ui-dialog-text)',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            wordBreak: 'break-word'
                          }}>
                            {showSeedPhrase ? (words[index] || '-') : '••••••'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {p.passphrase && <Row label="Passphrase" value={p.passphrase} masked />}
              {p.privateKey && <Row label="Clave Privada" value={p.privateKey} copy masked />}
              {p.notes && <Row label="Notas" value={p.notes} mono={false} />}
            </>
          )}

          {/* Vista para API KEY */}
          {secretType === 'api_key' && (
            <>
              {p.serviceName && <Row label="Servicio" value={p.serviceName} mono={false} />}
              <Row label="API Key" value={p.apiKey} copy masked />
              {p.apiSecret && <Row label="API Secret" value={p.apiSecret} copy masked />}
              {p.endpoint && <Row label="Endpoint" value={p.endpoint} />}
              {p.notes && <Row label="Notas" value={p.notes} mono={false} />}
            </>
          )}

          {/* Vista para SECURE NOTE */}
          {secretType === 'secure_note' && (
            <div style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '14px',
              color: 'var(--ui-dialog-text)',
              lineHeight: '1.6'
            }}>
              {p.noteContent || p.notes || 'Sin contenido'}
            </div>
          )}
        </div>

        {/* Advertencia para crypto */}
        {secretType === 'crypto_wallet' && (
          <div style={{
            marginTop: 20,
            padding: '14px 18px',
            background: 'rgba(255, 152, 0, 0.15)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: '500'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>NUNCA compartas tu seed phrase o clave privada con nadie</span>
          </div>
        )}

        {/* Botón para abrir URL (solo password) */}
        {secretType === 'password' && p.url && (
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

        {/* Botón para abrir endpoint (solo api_key) */}
        {secretType === 'api_key' && p.endpoint && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => window.electron?.import?.openExternal?.(p.endpoint)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#00BCD4',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.opacity = '0.9';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.opacity = '1';
              }}
            >
              <span className="pi pi-external-link" style={{ marginRight: 8 }}></span>
              Abrir Endpoint
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

    const copyToClipboard = async (text, fieldName, passwordData = null) => {
      try {
        if (window.electron?.clipboard?.writeText) {
          await window.electron.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(text);
        }

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
                  copyToClipboard(password.password, 'Contraseña', password);
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
        sshStatsByTabId={sshStatsByTabId}
        terminalRefs={terminalRefs}
        statusBarIconTheme={statusBarIconTheme}
        splitterColor={terminalTheme.theme?.background || '#2d2d2d'}
        // Nuevo sistema: callback con path en el árbol
        onClosePanel={(path) => handleCloseSplitPanel(tab.key, path)}
        // Legacy: callbacks antiguos
        onCloseLeft={() => handleCloseSplitPanel(tab.key, 'left')}
        onCloseRight={() => handleCloseSplitPanel(tab.key, 'right')}
        path={[]}
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

  if (tab.type === 'rdp-guacamole' || tab.type === 'vnc-guacamole') {
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
  // Docker Terminal
  if (tab.type === 'docker') {
    const dockerTheme = themes[localDockerTerminalTheme]?.theme || themes['Default Dark']?.theme;

    return (
      <DockerTerminal
        ref={el => terminalRefs.current[tab.key] = el}
        tabId={tab.key}
        fontFamily={dockerFontFamily}
        fontSize={dockerFontSize}
        theme={dockerTheme}
        dockerInfo={tab.distroInfo}
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
      <AuditTab
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
      <RecordingPlayerTab
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
      <SSHTunnelTab
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

  // Pestaña de Chat de IA
  if (tab.type === 'ai-chat') {
    return (
      <AIChatTab
        tab={tab}
        isActiveTab={isActiveTab}
        localFontFamily={localFontFamily}
        localFontSize={localFontSize}
        localPowerShellTheme={localPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
      />
    );
  }

  if (tab.type === 'anything-llm') {
    return <AnythingLLMTab />;
  }

  if (tab.type === 'openwebui') {
    return <OpenWebUITab />;
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

export default TabContentRenderer;
