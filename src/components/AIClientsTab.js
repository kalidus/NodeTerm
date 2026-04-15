import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { InputSwitch } from 'primereact/inputswitch';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import '../styles/components/ai-clients-tab.css';

const AI_CLIENTS_STORAGE_KEY = 'ai_clients_enabled';

/**
 * Componente para gestionar los clientes de IA disponibles en NodeTerm
 * Permite activar/desactivar cada cliente de forma visual y elegante
 */
const AIClientsTab = ({ themeColors }) => {
  // Estado para cada cliente de IA
  const [clients, setClients] = useState({
    nodeterm: false,
    claude: false,
    opencode: false,
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false,
    opennotebook: false
  });

  // Estado de carga para verificar servicios Docker
  const [dockerStatus, setDockerStatus] = useState({
    anythingllm: { loading: false, running: false, error: null },
    openwebui: { loading: false, running: false, error: null },
    librechat: { loading: false, running: false, error: null },
    agentzero: { loading: false, running: false, error: null },
    openclaw: { loading: false, running: false, error: null },
    opennotebook: { loading: false, running: false, error: null }
  });
  const [claudeCliStatus, setClaudeCliStatus] = useState({
    loading: false,
    installed: false,
    installing: false,
    version: null,
    binaryPath: null,
    error: null
  });
  const [openCodeCliStatus, setOpenCodeCliStatus] = useState({
    loading: false,
    installed: false,
    installing: false,
    version: null,
    binaryPath: null,
    error: null
  });

  // Cargar configuración desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(AI_CLIENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClients(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (error) {
        console.warn('[AIClientsTab] Error al cargar configuración:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkClaudeCliStatus();
  }, []);

  useEffect(() => {
    checkOpenCodeCliStatus();
  }, []);

  // Verificar estado de servicios Docker al montar y cuando cambian los toggles
  useEffect(() => {
    if (clients.anythingllm) {
      checkDockerServiceStatus('anythingllm');
    }
    if (clients.openwebui) {
      checkDockerServiceStatus('openwebui');
    }
    if (clients.librechat) {
      checkDockerServiceStatus('librechat');
    }
    if (clients.agentzero) {
      checkDockerServiceStatus('agentzero');
    }
    if (clients.openclaw) {
      checkDockerServiceStatus('openclaw');
    }
    if (clients.opennotebook) {
      checkDockerServiceStatus('opennotebook');
    }
  }, [clients.anythingllm, clients.openwebui, clients.librechat, clients.agentzero, clients.openclaw, clients.opennotebook]);

  // Guardar configuración en localStorage cuando cambia
  const saveClientsConfig = (newClients) => {
    setClients(newClients);
    localStorage.setItem(AI_CLIENTS_STORAGE_KEY, JSON.stringify(newClients));
    
    // Emitir evento para que otros componentes se actualicen inmediatamente
    window.dispatchEvent(new CustomEvent('ai-clients-config-changed', {
      detail: { config: newClients }
    }));
  };

  const checkClaudeCliStatus = async () => {
    setClaudeCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.electron?.claude?.getCliStatus?.();
      if (result?.success) {
        setClaudeCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
      } else {
        setClaudeCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar Claude CLI'
        }));
      }
    } catch (error) {
      setClaudeCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar Claude CLI'
      }));
    }
  };

  const installClaudeCli = async () => {
    setClaudeCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.claude?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar Claude CLI');
      }
      await checkClaudeCliStatus();
      return true;
    } catch (error) {
      setClaudeCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar Claude CLI'
      }));
      return false;
    }
  };

  const checkOpenCodeCliStatus = async () => {
    setOpenCodeCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.electron?.opencode?.getCliStatus?.();
      if (result?.success) {
        setOpenCodeCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
      } else {
        setOpenCodeCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar OpenCode CLI'
        }));
      }
    } catch (error) {
      setOpenCodeCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar OpenCode CLI'
      }));
    }
  };

  const installOpenCodeCli = async () => {
    setOpenCodeCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.opencode?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar OpenCode CLI');
      }
      await checkOpenCodeCliStatus();
      return true;
    } catch (error) {
      setOpenCodeCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar OpenCode CLI'
      }));
      return false;
    }
  };

  // Handler para cambiar el estado de un cliente
  const handleToggleClient = async (clientKey) => {
    if (clientKey === 'claude') {
      const willEnable = !clients.claude;
      if (willEnable && !claudeCliStatus.installed) {
        const ok = await installClaudeCli();
        if (!ok) return;
      }
      const newClients = { ...clients, claude: willEnable };
      saveClientsConfig(newClients);
      return;
    }

    if (clientKey === 'opencode') {
      const willEnable = !clients.opencode;
      if (willEnable && !openCodeCliStatus.installed) {
        const ok = await installOpenCodeCli();
        if (!ok) return;
      }
      const newClients = { ...clients, opencode: willEnable };
      saveClientsConfig(newClients);
      return;
    }

    const newClients = {
      ...clients,
      [clientKey]: !clients[clientKey]
    };
    saveClientsConfig(newClients);

    // Si se activa un servicio Docker, verificar su estado
    if (newClients[clientKey] && (clientKey === 'anythingllm' || clientKey === 'openwebui' || clientKey === 'librechat' || clientKey === 'openclaw' || clientKey === 'opennotebook')) {
      await checkDockerServiceStatus(clientKey);
    }
  };

  // Verificar el estado de un servicio Docker
  const checkDockerServiceStatus = async (serviceKey) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceKey]: { ...prev[serviceKey], loading: true, error: null }
    }));

    try {
      let ipcKey = '';
      if (serviceKey === 'anythingllm') ipcKey = 'anythingllm:get-status';
      else if (serviceKey === 'openwebui') ipcKey = 'openwebui:get-status';
      else if (serviceKey === 'librechat') ipcKey = 'librechat:get-status';
      else if (serviceKey === 'agentzero') ipcKey = 'agentzero:get-status';
      else if (serviceKey === 'openclaw') ipcKey = 'openclaw:get-status';
      else if (serviceKey === 'opennotebook') ipcKey = 'opennotebook:get-status';

      const result = await window.electron.ipcRenderer.invoke(ipcKey);
      
      if (result.success) {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: result.status?.isRunning || false,
            error: null
          }
        }));
      } else {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: false,
            error: result.error || 'Error al verificar estado'
          }
        }));
      }
    } catch (error) {
      setDockerStatus(prev => ({
        ...prev,
        [serviceKey]: {
          loading: false,
          running: false,
          error: error.message || 'Error de conexión'
        }
      }));
    }
  };

  // Iniciar un servicio Docker
  const handleStartDockerService = async (serviceKey) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceKey]: { ...prev[serviceKey], loading: true, error: null }
    }));

    try {
      let ipcKey = '';
      if (serviceKey === 'anythingllm') ipcKey = 'anythingllm:start';
      else if (serviceKey === 'openwebui') ipcKey = 'openwebui:start';
      else if (serviceKey === 'librechat') ipcKey = 'librechat:start';
      else if (serviceKey === 'agentzero') ipcKey = 'agentzero:start';
      else if (serviceKey === 'openclaw') ipcKey = 'openclaw:start';
      else if (serviceKey === 'opennotebook') ipcKey = 'opennotebook:start';

      const result = await window.electron.ipcRenderer.invoke(ipcKey);
      
      if (result.success) {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: true,
            error: null
          }
        }));
      } else {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: false,
            error: result.error || 'Error al iniciar servicio'
          }
        }));
      }
    } catch (error) {
      setDockerStatus(prev => ({
        ...prev,
        [serviceKey]: {
          loading: false,
          running: false,
          error: error.message || 'Error al iniciar'
        }
      }));
    }
  };

  // Definición de los clientes de IA
  const clientsDefinition = [
    {
      key: 'claude',
      name: 'Claude Code (CLI Local)',
      icon: 'pi pi-comments',
      color: '#f59e0b',
      description: 'Integra Claude Code como terminal local en NodeTerm. Si no está instalado, NodeTerm puede instalar el CLI automáticamente.',
      features: ['Instalación automática', 'Terminal local dedicada', 'Activar/Desactivar desde Clientes IA', 'Configuración en Settings'],
      badges: [
        { label: 'LOCAL CLI', severity: 'warning', icon: 'pi pi-desktop' }
      ],
      requiresDocker: false,
      isLocalCli: true
    },
    {
      key: 'opencode',
      name: 'OpenCode (CLI Local)',
      icon: 'pi pi-code',
      color: '#6366f1',
      description: 'Agente de IA open-source para codificación en terminal. Soporta 75+ proveedores de modelos incluyendo Claude, GPT, Gemini y modelos locales.',
      features: ['Open Source', 'Multi-proveedor (75+ LLMs)', 'Terminal local dedicada', 'Instalación automática'],
      badges: [
        { label: 'LOCAL CLI', severity: 'warning', icon: 'pi pi-desktop' },
        { label: 'FREE', severity: 'success', icon: 'pi pi-star' }
      ],
      requiresDocker: false,
      isLocalCli: true
    },
    {
      key: 'anythingllm',
      name: 'AnythingLLM',
      icon: 'pi pi-cloud',
      color: '#4CAF50',
      description: 'Plataforma completa de IA con RAG, documentos, embeddings y múltiples modelos. Incluye interfaz web completa.',
      features: ['RAG avanzado', 'Múltiples LLMs', 'Gestión de documentos', 'Interfaz web'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 3001,
      url: 'http://127.0.0.1:3001'
    },
    {
      key: 'openwebui',
      name: 'Open WebUI',
      icon: 'pi pi-globe',
      color: '#2196F3',
      description: 'Interfaz web moderna tipo ChatGPT para Ollama. Experiencia de usuario similar a ChatGPT con tus modelos locales.',
      features: ['Interfaz tipo ChatGPT', 'Historial completo', 'Compartir conversaciones', 'Plugins'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 3000,
      url: 'http://127.0.0.1:3000'
    },
    {
      key: 'librechat',
      name: 'LibreChat',
      icon: 'pi pi-comment',
      color: '#9C27B0',
      description: 'Interfaz de chat de IA avanzada y personalizable. Soporta múltiples proveedores y modelos con una experiencia premium.',
      features: ['Multi-proveedor', 'Presets de búsqueda', 'Historial avanzado', 'Plugins y herramientas'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 3080,
      url: 'http://127.0.0.1:3080'
    },
    {
      key: 'agentzero',
      name: 'Agent Zero',
      icon: 'pi pi-android',
      color: '#E91E63',
      description: 'Framework de IA agente. Una interfaz innovadora para interactuar con agentes autónomos usando modelos locales o en la nube.',
      features: ['Agentes Autónomos', 'Ejecución de Código', 'Búsqueda Web', 'Archivos'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 3081,
      url: 'http://127.0.0.1:3081'
    },
    {
      key: 'openclaw',
      name: 'OpenClaw',
      icon: 'pi pi-bolt',
      color: '#FF6B35',
      description: 'Gateway de agentes IA con sandboxing Docker, soporte multi-modelo y canales de mensajería (Telegram, Discord, WhatsApp).',
      features: ['Agentes con sandbox', 'Multi-modelo (OpenAI, Anthropic)', 'Canales de mensajería', 'Control UI integrado'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 18789,
      url: 'http://127.0.0.1:18789'
    },
    {
      key: 'opennotebook',
      name: 'Open Notebook',
      icon: 'pi pi-book',
      color: '#10B981',
      description: 'Alternativa self-hosted a Google NotebookLM. Organiza documentos, PDFs y webs con IA multi-modelo y privacidad total.',
      features: ['RAG sobre documentos y PDFs', 'Multi-modelo (OpenAI, Ollama, Anthropic)', 'Podcasts generados con IA', 'Privacidad total'],
      badges: [
        { label: 'DOCKER', severity: 'info', icon: 'pi pi-box' }
      ],
      requiresDocker: true,
      port: 8502,
      url: 'http://127.0.0.1:8502'
    },
    {
      key: 'nodeterm',
      name: 'Chat IA NodeTerm',
      icon: 'pi pi-comments',
      color: '#00BCD4',
      description: 'Cliente de IA integrado en NodeTerm con Ollama local. Perfecto para desarrollo y uso offline.',
      features: ['Ollama local', 'Privacidad total', 'Modelos personalizados', 'Sin límites de uso'],
      badges: [
        { label: 'EXPERIMENTAL', severity: 'warning', icon: 'pi pi-exclamation-triangle' }
      ],
      requiresDocker: false
    }
  ];

  // Renderizar una card de cliente
  const renderClientCard = (client) => {
    const isEnabled = clients[client.key];
    const status = dockerStatus[client.key];

    const cardHeader = (
      <div className="ai-client-card-header" style={{ 
        background: `linear-gradient(135deg, ${client.color}20, ${client.color}10)`,
        borderBottom: `2px solid ${client.color}40`
      }}>
        <div className="ai-client-icon-wrapper" style={{ 
          background: `linear-gradient(135deg, ${client.color}, ${client.color}CC)` 
        }}>
          <i className={client.icon} style={{ fontSize: '1.25rem', color: 'white' }} />
        </div>
        <div className="ai-client-header-info">
          <h3 className="ai-client-name">{client.name}</h3>
          <div className="ai-client-badges">
            {client.badges.map((badge, idx) => (
              <Badge 
                key={idx}
                value={badge.label} 
                severity={badge.severity}
                icon={badge.icon}
                style={{ marginRight: '0.5rem' }}
              />
            ))}
            {client.requiresDocker && isEnabled && (
              status.loading ? (
                <Badge 
                  value="VERIFICANDO" 
                  severity="secondary"
                  icon={<ProgressSpinner style={{ width: '14px', height: '14px' }} />}
                />
              ) : status.running ? (
                <Badge 
                  value="EN EJECUCIÓN" 
                  severity="success"
                  icon="pi pi-check-circle"
                />
              ) : status.error ? (
                <Badge 
                  value="ERROR" 
                  severity="danger"
                  icon="pi pi-times-circle"
                />
              ) : (
                <Badge 
                  value="DETENIDO" 
                  severity="warning"
                  icon="pi pi-minus-circle"
                />
              )
            )}
          </div>
        </div>
        <div className="ai-client-toggle">
          <InputSwitch 
            checked={isEnabled} 
            onChange={() => handleToggleClient(client.key)}
            style={{
              transform: 'scale(1.05)'
            }}
          />
        </div>
      </div>
    );

    return (
      <Card 
        key={client.key}
        header={cardHeader}
        className={`ai-client-card ${isEnabled ? 'enabled' : 'disabled'}`}
        style={{
          borderLeft: `4px solid ${isEnabled ? client.color : '#666'}`,
          opacity: isEnabled ? 1 : 0.7
        }}
      >
        <div className="ai-client-card-body">
          <p className="ai-client-description">{client.description}</p>
          
          <div className="ai-client-features">
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-color-secondary)' }}>
              ✨ Características principales:
            </h4>
            <ul>
              {client.features.map((feature, idx) => (
                <li key={idx}>
                  <i className="pi pi-check-circle" style={{ color: client.color, marginRight: '0.5rem' }} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Información adicional para servicios Docker */}
          {client.requiresDocker && isEnabled && (
            <div className="ai-client-docker-info">
              <div className="docker-info-item">
                <i className="pi pi-link" style={{ color: client.color, marginRight: '0.5rem' }} />
                <strong>URL:</strong> <code>{client.url}</code>
              </div>
              <div className="docker-info-item">
                <i className="pi pi-server" style={{ color: client.color, marginRight: '0.5rem' }} />
                <strong>Puerto:</strong> <code>{client.port}</code>
              </div>
              
              {/* Botones de acción */}
              <div className="docker-actions" style={{ marginTop: '1rem' }}>
                {!status.running && !status.loading && (
                  <Button
                    label="Iniciar Servicio"
                    icon="pi pi-play"
                    onClick={() => handleStartDockerService(client.key)}
                    className="p-button-success p-button-sm"
                    style={{ marginRight: '0.5rem' }}
                  />
                )}
                <Button
                  label="Verificar Estado"
                  icon="pi pi-refresh"
                  onClick={() => checkDockerServiceStatus(client.key)}
                  className="p-button-secondary p-button-sm"
                  loading={status.loading}
                />
              </div>

              {/* Mostrar error si existe */}
              {status.error && (
                <div className="docker-error" style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#f443361a',
                  border: '1px solid #f44336',
                  borderRadius: '4px'
                }}>
                  <i className="pi pi-exclamation-triangle" style={{ color: '#f44336', marginRight: '0.5rem' }} />
                  <span style={{ color: '#f44336' }}>{status.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Información para NodeTerm */}
          {client.key === 'nodeterm' && isEnabled && (
            <div className="ai-client-note" style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#ff98001a',
              border: '1px solid #ff9800',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <i className="pi pi-info-circle" style={{ color: '#ff9800', marginRight: '0.5rem' }} />
              <strong>Nota:</strong> Este cliente está en fase experimental. Requiere Ollama instalado localmente.
            </div>
          )}

          {client.key === 'claude' && (
            <div className="ai-client-note" style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid #f59e0b',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <i className="pi pi-info-circle" style={{ color: '#f59e0b', marginRight: '0.5rem' }} />
                <strong>Estado CLI:</strong>{' '}
                {claudeCliStatus.loading
                  ? 'verificando...'
                  : (claudeCliStatus.installed
                    ? `instalado${claudeCliStatus.version ? ` (${claudeCliStatus.version})` : ''}`
                    : 'no instalado')}
              </div>
              {claudeCliStatus.binaryPath && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Binario:</strong> <code>{claudeCliStatus.binaryPath}</code>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!claudeCliStatus.installed && (
                  <Button
                    label="Instalar Claude CLI"
                    icon="pi pi-download"
                    className="p-button-warning p-button-sm"
                    onClick={installClaudeCli}
                    loading={claudeCliStatus.installing}
                  />
                )}
                {claudeCliStatus.installed && (
                  <Button
                    label="Reinstalar CLI"
                    icon="pi pi-refresh"
                    className="p-button-secondary p-button-sm"
                    onClick={installClaudeCli}
                    loading={claudeCliStatus.installing}
                  />
                )}
                <Button
                  label="Verificar"
                  icon="pi pi-search"
                  className="p-button-secondary p-button-sm"
                  onClick={checkClaudeCliStatus}
                  loading={claudeCliStatus.loading}
                />
              </div>
              {claudeCliStatus.error && (
                <div style={{ marginTop: '0.75rem', color: '#ef4444' }}>
                  <i className="pi pi-times-circle" style={{ marginRight: '0.4rem' }} />
                  {claudeCliStatus.error}
                </div>
              )}
            </div>
          )}

          {client.key === 'opencode' && (
            <div className="ai-client-note" style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid #6366f1',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <i className="pi pi-info-circle" style={{ color: '#6366f1', marginRight: '0.5rem' }} />
                <strong>Estado CLI:</strong>{' '}
                {openCodeCliStatus.loading
                  ? 'verificando...'
                  : (openCodeCliStatus.installed
                    ? `instalado${openCodeCliStatus.version ? ` (${openCodeCliStatus.version})` : ''}`
                    : 'no instalado')}
              </div>
              {openCodeCliStatus.binaryPath && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Binario:</strong> <code>{openCodeCliStatus.binaryPath}</code>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!openCodeCliStatus.installed && (
                  <Button
                    label="Instalar OpenCode CLI"
                    icon="pi pi-download"
                    className="p-button-sm"
                    style={{ background: '#6366f1', border: '1px solid #6366f1' }}
                    onClick={installOpenCodeCli}
                    loading={openCodeCliStatus.installing}
                  />
                )}
                {openCodeCliStatus.installed && (
                  <Button
                    label="Reinstalar CLI"
                    icon="pi pi-refresh"
                    className="p-button-secondary p-button-sm"
                    onClick={installOpenCodeCli}
                    loading={openCodeCliStatus.installing}
                  />
                )}
                <Button
                  label="Verificar"
                  icon="pi pi-search"
                  className="p-button-secondary p-button-sm"
                  onClick={checkOpenCodeCliStatus}
                  loading={openCodeCliStatus.loading}
                />
              </div>
              {openCodeCliStatus.error && (
                <div style={{ marginTop: '0.75rem', color: '#ef4444' }}>
                  <i className="pi pi-times-circle" style={{ marginRight: '0.4rem' }} />
                  {openCodeCliStatus.error}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="ai-clients-tab" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="ai-clients-grid">
        {clientsDefinition.map(client => renderClientCard(client))}
      </div>

      {/* Información adicional */}
      <div className="ai-clients-footer">
        <div className="info-card">
          <i className="pi pi-info-circle" style={{ fontSize: '1.2rem', color: '#2196F3', marginRight: '0.75rem' }} />
          <div>
            <strong>¿Cómo funciona?</strong>
            <p>
              Activa los clientes que deseas usar. Los servicios Docker (AnythingLLM y OpenWebUI) 
              solo se iniciarán cuando estén activados. NodeTerm IA es el cliente integrado que 
              funciona directamente con Ollama local sin necesidad de Docker.
            </p>
          </div>
        </div>
        
        <div className="info-card">
          <i className="pi pi-box" style={{ fontSize: '1.2rem', color: '#4CAF50', marginRight: '0.75rem' }} />
          <div>
            <strong>Requisitos de Docker</strong>
            <p>
              Para usar AnythingLLM y OpenWebUI necesitas Docker Desktop instalado y en ejecución. 
              LibreChat también requiere Docker. La primera vez que actives un servicio,
              se descargará la imagen correspondiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIClientsTab;

