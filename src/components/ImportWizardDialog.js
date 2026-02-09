/**
 * ImportWizardDialog - Diálogo de importación unificado con wizard de pasos
 * 
 * Características:
 * - 4 pasos: Seleccionar Fuente → Configurar → Vista Previa → Importar
 * - Fuentes: NodeTerm (.nodeterm), mRemoteNG (.xml), KeePass (.kdbx)
 * - Diseño moderno con glassmorphism
 * - Vista previa antes de importar
 * - Carpetas destino automáticas por tipo
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Steps } from 'primereact/steps';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tree } from 'primereact/tree';
import ImportService from '../services/ImportService';
import exportImportService from '../services/ExportImportService';
import { useTranslation } from '../i18n/hooks/useTranslation';

// Definición de fuentes de importación
const IMPORT_SOURCES = {
    // NodeTerm
    nodeterm: {
        id: 'nodeterm',
        category: 'nodeterm',
        label: 'Backup de NodeTerm',
        description: 'Restaurar sesiones, contraseñas y configuración',
        icon: 'pi pi-box',
        extension: '.nodeterm',
        implemented: true,
        defaultFolder: 'Importados/NodeTerm'
    },
    // Gestores SSH
    mremoteng: {
        id: 'mremoteng',
        category: 'ssh',
        label: 'mRemoteNG',
        description: 'Archivo confCons.xml',
        icon: 'pi pi-server',
        extension: '.xml',
        implemented: true,
        defaultFolder: 'Importados/mRemoteNG'
    },
    putty: {
        id: 'putty',
        category: 'ssh',
        label: 'PuTTY',
        description: 'Sesiones del registro',
        icon: 'pi pi-desktop',
        extension: '.reg',
        implemented: false,
        defaultFolder: 'Importados/PuTTY'
    },
    securecrt: {
        id: 'securecrt',
        category: 'ssh',
        label: 'SecureCRT',
        description: 'Sesiones exportadas',
        icon: 'pi pi-lock',
        extension: '.xml',
        implemented: false,
        defaultFolder: 'Importados/SecureCRT'
    },
    mobaxterm: {
        id: 'mobaxterm',
        category: 'ssh',
        label: 'MobaXterm',
        description: 'Configuración exportada',
        icon: 'pi pi-tablet',
        extension: '.mxtpro',
        implemented: false,
        defaultFolder: 'Importados/MobaXterm'
    },
    // Gestores de contraseñas
    keepass: {
        id: 'keepass',
        category: 'passwords',
        label: 'KeePass',
        description: 'Base de datos .kdbx',
        icon: 'pi pi-key',
        extension: '.kdbx',
        implemented: true,
        defaultFolder: 'Importados/KeePass'
    },
    onepassword: {
        id: 'onepassword',
        category: 'passwords',
        label: '1Password',
        description: 'Exportación CSV',
        icon: 'pi pi-shield',
        extension: '.csv',
        implemented: false,
        defaultFolder: 'Importados/1Password'
    },
    bitwarden: {
        id: 'bitwarden',
        category: 'passwords',
        label: 'Bitwarden',
        description: 'JSON o CSV exportado',
        icon: 'pi pi-lock',
        extension: '.json',
        implemented: false,
        defaultFolder: 'Importados/Bitwarden'
    }
};

const ImportWizardDialog = ({
    visible,
    onHide,
    onImportComplete,
    onImportPasswordsComplete,
    showToast,
    targetFolderOptions = [],
    defaultTargetFolderKey
}) => {
    const { t } = useTranslation('common');
    const toast = useRef(null);

    // Estado del wizard
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedSource, setSelectedSource] = useState(null);

    // Estado de archivo
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedKeyFile, setSelectedKeyFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Configuración de importación
    const [password, setPassword] = useState('');
    const [targetFolder, setTargetFolder] = useState(defaultTargetFolderKey || 'ROOT');
    const [createContainerFolder, setCreateContainerFolder] = useState(true);
    const [containerFolderName, setContainerFolderName] = useState('');
    const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'

    // Opciones específicas para NodeTerm
    const [nodetermOptions, setNodeTermOptions] = useState({
        connections: true,
        passwords: true,
        conversations: true,
        config: true,
        recordings: false
    });

    // Vista previa
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    // Estado de importación
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');
    const [importResult, setImportResult] = useState(null);

    // Refs para inputs de archivo
    const fileInputRef = useRef(null);
    const keyFileInputRef = useRef(null);

    // Pasos del wizard
    const steps = [
        { label: 'Fuente', icon: 'pi pi-box' },
        { label: 'Configurar', icon: 'pi pi-cog' },
        { label: 'Vista Previa', icon: 'pi pi-eye' },
        { label: 'Importar', icon: 'pi pi-check' }
    ];

    // Resetear estado al cerrar
    const resetState = useCallback(() => {
        setCurrentStep(0);
        setSelectedSource(null);
        setSelectedFile(null);
        setSelectedKeyFile(null);
        setPassword('');
        setTargetFolder(defaultTargetFolderKey || 'ROOT');
        setCreateContainerFolder(true);
        setContainerFolderName('');
        setImportMode('merge');
        setNodeTermOptions({
            connections: true,
            passwords: true,
            conversations: true,
            config: true,
            recordings: false
        });
        setPreviewData(null);
        setPreviewLoading(false);
        setPreviewError(null);
        setImporting(false);
        setImportProgress(0);
        setImportStatus('');
        setImportResult(null);
        setIsDragOver(false);
    }, [defaultTargetFolderKey]);

    // Cerrar diálogo
    const handleClose = useCallback(() => {
        if (!importing) {
            resetState();
            onHide();
        }
    }, [importing, resetState, onHide]);

    // Helper para mostrar toasts
    const showToastSafe = useCallback((opts) => {
        if (showToast) {
            showToast(opts);
        } else if (toast.current?.show) {
            toast.current.show({ life: 4000, ...opts });
        }
    }, [showToast]);

    // Actualizar nombre de carpeta cuando cambia la fuente
    useEffect(() => {
        if (selectedSource) {
            const source = IMPORT_SOURCES[selectedSource];
            if (source) {
                setContainerFolderName(`${source.label} - ${new Date().toLocaleDateString()}`);
            }
        }
    }, [selectedSource]);

    // Manejar selección de fuente
    const handleSourceSelect = (sourceId) => {
        const source = IMPORT_SOURCES[sourceId];
        if (source && source.implemented) {
            setSelectedSource(sourceId);
        }
    };

    // Drag & Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelected(files[0]);
        }
    };

    const handleFileSelected = (file) => {
        if (!file) return;

        const source = IMPORT_SOURCES[selectedSource];
        if (!source) return;

        // Validar extensión
        const ext = source.extension.toLowerCase();
        const fileName = file.name.toLowerCase();

        if (!fileName.endsWith(ext)) {
            showToastSafe({
                severity: 'error',
                summary: 'Error',
                detail: `Solo se permiten archivos ${source.extension}`,
                life: 3000
            });
            return;
        }

        setSelectedFile(file);
        setPreviewData(null);
        setPreviewError(null);
    };

    const handleChooseFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelected(file);
        }
        e.target.value = '';
    };

    const handleKeyFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedKeyFile(file);
        }
        e.target.value = '';
    };

    // Navegar entre pasos
    const canGoNext = () => {
        switch (currentStep) {
            case 0: // Seleccionar fuente
                return selectedSource !== null;
            case 1: // Configurar
                if (!selectedFile) return false;
                // Para KeePass, necesita contraseña o key file
                if (selectedSource === 'keepass' && !password && !selectedKeyFile) return false;
                return true;
            case 2: // Vista previa
                return previewData !== null && !previewError;
            case 3: // Importar
                return importResult !== null;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            // Al pasar de Configurar a Vista Previa, generar preview
            await generatePreview();
        }
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            // Limpiar estados según el paso
            if (currentStep === 2) {
                setPreviewData(null);
                setPreviewError(null);
            }
            if (currentStep === 3) {
                setImportResult(null);
                setImporting(false);
                setImportProgress(0);
            }
        }
    };

    // Generar vista previa
    const generatePreview = async () => {
        if (!selectedFile || !selectedSource) return;

        setPreviewLoading(true);
        setPreviewError(null);

        try {
            switch (selectedSource) {
                case 'nodeterm':
                    await generateNodeTermPreview();
                    break;
                case 'mremoteng':
                    await generateMRemoteNGPreview();
                    break;
                case 'keepass':
                    await generateKeePassPreview();
                    break;
                default:
                    throw new Error('Fuente no soportada');
            }
        } catch (error) {
            console.error('[ImportWizard] Error generando preview:', error);
            setPreviewError(error.message || 'Error al procesar el archivo');
        } finally {
            setPreviewLoading(false);
        }
    };

    const generateNodeTermPreview = async () => {
        try {
            const text = await readFileAsText(selectedFile);
            let data = JSON.parse(text);

            // Si está encriptado, intentar desencriptar
            if (data.encrypted && data.encryptedData) {
                if (!password) {
                    throw new Error('Este archivo está encriptado. Ingrese la contraseña.');
                }
                data = await exportImportService.decryptData(data.encryptedData, password);
            }

            // Validar estructura
            const validation = await exportImportService.validateExportFile(data);
            if (!validation.valid) {
                throw new Error(validation.error || 'Archivo inválido');
            }

            // Generar preview
            const preview = await exportImportService.getExportPreview(data);
            setPreviewData({
                type: 'nodeterm',
                summary: preview,
                data: data,
                stats: {
                    connections: preview.connections?.count || 0,
                    passwords: preview.passwords?.count || 0,
                    conversations: preview.conversations?.count || 0,
                    config: preview.config ? 1 : 0
                }
            });
        } catch (error) {
            throw error;
        }
    };

    const generateMRemoteNGPreview = async () => {
        try {
            const result = await ImportService.importFromMRemoteNG(selectedFile);

            if (!result.success) {
                throw new Error(result.error || 'Error al procesar el archivo XML');
            }

            // Convertir estructura a árbol para preview
            const treeNodes = convertStructureToTree(result.structure?.nodes || []);

            setPreviewData({
                type: 'mremoteng',
                structure: result.structure,
                metadata: result.metadata,
                treeNodes: treeNodes,
                stats: {
                    connections: result.structure?.connectionCount || result.count || 0,
                    folders: result.structure?.folderCount || 0,
                    sshCount: countByType(result.structure?.nodes, 'ssh'),
                    rdpCount: countByType(result.structure?.nodes, 'rdp')
                }
            });
        } catch (error) {
            throw error;
        }
    };

    const generateKeePassPreview = async () => {
        try {
            // Cargar kdbxweb si no está cargado
            const kdbxweb = await ensureKdbxwebLoaded();

            const ab = await readFileAsArrayBuffer(selectedFile);
            const keyAb = selectedKeyFile ? await readFileAsArrayBuffer(selectedKeyFile) : null;

            const credentials = new kdbxweb.Credentials(
                password ? kdbxweb.ProtectedValue.fromString(password) : null,
                keyAb ? new Uint8Array(keyAb) : null
            );

            const db = await kdbxweb.Kdbx.load(ab, credentials);

            // Contar entradas
            let entryCount = 0;
            let groupCount = 0;

            const countEntries = (groups) => {
                for (const group of groups) {
                    groupCount++;
                    if (group.entries) entryCount += group.entries.length;
                    if (group.groups) countEntries(group.groups);
                }
            };

            if (db.groups) countEntries(db.groups);

            setPreviewData({
                type: 'keepass',
                db: db,
                stats: {
                    entries: entryCount,
                    groups: groupCount
                }
            });
        } catch (error) {
            const rawMsg = error?.message || error?.toString() || '';
            if (/InvalidKey/i.test(rawMsg)) {
                throw new Error('Contraseña o archivo clave incorrecto');
            }
            throw error;
        }
    };

    // Ejecutar importación
    const handleImport = async () => {
        if (!previewData) return;

        setImporting(true);
        setImportProgress(0);
        setImportStatus('Iniciando importación...');
        setCurrentStep(3);

        try {
            switch (selectedSource) {
                case 'nodeterm':
                    await importNodeTerm();
                    break;
                case 'mremoteng':
                    await importMRemoteNG();
                    break;
                case 'keepass':
                    await importKeePass();
                    break;
                default:
                    throw new Error('Fuente no soportada');
            }
        } catch (error) {
            console.error('[ImportWizard] Error importando:', error);
            setImportResult({
                success: false,
                error: error.message || 'Error durante la importación'
            });
            showToastSafe({
                severity: 'error',
                summary: 'Error de importación',
                detail: error.message || 'Error durante la importación',
                life: 5000
            });
        } finally {
            setImporting(false);
        }
    };

    const importNodeTerm = async () => {
        setImportStatus('Procesando datos...');
        setImportProgress(20);

        const data = previewData.data;

        // Importar usando el servicio
        setImportProgress(40);
        setImportStatus('Importando...');

        const result = await exportImportService.importAllData(data, {
            merge: importMode === 'merge',
            replace: importMode === 'replace',
            categories: Object.entries(nodetermOptions)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => key),
            decryptPassword: password || null
        });

        setImportProgress(100);
        setImportStatus('Completado');

        setImportResult({
            success: true,
            stats: {
                connections: result.connections || 0,
                passwords: result.passwords || 0,
                conversations: result.conversations || 0,
                config: result.config ? 1 : 0
            }
        });

        showToastSafe({
            severity: 'success',
            summary: 'Importación exitosa',
            detail: 'Datos de NodeTerm importados correctamente',
            life: 5000
        });
    };

    const importMRemoteNG = async () => {
        setImportStatus('Procesando sesiones...');
        setImportProgress(30);

        const result = await ImportService.importFromMRemoteNG(selectedFile);

        if (!result.success) {
            throw new Error(result.error || 'Error al procesar el archivo');
        }

        setImportProgress(60);
        setImportStatus('Creando estructura...');

        if (onImportComplete) {
            await onImportComplete({
                ...result,
                createContainerFolder: createContainerFolder,
                containerFolderName: containerFolderName,
                overwrite: importMode === 'replace',
                linkFile: false,
                targetBaseFolderKey: targetFolder,
                linkedTargetFolderKey: targetFolder
            });
        }

        setImportProgress(100);
        setImportStatus('Completado');

        setImportResult({
            success: true,
            stats: {
                connections: result.structure?.connectionCount || result.count || 0,
                folders: result.structure?.folderCount || 0
            }
        });

        showToastSafe({
            severity: 'success',
            summary: 'Importación exitosa',
            detail: `Se importaron ${result.structure?.connectionCount || result.count} conexiones`,
            life: 5000
        });
    };

    const importKeePass = async () => {
        setImportStatus('Procesando contraseñas...');
        setImportProgress(30);

        const db = previewData.db;
        const nodes = await mapKeePassToNodes(db);

        setImportProgress(70);
        setImportStatus('Guardando...');

        const payload = {
            nodes,
            createContainerFolder: createContainerFolder,
            containerFolderName: containerFolderName
        };

        if (onImportPasswordsComplete) {
            onImportPasswordsComplete(payload);
        } else {
            window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
        }

        setImportProgress(100);
        setImportStatus('Completado');

        setImportResult({
            success: true,
            stats: {
                entries: previewData.stats.entries,
                groups: previewData.stats.groups
            }
        });

        showToastSafe({
            severity: 'success',
            summary: 'Importación exitosa',
            detail: `Se importaron ${previewData.stats.entries} contraseñas`,
            life: 5000
        });
    };

    // Utilidades
    const readFileAsText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });

    const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsArrayBuffer(file);
    });

    const ensureKdbxwebLoaded = () => new Promise((resolve, reject) => {
        if (window.kdbxweb) return resolve(window.kdbxweb);
        const script = document.createElement('script');
        script.src = 'vendor/kdbxweb.min.js';
        script.async = true;
        script.onload = () => window.kdbxweb ? resolve(window.kdbxweb) : reject(new Error('kdbxweb no se cargó'));
        script.onerror = () => reject(new Error('No se pudo cargar kdbxweb'));
        document.head.appendChild(script);
    });

    const mapKeePassToNodes = async (db) => {
        const genKey = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

        const protectedToString = async (val) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            if (typeof val.getText === 'function') {
                try { return val.getText() || ''; } catch { return ''; }
            }
            return String(val || '');
        };

        const getEntryField = (entry, key) => {
            if (!entry?.fields) return null;
            if (typeof entry.fields.get === 'function') return entry.fields.get(key);
            return entry.fields[key];
        };

        const toPasswordNode = async (entry, groupPath) => {
            const title = await protectedToString(getEntryField(entry, 'Title'));
            const username = await protectedToString(getEntryField(entry, 'UserName') || getEntryField(entry, 'Username'));
            const password = await protectedToString(getEntryField(entry, 'Password'));
            const url = await protectedToString(getEntryField(entry, 'URL'));
            const notes = await protectedToString(getEntryField(entry, 'Notes'));

            const key = genKey('password');
            return {
                key,
                label: title || username || url || '(Sin título)',
                data: { type: 'password', username, password, url, notes, group: groupPath },
                uid: key,
                createdAt: new Date().toISOString(),
                isUserCreated: true,
                draggable: true,
                droppable: false
            };
        };

        const toFolderNode = (label) => {
            const key = genKey('password_folder');
            return {
                key,
                label,
                droppable: true,
                children: [],
                uid: key,
                createdAt: new Date().toISOString(),
                isUserCreated: true,
                data: { type: 'password-folder' }
            };
        };

        const processGroup = async (group, path = []) => {
            const currentPath = [...path, group.name].filter(Boolean);
            const folder = toFolderNode(group.name || 'Carpeta');

            if (Array.isArray(group.entries)) {
                for (const entry of group.entries) {
                    folder.children.push(await toPasswordNode(entry, currentPath.join(' / ')));
                }
            }
            if (Array.isArray(group.groups)) {
                for (const sub of group.groups) {
                    folder.children.push(await processGroup(sub, currentPath));
                }
            }
            return folder;
        };

        const result = [];
        for (const root of db.groups) {
            result.push(await processGroup(root, []));
        }
        return result;
    };

    const convertStructureToTree = (nodes) => {
        return nodes.map(node => ({
            key: node.key,
            label: node.label,
            icon: node.children ? 'pi pi-folder' : getConnectionIcon(node.data?.type),
            children: node.children ? convertStructureToTree(node.children) : undefined
        }));
    };

    const getConnectionIcon = (type) => {
        switch (type) {
            case 'ssh': return 'pi pi-desktop';
            case 'rdp': return 'pi pi-microsoft';
            case 'vnc': return 'pi pi-eye';
            default: return 'pi pi-link';
        }
    };

    const countByType = (nodes, type) => {
        if (!nodes) return 0;
        let count = 0;
        for (const node of nodes) {
            if (node.data?.type === type) count++;
            if (node.children) count += countByType(node.children, type);
        }
        return count;
    };

    // Opciones de carpeta destino
    const folderOptions = [
        { label: 'Raíz', value: 'ROOT' },
        ...(targetFolderOptions || [])
    ];

    // Renderizar contenido según el paso actual
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderSourceSelection();
            case 1:
                return renderConfiguration();
            case 2:
                return renderPreview();
            case 3:
                return renderImport();
            default:
                return null;
        }
    };

    // STEP 0: Selección de fuente
    const renderSourceSelection = () => (
        <div className="import-wizard-sources">
            <h4 className="import-wizard-section-title">
                <i className="pi pi-box" />
                ¿Qué deseas importar?
            </h4>

            {/* NodeTerm */}
            <div className="import-wizard-category">
                <h5 className="import-wizard-category-title">
                    <i className="pi pi-box" style={{ color: 'var(--primary-color)' }} />
                    NodeTerm
                </h5>
                <div className="import-wizard-source-grid">
                    <SourceCard
                        source={IMPORT_SOURCES.nodeterm}
                        selected={selectedSource === 'nodeterm'}
                        onSelect={() => handleSourceSelect('nodeterm')}
                    />
                </div>
            </div>

            {/* Gestores SSH */}
            <div className="import-wizard-category">
                <h5 className="import-wizard-category-title">
                    <i className="pi pi-server" style={{ color: 'var(--primary-color)' }} />
                    Gestores de Sesiones
                </h5>
                <div className="import-wizard-source-grid">
                    {['mremoteng', 'putty', 'securecrt', 'mobaxterm'].map(id => (
                        <SourceCard
                            key={id}
                            source={IMPORT_SOURCES[id]}
                            selected={selectedSource === id}
                            onSelect={() => handleSourceSelect(id)}
                        />
                    ))}
                </div>
            </div>

            {/* Gestores de contraseñas */}
            <div className="import-wizard-category">
                <h5 className="import-wizard-category-title">
                    <i className="pi pi-key" style={{ color: 'var(--primary-color)' }} />
                    Gestores de Contraseñas
                </h5>
                <div className="import-wizard-source-grid">
                    {['keepass', 'onepassword', 'bitwarden'].map(id => (
                        <SourceCard
                            key={id}
                            source={IMPORT_SOURCES[id]}
                            selected={selectedSource === id}
                            onSelect={() => handleSourceSelect(id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    // STEP 1: Configuración
    const renderConfiguration = () => {
        const source = IMPORT_SOURCES[selectedSource];
        if (!source) return null;

        return (
            <div className="import-wizard-config">
                <h4 className="import-wizard-section-title">
                    <i className={source.icon} />
                    Importar desde {source.label}
                </h4>

                {/* Dropzone */}
                <div
                    className={`import-wizard-dropzone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleChooseFile : undefined}
                >
                    {!selectedFile ? (
                        <>
                            <i className="pi pi-cloud-upload import-wizard-dropzone-icon" />
                            <div className="import-wizard-dropzone-text">
                                Arrastra tu archivo {source.extension} aquí
                                <br />
                                <span className="import-wizard-dropzone-hint">o haz clic para seleccionar</span>
                            </div>
                        </>
                    ) : (
                        <div className="import-wizard-file-info">
                            <div className="import-wizard-file-icon">
                                <i className={source.icon} />
                            </div>
                            <div className="import-wizard-file-details">
                                <div className="import-wizard-file-name">{selectedFile.name}</div>
                                <div className="import-wizard-file-size">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </div>
                            </div>
                            <div className="import-wizard-file-actions">
                                <Button
                                    icon="pi pi-refresh"
                                    className="p-button-outlined p-button-sm"
                                    onClick={(e) => { e.stopPropagation(); handleChooseFile(); }}
                                    tooltip="Cambiar archivo"
                                />
                                <Button
                                    icon="pi pi-times"
                                    className="p-button-outlined p-button-danger p-button-sm"
                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                    tooltip="Quitar archivo"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={source.extension}
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />

                {/* Campos específicos por fuente */}
                {selectedSource === 'nodeterm' && renderNodeTermConfig()}
                {selectedSource === 'mremoteng' && renderMRemoteNGConfig()}
                {selectedSource === 'keepass' && renderKeePassConfig()}
            </div>
        );
    };

    const renderNodeTermConfig = () => (
        <div className="import-wizard-options">
            {/* Contraseña si está encriptado */}
            <div className="import-wizard-field">
                <label>
                    <i className="pi pi-lock" />
                    Contraseña (si está encriptado)
                </label>
                <Password
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    toggleMask
                    feedback={false}
                    placeholder="Contraseña del archivo"
                    inputStyle={{ width: '100%' }}
                />
            </div>

            {/* Selección de categorías */}
            <div className="import-wizard-field">
                <label>
                    <i className="pi pi-list" />
                    Seleccionar qué importar
                </label>
                <div className="import-wizard-checkboxes">
                    {[
                        { key: 'connections', label: 'Sesiones SSH/RDP', icon: 'pi pi-desktop' },
                        { key: 'passwords', label: 'Contraseñas guardadas', icon: 'pi pi-key' },
                        { key: 'conversations', label: 'Conversaciones IA', icon: 'pi pi-comments' },
                        { key: 'config', label: 'Configuración', icon: 'pi pi-cog' },
                        { key: 'recordings', label: 'Grabaciones (metadata)', icon: 'pi pi-video' }
                    ].map(opt => (
                        <div key={opt.key} className="import-wizard-checkbox">
                            <Checkbox
                                inputId={`opt-${opt.key}`}
                                checked={nodetermOptions[opt.key]}
                                onChange={(e) => setNodeTermOptions(prev => ({ ...prev, [opt.key]: e.checked }))}
                            />
                            <label htmlFor={`opt-${opt.key}`}>
                                <i className={opt.icon} />
                                {opt.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderMRemoteNGConfig = () => (
        <div className="import-wizard-options">
            {/* Carpeta destino */}
            <div className="import-wizard-field">
                <label>
                    <i className="pi pi-folder" />
                    Carpeta destino
                </label>
                <Dropdown
                    value={targetFolder}
                    options={folderOptions}
                    onChange={(e) => setTargetFolder(e.value)}
                    placeholder="Seleccionar carpeta"
                    style={{ width: '100%' }}
                />
            </div>

            {/* Crear carpeta contenedora */}
            <div className="import-wizard-checkbox">
                <Checkbox
                    inputId="create-container"
                    checked={createContainerFolder}
                    onChange={(e) => setCreateContainerFolder(e.checked)}
                />
                <label htmlFor="create-container">
                    <i className="pi pi-folder-open" />
                    Crear carpeta contenedora
                </label>
            </div>

            {createContainerFolder && (
                <div className="import-wizard-field" style={{ marginLeft: '28px' }}>
                    <InputText
                        value={containerFolderName}
                        onChange={(e) => setContainerFolderName(e.target.value)}
                        placeholder="Nombre de la carpeta"
                        style={{ width: '100%' }}
                    />
                </div>
            )}
        </div>
    );

    const renderKeePassConfig = () => (
        <div className="import-wizard-options">
            {/* Contraseña */}
            <div className="import-wizard-field">
                <label>
                    <i className="pi pi-lock" />
                    Contraseña maestra
                </label>
                <Password
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    toggleMask
                    feedback={false}
                    placeholder="Contraseña de la base de datos"
                    inputStyle={{ width: '100%' }}
                />
            </div>

            {/* Archivo de clave */}
            <div className="import-wizard-field">
                <label>
                    <i className="pi pi-key" />
                    Archivo de clave (opcional)
                </label>
                {!selectedKeyFile ? (
                    <Button
                        label="Seleccionar archivo .key"
                        icon="pi pi-plus"
                        className="p-button-outlined"
                        onClick={() => keyFileInputRef.current?.click()}
                    />
                ) : (
                    <div className="import-wizard-key-file">
                        <span><i className="pi pi-file" /> {selectedKeyFile.name}</span>
                        <Button
                            icon="pi pi-times"
                            className="p-button-text p-button-danger p-button-sm"
                            onClick={() => setSelectedKeyFile(null)}
                        />
                    </div>
                )}
                <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".key,.bin,.txt,*"
                    style={{ display: 'none' }}
                    onChange={handleKeyFileInputChange}
                />
                <small className="import-wizard-hint">
                    Puede usar contraseña, archivo clave o ambos.
                </small>
            </div>

            {/* Carpeta destino */}
            <div className="import-wizard-checkbox">
                <Checkbox
                    inputId="kp-create-container"
                    checked={createContainerFolder}
                    onChange={(e) => setCreateContainerFolder(e.checked)}
                />
                <label htmlFor="kp-create-container">
                    <i className="pi pi-folder-open" />
                    Crear carpeta contenedora
                </label>
            </div>

            {createContainerFolder && (
                <div className="import-wizard-field" style={{ marginLeft: '28px' }}>
                    <InputText
                        value={containerFolderName}
                        onChange={(e) => setContainerFolderName(e.target.value)}
                        placeholder="Nombre de la carpeta"
                        style={{ width: '100%' }}
                    />
                </div>
            )}
        </div>
    );

    // STEP 2: Vista previa
    const renderPreview = () => {
        if (previewLoading) {
            return (
                <div className="import-wizard-loading">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
                    <p>Procesando archivo...</p>
                </div>
            );
        }

        if (previewError) {
            return (
                <div className="import-wizard-error">
                    <Message severity="error" text={previewError} />
                    <Button
                        label="Volver a intentar"
                        icon="pi pi-refresh"
                        className="p-button-outlined"
                        onClick={generatePreview}
                        style={{ marginTop: '1rem' }}
                    />
                </div>
            );
        }

        if (!previewData) {
            return (
                <div className="import-wizard-loading">
                    <p>Cargando vista previa...</p>
                </div>
            );
        }

        return (
            <div className="import-wizard-preview">
                <h4 className="import-wizard-section-title">
                    <i className="pi pi-eye" />
                    Vista previa de la importación
                </h4>

                {/* Resumen estadístico */}
                <div className="import-wizard-stats">
                    {renderPreviewStats()}
                </div>

                {/* Árbol de estructura (solo para mRemoteNG) */}
                {previewData.type === 'mremoteng' && previewData.treeNodes && (
                    <div className="import-wizard-tree">
                        <h5>Estructura a importar:</h5>
                        <div className="import-wizard-tree-container">
                            <Tree
                                value={previewData.treeNodes}
                                selectionMode={null}
                            />
                        </div>
                    </div>
                )}

                {/* Configuración final */}
                <div className="import-wizard-final-config">
                    <div className="import-wizard-field">
                        <label>
                            <i className="pi pi-folder" />
                            Destino: <strong>{containerFolderName || 'Raíz'}</strong>
                        </label>
                    </div>
                </div>
            </div>
        );
    };

    const renderPreviewStats = () => {
        if (!previewData) return null;

        switch (previewData.type) {
            case 'nodeterm':
                return (
                    <div className="import-wizard-stats-grid">
                        <StatCard icon="pi pi-desktop" label="Conexiones" value={previewData.stats.connections} />
                        <StatCard icon="pi pi-key" label="Contraseñas" value={previewData.stats.passwords} />
                        <StatCard icon="pi pi-comments" label="Conversaciones" value={previewData.stats.conversations} />
                        <StatCard icon="pi pi-cog" label="Configuración" value={previewData.stats.config ? 'Sí' : 'No'} />
                    </div>
                );
            case 'mremoteng':
                return (
                    <div className="import-wizard-stats-grid">
                        <StatCard icon="pi pi-desktop" label="SSH" value={previewData.stats.sshCount} color="var(--green-500)" />
                        <StatCard icon="pi pi-microsoft" label="RDP" value={previewData.stats.rdpCount} color="var(--blue-500)" />
                        <StatCard icon="pi pi-folder" label="Carpetas" value={previewData.stats.folders} color="var(--orange-500)" />
                        <StatCard icon="pi pi-link" label="Total" value={previewData.stats.connections} color="var(--primary-color)" />
                    </div>
                );
            case 'keepass':
                return (
                    <div className="import-wizard-stats-grid">
                        <StatCard icon="pi pi-key" label="Contraseñas" value={previewData.stats.entries} color="var(--green-500)" />
                        <StatCard icon="pi pi-folder" label="Grupos" value={previewData.stats.groups} color="var(--orange-500)" />
                    </div>
                );
            default:
                return null;
        }
    };

    // STEP 3: Importación
    const renderImport = () => {
        if (importing) {
            return (
                <div className="import-wizard-importing">
                    <h4 className="import-wizard-section-title">
                        <i className="pi pi-spin pi-spinner" />
                        Importando...
                    </h4>
                    <ProgressBar value={importProgress} showValue style={{ height: '8px', marginBottom: '1rem' }} />
                    <p className="import-wizard-status">{importStatus}</p>
                </div>
            );
        }

        if (importResult) {
            return (
                <div className={`import-wizard-result ${importResult.success ? 'success' : 'error'}`}>
                    <div className="import-wizard-result-icon">
                        <i className={importResult.success ? 'pi pi-check-circle' : 'pi pi-times-circle'} />
                    </div>
                    <h4>{importResult.success ? 'Importación completada' : 'Error en la importación'}</h4>

                    {importResult.success && importResult.stats && (
                        <div className="import-wizard-result-stats">
                            {Object.entries(importResult.stats).map(([key, value]) => (
                                <div key={key} className="import-wizard-result-stat">
                                    <span className="label">{key}:</span>
                                    <span className="value">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {importResult.error && (
                        <Message severity="error" text={importResult.error} style={{ marginTop: '1rem' }} />
                    )}
                </div>
            );
        }

        return null;
    };

    // Footer del diálogo
    const renderFooter = () => (
        <div className="import-wizard-footer">
            <div className="import-wizard-footer-left">
                {currentStep > 0 && currentStep < 3 && (
                    <Button
                        label="Atrás"
                        icon="pi pi-arrow-left"
                        className="p-button-text"
                        onClick={handleBack}
                        disabled={importing}
                    />
                )}
            </div>
            <div className="import-wizard-footer-right">
                <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    className="p-button-text"
                    onClick={handleClose}
                    disabled={importing}
                />
                {currentStep < 2 && (
                    <Button
                        label="Siguiente"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        onClick={handleNext}
                        disabled={!canGoNext()}
                    />
                )}
                {currentStep === 2 && (
                    <Button
                        label="Importar"
                        icon="pi pi-download"
                        onClick={handleImport}
                        disabled={!previewData || previewError}
                    />
                )}
                {currentStep === 3 && importResult && (
                    <Button
                        label="Cerrar"
                        icon="pi pi-check"
                        onClick={handleClose}
                    />
                )}
            </div>
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                visible={visible}
                onHide={handleClose}
                header={
                    <div className="import-wizard-header">
                        <i className="pi pi-download" />
                        <span>Importar a NodeTerm</span>
                    </div>
                }
                footer={renderFooter()}
                style={{ width: '700px', maxWidth: '95vw' }}
                modal
                draggable={false}
                resizable={false}
                closable={!importing}
                className="import-wizard-dialog"
            >
                <div className="import-wizard-content">
                    {/* Indicador de pasos */}
                    <Steps
                        model={steps}
                        activeIndex={currentStep}
                        readOnly
                        className="import-wizard-steps"
                    />

                    {/* Contenido del paso actual */}
                    <div className="import-wizard-step-content">
                        {renderStepContent()}
                    </div>
                </div>
            </Dialog>
        </>
    );
};

// Componente auxiliar: Tarjeta de fuente
const SourceCard = ({ source, selected, onSelect }) => {
    const isDisabled = !source.implemented;

    return (
        <div
            className={`import-source-card ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={!isDisabled ? onSelect : undefined}
        >
            <div className="import-source-card-icon">
                <i className={source.icon} />
            </div>
            <div className="import-source-card-content">
                <div className="import-source-card-label">{source.label}</div>
                <div className="import-source-card-desc">
                    {isDisabled ? '🔜 Próximamente' : source.description}
                </div>
            </div>
            {selected && (
                <div className="import-source-card-check">
                    <i className="pi pi-check" />
                </div>
            )}
        </div>
    );
};

// Componente auxiliar: Tarjeta de estadística
const StatCard = ({ icon, label, value, color }) => (
    <div className="import-wizard-stat-card">
        <div className="import-wizard-stat-icon" style={{ color: color || 'var(--primary-color)' }}>
            <i className={icon} />
        </div>
        <div className="import-wizard-stat-value">{value}</div>
        <div className="import-wizard-stat-label">{label}</div>
    </div>
);

export default ImportWizardDialog;
