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
    anthropic: ''
  });
  const [downloading, setDownloading] = useState({});
  const [themeVersion, setThemeVersion] = useState(0);

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

  const loadConfig = () => {
    const models = aiService.getAvailableModels();
    setRemoteModels(models.remote);
    setLocalModels(models.local);
    setCurrentModel(aiService.currentModel);
    setModelType(aiService.modelType);
    
    // Cargar API keys
    const openaiKey = aiService.getApiKey('openai');
    const anthropicKey = aiService.getApiKey('anthropic');
    setApiKeys({
      openai: openaiKey || '',
      anthropic: anthropicKey || ''
    });
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
    try {
      await aiService.downloadLocalModel(modelId);
      loadConfig(); // Recargar configuración
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelo descargado',
          detail: 'El modelo se descargó correctamente',
          life: 2000
        });
      }
    } catch (error) {
      console.error('Error descargando modelo:', error);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo descargar el modelo',
          life: 3000
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, color: themeColors.textPrimary }}>
                    {model.name}
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    Provider: {model.provider}
                  </p>
                </div>
                {currentModel === model.id && modelType === 'remote' && (
                  <i className="pi pi-check-circle" style={{ color: themeColors.primaryColor, fontSize: '1.5rem' }} />
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
        <h3 style={{ color: themeColors.textPrimary, marginBottom: '1rem' }}>
          Modelos Locales
        </h3>

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
            Los modelos locales requieren <strong>Ollama</strong> ejecutándose en tu sistema.
            <br />
            Descarga Ollama desde: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: themeColors.primaryColor }}>https://ollama.ai</a>
          </div>
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
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, color: themeColors.textPrimary }}>
                    {model.name}
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    Tamaño: {model.size}
                  </p>
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
              
              {downloading[model.id] && (
                <ProgressBar mode="indeterminate" style={{ height: '4px', marginTop: '0.5rem' }} />
              )}
            </div>
          ))}
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
      </TabView>
    </Dialog>
  );
};

export default AIConfigDialog;

