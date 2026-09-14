import { useEffect } from 'react';
import localStorageSyncService from '../services/LocalStorageSyncService';
import { terminalAgentBridge } from '../services/TerminalAgentBridge';

/**
 * Hook para desacoplar el puente MCP Agent Bridge (window.nodeterm_integration)
 * y la sincronización del ciclo de vida de los terminales interactivos.
 */
export const useMcpAgentBridge = ({
  nodes,
  masterKey,
  secureStorage,
  sshTabs,
  activeTabIndex,
  activeGroupId,
  getAllTabs,
  getFilteredTabs,
  onOpenSSHConnection,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setActiveTabIndex,
  setGroupActiveIndices,
  terminalRefs
}) => {
  // 1. API MCP / API Server: window.nodeterm_integration
  useEffect(() => {
    window.nodeterm_integration = {
      getConnections: () => nodes || [],
      getMasterKey: () => masterKey,
      getSecureStorage: () => secureStorage,
      getPasswords: async () => {
        if (!secureStorage) return [];
        const encryptedData = localStorage.getItem('passwords_encrypted');
        if (encryptedData && masterKey) {
          try {
            return await secureStorage.decryptData(JSON.parse(encryptedData), masterKey);
          } catch (e) {
            console.error('MCP getPasswords decryption error:', e);
            return [];
          }
        }
        const plainData = localStorage.getItem('passwordManagerNodes');
        return plainData ? JSON.parse(plainData) : [];
      },
      getDocuments: async () => {
        if (!secureStorage) return [];
        const encryptedData = localStorage.getItem('documents_encrypted');
        if (encryptedData && masterKey) {
          try {
            return await secureStorage.decryptData(JSON.parse(encryptedData), masterKey);
          } catch (e) {
            console.error('MCP getDocuments decryption error:', e);
            return [];
          }
        }
        const plainData = localStorage.getItem('documentManagerNodes');
        return plainData ? JSON.parse(plainData) : [];
      },
      savePasswords: async (newPasswords) => {
        if (!secureStorage) return false;
        if (masterKey) {
          const encrypted = await secureStorage.encryptData(newPasswords, masterKey);
          const encStr = JSON.stringify(encrypted);
          localStorage.setItem('passwords_encrypted', encStr);
          localStorage.removeItem('passwordManagerNodes');
          localStorageSyncService.debouncedSync({ passwords_encrypted: encStr });
        } else {
          const plainStr = JSON.stringify(newPasswords);
          localStorage.setItem('passwordManagerNodes', plainStr);
          localStorageSyncService.debouncedSync({ passwordManagerNodes: plainStr });
        }
        window.dispatchEvent(new CustomEvent('passwords-storage-updated'));
        return true;
      },
      saveDocuments: async (newDocuments) => {
        if (!secureStorage) return false;
        if (masterKey) {
          const encrypted = await secureStorage.encryptData(newDocuments, masterKey);
          const encStr = JSON.stringify(encrypted);
          localStorage.setItem('documents_encrypted', encStr);
          localStorage.removeItem('documentManagerNodes');
          localStorageSyncService.debouncedSync({ documents_encrypted: encStr });
        } else {
          const plainStr = JSON.stringify(newDocuments);
          localStorage.setItem('documentManagerNodes', plainStr);
          localStorageSyncService.debouncedSync({ documentManagerNodes: plainStr });
        }
        window.dispatchEvent(new CustomEvent('documents-storage-updated'));
        return true;
      },
      upsertPassword: async (item) => {
        const getPasswords = window.nodeterm_integration.getPasswords;
        const savePasswords = window.nodeterm_integration.savePasswords;
        const list = await getPasswords();

        function updateNodeInTree(nodes, id, name, data) {
          return nodes.map(n => {
            if (n.key === id || n.id === id) {
              return {
                ...n,
                label: name || n.label,
                data: {
                  ...n.data,
                  ...data
                }
              };
            }
            if (n.children && n.children.length > 0) {
              return {
                ...n,
                children: updateNodeInTree(n.children, id, name, data)
              };
            }
            return n;
          });
        }

        function addNodeToTree(nodes, parentId, newNode) {
          if (!parentId) {
            return [...nodes, newNode];
          }
          return nodes.map(n => {
            if (n.key === parentId || n.id === parentId) {
              return {
                ...n,
                children: [...(n.children || []), newNode]
              };
            }
            if (n.children && n.children.length > 0) {
              return {
                ...n,
                children: addNodeToTree(n.children, parentId, newNode)
              };
            }
            return n;
          });
        }

        const dataFields = {};
        if (item.type !== undefined) dataFields.type = item.type;
        if (item.username !== undefined) dataFields.username = item.username;
        if (item.password !== undefined) dataFields.password = item.password;
        if (item.website !== undefined) dataFields.website = item.website;
        if (item.notes !== undefined) dataFields.notes = item.notes;
        if (item.api_key !== undefined) dataFields.api_key = item.api_key;
        if (item.wallet_seed !== undefined) dataFields.wallet_seed = item.wallet_seed;

        if (item.id) {
          const updated = updateNodeInTree(list, item.id, item.name, dataFields);
          await savePasswords(updated);
          return item.id;
        } else {
          if (dataFields.type === undefined) dataFields.type = 'password';
          if (dataFields.username === undefined) dataFields.username = '';
          if (dataFields.password === undefined) dataFields.password = '';
          if (dataFields.website === undefined) dataFields.website = '';
          if (dataFields.notes === undefined) dataFields.notes = '';
          if (dataFields.api_key === undefined) dataFields.api_key = '';
          if (dataFields.wallet_seed === undefined) dataFields.wallet_seed = '';

          const newId = (item.type === 'password-folder' ? 'password_folder_' : 'password_') + Date.now() + '_' + Math.floor(Math.random() * 1e6);
          const newNode = {
            key: newId,
            id: newId,
            label: item.name,
            droppable: item.type === 'password-folder',
            data: dataFields
          };
          if (item.type === 'password-folder') {
            newNode.children = [];
          }
          const updated = addNodeToTree(list, item.parentId, newNode);
          await savePasswords(updated);
          return newId;
        }
      },
      upsertDocument: async (item) => {
        const getDocs = window.nodeterm_integration.getDocuments;
        const saveDocs = window.nodeterm_integration.saveDocuments;
        const list = await getDocs();

        function updateNodeInTree(nodes, id, name, content) {
          return nodes.map(n => {
            if (n.key === id || n.id === id) {
              return {
                ...n,
                label: name || n.label,
                data: {
                  ...n.data,
                  content: content !== undefined ? content : (n.data ? (n.data.content || '') : ''),
                  updatedAt: Date.now()
                }
              };
            }
            if (n.children && n.children.length > 0) {
              return {
                ...n,
                children: updateNodeInTree(n.children, id, name, content)
              };
            }
            return n;
          });
        }

        function addNodeToTree(nodes, parentId, newNode) {
          if (!parentId) {
            return [...nodes, newNode];
          }
          return nodes.map(n => {
            if (n.key === parentId || n.id === parentId) {
              return {
                ...n,
                children: [...(n.children || []), newNode]
              };
            }
            if (n.children && n.children.length > 0) {
              return {
                ...n,
                children: addNodeToTree(n.children, parentId, newNode)
              };
            }
            return n;
          });
        }

        if (item.id) {
          const updated = updateNodeInTree(list, item.id, item.name, item.content);
          await saveDocs(updated);
          return item.id;
        } else {
          const isFolder = item.type === 'document-folder';
          const newId = (isFolder ? 'docfolder_' : 'doc_') + Date.now() + '_' + Math.floor(Math.random() * 1e6);
          const newNode = {
            key: newId,
            id: newId,
            label: item.name,
            type: item.type || 'document',
            droppable: isFolder,
            data: isFolder ? { type: 'document-folder', createdAt: Date.now() } : {
              type: 'document',
              content: item.content || '',
              markdownSource: item.content || '',
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          };
          if (isFolder) {
            newNode.children = [];
          }
          const updated = addNodeToTree(list, item.parentId, newNode);
          await saveDocs(updated);
          return newId;
        }
      },

      // --- Terminales vivos (MCP agent) ---
      listOpenTerminals: () => terminalAgentBridge.listOpenTerminals(),
      openTerminal: async (opts) => terminalAgentBridge.openTerminal(opts || {}),
      focusTerminal: (terminalId) => terminalAgentBridge.focusTerminal(terminalId),
      setTerminalInputLock: (terminalId, locked) => terminalAgentBridge.setInputLock(terminalId, locked),
      getTerminalStatus: (terminalId) => terminalAgentBridge.getStatus(terminalId),
      writeTerminal: async (terminalId, opts) => terminalAgentBridge.writeTerminal(terminalId, opts || {}),
      execInTerminal: async (terminalId, opts) => terminalAgentBridge.execInTerminal(terminalId, opts || {}),
      readTerminalBuffer: (terminalId, opts) => terminalAgentBridge.readBuffer(terminalId, opts || {}),
      waitTerminalPattern: async (terminalId, opts) => terminalAgentBridge.waitPattern(terminalId, opts || {}),
      injectSecretIntoTerminal: async (terminalId, opts) =>
        terminalAgentBridge.injectSecretIntoTerminal(terminalId, opts || {})
    };
  }, [nodes, masterKey, secureStorage]);

  // 2. Limpiar listeners/buffer de terminales cerrados
  useEffect(() => {
    const activeIds = new Set();
    (sshTabs || []).forEach((tab) => {
      if (!tab) return;
      if (tab.type === 'terminal' || tab.type === 'local-terminal' || tab.type === 'docker') {
        activeIds.add(tab.key);
      } else if (tab.type === 'split') {
        const walk = (node) => {
          if (!node) return;
          if (node.key && (node.type === 'terminal' || node.type === 'local-terminal' || node.type === 'docker')) {
            activeIds.add(node.key);
          }
          walk(node.first);
          walk(node.second);
          walk(node.leftTerminal);
          walk(node.rightTerminal);
          if (Array.isArray(node.terminals)) node.terminals.forEach(walk);
        };
        walk(tab);
      }
    });
    terminalAgentBridge.pruneClosedTerminals(activeIds);
  }, [sshTabs]);

  // 3. Dependencias del puente agente MCP (tabs / focus / open)
  useEffect(() => {
    const findConnectionById = (connectionId) => {
      if (!connectionId) return null;
      const needle = String(connectionId).toLowerCase();
      let found = null;
      const walk = (list) => {
        if (!Array.isArray(list) || found) return;
        for (const n of list) {
          const id = n.id || n.key;
          const label = n.label || n.name || '';
          const dataType = n.data?.type || n.type;
          if (
            (id && String(id).toLowerCase() === needle) ||
            (label && label.toLowerCase() === needle)
          ) {
            if (!dataType || dataType === 'ssh' || n.data?.host || n.data?.targetServer) {
              found = n;
              return;
            }
          }
          if (n.children) walk(n.children);
        }
      };
      walk(nodes);
      return found;
    };

    terminalAgentBridge.setDependencies({
      getTabs: () => sshTabs || [],
      getActiveTabKey: () => {
        try {
          const tabs = typeof getFilteredTabs === 'function' ? getFilteredTabs() : getAllTabs();
          const active = tabs && tabs[activeTabIndex];
          return active ? active.key : null;
        } catch (_) {
          return null;
        }
      },
      openSSHConnection: (nodeOrConn) => {
        if (onOpenSSHConnection) onOpenSSHConnection(nodeOrConn, nodes);
      },
      createLocalTerminal: (localType, distroInfo) => {
        if (typeof window.__nodeterm_create_local_terminal === 'function') {
          return window.__nodeterm_create_local_terminal(localType, distroInfo);
        }
        return null;
      },
      focusTerminal: (terminalId) => {
        if (!terminalId) return;
        setLastOpenedTabKey(terminalId);
        setOnCreateActivateTabKey(terminalId);
        try {
          const tabs = typeof getFilteredTabs === 'function' ? getFilteredTabs() : getAllTabs();
          const idx = Array.isArray(tabs) ? tabs.findIndex((t) => t.key === terminalId) : -1;
          if (idx >= 0) {
            setActiveTabIndex(idx);
            if (activeGroupId != null) {
              setGroupActiveIndices((prev) => ({
                ...prev,
                [activeGroupId || 'no-group']: idx
              }));
            } else {
              setGroupActiveIndices((prev) => ({ ...prev, 'no-group': idx }));
            }
          }
        } catch (_) {
          /* ignore */
        }
      },
      findConnectionById,
      getPasswordsTree: async () => {
        if (window.nodeterm_integration && typeof window.nodeterm_integration.getPasswords === 'function') {
          return window.nodeterm_integration.getPasswords();
        }
        return [];
      },
      getTerminalRef: (terminalId) =>
        terminalRefs && terminalRefs.current ? terminalRefs.current[terminalId] : null
    });
  }, [
    sshTabs,
    nodes,
    activeTabIndex,
    activeGroupId,
    getAllTabs,
    getFilteredTabs,
    onOpenSSHConnection,
    setLastOpenedTabKey,
    setOnCreateActivateTabKey,
    setActiveTabIndex,
    setGroupActiveIndices,
    terminalRefs
  ]);
};

export default useMcpAgentBridge;
