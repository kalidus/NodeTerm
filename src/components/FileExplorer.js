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
    FaPlus, FaHome, FaSync, FaEye, FaEyeSlash, FaArrowRight
} from 'react-icons/fa';

const FileExplorer = ({ sshConfig, tabId, iconTheme = 'material', explorerFont = 'Segoe UI', explorerColorTheme = 'Light', explorerFontSize = 15 }) => {
    const [currentPath, setCurrentPath] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);
    const [error, setError] = useState(null);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [transferProgress, setTransferProgress] = useState(null);
    const [sshReady, setSshReady] = useState(false);
    const [showDotfiles, setShowDotfiles] = useState(false);
    const toast = React.useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [homeDir, setHomeDir] = useState(null);
    const [pathInput, setPathInput] = useState('');

    useEffect(() => {
        setSshReady(true);
    }, []);

    useEffect(() => {
        const initializeExplorer = async () => {
            if (!window.electron || !tabId || !sshReady) return;
            setLoading(true);
            setError(null);
            try {
                const homeResult = await window.electron.fileExplorer.getHomeDirectory(tabId, sshConfig);
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
    }, [tabId, sshReady]);

    useEffect(() => {
        if (currentPath !== null) {
            loadFiles(currentPath);
            setPathInput(currentPath);
        }
    }, [currentPath]);

    const loadFiles = async (path) => {
        if (!window.electron || !tabId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await window.electron.fileExplorer.listFiles(tabId, path, sshConfig);
            
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
            const exists = await window.electron.fileExplorer.checkDirectory(tabId, path, sshConfig);
            if (exists) {
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

    const visibleFiles = showDotfiles ? files : files.filter(f => !f.name.startsWith('.') || f.name === '..');

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
                        const uploadResult = await window.electron.fileExplorer.uploadFile(tabId, localPath, remotePath, sshConfig);
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
                const downloadResult = await window.electron.fileExplorer.downloadFile(tabId, remotePath, result.filePath, sshConfig);
                
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
                        const deleteResult = await window.electron.fileExplorer.deleteFile(tabId, remotePath, file.type === 'directory', sshConfig);
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
            const result = await window.electron.fileExplorer.createDirectory(tabId, remotePath, sshConfig);
            
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

    const handleDrop = async (event) => {
        event.preventDefault();
        setIsDragActive(false);
        if (!sshReady || !currentPath || loading) return;
        const files = Array.from(event.dataTransfer.files);
        const filePaths = files
            .filter(f => f.type !== '' || f.name)
            .map(f => f.path)
            .filter(Boolean);
        if (filePaths.length === 0) return;
        setTransferProgress({ type: 'upload', current: 0, total: filePaths.length });
        for (let i = 0; i < filePaths.length; i++) {
            const localPath = filePaths[i];
            const fileName = localPath.split(/[\\/]/).pop();
            const remotePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
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
            setTransferProgress({ type: 'upload', current: i + 1, total: filePaths.length });
        }
        setTransferProgress(null);
        loadFiles(currentPath);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        if (!isDragActive) setIsDragActive(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragActive(false);
    };

    const toggleFileSelection = (file) => {
        const isSelected = selectedFiles.some(f => f.name === file.name);
        if (isSelected) {
            setSelectedFiles(selectedFiles.filter(f => f.name !== file.name));
        } else {
            setSelectedFiles([...selectedFiles, file]);
        }
    };

    const themeColors = getThemeColors(explorerColorTheme);
    const isDarkTheme = themeColors.contentBackground && 
        (themeColors.contentBackground.includes('#') && 
         parseInt(themeColors.contentBackground.replace('#', ''), 16) < 0x888888);

    return (
        <div 
            className="file-explorer-container material-design" 
            data-tab-id={tabId}
            data-theme={explorerColorTheme}
            style={{ 
                fontFamily: explorerFont, 
                fontSize: explorerFontSize,
                '--theme-bg': themeColors.contentBackground || '#ffffff',
                '--theme-text': themeColors.dialogText || '#1e293b',
                '--theme-border': themeColors.contentBorder || '#e2e8f0',
                '--theme-hover': themeColors.sidebarHover || '#f1f5f9',
                '--theme-selected': themeColors.sidebarSelected || '#e0e7ff',
                '--theme-primary': themeColors.buttonPrimary || '#667eea',
                '--theme-secondary': themeColors.tabBackground || '#f8fafc',
            }}
        >
            <Card className="file-explorer-card">
                {/* Header */}
                <div className="file-explorer-header">
                    <h2 className="file-explorer-title">
                        Explorador <FaChevronRight className="header-separator" /> {sshConfig.host}
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
                            tooltip="Ir a ruta"
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
                            tooltip="Ir al directorio padre"
                            className="toolbar-button"
                        />
                        <Button 
                            icon={<FaSync />}
                            onClick={() => currentPath && loadFiles(currentPath)}
                            disabled={!sshReady || !currentPath}
                            tooltip="Actualizar"
                            className="toolbar-button"
                        />
                        <Button 
                            icon={<FaHome />}
                            onClick={() => homeDir && navigateToPath(homeDir)}
                            disabled={!sshReady || !currentPath}
                            tooltip="Ir al home"
                            className="toolbar-button"
                        />
                        <Button 
                            icon={showDotfiles ? <FaEyeSlash /> : <FaEye />}
                            onClick={() => setShowDotfiles(v => !v)}
                            tooltip={showDotfiles ? "Ocultar archivos ocultos" : "Mostrar archivos ocultos"}
                            className="toolbar-button"
                        />
                    </div>
                    <div className="toolbar-right">
                        <Button 
                            label="↑ Subir"
                            icon={<FaUpload />}
                            onClick={handleUploadFiles}
                            disabled={!sshReady || !currentPath || loading}
                            className="toolbar-button-action"
                        />
                        <Button 
                            label="+ Nueva"
                            icon={<FaPlus />}
                            onClick={() => setNewFolderDialog(true)}
                            disabled={!sshReady || !currentPath || loading}
                            className="toolbar-button-action"
                        />
                        <Button 
                            label="🗑 Borrar"
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
                        className={`file-explorer-files-container${isDragActive ? ' drag-active' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
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
                                        {file.type === 'file' && (
                                            <div className="file-card-actions" onClick={(e) => e.stopPropagation()}>
                                                <Button 
                                                    icon={<FaDownload />}
                                                    onClick={() => handleDownloadFile(file)}
                                                    tooltip="Descargar"
                                                    className="file-action-button"
                                                />
                                                <Button
                                                    icon={<FaTrash />}
                                                    onClick={() => handleDeleteFiles([file])}
                                                    tooltip="Eliminar"
                                                    className="file-action-button file-action-danger"
                                                />
                                            </div>
                                        )}
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
            
            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
};

export default FileExplorer;
