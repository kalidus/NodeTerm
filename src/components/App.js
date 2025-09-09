import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTabManagement } from '../hooks/useTabManagement';
import { useConnectionManagement } from '../hooks/useConnectionManagement';
import { useSidebarManagement } from '../hooks/useSidebarManagement';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

import { useStatusBarSettings } from '../hooks/useStatusBarSettings';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useDialogManagement } from '../hooks/useDialogManagement';
import { useContextMenuManagement } from '../hooks/useContextMenuManagement';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useTreeManagement } from '../hooks/useTreeManagement';
import { useFormHandlers } from '../hooks/useFormHandlers';
import { useSplitManagement } from '../hooks/useSplitManagement';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { useNodeTemplate } from '../hooks/useNodeTemplate';
import { useTabRendering } from '../hooks/useTabRendering';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';

import { ContextMenu } from 'primereact/contextmenu';
import TerminalComponent from './TerminalComponent';
import FileExplorer from './FileExplorer';
import Sidebar from './Sidebar';
import SplitLayout from './SplitLayout';
import { themes } from '../themes';
import { iconThemes } from '../themes/icon-themes';


import SettingsDialog from './SettingsDialog';
import TitleBar from './TitleBar';
import HomeTab from './HomeTab';
import { SSHDialog, FolderDialog, GroupDialog } from './Dialogs';

import SyncSettingsDialog from './SyncSettingsDialog';
import ImportDialog from './ImportDialog';
import ImportService from '../services/ImportService';

import RdpSessionTab from './RdpSessionTab';
import GuacamoleTab from './GuacamoleTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
// import '../assets/form-fixes.css';
import '../styles/layout/sidebar.css';
import connectionStore, { recordRecent, toggleFavorite, addGroupToFavorites, removeGroupFromFavorites, isGroupFavorite, helpers as connectionHelpers } from '../utils/connectionStore';
import { 
  getTabTypeAndIndex, 
  moveTabToFirst, 
  handleTerminalContextMenu, 
  hideContextMenu,
  createTerminalActionWrapper,
  handleUnblockForms,
  handleGuacamoleCreateTab 
} from '../utils/tabEventHandlers';
import DistroIcon from './DistroIcon';
import DialogsManager from './DialogsManager';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import MainContentArea from './MainContentArea';
import { 
  STORAGE_KEYS, 
  GROUP_KEYS, 
  THEME_DEFAULTS, 
  TAB_INDEXES, 
  EVENT_NAMES,
  TAB_TYPES,
  CONNECTION_STATUS 
} from '../utils/constants';

const App = () => {
  const toast = useRef(null);
  const [showImportDialog, setShowImportDialog] = React.useState(false);
  const [importPreset, setImportPreset] = React.useState(null);
  
  // Lógica unificada de importación con deduplicación/merge y actualización de fuentes vinculadas
  const unifiedHandleImportComplete = async (importResult) => {
    const normalizeExact = (v) => (v || '').toString().trim().toLowerCase();
    const normalizeLabel = (v) => {
      const s = (v || '').toString();
      return s
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const isFolder = (node) => !!(node && (node.droppable || (node.children && node.children.length)));
    const isConnection = (node) => !!(node && node.data && (node.data.type === 'ssh' || node.data.type === 'rdp'));
    const makeConnKey = (node) => {
      if (!node || !node.data) return null;
      if (node.data.type === 'ssh') {
        return [normalizeExact(node.data.host), normalizeExact(node.data.port), normalizeExact(node.data.user)].join('|');
      }
      if (node.data.type === 'rdp') {
        return [normalizeExact(node.data.server), normalizeExact(node.data.port), normalizeExact(node.data.username)].join('|');
      }
      return null;
    };
    const deepCopyLocal = (obj) => JSON.parse(JSON.stringify(obj));

    const mergeChildren = (targetChildren, incomingChildren) => {
      const result = Array.isArray(targetChildren) ? deepCopyLocal(targetChildren) : [];
      const existingFolderIdxByNorm = new Map();
      const existingConnKeySet = new Set();

      for (let i = 0; i < result.length; i++) {
        const it = result[i];
        if (isFolder(it)) {
          existingFolderIdxByNorm.set(normalizeLabel(it.label), i);
        } else if (isConnection(it)) {
          const k = makeConnKey(it);
          if (k) existingConnKeySet.add(k);
        }
      }

      let addedConnections = 0;
      let addedFolders = 0;

      const appendUnique = (node) => {
        if (isFolder(node)) {
          const norm = normalizeLabel(node.label);
          if (existingFolderIdxByNorm.has(norm)) {
            const idx = existingFolderIdxByNorm.get(norm);
            const existing = result[idx];
            const mergeRes = mergeChildren(existing.children || [], node.children || []);
            existing.children = mergeRes.children;
            addedConnections += mergeRes.addedConnections;
            addedFolders += mergeRes.addedFolders;
          } else {
            const newFolder = deepCopyLocal(node);
            newFolder.children = newFolder.children || [];
            result.push(newFolder);
            existingFolderIdxByNorm.set(norm, result.length - 1);
            addedFolders += 1;
          }
        } else if (isConnection(node)) {
          const k = makeConnKey(node);
          if (k && !existingConnKeySet.has(k)) {
            result.push(node);
            existingConnKeySet.add(k);
            addedConnections += 1;
          }
        }
      };

      for (const inc of incomingChildren || []) {
        appendUnique(inc);
      }

      return { children: result, addedConnections, addedFolders };
    };

    if (!importResult) {
      toast.current?.show({ severity: 'warn', summary: 'Sin datos', detail: 'No se encontraron conexiones para importar', life: 3000 });
      return;
    }

    // Estructura con carpetas
    if (importResult.structure && Array.isArray(importResult.structure.nodes) && importResult.structure.nodes.length > 0) {
      const toAdd = (importResult.structure.nodes || []).map((n, idx) => ({
        ...n,
        key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`,
        uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`
      }));

      const createContainerFolder = !!importResult.createContainerFolder;
      const containerLabel = importResult.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`;
      const overwrite = !!importResult.overwrite;
      const nodesCopy = deepCopyLocal(nodes || []);
      let addedConnections = 0;
      let addedFolders = 0;

      if (createContainerFolder) {
        if (overwrite) {
          const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(containerLabel));
          if (idx !== -1) {
            const container = nodesCopy[idx];
            const mergeResult = mergeChildren(container.children || [], toAdd);
            container.children = mergeResult.children;
            addedConnections += mergeResult.addedConnections;
            addedFolders += mergeResult.addedFolders;
          } else {
            const containerKey = `import_container_${Date.now()}`;
            const mergeResult = mergeChildren([], toAdd);
            nodesCopy.push({
              key: containerKey,
              uid: containerKey,
              label: containerLabel,
              droppable: true,
              children: mergeResult.children,
              createdAt: new Date().toISOString(),
              isUserCreated: true,
              imported: true,
              importedFrom: 'mRemoteNG'
            });
            addedConnections += mergeResult.addedConnections;
            addedFolders += mergeResult.addedFolders;
          }
        } else {
          const containerKey = `import_container_${Date.now()}`;
          nodesCopy.push({
            key: containerKey,
            uid: containerKey,
            label: containerLabel,
            droppable: true,
            children: toAdd,
            createdAt: new Date().toISOString(),
            isUserCreated: true,
            imported: true,
            importedFrom: 'mRemoteNG'
          });
          const countInside = (arr) => {
            let folders = 0, conns = 0;
            for (const it of arr || []) {
              if (isFolder(it)) { folders += 1; const r = countInside(it.children); folders += r.folders; conns += r.conns; }
              else if (isConnection(it)) conns += 1;
            }
            return { folders, conns };
          };
          const r = countInside(toAdd);
          addedConnections += r.conns;
          addedFolders += r.folders;
        }
      } else {
        if (overwrite) {
          const mergeResult = mergeChildren(nodesCopy, toAdd);
          nodesCopy.length = 0;
          nodesCopy.push(...mergeResult.children);
          addedConnections += mergeResult.addedConnections;
          addedFolders += mergeResult.addedFolders;
        } else {
          nodesCopy.push(...toAdd);
          const countInside = (arr) => {
            let folders = 0, conns = 0;
            for (const it of arr || []) {
              if (isFolder(it)) { folders += 1; const r = countInside(it.children); folders += r.folders; conns += r.conns; }
              else if (isConnection(it)) conns += 1;
            }
            return { folders, conns };
          };
          const r = countInside(toAdd);
          addedConnections += r.conns;
          addedFolders += r.folders;
        }
      }

      setNodes(nodesCopy);

      // Registrar/actualizar fuente vinculada con id estable
      if (importResult.linkFile && (importResult.linkedFilePath || importResult.linkedFileName)) {
        const sources = JSON.parse(localStorage.getItem('IMPORT_SOURCES') || '[]');
        const stableId = importResult.linkedFilePath || importResult.linkedFileName;
        const newSource = {
          id: stableId,
          fileName: importResult.linkedFileName || null,
          filePath: importResult.linkedFilePath || null,
          fileHash: importResult.linkedFileHash || null,
          lastCheckedAt: Date.now(),
          intervalMs: Number(importResult.pollInterval) || 30000,
          options: {
            overwrite: !!importResult.overwrite,
            createContainerFolder: !!importResult.createContainerFolder,
            containerFolderName: importResult.containerFolderName || null
          }
        };
        const filtered = sources.filter(s => (s.id !== stableId) && (s.filePath !== newSource.filePath) && (s.fileName !== newSource.fileName));
        filtered.push(newSource);
        localStorage.setItem('IMPORT_SOURCES', JSON.stringify(filtered));
      }

      toast.current?.show({ severity: 'success', summary: 'Importación exitosa', detail: `Añadidas ${addedConnections} conexiones y ${addedFolders} carpetas`, life: 5000 });
      return;
    }

    // Lista plana
    const importedConnections = importResult.connections || importResult;
    if (!Array.isArray(importedConnections) || importedConnections.length === 0) {
      toast.current?.show({ severity: 'warn', summary: 'Sin datos', detail: 'No se encontraron conexiones para importar', life: 3000 });
      return;
    }

    const createContainerFolder = !!importResult.createContainerFolder;
    const containerLabel = importResult.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`;
    const overwrite = !!importResult.overwrite;
    const nodesCopy = deepCopyLocal(nodes || []);
    let addedConnections = 0;

    if (createContainerFolder) {
      const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(containerLabel));
      if (overwrite) {
        const existingChildren = idx !== -1 ? (nodesCopy[idx].children || []) : [];
        const mergeResult = mergeChildren(existingChildren, importedConnections);
        if (idx !== -1) nodesCopy[idx].children = mergeResult.children; else {
          const containerKey = `import_container_${Date.now()}`;
          nodesCopy.push({ key: containerKey, uid: containerKey, label: containerLabel, droppable: true, children: mergeResult.children, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
        }
        addedConnections += mergeResult.addedConnections;
      } else {
        const childrenToAdd = importedConnections;
        if (idx !== -1) nodesCopy[idx].children = (nodesCopy[idx].children || []).concat(childrenToAdd); else {
          const containerKey = `import_container_${Date.now()}`;
          nodesCopy.push({ key: containerKey, uid: containerKey, label: containerLabel, droppable: true, children: childrenToAdd, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
        }
        addedConnections += childrenToAdd.length;
      }
    } else {
      const rootFolderLabel = `Importadas de mRemoteNG (${new Date().toLocaleDateString()})`;
      const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(rootFolderLabel));
      if (overwrite) {
        if (idx !== -1) {
          const mergeResult = mergeChildren(nodesCopy[idx].children || [], importedConnections);
          nodesCopy[idx].children = mergeResult.children;
          addedConnections += mergeResult.addedConnections;
        } else {
          const importFolderKey = `imported_folder_${Date.now()}`;
          const mergeResult = mergeChildren([], importedConnections);
          nodesCopy.push({ key: importFolderKey, label: rootFolderLabel, droppable: true, children: mergeResult.children, uid: importFolderKey, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
          addedConnections += mergeResult.addedConnections;
        }
      } else {
        const importFolderKey = `imported_folder_${Date.now()}`;
        nodesCopy.push({ key: importFolderKey, label: rootFolderLabel, droppable: true, children: importedConnections, uid: importFolderKey, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
        addedConnections += importedConnections.length;
      }
    }

    setNodes(nodesCopy);

    // Registrar/actualizar fuente vinculada
    if (importResult.linkFile && (importResult.linkedFilePath || importResult.linkedFileName)) {
      const sources = JSON.parse(localStorage.getItem('IMPORT_SOURCES') || '[]');
      const stableId = importResult.linkedFilePath || importResult.linkedFileName;
      const newSource = {
        id: stableId,
        fileName: importResult.linkedFileName || null,
        filePath: importResult.linkedFilePath || null,
        fileHash: importResult.linkedFileHash || null,
        lastCheckedAt: Date.now(),
        intervalMs: Number(importResult.pollInterval) || 30000,
        options: {
          overwrite: !!importResult.overwrite,
          createContainerFolder: !!importResult.createContainerFolder,
          containerFolderName: importResult.containerFolderName || null
        }
      };
      const filtered = sources.filter(s => (s.id !== stableId) && (s.filePath !== newSource.filePath) && (s.fileName !== newSource.fileName));
      filtered.push(newSource);
      localStorage.setItem('IMPORT_SOURCES', JSON.stringify(filtered));
    }

    toast.current?.show({ severity: 'success', summary: 'Importación exitosa', detail: `Añadidas ${addedConnections} conexiones`, life: 5000 });
  };

  // Función para manejar la importación completa (estructura + conexiones)
  console.log('🔍 DEBUG App.js - Definiendo handleImportComplete...');
  const handleImportComplete = async (importResult) => {
    console.log('🚀 handleImportComplete INICIANDO...');
    try {
      console.log('🎯 handleImportComplete IN', importResult && typeof importResult, importResult?.structure?.nodes?.length);
      console.log('🔍 DEBUG handleImportComplete - importResult completo:', importResult);
      if (!importResult) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Helper para eliminar duplicados cuando overwrite=true
      const normalizeLabel = (v) => {
        const s = (v || '').toString();
        return s
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const removeConflictsAndAdd = (existingNodes, incomingNodes) => {
        if (!Array.isArray(existingNodes) || !Array.isArray(incomingNodes)) {
          return [...(existingNodes || []), ...(incomingNodes || [])];
        }
        
        // Crear un Set con los nombres normalizados de los nodos entrantes
        const incomingLabels = new Set();
        incomingNodes.forEach(node => {
          if (node && node.label) {
            incomingLabels.add(normalizeLabel(node.label));
          }
        });
        
        // Filtrar los nodos existentes, eliminando los que tienen conflicto
        const filteredExisting = existingNodes.filter(node => {
          if (!node || !node.label) return true;
          return !incomingLabels.has(normalizeLabel(node.label));
        });
        
        // Retornar existentes filtrados + nuevos (los nuevos tienen prioridad)
        return [...filteredExisting, ...incomingNodes];
      };

      // Carpeta destino: raíz por defecto o una seleccionada en el diálogo
      const ROOT_VALUE = 'ROOT';
      const baseTargetKey = importResult?.linkFile
        ? (importResult?.linkedTargetFolderKey || ROOT_VALUE)
        : (importResult?.targetBaseFolderKey || ROOT_VALUE);

      // Opciones específicas según el modo (manual vs vinculado)
      const isLinkedMode = !!importResult?.linkFile;
      const finalCreateContainerFolder = isLinkedMode 
        ? (importResult?.linkedCreateContainerFolder || false)
        : (importResult?.createContainerFolder || false);
      const finalContainerLabel = isLinkedMode
        ? (importResult?.linkedContainerFolderName || `mRemoteNG linked - ${new Date().toLocaleDateString()}`)
        : (importResult?.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`);
      const finalOverwrite = isLinkedMode
        ? (importResult?.linkedOverwrite || false)
        : (importResult?.overwrite || false);

      console.log('🔍 DEBUG handleImportComplete:', {
        isLinkedMode,
        baseTargetKey,
        finalCreateContainerFolder,
        finalContainerLabel,
        finalOverwrite,
        importResult: {
          linkFile: importResult?.linkFile,
          createContainerFolder: importResult?.createContainerFolder,
          linkedCreateContainerFolder: importResult?.linkedCreateContainerFolder,
          overwrite: importResult?.overwrite,
          linkedOverwrite: importResult?.linkedOverwrite
        }
      });

      const insertIntoTarget = (nodesToInsert) => {
        console.log('🔍 DEBUG insertIntoTarget:', {
          baseTargetKey,
          finalCreateContainerFolder,
          finalOverwrite,
          finalContainerLabel,
          nodesToInsertLength: nodesToInsert?.length
        });

        // Inserta un array de nodos en la carpeta destino, con soporte para overwrite y contenedor opcional
        const containerize = (children) => ({
          key: `import_container_${Date.now()}`,
          uid: `import_container_${Date.now()}_${Math.floor(Math.random()*1e6)}`,
          label: finalContainerLabel,
          droppable: true,
          children: children,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG'
        });

        if (baseTargetKey === ROOT_VALUE) {
          console.log('🔍 DEBUG: Insertando en raíz');
          setNodes(prev => {
            const nodesCopy = JSON.parse(JSON.stringify(prev || []));
            if (finalCreateContainerFolder) {
              console.log('🔍 DEBUG: Creando contenedor en raíz');
              if (finalOverwrite) {
                console.log('🔍 DEBUG: Con overwrite');
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              } else {
                console.log('🔍 DEBUG: Sin overwrite');
                nodesCopy.push(containerize(nodesToInsert));
                return nodesCopy;
              }
            }
            if (finalOverwrite) {
              console.log('🔍 DEBUG: Insertando directo en raíz con overwrite');
              return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            } else {
              console.log('🔍 DEBUG: Insertando directo en raíz sin overwrite');
              nodesCopy.push(...nodesToInsert);
              return nodesCopy;
            }
          });
          return;
        }

        setNodes(prev => {
          const nodesCopy = JSON.parse(JSON.stringify(prev || []));
          const targetNode = findNodeByKey(nodesCopy, baseTargetKey);
          if (!targetNode || !targetNode.droppable) {
            // Fallback a raíz si la carpeta no existe o no es droppable
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              }
              nodesCopy.push(containerize(nodesToInsert));
              return nodesCopy;
            }
            if (finalOverwrite) return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            nodesCopy.push(...nodesToInsert);
            return nodesCopy;
          }
          // Inserción dentro de la carpeta seleccionada
          const currentChildren = Array.isArray(targetNode.children) ? targetNode.children : [];
          if (finalCreateContainerFolder) {
            const newChild = containerize(nodesToInsert);
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, [newChild]);
            } else {
              targetNode.children = [...currentChildren, newChild];
            }
          } else {
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, nodesToInsert);
            } else {
              targetNode.children = [...currentChildren, ...nodesToInsert];
            }
          }
          return nodesCopy;
        });
      };

      let addedFolders = 0;
      let addedConnections = 0;

      // Si tenemos estructura con carpetas
      if (importResult.structure && Array.isArray(importResult.structure.nodes) && importResult.structure.nodes.length > 0) {
        console.log('📁 Importando estructura con carpetas:', importResult.structure.folderCount, 'folders');
        let toAdd = (importResult.structure.nodes || []).map((n, idx) => ({
          ...n,
          key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`,
          uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`
        }));
        insertIntoTarget(toAdd);

        addedFolders = importResult.structure.folderCount || 0;
        addedConnections = importResult.structure.connectionCount || 0;
        toast.current?.show({
          severity: 'success',
          summary: 'Importación exitosa',
          detail: `Se importaron ${addedConnections} conexiones y ${addedFolders} carpetas`,
          life: 5000
        });
        return;
      }

      // Lista plana
      const importedConnections = importResult.connections || importResult;
      if (!Array.isArray(importedConnections) || importedConnections.length === 0) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Para lista plana, insertar directamente en target según configuración
      insertIntoTarget(importedConnections);
      toast.current?.show({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: `Se importaron ${importedConnections.length} conexiones`,
        life: 5000
      });
      
      console.log('✅ handleImportComplete COMPLETADO EXITOSAMENTE');

    } catch (error) {
      console.error('❌ Error al procesar importación:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.current?.show({
        severity: 'error',
        summary: 'Error de importación',
        detail: 'Error al agregar las conexiones importadas a la sidebar',
        life: 5000
      });
    }
  };
  
  console.log('🔍 DEBUG App.js - handleImportComplete definida:', typeof handleImportComplete);
  
  // Usar el hook de gestión de pestañas
  const {
    sshTabs, setSshTabs, rdpTabs, setRdpTabs, guacamoleTabs, setGuacamoleTabs,
    fileExplorerTabs, setFileExplorerTabs, homeTabs, setHomeTabs,
    lastOpenedTabKey, setLastOpenedTabKey, onCreateActivateTabKey, setOnCreateActivateTabKey,
    activatingNowRef, openTabOrder, setOpenTabOrder, activeTabIndex, setActiveTabIndex,
    pendingExplorerSession, setPendingExplorerSession, tabGroups, setTabGroups,
    activeGroupId, setActiveGroupId, groupActiveIndices, setGroupActiveIndices,
    showCreateGroupDialog, setShowCreateGroupDialog, newGroupName, setNewGroupName,
    selectedGroupColor, setSelectedGroupColor, tabContextMenu, setTabContextMenu,
    tabDistros, setTabDistros,
    GROUP_COLORS, getNextGroupColor, getAllTabs, getTabsInGroup, getFilteredTabs,
    handleLoadGroupFromFavorites, createNewGroup, deleteGroup, moveTabToGroup, cleanupTabDistro,
    handleTabContextMenu, handleTabClose
  } = useTabManagement(toast, {
    cleanupTabDistro,
    setSshConnectionStatus,
    terminalRefs,
    GROUP_KEYS
  });

  // Usar el hook de gestión de conexiones
  const {
    onOpenSSHConnection,
    onOpenRdpConnection,
    openFileExplorer
  } = useConnectionManagement({
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setLastOpenedTabKey, setOnCreateActivateTabKey,
    setOpenTabOrder, sshTabs, setSshTabs, rdpTabs, setRdpTabs, toast
  });

  // Usar el hook de gestión de temas
  const {
    fontFamily, setFontFamily, fontSize, setFontSize,
    localFontFamily, setLocalFontFamily, localFontSize, setLocalFontSize,
    availableFonts, terminalTheme, setTerminalTheme, statusBarTheme, setStatusBarTheme,
    localPowerShellTheme, setLocalPowerShellTheme, localLinuxTerminalTheme, setLocalLinuxTerminalTheme,
    uiTheme, setUiTheme, availableThemes, iconTheme, setIconTheme,
    iconThemeSidebar, setIconThemeSidebar, explorerFont, setExplorerFont,
    explorerFontSize, setExplorerFontSize, explorerColorTheme, setExplorerColorTheme,
    sidebarFont, setSidebarFont, sidebarFontSize, setSidebarFontSize,
    updateThemesFromSync
  } = useThemeManagement();

  // Usar el hook de drag & drop
  const {
    draggedTabIndex, dragOverTabIndex, dragStartTimer,
    handleTabDragStart, handleTabDragOver, handleTabDragLeave,
    handleTabDrop, handleTabDragEnd
  } = useDragAndDrop({
    getFilteredTabs,
    openTabOrder,
    setOpenTabOrder,
    setActiveTabIndex
  });

  // Usar el hook de gestión de sesiones
  const {
    terminalRefs, activeListenersRef, sessionManager,
    sshStatsByTabId, setSshStatsByTabId,
    sshConnectionStatus, setSshConnectionStatus,
    handleCopyFromTerminal: copyFromTerminal, handlePasteToTerminal: pasteToTerminal, handleSelectAllTerminal: selectAllTerminal, handleClearTerminal: clearTerminal,
    handleCopyFromTerminalWrapper, handlePasteToTerminalWrapper, handleSelectAllTerminalWrapper, handleClearTerminalWrapper,
    handleUnblockFormsWrapper,
    cleanupTerminalRef, disconnectSSHSession, disconnectSplitSession, disconnectRDPSession,
    resizeTerminals, reloadSessionsFromStorage
  } = useSessionManagement(toast, {
    sshTabs,
    setTabDistros,
    resizeTimeoutRef
  });

  // Split management hook
  const {
    openInSplit,
    handleCloseSplitPanel
  } = useSplitManagement({
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    setGroupActiveIndices,
    sshTabs,
    setSshTabs,
    homeTabs,
    fileExplorerTabs,
    toast
  });

  // Usar el hook de gestión del sidebar
  const {
    nodes, setNodes,
    selectedNode, setSelectedNode,
    isGeneralTreeMenu, setIsGeneralTreeMenu,
    selectedNodeKey, setSelectedNodeKey,
    sidebarFilter, setSidebarFilter,
    sidebarCallbacksRef,
    parseWallixUser,
    getActiveConnectionIds,
    findAllConnections,
    getTreeContextMenuItems,
    getGeneralTreeContextMenuItems
  } = useSidebarManagement(toast, {
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey,
    getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection,
    homeTabs, fileExplorerTabs, sshTabs
  });



  // Storage key moved to constants

  // Tras crear una pestaña marcada para activación, fijar activeTabIndex al índice real y limpiar la marca
  useEffect(() => {
    if (!onCreateActivateTabKey) return;
    // Asegurar estar en Home
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
      setGroupActiveIndices(prev => ({ ...prev, [currentGroupKey]: activeTabIndex }));
      setActiveGroupId(null);
    }
    const timer = setTimeout(() => {
      try {
        const filtered = getTabsInGroup(null);
        const idx = filtered.findIndex(t => t.key === onCreateActivateTabKey);
        if (idx !== -1) {
          activatingNowRef.current = true;
          setActiveTabIndex(idx);
          setTimeout(() => { activatingNowRef.current = false; }, 400);
        }
      } finally {
        setOnCreateActivateTabKey(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [onCreateActivateTabKey, homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, activeGroupId, activeTabIndex]);







  // StatusBar settings hook
  const {
    statusBarIconTheme,
    setStatusBarIconTheme,
    statusBarPollingInterval,
    setStatusBarPollingInterval,
    updateStatusBarFromSync
  } = useStatusBarSettings();

  // Dialog management hook
  const {
    // Estados de diálogos
    showSSHDialog, setShowSSHDialog,
    showRdpDialog, setShowRdpDialog,
    showFolderDialog, setShowFolderDialog,
    showEditSSHDialog, setShowEditSSHDialog,
    showEditFolderDialog, setShowEditFolderDialog,
    showSettingsDialog, setShowSettingsDialog,
    showSyncDialog, setShowSyncDialog,
  
    showUnifiedConnectionDialog, setShowUnifiedConnectionDialog,
    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshRemoteFolder, setSSHRemoteFolder,
    sshPort, setSSHPort,
    sshTargetFolder, setSSHTargetFolder,
    // Estados de formularios Edit SSH
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    // Estados de formularios RDP
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername,
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpGuacSecurity, setRdpGuacSecurity,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,
    // Estados de formularios Folder
    folderName, setFolderName,
    parentNodeKey, setParentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    // Funciones de utilidad
    resetSSHForm, resetRDPForm, resetFolderForm,
    resetEditSSHForm, resetEditFolderForm,
    openSSHDialog, openRDPDialog, openFolderDialog,
    closeSSHDialogWithReset, closeRDPDialogWithReset, closeFolderDialogWithReset,
    closeEditSSHDialogWithReset, closeEditFolderDialogWithReset
  } = useDialogManagement();



  // Context menu management hook
  const {
    // Estados de menús contextuales
    terminalContextMenu, setTerminalContextMenu,
    showOverflowMenu, setShowOverflowMenu,
    overflowMenuPosition, setOverflowMenuPosition,
    // Referencias
    treeContextMenuRef,
    // Funciones de terminal context menu
    showTerminalContextMenu, hideTerminalContextMenu,
    // Funciones de overflow menu
    showOverflowMenuAt, hideOverflowMenu,
    // Funciones de tree context menu
    onNodeContextMenu: onNodeContextMenuHook,
    onTreeAreaContextMenu: onTreeAreaContextMenuHook
  } = useContextMenuManagement();

  // Window management hook
  const {
    // Estados de ventana y sidebar
    sidebarVisible, setSidebarVisible,
    sidebarCollapsed, setSidebarCollapsed,
    allExpanded, setAllExpanded,
    expandedKeys, setExpandedKeys,
    // Referencias
    resizeTimeoutRef,
    // Funciones de resize
    handleResize, handleResizeThrottled,
    // Funciones de expansión
    toggleExpandAll
  } = useWindowManagement({ 
    getFilteredTabs, 
    activeTabIndex, 
    resizeTerminals,
    nodes
  });

  // Tree management hook
  const {
    // Utilidades básicas
    deepCopy, generateNextKey,
    // Funciones de búsqueda
    findNodeByKey, findParentNodeAndIndex, findParentNodeAndIndexByUID, findNodeByProperties,
    // Funciones de manipulación
    removeNodeByKey, cloneTreeWithUpdatedNode, deleteNode: deleteNodeFromTree, onDragDrop: onDragDropTree,
    // Funciones de confirmación
    confirmDeleteNode
  } = useTreeManagement({ toast, confirmDialog });



  // Tree operations hook
  const {
    draggedNodeKey,
    setDraggedNodeKey,
    generateUniqueKey,
    getDefaultNodes,
    regenerateKeys,
    updateNodesWithKeys,
    findNodeByUID,
    handleDropToRoot,
    onDragDrop
  } = useTreeOperations({
    nodes,
    setNodes,
    toast,
    deepCopy,
    findParentNodeAndIndex,
    onDragDropTree
  });

  // Form handlers hook (movido aquí para tener acceso a generateUniqueKey y parseWallixUser)
  const {
    createNewFolder,
    createNewSSH,
    createNewRdp,
    saveEditSSH,
    saveEditFolder,
    openEditSSHDialog,
    openNewRdpDialog,
    closeRdpDialog,
    openEditRdpDialog,
    handleSaveRdpToSidebar
  } = useFormHandlers({
    toast,
    setShowRdpDialog,
    setShowEditSSHDialog,
    setShowEditFolderDialog,

    setShowUnifiedConnectionDialog,
    // Estados SSH para creación
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser, 
    sshPassword, setSSHPassword, sshRemoteFolder, setSSHRemoteFolder, 
    sshPort, setSSHPort, sshTargetFolder, setSSHTargetFolder,
    closeSSHDialogWithReset,
    // Estados SSH para edición
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost, 
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    closeEditSSHDialogWithReset,
    // Estados RDP
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername, 
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,
    // Estados Folder
    folderName, parentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    closeFolderDialogWithReset,
    // Utilidades
    nodes, setNodes,
    findNodeByKey, deepCopy, generateUniqueKey, parseWallixUser,
    rdpTabs, setRdpTabs
  });

  // Node template hook
  const {
    nodeTemplate,
    getAllFolders,
    openEditFolderDialog
  } = useNodeTemplate({
    sshConnectionStatus,
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    setGroupActiveIndices,
    setSshTabs,
    homeTabs,
    onOpenRdpConnection,
    iconThemes,
    iconThemeSidebar,
    sidebarFont,
    setEditFolderNode,
    setEditFolderName,
    setShowEditFolderDialog,
    onNodeContextMenu,
    onTreeAreaContextMenu
  });

  // Tab rendering hook
  const {
    renderGroupTabs
  } = useTabRendering({
    tabGroups,
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    groupActiveIndices,
    setGroupActiveIndices,
    getTabsInGroup,
    tabContextMenu,
    setTabContextMenu,
    moveTabToGroup,
    deleteGroup,
    toast
  });



  // Context menu for nodes (usando el hook)
  const onNodeContextMenu = (event, node) => {
    onNodeContextMenuHook(event, node, setSelectedNode, setIsGeneralTreeMenu);
  };

  // Context menu for tree area (general) (usando el hook)
  const onTreeAreaContextMenu = (event) => {
    onTreeAreaContextMenuHook(event, setSelectedNode, setIsGeneralTreeMenu);
  };



  // Load initial nodes from localStorage or use default
  useEffect(() => {
    const savedNodes = localStorage.getItem(STORAGE_KEYS.TREE_DATA);
    if (savedNodes) {
      let loadedNodes = JSON.parse(savedNodes);
      if (!Array.isArray(loadedNodes)) {
        loadedNodes = [loadedNodes];
      }
      const migrateNodes = (nodes) => {
        return nodes.map(node => {
          const migratedNode = { ...node };
          if (node.data && node.data.type === 'ssh') {
            migratedNode.droppable = false;
          }
          if (node.children && node.children.length > 0) {
            migratedNode.children = migrateNodes(node.children);
          }
          return migratedNode;
        });
      };
      const migratedNodes = migrateNodes(loadedNodes);
      setNodes(migratedNodes); // <-- Si está vacío, se respeta
    } else {
      setNodes(getDefaultNodes());
    }
    
    }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
            localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(nodes));
  }, [nodes]);

  // Efecto para manejar cambios en el explorador de archivos
  useEffect(() => {
    if (pendingExplorerSession) {
      const explorerIndex = getTabsInGroup(activeGroupId).findIndex(tab => tab.originalKey === pendingExplorerSession);
      if (explorerIndex >= sshTabs.length) {
        if (!activatingNowRef.current) setActiveTabIndex(explorerIndex);
        setPendingExplorerSession(null);
      }
    }
  }, [fileExplorerTabs, pendingExplorerSession, sshTabs.length]);






  


  useEffect(() => {
    // Cuando cambia la pestaña activa, notificar al backend
    const activeTab = filteredTabs[activeTabIndex];
    
    // Solo proceder si hay pestañas en el grupo actual
    if (filteredTabs.length > 0 && activeTab && window.electron && window.electron.ipcRenderer) {
      if (activeTab.type === 'split') {
        // Para splits, activar stats en ambos terminales
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
    // Si filteredTabs.length === 0 (grupo vacío), no hacer nada para preservar stats loops existentes
  }, [activeTabIndex, sshTabs, fileExplorerTabs]);

  // Reactivar stats para bastión al volver a la pestaña
  useEffect(() => {
    if (!window.electron || !window.electron.ipcRenderer) return;
    const activeTab = filteredTabs[activeTabIndex];
    if (activeTab && activeTab.sshConfig && activeTab.sshConfig.useBastionWallix) {
      window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
    }
  }, [activeTabIndex, sshTabs]);
  
  // TODO: Implementar lógica para overflow menu items
  const overflowMenuItems = [];

  // Exponer la función globalmente para el menú de la aplicación
  useEffect(() => {
    window.handleUnblockForms = handleUnblockFormsWrapper;
    return () => {
      delete window.handleUnblockForms;
    };
  }, []);

  // Handler para crear pestañas de Guacamole
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

    // Escuchar eventos de creación de pestañas de Guacamole
    if (window.electron && window.electron.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on('guacamole:create-tab', handleGuacamoleCreateTabWrapper);
      return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {} };
    }
  }, []);



  useEffect(() => {
    window.__DEBUG_NODES__ = () => nodes;
  }, [nodes]);

  // Configurar callbacks RDP para el sidebar
  useEffect(() => {
    // Asegurar que el ref esté inicializado
    if (!sidebarCallbacksRef.current) {
      sidebarCallbacksRef.current = {};
    }
    
    sidebarCallbacksRef.current.createRDP = (targetFolder = null) => {
      openNewRdpDialog(targetFolder);
    };
    sidebarCallbacksRef.current.editRDP = (node) => {
      openEditRdpDialog(node);
    };
    sidebarCallbacksRef.current.connectRDP = (node) => {
      onOpenRdpConnection(node);
    };
  }, [sidebarCallbacksRef.current]);

  // Desactivar reactivación automática al cambiar rdpTabs si hay activación forzada u orden explícito
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
  }, [rdpTabs, onCreateActivateTabKey, lastOpenedTabKey, openTabOrder]);

  // === FUNCIONES MEMOIZADAS PARA OPTIMIZAR RENDERS ===
  // Estas funciones se crean una sola vez y no cambian entre renders
  const memoizedTabHandlers = useCallback(() => ({
    onTabDragStart: handleTabDragStart,
    onTabDragOver: handleTabDragOver,
    onTabDragLeave: handleTabDragLeave,
    onTabDrop: handleTabDrop,
    onTabDragEnd: handleTabDragEnd,
    onTabContextMenu: handleTabContextMenu,
    onTabClose: handleTabClose
  }), [handleTabDragStart, handleTabDragOver, handleTabDragLeave, handleTabDrop, handleTabDragEnd, handleTabContextMenu, handleTabClose]);

  const tabHandlers = memoizedTabHandlers();

  // === CÁLCULOS MEMOIZADOS ===
  // Memoizar cálculos costosos que se hacen en cada render
  const isHomeTabActive = useMemo(() => {
    return activeTabIndex === TAB_INDEXES.HOME && homeTabs.length > 0;
  }, [activeTabIndex, homeTabs.length]);

  const localTerminalBg = useMemo(() => {
    return themes[localLinuxTerminalTheme]?.theme?.background || THEME_DEFAULTS.BACKGROUND;
  }, [localLinuxTerminalTheme]);

  const filteredTabs = useMemo(() => {
    return getFilteredTabs();
  }, [getFilteredTabs]);

  // === PROPS MEMOIZADAS PARA SIDEBAR ===
  // Memoizar props que no cambian frecuentemente
  const memoizedSidebarProps = useMemo(() => ({
    nodes,
    setNodes,
    sidebarCollapsed,
    setSidebarCollapsed,
    allExpanded,
    toggleExpandAll,
    expandedKeys,
    setExpandedKeys,
    setShowCreateGroupDialog,
    setShowSettingsDialog,
    iconTheme: iconThemeSidebar,
    explorerFont: sidebarFont,
    explorerFontSize: sidebarFontSize,
    uiTheme: terminalTheme && terminalTheme.name ? terminalTheme.name : 'Light',
    showToast: toast.current && toast.current.show ? toast.current.show : undefined,
    onOpenSSHConnection,
    onNodeContextMenu,
    onTreeAreaContextMenu,
    sidebarCallbacksRef,
    selectedNodeKey,
    setSelectedNodeKey,
    
    // Props para conexiones
    getAllFolders,
    createNewSSH,
    saveEditSSH,
    openEditSSHDialog,
    handleSaveRdpToSidebar,
    
    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshPort, setSSHPort,
    sshRemoteFolder, setSSHRemoteFolder,
    sshTargetFolder, setSSHTargetFolder,
    
    // Estados de formularios Edit SSH
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    
    // Estados para modo edición
    editSSHNode, setEditSSHNode,
    
    // Estados de formularios RDP
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode
  }), [
    nodes, setNodes, sidebarCollapsed, setSidebarCollapsed, allExpanded, toggleExpandAll,
    expandedKeys, setExpandedKeys, setShowCreateGroupDialog, setShowSettingsDialog,
    iconThemeSidebar, sidebarFont, sidebarFontSize, terminalTheme,
    toast, onOpenSSHConnection, onNodeContextMenu, onTreeAreaContextMenu,
    sidebarCallbacksRef, selectedNodeKey, setSelectedNodeKey,
    
    // Dependencias para conexiones
    getAllFolders, createNewSSH, saveEditSSH, openEditSSHDialog, handleSaveRdpToSidebar,
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser, sshPassword, setSSHPassword,
    sshPort, setSSHPort, sshRemoteFolder, setSSHRemoteFolder, sshTargetFolder, setSSHTargetFolder,
    editSSHName, setEditSSHName, editSSHHost, setEditSSHHost, editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword, editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort, editSSHNode, setEditSSHNode,
    rdpNodeData, setRdpNodeData, editingRdpNode, setEditingRdpNode
  ]);

  // === PROPS MEMOIZADAS PARA TABHEADER ===
  // Memoizar props que no cambian frecuentemente
  const memoizedTabProps = useMemo(() => ({
    tabDistros,
    dragStartTimer,
    draggedTabIndex
  }), [tabDistros, dragStartTimer, draggedTabIndex]);

  // === PROPS MEMOIZADAS PARA TABCONTENTRENDERER ===
  // Memoizar props que no cambian frecuentemente
  const memoizedContentRendererProps = useMemo(() => ({
    // HomeTab props
    onCreateSSHConnection: onOpenSSHConnection,
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
    findNodeByKey
  }), [
    onOpenSSHConnection, openFolderDialog, onOpenRdpConnection, handleLoadGroupFromFavorites,
    openEditRdpDialog, openEditSSHDialog, nodes, localFontFamily, localFontSize,
    localLinuxTerminalTheme, localPowerShellTheme, iconTheme, explorerFont,
    explorerColorTheme, explorerFontSize, fontFamily, fontSize, terminalTheme,
    handleTerminalContextMenu, showTerminalContextMenu, sshStatsByTabId,
    terminalRefs, statusBarIconTheme, handleCloseSplitPanel, rdpTabs, findNodeByKey
  ]);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <TitleBar
        sidebarFilter={sidebarFilter}
        setSidebarFilter={setSidebarFilter}
        allNodes={nodes}
        findAllConnections={findAllConnections}
        onOpenSSHConnection={onOpenSSHConnection}
        onShowImportDialog={setShowImportDialog}
        onOpenImportWithSource={(source) => {
          try {
            setImportPreset({
              linkFile: true,
              linkedPath: source?.filePath || null,
              pollInterval: Number(source?.intervalMs) || 30000,
              overwrite: !!source?.options?.overwrite,
              placeInFolder: !!source?.options?.createContainerFolder,
              containerFolderName: source?.options?.containerFolderName || null
            });
          } catch {}
          setShowImportDialog(true);
        }}
        onQuickImportFromSource={async (source) => {
          try {
            if (!source?.filePath) {
              setShowImportDialog(true);
              return;
            }
            const readRes = await window.electron?.import?.readFile?.(source.filePath);
            if (!readRes?.ok) {
              setShowImportDialog(true);
              return;
            }
            let fileBlob;
            try {
              const fileName = source.fileName || source.filePath.split('\\').pop() || 'import.xml';
              fileBlob = new File([readRes.content], fileName, { type: 'text/xml' });
            } catch {
              fileBlob = new Blob([readRes.content], { type: 'text/xml' });
            }
            
            // Para archivos vinculados: SIEMPRE sobrescribir y usar opciones guardadas de la fuente
            const result = await ImportService.importFromMRemoteNG(fileBlob);
            await unifiedHandleImportComplete({
              ...result,
              overwrite: true, // SIEMPRE sobrescribir para archivos vinculados
              createContainerFolder: !!source?.options?.createContainerFolder,
              containerFolderName: source?.options?.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`,
              linkFile: true,
              pollInterval: Number(source?.intervalMs) || 30000,
              linkedFileName: source?.fileName || null,
              linkedFilePath: source?.filePath || null,
              linkedFileHash: result?.metadata?.contentHash || null
            });
          } catch (e) {
            console.error('Quick import failed:', e);
            setShowImportDialog(true);
          }
        }}
      />
      <DialogsManager
        // Referencias
        toast={toast}
        
        // Estados de diálogos
        showSSHDialog={showSSHDialog}
        setShowSSHDialog={setShowSSHDialog}
        showRdpDialog={showRdpDialog}
        setShowRdpDialog={setShowRdpDialog}
        showFolderDialog={showFolderDialog}
        setShowFolderDialog={setShowFolderDialog}
        showEditSSHDialog={showEditSSHDialog}
        setShowEditSSHDialog={setShowEditSSHDialog}
        showEditFolderDialog={showEditFolderDialog}
        setShowEditFolderDialog={setShowEditFolderDialog}
        showSettingsDialog={showSettingsDialog}
        setShowSettingsDialog={setShowSettingsDialog}
        showSyncDialog={showSyncDialog}
        setShowSyncDialog={setShowSyncDialog}

        showCreateGroupDialog={showCreateGroupDialog}
        setShowCreateGroupDialog={setShowCreateGroupDialog}
        showUnifiedConnectionDialog={showUnifiedConnectionDialog}
        setShowUnifiedConnectionDialog={setShowUnifiedConnectionDialog}
        
        // Estados de formularios SSH
        sshName={sshName}
        setSSHName={setSSHName}
        sshHost={sshHost}
        setSSHHost={setSSHHost}
        sshUser={sshUser}
        setSSHUser={setSSHUser}
        sshPassword={sshPassword}
        setSSHPassword={setSSHPassword}
        sshRemoteFolder={sshRemoteFolder}
        setSSHRemoteFolder={setSSHRemoteFolder}
        sshPort={sshPort}
        setSSHPort={setSSHPort}
        sshTargetFolder={sshTargetFolder}
        setSSHTargetFolder={setSSHTargetFolder}
        
        // Estados de formularios Edit SSH
        editSSHName={editSSHName}
        setEditSSHName={setEditSSHName}
        editSSHHost={editSSHHost}
        setEditSSHHost={setEditSSHHost}
        editSSHUser={editSSHUser}
        setEditSSHUser={setEditSSHUser}
        editSSHPassword={editSSHPassword}
        setEditSSHPassword={setEditSSHPassword}
        editSSHRemoteFolder={editSSHRemoteFolder}
        setEditSSHRemoteFolder={setEditSSHRemoteFolder}
        editSSHPort={editSSHPort}
        setEditSSHPort={setEditSSHPort}
        
        // Estados para modo edición
        editSSHNode={editSSHNode}
        setEditSSHNode={setEditSSHNode}
        
        // Estados de formularios RDP
        rdpName={rdpName}
        setRdpName={setRdpName}
        rdpServer={rdpServer}
        setRdpServer={setRdpServer}
        rdpUsername={rdpUsername}
        setRdpUsername={setRdpUsername}
        rdpPassword={rdpPassword}
        setRdpPassword={setRdpPassword}
        rdpPort={rdpPort}
        setRdpPort={setRdpPort}
        rdpClientType={rdpClientType}
        setRdpClientType={setRdpClientType}
        rdpGuacSecurity={rdpGuacSecurity}
        setRdpGuacSecurity={setRdpGuacSecurity}
        rdpTargetFolder={rdpTargetFolder}
        rdpNodeData={rdpNodeData}
        setRdpNodeData={setRdpNodeData}
        editingRdpNode={editingRdpNode}
        setEditingRdpNode={setEditingRdpNode}
        
        // Estados de formularios Folder
        folderName={folderName}
        setFolderName={setFolderName}
        parentNodeKey={parentNodeKey}
        editFolderNode={editFolderNode}
        editFolderName={editFolderName}
        setEditFolderName={setEditFolderName}
        
        // Estados de formularios Group
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        selectedGroupColor={selectedGroupColor}
        setSelectedGroupColor={setSelectedGroupColor}
        GROUP_COLORS={GROUP_COLORS}
        
        // Funciones
        createNewSSH={createNewSSH}
        createNewFolder={createNewFolder}
        createNewRdp={createNewRdp}
        saveEditSSH={saveEditSSH}
        saveEditFolder={saveEditFolder}
        createNewGroup={createNewGroup}
        handleSaveRdpToSidebar={handleSaveRdpToSidebar}
        closeRdpDialog={closeRdpDialog}
        getAllFolders={getAllFolders}
        nodes={nodes}
        
        // Theme management props
        availableThemes={availableThemes}
        availableFonts={availableFonts}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        localFontFamily={localFontFamily}
        setLocalFontFamily={setLocalFontFamily}
        localFontSize={localFontSize}
        setLocalFontSize={setLocalFontSize}
        terminalTheme={terminalTheme}
        setTerminalTheme={setTerminalTheme}
        statusBarTheme={statusBarTheme}
        setStatusBarTheme={setStatusBarTheme}
        localPowerShellTheme={localPowerShellTheme}
        setLocalPowerShellTheme={setLocalPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        iconTheme={iconTheme}
        setIconTheme={setIconTheme}
        iconThemeSidebar={iconThemeSidebar}
        setIconThemeSidebar={setIconThemeSidebar}
        explorerFont={explorerFont}
        setExplorerFont={setExplorerFont}
        explorerFontSize={explorerFontSize}
        setExplorerFontSize={setExplorerFontSize}
        explorerColorTheme={explorerColorTheme}
        setExplorerColorTheme={setExplorerColorTheme}
        sidebarFont={sidebarFont}
        setSidebarFont={setSidebarFont}
        sidebarFontSize={sidebarFontSize}
        setSidebarFontSize={setSidebarFontSize}
        statusBarIconTheme={statusBarIconTheme}
        setStatusBarIconTheme={setStatusBarIconTheme}
        statusBarPollingInterval={statusBarPollingInterval}
        setStatusBarPollingInterval={setStatusBarPollingInterval}
        
        // Sync settings props
        updateThemesFromSync={updateThemesFromSync}
        updateStatusBarFromSync={updateStatusBarFromSync}
      />

      {/* Menú contextual del árbol de la sidebar */}
      <ContextMenu
        model={isGeneralTreeMenu ? getGeneralTreeContextMenuItems() : getTreeContextMenuItems(selectedNode)}
        ref={treeContextMenuRef}
        breakpoint="600px"
        style={{ zIndex: 99999 }}
      />
      <MainContentArea
        // Sidebar props
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarVisible={sidebarVisible}
        handleResize={handleResize}
        handleResizeThrottled={handleResizeThrottled}
        memoizedSidebarProps={memoizedSidebarProps}
        
        // Tab management props
        homeTabs={homeTabs}
        sshTabs={sshTabs}
        fileExplorerTabs={fileExplorerTabs}
        rdpTabs={rdpTabs}
        guacamoleTabs={guacamoleTabs}
        activeGroupId={activeGroupId}
        getTabsInGroup={getTabsInGroup}
        activeTabIndex={activeTabIndex}
        setActiveTabIndex={setActiveTabIndex}
        activatingNowRef={activatingNowRef}
        setGroupActiveIndices={setGroupActiveIndices}
        GROUP_KEYS={GROUP_KEYS}
        
        // Tab rendering props
        renderGroupTabs={renderGroupTabs}
        filteredTabs={filteredTabs}
        
        // Tab header props
        memoizedTabProps={memoizedTabProps}
        tabHandlers={tabHandlers}
        dragOverTabIndex={dragOverTabIndex}
        
        // Content renderer props
        memoizedContentRendererProps={memoizedContentRendererProps}
        sshStatsByTabId={sshStatsByTabId}
        
        // Context menu props
        tabContextMenu={tabContextMenu}
        setTabContextMenu={setTabContextMenu}
        terminalContextMenu={terminalContextMenu}
        setTerminalContextMenu={setTerminalContextMenu}
        showOverflowMenu={showOverflowMenu}
        setShowOverflowMenu={setShowOverflowMenu}
        overflowMenuPosition={overflowMenuPosition}
        overflowMenuItems={overflowMenuItems}
        
        // Tab context menu props
        tabGroups={tabGroups}
        moveTabToGroup={moveTabToGroup}
        setShowCreateGroupDialog={setShowCreateGroupDialog}
        isGroupFavorite={isGroupFavorite}
        addGroupToFavorites={addGroupToFavorites}
        removeGroupFromFavorites={removeGroupFromFavorites}
        deleteGroup={deleteGroup}
        toast={toast}
        
        // Selected node props
        selectedNodeKey={selectedNodeKey}
        
        // Terminal handlers
        handleCopyFromTerminalWrapper={handleCopyFromTerminalWrapper}
        handlePasteToTerminalWrapper={handlePasteToTerminalWrapper}
        handleSelectAllTerminalWrapper={handleSelectAllTerminalWrapper}
        handleClearTerminalWrapper={handleClearTerminalWrapper}
        
        // Theme props
        isHomeTabActive={isHomeTabActive}
        localTerminalBg={localTerminalBg}
        
        // Tree context menu
        isGeneralTreeMenu={isGeneralTreeMenu}
        getGeneralTreeContextMenuItems={getGeneralTreeContextMenuItems}
        getTreeContextMenuItems={getTreeContextMenuItems}
        selectedNode={selectedNode}
                treeContextMenuRef={treeContextMenuRef}
      />
      
      <ImportDialog
        visible={showImportDialog}
        onHide={() => setShowImportDialog(false)}
        onImportComplete={async (result) => {
          console.log('🔍 DEBUG App.js - WRAPPER EJECUTÁNDOSE');
          console.log('🔍 DEBUG App.js - handleImportComplete recibido:', typeof handleImportComplete);
          console.log('🔍 DEBUG App.js - result recibido:', result);
          try {
            const res = await handleImportComplete(result);
            console.log('🔍 DEBUG App.js - handleImportComplete completado');
            return res;
          } catch (error) {
            console.error('🔍 DEBUG App.js - Error en handleImportComplete:', error);
            throw error;
          }
        }}
        showToast={(message) => toast.current?.show(message)}
        presetOptions={importPreset}
        targetFolderOptions={(() => {
          const list = [];
          const walk = (arr, prefix = '') => {
            if (!Array.isArray(arr)) return;
            for (const n of arr) {
              if (n && n.droppable) {
                list.push({ label: `${prefix}${n.label}`, value: n.key });
                if (n.children && n.children.length) walk(n.children, `${prefix}${n.label} / `);
              }
            }
          };
          walk(nodes || []);
          return list;
        })()}
        defaultTargetFolderKey={null}
      />
    </div>
  );
};

export default App;
