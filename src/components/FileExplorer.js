import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';

const FileExplorer = ({ sshConfig, tabId }) => {
    const [currentPath, setCurrentPath] = useState('/');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [breadcrumbItems, setBreadcrumbItems] = useState([]);

    // Simular datos de archivos (en implementación real, estos vendrían del servidor SSH)
    useEffect(() => {
        loadFiles(currentPath);
    }, [currentPath]);

    const loadFiles = async (path) => {
        setLoading(true);
        
        // Simular llamada a API para obtener archivos del servidor SSH
        setTimeout(() => {
            const mockFiles = [
                {
                    name: '..',
                    type: 'directory',
                    size: 0,
                    permissions: 'drwxr-xr-x',
                    owner: 'root',
                    group: 'root',
                    modified: '2024-01-15 10:30'
                },
                {
                    name: 'home',
                    type: 'directory',
                    size: 4096,
                    permissions: 'drwxr-xr-x',
                    owner: 'root',
                    group: 'root',
                    modified: '2024-01-15 10:30'
                },
                {
                    name: 'var',
                    type: 'directory',
                    size: 4096,
                    permissions: 'drwxr-xr-x',
                    owner: 'root',
                    group: 'root',
                    modified: '2024-01-15 10:30'
                },
                {
                    name: 'etc',
                    type: 'directory',
                    size: 4096,
                    permissions: 'drwxr-xr-x',
                    owner: 'root',
                    group: 'root',
                    modified: '2024-01-15 10:30'
                },
                {
                    name: 'example.txt',
                    type: 'file',
                    size: 1024,
                    permissions: '-rw-r--r--',
                    owner: 'user',
                    group: 'user',
                    modified: '2024-01-15 14:25'
                },
                {
                    name: 'script.sh',
                    type: 'file',
                    size: 2048,
                    permissions: '-rwxr-xr-x',
                    owner: 'user',
                    group: 'user',
                    modified: '2024-01-15 16:10'
                }
            ];
            
            setFiles(mockFiles);
            updateBreadcrumb(path);
            setLoading(false);
        }, 500);
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

    const navigateToPath = (path) => {
        setCurrentPath(path);
    };

    const onFileDoubleClick = (file) => {
        if (file.type === 'directory') {
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
            default:
                return 'pi pi-file';
        }
    };

    const nameBodyTemplate = (file) => {
        return (
            <div className="flex align-items-center">
                <i className={`${getFileIcon(file)} file-icon ${file.type === 'directory' ? 'directory-icon' : 'file-type-icon'}`}></i>
                <span>{file.name}</span>
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
                disabled={currentPath === '/'}
                tooltip="Atrás"
            />
            <Button 
                icon="pi pi-refresh" 
                className="mr-2" 
                onClick={() => loadFiles(currentPath)}
                tooltip="Actualizar"
            />
            <Button 
                icon="pi pi-home" 
                className="mr-2" 
                onClick={() => navigateToPath('/')}
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
                
                <div className="file-explorer-table">
                    <DataTable 
                        value={files}
                        selectionMode="multiple"
                        selection={selectedFiles}
                        onSelectionChange={(e) => setSelectedFiles(e.value)}
                        onRowDoubleClick={(e) => onFileDoubleClick(e.data)}
                        scrollable
                        scrollHeight="flex"
                        rowHover
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