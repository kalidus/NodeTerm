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
import { mapBrowserEntriesToNodes } from '../utils/passwordImportMapper';
import { useTranslation } from '../i18n/hooks/useTranslation';

// Definición de fuentes de importación
const IMPORT_SOURCES = {
    // Exportar
    export_nodeterm: {
        id: 'export_nodeterm',
        category: 'export',
        label: 'Exportar Copia de Seguridad',
        description: 'Crea una copia cifrada local de tus datos',
        icon: 'pi pi-download',
        extension: '.nodeterm',
        implemented: true,
        defaultFolder: ''
    },
    // NodeTerm (Importar)
    nodeterm: {
        id: 'nodeterm',
        category: 'nodeterm',
        label: 'Restaurar Copia de Seguridad',
        description: 'Restaura tus datos desde una copia local',
        icon: 'pi pi-upload',
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
    browser: {
        id: 'browser',
        category: 'passwords',
        label: 'Navegador web',
        description: 'Chrome, Edge, Brave o Firefox',
        icon: 'pi pi-globe',
        extension: '',
        implemented: true,
        defaultFolder: 'Importados/Navegador'
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
    },
    // Notas y documentos
    joplin: {
        id: 'joplin',
        category: 'documents',
        label: 'Joplin / Markdown',
        description: 'Importar notas desde archivos Markdown o Joplin ENEX',
        icon: 'pi pi-file-edit',
        extension: '.md,.txt,.enex',
        implemented: false,
        defaultFolder: 'Importados/Notas'
    },
    // APIs externas
    wallix: {
        id: 'wallix',
        category: 'api',
        label: 'Wallix API',
        description: 'Descargar sesiones desde Wallix Bastion',
        icon: 'pi pi-cloud-download',
        extension: '',
        implemented: true,
        defaultFolder: 'Importados/Wallix'
    }
};

// Componente de pasos estilo cyberpunk de neón
const CyberpunkStepper = ({ steps, activeIndex }) => {
    return (
        <div className="cyberpunk-stepper" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            width: '100%',
            marginBottom: '25px',
            padding: '10px 0'
        }}>
            {/* Línea de fondo */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '20px',
                right: '20px',
                height: '2px',
                background: 'rgba(255, 255, 255, 0.08)',
                transform: 'translateY(-50%)',
                zIndex: 0
            }} />
            
            {/* Línea de progreso de neón */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '20px',
                width: `calc(${(activeIndex / (steps.length - 1)) * 100}% - 20px)`,
                height: '2px',
                background: 'linear-gradient(90deg, var(--cyan-400, #00f2fe) 0%, var(--green-400, #10b981) 100%)',
                boxShadow: '0 0 10px var(--cyan-400, #00f2fe)',
                transform: 'translateY(-50%)',
                transition: 'width 0.4s ease',
                zIndex: 0
            }} />

            {steps.map((step, idx) => {
                const isActive = idx === activeIndex;
                const isCompleted = idx < activeIndex;
                
                let badgeBg = 'rgba(30, 30, 30, 0.8)';
                let badgeBorder = 'rgba(255, 255, 255, 0.1)';
                let iconColor = 'var(--text-color-secondary, #9ca3af)';
                let labelColor = 'var(--text-color-secondary, #9ca3af)';
                let glow = 'none';
                
                if (isActive) {
                    badgeBg = 'rgba(0, 242, 254, 0.08)';
                    badgeBorder = 'var(--cyan-400, #00f2fe)';
                    iconColor = 'var(--cyan-400, #00f2fe)';
                    labelColor = 'var(--cyan-400, #00f2fe)';
                    glow = '0 0 12px rgba(0, 242, 254, 0.4)';
                } else if (isCompleted) {
                    badgeBg = 'rgba(16, 185, 129, 0.06)';
                    badgeBorder = 'var(--green-500, #10b981)';
                    iconColor = 'var(--green-500, #10b981)';
                    labelColor = '#ffffff';
                    glow = '0 0 8px rgba(16, 185, 129, 0.3)';
                }

                return (
                    <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 1,
                        position: 'relative'
                    }}>
                        {/* Nodo hexagonal/tecnológico */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: badgeBg,
                            border: `2px solid ${badgeBorder}`,
                            borderRadius: '8px',
                            boxShadow: glow,
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}>
                            <i className={step.icon} style={{ fontSize: '13px', color: iconColor, transition: 'all 0.3s ease' }} />
                        </div>
                        
                        {/* Etiqueta */}
                        <span style={{
                            fontFamily: 'Consolas, Monaco, monospace',
                            fontSize: '11px',
                            fontWeight: isActive ? '700' : '500',
                            letterSpacing: '0.5px',
                            color: labelColor,
                            transition: 'all 0.3s ease',
                            textTransform: 'uppercase'
                        }}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const ImportWizardDialog = ({
    visible,
    onHide,
    onImportComplete,
    onImportPasswordsComplete,
    showToast,
    targetFolderOptions = [],
    defaultTargetFolderKey,
    isEmbedded = false,
    initialSource = null,
    initialStep = 0
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

    // Opciones específicas para Wallix
    const [wallixUrl, setWallixUrl] = useState('');
    const [wallixUsername, setWallixUsername] = useState('');

    // Importación desde navegador
    const [browserProfiles, setBrowserProfiles] = useState([]);
    const [selectedBrowserProfileId, setSelectedBrowserProfileId] = useState(null);
    const [firefoxMasterPassword, setFirefoxMasterPassword] = useState('');

    // Opciones específicas para NodeTerm
    const [nodetermOptions, setNodeTermOptions] = useState({
        connections: true,
        passwords: true,
        conversations: true,
        config: true,
        documents: true,
        recordings: false
    });

    // Estados de exportación
    const [fileName, setFileName] = useState(`nodeterm-backup-${new Date().toISOString().split('T')[0]}`);
    const [useEncryption, setUseEncryption] = useState(false);
    const [encryptPassword, setEncryptPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Ejecutar redirección al abrir/cambiar props iniciales
    useEffect(() => {
        if (visible) {
            if (initialSource) {
                setSelectedSource(initialSource);
                setCurrentStep(initialStep !== undefined ? initialStep : 1);
            } else {
                setSelectedSource(null);
                setCurrentStep(0);
            }
        }
    }, [visible, initialSource, initialStep]);

    // Vista previa
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewStatus, setPreviewStatus] = useState('');
    const [previewError, setPreviewError] = useState(null);

    // Estado de importación
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');
    const [importResult, setImportResult] = useState(null);

    // Refs para inputs de archivo
    const fileInputRef = useRef(null);
    const keyFileInputRef = useRef(null);

    const isExport = selectedSource === 'export_nodeterm';

    // Pasos del wizard dinámicos
    const steps = [
        { label: isExport ? 'Acción' : 'Fuente', icon: 'pi pi-box' },
        { label: 'Configurar', icon: 'pi pi-cog' },
        { label: isExport ? 'Análisis' : 'Vista Previa', icon: 'pi pi-eye' },
        { label: isExport ? 'Descargar' : 'Importar', icon: 'pi pi-check' }
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
        setWallixUrl('');
        setWallixUsername('');
        setBrowserProfiles([]);
        setSelectedBrowserProfileId(null);
        setFirefoxMasterPassword('');
        setNodeTermOptions({
            connections: true,
            passwords: true,
            conversations: true,
            config: true,
            documents: true,
            recordings: false
        });
        setPreviewData(null);
        setPreviewLoading(false);
        setPreviewStatus('');
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
            onHide && onHide();
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
    const loadBrowserProfiles = useCallback(async () => {
        if (!window.electron?.browserImport?.listProfiles) {
            setBrowserProfiles([]);
            return;
        }
        try {
            const res = await window.electron.browserImport.listProfiles();
            const list = res?.profiles || [];
            setBrowserProfiles(list);
            if (list.length) setSelectedBrowserProfileId(list[0].id);
        } catch {
            setBrowserProfiles([]);
        }
    }, []);

    const handleSourceSelect = (sourceId) => {
        const source = IMPORT_SOURCES[sourceId];
        if (source && source.implemented) {
            setSelectedSource(sourceId);
            if (sourceId === 'browser') {
                loadBrowserProfiles();
            }
        }
    };

    const selectedBrowserProfile = browserProfiles.find((p) => p.id === selectedBrowserProfileId) || null;

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
                if (selectedSource === 'export_nodeterm') {
                    const hasSelectedOption = Object.values(nodetermOptions).some(v => v === true);
                    if (!hasSelectedOption) return false;
                    if (!fileName) return false;
                    if (useEncryption) {
                        return encryptPassword.length >= 8 && encryptPassword === confirmPassword;
                    }
                    return true;
                }
                if (selectedSource === 'wallix') {
                    return wallixUrl && wallixUsername && password;
                }
                if (selectedSource === 'browser') {
                    return !!selectedBrowserProfileId;
                }
                if (!selectedFile) return false;
                // Para KeePass, necesita contraseña o key file
                if (selectedSource === 'keepass' && !password && !selectedKeyFile) return false;
                return true;
            case 2: // Vista previa / Análisis
                if (selectedSource === 'export_nodeterm') return true;
                return previewData !== null && !previewError;
            case 3: // Importar / Exportar completado
                return importResult !== null;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            if (selectedSource === 'export_nodeterm') {
                // Para exportar, no necesitamos generar preview remoto
                setCurrentStep(2);
                return;
            }
            // Pasar inmediatamente a Vista Previa para mostrar estado de carga
            // y evitar la sensación de UI bloqueada.
            setCurrentStep(2);
            await generatePreview();
            return;
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
        if (selectedSource !== 'wallix' && selectedSource !== 'browser' && !selectedFile) return;
        if (!selectedSource) return;

        setPreviewLoading(true);
        setPreviewStatus('Iniciando análisis...');
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
                case 'browser':
                    await generateBrowserPreview();
                    break;
                case 'wallix':
                    await generateWallixPreview();
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
            setPreviewStatus('Leyendo backup de NodeTerm...');
            const text = await readFileAsText(selectedFile);
            let data = JSON.parse(text);

            // Si está encriptado, intentar desencriptar
            if (data.encrypted && data.encryptedData) {
                if (!password) {
                    throw new Error('Este archivo está encriptado. Ingrese la contraseña.');
                }
                setPreviewStatus('Desencriptando archivo...');
                data = await exportImportService.decryptData(data.encryptedData, password);
            }

            // Validar estructura
            setPreviewStatus('Validando estructura...');
            const validation = await exportImportService.validateExportFile(data);
            if (!validation.valid) {
                throw new Error(validation.error || 'Archivo inválido');
            }

            // Generar preview
            setPreviewStatus('Generando vista previa...');
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
            setPreviewStatus('Parseando XML de mRemoteNG...');
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

    const generateBrowserPreview = async () => {
        if (!selectedBrowserProfile) {
            throw new Error('Seleccione un perfil de navegador');
        }
        setPreviewStatus('Leyendo credenciales del navegador...');
        let res;
        if (selectedBrowserProfile.type === 'firefox') {
            res = await window.electron.browserImport.importFirefox({
                profilePath: selectedBrowserProfile.profilePath,
                masterPassword: firefoxMasterPassword
            });
        } else {
            res = await window.electron.browserImport.importChromium({
                browserId: selectedBrowserProfile.browserId,
                userDataPath: selectedBrowserProfile.userDataPath,
                profileDir: selectedBrowserProfile.profileDir
            });
        }
        if (!res?.ok) {
            throw new Error(res?.error || 'Error al leer el perfil del navegador');
        }
        const entries = res.entries || [];
        const stats = res.stats || { imported: entries.length, skipped: 0 };
        setPreviewData({
            type: 'browser',
            entries,
            stats: {
                entries: stats.imported ?? entries.length,
                skipped: stats.skipped ?? 0,
                skippedAbe: stats.skippedAbe ?? 0
            },
            sampleUrls: entries.slice(0, 5).map((e) => e.url).filter(Boolean)
        });
    };

    const generateKeePassPreview = async () => {
        try {
            setPreviewStatus('Cargando librería KeePass...');
            // Cargar kdbxweb si no está cargado
            const kdbxweb = await ensureKdbxwebLoaded();

            setPreviewStatus('Leyendo base de datos KeePass...');
            const ab = await readFileAsArrayBuffer(selectedFile);
            const keyAb = selectedKeyFile ? await readFileAsArrayBuffer(selectedKeyFile) : null;

            const credentials = new kdbxweb.Credentials(
                password ? kdbxweb.ProtectedValue.fromString(password) : null,
                keyAb ? new Uint8Array(keyAb) : null
            );

            setPreviewStatus('Descifrando y analizando entradas...');
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

    const generateWallixPreview = async () => {
        try {
            setPreviewStatus('Conectando con API de Wallix...');
            const result = await ImportService.importFromWallix(wallixUrl, wallixUsername, password);

            if (!result.success) {
                throw new Error(result.error || 'Error al conectar con la API de Wallix');
            }

            setPreviewStatus('Construyendo estructura de conexiones...');
            const treeNodes = convertStructureToTree(result.structure?.nodes || []);

            setPreviewData({
                type: 'wallix',
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

    // Ejecutar importación
    const handleImport = async () => {
        if (!previewData && selectedSource !== 'export_nodeterm') return;

        setImporting(true);
        setImportProgress(0);
        setImportStatus(selectedSource === 'export_nodeterm' ? 'Iniciando empaquetado...' : 'Iniciando importación...');
        setCurrentStep(3);

        try {
            switch (selectedSource) {
                case 'export_nodeterm':
                    await exportNodeTerm();
                    break;
                case 'nodeterm':
                    await importNodeTerm();
                    break;
                case 'mremoteng':
                    await importMRemoteNG();
                    break;
                case 'keepass':
                    await importKeePass();
                    break;
                case 'browser':
                    await importBrowser();
                    break;
                case 'wallix':
                    await importWallix();
                    break;
                default:
                    throw new Error('Fuente no soportada');
            }
        } catch (error) {
            console.error('[ImportWizard] Error procesando:', error);
            setImportResult({
                success: false,
                error: error.message || 'Error durante la operación'
            });
            showToastSafe({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Error durante la operación',
                life: 5000
            });
        } finally {
            setImporting(false);
        }
    };

    const exportNodeTerm = async () => {
        setImportStatus('Preparando empaquetado...');
        setImportProgress(20);

        try {
            // Exportar datos usando el servicio
            setImportProgress(40);
            setImportStatus('Empaquetando datos cifrados...');

            const exportData = await exportImportService.exportAllData({
                connections: nodetermOptions.connections,
                passwords: nodetermOptions.passwords,
                conversations: nodetermOptions.conversations,
                config: nodetermOptions.config,
                documents: nodetermOptions.documents,
                recordings: nodetermOptions.recordings,
                encryptPassword: useEncryption ? encryptPassword : null
            });

            setImportProgress(70);
            setImportStatus('Guardando archivo encriptado...');

            const cleanFileName = fileName.endsWith('.nodeterm') ? fileName : `${fileName}.nodeterm`;
            const jsonString = JSON.stringify(exportData, null, 2);
            
            const result = await window.electron?.import?.saveFile({
                fileName: cleanFileName,
                fileContent: jsonString
            });

            setImportProgress(100);

            if (result && result.success) {
                setImportResult({
                    success: true,
                    stats: {
                        'Conexiones': nodetermOptions.connections ? 'Guardado' : 'Omitido',
                        'Contraseñas': nodetermOptions.passwords ? 'Guardado' : 'Omitido',
                        'Historial IA': nodetermOptions.conversations ? 'Guardado' : 'Omitido',
                        'Configuración': nodetermOptions.config ? 'Guardado' : 'Omitido',
                        'Notas': nodetermOptions.documents ? 'Guardado' : 'Omitido'
                    }
                });
                showToastSafe({
                    severity: 'success',
                    summary: 'Exportación completada',
                    detail: 'Copia de seguridad guardada con éxito',
                    life: 5000
                });
            } else if (result && result.canceled) {
                // Cancelado
                setImportResult({
                    success: false,
                    error: 'Exportación cancelada por el usuario'
                });
            } else {
                throw new Error('Error al guardar el archivo de backup');
            }
        } catch (error) {
            console.error('[ImportWizard] Error exportando:', error);
            setImportResult({
                success: false,
                error: error.message || 'Error durante la exportación'
            });
            showToastSafe({
                severity: 'error',
                summary: 'Error de exportación',
                detail: error.message || 'Error durante la exportación',
                life: 5000
            });
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

    const importWallix = async () => {
        setImportStatus('Procesando datos de Wallix...');
        setImportProgress(30);

        setImportProgress(60);
        setImportStatus('Creando estructura...');

        if (onImportComplete) {
            await onImportComplete({
                ...previewData,
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
                connections: previewData.stats.connections,
                folders: previewData.stats.folders
            }
        });

        showToastSafe({
            severity: 'success',
            summary: 'Importación exitosa',
            detail: `Se importaron ${previewData.stats.connections} conexiones de Wallix`,
            life: 5000
        });
    };

    const importBrowser = async () => {
        setImportStatus('Procesando contraseñas del navegador...');
        setImportProgress(40);

        const nodes = mapBrowserEntriesToNodes(previewData.entries || []);

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
                entries: previewData.stats?.entries ?? nodes.length,
                skipped: previewData.stats?.skipped ?? 0
            }
        });

        showToastSafe({
            severity: 'success',
            summary: 'Importación exitosa',
            detail: `Se importaron ${nodes.length} contraseñas del navegador`,
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
    const renderSourceSelection = () => {
        return (
            <div className="import-wizard-sources" style={{ padding: '0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '15px' }}>
                    
                    {/* Columna Izquierda: Exportar */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <h5 style={{
                            margin: 0,
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'var(--green-400, #10b981)',
                            borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
                            paddingBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <i className="pi pi-download" /> Exportar Datos
                        </h5>
                        <SourceCard
                            source={IMPORT_SOURCES.export_nodeterm}
                            selected={selectedSource === 'export_nodeterm'}
                            onSelect={() => handleSourceSelect('export_nodeterm')}
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-color-secondary)', padding: '5px', lineHeight: '1.4' }}>
                            Descarga una copia completa cifrada local de tus conexiones, contraseñas, conversaciones de IA, configuraciones y notas.
                        </div>
                    </div>

                    {/* Columna Derecha: Importar */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <h5 style={{
                            margin: 0,
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'var(--cyan-400, #00f2fe)',
                            borderBottom: '1px solid rgba(0, 242, 254, 0.15)',
                            paddingBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <i className="pi pi-upload" /> Importar / Restaurar
                        </h5>
                        
                        {/* Sub-Secciones de Importación */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            
                            {/* Grupo 1: Copias Locales */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--green-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ● Copias Locales
                                </div>
                                <SourceCard
                                    source={IMPORT_SOURCES.nodeterm}
                                    selected={selectedSource === 'nodeterm'}
                                    onSelect={() => handleSourceSelect('nodeterm')}
                                />
                            </div>

                            {/* Grupo 2: Sesiones SSH/RDP */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--blue-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ● Sesiones SSH/RDP
                                </div>
                                <SourceCard
                                    source={IMPORT_SOURCES.mremoteng}
                                    selected={selectedSource === 'mremoteng'}
                                    onSelect={() => handleSourceSelect('mremoteng')}
                                />
                            </div>

                            {/* Grupo 3: Seguridad y Navegador */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ● Seguridad y Navegador
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <SourceCard
                                        source={IMPORT_SOURCES.keepass}
                                        selected={selectedSource === 'keepass'}
                                        onSelect={() => handleSourceSelect('keepass')}
                                    />
                                    <SourceCard
                                        source={IMPORT_SOURCES.browser}
                                        selected={selectedSource === 'browser'}
                                        onSelect={() => handleSourceSelect('browser')}
                                    />
                                </div>
                            </div>

                            {/* Grupo 4: APIs y Notas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--orange-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ● APIs y Notas
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <SourceCard
                                        source={IMPORT_SOURCES.wallix}
                                        selected={selectedSource === 'wallix'}
                                        onSelect={() => handleSourceSelect('wallix')}
                                    />
                                    <SourceCard
                                        source={IMPORT_SOURCES.joplin}
                                        selected={selectedSource === 'joplin'}
                                        onSelect={() => handleSourceSelect('joplin')}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="pi pi-info-circle" style={{ color: 'var(--cyan-400, #00f2fe)', fontSize: '0.9rem', flexShrink: 0 }}></i>
                    <span style={{ fontSize: '11px', color: 'var(--text-color-secondary)' }}>
                        <strong>Integraciones futuras:</strong> Soporte para PuTTY, SecureCRT, MobaXterm, 1Password y Bitwarden.
                    </span>
                </div>
            </div>
        );
    };

    const renderExportConfiguration = (source) => {
        return (
            <div className="import-wizard-config" style={{ padding: '0' }}>
                <h4 className="import-wizard-section-title" style={{ marginBottom: '15px', fontSize: '14px', fontWeight: '600' }}>
                    <i className={source.icon} style={{ marginRight: '8px' }} />
                    {source.label}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Columna Izquierda: Selección de datos */}
                    <div>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                            📦 Categorías a Exportar
                        </h5>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 15px' }}>
                            {[
                                { key: 'connections', label: 'Conexiones', icon: 'pi pi-desktop', desc: 'Sesiones SSH/RDP/VNC' },
                                { key: 'passwords', label: 'Contraseñas', icon: 'pi pi-key', desc: 'Credenciales cifradas' },
                                { key: 'conversations', label: 'Chats de IA', icon: 'pi pi-comments', desc: 'Historial de IA' },
                                { key: 'config', label: 'Configuración', icon: 'pi pi-cog', desc: 'Temas y preferencias' },
                                { key: 'documents', label: 'Notas', icon: 'pi pi-file-edit', desc: 'Notas y documentos' },
                                { key: 'recordings', label: 'Grabaciones', icon: 'pi pi-video', desc: 'Solo metadatos' }
                            ].map(opt => (
                                <div key={opt.key} className="p-field-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <Checkbox
                                        inputId={`exp-${opt.key}`}
                                        checked={nodetermOptions[opt.key]}
                                        onChange={(e) => setNodeTermOptions(prev => ({ ...prev, [opt.key]: e.checked }))}
                                    />
                                    <label htmlFor={`exp-${opt.key}`} style={{ margin: 0, cursor: 'pointer', lineHeight: '1.2' }}>
                                        <span style={{ fontSize: '12.5px', fontWeight: '600', display: 'block', color: 'var(--text-color)' }}>{opt.label}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-color-secondary)' }}>{opt.desc}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Columna Derecha: Configuración de archivo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                                📄 Nombre del archivo
                            </h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <InputText
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px' }}
                                    placeholder="nodeterm-backup"
                                />
                                <span style={{ color: 'var(--text-color-secondary)', fontSize: '13px', fontWeight: '600' }}>.nodeterm</span>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                            <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <Checkbox
                                    inputId="exp-use-encryption"
                                    checked={useEncryption}
                                    onChange={(e) => setUseEncryption(e.checked)}
                                />
                                <label htmlFor="exp-use-encryption" style={{ margin: 0, cursor: 'pointer', lineHeight: '1.2' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: '600', display: 'block', color: 'var(--text-color)' }}>Proteger con contraseña adicional</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-color-secondary)' }}>Cifrado robusto AES-256-GCM</span>
                                </label>
                            </div>

                            {useEncryption && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                                    <div>
                                        <label htmlFor="exp-encrypt-pwd" style={{ fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Contraseña
                                        </label>
                                        <Password
                                            id="exp-encrypt-pwd"
                                            value={encryptPassword}
                                            onChange={(e) => setEncryptPassword(e.target.value)}
                                            feedback={false}
                                            toggleMask
                                            style={{ width: '100%' }}
                                            inputStyle={{ width: '100%', padding: '6px 10px' }}
                                            placeholder="Mínimo 8 caracteres"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="exp-confirm-pwd" style={{ fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Confirmar
                                        </label>
                                        <Password
                                            id="exp-confirm-pwd"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            feedback={false}
                                            toggleMask
                                            style={{ width: '100%' }}
                                            inputStyle={{ width: '100%', padding: '6px 10px' }}
                                            placeholder="Repetir contraseña"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {useEncryption && encryptPassword && confirmPassword && encryptPassword !== confirmPassword && (
                                <div style={{ marginTop: '5px' }}>
                                    <small style={{ color: 'var(--red-500)', fontSize: '11px' }}>
                                        ⚠️ Las contraseñas no coinciden
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // STEP 1: Configuración
    const renderConfiguration = () => {
        const source = IMPORT_SOURCES[selectedSource];
        if (!source) return null;

        if (selectedSource === 'export_nodeterm') {
            return renderExportConfiguration(source);
        }

        return (
            <div className="import-wizard-config" style={{ padding: '0' }}>
                <h4 className="import-wizard-section-title" style={{ marginBottom: '15px', fontSize: '14px', fontWeight: '600' }}>
                    <i className={source.icon} style={{ marginRight: '8px' }} />
                    Importar desde {source.label}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Columna Izquierda: Origen / Archivo / Credenciales */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                            📁 Origen de Datos
                        </h5>
                        
                        {/* Dropzone si requiere archivo */}
                        {selectedSource !== 'wallix' && selectedSource !== 'browser' && (
                            <>
                                <div
                                    className={`import-wizard-dropzone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={!selectedFile ? handleChooseFile : undefined}
                                    style={{
                                        border: '2px dashed rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        textAlign: 'center',
                                        cursor: selectedFile ? 'default' : 'pointer',
                                        background: isDragOver ? 'rgba(var(--primary-color-rgb), 0.05)' : 'rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {!selectedFile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                            <i className="pi pi-cloud-upload" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }} />
                                            <span style={{ fontSize: '12px', color: 'var(--text-color)' }}>
                                                Arrastra tu archivo {source.extension} aquí o haz clic
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '2px 5px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <i className={source.icon} style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }} />
                                                <div style={{ textAlign: 'left', minWidth: 0 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedFile.name}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-color-secondary)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <Button
                                                    icon="pi pi-refresh"
                                                    className="p-button-outlined p-button-sm"
                                                    style={{ padding: '4px', width: '28px', height: '28px' }}
                                                    onClick={(e) => { e.stopPropagation(); handleChooseFile(); }}
                                                    tooltip="Cambiar"
                                                />
                                                <Button
                                                    icon="pi pi-times"
                                                    className="p-button-outlined p-button-danger p-button-sm"
                                                    style={{ padding: '4px', width: '28px', height: '28px' }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                                    tooltip="Quitar"
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
                            </>
                        )}

                        {/* Campos específicos de descifrado/perfiles/APIs */}
                        {selectedSource === 'nodeterm' && (
                            <div className="import-wizard-field">
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                    <i className="pi pi-lock" style={{ marginRight: '4px' }} /> Contraseña (si está encriptado)
                                </label>
                                <Password
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    toggleMask
                                    feedback={false}
                                    placeholder="Contraseña del archivo"
                                    style={{ width: '100%' }}
                                    inputStyle={{ width: '100%', padding: '6px 10px' }}
                                />
                            </div>
                        )}

                        {selectedSource === 'keepass' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                        <i className="pi pi-lock" style={{ marginRight: '4px' }} /> Contraseña maestra KeePass
                                    </label>
                                    <Password
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        toggleMask
                                        feedback={false}
                                        placeholder="Contraseña de la base de datos"
                                        style={{ width: '100%' }}
                                        inputStyle={{ width: '100%', padding: '6px 10px' }}
                                    />
                                </div>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                        <i className="pi pi-key" style={{ marginRight: '4px' }} /> Archivo de clave (.key - opcional)
                                    </label>
                                    {!selectedKeyFile ? (
                                        <Button
                                            label="Seleccionar archivo .key"
                                            icon="pi pi-plus"
                                            className="p-button-outlined p-button-sm"
                                            style={{ width: '100%', padding: '6px 12px' }}
                                            onClick={() => keyFileInputRef.current?.click()}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                            <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><i className="pi pi-file" /> {selectedKeyFile.name}</span>
                                            <Button
                                                icon="pi pi-times"
                                                className="p-button-text p-button-danger p-button-sm"
                                                style={{ padding: '0', width: '20px', height: '20px' }}
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
                                </div>
                            </div>
                        )}

                        {selectedSource === 'browser' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                        <i className="pi pi-user" style={{ marginRight: '4px' }} /> Perfil del navegador
                                    </label>
                                    <Dropdown
                                        value={selectedBrowserProfileId}
                                        options={browserProfiles.map(p => ({ label: `${p.browserLabel} — ${p.profileLabel}`, value: p.id }))}
                                        onChange={(e) => setSelectedBrowserProfileId(e.value)}
                                        placeholder={browserProfiles.length ? 'Seleccionar perfil' : 'No se detectaron perfiles'}
                                        style={{ width: '100%' }}
                                    />
                                    <Button
                                        icon="pi pi-refresh"
                                        className="p-button-text p-button-sm"
                                        style={{ padding: '4px 0', marginTop: '4px' }}
                                        onClick={loadBrowserProfiles}
                                        label="Actualizar perfiles"
                                    />
                                </div>
                                {browserProfiles.find(p => p.id === selectedBrowserProfileId)?.type === 'firefox' && (
                                    <div className="import-wizard-field">
                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                            <i className="pi pi-lock" style={{ marginRight: '4px' }} /> Contraseña maestra Firefox (opcional)
                                        </label>
                                        <Password
                                            value={firefoxMasterPassword}
                                            onChange={(e) => setFirefoxMasterPassword(e.target.value)}
                                            toggleMask
                                            feedback={false}
                                            placeholder="Solo si la configuraste en Firefox"
                                            style={{ width: '100%' }}
                                            inputStyle={{ width: '100%', padding: '6px 10px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedSource === 'wallix' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '4px' }}>
                                        <i className="pi pi-link" /> URL API Wallix
                                    </label>
                                    <InputText
                                        value={wallixUrl}
                                        onChange={(e) => setWallixUrl(e.target.value)}
                                        placeholder="https://wallix.example.com"
                                        style={{ width: '100%', padding: '6px 10px' }}
                                    />
                                </div>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '4px' }}>
                                        <i className="pi pi-user" /> Usuario
                                    </label>
                                    <InputText
                                        value={wallixUsername}
                                        onChange={(e) => setWallixUsername(e.target.value)}
                                        placeholder="Usuario API"
                                        style={{ width: '100%', padding: '6px 10px' }}
                                    />
                                </div>
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '4px' }}>
                                        <i className="pi pi-lock" /> Contraseña
                                    </label>
                                    <Password
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        toggleMask
                                        feedback={false}
                                        placeholder="Contraseña API"
                                        style={{ width: '100%' }}
                                        inputStyle={{ width: '100%', padding: '6px 10px' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Configuración Destino / Selección de datos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                            ⚙️ Opciones de Importación
                        </h5>

                        {selectedSource === 'nodeterm' ? (
                            <div className="import-wizard-field">
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '8px' }}>
                                    <i className="pi pi-list" style={{ marginRight: '4px' }} /> Seleccionar elementos a importar
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px' }}>
                                    {[
                                        { key: 'connections', label: 'Conexiones', icon: 'pi pi-desktop' },
                                        { key: 'passwords', label: 'Contraseñas', icon: 'pi pi-key' },
                                        { key: 'conversations', label: 'Chats IA', icon: 'pi pi-comments' },
                                        { key: 'config', label: 'Ajustes', icon: 'pi pi-cog' },
                                        { key: 'documents', label: 'Notas', icon: 'pi pi-file-edit' },
                                        { key: 'recordings', label: 'Grabaciones', icon: 'pi pi-video' }
                                    ].map(opt => (
                                        <div key={opt.key} className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Checkbox
                                                inputId={`opt-${opt.key}`}
                                                checked={nodetermOptions[opt.key]}
                                                onChange={(e) => setNodeTermOptions(prev => ({ ...prev, [opt.key]: e.checked }))}
                                            />
                                            <label htmlFor={`opt-${opt.key}`} style={{ fontSize: '12px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className={opt.icon} style={{ fontSize: '10px', opacity: 0.8 }} />
                                                {opt.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Carpeta destino */}
                                <div className="import-wizard-field">
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-color-secondary)', marginBottom: '5px' }}>
                                        <i className="pi pi-folder" /> Carpeta destino
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
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                    <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Checkbox
                                            inputId="create-container"
                                            checked={createContainerFolder}
                                            onChange={(e) => setCreateContainerFolder(e.checked)}
                                        />
                                        <label htmlFor="create-container" style={{ fontSize: '12px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <i className="pi pi-folder-open" />
                                            Crear carpeta contenedora
                                        </label>
                                    </div>

                                    {createContainerFolder && (
                                        <div className="import-wizard-field">
                                            <InputText
                                                value={containerFolderName}
                                                onChange={(e) => setContainerFolderName(e.target.value)}
                                                placeholder="Nombre de la nueva carpeta"
                                                style={{ width: '100%', padding: '6px 10px' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {selectedSource === 'keepass' && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                        <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Checkbox
                                                inputId="kp-create-container"
                                                checked={createContainerFolder}
                                                onChange={(e) => setCreateContainerFolder(e.checked)}
                                                disabled
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        <small className="import-wizard-hint" style={{ fontSize: '11px', color: 'var(--text-color-secondary)' }}>
                                            ℹ️ Se conservará la estructura de grupos de la base de datos KeePass.
                                        </small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // STEP 2: Vista previa
    const renderPreview = () => {
        if (selectedSource === 'export_nodeterm') {
            // Estimar tamaño
            let size = 0;
            if (nodetermOptions.connections) size += 100;
            if (nodetermOptions.passwords) size += 50;
            if (nodetermOptions.conversations) size += 500;
            if (nodetermOptions.config) size += 20;
            if (nodetermOptions.documents) size += 80;
            if (nodetermOptions.recordings) size += 1000;
            
            const sizeStr = size < 1024 ? `~${size} KB` : `~${(size / 1024).toFixed(1)} MB`;

            return (
                <div className="import-wizard-preview">
                    <h4 className="import-wizard-section-title">
                        <i className="pi pi-eye" />
                        Análisis de Paquete a Exportar
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                        {/* Resumen técnico */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '15px' }}>
                            <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--green-400)' }}>
                                📑 Ficha de Configuración
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                                <div>Nombre: <strong style={{ color: '#fff' }}>{fileName}.nodeterm</strong></div>
                                <div>Cifrado AES-256: <strong style={{ color: useEncryption ? 'var(--green-500)' : 'var(--red-500)' }}>{useEncryption ? 'ACTIVO' : 'INACTIVO'}</strong></div>
                                <div>Tamaño Estimado: <strong style={{ color: 'var(--cyan-400)' }}>{sizeStr}</strong></div>
                                <div>Destino: <strong style={{ color: 'var(--text-color-secondary)' }}>Diálogo del sistema</strong></div>
                            </div>
                        </div>

                        {/* Desglose de elementos */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '15px' }}>
                            <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan-400)' }}>
                                📊 Módulos Seleccionados
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px' }}>
                                {[
                                    { key: 'connections', label: 'Conexiones' },
                                    { key: 'passwords', label: 'Contraseñas' },
                                    { key: 'conversations', label: 'Chats de IA' },
                                    { key: 'config', label: 'Configuración' },
                                    { key: 'documents', label: 'Notas' },
                                    { key: 'recordings', label: 'Grabaciones' }
                                ].map(opt => {
                                    const isSelected = nodetermOptions[opt.key];
                                    return (
                                        <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: isSelected ? 1 : 0.4 }}>
                                            <i className={isSelected ? 'pi pi-check-circle' : 'pi pi-times-circle'} style={{ color: isSelected ? 'var(--green-500)' : 'var(--text-color-secondary)' }} />
                                            <span style={{ color: isSelected ? '#fff' : 'var(--text-color-secondary)' }}>{opt.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (previewLoading) {
            return (
                <div className="import-wizard-loading">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
                    <p>{previewStatus || 'Procesando archivo...'}</p>
                    <ProgressBar mode="indeterminate" style={{ height: '6px', marginTop: '0.75rem' }} />
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

                {previewData.type === 'browser' && previewData.sampleUrls?.length > 0 && (
                    <div className="import-wizard-tree" style={{ marginTop: '1rem' }}>
                        <h5>URLs de ejemplo:</h5>
                        <ul style={{ fontSize: 13, marginLeft: 16, color: 'var(--text-color-secondary)' }}>
                            {previewData.sampleUrls.map((url, i) => (
                                <li key={i} style={{ wordBreak: 'break-all' }}>{url}</li>
                            ))}
                        </ul>
                    </div>
                )}

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
            case 'browser':
                return (
                    <div className="import-wizard-stats-grid">
                        <StatCard icon="pi pi-key" label="Contraseñas" value={previewData.stats.entries} color="var(--green-500)" />
                        <StatCard icon="pi pi-ban" label="Omitidas" value={previewData.stats.skipped} color="var(--orange-500)" />
                        {(previewData.stats.skippedAbe ?? 0) > 0 && (
                            <StatCard icon="pi pi-shield" label="App-Bound" value={previewData.stats.skippedAbe} color="var(--red-500)" />
                        )}
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
                <div className="import-wizard-importing" style={{ textAlign: 'center', padding: '10px 0' }}>
                    <h4 className="import-wizard-section-title" style={{ marginBottom: '15px', fontSize: '14px', fontWeight: '600' }}>
                        <i className="pi pi-spin pi-spinner" style={{ marginRight: '8px', color: 'var(--cyan-400, #00f2fe)' }} />
                        PROCESANDO IMPORTACIÓN...
                    </h4>
                    
                    {/* Cyberpunk Progress Bar */}
                    <div style={{
                        position: 'relative',
                        height: '14px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(0, 242, 254, 0.25)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '15px',
                        boxShadow: 'inset 0 0 5px rgba(0,0,0,0.8)'
                    }}>
                        <div style={{
                            width: `${importProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--cyan-400, #00f2fe) 0%, var(--green-400, #10b981) 100%)',
                            boxShadow: '0 0 10px var(--cyan-400, #00f2fe)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>

                    {/* Monospace Tech Terminal Console Logger */}
                    <div style={{
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '11px',
                        color: 'var(--cyan-400, #00f2fe)',
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '12px',
                        borderRadius: '8px',
                        minHeight: '90px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        textAlign: 'left',
                        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
                        lineHeight: '1.5'
                    }}>
                        <div style={{ color: '#10b981' }}>[SYSTEM] Inicializando importación...</div>
                        <div style={{ color: '#4facfe' }}>[SOURCE] Módulo de origen detectado: {IMPORT_SOURCES[selectedSource]?.label}</div>
                        <div style={{ color: 'var(--text-color-secondary)' }}>[STATUS] {importStatus || 'Cargando buffers...'}</div>
                        <div style={{ color: 'var(--cyan-400)' }}>&gt; Progreso de transmisión: {importProgress}%</div>
                        {importProgress >= 100 && <div style={{ color: '#10b981', fontWeight: 'bold' }}>[SUCCESS] Escritura de datos finalizada con éxito.</div>}
                    </div>
                </div>
            );
        }

        if (importResult) {
            return (
                <div className={`import-wizard-result ${importResult.success ? 'success' : 'error'}`} style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: importResult.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${importResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                    borderRadius: '10px',
                    marginBottom: '10px'
                }}>
                    <div className="import-wizard-result-icon" style={{ marginBottom: '15px' }}>
                        <i className={importResult.success ? 'pi pi-check-circle' : 'pi pi-times-circle'} style={{ fontSize: '2.5rem', color: importResult.success ? 'var(--green-500)' : 'var(--red-500)' }} />
                    </div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700' }}>
                        {importResult.success ? 'IMPORTACIÓN COMPLETADA CON ÉXITO' : 'ERROR EN LA IMPORTACIÓN'}
                    </h4>

                    {importResult.success && importResult.stats && (
                        <div className="import-wizard-result-stats" style={{
                            display: 'inline-flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '10px 20px',
                            marginTop: '15px',
                            padding: '10px 20px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '6px'
                        }}>
                            {Object.entries(importResult.stats).map(([key, value]) => (
                                <div key={key} className="import-wizard-result-stat" style={{ fontSize: '12px' }}>
                                    <span className="label" style={{ color: 'var(--text-color-secondary)', marginRight: '6px' }}>{key}:</span>
                                    <span className="value" style={{ fontWeight: '700', color: 'var(--text-color)' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {importResult.error && (
                        <div style={{ marginTop: '15px' }}>
                            <Message severity="error" text={importResult.error} style={{ width: '100%' }} />
                        </div>
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
                        label={selectedSource === 'export_nodeterm' ? "Exportar" : "Importar"}
                        icon="pi pi-download"
                        onClick={handleImport}
                        disabled={selectedSource === 'export_nodeterm' ? !canGoNext() : (!previewData || previewError)}
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

    if (isEmbedded) {
        return (
            <div className="import-wizard-embedded" style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Toast ref={toast} />
                <div className="import-wizard-content" style={{ flex: 1 }}>
                    {/* Indicador de pasos */}
                    <CyberpunkStepper
                        steps={steps}
                        activeIndex={currentStep}
                    />

                    {/* Contenido del paso actual */}
                    <div className="import-wizard-step-content" style={{ marginTop: '20px', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                        {renderStepContent()}
                    </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '15px', marginTop: '15px' }}>
                    {renderFooter()}
                </div>
            </div>
        );
    }

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
                    <CyberpunkStepper
                        steps={steps}
                        activeIndex={currentStep}
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
