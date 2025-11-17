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
    nodeterm: true,
    anythingllm: false,
    openwebui: false
  });

  // Estado de carga para verificar servicios Docker
  const [dockerStatus, setDockerStatus] = useState({
    anythingllm: { loading: false, running: false, error: null },
    openwebui: { loading: false, running: false, error: null }
  });

  // Cargar configuración desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(AI_CLIENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClients(parsed);
      } catch (error) {
        console.warn('[AIClientsTab] Error al cargar configuración:', error);
      }
    }
  }, []);

  // Verificar estado de servicios Docker al montar y cuando cambian los toggles
  useEffect(() => {
    if (clients.anythingllm) {
      checkDockerServiceStatus('anythingllm');
    }
    if (clients.openwebui) {
      checkDockerServiceStatus('openwebui');
    }
  }, [clients.anythingllm, clients.openwebui]);

  // Guardar configuración en localStorage cuando cambia
  const saveClientsConfig = (newClients) => {
    setClients(newClients);
    localStorage.setItem(AI_CLIENTS_STORAGE_KEY, JSON.stringify(newClients));
    
    // Emitir evento para que otros componentes se actualicen inmediatamente
    window.dispatchEvent(new CustomEvent('ai-clients-config-changed', {
      detail: { config: newClients }
    }));
  };

  // Handler para cambiar el estado de un cliente
  const handleToggleClient = async (clientKey) => {
    const newClients = {
      ...clients,
      [clientKey]: !clients[clientKey]
    };
    saveClientsConfig(newClients);

    // Si se activa un servicio Docker, verificar su estado
    if (newClients[clientKey] && (clientKey === 'anythingllm' || clientKey === 'openwebui')) {
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
      const ipcKey = serviceKey === 'anythingllm' ? 'anythingllm:get-status' : 'openwebui:get-status';
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
      const ipcKey = serviceKey === 'anythingllm' ? 'anythingllm:start' : 'openwebui:start';
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
          <i className={client.icon} style={{ fontSize: '2rem', color: 'white' }} />
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
              transform: 'scale(1.2)'
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
        </div>
      </Card>
    );
  };

  return (
    <div className="ai-clients-tab">
      <div className="ai-clients-header">
        <div className="ai-clients-title">
          <i className="pi pi-comments" style={{ fontSize: '1.5rem', marginRight: '0.75rem', color: themeColors?.primary || '#00BCD4' }} />
          <div>
            <h2>Gestión de Clientes de IA</h2>
            <p className="ai-clients-subtitle">
              Activa o desactiva los clientes de IA disponibles en NodeTerm. 
              Los servicios Docker solo se iniciarán si están activados aquí.
            </p>
          </div>
        </div>
      </div>

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
              La primera vez que actives un servicio, se descargará la imagen correspondiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIClientsTab;

