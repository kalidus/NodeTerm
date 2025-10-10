import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { FolderDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import '../styles/components/password-manager-sidebar.css';

const PasswordManagerSidebar = ({ 
  nodes, 
  setNodes,
  showToast,
  confirmDialog,
  uiTheme = 'Light',
  onBackToConnections,
  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14
}) => {
  // Estado separado para passwords - no usar el árbol principal de conexiones
  const [passwordNodes, setPasswordNodes] = useState(() => {
    // Cargar passwords existentes del localStorage o crear array vacío
    try {
      const saved = localStorage.getItem('passwordManagerNodes');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading passwords from localStorage:', error);
      return [];
    }
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  
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

  // Guardar passwords en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem('passwordManagerNodes', JSON.stringify(passwordNodes));
    } catch (error) {
      console.error('Error saving passwords to localStorage:', error);
    }
  }, [passwordNodes]);


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
    
    setShowFolderDialog(false);
    setFolderName('');
    
    showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Carpeta "${folderName}" creada`, life: 3000 });
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

  const handleCopyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast && showToast({
        severity: 'success',
        summary: 'Copiado',
        detail: `${field} copiado al portapapeles`,
        life: 2000
      });
    }).catch(() => {
      showToast && showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo copiar al portapapeles',
        life: 3000
      });
    });
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

  // Menú contextual para passwords (similar al de conexiones)
  const onNodeContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeKey({ [node.key]: true });
    
    // Crear menú contextual simple para passwords
    const isPassword = node.data && node.data.type === 'password';
    const isFolder = node.droppable;
    
    if (isPassword) {
      const menuItems = [
        {
          label: 'Ver detalles',
          icon: 'pi pi-eye',
          command: () => handleOpenPassword(node)
        },
        {
          label: 'Copiar usuario',
          icon: 'pi pi-user',
          command: () => {
            const username = node.data?.username || '';
            if (username) {
              handleCopyToClipboard(username, 'Usuario');
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
            }
          }
        },
        { separator: true },
        {
          label: 'Editar',
          icon: 'pi pi-pencil',
          command: () => handleEditPassword(node)
        },
        {
          label: 'Eliminar',
          icon: 'pi pi-trash',
          command: () => handleDeletePassword(node)
        }
      ];
      
      // Crear menú contextual usando la función existente
      if (window.createContextMenu) {
        window.createContextMenu(event, menuItems, 'password-context-menu');
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
        }
      ];
      
      if (window.createContextMenu) {
        window.createContextMenu(event, menuItems, 'password-folder-context-menu');
      }
    }
  };

  return (
    <>
      {/* Header igual que la sidebar de conexiones */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
        <Button 
          icon="pi pi-arrow-left" 
          className="p-button-rounded p-button-text sidebar-action-button" 
          onClick={onBackToConnections} 
          tooltip="Volver a conexiones" 
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
          />
          <Button 
            icon="pi pi-folder-plus" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={handleNewFolder} 
            tooltip="Nueva carpeta" 
            tooltipOptions={{ position: 'bottom' }} 
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

      {/* Dialog para crear carpeta */}
      <FolderDialog
        visible={showFolderDialog}
        onHide={() => {
          setShowFolderDialog(false);
          setFolderName('');
          setFolderColor(getThemeDefaultColor(iconTheme));
        }}
        mode="new"
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        onConfirm={createNewFolder}
        iconTheme={iconTheme}
      />
    </>
  );
};

export default PasswordManagerSidebar;

