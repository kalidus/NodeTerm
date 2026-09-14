import React, { useState, useEffect } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import { appConfirm } from '../../ui/AppConfirm';

export const IntegrationsSettingsTab = ({
  toastRef
}) => {
  const { t } = useTranslation('settings');
  const [integrationsActiveIndex, setIntegrationsActiveIndex] = useState(0);
  const [mcpConfig, setMcpConfig] = useState({ enabled: false, apiKey: '', port: 19800 });
  const [mcpStatus, setMcpStatus] = useState({ running: false, port: 19800, uptime: 0, requestCount: 0 });

  // Load MCP config and status
  useEffect(() => {
    if (window.electron && window.electron.mcpApi) {
      window.electron.mcpApi.getConfig().then(setMcpConfig).catch(console.error);
      window.electron.mcpApi.getStatus().then(setMcpStatus).catch(console.error);
      
      // Poll status every 2 seconds if running
      const interval = setInterval(() => {
        if (mcpStatus.running || mcpConfig.enabled) {
          window.electron.mcpApi.getStatus().then(setMcpStatus).catch(() => {});
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [mcpConfig.enabled, mcpStatus.running]);

  const saveMcpConfig = async (newConfig) => {
    if (window.electron && window.electron.mcpApi) {
      setMcpConfig(newConfig);
      const res = await window.electron.mcpApi.saveConfig(newConfig);
      if (res && res.success) {
        if (toastRef?.current) {
          toastRef.current.show({ severity: 'success', summary: 'Guardado', detail: 'Configuración de MCP guardada', life: 3000 });
        }
        window.electron.mcpApi.getStatus().then(setMcpStatus);
      } else {
        if (toastRef?.current) {
          toastRef.current.show({ severity: 'error', summary: 'Error', detail: res.error || 'Error guardando config MCP', life: 3000 });
        }
      }
    }
  };

  const generateMcpApiKey = async () => {
    if (window.electron && window.electron.mcpApi) {
      const res = await window.electron.mcpApi.generateApiKey();
      if (res && res.success) {
        const newConfig = { ...mcpConfig, apiKey: res.apiKey };
        saveMcpConfig(newConfig);
      }
    }
  };

  return (
    <TabView activeIndex={integrationsActiveIndex} onTabChange={(e) => setIntegrationsActiveIndex(e.index)} className="settings-subtabs" style={{ height: '100%' }}>
      <TabPanel header={t('sidebar.mcp') || 'MCP'} leftIcon="pi pi-server" style={{ height: '100%' }}>
        <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
          
          {/* Header con badge de estado */}
          <div className="general-settings-header-wrapper" style={{ flexShrink: 0, marginBottom: '20px' }}>
            <div className="general-header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="general-header-icon protocol-dialog-header-icon">
                  <i className="pi pi-server"></i>
                </span>
                <div className="general-header-text">
                  <h3 className="general-header">{t('mcp.title') || 'Integración MCP'}</h3>
                  <p className="general-description">{t('mcp.description') || 'Permite que herramientas de IA externas (Cursor, Claude, etc.) interactúen con NodeTerm de forma segura.'}</p>
                </div>
              </div>
              
              {/* Badge de estado */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: mcpStatus.running ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${mcpStatus.running ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: '6px 12px',
                borderRadius: '20px',
                color: mcpStatus.running ? '#22c55e' : '#ef4444',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: mcpStatus.running ? '#22c55e' : '#ef4444',
                  boxShadow: mcpStatus.running ? '0 0 8px #22c55e' : 'none'
                }}></div>
                {mcpStatus.running ? (t('mcp.running') || 'Activo') : (t('mcp.stopped') || 'Inactivo')}
              </div>
            </div>
          </div>

          {/* Configuración principal */}
          <div className="general-settings-section">
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-cog"></i>
              </div>
              <h4 className="general-section-title">Configuración del Servidor</h4>
            </div>

            <div className="general-settings-options">
              <div className="settings-option-item" style={{ borderBottom: '1px solid var(--ui-dialog-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div className="settings-option-text">
                  <label>{t('mcp.enabled') || 'Habilitar servidor MCP'}</label>
                </div>
                <div className="settings-option-control">
                  <InputSwitch 
                    checked={mcpConfig.enabled} 
                    onChange={(e) => {
                      const newEnabled = e.value;
                      saveMcpConfig({ ...mcpConfig, enabled: newEnabled }).then(() => {
                        if (newEnabled && !mcpConfig.apiKey) {
                          generateMcpApiKey();
                        }
                      });
                    }} 
                  />
                </div>
              </div>

              <div className="settings-option-item" style={{ alignItems: 'flex-start' }}>
                <div className="settings-option-text" style={{ flex: '1', minWidth: '200px' }}>
                  <label>{t('mcp.apiKey') || 'API Key'}</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                    Clave secreta requerida por los clientes MCP para conectarse.
                  </div>
                </div>
                <div className="settings-option-control" style={{ flex: '2', display: 'flex', gap: '8px' }}>
                  <div className="p-inputgroup" style={{ flex: 1 }}>
                    <InputText 
                      value={mcpConfig.apiKey} 
                      readOnly 
                      type="password"
                      placeholder="No hay clave generada"
                    />
                    <Button 
                      icon="pi pi-copy" 
                      className="p-button-secondary" 
                      tooltip={t('mcp.copyKey') || 'Copiar al portapapeles'}
                      onClick={() => {
                        if (mcpConfig.apiKey) {
                          navigator.clipboard.writeText(mcpConfig.apiKey);
                          if (toastRef?.current) toastRef.current.show({ severity: 'success', summary: 'Copiado', detail: 'API Key copiada al portapapeles', life: 2000 });
                        }
                      }}
                      disabled={!mcpConfig.apiKey}
                    />
                  </div>
                  <Button 
                    icon="pi pi-refresh" 
                    label={t('mcp.generateKey') || 'Generar'} 
                    className="p-button-outlined p-button-warning"
                    onClick={() => {
                      if (mcpConfig.apiKey) {
                        appConfirm({
                          message: '¿Estás seguro de generar una nueva clave? Tendrás que actualizar la configuración en todos tus clientes MCP.',
                          header: 'Confirmar',
                          severity: 'warn',
                          acceptLabel: 'Aceptar',
                          rejectLabel: 'Cancelar'
                        }).then(ok => {
                          if (ok) generateMcpApiKey();
                        });
                      } else {
                        generateMcpApiKey();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="settings-option-item" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--ui-dialog-border)' }}>
                <div className="settings-option-text">
                  <label>{t('mcp.port') || 'Puerto'}</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                    Puerto local donde escuchará el servidor.
                  </div>
                </div>
                <div className="settings-option-control">
                  <InputNumber 
                    value={mcpConfig.port} 
                    onValueChange={(e) => setMcpConfig({ ...mcpConfig, port: e.value })}
                    onBlur={() => saveMcpConfig(mcpConfig)}
                    useGrouping={false}
                    min={1024}
                    max={65535}
                    style={{ width: '120px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Snippets de configuración */}
          <div className="general-settings-section" style={{ marginTop: '1.5rem', opacity: mcpConfig.enabled ? 1 : 0.5, pointerEvents: mcpConfig.enabled ? 'auto' : 'none' }}>
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-code"></i>
              </div>
              <h4 className="general-section-title">{t('mcp.configSnippets') || 'Configurar tu MCP client'}</h4>
            </div>
            <div className="general-settings-options">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginBottom: '1rem' }}>
                Copia esta configuración y pégala en el archivo de configuración de tu cliente MCP (por ejemplo, en Cursor o Antigravity-CLI).
              </p>
              <div style={{ position: 'relative' }}>
                <pre style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--ui-dialog-border)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  margin: 0
                }}>
{`"mcpServers": {
  "nodeterm": {
    "command": "npx",
    "args": ["-y", "@kalidus/nodeterm-mcp"],
    "env": {
      "NODETERM_API_KEY": "${mcpConfig.apiKey || 'GENERAR_CLAVE_PRIMERO'}",
      "NODETERM_PORT": "${mcpConfig.port}"
    }
  }
}`}
                </pre>
                <Button 
                  icon="pi pi-copy" 
                  className="p-button-rounded p-button-text p-button-sm" 
                  style={{ position: 'absolute', top: '8px', right: '8px' }}
                  onClick={() => {
                    const snippet = `"mcpServers": {\n  "nodeterm": {\n    "command": "npx",\n    "args": ["-y", "@kalidus/nodeterm-mcp"],\n    "env": {\n      "NODETERM_API_KEY": "${mcpConfig.apiKey}",\n      "NODETERM_PORT": "${mcpConfig.port}"\n    }\n  }\n}`;
                    navigator.clipboard.writeText(snippet);
                    if (toastRef?.current) toastRef.current.show({ severity: 'success', summary: 'Copiado', detail: 'Snippet copiado al portapapeles', life: 2000 });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Requisitos y Estado en vivo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-info-circle"></i>
                </div>
                <h4 className="general-section-title">{t('mcp.requirements') || 'Requisitos para que funcione'}</h4>
              </div>
              <div className="general-settings-options" style={{ padding: '1rem' }}>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: 'var(--text-color-secondary)', lineHeight: 1.6 }}>
                  <li><i className="pi pi-check" style={{ color: '#22c55e', marginRight: '6px', fontSize: '0.7rem' }}></i> {t('mcp.req1') || 'NodeTerm debe estar abierto'}</li>
                  <li><i className="pi pi-check" style={{ color: '#22c55e', marginRight: '6px', fontSize: '0.7rem' }}></i> {t('mcp.req2') || 'Contraseñas deben estar desbloqueadas'}</li>
                  <li><i className="pi pi-check" style={{ color: '#22c55e', marginRight: '6px', fontSize: '0.7rem' }}></i> {t('mcp.req3') || 'Integración habilitada en esta pantalla'}</li>
                  <li><i className="pi pi-check" style={{ color: '#22c55e', marginRight: '6px', fontSize: '0.7rem' }}></i> {t('mcp.req4') || 'API Key debe coincidir'}</li>
                </ul>
              </div>
            </div>

            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-chart-bar"></i>
                </div>
                <h4 className="general-section-title">Estadísticas en vivo</h4>
              </div>
              <div className="general-settings-options" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-color-secondary)' }}>Uptime:</span>
                  <span style={{ fontWeight: '600' }}>{mcpStatus.uptime > 0 ? `${Math.floor(mcpStatus.uptime / 60)} min ${mcpStatus.uptime % 60} s` : '0 s'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-color-secondary)' }}>Peticiones servidas:</span>
                  <span style={{ fontWeight: '600' }}>{mcpStatus.requestCount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-color-secondary)' }}>Conexiones SSH activas:</span>
                  <span style={{ fontWeight: '600' }}>{mcpStatus.activeConnections || 0}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </TabPanel>
    </TabView>
  );
};

export default IntegrationsSettingsTab;
