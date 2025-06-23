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

const FileExplorer = ({ sshConfig, tabId }) => {
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
    const toast = React.useRef(null);

    // Escuchar cuando la conexión SSH esté lista
    useEffect(() => {
        if (!window.electron || !tabId) return;

        const handleSSHReady = () => {
            setSshReady(true);
        };

        const handleSSHError = (error) => {
            setError(`Error de conexión SSH: ${error}`);
            setLoading(false);
        };

        // Configurar listeners
        const readyUnsubscribe = window.electron.ipcRenderer.on(`ssh:ready:${tabId}`, handleSSHReady);
        const errorUnsubscribe = window.electron.ipcRenderer.on(`ssh:error:${tabId}`, handleSSHError);

        return () => {
            if (readyUnsubscribe) readyUnsubscribe();
            if (errorUnsubscribe) errorUnsubscribe();
        };
    }, [tabId]);

    // Cargar directorio inicial cuando SSH esté listo
    useEffect(() => {
        const initializeExplorer = async () => {
            if (!window.electron || !tabId || !sshReady) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Obtener el directorio home del usuario
                const homeDir = await window.electron.fileExplorer.getHomeDirectory(tabId);
                setCurrentPath(homeDir || '/');
            } catch (err) {
                console.error('Error getting home directory:', err);
                setError('No se pudo obtener el directorio home del usuario.');
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
            const result = await window.electron.fileExplorer.listFiles(tabId, path);
            
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
            const exists = await window.electron.fileExplorer.checkDirectory(tabId, path);
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
        if (file.type === 'directory') {
            return file.name === '..' ? 'pi pi-arrow-up' : 'pi pi-folder';
        }
        
        if (file.type === 'symlink') {
            return 'pi pi-link';
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        switch (extension) {
            case 'txt':
            case 'md':
                return 'pi pi-file-o';
            case 'sh':
            case 'py':
            case 'js':
                return 'pi pi-code';
            case 'jpg':
            case 'png':
            case 'gif':
                return 'pi pi-image';
            case 'zip':
            case 'tar':
            case 'gz':
                return 'pi pi-file-archive';
            case 'pdf':
                return 'pi pi-file-pdf';
            default:
                return 'pi pi-file';
        }
    };

    const nameBodyTemplate = (file) => {
        let iconClass = 'file-type-icon';
        if (file.type === 'directory') {
            iconClass = 'directory-icon';
        } else if (file.type === 'symlink') {
            iconClass = 'symlink-icon';
        }

        return (
            <div className="flex align-items-center">
                <i className={`${getFileIcon(file)} file-icon ${iconClass}`}></i>
                <span className={file.type === 'symlink' ? 'symlink-name' : ''}>{file.name}</span>
            </div>
        );
    };

    const sizeBodyTemplate = (file) => {
        return file.type === 'directory' ? '-' : formatFileSize(file.size);
    };

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
                        const uploadResult = await window.electron.fileExplorer.uploadFile(tabId, localPath, remotePath);
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
                const downloadResult = await window.electron.fileExplorer.downloadFile(tabId, remotePath, result.filePath);
                
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

    const handleDeleteFiles = () => {
        if (selectedFiles.length === 0) return;
        
        const fileNames = selectedFiles.map(f => f.name).join(', ');
        confirmDialog({
            message: `¿Estás seguro de eliminar ${selectedFiles.length} archivo(s)? Esta acción no se puede deshacer.\n\nArchivos: ${fileNames}`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                setTransferProgress({ type: 'delete', current: 0, total: selectedFiles.length });
                
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                    
                    try {
                        const deleteResult = await window.electron.fileExplorer.deleteFile(tabId, remotePath, file.type === 'directory');
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
                    
                    setTransferProgress({ type: 'delete', current: i + 1, total: selectedFiles.length });
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
            const result = await window.electron.fileExplorer.createDirectory(tabId, remotePath);
            
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

    const toolbarLeft = (
        <div className="flex align-items-center gap-2 flex-wrap">
            <Button 
                icon="pi pi-arrow-left" 
                onClick={() => {
                    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                    navigateToPath(parentPath);
                }}
                disabled={!sshReady || !currentPath || currentPath === '/'}
                tooltip="Atrás"
                size="small"
            />
            <Button 
                icon="pi pi-refresh" 
                onClick={() => currentPath && loadFiles(currentPath)}
                disabled={!sshReady || !currentPath}
                tooltip="Actualizar"
                size="small"
            />
            <Button 
                icon="pi pi-home" 
                onClick={() => navigateToPath('/')}
                disabled={!sshReady || !currentPath}
                tooltip="Inicio"
                size="small"
            />
            <Button 
                icon="pi pi-upload" 
                label="Subir"
                onClick={handleUploadFiles}
                disabled={!sshReady || !currentPath || loading}
                tooltip="Subir archivos"
                size="small"
            />
            <Button 
                icon="pi pi-folder" 
                label="Carpeta"
                onClick={() => setNewFolderDialog(true)}
                disabled={!sshReady || !currentPath || loading}
                tooltip="Crear nueva carpeta"
                size="small"
            />
            <Button 
                icon="pi pi-trash" 
                label="Eliminar"
                className="p-button-danger" 
                onClick={handleDeleteFiles}
                disabled={!sshReady || !currentPath || loading || selectedFiles.length === 0}
                tooltip="Eliminar archivos seleccionados"
                size="small"
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
        <div className="file-explorer-container">
            <Card 
                title={`Explorador de Archivos - ${sshConfig.host}`}
                className="file-explorer-card"
            >
                <Toolbar 
                    start={toolbarLeft} 
                    end={toolbarRight}
                    className="file-explorer-toolbar"
                />
                
                <BreadCrumb 
                    model={breadcrumbItems} 
                    className="file-explorer-breadcrumb"
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
                    <div className="file-explorer-table-container">
                        <DataTable 
                            value={files}
                            selectionMode="multiple"
                            selection={selectedFiles}
                            onSelectionChange={(e) => setSelectedFiles(e.value)}
                            onRowDoubleClick={(e) => onFileDoubleClick(e.data)}
                            rowHover={true}
                            className="file-explorer-datatable"
                        >
                        <Column 
                            field="name" 
                            header="Nombre" 
                            body={nameBodyTemplate}
                            sortable
                            style={{ minWidth: '200px' }}
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
                                        <Button 
                                            icon="pi pi-download" 
                                            size="small"
                                            className="p-button-text" 
                                            onClick={() => handleDownloadFile(file)}
                                            tooltip="Descargar archivo"
                                        />
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
            
            {/* Diálogo de confirmación */}
            <ConfirmDialog />
        </div>
    );
};

export default FileExplorer; 