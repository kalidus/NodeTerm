import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTabManagement } from '../hooks/useTabManagement';
import { useConnectionManagement } from '../hooks/useConnectionManagement';
import { useSidebarManagement } from '../hooks/useSidebarManagement';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { loadSavedTabTheme } from '../utils/tabThemeLoader';
import i18n from '../i18n';
import ErrorBoundary from './ErrorBoundary';
// 🚀 OPTIMIZACIÓN: Servicio de detección centralizado para evitar múltiples llamadas IPC
import systemDetectionService from '../services/SystemDetectionService';

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
import { useRecordingManagement } from '../hooks/useRecordingManagement';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';

import { ContextMenu } from 'primereact/contextmenu';
import TerminalComponent from './TerminalComponent';
// FileExplorer ahora usa lazy loading arriba
import Sidebar from './Sidebar';
import SplitLayout from './SplitLayout';
import { themes } from '../themes';
import { iconThemes } from '../themes/icon-themes';
import { FUTURISTIC_UI_KEYS } from '../themes/ui-themes';


// 🚀 OPTIMIZACIÓN: Lazy loading de componentes pesados
// Estos componentes se cargan bajo demanda, no al inicio
const SettingsDialog = lazy(() => import('./SettingsDialog'));
const SyncSettingsDialog = lazy(() => import('./SyncSettingsDialog'));
const ImportDialog = lazy(() => import('./ImportDialog'));
const ExportDialog = lazy(() => import('./ExportDialog'));
const ImportExportDialog = lazy(() => import('./ImportExportDialog'));
const ImportWizardDialog = lazy(() => import('./ImportWizardDialog'));
const RdpSessionTab = lazy(() => import('./RdpSessionTab'));
const GuacamoleTab = lazy(() => import('./GuacamoleTab'));
const GuacamoleTerminal = lazy(() => import('./GuacamoleTerminal'));
const FileExplorer = lazy(() => import('./FileExplorer'));


// NOTA: localStorageSyncService ahora se inicializa en index.js antes del render

// Componentes críticos (se cargan inmediatamente)
import TitleBar from './TitleBar';
import HomeTab from './HomeTab';
import { SSHDialog, FolderDialog, GroupDialog } from './Dialogs';
import ImportService from '../services/ImportService';
import { unblockAllInputs, resolveFormBlocking, emergencyUnblockForms } from '../utils/formDebugger';
import SecureStorage from '../services/SecureStorage';


import UnlockDialog from './UnlockDialog';
import { detectBlockedInputs } from '../utils/formDebugger';
// import '../assets/form-fixes.css';
import '../styles/layout/sidebar.css';
import connectionStore, { recordRecent, toggleFavorite, addGroupToFavorites, removeGroupFromFavorites, isGroupFavorite, recordRecentPassword, helpers as connectionHelpers } from '../utils/connectionStore';
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
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [showImportExportDialog, setShowImportExportDialog] = React.useState(false);
  const resizeTimeoutRef = useRef(null);
  const [showImportWizard, setShowImportWizard] = React.useState(false);
  const [isAppReady, setIsAppReady] = React.useState(false);
  const [importPreset, setImportPreset] = React.useState(null);

  // === SISTEMA DE ENCRIPTACIÓN ===
  const [secureStorage] = useState(() => new SecureStorage());
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [masterKey, setMasterKey] = useState(null);

  // 🚀 OPTIMIZACIÓN: Cargar tema de pestañas de forma diferida para no bloquear el render inicial
  useEffect(() => {
    // Función para inicializar todos los temas de forma robusta
    const initializeAllThemes = async () => {
      try {
        // Inicializando temas

        // 1. Cargar tema de tabs (ligero, puede ejecutarse inmediatamente)
        loadSavedTabTheme();

        // 🚀 OPTIMIZACIÓN: Diferir importaciones pesadas usando requestIdleCallback
        // Esto permite que la UI se renderice primero
        const loadThemes = async () => {
          // 2. Importar y aplicar temas UI y status bar
          const { themeManager } = await import('../utils/themeManager');
          const { statusBarThemeManager } = await import('../utils/statusBarThemeManager');

          // 3. Aplicar temas con verificación (await para asegurar carga)
          // Preferir cargar desde archivo compartido (sync)
          await themeManager.loadSharedTheme();
          if (statusBarThemeManager.loadSharedTheme) {
            await statusBarThemeManager.loadSharedTheme();
          } else {
            statusBarThemeManager.loadSavedTheme();
          }

          // 4. Verificar que los temas se aplicaron correctamente
          setTimeout(() => {
            const rootStyles = getComputedStyle(document.documentElement);
            const dialogBg = rootStyles.getPropertyValue('--ui-dialog-bg');
            const sidebarBg = rootStyles.getPropertyValue('--ui-sidebar-bg');

            // Si los temas no se aplicaron correctamente, forzar re-aplicación
            if (!dialogBg || dialogBg === 'initial' || dialogBg === '' ||
              !sidebarBg || sidebarBg === 'initial' || sidebarBg === '') {
              console.warn('[Theme] Failsafe: Tema no cargado, aplicando Nord');
              themeManager.applyTheme('Nord');
              statusBarThemeManager.applyTheme('Night Owl');
            }

            // 5. Ocultar boot-splash cuando el tema esté completamente aplicado
            // Esperar un frame adicional para asegurar que todo está renderizado
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const splash = document.getElementById('boot-splash');
                if (splash) {
                  splash.classList.add('hidden');
                }
              });
            });
          }, 800); // Aumentado a 800ms para dar tiempo al IPC
        };

        // Diferir carga pesada usando requestIdleCallback si está disponible
        if (window.requestIdleCallback) {
          requestIdleCallback(() => {
            loadThemes().catch(err => {
              console.error('[THEME] Error cargando temas:', err);
            });
          }, { timeout: 300 });
        } else {
          // Fallback: usar setTimeout con delay mínimo
          setTimeout(() => {
            loadThemes().catch(err => {
              console.error('[THEME] Error cargando temas:', err);
            });
          }, 50);
        }

      } catch (error) {
        console.error('[THEME] Error inicializando temas:', error);
        // En caso de error, ocultar splash después de un tiempo razonable
        setTimeout(() => {
          const splash = document.getElementById('boot-splash');
          if (splash) {
            splash.classList.add('hidden');
          }
        }, 1000);
      }
    };

    // Ejecutar inicialización (solo carga ligera inmediatamente)
    initializeAllThemes();
  }, []);

  // Inicializar sistema de internacionalización (i18n)
  useEffect(() => {
    i18n.init().catch(err => {
      console.error('[App] Error inicializando i18n:', err);
    });
  }, []);

  // 🚀 OPTIMIZACIÓN: Inicializar detecciones de sistema de forma diferida
  // Esto evita bloquear el render inicial con llamadas IPC
  useEffect(() => {
    // Diferir detecciones 800ms después del mount para no bloquear el render
    systemDetectionService.initializeDeferred(800);
  }, []);

  // Detectar si necesita unlock al iniciar (o auto-unlock si está recordado)
  useEffect(() => {
    const initializeApp = async () => {
      console.log('[App] ✅ initializeApp() iniciado');

      // NOTA: La sincronización de localStorage se hace en index.js ANTES del render
      // para asegurar que los datos estén disponibles cuando los hooks se inicializan


      // Usar verificación asíncrona compatible con multi-instancia (archivo compartido)
      const hasKey = await secureStorage.checkHasSavedMasterKey();

      if (hasKey) {
        // Verificar si el usuario marcó "recordar contraseña"
        const rememberPassword = localStorage.getItem('nodeterm_remember_password') === 'true';

        if (rememberPassword) {
          // Intentar auto-unlock
          try {
            // loadMasterKey ya maneja la carga desde archivo si es necesario
            const savedMasterKey = await secureStorage.loadMasterKey();
            if (savedMasterKey) {
              // Auto-unlock exitoso
              setMasterKey(savedMasterKey);
              setNeedsUnlock(false);
              setIsAppReady(true);
              return;
            }
          } catch (err) {
            console.error('Error en auto-unlock:', err);
          }
        }

        // Si no está recordado o falló, mostrar unlock dialog
        setNeedsUnlock(true);
      }
      setIsAppReady(true);
    };

    initializeApp();
  }, [secureStorage]);

  // Inicializar preferencias de Guacamole desde localStorage sincronizado
  useEffect(() => {
    const initGuacamolePrefs = async () => {
      try {
        if (window.electron?.ipcRenderer) {
          // 1. Método preferido
          const method = localStorage.getItem('nodeterm_guacd_preferred_method');
          if (method) {
            await window.electron.ipcRenderer.invoke('guacamole:set-preferred-method', method).catch(() => { });
          }

          // 2. Timeout de inactividad
          const timeout = localStorage.getItem('rdp_freeze_timeout_ms');
          if (timeout) {
            const ms = parseInt(timeout, 10);
            if (!isNaN(ms)) {
              await window.electron.ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', ms).catch(() => { });
            }
          }
        }
      } catch (error) {
        console.error('[App] Error inicializando preferencias de Guacamole:', error);
      }
    };

    // Ejecutar con un pequeño delay para asegurar que LocalStorageSync haya terminado
    setTimeout(initGuacamolePrefs, 1000);
  }, []);

  // Handler para unlock exitoso
  const handleUnlockSuccess = useCallback((key) => {
    setMasterKey(key);
    setNeedsUnlock(false);
  }, []);

  // Inicializar window.toast para acceso global
  useEffect(() => {
    const updateToast = () => {
      if (toast.current) {
        window.toast = { current: toast.current };
      }
    };

    // Actualizar inmediatamente
    updateToast();

    // Actualizar periódicamente hasta que toast esté disponible
    const interval = setInterval(() => {
      if (toast.current) {
        updateToast();
        clearInterval(interval);
      }
    }, 100);

    // Limpiar después de 5 segundos si no se inicializa
    setTimeout(() => clearInterval(interval), 5000);

    return () => clearInterval(interval);
  }, []);

  // Actualizar contador de passwords cuando haya masterKey o en claro
  useEffect(() => {
    const updatePasswordsCount = async () => {
      try {
        let count = 0;
        const walk = (list) => Array.isArray(list) ? list.reduce((acc, n) => acc + (n?.data?.type === 'password' ? 1 : 0) + (Array.isArray(n?.children) ? walk(n.children) : 0), 0) : 0;

        // Intentar con datos encriptados si hay masterKey
        const enc = localStorage.getItem('passwords_encrypted');
        if (enc && masterKey) {
          try {
            const obj = JSON.parse(enc);
            const decrypted = await secureStorage.decryptData(obj, masterKey);
            // Los passwords se guardan como árbol; contar de forma recursiva
            count = walk(decrypted);
          } catch { }
        }

        // Fallback: datos sin cifrar
        if (!count) {
          const plain = localStorage.getItem('passwordManagerNodes');
          if (plain) {
            try { count = walk(JSON.parse(plain)); } catch { }
          }
        }

        // Guardar contador si es un número válido
        if (!isNaN(count) && count >= 0) {
          try { localStorage.setItem('passwords_count', String(count)); } catch { }
        }
      } catch { }
    };

    updatePasswordsCount();
  }, [masterKey, secureStorage]);

  // Handler cuando se configura master password desde Settings
  const handleMasterPasswordConfigured = useCallback((key) => {
    setMasterKey(key);
    // Ahora los datos se empezarán a guardar encriptados
  }, []);

  // Handler cuando se cambia master password desde Settings
  const handleMasterPasswordChanged = useCallback((key) => {
    setMasterKey(key);
    // Actualizar el estado con la nueva clave después del cambio
  }, []);

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
        key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`,
        uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`
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

        // Usar hash del sistema de archivos para alinear con el poller y evitar banners falsos
        let osHash = importResult.linkedFileHash || null;
        try {
          const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
          if (h?.ok && h?.hash) osHash = h.hash;
        } catch { }

        const newSource = {
          id: stableId,
          fileName: importResult.linkedFileName || null,
          filePath: importResult.linkedFilePath || null,
          fileHash: osHash,
          lastNotifiedHash: osHash,
          lastCheckedAt: Date.now(),
          intervalMs: Number(importResult.pollInterval) || 30000,
          options: {
            // Básicas (compatibilidad con UI existente)
            overwrite: !!importResult.overwrite,
            createContainerFolder: !!importResult.createContainerFolder,
            containerFolderName: importResult.containerFolderName || importResult.linkedContainerFolderName || null,
            // Específicas de modo vinculado (usadas por el banner)
            linkedOverwrite: !!importResult.linkedOverwrite,
            linkedCreateContainerFolder: !!importResult.linkedCreateContainerFolder,
            linkedContainerFolderName: importResult.linkedContainerFolderName || importResult.containerFolderName || null
          }
        };
        // Reemplazar cualquier entrada que coincida por id, ruta o nombre
        const filtered = sources.filter(s => !(
          (stableId && s.id === stableId) ||
          (newSource.filePath && s.filePath === newSource.filePath) ||
          (newSource.fileName && s.fileName === newSource.fileName)
        ));
        filtered.push(newSource);
        localStorage.setItem('IMPORT_SOURCES', JSON.stringify(filtered));
      }

      toast.current?.show({ severity: 'success', summary: 'Importación exitosa', detail: `Añadidas ${addedConnections} conexiones y ${addedFolders} carpetas`, life: 5000 });
      setTimeout(() => { try { resolveFormBlocking(toast.current); } catch { } }, 0);
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
      // Alinear SIEMPRE con hash del OS para que el poller no dispare banner al iniciar
      let osHash = importResult.linkedFileHash || null;
      try {
        const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
        if (h?.ok && h?.hash) osHash = h.hash;
      } catch { }
      const newSource = {
        id: stableId,
        fileName: importResult.linkedFileName || null,
        filePath: importResult.linkedFilePath || null,
        fileHash: osHash,
        lastNotifiedHash: osHash,
        lastCheckedAt: Date.now(),
        intervalMs: Number(importResult.pollInterval) || 30000,
        options: {
          overwrite: !!importResult.overwrite,
          createContainerFolder: !!importResult.createContainerFolder,
          containerFolderName: importResult.containerFolderName || null
        }
      };
      const filtered = sources.filter(s => !(
        (stableId && s.id === stableId) ||
        (newSource.filePath && s.filePath === newSource.filePath) ||
        (newSource.fileName && s.fileName === newSource.fileName)
      ));
      filtered.push(newSource);
      localStorage.setItem('IMPORT_SOURCES', JSON.stringify(filtered));
    }

    toast.current?.show({ severity: 'success', summary: 'Importación exitosa', detail: `Añadidas ${addedConnections} conexiones`, life: 5000 });
    setTimeout(() => { try { resolveFormBlocking(toast.current); } catch { } }, 0);
  };

  // Función para manejar la importación completa (estructura + conexiones)
  const handleImportComplete = async (importResult) => {
    try {
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
        ? (importResult?.linkedCreateContainerFolder === true)
        : (importResult?.createContainerFolder === true);
      // Respetar exactamente el nombre del modo vinculado si viene informado; no aplicar fallback
      const finalContainerLabel = isLinkedMode
        ? (importResult?.linkedContainerFolderName ?? importResult?.containerFolderName ?? '')
        : (importResult?.containerFolderName ?? '');
      const finalOverwrite = isLinkedMode
        ? (importResult?.linkedOverwrite === true)
        : (importResult?.overwrite === true);


      const insertIntoTarget = (nodesToInsert) => {

        // Inserta un array de nodos en la carpeta destino, con soporte para overwrite y contenedor opcional
        const containerize = (children) => ({
          key: `import_container_${Date.now()}`,
          uid: `import_container_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
          label: finalContainerLabel,
          droppable: true,
          children: children,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG'
        });

        if (baseTargetKey === ROOT_VALUE) {
          setNodes(prev => {
            const nodesCopy = JSON.parse(JSON.stringify(prev || []));
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              } else {
                nodesCopy.push(containerize(nodesToInsert));
                return nodesCopy;
              }
            }
            if (finalOverwrite) {
              return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            } else {
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
          key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`,
          uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`
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
    onOpenVncConnection,
    onOpenFileConnection,
    onOpenSSHTunnel,
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
    iconThemeSidebar, setIconThemeSidebar, iconSize, setIconSize,
    folderIconSize, setFolderIconSize, connectionIconSize, setConnectionIconSize,
    explorerFont, setExplorerFont,
    explorerFontSize, setExplorerFontSize, explorerColorTheme, setExplorerColorTheme,
    sidebarFont, setSidebarFont, sidebarFontSize, setSidebarFontSize, sidebarFontColor, setSidebarFontColor,
    treeTheme, setTreeTheme,
    sessionActionIconTheme, setSessionActionIconTheme,

    // Utility
    reloadThemes
  } = useThemeManagement();

  // Docker terminal theme state
  const [localDockerTerminalTheme, setLocalDockerTerminalTheme] = useState(() => {
    try {
      return localStorage.getItem('localDockerTerminalTheme') || 'Default Dark';
    } catch {
      return 'Default Dark';
    }
  });

  // Docker terminal font family state
  const [dockerFontFamily, setDockerFontFamily] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_docker_font_family');
      if (saved) return saved;
      // Fallback to localFontFamily if available, otherwise default
      return localFontFamily || 'Consolas';
    } catch {
      return 'Consolas';
    }
  });

  // Docker terminal font size state
  const [dockerFontSize, setDockerFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_docker_font_size');
      if (saved) return parseInt(saved, 10);
      // Fallback to localFontSize if available, otherwise default
      return localFontSize || 14;
    } catch {
      return 14;
    }
  });

  // Listen for Docker settings changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'localDockerTerminalTheme') {
        setLocalDockerTerminalTheme(e.newValue || 'Default Dark');
      } else if (e.key === 'nodeterm_docker_font_family') {
        const newValue = e.newValue || localStorage.getItem('nodeterm_docker_font_family') || localFontFamily || 'Consolas';
        setDockerFontFamily(newValue);
      } else if (e.key === 'nodeterm_docker_font_size') {
        const saved = e.newValue || localStorage.getItem('nodeterm_docker_font_size');
        const newValue = saved ? parseInt(saved, 10) : (localFontSize || 14);
        setDockerFontSize(newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events (for same-window updates)
    const handleCustomStorageChange = (e) => {
      if (e.detail?.key === 'localDockerTerminalTheme') {
        setLocalDockerTerminalTheme(e.detail.value || 'Default Dark');
      } else if (e.detail?.key === 'nodeterm_docker_font_family') {
        const newValue = e.detail.value || localStorage.getItem('nodeterm_docker_font_family') || localFontFamily || 'Consolas';
        setDockerFontFamily(newValue);
      } else if (e.detail?.key === 'nodeterm_docker_font_size') {
        const saved = e.detail.value || localStorage.getItem('nodeterm_docker_font_size');
        const newValue = saved ? parseInt(saved, 10) : (localFontSize || 14);
        setDockerFontSize(newValue);
      }
    };
    window.addEventListener('localStorageChange', handleCustomStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, [localFontFamily, localFontSize]);

  // Split management hook - debe estar antes de useDragAndDrop
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
    toast,
    disconnectSSHSession,
    getFilteredTabs
  });

  // Usar el hook de drag & drop
  const {
    draggedTabIndex, dragOverTabIndex, dragStartTimer,
    handleTabDragStart, handleTabDragOver, handleTabDragLeave,
    handleTabDrop, handleTabDragEnd,
    draggedSSHNodeRef // Ref para almacenar nodo SSH arrastrado desde sidebar
  } = useDragAndDrop({
    getFilteredTabs,
    openTabOrder,
    setOpenTabOrder,
    setActiveTabIndex,
    openInSplit // Pasar función para crear splits desde drag & drop
  });

  // Exponer el ref globalmente para que Sidebar pueda usarlo
  useEffect(() => {
    if (draggedSSHNodeRef) {
      window.draggedSSHNodeRef = draggedSSHNodeRef;
    }
    return () => {
      if (window.draggedSSHNodeRef === draggedSSHNodeRef) {
        delete window.draggedSSHNodeRef;
      }
    };
  }, [draggedSSHNodeRef]);

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
    resizeTimeoutRef,
    hideContextMenu
  });


  // Recording management hook
  const {
    recordingTabs,
    startRecording,
    stopRecording,
    isRecording,
    getRecordingInfo,
    pauseRecording,
    resumeRecording,
    cleanupRecording
  } = useRecordingManagement(toast);

  // Recording handlers
  const handleStartRecording = useCallback(async (tabKey) => {
    const tab = sshTabs.find(t => t.key === tabKey);
    if (!tab || !tab.sshConfig) {
      console.warn('No se encontró tab SSH para grabar:', tabKey);
      return;
    }

    await startRecording(tabKey, tab);
  }, [sshTabs, startRecording]);

  const handleStopRecording = useCallback(async (tabKey) => {
    await stopRecording(tabKey);
  }, [stopRecording]);

  // Usar el hook de gestión del sidebar
  const {
    nodes, setNodes, reloadNodes, isExternalReloadRef, updateTreeHash,
    selectedNode, setSelectedNode,
    isGeneralTreeMenu, setIsGeneralTreeMenu,
    selectedNodeKey, setSelectedNodeKey,
    sidebarFilter, setSidebarFilter,
    sidebarCallbacksRef,
    parseWallixUser,
    getActiveConnectionIds,
    findAllConnections,
    getTreeContextMenuItems,
    getGeneralTreeContextMenuItems,
    // Expansion state (moved from useWindowManagement)
    expandedKeys, setExpandedKeys,
    allExpanded, setAllExpanded,
    toggleExpandAll
  } = useSidebarManagement(toast, {
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey,
    getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection, onOpenVncConnection,
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
    showFileConnectionDialog, setShowFileConnectionDialog,
    showProtocolSelectionDialog, setShowProtocolSelectionDialog,
    showNetworkToolsDialog, setShowNetworkToolsDialog,
    showSSHTunnelDialog, setShowSSHTunnelDialog,
    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshRemoteFolder, setSSHRemoteFolder,
    sshPort, setSSHPort,
    sshTargetFolder, setSSHTargetFolder,
    sshAutoCopyPassword, setSSHAutoCopyPassword,
    sshDescription, setSSHDescription,
    // Estados de formularios Edit SSH
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,
    editSSHDescription, setEditSSHDescription,
    editSSHIcon, setEditSSHIcon,
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
    vncNodeData, setVncNodeData,
    editingVncNode, setEditingVncNode,
    // Estados de formularios Archivos (SFTP/FTP/SCP)
    fileConnectionName, setFileConnectionName,
    fileConnectionHost, setFileConnectionHost,
    fileConnectionUser, setFileConnectionUser,
    fileConnectionPassword, setFileConnectionPassword,
    fileConnectionPort, setFileConnectionPort,
    fileConnectionProtocol, setFileConnectionProtocol,
    fileConnectionRemoteFolder, setFileConnectionRemoteFolder,
    fileConnectionTargetFolder, setFileConnectionTargetFolder,
    editingFileConnectionNode, setEditingFileConnectionNode,
    // Estados de formularios Folder
    folderName, setFolderName,
    folderColor, setFolderColor,
    folderIcon, setFolderIcon,
    parentNodeKey, setParentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    editFolderColor, setEditFolderColor,
    editFolderIcon, setEditFolderIcon,
    // Funciones de utilidad
    resetSSHForm, resetRDPForm, resetFolderForm,
    resetEditSSHForm, resetEditFolderForm,
    resetSSHTunnelForm,
    openSSHDialog, openRDPDialog, openFolderDialog, openSSHTunnelDialog,
    closeSSHDialogWithReset, closeRDPDialogWithReset, closeFolderDialogWithReset,
    closeEditSSHDialogWithReset, closeEditFolderDialogWithReset, closeSSHTunnelDialogWithReset,
    editingSSHTunnelNode, setEditingSSHTunnelNode
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
    onTreeAreaContextMenu: onTreeAreaContextMenuHook,
    hideContextMenu
  } = useContextMenuManagement();

  // Window management hook
  const {
    // Estados de ventana y sidebar
    sidebarVisible, setSidebarVisible,
    sidebarCollapsed, setSidebarCollapsed,
    // Funciones de resize
    handleResize, handleResizeThrottled
    // Funciones de expansión (moved to useSidebarManagement)
    // toggleExpandAll
  } = useWindowManagement({
    getFilteredTabs,
    activeTabIndex,
    resizeTerminals,
    nodes,
    resizeTimeoutRef // Pasar referencia compartida
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
    createNewSSHTunnel,
    openEditSSHTunnelDialog,
    duplicateSSHTunnel,
    saveEditSSH,
    saveEditFolder,
    openEditSSHDialog,
    openNewRdpDialog,
    openNewVncDialog,
    closeRdpDialog,
    openEditRdpDialog,
    openEditVncDialog,
    handleSaveRdpToSidebar,
    handleSaveVncToSidebar,
    handleSaveFileConnectionToSidebar,
    openEditFileConnectionDialog,
    openNewUnifiedConnectionDialog,
    createNewPasswordEntry
  } = useFormHandlers({
    toast,
    setShowRdpDialog,
    setShowEditSSHDialog,
    setShowEditFolderDialog,

    setShowUnifiedConnectionDialog,
    setShowFileConnectionDialog,
    setShowProtocolSelectionDialog,
    // Estados SSH para creación
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser,
    sshPassword, setSSHPassword, sshRemoteFolder, setSSHRemoteFolder,
    sshPort, setSSHPort, sshTargetFolder, setSSHTargetFolder,
    sshAutoCopyPassword, setSSHAutoCopyPassword,
    sshDescription,
    closeSSHDialogWithReset,
    // Estados SSH para edición
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,
    editSSHDescription, setEditSSHDescription,
    editSSHIcon, setEditSSHIcon,
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
    vncNodeData, setVncNodeData,
    editingVncNode, setEditingVncNode,
    // Estados Archivos (SFTP/FTP/SCP)
    fileConnectionName, setFileConnectionName,
    fileConnectionHost, setFileConnectionHost,
    fileConnectionUser, setFileConnectionUser,
    fileConnectionPassword, setFileConnectionPassword,
    fileConnectionPort, setFileConnectionPort,
    fileConnectionProtocol, setFileConnectionProtocol,
    fileConnectionRemoteFolder, setFileConnectionRemoteFolder,
    fileConnectionTargetFolder, setFileConnectionTargetFolder,
    editingFileConnectionNode, setEditingFileConnectionNode,
    // Estados Folder
    folderName, parentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    closeFolderDialogWithReset,
    // Estados SSH Tunnel
    setShowSSHTunnelDialog,
    closeSSHTunnelDialogWithReset,
    editingSSHTunnelNode,
    setEditingSSHTunnelNode,
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
    setLastOpenedTabKey,
    setOnCreateActivateTabKey,
    homeTabs,
    onOpenRdpConnection,
    onOpenVncConnection,
    iconThemes,
    iconThemeSidebar,
    sidebarFont,
    folderIconSize,
    setEditFolderNode,
    setEditFolderName,
    setEditFolderColor,
    setEditFolderIcon,
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



  // Load initial nodes from localStorage or use default (CON ENCRIPTACIÓN)
  useEffect(() => {
    const loadNodes = async () => {
      try {
        if (masterKey) {
          // CON master key: Cargar encriptado
          const encryptedData = localStorage.getItem('connections_encrypted');

          if (encryptedData) {
            const decrypted = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
            setNodes(decrypted);
          } else {
            // Migración: Si hay datos sin encriptar, encriptarlos
            const plainData = localStorage.getItem(STORAGE_KEYS.TREE_DATA);
            if (plainData) {
              let loadedNodes = JSON.parse(plainData);
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

              // Encriptar y guardar
              const encrypted = await secureStorage.encryptData(migratedNodes, masterKey);
              localStorage.setItem('connections_encrypted', JSON.stringify(encrypted));

              // Eliminar datos sin encriptar
              localStorage.removeItem(STORAGE_KEYS.TREE_DATA);

              setNodes(migratedNodes);
            } else {
              setNodes(getDefaultNodes());
            }
          }
        } else {
          // SIN master key: Funciona como antes
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
            setNodes(migratedNodes);
          } else {
            setNodes(getDefaultNodes());
          }
        }
      } catch (error) {
        console.error('Error loading nodes:', error);
        setNodes(getDefaultNodes());
      }
    };

    loadNodes();
  }, [masterKey, secureStorage]);

  // Save nodes to localStorage whenever they change (CON ENCRIPTACIÓN)
  useEffect(() => {
    const saveNodes = async () => {
      if (nodes.length === 0) return;

      try {
        if (masterKey) {
          // CON master key: Guardar encriptado
          const encrypted = await secureStorage.encryptData(nodes, masterKey);
          localStorage.setItem('connections_encrypted', JSON.stringify(encrypted));

          // Limpiar datos sin encriptar
          localStorage.removeItem(STORAGE_KEYS.TREE_DATA);
        } else {
          // SIN master key: Guardar como antes
          localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(nodes));
        }
      } catch (error) {
        console.error('Error saving nodes:', error);
      }
    };

    saveNodes();
  }, [nodes, masterKey, secureStorage]);

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
      return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch { } };
    }
  }, []);




  useEffect(() => {
    window.__DEBUG_NODES__ = () => nodes;
  }, [nodes]);

  // Crear password desde el tab Password del diálogo unificado
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail || {};
      try {
        // Crear nodo en la carpeta seleccionada
        const targetKey = p.targetFolder || null;
        createNewPasswordEntry(targetKey, p);
      } catch (err) {
        console.error('Error creando password desde diálogo:', err);
      }
    };
    window.addEventListener('create-password-from-dialog', handler);
    return () => window.removeEventListener('create-password-from-dialog', handler);
  }, []);

  // Abrir diálogo unificado directamente en pestaña Password desde menú contextual
  useEffect(() => {
    const handler = (e) => {
      try {
        const targetFolder = e.detail?.targetFolder || null;
        const isPasswordView = e.detail?.isPasswordView || false;

        // Solo permitir crear passwords si estamos en la vista de passwords
        if (!isPasswordView) {
          console.log('⚠️ Intentando crear password fuera de la vista de passwords - ignorando');
          return;
        }

        // Abrir diálogo unificado y cambiar a pestaña Password (índice 2)
        setShowUnifiedConnectionDialog(true);
        // Dejar una marca global para que el propio diálogo active la pestaña Password
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
  }, []);

  // Crear y activar pestaña de info de secreto (password, crypto_wallet, api_key, secure_note)
  useEffect(() => {
    const handler = (e) => {
      const info = e.detail || {};
      const tabId = `${info.key}_${Date.now()}`;
      const secretType = info.type || info.data?.type || 'password';

      // Construir passwordData con todos los campos según el tipo
      const passwordData = {
        id: info.key,
        title: info.label || info.title,
        type: secretType,
        // Campos comunes
        notes: info.notes || info.data?.notes || '',
        // Campos para password
        username: info.username || info.data?.username || '',
        password: info.password || info.data?.password || '',
        url: info.url || info.data?.url || '',
        group: info.group || info.data?.group || '',
        // Campos para crypto_wallet
        network: info.network || info.data?.network || '',
        address: info.address || info.data?.address || '',
        seedPhrase: info.seedPhrase || info.data?.seedPhrase || '',
        seedWordsCount: info.seedWordsCount || info.data?.seedWordsCount || 24,
        privateKey: info.privateKey || info.data?.privateKey || '',
        passphrase: info.passphrase || info.data?.passphrase || '',
        // Campos para api_key
        apiKey: info.apiKey || info.data?.apiKey || '',
        apiSecret: info.apiSecret || info.data?.apiSecret || '',
        endpoint: info.endpoint || info.data?.endpoint || '',
        serviceName: info.serviceName || info.data?.serviceName || '',
        // Campos para secure_note
        noteContent: info.noteContent || info.data?.noteContent || ''
      };

      // Registrar como reciente para TODOS los tipos de secretos (password, wallet, api_key, etc.)
      try {
        recordRecentPassword({
          id: info.key,
          name: info.label,
          username: passwordData.username,
          password: passwordData.password,
          url: passwordData.url,
          group: passwordData.group,
          notes: passwordData.notes,
          type: secretType, // password, crypto_wallet, api_key, secure_note
          icon: info.data?.icon || 'pi-key'
        }, 5);
      } catch (e) {
        console.warn('Error registrando secreto reciente:', e);
      }

      // Determinar icono según tipo para la etiqueta de la pestaña
      const getTabIcon = () => {
        switch (secretType) {
          case 'crypto_wallet': return '💰';
          case 'api_key': return '🔑';
          case 'secure_note': return '📝';
          default: return '🔐';
        }
      };

      // Usar TAB_TYPES.PASSWORD para que coincida con el renderer
      const newTab = { key: tabId, label: `${getTabIcon()} ${info.label}`, type: TAB_TYPES.PASSWORD, passwordData, createdAt: Date.now() };
      setSshTabs(prev => [newTab, ...prev]);
      // Activar la nueva pestaña usando la misma lógica que otras pestañas
      setTimeout(() => {
        setLastOpenedTabKey(tabId);
        setOnCreateActivateTabKey(tabId);
        const allTabs = getAllTabs();
        const tabIndex = allTabs.findIndex(t => t.key === tabId);
        if (tabIndex !== -1) {
          setActiveTabIndex(tabIndex);
          setGroupActiveIndices(prev => ({ ...prev, 'no-group': tabIndex }));
        }
      }, 0);
    };
    window.addEventListener('open-password-tab', handler);
    return () => window.removeEventListener('open-password-tab', handler);
  }, [getAllTabs]);

  // Crear y activar pestaña de carpeta de passwords desde doble clic
  useEffect(() => {
    const handler = (e) => {
      const info = e.detail || {};
      const tabId = `${info.folderKey}_${Date.now()}`;
      const folderData = {
        folderLabel: info.folderLabel,
        passwords: info.passwords || []
      };
      // Usar TAB_TYPES.PASSWORD_FOLDER para el nuevo tipo de pestaña
      const newTab = {
        key: tabId,
        label: `📁 ${info.folderLabel}`,
        type: TAB_TYPES.PASSWORD_FOLDER,
        folderData,
        createdAt: Date.now()
      };
      setSshTabs(prev => [newTab, ...prev]);
      // Activar la nueva pestaña usando la misma lógica que otras pestañas
      setTimeout(() => {
        setLastOpenedTabKey(tabId);
        setOnCreateActivateTabKey(tabId);
        const allTabs = getAllTabs();
        const tabIndex = allTabs.findIndex(t => t.key === tabId);
        if (tabIndex !== -1) {
          setActiveTabIndex(tabIndex);
          setGroupActiveIndices(prev => ({ ...prev, 'no-group': tabIndex }));
        }
      }, 0);
    };
    window.addEventListener('open-password-folder-tab', handler);
    return () => window.removeEventListener('open-password-folder-tab', handler);
  }, [getAllTabs]);

  // Escuchar eventos de expansión de nodos desde el buscador
  useEffect(() => {
    const handleExpandNodePath = (event) => {
      const { expandedKeys: newExpandedKeys } = event.detail;
      if (newExpandedKeys) {
        setExpandedKeys(newExpandedKeys);
      }
    };

    window.addEventListener('expand-node-path', handleExpandNodePath);

    // Event listener para crear pestañas de auditoría global
    const handleCreateAuditTab = (event) => {
      const { tabId, title, recordings } = event.detail;

      // Crear nueva pestaña de auditoría global
      const newAuditTab = {
        key: tabId,
        label: title,
        type: 'audit-global',
        recordings: recordings,
        createdAt: Date.now(),
        groupId: null
      };

      // Añadir a las pestañas SSH (reutilizando la estructura existente)
      setSshTabs(prevTabs => [newAuditTab, ...prevTabs]);

      // Activar la nueva pestaña
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
    };

    window.addEventListener('create-audit-tab', handleCreateAuditTab);

    // Event listener para crear pestañas de terminal desde QuickAccessSidebar
    const handleCreateTerminalTab = (event) => {
      const { type, distroInfo } = event.detail;

      // Disparar evento para que MainContentArea maneje la creación del terminal
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

    const handleCreateAITab = (event) => {
      insertPinnedTab(event.detail?.tab);
    };

    const handleCreateAnythingLLMTab = (event) => {
      insertPinnedTab(event.detail?.tab);
    };

    const handleCreateOpenWebUITab = (event) => {
      insertPinnedTab(event.detail?.tab);
    };

    window.addEventListener('create-ai-tab', handleCreateAITab);
    window.addEventListener('create-anythingllm-tab', handleCreateAnythingLLMTab);
    window.addEventListener('create-openwebui-tab', handleCreateOpenWebUITab);

    return () => {
      window.removeEventListener('expand-node-path', handleExpandNodePath);
      window.removeEventListener('create-audit-tab', handleCreateAuditTab);
      window.removeEventListener('create-terminal-tab', handleCreateTerminalTab);
      window.removeEventListener('create-ai-tab', handleCreateAITab);
      window.removeEventListener('create-anythingllm-tab', handleCreateAnythingLLMTab);
      window.removeEventListener('create-openwebui-tab', handleCreateOpenWebUITab);
    };
  }, [setExpandedKeys]);

  // Configurar callbacks RDP para el sidebar
  useEffect(() => {
    // Asegurar que el ref esté inicializado
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
    sidebarCallbacksRef.current.openFileConnection = (node, nodes) => {
      onOpenFileConnection(node, nodes);
    };
    sidebarCallbacksRef.current.editFileConnection = (node) => {
      openEditFileConnectionDialog(node);
    };
    sidebarCallbacksRef.current.openSSHTunnel = (node, nodes) => {
      onOpenSSHTunnel(node, nodes);
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
    sidebarCallbacksRef.current.deleteNode = (nodeKey, nodeLabel) => {
      // Detectar si la carpeta tiene hijos
      const nodeInfo = findParentNodeAndIndex(nodes, nodeKey);
      const hasChildren = !!(nodeInfo.node && Array.isArray(nodeInfo.node.children) && nodeInfo.node.children.length);
      confirmDeleteNode(nodeKey, nodeLabel, hasChildren, nodes, setNodes);
    };
  }, [nodes, setNodes, findParentNodeAndIndex, confirmDeleteNode, sidebarCallbacksRef, openEditFileConnectionDialog, onOpenSSHTunnel, openEditSSHTunnelDialog, duplicateSSHTunnel]);

  // Listener para evento personalizado de guardar conexión de archivos (fallback)
  useEffect(() => {
    const handleSaveFileConnection = (event) => {
      const fileData = event.detail;
      if (fileData && handleSaveFileConnectionToSidebar) {
        console.log('App - Recibido evento save-file-connection, guardando:', fileData);
        handleSaveFileConnectionToSidebar(fileData, false, null);
      }
    };

    window.addEventListener('save-file-connection', handleSaveFileConnection);
    return () => {
      window.removeEventListener('save-file-connection', handleSaveFileConnection);
    };
  }, [handleSaveFileConnectionToSidebar]);

  // Listener para abrir diálogo unificado de nueva conexión
  useEffect(() => {
    const handleOpenNewUnifiedConnectionDialog = (e) => {
      const activeTab = e?.detail?.activeTab;
      const initialCategory = e?.detail?.initialCategory;

      // Si hay initialCategory, dejar que DialogsManager lo maneje
      if (initialCategory) {
        return;
      }

      if (activeTab === 'password') {
        // Abrir diálogo unificado directamente en pestaña Password
        if (setShowUnifiedConnectionDialog) {
          setShowUnifiedConnectionDialog(true);
          // Guardar en window para que el diálogo sepa qué pestaña abrir
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

  // Event listener para abrir el diálogo de herramientas de red
  useEffect(() => {
    const handleOpenNetworkTools = () => {
      setShowNetworkToolsDialog(true);
    };

    window.addEventListener('open-network-tools-dialog', handleOpenNetworkTools);
    return () => {
      window.removeEventListener('open-network-tools-dialog', handleOpenNetworkTools);
    };
  }, [setShowNetworkToolsDialog]);

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

  // === FUNCIONES DE SINCRONIZACIÓN ===
  // Función para exportar el árbol de sesiones a JSON
  const exportTreeToJson = useCallback(() => {
    try {
      const treeData = {
        nodes: nodes,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      return JSON.stringify(treeData, null, 2);
    } catch (error) {
      console.error('[SYNC] Error exportando árbol:', error);
      throw new Error(`Error exportando árbol: ${error.message}`);
    }
  }, [nodes]);

  // Función para importar el árbol de sesiones desde JSON
  const importTreeFromJson = useCallback((treeJson) => {
    try {
      if (!treeJson || typeof treeJson !== 'string') {
        throw new Error('JSON del árbol inválido');
      }

      const treeData = JSON.parse(treeJson);
      let nodes = null;

      // Manejar diferentes formatos de estructura
      if (Array.isArray(treeData)) {
        // Formato directo: array de nodos
        nodes = treeData;
      } else if (treeData.nodes && Array.isArray(treeData.nodes)) {
        // Formato con wrapper: { nodes: [...] }
        nodes = treeData.nodes;
      } else {
        throw new Error('Estructura del árbol inválida');
      }

      // Migrar nodos si es necesario
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

      const migratedNodes = migrateNodes(nodes);

      // Actualizar el estado de los nodos
      setNodes(migratedNodes);

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(migratedNodes));

      // Árbol importado correctamente
      return true;
    } catch (error) {
      console.error('[SYNC] Error importando árbol:', error);
      throw new Error(`Error importando árbol: ${error.message}`);
    }
  }, [setNodes]);

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

  const [isHomeAIChatVisible, setIsHomeAIChatVisible] = useState(false);

  useEffect(() => {
    const handleHomeAIChatVisibility = (event) => {
      setIsHomeAIChatVisible(!!event?.detail?.visible);
    };
    window.addEventListener('ai-chat-home-visibility', handleHomeAIChatVisibility);
    return () => {
      window.removeEventListener('ai-chat-home-visibility', handleHomeAIChatVisibility);
    };
  }, []);

  // Listener global para Ctrl + rueda del ratón para cambiar tamaño de fuente de terminales
  useEffect(() => {
    const handleWheel = (e) => {
      // Solo procesar si Ctrl está presionado
      if (!e.ctrlKey) return;

      // Detectar si el cursor está sobre una terminal
      // xterm.js crea elementos con clase 'xterm' y también puede estar dentro de contenedores
      const target = e.target;
      const isOverTerminal = target.closest('.xterm') !== null ||
        target.closest('.terminal-outer-padding') !== null ||
        target.classList.contains('xterm') ||
        target.classList.contains('terminal-outer-padding') ||
        // También verificar si está dentro de un contenedor de terminal (para terminales locales)
        target.closest('[class*="terminal"]') !== null;

      // Si no está sobre una terminal, no hacer nada
      if (!isOverTerminal) return;

      // Prevenir el comportamiento por defecto (zoom del navegador)
      e.preventDefault();
      e.stopPropagation();

      // Determinar dirección del scroll (arriba = aumentar, abajo = disminuir)
      const delta = e.deltaY > 0 ? -1 : 1; // deltaY positivo = scroll abajo = disminuir
      const step = 1; // Incremento/decremento de 1px

      // Función para actualizar un tamaño de fuente con límites
      const updateFontSize = (currentSize, setter, storageKey, min = 8, max = 32) => {
        const newSize = Math.max(min, Math.min(max, currentSize + (delta * step)));
        if (newSize !== currentSize) {
          setter(newSize);
          localStorage.setItem(storageKey, newSize.toString());
          // Disparar evento de cambio para sincronización
          window.dispatchEvent(new CustomEvent('localStorageChange', {
            detail: { key: storageKey, value: newSize.toString() }
          }));
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: newSize.toString()
          }));
        }
        return newSize;
      };

      // Actualizar todos los tamaños de fuente de terminales
      // 1. SSH terminales
      const currentSSHSize = fontSize || 14;
      updateFontSize(currentSSHSize, setFontSize, 'basicapp_terminal_font_size');

      // 2. PowerShell/Linux locales
      const currentLocalSize = localFontSize || 14;
      updateFontSize(currentLocalSize, setLocalFontSize, 'basicapp_local_terminal_font_size');

      // 3. Linux/WSL terminales
      const currentLinuxSize = parseInt(localStorage.getItem('nodeterm_linux_font_size') || localFontSize || '14', 10);
      const newLinuxSize = updateFontSize(currentLinuxSize, () => { }, 'nodeterm_linux_font_size');
      // Notificar cambio para que TerminalSettingsTab lo detecte
      window.dispatchEvent(new CustomEvent('terminal-settings-changed', {
        detail: { linuxFontSize: newLinuxSize }
      }));

      // 4. Docker terminales
      const currentDockerSize = dockerFontSize || 14;
      updateFontSize(currentDockerSize, setDockerFontSize, 'nodeterm_docker_font_size');
    };

    // Agregar listener con capture para interceptar antes que otros handlers
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [fontSize, setFontSize, localFontSize, setLocalFontSize, dockerFontSize, setDockerFontSize]);

  const activeTab = filteredTabs[activeTabIndex] || null;
  const isAIChatActive = activeTab?.type === 'ai-chat' || (activeTab?.type === 'home' && isHomeTabActive && isHomeAIChatVisible);

  const handleToggleLocalTerminalForAIChat = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.type === 'ai-chat') {
      window.dispatchEvent(new CustomEvent('ai-chat-toggle-local-terminal', {
        detail: { tabKey: activeTab.key }
      }));
    } else if (activeTab.type === 'home' && isHomeTabActive && isHomeAIChatVisible) {
      window.dispatchEvent(new CustomEvent('ai-chat-home-toggle-terminal'));
    }
  }, [activeTab, isHomeTabActive, isHomeAIChatVisible]);

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
    showUnifiedConnectionDialog,
    setShowUnifiedConnectionDialog,
    iconTheme: iconThemeSidebar,
    iconSize: iconSize,
    folderIconSize: folderIconSize,
    connectionIconSize: connectionIconSize,
    explorerFont: sidebarFont,
    explorerFontSize: sidebarFontSize,
    explorerFontColor: sidebarFontColor,
    uiTheme: uiTheme || 'Light',
    showToast: toast.current && toast.current.show ? toast.current.show : undefined,
    confirmDialog: confirmDialog,
    onOpenSSHConnection,
    onOpenVncConnection,
    onNodeContextMenu,
    onTreeAreaContextMenu,
    hideContextMenu,
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
    sshAutoCopyPassword, setSSHAutoCopyPassword,
    sshDescription,

    // Estados de formularios Edit SSH
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,
    editSSHDescription, setEditSSHDescription,
    editSSHIcon, setEditSSHIcon,

    // Estados para modo edición
    editSSHNode, setEditSSHNode,

    // Estados de formularios RDP
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,

    // Encriptación
    masterKey,
    secureStorage,
    isAIChatActive,
    onToggleLocalTerminalForAIChat: handleToggleLocalTerminalForAIChat,

    // Tema del árbol
    treeTheme,

    // Tema de iconos de acción
    sessionActionIconTheme,

    // Callbacks para diálogos de importar/exportar
    onShowImportDialog: setShowImportDialog,
    onShowExportDialog: setShowExportDialog,
    onShowImportExportDialog: setShowImportExportDialog,
    onShowImportWizard: setShowImportWizard,
    isExternalReloadRef,
    updateTreeHash
  }), [
    nodes, setNodes, sidebarCollapsed, setSidebarCollapsed, allExpanded, toggleExpandAll,
    expandedKeys, setExpandedKeys, setShowCreateGroupDialog, setShowSettingsDialog,
    iconThemeSidebar, iconSize, sidebarFont, sidebarFontSize, sidebarFontColor, terminalTheme, treeTheme, sessionActionIconTheme,
    toast, confirmDialog, onOpenSSHConnection, onNodeContextMenu, onTreeAreaContextMenu, hideContextMenu,
    sidebarCallbacksRef, selectedNodeKey, setSelectedNodeKey,

    // Dependencias para conexiones
    getAllFolders, createNewSSH, saveEditSSH, openEditSSHDialog, handleSaveRdpToSidebar,
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser, sshPassword, setSSHPassword,
    sshPort, setSSHPort, sshRemoteFolder, setSSHRemoteFolder, sshTargetFolder, setSSHTargetFolder,
    sshAutoCopyPassword, setSSHAutoCopyPassword,
    sshDescription,
    editSSHName, setEditSSHName, editSSHHost, setEditSSHHost, editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword, editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort, editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,
    editSSHDescription, setEditSSHDescription, editSSHIcon, setEditSSHIcon,
    editSSHNode, setEditSSHNode,
    rdpNodeData, setRdpNodeData, editingRdpNode, setEditingRdpNode,

    // Dependencias de encriptación
    masterKey, secureStorage,
    isAIChatActive, handleToggleLocalTerminalForAIChat,

    // Dependencias de diálogos
    setShowImportDialog, setShowExportDialog, setShowImportExportDialog, setShowImportWizard
  ]);

  // === PROPS MEMOIZADAS PARA TABHEADER ===
  // Memoizar props que no cambian frecuentemente
  const memoizedTabProps = useMemo(() => ({
    tabDistros,
    dragStartTimer,
    draggedTabIndex
  }), [tabDistros, dragStartTimer, draggedTabIndex]);

  // === PROPS MEMOIZADAS PARA TABCONTENTRENDERER ===
  // Calcular activeIds para el HomeTab
  const activeIds = useMemo(() => {
    if (getActiveConnectionIds) {
      return getActiveConnectionIds(sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs);
    }
    return new Set();
  }, [getActiveConnectionIds, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs]);

  // Memoizar props que no cambian frecuentemente
  const memoizedContentRendererProps = useMemo(() => ({
    // HomeTab props
    onCreateSSHConnection: onOpenSSHConnection,
    onOpenSSHTunnel,
    openFolderDialog,
    onOpenRdpConnection,
    handleLoadGroupFromFavorites,
    openEditRdpDialog,
    openEditSSHDialog,
    nodes,
    localFontFamily,
    localFontSize,
    // Tab activation props
    setActiveTabIndex,
    setLastOpenedTabKey,
    setOnCreateActivateTabKey,
    setGroupActiveIndices,
    setOpenTabOrder,
    activeGroupId,
    activeTabIndex,
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
    openInSplit,
    // RDP props
    rdpTabs,
    findNodeByKey,
    // Recording props
    setSshTabs,
    // Tab group props
    setShowCreateGroupDialog,
    // Active connections
    activeIds
  }), [
    onOpenSSHConnection, openFolderDialog, onOpenRdpConnection, onOpenVncConnection, handleLoadGroupFromFavorites,
    openEditRdpDialog, openEditSSHDialog, nodes, localFontFamily, localFontSize,
    localLinuxTerminalTheme, localPowerShellTheme, localDockerTerminalTheme, dockerFontFamily, dockerFontSize, iconTheme, explorerFont,
    explorerColorTheme, explorerFontSize, fontFamily, fontSize, terminalTheme,
    handleTerminalContextMenu, showTerminalContextMenu, sshStatsByTabId,
    terminalRefs, statusBarIconTheme, handleCloseSplitPanel, openInSplit, rdpTabs, findNodeByKey,
    setSshTabs, setShowCreateGroupDialog, activeIds
  ]);

  if (!isAppReady) {
    return <div style={{ background: '#1e1e1e', height: '100vh', width: '100vw' }} />;
  }

  return (
    <ErrorBoundary>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
        {/* UnlockDialog - Pide master password al inicio si existe */}
        <UnlockDialog
          visible={needsUnlock}
          onSuccess={handleUnlockSuccess}
          secureStorage={secureStorage}
        />

        <TitleBar
          sidebarFilter={sidebarFilter}
          setSidebarFilter={setSidebarFilter}
          allNodes={nodes}
          findAllConnections={findAllConnections}
          onOpenSSHConnection={onOpenSSHConnection}
          onOpenRdpConnection={onOpenRdpConnection}
          onOpenVncConnection={onOpenVncConnection}
          onShowImportDialog={setShowImportDialog}
          onShowExportDialog={setShowExportDialog}
          onShowImportExportDialog={setShowImportExportDialog}
          onShowImportWizard={setShowImportWizard}
          masterKey={masterKey}
          secureStorage={secureStorage}
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
            } catch { }
            setShowImportDialog(true);
          }}
          openEditSSHDialog={openEditSSHDialog}
          openEditRdpDialog={openEditRdpDialog}
          openNewVncDialog={openNewVncDialog}
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

              // Importar y aplicar EXACTAMENTE las mismas opciones que el diálogo vinculado
              const result = await ImportService.importFromMRemoteNG(fileBlob);

              // Refrescar la fuente desde localStorage para obtener las últimas opciones del diálogo
              const allSources = JSON.parse(localStorage.getItem('IMPORT_SOURCES') || '[]');
              const fresh = (() => {
                const byId = allSources.find(s => (source?.id && s.id === source.id));
                if (byId) return byId;
                const byPath = allSources.find(s => (source?.filePath && s.filePath === source.filePath));
                if (byPath) return byPath;
                const byName = allSources.find(s => (source?.fileName && s.fileName === source.fileName));
                return byName || source;
              })();

              const opts = fresh?.options || source?.options || {};
              const linkedOverwrite = !!(opts.linkedOverwrite ?? opts.overwrite);
              const linkedCreateContainerFolder = !!(opts.linkedCreateContainerFolder ?? opts.createContainerFolder);
              // Tomar exactamente el nombre configurado en el diálogo (si existe)
              const effectiveContainerName = (opts.linkedContainerFolderName ?? opts.containerFolderName ?? '').toString();

              // Usar el MISMO hash que usa el poller para evitar banners repetidos
              let effectiveHash = result?.metadata?.contentHash || null;
              try {
                const hashRes = await window.electron?.import?.getFileHash?.(source.filePath);
                if (hashRes?.ok && hashRes?.hash) effectiveHash = hashRes.hash;
              } catch { }

              // Llamar a la MISMA ruta que usa el diálogo
              await handleImportComplete({
                ...result,
                // Modo vinculado
                linkFile: true,
                pollInterval: Number(source?.intervalMs) || 30000,
                linkedFileName: source?.fileName || null,
                linkedFilePath: source?.filePath || null,
                linkedFileHash: effectiveHash,
                // Opciones específicas de modo vinculado (las que usa el diálogo)
                linkedOverwrite,
                linkedCreateContainerFolder,
                linkedContainerFolderName: effectiveContainerName,
                // Por compatibilidad, reflejamos en las opciones básicas también
                overwrite: linkedOverwrite,
                createContainerFolder: linkedCreateContainerFolder,
                containerFolderName: effectiveContainerName
              });
            } catch (e) {
              console.error('Quick import failed:', e);
              setShowImportDialog(true);
            }
          }}
          iconTheme={iconTheme}
          expandedKeys={expandedKeys}
        />

        {/* Línea separadora debajo de la titlebar - Solo en temas futuristas */}
        {FUTURISTIC_UI_KEYS.includes(uiTheme) && (
          <div style={{
            height: '0.5px',
            background: 'var(--ui-tabgroup-border, #444)',
            opacity: 0.6,
            width: '100%',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            border: 'none',
            outline: 'none'
          }} />
        )}

        <DialogsManager
          // Referencias
          toast={toast}

          // Temas
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
          iconSize={iconSize}
          setIconSize={setIconSize}
          folderIconSize={folderIconSize}
          setFolderIconSize={setFolderIconSize}
          connectionIconSize={connectionIconSize}
          setConnectionIconSize={setConnectionIconSize}
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
          sidebarFontColor={sidebarFontColor}
          setSidebarFontColor={setSidebarFontColor}
          treeTheme={treeTheme}
          setTreeTheme={setTreeTheme}
          sessionActionIconTheme={sessionActionIconTheme}
          setSessionActionIconTheme={setSessionActionIconTheme}
          statusBarIconTheme={statusBarIconTheme}
          setStatusBarIconTheme={setStatusBarIconTheme}
          statusBarPollingInterval={statusBarPollingInterval}
          setStatusBarPollingInterval={setStatusBarPollingInterval}

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
          showFileConnectionDialog={showFileConnectionDialog}
          setShowFileConnectionDialog={setShowFileConnectionDialog}
          showProtocolSelectionDialog={showProtocolSelectionDialog}
          setShowProtocolSelectionDialog={setShowProtocolSelectionDialog}
          showNetworkToolsDialog={showNetworkToolsDialog}
          setShowNetworkToolsDialog={setShowNetworkToolsDialog}
          showSSHTunnelDialog={showSSHTunnelDialog}
          setShowSSHTunnelDialog={setShowSSHTunnelDialog}
          createNewSSHTunnel={createNewSSHTunnel}
          editingSSHTunnelNode={editingSSHTunnelNode}
          setEditingSSHTunnelNode={setEditingSSHTunnelNode}

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
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
          sshDescription={sshDescription}
          setSSHDescription={setSSHDescription}

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
          editSSHAutoCopyPassword={editSSHAutoCopyPassword}
          setEditSSHAutoCopyPassword={setEditSSHAutoCopyPassword}
          editSSHDescription={editSSHDescription}
          setEditSSHDescription={setEditSSHDescription}
          editSSHIcon={editSSHIcon}
          setEditSSHIcon={setEditSSHIcon}

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
          vncNodeData={vncNodeData}
          setVncNodeData={setVncNodeData}
          editingVncNode={editingVncNode}
          setEditingVncNode={setEditingVncNode}

          // Estados de formularios Archivos (SFTP/FTP/SCP)
          fileConnectionName={fileConnectionName}
          setFileConnectionName={setFileConnectionName}
          fileConnectionHost={fileConnectionHost}
          setFileConnectionHost={setFileConnectionHost}
          fileConnectionUser={fileConnectionUser}
          setFileConnectionUser={setFileConnectionUser}
          fileConnectionPassword={fileConnectionPassword}
          setFileConnectionPassword={setFileConnectionPassword}
          fileConnectionPort={fileConnectionPort}
          setFileConnectionPort={setFileConnectionPort}
          fileConnectionProtocol={fileConnectionProtocol}
          setFileConnectionProtocol={setFileConnectionProtocol}
          fileConnectionRemoteFolder={fileConnectionRemoteFolder}
          setFileConnectionRemoteFolder={setFileConnectionRemoteFolder}
          fileConnectionTargetFolder={fileConnectionTargetFolder}
          setFileConnectionTargetFolder={setFileConnectionTargetFolder}
          editingFileConnectionNode={editingFileConnectionNode}
          setEditingFileConnectionNode={setEditingFileConnectionNode}

          // Estados de formularios Folder
          folderName={folderName}
          setFolderName={setFolderName}
          folderColor={folderColor}
          setFolderColor={setFolderColor}
          folderIcon={folderIcon}
          setFolderIcon={setFolderIcon}
          parentNodeKey={parentNodeKey}
          editFolderNode={editFolderNode}
          editFolderName={editFolderName}
          setEditFolderName={setEditFolderName}
          editFolderColor={editFolderColor}
          setEditFolderColor={setEditFolderColor}
          editFolderIcon={editFolderIcon}
          setEditFolderIcon={setEditFolderIcon}

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
          handleSaveVncToSidebar={handleSaveVncToSidebar}
          handleSaveFileConnectionToSidebar={handleSaveFileConnectionToSidebar}
          // Exponer globalmente para acceso directo
          onFileConnectionSave={(fileData) => {
            if (handleSaveFileConnectionToSidebar) {
              handleSaveFileConnectionToSidebar(fileData, false, null);
            }
          }}
          closeRdpDialog={closeRdpDialog}
          getAllFolders={getAllFolders}
          nodes={nodes}

          // Funciones de sincronización
          exportTreeToJson={exportTreeToJson}
          importTreeFromJson={importTreeFromJson}
          sessionManager={sessionManager}

          // Encriptación
          onMasterPasswordConfigured={handleMasterPasswordConfigured}
          onMasterPasswordChanged={handleMasterPasswordChanged}
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
          setSshTabs={setSshTabs}
          fileExplorerTabs={fileExplorerTabs}
          rdpTabs={rdpTabs}
          guacamoleTabs={guacamoleTabs}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          getTabsInGroup={getTabsInGroup}
          activeTabIndex={activeTabIndex}
          setActiveTabIndex={setActiveTabIndex}
          activatingNowRef={activatingNowRef}
          setGroupActiveIndices={setGroupActiveIndices}
          setLastOpenedTabKey={setLastOpenedTabKey}
          setOnCreateActivateTabKey={setOnCreateActivateTabKey}
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

          // Recording handlers
          handleStartRecording={handleStartRecording}
          handleStopRecording={handleStopRecording}
          isRecordingTab={isRecording}
          recordingTabs={recordingTabs}

          // Theme props
          isHomeTabActive={isHomeTabActive}
          localTerminalBg={localTerminalBg}

          // Tree context menu
          isGeneralTreeMenu={isGeneralTreeMenu}
          getGeneralTreeContextMenuItems={getGeneralTreeContextMenuItems}
          getTreeContextMenuItems={getTreeContextMenuItems}
          selectedNode={selectedNode}
          treeContextMenuRef={treeContextMenuRef}

          // Sync settings props
          updateThemesFromSync={reloadThemes}
          updateStatusBarFromSync={updateStatusBarFromSync}
          exportTreeToJson={exportTreeToJson}
          importTreeFromJson={importTreeFromJson}
          sessionManager={sessionManager}
        />

        {/* 🚀 OPTIMIZACIÓN: Lazy loading con Suspense */}
        <Suspense fallback={null}>
          <ImportDialog
            visible={showImportDialog}
            onHide={() => setShowImportDialog(false)}
            onImportComplete={async (result) => {
              try {
                const res = await handleImportComplete(result);
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

          <ExportDialog
            visible={showExportDialog}
            onHide={() => setShowExportDialog(false)}
            showToast={(message) => toast.current?.show(message)}
          />

          <ImportExportDialog
            visible={showImportExportDialog}
            onHide={() => setShowImportExportDialog(false)}
            showToast={(message) => toast.current?.show(message)}
            onImportComplete={(result) => {
              console.log('[App.js] Importación completada:', result);
              // Recargar nodos si es necesario
              const treeData = localStorage.getItem('basicapp2_tree_data');
              if (treeData) {
                try {
                  const parsed = JSON.parse(treeData);
                  setNodes(parsed);
                } catch (error) {
                  console.error('Error al recargar nodos:', error);
                }
              }
            }}
          />

          {/* Import Wizard Dialog - Nueva interfaz unificada de importación */}
          <ImportWizardDialog
            visible={showImportWizard}
            onHide={() => setShowImportWizard(false)}
            onImportComplete={async (result) => {
              try {
                const res = await handleImportComplete(result);
                return res;
              } catch (error) {
                console.error('[ImportWizard] Error en handleImportComplete:', error);
                throw error;
              }
            }}
            onImportPasswordsComplete={(payload) => {
              // Dispatch event para el Password Manager
              window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
            }}
            showToast={(message) => toast.current?.show(message)}
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
        </Suspense>

        {/* ConfirmDialog para confirmaciones globales */}
        <ConfirmDialog />
      </div>
    </ErrorBoundary>
  );
};

// Función global para desbloquear formularios en casos de emergencia
// Se puede llamar desde la consola del navegador: window.unblockForms()
if (typeof window !== 'undefined') {
  window.unblockForms = () => {
    try {
      resolveFormBlocking(null);
      console.log('✅ Función de desbloqueo ejecutada desde consola');
    } catch (error) {
      console.error('❌ Error al desbloquear formularios:', error);
    }
  };

  // Función de emergencia ultra-agresiva
  window.emergencyUnblock = () => {
    try {
      emergencyUnblockForms();
      console.log('🚨 DESBLOQUEO DE EMERGENCIA EJECUTADO DESDE CONSOLA');
    } catch (error) {
      console.error('❌ Error en desbloqueo de emergencia:', error);
    }
  };

  // Hacer disponible confirmDialog globalmente
  window.confirmDialog = confirmDialog;
}

export default App;
