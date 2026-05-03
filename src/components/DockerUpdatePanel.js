import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/docker-updates.css';

const DockerUpdatePanel = () => {
  const { t } = useTranslation('common');
  const [services, setServices] = useState([
    { id: 'agentzero', name: 'Agent Zero', icon: 'pi pi-bolt', image: 'agent0ai/agent-zero:latest', status: null },
    { id: 'anythingllm', name: 'AnythingLLM', icon: 'pi pi-database', image: 'mintplexlabs/anythingllm:latest', status: null },
    { id: 'openwebui', name: 'Open WebUI', icon: 'pi pi-desktop', image: 'ghcr.io/open-webui/open-webui:main', status: null },
    { id: 'librechat', name: 'LibreChat', icon: 'pi pi-comments', image: 'ghcr.io/danny-avila/librechat:latest', status: null },
    { id: 'openclaw', name: 'OpenClaw', icon: 'pi pi-github', image: 'ghcr.io/openclaw/openclaw:latest', status: null },
    { id: 'opennotebook', name: 'Open Notebook', icon: 'pi pi-book', image: 'lfnovo/open_notebook:v1-latest-single', status: null }
  ]);

  const [isCheckingGlobal, setIsCheckingGlobal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    loadAllStatus();
  }, []);

  const updateServiceInList = (id, statusUpdate) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: statusUpdate } : s));
  };

  const loadAllStatus = async () => {
    setIsRefreshing(true);
    console.warn('[DockerUpdatePanel] 🚀 Iniciando carga unificada v3...');
    
    if (!window.electron || !window.electron.ipcRenderer) {
      console.error('[DockerUpdatePanel] ❌ Error: window.electron.ipcRenderer no disponible');
      setIsRefreshing(false);
      return;
    }

    // Inicializar estados como 'loading'
    setServices(prev => prev.map(s => ({ ...s, status: { phase: 'loading', message: 'Cargando...' } })));

    // Ejecutar todas las peticiones
    await Promise.allSettled(services.map(async (service) => {
      try {
        console.log(`[DockerUpdatePanel] Consultando: ${service.id}:get-status`);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        const result = await Promise.race([
          window.electron.ipcRenderer.invoke(`${service.id}:get-status`),
          timeoutPromise
        ]);
        
        console.log(`[DockerUpdatePanel] Resultado de ${service.id}:`, result);
        
        if (result && result.success) {
          updateServiceInList(service.id, result.status);
        } else {
          updateServiceInList(service.id, { phase: 'error', message: result?.error || 'Error de servidor' });
        }
      } catch (error) {
        console.error(`[DockerUpdatePanel] Error en ${service.id}:`, error);
        updateServiceInList(service.id, { 
          phase: 'error', 
          message: error.message === 'Timeout' ? 'Timeout (10s)' : (error.message || 'Error') 
        });
      }
    }));

    setIsRefreshing(false);
    console.log('[DockerUpdatePanel] Carga finalizada.');
  };

  const checkUpdate = async (serviceId) => {
    updateServiceInList(serviceId, { ...services.find(s => s.id === serviceId)?.status, phase: 'checking', message: 'Buscando actualizaciones...' });

    try {
      const result = await window.electron.ipcRenderer.invoke(`${serviceId}:check-update`);
      if (result.success) {
        const statusResult = await window.electron.ipcRenderer.invoke(`${serviceId}:get-status`);
        updateServiceInList(serviceId, statusResult.status);
        
        if (statusResult.status?.updateAvailable) {
          toast.current.show({
            severity: 'info',
            summary: 'Actualización Detectada',
            detail: `Hay una nueva versión para ${serviceId}`,
            life: 3000
          });
        } else {
          toast.current.show({
            severity: 'success',
            summary: 'Actualizado',
            detail: `${serviceId} ya está en la última versión`,
            life: 2000
          });
        }
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `No se pudo verificar ${serviceId}: ${error.message}`,
        life: 3000
      });
      // Recuperar estado anterior
      const statusResult = await window.electron.ipcRenderer.invoke(`${serviceId}:get-status`);
      updateServiceInList(serviceId, statusResult.status);
    }
  };

  const applyUpdate = async (serviceId) => {
    updateServiceInList(serviceId, { ...services.find(s => s.id === serviceId)?.status, phase: 'updating', message: 'Actualizando...' });

    try {
      const result = await window.electron.ipcRenderer.invoke(`${serviceId}:apply-update`);
      if (result.success) {
        toast.current.show({
          severity: 'success',
          summary: 'Completado',
          detail: `${serviceId} se ha actualizado y reiniciado`,
          life: 5000
        });
      } else {
        throw new Error(result.error || 'Error en la actualización');
      }
      await loadAllStatus();
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error en la actualización',
        detail: error.message,
        life: 5000
      });
      await loadAllStatus();
    }
  };

  const checkAllUpdates = async () => {
    setIsCheckingGlobal(true);
    for (const service of services) {
      await checkUpdate(service.id);
    }
    setIsCheckingGlobal(false);
  };

  const statusBodyTemplate = (rowData) => {
    const status = rowData.status;
    if (!status || status.phase === 'loading') return <Badge value="Cargando..." severity="secondary" className="pulse" />;

    if (status.phase === 'checking') return <Badge value="Buscando..." severity="info" className="pulse" />;
    if (status.phase === 'updating') return <Badge value="Actualizando..." severity="warning" className="pulse" />;
    if (status.phase === 'error') return <Badge value="Error de conexión" severity="danger" tooltip={status.message} />;
    
    if (status.updateAvailable) {
      return <Badge value="Actualización disponible" severity="warning" />;
    }

    return <Badge value="Actualizado" severity="success" />;
  };

  const actionBodyTemplate = (rowData) => {
    const status = rowData.status;
    const isBusy = status?.phase === 'checking' || status?.phase === 'updating';

    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button 
          icon="pi pi-search" 
          className="p-button-rounded p-button-text" 
          onClick={() => checkUpdate(rowData.id)} 
          disabled={isBusy}
          tooltip="Buscar actualización"
        />
        {status?.updateAvailable && (
          <Button 
            icon="pi pi-download" 
            className="p-button-rounded p-button-success" 
            onClick={() => applyUpdate(rowData.id)} 
            disabled={isBusy}
            tooltip="Actualizar ahora"
          />
        )}
      </div>
    );
  };

  const nameBodyTemplate = (rowData) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div className="service-icon-wrapper">
        <i className={rowData.icon} style={{ fontSize: '1.2rem' }}></i>
      </div>
      <div>
        <div style={{ fontWeight: '600' }}>{rowData.name}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rowData.image}
        </div>
      </div>
    </div>
  );

  return (
    <div className="docker-update-panel" style={{ padding: '1rem' }}>
      <Toast ref={toast} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Actualizaciones de Servicios (Docker)</h3>
          <p style={{ color: 'var(--text-color-secondary)', margin: '0.5rem 0 0 0' }}>
            Gestiona las versiones de los contenedores de IA instalados.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button 
            icon="pi pi-sync" 
            onClick={loadAllStatus} 
            loading={isRefreshing}
            className="p-button-text p-button-rounded"
            tooltip="Refrescar estados"
          />
          <Button 
            label="Buscar en todos" 
            icon="pi pi-refresh" 
            onClick={checkAllUpdates} 
            loading={isCheckingGlobal}
            className="p-button-outlined"
          />
        </div>
      </div>

      <div className="card shadow-1 docker-table-card" style={{ background: 'var(--surface-card)', borderRadius: '12px', overflow: 'hidden' }}>
        <DataTable value={services} className="p-datatable-sm">
          <Column header="Servicio" body={nameBodyTemplate} style={{ width: '40%' }} />
          <Column header="Estado" body={statusBodyTemplate} style={{ width: '30%' }} />
          <Column header="Acciones" body={actionBodyTemplate} style={{ width: '30%' }} />
        </DataTable>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Message 
          severity="info" 
          className="w-full"
          text="Las actualizaciones descargan la última imagen de Docker Hub y reinician el contenedor automáticamente. Tus datos se conservan gracias a los volúmenes persistentes." 
        />
      </div>
    </div>
  );
};

export default DockerUpdatePanel;
