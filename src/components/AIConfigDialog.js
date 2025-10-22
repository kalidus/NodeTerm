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
    maxTokens: 1500,
    temperature: 0.7,
    maxHistory: 8,
    useStreaming: true,
    contextLimit: 4000
  });
  const [useManualConfig, setUseManualConfig] = useState(false);

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

    // Cargar configuración de rendimiento
    const perfConfig = aiService.getPerformanceConfig();
    if (perfConfig) {
      setPerformanceConfig(perfConfig);
      setUseManualConfig(true);
    }

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

  const renderRemoteModels = () => {
    return (
      <div style={{ padding: '1rem' }}>
        <h3 style={{ color: themeColors.textPrimary, marginBottom: '1rem' }}>
          Modelos Remotos
        </h3>

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
                disabled={!apiKeys.openai}
              />
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
                disabled={!apiKeys.anthropic}
              />
            </div>
          </div>

          {/* Google */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              Google API Key (Gemini 2.5)
            </label>
            <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
              Incluye: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash, Gemini 1.0 Pro
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
                disabled={!apiKeys.google}
              />
            </div>
          </div>
        </div>

        {/* Lista de modelos remotos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {remoteModels.map(model => (
            <div
              key={model.id}
              style={{
                background: currentModel === model.id && modelType === 'remote'
                  ? `linear-gradient(135deg, ${themeColors.primaryColor}30 0%, ${themeColors.primaryColor}20 100%)`
                  : themeColors.cardBackground,
                border: `1px solid ${currentModel === model.id && modelType === 'remote' ? themeColors.primaryColor : themeColors.borderColor}`,
                borderRadius: '8px',
                padding: '1rem',
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
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: themeColors.textPrimary, margin: 0 }}>
            Modelos Locales
          </h3>
          <Button
            label="Detectar Modelos"
            icon={detectingModels ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
            size="small"
            onClick={handleDetectModels}
            disabled={detectingModels}
          />
        </div>

        {/* Configuración de Ollama Remoto */}
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: themeColors.textPrimary, marginBottom: '0.5rem' }}>
            Ollama Remoto
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <InputText
              value={remoteOllamaUrl}
              onChange={(e) => setRemoteOllamaUrl(e.target.value)}
              placeholder="http://192.168.1.100:11434"
              style={{ flex: 1 }}
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
            />
            <Button
              label="Probar"
              icon={testingConnection ? 'pi pi-spin pi-spinner' : 'pi pi-wifi'}
              onClick={handleTestConnection}
              disabled={!remoteOllamaUrl.trim() || testingConnection}
              severity="secondary"
            />
            {remoteOllamaUrl && (
              <Button
                label="Limpiar"
                icon="pi pi-times"
                onClick={handleClearRemoteOllama}
                severity="danger"
                outlined
              />
            )}
          </div>
          <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
            Configura la URL de un servidor Ollama remoto (ej: http://192.168.1.100:11434)
          </small>
        </div>

        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-info-circle" style={{ color: '#FFC107', marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.85rem', color: themeColors.textSecondary }}>
            Los modelos locales requieren <strong>Ollama</strong> ejecutándose.
            <br />
            Puedes usar Ollama local o remoto. Descarga Ollama desde: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: themeColors.primaryColor }}>https://ollama.ai</a>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {localModels.map(model => (
            <div
              key={model.id}
              style={{
                background: currentModel === model.id && modelType === 'local'
                  ? `linear-gradient(135deg, ${themeColors.primaryColor}30 0%, ${themeColors.primaryColor}20 100%)`
                  : themeColors.cardBackground,
                border: `1px solid ${currentModel === model.id && modelType === 'local' ? themeColors.primaryColor : themeColors.borderColor}`,
                borderRadius: '8px',
                padding: '1rem',
                transition: 'all 0.2s ease',
                opacity: model.downloaded ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
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
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {model.downloaded ? (
                    <>
                      {currentModel === model.id && modelType === 'local' && (
                        <i className="pi pi-check-circle" style={{ color: themeColors.primaryColor, fontSize: '1.5rem' }} />
                      )}
                      <Button
                        label="Usar"
                        size="small"
                        onClick={() => handleSelectModel(model.id, 'local')}
                        disabled={currentModel === model.id && modelType === 'local'}
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        outlined
                        onClick={() => handleDeleteModel(model.id)}
                      />
                    </>
                  ) : (
                    <Button
                      label={downloading[model.id] ? 'Descargando...' : 'Descargar'}
                      icon={downloading[model.id] ? 'pi pi-spin pi-spinner' : 'pi pi-download'}
                      size="small"
                      onClick={() => handleDownloadModel(model.id)}
                      disabled={downloading[model.id]}
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
      <div style={{ padding: '1rem' }}>
        <h3 style={{ color: themeColors.textPrimary, marginBottom: '1rem' }}>
          Configuración de Rendimiento
        </h3>

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

        {useManualConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Max Tokens */}
            <div>
              <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Máximo de tokens (100-4000)
              </label>
              <InputText
                type="number"
                value={performanceConfig.maxTokens}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1500 }))}
                min="100"
                max="4000"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Número máximo de tokens en la respuesta (menos = más rápido)
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
                Límite de contexto (1000-16000)
              </label>
              <InputText
                type="number"
                value={performanceConfig.contextLimit}
                onChange={(e) => setPerformanceConfig(prev => ({ ...prev, contextLimit: parseInt(e.target.value) || 4000 }))}
                min="1000"
                max="16000"
                style={{ width: '100%' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                Límite total de caracteres en el contexto (menos = más rápido)
              </small>
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
            Consejos de rendimiento
          </h4>
          <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Para modelos pesados (Llama 3.1, GPT-4):</strong> Reduce maxTokens (1000-1500) y maxHistory (5-8)
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Para modelos ligeros (Llama 3.2, Phi-3):</strong> Puedes usar valores más altos
            </p>
            <p style={{ margin: '0' }}>
              <strong>Streaming:</strong> Siempre activado para modelos locales mejora la experiencia
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderRemoteOllamaConfig = () => {
    return (
      <div style={{ padding: '1rem' }}>
        <h3 style={{ color: themeColors.textPrimary, marginBottom: '1rem' }}>
          Configuración de Ollama Remoto
        </h3>

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
            <strong>Ollama Remoto</strong> te permite usar modelos de IA instalados en otro servidor.
            <br />
            Útil para usar modelos más potentes o compartir recursos entre equipos.
          </div>
        </div>

        {/* Configuración de URL */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
            URL del servidor Ollama
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <InputText
              value={remoteOllamaUrl}
              onChange={(e) => setRemoteOllamaUrl(e.target.value)}
              placeholder="http://192.168.1.100:11434"
              style={{ flex: 1 }}
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
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
              />
            )}
          </div>
          <small style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>
            Ejemplos: http://192.168.1.100:11434, http://servidor.local:11434, https://ollama.miempresa.com
          </small>
        </div>

        {/* Estado actual */}
        <div style={{
          background: themeColors.cardBackground,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ color: themeColors.textPrimary, margin: '0 0 0.5rem 0' }}>
            Estado Actual
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <i className="pi pi-server" style={{ color: themeColors.primaryColor }} />
            <span style={{ color: themeColors.textSecondary }}>
              {aiService.remoteOllamaUrl || 'http://localhost:11434'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: themeColors.textSecondary }}>
            {aiService.remoteOllamaUrl ? 'Usando servidor Ollama remoto' : 'Usando Ollama local'}
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
      style={{ width: '600px', maxWidth: '90vw' }}
      modal
    >
      <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
        <TabPanel header="Modelos Remotos">
          {renderRemoteModels()}
        </TabPanel>
        <TabPanel header="Modelos Locales">
          {renderLocalModels()}
        </TabPanel>
        <TabPanel header="Ollama Remoto">
          {renderRemoteOllamaConfig()}
        </TabPanel>
        <TabPanel header="Rendimiento">
          {renderPerformanceConfig()}
        </TabPanel>
      </TabView>
    </Dialog>
  );
};

export default AIConfigDialog;

