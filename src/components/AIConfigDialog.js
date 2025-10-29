import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { TabView, TabPanel } from 'primereact/tabview';
import { ProgressBar } from 'primereact/progressbar';
import { aiService } from '../services/AIService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIConfigDialog = ({ visible, onHide }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteModels, setRemoteModels] = useState([]);
  const [localModels, setLocalModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(null);
  const [modelType, setModelType] = useState('remote');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  });
  const [downloading, setDownloading] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [themeVersion, setThemeVersion] = useState(0);
  const [customModelId, setCustomModelId] = useState('');
  const [detectingModels, setDetectingModels] = useState(false);
  const [remoteOllamaUrl, setRemoteOllamaUrl] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [performanceConfig, setPerformanceConfig] = useState({
    maxTokens: 6000,  // Ajustado para mejor coherencia con modelos cloud
    temperature: 0.7,
    maxHistory: 8,
    useStreaming: true,
    contextLimit: 8000
  });
  const [useManualConfig, setUseManualConfig] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    'llama3.2': true,
    'llama3.1': true,
    'llama3': true,
    'llama2': false
  });
  const [currentModelConfig, setCurrentModelConfig] = useState(null);

  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Obtener el tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = React.useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      hoverBackground: currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)',
    };
  }, [currentTheme]);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  // Efecto para actualizar configuración del modelo seleccionado
  useEffect(() => {
    if (currentModel && modelType) {
      const config = aiService.getModelPerformanceConfig(currentModel, modelType);
      setCurrentModelConfig(config);
    }
  }, [currentModel, modelType]);

  const loadConfig = async () => {
    const models = aiService.getAvailableModels();
    setRemoteModels(models.remote);
    setLocalModels(models.local);
    setCurrentModel(aiService.currentModel);
    setModelType(aiService.modelType);
    
    // Cargar API keys
    const openaiKey = aiService.getApiKey('openai');
    const anthropicKey = aiService.getApiKey('anthropic');
    const googleKey = aiService.getApiKey('google');
    setApiKeys({
      openai: openaiKey || '',
      anthropic: anthropicKey || '',
      google: googleKey || ''
    });

    // Cargar URL de Ollama remoto
    setRemoteOllamaUrl(aiService.remoteOllamaUrl || '');

    // Cargar configuración de rendimiento (usar 128K Ultra por defecto)
    let perfConfig = aiService.getPerformanceConfig();
    if (!perfConfig) {
      // Si no hay configuración guardada, usar el preset 128K Ultra como defecto
      perfConfig = {
        maxTokens: 8000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000
      };
      setUseManualConfig(true);
    } else {
      setUseManualConfig(true);
    }
    setPerformanceConfig(perfConfig);

    // Detectar modelos de Ollama automáticamente
    await handleDetectModels();
  };

  const handleDetectModels = async () => {
    setDetectingModels(true);
    try {
      await aiService.detectOllamaModels();
      const models = aiService.getAvailableModels();
      setLocalModels(models.local);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelos detectados',
          detail: 'Se detectaron los modelos instalados en Ollama',
          life: 2000
        });
      }
    } catch (error) {
      console.error('Error detectando modelos:', error);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'warn',
          summary: 'No se pudo detectar',
          detail: 'Verifica que Ollama esté ejecutándose',
          life: 3000
        });
      }
    } finally {
      setDetectingModels(false);
    }
  };

  const handleAddCustomModel = async () => {
    if (customModelId.trim()) {
      const modelName = customModelId.trim();
      aiService.addCustomModel(modelName);
      setCustomModelId('');
      
      // Detectar modelos nuevamente para refrescar
      await handleDetectModels();
      
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelo agregado',
          detail: `Modelo ${modelName} agregado. Asegúrate de que esté instalado en Ollama.`,
          life: 3000
        });
      }
    }
  };

  const handleSaveRemoteOllamaUrl = () => {
    if (remoteOllamaUrl.trim()) {
      aiService.setRemoteOllamaUrl(remoteOllamaUrl.trim());
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'URL guardada',
          detail: `Ollama remoto configurado: ${remoteOllamaUrl}`,
          life: 2000
        });
      }
    }
  };

  const handleTestConnection = async () => {
    if (!remoteOllamaUrl.trim()) {
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'warn',
          summary: 'URL requerida',
          detail: 'Ingresa una URL de Ollama remoto',
          life: 2000
        });
      }
      return;
    }

    setTestingConnection(true);
    try {
      // Configurar temporalmente la URL para probar
      const originalUrl = aiService.remoteOllamaUrl;
      aiService.setRemoteOllamaUrl(remoteOllamaUrl.trim());
      
      // Probar conexión
      await aiService.detectOllamaModels();
      
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Conexión exitosa',
          detail: `Conectado a Ollama en ${remoteOllamaUrl}`,
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error probando conexión:', error);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error de conexión',
          detail: `No se pudo conectar a ${remoteOllamaUrl}`,
          life: 4000
        });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleClearRemoteOllama = () => {
    aiService.setRemoteOllamaUrl(null);
    setRemoteOllamaUrl('');
    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'info',
        summary: 'Configuración limpiada',
        detail: 'Ahora se usará Ollama local',
        life: 2000
      });
    }
  };

  const handleSelectModel = (modelId, type) => {
    aiService.setCurrentModel(modelId, type);
    setCurrentModel(modelId);
    setModelType(type);
  };

  const handleSaveApiKey = (provider) => {
    aiService.setApiKey(provider, apiKeys[provider]);
    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'success',
        summary: 'API Key guardada',
        detail: `API Key de ${provider} guardada correctamente`,
        life: 2000
      });
    }
  };

  const handleClearApiKey = (provider) => {
    setApiKeys(prev => ({ ...prev, [provider]: '' }));
    aiService.setApiKey(provider, '');
    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'info',
        summary: 'API Key borrada',
        detail: `API Key de ${provider} ha sido borrada`,
        life: 3000
      });
    }
  };

  const handleDownloadModel = async (modelId) => {
    setDownloading(prev => ({ ...prev, [modelId]: true }));
    setDownloadProgress(prev => ({ ...prev, [modelId]: { status: 'Iniciando...', percent: 0 } }));
    
    try {
      await aiService.downloadLocalModel(modelId, (progress) => {
        // Actualizar progreso en tiempo real
        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: {
            status: progress.status || 'Descargando...',
            percent: Math.round(progress.percent || 0),
            completed: progress.completed,
            total: progress.total
          }
        }));
      });
      
      // Limpiar progreso
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });
      
      loadConfig(); // Recargar configuración
      
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelo descargado',
          detail: `${modelId} se descargó correctamente`,
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error descargando modelo:', error);
      
      // Limpiar progreso en caso de error
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });
      
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error descargando',
          detail: error.message || 'No se pudo descargar el modelo',
          life: 4000
        });
      }
    } finally {
      setDownloading(prev => ({ ...prev, [modelId]: false }));
    }
  };

  const handleDeleteModel = async (modelId) => {
    try {
      await aiService.deleteLocalModel(modelId);
      loadConfig(); // Recargar configuración
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelo eliminado',
          detail: 'El modelo se eliminó correctamente',
          life: 2000
        });
      }
    } catch (error) {
      console.error('Error eliminando modelo:', error);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el modelo',
          life: 3000
        });
      }
    }
  };

  const handleSavePerformanceConfig = () => {
    if (useManualConfig) {
      aiService.setPerformanceConfig(performanceConfig);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Configuración guardada',
          detail: 'Configuración de rendimiento guardada correctamente',
          life: 2000
        });
      }
    } else {
      aiService.clearPerformanceConfig();
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'info',
          summary: 'Configuración automática',
          detail: 'Se usará la configuración automática por modelo',
          life: 2000
        });
      }
    }
  };

  const handleResetPerformanceConfig = () => {
    const defaultConfig = aiService.getDefaultPerformanceConfig();
    setPerformanceConfig(defaultConfig);
    setUseManualConfig(false);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderCollapsibleSection = (sectionKey, title, icon, models) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div key={sectionKey} style={{ marginBottom: '1rem' }}>
        <div
          onClick={() => toggleSection(sectionKey)}
          style={{
            background: themeColors.cardBackground,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            marginBottom: isExpanded ? '0.5rem' : '0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className={icon} style={{ fontSize: '1.2rem', color: themeColors.primaryColor }} />
            <h4 style={{ margin: 0, color: themeColors.textPrimary }}>
              {title}
            </h4>
            <span style={{
              background: 'rgba(33, 150, 243, 0.1)',
              color: themeColors.primaryColor,
              padding: '0.1rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.7rem',
              border: `1px solid ${themeColors.primaryColor}30`
            }}>
              {models.length} modelo{models.length !== 1 ? 's' : ''}
            </span>
          </div>
          <i 
            className={isExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'} 
            style={{ 
              fontSize: '1rem', 
              color: themeColors.textSecondary,
              transition: 'transform 0.2s ease'
            }} 
          />
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {models.map(model => (
              <div
                key={model.id}
                style={{
                  background: currentModel === model.id && modelType === 'local'
                    ? `linear-gradient(135deg, ${themeColors.primaryColor}30 0%, ${themeColors.primaryColor}20 100%)`
                    : themeColors.cardBackground,
                  border: `1px solid ${currentModel === model.id && modelType === 'local' ? themeColors.primaryColor : themeColors.borderColor}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  transition: 'all 0.2s ease',
                  opacity: model.downloaded ? 1 : 0.6,
                  marginLeft: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h5 style={{ margin: 0, color: themeColors.textPrimary }}>
                        {model.name}
                      </h5>
                      <span style={{
                        background: model.performance === 'high' ? 'rgba(76, 175, 80, 0.2)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                        color: model.performance === 'high' ? '#4CAF50' : model.performance === 'medium' ? '#FFC107' : '#F44336',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                        border: `1px solid ${model.performance === 'high' ? 'rgba(76, 175, 80, 0.4)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`
                      }}>
                        {model.performance === 'high' ? '⚡ Alto' : model.performance === 'medium' ? '⚖️ Medio' : '🐌 Bajo'}
                      </span>
                      {model.downloaded && (
                        <span style={{
                          background: 'rgba(76, 175, 80, 0.2)',
                          color: '#4CAF50',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          border: '1px solid rgba(76, 175, 80, 0.4)'
                        }}>
                          ✓ Instalado
                        </span>
                      )}
                    </div>
                    
                    <p style={{ margin: '0.25rem 0 0.5rem 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                      💾 Tamaño: {model.size}
                    </p>
                    
                    {model.description && (
                      <p style={{ margin: '0.5rem 0', color: themeColors.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {model.description}
                      </p>
                    )}
                    
                    {model.useCases && model.useCases.length > 0 && (
                      <div style={{ margin: '0.5rem 0' }}>
                        <p style={{ margin: '0 0 0.25rem 0', color: themeColors.textSecondary, fontSize: '0.8rem', fontWeight: '600' }}>
                          💼 Casos de uso:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {model.useCases.slice(0, 3).map((useCase, index) => (
                            <span key={index} style={{
                              background: themeColors.primaryColor + '20',
                              color: themeColors.primaryColor,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              border: `1px solid ${themeColors.primaryColor}40`
                            }}>
                              {useCase}
                            </span>
                          ))}
                          {model.useCases.length > 3 && (
                            <span style={{
                              color: themeColors.textSecondary,
                              fontSize: '0.7rem'
                            }}>
                              +{model.useCases.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {model.bestFor && (
                      <p style={{ margin: '0.5rem 0 0 0', color: themeColors.textSecondary, fontSize: '0.8rem', fontStyle: 'italic' }}>
                        👤 {model.bestFor}
                      </p>
                    )}
                    
                    {/* Especificaciones técnicas */}
                    {(model.context || model.parameters || model.ramRequired || model.quantization) && (
                      <div style={{ 
                        margin: '0.75rem 0 0 0', 
                        padding: '0.75rem', 
                        background: 'rgba(76, 175, 80, 0.08)', 
                        borderRadius: '8px',
                        border: `1px solid rgba(76, 175, 80, 0.3)`,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                          <strong style={{ color: themeColors.textPrimary }}>📊 Contexto:</strong><br />
                          {model.context || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                          <strong style={{ color: themeColors.textPrimary }}>⚙️ Parámetros:</strong><br />
                          {model.parameters || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                          <strong style={{ color: themeColors.textPrimary }}>💾 RAM:</strong><br />
                          {model.ramRequired || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                          <strong style={{ color: themeColors.textPrimary }}>🎯 Cuantización:</strong><br />
                          {model.quantization || 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {model.downloaded ? (
                      <>
                        {currentModel === model.id && modelType === 'local' && (
                          <i className="pi pi-check-circle" style={{ color: themeColors.primaryColor, fontSize: '1.5rem' }} />
                        )}
                        <Button
                          label="Usar"
                          icon="pi pi-play"
                          size="small"
                          onClick={() => handleSelectModel(model.id, 'local')}
                          style={{ minWidth: '80px' }}
                        />
                        <Button
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          onClick={() => handleDeleteModel(model.id)}
                          style={{ minWidth: '40px' }}
                        />
                      </>
                    ) : (
                      <Button
                        label="Descargar"
                        icon="pi pi-download"
                        size="small"
                        onClick={() => handleDownloadModel(model.id)}
                        loading={downloading[model.id]}
                        style={{ minWidth: '120px' }}
                      />
                    )}
                  </div>
                </div>
                
                {downloading[model.id] && downloadProgress[model.id] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '0.25rem',
                      fontSize: '0.75rem',
                      color: themeColors.textSecondary
                    }}>
                      <span>{downloadProgress[model.id].status}</span>
                      <span>{downloadProgress[model.id].percent}%</span>
                    </div>
                    <ProgressBar 
                      value={downloadProgress[model.id].percent} 
                      style={{ height: '6px' }}
                      showValue={false}
                    />
                    {downloadProgress[model.id].total && (
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: themeColors.textSecondary,
                        marginTop: '0.25rem',
                        textAlign: 'right'
                      }}>
                        {formatBytes(downloadProgress[model.id].completed)} / {formatBytes(downloadProgress[model.id].total)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRemoteModels = () => {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px',
            height: '80px'
          }}>
            <i className="pi pi-cloud" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
          </div>
          <div>
            <h2 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              Modelos Remotos
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '1rem' }}>
              Conecta con servicios de IA en la nube para acceso a modelos avanzados
            </p>
          </div>
        </div>

        {/* API Keys */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: themeColors.textPrimary, marginBottom: '0.5rem' }}>
            API Keys
          </h4>
          
          {/* OpenAI */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              OpenAI API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                placeholder="sk-..."
                type="password"
                style={{ flex: 1 }}
              />
              <Button
                label="Guardar"
                icon="pi pi-check"
                onClick={() => handleSaveApiKey('openai')}
                style={{ minWidth: '80px' }}
              />
              {apiKeys.openai && (
                <Button
                  label="Borrar"
                  icon="pi pi-trash"
                  onClick={() => handleClearApiKey('openai')}
                  severity="danger"
                  style={{ minWidth: '80px' }}
                />
              )}
            </div>
          </div>

          {/* Anthropic */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              Anthropic API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={apiKeys.anthropic}
                onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                placeholder="sk-ant-..."
                type="password"
                style={{ flex: 1 }}
              />
              <Button
                label="Guardar"
                icon="pi pi-check"
                onClick={() => handleSaveApiKey('anthropic')}
                style={{ minWidth: '80px' }}
              />
              {apiKeys.anthropic && (
                <Button
                  label="Borrar"
                  icon="pi pi-trash"
                  onClick={() => handleClearApiKey('anthropic')}
                  severity="danger"
                  style={{ minWidth: '80px' }}
                />
              )}
            </div>
          </div>

          {/* Google */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              Google API Key (Gemini 2.5)
            </label>
            <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
              Incluye: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash
            </small>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={apiKeys.google}
                onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                placeholder="AIza..."
                type="password"
                style={{ flex: 1 }}
              />
              <Button
                label="Guardar"
                icon="pi pi-check"
                onClick={() => handleSaveApiKey('google')}
                style={{ minWidth: '80px' }}
              />
              {apiKeys.google && (
                <Button
                  label="Borrar"
                  icon="pi pi-trash"
                  onClick={() => handleClearApiKey('google')}
                  severity="danger"
                  style={{ minWidth: '80px' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Lista de modelos remotos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {remoteModels.map(model => (
            <div
              key={model.id}
              style={{
                background: currentModel === model.id && modelType === 'remote'
                  ? `linear-gradient(135deg, ${themeColors.primaryColor}30 0%, ${themeColors.primaryColor}20 100%)`
                  : themeColors.cardBackground,
                border: `1px solid ${currentModel === model.id && modelType === 'remote' ? themeColors.primaryColor : themeColors.borderColor}`,
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleSelectModel(model.id, 'remote')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: themeColors.textPrimary }}>
                      {model.name}
                    </h4>
                    <span style={{
                      background: model.performance === 'high' ? 'rgba(76, 175, 80, 0.2)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                      color: model.performance === 'high' ? '#4CAF50' : model.performance === 'medium' ? '#FFC107' : '#F44336',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      border: `1px solid ${model.performance === 'high' ? 'rgba(76, 175, 80, 0.4)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`
                    }}>
                      {model.performance === 'high' ? '⚡ Alto' : model.performance === 'medium' ? '⚖️ Medio' : '🐌 Bajo'}
                    </span>
                  </div>
                  
                  <p style={{ margin: '0.25rem 0 0.5rem 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    Provider: {model.provider}
                  </p>
                  
                  {model.description && (
                    <p style={{ margin: '0.5rem 0', color: themeColors.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {model.description}
                    </p>
                  )}
                  
                  {model.useCases && model.useCases.length > 0 && (
                    <div style={{ margin: '0.5rem 0' }}>
                      <p style={{ margin: '0 0 0.25rem 0', color: themeColors.textSecondary, fontSize: '0.8rem', fontWeight: '600' }}>
                        💼 Casos de uso:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {model.useCases.slice(0, 3).map((useCase, index) => (
                          <span key={index} style={{
                            background: themeColors.primaryColor + '20',
                            color: themeColors.primaryColor,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            border: `1px solid ${themeColors.primaryColor}40`
                          }}>
                            {useCase}
                          </span>
                        ))}
                        {model.useCases.length > 3 && (
                          <span style={{
                            color: themeColors.textSecondary,
                            fontSize: '0.7rem'
                          }}>
                            +{model.useCases.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {model.bestFor && (
                    <p style={{ margin: '0.5rem 0 0 0', color: themeColors.textSecondary, fontSize: '0.8rem', fontStyle: 'italic' }}>
                      👤 {model.bestFor}
                    </p>
                  )}
                  
                  {/* Especificaciones técnicas */}
                  {(model.context || model.parameters || model.ramRequired || model.quantization) && (
                    <div style={{ 
                      margin: '0.75rem 0 0 0', 
                      padding: '0.75rem', 
                      background: 'rgba(33, 150, 243, 0.08)', 
                      borderRadius: '8px',
                      border: `1px solid ${themeColors.primaryColor}30`,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                        <strong style={{ color: themeColors.textPrimary }}>📊 Contexto:</strong><br />
                        {model.context || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                        <strong style={{ color: themeColors.textPrimary }}>⚙️ Parámetros:</strong><br />
                        {model.parameters || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                        <strong style={{ color: themeColors.textPrimary }}>💾 RAM:</strong><br />
                        {model.ramRequired || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>
                        <strong style={{ color: themeColors.textPrimary }}>🎯 Cuantización:</strong><br />
                        {model.quantization || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
                
                {currentModel === model.id && modelType === 'remote' && (
                  <i className="pi pi-check-circle" style={{ color: themeColors.primaryColor, fontSize: '1.5rem', marginLeft: '1rem' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLocalModels = () => {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px',
            height: '80px'
          }}>
            <i className="pi pi-desktop" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              Modelos Locales
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '1rem' }}>
              Modelos de IA ejecutados localmente en tu dispositivo para máxima privacidad
            </p>
          </div>
          <Button
            label="Detectar Modelos"
            icon={detectingModels ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
            size="small"
            onClick={handleDetectModels}
            disabled={detectingModels}
          />
        </div>


        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-lightbulb" style={{ color: '#FFC107', marginTop: '0.2rem', fontSize: '1.1rem' }} />
          <div style={{ fontSize: '0.9rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
            <strong>💡 Información importante:</strong><br />
            • <strong>Modelos Ollama:</strong> Requieren Ollama instalado y ejecutándose localmente<br />
            • <strong>Modelos Independientes:</strong> No requieren Ollama, funcionan directamente<br />
            • Puedes usar Ollama local o remoto para los modelos Ollama<br />
            • Descarga Ollama desde: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: themeColors.primaryColor }}>https://ollama.ai</a>
          </div>
        </div>

        {/* Agregar modelo personalizado */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
            Agregar modelo personalizado
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <InputText
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              placeholder="Ej: llama3.2, mistral, qwen2.5"
              style={{ flex: 1 }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomModel();
                }
              }}
            />
            <Button
              label="Agregar"
              icon="pi pi-plus"
              onClick={handleAddCustomModel}
              disabled={!customModelId.trim()}
            />
          </div>
          <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
            Escribe el nombre exacto del modelo instalado en Ollama
          </small>
        </div>

        {/* Modelos Ollama */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: themeColors.textPrimary, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="pi pi-server" style={{ color: themeColors.primaryColor }} />
            Modelos Ollama
            <span style={{ 
              background: 'rgba(33, 150, 243, 0.1)', 
              color: themeColors.primaryColor, 
              padding: '0.1rem 0.5rem', 
              borderRadius: '12px', 
              fontSize: '0.7rem',
              border: `1px solid ${themeColors.primaryColor}30`
            }}>
              Requiere Ollama
            </span>
          </h4>
          
          {renderCollapsibleSection(
            'llama3.2',
            'Llama 3.2 (Multimodal - Más Reciente)',
            'pi pi-star',
            localModels.filter(model => model.platform === 'ollama' && model.id.includes('llama3.2'))
          )}
          
          {renderCollapsibleSection(
            'llama3.1',
            'Llama 3.1 (Avanzado)',
            'pi pi-bolt',
            localModels.filter(model => model.platform === 'ollama' && model.id.includes('llama3.1'))
          )}
          
          {renderCollapsibleSection(
            'llama3',
            'Llama 3 (Estable)',
            'pi pi-shield',
            localModels.filter(model => model.platform === 'ollama' && model.id.includes('llama3') && !model.id.includes('llama3.1') && !model.id.includes('llama3.2'))
          )}
          
          {renderCollapsibleSection(
            'llama2',
            'Llama 2 (Clásico)',
            'pi pi-book',
            localModels.filter(model => model.platform === 'ollama' && model.id.includes('llama2'))
          )}
          
          {renderCollapsibleSection(
            'otros-ollama',
            'Otros Modelos Ollama',
            'pi pi-cog',
            localModels.filter(model => model.platform === 'ollama' && !model.id.includes('llama'))
                    )}
                  </div>
                  
        {renderCollapsibleSection(
          'independent',
          'Modelos Independientes',
          'pi pi-desktop',
          localModels.filter(model => model.platform === 'independent')
        )}
      </div>
    );
  };

  // Función auxiliar para formatear bytes
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const renderPerformanceConfig = () => {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px',
            height: '80px'
          }}>
            <i className="pi pi-cog" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
          </div>
          <div>
            <h2 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              Configuración de Rendimiento
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '1rem' }}>
              Ajusta parámetros de rendimiento para optimizar la experiencia de uso
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-info-circle" style={{ color: '#2196F3', marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.85rem', color: themeColors.textSecondary }}>
            <strong>Configuración automática:</strong> Se ajusta automáticamente según el modelo seleccionado.
            <br />
            <strong>Configuración manual:</strong> Ajusta manualmente los parámetros de rendimiento.
          </div>
        </div>

        {/* Toggle para configuración manual */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              id="useManualConfig"
              checked={useManualConfig}
              onChange={(e) => setUseManualConfig(e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <label htmlFor="useManualConfig" style={{ color: themeColors.textPrimary, cursor: 'pointer' }}>
              Usar configuración manual de rendimiento
            </label>
          </div>
        </div>

        {/* Presets rápidos por modelo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            color: themeColors.textPrimary, 
            marginBottom: '1rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="pi pi-lightning-bolt" style={{ color: themeColors.primaryColor }} />
            Presets de Configuración Rápida
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <Button
              label="⚡ Estándar (8K)"
              icon="pi pi-lightning"
              onClick={() => setPerformanceConfig({
                maxTokens: 6000,
                temperature: 0.7,
                maxHistory: 8,
                useStreaming: true,
                contextLimit: 8000
              })}
              severity="info"
              outlined
              size="small"
              style={{ 
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            />
            <Button
              label="📚 Análisis Avanzado (32K)"
              icon="pi pi-book"
              onClick={() => setPerformanceConfig({
                maxTokens: 8000,
                temperature: 0.7,
                maxHistory: 10,
                useStreaming: true,
                contextLimit: 32000
              })}
              severity="success"
              outlined
              size="small"
              style={{ 
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            />
            <Button
              label="🚀 128K Ultra (Defecto)"
              icon="pi pi-fire"
              onClick={() => setPerformanceConfig({
                maxTokens: 8000,
                temperature: 0.7,
                maxHistory: 16,
                useStreaming: true,
                contextLimit: 128000
              })}
              severity="danger"
              size="small"
              style={{ 
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                borderRadius: '8px',
                background: '#E53935',
                border: 'none',
                color: 'white'
              }}
            />
            <Button
              label="💨 Rápido (4K)"
              icon="pi pi-bolt"
              onClick={() => setPerformanceConfig({
                maxTokens: 4000,
                temperature: 0.7,
                maxHistory: 5,
                useStreaming: true,
                contextLimit: 4000
              })}
              severity="warning"
              outlined
              size="small"
              style={{ 
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            />
          </div>

          <div style={{
            background: 'rgba(229, 57, 53, 0.1)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start'
          }}>
            <i className="pi pi-info-circle" style={{ color: '#E53935', marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.85rem', color: themeColors.textSecondary }}>
              <strong>128K Ultra es el preset recomendado</strong> para Llama 3.1 con máxima profundidad de análisis y contexto. Ideal para documentos largos y análisis complejos.
            </div>
          </div>
        </div>

        {useManualConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Max Tokens */}
            <div>
              <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Máximo de tokens (500-12000) para respuestas más profundas
              </label>
              <InputText
                type="number"
                value={performanceConfig.maxTokens}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 7000 }))}
                min="500"
                max="12000"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Recomendado: 4000 para cloud/8B, 6000-8000 para análisis profundo, 8000+ para 70B
              </small>
            </div>

            {/* Temperature */}
            <div>
              <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Temperatura (0.1-2.0)
              </label>
              <InputText
                type="number"
                step="0.1"
                value={performanceConfig.temperature}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                min="0.1"
                max="2.0"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Creatividad de las respuestas (0.1 = conservador, 2.0 = muy creativo)
              </small>
            </div>

            {/* Max History */}
            <div>
              <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Máximo de mensajes en historial (3-20)
              </label>
              <InputText
                type="number"
                value={performanceConfig.maxHistory}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, maxHistory: parseInt(e.target.value) || 8 }))}
                min="3"
                max="20"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Número de mensajes anteriores a recordar (menos = menos memoria)
              </small>
            </div>

            {/* Context Limit */}
            <div>
              <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Límite de contexto (2000-128000) - window de memoria del modelo
              </label>
              <InputText
                type="number"
                value={performanceConfig.contextLimit}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, contextLimit: parseInt(e.target.value) || 8000 }))}
                min="2000"
                max="128000"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Recomendado: 8000 para 8B, 16000-32000 para 70B. Más contexto = mejor comprensión de documentos largos
              </small>
              
              {/* Requisitos de RAM+GPU dinámicos */}
              {(() => {
                const context = performanceConfig.contextLimit || 8000;
                const is70B = currentModel?.includes('70b') || currentModel?.includes('70B');
                const is8B = currentModel?.includes('8b') || currentModel?.includes('8B') || currentModel?.includes('3b') || currentModel?.includes('3B');
                
                // Estimaciones de memoria REALES según modelos:
                // Llama 3.1 8B con 128K: 8GB RAM (incluye contexto)
                // Llama 3.1 70B con 128K: ~40GB RAM (incluye contexto)
                // La mayoría del espacio es el peso del modelo, no el contexto adicional
                
                let baseRAM, baseGPU;
                
                if (is70B) {
                  // Para 70B, necesita más espacio
                  baseRAM = 40;  // Incluye contexto hasta 128K
                  baseGPU = 24;  // GPU VRAM needed
                } else if (is8B) {
                  // Para 8B (3B, 7B, 8B), incluye 128K de contexto
                  baseRAM = 8;   // Realista para Llama 3.1 8B con 128K
                  baseGPU = 4;   // GPU VRAM needed
                } else {
                  // Para otros modelos, usar aproximación general
                  baseRAM = 6;
                  baseGPU = 3;
                }
                
                // El contexto MÁS ALLÁ de 128K agregaría algo mínimo
                // pero en la práctica Llama 3.1 maneja bien hasta 128K en 8GB
                let additionalRAM = 0;
                let additionalGPU = 0;
                
                // Si el contexto está por debajo de 8K, podemos reducir RAM (4-6GB)
                if (context <= 8000 && is8B) {
                  baseRAM = Math.max(4, baseRAM - 2);
                  baseGPU = Math.max(2, baseGPU - 1);
                }
                
                const totalRAM = baseRAM + additionalRAM;
                const totalGPU = baseGPU + additionalGPU;
                
                const ramColor = totalRAM > 48 ? '#F44336' : totalRAM > 24 ? '#FF9800' : '#4CAF50';
                const gpuColor = totalGPU > 16 ? '#F44336' : totalGPU > 8 ? '#FF9800' : '#4CAF50';
                
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.25rem' }}>
                      <strong>Requisitos estimados para {context.toLocaleString()} tokens:</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                      <span style={{ color: ramColor }}>
                        💾 RAM: ~{totalRAM}GB {totalRAM > 48 ? '(⚠️ Muy alto)' : totalRAM > 24 ? '(⚠️ Alto)' : '(✅ OK)'}
                      </span>
                      <span style={{ color: gpuColor }}>
                        🎮 GPU: ~{totalGPU}GB {totalGPU > 16 ? '(⚠️ Muy alto)' : totalGPU > 8 ? '(⚠️ Alto)' : '(✅ OK)'}
                      </span>
                    </div>
                    {totalRAM > 48 && (
                      <div style={{ fontSize: '0.65rem', color: '#F44336', marginTop: '0.25rem' }}>
                        ⚠️ Requisitos por encima de lo recomendado para hardware estándar
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Use Streaming */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="useStreaming"
                  checked={performanceConfig.useStreaming}
                  onChange={(e) => setPerformanceConfig(prev => ({ ...prev, useStreaming: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <label htmlFor="useStreaming" style={{ color: themeColors.textPrimary, cursor: 'pointer' }}>
                  Usar streaming (recomendado para modelos locales)
                </label>
              </div>
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                El streaming reduce el uso de memoria y mejora la respuesta
              </small>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <Button
            label="Guardar"
            icon="pi pi-check"
            onClick={handleSavePerformanceConfig}
            style={{ flex: 1 }}
          />
          <Button
            label="Restablecer"
            icon="pi pi-refresh"
            onClick={handleResetPerformanceConfig}
            severity="secondary"
            outlined
          />
        </div>

        {/* Información adicional */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginTop: '1rem'
        }}>
          <h4 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
            💡 Configuración Recomendada por Modelo
          </h4>
          <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary }}>
            
            {/* Modelos Locales */}
            <div style={{ margin: '0 0 1rem 0', padding: '0.75rem', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
              <h4 style={{ color: '#FFC107', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>🏠 Modelos Locales (Ollama)</h4>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Llama 3.2 (1B/3B):</strong> maxTokens: 3000-4000 | contextLimit: 2000-4000 | maxHistory: 5
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Llama 3.1 (8B):</strong> maxTokens: 6000 | contextLimit: 128000 | maxHistory: 8 ⭐ ACTUAL
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Llama 3.1 (70B):</strong> maxTokens: 8000 | contextLimit: 128000 | maxHistory: 10
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>🔥 Máximo (70B):</strong> maxTokens: 8000 | contextLimit: 32000-64000 | maxHistory: 12 (Requiere 64GB+ RAM)
              </p>
              <p style={{ margin: '0', fontSize: '0.75rem', color: themeColors.textSecondary }}>
                <strong>Streaming:</strong> Siempre activado para mejor UX en modelos locales
              </p>
            </div>

            {/* Modelos Remotos */}
            <div style={{ margin: '0', padding: '0.75rem', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '8px', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
              <h4 style={{ color: '#2196F3', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>🌐 Modelos Cloud - Límites Automáticos</h4>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>GPT-4:</strong> 4K tokens | 128K contexto
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Claude 3:</strong> 4K tokens | 200K contexto
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Gemini 2.5 Flash:</strong> 4K tokens | 1M contexto
              </p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                <strong>Gemini 2.5 Pro:</strong> 4K tokens | 2M contexto
              </p>
              <p style={{ margin: '0', fontSize: '0.75rem', color: themeColors.textSecondary }}>
                Los límites se ajustan automáticamente según el modelo seleccionado
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRemoteOllamaConfig = () => {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px',
            height: '80px'
          }}>
            <i className="pi pi-server" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
          </div>
          <div>
            <h2 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              Ollama Remoto
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '1rem' }}>
              Conecta con servidores Ollama remotos para usar modelos más potentes o compartir recursos
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(33, 150, 243, 0.08)',
          border: '1px solid rgba(33, 150, 243, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-lightbulb" style={{ color: '#2196F3', marginTop: '0.2rem', fontSize: '1.1rem' }} />
          <div style={{ fontSize: '0.9rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
            <strong>¿Cuándo usar Ollama Remoto?</strong><br />
            • Usar modelos más potentes sin instalar localmente<br />
            • Compartir recursos entre equipos<br />
            • Aprovechar servidores dedicados con más RAM/GPU<br />
            • Acceso a modelos desde múltiples dispositivos
          </div>
        </div>

        {/* Configuración de URL */}
        <div style={{
          background: themeColors.cardBackground,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: themeColors.textPrimary, margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
            🔗 Configuración del Servidor
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '500' }}>
              URL del servidor Ollama
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <InputText
                value={remoteOllamaUrl}
                onChange={(e) => setRemoteOllamaUrl(e.target.value)}
                placeholder="http://192.168.1.100:11434"
                style={{ flex: 1, padding: '0.75rem' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveRemoteOllamaUrl();
                  }
                }}
              />
              <Button
                label="Guardar"
                icon="pi pi-check"
                onClick={handleSaveRemoteOllamaUrl}
                disabled={!remoteOllamaUrl.trim()}
                style={{ minWidth: '100px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Button
                label="Probar Conexión"
                icon={testingConnection ? 'pi pi-spin pi-spinner' : 'pi pi-wifi'}
                onClick={handleTestConnection}
                disabled={!remoteOllamaUrl.trim() || testingConnection}
                severity="secondary"
                style={{ flex: 1 }}
              />
              {remoteOllamaUrl && (
                <Button
                  label="Limpiar"
                  icon="pi pi-times"
                  onClick={handleClearRemoteOllama}
                  severity="danger"
                  outlined
                  style={{ minWidth: '100px' }}
                />
              )}
            </div>
            
            <div style={{
              background: 'rgba(33, 150, 243, 0.05)',
              border: '1px solid rgba(33, 150, 243, 0.15)',
              borderRadius: '8px',
              padding: '0.75rem'
            }}>
              <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                💡 Ejemplos de URLs válidas:
              </small>
              <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, fontFamily: 'monospace' }}>
                • http://192.168.1.100:11434<br />
                • http://servidor.local:11434<br />
                • https://ollama.miempresa.com<br />
                • http://10.0.0.50:11434
              </div>
            </div>
          </div>
        </div>

        {/* Estado actual */}
        <div style={{
          background: themeColors.cardBackground,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: themeColors.textPrimary, margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
            📊 Estado Actual
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              background: aiService.remoteOllamaUrl ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)',
              border: `1px solid ${aiService.remoteOllamaUrl ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
              borderRadius: '8px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: 1
            }}>
              <i 
                className={aiService.remoteOllamaUrl ? 'pi pi-cloud' : 'pi pi-desktop'} 
                style={{ 
                  color: aiService.remoteOllamaUrl ? '#4CAF50' : '#FFC107',
                  fontSize: '1.2rem'
                }} 
              />
              <div>
                <div style={{ 
                  color: themeColors.textPrimary, 
                  fontWeight: '600', 
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem'
                }}>
                  {aiService.remoteOllamaUrl ? '🌐 Servidor Remoto' : '💻 Servidor Local'}
                </div>
                <div style={{ 
                  color: themeColors.textSecondary, 
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}>
                  {aiService.remoteOllamaUrl || 'http://localhost:11434'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{
            background: aiService.remoteOllamaUrl ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 193, 7, 0.05)',
            border: `1px solid ${aiService.remoteOllamaUrl ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.15)'}`,
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ fontSize: '0.85rem', color: themeColors.textSecondary, lineHeight: '1.4' }}>
              {aiService.remoteOllamaUrl ? (
                <>
                  ✅ <strong>Conectado a servidor remoto</strong><br />
                  • Acceso a modelos instalados en el servidor remoto<br />
                  • Mejor rendimiento si el servidor tiene más recursos<br />
                  • Requiere conexión de red estable
                </>
              ) : (
                <>
                  🏠 <strong>Usando Ollama local</strong><br />
                  • Modelos instalados en tu dispositivo<br />
                  • No requiere conexión de red<br />
                  • Rendimiento limitado por recursos locales
                </>
              )}
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem'
        }}>
          <h4 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
            Configuración del servidor remoto
          </h4>
          <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>1. Instalar Ollama en el servidor:</strong>
            </p>
            <code style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '0.2rem 0.4rem', 
              borderRadius: '4px',
              display: 'block',
              margin: '0.25rem 0'
            }}>
              curl -fsSL https://ollama.ai/install.sh | sh
            </code>
            
            <p style={{ margin: '0.5rem 0 0.25rem 0' }}>
              <strong>2. Configurar acceso remoto:</strong>
            </p>
            <code style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '0.2rem 0.4rem', 
              borderRadius: '4px',
              display: 'block',
              margin: '0.25rem 0'
            }}>
              OLLAMA_HOST=0.0.0.0:11434 ollama serve
            </code>
            
            <p style={{ margin: '0.5rem 0 0.25rem 0' }}>
              <strong>3. Descargar modelos en el servidor:</strong>
            </p>
            <code style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '0.2rem 0.4rem', 
              borderRadius: '4px',
              display: 'block',
              margin: '0.25rem 0'
            }}>
              ollama pull llama3.2
            </code>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      header="Configuración de IA"
      visible={visible}
      onHide={onHide}
      style={{ width: '85vw', minWidth: '900px', maxWidth: '1200px' }}
      modal
    >
      {/* Tarjeta de Modelo Actual Seleccionado */}
      {currentModel && currentModelConfig && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(76, 175, 80, 0.1) 100%)',
          border: `2px solid ${themeColors.primaryColor}`,
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '12px',
            background: themeColors.primaryColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="pi pi-check-circle" style={{ fontSize: '2.5rem', color: themeColors.primaryColor }} />
          </div>
          <div>
            <h3 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0' }}>
              ✓ Modelo Seleccionado Actualmente
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary, marginBottom: '0.25rem' }}>
                  <strong>📊 Contexto Disponible:</strong>
                </div>
                <div style={{ fontSize: '1rem', color: themeColors.primaryColor, fontWeight: 'bold' }}>
                  {currentModelConfig.contextLimit?.toLocaleString ? currentModelConfig.contextLimit.toLocaleString() : currentModelConfig.contextLimit} tokens
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary, marginBottom: '0.25rem' }}>
                  <strong>📤 Máx. Output:</strong>
                </div>
                <div style={{ fontSize: '1rem', color: themeColors.primaryColor, fontWeight: 'bold' }}>
                  {currentModelConfig.maxTokens?.toLocaleString ? currentModelConfig.maxTokens.toLocaleString() : currentModelConfig.maxTokens} tokens
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary, marginBottom: '0.25rem' }}>
                  <strong>🔄 Historial:</strong>
                </div>
                <div style={{ fontSize: '1rem', color: themeColors.primaryColor, fontWeight: 'bold' }}>
                  {currentModelConfig.maxHistory} mensajes
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary, marginBottom: '0.25rem' }}>
                  <strong>🌊 Streaming:</strong>
                </div>
                <div style={{ fontSize: '1rem', color: themeColors.primaryColor, fontWeight: 'bold' }}>
                  {currentModelConfig.useStreaming ? '✓ Activo' : '✗ Inactivo'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
        <TabPanel header="☁️ Modelos Remotos">
          {renderRemoteModels()}
        </TabPanel>
        <TabPanel header="💻 Modelos Locales">
          {renderLocalModels()}
        </TabPanel>
        <TabPanel header="🌐 Ollama Remoto">
          {renderRemoteOllamaConfig()}
        </TabPanel>
        <TabPanel header="⚙️ Rendimiento">
          {renderPerformanceConfig()}
        </TabPanel>
      </TabView>
    </Dialog>
  );
};

export default AIConfigDialog;





