import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { AppDialogHeader, AppDialogFooter } from './ui/AppDialog';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { FolderDialog } from './Dialogs';
import PasswordDetailsPanel from './PasswordDetailsPanel';
import { appConfirm } from './ui/AppConfirm';
import { FolderIconPresets } from './FolderIconSelector';
import VaultBrowser from './vault/VaultBrowser';
import { getThemeDefaultColor, renderPasswordNodeIcon } from './vault/passwordNodeIcon';
import { findFolderPath, isVaultFolder, isVaultSecret } from './vault/vaultBrowse';
import {
  VAULT_LAYOUT_STORAGE_KEY,
  isVaultLayout,
  readSavedVaultLayout
} from './vault/vaultLayoutModes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import {
  sessionActionIconThemes,
  ensureSessionActionIconTheme,
  onSessionActionIconThemeLoaded
} from '../themes/session-action-icons';
import { CRYPTO_NETWORK_OPTIONS, getNetworkById } from '../utils/cryptoNetworks';
import { validateSeedPhrase, countWords } from '../utils/bip39Validator';
import {
  findNodeInTree,
  isDescendantInFullTree,
  isShowMoreTreeNode,
  isTreeFolderNode,
  moveNodeFromTreeEvent
} from '../utils/treeDragDrop';
import { useTreeDragHoverExpand } from '../hooks/useTreeDragHoverExpand';
import connectionStore from '../utils/connectionStore';
import { setFavoriteSourceTrees } from '../utils/favoritesSidebarTree';
import { writeText as clipboardWriteText } from '../utils/clipboard';
import { getHomeTabActive } from '../utils/homeTabActiveBus';
import localStorageSyncService from '../services/LocalStorageSyncService';
import { setVaultEncryptedItem } from '../shared/vault-write';
import { waitForVaultSyncIfNeeded } from '../utils/waitForVaultSync';
import '../styles/components/password-manager-sidebar.css';
import '../styles/components/tree-themes.css';

// Skeleton loader para simular árbol de passwords de forma premium
const PasswordSkeleton = () => {
  return (
    <div className="sidebar-skeleton">
      {[...Array(5)].map((_, idx) => {
        let indent = '0px';
        if (idx === 1 || idx === 3) indent = '16px';
        else if (idx === 2) indent = '32px';
        
        let width = '70%';
        if (idx === 1) width = '55%';
        else if (idx === 2) width = '45%';
        else if (idx === 3) width = '60%';
        else if (idx === 4) width = '40%';
        
        return (
          <div key={idx} className="sidebar-skeleton-item" style={{ paddingLeft: indent }}>
            <div className="sidebar-skeleton-icon" />
            <div className="sidebar-skeleton-text" style={{ width }} />
          </div>
        );
      })}
    </div>
  );
};

const PasswordManagerSidebar = ({ 
  nodes, 
  setNodes,
  showToast,
  confirmDialog,
  uiTheme = 'Light',
  onBackToConnections,
  sidebarCollapsed,
  setSidebarCollapsed,
  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14,
  masterKey,
  secureStorage,
  setShowSettingsDialog,
  onShowImportDialog,
  sidebarFilter = '', // Filtro desde la TitleBar
  treeTheme = 'cursorCompact', // Tema del árbol
  sessionActionIconTheme = 'modern',
  showFavoritesView = false,
  onToggleFavoritesView,
  hideHeader = false
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  // Estado separado para passwords - no usar el árbol principal de conexiones
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPackVersion, setActionPackVersion] = useState(0);

  useEffect(() => {
    ensureSessionActionIconTheme(sessionActionIconTheme);
  }, [sessionActionIconTheme]);
  useEffect(() => {
    return onSessionActionIconThemeLoaded((id) => {
      if ((sessionActionIconTheme || 'modern') !== id) return;
      setActionPackVersion((v) => v + 1);
    });
  }, [sessionActionIconTheme]);
  void actionPackVersion;

  useEffect(() => {
    setFavoriteSourceTrees({ passwordNodes });
  }, [passwordNodes]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(() => {
    try {
      const savedExpanded = localStorage.getItem('passwords_expanded_keys');
      return savedExpanded ? JSON.parse(savedExpanded) : {};
    } catch {
      return {};
    }
  });
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const selectedNodeForDetails = useMemo(() => {
    if (!selectedNodeKey) return null;
    const key = typeof selectedNodeKey === 'string'
      ? selectedNodeKey
      : Object.keys(selectedNodeKey)[0];
    return key ? findNodeInTree(passwordNodes, key) : null;
  }, [selectedNodeKey, passwordNodes]);

  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  const isDetailsPanelVisible = useMemo(() => {
    if (!selectedNodeForDetails) return false;
    const data = selectedNodeForDetails.data;
    const secretType = data?.type || 'password';
    const isFolder = selectedNodeForDetails.droppable || data?.type === 'password-folder';
    const isSecret = data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
    return !isFolder && !data?.isShowMoreBtn && isSecret;
  }, [selectedNodeForDetails]);

  const [allExpanded, setAllExpanded] = useState(() => {
    try {
      const savedAllExpanded = localStorage.getItem('passwords_all_expanded');
      return savedAllExpanded !== null ? JSON.parse(savedAllExpanded) : false;
    } catch {
      return false;
    }
  });
  const [folderLimits, setFolderLimits] = useState({});
  
  // Persistir estado de expansión
  useEffect(() => {
    try { localStorage.setItem('passwords_expanded_keys', JSON.stringify(expandedKeys)); } catch {}
  }, [expandedKeys]);
  useEffect(() => {
    try { localStorage.setItem('passwords_all_expanded', JSON.stringify(allExpanded)); } catch {}
  }, [allExpanded]);

  const {
    noteDragStartKey,
    handleDragHoverExpandOver,
    handleDragHoverExpandLeave,
    clearDragHoverExpand
  } = useTreeDragHoverExpand({ expandedKeys, setExpandedKeys });
  
  // Referencias y estados para el menú contextual
  const contextMenuRef = useRef(null);
  const passwordClickTimerRef = useRef(null);
  const skipSaveFromCloudRef = useRef(false);

  useEffect(() => {
    return () => {
      if (passwordClickTimerRef.current) {
        clearTimeout(passwordClickTimerRef.current);
      }
    };
  }, []);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  const [currentContextNode, setCurrentContextNode] = useState(null);
  
  // Estados del formulario
  const [selectedSecretType, setSelectedSecretType] = useState('password');
  const [seedWordsCount, setSeedWordsCount] = useState(12); // 12 o 24 palabras
  const [seedWords, setSeedWords] = useState(Array(12).fill('')); // Array de palabras individuales
  const [formData, setFormData] = useState({
    // Campos comunes
    title: '',
    notes: '',
    // Campos para password
    username: '',
    password: '',
    url: '',
    group: '',
    // Campos para crypto_wallet
    network: 'bitcoin',
    seedPhrase: '',
    seedWordsCount: 24,
    privateKey: '',
    address: '',
    passphrase: '',
    // Campos para api_key
    apiKey: '',
    apiSecret: '',
    endpoint: '',
    serviceName: '',
    // Campos para secure_note
    noteContent: ''
  });
  
  const [vaultLayout, setVaultLayout] = useState(readSavedVaultLayout);
  const [browseStack, setBrowseStack] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(VAULT_LAYOUT_STORAGE_KEY, vaultLayout); } catch {}
    window.dispatchEvent(new CustomEvent('passwords-sidebar:layout-state', {
      detail: { layout: vaultLayout }
    }));
  }, [vaultLayout]);

  useEffect(() => {
    const onSetLayout = (event) => {
      const next = event.detail?.layout;
      if (isVaultLayout(next)) setVaultLayout(next);
    };
    window.addEventListener('passwords-sidebar:set-layout', onSetLayout);
    return () => window.removeEventListener('passwords-sidebar:set-layout', onSetLayout);
  }, []);

  useEffect(() => {
    setBrowseStack((prev) => {
      const resolved = [];
      let level = passwordNodes;
      for (const key of prev) {
        const folder = (level || []).find((node) => node && node.key === key && isVaultFolder(node));
        if (!folder) break;
        resolved.push(key);
        level = folder.children || [];
      }
      if (resolved.length === prev.length && resolved.every((key, index) => key === prev[index])) return prev;
      return resolved;
    });
  }, [passwordNodes]);

  // Estados para carpetas
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(() => getThemeDefaultColor(iconTheme));
  const [folderIcon, setFolderIcon] = useState(null);
  const [parentNodeKey, setParentNodeKey] = useState(null);

  // CARGAR passwords (con o sin encriptación) — tras sync, para no cifrar [] sobre el sidecar
  useEffect(() => {
    let cancelled = false;
    const loadPasswords = async () => {
      try {
        await waitForVaultSyncIfNeeded('passwords_encrypted', 5000);
        if (cancelled) return;
        if (masterKey && secureStorage) {
          // CON master key: Cargar encriptado
          const encryptedData = localStorage.getItem('passwords_encrypted');
          
          if (encryptedData) {
            const decrypted = await secureStorage.decryptStorageKeyCached(
              'passwords_encrypted',
              masterKey
            );
            if (!cancelled) setPasswordNodes(Array.isArray(decrypted) ? decrypted : []);
          } else {
            // Migración: Si hay datos sin encriptar, encriptarlos
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              const parsed = JSON.parse(plainData);
              
              // Encriptar y guardar
              const encrypted = await secureStorage.encryptData(parsed, masterKey);
              const encStr = JSON.stringify(encrypted);
              const wrote = setVaultEncryptedItem('passwords_encrypted', encStr);
              if (wrote.ok) {
                localStorageSyncService.debouncedSync({ passwords_encrypted: encStr });
                localStorage.removeItem('passwordManagerNodes');
              }
              
              if (!cancelled) setPasswordNodes(parsed);
            } else if (!cancelled) {
              setPasswordNodes([]);
            }
          }
        } else {
          // SIN master key: Funciona como antes
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            if (!cancelled) setPasswordNodes(JSON.parse(saved));
          } else if (!cancelled) {
            setPasswordNodes([]);
          }
        }
      } catch (error) {
        console.error('Error loading passwords:', error);
        if (!cancelled) setPasswordNodes([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPasswords();
    window.addEventListener('passwords-storage-updated', loadPasswords);
    return () => {
      cancelled = true;
      window.removeEventListener('passwords-storage-updated', loadPasswords);
    };
  }, [masterKey, secureStorage]);

  // GUARDAR passwords (con o sin encriptación)
  useEffect(() => {
    const savePasswords = async () => {
      if (isLoading) return;

      if (skipSaveFromCloudRef.current) {
        skipSaveFromCloudRef.current = false;
        return;
      }

      // Vault cifrado en disco: no sobrescribir con estado en claro tras descarga de Nextcloud
      if (!masterKey && localStorage.getItem('passwords_encrypted')) {
        return;
      }

      try {
        if (masterKey && secureStorage) {
          // CON master key: Guardar encriptado
          const encrypted = await secureStorage.encryptData(passwordNodes, masterKey);
          const encStr = JSON.stringify(encrypted);
          const wrote = setVaultEncryptedItem('passwords_encrypted', encStr);
          if (!wrote.ok) {
            console.error(
              '[PasswordVault] Guardado rechazado:',
              wrote.reason || 'unknown'
            );
            return;
          }
          localStorageSyncService.debouncedSync({ passwords_encrypted: encStr });
          
          // Limpiar datos sin encriptar
          localStorage.removeItem('passwordManagerNodes');
        } else {
          // ✅ SEGURIDAD: no persistir el vault en claro sin master key
          console.warn('[PasswordVault] Guardado omitido: se requiere master key para cifrar el vault');
          if (showToast) {
            showToast({
              severity: 'warn',
              summary: 'Vault bloqueado',
              detail: 'Desbloquea la master key para guardar contraseñas de forma segura',
              life: 4000
            });
          }
        }
        window.dispatchEvent(new CustomEvent('password-vault-changed'));
      } catch (error) {
        console.error('Error saving passwords:', error);
      }
    };

    savePasswords();
  }, [passwordNodes, masterKey, secureStorage, isLoading, showToast]);

  // Escuchar importación desde el diálogo unificado (pestaña Passwords)
  useEffect(() => {
    const handler = (e) => {
      const { nodes: importedFolders, createContainerFolder, containerFolderName } = e.detail || {};
      try {
        const newNodes = JSON.parse(JSON.stringify(passwordNodes || []));
        const addAsContainer = (children) => ({
          key: `password_folder_${Date.now()}_${Math.floor(Math.random()*1e6)}`,
          label: containerFolderName || `KeePass imported - ${new Date().toLocaleDateString()}`,
          droppable: true,
          children,
          uid: `password_folder_${Date.now()}_${Math.floor(Math.random()*1e6)}`,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          color: getThemeDefaultColor(iconTheme),
          data: { type: 'password-folder' }
        });
        if (createContainerFolder !== false) newNodes.unshift(addAsContainer(importedFolders || []));
        else (importedFolders || []).forEach(f => newNodes.unshift(f));
        setPasswordNodes(newNodes);
        showToast && showToast({ severity: 'success', summary: 'Importado', detail: 'Passwords importados correctamente', life: 3000 });
      } catch (err) {
        console.error('Error aplicando importación de passwords:', err);
        showToast && showToast({ severity: 'error', summary: 'Error', detail: 'No se pudo aplicar la importación', life: 4000 });
      }
    };
    window.addEventListener('import-passwords-to-manager', handler);
    
    // Listener para abrir diálogo de nuevo secreto desde el diálogo de selección de protocolo
    const handleOpenNewSecretDialog = (e) => {
      const secretType = e.detail?.secretType || 'password';
      resetForm();
      setSelectedSecretType(secretType);
      setShowPasswordDialog(true);
    };
    window.addEventListener('open-new-secret-dialog', handleOpenNewSecretDialog);
    
    // Compatibilidad con el evento antiguo
    const handleOpenNewPasswordDialog = () => {
      resetForm();
      setSelectedSecretType('password');
      setShowPasswordDialog(true);
    };
    window.addEventListener('open-new-password-dialog', handleOpenNewPasswordDialog);
    
    return () => {
      window.removeEventListener('import-passwords-to-manager', handler);
      window.removeEventListener('open-new-secret-dialog', handleOpenNewSecretDialog);
      window.removeEventListener('open-new-password-dialog', handleOpenNewPasswordDialog);
    };
  }, [passwordNodes, iconTheme, showToast]);

  // Escuchar sincronización desde Nextcloud
  useEffect(() => {
    const handler = async (e) => {
      const { count, silent } = e.detail || {};
      try {
        if (masterKey && secureStorage) {
          const encryptedData = localStorage.getItem('passwords_encrypted');
          if (encryptedData) {
            const decrypted = await secureStorage.decryptStorageKeyCached(
              'passwords_encrypted',
              masterKey
            );
            skipSaveFromCloudRef.current = true;
            setPasswordNodes(decrypted);
            if (!silent) {
              showToast && showToast({
                severity: 'success',
                summary: 'Sincronizado',
                detail:
                  count != null
                    ? `${count} password(s) descargado(s) desde Nextcloud`
                    : 'Contraseñas actualizadas desde la nube',
                life: 3000
              });
            }
          } else {
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              setPasswordNodes(JSON.parse(plainData));
            } else {
              setPasswordNodes([]);
            }
            if (!silent) {
              showToast && showToast({
                severity: 'success',
                summary: 'Sincronizado',
                detail: 'Contraseñas actualizadas desde la nube',
                life: 3000
              });
            }
          }
        } else {
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            setPasswordNodes(JSON.parse(saved));
          } else {
            setPasswordNodes([]);
          }
          if (!silent) {
            showToast && showToast({
              severity: 'success',
              summary: 'Sincronizado',
              detail: 'Contraseñas actualizadas desde la nube',
              life: 3000
            });
          }
        }
      } catch (err) {
        console.error('Error recargando passwords sincronizados:', err);
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los passwords sincronizados',
          life: 4000
        });
      }
    };
    window.addEventListener('passwords-synced-from-cloud', handler);
    return () => window.removeEventListener('passwords-synced-from-cloud', handler);
  }, [masterKey, secureStorage, showToast]);


  const resetForm = () => {
    setFormData({
      // Campos comunes
      title: '',
      notes: '',
      // Campos para password
      username: '',
      password: '',
      url: '',
      group: '',
      // Campos para crypto_wallet
      network: 'bitcoin',
      seedPhrase: '',
      seedWordsCount: 24,
      privateKey: '',
      address: '',
      passphrase: '',
      // Campos para api_key
      apiKey: '',
      apiSecret: '',
      endpoint: '',
      serviceName: '',
      // Campos para secure_note
      noteContent: ''
    });
    setSeedWordsCount(12);
    setSeedWords(Array(12).fill(''));
    setEditingPassword(null);
    setSelectedSecretType('password');
  };

  // Sincronizar formData.seedPhrase cuando cambian seedWords
  useEffect(() => {
    if (selectedSecretType === 'crypto_wallet') {
      const phrase = seedWords.filter(w => w.trim().length > 0).join(' ');
      if (phrase !== formData.seedPhrase) {
        setFormData(prev => ({ ...prev, seedPhrase: phrase }));
      }
    }
  }, [seedWords, selectedSecretType]);

  const handleNewPassword = () => {
    resetForm();
    setShowPasswordDialog(true);
  };

  // Helper function to find node by key
  const findNodeByKey = (nodeList, key) => {
    for (const node of nodeList) {
      if (node.key === key) {
        return node;
      }
      if (node.children) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const handleNewFolder = () => {
    setFolderName('');
    setFolderColor(getThemeDefaultColor(iconTheme));
    setParentNodeKey(null);
    setShowFolderDialog(true);
  };

  const createNewFolder = () => {
    if (!folderName.trim()) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'El nombre de carpeta no puede estar vacío', life: 3000 });
      return;
    }
    
    const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));
    
    if (editingFolder) {
      // Editar carpeta existente
      const updateFolderInTree = (nodeList) => {
        return nodeList.map(node => {
          if (node.key === editingFolder.key) {
            return {
              ...node,
              label: folderName.trim(),
              color: folderColor,
              folderIcon: folderIcon && folderIcon !== 'general' ? folderIcon : null
            };
          }
          if (node.children) {
            return { ...node, children: updateFolderInTree(node.children) };
          }
          return node;
        });
      };
      
      const updatedPasswordNodes = updateFolderInTree(passwordNodesCopy);
      setPasswordNodes(updatedPasswordNodes);
      
      showToast && showToast({ 
        severity: 'success', 
        summary: 'Actualizado', 
        detail: `Carpeta "${folderName}" actualizada`, 
        life: 3000 
      });
    } else {
      // Crear nueva carpeta
      const newKey = `password_folder_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        color: folderColor,
        folderIcon: folderIcon && folderIcon !== 'general' ? folderIcon : null,
        data: { type: 'password-folder' }
      };
      
      if (parentNodeKey) {
        // Add to parent folder
        const addToParent = (nodeList) => {
          return nodeList.map(node => {
            if (node.key === parentNodeKey) {
              return {
                ...node,
                children: [...(node.children || []), newFolder]
              };
            }
            if (node.children) {
              return { ...node, children: addToParent(node.children) };
            }
            return node;
          });
        };
        setPasswordNodes(addToParent(passwordNodesCopy));
      } else {
        // Add to root
        passwordNodesCopy.unshift(newFolder);
        setPasswordNodes(passwordNodesCopy);
      }
      
      showToast && showToast({ 
        severity: 'success', 
        summary: 'Creado', 
        detail: `Carpeta "${folderName}" creada`, 
        life: 3000 
      });
    }
    
    setShowFolderDialog(false);
    setFolderName('');
    setEditingFolder(null);
  };

  const handleEditPassword = (secret) => {
    const secretType = secret.data?.type || 'password';
    setSelectedSecretType(secretType);
    
    const seedPhrase = secret.data?.seedPhrase || '';
    const words = seedPhrase.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length === 12 ? 12 : words.length === 24 ? 24 : 12;
    
    // Inicializar seedWords
    if (secretType === 'crypto_wallet' && words.length > 0) {
      const newWords = Array(wordCount).fill('');
      words.forEach((word, index) => {
        if (index < wordCount) {
          newWords[index] = word;
        }
      });
      setSeedWords(newWords);
      setSeedWordsCount(wordCount);
    } else {
      setSeedWords(Array(12).fill(''));
      setSeedWordsCount(12);
    }
    
    setFormData({
      // Campos comunes
      title: secret.label || secret.title || '',
      notes: secret.data?.notes || secret.notes || '',
      // Campos para password
      username: secret.data?.username || secret.username || '',
      password: secret.data?.password || secret.password || '',
      url: secret.data?.url || secret.url || '',
      group: secret.data?.group || secret.group || '',
      // Campos para crypto_wallet
      network: secret.data?.network || 'bitcoin',
      seedPhrase: seedPhrase,
      seedWordsCount: wordCount,
      privateKey: secret.data?.privateKey || '',
      address: secret.data?.address || '',
      passphrase: secret.data?.passphrase || '',
      // Campos para api_key
      apiKey: secret.data?.apiKey || '',
      apiSecret: secret.data?.apiSecret || '',
      endpoint: secret.data?.endpoint || '',
      serviceName: secret.data?.serviceName || '',
      // Campos para secure_note
      noteContent: secret.data?.noteContent || ''
    });
    setEditingPassword(secret);
    setShowPasswordDialog(true);
  };

  // Función para construir los datos según el tipo de secreto
  const buildSecretData = () => {
    const baseData = {
      type: selectedSecretType,
      notes: formData.notes
    };

    switch (selectedSecretType) {
      case 'password':
        return {
          ...baseData,
          username: formData.username,
          password: formData.password,
          url: formData.url,
          group: formData.group
        };
      case 'crypto_wallet':
        return {
          ...baseData,
          network: formData.network,
          seedPhrase: formData.seedPhrase,
          seedWordsCount: seedWordsCount,
          privateKey: formData.privateKey,
          address: formData.address,
          passphrase: formData.passphrase
        };
      case 'api_key':
        return {
          ...baseData,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          endpoint: formData.endpoint,
          serviceName: formData.serviceName
        };
      case 'secure_note':
        return {
          ...baseData,
          noteContent: formData.noteContent
        };
      default:
        return baseData;
    }
  };

  const handleSavePassword = () => {
    if (!formData.title.trim()) {
      showToast && showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'El título es obligatorio',
        life: 3000
      });
      return;
    }

    const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));
    const secretData = buildSecretData();

    if (editingPassword) {
      // Editar secreto existente
      const updatePasswordInTree = (nodeList) => {
        return nodeList.map(node => {
          if (node.key === editingPassword.key) {
            return {
              ...node,
              label: formData.title,
              data: {
                ...node.data,
                ...secretData
              }
            };
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: updatePasswordInTree(node.children)
            };
          }
          return node;
        });
      };

      const updatedPasswordNodes = updatePasswordInTree(passwordNodesCopy);
      setPasswordNodes(updatedPasswordNodes);
      // Solo metadatos en favoritos; el secreto vive en el vault cifrado
      connectionStore.updateFavoriteFields(editingPassword.key, {
        name: formData.title,
        type: selectedSecretType,
        username: secretData.username || '',
        url: secretData.url || '',
        password: '',
        notes: '',
        content: ''
      });

      const typeLabel = selectedSecretType === 'password' ? 'Contraseña' : 
                        selectedSecretType === 'crypto_wallet' ? 'Billetera' :
                        selectedSecretType === 'api_key' ? 'API Key' : 'Nota';
      showToast && showToast({
        severity: 'success',
        summary: 'Actualizado',
        detail: `${typeLabel} "${formData.title}" actualizado`,
        life: 3000
      });
    } else {
      // Crear nuevo secreto
      const newKey = `${selectedSecretType}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newPasswordNode = {
        key: newKey,
        label: formData.title,
        data: secretData,
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        draggable: true,
        droppable: false
      };

      if (parentNodeKey) {
        // Add to parent folder
        const parentNode = findNodeByKey(passwordNodesCopy, parentNodeKey);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.unshift(newPasswordNode);
        } else {
          passwordNodesCopy.unshift(newPasswordNode); // Fallback to root if parent not found
        }
      } else {
        // Añadir a la raíz del árbol
        passwordNodesCopy.unshift(newPasswordNode);
      }
      setPasswordNodes(passwordNodesCopy);

      const typeLabel = selectedSecretType === 'password' ? 'Contraseña' : 
                        selectedSecretType === 'crypto_wallet' ? 'Billetera' :
                        selectedSecretType === 'api_key' ? 'API Key' : 'Nota';
      showToast && showToast({
        severity: 'success',
        summary: 'Creado',
        detail: `${typeLabel} "${formData.title}" creado`,
        life: 3000
      });
    }

    setShowPasswordDialog(false);
    resetForm();
  };

  // ── Papelera de contraseñas ──────────────────────────────────────────────────
  const PWD_TRASH_KEY = 'nodeterm_trash_passwords';
  const loadPwdTrash = () => { try { return JSON.parse(localStorage.getItem(PWD_TRASH_KEY) || '[]'); } catch { return []; } };
  const [showPwdTrashModal, setShowPwdTrashModal] = useState(false);
  const [trashedPasswords, setTrashedPasswords] = useState(loadPwdTrash);
  const [pwdTrashConfirm, setPwdTrashConfirm] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(PWD_TRASH_KEY, JSON.stringify(trashedPasswords)); } catch(e) { console.warn('Error guardando papelera passwords:', e); }
  }, [trashedPasswords]);

  const restorePasswordFromTrash = useCallback((trashId) => {
    const item = trashedPasswords.find(i => i.id === trashId);
    if (!item || !item.nodeData) return;
    setPasswordNodes(prev => [item.nodeData, ...prev]);
    setTrashedPasswords(prev => prev.filter(i => i.id !== trashId));
    showToast && showToast({ severity: 'success', summary: 'Restaurado', detail: `"${item.label}" restaurado`, life: 3000 });
  }, [trashedPasswords, setPasswordNodes, showToast]);

  const executePasswordTrashConfirm = useCallback(() => {
    if (!pwdTrashConfirm) return;
    if (pwdTrashConfirm.type === 'empty') {
      setTrashedPasswords([]);
    } else if (pwdTrashConfirm.type === 'single') {
      setTrashedPasswords(prev => prev.filter(i => i.id !== pwdTrashConfirm.id));
    }
    setPwdTrashConfirm(null);
  }, [pwdTrashConfirm]);
  // ────────────────────────────────────────────────────────────────────────────

  const handleDeletePassword = (password) => {
    // Mover a papelera en vez de eliminar permanentemente
    const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));
    const findNode = (list, key) => {
      for (const n of list) {
        if (n.key === key) return n;
        if (n.children) { const f = findNode(n.children, key); if (f) return f; }
      }
      return null;
    };
    const deletedNode = findNode(passwordNodesCopy, password.key) || password;

    const removePasswordFromTree = (nodeList) => {
      return nodeList.filter(node => {
        if (node.key === password.key) return false;
        if (node.children && node.children.length > 0) node.children = removePasswordFromTree(node.children);
        return true;
      });
    };
    setPasswordNodes(removePasswordFromTree(passwordNodesCopy));

    const trashItem = {
      id: `ptrash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      key: password.key,
      label: password.label || password.title || 'Sin nombre',
      deletedAt: new Date().toISOString(),
      nodeData: deletedNode,
    };
    setTrashedPasswords(prev => [trashItem, ...prev]);
    connectionStore.removeFavoritesForTreeNode(deletedNode);

    showToast && showToast({ severity: 'success', summary: 'Movido a la papelera', detail: `"${trashItem.label}" movido a la papelera`, life: 3000 });
  };


  const generateRandomPassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  // Filtrar nodos según búsqueda
  const filterNodes = (nodes, searchTerm) => {
    if (!searchTerm) return nodes;
    
    const search = searchTerm.toLowerCase();
    return nodes.filter(node => {
      const secretType = node.data?.type;
      const isSecret = node.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
      
      if (isSecret) {
        // Buscar en campos comunes
        let matches = node.label.toLowerCase().includes(search) ||
                      (node.data.notes && node.data.notes.toLowerCase().includes(search));
        
        // Buscar en campos específicos según tipo
        if (secretType === 'password') {
          matches = matches ||
                   (node.data.username && node.data.username.toLowerCase().includes(search)) ||
                   (node.data.password && node.data.password.toLowerCase().includes(search)) ||
                   (node.data.url && node.data.url.toLowerCase().includes(search)) ||
                   (node.data.group && node.data.group.toLowerCase().includes(search));
        } else if (secretType === 'crypto_wallet') {
          matches = matches ||
                   (node.data.address && node.data.address.toLowerCase().includes(search)) ||
                   (node.data.network && node.data.network.toLowerCase().includes(search)) ||
                   (node.data.seedPhrase && node.data.seedPhrase.toLowerCase().includes(search));
        } else if (secretType === 'api_key') {
          matches = matches ||
                   (node.data.serviceName && node.data.serviceName.toLowerCase().includes(search)) ||
                   (node.data.apiKey && node.data.apiKey.toLowerCase().includes(search)) ||
                   (node.data.endpoint && node.data.endpoint.toLowerCase().includes(search));
        } else if (secretType === 'secure_note') {
          matches = matches ||
                   (node.data.noteContent && node.data.noteContent.toLowerCase().includes(search));
        }
        
        return matches;
      } else if (node.droppable) {
        // Para carpetas, filtrar recursivamente sus hijos
        const filteredChildren = filterNodes(node.children || [], searchTerm);
        if (filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren
          };
        }
        return node.label.toLowerCase().includes(search);
      }
      return false;
    }).filter(Boolean);
  };

  const filteredPasswordNodes = useMemo(
    () => filterNodes(passwordNodes, sidebarFilter),
    [passwordNodes, sidebarFilter]
  );

  const limitPasswordTreeNodes = useCallback((treeNodes) => {
    if (!treeNodes) return [];

    return treeNodes.map(node => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      if (hasChildren) {
        const isExpanded = allExpanded || (expandedKeys && expandedKeys[node.key] === true);
        if (!isExpanded) {
          return {
            ...node,
            leaf: false,
            children: []
          };
        }

        const totalChildren = node.children.length;
        const currentLimit = folderLimits[node.key] || 30;
        const visibleChildren = node.children.slice(0, currentLimit);
        const processedChildren = limitPasswordTreeNodes(visibleChildren);

        if (totalChildren > currentLimit) {
          processedChildren.push({
            key: `${node.key}-show-more`,
            label: `Mostrar más (${currentLimit} de ${totalChildren})...`,
            icon: 'pi pi-plus',
            data: { isShowMoreBtn: true, parentKey: node.key, targetLimit: currentLimit + 100 },
            droppable: false,
            selectable: false,
            style: { color: '#89b4fa', fontStyle: 'italic', cursor: 'pointer' }
          });
        }

        return {
          ...node,
          children: processedChildren
        };
      }
      return node;
    });
  }, [folderLimits, allExpanded, expandedKeys]);

  const processedPasswordNodes = useMemo(
    () => limitPasswordTreeNodes(filteredPasswordNodes),
    [filteredPasswordNodes, limitPasswordTreeNodes]
  );

  // Expandir/plegar todas las carpetas del árbol
  const toggleExpandAll = () => {
    if (!allExpanded) {
      const collectFolderKeys = (list) => {
        return list.reduce((acc, node) => {
          if (node && node.droppable) {
            acc[node.key] = true;
            if (Array.isArray(node.children) && node.children.length > 0) {
              Object.assign(acc, collectFolderKeys(node.children));
            }
          } else if (node && Array.isArray(node.children) && node.children.length > 0) {
            Object.assign(acc, collectFolderKeys(node.children));
          }
          return acc;
        }, {});
      };
      const allKeys = collectFolderKeys(passwordNodes || []);
      setExpandedKeys(allKeys);
      setAllExpanded(true);
    } else {
      setExpandedKeys({});
      setAllExpanded(false);
    }
  };

  // Drag & drop sobre el árbol completo (ignora value truncado del Tree de visualización).
  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropPoint, dropIndex } = event || {};

    if (!dragNode?.key) return;
    if (isShowMoreTreeNode(dragNode) || isShowMoreTreeNode(dropNode)) return;

    if (dropNode?.key && isDescendantInFullTree(passwordNodes, dragNode.key, dropNode.key)) {
      return;
    }

    let didMove = false;
    setPasswordNodes((prevNodes) => {
      const result = moveNodeFromTreeEvent(prevNodes || [], {
        dragNode,
        dropNode,
        dropPoint,
        dropIndex,
        value: event?.value
      });
      if (result?.nodes) {
        didMove = true;
        return result.nodes;
      }
      return prevNodes;
    });

    if (didMove) {
      const movedLabel = dragNode.label || 'Elemento';
      const dropLabel = dropNode?.label;
      showToast && showToast({
        severity: 'success',
        summary: 'Movido',
        detail: dropLabel
          ? `"${movedLabel}" movido a "${dropLabel}"`
          : `"${movedLabel}" reorganizado`,
        life: 3000
      });
    }
  };

  const dispatchPasswordTab = useCallback((node, mode = 'permanent') => {
    if (getHomeTabActive()) {
      window.dispatchEvent(new CustomEvent('open-home-vault-secret', {
        detail: { key: node.key }
      }));
      return;
    }
    const payload = {
      key: node.key,
      label: node.label,
      title: node.label,
      type: node.data?.type || 'password',
      mode,
      ...node.data
    };
    window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
  }, []);

  const activateVaultItem = useCallback((node, mode = 'preview') => {
    if (!node) return;
    if (isVaultFolder(node) && !isVaultSecret(node)) {
      if (mode !== 'permanent') {
        const path = findFolderPath(passwordNodes, node.key);
        if (path) setBrowseStack(path);
      }
      return;
    }
    if (!isVaultSecret(node)) return;
    setSelectedNodeKey(node.key);
    if (mode === 'preview') {
      if (passwordClickTimerRef.current) clearTimeout(passwordClickTimerRef.current);
      passwordClickTimerRef.current = setTimeout(() => {
        passwordClickTimerRef.current = null;
        dispatchPasswordTab(node, 'preview');
      }, 250);
      return;
    }
    if (passwordClickTimerRef.current) {
      clearTimeout(passwordClickTimerRef.current);
      passwordClickTimerRef.current = null;
    }
    dispatchPasswordTab(node, 'permanent');
  }, [passwordNodes, dispatchPasswordTab]);

  // Función para recolectar todos los passwords de una carpeta recursivamente
  const collectPasswordsFromFolder = (node) => {
    const passwords = [];
    
    const collectRecursive = (currentNode) => {
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(child => {
          const secretType = child.data?.type;
          const isSecret = child.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
          
          if (isSecret) {
            passwords.push({
              key: child.key,
              label: child.label,
              title: child.label,
              type: secretType,
              ...child.data
            });
          } else if (isTreeFolderNode(child)) {
            collectRecursive(child);
          }
        });
      }
    };
    
    collectRecursive(node);
    return passwords;
  };

  const handleOpenFolder = (node) => {
    // Usar el árbol completo: processedPasswordNodes oculta hijos de carpetas colapsadas
    const fullNode = findNodeInTree(passwordNodes, node.key) || node;
    const passwords = collectPasswordsFromFolder(fullNode);
    const payload = {
      folderKey: fullNode.key,
      folderLabel: fullNode.label,
      passwords: passwords
    };
    window.dispatchEvent(new CustomEvent('open-password-folder-tab', { detail: payload }));
  };

  // Node template para el árbol de passwords - igual que la sidebar de conexiones
  const nodeTemplate = (node, options) => {
    if (node.data?.isShowMoreBtn) {
      return (
        <div
          className="flex align-items-center gap-2 p-1"
          style={{
            color: '#89b4fa',
            fontStyle: 'italic',
            cursor: 'pointer',
            fontWeight: 'bold',
            paddingLeft: '4px',
            width: '100%'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setFolderLimits(prev => ({
              ...prev,
              [node.data.parentKey]: node.data.targetLimit
            }));
          }}
        >
          <span className="pi pi-plus-circle" style={{ fontSize: '14px' }} />
          <span>{node.label}</span>
        </div>
      );
    }

    const isFolder = node.droppable;
    const secretType = node.data?.type || 'password';
    const isSecret = node.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
    
    const icon = (isSecret || isFolder)
      ? renderPasswordNodeIcon(node, {
          iconTheme,
          size: isSecret ? connectionIconSize : folderIconSize,
          expanded: Boolean(options.expanded)
        })
      : null;

    // Detectar si tiene icono personalizado (para ajustar alineación del texto)
    const hasCustomFolderIcon = isFolder && node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()];
    
    return (
      <div 
        className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onClick={(e) => {
          if (isSecret) {
            e.stopPropagation();
            setSelectedNodeKey(node.key);
            if (passwordClickTimerRef.current) {
              clearTimeout(passwordClickTimerRef.current);
            }
            passwordClickTimerRef.current = setTimeout(() => {
              passwordClickTimerRef.current = null;
              dispatchPasswordTab(node, 'preview');
            }, 250);
            return;
          }
          e.stopPropagation();
          if (isFolder) {
            handleOpenFolder(node);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isSecret) {
            if (passwordClickTimerRef.current) {
              clearTimeout(passwordClickTimerRef.current);
              passwordClickTimerRef.current = null;
            }
            setSelectedNodeKey(node.key);
            dispatchPasswordTab(node, 'permanent');
          }
        }}
        style={{ 
          cursor: 'pointer', 
          fontFamily: explorerFont,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '6px'
        }}
        data-connection-type={isSecret ? secretType : null}
        data-node-key={node.key}
        data-node-type={isFolder ? 'folder' : 'connection'}
        draggable={!node.data?.isShowMoreBtn}
      >
        <span style={{ 
          minWidth: 20,
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'center', 
          height: '20px',
          position: 'relative'
        }}>
          {icon}
        </span>
        <span className="node-label" style={{ 
          flex: 1,
          marginLeft: '0px',
          lineHeight: '20px',
          height: '20px',
          display: 'block',
          margin: 0,
          padding: 0,
          ...(hasCustomFolderIcon ? { transform: 'translateY(3px)' } : {})
        }}>{node.label}</span>
      </div>
    );
  };

  // Función para copiar al portapapeles (Electron IPC; no usado por MCP inject_secret)
  const handleCopyToClipboard = async (text, type) => {
    try {
      const ok = await clipboardWriteText(text);
      if (!ok) {
        throw new Error('empty clipboard payload');
      }
      showToast && showToast({
        severity: 'success',
        summary: 'Copiado',
        detail: `${type} copiado al portapapeles`,
        life: 2000
      });
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      showToast && showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo copiar al portapapeles',
        life: 3000
      });
    }
  };

  // Función para abrir URL (vía openExternal validado en main)
  const handleOpenUrl = (url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      if (window.electron?.import?.openExternal) {
        window.electron.import.openExternal(url);
      } else if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        showToast && showToast({
          severity: 'warn',
          summary: 'No disponible',
          detail: 'No se pudo abrir la URL en el navegador del sistema',
          life: 3000
        });
      }
    } else {
      showToast && showToast({
        severity: 'warn',
        summary: 'URL inválida',
        detail: 'La URL no es válida o no está configurada',
        life: 3000
      });
    }
  };

  // Función para editar carpeta
  const handleEditFolder = (folder) => {
    setFolderName(folder.label);
    setFolderColor(folder.color || getThemeDefaultColor(iconTheme));
    setFolderIcon(folder.folderIcon || null);
    setEditingFolder(folder);
    setShowFolderDialog(true);
  };

  // Función para eliminar carpeta
  const handleDeleteFolder = (folder) => {
    const executeDelete = () => {
      const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));

      const removeFolderFromTree = (nodeList) => {
        return nodeList.filter(node => {
          if (node.key === folder.key) {
            return false;
          }
          if (node.children) {
            node.children = removeFolderFromTree(node.children);
          }
          return true;
        });
      };

      const updatedPasswordNodes = removeFolderFromTree(passwordNodesCopy);
      setPasswordNodes(updatedPasswordNodes);
      connectionStore.removeFavoritesForTreeNode(findNodeInTree(passwordNodes, folder.key) || folder);

      showToast && showToast({
        severity: 'success',
        summary: 'Eliminado',
        detail: `Carpeta "${folder.label}" eliminada`,
        life: 3000
      });
    };

    appConfirm({
      message: `¿Estás seguro de que deseas eliminar la carpeta "${folder.label}" y todo su contenido?`,
      header: 'Confirmar eliminación',
      severity: 'danger',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: executeDelete
    });
  };

  // Menú contextual para el área vacía del árbol
  const onTreeAreaContextMenu = (event) => {
    const targetElement = event.target;
    const isNodeClick = targetElement.closest('.p-treenode-content') || 
                       targetElement.closest('.p-treenode') ||
                       targetElement.closest('.p-tree-toggler');
    
    if (!isNodeClick) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedNodeKey(null);
      setCurrentContextNode(null);
      
      const menuItems = [
        {
          label: 'Nuevo Secreto',
          icon: 'pi pi-plus',
          items: [
            {
              label: 'Nueva Contraseña',
              icon: 'pi pi-lock',
              command: () => {
                resetForm();
                setSelectedSecretType('password');
                setParentNodeKey(null);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva Billetera Crypto',
              icon: 'pi pi-wallet',
              command: () => {
                resetForm();
                setSelectedSecretType('crypto_wallet');
                setParentNodeKey(null);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva API Key',
              icon: 'pi pi-key',
              command: () => {
                resetForm();
                setSelectedSecretType('api_key');
                setParentNodeKey(null);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva Nota Segura',
              icon: 'pi pi-file-edit',
              command: () => {
                resetForm();
                setSelectedSecretType('secure_note');
                setParentNodeKey(null);
                setShowPasswordDialog(true);
              }
            }
          ]
        },
        {
          label: 'Nueva Carpeta',
          icon: 'pi pi-folder-plus',
          command: () => {
            setFolderName('');
            setFolderColor(getThemeDefaultColor(iconTheme));
            setFolderIcon(null);
            setParentNodeKey(null);
            setShowFolderDialog(true);
          }
        }
      ];
      
      setContextMenuItems(menuItems);
      
      // Mostrar el menú contextual nativo
      if (contextMenuRef.current) {
        contextMenuRef.current.show(event);
      }
    }
  };

  // Menú contextual para passwords usando ContextMenu nativo
  const onNodeContextMenu = (event, node) => {
    if (node.data?.isShowMoreBtn) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeKey(node.key);
    setCurrentContextNode(node);
    
    // Crear menú contextual simple para secretos
    const secretType = node.data?.type;
    const isSecret = node.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
    const isFolder = node.droppable;
    
    if (isSecret) {
      const menuItems = [
        {
          label: 'Ver detalles',
          icon: 'pi pi-eye',
          command: () => {
            dispatchPasswordTab(node, 'permanent');
          }
        },
        { separator: true }
      ];

      // Opciones específicas según el tipo de secreto
      if (secretType === 'password') {
        const handleOpenExternalBrowser = (browserName, displayName, privateMode) => {
          const url = node.data?.url || '';
          if (!url) {
            showToast && showToast({
              severity: 'warn',
              summary: 'Sin URL',
              detail: 'Este password no tiene URL configurada',
              life: 2000
            });
            return;
          }

          const hasPass = Boolean(node.data?.password);
          const hasUser = Boolean(node.data?.username);
          if (hasPass || hasUser) {
            showToast && showToast({
              severity: 'info',
              summary: 'Auto-completado seguro',
              detail: hasPass
                ? `Abriendo ${displayName}... Contraseña copiada al portapapeles (se borrará en 30s).`
                : `Abriendo ${displayName}... Usuario copiado al portapapeles (se borrará en 30s).`,
              life: 5000
            });
          }

          window.electron?.system?.openWithBrowser(
            url,
            browserName,
            privateMode,
            node.data?.username || '',
            node.data?.password || '',
            'clipboard'
          );
        };

        menuItems.push(
          {
            label: 'Copiar usuario',
            icon: 'pi pi-user',
            command: () => {
              const username = node.data?.username || '';
              if (username) {
                handleCopyToClipboard(username, 'Usuario');
              } else {
                showToast && showToast({
                  severity: 'warn',
                  summary: 'Sin usuario',
                  detail: 'Este password no tiene usuario configurado',
                  life: 2000
                });
              }
            }
          },
          {
            label: 'Copiar contraseña',
            icon: 'pi pi-key',
            command: () => {
              const password = node.data?.password || '';
              if (password) {
                handleCopyToClipboard(password, 'Password');
              } else {
                showToast && showToast({
                  severity: 'warn',
                  summary: 'Sin contraseña',
                  detail: 'Este password no tiene contraseña configurada',
                  life: 2000
                });
              }
            }
          },
          {
            label: 'URL(s)',
            icon: 'pi pi-globe',
            items: [
              {
                label: 'Abrir en Navegador Integrado (Autocompletar)',
                icon: 'pi pi-desktop',
                command: () => {
                  const url = node.data?.url || '';
                  if (url) {
                    window.dispatchEvent(new CustomEvent('open-browser-tab', {
                      detail: {
                        url,
                        username: node.data?.username || '',
                        password: node.data?.password || '',
                        title: node.label
                      }
                    }));
                  } else {
                    showToast && showToast({
                      severity: 'warn',
                      summary: 'Sin URL',
                      detail: 'Este password no tiene URL configurada',
                      life: 2000
                    });
                  }
                }
              },
              {
                label: 'Copiar URL',
                icon: 'pi pi-copy',
                command: () => {
                  const url = node.data?.url || '';
                  if (url) {
                    handleCopyToClipboard(url, 'URL');
                  } else {
                    showToast && showToast({
                      severity: 'warn',
                      summary: 'Sin URL',
                      detail: 'Este password no tiene URL configurada',
                      life: 2000
                    });
                  }
                }
              },
              { separator: true },
              {
                label: 'Abrir con Google Chrome',
                icon: 'pi pi-external-link',
                command: () => handleOpenExternalBrowser('chrome', 'Chrome', false)
              },
              {
                label: 'Abrir con Google Chrome (Incógnito)',
                icon: 'pi pi-eye-slash',
                command: () => handleOpenExternalBrowser('chrome', 'Chrome (Incógnito)', true)
              },
              {
                label: 'Abrir con Firefox',
                icon: 'pi pi-external-link',
                command: () => handleOpenExternalBrowser('firefox', 'Firefox', false)
              },
              {
                label: 'Abrir con Firefox (Privado)',
                icon: 'pi pi-eye-slash',
                command: () => handleOpenExternalBrowser('firefox', 'Firefox (Privado)', true)
              },
              {
                label: 'Abrir con Microsoft Edge',
                icon: 'pi pi-external-link',
                command: () => handleOpenExternalBrowser('edge', 'Edge', false)
              },
              {
                label: 'Abrir con Microsoft Edge (InPrivate)',
                icon: 'pi pi-eye-slash',
                command: () => handleOpenExternalBrowser('edge', 'Edge (InPrivate)', true)
              }
            ]
          }
        );
      } else if (secretType === 'crypto_wallet') {
        if (node.data?.address) {
          menuItems.push({
            label: 'Copiar dirección',
            icon: 'pi pi-copy',
            command: () => {
              handleCopyToClipboard(node.data.address, 'Dirección');
            }
          });
        }
        if (node.data?.seedPhrase) {
          menuItems.push({
            label: 'Copiar seed phrase',
            icon: 'pi pi-lock',
            command: () => {
              handleCopyToClipboard(node.data.seedPhrase, 'Seed Phrase');
            }
          });
        }
      } else if (secretType === 'api_key') {
        if (node.data?.apiKey) {
          menuItems.push({
            label: 'Copiar API Key',
            icon: 'pi pi-key',
            command: () => {
              handleCopyToClipboard(node.data.apiKey, 'API Key');
            }
          });
        }
        if (node.data?.endpoint) {
          menuItems.push({
            label: 'Abrir endpoint',
            icon: 'pi pi-external-link',
            command: () => {
              handleOpenUrl(node.data.endpoint);
            }
          });
        }
      }

      const secretConnection = {
        id: node.key,
        type: node.data?.type || 'password',
        name: node.label,
        ...node.data
      };
      const isFav = connectionStore.isFavorite(secretConnection);

      // Opciones comunes
      menuItems.push(
        {
          label: isFav ? 'Quitar de favoritos' : 'Añadir a favoritos',
          icon: isFav ? 'pi pi-star-fill' : 'pi pi-star',
          command: () => {
            connectionStore.toggleFavorite(secretConnection);
            showToast && showToast({
              severity: 'success',
              summary: isFav ? 'Quitado de favoritos' : 'Añadido a favoritos',
              detail: `"${node.label}" ${isFav ? 'quitado de' : 'añadido a'} favoritos`,
              life: 3000
            });
          }
        },
        { separator: true },
        {
          label: 'Editar',
          icon: 'pi pi-pencil',
          command: () => {
            handleEditPassword(node);
          }
        },
        {
          label: 'Eliminar',
          icon: 'pi pi-trash',
          command: () => {
            handleDeletePassword(node);
          }
        }
      );
      
      setContextMenuItems(menuItems);
      
      // Mostrar el menú contextual nativo
      if (contextMenuRef.current) {
        contextMenuRef.current.show(event);
      }
    } else if (isFolder) {
      const menuItems = [
        {
          label: 'Nuevo Secreto',
          icon: 'pi pi-plus',
          items: [
            {
              label: 'Nueva Contraseña',
              icon: 'pi pi-lock',
              command: () => {
                resetForm();
                setSelectedSecretType('password');
                setParentNodeKey(node.key);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva Billetera Crypto',
              icon: 'pi pi-wallet',
              command: () => {
                resetForm();
                setSelectedSecretType('crypto_wallet');
                setParentNodeKey(node.key);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva API Key',
              icon: 'pi pi-key',
              command: () => {
                resetForm();
                setSelectedSecretType('api_key');
                setParentNodeKey(node.key);
                setShowPasswordDialog(true);
              }
            },
            {
              label: 'Nueva Nota Segura',
              icon: 'pi pi-file-edit',
              command: () => {
                resetForm();
                setSelectedSecretType('secure_note');
                setParentNodeKey(node.key);
                setShowPasswordDialog(true);
              }
            }
          ]
        },
        {
          label: 'Nueva Carpeta',
          icon: 'pi pi-folder-plus',
          command: () => {
            setParentNodeKey(node.key);
            setShowFolderDialog(true);
          }
        },
        { separator: true },
        {
          label: 'Editar Carpeta',
          icon: 'pi pi-pencil',
          command: () => {
            handleEditFolder(node);
          }
        },
        {
          label: 'Eliminar Carpeta',
          icon: 'pi pi-trash',
          command: () => {
            handleDeleteFolder(node);
          }
        }
      ];
      
      setContextMenuItems(menuItems);
      
      // Mostrar el menú contextual nativo
      if (contextMenuRef.current) {
        contextMenuRef.current.show(event);
      }
    }
  };

  // Listen to toolbar events from unified header when hideHeader=true
  useEffect(() => {
    if (!hideHeader) return;
    const onNewFolder = () => handleNewFolder();
    const onToggleExpandAll = () => toggleExpandAll();
    window.addEventListener('passwords-sidebar:new-folder', onNewFolder);
    window.addEventListener('passwords-sidebar:toggle-expand-all', onToggleExpandAll);
    return () => {
      window.removeEventListener('passwords-sidebar:new-folder', onNewFolder);
      window.removeEventListener('passwords-sidebar:toggle-expand-all', onToggleExpandAll);
    };
  }, [hideHeader]);

  useEffect(() => {
    if (!hideHeader) return;
    window.dispatchEvent(new CustomEvent('passwords-sidebar:expand-state', {
      detail: { allExpanded }
    }));
  }, [hideHeader, allExpanded]);

  return (
    <>
    <div className="password-manager-sidebar-root" style={{ position: 'relative' }}>
      {!hideHeader && (
        <div className="sidebar-header-glass-stack" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        background: 'var(--ui-sidebar-bg)',
        backdropFilter: 'none',
        borderRadius: 0,
        margin: 0,
        border: 'none',
        boxShadow: 'none',
        width: '100%',
        position: 'relative'
      }}>
        {/* Brillo de profundidad 3D */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 0,
          background: 'transparent',
          pointerEvents: 'none'
        }} />

        <Button 
          className="p-button-rounded p-button-text sidebar-action-button glass-button" 
          onClick={() => setSidebarCollapsed && setSidebarCollapsed(v => !v)} 
          tooltip={sidebarCollapsed ? tCommon('tooltips.expandSidebar') : tCommon('tooltips.collapseSidebar')} 
          tooltipOptions={{ position: 'bottom' }} 
          style={{ 
            marginRight: 4,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            minWidth: '38px',
            flexShrink: 0,
            padding: 0,
            transition: 'all 0.3s ease'
          }} 
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            color: 'var(--ui-sidebar-text)',
            opacity: 0.9
          }}>
            {sidebarCollapsed 
              ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandRight
              : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft}
          </span>
        </Button>

        {/* SEPARADOR IDÉNTICO AL PRIMERO */}
        <div style={{
          width: '1px',
          height: '24px',
          background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent)',
          margin: '0 8px',
          boxShadow: '0 0 5px rgba(255, 255, 255, 0.05)',
          flexShrink: 0
        }} />

        <div className="sidebar-action-glass-group" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          marginLeft: '0',
          position: 'relative', 
          zIndex: 2,
          flexShrink: 1,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={() => {
              // Abrir diálogo de selección de protocolo directamente en la categoría de Gestión de Secretos
              window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog', {
                detail: { initialCategory: 'secrets' }
              }));
            }} 
            tooltip={tCommon('tooltips.newConnection')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: 'var(--ui-sidebar-text)'
            }}>
              {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newConnection}
            </span>
          </Button>
          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={handleNewFolder} 
            tooltip={tCommon('tooltips.newFolder')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: 'var(--ui-sidebar-text)'
            }}>
              {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newFolder}
            </span>
          </Button>
          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={() => {
              // Volver a la vista de conexiones y crear grupo
              onBackToConnections();
              // Disparar evento para abrir el diálogo de crear grupo
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-create-group-dialog'));
              }, 100);
            }} 
            tooltip={tCommon('tooltips.createGroup')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: 'var(--ui-sidebar-text)'
            }}>
              {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newGroup}
            </span>
          </Button>

          {/* SEPARADOR IDÉNTICO AL PRIMERO */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent)',
            margin: '0 8px',
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.05)'
          }} />

          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={onBackToConnections} 
            tooltip={tCommon('tooltips.goToConnections')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: '#10b981'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Red de nodos interconectados */}
                {/* Nodo central */}
                <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                {/* Nodos periféricos */}
                <circle cx="6" cy="6" r="2" fill="currentColor"/>
                <circle cx="18" cy="6" r="2" fill="currentColor"/>
                <circle cx="6" cy="18" r="2" fill="currentColor"/>
                <circle cx="18" cy="18" r="2" fill="currentColor"/>
                <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
                <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="20" cy="12" r="1.5" fill="currentColor"/>
                {/* Líneas de conexión entre nodos */}
                <line x1="12" y1="12" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </span>
          </Button>
          {onToggleFavoritesView && (
            <Button
              className={`p-button-rounded p-button-text sidebar-action-button glass-button ${showFavoritesView ? 'active' : ''}`}
              onClick={onToggleFavoritesView}
              tooltip={showFavoritesView ? tCommon('tooltips.showAllConnections') : tCommon('tooltips.showFavorites')}
              tooltipOptions={{ position: 'bottom' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                background: showFavoritesView ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: showFavoritesView ? '1px solid rgba(255, 193, 7, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                color: '#ffc107'
              }}>
                <i className={showFavoritesView ? 'pi pi-star-fill' : 'pi pi-star'} style={{ fontSize: '1rem' }} />
              </span>
            </Button>
          )}
        </div>
        </div>
      )}

      {/* Árbol de passwords - igual que la sidebar de conexiones */}
      <div 
        className="tree-container"
        style={{ 
          flex: 1, 
          minHeight: 0, 
          overflowY: 'hidden', 
          overflowX: 'auto',
          position: 'relative',
          fontSize: `${explorerFontSize}px`
        }}
        onContextMenu={onTreeAreaContextMenu}
        onDragStartCapture={noteDragStartKey}
        onDragOverCapture={handleDragHoverExpandOver}
        onDragLeave={handleDragHoverExpandLeave}
        onDrop={clearDragHoverExpand}
        onDragEnd={clearDragHoverExpand}
      >
        {isLoading ? (
          <PasswordSkeleton />
        ) : vaultLayout !== 'tree' ? (
          <VaultBrowser
            nodes={passwordNodes}
            layout={vaultLayout}
            browseStack={browseStack}
            searching={Boolean(sidebarFilter && String(sidebarFilter).trim())}
            searchTerm={sidebarFilter}
            selectedKey={typeof selectedNodeKey === 'string' ? selectedNodeKey : (selectedNodeKey ? Object.keys(selectedNodeKey)[0] : null)}
            iconTheme={iconTheme}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            onCrumb={(index) => setBrowseStack((prev) => prev.slice(0, index))}
            onActivate={activateVaultItem}
            onContextMenu={onNodeContextMenu}
          />
        ) : filteredPasswordNodes.length === 0 ? (
          <div className="empty-tree-message" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            No hay passwords guardados.<br/>Usa el botón "+" para crear uno.
          </div>
        ) : (
                  <Tree
                    key={`password-tree-${iconTheme}-${explorerFontSize}-${treeTheme}`}
                    value={processedPasswordNodes}
                    selectionMode="single"
                    selectionKeys={selectedNodeKey}
                    onSelectionChange={e => setSelectedNodeKey(e.value)}
                    expandedKeys={expandedKeys}
                    onToggle={e => setExpandedKeys(e.value)}
                    dragdropScope="password-tree"
                    onDragDrop={onDragDrop}
                    onDragStart={(e) => {
                      // Feedback visual opcional
                    }}
                    onDragEnd={() => {
                      // Feedback visual opcional
                    }}
                    className={`sidebar-tree tree-theme-${treeTheme}`}
                    data-icon-theme={iconTheme}
                    data-tree-theme={treeTheme}
                    style={{
                      height: '100%',
                      overflow: 'auto',
                      fontSize: `${explorerFontSize}px`,
                      '--icon-size': `${iconSize}px`
                    }}
                    nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
                  />
        )}
      </div>

      <PasswordDetailsPanel
        selectedNode={selectedNodeForDetails}
        onCopy={handleCopyToClipboard}
        collapsed={detailsCollapsed}
        onCollapseChange={setDetailsCollapsed}
        onClose={() => {
          setSelectedNodeKey(null);
        }}
      />

      {/* Dialog para crear/editar secreto */}
      <Dialog
        header={
          <AppDialogHeader
            icon={
              selectedSecretType === 'password' ? 'pi pi-lock' :
              selectedSecretType === 'crypto_wallet' ? 'pi pi-wallet' :
              selectedSecretType === 'api_key' ? 'pi pi-key' : 'pi pi-file-edit'
            }
            title={`${editingPassword ? 'Editar ' : 'Nuevo '}${
              selectedSecretType === 'password' ? 'contraseña' :
              selectedSecretType === 'crypto_wallet' ? 'billetera crypto' :
              selectedSecretType === 'api_key' ? 'clave de API' : 'nota segura'
            }`}
          />
        }
        visible={showPasswordDialog}
        style={{ width: '90vw', maxWidth: '550px' }}
        onHide={() => {
          setShowPasswordDialog(false);
          resetForm();
        }}
        modal
        className="app-dialog password-secret-dialog"
        contentStyle={{ padding: '0', overflow: 'hidden' }}
        footer={
          <AppDialogFooter
            cancelLabel={tCommon('buttons.cancel')}
            onCancel={() => {
              setShowPasswordDialog(false);
              resetForm();
            }}
            confirmLabel={editingPassword ? tCommon('buttons.save') : tCommon('buttons.create')}
            confirmIcon="pi pi-check"
            onConfirm={handleSavePassword}
          />
        }
      >
        <div className="tunnel-form-content" style={{ padding: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="secret-form tunnel-form-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Campo común: Título */}
            <div className="field">
              <label htmlFor="title" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.title')} *</label>
              <InputText
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={
                  selectedSecretType === 'password' ? 'Ej: Gmail, Netflix...' :
                  selectedSecretType === 'crypto_wallet' ? 'Ej: Mi Wallet Bitcoin' :
                  selectedSecretType === 'api_key' ? 'Ej: API de OpenAI' : 'Ej: Notas importantes'
                }
                className="w-full"
                autoFocus
              />
            </div>

            {/* Campos para PASSWORD */}
            {selectedSecretType === 'password' && (
              <>
                <div className="field">
                  <label htmlFor="username" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.username')}</label>
                  <InputText
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder={t('passwordManager.placeholders.username')}
                    className="w-full"
                  />
                </div>
                <div className="field">
                  <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.password')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <InputText
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('passwordManager.placeholders.password')}
                      className="w-full"
                    />
                    <Button
                      icon="pi pi-refresh"
                      className="p-button-secondary"
                      onClick={generateRandomPassword}
                      tooltip={t('passwordManager.tooltips.generatePassword')}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="url" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.url')}</label>
                  <InputText
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={t('passwordManager.placeholders.url')}
                    className="w-full"
                  />
                </div>
                <div className="field">
                  <label htmlFor="group" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.group')}</label>
                  <InputText
                    id="group"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    placeholder={t('passwordManager.placeholders.group')}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {/* Campos para CRYPTO WALLET */}
            {selectedSecretType === 'crypto_wallet' && (
              <>
                <div className="field">
                  <label htmlFor="network" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Red / Blockchain</label>
                  <Dropdown
                    id="network"
                    value={formData.network}
                    options={CRYPTO_NETWORK_OPTIONS}
                    onChange={(e) => setFormData({ ...formData, network: e.value })}
                    placeholder="Selecciona una red"
                    className="w-full"
                    itemTemplate={(option) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          backgroundColor: option.color 
                        }}></span>
                        <span>{option.label}</span>
                      </div>
                    )}
                    valueTemplate={(option) => option ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          backgroundColor: option.color 
                        }}></span>
                        <span>{option.label}</span>
                      </div>
                    ) : 'Selecciona una red'}
                  />
                </div>
                <div className="field">
                  <label htmlFor="address" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Dirección Pública</label>
                  <InputText
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="0x... / bc1... / etc."
                    className="w-full"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="field">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label htmlFor="seedPhrase" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>
                      Seed Phrase
                      {formData.seedPhrase && (
                        <span style={{ marginLeft: '8px', fontSize: '0.85em', color: 'var(--text-color-secondary)' }}>
                          ({countWords(formData.seedPhrase)} palabras)
                        </span>
                      )}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        label="12"
                        className={seedWordsCount === 12 ? 'p-button-primary' : 'p-button-secondary'}
                        size="small"
                        onClick={() => {
                          if (seedWordsCount !== 12) {
                            const newWords = Array(12).fill('');
                            seedWords.slice(0, 12).forEach((word, index) => {
                              newWords[index] = word;
                            });
                            setSeedWords(newWords);
                            setSeedWordsCount(12);
                          }
                        }}
                      />
                      <Button
                        label="24"
                        className={seedWordsCount === 24 ? 'p-button-primary' : 'p-button-secondary'}
                        size="small"
                        onClick={() => {
                          if (seedWordsCount !== 24) {
                            const newWords = Array(24).fill('');
                            seedWords.forEach((word, index) => {
                              if (index < 24) {
                                newWords[index] = word;
                              }
                            });
                            setSeedWords(newWords);
                            setSeedWordsCount(24);
                          }
                        }}
                      />
                      <Button
                        icon="pi pi-copy"
                        className="p-button-text p-button-sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        onClick={async () => {
                          if (formData.seedPhrase) {
                            try {
                              await clipboardWriteText(formData.seedPhrase);
                              showToast && showToast({
                                severity: 'success',
                                summary: 'Copiado',
                                detail: 'Seed phrase copiada al portapapeles',
                                life: 2000
                              });
                            } catch (err) {
                              console.error('Error copiando:', err);
                            }
                          }
                        }}
                        tooltip="Copiar seed phrase completa"
                        tooltipOptions={{ position: 'top' }}
                        disabled={!formData.seedPhrase}
                      />
                    </div>
                  </div>
                  
                  {/* Campo para pegar seed phrase completa */}
                  <InputTextarea
                    placeholder="Pega aquí tu seed phrase completa para llenar automáticamente los campos..."
                    rows={2}
                    className="w-full"
                    style={{ fontFamily: 'monospace', marginBottom: '12px' }}
                    onPaste={(e) => {
                      const pastedText = e.clipboardData.getData('text');
                      const words = pastedText.trim().split(/\s+/).filter(w => w.length > 0);
                      if (words.length > 0) {
                        const newWords = Array(seedWordsCount).fill('');
                        words.forEach((word, index) => {
                          if (index < seedWordsCount) {
                            newWords[index] = word;
                          }
                        });
                        setSeedWords(newWords);
                        if (words.length === 12 || words.length === 24) {
                          setSeedWordsCount(words.length);
                        }
                      }
                    }}
                  />
                  
                  {/* Grid de campos individuales para cada palabra */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginTop: '12px',
                    marginBottom: '12px'
                  }}>
                    {Array(seedWordsCount).fill(null).map((_, index) => (
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
                          <Button
                            icon="pi pi-copy"
                            className="p-button-text p-button-sm"
                            style={{ 
                              padding: '2px 4px', 
                              fontSize: '0.7rem',
                              minWidth: 'auto',
                              height: '20px'
                            }}
                            onClick={async () => {
                              const word = seedWords[index];
                              if (word) {
                                try {
                                  await clipboardWriteText(word);
                                  showToast && showToast({
                                    severity: 'success',
                                    summary: 'Copiado',
                                    detail: `Palabra ${index + 1} copiada`,
                                    life: 1500
                                  });
                                } catch (err) {
                                  console.error('Error copiando:', err);
                                }
                              }
                            }}
                            tooltip={`Copiar palabra ${index + 1}`}
                            tooltipOptions={{ position: 'top' }}
                            disabled={!seedWords[index]}
                          />
                        </div>
                        <InputText
                          value={seedWords[index] || ''}
                          onChange={(e) => {
                            const newWords = [...seedWords];
                            newWords[index] = e.target.value;
                            setSeedWords(newWords);
                          }}
                          placeholder={`Palabra ${index + 1}`}
                          className="w-full"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--ui-content-border)',
                            background: 'var(--ui-dialog-bg)'
                          }}
                          onKeyDown={(e) => {
                            // Navegar al siguiente campo con Enter o Tab
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              if (index < seedWordsCount - 1) {
                                e.preventDefault();
                                const nextInput = document.querySelector(`input[placeholder="Palabra ${index + 2}"]`);
                                if (nextInput) nextInput.focus();
                              }
                            }
                            // Navegar al campo anterior con Shift+Tab
                            if (e.key === 'Tab' && e.shiftKey && index > 0) {
                              e.preventDefault();
                              const prevInput = document.querySelector(`input[placeholder="Palabra ${index}"]`);
                              if (prevInput) prevInput.focus();
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Validación */}
                  {formData.seedPhrase && (() => {
                    const validation = validateSeedPhrase(formData.seedPhrase);
                    if (!validation.valid) {
                      return (
                        <Message 
                          severity="warn" 
                          text={validation.errors[0]} 
                          style={{ marginTop: '8px', width: '100%' }}
                        />
                      );
                    }
                    return (
                      <Message 
                        severity="success" 
                        text="✓ Seed phrase válida" 
                        style={{ marginTop: '8px', width: '100%' }}
                      />
                    );
                  })()}
                </div>
                <div className="field">
                  <label htmlFor="passphrase" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Passphrase (25ta palabra, opcional)</label>
                  <InputText
                    id="passphrase"
                    value={formData.passphrase}
                    onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                    placeholder="Palabra adicional de seguridad"
                    className="w-full"
                  />
                </div>
                <div className="field">
                  <label htmlFor="privateKey" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Clave Privada (opcional)</label>
                  <InputText
                    id="privateKey"
                    type="password"
                    value={formData.privateKey}
                    onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                    placeholder="Solo si no tienes seed phrase"
                    className="w-full"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <Message 
                  severity="warn" 
                  text="⚠️ NUNCA compartas tu seed phrase o clave privada con nadie" 
                  style={{ marginBottom: '12px', width: '100%' }}
                />
              </>
            )}

            {/* Campos para API KEY */}
            {selectedSecretType === 'api_key' && (
              <>
                <div className="field">
                  <label htmlFor="serviceName" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Nombre del Servicio</label>
                  <InputText
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="Ej: OpenAI, AWS, Stripe..."
                    className="w-full"
                  />
                </div>
                <div className="field">
                  <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>API Key / Token</label>
                  <InputText
                    id="apiKey"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="sk-... / api_..."
                    className="w-full"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="apiSecret" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>API Secret (opcional)</label>
                  <InputText
                    id="apiSecret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    placeholder="Secret key si aplica"
                    className="w-full"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="endpoint" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Endpoint / URL Base (opcional)</label>
                  <InputText
                    id="endpoint"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.ejemplo.com/v1"
                    className="w-full"
                  />
                </div>
              </>
            )}

            {/* Campos para SECURE NOTE */}
            {selectedSecretType === 'secure_note' && (
              <div className="field">
                <label htmlFor="noteContent" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>Contenido de la Nota</label>
                <InputTextarea
                  id="noteContent"
                  value={formData.noteContent}
                  onChange={(e) => setFormData({ ...formData, noteContent: e.target.value })}
                  placeholder="Escribe aquí tu nota segura..."
                  rows={8}
                  className="w-full"
                />
              </div>
            )}

            {/* Campo común: Notas adicionales (excepto para secure_note) */}
            {selectedSecretType !== 'secure_note' && (
              <div className="field">
                <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.8rem' }}>{t('passwordManager.fields.notes')}</label>
                <InputTextarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('passwordManager.placeholders.notes')}
                  rows={2}
                  className="w-full"
                />
              </div>
            )}
          </div>

        </div>
      </Dialog>

      {/* Dialog para crear/editar carpeta */}
      <FolderDialog
        visible={showFolderDialog}
        onHide={() => {
          setShowFolderDialog(false);
          setFolderName('');
          setFolderColor(getThemeDefaultColor(iconTheme));
          setFolderIcon(null);
          setEditingFolder(null);
        }}
        mode={editingFolder ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        folderIcon={folderIcon}
        setFolderIcon={setFolderIcon}
        onConfirm={createNewFolder}
        iconTheme={iconTheme}
      />

      {/* Menú contextual nativo */}
      <ContextMenu
        model={contextMenuItems}
        ref={contextMenuRef}
        appendTo={document.body}
      />
      {/* ─ Botón flotante papelera passwords ─ */}
      <button
        id="pwd-trash-btn"
        onClick={() => setShowPwdTrashModal(true)}
        title={`Papelera (${trashedPasswords.length})`}
        style={{
          position: 'absolute',
          bottom: isDetailsPanelVisible && detailsCollapsed ? '44px' : '12px',
          right: '10px',
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          border: 'none',
          background: trashedPasswords.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)',
          color: trashedPasswords.length > 0 ? '#f87171' : '#888',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          zIndex: 10,
          transition: 'background 0.2s, transform 0.15s, bottom 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = trashedPasswords.length > 0 ? 'rgba(239,68,68,0.28)' : 'rgba(120,120,140,0.22)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = trashedPasswords.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <i className="pi pi-trash" style={{ fontSize: '13px' }} />
        {trashedPasswords.length > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {trashedPasswords.length > 9 ? '9+' : trashedPasswords.length}
          </span>
        )}
      </button>

    </div>

    {/* ─ Portal modal papelera contraseñas ─ */}
    {showPwdTrashModal && ReactDOM.createPortal(
      <div
        className="app-dialog-portal-mask"
        onClick={e => { if (e.target === e.currentTarget) { setShowPwdTrashModal(false); setPwdTrashConfirm(null); } }}
      >
        <style>{`@keyframes trashModalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} .ptrash-item:hover{background:rgba(255,255,255,0.06)!important} .ptrash-restore:hover{background:rgba(34,197,94,0.22)!important} .ptrash-del:hover{background:rgba(239,68,68,0.22)!important}`}</style>
        <div className="app-dialog app-dialog-portal" style={{ width: '460px', maxHeight: '560px' }}>
          <div className="app-dialog-portal-header">
            <div className="app-dialog-header">
              <span className="app-dialog-header-icon" aria-hidden="true"><i className="pi pi-trash" /></span>
              <div className="app-dialog-header-text">
                <span className="app-dialog-header-title">Papelera de contraseñas</span>
                <span className="app-dialog-header-subtitle">
                  {trashedPasswords.length === 0 ? 'Vacía' : `${trashedPasswords.length} elemento${trashedPasswords.length !== 1 ? 's' : ''} • Se pueden restaurar`}
                </span>
              </div>
            </div>
            <button type="button" className="app-dialog-portal-close" onClick={() => { setShowPwdTrashModal(false); setPwdTrashConfirm(null); }}>
              <i className="pi pi-times" />
            </button>
          </div>
          {/* Confirmación inline */}
          {pwdTrashConfirm && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="pi pi-exclamation-triangle" style={{ color: '#f87171', fontSize: '14px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '12px', color: '#fca5a5', lineHeight: 1.4 }}>
                {pwdTrashConfirm.type === 'empty' ? '¿Vaciar toda la papelera? No se puede deshacer.' : `¿Eliminar permanentemente «${pwdTrashConfirm.label}»?`}
              </span>
              <button onClick={executePasswordTrashConfirm} style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>Confirmar</button>
              <button onClick={() => setPwdTrashConfirm(null)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Cancelar</button>
            </div>
          )}
          {/* Toolbar */}
          {trashedPasswords.length > 0 && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '11px', color: '#475569' }}>Haz clic en «Restaurar» para recuperar</span>
              <button onClick={() => setPwdTrashConfirm({ type: 'empty' })} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <i className="pi pi-trash" style={{ fontSize: '10px' }} /> Vaciar todo
              </button>
            </div>
          )}
          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {trashedPasswords.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <i className="pi pi-check" style={{ fontSize: '24px', color: '#4ade80' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Papelera vacía</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Los elementos eliminados aparecerán aquí</div>
              </div>
            ) : trashedPasswords.map((item, idx) => (
              <div key={item.id} className="ptrash-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: idx < trashedPasswords.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="pi pi-key" style={{ color: '#64748b', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="pi pi-clock" style={{ fontSize: '9px' }} />
                    {new Date(item.deletedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="ptrash-restore" onClick={() => restorePasswordFromTrash(item.id)} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <i className="pi pi-undo" style={{ fontSize: '10px' }} /> Restaurar
                  </button>
                  <button className="ptrash-del" onClick={() => setPwdTrashConfirm({ type: 'single', id: item.id, label: item.label })} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171', borderRadius: '7px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <i className="pi pi-times" style={{ fontSize: '10px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default PasswordManagerSidebar;
