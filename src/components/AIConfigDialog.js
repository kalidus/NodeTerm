import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { TabView, TabPanel } from 'primereact/tabview';
import { ProgressBar } from 'primereact/progressbar';
import { aiService } from '../services/AIService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import MCPManagerTab from './MCPManagerTab';
import mcpClient from '../services/MCPClientService';

// Definición de categorías de uso
const USE_CASE_CATEGORIES = [
  {
    id: 'general',
    name: 'Uso General / Asistente',
    icon: 'pi pi-comments',
    color: '#00BCD4',
    description: 'Conversación, asistencia diaria, respuestas rápidas y tareas variadas',
    keywords: ['Uso general', 'Asistencia general', 'Procesamiento de texto', 'Escritura', 'Respuestas rápidas', 'Asistencia básica', 'Tareas simples']
  },
  {
    id: 'programming-basic',
    name: 'Programación Básica',
    icon: 'pi pi-code',
    color: '#4CAF50',
    description: 'Código simple, scripting, aprendizaje y tareas rutinarias',
    keywords: ['Programación general', 'Programación básica', 'Asistencia técnica', 'Procesamiento básico', 'Uso general', 'Asistencia general']
  },
  {
    id: 'programming-advanced',
    name: 'Programación Avanzada',
    icon: 'pi pi-desktop',
    color: '#2196F3',
    description: 'Arquitecturas complejas, debugging avanzado, refactoring y código de producción',
    keywords: ['Programación avanzada', 'Programación compleja', 'Análisis de código complejo', 'Razonamiento profundo', 'Generación de código', 'Debugging avanzado', 'Refactoring']
  },
  {
    id: 'reasoning',
    name: 'Razonamiento y Lógica',
    icon: 'pi pi-bolt',
    color: '#FF9800',
    description: 'Matemáticas, algoritmos, resolución de problemas complejos y pensamiento profundo',
    keywords: ['Razonamiento lógico', 'Análisis matemático', 'Resolución de algoritmos', 'Razonamiento profundo', 'Resolución de problemas complejos', 'Resolución de problemas difíciles']
  },
  {
    id: 'document-analysis',
    name: 'Análisis de Documentos Largos',
    icon: 'pi pi-file',
    color: '#9C27B0',
    description: 'Documentos extensos, análisis masivo de texto, investigación y contextos largos',
    keywords: ['Análisis de documentos largos', 'Conversaciones extensas', 'Análisis masivo', 'Documentos muy largos', 'Contextos largos', 'Investigación profunda']
  },
  {
    id: 'sysadmin',
    name: 'SysAdmin / DevOps',
    icon: 'pi pi-server',
    color: '#795548',
    description: 'Scripts de administración, automatización, configuración de sistemas',
    keywords: ['Automatización', 'Scripts', 'Configuración', 'Administración de sistemas', 'DevOps', 'Infraestructura']
  },
  {
    id: 'security',
    name: 'Seguridad y Auditoría',
    icon: 'pi pi-shield',
    color: '#F44336',
    description: 'Análisis de vulnerabilidades, auditoría de código y mejores prácticas de seguridad',
    keywords: ['Seguridad', 'Auditoría', 'Vulnerabilidades', 'Análisis de seguridad', 'Mejores prácticas']
  },
  {
    id: 'lightweight',
    name: 'Dispositivos Limitados',
    icon: 'pi pi-mobile',
    color: '#607D8B',
    description: 'Hardware con poca RAM, dispositivos móviles y máxima velocidad',
    keywords: ['Dispositivos móviles', 'Uso ligero', 'Tareas simples', 'Dispositivos limitados', 'Bajo consumo']
  }
];

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
  // Refs para enfocar rápidamente los campos de API Key al pulsar "Configurar" en cada card
  const openaiInputRef = React.useRef(null);
  const anthropicInputRef = React.useRef(null);
  const googleInputRef = React.useRef(null);
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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [configuringProvider, setConfiguringProvider] = useState(null);
  const [configInputValue, setConfigInputValue] = useState('');
  const [configDialogVisible, setConfigDialogVisible] = useState(false);
  // Estado interno del diálogo de configuración

  const [configuringLocalModel, setConfiguringLocalModel] = useState(null);
  const [localModelPerformanceConfig, setLocalModelPerformanceConfig] = useState({
    maxTokens: 6000,
    temperature: 0.7,
    maxHistory: 8,
    useStreaming: true,
    contextLimit: 8000
  });
  const [localModelPerformanceDialogVisible, setLocalModelPerformanceDialogVisible] = useState(false);

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
      // Inicializar MCP client
      mcpClient.initialize().catch(error => {
        console.error('Error inicializando MCP client:', error);
      });
    }
  }, [visible]);

  // Efecto para actualizar configuración del modelo seleccionado
  useEffect(() => {
    if (currentModel && modelType) {
      const config = aiService.getModelPerformanceConfig(currentModel, modelType);
      setCurrentModelConfig(config);
    }
  }, [currentModel, modelType, localModelPerformanceDialogVisible]);

  // Cargar configuración guardada cuando se abre el diálogo de configuración de un modelo local
  useEffect(() => {
    if (localModelPerformanceDialogVisible && configuringLocalModel && typeof configuringLocalModel === 'object') {
      const model = configuringLocalModel;
      const configs = JSON.parse(localStorage.getItem('local-model-performance-configs') || '{}');
      
      if (configs[model.id]) {
        // Ya hay configuración guardada
        setLocalModelPerformanceConfig(configs[model.id]);
      } else {
        // Primera vez - auto-aplicar preset según tamaño
        const modelId = model.id?.toLowerCase() || '';
        let category = 'medium';
        
        if (modelId.includes('70b')) category = 'large';
        else if (modelId.includes('13b') || modelId.includes('8b')) category = 'medium';
        else if (modelId.includes('7b') || modelId.includes('3b')) category = 'small';
        else if (modelId.includes('1b')) category = 'tiny';
        
        const presets = {
          tiny: { maxTokens: 2000, temperature: 0.7, maxHistory: 4, contextLimit: 4000, useStreaming: true },
          small: { maxTokens: 3000, temperature: 0.7, maxHistory: 5, contextLimit: 8000, useStreaming: true },
          medium: { maxTokens: 6000, temperature: 0.7, maxHistory: 8, contextLimit: 32000, useStreaming: true },
          large: { maxTokens: 8000, temperature: 0.7, maxHistory: 12, contextLimit: 128000, useStreaming: true }
        };
        const defaultConfig = presets[category] || presets.medium;
        setLocalModelPerformanceConfig(defaultConfig);
      }
    }
  }, [localModelPerformanceDialogVisible, configuringLocalModel]);

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
      const previousModel = aiService.currentModel;
      await aiService.detectOllamaModels();
      const models = aiService.getAvailableModels();
      setLocalModels(models.local);
      
      // Actualizar modelo actual si cambió después de la detección
      setCurrentModel(aiService.currentModel);
      setModelType(aiService.modelType);
      
      // Notificar si el modelo anterior ya no está disponible
      if (previousModel && previousModel !== aiService.currentModel) {
        if (window.toast?.current?.show) {
          window.toast.current.show({
            severity: 'warn',
            summary: 'Modelo no disponible',
            detail: `El modelo ${previousModel} ya no está instalado. Selecciona otro modelo.`,
            life: 4000
          });
        }
      } else {
        if (window.toast?.current?.show) {
          window.toast.current.show({
            severity: 'success',
            summary: 'Modelos detectados',
            detail: 'Se detectaron los modelos instalados en Ollama',
            life: 2000
          });
        }
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
    try {
      // Validar antes de seleccionar
      if (type === 'local') {
        const model = localModels.find(m => m.id === modelId);
        if (!model || !model.downloaded) {
          if (window.toast?.current?.show) {
            window.toast.current.show({
              severity: 'warn',
              summary: 'Modelo no disponible',
              detail: `El modelo ${modelId} no está instalado. Instálalo primero en Ollama.`,
              life: 4000
            });
          }
          return;
        }
      } else if (type === 'remote') {
        const model = remoteModels.find(m => m.id === modelId);
        if (!model) {
          if (window.toast?.current?.show) {
            window.toast.current.show({
              severity: 'warn',
              summary: 'Modelo no encontrado',
              detail: `El modelo ${modelId} no existe.`,
              life: 3000
            });
          }
          return;
        }
        const apiKey = aiService.getApiKey(model.provider);
        if (!apiKey) {
          if (window.toast?.current?.show) {
            window.toast.current.show({
              severity: 'warn',
              summary: 'API Key requerida',
              detail: `Configura primero la API Key de ${model.provider} para usar este modelo.`,
              life: 4000
            });
          }
          return;
        }
      }
      
      // Si todo está bien, seleccionar el modelo
      aiService.setCurrentModel(modelId, type);
      setCurrentModel(modelId);
      setModelType(type);
      
      if (window.toast?.current?.show) {
        const modelName = type === 'local' 
          ? localModels.find(m => m.id === modelId)?.name || modelId
          : remoteModels.find(m => m.id === modelId)?.name || modelId;
        window.toast.current.show({
          severity: 'success',
          summary: 'Modelo seleccionado',
          detail: `${modelName} configurado correctamente`,
          life: 2000
        });
      }
    } catch (error) {
      console.error('Error seleccionando modelo:', error);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo seleccionar el modelo',
          life: 4000
        });
      }
    }
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

  // Lleva al usuario a la sección del input correspondiente y hace foco
  const handleConfigureProvider = (providerId) => {
    setConfiguringProvider(providerId);
    setConfigInputValue(apiKeys[providerId] || '');
    setConfigDialogVisible(true);
  };

  const handleSaveApiKeyValue = (providerId, value) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }));
    aiService.setApiKey(providerId, value);
    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'success',
        summary: 'API Key guardada',
        detail: `API Key de ${providerId} guardada correctamente`,
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
    // Agrupar modelos por proveedor
    const remoteProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        icon: 'pi pi-briefcase',
        color: '#00A67E',
        logo: '🤖',
        description: 'GPT-4, GPT-3.5 Turbo y más',
        apiKeyPlaceholder: 'sk-...',
        models: remoteModels.filter(m => m.provider === 'openai'),
        configured: !!apiKeys.openai
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        icon: 'pi pi-star',
        color: '#E06F6F',
        logo: '🧠',
        description: 'Claude 3 Opus, Sonnet, Haiku',
        apiKeyPlaceholder: 'sk-ant-...',
        models: remoteModels.filter(m => m.provider === 'anthropic'),
        configured: !!apiKeys.anthropic
      },
      {
        id: 'google',
        name: 'Google',
        icon: 'pi pi-palette',
        color: '#4285F4',
        logo: '✨',
        description: 'Gemini 2.5, Gemini 2.0 Flash',
        apiKeyPlaceholder: 'AIza...',
        models: remoteModels.filter(m => m.provider === 'google'),
        configured: !!apiKeys.google
      }
    ];

    // Filtrar solo proveedores con modelos
    const activeProviders = remoteProviders.filter(p => p.models.length > 0);

    const showGlobalApiSection = false;
    return (
      <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
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
            <h2 style={{ color: themeColors.textPrimary, margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              Modelos Remotos
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '1rem' }}>
              Conecta con servicios de IA en la nube para acceso a modelos avanzados
            </p>
          </div>
        </div>

        {showGlobalApiSection && (
        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: themeColors.textPrimary, margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            🔑 Configuración de API Keys
          </h4>
          
          {/* OpenAI */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
              OpenAI API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                placeholder="sk-..."
                type="password"
                style={{ flex: 1 }}
                ref={openaiInputRef}
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
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
              Anthropic API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <InputText
                value={apiKeys.anthropic}
                onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                placeholder="sk-ant-..."
                type="password"
                style={{ flex: 1 }}
                ref={anthropicInputRef}
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
          <div>
            <label style={{ color: themeColors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
              Google API Key (Gemini)
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
                ref={googleInputRef}
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
        )}

        {/* Grid de Proveedores Remotos - Cards modernas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {activeProviders.map(provider => (
            <div
              key={provider.id}
              onClick={() => {
                if (configDialogVisible) return; // Evita abrir modelos si el diálogo de API está abierto o acaba de cerrarse
                setSelectedCategory(provider.id);
                setCategoryDialogVisible(true);
              }}
              style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: `2px solid ${provider.color}30`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = provider.color;
                e.currentTarget.style.boxShadow = `0 12px 32px ${provider.color}30, inset 0 1px 0 rgba(255,255,255,0.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${provider.color}30`;
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
              }}
            >
              {/* Decoración de fondo */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: `${provider.color}10`,
                filter: 'blur(30px)',
                pointerEvents: 'none'
              }} />
              
              {/* Contenido */}
              <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header con logo e indicador */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: `${provider.color}20`,
                    border: `1px solid ${provider.color}40`,
                    boxShadow: `0 2px 8px ${provider.color}20`
                  }}>
                    {provider.logo}
                  </div>
                  
                  {/* Indicador + botón configuración */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {provider.configured ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(76, 175, 80, 0.15)',
                        color: '#4CAF50',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        whiteSpace: 'nowrap'
                      }}>
                        <i className="pi pi-check" style={{ fontSize: '0.6rem' }} />
                        Configurado
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(255, 193, 7, 0.15)',
                        color: '#FFC107',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        whiteSpace: 'nowrap'
                      }}>
                        <i className="pi pi-exclamation-circle" style={{ fontSize: '0.6rem' }} />
                        No configurado
                      </div>
                    )}
                    <Button
                      icon="pi pi-cog"
                      rounded
                      text
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleConfigureProvider(provider.id); }}
                      aria-label="Configurar proveedor"
                      style={{ padding: '0.25rem', width: '28px', height: '28px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Nombre y descripción */}
                <h3 style={{
                  color: themeColors.textPrimary,
                  margin: '0 0 0.4rem 0',
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  letterSpacing: '0.3px'
                }}>
                  {provider.name}
                </h3>

                <p style={{
                  color: themeColors.textSecondary,
                  margin: '0 0 1rem 0',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  flex: 1
                }}>
                  {provider.description}
                </p>

                {/* Estadísticas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: `1px solid ${provider.color}20`
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      marginBottom: '0.3rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Modelos
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: provider.color
                    }}>
                      {provider.models.length}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      marginBottom: '0.3rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Estado
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: provider.configured ? '#4CAF50' : '#FFC107'
                    }}>
                      {provider.configured ? 'Activo' : 'Espera API'}
                    </div>
                  </div>
                </div>

                {/* Botón de acción */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: provider.color,
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginTop: 'auto',
                  padding: '0.75rem',
                  background: `${provider.color}15`,
                  borderRadius: '10px',
                  border: `1px solid ${provider.color}30`,
                  transition: 'all 0.2s ease',
                  justifyContent: 'space-between'
                }}>
                  <span>Ver {provider.models.length} modelo{provider.models.length !== 1 ? 's' : ''}</span>
                  <i className="pi pi-arrow-right" style={{ fontSize: '0.75rem' }} />
                </div>

        {/* Diálogo de configuración de API Key */}
        {configDialogVisible && (
          <Dialog
            visible={configDialogVisible}
            onHide={() => {
              setConfigDialogVisible(false);
            }}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="pi pi-cog" />
                <span>Configurar API Key</span>
              </div>
            }
            style={{ width: '32rem' }}
            modal
          >
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ color: themeColors.textSecondary }}>
                Proveedor: <strong style={{ color: themeColors.textPrimary }}>{(configuringProvider || '').toUpperCase()}</strong>
              </div>
              <InputText
                value={configInputValue}
                onChange={(e) => setConfigInputValue(e.target.value)}
                placeholder={configuringProvider === 'openai' ? 'sk-...' : configuringProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                type="password"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                {apiKeys[configuringProvider] && (
                  <Button
                    label="Borrar"
                    icon="pi pi-trash"
                    severity="danger"
                    onClick={() => { handleClearApiKey(configuringProvider); setConfigInputValue(''); setConfigDialogVisible(false); }}
                  />
                )}
                <Button
                  label="Cancelar"
                  icon="pi pi-times"
                  severity="secondary"
                  onClick={() => setConfigDialogVisible(false)}
                />
                <Button
                  label="Guardar"
                  icon="pi pi-check"
                  onClick={() => { handleSaveApiKeyValue(configuringProvider, configInputValue); setConfigDialogVisible(false); }}
                />
              </div>
            </div>
          </Dialog>
        )}

              </div>
            </div>
          ))}
        </div>

        {activeProviders.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: themeColors.textSecondary
          }}>
            <i className="pi pi-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hay modelos remotos disponibles</p>
            <p style={{ fontSize: '0.9rem' }}>Configura una API Key para acceder a los modelos</p>
          </div>
        )}

        {/* Información adicional */}
        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-info-circle" style={{ color: '#2196F3', marginTop: '0.2rem', fontSize: '1.1rem', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
            <strong style={{ color: themeColors.textPrimary }}>💡 Información:</strong>
            Obtén tus API Keys en los respectivos sitios web de los proveedores. 
            Una vez configurados, podrás acceder a todos los modelos disponibles de cada proveedor.
          </div>
        </div>
      </div>
    );
  };

  const renderLocalModels = () => {
    // Agrupar modelos por familia/proveedor
    const localProviders = [
      {
        id: 'llama',
        name: 'Llama',
        icon: 'pi pi-bolt',
        color: '#AC63F7',
        logo: '🦙',
        description: 'Familia completa de modelos Llama de Meta',
        models: localModels.filter(m => m.id.includes('llama')),
        installed: localModels.filter(m => m.id.includes('llama')).some(m => m.downloaded)
      },
      {
        id: 'mistral',
        name: 'Mistral',
        icon: 'pi pi-wind',
        color: '#F7931E',
        logo: '💨',
        description: 'Mistral 7B, Mixtral y otros modelos rápidos y eficientes',
        models: localModels.filter(m => m.id.includes('mistral') || m.id.includes('mixtral')),
        installed: localModels.filter(m => m.id.includes('mistral') || m.id.includes('mixtral')).some(m => m.downloaded)
      },
      {
        id: 'qwen',
        name: 'Qwen',
        icon: 'pi pi-rocket',
        color: '#FF6B35',
        logo: '🚀',
        description: 'Modelos Qwen de Alibaba optimizados para múltiples idiomas',
        models: localModels.filter(m => m.id.includes('qwen')),
        installed: localModels.filter(m => m.id.includes('qwen')).some(m => m.downloaded)
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        icon: 'pi pi-search',
        color: '#7C3AED',
        logo: '🔍',
        description: 'Modelos DeepSeek con excelente análisis y razonamiento',
        models: localModels.filter(m => m.id.includes('deepseek')),
        installed: localModels.filter(m => m.id.includes('deepseek')).some(m => m.downloaded)
      },
      {
        id: 'orca',
        name: 'Orca',
        icon: 'pi pi-asterisk',
        color: '#00BCD4',
        logo: '🐋',
        description: 'Modelos Orca compactos y eficientes',
        models: localModels.filter(m => m.id.includes('orca')),
        installed: localModels.filter(m => m.id.includes('orca')).some(m => m.downloaded)
      },
      {
        id: 'neural-chat',
        name: 'Neural Chat',
        icon: 'pi pi-comments',
        color: '#4CAF50',
        logo: '💬',
        description: 'Modelos optimizados para conversación',
        models: localModels.filter(m => m.id.includes('neural-chat')),
        installed: localModels.filter(m => m.id.includes('neural-chat')).some(m => m.downloaded)
      },
      {
        id: 'gpt-oss',
        name: 'GPT-OSS',
        icon: 'pi pi-brain',
        color: '#00D9FF',
        logo: '🧠',
        description: 'OpenAI\'s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases.',
        models: localModels.filter(m => m.id.includes('gpt-oss')),
        installed: localModels.filter(m => m.id.includes('gpt-oss')).some(m => m.downloaded)
      },
      {
        id: 'gemma',
        name: 'Gemma',
        icon: 'pi pi-star',
        color: '#FF9800',
        logo: '✨',
        description: 'The current, most capable model that runs on a single GPU.',
        models: localModels.filter(m => m.id.includes('gemma')),
        installed: localModels.filter(m => m.id.includes('gemma')).some(m => m.downloaded)
      },
      {
        id: 'otros',
        name: 'Otros Modelos',
        icon: 'pi pi-cog',
        color: '#9C27B0',
        logo: '⚙️',
        description: 'Otros modelos disponibles en Ollama',
        models: localModels.filter(m => m.platform === 'ollama' && !m.id.includes('llama') && !m.id.includes('mistral') && !m.id.includes('qwen') && !m.id.includes('deepseek') && !m.id.includes('orca') && !m.id.includes('neural-chat') && !m.id.includes('gpt-oss') && !m.id.includes('gemma')),
        installed: localModels.filter(m => m.platform === 'ollama' && !m.id.includes('llama') && !m.id.includes('mistral') && !m.id.includes('qwen') && !m.id.includes('deepseek') && !m.id.includes('orca') && !m.id.includes('neural-chat') && !m.id.includes('gpt-oss') && !m.id.includes('gemma')).some(m => m.downloaded)
      }
    ];

    // Filtrar solo proveedores con modelos
    const activeProviders = localProviders.filter(p => p.models.length > 0);

    return (
      <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '10px',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            height: '36px'
          }}>
            <i className="pi pi-desktop" style={{ fontSize: '1rem', color: themeColors.primaryColor }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: themeColors.textPrimary, margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              Modelos Locales
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '0.8rem' }}>
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

        {/* Agregar modelo personalizado */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ color: themeColors.textPrimary, fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block', fontWeight: '600' }}>
            ➕ Agregar modelo personalizado
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <InputText
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              placeholder="Ej: llama3.2, mistral, qwen2.5"
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomModel();
                }
              }}
            />
            <Button
              label="Agregar"
              icon="pi pi-plus"
              size="small"
              onClick={handleAddCustomModel}
              disabled={!customModelId.trim()}
            />
          </div>
          <small style={{ color: themeColors.textSecondary, fontSize: '0.7rem', marginTop: '0.35rem', display: 'block' }}>
            Escribe el nombre exacto del modelo instalado en Ollama
          </small>
        </div>

        {/* Grid de Familias de Modelos - Cards profesionales */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {activeProviders.map(provider => (
            <div
              key={provider.id}
              onClick={() => {
                setSelectedCategory(provider.id);
                setCategoryDialogVisible(true);
              }}
              style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: `2px solid ${provider.color}30`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = provider.color;
                e.currentTarget.style.boxShadow = `0 12px 32px ${provider.color}30, inset 0 1px 0 rgba(255,255,255,0.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${provider.color}30`;
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
              }}
            >
              {/* Decoración de fondo */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: `${provider.color}10`,
                filter: 'blur(30px)',
                pointerEvents: 'none'
              }} />
              
              {/* Contenido */}
              <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header con logo e indicador */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: `${provider.color}20`,
                    border: `1px solid ${provider.color}40`,
                    boxShadow: `0 2px 8px ${provider.color}20`
                  }}>
                    {provider.logo}
                  </div>
                  
                  {/* Indicador de estado + botón configurar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {provider.installed ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(76, 175, 80, 0.15)',
                        color: '#4CAF50',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        whiteSpace: 'nowrap'
                      }}>
                        <i className="pi pi-check" style={{ fontSize: '0.6rem' }} />
                        Instalado
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(255, 193, 7, 0.15)',
                        color: '#FFC107',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        whiteSpace: 'nowrap'
                      }}>
                        <i className="pi pi-exclamation-circle" style={{ fontSize: '0.6rem' }} />
                        No instalado
                      </div>
                    )}
                  </div>
                </div>

                {/* Nombre y descripción */}
                <h3 style={{
                  color: themeColors.textPrimary,
                  margin: '0 0 0.4rem 0',
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  letterSpacing: '0.3px'
                }}>
                  {provider.name}
                </h3>

                <p style={{
                  color: themeColors.textSecondary,
                  margin: '0 0 1rem 0',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  flex: 1
                }}>
                  {provider.description}
                </p>

                {/* Estadísticas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: `1px solid ${provider.color}20`
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      marginBottom: '0.3rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Modelos
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: provider.color
                    }}>
                      {provider.models.length}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      marginBottom: '0.3rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Descargados
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: provider.installed ? '#4CAF50' : '#FFC107'
                    }}>
                      {provider.models.filter(m => m.downloaded).length}
                    </div>
                  </div>
                </div>

                {/* Botón de acción */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: provider.color,
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginTop: 'auto',
                  padding: '0.75rem',
                  background: `${provider.color}15`,
                  borderRadius: '10px',
                  border: `1px solid ${provider.color}30`,
                  transition: 'all 0.2s ease',
                  justifyContent: 'space-between'
                }}>
                  <span>Ver {provider.models.length} modelo{provider.models.length !== 1 ? 's' : ''}</span>
                  <i className="pi pi-arrow-right" style={{ fontSize: '0.75rem' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Información importante al final */}
        <div style={{
          background: 'rgba(255, 193, 7, 0.08)',
          border: '1px solid rgba(255, 193, 7, 0.25)',
          borderRadius: '6px',
          padding: '0.6rem',
          marginTop: '0.75rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-lightbulb" style={{ color: '#FFC107', marginTop: '0.1rem', fontSize: '0.9rem', flexShrink: 0 }} />
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, lineHeight: '1.35' }}>
            <strong>💡 Información importante:</strong><br />
            • <strong>Modelos Ollama:</strong> Requieren Ollama instalado y ejecutándose localmente<br />
            • Puedes agregar modelos personalizados si están instalados en Ollama<br />
            • Descarga Ollama desde: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: themeColors.primaryColor }}>https://ollama.ai</a>
          </div>
        </div>

        {activeProviders.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: themeColors.textSecondary
          }}>
            <i className="pi pi-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hay modelos locales disponibles</p>
            <p style={{ fontSize: '0.9rem' }}>Instala Ollama y descarga modelos para comenzar</p>
          </div>
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

  // Función para filtrar modelos por categoría
  const getModelsByCategory = (categoryId) => {
    const category = USE_CASE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return { remote: [], local: [] };

    const filteredRemote = remoteModels.filter(model => 
      model.useCases?.some(useCase => 
        category.keywords.some(keyword => 
          useCase.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    );

    const filteredLocal = localModels.filter(model => 
      model.useCases?.some(useCase => 
        category.keywords.some(keyword => 
          useCase.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    );

    return { remote: filteredRemote, local: filteredLocal };
  };

  // Renderizar modal de categoría con sus modelos
  const renderCategoryDialog = () => {
    if (!selectedCategory) return null;

    // Definición de proveedores para obtener información
    const providersMap = {
      'ollama': {
        name: 'Ollama',
        icon: 'pi pi-server',
        color: '#4CAF50',
        logo: '🦙',
        description: 'Modelos de IA locales ejecutados en tu dispositivo sin conexión a internet',
        recommendation: 'Requiere Ollama instalado y ejecutándose localmente'
      },
      'openai': {
        name: 'OpenAI',
        icon: 'pi pi-briefcase',
        color: '#00A67E',
        logo: '🤖',
        description: 'Acceso a GPT-4, GPT-3.5 Turbo y otros modelos avanzados',
        recommendation: 'Requiere una API Key válida de OpenAI'
      },
      'anthropic': {
        name: 'Anthropic',
        icon: 'pi pi-star',
        color: '#E06F6F',
        logo: '🧠',
        description: 'Modelos Claude con excelente comprensión y razonamiento',
        recommendation: 'Requiere una API Key válida de Anthropic'
      },
      'google': {
        name: 'Google',
        icon: 'pi pi-palette',
        color: '#4285F4',
        logo: '✨',
        description: 'Gemini 2.5, Gemini 2.0 Flash y otras innovaciones de Google',
        recommendation: 'Requiere una API Key válida de Google Gemini'
      },
      'qwen': {
        name: 'Qwen',
        icon: 'pi pi-rocket',
        color: '#FF6B35',
        logo: '🚀',
        description: 'Modelos Qwen de Alibaba optimizados para múltiples idiomas',
        recommendation: 'Disponible vía Ollama local'
      },
      'deepseek': {
        name: 'DeepSeek',
        icon: 'pi pi-search',
        color: '#7C3AED',
        logo: '🔍',
        description: 'Modelos DeepSeek con excelente análisis y razonamiento',
        recommendation: 'Disponible vía Ollama local'
      },
      'mistral': {
        name: 'Mistral',
        icon: 'pi pi-wind',
        color: '#F7931E',
        logo: '💨',
        description: 'Mistral 7B, Mixtral y otros modelos rápidos y eficientes',
        recommendation: 'Disponible vía Ollama local'
      },
      'llama': {
        name: 'Llama',
        icon: 'pi pi-bolt',
        color: '#AC63F7',
        logo: '🦙',
        description: 'Familia completa de modelos Llama de Meta',
        recommendation: 'Disponible vía Ollama local'
      },
      'orca': {
        name: 'Orca',
        icon: 'pi pi-asterisk',
        color: '#00BCD4',
        logo: '🐋',
        description: 'Modelos Orca compactos y eficientes',
        recommendation: 'Disponible vía Ollama local'
      },
      'neural-chat': {
        name: 'Neural Chat',
        icon: 'pi pi-comments',
        color: '#4CAF50',
        logo: '💬',
        description: 'Modelos optimizados para conversación',
        recommendation: 'Disponible vía Ollama local'
      },
      'gpt-oss': {
        name: 'GPT-OSS',
        icon: 'pi pi-brain',
        color: '#00D9FF',
        logo: '🧠',
        description: 'OpenAI\'s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases.',
        recommendation: 'Disponible vía Ollama local'
      },
      'gemma': {
        name: 'Gemma',
        icon: 'pi pi-star',
        color: '#FF9800',
        logo: '✨',
        description: 'The current, most capable model that runs on a single GPU.',
        recommendation: 'Disponible vía Ollama local'
      },
      'otros': {
        name: 'Otros Modelos',
        icon: 'pi pi-cog',
        color: '#9C27B0',
        logo: '⚙️',
        description: 'Otros modelos disponibles en Ollama',
        recommendation: 'Disponible vía Ollama local'
      }
    };

    let provider = providersMap[selectedCategory];
    let filteredModels = [];

    if (provider) {
      // Filtrado por proveedor (comportamiento existente)
      if (['openai', 'anthropic', 'google'].includes(selectedCategory)) {
        const providerName = selectedCategory === 'openai' ? 'openai' :
                            selectedCategory === 'anthropic' ? 'anthropic' : 'google';
        filteredModels = remoteModels.filter(m => m.provider === providerName);
      } else if (selectedCategory === 'ollama') {
        filteredModels = localModels.filter(m => m.platform === 'ollama');
      } else if (selectedCategory === 'gpt-oss') {
        filteredModels = localModels.filter(m => m.id.includes('gpt-oss'));
      } else if (selectedCategory === 'gemma') {
        filteredModels = localModels.filter(m => m.id.includes('gemma'));
      } else if (selectedCategory === 'orca') {
        filteredModels = localModels.filter(m => m.id.includes('orca'));
      } else if (selectedCategory === 'neural-chat') {
        filteredModels = localModels.filter(m => m.id.includes('neural-chat'));
      } else if (selectedCategory === 'otros') {
        filteredModels = localModels.filter(m => m.platform === 'ollama' && !m.id.includes('llama') && !m.id.includes('mistral') && !m.id.includes('qwen') && !m.id.includes('deepseek') && !m.id.includes('orca') && !m.id.includes('neural-chat') && !m.id.includes('gpt-oss') && !m.id.includes('gemma'));
      } else {
        const keyword = selectedCategory;
        filteredModels = localModels.filter(m => m.id.includes(keyword));
      }
    } else {
      // Si no coincide con proveedor, interpretarlo como CATEGORÍA de uso
      const category = USE_CASE_CATEGORIES.find(c => c.id === selectedCategory);
      if (!category) return null;

      // Crear un proveedor "sintético" para reutilizar estilos del header
      provider = {
        name: category.name,
        icon: category.icon,
        color: category.color,
        logo: <i className={category.icon} style={{ color: category.color }} />,
        description: category.description,
        recommendation: 'Modelos recomendados para esta categoría de uso'
      };

      const byCategory = getModelsByCategory(category.id);
      filteredModels = [...byCategory.local, ...byCategory.remote];
    }

    return (
      <Dialog
        header={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            width: '100%'
          }}>
            <button
              onClick={() => setCategoryDialogVisible(false)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: themeColors.textPrimary,
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
            >
              <i className="pi pi-arrow-left" style={{ fontSize: '0.8rem' }} />
              Atrás
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{
                fontSize: '1.8rem',
                lineHeight: 1,
                width: '45px',
                height: '45px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: `${provider.color}20`,
                border: `1px solid ${provider.color}40`
              }}>
                {provider.logo}
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: themeColors.textPrimary }}>
                  {provider.name}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.8, marginTop: '0.25rem', color: themeColors.textSecondary }}>
                  {provider.description}
                </div>
              </div>
            </div>
          </div>
        }
        visible={categoryDialogVisible}
        onHide={() => setCategoryDialogVisible(false)}
        style={{ width: '85vw', maxWidth: '1200px' }}
        modal
      >
        <div style={{ padding: '1.5rem 0' }}>
          {/* Recomendación */}
          <div style={{
            background: `${provider.color}15`,
            border: `1px solid ${provider.color}30`,
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <i className="pi pi-info-circle" style={{ color: provider.color, marginTop: '0.2rem', fontSize: '1rem', flexShrink: 0 }} />
            <div style={{ fontSize: '0.9rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
              <strong style={{ color: provider.color }}>ℹ️ Información:</strong> {provider.recommendation}
            </div>
          </div>

          {filteredModels.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: themeColors.textSecondary
            }}>
              <i className="pi pi-info-circle" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hay modelos disponibles para {provider.name}</p>
              <p style={{ fontSize: '0.9rem' }}>Intenta instalar Ollama o configurar las API Keys necesarias</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredModels.map(model => (
                <div
                  key={model.id}
                  style={{
                    background: currentModel === model.id && ((modelType === 'remote' && ['openai', 'anthropic', 'google'].includes(selectedCategory)) || (modelType === 'local' && !['openai', 'anthropic', 'google'].includes(selectedCategory)))
                      ? `linear-gradient(135deg, ${provider.color}25 0%, ${provider.color}15 100%)`
                      : `linear-gradient(135deg,
                        rgba(16, 20, 28, 0.6) 0%,
                        rgba(16, 20, 28, 0.4) 100%)`,
                    backdropFilter: 'blur(8px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                    border: `1px solid ${currentModel === model.id && ((modelType === 'remote' && ['openai', 'anthropic', 'google'].includes(selectedCategory)) || (modelType === 'local' && !['openai', 'anthropic', 'google'].includes(selectedCategory))) ? provider.color : provider.color + '30'}`,
                    borderRadius: '10px',
                    padding: '1rem',
                    transition: 'all 0.2s ease',
                    opacity: (modelType === 'local' && model.platform === 'ollama') || (modelType === 'remote') ? 1 : (!['openai', 'anthropic', 'google'].includes(selectedCategory) && !model.downloaded ? 0.6 : 1),
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (currentModel !== model.id) {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.borderColor = provider.color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    if (currentModel !== model.id) {
                      e.currentTarget.style.borderColor = provider.color + '30';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      {/* Nombre y badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1.1rem', fontWeight: '700' }}>
                          {model.name}
                        </h4>
                        
                        {/* Badge de rendimiento */}
                        {model.performance && (
                          <span style={{
                            background: model.performance === 'high' ? 'rgba(76, 175, 80, 0.2)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                            color: model.performance === 'high' ? '#4CAF50' : model.performance === 'medium' ? '#FFC107' : '#F44336',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            border: `1px solid ${model.performance === 'high' ? 'rgba(76, 175, 80, 0.4)' : model.performance === 'medium' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`
                          }}>
                            {model.performance === 'high' ? '⚡ Alto Rendimiento' : model.performance === 'medium' ? '⚖️ Rendimiento Medio' : '🐌 Rendimiento Bajo'}
                          </span>
                        )}

                        {/* Badge de instalación */}
                        {model.downloaded && (
                          <span style={{
                            background: 'rgba(76, 175, 80, 0.2)',
                            color: '#4CAF50',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            border: '1px solid rgba(76, 175, 80, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <i className="pi pi-check" style={{ fontSize: '0.6rem' }} />
                            Instalado
                          </span>
                        )}

                        {/* Badge de selección actual */}
                        {currentModel === model.id && ((modelType === 'remote' && ['openai', 'anthropic', 'google'].includes(selectedCategory)) || (modelType === 'local' && !['openai', 'anthropic', 'google'].includes(selectedCategory))) && (
                          <span style={{
                            background: `${provider.color}30`,
                            color: provider.color,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            border: `1px solid ${provider.color}50`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <i className="pi pi-check-circle" style={{ fontSize: '0.6rem' }} />
                            Seleccionado
                          </span>
                        )}
                      </div>

                      {/* Información técnica */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        {model.size && (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: themeColors.textSecondary }}>💾 Tamaño:</span>
                            <span style={{ color: themeColors.textPrimary, fontWeight: '600', marginLeft: '0.5rem' }}>
                              {model.size}
                            </span>
                          </div>
                        )}
                        {model.context && (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: themeColors.textSecondary }}>🧠 Contexto:</span>
                            <span style={{ color: themeColors.textPrimary, fontWeight: '600', marginLeft: '0.5rem' }}>
                              {model.context}
                            </span>
                          </div>
                        )}
                        {model.parameters && (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: themeColors.textSecondary }}>⚙️ Parámetros:</span>
                            <span style={{ color: themeColors.textPrimary, fontWeight: '600', marginLeft: '0.5rem' }}>
                              {model.parameters}
                            </span>
                          </div>
                        )}
                        {model.ramRequired && (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: themeColors.textSecondary }}>💼 RAM:</span>
                            <span style={{ color: themeColors.textPrimary, fontWeight: '600', marginLeft: '0.5rem' }}>
                              {model.ramRequired}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Descripción */}
                      {model.description && (
                        <p style={{
                          margin: '0 0 1rem 0',
                          color: themeColors.textSecondary,
                          fontSize: '0.95rem',
                          lineHeight: '1.5'
                        }}>
                          {model.description}
                        </p>
                      )}

                      {/* Casos de uso */}
                      {model.useCases && model.useCases.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', color: themeColors.textSecondary, fontSize: '0.85rem', fontWeight: '600' }}>
                            📌 Casos de uso:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {model.useCases.map((useCase, index) => (
                              <span key={index} style={{
                                background: `${provider.color}20`,
                                color: provider.color,
                                padding: '0.2rem 0.6rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                border: `1px solid ${provider.color}40`
                              }}>
                                {useCase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mejor para */}
                      {model.bestFor && (
                        <p style={{
                          margin: '0',
                          color: themeColors.textSecondary,
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                          paddingTop: '0.5rem',
                          borderTop: `1px solid ${provider.color}20`
                        }}>
                          👤 <strong>Mejor para:</strong> {model.bestFor}
                        </p>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                      {model.downloaded ? (
                        <>
                          <Button
                            label="Usar"
                            icon="pi pi-play"
                            onClick={() => {
                              handleSelectModel(model.id, 'local');
                              setCategoryDialogVisible(false);
                            }}
                            style={{ width: '100%' }}
                            severity="success"
                          />
                          <Button
                            icon="pi pi-cog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfiguringLocalModel(model);
                              setLocalModelPerformanceDialogVisible(true);
                            }}
                            severity="secondary"
                            style={{ width: '100%' }}
                            tooltip="Configurar rendimiento"
                            tooltipOptions={{ position: 'top' }}
                          />
                          <Button
                            icon="pi pi-trash"
                            onClick={() => handleDeleteModel(model.id)}
                            severity="danger"
                            style={{ width: '100%' }}
                          />
                        </>
                      ) : (
                        <>
                          <Button
                            label="Descargar"
                            icon={downloading[model.id] ? 'pi pi-spin pi-spinner' : 'pi pi-download'}
                            onClick={() => handleDownloadModel(model.id)}
                            loading={downloading[model.id]}
                            style={{ width: '100%' }}
                          />
                          <Button
                            icon="pi pi-cog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfiguringLocalModel(model);
                              setLocalModelPerformanceDialogVisible(true);
                            }}
                            severity="secondary"
                            style={{ width: '100%' }}
                            tooltip="Configurar rendimiento"
                            tooltipOptions={{ position: 'top' }}
                          />
                        </>
                      )}
                      {['openai', 'anthropic', 'google'].includes(selectedCategory) && (
                        <Button
                          label="Usar"
                          icon="pi pi-play"
                          onClick={() => {
                            handleSelectModel(model.id, 'remote');
                            setCategoryDialogVisible(false);
                          }}
                          style={{ width: '100%' }}
                          severity="success"
                        />
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso de descarga */}
                  {downloading[model.id] && downloadProgress[model.id] && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${provider.color}20` }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        fontSize: '0.8rem'
                      }}>
                        <span style={{ color: themeColors.textSecondary }}>
                          {downloadProgress[model.id].status}
                        </span>
                        <span style={{ color: provider.color, fontWeight: '600' }}>
                          {downloadProgress[model.id].percent}%
                        </span>
                      </div>
                      <ProgressBar
                        value={downloadProgress[model.id].percent}
                        style={{ height: '6px' }}
                        showValue={false}
                      />
                      {downloadProgress[model.id].total && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: themeColors.textSecondary,
                          marginTop: '0.5rem',
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
      </Dialog>
    );
  };

  // Renderizar pestaña de Inicio
  const renderHomeTab = () => {
    return (
      <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
        {/* Banner compacto con estado del modelo actual */}
        {currentModel && currentModelConfig && (
          <div style={{
            background: themeColors.primaryColor + '10',
            border: `1px solid ${themeColors.primaryColor}40`,
            borderRadius: '8px',
            padding: '0.4rem 0.6rem',
            marginBottom: '0.9rem',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto auto',
            gap: '0.6rem',
            alignItems: 'center',
            minHeight: '44px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: themeColors.primaryColor + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="pi pi-check-circle" style={{ fontSize: '0.95rem', color: themeColors.primaryColor }} />
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: themeColors.textPrimary, fontSize: '0.85rem', fontWeight: 600 }}>✓ Modelo:</span>
              <span style={{ color: themeColors.textPrimary, fontSize: '0.85rem', marginLeft: '0.35rem' }}>{currentModel}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>📊 {currentModelConfig.contextLimit?.toLocaleString ? currentModelConfig.contextLimit.toLocaleString() : currentModelConfig.contextLimit} tokens</span>
              <span style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>📤 {currentModelConfig.maxTokens?.toLocaleString ? currentModelConfig.maxTokens.toLocaleString() : currentModelConfig.maxTokens} tokens</span>
              <span style={{ color: themeColors.textSecondary, fontSize: '0.75rem' }}>🔄 {currentModelConfig.maxHistory} msgs</span>
              <span style={{ color: currentModelConfig.useStreaming ? themeColors.primaryColor : themeColors.textSecondary, fontSize: '0.75rem' }}>{currentModelConfig.useStreaming ? '🌊 Streaming activo' : 'Streaming inactivo'}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}20, ${themeColors.primaryColor}10)`,
            borderRadius: '10px',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '48px',
            height: '48px'
          }}>
            <i className="pi pi-home" style={{ fontSize: '1.2rem', color: themeColors.primaryColor }} />
          </div>
          <div>
            <h2 style={{ color: themeColors.textPrimary, margin: '0 0 0.15rem 0', fontSize: '0.95rem' }}>
              Selecciona por Funcionalidad
            </h2>
            <p style={{ color: themeColors.textSecondary, margin: 0, fontSize: '0.8rem' }}>
              Elige el tipo de tarea que quieres realizar y encuentra el mejor modelo
            </p>
          </div>
        </div>

        {/* Grid de Categorías - Cards modernas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {USE_CASE_CATEGORIES.map(category => {
            const { remote, local } = getModelsByCategory(category.id);
            const totalModels = remote.length + local.length;

            return (
              <div
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCategoryDialogVisible(true);
                }}
                style={{
                  background: `linear-gradient(135deg,
                    rgba(16, 20, 28, 0.6) 0%,
                    rgba(16, 20, 28, 0.4) 100%)`,
                  backdropFilter: 'blur(8px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                  border: `2px solid ${category.color}30`,
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = category.color;
                  e.currentTarget.style.boxShadow = `0 12px 32px ${category.color}30, inset 0 1px 0 rgba(255,255,255,0.05)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = `${category.color}30`;
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
              >
                {/* Decoración de fondo */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: `${category.color}10`,
                  filter: 'blur(30px)',
                  pointerEvents: 'none'
                }} />
                
                {/* Contenido */}
                <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header con icono */}
                  <div style={{
                    fontSize: '2.5rem',
                    lineHeight: 1,
                  width: '40px',
                  height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: `${category.color}20`,
                    border: `1px solid ${category.color}40`,
                    boxShadow: `0 2px 8px ${category.color}20`,
                  marginBottom: '0.75rem'
                  }}>
                    <i className={category.icon} style={{ color: category.color, fontSize: '1.1rem' }} />
                  </div>

                  {/* Nombre y descripción */}
                  <h3 style={{
                    color: themeColors.textPrimary,
                    margin: '0 0 0.4rem 0',
                    fontSize: '1rem',
                    fontWeight: '700',
                    letterSpacing: '0.3px'
                  }}>
                    {category.name}
                  </h3>

                  <p style={{
                    color: themeColors.textSecondary,
                    margin: '0 0 1rem 0',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {category.description}
                  </p>

                  {/* Estadísticas */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: `1px solid ${category.color}20`
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: themeColors.textSecondary,
                        marginBottom: '0.3rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        Modelos
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: category.color
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{totalModels}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: themeColors.textSecondary,
                        marginBottom: '0.3rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        Disponibles
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: category.color
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{local.length + remote.length > 0 ? '✓' : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: category.color,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    marginTop: 'auto',
                    padding: '0.6rem',
                    background: `${category.color}15`,
                    borderRadius: '10px',
                    border: `1px solid ${category.color}30`,
                    transition: 'all 0.2s ease',
                    justifyContent: 'space-between'
                  }}>
                    <span>Ver detalles</span>
                    <i className="pi pi-arrow-right" style={{ fontSize: '0.75rem' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Información adicional */}
        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <i className="pi pi-info-circle" style={{ color: '#2196F3', marginTop: '0.2rem', fontSize: '1.1rem', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
            <strong style={{ color: themeColors.textPrimary }}>💡 Consejo:</strong> 
            Cada categoría agrupa modelos optimizados para tareas específicas. 
            Los modelos remotos requieren API keys, mientras que los locales necesitan Ollama instalado.
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
            <h2 style={{ color: themeColors.textPrimary, margin: 0, fontSize: '1rem', fontWeight: 700 }}>
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

  // Renderizar diálogo de configuración de rendimiento para modelos locales
  const renderLocalModelPerformanceDialog = () => {
    if (!configuringLocalModel || typeof configuringLocalModel === 'string') return null;

    const model = configuringLocalModel;
    
    // Auto-detectar tamaño del modelo basado en el nombre y specs
    const getModelSizeInfo = (modelObj) => {
      const modelId = modelObj.id?.toLowerCase() || '';
      const modelName = modelObj.name?.toLowerCase() || '';
      
      // Detectar por tamaño explícito en el nombre
      if (modelId.includes('70b') || modelName.includes('70b')) {
        return { name: `Grande (70B) - ${modelObj.name}`, category: 'large', displayName: modelObj.name };
      }
      if (modelId.includes('13b') || modelName.includes('13b')) {
        return { name: `Mediano (13B) - ${modelObj.name}`, category: 'medium', displayName: modelObj.name };
      }
      if (modelId.includes('8b') || modelName.includes('8b')) {
        return { name: `Mediano (8B) - ${modelObj.name}`, category: 'medium', displayName: modelObj.name };
      }
      if (modelId.includes('7b') || modelName.includes('7b')) {
        return { name: `Pequeño (7B) - ${modelObj.name}`, category: 'small', displayName: modelObj.name };
      }
      if (modelId.includes('3b') || modelName.includes('3b')) {
        return { name: `Pequeño (3B) - ${modelObj.name}`, category: 'small', displayName: modelObj.name };
      }
      if (modelId.includes('1b') || modelName.includes('1b')) {
        return { name: `Muy Pequeño (1B) - ${modelObj.name}`, category: 'tiny', displayName: modelObj.name };
      }
      
      // Detectar por familia de modelos
      const smallModels = ['mistral', 'neural-chat', 'orca', 'gemma'];
      const mediumModels = ['llama', 'qwen', 'gpt-oss'];
      const largeModels = ['deepseek'];
      
      if (smallModels.some(m => modelId.includes(m))) {
        return { name: `Pequeño - ${modelObj.name}`, category: 'small', displayName: modelObj.name };
      }
      if (mediumModels.some(m => modelId.includes(m))) {
        return { name: `Mediano - ${modelObj.name}`, category: 'medium', displayName: modelObj.name };
      }
      if (largeModels.some(m => modelId.includes(m))) {
        return { name: `Grande - ${modelObj.name}`, category: 'large', displayName: modelObj.name };
      }
      
      return { name: `Personalizado - ${modelObj.name}`, category: 'custom', displayName: modelObj.name };
    };

    const sizeInfo = getModelSizeInfo(model);

    // Función para aplicar presets
    const applyPreset = (presetType) => {
      const presets = {
        fast: { maxTokens: sizeInfo.category === 'tiny' ? 2000 : sizeInfo.category === 'small' ? 3000 : sizeInfo.category === 'medium' ? 4000 : 6000, temperature: 0.7, maxHistory: 4, contextLimit: 4000, useStreaming: true },
        balanced: { maxTokens: sizeInfo.category === 'tiny' ? 2000 : sizeInfo.category === 'small' ? 3000 : sizeInfo.category === 'medium' ? 6000 : 8000, temperature: 0.7, maxHistory: 8, contextLimit: sizeInfo.category === 'small' ? 8000 : sizeInfo.category === 'medium' ? 32000 : 128000, useStreaming: true },
        deep: { maxTokens: sizeInfo.category === 'tiny' ? 2000 : sizeInfo.category === 'small' ? 3000 : sizeInfo.category === 'medium' ? 8000 : 12000, temperature: 0.7, maxHistory: 12, contextLimit: 128000, useStreaming: true }
      };
      
      const newConfig = presets[presetType];
      setLocalModelPerformanceConfig(newConfig);
      
      if (window.toast?.current?.show) {
        const presetNames = { fast: '⚡ Rápido', balanced: '⚖️ Equilibrado', deep: '🚀 Máximo' };
        window.toast.current.show({
          severity: 'success',
          summary: 'Preset aplicado',
          detail: `${presetNames[presetType]} para ${sizeInfo.displayName}`,
          life: 2000
        });
      }
    };

    const handleSaveLocalModelConfig = () => {
      // Guardar por ID de modelo específico (usar el ID exacto del modelo)
      const configs = JSON.parse(localStorage.getItem('local-model-performance-configs') || '{}');
      const modelIdToSave = model.id; // Usar el ID exacto del modelo
      
      // Guardar configuración con el ID exacto
      configs[modelIdToSave] = localModelPerformanceConfig;
      
      // También guardar con el nombre base (sin tags) para compatibilidad
      const baseModelId = modelIdToSave.split(':')[0];
      if (baseModelId !== modelIdToSave) {
        // Solo guardar también con base si es diferente (tiene tags)
        // Esto permite que modelos con diferentes tags compartan configuración si el usuario lo desea
        // Pero priorizamos la configuración exacta
        if (!configs[baseModelId]) {
          configs[baseModelId] = localModelPerformanceConfig;
        }
      }
      
      localStorage.setItem('local-model-performance-configs', JSON.stringify(configs));
      
      // También aplicar globalmente al aiService
      aiService.setPerformanceConfig(localModelPerformanceConfig);
      
      console.log(`✅ Configuración guardada para modelo "${modelIdToSave}":`, localModelPerformanceConfig);
      console.log(`✅ También disponible para base "${baseModelId}":`, baseModelId !== modelIdToSave);
      
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Configuración guardada',
          detail: `Rendimiento configurado para ${sizeInfo.displayName} (${modelIdToSave})`,
          life: 3000
        });
      }
      
      setLocalModelPerformanceDialogVisible(false);
    };

    return (
      <Dialog
        visible={localModelPerformanceDialogVisible}
        onHide={() => setLocalModelPerformanceDialogVisible(false)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="pi pi-sliders-h" style={{ fontSize: '1.2rem' }} />
            <span>Configurar Rendimiento - {sizeInfo.displayName}</span>
          </div>
        }
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Presets rápidos */}
          <div>
            <h3 style={{ color: themeColors.textPrimary, margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-lightning-bolt" style={{ color: themeColors.primaryColor }} />
              Presets Rápidos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <Button
                label="⚡ Rápido"
                onClick={() => applyPreset('fast')}
                severity="warning"
                outlined
                style={{ padding: '0.75rem' }}
              />
              <Button
                label="⚖️ Equilibrado"
                onClick={() => applyPreset('balanced')}
                severity="info"
                outlined
                style={{ padding: '0.75rem' }}
              />
              <Button
                label="🚀 Máximo"
                onClick={() => applyPreset('deep')}
                severity="success"
                outlined
                style={{ padding: '0.75rem' }}
              />
            </div>
          </div>

          {/* Información de requisitos */}
          <div style={{
            background: `rgba(33, 150, 243, 0.1)`,
            border: `1px solid rgba(33, 150, 243, 0.3)`,
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.9rem', color: themeColors.textPrimary, fontWeight: '600', marginBottom: '0.5rem' }}>
              📊 Requisitos estimados:
            </div>
            <div style={{ fontSize: '0.85rem', color: themeColors.textSecondary, lineHeight: '1.5' }}>
              {sizeInfo.category === 'tiny' && '💾 RAM: 1-2GB | 🎮 GPU: 1GB'}
              {sizeInfo.category === 'small' && '💾 RAM: 3-4GB | 🎮 GPU: 2-3GB'}
              {sizeInfo.category === 'medium' && '💾 RAM: 6-8GB | 🎮 GPU: 4-6GB'}
              {sizeInfo.category === 'large' && '💾 RAM: 40GB+ | 🎮 GPU: 24GB+'}
              {sizeInfo.category === 'custom' && '💾 RAM: Variable | 🎮 GPU: Variable'}
            </div>
          </div>

          {/* Configuración manual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Max Tokens */}
            <div>
              <label style={{ color: themeColors.textPrimary, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                📤 Máximo de Tokens
              </label>
              <InputText
                type="number"
                value={localModelPerformanceConfig.maxTokens}
                onChange={(e) => setLocalModelPerformanceConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 6000 }))}
                min="1000"
                max="12000"
                style={{ width: '100%', padding: '0.6rem' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                Longitud máxima de respuestas. Mayor = respuestas más detalladas.
              </small>
            </div>

            {/* Temperature */}
            <div>
              <label style={{ color: themeColors.textPrimary, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                🎲 Temperatura (0.1-2.0)
              </label>
              <InputText
                type="number"
                step="0.1"
                value={localModelPerformanceConfig.temperature}
                onChange={(e) => setLocalModelPerformanceConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                min="0.1"
                max="2.0"
                style={{ width: '100%', padding: '0.6rem' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                0.1=conservador, 0.7=equilibrado, 2.0=muy creativo
              </small>
            </div>

            {/* Max History */}
            <div>
              <label style={{ color: themeColors.textPrimary, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                🔄 Máximo de Mensajes en Historial (3-20)
              </label>
              <InputText
                type="number"
                value={localModelPerformanceConfig.maxHistory}
                onChange={(e) => setLocalModelPerformanceConfig(prev => ({ ...prev, maxHistory: parseInt(e.target.value) || 8 }))}
                min="3"
                max="20"
                style={{ width: '100%', padding: '0.6rem' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                Mensajes anteriores que recuerda el modelo. Más = mejor contexto.
              </small>
            </div>

            {/* Context Limit */}
            <div>
              <label style={{ color: themeColors.textPrimary, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                🧠 Límite de Contexto (2K-128K tokens)
              </label>
              <InputText
                type="number"
                value={localModelPerformanceConfig.contextLimit}
                onChange={(e) => setLocalModelPerformanceConfig(prev => ({ ...prev, contextLimit: parseInt(e.target.value) || 8000 }))}
                min="2000"
                max="128000"
                style={{ width: '100%', padding: '0.6rem' }}
              />
              <small style={{ color: themeColors.textSecondary, fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                {sizeInfo.category === 'tiny' && 'Recomendado: 4K'}
                {sizeInfo.category === 'small' && 'Recomendado: 4K-8K'}
                {sizeInfo.category === 'medium' && 'Recomendado: 8K-32K'}
                {sizeInfo.category === 'large' && 'Recomendado: 32K-128K'}
                {sizeInfo.category === 'custom' && 'Según disponibilidad de recursos'}
              </small>
            </div>

            {/* Streaming */}
            <div style={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: `1px solid rgba(76, 175, 80, 0.3)`,
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="useStreamingLocal"
                  checked={localModelPerformanceConfig.useStreaming}
                  onChange={(e) => setLocalModelPerformanceConfig(prev => ({ ...prev, useStreaming: e.target.checked }))}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
                <label htmlFor="useStreamingLocal" style={{
                  color: themeColors.textPrimary,
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>
                  🌊 Usar Streaming (recomendado)
                </label>
              </div>
              <p style={{ color: themeColors.textSecondary, fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
                Muestra respuestas en tiempo real. Reduce memoria y mejora UX.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button
              label="Guardar Configuración"
              icon="pi pi-check"
              onClick={handleSaveLocalModelConfig}
              style={{ flex: 1 }}
            />
            <Button
              label="Cancelar"
              icon="pi pi-times"
              severity="secondary"
              onClick={() => setLocalModelPerformanceDialogVisible(false)}
            />
          </div>
        </div>
      </Dialog>
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
      {/* Estilos compactos para tabs solo dentro de este diálogo */}
      <style>{`
        .ai-config-tabs .p-tabview-nav li .p-tabview-nav-link {
          font-size: 0.85rem;
          padding: 0.35rem 0.6rem;
        }
      `}</style>
      {/* Banner superior eliminado; será mostrado dentro de la pestaña Inicio en versión compacta */}

      <div className="ai-config-tabs">
      <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
        <TabPanel header="🏠 Inicio">
          {renderHomeTab()}
        </TabPanel>
        <TabPanel header="💻 Modelos Locales">
          {renderLocalModels()}
        </TabPanel>
        <TabPanel header="☁️ Modelos Remotos">
          {renderRemoteModels()}
        </TabPanel>
        <TabPanel header="🌐 Ollama Remoto">
          {renderRemoteOllamaConfig()}
        </TabPanel>
        <TabPanel header="🔌 MCP Tools">
          <MCPManagerTab themeColors={themeColors} />
        </TabPanel>
      </TabView>
      </div>

      {/* Diálogo de categoría */}
      {renderCategoryDialog()}
      {renderLocalModelPerformanceDialog()}
    </Dialog>
  );
};

export default AIConfigDialog;





