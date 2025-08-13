import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Fieldset } from 'primereact/fieldset';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { useSafeFocus, isElementBlocked, unblockElement } from '../utils/formUtils';
import '../assets/Dashboard.css';

const RdpManager = ({ visible, onHide, rdpNodeData, onSaveToSidebar, editingNode }) => {
  const toast = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState({});
  const { safeFocus, safeBlur } = useSafeFocus();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'mstsc',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: true,
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    // Campos específicos para Guacamole
    autoResize: false,           // Ajuste automático de ventana
    guacDpi: 96,                // DPI para Guacamole
    guacSecurity: 'any',        // Seguridad: any, rdp, tls, nla
    guacEnableWallpaper: false, // Mostrar fondo de escritorio
    guacEnableDrive: false,     // Redirección de unidades
    guacDriveHostDir: '',       // Carpeta local opcional para la unidad
    guacEnableGfx: false,       // Habilitar GFX
    // Opciones avanzadas (habilitar características visuales)
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    // Flags de prueba (uno por vez)
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  });

  // Debug formData changes
  useEffect(() => {
    // Logging removido para limpiar la consola
  }, [formData]);

  // Función segura para manejar cambios en inputs
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Función para manejar cambios en inputs de texto
  const handleTextChange = useCallback((field) => (e) => {
    const value = e.target.value;
    handleInputChange(field, value);
  }, [handleInputChange]);

  // Función para manejar cambios en inputs numéricos
  const handleNumberChange = useCallback((field) => (e) => {
    const value = parseInt(e.target.value) || 0;
    handleInputChange(field, value);
  }, [handleInputChange]);

  // Función para manejar cambios en checkboxes
  const handleCheckboxChange = useCallback((field) => (e) => {
    handleInputChange(field, e.checked);
  }, [handleInputChange]);

  // Manejar flags de prueba de manera independiente (pueden combinarse)

  // Opciones para dropdowns
  const resolutionOptions = [
    // Resoluciones recomendadas para ventanas
    { label: '1600x1000 (Recomendada)', value: '1600x1000' },
    { label: '1280x800 (WXGA)', value: '1280x800' },
    
    // Resoluciones Full HD y HD
    { label: '1920x1080 (Full HD)', value: '1920x1080' },
    { label: '1920x1200 (WUXGA)', value: '1920x1200' },
    { label: '1366x768 (HD)', value: '1366x768' },
    { label: '1280x720 (HD Ready)', value: '1280x720' },
    
    // Resoluciones 2K (QHD)
    { label: '2560x1440 (2K QHD)', value: '2560x1440' },
    { label: '2560x1600 (2K WQXGA)', value: '2560x1600' },
    { label: '2048x1080 (2K DCI)', value: '2048x1080' },
    
    // Resoluciones 4K (UHD)
    { label: '3840x2160 (4K UHD)', value: '3840x2160' },
    { label: '4096x2160 (4K DCI)', value: '4096x2160' },
    { label: '3840x2400 (4K WQUXGA)', value: '3840x2400' },
    
    // Resoluciones ultrawide
    { label: '3440x1440 (Ultrawide QHD)', value: '3440x1440' },
    { label: '2560x1080 (Ultrawide Full HD)', value: '2560x1080' },
    { label: '5120x1440 (Super Ultrawide)', value: '5120x1440' },
    
    // Resoluciones legacy
    { label: '1024x768 (XGA)', value: '1024x768' },
    { label: '800x600 (SVGA)', value: '800x600' }
  ];

  const colorDepthOptions = [
    { label: '32 bits (True Color)', value: 32 },
    { label: '24 bits (True Color)', value: 24 },
    { label: '16 bits (High Color)', value: 16 },
    { label: '15 bits (High Color)', value: 15 },
    { label: '8 bits (256 colores)', value: 8 }
  ];

  const presetOptions = [
    { label: 'Predeterminado', value: 'default' },
    { label: 'Alto rendimiento', value: 'performance' },
    { label: 'Todas las características', value: 'fullFeature' },
    { label: '2K QHD (2560x1440)', value: 'qhd' },
    { label: 'Ultrawide (3440x1440)', value: 'ultrawide' },
    { label: '4K UHD (3840x2160)', value: 'uhd' }
  ];

  const clientTypeOptions = [
    { label: 'mstsc (Windows)', value: 'mstsc' },
    { label: 'Guacamole Lite', value: 'guacamole' }
  ];

  useEffect(() => {
    if (visible) {
      loadPresets();
      refreshConnections();
      
      // Cargar datos del nodo RDP si están disponibles
      if (rdpNodeData) {
        // console.log('=== LOADING RDP NODE ===');
        // console.log('rdpNodeData received:', JSON.stringify(rdpNodeData, null, 2));
        // console.log('smartSizing in rdpNodeData:', rdpNodeData.smartSizing);
        
        const newFormData = {
          name: rdpNodeData.name || '',
          server: rdpNodeData.server || '',
          username: rdpNodeData.username || '',
          password: rdpNodeData.password || '',
          port: rdpNodeData.port || 3389,
          clientType: rdpNodeData.clientType || 'mstsc',
          preset: 'default',
          resolution: rdpNodeData.resolution || '1600x1000',
          colorDepth: rdpNodeData.colorDepth || 32,
          redirectFolders: rdpNodeData.redirectFolders !== false,
          redirectClipboard: rdpNodeData.redirectClipboard !== false,
          redirectPrinters: rdpNodeData.redirectPrinters || false,
          redirectAudio: rdpNodeData.redirectAudio !== false,
          fullscreen: rdpNodeData.fullscreen || false,
          smartSizing: rdpNodeData.smartSizing !== undefined ? rdpNodeData.smartSizing : true,
          span: rdpNodeData.span || false,
          admin: rdpNodeData.admin || false,
          public: rdpNodeData.public || false,
          // Campos específicos de Guacamole
          autoResize: rdpNodeData.autoResize || false,
          guacDpi: rdpNodeData.guacDpi || 96,
          guacSecurity: rdpNodeData.guacSecurity || 'any',
          guacEnableWallpaper: rdpNodeData.guacEnableWallpaper || false,
          guacEnableDrive: rdpNodeData.guacEnableDrive || false,
          guacDriveHostDir: rdpNodeData.guacDriveHostDir || '',
          guacEnableGfx: (rdpNodeData.guacEnableGfx || rdpNodeData.guacWin11Compat) || false,
           guacEnableDesktopComposition: rdpNodeData.guacEnableDesktopComposition || false,
           guacEnableFontSmoothing: rdpNodeData.guacEnableFontSmoothing || false,
           guacEnableTheming: rdpNodeData.guacEnableTheming || false,
           guacEnableFullWindowDrag: rdpNodeData.guacEnableFullWindowDrag || false,
           guacEnableMenuAnimations: rdpNodeData.guacEnableMenuAnimations || false,
          guacDisableGlyphCaching: rdpNodeData.guacDisableGlyphCaching || false,
          guacDisableOffscreenCaching: rdpNodeData.guacDisableOffscreenCaching || false,
          guacDisableBitmapCaching: rdpNodeData.guacDisableBitmapCaching || false,
          guacDisableCopyRect: rdpNodeData.guacDisableCopyRect || false
        };
        
        // console.log('=== FORM DATA SET ===');
        // console.log('newFormData:', JSON.stringify(newFormData, null, 2));
        // console.log('smartSizing in newFormData:', newFormData.smartSizing);
        // console.log('========================');
        
        setFormData(newFormData);
      }
    }
  }, [visible, rdpNodeData]);

  // Effect to handle form focus and prevent blocking when dialog opens
  useEffect(() => {
    if (visible) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        // Focus first input if available
        const firstInput = document.querySelector('#name');
        if (firstInput && !isElementBlocked(firstInput)) {
          safeFocus(firstInput);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [visible, safeFocus]);

  const loadPresets = async () => {
    try {
      const presetsData = await window.electronAPI.rdp.getPresets();
      setPresets(presetsData);
    } catch (error) {
      console.error('Error cargando presets:', error);
    }
  };

  const refreshConnections = async () => {
    try {
      const activeConnections = await window.electronAPI.rdp.getActiveConnections();
      setConnections(activeConnections);
    } catch (error) {
      console.error('Error cargando conexiones:', error);
    }
  };

  const handlePresetChange = (presetName) => {
    const preset = presets[presetName];
    if (preset) {
      setFormData(prev => ({
        ...prev,
        preset: presetName,
        ...preset,
        smartSizing: preset.smartSizing !== false // Asegurar que smartSizing se aplique del preset
      }));
    }
  };

  const handleConnect = async () => {
    if (!formData.server || !formData.username) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Servidor y usuario son obligatorios'
      });
      return;
    }

    setLoading(true);
    try {
      // Manejar diferentes tipos de cliente
      if (formData.clientType === 'guacamole') {
        // Para Guacamole, crear una pestaña vacía
        toast.current?.show({
          severity: 'info',
          summary: 'Guacamole Lite',
          detail: 'Pestaña de Guacamole creada',
          life: 3000
        });
        
        // Crear una pestaña vacía para Guacamole
        const tabId = `guacamole_${Date.now()}`;
        
        // Calcular resolución dinámica si autoResize está activado
        let dynamicWidth = 1024, dynamicHeight = 768;
        if (formData.autoResize) {
          // Calcular resolución basada en la ventana disponible
          dynamicWidth = Math.floor(window.innerWidth * 0.8); // 80% del ancho de ventana
          dynamicHeight = Math.floor(window.innerHeight * 0.7); // 70% del alto de ventana
          console.log(`🔄 RdpManager: Calculando resolución dinámica: ${dynamicWidth}x${dynamicHeight}`);
        }
        
        const guacamoleConfig = {
          name: formData.name,
          server: formData.server,
          username: formData.username,
          password: formData.password,
          port: formData.port || 3389,
          clientType: 'guacamole',
          resolution: formData.autoResize ? `${dynamicWidth}x${dynamicHeight}` : (formData.resolution || '1920x1080'),
          colorDepth: formData.colorDepth || 32,
          // Opciones específicas de Guacamole
          autoResize: formData.autoResize,
          // Forzar congelación de resizes iniciales para camuflar RDProxy
          freezeInitialResize: true,
          width: dynamicWidth,  // ← NÚMEROS, no string
          height: dynamicHeight, // ← NÚMEROS, no string
          dpi: formData.guacDpi || 96,
          security: formData.guacSecurity || 'any',
          enableDrive: formData.guacEnableDrive,
          // Carpeta local opcional (vacío = por defecto Descargas/NodeTerm Drive)
          driveHostDir: formData.guacDriveHostDir,
          enableWallpaper: formData.guacEnableWallpaper,
           enableGfx: formData.guacEnableGfx,
          // Características visuales
          enableDesktopComposition: formData.guacEnableDesktopComposition,
          enableFontSmoothing: formData.guacEnableFontSmoothing,
          enableTheming: formData.guacEnableTheming,
          enableFullWindowDrag: formData.guacEnableFullWindowDrag,
          enableMenuAnimations: formData.guacEnableMenuAnimations,
          disableGlyphCaching: formData.guacDisableGlyphCaching,
          disableOffscreenCaching: formData.guacDisableOffscreenCaching,
          disableBitmapCaching: formData.guacDisableBitmapCaching,
          disableCopyRect: formData.guacDisableCopyRect,
          redirectClipboard: formData.redirectClipboard,
          redirectPrinters: formData.redirectPrinters,
          redirectAudio: formData.redirectAudio,
          
        };
        
        // Enviar evento para crear pestaña de Guacamole
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('guacamole:create-tab', {
            tabId,
            config: guacamoleConfig
          });
        }
      } else {
        // Para mstsc, conectar normalmente
        const result = await window.electronAPI.rdp.connect(formData);
        
        if (result.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Conectando',
            detail: 'Iniciando conexión RDP...'
          });
          refreshConnections();
          setActiveTab(1); // Cambiar a pestaña de conexiones
        } else {
          toast.current?.show({
            severity: 'error',
            summary: 'Error de conexión',
            detail: result.error
          });
        }
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId) => {
    try {
      const result = await window.electronAPI.rdp.disconnect(connectionId);
      if (result.success) {
        toast.current?.show({
          severity: 'info',
          summary: 'Desconectado',
          detail: 'Conexión terminada'
        });
        refreshConnections();
      }
    } catch (error) {
      console.error('Error desconectando:', error);
    }
  };

  const handleDisconnectAll = async () => {
    try {
      await window.electronAPI.rdp.disconnectAll();
      toast.current?.show({
        severity: 'info',
        summary: 'Desconectado',
        detail: 'Todas las conexiones terminadas'
      });
      refreshConnections();
    } catch (error) {
      console.error('Error desconectando todas:', error);
    }
  };

  const handleSaveToSidebar = () => {
    if (!formData.server || !formData.username) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Servidor y Usuario son campos obligatorios',
        life: 3000
      });
      return;
    }

    if (onSaveToSidebar) {
      const isEditing = editingNode !== null;
      onSaveToSidebar(formData, isEditing, editingNode);
      toast.current?.show({
        severity: 'success',
        summary: isEditing ? 'Actualizado' : 'Guardado',
        detail: isEditing ? 'Conexión RDP actualizada en la sidebar' : 'Conexión RDP guardada en la sidebar',
        life: 3000
      });
    }
  };

  const statusBodyTemplate = (rowData) => {
    const getSeverity = (status) => {
      switch (status) {
        case 'connecting': return 'warning';
        case 'launched': return 'success';
        case 'error': return 'danger';
        case 'disconnected': return 'secondary';
        default: return 'info';
      }
    };

    return <Tag value={rowData.status} severity={getSeverity(rowData.status)} />;
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <Button
        icon="pi pi-times"
        className="p-button-rounded p-button-danger p-button-sm"
        onClick={() => handleDisconnect(rowData.id)}
        tooltip="Desconectar"
      />
    );
  };

  const dialogHeader = (
    <div className="flex align-items-center gap-2">
      <i className="pi pi-desktop" style={{ fontSize: '1.5rem' }}></i>
      <span>Gestor de Conexiones RDP</span>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={dialogHeader}
        visible={visible}
        style={{ width: '70vw', minHeight: '600px' }}
        onHide={onHide}
        maximizable
        modal
        className="rdp-manager-dialog"
      >
        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
          {/* Pestaña Nueva Conexión */}
          <TabPanel header="Nueva Conexión" leftIcon="pi pi-plus">
            <div className="p-fluid">
              <Card title="Configuración de Conexión" className="mb-3">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name">Nombre de la Conexión</label>
                    <InputText
                      id="name"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      placeholder="Nombre descriptivo para la conexión"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="server">Servidor *</label>
                    <InputText
                      id="server"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="port">Puerto</label>
                    <InputText
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={handleNumberChange('port')}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="username">Usuario *</label>
                    <InputText
                      id="username"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      placeholder="Nombre de usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="password">Contraseña</label>
                    <Password
                      id="password"
                      value={formData.password}
                      onChange={handleTextChange('password')}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      placeholder="Contraseña (opcional)"
                      feedback={false}
                      toggleMask
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="clientType">Tipo de Cliente</label>
                    <Dropdown
                      id="clientType"
                      value={formData.clientType}
                      options={clientTypeOptions}
                      onChange={(e) => handleInputChange('clientType', e.value)}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                      placeholder="Seleccionar tipo de cliente"
                    />
                  </div>
                </div>
              </Card>

              <Card title="Configuración de Pantalla" className="mb-3">
                <div className="formgrid grid">
                  <div className="field col-12 md:col-3">
                    <label htmlFor="preset">Preset</label>
                    <Dropdown
                      id="preset"
                      value={formData.preset}
                      options={presetOptions}
                      onChange={(e) => handlePresetChange(e.value)}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                    />
                  </div>
                  <div className="field col-12 md:col-3">
                    <label htmlFor="resolution">Resolución</label>
                    <Dropdown
                      id="resolution"
                      value={formData.resolution}
                      options={resolutionOptions}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                    />
                  </div>
                  <div className="field col-12 md:col-3">
                    <label htmlFor="colorDepth">Profundidad de Color</label>
                    <Dropdown
                      id="colorDepth"
                      value={formData.colorDepth}
                      options={colorDepthOptions}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                      onFocus={(e) => {
                        if (isElementBlocked(e.target)) {
                          unblockElement(e.target);
                        }
                        safeFocus(e.target);
                      }}
                    />
                  </div>
                  <div className="field col-12 md:col-3">
                    <label htmlFor="guacDpi">DPI</label>
                    <InputNumber
                      id="guacDpi"
                      value={formData.guacDpi}
                      onValueChange={(e) => handleInputChange('guacDpi', e.value)}
                      min={72}
                      max={300}
                      placeholder="96"
                      onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Opciones">
                <div className="formgrid grid">
                  {/* Opciones para MSTSC (RDP Nativo) */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectFolders"
                          checked={formData.redirectFolders}
                          onChange={handleCheckboxChange('redirectFolders')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectFolders" className="ml-2">Redirigir carpetas</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectClipboard"
                          checked={formData.redirectClipboard}
                          onChange={handleCheckboxChange('redirectClipboard')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectClipboard" className="ml-2">Compartir portapapeles</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectPrinters"
                          checked={formData.redirectPrinters}
                          onChange={handleCheckboxChange('redirectPrinters')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectPrinters" className="ml-2">Redirigir impresoras</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectAudio"
                          checked={formData.redirectAudio}
                          onChange={handleCheckboxChange('redirectAudio')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectAudio" className="ml-2">Redirigir audio</label>
                      </div>
                      {/* Opción 'Pantalla completa' eliminada para Guacamole */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="smartSizing"
                          checked={formData.smartSizing}
                          onChange={(e) => {
                            handleCheckboxChange('smartSizing')(e);
                          }}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="smartSizing" className="ml-2">Ajuste automático de ventana</label>
                      </div>
                      {/* Opción 'Múltiples monitores' eliminada para Guacamole */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="fullscreen"
                          checked={formData.fullscreen}
                          onChange={handleCheckboxChange('fullscreen')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="fullscreen" className="ml-2">Pantalla completa</label>
                      </div>
                    </>
                  )}

                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableDrive"
                          checked={formData.guacEnableDrive}
                          onChange={handleCheckboxChange('guacEnableDrive')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="guacEnableDrive" className="ml-2">Redirigir carpetas</label>
                      </div>
                      {formData.guacEnableDrive && (
                        <div className="field col-12 md:col-12">
                          <label htmlFor="guacDriveHostDir">Carpeta local para "NodeTerm Drive" (opcional)</label>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <InputText
                              id="guacDriveHostDir"
                              value={formData.guacDriveHostDir}
                              onChange={handleTextChange('guacDriveHostDir')}
                              placeholder="Vacío = Descargas/NodeTerm Drive"
                              style={{ flex: '1 1 auto', minWidth: 0 }}
                            />
                            <Button
                              type="button"
                              icon="pi pi-folder-open"
                              className="p-button-rounded p-button-outlined p-button-sm"
                              aria-label="Examinar"
                              tooltip="Examinar carpeta"
                              style={{ flex: '0 0 auto', minWidth: 0 }}
                              onClick={async () => {
                                try {
                                  if (window.electron && window.electron.dialog && typeof window.electron.dialog.showOpenDialog === 'function') {
                                    const result = await window.electron.dialog.showOpenDialog({
                                      properties: ['openDirectory', 'createDirectory']
                                    });
                                    if (!result.canceled && Array.isArray(result.filePaths) && result.filePaths.length > 0) {
                                      handleInputChange('guacDriveHostDir', result.filePaths[0]);
                                      try {
                                        const status = await window.electron.ipcRenderer.invoke('guacamole:get-status');
                                        if (status && status.guacd && (status.guacd.method === 'docker')) {
                                          toast.current?.show({
                                            severity: 'warn',
                                            summary: 'Docker en uso',
                                            detail: 'Si usas Docker, cambiar la carpeta puede requerir reiniciar NodeTerm para remapear el volumen.',
                                            life: 5000
                                          });
                                        }
                                      } catch {}
                                    }
                                  }
                                } catch (err) {
                                  console.error('Error abriendo selector de carpeta:', err);
                                }
                              }}
                            />
                          </div>
                          {formData.guacDriveHostDir && (
                            <div style={{ marginTop: 6 }}>
                              <small className="text-color-success">Seleccionado: {formData.guacDriveHostDir}</small>
                            </div>
                          )}
                          {!formData.guacDriveHostDir && (
                            <small className="text-color-secondary">Por defecto: C:\\Users\\&lt;usuario&gt;\\Downloads\\NodeTerm Drive</small>
                          )}
                        </div>
                      )}
                      
                      {/* El bloque de Opciones avanzadas (rendimiento) se reubica debajo del Card */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectClipboard"
                          checked={formData.redirectClipboard}
                          onChange={handleCheckboxChange('redirectClipboard')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectClipboard" className="ml-2">Compartir portapapeles</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectPrinters"
                          checked={formData.redirectPrinters}
                          onChange={handleCheckboxChange('redirectPrinters')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectPrinters" className="ml-2">Redirigir impresoras</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="redirectAudio"
                          checked={formData.redirectAudio}
                          onChange={handleCheckboxChange('redirectAudio')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="redirectAudio" className="ml-2">Redirigir audio</label>
                      </div>
                      {/* Opción de pantalla completa eliminada para Guacamole */}
                      {/* Opción de múltiples monitores eliminada para Guacamole */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="autoResize"
                          checked={formData.autoResize}
                          onChange={handleCheckboxChange('autoResize')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="autoResize" className="ml-2">Ajuste automático de ventana</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableWallpaper"
                          checked={formData.guacEnableWallpaper}
                          onChange={handleCheckboxChange('guacEnableWallpaper')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="guacEnableWallpaper" className="ml-2">Mostrar fondo de escritorio</label>
                      </div>
                      
                      {/* Seguridad permanece en avanzadas; DPI se movió a Configuración de Pantalla */}
                    </>
                  )}
                </div>

                {/* Opciones avanzadas (solo Guacamole) */}
                {formData.clientType === 'guacamole' && (
                  <div className="mt-3">
                    <Fieldset legend="Opciones avanzadas" toggleable collapsed className="performance-fieldset">
                    <div className="formgrid grid">
                      {/* Primera opción: Habilitar GFX */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableGfx"
                          checked={formData.guacEnableGfx}
                          onChange={handleCheckboxChange('guacEnableGfx')}
                          onFocus={(e) => {
                            if (isElementBlocked(e.target)) {
                              unblockElement(e.target);
                            }
                            safeFocus(e.target);
                          }}
                        />
                        <label htmlFor="guacEnableGfx" className="ml-2">Habilitar GFX</label>
                      </div>
                      {/* Fila 0: Características visuales */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableDesktopComposition"
                          checked={formData.guacEnableDesktopComposition}
                          onChange={handleCheckboxChange('guacEnableDesktopComposition')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacEnableDesktopComposition" className="ml-2">Habilitar Desktop Composition</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableFontSmoothing"
                          checked={formData.guacEnableFontSmoothing}
                          onChange={handleCheckboxChange('guacEnableFontSmoothing')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacEnableFontSmoothing" className="ml-2">Habilitar Font Smoothing</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableTheming"
                          checked={formData.guacEnableTheming}
                          onChange={handleCheckboxChange('guacEnableTheming')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacEnableTheming" className="ml-2">Habilitar Theming</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableFullWindowDrag"
                          checked={formData.guacEnableFullWindowDrag}
                          onChange={handleCheckboxChange('guacEnableFullWindowDrag')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacEnableFullWindowDrag" className="ml-2">Habilitar Full Window Drag</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacEnableMenuAnimations"
                          checked={formData.guacEnableMenuAnimations}
                          onChange={handleCheckboxChange('guacEnableMenuAnimations')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacEnableMenuAnimations" className="ml-2">Habilitar animaciones de menú</label>
                      </div>
                      {/* Fila 1: Flags de caché (izq) y offscreen/copy-rect (der) */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacDisableGlyphCaching"
                          checked={formData.guacDisableGlyphCaching}
                          onChange={handleCheckboxChange('guacDisableGlyphCaching')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacDisableGlyphCaching" className="ml-2">Desactivar glyph caching</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacDisableOffscreenCaching"
                          checked={formData.guacDisableOffscreenCaching}
                          onChange={handleCheckboxChange('guacDisableOffscreenCaching')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacDisableOffscreenCaching" className="ml-2">Desactivar offscreen caching</label>
                      </div>
                      {/* Fila 2: bitmap caching y copy-rect */}
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacDisableBitmapCaching"
                          checked={formData.guacDisableBitmapCaching}
                          onChange={handleCheckboxChange('guacDisableBitmapCaching')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacDisableBitmapCaching" className="ml-2">Desactivar bitmap caching</label>
                      </div>
                      <div className="field-checkbox col-12 md:col-6">
                        <Checkbox
                          inputId="guacDisableCopyRect"
                          checked={formData.guacDisableCopyRect}
                          onChange={handleCheckboxChange('guacDisableCopyRect')}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                        <label htmlFor="guacDisableCopyRect" className="ml-2">Desactivar copy-rect</label>
                      </div>
                      
                      {/* Seguridad (abajo del todo, tamaño de una columna) */}
                      <div className="field col-12 md:col-6">
                        <label htmlFor="guacSecurity">Seguridad</label>
                        <Dropdown
                          id="guacSecurity"
                          value={formData.guacSecurity}
                          options={[{ label: 'Cualquiera (Recomendado)', value: 'any' }, { label: 'RDP', value: 'rdp' }, { label: 'TLS', value: 'tls' }, { label: 'NLA', value: 'nla' }]}
                          onChange={(e) => handleInputChange('guacSecurity', e.value)}
                          onFocus={(e) => { if (isElementBlocked(e.target)) { unblockElement(e.target); } safeFocus(e.target); }}
                        />
                      </div>
                    </div>
                  </Fieldset>
                </div>
                )}

                <Divider />
                
                <div className="flex justify-content-end gap-2">
                  <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    className="p-button-secondary"
                    onClick={onHide}
                  />
                  <Button
                    label="Guardar"
                    icon="pi pi-save"
                    className="p-button-success"
                    onClick={handleSaveToSidebar}
                    disabled={!formData.server || !formData.username}
                  />
                  <Button
                    label="Conectar"
                    icon="pi pi-play"
                    onClick={handleConnect}
                    loading={loading}
                    disabled={!formData.server || !formData.username}
                  />
                </div>
              </Card>
            </div>
          </TabPanel>

          {/* Pestaña Conexiones Activas */}
          <TabPanel header="Conexiones Activas" leftIcon="pi pi-list">
            <div className="mb-3 flex justify-content-between align-items-center">
              <h3 className="m-0">Conexiones RDP Activas ({connections.length})</h3>
              <div className="flex gap-2">
                <Button
                  label="Actualizar"
                  icon="pi pi-refresh"
                  className="p-button-secondary p-button-sm"
                  onClick={refreshConnections}
                />
                {connections.length > 0 && (
                  <Button
                    label="Desconectar Todo"
                    icon="pi pi-power-off"
                    className="p-button-danger p-button-sm"
                    onClick={handleDisconnectAll}
                  />
                )}
              </div>
            </div>

            {connections.length === 0 ? (
              <Card>
                <div className="text-center p-4">
                  <i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--primary-color)' }}></i>
                  <h4>No hay conexiones activas</h4>
                  <p className="text-color-secondary">
                    Utiliza la pestaña "Nueva Conexión" para establecer una conexión RDP.
                  </p>
                </div>
              </Card>
            ) : (
              <DataTable
                value={connections}
                responsiveLayout="scroll"
                stripedRows
                showGridlines
                emptyMessage="No hay conexiones activas"
              >
                <Column field="server" header="Servidor" sortable />
                <Column field="username" header="Usuario" sortable />
                <Column 
                  field="startTime" 
                  header="Hora de Inicio" 
                  sortable
                  body={(rowData) => new Date(rowData.startTime).toLocaleString()}
                />
                <Column
                  field="status"
                  header="Estado"
                  sortable
                  body={statusBodyTemplate}
                />
                <Column
                  header="Acciones"
                  body={actionBodyTemplate}
                  style={{ width: '100px' }}
                />
              </DataTable>
            )}
          </TabPanel>
        </TabView>
      </Dialog>
    </>
  );
};

export default RdpManager;
