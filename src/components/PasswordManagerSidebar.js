import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { FolderDialog } from './Dialogs';
import SidebarFooter from './SidebarFooter';
import { iconThemes } from '../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import { CRYPTO_NETWORK_OPTIONS, getNetworkById } from '../utils/cryptoNetworks';
import { validateSeedPhrase, countWords } from '../utils/bip39Validator';
import '../styles/components/password-manager-sidebar.css';
import '../styles/components/tree-themes.css';

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
  treeTheme = 'default', // Tema del árbol
  sessionActionIconTheme = 'modern'
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  // Obtener la categoría de Gestión de Secretos para el diálogo
  const secretsManagementCategory = t('protocolSelection.categories.secretsManagement');
  
  // Estado separado para passwords - no usar el árbol principal de conexiones
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);
  
  // Restaurar estado de expansión desde localStorage
  useEffect(() => {
    try {
      const savedExpanded = localStorage.getItem('passwords_expanded_keys');
      if (savedExpanded) setExpandedKeys(JSON.parse(savedExpanded));
    } catch {}
    try {
      const savedAllExpanded = localStorage.getItem('passwords_all_expanded');
      if (savedAllExpanded !== null) setAllExpanded(JSON.parse(savedAllExpanded));
    } catch {}
  }, []);
  
  // Persistir estado de expansión
  useEffect(() => {
    try { localStorage.setItem('passwords_expanded_keys', JSON.stringify(expandedKeys)); } catch {}
  }, [expandedKeys]);
  useEffect(() => {
    try { localStorage.setItem('passwords_all_expanded', JSON.stringify(allExpanded)); } catch {}
  }, [allExpanded]);
  
  // Referencias y estados para el menú contextual
  const contextMenuRef = useRef(null);
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
  
  // Función para obtener el color por defecto del tema actual
  const getThemeDefaultColor = (themeName) => {
    const theme = iconThemes[themeName];
    if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac';
    
    const folderIcon = theme.icons.folder;
    
    if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
      return folderIcon.props.fill;
    }
    
    if (folderIcon.props && folderIcon.props.stroke) {
      return folderIcon.props.stroke;
    }
    
    if (folderIcon.props && folderIcon.props.children) {
      const children = Array.isArray(folderIcon.props.children) 
        ? folderIcon.props.children 
        : [folderIcon.props.children];
      
      for (const child of children) {
        if (child.props && child.props.fill && child.props.fill !== 'none') {
          return child.props.fill;
        }
        if (child.props && child.props.stroke) {
          return child.props.stroke;
        }
      }
    }
    
    return '#5e81ac';
  };

  // Estados para carpetas
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(() => getThemeDefaultColor(iconTheme));
  const [folderIcon, setFolderIcon] = useState(null);
  const [parentNodeKey, setParentNodeKey] = useState(null);

  // CARGAR passwords (con o sin encriptación)
  useEffect(() => {
    const loadPasswords = async () => {
      try {
        if (masterKey && secureStorage) {
          // CON master key: Cargar encriptado
          const encryptedData = localStorage.getItem('passwords_encrypted');
          
          if (encryptedData) {
            const decrypted = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
            setPasswordNodes(decrypted);
          } else {
            // Migración: Si hay datos sin encriptar, encriptarlos
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              const parsed = JSON.parse(plainData);
              
              // Encriptar y guardar
              const encrypted = await secureStorage.encryptData(parsed, masterKey);
              localStorage.setItem('passwords_encrypted', JSON.stringify(encrypted));
              
              // Eliminar datos sin encriptar
              localStorage.removeItem('passwordManagerNodes');
              
              setPasswordNodes(parsed);
            } else {
              setPasswordNodes([]);
            }
          }
        } else {
          // SIN master key: Funciona como antes
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            setPasswordNodes(JSON.parse(saved));
          } else {
            setPasswordNodes([]);
          }
        }
      } catch (error) {
        console.error('Error loading passwords:', error);
        setPasswordNodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPasswords();
  }, [masterKey, secureStorage]);

  // GUARDAR passwords (con o sin encriptación)
  useEffect(() => {
    const savePasswords = async () => {
      if (isLoading) return;

      try {
        if (masterKey && secureStorage) {
          // CON master key: Guardar encriptado
          const encrypted = await secureStorage.encryptData(passwordNodes, masterKey);
          localStorage.setItem('passwords_encrypted', JSON.stringify(encrypted));
          
          // Limpiar datos sin encriptar
          localStorage.removeItem('passwordManagerNodes');
        } else {
          // SIN master key: Guardar como antes
          localStorage.setItem('passwordManagerNodes', JSON.stringify(passwordNodes));
        }
      } catch (error) {
        console.error('Error saving passwords:', error);
      }
    };

    savePasswords();
  }, [passwordNodes, masterKey, secureStorage, isLoading]);

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
      const { count } = e.detail || {};
      try {
        // Recargar passwords desde localStorage
        if (masterKey && secureStorage) {
          const encryptedData = localStorage.getItem('passwords_encrypted');
          if (encryptedData) {
            const decrypted = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
            setPasswordNodes(decrypted);
            showToast && showToast({ 
              severity: 'success', 
              summary: 'Sincronizado', 
              detail: `${count} password(s) descargado(s) desde Nextcloud`, 
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

  const handleDeletePassword = (password) => {
    const executeDelete = () => {
      const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));

      const removePasswordFromTree = (nodeList) => {
        return nodeList.filter(node => {
          if (node.key === password.key) {
            return false;
          }
          if (node.children && node.children.length > 0) {
            node.children = removePasswordFromTree(node.children);
          }
          return true;
        });
      };

      const updatedPasswordNodes = removePasswordFromTree(passwordNodesCopy);
      setPasswordNodes(updatedPasswordNodes);

      showToast && showToast({
        severity: 'success',
        summary: 'Eliminado',
        detail: `Password "${password.label || password.title}" eliminado`,
        life: 3000
      });
    };

    const dialogToUse = confirmDialog || window.confirmDialog;
    if (dialogToUse) {
      dialogToUse({
        message: `¿Estás seguro de que deseas eliminar el password "${password.label || password.title}"?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: executeDelete
      });
    } else {
      executeDelete();
    }
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

  const filteredPasswordNodes = filterNodes(passwordNodes, sidebarFilter);

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

  // Funcionalidad de drag & drop para passwords
  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropIndex } = event;
    
    if (!dragNode || !dropNode) return;
    
    // No permitir arrastrar un nodo sobre sí mismo
    if (dragNode.key === dropNode.key) return;
    
    // No permitir arrastrar un nodo dentro de sus propios hijos
    const isDescendant = (parent, child) => {
      if (parent.children) {
        for (const node of parent.children) {
          if (node.key === child.key) return true;
          if (isDescendant(node, child)) return true;
        }
      }
      return false;
    };
    
    if (isDescendant(dragNode, dropNode)) return;
    
    const passwordNodesCopy = JSON.parse(JSON.stringify(passwordNodes));
    
    // Función para remover el nodo arrastrado de su ubicación actual
    const removeNodeFromTree = (nodeList, targetKey) => {
      return nodeList.filter(node => {
        if (node.key === targetKey) {
          return false;
        }
        if (node.children) {
          node.children = removeNodeFromTree(node.children, targetKey);
        }
        return true;
      });
    };
    
    // Función para añadir el nodo en su nueva ubicación
    const addNodeToTree = (nodeList, targetKey, newNode, index = 0) => {
      return nodeList.map(node => {
        if (node.key === targetKey) {
          const newChildren = [...(node.children || [])];
          newChildren.splice(index, 0, newNode);
          return { ...node, children: newChildren };
        }
        if (node.children) {
          return { ...node, children: addNodeToTree(node.children, targetKey, newNode, index) };
        }
        return node;
      });
    };
    
    // Determinar si el dropNode es una carpeta
    const isDroppingOnFolder = dropNode.droppable;
    
    if (isDroppingOnFolder) {
      // Arrastrar a una carpeta
      const updatedNodes = removeNodeFromTree(passwordNodesCopy, dragNode.key);
      const finalNodes = addNodeToTree(updatedNodes, dropNode.key, dragNode);
      setPasswordNodes(finalNodes);
      
      showToast && showToast({
        severity: 'success',
        summary: 'Movido',
        detail: `"${dragNode.label}" movido a "${dropNode.label}"`,
        life: 3000
      });
    } else {
      // Arrastrar a un password (mover al mismo nivel)
      const updatedNodes = removeNodeFromTree(passwordNodesCopy, dragNode.key);
      
      // Encontrar el padre del dropNode
      const findParent = (nodeList, targetKey) => {
        for (const node of nodeList) {
          if (node.children) {
            for (const child of node.children) {
              if (child.key === targetKey) {
                return node;
              }
            }
            const found = findParent(node.children, targetKey);
            if (found) return found;
          }
        }
        return null;
      };
      
      const parent = findParent(updatedNodes, dropNode.key);
      if (parent) {
        const finalNodes = addNodeToTree(updatedNodes, parent.key, dragNode, dropIndex);
        setPasswordNodes(finalNodes);
      } else {
        // Si no hay padre, mover a la raíz
        const rootIndex = updatedNodes.findIndex(node => node.key === dropNode.key);
        updatedNodes.splice(rootIndex + 1, 0, dragNode);
        setPasswordNodes(updatedNodes);
      }
      
      showToast && showToast({
        severity: 'success',
        summary: 'Movido',
        detail: `"${dragNode.label}" reorganizado`,
        life: 3000
      });
    }
  };

  const handleOpenPassword = (node) => {
    const payload = {
      key: node.key,
      label: node.label,
      title: node.label,
      type: node.data?.type || 'password',
      // Incluir todos los campos posibles según el tipo
      ...node.data
    };
    window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
  };

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
          } else if (child.droppable) {
            // Si es una subcarpeta, recolectar recursivamente
            collectRecursive(child);
          }
        });
      }
    };
    
    collectRecursive(node);
    return passwords;
  };

  const handleOpenFolder = (node) => {
    const passwords = collectPasswordsFromFolder(node);
    const payload = {
      folderKey: node.key,
      folderLabel: node.label,
      passwords: passwords
    };
    window.dispatchEvent(new CustomEvent('open-password-folder-tab', { detail: payload }));
  };

  // Node template para el árbol de passwords - igual que la sidebar de conexiones
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const secretType = node.data?.type || 'password';
    const isSecret = node.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
    
    let icon = null;
    const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['nord'].icons;
    
    const renderStandardIcon = (id, sizePx) => {
      const ids = [
        'pi-key',           // 0 key
        'pi-globe',         // 1 globe
        'pi-exclamation-triangle', // 2 warn
        'pi-user',          // 3 user
        'pi-save',          // 4 disk
        'pi-calendar',      // 5 calendar
        'pi-cog',           // 6 cog
        'pi-envelope',      // 7 mail
        'pi-database',      // 8 db
        'pi-lock',          // 9 lock
        'pi-unlock',        // 10 unlock
        'pi-link',          // 11 link
        'pi-book',          // 12 book
        'pi-shield',        // 13 shield
        'pi-wifi',          // 14 wifi
        'pi-desktop',       // 15 pc
        'pi-mobile',        // 16 phone
        'pi-chart-line',    // 17 chart
        'pi-sitemap',       // 18 network
        'pi-cloud',         // 19 cloud
        'pi-server',        // 20 server
        'pi-bolt',          // 21 lightning
        'pi-star',          // 22 star
        'pi-wrench',        // 23 wrench
        'pi-credit-card',   // 24 card
        'pi-map',           // 25 map
        'pi-question-circle', // 26 help
        'pi-info-circle',   // 27 info
        'pi-times-circle',  // 28 cancel
        'pi-check-circle',  // 29 ok
        'pi-download',      // 30 download
        'pi-upload',        // 31 upload
        'pi-bell',          // 32 bell
        'pi-image',         // 33 image
        'pi-briefcase',     // 34 briefcase
        'pi-clipboard',     // 35 clipboard
        'pi-list',          // 36 list
        'pi-prime',         // 37 cube
        'pi-building',      // 38 building
        'pi-folder'         // 39 folder
      ];
      const colors = [
        '#ffc107','#00bcd4','#ff7043','#8bc34a','#90caf9','#ffb74d','#9fa8da','#f48fb1','#ce93d8','#ff5252',
        '#4db6ac','#64b5f6','#bdbdbd','#81c784','#ffca28','#42a5f5','#26a69a','#9575cd','#4dd0e1','#90a4ae',
        '#ff8a65','#ffd54f','#fbc02d','#78909c','#8d6e63','#a5d6a7','#4fc3f7','#f06292','#ef9a9a','#66bb6a',
        '#29b6f6','#ab47bc','#7e57c2','#5c6bc0','#26c6da','#9ccc65','#ffa726','#607d8b','#ffd54f'
      ];
      const cls = ids[(id || 0) % ids.length];
      const color = colors[(id || 0) % colors.length];
      return <span className={`pi ${cls}`} style={{ color, fontSize: `${sizePx}px` }} />;
    };

    if (isSecret) {
      // Determinar icono según tipo de secreto
      const getSecretIcon = () => {
        // Si tiene icono personalizado, usarlo
        if (node.data?.iconImage) {
          return (
            <img 
              src={node.data.iconImage} 
              alt="icon" 
              style={{ width: `${connectionIconSize}px`, height: `${connectionIconSize}px`, objectFit: 'cover', borderRadius: 3 }}
            />
          );
        }
        if (node.data?.iconId != null) {
          return renderStandardIcon(Number(node.data.iconId), connectionIconSize);
        }
        
        // Icono por defecto según tipo
        switch (secretType) {
          case 'crypto_wallet':
            const network = node.data?.network;
            const networkColors = {
              bitcoin: '#F7931A',
              ethereum: '#627EEA',
              solana: '#9945FF',
              polygon: '#8247E5',
              bnb: '#F3BA2F',
              cardano: '#0033AD',
              avalanche: '#E84142',
              cosmos: '#2E3148',
              polkadot: '#E6007A',
              arbitrum: '#28A0F0',
              xrp: '#23292F',
              tron: '#FF0013'
            };
            return <span className="pi pi-wallet" style={{ color: networkColors[network] || '#F7931A', fontSize: `${connectionIconSize}px` }} />;
          case 'api_key':
            return <span className="pi pi-key" style={{ color: '#00BCD4', fontSize: `${connectionIconSize}px` }} />;
          case 'secure_note':
            return <span className="pi pi-file-edit" style={{ color: '#9C27B0', fontSize: `${connectionIconSize}px` }} />;
          default: // password
            return <span className="pi pi-lock" style={{ color: '#E91E63', fontSize: `${connectionIconSize}px` }} />;
        }
      };
      icon = getSecretIcon();
    } else if (isFolder) {
      // Verificar si tiene icono personalizado (ignorar 'general' como si fuera null)
      if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
        icon = <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />;
      } else if (node.data && node.data.iconImage) {
        icon = (
          <img 
            src={node.data.iconImage} 
            alt="icon" 
            style={{ width: `${folderIconSize}px`, height: `${folderIconSize}px`, objectFit: 'cover', borderRadius: 3 }}
          />
        );
      } else {
        // Mapear por iconId para dar variación visual si existe
        let tintColor = node.color || getThemeDefaultColor(iconTheme);
        if (node.data && node.data.iconId != null) {
          const id = Number(node.data.iconId);
          const palette = ['#5e81ac', '#88c0d0', '#a3be8c', '#ebcb8b', '#d08770', '#b48ead', '#bf616a', '#8fbcbb'];
          tintColor = palette[id % palette.length];
        }
        const themeIcon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;
        
        if (themeIcon) {
          icon = React.cloneElement(themeIcon, {
            width: folderIconSize,
            height: folderIconSize,
            style: { 
              ...themeIcon.props.style, 
              color: tintColor,
              width: `${folderIconSize}px`,
              height: `${folderIconSize}px`
            }
          });
        } else {
          icon = options.expanded
            ? <span className="pi pi-folder-open" style={{ color: tintColor }} />
            : <span className="pi pi-folder" style={{ color: tintColor }} />;
        }
      }
    }
    
    // Detectar si tiene icono personalizado (para ajustar alineación del texto)
    const hasCustomFolderIcon = isFolder && node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()];
    
    return (
      <div 
        className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isSecret) {
            handleOpenPassword(node);
          } else if (isFolder) {
            handleOpenFolder(node);
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
        data-node-type={isFolder ? 'folder' : 'connection'}
        draggable={true}
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

  // Función para copiar al portapapeles
  const handleCopyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
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

  // Función para abrir URL
  const handleOpenUrl = (url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      window.open(url, '_blank');
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

      showToast && showToast({
        severity: 'success',
        summary: 'Eliminado',
        detail: `Carpeta "${folder.label}" eliminada`,
        life: 3000
      });
    };

    const dialogToUse = confirmDialog || window.confirmDialog;
    if (dialogToUse) {
      dialogToUse({
        message: `¿Estás seguro de que deseas eliminar la carpeta "${folder.label}" y todo su contenido?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: executeDelete
      });
    } else {
      executeDelete();
    }
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
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeKey({ [node.key]: true });
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
            handleOpenPassword(node);
          }
        },
        { separator: true }
      ];

      // Opciones específicas según el tipo de secreto
      if (secretType === 'password') {
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
            label: 'Abrir URL',
            icon: 'pi pi-external-link',
            command: () => {
              const url = node.data?.url || '';
              if (url) {
                handleOpenUrl(url);
              } else {
                showToast && showToast({
                  severity: 'warn',
                  summary: 'Sin URL',
                  detail: 'Este password no tiene URL configurada',
                  life: 2000
                });
              }
            }
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

      // Opciones comunes
      menuItems.push(
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

  return (
    <>
      {/* Header igual que la sidebar de conexiones */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
        <Button 
          className="p-button-rounded p-button-text sidebar-action-button glass-button" 
          onClick={() => setSidebarCollapsed && setSidebarCollapsed(v => !v)} 
          tooltip={sidebarCollapsed ? tCommon('tooltips.expandSidebar') : tCommon('tooltips.collapseSidebar')} 
          tooltipOptions={{ position: 'bottom' }} 
          style={{ 
            marginRight: 8,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0
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
            {sidebarCollapsed 
              ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandRight
              : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft}
          </span>
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={() => {
              // Abrir diálogo de selección de protocolo directamente en la categoría de Gestión de Secretos
              window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog', {
                detail: { initialCategory: secretsManagementCategory }
              }));
            }} 
            tooltip={tCommon('tooltips.newConnection')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: 0
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
              width: '40px',
              height: '40px',
              padding: 0
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
              width: '40px',
              height: '40px',
              padding: 0
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
          <Button 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={onBackToConnections} 
            tooltip={tCommon('tooltips.goToConnections')} 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: 0
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
        </div>
      </div>
      <Divider className="my-2" />
      
      {/* Árbol de passwords - igual que la sidebar de conexiones */}
      <div 
        className="tree-container"
        style={{ 
          flex: 1, 
          minHeight: 0, 
          overflowY: 'auto', 
          overflowX: 'auto',
          position: 'relative',
          fontSize: `${explorerFontSize}px`
        }}
        onContextMenu={onTreeAreaContextMenu}
      >
        {filteredPasswordNodes.length === 0 ? (
          <div className="empty-tree-message" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            No hay passwords guardados.<br/>Usa el botón "+" para crear uno.
          </div>
        ) : (
                  <Tree
                    key={`password-tree-${iconTheme}-${explorerFontSize}-${treeTheme}`}
                    value={filteredPasswordNodes}
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
                      fontSize: `${explorerFontSize}px`,
                      '--icon-size': `${iconSize}px`
                    }}
                    nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
                  />
        )}
      </div>

      <SidebarFooter
        onConfigClick={() => setShowSettingsDialog && setShowSettingsDialog(true)}
        allExpanded={allExpanded}
        toggleExpandAll={toggleExpandAll}
        collapsed={false}
        onShowImportDialog={onShowImportDialog}
        sessionActionIconTheme={sessionActionIconTheme}
      />

      {/* Dialog para crear/editar secreto */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={
              selectedSecretType === 'password' ? 'pi pi-lock' :
              selectedSecretType === 'crypto_wallet' ? 'pi pi-wallet' :
              selectedSecretType === 'api_key' ? 'pi pi-key' : 'pi pi-file-edit'
            } style={{ 
              fontSize: '1.2rem',
              color: selectedSecretType === 'password' ? '#E91E63' :
                     selectedSecretType === 'crypto_wallet' ? '#F7931A' :
                     selectedSecretType === 'api_key' ? '#00BCD4' : '#9C27B0'
            }}></i>
            <span>
              {editingPassword ? 'Editar ' : 'Nuevo '}
              {selectedSecretType === 'password' ? 'Contraseña' :
               selectedSecretType === 'crypto_wallet' ? 'Billetera Crypto' :
               selectedSecretType === 'api_key' ? 'Clave de API' : 'Nota Segura'}
            </span>
          </div>
        }
        visible={showPasswordDialog}
        style={{ width: '550px' }}
        onHide={() => {
          setShowPasswordDialog(false);
          resetForm();
        }}
        footer={
          <div>
            <Button
              label={tCommon('buttons.cancel')}
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => {
                setShowPasswordDialog(false);
                resetForm();
              }}
            />
            <Button
              label={editingPassword ? tCommon('buttons.save') : tCommon('buttons.create')}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={handleSavePassword}
            />
          </div>
        }
      >
        <div className="secret-form">
          {/* Campo común: Título */}
          <div className="field">
            <label htmlFor="title">{t('passwordManager.fields.title')} *</label>
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
                <label htmlFor="username">{t('passwordManager.fields.username')}</label>
                <InputText
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={t('passwordManager.placeholders.username')}
                  className="w-full"
                />
              </div>
              <div className="field">
                <label htmlFor="password">{t('passwordManager.fields.password')}</label>
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
                <label htmlFor="url">{t('passwordManager.fields.url')}</label>
                <InputText
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder={t('passwordManager.placeholders.url')}
                  className="w-full"
                />
              </div>
              <div className="field">
                <label htmlFor="group">{t('passwordManager.fields.group')}</label>
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
                <label htmlFor="network">Red / Blockchain</label>
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
                <label htmlFor="address">Dirección Pública</label>
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
                  <label htmlFor="seedPhrase">
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
                            if (window.electron?.clipboard?.writeText) {
                              await window.electron.clipboard.writeText(formData.seedPhrase);
                            } else {
                              await navigator.clipboard.writeText(formData.seedPhrase);
                            }
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
                                if (window.electron?.clipboard?.writeText) {
                                  await window.electron.clipboard.writeText(word);
                                } else {
                                  await navigator.clipboard.writeText(word);
                                }
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
                <label htmlFor="passphrase">Passphrase (25ta palabra, opcional)</label>
                <InputText
                  id="passphrase"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  placeholder="Palabra adicional de seguridad"
                  className="w-full"
                />
              </div>
              <div className="field">
                <label htmlFor="privateKey">Clave Privada (opcional)</label>
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
                <label htmlFor="serviceName">Nombre del Servicio</label>
                <InputText
                  id="serviceName"
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  placeholder="Ej: OpenAI, AWS, Stripe..."
                  className="w-full"
                />
              </div>
              <div className="field">
                <label htmlFor="apiKey">API Key / Token</label>
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
                <label htmlFor="apiSecret">API Secret (opcional)</label>
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
                <label htmlFor="endpoint">Endpoint / URL Base (opcional)</label>
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
              <label htmlFor="noteContent">Contenido de la Nota</label>
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
              <label htmlFor="notes">{t('passwordManager.fields.notes')}</label>
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

    </>
  );
};

export default PasswordManagerSidebar;

