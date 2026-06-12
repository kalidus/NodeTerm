import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ProgressBar } from 'primereact/progressbar';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import '../styles/ssh-monitor.css';

const getSyncPath = (fromSide, currentPathA, newPathA, currentPathB) => {
    if (!currentPathA || !newPathA || !currentPathB) return null;
    const sepA = fromSide === 'remote' ? '/' : (currentPathA.includes('\\') ? '\\' : '/');
    const sepB = fromSide === 'remote' ? (currentPathB.includes('\\') ? '\\' : '/') : '/';

    const normA_curr = currentPathA.endsWith(sepA) && currentPathA.length > 1 && !currentPathA.endsWith(':\\') ? currentPathA.slice(0, -1) : currentPathA;
    const normA_new = newPathA.endsWith(sepA) && newPathA.length > 1 && !newPathA.endsWith(':\\') ? newPathA.slice(0, -1) : newPathA;
    const normB_curr = currentPathB.endsWith(sepB) && currentPathB.length > 1 && !currentPathB.endsWith(':\\') ? currentPathB.slice(0, -1) : currentPathB;

    const getParentPath = (p, sep) => {
        let temp = p;
        if (temp.endsWith(sep) && temp.length > 1) temp = temp.slice(0, -1);
        const idx = temp.lastIndexOf(sep);
        if (idx < 0) return null;
        const res = temp.substring(0, idx === 2 && temp.includes(':') ? 3 : (idx === 0 ? 1 : idx));
        return res;
    };

    // 1. Check if going UP
    const parentA = getParentPath(normA_curr, sepA);
    if (parentA && normA_new === parentA) {
        return getParentPath(normB_curr, sepB);
    }

    // 2. Check if going DOWN (entering a subfolder)
    if (normA_new.startsWith(normA_curr)) {
        let rel = normA_new.substring(normA_curr.length);
        if (rel.startsWith(sepA)) rel = rel.substring(1);
        
        const relB = rel.split(sepA).join(sepB);
        return normB_curr.endsWith(sepB) ? `${normB_curr}${relB}` : `${normB_curr}${sepB}${relB}`;
    }

    return null;
};

const SSHFileExplorerPanel = ({ tabId, tab, sshConfig, onClose }) => {
    // ---- Remote State ----
    const [remoteNodes, setRemoteNodes] = useState([]);
    const [remoteExpandedKeys, setRemoteExpandedKeys] = useState({});
    const [remoteSelectedKey, setRemoteSelectedKey] = useState(null);
    const [remoteSelectedKeys, setRemoteSelectedKeys] = useState(new Set()); // multi-select
    const [remoteLoadingPaths, setRemoteLoadingPaths] = useState({});
    const remoteLastClickedKey = useRef(null);

    // ---- Local State ----
    const [localNodes, setLocalNodes] = useState([]);
    const [localExpandedKeys, setLocalExpandedKeys] = useState({});
    const [localSelectedKey, setLocalSelectedKey] = useState(null);
    const [localSelectedKeys, setLocalSelectedKeys] = useState(new Set()); // multi-select
    const [localLoadingPaths, setLocalLoadingPaths] = useState({});
    const localLastClickedKey = useRef(null);

    // ---- Current Path Tracking ----
    const [remoteCurrentPath, setRemoteCurrentPath] = useState(null);
    const [localCurrentPath, setLocalCurrentPath] = useState(null);

    const [tempRemotePath, setTempRemotePath] = useState('');
    const [tempLocalPath, setTempLocalPath] = useState('');

    useEffect(() => {
        setTempRemotePath(remoteCurrentPath || '');
    }, [remoteCurrentPath]);

    useEffect(() => {
        setTempLocalPath(localCurrentPath || '');
    }, [localCurrentPath]);

    const [syncNavigation, setSyncNavigation] = useState(() => {
        return localStorage.getItem('ssh_file_explorer_sync_navigation') === 'true';
    });

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
        return saved === 'true';
    });

    // ---- Transfer Progress State ----
    const [activeTransfer, setActiveTransfer] = useState(null);
    // { type, fileName, transferred, total, speed, eta, startTime, active }

    // Use a stable key based on the host/user to persist history across sessions
    const storageKey = useMemo(() => {
        if (sshConfig && sshConfig.host) {
            return `ssh_transfer_log_${sshConfig.host}_${sshConfig.username || 'root'}`;
        }
        return `ssh_transfer_log_${tabId}`;
    }, [sshConfig, tabId]);

    const [transferLog, setTransferLog] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            return (Array.isArray(parsed) ? parsed : []).map(entry => ({
                ...entry,
                timestamp: entry.timestamp ? new Date(entry.timestamp) : null
            }));
        } catch (e) {
            return [];
        }
    });
    // [{ id, type, fileName, size, speed, duration, success, error, timestamp }]
    const [showTransferLog, setShowTransferLog] = useState(false);
    const [transferStationHeight, setTransferStationHeight] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_transfer_station_height');
        if (!saved) return null;
        const parsed = parseInt(saved, 10);
        return Number.isFinite(parsed) ? Math.max(96, Math.min(parsed, 620)) : null;
    });
    const [transferLogHeight, setTransferLogHeight] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_log_height');
        const parsed = saved ? parseInt(saved, 10) : 160;
        return Number.isFinite(parsed) ? Math.max(72, Math.min(parsed, 520)) : 160;
    });
    const [showTransferStationManual, setShowTransferStationManual] = useState(() => {
        const saved = localStorage.getItem('ssh_file_explorer_show_transfer_station');
        return saved !== 'false';
    });
    const [operationStatus, setOperationStatus] = useState(null);
    const [pausedTransfer, setPausedTransfer] = useState(null);
    // { message: string, loading: boolean }

    // Refs for speed/timing (avoid stale closures)
    const activeTransferMetaRef = useRef(null);
    const transferStartTimeRef = useRef(null);
    const lastProgressTimeRef = useRef(null);
    const lastProgressBytesRef = useRef(0);
    const logResizeStateRef = useRef({ active: false, startY: 0, startHeight: 160 });
    const transferStationResizeStateRef = useRef({ active: false, startY: 0, startHeight: 190 });

    const panelLeftRef = useRef(panelLeft);
    const resizeStateRef = useRef({ isResizing: false, startX: 0, startLeftPx: 0, parentWidth: 0 });

    const notify = useCallback((severity, summary, detailMessage) => {
        if (window.toast && window.toast.current) {
            window.toast.current.show({ severity, summary, detail: detailMessage, life: 4000 });
        } else {
            console[severity === 'error' ? 'error' : 'log']('[SSHFileExplorer]', summary, detailMessage);
        }
    }, []);

    // ---- Transfer helpers ----
    const formatSpeed = useCallback((bytesPerSec) => {
        if (!bytesPerSec || bytesPerSec <= 0) return '';
        if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
        if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }, []);

    const formatETA = useCallback((seconds) => {
        if (!seconds || seconds <= 0) return '';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }, []);

    const formatDuration = useCallback((seconds) => {
        if (!seconds || seconds <= 0) return '<1s';
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    }, []);

    const startTransfer = useCallback((type, fileName, totalSize = 0, transferMeta = {}) => {
        const now = Date.now();
        const generatedId = transferMeta.transferId || `${tabId || 'tab'}-${type}-${now}-${Math.floor(Math.random() * 10000)}`;
        transferStartTimeRef.current = now;
        lastProgressTimeRef.current = now;
        lastProgressBytesRef.current = 0;
        activeTransferMetaRef.current = { type, fileName, total: totalSize, startTime: now, ...transferMeta, transferId: generatedId };
        setActiveTransfer({
            type, fileName, transferred: 0, total: totalSize,
            speed: 0, eta: 0, startTime: now, active: true,
            status: 'running',
            transferId: generatedId,
            localPath: transferMeta.localPath || null,
            remotePath: transferMeta.remotePath || null
        });
        // Auto-show when transfer starts
        setShowTransferStationManual(true);
        return generatedId;
    }, [tabId]);

    const completeTransfer = useCallback((success, errorMsg = null, status = 'finished') => {
        const meta = activeTransferMetaRef.current;
        if (meta) {
            const duration = (Date.now() - meta.startTime) / 1000;
            const avgSpeed = duration > 0 && meta.total > 0 ? meta.total / duration : 0;
            setTransferLog(log => [{
                id: Date.now(),
                type: meta.type,
                fileName: meta.fileName,
                size: meta.total,
                speed: avgSpeed,
                duration,
                success,
                status,
                error: errorMsg,
                timestamp: new Date()
            }, ...log].slice(0, 50));
        }
        activeTransferMetaRef.current = null;
        transferStartTimeRef.current = null;
        lastProgressTimeRef.current = null;
        lastProgressBytesRef.current = 0;
        setActiveTransfer(null);
    }, []);

    const cancelTransferById = useCallback(async (transferId) => {
        if (!transferId) return;
        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;
        try {
            await invoke('ssh:cancel-transfer', { transferId });
        } catch (_) {
            // Si falla, igualmente liberamos estado local
        }
    }, []);

    const handleCancelActiveTransfer = useCallback(async () => {
        if (!activeTransfer) return;
        await cancelTransferById(activeTransfer.transferId);
        completeTransfer(false, 'Cancelada por usuario', 'cancelled');
        notify('warn', 'Transferencia cancelada', 'Se canceló la transferencia activa.');
    }, [activeTransfer, cancelTransferById, completeTransfer, notify]);

    const handlePauseActiveTransfer = useCallback(async () => {
        if (!activeTransfer) return;
        setPausedTransfer({ ...activeTransfer });
        await cancelTransferById(activeTransfer.transferId);
        completeTransfer(false, 'Pausada por usuario', 'paused');
        notify('info', 'Transferencia pausada', 'Pulsa reanudar para relanzar la transferencia.');
    }, [activeTransfer, cancelTransferById, completeTransfer, notify]);

    const handleResumePausedTransfer = useCallback(async () => {
        if (!pausedTransfer) return;
        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;
        const nextId = startTransfer(
            pausedTransfer.type,
            pausedTransfer.fileName,
            pausedTransfer.total || 0,
            { localPath: pausedTransfer.localPath, remotePath: pausedTransfer.remotePath }
        );
        try {
            let result;
            if (pausedTransfer.type === 'upload') {
                result = await invoke('ssh:upload-file', {
                    tabId,
                    localPath: pausedTransfer.localPath,
                    remotePath: pausedTransfer.remotePath,
                    sshConfig,
                    transferId: nextId
                });
            } else {
                result = await invoke('ssh:download-file', {
                    tabId,
                    remotePath: pausedTransfer.remotePath,
                    localPath: pausedTransfer.localPath,
                    sshConfig,
                    transferId: nextId
                });
            }
            if (result?.success) {
                completeTransfer(true);
                notify('success', 'Transferencia reanudada', 'Finalizada correctamente.');
            } else {
                completeTransfer(false, result?.error || 'No se pudo reanudar');
                notify('error', 'Error al reanudar', result?.error || 'No se pudo relanzar la transferencia');
            }
        } catch (error) {
            completeTransfer(false, error?.message || 'No se pudo reanudar');
            notify('error', 'Error al reanudar', error?.message || 'No se pudo relanzar la transferencia');
        } finally {
            setPausedTransfer(null);
        }
    }, [pausedTransfer, startTransfer, tabId, sshConfig, completeTransfer, notify]);
    
    // Persistence: Save log to localStorage whenever it changes
    useEffect(() => {
        if (storageKey && Array.isArray(transferLog)) {
            localStorage.setItem(storageKey, JSON.stringify(transferLog));
        }
    }, [transferLog, storageKey]);

    // ---- IPC Progress Listener ----
    useEffect(() => {
        const ipc = window.electron?.ipcRenderer;
        if (!ipc?.on) return;

        const handleProgress = (data) => {
            if (!data) return;
            // Filtrar por tabId solo si ambos existen y son distintos
            if (data.tabId != null && tabId != null && String(data.tabId) !== String(tabId)) return;

            const rcvTotal = Number(data.total) || 0;
            const rcvTransferred = Number(data.transferred) || 0;
            const rcvSpeed = Number(data.speed) || 0;

            // Actualizar ref de meta con total si mejora
            if (activeTransferMetaRef.current && rcvTotal > (activeTransferMetaRef.current.total || 0)) {
                activeTransferMetaRef.current.total = rcvTotal;
            }

            // Calcular velocidad instantánea en frontend si el backend no la reporta
            const now = Date.now();
            let speed = rcvSpeed;
            if (!speed && lastProgressTimeRef.current) {
                const dt = (now - lastProgressTimeRef.current) / 1000;
                const db = rcvTransferred - lastProgressBytesRef.current;
                if (dt > 0 && db > 0) speed = db / dt;
            }
            lastProgressTimeRef.current = now;
            lastProgressBytesRef.current = rcvTransferred;

            const eta = speed > 0 && rcvTotal > rcvTransferred
                ? (rcvTotal - rcvTransferred) / speed : 0;

            setActiveTransfer(prev => ({
                type: data.type || prev?.type || 'upload',
                fileName: data.fileName || prev?.fileName || '',
                transferred: rcvTransferred,
                total: rcvTotal > 0 ? rcvTotal : (prev?.total || 0),
                speed,
                eta,
                startTime: prev?.startTime || now,
                active: true,
                status: prev?.status || 'running',
                transferId: data.transferId || prev?.transferId || null,
                localPath: prev?.localPath || null,
                remotePath: prev?.remotePath || null
            }));
        };

        const unsubscribe = ipc.on('ssh:transfer-progress', handleProgress);
        return typeof unsubscribe === 'function' ? unsubscribe : undefined;
    }, [tabId]);

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
        let found = false;
        // Required for deep clone to trigger prime react re-renders safely
        const cloneTree = (nodesToClone) => {
            return nodesToClone.map(node => {
                if (node?.data?.path === targetPath) {
                    found = true;
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
        const updated = cloneTree(tree);
        if (!found) {
            // If the folder we just loaded wasn't in our tree, add it as a new root node
            // This is essential for navigating "Up" beyond the initial root set.
            return [
                ...updated,
                {
                    key: makeKey(targetPath),
                    label: targetPath,
                    data: { path: targetPath, type: 'directory', parentPath: null, isRoot: true },
                    icon: 'pi pi-folder',
                    children: childrenNodes,
                    leaf: childrenNodes.length === 0
                }
            ];
        }
        return updated;
    }, [makeKey]);

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

    const localToTreeNode = useCallback((entry, parentPath) => {
        // Helper to mimic Windows path joining
        const localJoinPath = (base, name) => {
            const sep = base.includes('\\') ? '\\' : '/';
            if (base.endsWith(sep)) return `${base}${name}`;
            return `${base}${sep}${name}`;
        };

        const fullPath = localJoinPath(parentPath, entry.name);
        const isDir = entry.type === 'directory';
        const extension = !isDir && entry.name.includes('.') ? entry.name.split('.').pop().toLowerCase() : null;
        const iconInfo = !isDir && extension ? FILE_ICON_MAP[extension] : null;

        return {
            key: makeKey(fullPath),
            label: entry.name,
            data: {
                path: fullPath,
                type: isDir ? 'directory' : 'file',
                parentPath,
                raw: entry,
                iconInfo
            },
            style: iconInfo?.color ? { '--fs-node-color': iconInfo.color } : undefined,
            leaf: !isDir,
            droppable: isDir,
            children: isDir ? undefined : undefined
        };
    }, [FILE_ICON_MAP, makeKey]);

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
                const children = entries.map(entry => localToTreeNode(entry, path));

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
    }, [localToTreeNode, makeKey, notify, setLoadingForLocalPath, sortEntries, updateNodeChildren]);

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

    const handleNavigate = useCallback((path, side, isSync = false) => {
        if (!path) return;
        if (side === 'local') {
            setLocalCurrentPath(path);
            setLocalSelectedKey(null);
            const node = findNodeByKey(localNodes, makeKey(path));
            if (!node || !node.children || node.children.length === 0) {
                loadLocalDirectory(path);
            }

            if (syncNavigation && !isSync && remoteCurrentPath) {
                const syncPath = getSyncPath('local', localCurrentPath, path, remoteCurrentPath);
                if (syncPath) {
                    handleNavigate(syncPath, 'remote', true);
                }
            }
        } else {
            setRemoteCurrentPath(path);
            setRemoteSelectedKey(null);
            const node = findNodeByKey(remoteNodes, makeKey(path));
            if (!node || !node.children || node.children.length === 0) {
                loadRemoteDirectory(path);
            }

            if (syncNavigation && !isSync && localCurrentPath) {
                const syncPath = getSyncPath('remote', remoteCurrentPath, path, localCurrentPath);
                if (syncPath) {
                    handleNavigate(syncPath, 'local', true);
                }
            }
        }
    }, [localNodes, remoteNodes, findNodeByKey, loadLocalDirectory, loadRemoteDirectory, makeKey, syncNavigation, localCurrentPath, remoteCurrentPath]);

    // Initial load: get HOME directory (remote and local)
    useEffect(() => {
        const initSystems = async () => {
            try {
                setGlobalLoading(true);
                const invoke = window.electron?.ipcRenderer?.invoke;
                const localFs = window.electron?.localFs;
                if (!invoke || !localFs) return;

                // Load saved default paths if any
                const pathsKey = sshConfig && sshConfig.host 
                    ? `ssh_explorer_default_paths_${sshConfig.host}_${sshConfig.username || 'root'}` 
                    : `ssh_explorer_default_paths_${tabId}`;
                
                let savedPaths = null;
                try {
                    const saved = localStorage.getItem(pathsKey);
                    if (saved) {
                        savedPaths = JSON.parse(saved);
                    }
                } catch (e) {
                    console.error('Error loading default paths', e);
                }

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

                    let initialRemotePath = homePath;
                    if (savedPaths?.remotePath) {
                        initialRemotePath = savedPaths.remotePath;
                        if (initialRemotePath !== homePath && initialRemotePath !== '/') {
                            rNodes.push({
                                key: makeKey(initialRemotePath),
                                label: initialRemotePath,
                                data: { path: initialRemotePath, type: 'directory', parentPath: null, isRoot: true },
                                icon: 'pi pi-star-fill', droppable: true, leaf: false, children: []
                            });
                        }
                    }

                    setRemoteNodes(rNodes);
                    setRemoteCurrentPath(initialRemotePath);
                    await loadRemoteDirectory(initialRemotePath, { keepExpanded: true });
                }

                // 2. Initialize Local
                const localResult = await localFs.getHomeDirectory();
                const localDrivesResult = await localFs.getDrives();

                const lNodes = [];
                let homeDir = null;

                if (localResult && localResult.success && localResult.home) {
                    homeDir = localResult.home;
                    lNodes.push({
                        key: makeKey(homeDir),
                        label: `HOME (${homeDir})`,
                        data: { path: homeDir, type: 'directory', parentPath: null, isRoot: true },
                        icon: 'pi pi-home', droppable: true, leaf: false, children: []
                    });
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

                let initialLocalPath = homeDir || (lNodes.length > 0 ? lNodes[0].data.path : null);
                if (savedPaths?.localPath) {
                    initialLocalPath = savedPaths.localPath;
                    const exists = lNodes.some(n => n.data.path.toLowerCase() === initialLocalPath.toLowerCase());
                    if (!exists) {
                        lNodes.push({
                            key: makeKey(initialLocalPath),
                            label: initialLocalPath,
                            data: { path: initialLocalPath, type: 'directory', parentPath: null, isRoot: true },
                            icon: 'pi pi-star-fill', droppable: true, leaf: false, children: []
                        });
                    }
                }

                setLocalNodes(lNodes);

                if (initialLocalPath) {
                    setLocalCurrentPath(initialLocalPath);
                    await loadLocalDirectory(initialLocalPath, { keepExpanded: true });
                }
            } catch (error) {
                notify('error', 'Error de inicialización', error?.message || 'Error al conectar las unidades');
            } finally {
                setGlobalLoading(false);
            }
        };
        initSystems();
    }, [tabId, sshConfig, loadRemoteDirectory, loadLocalDirectory, makeKey, notify]);

    const handleSaveDefaultPaths = useCallback(() => {
        if (!remoteCurrentPath || !localCurrentPath) {
            notify('warn', 'Rutas no disponibles', 'Ambas rutas (local y remota) deben estar cargadas para guardarse.');
            return;
        }

        const pathsKey = sshConfig && sshConfig.host 
            ? `ssh_explorer_default_paths_${sshConfig.host}_${sshConfig.username || 'root'}` 
            : `ssh_explorer_default_paths_${tabId}`;
            
        localStorage.setItem(pathsKey, JSON.stringify({
            remotePath: remoteCurrentPath,
            localPath: localCurrentPath
        }));

        notify('success', 'Predeterminado guardado', 'Se han guardado las rutas actuales como predeterminadas.');
    }, [remoteCurrentPath, localCurrentPath, sshConfig, tabId, notify]);

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
        // Allow resizing from 2% to 98% of the screen width
        const newLeftPx = Math.max(parentWidth * 0.02, Math.min(parentWidth * 0.98, startLeftPx + deltaX));
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
            document.removeEventListener('mousemove', handleTransferLogResizeMove);
            document.removeEventListener('mouseup', handleTransferLogResizeUp);
            document.removeEventListener('mousemove', handleTransferStationResizeMove);
            document.removeEventListener('mouseup', handleTransferStationResizeUp);
        };
    }, [handleMouseMoveResizer, handleMouseUpResizer, handleTransferLogResizeMove, handleTransferLogResizeUp, handleTransferStationResizeMove, handleTransferStationResizeUp]);

    const handleOpacityChange = (e) => {
        const val = parseFloat(e.target.value);
        setOpacity(val);
        localStorage.setItem('ssh_file_explorer_opacity', val.toString());
    };

    const handleTransferLogResizeMove = useCallback((event) => {
        if (!logResizeStateRef.current.active) return;
        const delta = logResizeStateRef.current.startY - event.clientY;
        const nextHeight = Math.max(72, Math.min(520, logResizeStateRef.current.startHeight + delta));
        setTransferLogHeight(nextHeight);
    }, []);

    const handleTransferLogResizeUp = useCallback(() => {
        if (!logResizeStateRef.current.active) return;
        logResizeStateRef.current.active = false;
        localStorage.setItem('ssh_file_explorer_log_height', String(transferLogHeight));
        document.removeEventListener('mousemove', handleTransferLogResizeMove);
        document.removeEventListener('mouseup', handleTransferLogResizeUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }, [handleTransferLogResizeMove, transferLogHeight]);

    const handleTransferLogResizeDown = useCallback((event) => {
        event.preventDefault();
        logResizeStateRef.current = {
            active: true,
            startY: event.clientY,
            startHeight: transferLogHeight
        };
        document.addEventListener('mousemove', handleTransferLogResizeMove);
        document.addEventListener('mouseup', handleTransferLogResizeUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
    }, [handleTransferLogResizeMove, handleTransferLogResizeUp, transferLogHeight]);

    const handleTransferStationResizeMove = useCallback((event) => {
        if (!transferStationResizeStateRef.current.active) return;
        const delta = transferStationResizeStateRef.current.startY - event.clientY;
        const nextHeight = Math.max(96, Math.min(620, transferStationResizeStateRef.current.startHeight + delta));
        setTransferStationHeight(nextHeight);
    }, []);

    const handleTransferStationResizeUp = useCallback(() => {
        if (!transferStationResizeStateRef.current.active) return;
        transferStationResizeStateRef.current.active = false;
        localStorage.setItem('ssh_file_explorer_transfer_station_height', String(transferStationHeight));
        document.removeEventListener('mousemove', handleTransferStationResizeMove);
        document.removeEventListener('mouseup', handleTransferStationResizeUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }, [handleTransferStationResizeMove, transferStationHeight]);

    const handleTransferStationResizeDown = useCallback((event) => {
        event.preventDefault();
        const station = event.currentTarget.closest('.transfer-station');
        const currentHeight = transferStationHeight ?? station?.getBoundingClientRect()?.height ?? 190;
        transferStationResizeStateRef.current = {
            active: true,
            startY: event.clientY,
            startHeight: currentHeight
        };
        document.addEventListener('mousemove', handleTransferStationResizeMove);
        document.addEventListener('mouseup', handleTransferStationResizeUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
    }, [handleTransferStationResizeMove, handleTransferStationResizeUp, transferStationHeight]);

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

            const transferId = startTransfer('download', targetNode.label, 0, {
                remotePath: targetNode.data.path,
                localPath: result.filePath
            });
            const downloadResult = await invoke('ssh:download-file', {
                tabId,
                remotePath: targetNode.data.path,
                localPath: result.filePath,
                sshConfig,
                transferId
            });

            if (downloadResult && downloadResult.success) {
                completeTransfer(true);
                notify('success', 'Descarga completada', `Guardado en: ${result.filePath}`);
            } else {
                const errMsg = downloadResult?.error || 'No se pudo descargar el archivo';
                completeTransfer(false, errMsg);
                notify('error', 'Error en la descarga', errMsg);
            }
        } catch (error) {
            const errMsg = error?.message || 'No se pudo descargar el archivo';
            completeTransfer(false, errMsg);
            notify('error', 'Error en la descarga', errMsg);
        }
    }, [getActiveContext, localSelectedKey, remoteSelectedKey, notify, sshConfig, tabId, startTransfer, completeTransfer]);

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

            let successCount = 0;
            let failCount = 0;

            for (const localPath of result.filePaths) {
                const fileName = localPath.split(/[/\\]/).pop();
                const remotePath = joinPath(baseDir, fileName);

                const transferId = startTransfer('upload', fileName, 0, { localPath, remotePath });
                const uploadResult = await invoke('ssh:upload-file', {
                    tabId, localPath, remotePath, sshConfig, transferId
                });

                if (uploadResult && uploadResult.success) {
                    completeTransfer(true);
                    successCount++;
                } else {
                    const errMsg = uploadResult?.error || 'Error desconocido';
                    completeTransfer(false, errMsg);
                    failCount++;
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
            completeTransfer(false, error?.message);
            notify('error', 'Error en la subida', error?.message || 'No se pudo subir los archivos');
        }
    }, [getActiveContext, joinPath, loadRemoteDirectory, localSelectedKey, notify, remoteSelectedKey, sshConfig, tabId, startTransfer, completeTransfer]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    // ────────────────────────────────────────────────────────────────
    // Multi-selection click handler (Ctrl+Click toggle, Shift+Click range, plain click single)
    // ────────────────────────────────────────────────────────────────
    const handleNodeClick = useCallback((e, node, side, activeNodes) => {
        const setKeys = side === 'local' ? setLocalSelectedKeys : setRemoteSelectedKeys;
        const setSingle = side === 'local' ? setLocalSelectedKey : setRemoteSelectedKey;
        const lastRef = side === 'local' ? localLastClickedKey : remoteLastClickedKey;
        const currentKeys = side === 'local' ? localSelectedKeys : remoteSelectedKeys;

        if (e.ctrlKey || e.metaKey) {
            const next = new Set(currentKeys);
            if (next.has(node.key)) { next.delete(node.key); } else { next.add(node.key); }
            setKeys(next);
            setSingle(node.key);
            lastRef.current = node.key;
        } else if (e.shiftKey && lastRef.current && activeNodes?.length) {
            const keys = activeNodes.map(n => n.key);
            const fromIdx = keys.indexOf(lastRef.current);
            const toIdx = keys.indexOf(node.key);
            if (fromIdx !== -1 && toIdx !== -1) {
                const [s, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
                setKeys(new Set(keys.slice(s, end + 1)));
                setSingle(node.key);
            }
        } else {
            setKeys(new Set([node.key]));
            setSingle(node.key);
            lastRef.current = node.key;
        }
    }, [localSelectedKeys, remoteSelectedKeys]);

    // ────────────────────────────────────────────────────────────────
    // Bulk copy cross-panel (local→remote or remote→local)
    // ────────────────────────────────────────────────────────────────
    const handleCopySelectedCrossSide = useCallback(async (fromSide) => {
        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;

        const fromKeys = fromSide === 'local' ? localSelectedKeys : remoteSelectedKeys;
        const fromNodes = fromSide === 'local' ? localNodes : remoteNodes;
        const toPath = fromSide === 'local' ? remoteCurrentPath : localCurrentPath;
        const toSide = fromSide === 'local' ? 'remote' : 'local';

        if (fromKeys.size === 0) {
            notify('warn', 'Sin selección', `Selecciona archivos en el panel ${fromSide === 'local' ? 'local' : 'remoto'} primero.`);
            return;
        }
        if (!toPath) { notify('warn', 'Sin destino', 'Navega a una carpeta en el panel destino.'); return; }

        let ok = 0; let fail = 0;
        for (const key of fromKeys) {
            const node = findNodeByKey(fromNodes, key);
            if (!node?.data?.path) continue;
            try {
                if (fromSide === 'local') {
                    const rPath = joinPath(toPath, node.label);
                    const transferId = startTransfer('upload', node.label, 0, { localPath: node.data.path, remotePath: rPath });
                    const res = await invoke('ssh:upload-file', { tabId, localPath: node.data.path, remotePath: rPath, sshConfig, transferId });
                    if (res?.success) { completeTransfer(true); ok++; }
                    else { completeTransfer(false, res?.error); fail++; }
                } else {
                    const sep = toPath.includes('\\') ? '\\' : '/';
                    const lPath = toPath.endsWith(sep) ? `${toPath}${node.label}` : `${toPath}${sep}${node.label}`;
                    const transferId = startTransfer('download', node.label, 0, { remotePath: node.data.path, localPath: lPath });
                    const res = await invoke('ssh:download-file', { tabId, remotePath: node.data.path, localPath: lPath, sshConfig, transferId });
                    if (res?.success) { completeTransfer(true); ok++; }
                    else { completeTransfer(false, res?.error); fail++; }
                }
            } catch (err) { completeTransfer(false, err?.message); fail++; }
        }
        if (ok > 0) {
            notify('success', 'Copia completada', `${ok} elemento(s) copiado(s).`);
            if (toSide === 'remote') await loadRemoteDirectory(toPath, { keepExpanded: true });
            else await loadLocalDirectory(toPath, { keepExpanded: true });
        }
        if (fail > 0) notify('error', 'Errores en copia', `${fail} elemento(s) fallaron.`);
    }, [localSelectedKeys, remoteSelectedKeys, localNodes, remoteNodes, localCurrentPath, remoteCurrentPath,
        findNodeByKey, joinPath, loadLocalDirectory, loadRemoteDirectory, notify, sshConfig, tabId,
        startTransfer, completeTransfer]);

    // ────────────────────────────────────────────────────────────────
    // Bulk delete
    // ────────────────────────────────────────────────────────────────
    const handleDeleteSelected = useCallback(async (side) => {
        const invoke = window.electron?.ipcRenderer?.invoke;
        const fromKeys = side === 'local' ? localSelectedKeys : remoteSelectedKeys;
        const fromNodes = side === 'local' ? localNodes : remoteNodes;
        const currentPath = side === 'local' ? localCurrentPath : remoteCurrentPath;
        const loadDir = side === 'local' ? loadLocalDirectory : loadRemoteDirectory;

        if (fromKeys.size === 0) { notify('warn', 'Sin selección', 'Selecciona archivos primero.'); return; }

        if (!window.confirm(`¿Eliminar ${fromKeys.size} elemento(s)?`)) return;

        setGlobalLoading(true);
        let ok = 0; let fail = 0;
        for (const key of fromKeys) {
            const node = findNodeByKey(fromNodes, key);
            if (!node?.data?.path) continue;
            const isDir = node.data.type === 'directory';
            try {
                let res;
                if (side === 'local') {
                    res = await window.electron?.localFs?.deleteFile(node.data.path, isDir);
                } else {
                    res = await invoke('ssh:delete-file', { tabId, remotePath: node.data.path, isDirectory: isDir, sshConfig });
                }
                res?.success ? ok++ : fail++;
            } catch { fail++; }
        }
        if (ok > 0) {
            notify('success', 'Eliminado', `${ok} elemento(s) eliminado(s).`);
            (side === 'local' ? setLocalSelectedKeys : setRemoteSelectedKeys)(new Set());
            if (currentPath) await loadDir(currentPath, { keepExpanded: true });
        }
        if (fail > 0) notify('error', 'Error al eliminar', `${fail} elemento(s) fallaron.`);
        setGlobalLoading(false);
    }, [localSelectedKeys, remoteSelectedKeys, localNodes, remoteNodes, localCurrentPath, remoteCurrentPath,
        findNodeByKey, loadLocalDirectory, loadRemoteDirectory, notify, sshConfig, tabId]);

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
                const transferId = startTransfer('upload', fileName, 0, { localPath: sourcePath, remotePath });
                try {
                    const res = await invoke('ssh:upload-file', {
                        tabId, localPath: sourcePath, remotePath, sshConfig, transferId
                    });
                    if (res?.success) {
                        completeTransfer(true);
                        notify('success', 'Transferencia completada', `Subido: ${fileName}`);
                        await loadRemoteDirectory(destBaseDir, { keepExpanded: true });
                    } else {
                        const errMsg = res?.error || 'No se pudo subir';
                        completeTransfer(false, errMsg);
                        notify('error', 'Error en transferencia', errMsg);
                    }
                } catch (err) {
                    completeTransfer(false, err?.message);
                    notify('error', 'Error en transferencia', err?.message || 'No se pudo subir');
                }
                return;
            }

            // Remote -> Local (Download)
            if (sourceSide === 'remote' && targetSide === 'local') {
                const localFs = window.electron?.localFs;
                if (!localFs) return;

                const localJoinPath = (base, name) => {
                    const sep = base.includes('\\') ? '\\' : '/';
                    if (base.endsWith(sep)) return `${base}${name}`;
                    return `${base}${sep}${name}`;
                };

                const localPath = localJoinPath(destBaseDir, fileName);
                const transferId = startTransfer('download', fileName, 0, { remotePath: sourcePath, localPath });
                try {
                    const res = await invoke('ssh:download-file', {
                        tabId, remotePath: sourcePath, localPath, sshConfig, transferId
                    });
                    if (res?.success) {
                        completeTransfer(true);
                        notify('success', 'Transferencia completada', `Descargado: ${fileName}`);
                        await loadLocalDirectory(destBaseDir, { keepExpanded: true });
                    } else {
                        const errMsg = res?.error || 'No se pudo descargar';
                        completeTransfer(false, errMsg);
                        notify('error', 'Error en transferencia', errMsg);
                    }
                } catch (err) {
                    completeTransfer(false, err?.message);
                    notify('error', 'Error en transferencia', err?.message || 'No se pudo descargar');
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

        let successCount = 0;
        let failCount = 0;

        try {
            for (const file of files) {
                const localPath = file.path;
                if (!localPath) continue;

                const fileName = localPath.split(/[/\\]/).pop();
                const remotePath = joinPath(baseDir, fileName);

                const transferId = startTransfer('upload', fileName, 0, { localPath, remotePath });
                const uploadResult = await invoke('ssh:upload-file', {
                    tabId, localPath, remotePath, sshConfig, transferId
                });

                if (uploadResult && uploadResult.success) {
                    completeTransfer(true);
                    successCount++;
                } else {
                    const errMsg = uploadResult?.error || 'Error desconocido';
                    completeTransfer(false, errMsg);
                    failCount++;
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
            completeTransfer(false, error?.message);
            notify('error', 'Error en la subida', error?.message || 'No se pudo procesar la subida por arrastre');
        }
    }, [findNodeByKey, joinPath, loadLocalDirectory, loadRemoteDirectory, localNodes, localSelectedKey, notify,
        remoteNodes, remoteSelectedKey, sshConfig, tabId, pendingBaseDir, startTransfer, completeTransfer]);

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

    const createNodeTemplate = useCallback((side, activeNodes) => (node) => {
        const loadingPathsMap = side === 'local' ? localLoadingPaths : remoteLoadingPaths;
        const keysMap = side === 'local' ? localExpandedKeys : remoteExpandedKeys;
        const selectedKeysSet = side === 'local' ? localSelectedKeys : remoteSelectedKeys;
        const accentColor = side === 'remote' ? '#58a6ff' : '#3fb950';
        const accentRgb = side === 'remote' ? '88,166,255' : '63,185,80';

        const isLoading = node?.data?.path ? loadingPathsMap[node.data.path] : false;
        const entry = node?.data?.raw || {};
        const isDirectory = node?.data?.type === 'directory';
        const isExpanded = isDirectory && keysMap?.[node.key];
        const isDragTarget = dragOverKey === node.key && isDirectory;
        const isHidden = node.isHidden || entry.isHidden || node.label.startsWith('.');
        const isSelected = selectedKeysSet.has(node.key);

        // Icon: try from data.iconInfo first, then fall back
        const iconInfo = node?.data?.iconInfo;
        const iconColor = iconInfo?.color || node?.style?.['--fs-node-color'] || (isDirectory ? accentColor : '#6e7681');
        const iconClass = isDirectory
            ? isExpanded ? 'pi pi-folder-open' : 'pi pi-folder'
            : (iconInfo?.icon || 'pi pi-file');

        // Format size: raw bytes from remote may come as number, local may also provide size
        const rawSize = typeof entry.size === 'number' ? entry.size : (typeof entry.size === 'string' ? parseInt(entry.size, 10) : null);
        const formattedSize = !isDirectory && rawSize ? formatFileSize(rawSize) : null;

        let bgColor = 'transparent';
        let bsVal = 'none';
        if (isSelected) { bgColor = `rgba(${accentRgb},0.15)`; bsVal = `inset 0 0 0 1px rgba(${accentRgb},0.4)`; }
        if (isDragTarget) { bgColor = `rgba(${accentRgb},0.22)`; bsVal = `inset 0 0 0 1px ${accentColor}`; }

        return (
            <div
                data-id={node.key}
                draggable
                onClick={(e) => handleNodeClick(e, node, side, activeNodes)}
                onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/vnd.nodeterm.side', side);
                    e.dataTransfer.setData('text/plain', node.data.path || '');
                    e.dataTransfer.setData('DownloadURL', `application/octet-stream:${node.label}:nodedrop://${node.data.path}`);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isDirectory) { handleNavigate(node.data.path, side); }
                }}
                onDragEnd={() => setDragOverKey(null)}
                onDragEnter={(e) => {
                    if (isDirectory) { e.preventDefault(); e.stopPropagation(); setDragOverKey(node.key); }
                }}
                onDragLeave={(e) => {
                    if (isDirectory && !e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverKey(prev => prev === node.key ? null : prev);
                    }
                }}
                onContextMenu={(e) => handleContextMenu(e, node, side)}
                style={{
                    display: 'flex', flexDirection: 'row', alignItems: 'center',
                    gap: '0.5rem', width: '100%', padding: '0.25rem 0.4rem',
                    borderRadius: '5px', transition: 'background 0.12s ease, box-shadow 0.12s ease',
                    cursor: 'pointer', minHeight: '28px', opacity: isHidden ? 0.3 : 1,
                    background: bgColor, boxShadow: bsVal,
                }}
                className={`filesystem-node fs-node-${side} ${isHidden ? 'is-hidden-node' : ''} ${isSelected ? 'fs-node-selected' : ''}`}
            >
                <span className={iconClass} style={{ color: iconColor, fontSize: '0.8rem', width: '13px', flexShrink: 0, textAlign: 'center' }} />

                <span style={{
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isSelected ? accentColor : '#e6edf3',
                    fontSize: '0.82rem', letterSpacing: '0.01em',
                    fontWeight: isSelected ? 600 : 400,
                }}>
                    {node.label}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    {formattedSize && (
                        <span style={{ fontSize: '0.65rem', color: '#6e7681', background: 'rgba(110,118,129,0.12)', padding: '1px 5px', borderRadius: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            {formattedSize}
                        </span>
                    )}
                    {isLoading && (
                        <ProgressSpinner style={{ width: '10px', height: '10px' }} strokeWidth="3" fill="transparent" animationDuration=".6s" />
                    )}
                </div>
            </div>
        );
    }, [dragOverKey, formatFileSize, handleContextMenu, handleNavigate, handleNodeClick,
        localLoadingPaths, remoteLoadingPaths, localExpandedKeys, remoteExpandedKeys,
        localSelectedKeys, remoteSelectedKeys]);

    const localNodeRenderer = useMemo(() => createNodeTemplate('local', activeLocalNodes), [createNodeTemplate, activeLocalNodes]);
    const remoteNodeRenderer = useMemo(() => createNodeTemplate('remote', activeRemoteNodes), [createNodeTemplate, activeRemoteNodes]);

    const filterHiddenNodes = useCallback((nodesList, isHiddenShown) => {
        if (!nodesList) return [];

        const applyIsHidden = (nodes) => {
            return nodes.map(node => {
                const entry = node.data?.raw || {};
                const nodeIsHidden = !!(node.isHidden || entry.isHidden || (node.label && node.label.startsWith('.')));

                let children = node.children;
                if (children && children.length > 0) {
                    children = applyIsHidden(children);
                }

                return { ...node, isHidden: nodeIsHidden, children };
            });
        };

        const processed = applyIsHidden(nodesList);

        if (isHiddenShown) {
            return processed;
        }

        return processed.filter(node => node.data?.isRoot || !node.isHidden);
    }, []);

    // Extract strictly the flat children array for the current path
    const getPaneViewNodes = useCallback((nodesList, currentPathStr) => {
        if (!currentPathStr) return [];
        const parentNode = findNodeByKey(nodesList, makeKey(currentPathStr));
        if (!parentNode || !parentNode.children) return [];

        // Return children but modify 'leaf' forcing false to be true so PrimeReact Tree acts as a plain list without expand toggles
        const rawChildren = filterHiddenNodes(parentNode.children, showHidden);
        return rawChildren.map(child => ({
            ...child,
            leaf: true,
            children: undefined // Prevent any rogue expansion
        }));
    }, [findNodeByKey, makeKey, filterHiddenNodes, showHidden]);

    const activeLocalNodes = useMemo(() => getPaneViewNodes(localNodes, localCurrentPath), [localNodes, localCurrentPath, getPaneViewNodes]);
    const activeRemoteNodes = useMemo(() => getPaneViewNodes(remoteNodes, remoteCurrentPath), [remoteNodes, remoteCurrentPath, getPaneViewNodes]);


    const renderPaneToolbar = (side) => {
        const isRemote = side === 'remote';
        const currentPath = isRemote ? remoteCurrentPath : localCurrentPath;
        const tempPath = isRemote ? tempRemotePath : tempLocalPath;
        const setTempPath = isRemote ? setTempRemotePath : setTempLocalPath;
        const nodes = isRemote ? remoteNodes : localNodes;
        const defaultRoot = isRemote ? '/' : 'C:\\';
        const separator = isRemote ? '/' : '\\';
        const accentColor = isRemote ? '#58a6ff' : '#3fb950';

        const handleUpLevel = () => {
            if (!currentPath || currentPath === defaultRoot || currentPath === '/') return;
            let temp = currentPath;
            if (temp.length > 1 && temp.endsWith(separator)) {
                temp = temp.slice(0, -1);
            }
            const lastIndex = temp.lastIndexOf(separator);

            if (isRemote) {
                if (lastIndex <= 0) {
                    handleNavigate('/', 'remote');
                } else {
                    handleNavigate(temp.substring(0, lastIndex), 'remote');
                }
            } else {
                if (lastIndex < 0) return;
                // If it's C:\, we can't go higher
                if (temp.toLowerCase().endsWith(':\\')) {
                    if (temp.length <= 3) return;
                }

                const parent = temp.substring(0, lastIndex === 2 ? 3 : lastIndex);
                handleNavigate(parent, 'local');
            }
        };

        const handleHome = () => {
            const homePath = nodes.length > 0 ? nodes[0].data.path : defaultRoot;
            handleNavigate(homePath, side);
        };

        const handleRefresh = () => {
            if (!currentPath) return;
            const node = findNodeByKey(nodes, makeKey(currentPath));
            if (node) {
                handleRefreshNode(node, side);
            } else {
                if (isRemote) loadRemoteDirectory(currentPath); else loadLocalDirectory(currentPath);
            }
        };

        const handleToggleHidden = () => {
            const next = !showHidden;
            setShowHidden(next);
            localStorage.setItem('ssh_file_explorer_show_hidden', next ? 'true' : 'false');
        };

        const handleNewFolder = () => {
            if (!currentPath) return;
            openCreateFolderDialog({ data: { path: currentPath, type: 'directory' } }, side);
        };

        const selectedKeys = isRemote ? remoteSelectedKeys : localSelectedKeys;

        return (
            <>
                {/* Main toolbar */}
                <div style={{
                    padding: '6px 10px',
                    borderBottom: '1px solid #21262d',
                    background: isRemote ? 'rgba(88,166,255,0.05)' : 'rgba(63,185,80,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                        <i className={isRemote ? "pi pi-server" : "pi pi-desktop"} style={{ fontSize: '0.7rem', color: accentColor }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: accentColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {isRemote ? 'Remoto' : 'Local'}
                        </span>
                    </div>
                    <div style={{ width: '1px', height: '14px', background: '#30363d', margin: '0 2px' }} />
                    <button className="ssh-monitor-action-btn pane-toolbar-btn" onClick={handleToggleHidden} title={showHidden ? "Ocultar ocultos" : "Mostrar ocultos"}>
                        <i className={`pi ${showHidden ? 'pi-eye' : 'pi-eye-slash'}`} />
                    </button>
                    <button className="ssh-monitor-action-btn pane-toolbar-btn" onClick={handleUpLevel} title="Subir nivel">
                        <i className="pi pi-arrow-up" />
                    </button>
                    <button className="ssh-monitor-action-btn pane-toolbar-btn" onClick={handleHome} title="Inicio">
                        <i className="pi pi-home" />
                    </button>
                    <button className="ssh-monitor-action-btn pane-toolbar-btn" onClick={handleNewFolder} title="Nueva carpeta">
                        <i className="pi pi-plus-circle" />
                    </button>
                    <div style={{ flex: 1, margin: '0 4px', display: 'flex', alignItems: 'center', background: 'rgba(13, 17, 23, 0.4)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #30363d' }}>
                        <i className="pi pi-folder-open" style={{ color: '#8b949e', fontSize: '11px', marginRight: '6px' }} />
                        <input
                            type="text"
                            value={tempPath}
                            onChange={(e) => setTempPath(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNavigate(tempPath, side);
                                }
                            }}
                            onBlur={() => {
                                setTempPath(currentPath || '');
                            }}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#e6edf3',
                                fontSize: '0.75rem',
                                fontFamily: 'Consolas, monospace',
                                letterSpacing: '-0.3px',
                                padding: '0',
                                width: '100%'
                            }}
                        />
                    </div>
                    <button className="ssh-monitor-action-btn pane-toolbar-btn" onClick={handleRefresh} title="Actualizar">
                        <i className="pi pi-refresh" />
                    </button>
                </div>

                {/* Selection action bar — only shown when items are selected */}
                {selectedKeys.size > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '3px 10px', borderBottom: '1px solid #21262d',
                        background: isRemote ? 'rgba(88,166,255,0.07)' : 'rgba(63,185,80,0.07)',
                        flexShrink: 0, minHeight: '28px',
                    }}>
                        <span style={{ fontSize: '0.7rem', color: accentColor, fontWeight: 700 }}>
                            {selectedKeys.size} sel.
                        </span>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={() => handleCopySelectedCrossSide(side)}
                            title={`Copiar al panel ${isRemote ? 'local' : 'remoto'}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                                background: `rgba(${isRemote ? '88,166,255' : '63,185,80'},0.15)`,
                                color: accentColor, cursor: 'pointer', transition: 'background 0.12s',
                            }}
                        >
                            <i className={`pi ${isRemote ? 'pi-arrow-right' : 'pi-arrow-left'}`} style={{ fontSize: '12px' }} />
                        </button>
                        <button
                            onClick={() => handleDeleteSelected(side)}
                            title={`Eliminar ${selectedKeys.size} elemento(s)`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                                background: 'rgba(248,81,73,0.12)',
                                color: '#f85149', cursor: 'pointer', transition: 'background 0.12s',
                            }}
                        >
                            <i className="pi pi-trash" style={{ fontSize: '11px' }} />
                        </button>
                        <button
                            onClick={() => (isRemote ? setRemoteSelectedKeys : setLocalSelectedKeys)(new Set())}
                            title="Limpiar selección"
                            style={{
                                display: 'flex', alignItems: 'center', padding: '2px 6px',
                                borderRadius: '5px', border: 'none', background: 'rgba(110,118,129,0.12)',
                                color: '#8b949e', cursor: 'pointer',
                            }}
                        >
                            <i className="pi pi-times" style={{ fontSize: '9px' }} />
                        </button>
                    </div>
                )}
            </>
        );
    };

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
            />

            <div className={`ssh-monitor-panel ${hasMounted || isResizing ? 'no-animation' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

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
                                className="ssh-monitor-transfer-toggle"
                                onClick={handleSaveDefaultPaths}
                                title="Guardar rutas actuales como predeterminadas"
                                style={{ marginRight: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px' }}
                            >
                                <i className="pi pi-bookmark" style={{ fontSize: '12px' }} />
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>Guardar predeterminado</span>
                            </button>

                            <button
                                className={`ssh-monitor-transfer-toggle ${syncNavigation ? 'active' : ''}`}
                                onClick={() => {
                                    const next = !syncNavigation;
                                    setSyncNavigation(next);
                                    localStorage.setItem('ssh_file_explorer_sync_navigation', String(next));
                                    notify('info', next ? 'Navegación sincronizada activa' : 'Navegación sincronizada inactiva', next ? 'Se intentará replicar los cambios de directorio en ambos paneles.' : 'Los paneles se navegarán de forma independiente.');
                                }}
                                title="Habilitar/Deshabilitar Navegación Sincronizada (como FileZilla)"
                                style={{ marginRight: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px' }}
                            >
                                <i className="pi pi-sync" style={{ fontSize: '12px' }} />
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>Navegación sinc.</span>
                            </button>

                            <button
                                className={`ssh-monitor-transfer-toggle ${showTransferStationManual ? 'active' : ''} ${activeTransfer ? 'has-active-transfer' : ''}`}
                                onClick={() => {
                                    const next = !showTransferStationManual;
                                    setShowTransferStationManual(next);
                                    localStorage.setItem('ssh_file_explorer_show_transfer_station', String(next));
                                }}
                                title={showTransferStationManual ? "Ocultar panel de transferencias" : "Mostrar panel de transferencias"}
                                style={{ marginRight: '4px' }}
                            >
                                <i className={`pi ${activeTransfer ? 'pi-spin pi-spinner' : (showTransferStationManual ? 'pi-chevron-down' : 'pi-history')}`} style={{ fontSize: '12px' }} />
                                {activeTransfer && <span style={{ fontSize: '9px', marginLeft: '6px', fontWeight: 700 }}>{Math.min(99, Math.round((activeTransfer.transferred / (activeTransfer.total || 1)) * 100))}%</span>}
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
                        {renderPaneToolbar('remote')}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            {(remoteLoadingPaths[remoteCurrentPath] || globalLoading) && (!activeRemoteNodes || activeRemoteNodes.length === 0) ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <ProgressSpinner style={{ width: '36px', height: '36px' }} strokeWidth="3" fill="transparent" animationDuration=".5s" />
                                </div>
                            ) : (
                                <Tree
                                    value={activeRemoteNodes}
                                    expandedKeys={{}}
                                    selectionMode="single"
                                    selectionKeys={remoteSelectedKey}
                                    onSelectionChange={(e) => setRemoteSelectedKey(e.value)}
                                    className="ssh-monitor-tree list-view-tree"
                                    loading={remoteLoadingPaths[remoteCurrentPath]}
                                    nodeTemplate={remoteNodeRenderer}
                                    emptyMessage=""
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
                        {renderPaneToolbar('local')}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            {(localLoadingPaths[localCurrentPath] || globalLoading) && (!activeLocalNodes || activeLocalNodes.length === 0) ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <ProgressSpinner style={{ width: '36px', height: '36px' }} strokeWidth="3" fill="transparent" animationDuration=".5s" />
                                </div>
                            ) : (
                                <Tree
                                    value={activeLocalNodes}
                                    expandedKeys={{}}
                                    selectionMode="single"
                                    selectionKeys={localSelectedKey}
                                    onSelectionChange={(e) => setLocalSelectedKey(e.value)}
                                    className="ssh-monitor-tree list-view-tree"
                                    loading={localLoadingPaths[localCurrentPath]}
                                    nodeTemplate={localNodeRenderer}
                                    emptyMessage=""
                                    style={{ background: 'transparent', border: 'none', color: '#e6edf3' }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Transfer Station ─────────────────────────────────────── */}
                {showTransferStationManual && (
                    <div
                        className="transfer-station"
                        style={transferStationHeight ? { height: `${transferStationHeight}px` } : undefined}
                    >
                    <div
                        className="transfer-station-resizer"
                        onMouseDown={handleTransferStationResizeDown}
                        title="Arrastra para redimensionar panel de transferencias"
                    />

                    {/* Empty state if nothing is active and no log exists */}
                    {!activeTransfer && transferLog.length === 0 && (
                        <div className="transfer-empty-state">
                            <i className="pi pi-info-circle" style={{ fontSize: '1.2rem', marginBottom: '8px', opacity: 0.5 }} />
                            <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 600 }}>No hay transferencias recientes</span>
                            <span style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '4px' }}>Las subidas y descargas de esta sesión aparecerán aquí</span>
                        </div>
                    )}

                    {/* Active transfer progress */}
                    {activeTransfer && (
                        <div className="transfer-active-block">
                            <div className="transfer-active-header">
                                <span className={`transfer-direction-badge ${activeTransfer.type}`}>
                                    <i className={`pi ${activeTransfer.type === 'upload' ? 'pi-upload' : 'pi-download'}`} />
                                    {activeTransfer.type === 'upload' ? 'SUBIENDO' : 'DESCARGANDO'}
                                </span>
                                <span className="transfer-filename" title={activeTransfer.fileName}>
                                    {activeTransfer.fileName}
                                </span>
                                <span className="transfer-speed">{formatSpeed(activeTransfer.speed) || '0 B/s'}</span>
                                <div className="transfer-actions">
                                    <button
                                        className="transfer-action-btn"
                                        onClick={handlePauseActiveTransfer}
                                        title="Pausar transferencia (reanuda desde cero)"
                                    >
                                        <i className="pi pi-pause" />
                                    </button>
                                    <button
                                        className="transfer-action-btn danger"
                                        onClick={handleCancelActiveTransfer}
                                        title="Cancelar transferencia"
                                    >
                                        <i className="pi pi-stop" />
                                    </button>
                                </div>
                            </div>

                            {activeTransfer.total > 0 ? (
                                <>
                                    <ProgressBar
                                        value={Math.min(100, Math.round((activeTransfer.transferred / activeTransfer.total) * 100))}
                                        className={`transfer-progress-bar ${activeTransfer.type}`}
                                        showValue={false}
                                        style={{ height: '5px', borderRadius: '3px' }}
                                    />
                                    <div className="transfer-stats-row">
                                        <span>{formatFileSize(activeTransfer.transferred)} / {formatFileSize(activeTransfer.total)}</span>
                                        <span className="transfer-pct">
                                            {Math.min(100, Math.round((activeTransfer.transferred / activeTransfer.total) * 100))}%
                                        </span>
                                        {activeTransfer.eta > 1 && (
                                            <span>ETA: {formatETA(activeTransfer.eta)}</span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ProgressBar mode="indeterminate" className={`transfer-progress-bar ${activeTransfer.type}`} style={{ height: '5px', borderRadius: '3px' }} />
                                    <div className="transfer-stats-row">
                                        {activeTransfer.transferred > 0
                                            ? <span>{formatFileSize(activeTransfer.transferred)} transferidos...</span>
                                            : <span>Conectando...</span>
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Log toggle */}
                    {transferLog.length > 0 && (
                        <button
                            className="transfer-log-toggle"
                            onClick={() => setShowTransferLog(p => !p)}
                        >
                            <i className={`pi ${showTransferLog ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                            <span>Historial de transferencias</span>
                            <span className="transfer-log-count">{transferLog.length}</span>
                            <span style={{ flex: 1 }} />
                            {pausedTransfer && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    className="transfer-log-clear-btn"
                                    onClick={(e) => { e.stopPropagation(); handleResumePausedTransfer(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleResumePausedTransfer();
                                        }
                                    }}
                                    title="Reanudar transferencia pausada"
                                >
                                    <i className="pi pi-play" style={{ fontSize: '9px' }} />
                                </span>
                            )}
                            <span
                                role="button"
                                tabIndex={0}
                                className="transfer-log-clear-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferLog(log => log.filter(item => item.success));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTransferLog(log => log.filter(item => item.success));
                                    }
                                }}
                                title="Eliminar transferencias atascadas/fallidas"
                            >
                                <i className="pi pi-filter-slash" style={{ fontSize: '9px' }} />
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                className="transfer-log-clear-btn"
                                onClick={(e) => { e.stopPropagation(); setTransferLog([]); setShowTransferLog(false); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTransferLog([]);
                                        setShowTransferLog(false);
                                    }
                                }}
                                title="Limpiar historial"
                            >
                                <i className="pi pi-trash" style={{ fontSize: '9px' }} />
                            </span>
                        </button>
                    )}

                    {/* Transfer log entries */}
                    {showTransferLog && transferLog.length > 0 && (
                        <>
                        <div
                            className="transfer-log-resizer"
                            onMouseDown={handleTransferLogResizeDown}
                            title="Arrastra para redimensionar historial"
                        />
                        <div className="transfer-log-list" style={{ height: `${transferLogHeight}px` }}>
                            {/* Log Header for better alignment labels */}
                            <div className="transfer-log-header-row">
                                <div /> <div />
                                <span>Archivo</span>
                                <span style={{ textAlign: 'right' }}>Tamaño</span>
                                <span style={{ textAlign: 'right' }}>Velocidad</span>
                                <span style={{ textAlign: 'right' }}>Duración</span>
                                <span style={{ textAlign: 'right' }}>Hora</span>
                            </div>
                            {transferLog.map(entry => (
                                <div key={entry.id} className={`transfer-log-entry ${entry.success ? 'success' : 'error'}`}>
                                    <div className="transfer-log-status-icon">
                                        <i className={`pi ${entry.success ? 'pi-check-circle' : 'pi-times-circle'}`} />
                                    </div>
                                    <div className="transfer-log-dir-icon">
                                        <i className={`pi ${entry.type === 'upload' ? 'pi-upload' : 'pi-download'}`} />
                                    </div>
                                    <span className="transfer-log-name" title={entry.fileName}>{entry.fileName}</span>
                                    {entry.success ? (
                                        <>
                                            <span className="transfer-log-meta-item">{entry.size > 0 ? formatFileSize(entry.size) : '--'}</span>
                                            <span className="transfer-log-meta-item">{entry.speed > 0 ? formatSpeed(entry.speed) : '--'}</span>
                                            <span className="transfer-log-meta-item">{entry.duration > 0 ? formatDuration(entry.duration) : '--'}</span>
                                        </>
                                    ) : (
                                        <span className="transfer-log-error" title={entry.error}>
                                            {entry.error || 'Error'}
                                        </span>
                                    )}
                                    <span className="transfer-log-time">
                                        {entry.timestamp?.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    </div>
                )}
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

        </div >
    );
};

export default SSHFileExplorerPanel;
