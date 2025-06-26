import React, { useState, useEffect, useRef } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Tree } from 'primereact/tree';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Menu } from 'primereact/menu';
import TerminalComponent from './TerminalComponent';
import FileExplorer from './FileExplorer';
import { Divider } from 'primereact/divider';
import { InputNumber } from 'primereact/inputnumber';
import { themes } from '../themes';

const App = () => {
  const toast = useRef(null);
  const overflowMenuRef = useRef(null);
  // Storage key for persistence
  const STORAGE_KEY = 'basicapp2_tree_data';
  const [folderName, setFolderName] = useState('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [showSSHDialog, setShowSSHDialog] = useState(false);
  const [sshName, setSSHName] = useState('');
  const [sshHost, setSSHHost] = useState('');
  const [sshUser, setSSHUser] = useState('');
  const [sshTargetFolder, setSSHTargetFolder] = useState(null);
  const [showEditSSHDialog, setShowEditSSHDialog] = useState(false);
  const [editSSHNode, setEditSSHNode] = useState(null);
  const [editSSHName, setEditSSHName] = useState('');
  const [editSSHHost, setEditSSHHost] = useState('');
  const [editSSHUser, setEditSSHUser] = useState('');
  const [editSSHPassword, setEditSSHPassword] = useState('');
  const [editSSHRemoteFolder, setEditSSHRemoteFolder] = useState('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [editFolderNode, setEditFolderNode] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [sshTabs, setSshTabs] = useState([]);
  const [fileExplorerTabs, setFileExplorerTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pendingExplorerSession, setPendingExplorerSession] = useState(null);
  const [sshPassword, setSSHPassword] = useState('');
  const [sshRemoteFolder, setSSHRemoteFolder] = useState('');
  const terminalRefs = useRef({});
  const [nodes, setNodes] = useState([]);

  // Font configuration
  const FONT_FAMILY_STORAGE_KEY = 'basicapp_terminal_font_family';
  const FONT_SIZE_STORAGE_KEY = 'basicapp_terminal_font_size';
  const availableFonts = [
    { label: 'FiraCode Nerd Font', value: '"FiraCode Nerd Font", monospace' },
    { label: 'Cascadia Code', value: '"Cascadia Code", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
    { label: 'Hack', value: 'Hack, monospace' },
    { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
    { label: 'Consolas', value: 'Consolas, monospace' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Lucida Console', value: '"Lucida Console", monospace' },
    { label: 'Menlo', value: 'Menlo, monospace' }
  ];
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem(FONT_FAMILY_STORAGE_KEY) || availableFonts[0].value);
  const [fontSize, setFontSize] = useState(() => {
    const savedSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return savedSize ? parseInt(savedSize, 10) : 14; // Default font size is 14
  });

  // Theme configuration
  const THEME_STORAGE_KEY = 'basicapp_terminal_theme';
  const availableThemes = Object.keys(themes);
  const [terminalTheme, setTerminalTheme] = useState(() => {
      const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'Default Dark';
      return themes[savedThemeName];
  });

  // Constantes para el overflow de pestañas
  const MAX_VISIBLE_TABS = 8;

  // Estado para drag & drop de pestañas
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [dragStartTimer, setDragStartTimer] = useState(null);

  // Estado para menú contextual de terminal
  const [terminalContextMenu, setTerminalContextMenu] = useState(null);
  const terminalContextMenuRef = useRef(null);

  // Funciones auxiliares para el manejo de pestañas
  const getAllTabs = () => {
    return [...sshTabs, ...fileExplorerTabs];
  };

  const getVisibleTabs = () => {
    const allTabs = getAllTabs();
    return allTabs.slice(0, MAX_VISIBLE_TABS);
  };

  const getHiddenTabs = () => {
    const allTabs = getAllTabs();
    return allTabs.slice(MAX_VISIBLE_TABS);
  };

  const getTabTypeAndIndex = (globalIndex) => {
    if (globalIndex < sshTabs.length) {
      return { type: 'ssh', index: globalIndex };
    } else {
      return { type: 'explorer', index: globalIndex - sshTabs.length };
    }
  };

  // Funciones para drag & drop de pestañas
  const handleTabDragStart = (e, tabIndex) => {
    // Pequeño delay para distinguir entre click y drag
    const timer = setTimeout(() => {
      setDraggedTabIndex(tabIndex);
    }, 50);
    setDragStartTimer(timer);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabIndex.toString());
  };

  const handleTabDragOver = (e, tabIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabIndex(tabIndex);
  };

  const handleTabDragLeave = (e) => {
    // Solo limpiar si realmente salimos del área de pestañas
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTabIndex(null);
    }
  };

  const handleTabDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = draggedTabIndex;
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }

    // Reordenar las pestañas
    const allTabs = getAllTabs();
    const draggedTab = allTabs[dragIndex];
    const newTabs = [...allTabs];
    
    // Remover el tab de su posición original
    newTabs.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newTabs.splice(dropIndex, 0, draggedTab);
    
    // Separar nuevamente en SSH y Explorer tabs manteniendo el orden
    const newSshTabs = [];
    const newExplorerTabs = [];
    
    newTabs.forEach(tab => {
      // Verificar si es una pestaña SSH (incluyendo exploradores en SSH)
      const isSSHTab = sshTabs.some(sshTab => sshTab.key === tab.key);
      if (isSSHTab) {
        newSshTabs.push(tab);
      } else {
        newExplorerTabs.push(tab);
      }
    });
    
    // Actualizar los estados manteniendo el orden correcto
    setSshTabs(newSshTabs);
    setFileExplorerTabs(newExplorerTabs);
    
    // Actualizar el índice activo
    setActiveTabIndex(dropIndex);
    
    // Limpiar estado de drag
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  const handleTabDragEnd = () => {
    // Limpiar timer si existe
    if (dragStartTimer) {
      clearTimeout(dragStartTimer);
      setDragStartTimer(null);
    }
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  // Efecto para posicionar el menú contextual correctamente
  useEffect(() => {
    if (terminalContextMenu && terminalContextMenu.mouseX !== undefined && terminalContextMenu.mouseY !== undefined) {
      const timer = setTimeout(() => {
        const menuElement = document.querySelector('.p-menu.p-menu-overlay');
        if (menuElement) {
          menuElement.style.position = 'fixed';
          menuElement.style.left = `${terminalContextMenu.mouseX}px`;
          menuElement.style.top = `${terminalContextMenu.mouseY}px`;
          menuElement.style.zIndex = '9999';
          menuElement.style.transform = 'none';
          menuElement.style.margin = '0';
        }
      }, 50); // Dar más tiempo para que el menú se renderice

      // Agregar listener para cerrar menú al hacer clic fuera
      const handleClickOutside = (event) => {
        const menuElement = document.querySelector('.p-menu.p-menu-overlay');
        if (menuElement && !menuElement.contains(event.target)) {
          setTerminalContextMenu(null);
          if (terminalContextMenuRef.current) {
            terminalContextMenuRef.current.hide();
          }
        }
      };

      document.addEventListener('click', handleClickOutside);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [terminalContextMenu]);

  // Funciones para menú contextual de terminal
  const handleTerminalContextMenu = (e, tabKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capturar coordenadas exactas del mouse
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calcular posición ajustada para que no se salga de la pantalla
    const menuWidth = 180; // Ancho aproximado del menú
    const menuHeight = 200; // Altura aproximada del menú
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let adjustedX = mouseX;
    let adjustedY = mouseY;
    
    // Ajustar X si se sale por la derecha
    if (mouseX + menuWidth > viewport.width) {
      adjustedX = viewport.width - menuWidth - 10;
    }
    
    // Ajustar Y si se sale por abajo
    if (mouseY + menuHeight > viewport.height) {
      adjustedY = viewport.height - menuHeight - 10;
    }
    
    // Asegurar que no se salga por la izquierda o arriba
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    setTerminalContextMenu({ tabKey, event: e, mouseX: adjustedX, mouseY: adjustedY });
    
    // Mostrar menú (el posicionamiento se maneja en useEffect)
    setTimeout(() => {
      if (terminalContextMenuRef.current) {
        terminalContextMenuRef.current.show(e);
      }
    }, 0);
  };

  const getTerminalContextMenuItems = () => {
    if (!terminalContextMenu) return [];
    
    const { tabKey } = terminalContextMenu;
    
    return [
      {
        label: 'Copiar selección',
        icon: 'pi pi-copy',
        command: () => handleCopyFromTerminal(tabKey)
      },
      {
        label: 'Pegar',
        icon: 'pi pi-clone',
        command: () => handlePasteToTerminal(tabKey)
      },
      {
        separator: true
      },
      {
        label: 'Seleccionar todo',
        icon: 'pi pi-list',
        command: () => handleSelectAllTerminal(tabKey)
      },
      {
        separator: true
      },
      {
        label: 'Limpiar terminal',
        icon: 'pi pi-trash',
        command: () => handleClearTerminal(tabKey)
      }
    ];
  };

  const handleCopyFromTerminal = (tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      const selection = terminal.getSelection();
      if (selection) {
        window.electron.clipboard.writeText(selection);
        toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: 'Texto copiado al portapapeles',
          life: 2000
        });
      } else {
        toast.current.show({
          severity: 'warn',
          summary: 'Sin selección',
          detail: 'No hay texto seleccionado para copiar',
          life: 3000
        });
      }
    }
  };

  const handlePasteToTerminal = async (tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      try {
        const text = await window.electron.clipboard.readText();
        if (text) {
          // Enviar el texto al terminal a través del IPC para que vaya al servidor SSH
          window.electron.ipcRenderer.send('ssh:data', { tabId: tabKey, data: text });
          toast.current.show({
            severity: 'success',
            summary: 'Pegado',
            detail: 'Texto enviado al terminal',
            life: 2000
          });
        } else {
          toast.current.show({
            severity: 'warn',
            summary: 'Portapapeles vacío',
            detail: 'No hay texto en el portapapeles',
            life: 3000
          });
        }
      } catch (error) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo acceder al portapapeles',
          life: 3000
        });
      }
    }
  };

  const handleSelectAllTerminal = (tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      terminal.selectAll();
      toast.current.show({
        severity: 'info',
        summary: 'Seleccionado',
        detail: 'Todo el contenido del terminal seleccionado',
        life: 2000
      });
    }
  };

  const handleClearTerminal = (tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      // Limpiar el buffer visual del terminal
      terminal.clear();
      // También enviar comando clear al servidor SSH para limpiar la sesión
      if (window.electron) {
        window.electron.ipcRenderer.send('ssh:data', { tabId: tabKey, data: 'clear\n' });
      }
      toast.current.show({
        severity: 'info',
        summary: 'Terminal limpiado',
        detail: 'Terminal y sesión SSH limpiados',
        life: 2000
      });
    }
  };

  const generateOverflowMenuItems = () => {
    const hiddenTabs = getHiddenTabs();
    return hiddenTabs.map((tab, index) => {
      const globalIndex = MAX_VISIBLE_TABS + index;
      // Determinar el tipo de pestaña basado en su tipo, contenido o flag híbrido
      const isExplorerTab = tab.type === 'explorer' || tab.isExplorerInSSH;
      const isTerminalTab = tab.type === 'terminal';
      return {
        label: tab.label,
        icon: isExplorerTab ? 'pi pi-folder' : 'pi pi-terminal',
        command: () => {
          setActiveTabIndex(globalIndex);
        }
      };
    });
  };

  // Load initial nodes from localStorage or use default
  useEffect(() => {
    const savedNodes = localStorage.getItem(STORAGE_KEY);
    if (savedNodes) {
      setNodes(JSON.parse(savedNodes));
    } else {
      setNodes(getDefaultNodes());
    }
  }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    }
  }, [nodes]);

  // Auto-save font family to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, fontFamily);
  }, [fontFamily]);

  // Auto-save font size to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  // Auto-save theme to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, terminalTheme.name);
  }, [terminalTheme]);

  // Efecto para manejar cambios en el explorador de archivos
  useEffect(() => {
    if (pendingExplorerSession) {
      const explorerIndex = sshTabs.length + fileExplorerTabs.findIndex(tab => tab.originalKey === pendingExplorerSession);
      if (explorerIndex >= sshTabs.length) {
        setActiveTabIndex(explorerIndex);
        setPendingExplorerSession(null);
      }
    }
  }, [fileExplorerTabs, pendingExplorerSession, sshTabs.length]);



  // Default tree data
  const getDefaultNodes = () => [
    {
      key: '0',
      label: 'Proyectos',
      droppable: true,
      children: [
        {
          key: '0-0',
          label: 'Proyecto 1',
          droppable: true,
          children: [
            { key: '0-0-0', label: 'Archivo 1.txt', draggable: true },
            { key: '0-0-1', label: 'Archivo 2.txt', draggable: true }
          ]
        },
        {
          key: '0-1',
          label: 'Proyecto 2',
          droppable: true,
          children: [
            { key: '0-1-0', label: 'Archivo 3.txt', draggable: true }
          ]
        }
      ]
    },
    {
      key: '1',
      label: 'Documentos',
      droppable: true,
      children: [
        { key: '1-0', label: 'Documento 1.pdf', draggable: true },
        { key: '1-1', label: 'Documento 2.docx', draggable: true }
      ]
    }
  ];

  // Selected node in the tree
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);

  // Track the currently dragged node
  const [draggedNodeKey, setDraggedNodeKey] = useState(null);

  // Function to create a deep copy of nodes
  const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };

  // Function to regenerate keys for the entire tree
  const regenerateKeys = (nodes, parentKey = null) => {
    return nodes.map((node, index) => {
      const newKey = parentKey ? `${parentKey}-${index}` : index.toString();
      const newNode = {
        ...node,
        key: newKey
      };
      
      if (node.children && node.children.length > 0) {
        newNode.children = regenerateKeys(node.children, newKey);
      }
      
      return newNode;
    });
  };

  // Helper function to update nodes with automatic key regeneration
  const updateNodesWithKeys = (newNodes, message = 'Operación completada') => {
    const nodesWithUpdatedKeys = regenerateKeys(newNodes);
    setNodes(nodesWithUpdatedKeys);
    return nodesWithUpdatedKeys;
  };

  // Function to find a node by key (recursive search)
  const findNodeByKey = (nodes, key) => {
    if (key === null) return null;
    
    for (let node of nodes) {
      if (node.key === key) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  // Function to find a node by UID (most robust)
  const findNodeByUID = (nodes, uid) => {
    for (let node of nodes) {
      if (node.uid === uid) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByUID(node.children, uid);
        if (found) return found;
      }
    }
    return null;
  };

  // Function to find parent and index by UID
  const findParentNodeAndIndexByUID = (nodes, uid) => {
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        if (node.uid === uid) {
          return { parent: parentNode, index: i, parentList: currentNodes, node: node };
        }
        if (node.children && node.children.length > 0) {
          const result = searchInLevel(node.children, node);
          if (result) return result;
        }
      }
      return null;
    };
    
    const result = searchInLevel(nodes);
    return result || { parent: null, index: -1, parentList: [], node: null };
  };

  // Function to find a node by unique properties (more robust than key-only search)
  const findNodeByProperties = (nodes, targetNode) => {
    for (let node of nodes) {
      if (node.label === targetNode.label && 
          node.icon === targetNode.icon && 
          node.droppable === targetNode.droppable) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByProperties(node.children, targetNode);
        if (found) return found;
      }
    }
    return null;
  };

  // Function to find parent node and index (recursive search)
  const findParentNodeAndIndex = (nodes, key) => {
    // Search recursively through all levels
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        if (node.key === key) {
          return { parent: parentNode, index: i, parentList: currentNodes };
        }
        if (node.children && node.children.length > 0) {
          const result = searchInLevel(node.children, node);
          if (result) return result;
        }
      }
      return null;
    };
    
    const result = searchInLevel(nodes);
    return result || { parent: null, index: -1, parentList: [] };
  };

  // Handle drop to root area
  const handleDropToRoot = (e) => {
    if (!draggedNodeKey) {
      return;
    }

    try {
      const nodesCopy = deepCopy(nodes);
      
      // Find and remove the dragged node from its current position
      const dragNodeInfo = findParentNodeAndIndex(nodesCopy, draggedNodeKey);
      if (dragNodeInfo.index === -1) {
        console.error("❌ Drag node not found for root drop:", draggedNodeKey);
        return;
      }
      
      const dragNode = dragNodeInfo.parentList[dragNodeInfo.index];
      
      // Remove from current position
      dragNodeInfo.parentList.splice(dragNodeInfo.index, 1);
      
      // Add to root level
      nodesCopy.push(dragNode);
      
      // Update nodes with key regeneration
      updateNodesWithKeys(nodesCopy);
      setDraggedNodeKey(null);
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `"${dragNode.label}" movido a la raíz`,
        life: 3000
      });
    } catch (error) {
      console.error("❌ Error in drop to root:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al mover a la raíz: ${error.message}`,
        life: 5000
      });
    }
  };

  // Handle drag and drop with UID preservation
  const onDragDrop = (event) => {
    try {
      const dragNodeKey = event.dragNode.key;
      const dropNodeKey = event.dropNode ? event.dropNode.key : null;

      // Si dropNodeKey es null, es un drop en la raíz
      if (dropNodeKey === null) {
        const nodesCopy = deepCopy(nodes);
        let dragNodeInfo = findParentNodeAndIndex(nodesCopy, dragNodeKey);
        if (dragNodeInfo.index === -1) {
          toast.current.show({severity: 'error', summary: 'Error', detail: 'No se encontró el elemento a mover', life: 3000});
          return;
        }
        const [dragNode] = dragNodeInfo.parentList.splice(dragNodeInfo.index, 1);
        nodesCopy.push(dragNode);
        updateNodesWithKeys(nodesCopy, 'Nodo movido a la raíz');
        return;
      }

      // Lógica normal para drop entre nodos
      const nodesCopy = deepCopy(nodes);
      let dragNodeInfo = findParentNodeAndIndex(nodesCopy, dragNodeKey);
      if (dragNodeInfo.index === -1) {
        const originalDragInfo = findParentNodeAndIndex(nodes, dragNodeKey);
        if (originalDragInfo.index !== -1) {
          const originalNode = originalDragInfo.parentList[originalDragInfo.index];
          if (originalNode.uid) {
            dragNodeInfo = findParentNodeAndIndexByUID(nodesCopy, originalNode.uid);
          }
        }
      }
      if (dragNodeInfo.index === -1) {
        toast.current.show({severity: 'error', summary: 'Error', detail: 'No se encontró el elemento a mover', life: 3000});
        return;
      }
      const dragNode = dragNodeInfo.parentList[dragNodeInfo.index];
      if (!dragNode.uid && dragNode.isUserCreated) {
        dragNode.uid = `node_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      }
      dragNodeInfo.parentList.splice(dragNodeInfo.index, 1);
      let dropNode = findNodeByKey(nodesCopy, dropNodeKey);
      if (!dropNode) {
        const originalDropNode = findNodeByKey(nodes, dropNodeKey);
        if (originalDropNode && originalDropNode.uid) {
          dropNode = findNodeByUID(nodesCopy, originalDropNode.uid);
        }
      }
      if (!dropNode) {
        nodesCopy.push(dragNode);
        updateNodesWithKeys(nodesCopy, 'Nodo movido a la raíz');
        return;
      }
      if (!dropNode.children) {
        dropNode.children = [];
      }
      dropNode.children.push(dragNode);
      updateNodesWithKeys(nodesCopy, 'Nodo movido');
    } catch (error) {
      console.error('Error en drag & drop:', error);
      toast.current.show({severity: 'error', summary: 'Error', detail: `Error en drag & drop: ${error.message}`, life: 5000});
    }
  };
  
  // Generate next key based on parent key (simplified - will be regenerated anyway)
  const generateNextKey = (parentKey) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    
    if (parentKey === null) {
      // Root level - use timestamp for uniqueness
      return `temp_root_${timestamp}_${random}`;
    } else {
      // Child level - use parent key + timestamp for uniqueness
      return `temp_child_${parentKey}_${timestamp}_${random}`;
    }
  };
  
  // Open dialog to create a new folder
  const openNewFolderDialog = (parentKey) => {
    setParentNodeKey(parentKey);
    setFolderName('');
    setShowFolderDialog(true);
  };
  
  // Create a new folder
  const createNewFolder = () => {
    if (!folderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    
    try {
      const newKey = generateNextKey(parentNodeKey);
      
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        // Add unique persistent identifier
        uid: `node_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };
      
      const nodesCopy = deepCopy(nodes);
      
      if (parentNodeKey === null) {
        // Add to root level
        nodesCopy.push(newFolder);
      } else {
        // Add to specific parent
        const parentNode = findNodeByKey(nodesCopy, parentNodeKey);
        
        if (!parentNode) {
          throw new Error(`Parent node with key ${parentNodeKey} not found`);
        }
        
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newFolder);
      }
      
      updateNodesWithKeys(nodesCopy);
      setShowFolderDialog(false);
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Carpeta "${folderName}" creada con keys actualizadas`,
        life: 3000
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear la carpeta',
        life: 3000
      });
    }
  };
  
  // Delete node (folder or file) with multiple search strategies
  const deleteNode = (nodeKey) => {
    try {
      const nodesCopy = deepCopy(nodes);
      
      // Strategy 1: Try finding by key first
      let nodeInfo = findParentNodeAndIndex(nodesCopy, nodeKey);
      
      // Strategy 2: If key search fails, try finding by UID or properties
      if (nodeInfo.index === -1) {
        // First get the original node from current state to extract UID
        const originalNodeInfo = findParentNodeAndIndex(nodes, nodeKey);
        if (originalNodeInfo.index !== -1) {
          const originalNode = originalNodeInfo.parentList[originalNodeInfo.index];
          
          if (originalNode.uid) {
            nodeInfo = findParentNodeAndIndexByUID(nodesCopy, originalNode.uid);
          }
          
          // Strategy 3: If UID also fails, try by properties
          if (nodeInfo.index === -1) {
            const foundNode = findNodeByProperties(nodesCopy, originalNode);
            if (foundNode) {
              nodeInfo = findParentNodeAndIndex(nodesCopy, foundNode.key);
            }
          }
        }
      }
      
      if (nodeInfo.index === -1) {
        console.error("❌ Node not found with any strategy:", nodeKey);
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: `No se encontró el elemento para eliminar. Key: ${nodeKey}`,
          life: 5000
        });
        return;
      }
      
      // Get node before deletion
      const nodeToDelete = nodeInfo.parentList[nodeInfo.index];
      const nodeName = nodeToDelete.label;
      
      // Remove the node from its parent
      nodeInfo.parentList.splice(nodeInfo.index, 1);
      
      // Update the state with automatic key regeneration
      updateNodesWithKeys(nodesCopy);
      
      // If the deleted node was selected, clear selection
      if (selectedNodeKey && Object.keys(selectedNodeKey)[0] === nodeKey) {
        setSelectedNodeKey(null);
      }
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `"${nodeName}" eliminado correctamente`,
        life: 3000
      });
    } catch (error) {
      console.error("❌ Error deleting node:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al eliminar: ${error.message}`,
        life: 5000
      });
    }
  };
  
  // Confirm node deletion
  const confirmDeleteNode = (nodeKey, nodeName, hasChildren) => {
    const message = hasChildren
      ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeName}" y todo su contenido?`
      : `¿Estás seguro de que deseas eliminar "${nodeName}"?`;
    
    confirmDialog({
      message: message,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteNode(nodeKey),
      reject: () => {}
    });
  };
  
  // Node context menu
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const hasChildren = isFolder && node.children && node.children.length > 0;
    const isSSH = node.data && node.data.type === 'ssh';
    let iconClass = '';
    if (isSSH) {
      iconClass = 'pi pi-desktop';
    } else if (isFolder) {
      iconClass = options.expanded ? 'pi pi-folder-open' : 'pi pi-folder';
    }
    return (
      <div className="flex align-items-center gap-2"
        onContextMenu={(e) => onNodeContextMenu(e, node)}
        onDoubleClick={isSSH ? (e) => {
          e.stopPropagation();
          setSshTabs(prevTabs => {
            const tabId = `${node.key}_${Date.now()}`;
            const sshConfig = {
              host: node.data.host,
              username: node.data.user,
              password: node.data.password,
            };
            const newTab = {
              key: tabId,
              label: `${node.label} (${prevTabs.filter(t => t.originalKey === node.key).length + 1})`,
              originalKey: node.key,
              sshConfig: sshConfig,
              type: 'terminal'
            };
            const newTabs = [newTab, ...prevTabs];
            setActiveTabIndex(0);
            return newTabs;
          });
        } : undefined}
      >
        <span className={iconClass} style={{ minWidth: 20 }}></span>
        <span className="node-label">{node.label}</span>
        <div className="ml-auto flex">
          {isSSH && (
            <>
              <Button
                icon="pi pi-folder-open"
                rounded
                text
                size="small"
                className="node-action-button"
                onClick={e => {
                  e.stopPropagation();
                  openFileExplorer(node);
                }}
                tooltip="Explorador de archivos"
                tooltipOptions={{ position: 'top' }}
              />
              <Button
                icon="pi pi-pencil"
                rounded
                text
                size="small"
                className="node-action-button"
                onClick={e => {
                  e.stopPropagation();
                  openEditSSHDialog(node);
                }}
                tooltip="Editar sesión SSH"
                tooltipOptions={{ position: 'top' }}
              />
            </>
          )}
          {isFolder && (
            <>
              <Button
                icon="pi pi-pencil"
                rounded
                text
                size="small"
                className="node-action-button"
                onClick={e => {
                  e.stopPropagation();
                  openEditFolderDialog(node);
                }}
                tooltip="Editar carpeta"
                tooltipOptions={{ position: 'top' }}
              />
              <Button 
                icon="pi pi-plus" 
                rounded 
                text 
                size="small" 
                className="node-action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  openNewFolderDialog(node.key);
                }}
                tooltip="Crear carpeta"
                tooltipOptions={{ position: 'top' }}
              />
            </>
          )}
          <Button 
            icon="pi pi-trash" 
            rounded 
            text 
            severity="danger" 
            size="small" 
            className="node-action-button ml-1"
            onClick={(e) => {
              e.stopPropagation();
              confirmDeleteNode(node.key, node.label, hasChildren);
            }}
            tooltip="Eliminar"
            tooltipOptions={{ position: 'top' }}
          />
        </div>
      </div>
    );
  };

  // Context menu for nodes
  const onNodeContextMenu = (event, node) => {
    event.preventDefault();
    // Aquí podrías mostrar un menú contextual (se implementará después)
  };

  // Función recursiva para obtener todas las carpetas del árbol
  const getAllFolders = (nodes, prefix = '') => {
    let folders = [];
    for (const node of nodes) {
      if (node.droppable) {
        folders.push({ label: prefix + node.label, value: node.key });
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFolders(node.children, prefix + node.label + ' / '));
        }
      }
    }
    return folders;
  };

  // Función para crear una nueva conexión SSH
  const createNewSSH = () => {
    if (!sshName.trim() || !sshHost.trim() || !sshUser.trim() || !sshPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios',
        life: 3000
      });
      return;
    }
    const newKey = generateNextKey(sshTargetFolder);
    const newSSHNode = {
      key: newKey,
      label: sshName.trim(),
      data: {
        host: sshHost.trim(),
        user: sshUser.trim(),
        password: sshPassword.trim(),
        remoteFolder: sshRemoteFolder.trim(),
        type: 'ssh'
      },
      draggable: true,
      uid: `ssh_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    const nodesCopy = deepCopy(nodes);
    if (sshTargetFolder) {
      const parentNode = findNodeByKey(nodesCopy, sshTargetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newSSHNode);
      } else {
        nodesCopy.push(newSSHNode);
      }
    } else {
      nodesCopy.push(newSSHNode);
    }
    updateNodesWithKeys(nodesCopy);
    setShowSSHDialog(false);
    setSSHName(''); setSSHHost(''); setSSHUser(''); setSSHTargetFolder(null); setSSHPassword(''); setSSHRemoteFolder('');
    toast.current.show({
      severity: 'success',
      summary: 'SSH añadida',
      detail: `Conexión SSH "${sshName}" añadida al árbol`,
      life: 3000
    });
  };

  // Función para abrir el diálogo de edición SSH
  const openEditSSHDialog = (node) => {
    setEditSSHNode(node);
    setEditSSHName(node.label);
    setEditSSHHost(node.data?.host || '');
    setEditSSHUser(node.data?.user || '');
    setEditSSHPassword(node.data?.password || '');
    setEditSSHRemoteFolder(node.data?.remoteFolder || '');
    setShowEditSSHDialog(true);
  };

  // Función para guardar la edición SSH
  const saveEditSSH = () => {
    if (!editSSHName.trim() || !editSSHHost.trim() || !editSSHUser.trim() || !editSSHPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios excepto la carpeta remota',
        life: 3000
      });
      return;
    }
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editSSHNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editSSHName.trim();
      nodeToEdit.data = { 
        ...nodeToEdit.data, 
        host: editSSHHost.trim(), 
        user: editSSHUser.trim(),
        password: editSSHPassword.trim(),
        remoteFolder: editSSHRemoteFolder.trim(),
        type: 'ssh'
      };
    }
    updateNodesWithKeys(nodesCopy);
    setShowEditSSHDialog(false);
    setEditSSHNode(null);
    setEditSSHName(''); 
    setEditSSHHost(''); 
    setEditSSHUser('');
    setEditSSHPassword('');
    setEditSSHRemoteFolder('');
    toast.current.show({
      severity: 'success',
      summary: 'SSH editada',
      detail: `Sesión SSH actualizada`,
      life: 3000
    });
  };

  // Función para abrir el diálogo de edición de carpeta
  const openEditFolderDialog = (node) => {
    setEditFolderNode(node);
    setEditFolderName(node.label);
    setShowEditFolderDialog(true);
  };

  // Función para guardar la edición de la carpeta
  const saveEditFolder = () => {
    if (!editFolderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de la carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editFolderNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editFolderName.trim();
    }
    updateNodesWithKeys(nodesCopy);
    setShowEditFolderDialog(false);
    setEditFolderNode(null);
    setEditFolderName('');
    toast.current.show({
      severity: 'success',
      summary: 'Carpeta editada',
      detail: `Nombre actualizado`,
      life: 3000
    });
  };

  useEffect(() => {
    // Cuando cambiamos de pestaña, la terminal necesita recalcular su tamaño
    // para ajustarse al contenedor que ahora es visible.
    const resizeTimer = setTimeout(() => {
      handleResize();
    }, 50); // Un pequeño retardo para asegurar que el DOM está listo
  
    return () => {
      clearTimeout(resizeTimer);
    };
  }, [activeTabIndex, sshTabs]); // Se ejecuta cuando cambia la pestaña activa o la lista de pestañas

  const handleResize = () => {
    const activeTabKey = sshTabs[activeTabIndex]?.key;
    if (activeTabKey && terminalRefs.current[activeTabKey]) {
      terminalRefs.current[activeTabKey].fit();
    }
  };

  // Función para abrir explorador de archivos SSH
  const openFileExplorer = (sshNode) => {
    // Buscar si ya existe un explorador para este host+usuario
    const existingExplorerIndex = sshTabs.findIndex(tab => 
      tab.isExplorerInSSH && 
      tab.sshConfig.host === sshNode.data.host && 
      tab.sshConfig.username === sshNode.data.user
    );
    
    if (existingExplorerIndex !== -1) {
      // Activar la pestaña existente del explorador
      setActiveTabIndex(existingExplorerIndex);
      return;
    }
    
    // Crear el explorador SIN conexión SSH propia - reutilizará conexiones existentes del pool
    const explorerTabId = `explorer_${sshNode.key}_${Date.now()}`;
    const sshConfig = {
      host: sshNode.data.host,
      username: sshNode.data.user,
      password: sshNode.data.password,
      port: sshNode.data.port || 22
    };
    
    // NO crear conexión SSH nueva - el FileExplorer usará el pool existente
    const newExplorerTab = {
      key: explorerTabId,
      label: `📁 ${sshNode.label}`,
      originalKey: sshNode.key,
      sshConfig: sshConfig,
      type: 'explorer',
      needsOwnConnection: false, // Cambio importante: NO necesita su propia conexión
      isExplorerInSSH: true // Flag para identificarla como explorador en el array SSH
    };
    
    // Insertar como primera pestaña
    setSshTabs(prevSshTabs => {
      const newSshTabs = [newExplorerTab, ...prevSshTabs];
      setActiveTabIndex(0);
      return newSshTabs;
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Splitter style={{ height: '100%' }} onResizeEnd={handleResize}>
          <SplitterPanel size={25} minSize={20}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
                <div>
                  <Button
                    icon="pi pi-plus"
                    className="p-button-rounded p-button-text sidebar-action-button"
                    onClick={() => openNewFolderDialog(null)}
                    tooltip="Crear carpeta"
                    tooltipOptions={{ position: 'bottom' }}
                  />
                  <Button
                    icon="pi pi-server"
                    className="p-button-rounded p-button-text sidebar-action-button"
                    onClick={() => setShowSSHDialog(true)}
                    tooltip="Nueva conexión SSH"
                    tooltipOptions={{ position: 'bottom' }}
                  />
                </div>
                <div>
                  <Button
                    icon="pi pi-cog"
                    className="p-button-rounded p-button-text sidebar-action-button"
                    onClick={() => setShowConfigDialog(true)}
                    tooltip="Configuración"
                    tooltipOptions={{ position: 'bottom' }}
                  />
                </div>
              </div>
              <Divider className="my-2" />
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                <Tree
                  value={nodes}
                  selectionMode="single"
                  selectionKeys={selectedNodeKey}
                  onSelectionChange={e => setSelectedNodeKey(e.value)}
                  dragdropScope="files"
                  onDragDrop={onDragDrop}
                  onDragStart={e => {
                    if (e.node) {
                      setDraggedNodeKey(e.node.key);
                    }
                  }}
                  onDragEnd={() => {}}
                  className="sidebar-tree"
                  nodeTemplate={nodeTemplate}
                  filter
                  filterMode="strict"
                  filterPlaceholder="Buscar..."
                />
              </div>
            </div>
          </SplitterPanel>
          
          <SplitterPanel size={75} style={{ display: 'flex', flexDirection: 'column' }}>
            {(sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <TabView 
                    activeIndex={activeTabIndex} 
                    onTabChange={(e) => {
                      setActiveTabIndex(e.index);
                    }}
                    renderActiveOnly={false}
                    scrollable={false}
                    className={getAllTabs().length > MAX_VISIBLE_TABS ? 'has-overflow' : ''}
                  >
                  {getVisibleTabs().map((tab, idx) => {
                    // Con las pestañas híbridas, todas las pestañas visibles están en el contexto SSH o explorer
                    const isSSHTab = idx < sshTabs.length || tab.isExplorerInSSH;
                    const originalIdx = isSSHTab ? idx : idx - sshTabs.length;
                    
                    return (
                      <TabPanel 
                        key={tab.key} 
                        header={tab.label}
                        headerTemplate={(options) => {
                          const { className, onClick, onKeyDown, leftIcon, rightIcon, style, selected } = options;
                          const isDragging = draggedTabIndex === idx;
                          const isDragOver = dragOverTabIndex === idx;
                          
                          return (
                            <div
                              className={`${className} ${isDragging ? 'tab-dragging' : ''} ${isDragOver ? 'tab-drop-zone' : ''}`}
                              style={{ 
                                ...style, 
                                display: 'flex', 
                                alignItems: 'center', 
                                maxWidth: 220,
                                opacity: isDragging ? 0.5 : 1,
                                borderLeft: isDragOver ? '3px solid var(--primary-color)' : 'none',
                                transition: 'opacity 0.2s, border-left 0.2s',
                                cursor: isDragging ? 'grabbing' : 'grab'
                              }}
                              onClick={(e) => {
                                // Prevenir click si está en proceso de drag o hay un timer activo
                                if (draggedTabIndex !== null || dragStartTimer !== null) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }
                                onClick(e);
                              }}
                              onKeyDown={onKeyDown}
                              tabIndex={0}
                              aria-selected={selected}
                              role="tab"
                              draggable="true"
                              onDragStart={(e) => handleTabDragStart(e, idx)}
                              onDragOver={(e) => handleTabDragOver(e, idx)}
                              onDragLeave={handleTabDragLeave}
                              onDrop={(e) => handleTabDrop(e, idx)}
                              onDragEnd={handleTabDragEnd}
                              title="Arrastra para reordenar pestañas"
                            >
                              {leftIcon}
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
                              <Button
                                icon="pi pi-times"
                                className="p-button-rounded p-button-text p-button-sm ml-2"
                                style={{ marginLeft: 8, minWidth: 18, minHeight: 18 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  // Cierre robusto de pestaña
                                  const closedTab = tab;
                                  
                                  if (isSSHTab) {
                                    // Solo enviar ssh:disconnect para pestañas de terminal o exploradores que tengan su propia conexión
                                    if (!closedTab.isExplorerInSSH && window.electron && window.electron.ipcRenderer) {
                                      // Terminal SSH - siempre desconectar
                                      window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
                                    } else if (closedTab.isExplorerInSSH && closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
                                      // Explorador con conexión propia - desconectar
                                      window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
                                    }
                                    // Los exploradores que usan el pool NO necesitan desconectarse
                                    const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
                                    if (!closedTab.isExplorerInSSH) {
                                      delete terminalRefs.current[closedTab.key];
                                    }
                                    setSshTabs(newSshTabs);
                                  } else {
                                    if (closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
                                      window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
                                    }
                                    const newExplorerTabs = fileExplorerTabs.filter(t => t.key !== closedTab.key);
                                    setFileExplorerTabs(newExplorerTabs);
                                  }
                                  
                                  // Ajustar índice activo
                                  if (activeTabIndex === idx) {
                                    setActiveTabIndex(Math.max(0, idx - 1));
                                  } else if (activeTabIndex > idx) {
                                    setActiveTabIndex(activeTabIndex - 1);
                                  }
                                }}
                                tooltip="Cerrar pestaña"
                                tooltipOptions={{ position: 'top' }}
                              />
                              {rightIcon}
                            </div>
                          );
                        }}
                      />
                    );
                  })}
                </TabView>
                <Button
                  icon="pi pi-ellipsis-v"
                  className="overflow-tab-btn p-button-outlined p-button-sm"
                  onClick={(e) => overflowMenuRef.current?.toggle(e)}
                  tooltip={getAllTabs().length > MAX_VISIBLE_TABS ? `Ver ${getAllTabs().length - MAX_VISIBLE_TABS} pestañas más` : 'Menú de pestañas'}
                  tooltipOptions={{ position: 'left' }}
                  disabled={getAllTabs().length === 0}
                />
                <Menu
                  ref={overflowMenuRef}
                  model={generateOverflowMenuItems()}
                  popup
                />
                <Menu
                  ref={terminalContextMenuRef}
                  model={getTerminalContextMenuItems()}
                  popup
                />
              </div>
                              <div style={{ flexGrow: 1, position: 'relative' }}>
                  {sshTabs.map((tab, index) => (
                    <div 
                      key={tab.key} 
                      style={{ 
                        display: activeTabIndex === index ? 'flex' : 'none',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      {tab.isExplorerInSSH ? (
                        <FileExplorer
                          sshConfig={tab.sshConfig}
                          tabId={tab.key}
                        />
                      ) : (
                        <TerminalComponent
                          ref={el => terminalRefs.current[tab.key] = el}
                          tabId={tab.key}
                          sshConfig={tab.sshConfig}
                          fontFamily={fontFamily}
                          fontSize={fontSize}
                          theme={terminalTheme.theme}
                          onContextMenu={handleTerminalContextMenu}
                        />
                      )}
                    </div>
                  ))}
                  {fileExplorerTabs.map((tab, index) => {
                    const tabIndex = sshTabs.length + index;
                    return (
                      <div 
                        key={tab.key} 
                        style={{ 
                          display: activeTabIndex === tabIndex ? 'flex' : 'none',
                          flexDirection: 'column',
                          height: '100%',
                          width: '100%',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      >
                        <FileExplorer
                          sshConfig={tab.sshConfig}
                          tabId={tab.key}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card title="Contenido Principal" style={{ flex: 1 }}>
                <p className="m-0">
                  Bienvenido a la aplicación de escritorio. Seleccione un archivo del panel lateral para ver su contenido.
                </p>
                {selectedNodeKey && (
                  <div className="mt-3">
                    <p>Elemento seleccionado: {Object.keys(selectedNodeKey)[0]}</p>
                  </div>
                )}
                <div className="mt-3">
                  <p>Puedes arrastrar y soltar elementos en el panel lateral para reorganizarlos.</p>
                  <p>Haz clic en el botón "+" para crear carpetas nuevas.</p>
                  <p>Para eliminar un elemento, haz clic en el botón de la papelera que aparece al pasar el ratón.</p>
                </div>
              </Card>
            )}
          </SplitterPanel>
        </Splitter>
      </div>
      
      <Dialog 
        header="Crear Nueva Carpeta" 
        visible={showFolderDialog} 
        style={{ width: '30rem' }}
        onHide={() => setShowFolderDialog(false)}
        footer={(
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowFolderDialog(false)} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewFolder} autoFocus />
          </div>
        )}
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="folderName">Nombre de la carpeta</label>
            <InputText
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNewFolder();
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Nueva sesión SSH"
        visible={showSSHDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowSSHDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowSSHDialog(false)} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewSSH} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="sshName">Nombre</label>
            <InputText id="sshName" value={sshName} onChange={e => setSSHName(e.target.value)} autoFocus />
          </div>
          <div className="p-field">
            <label htmlFor="sshHost">Host</label>
            <InputText id="sshHost" value={sshHost} onChange={e => setSSHHost(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="sshUser">Usuario</label>
            <InputText id="sshUser" value={sshUser} onChange={e => setSSHUser(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="sshPassword">Contraseña</label>
            <InputText id="sshPassword" type="password" value={sshPassword} onChange={e => setSSHPassword(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="sshRemoteFolder">Carpeta remota</label>
            <InputText id="sshRemoteFolder" value={sshRemoteFolder} onChange={e => setSSHRemoteFolder(e.target.value)} placeholder="/home/usuario" />
          </div>
          <div className="p-field">
            <label htmlFor="sshTargetFolder">Carpeta destino</label>
            <Dropdown id="sshTargetFolder" value={sshTargetFolder} options={getAllFolders(nodes)} onChange={e => setSSHTargetFolder(e.value)} placeholder="Selecciona una carpeta (opcional)" showClear filter />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Editar sesión SSH"
        visible={showEditSSHDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowEditSSHDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowEditSSHDialog(false)} className="p-button-text" />
            <Button label="Guardar" icon="pi pi-check" onClick={saveEditSSH} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="editSSHName">Nombre</label>
            <InputText id="editSSHName" value={editSSHName} onChange={e => setEditSSHName(e.target.value)} autoFocus />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHHost">Host</label>
            <InputText id="editSSHHost" value={editSSHHost} onChange={e => setEditSSHHost(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHUser">Usuario</label>
            <InputText id="editSSHUser" value={editSSHUser} onChange={e => setEditSSHUser(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHPassword">Contraseña</label>
            <InputText id="editSSHPassword" type="password" value={editSSHPassword} onChange={e => setEditSSHPassword(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHRemoteFolder">Carpeta remota</label>
            <InputText id="editSSHRemoteFolder" value={editSSHRemoteFolder} onChange={e => setEditSSHRemoteFolder(e.target.value)} placeholder="/home/usuario" />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Configuración de la aplicación"
        visible={showConfigDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowConfigDialog(false)}
        footer={
          <div>
            <Button label="Cerrar" icon="pi pi-times" onClick={() => setShowConfigDialog(false)} className="p-button-text" />
          </div>
        }
      >
        <div className="card p-fluid">
            <h5>Configuración del Terminal</h5>

            <div className="field">
                <label htmlFor="font-family">Fuente</label>
                <Dropdown id="font-family" value={fontFamily} options={availableFonts} onChange={(e) => setFontFamily(e.value)} placeholder="Selecciona una fuente" />
            </div>
            <div className="field">
                <label htmlFor="font-size">Tamaño de Fuente</label>
                <InputNumber id="font-size" value={fontSize} onValueChange={(e) => setFontSize(e.value)} showButtons />
            </div>
            <div className="field">
                <label htmlFor="terminal-theme">Tema</label>
                <Dropdown id="terminal-theme" value={terminalTheme.name} options={availableThemes} onChange={(e) => setTerminalTheme(themes[e.value])} placeholder="Selecciona un tema" />
            </div>
        </div>
      </Dialog>

      <Dialog
        header="Editar carpeta"
        visible={showEditFolderDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowEditFolderDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowEditFolderDialog(false)} className="p-button-text" />
            <Button label="Guardar" icon="pi pi-check" onClick={saveEditFolder} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="editFolderName">Nombre de la carpeta</label>
            <InputText id="editFolderName" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} autoFocus />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default App; 