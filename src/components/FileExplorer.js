import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';
import { Message } from 'primereact/message';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { iconThemes } from '../themes/icon-themes';
import { uiThemes } from '../themes/ui-themes';

const FileExplorer = ({ sshConfig, tabId, iconTheme = 'material', explorerFont = 'Segoe UI', explorerColorTheme = 'Light', explorerFontSize = 15 }) => {
    const [currentPath, setCurrentPath] = useState(null); // null indica que aún no hemos cargado el path inicial
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);
    const [error, setError] = useState(null);
    const [uploadDialog, setUploadDialog] = useState(false);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [transferProgress, setTransferProgress] = useState(null);
    const [sshReady, setSshReady] = useState(false);
    const [showDotfiles, setShowDotfiles] = useState(false); // Por defecto, ocultar dotfiles
    const toast = React.useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [homeDir, setHomeDir] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Para FileExplorer, no necesitamos esperar conexión SSH propia
    // Usaremos las conexiones del pool directamente
    useEffect(() => {
        // Marcar como SSH listo inmediatamente - usaremos el pool de conexiones
        setSshReady(true);
    }, []);

    // Forzar actualización cuando cambia el tema de iconos, la fuente o el tema de colores
    useEffect(() => {
        setForceUpdate(prev => prev + 1);
    }, [iconTheme, explorerFont, explorerColorTheme]);

    // Aplicar tema de colores del explorador
    useEffect(() => {
        const theme = uiThemes[explorerColorTheme];
        if (!theme) return;

        const colors = theme.colors;
        const styleId = `explorer-color-theme-${tabId}`;
        
        // Remover estilo previo si existe
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Crear nuevo estilo
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .file-explorer-container[data-tab-id="${tabId}"] {
                background: ${colors.contentBackground} !important;
                color: ${colors.dialogText} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-card {
                background: ${colors.contentBackground} !important;
                color: ${colors.dialogText} !important;
                border: 1px solid ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-card .p-card-header {
                background: ${colors.tabBackground} !important;
                color: ${colors.dialogText} !important;
                border-bottom: 1px solid ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-card .p-card-title {
                color: ${colors.dialogText} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-toolbar {
                background: ${colors.tabBackground} !important;
                border: 1px solid ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-datatable {
                background: ${colors.contentBackground} !important;
                color: ${colors.dialogText} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-datatable .p-datatable-thead > tr > th {
                background: ${colors.tabBackground} !important;
                color: ${colors.dialogText} !important;
                border-color: ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-datatable .p-datatable-tbody > tr > td {
                background: ${colors.contentBackground} !important;
                color: ${colors.dialogText} !important;
                border-color: ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-datatable .p-datatable-tbody > tr:hover > td {
                background: ${colors.sidebarHover} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-datatable .p-datatable-tbody > tr.p-highlight > td {
                background: ${colors.sidebarSelected} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-breadcrumb {
                background: ${colors.tabBackground} !important;
                border: 1px solid ${colors.contentBorder} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-breadcrumb .p-breadcrumb-list li .p-menuitem-link {
                color: ${colors.dialogText} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-breadcrumb .p-breadcrumb-list li .p-menuitem-link:hover {
                background: ${colors.sidebarHover} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-progressbar {
                background: ${colors.tabBackground} !important;
            }
            .file-explorer-container[data-tab-id="${tabId}"] .p-message {
                background: ${colors.tabBackground} !important;
                color: ${colors.dialogText} !important;
                border: 1px solid ${colors.contentBorder} !important;
            }
        `;
        
        document.head.appendChild(style);

        // Cleanup function
        return () => {
            const styleElement = document.getElementById(styleId);
            if (styleElement) {
                styleElement.remove();
            }
        };
    }, [explorerColorTheme, tabId]);

    // Cargar directorio inicial cuando SSH esté listo
    useEffect(() => {
        const initializeExplorer = async () => {
            if (!window.electron || !tabId || !sshReady) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Obtener el directorio home del usuario
                const homeDir = await window.electron.fileExplorer.getHomeDirectory(tabId, sshConfig);
                setHomeDir(homeDir || '/');
                setCurrentPath(homeDir || '/');
            } catch (err) {
                console.error('Error getting home directory:', err);
                setError('No se pudo obtener el directorio home del usuario.');
                setHomeDir('/');
                setCurrentPath('/'); // Fallback al root
            } finally {
                setLoading(false);
            }
        };

        if (sshReady) {
            initializeExplorer();
        }
    }, [tabId, sshReady]);

    // Cargar archivos cuando cambia el path
    useEffect(() => {
        if (currentPath !== null) {
            loadFiles(currentPath);
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
                updateBreadcrumb(path);
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
        const pathParts = path.split('/').filter(part => part !== '');
        const items = pathParts.map((part, index) => {
            const fullPath = '/' + pathParts.slice(0, index + 1).join('/');
            return {
                label: part,
                command: () => navigateToPath(fullPath)
            };
        });
        
        setBreadcrumbItems([
            { label: 'Root', command: () => navigateToPath('/') },
            ...items
        ]);
    };

    const navigateToPath = async (path) => {
        if (!window.electron || !tabId) return;
        
        try {
            // Verificar que el directorio existe antes de navegar
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

    const onFileDoubleClick = (file) => {
        if (file.type === 'directory' || (file.type === 'symlink' && file.permissions.startsWith('l') && file.permissions.includes('d'))) {
            if (file.name === '..') {
                // Navegar al directorio padre
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                navigateToPath(parentPath);
            } else {
                // Navegar al subdirectorio
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
        // Asegurar que tenemos el tema correcto y que existe
        const theme = (iconThemes && iconThemes[iconTheme]) ? iconThemes[iconTheme] : iconThemes['material'];
        
        if (file.type === 'directory') {
            return file.name === '..'
                ? <i className="pi pi-arrow-up file-icon directory-icon"></i>
                : (theme?.icons?.folder || <i className="pi pi-folder file-icon directory-icon"></i>);
        }
        if (file.type === 'symlink') {
            return <i className="pi pi-link file-icon symlink-icon"></i>;
        }
        // Para archivos, usar icono de archivo del tema
        return theme?.icons?.file || <i className="pi pi-file file-icon"></i>;
    };

    const nameBodyTemplate = (file) => {
        const isPrimeIcon = file.type === 'directory' && file.name === '..' || file.type === 'symlink';
        return (
            <div className="flex align-items-center">
                {isPrimeIcon
                    ? getFileIcon(file)
                    : <span style={{ display: 'inline-flex', alignItems: 'center', width: 20 }}>{getFileIcon(file)}</span>
                }
                <span className={file.type === 'symlink' ? 'symlink-name' : ''} style={{ marginLeft: 8 }}>{file.name}</span>
            </div>
        );
    };

    const sizeBodyTemplate = (file) => {
        return file.type === 'directory' ? '-' : formatFileSize(file.size);
    };

    // Filtrar archivos según showDotfiles
    const visibleFiles = showDotfiles ? files : files.filter(f => !f.name.startsWith('.') || f.name === '..');

    // Funciones para manejo de archivos
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
                loadFiles(currentPath); // Recargar archivos
            }
        } catch (err) {
            console.error('Error in upload dialog:', err);
            setTransferProgress(null);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al abrir selector de archivos',
                life: 5000
            });
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
            toast.current?.show({
                severity: 'error',
                summary: 'Error al descargar',
                detail: `Error descargando ${file.name}: ${err.message}`,
                life: 5000
            });
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
                loadFiles(currentPath); // Recargar archivos
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
                loadFiles(currentPath); // Recargar archivos
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

    // Handler para drop de archivos
    const handleDrop = async (event) => {
        event.preventDefault();
        setIsDragActive(false);
        if (!sshReady || !currentPath || loading) return;
        const files = Array.from(event.dataTransfer.files);
        // Solo archivos, no carpetas
        const filePaths = files
            .filter(f => f.type !== '' || f.name) // f.type vacío puede ser binario, pero si tiene nombre lo aceptamos
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
        loadFiles(currentPath); // Recargar archivos
    };
    const handleDragOver = (event) => {
        event.preventDefault();
        if (!isDragActive) setIsDragActive(true);
    };
    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragActive(false);
    };

    const toolbarLeft = (
        <div className="flex align-items-center gap-2 flex-wrap">
            <Button 
                label="⬅" 
                onClick={() => {
                    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                    navigateToPath(parentPath);
                }}
                disabled={!sshReady || !currentPath || currentPath === '/'}
                tooltip="Ir al directorio padre"
                size="small"
                text
            />
            <Button 
                label="⟲" 
                onClick={() => currentPath && loadFiles(currentPath)}
                disabled={!sshReady || !currentPath}
                tooltip="Actualizar contenido del directorio"
                size="small"
                text
            />
            <Button 
                label="⌂" 
                onClick={() => homeDir && navigateToPath(homeDir)}
                disabled={!sshReady || !currentPath}
                tooltip="Ir al directorio home"
                size="small"
                text
            />
            <Button 
                label={showDotfiles ? "◉" : "○"}
                onClick={() => setShowDotfiles(v => !v)}
                tooltip={showDotfiles ? "Ocultar archivos y carpetas ocultos" : "Mostrar archivos y carpetas ocultos"}
                size="small"
                text
            />
            <Button 
                label="↑" 
                onClick={handleUploadFiles}
                disabled={!sshReady || !currentPath || loading}
                tooltip="Subir archivos desde el equipo local"
                size="small"
                text
            />
            <Button
                label="↓"
                onClick={async () => {
                    for (const file of selectedFiles) {
                        if (file.type === 'file') {
                            await handleDownloadFile(file);
                        }
                    }
                }}
                disabled={!sshReady || !currentPath || loading || selectedFiles.length === 0}
                tooltip="Descargar archivos seleccionados al equipo local"
                size="small"
                text
            />
            <Button 
                label="+" 
                onClick={() => setNewFolderDialog(true)}
                disabled={!sshReady || !currentPath || loading}
                tooltip="Crear nueva carpeta en el directorio actual"
                size="small"
                text
            />
            <Button 
                label="×" 
                className="p-button-danger" 
                onClick={() => handleDeleteFiles(selectedFiles)}
                disabled={!sshReady || !currentPath || loading || selectedFiles.length === 0}
                tooltip="Eliminar permanentemente archivos seleccionados"
                size="small"
                text
            />
        </div>
    );

    const toolbarRight = (
        <div className="flex align-items-center">
            <span className="mr-2">Archivos: {files.length}</span>
            {selectedFiles.length > 0 && (
                <span className="mr-2">Seleccionados: {selectedFiles.length}</span>
            )}
        </div>
    );

    return (
        <div 
            key={`file-explorer-${iconTheme}-${explorerFont}-${explorerColorTheme}-${forceUpdate}`} 
            className="file-explorer-container" 
            data-tab-id={tabId}
            style={{ fontFamily: explorerFont, fontSize: explorerFontSize, '--explorer-font': explorerFont }}
        >
            <Card 
                title={`Explorador de Archivos - ${sshConfig.host}`}
                className="file-explorer-card"
                style={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
            >
                <Toolbar 
                    start={toolbarLeft} 
                    end={toolbarRight}
                    className="file-explorer-toolbar"
                    style={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                />
                
                <BreadCrumb 
                    model={breadcrumbItems} 
                    className="file-explorer-breadcrumb"
                    style={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                />
                
                {!sshReady && (
                    <div className="mb-3">
                        <Message 
                            severity="info" 
                            text="Estableciendo conexión SSH..." 
                            icon="pi pi-spin pi-spinner" 
                        />
                    </div>
                )}
                
                {loading && (
                    <ProgressBar mode="indeterminate" className="file-explorer-loading" />
                )}
                
                {error && (
                    <Message severity="error" text={error} className="mb-3" />
                )}
                
                {sshReady && (
                    <div 
                        className={`file-explorer-table-container${isDragActive ? ' drag-active' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                    >
                        <DataTable 
                            value={visibleFiles}
                            selectionMode="multiple"
                            selection={selectedFiles}
                            onSelectionChange={(e) => setSelectedFiles(e.value)}
                            onRowDoubleClick={(e) => onFileDoubleClick(e.data)}
                            rowHover={true}
                            className="file-explorer-datatable"
                            style={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                            tableStyle={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                            bodyClassName="file-explorer-table-body"
                        >
                        <Column 
                            field="name" 
                            header="Nombre" 
                            body={nameBodyTemplate}
                            sortable
                            style={{ minWidth: '200px', fontFamily: explorerFont, fontSize: explorerFontSize }}
                            bodyStyle={{ fontFamily: explorerFont, fontSize: explorerFontSize }}
                        />
                        <Column 
                            field="size" 
                            header="Tamaño" 
                            body={sizeBodyTemplate}
                            sortable
                            style={{ width: '120px' }}
                        />
                        <Column 
                            field="permissions" 
                            header="Permisos" 
                            sortable
                            style={{ width: '120px' }}
                        />
                        <Column 
                            field="owner" 
                            header="Propietario" 
                            sortable
                            style={{ width: '120px' }}
                        />
                        <Column 
                            field="modified" 
                            header="Modificado" 
                            sortable
                            style={{ width: '150px' }}
                        />
                        <Column 
                            header="Acciones" 
                            body={(file) => (
                                <div className="flex gap-2">
                                    {file.type === 'file' && (
                                        <>
                                            <Button 
                                                label="↓" 
                                                size="small"
                                                className="p-button-text" 
                                                onClick={() => handleDownloadFile(file)}
                                                tooltip="Descargar archivo"
                                            />
                                            <Button
                                                label="×"
                                                size="small"
                                                className="p-button-text p-button-danger"
                                                onClick={() => handleDeleteFiles([file])}
                                                tooltip="Eliminar archivo"
                                            />
                                        </>
                                    )}
                                </div>
                            )}
                            style={{ width: '100px' }}
                        />
                    </DataTable>
                    </div>
                )}
                
                {/* Progreso de transferencia */}
                {transferProgress && (
                    <div className="mt-3">
                        <div className="flex justify-content-between align-items-center mb-2">
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
            
            {/* Dialog para crear nueva carpeta */}
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
                            icon="pi pi-times" 
                            className="p-button-text" 
                            onClick={() => {
                                setNewFolderDialog(false);
                                setNewFolderName('');
                            }}
                        />
                        <Button 
                            label="Crear" 
                            icon="pi pi-check" 
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
            
            {/* Toast para notificaciones */}
            <Toast ref={toast} />
        </div>
    );
};

export default FileExplorer; 