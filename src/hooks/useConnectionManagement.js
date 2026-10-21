import { useCallback } from 'react';
import connectionStore from '../utils/connectionStore';
import { findConnectionInTree, resolveWantedTreeId } from '../utils/findConnectionInTree';
import { normalizeRdpColorDepth, resolveRdpScreenDimensions } from '../utils/rdpScreenConfig';
import { writeText as clipboardWriteText } from '../utils/clipboard';

const SSH_LIKE_TYPES = ['ssh', 'sftp', 'ftp', 'scp', 'explorer'];

function showConnectionWarn(toast, summary, detail) {
  try {
    toast?.current?.show?.({ severity: 'warn', summary, detail, life: 5000 });
    window.toast?.current?.show?.({ severity: 'warn', summary, detail, life: 5000 });
  } catch (_) { /* noop */ }
}

function connectionWantsEmbed(nodeOrConn) {
  return !!(nodeOrConn && (nodeOrConn.embedInHome || nodeOrConn.data?.embedInHome));
}

function focusHomeSessionPanel(tabKey) {
  if (!tabKey || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('focus-home-session-panel', { detail: { key: tabKey } }));
}

function showExistingTabNotice(toast, summary) {
  try {
    toast?.current?.show?.({
      severity: 'info',
      summary,
      detail: 'Ya existe una pestaña para esta conexión',
      life: 3000
    });
  } catch (_) { /* noop */ }
}

export const useConnectionManagement = ({
  // Estados del hook de pestañas
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setOpenTabOrder,

  // Estados de pestañas
  sshTabs,
  setSshTabs,
  rdpTabs,
  setRdpTabs,

  // Toast para notificaciones
  toast,

  /** Árbol de conexiones actual (vault); Home/recientes no lo pasan como argumento */
  getConnectionTree
}) => {
  const resolveTree = (nodesArg) => (
    (Array.isArray(nodesArg) && nodesArg.length > 0)
      ? nodesArg
      : (typeof getConnectionTree === 'function' ? (getConnectionTree() || []) : [])
  );

  const releaseActiveGroup = useCallback((embedInHome) => {
    if (embedInHome) return;
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId]);

  const publishNewTab = useCallback((tabId, embedInHome) => {
    if (embedInHome) return;
    setLastOpenedTabKey(tabId);
    setOnCreateActivateTabKey(tabId);
    setActiveTabIndex(1);
    setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
    setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
  }, [setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setGroupActiveIndices, setOpenTabOrder]);

  // === FUNCIÓN PARA ABRIR EXPLORADOR DE ARCHIVOS ===
  const openFileExplorer = useCallback((fileNode) => {
    // Detectar si es SSH tradicional o conexión de archivos (SFTP/FTP/SCP)
    const nodeType = fileNode.data?.type || 'ssh';
    const isFileConnection = nodeType === 'sftp' || nodeType === 'ftp' || nodeType === 'scp';
    const protocol = fileNode.data?.protocol || nodeType;

    // Registrar reciente
    try {
      connectionStore.recordRecent({
        type: isFileConnection ? protocol : 'explorer',
        name: fileNode.label,
        host: fileNode.data?.host,
        username: fileNode.data?.user || fileNode.data?.username,
        port: fileNode.data?.port || (protocol === 'ftp' ? 21 : 22),
        originalKey: fileNode.key,
        connectionId: fileNode.key,
        password: '',
        protocol: isFileConnection ? protocol : undefined,
        useBastionWallix: fileNode.data?.useBastionWallix || false,
        bastionHost: fileNode.data?.bastionHost || '',
        bastionUser: fileNode.data?.bastionUser || '',
        targetServer: fileNode.data?.targetServer || '',
        remoteFolder: fileNode.data?.remoteFolder || '',
        customIcon: fileNode.data?.customIcon || null
      }, 200);
    } catch (e) { /* noop */ }

    const embedInHome = connectionWantsEmbed(fileNode);

    // Buscar si ya existe un explorador para este host+usuario+protocolo
    const existingExplorer = sshTabs.find(tab =>
      tab.isExplorerInSSH &&
      tab.sshConfig.host === fileNode.data.host &&
      tab.sshConfig.username === (fileNode.data.user || fileNode.data.username) &&
      tab.sshConfig.protocol === (isFileConnection ? protocol : undefined)
    );

    if (existingExplorer) {
      if (embedInHome) {
        if (existingExplorer.embedInHome) {
          focusHomeSessionPanel(existingExplorer.key);
        } else {
          showExistingTabNotice(toast, 'Archivos');
        }
        return;
      }
      if (existingExplorer.embedInHome) {
        setSshTabs(prev => prev.map(tab => (
          tab.key === existingExplorer.key ? { ...tab, embedInHome: false } : tab
        )));
        publishNewTab(existingExplorer.key, false);
        return;
      }
      const existingExplorerIndex = sshTabs.findIndex(tab => tab.key === existingExplorer.key);
      if (existingExplorerIndex !== -1) setActiveTabIndex(existingExplorerIndex);
      return;
    }

    // Crear el explorador
    const explorerTabId = `explorer_${fileNode.key}_${Date.now()}`;
    const config = {
      host: fileNode.data.useBastionWallix ? fileNode.data.targetServer : fileNode.data.host,
      username: fileNode.data.user || fileNode.data.username,
      password: fileNode.data.password,
      port: fileNode.data.port || (protocol === 'ftp' ? 21 : 22),
      originalKey: fileNode.key,
      // Protocolo para SFTP/FTP/SCP
      protocol: isFileConnection ? protocol : undefined,
      // Datos del bastión Wallix (si aplica)
      useBastionWallix: fileNode.data.useBastionWallix || false,
      bastionHost: fileNode.data.bastionHost || '',
      bastionUser: fileNode.data.bastionUser || ''
    };

    const nowTs = Date.now();
    const newExplorerTab = {
      key: explorerTabId,
      label: fileNode.label,
      originalKey: fileNode.key,
      sshConfig: config, // Mantener nombre sshConfig para compatibilidad
      type: 'explorer',
      customIcon: fileNode.data?.customIcon || null,
      createdAt: nowTs,
      needsOwnConnection: false,
      isExplorerInSSH: true,
      groupId: null,
      ...(embedInHome ? { embedInHome: true } : {})
    };

    // Insertar y activar como última abierta (embebida: se queda en Home)
    setSshTabs(prevSshTabs => [newExplorerTab, ...prevSshTabs]);
    publishNewTab(explorerTabId, embedInHome);
  }, [sshTabs, setSshTabs, setActiveTabIndex, publishNewTab, toast]);

  // === FUNCIÓN PARA ABRIR CONEXIONES DE ARCHIVOS (SFTP/FTP/SCP) ===
  const onOpenFileConnection = useCallback((node, nodesArg) => {
    const nodes = resolveTree(nodesArg);
    const embedInHome = connectionWantsEmbed(node);
    releaseActiveGroup(embedInHome);

    let fileNode = node;
    // Historial/favoritos sin .data: resolver credenciales desde el vault
    if (!node?.data) {
      const protocol = node.protocol || node.type || 'sftp';
      const matched = findConnectionInTree(nodes, {
        wantedId: node.originalKey || node.connectionId || node.key || node.id,
        types: ['sftp', 'ftp', 'scp', 'ssh', 'explorer'],
        host: node.host || node.hostname,
        username: node.username || node.user,
        port: node.port || (protocol === 'ftp' ? 21 : 22),
        bastionHost: node.bastionHost,
        bastionUser: node.bastionUser,
        targetServer: node.targetServer
      });
      if (!matched?.data) {
        showConnectionWarn(toast, 'Archivos', 'No se encontraron credenciales en el vault para esta conexión.');
        return;
      }
      fileNode = {
        key: matched.key,
        label: node.name || node.label || matched.label,
        ...(embedInHome ? { embedInHome: true } : {}),
        data: {
          ...matched.data,
          type: matched.data.type === 'ssh' ? 'sftp' : (matched.data.type || protocol),
          protocol: matched.data.protocol || (matched.data.type === 'ssh' ? 'sftp' : matched.data.type) || protocol
        }
      };
    }

    const protocol = fileNode.data?.protocol || fileNode.data?.type || 'sftp';
    const host = fileNode.data?.host || '';
    const username = fileNode.data?.user || fileNode.data?.username || '';
    const port = fileNode.data?.port || (protocol === 'ftp' ? 21 : 22);

    if (!fileNode.data?.password && !fileNode.data?.privateKey) {
      showConnectionWarn(toast, 'Archivos', 'No se encontró la contraseña/clave en el vault. Ábrela desde el árbol de conexiones.');
      return;
    }

    // Registrar como reciente
    try {
      connectionStore.recordRecent({
        type: protocol,
        name: fileNode.label || fileNode.name,
        host: host,
        username: username,
        port: port,
        originalKey: fileNode.key,
        connectionId: fileNode.key,
        password: '',
        protocol: protocol,
        remoteFolder: fileNode.data?.remoteFolder || '',
        targetFolder: fileNode.data?.targetFolder || '',
        customIcon: fileNode.data?.customIcon || null
      }, 200);
    } catch (e) { /* noop */ }

    openFileExplorer(fileNode);
  }, [openFileExplorer, releaseActiveGroup, toast]);

  // === FUNCIÓN PARA ABRIR TÚNELES SSH ===
  const onOpenSSHTunnel = useCallback((nodeOrConn, nodesArg) => {
    const nodes = resolveTree(nodesArg);
    const embedInHome = connectionWantsEmbed(nodeOrConn);
    releaseActiveGroup(embedInHome);

    // Permitir recibir un nodo de sidebar (con .data) o un objeto de conexión directo (desde Home/Favoritos)
    const isSidebarNode = !!(nodeOrConn && nodeOrConn.data);
    let data = isSidebarNode ? nodeOrConn.data : nodeOrConn;
    const label = isSidebarNode ? nodeOrConn.label : nodeOrConn.name;
    let key = isSidebarNode
      ? nodeOrConn.key
      : (nodeOrConn.originalKey || nodeOrConn.connectionId || nodeOrConn.key || nodeOrConn.id || `tunnel_${Date.now()}`);

    // Favoritos/recientes: siempre resolver credenciales desde el vault (como SSH)
    if (!isSidebarNode) {
      const matched = findConnectionInTree(nodes, {
        wantedId: nodeOrConn.originalKey || nodeOrConn.connectionId || nodeOrConn.key || nodeOrConn.id,
        types: ['ssh-tunnel'],
        host: data?.sshHost || data?.host,
        username: data?.sshUser || data?.username || data?.user,
        port: data?.sshPort || data?.port || 22,
        localPort: data?.localPort,
        remotePort: data?.remotePort
      });
      if (matched?.data) {
        const vault = matched.data;
        data = {
          ...data,
          ...vault,
          // Credenciales del vault ganan sobre historial vacío
          sshPassword: vault.sshPassword || vault.password || data?.sshPassword || data?.password || '',
          privateKeyPath: vault.privateKeyPath || vault.privateKey || data?.privateKeyPath || '',
          passphrase: vault.passphrase || data?.passphrase || ''
        };
        key = matched.key || key;
      }
    }

    // Preparar configuración del túnel
    const tunnelConfig = {
      name: label,
      tunnelType: data?.tunnelType || 'local',
      sshHost: data?.sshHost || '',
      sshPort: data?.sshPort || 22,
      sshUser: data?.sshUser || '',
      sshPassword: data?.sshPassword || data?.password || '',
      authType: data?.authType || 'password',
      privateKeyPath: data?.privateKeyPath || data?.privateKey || '',
      passphrase: data?.passphrase || '',
      localHost: data?.localHost || '127.0.0.1',
      localPort: data?.localPort || 0,
      remoteHost: data?.remoteHost || '',
      remotePort: data?.remotePort || 0,
      bindHost: data?.bindHost || '0.0.0.0',
      nodeKey: key
    };

    const authByKey = tunnelConfig.authType === 'key' || !!String(tunnelConfig.privateKeyPath || '').trim();
    if (!String(tunnelConfig.sshPassword || '').trim() && !authByKey) {
      showConnectionWarn(toast, 'Túnel SSH', 'No se encontró la contraseña del túnel en el vault. Ábrelo desde el árbol de conexiones.');
      return;
    }

    // Registrar como reciente (SSH Tunnel) sin secretos
    try {
      connectionStore.recordRecent({
        type: 'ssh-tunnel',
        name: tunnelConfig.name,
        tunnelType: tunnelConfig.tunnelType,
        sshHost: tunnelConfig.sshHost,
        sshPort: tunnelConfig.sshPort,
        sshUser: tunnelConfig.sshUser,
        originalKey: key,
        connectionId: key,
        authType: tunnelConfig.authType,
        localHost: tunnelConfig.localHost,
        localPort: tunnelConfig.localPort,
        remoteHost: tunnelConfig.remoteHost,
        remotePort: tunnelConfig.remotePort,
        bindHost: tunnelConfig.bindHost,
        customIcon: data?.customIcon || null
      }, 200);
    } catch (e) { /* noop */ }

    // Crear nueva pestaña de túnel SSH
    const nowTs = Date.now();
    const tunnelTabId = `ssh-tunnel-${key}-${nowTs}`;

    const newTunnelTab = {
      key: tunnelTabId,
      type: 'ssh-tunnel',
      tunnelConfig: tunnelConfig,
      label: label || 'Túnel SSH',
      createdAt: nowTs,
      nodeKey: key,
      ...(embedInHome ? { embedInHome: true } : {})
    };

    setSshTabs(prevSshTabs => [newTunnelTab, ...prevSshTabs]);
    publishNewTab(tunnelTabId, embedInHome);
  }, [setSshTabs, releaseActiveGroup, publishNewTab, toast]);

  // === FUNCIÓN PARA ABRIR CONEXIONES SSH ===
  const onOpenSSHConnection = useCallback((nodeOrConn, nodesArg) => {
    const nodes = resolveTree(nodesArg);
    // Permitir recibir un nodo de sidebar (con .data) o un objeto de conexión directo (desde Home/Favoritos)
    const isSidebarNode = !!(nodeOrConn && nodeOrConn.data);
    const conn = isSidebarNode ? {
      type: nodeOrConn.data?.type || 'ssh',
      name: nodeOrConn.label,
      host: nodeOrConn.data?.useBastionWallix ? nodeOrConn.data?.targetServer : nodeOrConn.data?.host,
      username: nodeOrConn.data?.user || nodeOrConn.data?.username,
      port: nodeOrConn.data?.port || 22,
      originalKey: nodeOrConn.key,
      iconId: nodeOrConn.data?.iconId || nodeOrConn.data?.customIcon || nodeOrConn.data?.sshIcon
    } : {
      type: nodeOrConn?.type || 'ssh',
      name: nodeOrConn?.name,
      host: nodeOrConn?.host,
      username: nodeOrConn?.username || nodeOrConn?.user,
      port: nodeOrConn?.port || 22,
      originalKey: nodeOrConn?.originalKey || nodeOrConn?.connectionId || nodeOrConn?.key || nodeOrConn?.id || `manual_${Date.now()}`,
      iconId: nodeOrConn?.iconId || nodeOrConn?.customIcon || nodeOrConn?.sshIcon
    };

    // Favoritos/recientes: resolver siempre desde el vault (password/privateKey/Jump/Wallix)
    let matchedSidebarNode = isSidebarNode ? nodeOrConn : null;
    if (!isSidebarNode) {
      matchedSidebarNode = findConnectionInTree(nodes, {
        wantedId: nodeOrConn.originalKey || nodeOrConn.connectionId || nodeOrConn.key || nodeOrConn.id,
        types: SSH_LIKE_TYPES,
        host: conn.host,
        username: conn.username,
        port: conn.port,
        bastionHost: nodeOrConn.bastionHost,
        bastionUser: nodeOrConn.bastionUser,
        targetServer: nodeOrConn.targetServer
      });
      if (matchedSidebarNode?.key) {
        conn.originalKey = matchedSidebarNode.key;
      }
    }

    const vault = matchedSidebarNode?.data || {};
    const password = isSidebarNode
      ? (nodeOrConn.data.password || '')
      : (vault.password || nodeOrConn.password || '');
    const privateKey = isSidebarNode
      ? (nodeOrConn.data.privateKey || '')
      : (vault.privateKey || nodeOrConn.privateKey || '');
    const authMethod = isSidebarNode
      ? (nodeOrConn.data.authMethod || (nodeOrConn.data.privateKey?.trim() ? 'key' : 'password'))
      : (vault.authMethod || nodeOrConn.authMethod || (privateKey?.trim() ? 'key' : 'password'));
    const autoCopyPassword = isSidebarNode
      ? (nodeOrConn.data.autoCopyPassword || false)
      : (vault.autoCopyPassword || false);

    const pick = (sidebarKey, histKey) => (
      isSidebarNode
        ? (nodeOrConn.data?.[sidebarKey] ?? '')
        : (vault[sidebarKey] ?? nodeOrConn[histKey || sidebarKey] ?? '')
    );
    const useBastionWallix = !!(isSidebarNode ? nodeOrConn.data.useBastionWallix : (vault.useBastionWallix || nodeOrConn.useBastionWallix));
    const bastionHost = pick('bastionHost');
    const bastionUser = pick('bastionUser');
    const targetServer = pick('targetServer');
    const remoteFolder = pick('remoteFolder');
    const customIcon = isSidebarNode
      ? (nodeOrConn.data?.customIcon || null)
      : (vault.customIcon || nodeOrConn.customIcon || null);
    const jumpPassword = isSidebarNode
      ? (nodeOrConn.data.jumpPassword || '')
      : (vault.jumpPassword || '');
    const jumpPrivateKey = isSidebarNode
      ? (nodeOrConn.data.jumpPrivateKey || '')
      : (vault.jumpPrivateKey || '');

    // Si es un favorito de tipo Explorer o de transferencia de archivos, abrir explorador
    if (['explorer', 'sftp', 'ftp', 'scp'].includes(conn.type)) {
      if (!password && !privateKey) {
        showConnectionWarn(toast, 'Archivos', 'No se encontró la contraseña/clave en el vault. Ábrela desde el árbol de conexiones.');
        return;
      }
      const sourceData = isSidebarNode ? nodeOrConn.data : nodeOrConn;
      const fallbackData = (!isSidebarNode && matchedSidebarNode) ? matchedSidebarNode.data : {};

      const pseudoNode = {
        label: conn.name,
        ...(connectionWantsEmbed(nodeOrConn) ? { embedInHome: true } : {}),
        data: {
          ...fallbackData,
          ...sourceData,
          host: vault.host || conn.host,
          user: vault.user || vault.username || conn.username,
          port: vault.port || conn.port,
          type: conn.type === 'explorer' ? 'ssh' : conn.type,
          protocol: conn.type === 'explorer' ? 'sftp' : conn.type,
          password,
          privateKey,
          authMethod,
          useBastionWallix,
          bastionHost,
          bastionUser,
          targetServer,
          remoteFolder
        },
        key: conn.originalKey
      };
      openFileExplorer(pseudoNode);
      return;
    }

    // Auth por password sin credencial del vault → abortar (no enviar vacío)
    if (authMethod !== 'key' && !password && !privateKey) {
      showConnectionWarn(toast, 'SSH', 'No se encontró la contraseña en el vault. Ábrela desde el árbol de conexiones o edita la entrada.');
      return;
    }

    // Copiar password automáticamente si está configurado (UI clipboard; no MCP)
    if (autoCopyPassword && password) {
      try {
        clipboardWriteText(password);

        // Mostrar notificación si está disponible
        if (window.toast?.current?.show) {
          window.toast.current.show({
            severity: 'success',
            summary: 'Password copiado',
            detail: 'Contraseña copiada al portapapeles automáticamente',
            life: 2000
          });
        }
      } catch (err) {
        console.error('Error copiando password automáticamente:', err);
      }
    }

    // Registrar como reciente (SSH) sin secretos; originalKey apunta al vault
    try {
      connectionStore.recordRecent({
        type: 'ssh',
        name: conn.name,
        host: conn.host,
        username: conn.username,
        port: conn.port,
        originalKey: conn.originalKey,
        connectionId: conn.originalKey,
        password: '',
        privateKey: '',
        authMethod,
        useBastionWallix,
        bastionHost,
        bastionUser,
        targetServer,
        remoteFolder,
        customIcon
      }, 200);
    } catch (e) { /* noop */ }

    const embedInHome = connectionWantsEmbed(nodeOrConn);
    releaseActiveGroup(embedInHome);
    setSshTabs(prevTabs => {
      const nowTs = Date.now();
      const tabId = `${conn.originalKey}_${nowTs}`;
      const sshConfig = {
        host: conn.host,
        username: conn.username,
        password,
        privateKey,
        authMethod,
        port: conn.port,
        originalKey: conn.originalKey,
        name: conn.name,
        useBastionWallix,
        bastionHost,
        bastionUser,
        targetServer,
        remoteFolder,
        x11Forwarding: !!(isSidebarNode ? nodeOrConn.data.x11Forwarding : vault.x11Forwarding),
        agentForwarding: !!(isSidebarNode ? nodeOrConn.data.agentForwarding : vault.agentForwarding),
        autoRecording: !!(isSidebarNode ? nodeOrConn.data.autoRecording : vault.autoRecording),
        proxyJumpEnabled: !!(isSidebarNode ? nodeOrConn.data.proxyJumpEnabled : vault.proxyJumpEnabled),
        jumpHost: isSidebarNode ? (nodeOrConn.data.jumpHost || '') : (vault.jumpHost || ''),
        jumpPort: isSidebarNode ? (nodeOrConn.data.jumpPort || 22) : (vault.jumpPort || 22),
        jumpUser: isSidebarNode ? (nodeOrConn.data.jumpUser || '') : (vault.jumpUser || ''),
        jumpAuthMethod: isSidebarNode ? (nodeOrConn.data.jumpAuthMethod || 'password') : (vault.jumpAuthMethod || 'password'),
        jumpPassword,
        jumpPrivateKey,
        hostKeyPolicy: isSidebarNode ? (nodeOrConn.data.hostKeyPolicy || 'warn_new') : (vault.hostKeyPolicy || nodeOrConn.hostKeyPolicy || 'warn_new')
      };
      const newTab = {
        key: tabId,
        label: conn.name,
        originalKey: conn.originalKey,
        iconId: conn.iconId,
        sshConfig: sshConfig,
        type: 'terminal',
        createdAt: nowTs,
        groupId: null,
        ...(embedInHome ? { embedInHome: true } : {})
      };

      // Iniciar grabación automática si está habilitada global o por conexión
      const autoRecordingEnabled = sshConfig.autoRecording === true
        || localStorage.getItem('audit_auto_recording') === 'true';
      if (autoRecordingEnabled && window.electron?.ipcRenderer) {
        const recordingQuality = localStorage.getItem('audit_recording_quality') || 'medium';
        const encryptRecordings = localStorage.getItem('audit_encrypt_recordings') === 'true';

        const recordingMetadata = {
          host: sshConfig.useBastionWallix ? sshConfig.bastionHost : sshConfig.host,
          username: sshConfig.useBastionWallix ? sshConfig.bastionUser : sshConfig.username,
          port: sshConfig.port || 22,
          connectionType: 'ssh',
          useBastionWallix: sshConfig.useBastionWallix || false,
          bastionHost: sshConfig.bastionHost || null,
          bastionUser: sshConfig.bastionUser || null,
          sessionName: `${conn.name}_${nowTs}`,
          title: `${sshConfig.username}@${sshConfig.host}`,
          cols: 80,
          rows: 24,
          shell: '/bin/bash'
        };

        // Iniciar grabación de forma asíncrona
        window.electron.ipcRenderer.invoke('recording:start', {
          tabId: tabId,
          metadata: recordingMetadata
        }).then(result => {
          if (result?.success && result.recordingId) {
            const recordingId = result.recordingId;
            setSshTabs(prev => prev.map(tab => (
              tab.key === tabId ? { ...tab, recordingId } : tab
            )));
          } else if (result && result.success === false) {
            console.warn('⚠️ Error iniciando grabación automática:', result.error);
          }
        }).catch(error => {
          console.error('Error iniciando grabación automática:', error);
        });
      }
      publishNewTab(tabId, embedInHome);
      return [newTab, ...prevTabs];
    });
  }, [setSshTabs, openFileExplorer, releaseActiveGroup, publishNewTab, toast]);

  // === FUNCIÓN PARA ABRIR CONEXIONES RDP ===
  const onOpenRdpConnection = useCallback((node, nodesArg) => {
    const nodes = resolveTree(nodesArg);
    const embedInHome = connectionWantsEmbed(node);
    releaseActiveGroup(embedInHome);

    // Detectar si es RDP integrado (IronRDP / Guacamole) o RDP nativo externo (mstsc)
    // Manejar tanto conexiones desde sidebar (node.data) como desde ConnectionHistory (node directo)
    const nodeData = node.data || node; // Fallback para ConnectionHistory

    // Si viene desde Favoritos/Recientes (sin .data), usar la información guardada como primera opción
    let baseRdp = nodeData;
    if (!node.data) {
      // Para conexiones de favoritos, usar la información guardada directamente
      const hostValue = node.host || node.hostname || node.server || '';
      baseRdp = {
        ...node, // Preserve all original properties first
        server: hostValue,
        host: hostValue,
        hostname: hostValue,
        username: node.username || node.user,
        user: node.username || node.user,
        password: node.password || '',
        port: parseInt(node.port || 3389, 10),
        clientType: node.clientType || 'web-rdp',
        type: node.type || 'rdp-guacamole',
        domain: node.domain || '',
        resolution: node.resolution || '1024x768',
        colors: node.colors || '32',
        // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
        guacEnableWallpaper: node.guacEnableWallpaper || node.enableWallpaper || false,
        guacEnableDesktopComposition: node.guacEnableDesktopComposition || node.enableDesktopComposition || false,
        guacEnableFontSmoothing: node.guacEnableFontSmoothing || node.enableFontSmoothing || false,
        guacEnableTheming: node.guacEnableTheming || node.enableTheming || false,
        guacEnableFullWindowDrag: node.guacEnableFullWindowDrag || node.enableFullWindowDrag || false,
        guacEnableMenuAnimations: node.guacEnableMenuAnimations || node.enableMenuAnimations || false,
        guacEnableGfx: node.guacEnableGfx || node.enableGfx || false,
        ironRdpGraphics: node.ironRdpGraphics === 'bitmap' ? 'bitmap' : 'egfx',
        bastionLogicalDesktop: node.bastionLogicalDesktop !== false,
        guacDisableGlyphCaching: node.guacDisableGlyphCaching || node.disableGlyphCaching || false,
        guacDisableOffscreenCaching: node.guacDisableOffscreenCaching || node.disableOffscreenCaching || false,
        guacDisableBitmapCaching: node.guacDisableBitmapCaching || node.disableBitmapCaching || false,
        guacDisableCopyRect: node.guacDisableCopyRect || node.disableCopyRect || false,
        autoResize: node.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
        guacDpi: node.guacDpi || 96,
        guacSecurity: node.guacSecurity || 'any',
        redirectFolders: node.redirectFolders !== false,
        redirectClipboard: node.redirectClipboard !== false,
        redirectPrinters: node.redirectPrinters || false,
        redirectAudio: node.redirectAudio !== false,
        fullscreen: node.fullscreen || false,
        smartSizing: node.smartSizing !== false,
        span: node.span || false,
        admin: node.admin || false
      };
    }

    // Favoritos / atajos del sidebar: .data puede existir con password vacío → siempre hidratar desde vault
    let matchedRdpKey = resolveWantedTreeId(
      node.sourceKey,
      node.originalKey,
      node.connectionId,
      node.data?.originalKey,
      node.data?.connectionId,
      node.favoriteId,
      node.key,
      node.id
    );
    if (!String(baseRdp.password || '').trim()) {
      const matched = findConnectionInTree(nodes, {
        wantedId: matchedRdpKey,
        types: ['rdp', 'rdp-guacamole'],
        host: baseRdp.server || baseRdp.host || baseRdp.hostname || baseRdp.targetServer,
        username: baseRdp.username || baseRdp.user || baseRdp.bastionUser || baseRdp.targetUser,
        port: baseRdp.port || 3389,
        bastionHost: baseRdp.bastionHost,
        bastionUser: baseRdp.bastionUser,
        targetServer: baseRdp.targetServer
      });
      if (matched?.data) {
        const vault = matched.data;
        matchedRdpKey = matched.key || matchedRdpKey;
        baseRdp = {
          ...baseRdp,
          ...vault,
          password: vault.password || baseRdp.password || '',
          username: vault.username || vault.user || baseRdp.username,
          user: vault.user || vault.username || baseRdp.user,
          domain: vault.domain || baseRdp.domain,
          clientType: vault.clientType || baseRdp.clientType,
          server: vault.server || vault.host || vault.hostname || baseRdp.server,
          host: vault.host || vault.server || vault.hostname || baseRdp.host,
          hostname: vault.hostname || vault.server || vault.host || baseRdp.hostname
        };
      }
    }
    // Detectar si es RDP integrado (IronRDP / Guacamole) o RDP nativo externo (mstsc)
    const isIntegratedRdp = baseRdp.clientType === 'web-rdp' || baseRdp.clientType === 'guacamole' || baseRdp.type === 'rdp-guacamole';

    // Registrar como reciente (RDP) - incluir todas las credenciales y configuración
    try {
      connectionStore.recordRecent({
        type: 'rdp-guacamole',
        name: node.label || node.name,
        host: baseRdp.server || baseRdp.host || baseRdp.hostname,
        username: baseRdp.username || baseRdp.user,
        port: baseRdp.port || 3389,
        originalKey: matchedRdpKey || undefined,
        connectionId: matchedRdpKey || undefined,
        password: '',
        clientType: baseRdp.clientType || 'web-rdp',
        domain: baseRdp.domain || '',
        resolution: baseRdp.resolution || '1024x768',
        colors: baseRdp.colors || '32',
        useBastionWallix: baseRdp.useBastionWallix === true,
        bastionHost: baseRdp.bastionHost || '',
        bastionUser: baseRdp.bastionUser || '',
        targetServer: baseRdp.targetServer || '',
        // Opciones avanzadas de RDP
        guacEnableWallpaper: baseRdp.guacEnableWallpaper || false,
        guacEnableDesktopComposition: baseRdp.guacEnableDesktopComposition || false,
        guacEnableFontSmoothing: baseRdp.guacEnableFontSmoothing || false,
        guacEnableTheming: baseRdp.guacEnableTheming || false,
        guacEnableFullWindowDrag: baseRdp.guacEnableFullWindowDrag || false,
        guacEnableMenuAnimations: baseRdp.guacEnableMenuAnimations || false,
        guacEnableGfx: baseRdp.guacEnableGfx || false,
        ironRdpGraphics: baseRdp.ironRdpGraphics === 'bitmap' ? 'bitmap' : 'egfx',
        bastionLogicalDesktop: baseRdp.bastionLogicalDesktop !== false,
        guacDisableGlyphCaching: baseRdp.guacDisableGlyphCaching || false,
        guacDisableOffscreenCaching: baseRdp.guacDisableOffscreenCaching || false,
        guacDisableBitmapCaching: baseRdp.guacDisableBitmapCaching || false,
        guacDisableCopyRect: baseRdp.guacDisableCopyRect || false,
        autoResize: baseRdp.autoResize !== false,
        guacDpi: baseRdp.guacDpi || 96,
        customIcon: node.data?.customIcon || baseRdp.customIcon || null,
        guacSecurity: baseRdp.guacSecurity || 'any',
        redirectFolders: baseRdp.redirectFolders !== false,
        redirectClipboard: baseRdp.redirectClipboard !== false,
        redirectPrinters: baseRdp.redirectPrinters || false,
        redirectAudio: baseRdp.redirectAudio !== false,
        fullscreen: baseRdp.fullscreen || false,
        smartSizing: baseRdp.smartSizing !== false,
        span: baseRdp.span || false,
        admin: baseRdp.admin || false
      }, 200);
    } catch (e) { /* noop */ }

    if (isIntegratedRdp) {
      const screen = resolveRdpScreenDimensions(baseRdp, {
        width: window.innerWidth,
        height: window.innerHeight
      });

      const isIronRdp = (baseRdp.clientType === 'web-rdp') || (!baseRdp.clientType && baseRdp.type !== 'mstsc');
      const engineLabel = isIronRdp ? 'IronRDP' : (baseRdp.clientType === 'guacamole' ? 'Guacamole' : 'RDP');

      if (!baseRdp.password) {
        const msg = 'No se encontró la contraseña RDP en el vault. Ábrela desde el árbol de conexiones o edita la entrada.';
        console.warn(`[RDP Connect][${engineLabel}] ${msg}`);
        showConnectionWarn(toast, 'RDP', msg);
        return;
      }

      const rdpConfig = {
        clientType: baseRdp.clientType || 'web-rdp',
        hostname: baseRdp.server || baseRdp.host || baseRdp.hostname,
        username: baseRdp.username || baseRdp.user,
        domain: baseRdp.domain || baseRdp.serverDomain,
        password: baseRdp.password,
        port: baseRdp.port || 3389,
        // Campos de Bastión Wallix
        useBastionWallix: baseRdp.useBastionWallix === true,
        bastionHost: baseRdp.bastionHost || undefined,
        bastionUser: baseRdp.bastionUser || undefined,
        targetServer: baseRdp.targetServer || undefined,
        targetUser: baseRdp.targetUser || undefined,
        wallixService: baseRdp.wallixService || undefined,
        width: screen.width,
        height: screen.height,
        resolution: baseRdp.resolution || screen.resolution || '1600x1000',
        dpi: baseRdp.guacDpi || 96,
        colorDepth: normalizeRdpColorDepth(baseRdp.colorDepth, 32),
        enableDrive: baseRdp.guacEnableDrive !== false && (baseRdp.guacEnableDrive === true || baseRdp.redirectFolders !== false),
        driveHostDir: baseRdp.guacDriveHostDir || undefined,
        enableWallpaper: baseRdp.guacEnableWallpaper !== false && baseRdp.enableWallpaper !== false,
        security: baseRdp.guacSecurity || 'any',
        // Campos de rendimiento / visuales
        autoResize: baseRdp.autoResize !== false,
        // Forzar congelación de resizes iniciales para camuflar RDProxy solo si autoResize está activo
        freezeInitialResize: baseRdp.autoResize !== false,
        enableGfx: (baseRdp.guacEnableGfx === true) || (baseRdp.guacWin11Compat === true),
        ironRdpGraphics: baseRdp.ironRdpGraphics === 'bitmap' ? 'bitmap' : 'egfx',
        bastionLogicalDesktop: baseRdp.bastionLogicalDesktop !== false,
        enableDesktopComposition: baseRdp.guacEnableDesktopComposition === true,
        enableFontSmoothing: baseRdp.guacEnableFontSmoothing === true,
        enableTheming: baseRdp.guacEnableTheming === true,
        enableFullWindowDrag: baseRdp.guacEnableFullWindowDrag === true,
        enableMenuAnimations: baseRdp.guacEnableMenuAnimations === true,
        disableGlyphCaching: baseRdp.guacDisableGlyphCaching === true,
        disableOffscreenCaching: baseRdp.guacDisableOffscreenCaching === true,
        disableBitmapCaching: baseRdp.guacDisableBitmapCaching === true,
        disableCopyRect: baseRdp.guacDisableCopyRect === true,
        redirectFolders: baseRdp.redirectFolders !== false && (baseRdp.redirectFolders === true || baseRdp.guacEnableDrive !== false),
        redirectClipboard: baseRdp.redirectClipboard !== false,
        redirectPrinters: baseRdp.redirectPrinters === true,
        redirectAudio: baseRdp.redirectAudio !== false,
        fullscreen: screen.fullscreen || baseRdp.fullscreen === true,
        span: baseRdp.span === true
      };

      // DEBUG: parámetros efectivos enviados al cliente RDP (IronRDP / Guacamole)
      try {
        const sourceType = (baseRdp.useBastionWallix || baseRdp.bastionUser || baseRdp.targetServer) ? 'wallix' : 'normal';
        console.log(`[RDP Connect][${engineLabel}] config efectiva`, {
          engine: engineLabel,
          sourceType,
          name: node.label || node.name || 'RDP Connection',
          hostname: rdpConfig.hostname,
          port: rdpConfig.port,
          username: rdpConfig.username,
          security: rdpConfig.security || 'any',
          autoResize: rdpConfig.autoResize,
          colorDepth: rdpConfig.colorDepth
        });
      } catch (_) { /* noop */ }

      // Crear pestaña RDP integrada (IronRDP / Guacamole)
      setRdpTabs(prevTabs => {
        const tabId = `${node.key || node.id || 'rdp'}_${Date.now()}`;
        const connectionName = node.label || node.name || 'RDP Connection';
        const originalKey = node.key || node.id || tabId;

        const newTab = {
          key: tabId,
          label: connectionName,
          originalKey: originalKey,
          rdpConfig: rdpConfig,
          type: 'rdp-guacamole',
          customIcon: node.data?.customIcon || null,
          groupId: null,
          ...(embedInHome ? { embedInHome: true } : {})
        };
        publishNewTab(tabId, embedInHome);
        return [newTab, ...prevTabs];
      });

      return; // Salir aquí para RDP integrado
    }

    // === LÓGICA EXISTENTE: RDP Nativo (mstsc) ===
    const rdpConfig = {
      name: node.label || baseRdp.name,
      server: baseRdp.server || baseRdp.host || baseRdp.hostname,
      username: baseRdp.username || baseRdp.user,
      domain: baseRdp.domain || '',
      password: baseRdp.password,
      port: baseRdp.port || 3389,
      clientType: baseRdp.clientType || 'mstsc',
      preset: baseRdp.preset || 'default',
      resolution: baseRdp.resolution || '1920x1080',
      colorDepth: normalizeRdpColorDepth(baseRdp.colorDepth || baseRdp.colors, 32),
      redirectFolders: baseRdp.redirectFolders !== false && (baseRdp.redirectFolders === true || baseRdp.guacEnableDrive !== false),
      enableDrive: baseRdp.guacEnableDrive !== false && (baseRdp.guacEnableDrive === true || baseRdp.redirectFolders !== false),
      redirectClipboard: baseRdp.redirectClipboard !== false,
      redirectPrinters: baseRdp.redirectPrinters === true,
      redirectAudio: baseRdp.redirectAudio !== false,
      enableWallpaper: baseRdp.guacEnableWallpaper !== false && baseRdp.enableWallpaper !== false,
      guacEnableWallpaper: baseRdp.guacEnableWallpaper !== false,
      fullscreen: baseRdp.fullscreen === true,
      smartSizing: baseRdp.smartSizing !== false,
      autoResize: baseRdp.autoResize !== false,
      span: baseRdp.span === true,
      admin: baseRdp.admin === true,
      public: baseRdp.public === true
    };

    // Verificar si ya existe una pestaña RDP para la misma conexión
    const existingRdpTab = rdpTabs.find(tab =>
      tab.type === 'rdp' &&
      tab.rdpConfig &&
      tab.rdpConfig.server === rdpConfig.server &&
      tab.rdpConfig.username === rdpConfig.username &&
      tab.rdpConfig.port === rdpConfig.port
    );

    if (existingRdpTab) {
      if (embedInHome) {
        if (existingRdpTab.embedInHome) {
          focusHomeSessionPanel(existingRdpTab.key);
        } else {
          toast.current?.show({
            severity: 'info',
            summary: 'Conexión RDP',
            detail: 'Ya existe una pestaña RDP para esta conexión',
            life: 3000
          });
        }
        return;
      }
      if (existingRdpTab.embedInHome) {
        setRdpTabs(prevTabs => prevTabs.map(tab => (
          tab.key === existingRdpTab.key ? { ...tab, embedInHome: false } : tab
        )));
        publishNewTab(existingRdpTab.key, false);
        return;
      }
      // Si ya existe una pestaña RDP para esta conexión, solo activarla
      const allTabs = [...sshTabs, ...rdpTabs];
      const tabIndex = allTabs.findIndex(tab => tab.key === existingRdpTab.key);
      if (tabIndex !== -1) {
        setActiveTabIndex(tabIndex);

        toast.current?.show({
          severity: 'info',
          summary: 'Conexión RDP',
          detail: 'Ya existe una pestaña RDP para esta conexión',
          life: 3000
        });
      }
      return; // No crear nueva conexión
    } else {
      // Crear nueva pestaña RDP solo si no existe para esta conexión
      const tabId = `rdp_${node.key}_${Date.now()}`;
      const newRdpTab = {
        key: tabId,
        label: node.label,
        originalKey: node.key,
        rdpConfig: rdpConfig,
        type: 'rdp',
        customIcon: node.data?.customIcon || null,
        node: node,
        groupId: null,
        ...(embedInHome ? { embedInHome: true } : {})
      };

      // Agregar la pestaña RDP y marcar para activar/mostrar tras Inicio
      setRdpTabs(prevTabs => [{ ...newRdpTab, createdAt: Date.now() }, ...prevTabs]);
      if (!embedInHome) {
        setLastOpenedTabKey(tabId);
        setOnCreateActivateTabKey(tabId);
        // Activar índice 1 (después de Inicio) – el reorden virtual lo moverá visualmente
        setActiveTabIndex(1);
        setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      }
    }

    // Para mstsc, conectar automáticamente
    window.electron.ipcRenderer.invoke('rdp:connect', rdpConfig)
        .then(result => {
          if (result.success) {
            // Actualizar el estado de la pestaña RDP para que se active el botón "Mostrar Ventana"
            setRdpTabs(prevTabs => {
              return prevTabs.map(tab => {
                if (tab.type === 'rdp') {
                  return {
                    ...tab,
                    connectionStatus: 'connected',
                    connectionInfo: {
                      server: rdpConfig.server,
                      username: rdpConfig.username,
                      port: rdpConfig.port,
                      resolution: rdpConfig.resolution,
                      startTime: new Date().toISOString(),
                      sessionId: result.connectionId || `rdp_${tab.key}_${Date.now()}`
                    }
                  };
                }
                return tab;
              });
            });

            toast.current?.show({
              severity: 'success',
              summary: 'Conexión RDP',
              detail: 'Conexión RDP iniciada correctamente',
              life: 3000
            });
          } else {
            toast.current?.show({
              severity: 'error',
              summary: 'Error',
              detail: result.error || 'Error al conectar RDP',
              life: 3000
            });
          }
        })
        .catch(error => {
          console.error('Error al conectar RDP:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al conectar RDP',
            life: 3000
          });
        });
  }, [releaseActiveGroup, publishNewTab, setRdpTabs, setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setGroupActiveIndices, rdpTabs, sshTabs, toast]);

  // === FUNCIÓN PARA ABRIR CONEXIONES VNC ===
  const onOpenVncConnection = useCallback((node, nodesArg) => {
    const nodes = resolveTree(nodesArg);
    const embedInHome = connectionWantsEmbed(node);
    releaseActiveGroup(embedInHome);

    // Manejar tanto conexiones desde sidebar (node.data) como desde ConnectionHistory (node directo)
    const nodeData = node.data || node; // Fallback para ConnectionHistory

    // Si viene desde Favoritos/Recientes (sin .data), usar la información guardada directamente
    let baseVnc = nodeData;
    if (!node.data) {
      // Para conexiones de favoritos, usar la información guardada directamente
      const hostValue = node.host || node.hostname || node.server || '';
      baseVnc = {
        ...node, // Preserve all original properties first
        server: hostValue,
        host: hostValue,
        hostname: hostValue,
        password: node.password || '',
        port: parseInt(node.port || 5900, 10),
        clientType: node.clientType || 'web-vnc',
        type: node.type || 'vnc-guacamole',
        resolution: node.resolution || '1024x768',
        colors: node.colors || '32',
        // Opciones avanzadas de VNC
        readOnly: node.readOnly || false,
        enableCompression: node.enableCompression !== false, // Por defecto true
        imageQuality: node.imageQuality || 'lossless', // lossless, lossy-low, lossy-medium, lossy-high
        autoReconnect: node.autoReconnect !== false, // Por defecto true
        autoResize: node.autoResize !== false, // Por defecto true
        redirectClipboard: node.redirectClipboard !== false,
        guacDpi: node.guacDpi || 96
      };

    }

    // Favoritos / atajos: hidratar desde vault si falta password (aunque exista .data vacío)
    if (!String(baseVnc.password || '').trim()) {
      const matchedVnc = findConnectionInTree(nodes, {
        wantedId: resolveWantedTreeId(
          node.sourceKey,
          node.originalKey,
          node.connectionId,
          node.data?.originalKey,
          node.data?.connectionId,
          node.favoriteId,
          node.key,
          node.id
        ),
        types: ['vnc', 'vnc-guacamole'],
        host: baseVnc.server || baseVnc.host || baseVnc.hostname,
        username: baseVnc.username || baseVnc.user || '',
        port: baseVnc.port || 5900
      });
      if (matchedVnc?.data) {
        const vault = matchedVnc.data;
        baseVnc = {
          ...baseVnc,
          ...vault,
          password: vault.password || baseVnc.password || '',
          username: vault.username || vault.user || baseVnc.username || '',
          clientType: (vault.clientType === 'guacamole' && vault.explicitGuacamole === true)
            ? 'guacamole'
            : (vault.clientType === 'guacamole' ? 'web-vnc' : (vault.clientType || baseVnc.clientType || 'web-vnc')),
          explicitGuacamole: vault.explicitGuacamole === true
        };
      }
    }

    // VNC sin password: avisar (algunos servidores lo permiten; no inventamos uno)
    if (!baseVnc.password) {
      showConnectionWarn(
        toast,
        'VNC',
        'No se encontró contraseña VNC en el vault. Si el servidor la requiere, ábrela desde el árbol de conexiones.'
      );
    }

    const isExplicitGuac = (baseVnc.clientType === 'guacamole' && baseVnc.explicitGuacamole === true);
    const clientType = isExplicitGuac ? 'guacamole' : 'web-vnc';
    const isGuacamoleVNC = isExplicitGuac;

    // Registrar como reciente (VNC) sin secretos
    try {
      connectionStore.recordRecent({
        type: 'vnc-guacamole',
        name: node.label || node.name,
        host: baseVnc.server || baseVnc.host || baseVnc.hostname,
        username: baseVnc.username || baseVnc.user || '',
        port: baseVnc.port || 5900,
        originalKey: node.key || node.originalKey || node.connectionId || node.id,
        connectionId: node.key || node.originalKey || node.connectionId || node.id,
        password: '',
        clientType: clientType,
        resolution: baseVnc.resolution || '1024x768',
        colors: baseVnc.colors || '32',
        // Opciones avanzadas de VNC
        readOnly: baseVnc.readOnly || false,
        enableCompression: baseVnc.enableCompression !== false,
        imageQuality: baseVnc.imageQuality || 'lossless',
        autoReconnect: baseVnc.autoReconnect !== false,
        autoResize: baseVnc.autoResize !== false,
        redirectClipboard: baseVnc.redirectClipboard !== false,
        guacDpi: baseVnc.guacDpi || 96,
        customIcon: node.data?.customIcon || null
      }, 200);
    } catch (e) { /* noop */ }

    if (isGuacamoleVNC) {
      // === VNC-Guacamole (Legacy) como pestañas independientes ===
      // Calcular resolución dinámica si autoResize está activado
      let dynamicWidth = parseInt(baseVnc.resolution?.split('x')[0]) || 1024;
      let dynamicHeight = parseInt(baseVnc.resolution?.split('x')[1]) || 768;

      if (baseVnc.autoResize) {
        dynamicWidth = Math.floor(window.innerWidth * 0.8);
        dynamicHeight = Math.floor(window.innerHeight * 0.7);
      }

      const vncConfig = {
        connectionType: 'vnc',
        clientType: 'guacamole',
        hostname: baseVnc.server || baseVnc.host || baseVnc.hostname,
        username: baseVnc.username || baseVnc.user || '',
        password: baseVnc.password || '',
        port: baseVnc.port || 5900,
        width: dynamicWidth,
        height: dynamicHeight,
        dpi: baseVnc.guacDpi || 96,
        colorDepth: baseVnc.colorDepth || parseInt(baseVnc.colors) || 32,
        autoResize: baseVnc.autoResize === true,
        freezeInitialResize: baseVnc.autoResize === true,
        readOnly: baseVnc.readOnly === true,
        enableCompression: baseVnc.enableCompression !== false,
        imageQuality: baseVnc.imageQuality || 'lossless',
        autoReconnect: baseVnc.autoReconnect !== false,
        redirectClipboard: baseVnc.redirectClipboard === true
      };

      setRdpTabs(prevTabs => {
        const tabId = `${node.key || node.id || 'vnc'}_${Date.now()}`;
        const connectionName = node.label || node.name || 'VNC Connection';
        const originalKey = node.key || node.id || tabId;

        const newTab = {
          key: tabId,
          label: connectionName,
          originalKey: originalKey,
          rdpConfig: vncConfig,
          vncConfig: vncConfig,
          type: 'vnc-guacamole',
          customIcon: node.data?.customIcon || null,
          groupId: null,
          ...(embedInHome ? { embedInHome: true } : {})
        };
        publishNewTab(tabId, embedInHome);
        return [newTab, ...prevTabs];
      });

      return;
    }

    // === VNC Nativo (noVNC HTML5 Canvas - Recomendado y por defecto) ===
    let dynamicWidth = parseInt(baseVnc.resolution?.split('x')[0]) || 1024;
    let dynamicHeight = parseInt(baseVnc.resolution?.split('x')[1]) || 768;

    if (baseVnc.autoResize) {
      dynamicWidth = Math.floor(window.innerWidth * 0.8);
      dynamicHeight = Math.floor(window.innerHeight * 0.7);
    }

    const vncConfig = {
      connectionType: 'vnc',
      clientType: 'web-vnc',
      hostname: baseVnc.server || baseVnc.host || baseVnc.hostname,
      username: baseVnc.username || baseVnc.user || '',
      password: baseVnc.password || '',
      port: baseVnc.port || 5900,
      resolution: baseVnc.resolution || '1600x1000',
      width: dynamicWidth,
      height: dynamicHeight,
      dpi: baseVnc.guacDpi || 96,
      colorDepth: baseVnc.colorDepth || parseInt(baseVnc.colors) || 32,
      autoResize: baseVnc.autoResize !== false,
      readOnly: baseVnc.readOnly === true,
      enableCompression: baseVnc.enableCompression !== false,
      imageQuality: baseVnc.imageQuality || 'lossless',
      autoReconnect: baseVnc.autoReconnect !== false,
      redirectClipboard: baseVnc.redirectClipboard !== false
    };

    setRdpTabs(prevTabs => {
      const tabId = `${node.key || node.id || 'vnc'}_${Date.now()}`;
      const connectionName = node.label || node.name || 'VNC Connection';
      const originalKey = node.key || node.id || tabId;

      const newTab = {
        key: tabId,
        label: connectionName,
        originalKey: originalKey,
        rdpConfig: vncConfig,
        vncConfig: vncConfig,
        type: 'vnc-guacamole', // Se renderiza en TabContentRenderer como LazyVncCanvasTab
        customIcon: node.data?.customIcon || null,
        groupId: null,
        ...(embedInHome ? { embedInHome: true } : {})
      };
      publishNewTab(tabId, embedInHome);
      return [newTab, ...prevTabs];
    });
  }, [releaseActiveGroup, publishNewTab, setRdpTabs, toast]);

  // === RETORNO DEL HOOK ===
  return {
    onOpenSSHConnection,
    onOpenRdpConnection,
    onOpenVncConnection,
    onOpenFileConnection,
    onOpenSSHTunnel,
    openFileExplorer
  };
};
