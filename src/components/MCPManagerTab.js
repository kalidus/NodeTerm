import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import MCPCatalog from './MCPCatalog';
import mcpClient from '../services/MCPClientService';

const MCPManagerTab = ({ themeColors }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const toastRef = React.useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();

    // Listener para cambios - SOLO escuchar eventos específicos que requieren actualización
    const unsubscribe = mcpClient.addListener((event, data) => {
      console.log('[MCP Manager] Event:', event, data);
      
      // Solo actualizar en eventos de cambio real, NO en eventos de refresh
      if (event === 'server-installed' || 
          event === 'server-uninstalled' || 
          event === 'server-started' || 
          event === 'server-stopped' ||
          event === 'server-toggled') {
        loadData();
      } else if (event === 'servers-updated' || 
                 event === 'tools-updated' || 
                 event === 'resources-updated' || 
                 event === 'prompts-updated') {
        // Para estos eventos, solo actualizar el estado local sin refrescar
        setServers(mcpClient.getServers());
        setStats(mcpClient.getStats());
      }
      // Ignorar evento 'refresh' para evitar bucle
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      // Solo refrescar servidores, el resto se obtiene del cache
      await mcpClient.refreshServers();
      setServers(mcpClient.getServers());
      setStats(mcpClient.getStats());
    } catch (error) {
      console.error('Error cargando datos MCP:', error);
      showToast('error', 'Error', 'No se pudieron cargar los datos de MCP');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (severity, summary, detail) => {
    if (toastRef.current) {
      toastRef.current.show({ severity, summary, detail, life: 3000 });
    }
  };

  // Manejar toggle de servidor
  const handleToggleServer = async (serverId, currentlyEnabled) => {
    try {
      const result = await mcpClient.toggleServer(serverId, !currentlyEnabled);
      if (result.success) {
        showToast('success', 'Éxito', `Servidor ${!currentlyEnabled ? 'activado' : 'desactivado'}`);
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo cambiar el estado del servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar desinstalación
  const handleUninstall = async (serverId) => {
    if (!confirm(`¿Estás seguro de desinstalar el servidor ${serverId}?`)) {
      return;
    }

    try {
      const result = await mcpClient.uninstallServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor desinstalado correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo desinstalar el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar inicio de servidor
  const handleStartServer = async (serverId) => {
    try {
      const result = await mcpClient.startServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor iniciado correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo iniciar el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar detención de servidor
  const handleStopServer = async (serverId) => {
    try {
      const result = await mcpClient.stopServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor detenido correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo detener el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar instalación desde catálogo
  const handleInstall = async (serverId, config) => {
    console.log('🔧 [MCP Manager] Instalando:', serverId, config);
    
    try {
      showToast('info', 'Instalando', `Instalando MCP ${serverId}...`);
      
      const result = await mcpClient.installServer(serverId, config);
      console.log('🔧 [MCP Manager] Resultado instalación:', result);
      
      if (result.success) {
        showToast('success', 'Éxito', `MCP ${serverId} instalado correctamente`);
        // Esperar un momento y recargar
        setTimeout(() => loadData(), 1000);
      } else {
        showToast('error', 'Error', result.error || 'No se pudo instalar el MCP');
        console.error('❌ [MCP Manager] Error instalación:', result.error);
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
      console.error('❌ [MCP Manager] Error instalación:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <ProgressSpinner
          style={{ width: '50px', height: '50px' }}
          strokeWidth="3"
          fill="transparent"
          animationDuration=".8s"
        />
        <p style={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
          Cargando MCPs...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1rem',
      height: '100%',
      overflow: 'hidden',
      minHeight: 0
    }}>
      <Toast ref={toastRef} />

      {/* Resumen rápido mejorado con iconos y colores */}
      <div style={{
        background: `linear-gradient(135deg, ${themeColors.primaryColor}20 0%, ${themeColors.primaryColor}10 100%)`,
        border: `1px solid ${themeColors.primaryColor}40`,
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* MCP Activos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'rgba(100, 200, 100, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(100, 200, 100, 0.4)'
            }}>
              <i className="pi pi-check-circle" style={{ fontSize: '1.2rem', color: '#66bb6a' }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: themeColors.textSecondary,
                marginBottom: '0.2rem',
                fontWeight: '500'
              }}>
                MCPs Activos
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#66bb6a'
              }}>
                {stats?.activeServers || 0}
              </div>
            </div>
          </div>
          
          {/* Herramientas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'rgba(33, 150, 243, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(33, 150, 243, 0.4)'
            }}>
              <i className="pi pi-wrench" style={{ fontSize: '1.2rem', color: '#2196f3' }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: themeColors.textSecondary,
                marginBottom: '0.2rem',
                fontWeight: '500'
              }}>
                Herramientas
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#2196f3'
              }}>
                {stats?.totalTools || 0}
              </div>
            </div>
          </div>
          
          {/* Resources */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'rgba(156, 39, 176, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(156, 39, 176, 0.4)'
            }}>
              <i className="pi pi-box" style={{ fontSize: '1.2rem', color: '#9c27b0' }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: themeColors.textSecondary,
                marginBottom: '0.2rem',
                fontWeight: '500'
              }}>
                Resources
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#9c27b0'
              }}>
                {stats?.totalResources || 0}
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'rgba(255, 152, 0, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 152, 0, 0.4)'
            }}>
              <i className="pi pi-comment" style={{ fontSize: '1.2rem', color: '#ff9800' }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: themeColors.textSecondary,
                marginBottom: '0.2rem',
                fontWeight: '500'
              }}>
                Prompts
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#ff9800'
              }}>
                {stats?.totalPrompts || 0}
              </div>
            </div>
          </div>
        </div>

        <Button
          label="Refrescar"
          icon={refreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
          onClick={loadData}
          disabled={refreshing}
          style={{
            background: themeColors.primaryColor,
            border: 'none',
            color: 'white',
            borderRadius: '8px',
            fontSize: '0.85rem',
            padding: '0.65rem 1.25rem',
            fontWeight: '500'
          }}
        />
      </div>

      {/* Catálogo a pantalla completa */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: '600',
          color: themeColors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexShrink: 0
        }}>
          <i className="pi pi-th-large" />
          Catálogo de MCPs
        </h3>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <MCPCatalog
            installedServers={servers}
            onInstall={handleInstall}
            themeColors={themeColors}
          />
        </div>
      </div>
    </div>
  );
};

export default MCPManagerTab;

