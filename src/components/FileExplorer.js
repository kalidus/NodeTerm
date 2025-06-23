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

const FileExplorer = ({ sshConfig, tabId }) => {
    const [currentPath, setCurrentPath] = useState(null); // null indica que aún no hemos cargado el path inicial
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);
    const [error, setError] = useState(null);

    // Cargar directorio inicial (home del usuario)
    useEffect(() => {
        const initializeExplorer = async () => {
            if (!window.electron || !tabId) return;
            
            setLoading(true);
            try {
                // Obtener el directorio home del usuario
                const homeDir = await window.electron.fileExplorer.getHomeDirectory(tabId);
                setCurrentPath(homeDir || '/');
            } catch (err) {
                console.error('Error getting home directory:', err);
                setCurrentPath('/'); // Fallback al root
            } finally {
                setLoading(false);
            }
        };

        initializeExplorer();
    }, [tabId]);

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

    const toolbarLeft = (
        <div className="flex align-items-center">
            <Button 
                icon="pi pi-arrow-left" 
                className="mr-2" 
                onClick={() => {
                    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                    navigateToPath(parentPath);
                }}
                disabled={!currentPath || currentPath === '/'}
                tooltip="Atrás"
            />
            <Button 
                icon="pi pi-refresh" 
                className="mr-2" 
                onClick={() => currentPath && loadFiles(currentPath)}
                disabled={!currentPath}
                tooltip="Actualizar"
            />
            <Button 
                icon="pi pi-home" 
                className="mr-2" 
                onClick={() => navigateToPath('/')}
                disabled={!currentPath}
                tooltip="Inicio"
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
                
                {loading && (
                    <ProgressBar mode="indeterminate" className="file-explorer-loading" />
                )}
                
                {error && (
                    <Message severity="error" text={error} className="mb-3" />
                )}
                
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
                    </DataTable>
                </div>
            </Card>
        </div>
    );
};

export default FileExplorer; 