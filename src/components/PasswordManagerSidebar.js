import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { FolderDialog } from './Dialogs';
import SidebarFooter from './SidebarFooter';
import { iconThemes } from '../themes/icon-themes';
import '../styles/components/password-manager-sidebar.css';

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
  onShowImportDialog
}) => {
  // Estado separado para passwords - no usar el árbol principal de conexiones
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
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
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    group: '',
    notes: ''
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


  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      password: '',
      url: '',
      group: '',
      notes: ''
    });
    setEditingPassword(null);
  };

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
              color: folderColor
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

  const handleEditPassword = (password) => {
    setFormData({
      title: password.label || password.title,
      username: password.data?.username || password.username || '',
      password: password.data?.password || password.password || '',
      url: password.data?.url || password.url || '',
      group: password.data?.group || password.group || '',
      notes: password.data?.notes || password.notes || ''
    });
    setEditingPassword(password);
    setShowPasswordDialog(true);
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

    if (editingPassword) {
      // Editar password existente
      const updatePasswordInTree = (nodeList) => {
        return nodeList.map(node => {
          if (node.key === editingPassword.key) {
            return {
              ...node,
              label: formData.title,
              data: {
                ...node.data,
                username: formData.username,
                password: formData.password,
                url: formData.url,
                group: formData.group,
                notes: formData.notes
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

      showToast && showToast({
        severity: 'success',
        summary: 'Actualizado',
        detail: `Password "${formData.title}" actualizado`,
        life: 3000
      });
    } else {
      // Crear nuevo password
      const newKey = `password_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newPasswordNode = {
        key: newKey,
        label: formData.title,
        data: {
          type: 'password',
          username: formData.username,
          password: formData.password,
          url: formData.url,
          group: formData.group,
          notes: formData.notes
        },
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

      showToast && showToast({
        severity: 'success',
        summary: 'Creado',
        detail: `Password "${formData.title}" creado`,
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
      if (node.data && node.data.type === 'password') {
        return (
          node.label.toLowerCase().includes(search) ||
          (node.data.username && node.data.username.toLowerCase().includes(search)) ||
          (node.data.url && node.data.url.toLowerCase().includes(search)) ||
          (node.data.group && node.data.group.toLowerCase().includes(search))
        );
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

  const filteredPasswordNodes = filterNodes(passwordNodes, searchFilter);

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
      data: {
        username: node.data?.username || '',
        password: node.data?.password || '',
        url: node.data?.url || '',
        group: node.data?.group || '',
        notes: node.data?.notes || ''
      }
    };
    window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
  };

  // Node template para el árbol de passwords - igual que la sidebar de conexiones
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const isPassword = node.data && node.data.type === 'password';
    
    let icon = null;
    const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['nord'].icons;
    
    if (isPassword) {
      icon = <span className="pi pi-key" style={{ color: '#ffc107', fontSize: `${connectionIconSize}px` }} />;
    } else if (isFolder) {
      const themeIcon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;
      
      if (themeIcon) {
        icon = React.cloneElement(themeIcon, {
          width: folderIconSize,
          height: folderIconSize,
          style: { 
            ...themeIcon.props.style, 
            color: node.color || getThemeDefaultColor(iconTheme),
            width: `${folderIconSize}px`,
            height: `${folderIconSize}px`
          }
        });
      } else {
        icon = options.expanded
          ? <span className="pi pi-folder-open" style={{ color: node.color || getThemeDefaultColor(iconTheme) }} />
          : <span className="pi pi-folder" style={{ color: node.color || getThemeDefaultColor(iconTheme) }} />;
      }
    }
    
    return (
      <div 
        className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isPassword) {
            handleOpenPassword(node);
          }
        }}
        style={{ cursor: 'pointer', fontFamily: explorerFont, alignItems: 'flex-start' }}
        data-connection-type={isPassword ? 'password' : null}
        data-node-type={isFolder ? 'folder' : 'connection'}
        draggable={true}
      >
        <span style={{ 
          minWidth: 20,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '20px',
          position: 'relative'
        }}>
          {icon}
        </span>
        <span className="node-label" style={{ 
          flex: 1,
          marginLeft: '0px'
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

  // Menú contextual para passwords usando ContextMenu nativo
  const onNodeContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeKey({ [node.key]: true });
    setCurrentContextNode(node);
    
    // Crear menú contextual simple para passwords
    const isPassword = node.data && node.data.type === 'password';
    const isFolder = node.droppable;
    
    if (isPassword) {
      const menuItems = [
        {
          label: 'Ver detalles',
          icon: 'pi pi-eye',
          command: () => {
            handleOpenPassword(node);
          }
        },
        { separator: true },
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
      ];
      
      setContextMenuItems(menuItems);
      
      // Mostrar el menú contextual nativo
      if (contextMenuRef.current) {
        contextMenuRef.current.show(event);
      }
    } else if (isFolder) {
      const menuItems = [
        {
          label: 'Nuevo Password',
          icon: 'pi pi-plus',
          command: () => {
            setParentNodeKey(node.key);
            setShowPasswordDialog(true);
          }
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
          icon={sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'} 
          className="p-button-rounded p-button-text sidebar-action-button" 
          onClick={() => setSidebarCollapsed && setSidebarCollapsed(v => !v)} 
          tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
          tooltipOptions={{ position: 'bottom' }} 
          style={{ marginRight: 8 }} 
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Button 
            icon="pi pi-plus" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={handleNewPassword} 
            tooltip="Nuevo password" 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ color: 'var(--ui-sidebar-text, #cccccc)' }}
          />
          <Button 
            icon="pi pi-folder" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={handleNewFolder} 
            tooltip="Nueva carpeta" 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ color: 'var(--ui-sidebar-text, #cccccc)' }}
          />
          <Button 
            icon="pi pi-sitemap" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={onBackToConnections} 
            tooltip="Ir a conexiones" 
            tooltipOptions={{ position: 'bottom' }} 
            style={{ color: 'var(--ui-sidebar-text, #cccccc)' }}
          />
        </div>
      </div>
      <Divider className="my-2" />
      
      {/* Árbol de passwords - igual que la sidebar de conexiones */}
      <div style={{ 
        flex: 1, 
        minHeight: 0, 
        overflowY: 'auto', 
        overflowX: 'auto',
        position: 'relative',
        fontSize: `${explorerFontSize}px`
      }}>
        {filteredPasswordNodes.length === 0 ? (
          <div className="empty-tree-message" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            No hay passwords guardados.<br/>Usa el botón "+" para crear uno.
          </div>
        ) : (
                  <Tree
                    key={`password-tree-${iconTheme}-${explorerFontSize}`}
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
                    className="sidebar-tree"
                    data-icon-theme={iconTheme}
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
      />

      {/* Dialog para crear/editar password */}
      <Dialog
        header={editingPassword ? 'Editar Password' : 'Nuevo Password'}
        visible={showPasswordDialog}
        style={{ width: '500px' }}
        onHide={() => {
          setShowPasswordDialog(false);
          resetForm();
        }}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => {
                setShowPasswordDialog(false);
                resetForm();
              }}
            />
            <Button
              label={editingPassword ? 'Guardar' : 'Crear'}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={handleSavePassword}
            />
          </div>
        }
      >
        <div className="password-form">
          <div className="field">
            <label htmlFor="title">Título *</label>
            <InputText
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Gmail, GitHub, etc."
              className="w-full"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="username">Usuario</label>
            <InputText
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Nombre de usuario o email"
              className="w-full"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
                className="w-full"
              />
              <Button
                icon="pi pi-refresh"
                className="p-button-secondary"
                onClick={generateRandomPassword}
                tooltip="Generar password aleatorio"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="url">URL</label>
            <InputText
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://ejemplo.com"
              className="w-full"
            />
          </div>

          <div className="field">
            <label htmlFor="group">Grupo</label>
            <InputText
              id="group"
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              placeholder="Categoría o grupo"
              className="w-full"
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notas</label>
            <InputTextarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full"
            />
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
          setEditingFolder(null);
        }}
        mode={editingFolder ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
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

