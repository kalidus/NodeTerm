import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';
import { Message } from 'primereact/message';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { uiThemes } from '../themes/ui-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';

// Helper para obtener colores del tema
const getThemeColors = (themeName) => {
    const theme = uiThemes[themeName] || uiThemes['Light'];
    return theme?.colors || {};
};

// React Icons - Iconos que SÍ funcionan
import { 
    FaFolder, FaFolderOpen, FaFile, FaFilePdf, FaFileWord, FaFileExcel, 
    FaImage, FaVideo, FaMusic, FaCode, FaGlobe, FaArchive, FaCog, 
    FaDatabase, FaFileAlt, FaArrowUp, FaLink, FaPython, FaJs, FaHtml5,
    FaCss3Alt, FaFileCode, FaChevronRight, FaUpload, FaDownload, FaTrash,
    FaPlus, FaHome, FaSync, FaEye, FaEyeSlash, FaArrowRight, FaEdit
} from 'react-icons/fa';

const FileExplorer = ({ sshConfig, tabId, iconTheme = 'material', explorerFont = 'Segoe UI', explorerColorTheme = 'Light', explorerFontSize = 15 }) => {
    // Hook de internacionalización
    const { t } = useTranslation('common');
    
    // sshConfig puede tener protocol para SFTP/FTP/SCP, o ser SSH tradicional
    const config = sshConfig || {};
    const protocol = config.protocol || 'ssh'; // Por defecto SSH para compatibilidad
    const protocolLabel = protocol.toUpperCase();
    const host = config.host || config.bastionHost || 'Unknown';
    
    const [currentPath, setCurrentPath] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);
    const [error, setError] = useState(null);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameDialog, setRenameDialog] = useState(false);
    const [fileToRename, setFileToRename] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const [transferProgress, setTransferProgress] = useState(null);
    const [sshReady, setSshReady] = useState(false);
    const [showDotfiles, setShowDotfiles] = useState(false);
    const toast = React.useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [homeDir, setHomeDir] = useState(null);
    const [pathInput, setPathInput] = useState('');
    
    const containerRef = React.useRef(null);
    const filesContainerRef = React.useRef(null);

    useEffect(() => {
        setSshReady(true);
    }, []);

    useEffect(() => {
        const initializeExplorer = async () => {
            if (!window.electron || !tabId || !sshReady) return;
            setLoading(true);
            setError(null);
            try {
                const homeResult = await window.electron.fileExplorer.getHomeDirectory(tabId, config);
                const homeDir = (homeResult && homeResult.success && typeof homeResult.home === 'string') ? homeResult.home : '/';
                setHomeDir(homeDir);
                setCurrentPath(homeDir);
            } catch (err) {
                console.error('Error getting home directory:', err);
                setError('No se pudo obtener el directorio home del usuario.');
                setHomeDir('/');
                setCurrentPath('/');
            } finally {
                setLoading(false);
            }
        };
        if (sshReady) {
            initializeExplorer();
        }
    }, [tabId, sshReady, config]);

    useEffect(() => {
        if (currentPath !== null) {
            loadFiles(currentPath);
            setPathInput(currentPath);
        }
    }, [currentPath]);

    // Calcular altura del contenedor de archivos dinámicamente
    useEffect(() => {
        const updateFilesContainerHeight = () => {
            if (containerRef.current && filesContainerRef.current) {
                const container = containerRef.current;
                const filesContainer = filesContainerRef.current;
                
                // Calcular altura disponible restando headers, breadcrumbs, toolbars, etc.
                const headerHeight = container.querySelector('.file-explorer-header')?.offsetHeight || 0;
                const breadcrumbHeight = container.querySelector('.file-explorer-breadcrumb-row')?.offsetHeight || 0;
                const toolbarHeight = container.querySelector('.file-explorer-toolbar')?.offsetHeight || 0;
                const loadingHeight = container.querySelector('.file-explorer-loading')?.offsetHeight || 0;
                const messageHeight = container.querySelector('.p-message')?.offsetHeight || 0;
                const progressHeight = container.querySelector('.transfer-progress-container')?.offsetHeight || 0;
                
                const totalFixedHeight = headerHeight + breadcrumbHeight + toolbarHeight + loadingHeight + messageHeight + progressHeight;
                const containerHeight = container.offsetHeight;
                const availableHeight = containerHeight - totalFixedHeight;
                
                if (availableHeight > 0) {
                    filesContainer.style.height = `${availableHeight}px`;
                    filesContainer.style.maxHeight = `${availableHeight}px`;
                }
            }
        };
        
        // Actualizar altura al montar y cuando cambia el contenido
        updateFilesContainerHeight();
        
        // Actualizar al redimensionar
        const resizeObserver = new ResizeObserver(() => {
            updateFilesContainerHeight();
        });
        
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        
        // También actualizar después de cambios en el DOM
        const timeoutId = setTimeout(updateFilesContainerHeight, 100);
        
        return () => {
            resizeObserver.disconnect();
            clearTimeout(timeoutId);
        };
    }, [files, loading, error, transferProgress, sshReady]);

    const loadFiles = async (path) => {
        if (!window.electron || !tabId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await window.electron.fileExplorer.listFiles(tabId, path, config);
            
            if (result.success) {
                setFiles(result.files);
                updateBreadcrumb(typeof path === 'string' ? path : '/');
            } else {
                setError(result.error || 'Error al cargar archivos');
                setFiles([]);
            }
        } catch (err) {
            console.error('Error loading files:', err);
            setError('Error de conexión al cargar archivos');
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const updateBreadcrumb = (path) => {
        if (typeof path !== 'string') {
            path = '/';
        }
        const pathParts = path.split('/').filter(part => part !== '');
        const items = pathParts.map((part, index) => {
            const fullPath = '/' + pathParts.slice(0, index + 1).join('/');
            return {
                label: part,
                command: () => navigateToPath(fullPath)
            };
        });
        
        // Sin "Root", solo las carpetas del path
        setBreadcrumbItems(items);
    };

    const navigateToPath = async (path) => {
        if (!window.electron || !tabId) return;
        
        try {
            const result = await window.electron.fileExplorer.checkDirectory(tabId, path, config);
            if (result && result.exists) {
                setCurrentPath(path);
            } else {
                setError(`El directorio ${path} no existe o no es accesible`);
            }
        } catch (err) {
            console.error('Error checking directory:', err);
            setError('Error al verificar el directorio');
        }
    };

    const handleNavigateFromInput = () => {
        const trimmedPath = pathInput.trim();
        if (!trimmedPath) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Ruta vacía',
                detail: 'Por favor ingresa una ruta válida',
                life: 3000
            });
            return;
        }
        
        const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
        navigateToPath(normalizedPath);
    };

    const onFileDoubleClick = (file) => {
        if (file.type === 'directory' || (file.type === 'symlink' && file.permissions.startsWith('l') && file.permissions.includes('d'))) {
            if (file.name === '..') {
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                navigateToPath(parentPath);
            } else {
                const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                navigateToPath(newPath);
            }
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (file) => {
        if (file.type === 'directory') {
            return file.name === '..' 
                ? <FaArrowUp className="file-icon directory-icon" />
                : <FaFolder className="file-icon directory-icon" />;
        }
        if (file.type === 'symlink') {
            return <FaLink className="file-icon symlink-icon" />;
        }
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        // Documentos
        if (['pdf'].includes(extension)) {
            return <FaFilePdf className="file-icon file-pdf-icon" />;
        }
        if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(extension)) {
            return <FaFileWord className="file-icon file-doc-icon" />;
        }
        if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) {
            return <FaFileExcel className="file-icon file-excel-icon" />;
        }
        
        // Imágenes
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension)) {
            return <FaImage className="file-icon file-image-icon" />;
        }
        
        // Video
        if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
            return <FaVideo className="file-icon file-video-icon" />;
        }
        
        // Audio
        if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
            return <FaMusic className="file-icon file-audio-icon" />;
        }
        
        // Código específico
        if (['py'].includes(extension)) {
            return <FaPython className="file-icon file-code-icon" />;
        }
        if (['js', 'jsx'].includes(extension)) {
            return <FaJs className="file-icon file-code-icon" />;
        }
        if (['html', 'htm'].includes(extension)) {
            return <FaHtml5 className="file-icon file-web-icon" />;
        }
        if (['css', 'scss', 'sass', 'less'].includes(extension)) {
            return <FaCss3Alt className="file-icon file-web-icon" />;
        }
        
        // Código genérico
        if (['ts', 'tsx', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift'].includes(extension)) {
            return <FaCode className="file-icon file-code-icon" />;
        }
        
        // Web
        if (['json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf'].includes(extension)) {
            return <FaFileCode className="file-icon file-config-icon" />;
        }
        
        // Comprimidos
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
            return <FaArchive className="file-icon file-archive-icon" />;
        }
        
        // Ejecutables
        if (['exe', 'msi', 'deb', 'rpm', 'dmg', 'app', 'sh', 'bat', 'cmd'].includes(extension)) {
            return <FaCog className="file-icon file-executable-icon" />;
        }
        
        // Base de datos
        if (['sql', 'db', 'sqlite', 'mdb'].includes(extension)) {
            return <FaDatabase className="file-icon file-database-icon" />;
        }
        
        // Genérico
        return <FaFile className="file-icon file-generic-icon" />;
    };

    const getFileType = (file) => {
        if (file.type === 'directory') return 'Carpeta';
        if (file.type === 'symlink') return 'Enlace simbólico';
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        const typeMap = {
            'pdf': 'PDF',
            'doc': 'Word', 'docx': 'Word', 'odt': 'Word', 'txt': 'Texto', 'rtf': 'Texto',
            'xls': 'Excel', 'xlsx': 'Excel', 'csv': 'CSV',
            'jpg': 'Imagen', 'jpeg': 'Imagen', 'png': 'Imagen', 'gif': 'Imagen', 'svg': 'SVG',
            'mp4': 'Video', 'avi': 'Video', 'mkv': 'Video',
            'mp3': 'Audio', 'wav': 'Audio',
            'py': 'Python', 'js': 'JavaScript', 'html': 'HTML', 'css': 'CSS',
            'zip': 'Archivo comprimido', 'rar': 'Archivo comprimido',
            'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML'
        };
        
        return typeMap[extension] || 'Archivo';
    };

    // Filtrar archivos ocultos si es necesario
    const filteredFiles = showDotfiles ? files : files.filter(f => !f.name.startsWith('.') || f.name === '..');
    
    // Ordenar: primero carpetas, luego archivos, ambos alfabéticamente
    // ".." siempre va primero si existe
    const visibleFiles = [...filteredFiles].sort((a, b) => {
        // ".." siempre va primero
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        
        // Separar carpetas de archivos
        const aIsDir = a.type === 'directory';
        const bIsDir = b.type === 'directory';
        
        // Si uno es carpeta y el otro no, la carpeta va primero
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        
        // Si ambos son del mismo tipo, ordenar alfabéticamente (case-insensitive)
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });

    const handleUploadFiles = async () => {
        try {
            const result = await window.electron.dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
                title: 'Seleccionar archivos para subir'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                setTransferProgress({ type: 'upload', current: 0, total: result.filePaths.length });
                
                for (let i = 0; i < result.filePaths.length; i++) {
                    const localPath = result.filePaths[i];
                    const fileName = localPath.split(/[\\/]/).pop();
                    const remotePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
                    
                    try {
                        const uploadResult = await window.electron.fileExplorer.uploadFile(tabId, localPath, remotePath, config);
                        if (uploadResult.success) {
                            toast.current?.show({
                                severity: 'success',
                                summary: 'Subida exitosa',
                                detail: `${fileName} subido correctamente`,
                                life: 3000
                            });
                        } else {
                            throw new Error(uploadResult.error);
                        }
                    } catch (err) {
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Error al subir',
                            detail: `Error subiendo ${fileName}: ${err.message}`,
                            life: 5000
                        });
                    }
                    
                    setTransferProgress({ type: 'upload', current: i + 1, total: result.filePaths.length });
                }
                
                setTransferProgress(null);
                loadFiles(currentPath);
            }
        } catch (err) {
            console.error('Error in upload dialog:', err);
            setTransferProgress(null);
        }
    };

    const handleDownloadFile = async (file) => {
        try {
            const result = await window.electron.dialog.showSaveDialog({
                defaultPath: file.name,
                title: 'Guardar archivo como'
            });

            if (!result.canceled && result.filePath) {
                setTransferProgress({ type: 'download', current: 0, total: 1, fileName: file.name });
                
                const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                const downloadResult = await window.electron.fileExplorer.downloadFile(tabId, remotePath, result.filePath, config);
                
                if (downloadResult.success) {
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Descarga exitosa',
                        detail: `${file.name} descargado correctamente`,
                        life: 3000
                    });
                } else {
                    throw new Error(downloadResult.error);
                }
                
                setTransferProgress(null);
            }
        } catch (err) {
            console.error('Error downloading file:', err);
            setTransferProgress(null);
        }
    };

    const handleDeleteFiles = (filesToDelete) => {
        const filesTarget = filesToDelete || selectedFiles;
        if (filesTarget.length === 0) return;
        
        const fileNames = filesTarget.map(f => f.name).join(', ');
        confirmDialog({
            message: `¿Estás seguro de eliminar ${filesTarget.length} archivo(s)? Esta acción no se puede deshacer.\n\nArchivos: ${fileNames}`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                setTransferProgress({ type: 'delete', current: 0, total: filesTarget.length });
                for (let i = 0; i < filesTarget.length; i++) {
                    const file = filesTarget[i];
                    const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                    try {
                        const deleteResult = await window.electron.fileExplorer.deleteFile(tabId, remotePath, file.type === 'directory', config);
                        if (deleteResult.success) {
                            toast.current?.show({
                                severity: 'success',
                                summary: 'Eliminación exitosa',
                                detail: `${file.name} eliminado correctamente`,
                                life: 3000
                            });
                        } else {
                            throw new Error(deleteResult.error);
                        }
                    } catch (err) {
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Error al eliminar',
                            detail: `Error eliminando ${file.name}: ${err.message}`,
                            life: 5000
                        });
                    }
                    setTransferProgress({ type: 'delete', current: i + 1, total: filesTarget.length });
                }
                setTransferProgress(null);
                setSelectedFiles([]);
                loadFiles(currentPath);
            }
        });
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        
        try {
            const remotePath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
            const result = await window.electron.fileExplorer.createDirectory(tabId, remotePath, config);
            
            if (result.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Carpeta creada',
                    detail: `Carpeta "${newFolderName}" creada correctamente`,
                    life: 3000
                });
                setNewFolderName('');
                setNewFolderDialog(false);
                loadFiles(currentPath);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error al crear carpeta',
                detail: `Error creando carpeta: ${err.message}`,
                life: 5000
            });
        }
    };

    const handleRenameFile = async () => {
        if (!fileToRename || !newFileName.trim() || newFileName.trim() === fileToRename.name) return;
        
        try {
            const oldPath = currentPath === '/' ? `/${fileToRename.name}` : `${currentPath}/${fileToRename.name}`;
            const newPath = currentPath === '/' ? `/${newFileName.trim()}` : `${currentPath}/${newFileName.trim()}`;
            const result = await window.electron.fileExplorer.renameFile(tabId, oldPath, newPath, config);
            
            if (result.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Elemento renombrado',
                    detail: `${fileToRename.name} renombrado a "${newFileName.trim()}"`,
                    life: 3000
                });
                setNewFileName('');
                setFileToRename(null);
                setRenameDialog(false);
                loadFiles(currentPath);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error al renombrar',
                detail: `Error renombrando ${fileToRename.name}: ${err.message}`,
                life: 5000
            });
        }
    };

    const openRenameDialog = (file) => {
        setFileToRename(file);
        setNewFileName(file.name);
        setRenameDialog(true);
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
        
        if (!sshReady || !currentPath || loading) {
            console.warn('Drop rejected: sshReady=', sshReady, 'currentPath=', currentPath, 'loading=', loading);
            return;
        }
        
        // En Electron, usar dataTransfer.files directamente
        // Los archivos arrastrados desde el sistema tienen la propiedad 'path'
        const files = Array.from(event.dataTransfer.files);
        const filePaths = [];
        
        console.log('Files dropped:', files.length);
        
        if (files.length === 0) {
            console.warn('No files in drop event');
            return;
        }
        
        // Almacenar archivos temporalmente en window para que el handler IPC pueda acceder
        window.__lastDroppedFiles = files;
        
        // Procesar cada archivo
        const fileInfo = []; // Guardar información de cada archivo (path, nombre original)
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const originalFileName = file.name; // Guardar nombre original
            console.log(`Processing file ${i + 1}/${files.length}:`, {
                name: originalFileName,
                type: file.type,
                size: file.size,
                hasPath: 'path' in file,
                pathValue: file.path
            });
            
            let filePath = null;
            
            // Método 1: Intentar obtener path directamente
            if (file.path) {
                filePath = file.path;
            }
            
            // Método 2: Usar handler IPC para obtener path desde el main process
            if (!filePath && window.electron?.fileUtils) {
                try {
                    const result = await window.electron.fileUtils.getPathForFile(file);
                    if (result && typeof result === 'string') {
                        filePath = result;
                    }
                } catch (e) {
                    console.warn('Error using fileUtils.getPathForFile:', e);
                }
            }
            
            // Método 3: Usar handler IPC que ejecuta código en el renderer
            if (!filePath) {
                try {
                    const result = await window.electron.fileUtils.getPathForFileIndex(i);
                    if (result.ok && result.path) {
                        filePath = result.path;
                        console.log(`✓ File path found via IPC: ${filePath}`);
                    }
                } catch (e) {
                    console.warn('Error using IPC handler:', e);
                }
            }
            
            // Método 4: Fallback - leer archivo y guardarlo temporalmente
            if (!filePath) {
                try {
                    console.log(`No path found for ${originalFileName}, reading file content...`);
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await window.electron.fileUtils.saveTempFile(originalFileName, arrayBuffer);
                    if (result.ok) {
                        filePath = result.path;
                        console.log(`✓ File saved to temp path: ${filePath}`);
                    }
                } catch (e) {
                    console.error(`✗ Error processing file ${originalFileName}:`, e);
                }
            }
            
            if (filePath && typeof filePath === 'string' && filePath.length > 0) {
                fileInfo.push({ path: filePath, originalName: originalFileName });
                console.log(`✓ File path ready: ${filePath} (original: ${originalFileName})`);
            } else {
                console.error(`✗ No path found for file: ${originalFileName}`);
            }
        }
        
        // Limpiar archivos temporales
        delete window.__lastDroppedFiles;
        
        if (fileInfo.length === 0) {
            console.error('No valid file paths found');
            toast.current?.show({
                severity: 'error',
                summary: 'Error al obtener rutas',
                detail: 'No se pudieron obtener las rutas de los archivos. Intenta usar el botón "Subir" en su lugar.',
                life: 5000
            });
            return;
        }
        
        console.log('Uploading files:', fileInfo);
        setTransferProgress({ type: 'upload', current: 0, total: fileInfo.length });
        
        for (let i = 0; i < fileInfo.length; i++) {
            const { path: localPath, originalName } = fileInfo[i];
            // Usar el nombre original del archivo, no el del path temporal
            const fileName = originalName;
            const remotePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
            
            console.log(`Uploading ${i + 1}/${fileInfo.length}: ${localPath} -> ${remotePath} (original: ${originalName})`);
            
            try {
                const uploadResult = await window.electron.fileExplorer.uploadFile(tabId, localPath, remotePath, sshConfig);
                if (uploadResult.success) {
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Subida exitosa',
                        detail: `${fileName} subido correctamente`,
                        life: 3000
                    });
                } else {
                    throw new Error(uploadResult.error || 'Error desconocido');
                }
            } catch (err) {
                console.error('Error uploading file:', err);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error al subir',
                    detail: `Error subiendo ${fileName}: ${err.message}`,
                    life: 5000
                });
            }
            setTransferProgress({ type: 'upload', current: i + 1, total: fileInfo.length });
        }
        
        setTransferProgress(null);
        loadFiles(currentPath);
    };

    const handleDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.types.includes('Files')) {
            setIsDragActive(true);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.types.includes('Files')) {
            event.dataTransfer.dropEffect = 'copy';
            if (!isDragActive) setIsDragActive(true);
        }
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Solo desactivar si realmente salimos del contenedor (no de un hijo)
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragActive(false);
        }
    };

    const toggleFileSelection = (file) => {
        const isSelected = selectedFiles.some(f => f.name === file.name);
        if (isSelected) {
            setSelectedFiles(selectedFiles.filter(f => f.name !== file.name));
        } else {
            setSelectedFiles([...selectedFiles, file]);
        }
    };

    const handleShowHomeInSidebar = async () => {
        try {
            console.log('🏠 [FileExplorer] Iniciando obtención de directorio home...');
            
            let homePath = null;
            
            // Método 1: Intentar con handler IPC
            if (window.electron && window.electron.ipcRenderer) {
                try {
                    console.log('🏠 [FileExplorer] Llamando a get-user-home...');
                    const result = await window.electron.ipcRenderer.invoke('get-user-home');
                    console.log('🏠 [FileExplorer] Respuesta IPC recibida:', result, 'tipo:', typeof result);
                    
                    if (result && typeof result === 'string' && result.trim().length > 0) {
                        homePath = result.trim();
                        console.log('✅ [FileExplorer] Home obtenido via IPC:', homePath);
                    } else {
                        console.warn('⚠️ [FileExplorer] IPC retornó valor inválido:', result);
                    }
                } catch (ipcError) {
                    console.error('❌ [FileExplorer] Error en IPC:', ipcError);
                }
            } else {
                console.error('❌ [FileExplorer] Electron IPC no disponible');
            }
            
            // Método 2: Si IPC falla, usar un fallback mejor
            if (!homePath) {
                const platform = window.electron?.platform || 'win32';
                // Llamar al handler de nuevo con un método alternativo o usar un fallback
                // Por ahora, usar un path que el usuario pueda ajustar
                homePath = platform === 'win32' ? 'C:\\Users\\User' : '/home/user';
                console.warn('⚠️ [FileExplorer] IPC falló, usando path por defecto:', homePath);
                console.warn('⚠️ [FileExplorer] Nota: Reinicia la aplicación para que el handler IPC funcione correctamente');
            }
            
            console.log('✅ [FileExplorer] Home path final:', homePath);
            
            // Disparar evento para mostrar explorador local en sidebar
            window.dispatchEvent(new CustomEvent('show-local-file-explorer', {
                detail: { path: homePath }
            }));
            
            toast.current?.show({
                severity: 'success',
                summary: 'Explorador local',
                detail: `Mostrando directorio: ${homePath}`,
                life: 2000
            });
        } catch (err) {
            console.error('❌ [FileExplorer] Error completo:', err);
            
            // Aún así, intentar abrir con un path por defecto
            const platform = window.electron?.platform || 'win32';
            const defaultPath = platform === 'win32' ? 'C:\\Users\\User' : '/home/user';
            
            console.log('⚠️ [FileExplorer] Usando path por defecto debido a error:', defaultPath);
            
            window.dispatchEvent(new CustomEvent('show-local-file-explorer', {
                detail: { path: defaultPath }
            }));
            
            toast.current?.show({
                severity: 'warn',
                summary: 'Explorador local',
                detail: `Abriendo directorio: ${defaultPath}`,
                life: 3000
            });
        }
    };

    const themeColors = getThemeColors(explorerColorTheme);
    const isDarkTheme = themeColors.contentBackground && 
        (themeColors.contentBackground.includes('#') && 
         parseInt(themeColors.contentBackground.replace('#', ''), 16) < 0x888888);

    return (
        <div 
            ref={containerRef}
            className="file-explorer-container material-design" 
            data-tab-id={tabId}
            data-theme={explorerColorTheme}
            style={{ 
                fontFamily: explorerFont, 
                fontSize: explorerFontSize,
                height: '100%',
                width: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                '--theme-bg': themeColors.contentBackground || '#ffffff',
                '--theme-text': themeColors.dialogText || '#1e293b',
                '--theme-border': themeColors.contentBorder || '#e2e8f0',
                '--theme-hover': themeColors.sidebarHover || '#f1f5f9',
                '--theme-selected': themeColors.sidebarSelected || '#e0e7ff',
                '--theme-primary': themeColors.buttonPrimary || '#667eea',
                '--theme-secondary': themeColors.tabBackground || '#f8fafc',
            }}
        >
            <Card className="file-explorer-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Header */}
                <div className="file-explorer-header">
                    <h2 className="file-explorer-title">
                        Explorador {protocolLabel} <FaChevronRight className="header-separator" /> {host}
                    </h2>
                </div>

                {/* Breadcrumb con Path Input en la misma fila */}
                <div className="file-explorer-breadcrumb-row">
                    <div className="breadcrumb-container">
                        <button
                            className="breadcrumb-home-button"
                            onClick={() => homeDir && navigateToPath(homeDir)}
                            title="Ir al home"
                        >
                            <FaHome className="breadcrumb-home-icon" />
                        </button>
                        {breadcrumbItems.length === 0 ? (
                            <span className="breadcrumb-empty">/</span>
                        ) : (
                            <>
                                <span className="breadcrumb-sep">></span>
                                {breadcrumbItems.map((item, index) => (
                                    <React.Fragment key={index}>
                                        <button
                                            className="breadcrumb-link"
                                            onClick={item.command}
                                            title={item.label}
                                        >
                                            {item.label}
                                        </button>
                                        {index < breadcrumbItems.length - 1 && (
                                            <span className="breadcrumb-sep">></span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="breadcrumb-path-input">
                        <InputText 
                            value={pathInput}
                            onChange={(e) => setPathInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleNavigateFromInput();
                                }
                            }}
                            placeholder="/ruta..."
                            disabled={!sshReady || loading}
                            className="breadcrumb-path-field"
                        />
                        <Button 
                            icon={<FaArrowRight />}
                            onClick={handleNavigateFromInput}
                            disabled={!sshReady || loading}
                            className="breadcrumb-path-button"
                            tooltip={t('tooltips.goToPath')}
                        />
                    </div>
                </div>

                {/* Toolbar */}
                <div className="file-explorer-toolbar">
                    <div className="toolbar-left">
                        <Button 
                            icon={<FaArrowUp />}
                            onClick={() => {
                                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                                navigateToPath(parentPath);
                            }}
                            disabled={!sshReady || !currentPath || currentPath === '/'}
                            tooltip={t('tooltips.goToParent')}
                            className="toolbar-button"
                        />
                        <Button 
                            icon={<FaSync />}
                            onClick={() => currentPath && loadFiles(currentPath)}
                            disabled={!sshReady || !currentPath}
                            tooltip={t('tooltips.refresh')}
                            className="toolbar-button"
                        />
                        <Button 
                            icon={<FaHome />}
                            onClick={() => homeDir && navigateToPath(homeDir)}
                            disabled={!sshReady || !currentPath}
                            tooltip={t('tooltips.goToHome')}
                            className="toolbar-button"
                        />
                        <Button 
                            icon={showDotfiles ? <FaEyeSlash /> : <FaEye />}
                            onClick={() => setShowDotfiles(v => !v)}
                            tooltip={showDotfiles ? t('tooltips.hideHiddenFiles') : t('tooltips.showHiddenFiles')}
                            className="toolbar-button"
                        />
                        <Button 
                            icon={<FaHome />}
                            onClick={handleShowHomeInSidebar}
                            tooltip="Mostrar home local en sidebar"
                            className="toolbar-button"
                        />
                    </div>
                    <div className="toolbar-right">
                        <Button 
                            label="Subir"
                            icon={<FaUpload />}
                            onClick={handleUploadFiles}
                            disabled={!sshReady || !currentPath || loading}
                            className="toolbar-button-action"
                        />
                        <Button 
                            label="Nueva"
                            icon={<FaPlus />}
                            onClick={() => setNewFolderDialog(true)}
                            disabled={!sshReady || !currentPath || loading}
                            className="toolbar-button-action"
                        />
                        <Button 
                            label="Borrar"
                            icon={<FaTrash />}
                            onClick={() => handleDeleteFiles(selectedFiles)}
                            disabled={!sshReady || !currentPath || loading || selectedFiles.length === 0}
                            className="toolbar-button-action toolbar-button-danger"
                        />
                    </div>
                </div>

                {/* Status Messages */}
                {!sshReady && (
                    <Message 
                        severity="info" 
                        text="Estableciendo conexión SSH..." 
                    />
                )}
                
                {loading && (
                    <ProgressBar mode="indeterminate" className="file-explorer-loading" />
                )}
                
                {error && (
                    <Message severity="error" text={error} />
                )}

                {/* Files List - Material Design Cards */}
                {sshReady && (
                    <div 
                        ref={filesContainerRef}
                        className={`file-explorer-files-container${isDragActive ? ' drag-active' : ''}`}
                        onDrop={handleDrop}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{
                            flex: '1 1 0',
                            minHeight: 0,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {visibleFiles.length === 0 ? (
                            <div className="empty-state">
                                <FaFolder className="empty-icon" />
                                <p>No hay archivos en este directorio</p>
                            </div>
                        ) : (
                            visibleFiles.map((file, index) => {
                                const isSelected = selectedFiles.some(f => f.name === file.name);
                                return (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className={`file-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleFileSelection(file)}
                                        onDoubleClick={() => onFileDoubleClick(file)}
                                    >
                                        <div className="file-card-icon">
                                            {getFileIcon(file)}
                                        </div>
                                        <div className="file-card-content">
                                            <div className="file-card-name">{file.name}</div>
                                            <div className="file-card-meta">
                                                <span className="file-type">{getFileType(file)}</span>
                                                {file.type !== 'directory' && (
                                                    <>
                                                        <span className="file-separator">•</span>
                                                        <span className="file-size">{formatFileSize(file.size)}</span>
                                                    </>
                                                )}
                                                <span className="file-separator">•</span>
                                                <span className="file-modified">{file.modified}</span>
                                            </div>
                                        </div>
                                        <div className="file-card-actions" onClick={(e) => e.stopPropagation()}>
                                            {file.type === 'file' && (
                                                <Button 
                                                    icon={<FaDownload />}
                                                    onClick={() => handleDownloadFile(file)}
                                                    tooltip={t('tooltips.download')}
                                                    className="file-action-button"
                                                />
                                            )}
                                            {file.name !== '..' && (
                                                <>
                                                    <Button
                                                        icon={<FaEdit />}
                                                        onClick={() => openRenameDialog(file)}
                                                        tooltip={t('tooltips.rename')}
                                                        className="file-action-button"
                                                    />
                                                    <Button
                                                        icon={<FaTrash />}
                                                        onClick={() => handleDeleteFiles([file])}
                                                        tooltip={t('tooltips.delete')}
                                                        className="file-action-button file-action-danger"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Transfer Progress */}
                {transferProgress && (
                    <div className="transfer-progress-container">
                        <div className="transfer-progress-header">
                            <span>
                                {transferProgress.type === 'upload' && 'Subiendo archivos...'}
                                {transferProgress.type === 'download' && `Descargando ${transferProgress.fileName}...`}
                                {transferProgress.type === 'delete' && 'Eliminando archivos...'}
                            </span>
                            <span>{transferProgress.current} / {transferProgress.total}</span>
                        </div>
                        <ProgressBar 
                            value={(transferProgress.current / transferProgress.total) * 100} 
                            showValue={false}
                        />
                    </div>
                )}
            </Card>
            
            {/* Create Folder Dialog */}
            <Dialog 
                header="Crear Nueva Carpeta" 
                visible={newFolderDialog} 
                style={{ width: '400px' }} 
                onHide={() => {
                    setNewFolderDialog(false);
                    setNewFolderName('');
                }}
                footer={
                    <div>
                        <Button 
                            label="Cancelar" 
                            icon={<FaArrowUp />}
                            className="p-button-text" 
                            onClick={() => {
                                setNewFolderDialog(false);
                                setNewFolderName('');
                            }}
                        />
                        <Button 
                            label="Crear" 
                            icon={<FaPlus />}
                            className="p-button-primary" 
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim()}
                        />
                    </div>
                }
            >
                <div className="field">
                    <label htmlFor="folderName">Nombre de la carpeta:</label>
                    <InputText 
                        id="folderName"
                        value={newFolderName} 
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Ingresa el nombre de la carpeta"
                        className="w-full mt-2"
                        autoFocus
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) {
                                handleCreateFolder();
                            }
                        }}
                    />
                </div>
            </Dialog>
            
            {/* Rename File Dialog */}
            <Dialog 
                header="Renombrar Elemento" 
                visible={renameDialog} 
                style={{ width: '400px' }} 
                onHide={() => {
                    setRenameDialog(false);
                    setFileToRename(null);
                    setNewFileName('');
                }}
                footer={
                    <div>
                        <Button 
                            label="Cancelar" 
                            icon={<FaArrowUp />}
                            className="p-button-text" 
                            onClick={() => {
                                setRenameDialog(false);
                                setFileToRename(null);
                                setNewFileName('');
                            }}
                        />
                        <Button 
                            label="Renombrar" 
                            icon={<FaEdit />}
                            className="p-button-primary" 
                            onClick={handleRenameFile}
                            disabled={!newFileName.trim() || !fileToRename || newFileName.trim() === fileToRename.name}
                        />
                    </div>
                }
            >
                <div className="field">
                    <label htmlFor="fileName">Nuevo nombre:</label>
                    <InputText 
                        id="fileName"
                        value={newFileName} 
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="Ingresa el nuevo nombre"
                        className="w-full mt-2"
                        autoFocus
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && newFileName.trim() && fileToRename && newFileName.trim() !== fileToRename.name) {
                                handleRenameFile();
                            }
                        }}
                    />
                    {fileToRename && (
                        <small className="p-d-block mt-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                            Renombrando: <strong>{fileToRename.name}</strong>
                        </small>
                    )}
                </div>
            </Dialog>
            
            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
};

export default FileExplorer;
