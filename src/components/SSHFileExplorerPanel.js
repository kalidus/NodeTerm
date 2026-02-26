import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import '../styles/ssh-monitor.css'; // Reuse existing styles for the overlay

const SSHFileExplorerPanel = ({ tabId, tab, sshConfig, onClose }) => {
    const [nodes, setNodes] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState({});
    const [selectedKey, setSelectedKey] = useState(null);
    const [loadingPaths, setLoadingPaths] = useState({});
    const [globalLoading, setGlobalLoading] = useState(false);
    const [contextItems, setContextItems] = useState([]);
    const contextMenuRef = useRef(null);
    const [createDialogVisible, setCreateDialogVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [pendingBaseDir, setPendingBaseDir] = useState(null);

    // Resizing state
    const [panelLeft, setPanelLeft] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_panel_left');
        const parsed = saved ? parseFloat(saved) : 45;
        return isNaN(parsed) ? 45 : parsed;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [opacity, setOpacity] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_opacity');
        return saved ? parseFloat(saved) : 0.95;
    });
    const [isOpacityMenuOpen, setIsOpacityMenuOpen] = useState(false);
    const opacityMenuRef = useRef(null);

    const panelLeftRef = useRef(panelLeft);
    const resizeStateRef = useRef({ isResizing: false, startX: 0, startLeftPx: 0, parentWidth: 0 });

    const notify = useCallback((severity, summary, detailMessage) => {
        if (window.toast && window.toast.current) {
            window.toast.current.show({ severity, summary, detail: detailMessage, life: 4000 });
        } else {
            console[severity === 'error' ? 'error' : 'log']('[SSHFileExplorer]', summary, detailMessage);
        }
    }, []);

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

    const joinPath = useCallback((basePath, name) => {
        if (!basePath) return name;
        if (basePath === '/') {
            return `/${name}`;
        }
        return basePath.endsWith('/') ? `${basePath}${name}` : `${basePath}/${name}`;
    }, []);

    const basename = useCallback((fullPath) => {
        if (!fullPath) return '';
        if (fullPath === '/') return fullPath;
        const trimmed = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
        const parts = trimmed.split('/');
        return parts[parts.length - 1] || trimmed;
    }, []);

    const sortEntries = useCallback((entries) => {
        return [...entries].sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            }
            return a.type === 'directory' ? -1 : 1;
        });
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
            children: isDir ? undefined : undefined // Lazy load children
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
            const invoke = window.electron?.ipcRenderer?.invoke;
            if (!invoke) return;

            const result = await invoke('ssh:list-files', { tabId, path, sshConfig });
            if (result && result.success) {
                // Filter out . and ..
                const validFiles = (result.files || []).filter(f => f.name !== '.' && f.name !== '..');
                const entries = sortEntries(validFiles);
                const children = entries.map(entry => toTreeNode(entry, path));
                setNodes(prev => updateNodeChildren(prev, path, children));
                setExpandedKeys(prev => {
                    const key = makeKey(path);
                    return { ...prev, [key]: true };
                });
            } else {
                notify('error', 'Error al listar', result?.error || 'No se pudo listar el directorio');
            }
        } catch (error) {
            notify('error', 'Error al listar', error?.message || 'No se pudo listar el directorio');
        } finally {
            setLoadingForPath(path, false);
        }
    }, [makeKey, notify, setLoadingForPath, sortEntries, toTreeNode, updateNodeChildren, tabId, sshConfig]);

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

    // Initial load: get HOME directory
    useEffect(() => {
        const initHome = async () => {
            try {
                setGlobalLoading(true);
                const invoke = window.electron?.ipcRenderer?.invoke;
                if (!invoke) return;

                const result = await invoke('ssh:get-home-directory', { tabId, sshConfig });
                if (result && result.success && result.home) {
                    const homePath = result.home;
                    const rootNodes = [{
                        key: makeKey(homePath),
                        label: homePath,
                        data: {
                            path: homePath,
                            type: 'directory',
                            parentPath: null,
                            isRoot: true
                        },
                        icon: 'pi pi-home',
                        droppable: true,
                        leaf: false,
                        children: []
                    }];
                    // También añadir la raíz /
                    if (homePath !== '/') {
                        rootNodes.push({
                            key: makeKey('/'),
                            label: '/',
                            data: {
                                path: '/',
                                type: 'directory',
                                parentPath: null,
                                isRoot: true
                            },
                            icon: 'pi pi-hdd',
                            droppable: true,
                            leaf: false,
                            children: []
                        });
                    }
                    setNodes(rootNodes);
                    await loadDirectory(homePath, { keepExpanded: true });
                } else {
                    notify('error', 'Error', 'No se pudo obtener el directorio inicial');
                }
            } catch (error) {
                notify('error', 'Error', error?.message || 'Error de conexión');
            } finally {
                setGlobalLoading(false);
            }
        };
        initHome();
    }, [tabId, sshConfig, loadDirectory, makeKey, notify]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Resizing logic
    useEffect(() => {
        panelLeftRef.current = panelLeft;
    }, [panelLeft]);

    useEffect(() => {
        const timer = setTimeout(() => setHasMounted(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const handleMouseMoveResizer = useCallback((e) => {
        if (!resizeStateRef.current.isResizing) return;
        const { startX, startLeftPx, parentWidth } = resizeStateRef.current;
        const deltaX = e.clientX - startX;
        const newLeftPx = Math.max(parentWidth * 0.2, Math.min(parentWidth * 0.85, startLeftPx + deltaX));
        const newLeftPct = (newLeftPx / parentWidth) * 100;
        setPanelLeft(newLeftPct);
    }, []);

    const handleMouseUpResizer = useCallback((e) => {
        if (resizeStateRef.current.isResizing) {
            localStorage.setItem('ssh_file_explorer_panel_left', panelLeftRef.current.toString());
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        resizeStateRef.current.isResizing = false;
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMoveResizer);
        document.removeEventListener('mouseup', handleMouseUpResizer);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handleMouseMoveResizer]);

    const handleMouseDownResizer = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const overlay = e.currentTarget.closest('.ssh-monitor-overlay');
        if (!overlay) return;
        const parentRect = overlay.parentElement.getBoundingClientRect();
        const currentLeftPx = (panelLeftRef.current / 100) * parentRect.width;

        resizeStateRef.current = {
            isResizing: true,
            startX: e.clientX,
            startLeftPx: currentLeftPx,
            parentWidth: parentRect.width
        };

        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMoveResizer);
        document.addEventListener('mouseup', handleMouseUpResizer);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMoveResizer);
            document.removeEventListener('mouseup', handleMouseUpResizer);
        };
    }, [handleMouseMoveResizer, handleMouseUpResizer]);

    const handleOpacityChange = (e) => {
        const val = parseFloat(e.target.value);
        setOpacity(val);
        localStorage.setItem('ssh_file_explorer_opacity', val.toString());
    };

    // Auto-close menus on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (opacityMenuRef.current && !opacityMenuRef.current.contains(e.target)) {
                setIsOpacityMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // File Operations
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
            notify('warn', 'Selecciona una carpeta', 'Elige una carpeta para crear el nuevo directorio.');
            return;
        }
        setPendingBaseDir(baseDir);
        setNewFolderName('');
        setCreateDialogVisible(true);
    }, [findNodeByKey, nodes, notify, selectedKey]);

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
            const invoke = window.electron?.ipcRenderer?.invoke;
            const result = await invoke('ssh:create-directory', { tabId, remotePath: newPath, sshConfig });
            if (result && result.success) {
                notify('success', 'Carpeta creada', `Se creó ${newFolderName.trim()}`);
                await loadDirectory(baseDir, { keepExpanded: true });
            } else {
                notify('error', 'Error al crear carpeta', result?.error || 'No se pudo crear la carpeta');
            }
        } catch (error) {
            notify('error', 'Error al crear carpeta', error?.message || 'No se pudo crear la carpeta');
        } finally {
            setNewFolderName('');
            setPendingBaseDir(null);
            setGlobalLoading(false);
        }
    }, [joinPath, loadDirectory, newFolderName, notify, pendingBaseDir, sshConfig, tabId]);

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
            const invoke = window.electron?.ipcRenderer?.invoke;
            const result = await invoke('ssh:rename-file', { tabId, oldPath: node.data.path, newPath: destinationPath, sshConfig });
            if (result && result.success) {
                notify('success', 'Elemento renombrado', destinationPath);
                await loadDirectory(parentPath, { keepExpanded: true });
            } else {
                notify('error', 'Error al renombrar', result?.error || 'No se pudo renombrar el elemento');
            }
        } catch (error) {
            notify('error', 'Error al renombrar', error?.message || 'No se pudo renombrar el elemento');
        } finally {
            setGlobalLoading(false);
        }
    }, [basename, findNodeByKey, joinPath, loadDirectory, nodes, notify, selectedKey, sshConfig, tabId]);

    const handleDelete = useCallback(async (node) => {
        const targetNode = node || (selectedKey ? findNodeByKey(nodes, selectedKey) : null);
        if (!targetNode) return;

        const isDir = targetNode.data?.type === 'directory';
        const msg = `¿Estás seguro de que deseas eliminar ${isDir ? 'la carpeta' : 'el archivo'} "${targetNode.label}"?`;

        if (!window.confirm(msg)) return;

        setGlobalLoading(true);
        try {
            const invoke = window.electron?.ipcRenderer?.invoke;
            const result = await invoke('ssh:delete-file', {
                tabId,
                remotePath: targetNode.data.path,
                isDirectory: isDir,
                sshConfig
            });

            if (result && result.success) {
                notify('success', 'Elemento eliminado', targetNode.data.path);
                if (targetNode.data.parentPath) {
                    await loadDirectory(targetNode.data.parentPath, { keepExpanded: true });
                }
            } else {
                notify('error', 'Error al eliminar', result?.error || 'No se pudo eliminar el elemento');
            }
        } catch (error) {
            notify('error', 'Error al eliminar', error?.message || 'No se pudo eliminar el elemento');
        } finally {
            setGlobalLoading(false);
        }
    }, [findNodeByKey, loadDirectory, nodes, notify, selectedKey, sshConfig, tabId]);

    const handleDownload = useCallback(async (node) => {
        const targetNode = node || (selectedKey ? findNodeByKey(nodes, selectedKey) : null);
        if (!targetNode || targetNode.data?.type === 'directory') return;

        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;

        try {
            const result = await invoke('dialog:show-save-dialog', {
                defaultPath: targetNode.label
            });
            if (result.canceled || !result.filePath) return;

            setGlobalLoading(true);
            const downloadResult = await invoke('ssh:download-file', {
                tabId,
                remotePath: targetNode.data.path,
                localPath: result.filePath,
                sshConfig
            });

            if (downloadResult && downloadResult.success) {
                notify('success', 'Descarga completada', `Archivo guardado en: ${result.filePath}`);
            } else {
                notify('error', 'Error en la descarga', downloadResult?.error || 'No se pudo descargar el archivo');
            }
        } catch (error) {
            notify('error', 'Error en la descarga', error?.message || 'No se pudo descargar el archivo');
        } finally {
            setGlobalLoading(false);
        }
    }, [findNodeByKey, nodes, notify, selectedKey, sshConfig, tabId]);

    const handleUpload = useCallback(async (node) => {
        const targetNode = node || (selectedKey ? findNodeByKey(nodes, selectedKey) : null);
        let baseDir = null;
        if (targetNode) {
            baseDir = targetNode.data?.type === 'directory'
                ? targetNode.data.path
                : targetNode.data?.parentPath;
        }
        if (!baseDir) {
            notify('warn', 'Selecciona una carpeta', 'Elige un directorio de destino para subir archivos.');
            return;
        }

        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;

        try {
            const result = await invoke('dialog:show-open-dialog', {
                properties: ['openFile', 'multiSelections']
            });
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;

            setGlobalLoading(true);
            let successCount = 0;
            let failCount = 0;

            for (const localPath of result.filePaths) {
                const fileName = localPath.split(/[/\\]/).pop();
                const remotePath = joinPath(baseDir, fileName);

                const uploadResult = await invoke('ssh:upload-file', {
                    tabId,
                    localPath: localPath,
                    remotePath: remotePath,
                    sshConfig
                });

                if (uploadResult && uploadResult.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error('Error subiendo', fileName, ':', uploadResult?.error);
                }
            }

            if (successCount > 0) {
                notify('success', 'Subida completada', `Se subieron ${successCount} archivo(s).`);
                await loadDirectory(baseDir, { keepExpanded: true });
            }
            if (failCount > 0) {
                notify('error', 'Errores en subida', `Falló la subida de ${failCount} archivo(s). revisa la consola.`);
            }
        } catch (error) {
            notify('error', 'Error en la subida', error?.message || 'No se pudo subir los archivos');
        } finally {
            setGlobalLoading(false);
        }
    }, [findNodeByKey, joinPath, loadDirectory, nodes, notify, selectedKey, sshConfig, tabId]);

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
                    openCreateFolderDialog();
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
            label: 'Eliminar',
            icon: 'pi pi-trash',
            command: () => {
                setSelectedKey(node.key);
                handleDelete(node);
            }
        });
        if (node.data?.type !== 'directory') {
            items.push({
                label: 'Descargar',
                icon: 'pi pi-download',
                command: () => handleDownload(node)
            });
        }
        if (node.data?.type === 'directory') {
            items.push({
                label: 'Subir archivo aquí',
                icon: 'pi pi-upload',
                command: () => handleUpload(node)
            });
        }
        items.push({
            label: 'Copiar ruta',
            icon: 'pi pi-link',
            command: () => handleCopyPath(node)
        });
        return items;
    }, [handleCopyPath, openCreateFolderDialog, handleRefreshNode, handleRename, handleDelete, handleDownload, handleUpload]);

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
        const iconColor = node?.style?.['--fs-node-color'] || (isDirectory ? '#58a6ff' : '#c9d1d9');
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
                    <span style={{ flex: 1, minWidth: 0, color: '#e6edf3' }}>{node.label}</span>
                    {isLoading && (
                        <ProgressSpinner
                            style={{ width: '12px', height: '12px' }}
                            strokeWidth="2"
                            fill="var(--surface-ground)"
                            animationDuration=".5s"
                        />
                    )}
                </div>
                {entry?.size && (
                    <span style={{ fontSize: '0.6rem', color: '#8b949e', marginLeft: '1.8rem' }}>
                        {entry.size} bytes
                    </span>
                )}
            </div>
        );
    }, [expandedKeys, handleContextMenu, loadingPaths]);


    return (
        <div
            className="ssh-monitor-overlay"
            style={{
                '--ssh-monitor-left': `${panelLeft}%`,
                '--ssh-monitor-opacity': opacity
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isResizing) onClose?.();
            }}
        >
            <ContextMenu
                model={contextItems}
                ref={contextMenuRef}
                autoZIndex={true}
            />

            <div
                className={`ssh-monitor-resize-handle ${isResizing ? 'is-resizing' : ''}`}
                onMouseDown={handleMouseDownResizer}
                onClick={(e) => e.stopPropagation()}
            />

            <div className={`ssh-monitor-panel ${hasMounted || isResizing ? 'no-animation' : ''}`} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column' }}>

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="ssh-monitor-header">
                    <div className="ssh-monitor-header-main">
                        <div className="ssh-monitor-server-title">
                            {tab?.iconId || tab?.nodeData?.iconId ? (
                                <SSHIconRenderer
                                    preset={SSHIconPresets[Object.keys(SSHIconPresets).find(k => SSHIconPresets[k].id === (tab?.iconId || tab?.nodeData?.iconId))] || SSHIconPresets.DEFAULT}
                                    pixelSize={20}
                                />
                            ) : (
                                <i className="pi pi-folder-open ssh-monitor-title-icon" style={{ color: '#58a6ff' }} />
                            )}
                            <h2>Explorador SSH</h2>
                        </div>
                        <div className="ssh-monitor-header-actions">
                            <div className="ssh-monitor-opacity-container" ref={opacityMenuRef}>
                                <button
                                    className={`ssh-monitor-opacity-toggle ${isOpacityMenuOpen ? 'active' : ''}`}
                                    onClick={() => setIsOpacityMenuOpen(!isOpacityMenuOpen)}
                                    title="Ajustar opacidad"
                                >
                                    <i className="pi pi-clone" style={{ fontSize: '12px', transform: 'rotate(45deg)' }} />
                                    <span className="ssh-monitor-opacity-val-text">{Math.round(opacity * 100)}%</span>
                                </button>

                                {isOpacityMenuOpen && (
                                    <div className="ssh-monitor-opacity-popover">
                                        <span className="ssh-monitor-opacity-label">Opacidad</span>
                                        <input
                                            type="range"
                                            className="ssh-monitor-opacity-slider"
                                            min="0.1"
                                            max="1"
                                            step="0.05"
                                            value={opacity}
                                            onChange={handleOpacityChange}
                                        />
                                    </div>
                                )}
                            </div>
                            <button className="ssh-monitor-close" onClick={onClose} title="Cerrar (Esc)">✕</button>
                        </div>
                    </div>
                </div>

                {/* ── Content ───────────────────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', position: 'relative' }} className="ssh-file-explorer-content">
                    {globalLoading && nodes.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="3" fill="var(--surface-ground)" animationDuration=".5s" />
                        </div>
                    ) : (
                        <Tree
                            value={nodes}
                            expandedKeys={expandedKeys}
                            onToggle={handleToggle}
                            selectionMode="single"
                            selectionKeys={selectedKey}
                            onSelectionChange={(e) => setSelectedKey(e.value)}
                            className="ssh-monitor-tree"
                            loading={globalLoading}
                            nodeTemplate={nodeTemplate}
                            style={{ background: 'transparent', border: 'none', color: '#e6edf3' }}
                        />
                    )}
                </div>
            </div>

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
                style={{ width: '320px', borderRadius: '8px' }}
                contentStyle={{ background: '#0d1117', color: '#c9d1d9' }}
                headerStyle={{ background: '#161b22', color: '#e6edf3', borderBottom: '1px solid #30363d' }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', opacity: 0.75, color: '#8b949e' }}>Directorio base</span>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#58a6ff', wordBreak: 'break-all' }}>
                            {pendingBaseDir}
                        </div>
                    </div>
                    <InputText
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nombre de la carpeta"
                        autoFocus
                        style={{ background: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                        <Button
                            label="Cancelar"
                            className="p-button-text p-button-secondary"
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
                            className="p-button-primary"
                            style={{ background: '#238636', border: '1px solid rgba(240,246,252,0.1)' }}
                        />
                    </div>
                </div>
            </Dialog>

        </div>
    );
};

export default SSHFileExplorerPanel;
