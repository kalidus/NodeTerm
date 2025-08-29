import React from 'react';
import HomeTab from './HomeTab';
import FileExplorer from './FileExplorer';
import SplitLayout from './SplitLayout';
import RdpSessionTab from './RdpSessionTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import GuacamoleTab from './GuacamoleTab';
import TerminalComponent from './TerminalComponent';

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
                clientType: 'mstsc'
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

  // Default: TerminalComponent (SSH)
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
});

export default TabContentRenderer;
