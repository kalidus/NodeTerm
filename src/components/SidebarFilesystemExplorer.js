import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { uiThemes } from '../themes/ui-themes';
import mcpClient from '../services/MCPClientService';
import SidebarFooter from './SidebarFooter';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { sessionActionIconThemes } from '../themes/session-action-icons';

const DEFAULT_MOVE_PARAMS = { source: 'source', destination: 'destination' };
const DEFAULT_CREATE_PARAM = 'path';
const DEFAULT_READ_PARAM = 'path';
const DEFAULT_WRITE_PARAMS = { path: 'path', content: 'content' };

const SidebarFilesystemExplorer = ({
  status,
  onBackToConnections,
  sidebarCollapsed,
  setSidebarCollapsed,
  explorerFont,
  explorerFontSize,
  uiTheme = 'Light',
  showToast,
  sessionActionIconTheme = 'modern',
  initialPath = null,
  onPathNavigated = null
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('common');
  
  const detail = status || {};
  const allowedPaths = Array.isArray(detail.allowedPaths) ? detail.allowedPaths : [];
  const server = detail.server || {};
  const theme = uiThemes[uiTheme] || uiThemes['Light'];
  const colors = theme?.colors || {};

  const [nodes, setNodes] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [loadingPaths, setLoadingPaths] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [moveParams, setMoveParams] = useState(DEFAULT_MOVE_PARAMS);
  const [createParam, setCreateParam] = useState(DEFAULT_CREATE_PARAM);
  const [readParam, setReadParam] = useState(DEFAULT_READ_PARAM);
  const [writeParams, setWriteParams] = useState(DEFAULT_WRITE_PARAMS);
  const [contextItems, setContextItems] = useState([]);
  const contextMenuRef = useRef(null);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [pendingBaseDir, setPendingBaseDir] = useState(null);

  const notify = useCallback((severity, summary, detailMessage) => {
    if (showToast) {
      showToast({ severity, summary, detail: detailMessage, life: 4000 });
    } else {
      console[severity === 'error' ? 'error' : 'log']('[FilesystemExplorer]', summary, detailMessage);
    }
  }, [showToast]);

  const panelBorder = colors?.contentBorder || 'rgba(255,255,255,0.08)';
  const textPrimary = colors?.sidebarText || '#e5ecff';
  const headerButtonStyle = useMemo(() => ({
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40
  }), []);

  const FILE_ICON_MAP = useMemo(() => ({
    pdf: { icon: 'pi pi-file-pdf', color: '#ff6b6b' },
    doc: { icon: 'pi pi-file-word', color: '#4e8ef7' },
    docx: { icon: 'pi pi-file-word', color: '#4e8ef7' },
    xls: { icon: 'pi pi-file-excel', color: '#43a047' },
    xlsx: { icon: 'pi pi-file-excel', color: '#43a047' },
    csv: { icon: 'pi pi-file-excel', color: '#43a047' },
    ppt: { icon: 'pi pi-file', color: '#ff9800' },
    pptx: { icon: 'pi pi-file', color: '#ff9800' },
    txt: { icon: 'pi pi-file', color: '#bdbdbd' },
    md: { icon: 'pi pi-file', color: '#bdbdbd' },
    json: { icon: 'pi pi-code', color: '#81d4fa' },
    js: { icon: 'pi pi-code', color: '#ffd54f' },
    ts: { icon: 'pi pi-code', color: '#29b6f6' },
    jsx: { icon: 'pi pi-code', color: '#29b6f6' },
    tsx: { icon: 'pi pi-code', color: '#29b6f6' },
    html: { icon: 'pi pi-html5', color: '#ff7043' },
    css: { icon: 'pi pi-palette', color: '#7e57c2' },
    exe: { icon: 'pi pi-microsoft', color: '#90caf9' },
    dmg: { icon: 'pi pi-apple', color: '#9fa8da' },
    gz: { icon: 'pi pi-file-zip', color: '#ffd54f' },
    zip: { icon: 'pi pi-file-zip', color: '#ffd54f' },
    rar: { icon: 'pi pi-file-zip', color: '#ffd54f' },
    tar: { icon: 'pi pi-file-zip', color: '#ffd54f' },
    png: { icon: 'pi pi-image', color: '#ffb74d' },
    jpg: { icon: 'pi pi-image', color: '#ffb74d' },
    jpeg: { icon: 'pi pi-image', color: '#ffb74d' },
    gif: { icon: 'pi pi-image', color: '#ffb74d' }
  }), []);

  const makeKey = useCallback((path) => `fs|${path || 'root'}`, []);

  const inferSeparator = useCallback((basePath) => {
    if (!basePath) return '/';
    if (basePath.includes('\\') && !basePath.includes('/')) return '\\';
    return '/';
  }, []);

  const joinPath = useCallback((basePath, name) => {
    if (!basePath) return name;
    const sep = inferSeparator(basePath);
    if (basePath === sep) {
      return `${sep}${name}`;
    }
    if (sep === '\\') {
      return basePath.endsWith('\\') ? `${basePath}${name}` : `${basePath}\\${name}`;
    }
    return basePath.endsWith('/') ? `${basePath}${name}` : `${basePath}/${name}`;
  }, [inferSeparator]);

  const basename = useCallback((fullPath) => {
    if (!fullPath) return '';
    if (fullPath === '/' || fullPath === '\\') return fullPath;
    const sep = inferSeparator(fullPath);
    const trimmed = fullPath.endsWith(sep) ? fullPath.slice(0, -1) : fullPath;
    const parts = trimmed.split(sep);
    return parts[parts.length - 1] || trimmed;
  }, [inferSeparator]);

  const sortEntries = useCallback((entries) => {
    return [...entries].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return a.type === 'directory' ? -1 : 1;
    });
  }, []);

  const parseListDirectoryResult = useCallback((raw) => {
    if (!raw) return [];
    if (Array.isArray(raw.entries)) return raw.entries;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.content)) {
      const text = raw.content.map(item => item?.text || '').join('\n');
      raw = text;
    }
    if (typeof raw === 'object' && typeof raw.text === 'string') {
      raw = raw.text;
    }
    if (typeof raw === 'string') {
      const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      return lines.map((line) => {
        const match = line.match(/^\[(FILE|DIR)\]\s*(.+?)\s*(?:\(([^)]+)\))?$/i);
        if (match) {
          const [, kind, name, extra] = match;
          const entry = { name: name.trim(), type: kind.toUpperCase() === 'DIR' ? 'directory' : 'file' };
          if (extra && /\d/.test(extra)) {
            entry.size = extra;
          }
          return entry;
        }
        const dirMatch = line.match(/^DIR\s+(.+)$/i);
        if (dirMatch) return { name: dirMatch[1].trim(), type: 'directory' };
        const fileMatch = line.match(/^FILE\s+(.+)$/i);
        if (fileMatch) return { name: fileMatch[1].trim(), type: 'file' };
        return { name: line, type: line.endsWith('/') ? 'directory' : 'file' };
      });
    }
    return [];
  }, []);

  const toTreeNode = useCallback((entry, parentPath) => {
    const fullPath = joinPath(parentPath, entry.name);
    const isDir = (entry.type || '').toLowerCase() === 'directory';
    const extension = !isDir && entry.name.includes('.')
      ? entry.name.split('.').pop().toLowerCase()
      : null;
    const iconInfo = !isDir && extension ? FILE_ICON_MAP[extension] : null;
    return {
      key: makeKey(fullPath),
      label: entry.name,
      data: {
        path: fullPath,
        type: isDir ? 'directory' : 'file',
        parentPath,
        raw: entry
      },
      icon: isDir ? 'pi pi-folder' : (iconInfo?.icon || 'pi pi-file'),
      style: iconInfo?.color ? { '--fs-node-color': iconInfo.color } : undefined,
      leaf: !isDir,
      droppable: isDir,
      children: isDir ? [] : undefined
    };
  }, [FILE_ICON_MAP, joinPath, makeKey]);

  const updateNodeChildren = useCallback((tree, targetPath, childrenNodes) => {
    return tree.map(node => {
      if (node?.data?.path === targetPath) {
        return {
          ...node,
          children: childrenNodes,
          leaf: childrenNodes.length === 0
        };
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeChildren(node.children, targetPath, childrenNodes)
        };
      }
      return node;
    });
  }, []);

  const findNodeByKey = useCallback((tree, key) => {
    for (const node of tree) {
      if (node.key === key) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const refreshToolsMetadata = useCallback(() => {
    const tools = mcpClient?.getToolsByServer ? mcpClient.getToolsByServer('filesystem') || [] : [];
    const moveTool = tools.find(tool => tool.name === 'move_file');
    if (moveTool?.inputSchema?.properties) {
      const keys = Object.keys(moveTool.inputSchema.properties);
      if (keys.length >= 2) {
        setMoveParams({ source: keys[0], destination: keys[1] });
      }
    }
    const createTool = tools.find(tool => tool.name === 'create_directory');
    if (createTool?.inputSchema?.properties) {
      const keys = Object.keys(createTool.inputSchema.properties);
      if (keys.length > 0) setCreateParam(keys[0]);
    }
    const readTool = tools.find(tool => tool.name === 'read_file');
    if (readTool?.inputSchema?.properties) {
      const keys = Object.keys(readTool.inputSchema.properties);
      if (keys.length > 0) setReadParam(keys[0]);
    }
    const writeTool = tools.find(tool => tool.name === 'write_file');
    if (writeTool?.inputSchema?.properties) {
      const keys = Object.keys(writeTool.inputSchema.properties);
      if (keys.length >= 2) {
        setWriteParams({ path: keys[0], content: keys[1] });
      }
    }
  }, []);

  useEffect(() => {
    refreshToolsMetadata();
  }, [refreshToolsMetadata]);

  useEffect(() => {
    if (!Array.isArray(allowedPaths) || allowedPaths.length === 0) {
      setNodes([]);
      setExpandedKeys({});
      setSelectedKey(null);
      return;
    }
    const rootNodes = allowedPaths.map((path, index) => {
      const displayName = basename(path) || `Root ${index + 1}`;
      return {
        key: makeKey(path),
        label: displayName,
        data: {
          path,
          type: 'directory',
          parentPath: null,
          isRoot: true
        },
        icon: 'pi pi-hdd',
        droppable: true,
        leaf: false,
        children: []
      };
    });
    setNodes(rootNodes);
    const defaultExpanded = rootNodes.reduce((acc, node) => {
      acc[node.key] = true;
      return acc;
    }, {});
    setExpandedKeys(defaultExpanded);
  }, [allowedPaths, basename, makeKey]);

  // Navegar automáticamente al path inicial si se proporciona
  useEffect(() => {
    if (!initialPath || !loadDirectory) return;
    
    const navigateToInitialPath = async () => {
      try {
        // Normalizar el path (convertir Windows \ a / si es necesario)
        let normalizedPath = initialPath.replace(/\\/g, '/');
        
        // Si el path no está en allowedPaths, intentar añadirlo temporalmente
        // o al menos intentar navegar directamente
        const pathExists = allowedPaths.some(allowed => {
          const normalizedAllowed = allowed.replace(/\\/g, '/');
          return normalizedPath.startsWith(normalizedAllowed) || normalizedAllowed.startsWith(normalizedPath);
        });
        
        if (!pathExists && allowedPaths.length > 0) {
          // Si no está en allowedPaths pero hay rutas permitidas, usar la primera como base
          // y navegar desde ahí
          const basePath = allowedPaths[0];
          notify('info', 'Navegando', `Navegando a ${normalizedPath}`);
        }
        
        // Expandir y cargar el directorio
        await loadDirectory(normalizedPath, { keepExpanded: true });
        
        // Seleccionar el nodo
        const pathKey = makeKey(normalizedPath);
        setSelectedKey(pathKey);
        
        // Expandir todos los directorios padre
        const pathParts = normalizedPath.split('/').filter(p => p);
        let currentPath = '';
        const keysToExpand = {};
        
        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
          const key = makeKey(currentPath);
          keysToExpand[key] = true;
          
          // Cargar cada directorio padre si no está cargado
          if (currentPath !== normalizedPath) {
            await loadDirectory(currentPath, { keepExpanded: true });
          }
        }
        
        setExpandedKeys(prev => ({ ...prev, ...keysToExpand }));
        
        // Limpiar el path inicial después de navegar
        if (onPathNavigated) {
          onPathNavigated();
        }
      } catch (error) {
        console.error('Error navegando al path inicial:', error);
        notify('error', 'Error', `No se pudo navegar a ${initialPath}: ${error.message}`);
        if (onPathNavigated) {
          onPathNavigated();
        }
      }
    };
    
    // Esperar un poco para asegurar que los nodos iniciales estén cargados
    const timeoutId = setTimeout(() => {
      navigateToInitialPath();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [initialPath, loadDirectory, makeKey, notify, onPathNavigated, allowedPaths]);

  const setLoadingForPath = useCallback((path, value) => {
    setLoadingPaths(prev => {
      if (prev[path] === value) return prev;
      return { ...prev, [path]: value };
    });
  }, []);

  const loadDirectory = useCallback(async (path, { keepExpanded = false } = {}) => {
    if (!path) return;
    try {
      setLoadingForPath(path, true);
      const result = await mcpClient.callTool('filesystem', 'list_directory', { path });
      const entries = sortEntries(parseListDirectoryResult(result || {}));
      const children = entries.map(entry => toTreeNode(entry, path));
      setNodes(prev => updateNodeChildren(prev, path, children));
      setExpandedKeys(prev => {
        const key = makeKey(path);
        if (keepExpanded) {
          return { ...prev, [key]: true };
        }
        return { ...prev, [key]: true };
      });
    } catch (error) {
      notify('error', 'Error al listar', error?.message || 'No se pudo listar el directorio');
    } finally {
      setLoadingForPath(path, false);
    }
  }, [makeKey, notify, parseListDirectoryResult, setLoadingForPath, sortEntries, toTreeNode, updateNodeChildren]);

  const handleToggle = useCallback((event) => {
    const newExpanded = event.value || {};
    const prevExpanded = expandedKeys || {};
    Object.keys(newExpanded).forEach(key => {
      if (newExpanded[key] && !prevExpanded[key]) {
        const node = findNodeByKey(nodes, key);
        if (node?.data?.type === 'directory') {
          loadDirectory(node.data.path, { keepExpanded: true });
        }
      }
    });
    setExpandedKeys(newExpanded);
  }, [expandedKeys, findNodeByKey, loadDirectory, nodes]);

  const handleRefreshNode = useCallback((node) => {
    const targetNode = node || (selectedKey ? findNodeByKey(nodes, selectedKey) : null);
    if (!targetNode || targetNode.data?.type !== 'directory') return;
    loadDirectory(targetNode.data.path, { keepExpanded: true });
  }, [findNodeByKey, loadDirectory, nodes, selectedKey]);

  const openCreateFolderDialog = useCallback(() => {
    const selectedNode = selectedKey ? findNodeByKey(nodes, selectedKey) : null;
    let baseDir = null;
    if (selectedNode) {
      baseDir = selectedNode.data?.type === 'directory'
        ? selectedNode.data.path
        : selectedNode.data?.parentPath;
    }
    if (!baseDir) {
      baseDir = detail.defaultPath || allowedPaths[0] || null;
    }
    if (!baseDir) {
      notify('warn', 'Selecciona una carpeta', 'Elige una carpeta para crear el nuevo directorio.');
      return;
    }
    setPendingBaseDir(baseDir);
    setNewFolderName('');
    setCreateDialogVisible(true);
  }, [allowedPaths, detail.defaultPath, findNodeByKey, nodes, notify, selectedKey]);

  const handleCreateFolder = useCallback(async () => {
    const baseDir = pendingBaseDir;
    if (!baseDir) {
      setCreateDialogVisible(false);
      return;
    }
    if (!newFolderName.trim()) {
      notify('warn', 'Nombre requerido', 'Ingresa un nombre válido para la carpeta.');
      return;
    }
    const newPath = joinPath(baseDir, newFolderName.trim());
    setGlobalLoading(true);
    setCreateDialogVisible(false);
    try {
      await mcpClient.callTool('filesystem', 'create_directory', { [createParam]: newPath });
      notify('success', 'Carpeta creada', `Se creó ${newFolderName.trim()}`);
      await loadDirectory(baseDir, { keepExpanded: true });
    } catch (error) {
      notify('error', 'Error al crear carpeta', error?.message || 'No se pudo crear la carpeta');
    } finally {
      setNewFolderName('');
      setPendingBaseDir(null);
      setGlobalLoading(false);
    }
  }, [createParam, joinPath, loadDirectory, newFolderName, notify, pendingBaseDir]);

  const handleCopyPath = useCallback(async (node) => {
    const target = node || (selectedKey ? findNodeByKey(nodes, selectedKey) : null);
    if (!target?.data?.path) return;
    try {
      await navigator.clipboard.writeText(target.data.path);
      notify('success', 'Ruta copiada', target.data.path);
    } catch {
      notify('warn', 'No se pudo copiar', 'Intenta copiar manualmente la ruta.');
    }
  }, [findNodeByKey, nodes, notify, selectedKey]);

  const performMove = useCallback(async (sourcePath, destinationPath) => {
    if (!sourcePath || !destinationPath) return;
    await mcpClient.callTool('filesystem', 'move_file', {
      [moveParams.source]: sourcePath,
      [moveParams.destination]: destinationPath
    });
  }, [moveParams.destination, moveParams.source]);

  const handleRename = useCallback(async () => {
    const node = selectedKey ? findNodeByKey(nodes, selectedKey) : null;
    if (!node) return;
    const currentName = basename(node.data.path);
    const parentPath = node.data.parentPath;
    if (!parentPath) {
      notify('warn', 'No se puede renombrar', 'Esta raíz no puede renombrarse.');
      return;
    }
    const newName = window.prompt('Nuevo nombre:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const destinationPath = joinPath(parentPath, newName.trim());
    setGlobalLoading(true);
    try {
      await performMove(node.data.path, destinationPath);
      notify('success', 'Elemento renombrado', destinationPath);
      await Promise.all([
        loadDirectory(parentPath, { keepExpanded: true })
      ]);
    } catch (error) {
      notify('error', 'Error al renombrar', error?.message || 'No se pudo renombrar el elemento');
    } finally {
      setGlobalLoading(false);
    }
  }, [basename, findNodeByKey, joinPath, loadDirectory, nodes, notify, performMove, selectedKey]);

  const handleDuplicateFile = useCallback(async () => {
    const node = selectedKey ? findNodeByKey(nodes, selectedKey) : null;
    if (!node || node.data?.type !== 'file') {
      notify('warn', 'Selecciona un archivo', 'Solo se pueden duplicar archivos por ahora.');
      return;
    }
    const parentPath = node.data.parentPath;
    const currentName = basename(node.data.path);
    const extensionMatch = currentName.match(/(.*?)(\.[^.]+)?$/);
    const suggestedName = extensionMatch ? `${extensionMatch[1]} copia${extensionMatch[2] || ''}` : `${currentName} copia`;
    const newName = window.prompt('Nombre para la copia:', suggestedName);
    if (!newName || !newName.trim()) return;
    const destinationPath = joinPath(parentPath, newName.trim());
    setGlobalLoading(true);
    try {
      const fileContent = await mcpClient.callTool('filesystem', 'read_file', { [readParam]: node.data.path });
      const contentToWrite = typeof fileContent === 'string'
        ? fileContent
        : fileContent?.content ?? JSON.stringify(fileContent, null, 2);
      await mcpClient.callTool('filesystem', 'write_file', {
        [writeParams.path]: destinationPath,
        [writeParams.content]: contentToWrite
      });
      notify('success', 'Archivo duplicado', destinationPath);
      await loadDirectory(parentPath, { keepExpanded: true });
    } catch (error) {
      notify('error', 'Error al duplicar', error?.message || 'No se pudo duplicar el archivo');
    } finally {
      setGlobalLoading(false);
    }
  }, [basename, findNodeByKey, joinPath, loadDirectory, nodes, notify, readParam, selectedKey, writeParams.content, writeParams.path]);

  const handleDragDrop = useCallback(async (event) => {
    const { dragNode, dropNode, dropPoint } = event;
    if (!dragNode || !dropNode) return;
    const dragPath = dragNode.data?.path;
    let targetDirPath = dropNode.data?.path;
    if (!dragPath || !targetDirPath) return;
    if (dropNode.data?.type !== 'directory') {
      notify('warn', 'Solo carpetas', 'Arrastra los elementos sobre una carpeta.');
      return;
    }
    if (dragNode.data?.parentPath === targetDirPath && dropPoint !== 0) {
      // Misma carpeta, solo reordenar visualmente
      setNodes(event.value);
      return;
    }
    const newPath = joinPath(targetDirPath, basename(dragPath));
    setGlobalLoading(true);
    try {
      await performMove(dragPath, newPath);
      notify('success', 'Elemento movido', newPath);
      await Promise.all([
        dragNode.data?.parentPath ? loadDirectory(dragNode.data.parentPath, { keepExpanded: true }) : Promise.resolve(),
        loadDirectory(targetDirPath, { keepExpanded: true })
      ]);
    } catch (error) {
      notify('error', 'No se pudo mover', error?.message || 'Ocurrió un error al mover el elemento');
    } finally {
      setGlobalLoading(false);
    }
  }, [basename, joinPath, loadDirectory, notify, performMove]);

  useEffect(() => {
    nodes.forEach(node => {
      const key = node.key;
      if (expandedKeys[key] && node.children && node.children.length === 0) {
        loadDirectory(node.data?.path, { keepExpanded: true });
      }
    });
  }, [expandedKeys, loadDirectory, nodes]);

  const collectDirectoryKeys = useCallback((tree) => {
    const result = [];
    const traverse = (nodesList) => {
      nodesList.forEach(node => {
        if (node?.data?.type === 'directory') {
          result.push(node.key);
          if (Array.isArray(node.children) && node.children.length > 0) {
            traverse(node.children);
          }
        }
      });
    };
    traverse(tree || []);
    return result;
  }, []);

  const allExpanded = useMemo(() => {
    const dirKeys = collectDirectoryKeys(nodes);
    if (dirKeys.length === 0) return false;
    return dirKeys.every(key => expandedKeys?.[key]);
  }, [collectDirectoryKeys, expandedKeys, nodes]);

  const handleToggleExpandAllGlobal = useCallback(() => {
    const dirKeys = collectDirectoryKeys(nodes);
    if (dirKeys.length === 0) return;
    const areAllExpanded = dirKeys.every(key => expandedKeys?.[key]);
    if (areAllExpanded) {
      setExpandedKeys({});
    } else {
      const next = {};
      dirKeys.forEach(key => { next[key] = true; });
      setExpandedKeys(next);
    }
  }, [collectDirectoryKeys, expandedKeys, nodes]);

  const openConfigDialog = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-ai-config', { detail: { tab: 'mcp-manager', selectServer: 'filesystem' } }));
  }, []);

  const openChatTab = useCallback(() => {
    const newAITab = {
      key: `ai-chat-${Date.now()}`,
      label: 'Chat IA',
      type: 'ai-chat',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-ai-tab', { detail: { tab: newAITab } }));
  }, []);

  const openCreateGroupDialog = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-create-group-dialog'));
  }, []);

  const buildContextMenuItems = useCallback((node) => {
    if (!node) return [];
    const items = [];
    if (node.data?.type === 'directory') {
      items.push({
        label: 'Actualizar',
        icon: 'pi pi-refresh',
        command: () => handleRefreshNode(node)
      });
      items.push({
        label: 'Nueva carpeta',
        icon: 'pi pi-folder-plus',
        command: () => {
          setSelectedKey(node.key);
          handleCreateFolder();
        }
      });
    } else {
      items.push({
        label: 'Duplicar archivo',
        icon: 'pi pi-copy',
        command: () => {
          setSelectedKey(node.key);
          handleDuplicateFile();
        }
      });
    }
    items.push({
      label: 'Renombrar',
      icon: 'pi pi-pencil',
      command: () => {
        setSelectedKey(node.key);
        handleRename();
      }
    });
    items.push({
      label: 'Copiar ruta',
      icon: 'pi pi-link',
      command: () => handleCopyPath(node)
    });
    return items;
  }, [handleCopyPath, handleCreateFolder, handleDuplicateFile, handleRefreshNode, handleRename]);

  const handleContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    if (!node) return;
    setSelectedKey(node.key);
    const items = buildContextMenuItems(node);
    if (items.length === 0) return;
    setContextItems(items);
    if (contextMenuRef.current) {
      const nativeEvent = event.originalEvent || event.nativeEvent || event;
      requestAnimationFrame(() => {
        contextMenuRef.current?.show(nativeEvent);
      });
    }
  }, [buildContextMenuItems]);

  const nodeTemplate = useCallback((node) => {
    const isLoading = node?.data?.path ? loadingPaths[node.data.path] : false;
    const entry = node?.data?.raw || {};
    const isDirectory = node?.data?.type === 'directory';
    const isExpanded = isDirectory && expandedKeys?.[node.key];
    const iconColor = node?.style?.['--fs-node-color'] || (isDirectory ? '#8bc34a' : textPrimary);
    const iconClass = isDirectory
      ? isExpanded ? 'pi pi-folder-open' : 'pi pi-folder'
      : (node.icon || 'pi pi-file');
    return (
      <div
        onContextMenu={(e) => handleContextMenu(e, node)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.15rem',
          width: '100%',
          padding: '0.15rem 0.25rem',
          borderRadius: '4px',
          transition: 'background 0.2s ease',
          cursor: 'pointer'
        }}
        className="filesystem-node"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            className={iconClass}
            style={{
              color: iconColor,
              fontSize: '0.85rem',
              width: '14px',
              textAlign: 'center'
            }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>{node.label}</span>
          {isLoading && (
            <ProgressSpinner
              style={{ width: '12px', height: '12px' }}
              strokeWidth="4"
            />
          )}
        </div>
        {entry?.size && (
          <span style={{ fontSize: '0.6rem', opacity: 0.55, marginLeft: '1.8rem' }}>
            {entry.size}
          </span>
        )}
      </div>
    );
  }, [expandedKeys, handleContextMenu, loadingPaths, textPrimary]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'transparent',
        color: textPrimary,
        fontFamily: explorerFont,
        fontSize: `${explorerFontSize}px`,
        position: 'relative',
        overflow: 'hidden'
      }}
      data-panel="filesystem"
    >
      <ContextMenu
        model={contextItems}
        ref={contextMenuRef}
        autoZIndex={true}
      />
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0.5rem 0.5rem 0.25rem 0.5rem',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'visible'
      }}>
        <Button 
          className="p-button-rounded p-button-text sidebar-action-button glass-button" 
          onClick={() => setSidebarCollapsed(v => !v)} 
          tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
          tooltipOptions={{ position: 'bottom' }} 
          style={{ 
            marginRight: 8, 
            flexShrink: 0,
            width: '40px',
            height: '40px',
            minWidth: '40px',
            padding: 0,
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
              : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft
            }
          </span>
        </Button>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4, 
          marginLeft: 'auto',
          flexShrink: 0,
          overflow: 'visible'
        }}>
          <Button 
            icon="pi pi-comments" 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={openChatTab} 
            tooltip={t('tooltips.aiChat')} 
            tooltipOptions={{ position: 'bottom' }}
            style={{ flexShrink: 0 }}
          />
          <Button 
            icon="pi pi-folder" 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={openCreateFolderDialog} 
            tooltip={t('tooltips.newFolder')} 
            tooltipOptions={{ position: 'bottom' }}
            disabled={globalLoading || allowedPaths.length === 0}
            style={{ flexShrink: 0 }}
          />
          <Button 
            icon="pi pi-th-large" 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={openCreateGroupDialog} 
            tooltip={t('tooltips.createGroup')} 
            tooltipOptions={{ position: 'bottom' }}
            style={{ flexShrink: 0 }}
          />
          <Button 
            icon="pi pi-refresh" 
            className="p-button-rounded p-button-text sidebar-action-button glass-button" 
            onClick={() => handleRefreshNode()} 
            tooltip={t('tooltips.reloadFolder')} 
            tooltipOptions={{ position: 'bottom' }}
            disabled={globalLoading}
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>
      
      <Divider className="my-2" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          position: 'relative',
          fontSize: `${explorerFontSize}px`,
          padding: '0 0.5rem 0.5rem 0.5rem'
        }}
        className="tree-container"
      >
        {nodes.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              opacity: 0.8,
              fontSize: '0.8rem',
              borderRadius: '10px',
              border: `1px dashed ${panelBorder}`,
              background: 'rgba(255,255,255,0.05)'
            }}
          >
            No se detectaron rutas permitidas para el filesystem MCP.<br />
            Revisa la configuración del servidor.
          </div>
        ) : (
          <Tree
            value={nodes}
            expandedKeys={expandedKeys}
            onToggle={handleToggle}
            selectionMode="single"
            selectionKeys={selectedKey}
            onSelectionChange={(e) => setSelectedKey(e.value)}
            dragdropScope="filesystem"
            onDragDrop={handleDragDrop}
            className="sidebar-tree filesystem-tree"
            loading={globalLoading}
            nodeTemplate={nodeTemplate}
            pt={{
              root: {
                className: 'filesystem-tree-root'
              }
            }}
          />
        )}
      </div>

      <SidebarFooter
        onConfigClick={openConfigDialog}
        allExpanded={allExpanded}
        toggleExpandAll={handleToggleExpandAllGlobal}
        collapsed={sidebarCollapsed}
        onShowImportDialog={() => {}}
        sessionActionIconTheme={sessionActionIconTheme}
      />
      <Dialog
        header="Nueva carpeta"
        visible={createDialogVisible}
        onHide={() => {
          if (!globalLoading) {
            setCreateDialogVisible(false);
            setNewFolderName('');
            setPendingBaseDir(null);
          }
        }}
        dismissableMask
        closable={!globalLoading}
        style={{ width: '320px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>Directorio base</span>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#cfd8dc' }}>
              {pendingBaseDir}
            </div>
          </div>
          <InputText
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button
              label="Cancelar"
              className="p-button-text"
              disabled={globalLoading}
              onClick={() => {
                setCreateDialogVisible(false);
                setNewFolderName('');
                setPendingBaseDir(null);
              }}
            />
            <Button
              label="Crear"
              icon="pi pi-check"
              onClick={handleCreateFolder}
              disabled={globalLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SidebarFilesystemExplorer;

