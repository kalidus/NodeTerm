import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
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

const RdpManager = ({ visible, onHide, rdpNodeData, onSaveToSidebar }) => {
  const toast = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    preset: 'default',
    resolution: '1920x1080',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: true,
    fullscreen: false,
    span: false,
    admin: false,
    public: false
  });

  // Opciones para dropdowns
  const resolutionOptions = [
    { label: '1920x1080 (Full HD)', value: '1920x1080' },
    { label: '1366x768 (HD)', value: '1366x768' },
    { label: '1280x720 (HD Ready)', value: '1280x720' },
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
    { label: 'Todas las características', value: 'fullFeature' }
  ];

  useEffect(() => {
    if (visible) {
      loadPresets();
      refreshConnections();
      
      // Cargar datos del nodo RDP si están disponibles
      if (rdpNodeData) {
        setFormData({
          name: rdpNodeData.name || '',
          server: rdpNodeData.server || '',
          username: rdpNodeData.username || '',
          password: rdpNodeData.password || '',
          port: rdpNodeData.port || 3389,
          preset: 'default',
          resolution: rdpNodeData.resolution || '1920x1080',
          colorDepth: rdpNodeData.colorDepth || 32,
          redirectFolders: rdpNodeData.redirectFolders !== false,
          redirectClipboard: rdpNodeData.redirectClipboard !== false,
          redirectPrinters: rdpNodeData.redirectPrinters || false,
          redirectAudio: rdpNodeData.redirectAudio !== false,
          fullscreen: rdpNodeData.fullscreen || false,
          span: rdpNodeData.span || false,
          admin: rdpNodeData.admin || false,
          public: rdpNodeData.public || false
        });
      }
    }
  }, [visible, rdpNodeData]);

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
        ...preset
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
      onSaveToSidebar(formData);
      toast.current?.show({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Conexión RDP guardada en la sidebar',
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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre descriptivo para la conexión"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="server">Servidor *</label>
                    <InputText
                      id="server"
                      value={formData.server}
                      onChange={(e) => setFormData(prev => ({ ...prev, server: e.target.value }))}
                      placeholder="IP o nombre del servidor"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="port">Puerto</label>
                    <InputText
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 3389 }))}
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="username">Usuario *</label>
                    <InputText
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Nombre de usuario"
                    />
                  </div>
                  <div className="field col-12 md:col-6">
                    <label htmlFor="password">Contraseña</label>
                    <Password
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Contraseña (opcional)"
                      feedback={false}
                      toggleMask
                    />
                  </div>
                </div>
              </Card>

              <Card title="Configuración de Pantalla" className="mb-3">
                <div className="formgrid grid">
                  <div className="field col-12 md:col-4">
                    <label htmlFor="preset">Preset</label>
                    <Dropdown
                      id="preset"
                      value={formData.preset}
                      options={presetOptions}
                      onChange={(e) => handlePresetChange(e.value)}
                    />
                  </div>
                  <div className="field col-12 md:col-4">
                    <label htmlFor="resolution">Resolución</label>
                    <Dropdown
                      id="resolution"
                      value={formData.resolution}
                      options={resolutionOptions}
                      onChange={(e) => setFormData(prev => ({ ...prev, resolution: e.value }))}
                    />
                  </div>
                  <div className="field col-12 md:col-4">
                    <label htmlFor="colorDepth">Profundidad de Color</label>
                    <Dropdown
                      id="colorDepth"
                      value={formData.colorDepth}
                      options={colorDepthOptions}
                      onChange={(e) => setFormData(prev => ({ ...prev, colorDepth: e.value }))}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Opciones Avanzadas">
                <div className="formgrid grid">
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="redirectFolders"
                      checked={formData.redirectFolders}
                      onChange={(e) => setFormData(prev => ({ ...prev, redirectFolders: e.checked }))}
                    />
                    <label htmlFor="redirectFolders" className="ml-2">Redirigir carpetas</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="redirectClipboard"
                      checked={formData.redirectClipboard}
                      onChange={(e) => setFormData(prev => ({ ...prev, redirectClipboard: e.checked }))}
                    />
                    <label htmlFor="redirectClipboard" className="ml-2">Compartir portapapeles</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="redirectPrinters"
                      checked={formData.redirectPrinters}
                      onChange={(e) => setFormData(prev => ({ ...prev, redirectPrinters: e.checked }))}
                    />
                    <label htmlFor="redirectPrinters" className="ml-2">Redirigir impresoras</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="redirectAudio"
                      checked={formData.redirectAudio}
                      onChange={(e) => setFormData(prev => ({ ...prev, redirectAudio: e.checked }))}
                    />
                    <label htmlFor="redirectAudio" className="ml-2">Redirigir audio</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="fullscreen"
                      checked={formData.fullscreen}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullscreen: e.checked }))}
                    />
                    <label htmlFor="fullscreen" className="ml-2">Pantalla completa</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="span"
                      checked={formData.span}
                      onChange={(e) => setFormData(prev => ({ ...prev, span: e.checked }))}
                    />
                    <label htmlFor="span" className="ml-2">Múltiples monitores</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="admin"
                      checked={formData.admin}
                      onChange={(e) => setFormData(prev => ({ ...prev, admin: e.checked }))}
                    />
                    <label htmlFor="admin" className="ml-2">Sesión administrativa</label>
                  </div>
                  <div className="field-checkbox col-12 md:col-6">
                    <Checkbox
                      inputId="public"
                      checked={formData.public}
                      onChange={(e) => setFormData(prev => ({ ...prev, public: e.checked }))}
                    />
                    <label htmlFor="public" className="ml-2">Conexión pública</label>
                  </div>
                </div>

                <Divider />
                
                <div className="flex justify-content-end gap-2">
                  <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    className="p-button-secondary"
                    onClick={onHide}
                  />
                  <Button
                    label="Guardar en Sidebar"
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
