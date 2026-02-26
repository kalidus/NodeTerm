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
    // ---- Remote State ----
    const [remoteNodes, setRemoteNodes] = useState([]);
    const [remoteExpandedKeys, setRemoteExpandedKeys] = useState({});
    const [remoteSelectedKey, setRemoteSelectedKey] = useState(null);
    const [remoteLoadingPaths, setRemoteLoadingPaths] = useState({});

    // ---- Local State ----
    const [localNodes, setLocalNodes] = useState([]);
    const [localExpandedKeys, setLocalExpandedKeys] = useState({});
    const [localSelectedKey, setLocalSelectedKey] = useState(null);
    const [localLoadingPaths, setLocalLoadingPaths] = useState({});

    // ---- Shared State ----
    const [globalLoading, setGlobalLoading] = useState(false);
    const [contextItems, setContextItems] = useState([]);
    const contextMenuRef = useRef(null);
    const [createDialogVisible, setCreateDialogVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [pendingBaseDir, setPendingBaseDir] = useState(null);
    const [pendingCreateSide, setPendingCreateSide] = useState(null); // 'local' | 'remote'
    const [dragOverKey, setDragOverKey] = useState(null); // key of node being dragged over

    // Resizing state
    const [panelLeft, setPanelLeft] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_panel_left');
        const parsed = saved ? parseFloat(saved) : 25; // Default wider for dual pane
        return isNaN(parsed) ? 25 : parsed;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [opacity, setOpacity] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_opacity');
        return saved ? parseFloat(saved) : 0.95;
    });
    const [isOpacityMenuOpen, setIsOpacityMenuOpen] = useState(false);
    const opacityMenuRef = useRef(null);

    const [showHidden, setShowHidden] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_show_hidden');
        return saved !== 'false';
    });

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
                raw: entry,
                iconInfo // keep iconInfo here so template can use it
            },
            // NO icon field — we render it ourselves in the nodeTemplate
            style: iconInfo?.color ? { '--fs-node-color': iconInfo.color } : undefined,
            leaf: !isDir,
            droppable: isDir,
            children: isDir ? undefined : undefined // Lazy load children
        };
    }, [FILE_ICON_MAP, joinPath, makeKey]);

    const updateNodeChildren = useCallback((tree, targetPath, childrenNodes) => {
        // Required for deep clone to trigger prime react re-renders safely
        const cloneTree = (nodesToClone) => {
            return nodesToClone.map(node => {
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
                        children: cloneTree(node.children)
                    };
                }
                return node;
            });
        };
        return cloneTree(tree);
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

    const setLoadingForRemotePath = useCallback((path, value) => {
        setRemoteLoadingPaths(prev => {
            if (prev[path] === value) return prev;
            return { ...prev, [path]: value };
        });
    }, []);

    const setLoadingForLocalPath = useCallback((path, value) => {
        setLocalLoadingPaths(prev => {
            if (prev[path] === value) return prev;
            return { ...prev, [path]: value };
        });
    }, []);

    // ---- Remote Methods ----
    const loadRemoteDirectory = useCallback(async (path, { keepExpanded = false } = {}) => {
        if (!path) return;
        try {
            setLoadingForRemotePath(path, true);
            const invoke = window.electron?.ipcRenderer?.invoke;
            if (!invoke) return;

            const result = await invoke('ssh:list-files', { tabId, path, sshConfig });
            if (result && result.success) {
                const validFiles = (result.files || []).filter(f => f.name !== '.' && f.name !== '..');
                const entries = sortEntries(validFiles);
                const children = entries.map(entry => toTreeNode(entry, path));

                setRemoteNodes(prev => updateNodeChildren(prev, path, children));
                setRemoteExpandedKeys(prev => ({ ...prev, [makeKey(path)]: true }));
            } else {
                notify('error', 'Error remoto', result?.error || 'No se pudo listar el directorio remoto');
            }
        } catch (error) {
            notify('error', 'Error remoto', error?.message || 'Error listando remoto');
        } finally {
            setLoadingForRemotePath(path, false);
        }
    }, [makeKey, notify, setLoadingForRemotePath, sortEntries, toTreeNode, updateNodeChildren, tabId, sshConfig]);

    const loadLocalDirectory = useCallback(async (path, { keepExpanded = false } = {}) => {
        if (!path) return;
        try {
            setLoadingForLocalPath(path, true);
            const invoke = window.electron?.localFs?.listFiles;
            if (!invoke) return;

            const result = await invoke(path);
            if (result && result.success) {
                const validFiles = (result.files || []).filter(f => f.name !== '.' && f.name !== '..');
                const entries = sortEntries(validFiles);

                // Helper to mimic Windows path joining
                const localJoinPath = (base, name) => {
                    const sep = base.includes('\\') ? '\\' : '/';
                    if (base.endsWith(sep)) return `${base}${name}`;
                    return `${base}${sep}${name}`;
                };

                const children = entries.map(entry => {
                    const fullPath = localJoinPath(path, entry.name);
                    const isDir = entry.type === 'directory';
                    const extension = !isDir && entry.name.includes('.') ? entry.name.split('.').pop().toLowerCase() : null;
                    const iconInfo = !isDir && extension ? FILE_ICON_MAP[extension] : null;

                    return {
                        key: makeKey(fullPath),
                        label: entry.name,
                        data: {
                            path: fullPath,
                            type: isDir ? 'directory' : 'file',
                            parentPath: path,
                            raw: entry,
                            iconInfo
                        },
                        // NO icon field — handled by nodeTemplate
                        style: iconInfo?.color ? { '--fs-node-color': iconInfo.color } : undefined,
                        leaf: !isDir,
                        droppable: isDir,
                        children: isDir ? undefined : undefined
                    };
                });

                setLocalNodes(prev => updateNodeChildren(prev, path, children));
                setLocalExpandedKeys(prev => ({ ...prev, [makeKey(path)]: true }));
            } else {
                notify('error', 'Error local', result?.error || 'No se pudo listar el directorio local');
            }
        } catch (error) {
            notify('error', 'Error local', error?.message || 'Error listando directorio local');
        } finally {
            setLoadingForLocalPath(path, false);
        }
    }, [FILE_ICON_MAP, makeKey, notify, setLoadingForLocalPath, sortEntries, updateNodeChildren]);

    const handleRemoteToggle = useCallback((event) => {
        const newExpanded = event.value || {};
        const prevExpanded = remoteExpandedKeys || {};
        Object.keys(newExpanded).forEach(key => {
            if (newExpanded[key] && !prevExpanded[key]) {
                const node = findNodeByKey(remoteNodes, key);
                if (node?.data?.type === 'directory') {
                    loadRemoteDirectory(node.data.path, { keepExpanded: true });
                }
            }
        });
        setRemoteExpandedKeys(newExpanded);
    }, [remoteExpandedKeys, findNodeByKey, loadRemoteDirectory, remoteNodes]);

    const handleLocalToggle = useCallback((event) => {
        const newExpanded = event.value || {};
        const prevExpanded = localExpandedKeys || {};
        Object.keys(newExpanded).forEach(key => {
            if (newExpanded[key] && !prevExpanded[key]) {
                const node = findNodeByKey(localNodes, key);
                if (node?.data?.type === 'directory') {
                    loadLocalDirectory(node.data.path, { keepExpanded: true });
                }
            }
        });
        setLocalExpandedKeys(newExpanded);
    }, [localExpandedKeys, findNodeByKey, loadLocalDirectory, localNodes]);

    // Initial load: get HOME directory (remote and local)
    useEffect(() => {
        const initSystems = async () => {
            try {
                setGlobalLoading(true);
                const invoke = window.electron?.ipcRenderer?.invoke;
                const localFs = window.electron?.localFs;
                if (!invoke || !localFs) return;

                // 1. Initialize Remote
                const remoteResult = await invoke('ssh:get-home-directory', { tabId, sshConfig });
                if (remoteResult && remoteResult.success && remoteResult.home) {
                    const homePath = remoteResult.home;
                    const rNodes = [{
                        key: makeKey(homePath),
                        label: homePath,
                        data: { path: homePath, type: 'directory', parentPath: null, isRoot: true },
                        icon: 'pi pi-home', droppable: true, leaf: false, children: []
                    }];
                    if (homePath !== '/') {
                        rNodes.push({
                            key: makeKey('/'), label: '/',
                            data: { path: '/', type: 'directory', parentPath: null, isRoot: true },
                            icon: 'pi pi-hdd', droppable: true, leaf: false, children: []
                        });
                    }
                    setRemoteNodes(rNodes);
                    await loadRemoteDirectory(homePath, { keepExpanded: true });
                }

                // 2. Initialize Local
                const localResult = await localFs.getHomeDirectory();
                const localDrivesResult = await localFs.getDrives();

                const lNodes = [];
                if (localResult && localResult.success && localResult.home) {
                    lNodes.push({
                        key: makeKey(localResult.home),
                        label: `HOME (${localResult.home})`,
                        data: { path: localResult.home, type: 'directory', parentPath: null, isRoot: true },
                        icon: 'pi pi-home', droppable: true, leaf: false, children: []
                    });
                    // Load the first available drive or home directly
                    await loadLocalDirectory(localResult.home, { keepExpanded: true });
                }

                if (localDrivesResult && localDrivesResult.success && localDrivesResult.drives) {
                    localDrivesResult.drives.forEach(drive => {
                        lNodes.push({
                            key: makeKey(drive),
                            label: drive,
                            data: { path: drive, type: 'directory', parentPath: null, isRoot: true },
                            icon: 'pi pi-server', droppable: true, leaf: false, children: []
                        });
                    });
                }
                setLocalNodes(lNodes);
            } catch (error) {
                notify('error', 'Error de inicialización', error?.message || 'Error al conectar las unidades');
            } finally {
                setGlobalLoading(false);
            }
        };
        initSystems();
    }, [tabId, sshConfig, loadRemoteDirectory, loadLocalDirectory, makeKey, notify]);

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

    // File Operations Shared Helper
    const getActiveContext = useCallback((node, selectedLocal, selectedRemote, sideHint) => {
        // If node is provided directly from context menu click
        if (node) {
            // we determine side by checking if the node is in localNodes or remoteNodes
            const isLocal = !!findNodeByKey(localNodes, node.key);
            return {
                node,
                side: isLocal ? 'local' : 'remote',
                nodes: isLocal ? localNodes : remoteNodes,
                selectedKey: isLocal ? selectedLocal : selectedRemote,
                loadDir: isLocal ? loadLocalDirectory : loadRemoteDirectory
            };
        }

        // If no node provided (button click etc), use the sideHint to decide
        const side = sideHint || 'remote';
        return {
            node: side === 'local'
                ? (selectedLocal ? findNodeByKey(localNodes, selectedLocal) : null)
                : (selectedRemote ? findNodeByKey(remoteNodes, selectedRemote) : null),
            side,
            nodes: side === 'local' ? localNodes : remoteNodes,
            selectedKey: side === 'local' ? selectedLocal : selectedRemote,
            loadDir: side === 'local' ? loadLocalDirectory : loadRemoteDirectory
        };
    }, [findNodeByKey, localNodes, remoteNodes, loadLocalDirectory, loadRemoteDirectory]);

    const handleRefreshNode = useCallback((node, sideHint = 'remote') => {
        const { node: targetNode, loadDir } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);
        if (!targetNode || targetNode.data?.type !== 'directory') return;
        loadDir(targetNode.data.path, { keepExpanded: true });
    }, [getActiveContext, localSelectedKey, remoteSelectedKey]);

    const openCreateFolderDialog = useCallback((node, sideHint = 'remote') => {
        const { node: targetNode, side } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);
        let baseDir = null;
        if (targetNode) {
            baseDir = targetNode.data?.type === 'directory'
                ? targetNode.data.path
                : targetNode.data?.parentPath;
        }
        if (!baseDir) {
            notify('warn', 'Selecciona una carpeta', 'Elige una carpeta para crear el nuevo directorio.');
            return;
        }
        setPendingBaseDir(baseDir);
        setPendingCreateSide(side);
        setNewFolderName('');
        setCreateDialogVisible(true);
    }, [getActiveContext, localSelectedKey, remoteSelectedKey, notify]);

    const handleCreateFolder = useCallback(async () => {
        const baseDir = pendingBaseDir;
        const side = pendingCreateSide;
        if (!baseDir || !side) {
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
            const rpc = side === 'local' ? window.electron?.localFs?.createDirectory : undefined;

            let result;
            if (side === 'local') {
                result = await rpc(newPath);
            } else {
                result = await invoke('ssh:create-directory', { tabId, remotePath: newPath, sshConfig });
            }

            if (result && result.success) {
                notify('success', 'Carpeta creada', `Se creó ${newFolderName.trim()}`);
                const loadDir = side === 'local' ? loadLocalDirectory : loadRemoteDirectory;
                await loadDir(baseDir, { keepExpanded: true });
            } else {
                notify('error', 'Error al crear carpeta', result?.error || 'No se pudo crear la carpeta');
            }
        } catch (error) {
            notify('error', 'Error al crear carpeta', error?.message || 'No se pudo crear la carpeta');
        } finally {
            setNewFolderName('');
            setPendingBaseDir(null);
            setPendingCreateSide(null);
            setGlobalLoading(false);
        }
    }, [joinPath, loadLocalDirectory, loadRemoteDirectory, newFolderName, notify, pendingBaseDir, pendingCreateSide, sshConfig, tabId]);

    const handleCopyPath = useCallback(async (node, sideHint = 'remote') => {
        const { node: targetNode } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);
        if (!targetNode?.data?.path) return;
        try {
            await navigator.clipboard.writeText(targetNode.data.path);
            notify('success', 'Ruta copiada', targetNode.data.path);
        } catch {
            notify('warn', 'No se pudo copiar', 'Intenta copiar manualmente la ruta.');
        }
    }, [getActiveContext, localSelectedKey, remoteSelectedKey, notify]);

    const handleRename = useCallback(async (node, sideHint = 'remote') => {
        const { node: targetNode, side, loadDir } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);
        if (!targetNode) return;

        const currentName = basename(targetNode.data.path);
        const parentPath = targetNode.data.parentPath;
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
            const rpc = side === 'local' ? window.electron?.localFs?.renameFile : undefined;

            let result;
            if (side === 'local') {
                result = await rpc(targetNode.data.path, destinationPath);
            } else {
                result = await invoke('ssh:rename-file', { tabId, oldPath: targetNode.data.path, newPath: destinationPath, sshConfig });
            }

            if (result && result.success) {
                notify('success', 'Elemento renombrado', destinationPath);
                await loadDir(parentPath, { keepExpanded: true });
            } else {
                notify('error', 'Error al renombrar', result?.error || 'No se pudo renombrar el elemento');
            }
        } catch (error) {
            notify('error', 'Error al renombrar', error?.message || 'No se pudo renombrar el elemento');
        } finally {
            setGlobalLoading(false);
        }
    }, [basename, getActiveContext, joinPath, localSelectedKey, notify, remoteSelectedKey, sshConfig, tabId]);

    const handleDelete = useCallback(async (node, sideHint = 'remote') => {
        const { node: targetNode, side, loadDir } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);
        if (!targetNode) return;

        const isDir = targetNode.data?.type === 'directory';
        const msg = `¿Estás seguro de que deseas eliminar ${isDir ? 'la carpeta' : 'el archivo'} "${targetNode.label}"?`;

        if (!window.confirm(msg)) return;

        setGlobalLoading(true);
        try {
            const invoke = window.electron?.ipcRenderer?.invoke;
            const rpc = side === 'local' ? window.electron?.localFs?.deleteFile : undefined;

            let result;
            if (side === 'local') {
                result = await rpc(targetNode.data.path, isDir);
            } else {
                result = await invoke('ssh:delete-file', {
                    tabId,
                    remotePath: targetNode.data.path,
                    isDirectory: isDir,
                    sshConfig
                });
            }

            if (result && result.success) {
                notify('success', 'Elemento eliminado', targetNode.data.path);
                if (targetNode.data.parentPath) {
                    await loadDir(targetNode.data.parentPath, { keepExpanded: true });
                }
            } else {
                notify('error', 'Error al eliminar', result?.error || 'No se pudo eliminar el elemento');
            }
        } catch (error) {
            notify('error', 'Error al eliminar', error?.message || 'No se pudo eliminar el elemento');
        } finally {
            setGlobalLoading(false);
        }
    }, [getActiveContext, localSelectedKey, remoteSelectedKey, notify, sshConfig, tabId]);

    const handleDownload = useCallback(async (node, sideHint = 'remote') => {
        const { node: targetNode, side } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);

        // solo descargar de remoto a local cuando clickean el boton
        if (side === 'local') {
            notify('info', 'Acción no soportada', 'Estás navegando tus archivos locales. Arrastra a la derecha para subir.');
            return;
        }

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
    }, [getActiveContext, localSelectedKey, remoteSelectedKey, notify, sshConfig, tabId]);

    const handleUpload = useCallback(async (node, sideHint = 'remote') => {
        const { node: targetNode, side } = getActiveContext(node, localSelectedKey, remoteSelectedKey, sideHint);

        if (side === 'local') {
            notify('info', 'Acción no soportada', 'Estás navegando tus archivos locales. Usa el panel derecho para subir archivos al servidor.');
            return;
        }

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
                await loadRemoteDirectory(baseDir, { keepExpanded: true });
            }
            if (failCount > 0) {
                notify('error', 'Errores en subida', `Falló la subida de ${failCount} archivo(s). revisa la consola.`);
            }
        } catch (error) {
            notify('error', 'Error en la subida', error?.message || 'No se pudo subir los archivos');
        } finally {
            setGlobalLoading(false);
        }
    }, [getActiveContext, joinPath, loadRemoteDirectory, localSelectedKey, notify, remoteSelectedKey, sshConfig, tabId]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback(async (e, targetSide) => {
        e.preventDefault();
        e.stopPropagation();

        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;

        const dt = e.dataTransfer;
        const sourcePath = dt.getData('text/plain');
        const sourceSide = dt.getData('application/vnd.nodeterm.side');

        // Internal App Drag logic
        if (sourcePath && sourceSide) {
            if (sourceSide === targetSide) {
                // Same side drag (e.g. move/copy within local or within remote) isn't fully implemented yet
                return;
            }

            // Resolve Drop Target
            let targetNodeKey = null;
            const nodeElement = e.target.closest('.filesystem-node');
            if (nodeElement) {
                targetNodeKey = nodeElement.getAttribute('data-id') || null;
            }

            const activeNodes = targetSide === 'local' ? localNodes : remoteNodes;
            const activeSelectedKey = targetSide === 'local' ? localSelectedKey : remoteSelectedKey;

            const targetNode = targetNodeKey
                ? findNodeByKey(activeNodes, targetNodeKey)
                : (activeSelectedKey ? findNodeByKey(activeNodes, activeSelectedKey) : null);

            let destBaseDir = null;
            if (targetNode) {
                destBaseDir = targetNode.data?.type === 'directory'
                    ? targetNode.data.path
                    : targetNode.data?.parentPath;
            } else if (activeNodes.length > 0) {
                destBaseDir = pendingBaseDir || activeNodes[0]?.data?.path || '/';
            }

            if (!destBaseDir) {
                notify('warn', 'Carpeta de destino no encontrada', 'Selecciona primero una carpeta donde soltar los archivos.');
                return;
            }

            const fileName = sourcePath.split(/[/\\]/).pop();

            // Local -> Remote (Upload)
            if (sourceSide === 'local' && targetSide === 'remote') {
                const remotePath = joinPath(destBaseDir, fileName);
                setGlobalLoading(true);
                try {
                    const res = await invoke('ssh:upload-file', {
                        tabId, localPath: sourcePath, remotePath, sshConfig
                    });
                    if (res?.success) {
                        notify('success', 'Transferencia completada', `Subido: ${fileName}`);
                        await loadRemoteDirectory(destBaseDir, { keepExpanded: true });
                    } else {
                        notify('error', 'Error en transferencia', res?.error || 'No se pudo subir');
                    }
                } finally {
                    setGlobalLoading(false);
                }
                return;
            }

            // Remote -> Local (Download)
            if (sourceSide === 'remote' && targetSide === 'local') {
                const localFs = window.electron?.localFs;
                if (!localFs) return;

                // Helper to mimic Windows path joining
                const localJoinPath = (base, name) => {
                    const sep = base.includes('\\') ? '\\' : '/';
                    if (base.endsWith(sep)) return `${base}${name}`;
                    return `${base}${sep}${name}`;
                };

                const localPath = localJoinPath(destBaseDir, fileName);
                setGlobalLoading(true);
                try {
                    const res = await invoke('ssh:download-file', {
                        tabId, remotePath: sourcePath, localPath, sshConfig
                    });
                    if (res?.success) {
                        notify('success', 'Transferencia completada', `Descargado: ${fileName}`);
                        await loadLocalDirectory(destBaseDir, { keepExpanded: true });
                    } else {
                        notify('error', 'Error en transferencia', res?.error || 'No se pudo descargar');
                    }
                } finally {
                    setGlobalLoading(false);
                }
                return;
            }
            return;
        }

        // External OS Drag & Drop Logic (assuming OS array of files)
        const files = Array.from(dt.files);
        if (!files || files.length === 0) return;

        // Determine destination based on where it was dropped
        let targetNodeKey = null;
        const nodeElement = e.target.closest('.filesystem-node');
        if (nodeElement) {
            targetNodeKey = nodeElement.getAttribute('data-id') || null;
        }

        const activeNodes = targetSide === 'local' ? localNodes : remoteNodes;
        const activeSelectedKey = targetSide === 'local' ? localSelectedKey : remoteSelectedKey;

        const targetNode = targetNodeKey
            ? findNodeByKey(activeNodes, targetNodeKey)
            : (activeSelectedKey ? findNodeByKey(activeNodes, activeSelectedKey) : null);

        let baseDir = null;
        if (targetNode) {
            baseDir = targetNode.data?.type === 'directory'
                ? targetNode.data.path
                : targetNode.data?.parentPath;
        } else if (activeNodes.length > 0) {
            baseDir = pendingBaseDir || activeNodes[0]?.data?.path || '/';
        }

        if (!baseDir) {
            notify('warn', 'Carpeta de destino no encontrada', 'Selecciona primero una carpeta donde soltar los archivos.');
            return;
        }

        // Only upload to Remote makes sense for external drag right now,
        // we could do a local file copy if targetSide === 'local' but let's focus on remote for now.
        if (targetSide === 'local') {
            notify('info', 'Acción no requerida', 'No es necesario arrastrar archivos locales aquí. Usa el panel izquierdo para navegar los archivos locales y arrástralos al panel derecho.');
            return;
        }

        setGlobalLoading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const file of files) {
                const localPath = file.path;
                if (!localPath) continue;

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
                await loadRemoteDirectory(baseDir, { keepExpanded: true });
            }
            if (failCount > 0) {
                notify('error', 'Errores en subida', `Falló la subida de ${failCount} archivo(s).`);
            }
        } catch (error) {
            notify('error', 'Error en la subida', error?.message || 'No se pudo procesar la subida por arrastre');
        } finally {
            setGlobalLoading(false);
        }
    }, [findNodeByKey, joinPath, loadLocalDirectory, loadRemoteDirectory, localNodes, localSelectedKey, notify, remoteNodes, remoteSelectedKey, sshConfig, tabId, pendingBaseDir]);

    const buildContextMenuItems = useCallback((node, sideHint = 'remote') => {
        if (!node) return [];
        const items = [];
        const setSelection = sideHint === 'local' ? setLocalSelectedKey : setRemoteSelectedKey;

        if (node.data?.type === 'directory') {
            items.push({
                label: 'Actualizar',
                icon: 'pi pi-refresh',
                command: () => handleRefreshNode(node, sideHint)
            });
            items.push({
                label: 'Nueva carpeta',
                icon: 'pi pi-folder-plus',
                command: () => {
                    setSelection(node.key);
                    openCreateFolderDialog(node, sideHint);
                }
            });
        }
        items.push({
            label: 'Renombrar',
            icon: 'pi pi-pencil',
            command: () => {
                setSelection(node.key);
                handleRename(node, sideHint);
            }
        });
        items.push({
            label: 'Eliminar',
            icon: 'pi pi-trash',
            command: () => {
                setSelection(node.key);
                handleDelete(node, sideHint);
            }
        });
        if (node.data?.type !== 'directory') {
            items.push({
                label: 'Descargar',
                icon: 'pi pi-download',
                command: () => handleDownload(node, sideHint)
            });
        }
        if (node.data?.type === 'directory' && sideHint === 'remote') {
            items.push({
                label: 'Subir archivo aquí',
                icon: 'pi pi-upload',
                command: () => handleUpload(node, sideHint)
            });
        }
        items.push({
            label: 'Copiar ruta',
            icon: 'pi pi-link',
            command: () => handleCopyPath(node, sideHint)
        });
        return items;
    }, [handleCopyPath, openCreateFolderDialog, handleRefreshNode, handleRename, handleDelete, handleDownload, handleUpload, setLocalSelectedKey, setRemoteSelectedKey]);

    const handleContextMenu = useCallback((event, node, sideHint) => {
        event.preventDefault();
        event.stopPropagation();
        if (!node) return;

        if (sideHint === 'local') {
            setLocalSelectedKey(node.key);
        } else {
            setRemoteSelectedKey(node.key);
        }

        const items = buildContextMenuItems(node, sideHint);
        if (items.length === 0) return;
        setContextItems(items);
        if (contextMenuRef.current) {
            const nativeEvent = event.originalEvent || event.nativeEvent || event;
            requestAnimationFrame(() => {
                contextMenuRef.current?.show(nativeEvent);
            });
        }
    }, [buildContextMenuItems]);

    // Reusable template for both generic trees
    const formatFileSize = useCallback((bytes) => {
        if (!bytes || bytes === 0) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }, []);

    const createNodeTemplate = useCallback((side) => (node) => {
        const loadingPathsMap = side === 'local' ? localLoadingPaths : remoteLoadingPaths;
        const keysMap = side === 'local' ? localExpandedKeys : remoteExpandedKeys;
        const accentColor = side === 'remote' ? '#58a6ff' : '#3fb950';

        const isLoading = node?.data?.path ? loadingPathsMap[node.data.path] : false;
        const entry = node?.data?.raw || {};
        const isDirectory = node?.data?.type === 'directory';
        const isExpanded = isDirectory && keysMap?.[node.key];
        const isDragTarget = dragOverKey === node.key && isDirectory;

        // Icon: try from data.iconInfo first, then fall back
        const iconInfo = node?.data?.iconInfo;
        const iconColor = iconInfo?.color || node?.style?.['--fs-node-color'] || (isDirectory ? accentColor : '#6e7681');
        const iconClass = isDirectory
            ? isExpanded ? 'pi pi-folder-open' : 'pi pi-folder'
            : (iconInfo?.icon || 'pi pi-file');

        // Format size: raw bytes from remote may come as number, local may also provide size
        const rawSize = typeof entry.size === 'number' ? entry.size : (typeof entry.size === 'string' ? parseInt(entry.size, 10) : null);
        const formattedSize = !isDirectory && rawSize ? formatFileSize(rawSize) : null;

        return (
            <div
                data-id={node.key}
                draggable
                onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/vnd.nodeterm.side', side);
                    e.dataTransfer.setData('text/plain', node.data.path || '');
                    e.dataTransfer.setData('DownloadURL', `application/octet-stream:${node.label}:nodedrop://${node.data.path}`);
                }}
                onDragEnd={() => setDragOverKey(null)}
                onDragEnter={(e) => {
                    if (isDirectory) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverKey(node.key);
                    }
                }}
                onDragLeave={(e) => {
                    if (isDirectory && !e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverKey(prev => prev === node.key ? null : prev);
                    }
                }}
                onContextMenu={(e) => handleContextMenu(e, node, side)}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.25rem 0.4rem',
                    borderRadius: '5px',
                    transition: 'background 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'pointer',
                    minHeight: '28px',
                    background: isDragTarget ? `rgba(${side === 'remote' ? '88,166,255' : '63,185,80'},0.15)` : 'transparent',
                    boxShadow: isDragTarget ? `inset 0 0 0 1px ${side === 'remote' ? '#58a6ff' : '#3fb950'}` : 'none',
                }}
                className={`filesystem-node fs-node-${side}`}
            >
                {/* Icon */}
                <span
                    className={iconClass}
                    style={{
                        color: iconColor,
                        fontSize: '0.8rem',
                        width: '13px',
                        flexShrink: 0,
                        textAlign: 'center'
                    }}
                />

                {/* Name */}
                <span style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#e6edf3',
                    fontSize: '0.82rem',
                    letterSpacing: '0.01em'
                }}>
                    {node.label}
                </span>

                {/* Right side: size pill or spinner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    {formattedSize && (
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#6e7681',
                            background: 'rgba(110,118,129,0.12)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontVariantNumeric: 'tabular-nums'
                        }}>
                            {formattedSize}
                        </span>
                    )}
                    {isLoading && (
                        <ProgressSpinner
                            style={{ width: '10px', height: '10px' }}
                            strokeWidth="3"
                            fill="transparent"
                            animationDuration=".6s"
                        />
                    )}
                </div>
            </div>
        );
    }, [dragOverKey, formatFileSize, handleContextMenu, localLoadingPaths, remoteLoadingPaths, localExpandedKeys, remoteExpandedKeys]);

    const localNodeRenderer = useMemo(() => createNodeTemplate('local'), [createNodeTemplate]);
    const remoteNodeRenderer = useMemo(() => createNodeTemplate('remote'), [createNodeTemplate]);

    const filterHiddenNodes = useCallback((nodesList, isHiddenShown) => {
        if (isHiddenShown) return nodesList;
        return nodesList
            .filter(node => node.data.isRoot || !node.label.startsWith('.'))
            .map(node => {
                if (node.children) {
                    return {
                        ...node,
                        children: filterHiddenNodes(node.children, isHiddenShown)
                    };
                }
                return node;
            });
    }, []);

    const filteredLocalNodes = useMemo(() => filterHiddenNodes(localNodes, showHidden), [localNodes, showHidden, filterHiddenNodes]);
    const filteredRemoteNodes = useMemo(() => filterHiddenNodes(remoteNodes, showHidden), [remoteNodes, showHidden, filterHiddenNodes]);

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
                            <button
                                className={`ssh-monitor-action-btn ${showHidden ? 'active' : ''}`}
                                onClick={() => {
                                    const next = !showHidden;
                                    setShowHidden(next);
                                    localStorage.setItem('ssh_file_explorer_show_hidden', next ? 'true' : 'false');
                                }}
                                title={showHidden ? "Ocultar archivos ocultos" : "Mostrar archivos ocultos"}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: showHidden ? '#58a6ff' : '#8b949e',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '12px'
                                }}
                            >
                                <i className={`pi ${showHidden ? 'pi-eye' : 'pi-eye-slash'}`} style={{ fontSize: '13px' }} />
                            </button>
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

                {/* ── Dual Pane Content ─────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

                    {/* Remote Pane - LEFT */}
                    <div
                        style={{ flex: 1, overflowY: 'auto', padding: '0', position: 'relative', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column' }}
                        className="ssh-file-explorer-content remote-pane"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'remote')}
                    >
                        {/* Pane Header */}
                        <div style={{
                            padding: '10px 14px 8px',
                            borderBottom: '1px solid #21262d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: 'rgba(88,166,255,0.05)',
                            flexShrink: 0
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#58a6ff', flexShrink: 0 }} />
                            <i className="pi pi-server" style={{ fontSize: '0.7rem', color: '#58a6ff' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#58a6ff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Remoto</span>
                            <span style={{ fontSize: '0.7rem', color: '#6e7681', marginLeft: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tab?.nodeData?.host || sshConfig?.host || ''}
                            </span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            {globalLoading && remoteNodes.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <ProgressSpinner style={{ width: '36px', height: '36px' }} strokeWidth="3" fill="transparent" animationDuration=".5s" />
                                </div>
                            ) : (
                                <Tree
                                    value={filteredRemoteNodes}
                                    expandedKeys={remoteExpandedKeys}
                                    onToggle={handleRemoteToggle}
                                    selectionMode="single"
                                    selectionKeys={remoteSelectedKey}
                                    onSelectionChange={(e) => setRemoteSelectedKey(e.value)}
                                    className="ssh-monitor-tree"
                                    loading={globalLoading}
                                    nodeTemplate={remoteNodeRenderer}
                                    style={{ background: 'transparent', border: 'none', color: '#e6edf3' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Local Pane - RIGHT */}
                    <div
                        style={{ flex: 1, overflowY: 'auto', padding: '0', position: 'relative', display: 'flex', flexDirection: 'column' }}
                        className="ssh-file-explorer-content local-pane"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'local')}
                    >
                        {/* Pane Header */}
                        <div style={{
                            padding: '10px 14px 8px',
                            borderBottom: '1px solid #21262d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: 'rgba(63,185,80,0.05)',
                            flexShrink: 0
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3fb950', flexShrink: 0 }} />
                            <i className="pi pi-desktop" style={{ fontSize: '0.7rem', color: '#3fb950' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3fb950', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Local</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            {globalLoading && localNodes.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <ProgressSpinner style={{ width: '36px', height: '36px' }} strokeWidth="3" fill="transparent" animationDuration=".5s" />
                                </div>
                            ) : (
                                <Tree
                                    value={filteredLocalNodes}
                                    expandedKeys={localExpandedKeys}
                                    onToggle={handleLocalToggle}
                                    selectionMode="single"
                                    selectionKeys={localSelectedKey}
                                    onSelectionChange={(e) => setLocalSelectedKey(e.value)}
                                    className="ssh-monitor-tree"
                                    loading={globalLoading}
                                    nodeTemplate={localNodeRenderer}
                                    style={{ background: 'transparent', border: 'none', color: '#e6edf3' }}
                                />
                            )}
                        </div>
                    </div>
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
