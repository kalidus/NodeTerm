import { useEffect, useCallback } from 'react';
import { TAB_TYPES } from '../utils/constants';
import connectionStore, { recordRecentPassword } from '../utils/connectionStore';
import { isHomeButtonLocked as readHomeButtonLocked } from '../utils/homeTabDefaults';
import i18n from '../i18n';

const EDITABLE_CONNECTION_TYPES = ['ssh', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole', 'sftp', 'ftp', 'scp', 'ssh-tunnel'];

/**
 * Hook para desacoplar todos los listeners globales de eventos de ventana (CustomEvents),
 * listeners IPC de tabs y manejadores de atajos de teclado/zoom.
 */
export const useGlobalAppEvents = ({
  nodes,
  setNodes,
  loadNodes,
  pendingExplorerSession,
  setPendingExplorerSession,
  activeGroupId,
  setActiveGroupId,
  sshTabs,
  setSshTabs,
  fileExplorerTabs,
  activatingNowRef,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  filteredTabs,
  handleUnblockFormsWrapper,
  createNewPasswordEntry,
  setShowUnifiedConnectionDialog,
  homeTabs,
  getAllTabs,
  getTabsInGroup,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setOpenTabOrder,
  openTabOrder,
  onCreateActivateTabKey,
  lastOpenedTabKey,
  setGuacamoleTabs,
  setExpandedKeys,
  handleTabClose,
  sidebarCallbacksRef,
  setShowProtocolSelectionDialog,
  onOpenRdpConnection,
  onOpenVncConnection,
  onOpenFileConnection,
  onOpenSSHTunnel,
  duplicateSSHTunnel,
  findParentNodeAndIndex,
  confirmDeleteNode,
  handleSaveFileConnectionToSidebar,
  openNewUnifiedConnectionDialog,
  setShowNetworkToolsDialog,
  rdpTabs,
  findNodeByKey,
  toast,
  fontSize,
  setFontSize,
  localFontSize,
  setLocalFontSize,
  dockerFontSize,
  setDockerFontSize,
  handleGuacamoleCreateTab
}) => {
  // 1. Sincronización externa para datos encriptados y configuración
  useEffect(() => {
    const handleSync = () => {
      loadNodes();
    };

    const handleSettingsUpdated = (e) => {
      if (e.detail?.source === 'sync') {
        loadNodes();
      }
    };

    window.addEventListener('encryption-data-synced', handleSync);
    window.addEventListener('connections-synced-from-cloud', handleSync);
    window.addEventListener('settings-updated', handleSettingsUpdated);
    window.addEventListener('localstorage-sync-ready', handleSync);
    window.addEventListener('nodeterm-backup-imported', handleSync);

    return () => {
      window.removeEventListener('encryption-data-synced', handleSync);
      window.removeEventListener('connections-synced-from-cloud', handleSync);
      window.removeEventListener('settings-updated', handleSettingsUpdated);
      window.removeEventListener('localstorage-sync-ready', handleSync);
      window.removeEventListener('nodeterm-backup-imported', handleSync);
    };
  }, [loadNodes]);

  // 2. Manejo de cambios en el explorador de archivos pendiente
  useEffect(() => {
    if (pendingExplorerSession) {
      const explorerIndex = getTabsInGroup(activeGroupId).findIndex(tab => tab.originalKey === pendingExplorerSession);
      if (explorerIndex >= sshTabs.length) {
        if (!activatingNowRef.current) setActiveTabIndex(explorerIndex);
        setPendingExplorerSession(null);
      }
    }
  }, [fileExplorerTabs, pendingExplorerSession, sshTabs.length, activeGroupId, getTabsInGroup, activatingNowRef, setActiveTabIndex, setPendingExplorerSession]);

  // 3. Notificar al backend sobre pestaña activa para estadísticas SSH
  useEffect(() => {
    const activeTab = filteredTabs?.[activeTabIndex];
    if (filteredTabs?.length > 0 && activeTab && window.electron && window.electron.ipcRenderer) {
      if (activeTab.type === 'split') {
        if (activeTab.leftTerminal) {
          window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.leftTerminal.key);
        }
        if (activeTab.rightTerminal) {
          window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.rightTerminal.key);
        }
      } else if (activeTab.type === 'terminal') {
        window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
      }
    }
  }, [activeTabIndex, filteredTabs]);

  // 4. Exponer función global para desbloqueo
  useEffect(() => {
    window.handleUnblockForms = handleUnblockFormsWrapper;
    return () => {
      delete window.handleUnblockForms;
    };
  }, [handleUnblockFormsWrapper]);

  // 5. Crear pestañas de Guacamole
  useEffect(() => {
    const handleGuacamoleCreateTabWrapper = async (event, data) => {
      await handleGuacamoleCreateTab(
        event,
        data,
        activeGroupId,
        setGroupActiveIndices,
        activeTabIndex,
        setActiveGroupId,
        setGuacamoleTabs,
        setLastOpenedTabKey,
        setOnCreateActivateTabKey,
        setActiveTabIndex,
        setOpenTabOrder
      );
    };

    if (window.electron && window.electron.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on('guacamole:create-tab', handleGuacamoleCreateTabWrapper);
      return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch { } };
    }
  }, [
    handleGuacamoleCreateTab,
    activeGroupId,
    setGroupActiveIndices,
    activeTabIndex,
    setActiveGroupId,
    setGuacamoleTabs,
    setLastOpenedTabKey,
    setOnCreateActivateTabKey,
    setActiveTabIndex,
    setOpenTabOrder
  ]);

  // 6. Debug nodes
  useEffect(() => {
    window.__DEBUG_NODES__ = () => nodes;
  }, [nodes]);

  // 7. Crear password desde el diálogo unificado
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail || {};
      try {
        const targetKey = p.targetFolder || null;
        createNewPasswordEntry(targetKey, p);
      } catch (err) {
        console.error('Error creando password desde diálogo:', err);
      }
    };
    window.addEventListener('create-password-from-dialog', handler);
    return () => window.removeEventListener('create-password-from-dialog', handler);
  }, [createNewPasswordEntry]);

  // 8. Abrir diálogo unificado directamente en pestaña Password
  useEffect(() => {
    const handler = (e) => {
      try {
        const targetFolder = e.detail?.targetFolder || null;
        const isPasswordView = e.detail?.isPasswordView || false;

        if (!isPasswordView) {
          console.log('⚠️ Intentando crear password fuera de la vista de passwords - ignorando');
          return;
        }

        setShowUnifiedConnectionDialog(true);
        setTimeout(() => {
          try { document.querySelector('.unified-connection-dialog'); } catch { }
          const ev = new CustomEvent('switch-unified-tab', { detail: { index: 2, targetFolder } });
          window.dispatchEvent(ev);
        }, 0);
      } catch (err) {
        console.error('Error abriendo diálogo password:', err);
      }
    };
    window.addEventListener('open-password-tab-in-dialog', handler);
    return () => window.removeEventListener('open-password-tab-in-dialog', handler);
  }, [setShowUnifiedConnectionDialog]);

  // Tab Promotion & Activation Callbacks
  const getTargetIndexForTab = useCallback((tabKey) => {
    const isHomeButtonLocked = readHomeButtonLocked();
    if (isHomeButtonLocked) {
      const homeTabsInGroup = homeTabs.filter(t => activeGroupId ? t.groupId === activeGroupId : !t.groupId).length;
      return homeTabsInGroup;
    } else {
      return 0;
    }
  }, [homeTabs, activeGroupId]);

  const promoteAndActivateTab = useCallback((tabKey, optSshTabsUpdater = null) => {
    setOpenTabOrder(prev => [tabKey, ...prev.filter(k => k !== tabKey)]);
    setSshTabs(prev => {
      const base = optSshTabsUpdater ? optSshTabsUpdater(prev) : prev;
      const idx = base.findIndex(t => t.key === tabKey);
      if (idx <= 0) return base;
      const next = [...base];
      const [moved] = next.splice(idx, 1);
      return [moved, ...next];
    });
    setLastOpenedTabKey(tabKey);

    const targetIdx = getTargetIndexForTab(tabKey);
    setActiveTabIndex(targetIdx);

    const currentGroupKey = activeGroupId || 'no-group';
    setGroupActiveIndices(prev => ({
      ...prev,
      [currentGroupKey]: targetIdx
    }));
  }, [setOpenTabOrder, setSshTabs, setLastOpenedTabKey, getTargetIndexForTab, setActiveTabIndex, activeGroupId, setGroupActiveIndices]);

  const activateTabSynchronously = useCallback((tabKey) => {
    const allTabs = getAllTabs();
    const tabIndex = allTabs.findIndex(t => t.key === tabKey);
    if (tabIndex !== -1) {
      setActiveTabIndex(tabIndex);
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: tabIndex
      }));
    }
  }, [getAllTabs, setActiveTabIndex, activeGroupId, setGroupActiveIndices]);

  const handleOpenEditConnectionTab = useCallback((node) => {
    if (!node) return;
    const tabKey = `edit_connection_${node.key}`;
    const allTabs = getAllTabs();
    const existingTab = allTabs.find(t => t.key === tabKey);
    if (existingTab) {
      promoteAndActivateTab(tabKey);
      setTimeout(() => activateTabSynchronously(tabKey), 20);
      return;
    }

    const newTab = {
      key: tabKey,
      label: `Editar: ${node.label || node.name || 'Conexión'}`,
      type: 'edit-connection',
      node: node,
      createdAt: Date.now()
    };
    promoteAndActivateTab(tabKey, (prev) => [newTab, ...prev]);
    setTimeout(() => activateTabSynchronously(tabKey), 50);
  }, [getAllTabs, promoteAndActivateTab, activateTabSynchronously]);

  const handleSyncActiveEditTabFromSidebar = useCallback((node) => {
    if (!node?.key) return;
    const nodeType = node.data?.type || node.type;
    if (!EDITABLE_CONNECTION_TYPES.includes(nodeType)) return;

    const activeTab = filteredTabs?.[activeTabIndex];
    if (!activeTab || activeTab.type !== 'edit-connection') return;

    const isNewConnection = !!(
      activeTab.node?.isNew ||
      String(activeTab.key || '').startsWith('new_connection_') ||
      String(activeTab.node?.key || '').startsWith('temp_')
    );
    if (isNewConnection) return;
    if (activeTab.node?.key === node.key) return;

    const oldKey = activeTab.key;
    const newKey = `edit_connection_${node.key}`;
    const newLabel = `Editar: ${node.label || node.name || 'Conexión'}`;

    setSshTabs(prev => {
      const withoutDest = prev.filter(t => t.key !== newKey);
      return withoutDest.map(t => t.key === oldKey
        ? { ...t, key: newKey, label: newLabel, node }
        : t
      );
    });

    setOpenTabOrder(prev => {
      const withoutDest = prev.filter(k => k !== newKey);
      return withoutDest.map(k => k === oldKey ? newKey : k);
    });

    setLastOpenedTabKey(prev => prev === oldKey ? newKey : prev);
  }, [filteredTabs, activeTabIndex, setSshTabs, setOpenTabOrder, setLastOpenedTabKey]);

  const handleOpenNewConnectionTab = useCallback((protocol = 'ssh') => {
    const tabKey = `new_connection_${Date.now()}`;
    const protocolUpper = (protocol || 'ssh').toUpperCase();
    const dummyNode = {
      key: `temp_${Date.now()}`,
      label: `Nueva Conexión ${protocolUpper}`,
      type: protocol,
      data: { type: protocol },
      isNew: true
    };
    const newTab = {
      key: tabKey,
      label: `Nueva Conexión (${protocolUpper})`,
      type: 'edit-connection',
      node: dummyNode,
      createdAt: Date.now()
    };
    promoteAndActivateTab(tabKey, (prev) => [newTab, ...prev]);
  }, [promoteAndActivateTab]);

  useEffect(() => {
    const handleOpenNewConn = (e) => {
      const protocol = e?.detail?.protocol || 'ssh';
      handleOpenNewConnectionTab(protocol);
    };
    window.addEventListener('open-new-connection-tab', handleOpenNewConn);
    return () => window.removeEventListener('open-new-connection-tab', handleOpenNewConn);
  }, [handleOpenNewConnectionTab]);

  const openEditSSHDialog = handleOpenEditConnectionTab;
  const openEditRdpDialog = handleOpenEditConnectionTab;
  const openEditVncDialog = handleOpenEditConnectionTab;
  const openEditFileConnectionDialog = handleOpenEditConnectionTab;
  const openEditSSHTunnelDialog = handleOpenEditConnectionTab;

  // 9. Crear y activar pestaña de info de secreto
  const PASSWORD_PREVIEW_TAB_KEY = 'password-preview-view';
  useEffect(() => {
    const buildPasswordData = (info, secretType) => ({
      id: info.key,
      title: info.label || info.title,
      type: secretType,
      notes: info.notes || info.data?.notes || '',
      username: info.username || info.data?.username || '',
      password: info.password || info.data?.password || '',
      url: info.url || info.data?.url || '',
      group: info.group || info.data?.group || '',
      network: info.network || info.data?.network || '',
      address: info.address || info.data?.address || '',
      seedPhrase: info.seedPhrase || info.data?.seedPhrase || '',
      seedWordsCount: info.seedWordsCount || info.data?.seedWordsCount || 24,
      privateKey: info.privateKey || info.data?.privateKey || '',
      passphrase: info.passphrase || info.data?.passphrase || '',
      apiKey: info.apiKey || info.data?.apiKey || '',
      apiSecret: info.apiSecret || info.data?.apiSecret || '',
      endpoint: info.endpoint || info.data?.endpoint || '',
      serviceName: info.serviceName || info.data?.serviceName || '',
      noteContent: info.noteContent || info.data?.noteContent || ''
    });

    const getTabIcon = (secretType) => {
      switch (secretType) {
        case 'crypto_wallet': return '💰';
        case 'api_key': return '🔑';
        case 'secure_note': return '📝';
        default: return '🔐';
      }
    };

    const recordRecent = (info, passwordData, secretType) => {
      try {
        recordRecentPassword({
          id: info.key,
          name: info.label,
          username: passwordData.username,
          password: passwordData.password,
          url: passwordData.url,
          group: passwordData.group,
          notes: passwordData.notes,
          type: secretType,
          icon: info.data?.icon || 'pi-key'
        }, 5);
      } catch (err) {
        console.warn('Error registrando secreto reciente:', err);
      }
    };

    const handler = (e) => {
      const info = e.detail || {};
      const secretType = info.type || info.data?.type || 'password';
      const mode = info.mode === 'preview' ? 'preview' : 'permanent';
      const passwordData = buildPasswordData(info, secretType);
      const tabLabel = `${getTabIcon(secretType)} ${info.label || info.title}`;

      recordRecent(info, passwordData, secretType);

      const existingTabs = getAllTabs();

      if (mode === 'preview') {
        const previewTab = existingTabs.find(
          t => t.type === TAB_TYPES.PASSWORD && t.isPreview === true
        );

        if (previewTab) {
          promoteAndActivateTab(previewTab.key, (prev) =>
            prev.map(t =>
              t.key === previewTab.key
                ? { ...t, label: tabLabel, passwordData }
                : t
            )
          );
          return;
        }

        const newTab = {
          key: PASSWORD_PREVIEW_TAB_KEY,
          label: tabLabel,
          type: TAB_TYPES.PASSWORD,
          passwordData,
          isPreview: true,
          createdAt: Date.now()
        };
        promoteAndActivateTab(PASSWORD_PREVIEW_TAB_KEY, (prev) => [newTab, ...prev]);
        return;
      }

      const existingPermanent = existingTabs.find(
        t => t.type === TAB_TYPES.PASSWORD && !t.isPreview && t.passwordData?.id === info.key
      );
      if (existingPermanent) {
        activateTabSynchronously(existingPermanent.key);
        return;
      }

      const tabId = `${info.key}_${Date.now()}`;
      const newTab = {
        key: tabId,
        label: tabLabel,
        type: TAB_TYPES.PASSWORD,
        passwordData,
        createdAt: Date.now()
      };
      promoteAndActivateTab(tabId, (prev) => [newTab, ...prev]);
    };
    window.addEventListener('open-password-tab', handler);
    return () => window.removeEventListener('open-password-tab', handler);
  }, [getAllTabs, promoteAndActivateTab, activateTabSynchronously]);

  // 10. Crear y activar pestaña de navegador integrado
  useEffect(() => {
    const handler = (e) => {
      const info = e.detail || {};
      const { url, username, password, title } = info;
      if (!url) return;

      const existingTabs = getAllTabs();
      const existingTab = existingTabs.find(t => t.type === TAB_TYPES.BROWSER && t.browserData?.url === url);
      if (existingTab) {
        activateTabSynchronously(existingTab.key);
        return;
      }

      const tabId = `browser_${Date.now()}`;
      const browserData = {
        url,
        username,
        password,
        title
      };

      const newTab = {
        key: tabId,
        label: `🌐 ${title || 'Navegador'}`,
        type: TAB_TYPES.BROWSER,
        browserData,
        createdAt: Date.now()
      };

      promoteAndActivateTab(tabId, (prev) => [newTab, ...prev]);
    };

    window.addEventListener('open-browser-tab', handler);
    return () => window.removeEventListener('open-browser-tab', handler);
  }, [getAllTabs, promoteAndActivateTab, activateTabSynchronously]);

  // 11. Pestaña de exploración de carpetas de passwords
  const PASSWORD_FOLDER_TAB_KEY = 'password-folder-view';
  useEffect(() => {
    const handler = (e) => {
      const info = e.detail || {};
      const folderData = {
        folderKey: info.folderKey,
        folderLabel: info.folderLabel,
        passwords: info.passwords || []
      };

      const existingTabs = getAllTabs();
      const existingTab = existingTabs.find(t => t.type === TAB_TYPES.PASSWORD_FOLDER);

      if (existingTab) {
        promoteAndActivateTab(existingTab.key, (prev) =>
          prev.map(t =>
            t.key === existingTab.key
              ? { ...t, label: `📁 ${info.folderLabel}`, folderData }
              : t
          )
        );
        return;
      }

      const newTab = {
        key: PASSWORD_FOLDER_TAB_KEY,
        label: `📁 ${info.folderLabel}`,
        type: TAB_TYPES.PASSWORD_FOLDER,
        folderData,
        createdAt: Date.now()
      };
      promoteAndActivateTab(PASSWORD_FOLDER_TAB_KEY, (prev) => [newTab, ...prev]);
    };
    window.addEventListener('open-password-folder-tab', handler);
    return () => window.removeEventListener('open-password-folder-tab', handler);
  }, [getAllTabs, promoteAndActivateTab]);

  // 12. Pestaña de documento
  useEffect(() => {
    const handler = (e) => {
      const info = e.detail || {};
      const tabId = `doc_${info.key}_${Date.now()}`;

      const existingTabs = getAllTabs();
      const existingTab = existingTabs.find(t => t.type === TAB_TYPES.DOCUMENT && t.documentData?.key === info.key);
      if (existingTab) {
        activateTabSynchronously(existingTab.key);
        return;
      }

      const documentData = {
        key: info.key,
        label: info.label,
        icon: info.data?.icon || '📝',
        content: info.data?.content || '',
        markdownSource: info.data?.markdownSource || '',
        createdAt: info.data?.createdAt,
        updatedAt: info.data?.updatedAt
      };

      const newTab = {
        key: tabId,
        label: `${documentData.icon} ${info.label}`,
        type: TAB_TYPES.DOCUMENT,
        documentData,
        createdAt: Date.now()
      };
      promoteAndActivateTab(tabId, (prev) => [newTab, ...prev]);
    };
    window.addEventListener('open-document-tab', handler);
    return () => window.removeEventListener('open-document-tab', handler);
  }, [getAllTabs, promoteAndActivateTab, activateTabSynchronously]);

  // 13. Sincronizar título e icono de documentos
  useEffect(() => {
    const handleTitle = (e) => {
      const { key, label } = e.detail || {};
      if (!key || !label) return;
      setSshTabs(prev =>
        prev.map(t => {
          if (t.type === TAB_TYPES.DOCUMENT && t.documentData?.key === key) {
            const icon = t.documentData?.icon || '📝';
            return {
              ...t,
              label: `${icon} ${label}`,
              documentData: {
                ...t.documentData,
                label
              }
            };
          }
          return t;
        })
      );
    };

    const handleIcon = (e) => {
      const { key, icon } = e.detail || {};
      if (!key) return;
      setSshTabs(prev =>
        prev.map(t => {
          if (t.type === TAB_TYPES.DOCUMENT && t.documentData?.key === key) {
            const finalIcon = icon || '📄';
            return {
              ...t,
              label: `${finalIcon} ${t.documentData.label}`,
              documentData: {
                ...t.documentData,
                icon: icon || null
              }
            };
          }
          return t;
        })
      );
    };

    window.addEventListener('document-title-updated', handleTitle);
    window.addEventListener('document-icon-updated', handleIcon);
    return () => {
      window.removeEventListener('document-title-updated', handleTitle);
      window.removeEventListener('document-icon-updated', handleIcon);
    };
  }, [setSshTabs]);

  // 14. Creación de pestañas fijadas (AI Clients, Audit, etc.)
  useEffect(() => {
    const handleCreateAuditTab = (event) => {
      const { tabId, title, recordings } = event.detail;
      const newAuditTab = {
        key: tabId,
        label: title,
        type: 'audit-global',
        recordings: recordings,
        createdAt: Date.now(),
        groupId: null
      };
      setSshTabs(prevTabs => [newAuditTab, ...prevTabs]);
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
    };
    window.addEventListener('create-audit-tab', handleCreateAuditTab);

    const handleCreateTerminalTab = (event) => {
      const { type, distroInfo } = event.detail;
      window.dispatchEvent(new CustomEvent('create-local-terminal', {
        detail: { terminalType: type, distroInfo: distroInfo }
      }));
    };
    window.addEventListener('create-terminal-tab', handleCreateTerminalTab);

    const insertPinnedTab = (tab) => {
      if (!tab) return;
      if (activeGroupId !== null) {
        const currentGroupKey = activeGroupId || 'no-group';
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: activeTabIndex
        }));
        setActiveGroupId(null);
      }
      setSshTabs(prevTabs => [tab, ...prevTabs]);
      setLastOpenedTabKey(tab.key);
      setOnCreateActivateTabKey(tab.key);
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      setOpenTabOrder(prev => [tab.key, ...prev.filter(k => k !== tab.key)]);
    };

    const handleCreateAnythingLLMTab = (event) => insertPinnedTab(event.detail?.tab);
    const handleCreateOpenWebUITab = (event) => insertPinnedTab(event.detail?.tab);
    const handleCreateLibreChatTab = (event) => insertPinnedTab(event.detail?.tab);
    const handleCreateAgentZeroTab = (event) => insertPinnedTab(event.detail?.tab);
    const handleCreateOpenClawTab = (event) => insertPinnedTab(event.detail?.tab);
    const handleCreateOpenNotebookTab = (event) => insertPinnedTab(event.detail?.tab);

    window.addEventListener('create-anythingllm-tab', handleCreateAnythingLLMTab);
    window.addEventListener('create-openwebui-tab', handleCreateOpenWebUITab);
    window.addEventListener('create-librechat-tab', handleCreateLibreChatTab);
    window.addEventListener('create-agentzero-tab', handleCreateAgentZeroTab);
    window.addEventListener('create-openclaw-tab', handleCreateOpenClawTab);
    window.addEventListener('create-open-notebook-tab', handleCreateOpenNotebookTab);

    return () => {
      window.removeEventListener('create-audit-tab', handleCreateAuditTab);
      window.removeEventListener('create-terminal-tab', handleCreateTerminalTab);
      window.removeEventListener('create-anythingllm-tab', handleCreateAnythingLLMTab);
      window.removeEventListener('create-openwebui-tab', handleCreateOpenWebUITab);
      window.removeEventListener('create-librechat-tab', handleCreateLibreChatTab);
      window.removeEventListener('create-agentzero-tab', handleCreateAgentZeroTab);
      window.removeEventListener('create-openclaw-tab', handleCreateOpenClawTab);
      window.removeEventListener('create-open-notebook-tab', handleCreateOpenNotebookTab);
    };
  }, [
    nodes,
    setSshTabs,
    setLastOpenedTabKey,
    setOnCreateActivateTabKey,
    setActiveTabIndex,
    setGroupActiveIndices,
    setOpenTabOrder,
    activeGroupId,
    activeTabIndex,
    setActiveGroupId
  ]);

  // 15. Abrir herramienta de red como pestaña
  useEffect(() => {
    const handleOpenNetworkTool = (event) => {
      const { toolId, toolLabel } = event.detail || {};
      if (!toolId) return;

      const allTabs = getAllTabs();
      const existing = allTabs.find(t => t.type === 'network-tool' && t.toolId === toolId);

      if (existing) {
        setOnCreateActivateTabKey(existing.key);
      } else {
        const newTab = {
          key: `network-tool-${toolId}-${Date.now()}`,
          label: toolLabel || toolId,
          type: 'network-tool',
          toolId,
          groupId: null,
          createdAt: Date.now()
        };
        setSshTabs(prev => [newTab, ...prev]);
        setLastOpenedTabKey(newTab.key);
        setOnCreateActivateTabKey(newTab.key);
      }
    };

    window.addEventListener('open-network-tool', handleOpenNetworkTool);
    return () => {
      window.removeEventListener('open-network-tool', handleOpenNetworkTool);
    };
  }, [getAllTabs, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey]);

  // 16. Abrir configuración como pestaña
  useEffect(() => {
    const handleOpenSettingsTab = (event) => {
      const { mainTab, subTab } = event.detail || {};
      const allTabs = getAllTabs();
      const existing = allTabs.find(t => t.type === 'settings');

      if (existing) {
        setSshTabs(prev => prev.map(t => t.key === existing.key ? { ...t, mainTab, subTab } : t));
        setOnCreateActivateTabKey(existing.key);
      } else {
        const tabLabel = i18n.t('tooltips.settings') || 'Configuración';
        const newTab = {
          key: `settings-tab-${Date.now()}`,
          label: tabLabel,
          type: 'settings',
          mainTab,
          subTab,
          groupId: null,
          createdAt: Date.now()
        };
        setSshTabs(prev => [newTab, ...prev]);
        setLastOpenedTabKey(newTab.key);
        setOnCreateActivateTabKey(newTab.key);
      }
    };

    window.addEventListener('open-settings-tab', handleOpenSettingsTab);
    return () => {
      window.removeEventListener('open-settings-tab', handleOpenSettingsTab);
    };
  }, [getAllTabs, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey]);

  // 17. Cerrar pestañas bajo demanda
  useEffect(() => {
    const handleCloseTabEvent = (e) => {
      const tabKey = e.detail?.tabKey;
      if (!tabKey) return;
      const allTabs = getAllTabs();
      const tabToClose = allTabs.find(t => t.key === tabKey);
      if (tabToClose) {
        const idx = allTabs.indexOf(tabToClose);
        handleTabClose(tabToClose, idx, tabToClose.type === 'home');
      }
    };

    window.addEventListener('close-tab', handleCloseTabEvent);
    return () => {
      window.removeEventListener('close-tab', handleCloseTabEvent);
    };
  }, [getAllTabs, handleTabClose]);

  // 18. Callbacks RDP / Sidebar
  useEffect(() => {
    if (!sidebarCallbacksRef.current) {
      sidebarCallbacksRef.current = {};
    }

    sidebarCallbacksRef.current.showProtocolSelection = () => {
      setShowProtocolSelectionDialog(true);
    };
    sidebarCallbacksRef.current.createSSH = (targetFolder = null) => {
      window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog'));
    };
    sidebarCallbacksRef.current.editRDP = (node) => {
      openEditRdpDialog(node);
    };
    sidebarCallbacksRef.current.editSSH = (node) => {
      openEditSSHDialog(node);
    };
    sidebarCallbacksRef.current.connectRDP = (node) => {
      onOpenRdpConnection(node);
    };
    sidebarCallbacksRef.current.editVNC = (node) => {
      openEditVncDialog(node);
    };
    sidebarCallbacksRef.current.connectVNC = (node) => {
      onOpenVncConnection(node);
    };
    sidebarCallbacksRef.current.openFileConnection = (node, nodesList) => {
      onOpenFileConnection(node, nodesList);
    };
    sidebarCallbacksRef.current.editFileConnection = (node) => {
      openEditFileConnectionDialog(node);
    };
    sidebarCallbacksRef.current.openSSHTunnel = (node, nodesList) => {
      onOpenSSHTunnel(node, nodesList);
    };
    sidebarCallbacksRef.current.editSSHTunnel = (node) => {
      if (openEditSSHTunnelDialog) {
        openEditSSHTunnelDialog(node);
      }
    };
    sidebarCallbacksRef.current.duplicateSSHTunnel = (node) => {
      if (duplicateSSHTunnel) {
        duplicateSSHTunnel(node);
      }
    };
    if (!sidebarCallbacksRef.current.deleteNode) {
      sidebarCallbacksRef.current.deleteNode = (nodeKey, nodeLabel) => {
        const nodeInfo = findParentNodeAndIndex ? findParentNodeAndIndex(nodes, nodeKey) : { node: null };
        const hasChildren = !!(nodeInfo?.node && Array.isArray(nodeInfo.node.children) && nodeInfo.node.children.length);
        if (confirmDeleteNode) {
          confirmDeleteNode(nodeKey, nodeLabel, hasChildren, nodes, setNodes);
        }
      };
    }
  }, [
    nodes,
    setNodes,
    findParentNodeAndIndex,
    confirmDeleteNode,
    sidebarCallbacksRef,
    openEditFileConnectionDialog,
    onOpenSSHTunnel,
    openEditSSHTunnelDialog,
    duplicateSSHTunnel,
    setShowProtocolSelectionDialog,
    openEditRdpDialog,
    openEditSSHDialog,
    onOpenRdpConnection,
    openEditVncDialog,
    onOpenVncConnection,
    onOpenFileConnection
  ]);

  // 19. Guardar conexión de archivos
  useEffect(() => {
    const handleSaveFileConnection = (event) => {
      const fileData = event.detail;
      if (fileData && handleSaveFileConnectionToSidebar) {
        handleSaveFileConnectionToSidebar(fileData, false, null);
      }
    };

    window.addEventListener('save-file-connection', handleSaveFileConnection);
    return () => {
      window.removeEventListener('save-file-connection', handleSaveFileConnection);
    };
  }, [handleSaveFileConnectionToSidebar]);

  const handleEditConnectionFromUsers = useCallback((node) => {
    if (!node) return;
    const type = node.type || node.data?.type;

    if (type === 'rdp' || type === 'rdp-guacamole') {
      openEditRdpDialog(node);
      return;
    }
    if (type === 'vnc' || type === 'vnc-guacamole') {
      openEditVncDialog(node);
      return;
    }
    if (type === 'sftp' || type === 'ftp' || type === 'scp') {
      openEditFileConnectionDialog(node);
      return;
    }
    if (type === 'ssh-tunnel') {
      if (openEditSSHTunnelDialog) {
        openEditSSHTunnelDialog(node);
      }
      return;
    }
    openEditSSHDialog(node);
  }, [openEditRdpDialog, openEditVncDialog, openEditFileConnectionDialog, openEditSSHTunnelDialog, openEditSSHDialog]);

  // 20. Abrir diálogo unificado de nueva conexión
  useEffect(() => {
    const handleOpenNewUnifiedConnectionDialog = (e) => {
      const activeTab = e?.detail?.activeTab;
      const initialCategory = e?.detail?.initialCategory;

      if (initialCategory) return;

      if (activeTab === 'password') {
        if (setShowUnifiedConnectionDialog) {
          setShowUnifiedConnectionDialog(true);
          window.__unifiedDialogActiveTab = 'password';
        }
      } else if (openNewUnifiedConnectionDialog) {
        openNewUnifiedConnectionDialog();
      }
    };

    window.addEventListener('open-new-unified-connection-dialog', handleOpenNewUnifiedConnectionDialog);
    return () => {
      window.removeEventListener('open-new-unified-connection-dialog', handleOpenNewUnifiedConnectionDialog);
    };
  }, [openNewUnifiedConnectionDialog, setShowUnifiedConnectionDialog]);

  // 21. Abrir diálogo de herramientas de red
  useEffect(() => {
    const handleOpenNetworkTools = () => {
      setShowNetworkToolsDialog(true);
    };

    window.addEventListener('open-network-tools-dialog', handleOpenNetworkTools);
    return () => {
      window.removeEventListener('open-network-tools-dialog', handleOpenNetworkTools);
    };
  }, [setShowNetworkToolsDialog]);

  // 22. Reactivación automática de rdpTabs
  useEffect(() => {
    if (activatingNowRef.current || onCreateActivateTabKey || lastOpenedTabKey) return;
    if (rdpTabs.length > 0) {
      const allTabs = getAllTabs();
      const lastRdpTab = rdpTabs[rdpTabs.length - 1];
      const rdpTabIndex = allTabs.findIndex(tab => tab.key === lastRdpTab.key);
      if (rdpTabIndex !== -1) {
        setActiveTabIndex(rdpTabIndex);
      }
    }
  }, [rdpTabs, onCreateActivateTabKey, lastOpenedTabKey, openTabOrder, activatingNowRef, getAllTabs, setActiveTabIndex]);

  // 23. Auto-guardar contraseña correcta de SSH
  useEffect(() => {
    const handlePasswordCorrect = (event) => {
      const { originalKey, password } = event.detail;
      if (!originalKey || !password) return;

      setNodes(prevNodes => {
        const updatePasswordInNodes = (nodesList) => {
          return nodesList.map(node => {
            if (node.key === originalKey) {
              return {
                ...node,
                data: {
                  ...node.data,
                  password: password
                }
              };
            }
            if (node.children && node.children.length > 0) {
              return {
                ...node,
                children: updatePasswordInNodes(node.children)
              };
            }
            return node;
          });
        };
        return updatePasswordInNodes(prevNodes);
      });

      try {
        const node = findNodeByKey(nodes, originalKey);
        if (node && node.data) {
          const oldConnection = connectionStore.helpers.fromSidebarNode(node);
          const newConnection = connectionStore.helpers.fromSidebarNode({
            ...node,
            data: {
              ...node.data,
              password: password
            }
          });
          connectionStore.updateFavoriteOnEdit(oldConnection, newConnection);
          connectionStore.recordRecent(newConnection);
        }
      } catch (e) {
        console.warn('Error actualizando stores de conexión tras password manual:', e);
      }

      if (toast?.current?.show) {
        toast.current.show({
          severity: 'success',
          summary: 'Password guardado',
          detail: 'El password se ha actualizado automáticamente.',
          life: 3000
        });
      }
    };

    window.addEventListener('ssh:password-correct', handlePasswordCorrect);
    return () => window.removeEventListener('ssh:password-correct', handlePasswordCorrect);
  }, [nodes, setNodes, findNodeByKey, toast]);

  // 24. Zoom de fuente con Ctrl + rueda de ratón en terminales
  useEffect(() => {
    const handleWheel = (e) => {
      if (!e.ctrlKey) return;

      const target = e.target;
      const el = target instanceof Element ? target : (target?.nodeType === 3 ? target.parentElement : null);
      if (!el) return;

      const isOverTerminal = Boolean(
        el.closest?.('.xterm') ||
        el.closest?.('.terminal-outer-padding') ||
        el.closest?.('.terminal-container') ||
        el.closest?.('.terminal-frame') ||
        el.closest?.('.xterm-screen') ||
        el.closest?.('.xterm-viewport') ||
        el.closest?.('[class*="terminal"]') ||
        el.closest?.('[class*="xterm"]') ||
        el.classList?.contains('xterm') ||
        el.classList?.contains('terminal-outer-padding')
      );

      if (!isOverTerminal) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 1 : (e.deltaY > 0 ? -1 : 0);
      if (delta === 0) return;
      const step = 1;

      const updateFontSize = (currentSize, setter, storageKey, min = 8, max = 32) => {
        const parsed = parseInt(currentSize, 10);
        const validCurrent = isNaN(parsed) ? 14 : parsed;
        const newSize = Math.max(min, Math.min(max, validCurrent + (delta * step)));
        if (newSize !== validCurrent) {
          if (typeof setter === 'function') {
            setter(newSize);
          }
          localStorage.setItem(storageKey, newSize.toString());
          if (storageKey === 'basicapp_font_size' || storageKey === 'basicapp_terminal_font_size') {
            localStorage.setItem('basicapp_font_size', newSize.toString());
            localStorage.setItem('basicapp_terminal_font_size', newSize.toString());
            try {
              document.documentElement.style.setProperty('--terminal-font-size', `${newSize}px`);
            } catch { }
          }
          window.dispatchEvent(new CustomEvent('localStorageChange', {
            detail: { key: storageKey, value: newSize.toString() }
          }));
          window.dispatchEvent(new CustomEvent('font-size-changed', {
            detail: { fontSize: newSize, storageKey }
          }));
          window.dispatchEvent(new CustomEvent('terminal-settings-changed', {
            detail: { [storageKey]: newSize, fontSize: newSize }
          }));
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: newSize.toString()
          }));
        }
        return newSize;
      };

      const currentSSHSize = parseInt(fontSize, 10) || parseInt(localStorage.getItem('basicapp_font_size'), 10) || 14;
      updateFontSize(currentSSHSize, setFontSize, 'basicapp_font_size');

      const currentLocalSize = parseInt(localFontSize, 10) || parseInt(localStorage.getItem('basicapp_local_terminal_font_size'), 10) || 14;
      updateFontSize(currentLocalSize, setLocalFontSize, 'basicapp_local_terminal_font_size');

      const currentLinuxSize = parseInt(localStorage.getItem('nodeterm_linux_font_size') || localFontSize || '14', 10);
      const newLinuxSize = updateFontSize(currentLinuxSize, () => { }, 'nodeterm_linux_font_size');
      window.dispatchEvent(new CustomEvent('terminal-settings-changed', {
        detail: { linuxFontSize: newLinuxSize }
      }));

      const currentDockerSize = parseInt(dockerFontSize, 10) || parseInt(localStorage.getItem('nodeterm_docker_font_size'), 10) || 14;
      updateFontSize(currentDockerSize, setDockerFontSize, 'nodeterm_docker_font_size');
    };

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [fontSize, setFontSize, localFontSize, setLocalFontSize, dockerFontSize, setDockerFontSize]);

  return {
    promoteAndActivateTab,
    activateTabSynchronously,
    handleOpenEditConnectionTab,
    handleSyncActiveEditTabFromSidebar,
    handleOpenNewConnectionTab,
    openEditSSHDialog,
    openEditRdpDialog,
    openEditVncDialog,
    openEditFileConnectionDialog,
    openEditSSHTunnelDialog,
    handleEditConnectionFromUsers
  };
};

export default useGlobalAppEvents;
