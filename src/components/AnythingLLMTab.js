import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import '../styles/components/anything-llm.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando AnythingLLM...',
  isRunning: false
};

const AnythingLLMTab = () => {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [webviewState, setWebviewState] = useState('idle');
  const webviewRef = useRef(null);
  const mountedRef = useRef(true);
  const [showMCPDialog, setShowMCPDialog] = useState(false);
  const [mcpConfig, setMcpConfig] = useState('');
  const [mcpConfigError, setMcpConfigError] = useState(null);
  const [loadingMCP, setLoadingMCP] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [mcpServersList, setMcpServersList] = useState([]);
  const [customServerForm, setCustomServerForm] = useState({
    name: '',
    command: '',
    args: '',
    env: ''
  });
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [showEnvDialog, setShowEnvDialog] = useState(false);
  const [pendingServer, setPendingServer] = useState(null);
  const [pathInput, setPathInput] = useState('');
  const [envInput, setEnvInput] = useState('');
  const [envLabel, setEnvLabel] = useState('');
  const [dataDir, setDataDir] = useState(null);
  const toast = useRef(null);

  // Lista de servidores MCP populares
  const popularServers = [
    {
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Acceso seguro al sistema de archivos local',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      requiresPath: true,
      pathLabel: 'Ruta permitida (ej: C:\\Users\\kalid\\Documents)',
      icon: 'pi pi-folder'
    },
    {
      id: 'memory',
      name: 'Memory',
      description: 'Almacenamiento de memoria a largo plazo para el agente',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      icon: 'pi pi-database'
    },
    {
      id: 'git',
      name: 'Git',
      description: 'Operaciones con repositorios Git',
      command: 'uvx',
      args: ['mcp-server-git'],
      requiresPath: true,
      pathLabel: 'Ruta del repositorio Git',
      icon: 'pi pi-github'
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Interacción con la API de GitHub',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      requiresEnv: true,
      envLabel: 'GITHUB_PERSONAL_ACCESS_TOKEN',
      icon: 'pi pi-github'
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'Acceso a bases de datos PostgreSQL',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      requiresPath: true,
      pathLabel: 'Connection string (ej: postgresql://localhost/mydb)',
      icon: 'pi pi-database'
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      description: 'Búsqueda web usando Brave Search API',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      requiresEnv: true,
      envLabel: 'BRAVE_API_KEY',
      icon: 'pi pi-search'
    }
  ];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const invokeAnythingLLM = useCallback(async (method) => {
    if (!window.electron?.anythingLLM || typeof window.electron.anythingLLM[method] !== 'function') {
      throw new Error('API AnythingLLM no disponible en este entorno.');
    }
    const response = await window.electron.anythingLLM[method]();
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con AnythingLLM.');
    }
    return response;
  }, []);

  const startService = useCallback(async () => {
    setError(null);
    setIsReady(false);
    setWebviewState('idle');
    setStatus((prev) => ({
      ...prev,
      phase: 'starting',
      message: 'Iniciando contenedor AnythingLLM...'
    }));
    try {
      const response = await invokeAnythingLLM('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeAnythingLLM('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar AnythingLLM.');
    }
  }, [invokeAnythingLLM]);

  useEffect(() => {
    startService();
  }, [startService]);

  useEffect(() => {
    const view = webviewRef.current;
    if (!view || !url) return undefined;
    
    const handleLoadStart = () => {
      console.log('[AnythingLLM] Webview iniciando carga...');
      setWebviewState('loading');
    };
    
    const handleFinishLoad = () => {
      console.log('[AnythingLLM] Webview cargado completamente (did-finish-load)');
      setWebviewState('ready');
    };
    
    const handleDomReady = () => {
      console.log('[AnythingLLM] Webview DOM listo');
      // Si aún está en loading, marcarlo como ready
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    };
    
    const handleStopLoading = () => {
      console.log('[AnythingLLM] Webview dejó de cargar');
      // Verificar si realmente terminó de cargar
      setTimeout(() => {
        if (view && !view.isLoading()) {
          console.log('[AnythingLLM] Webview verificado como listo (isLoading=false)');
          setWebviewState('ready');
        }
      }, 500);
    };
    
    const handleFail = (event) => {
      console.error('[AnythingLLM] Error cargando webview:', event);
      setWebviewState('error');
    };

    // Timeout de seguridad: ocultar overlay después de 5 segundos
    const safetyTimeout = setTimeout(() => {
      console.log('[AnythingLLM] Timeout de seguridad: ocultando overlay');
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    }, 5000);

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-finish-load', handleFinishLoad);
    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('did-stop-loading', handleStopLoading);
    view.addEventListener('did-fail-load', handleFail);

    return () => {
      clearTimeout(safetyTimeout);
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-finish-load', handleFinishLoad);
      view.removeEventListener('dom-ready', handleDomReady);
      view.removeEventListener('did-stop-loading', handleStopLoading);
      view.removeEventListener('did-fail-load', handleFail);
    };
  }, [url, reloadKey]);

  const handleReloadWebView = () => {
    setWebviewState('loading');
    setReloadKey((prev) => prev + 1);
  };

  const handleOpenExternal = useCallback(() => {
    if (!url) return;
    if (window.electron?.import?.openExternal) {
      window.electron.import.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [url]);

  const handleOpenMCPDialog = useCallback(async () => {
    setShowMCPDialog(true);
    setMcpConfigError(null);
    setLoadingMCP(true);
    setActiveTab(0);
    
    try {
      // Obtener directorio de datos
      const dirResponse = await window.electron.anythingLLM.getDataDir();
      if (dirResponse.success) {
        setDataDir(dirResponse.dataDir);
      }

      const response = await window.electron.anythingLLM.readMCPConfig();
      if (response.success) {
        setMcpConfig(JSON.stringify(response.config, null, 2));
        // Actualizar lista de servidores instalados
        const servers = response.config?.mcpServers || {};
        setMcpServersList(Object.keys(servers).map(name => ({
          name,
          ...servers[name]
        })));
      } else {
        setMcpConfigError(response.error || 'No se pudo leer la configuración MCP');
        setMcpConfig('{\n  "mcpServers": {}\n}');
        setMcpServersList([]);
      }
    } catch (error) {
      setMcpConfigError(error.message || 'Error al leer la configuración');
      setMcpConfig('{\n  "mcpServers": {}\n}');
      setMcpServersList([]);
    } finally {
      setLoadingMCP(false);
    }
  }, []);

  const handleAddPopularServer = useCallback(async (server, customPath = null, customEnv = null) => {
    // Si requiere ruta o env, mostrar diálogo primero
    if (server.requiresPath && !customPath) {
      setPendingServer(server);
      setPathInput('');
      setShowPathDialog(true);
      return;
    }

    if (server.requiresEnv && !customEnv) {
      setPendingServer(server);
      setEnvInput('');
      setEnvLabel(server.envLabel);
      setShowEnvDialog(true);
      return;
    }

    // Proceder con la instalación
    await installServer(server, customPath, customEnv);
  }, []);

  const installServer = useCallback(async (server, customPath = null, customEnv = null) => {
    setLoadingMCP(true);
    setMcpConfigError(null);

    try {
      // Obtener directorio de datos si no está disponible
      let currentDataDir = dataDir;
      if (!currentDataDir) {
        const dirResponse = await window.electron.anythingLLM.getDataDir();
        if (dirResponse.success) {
          currentDataDir = dirResponse.dataDir;
        }
      }

      const response = await window.electron.anythingLLM.readMCPConfig();
      if (!response.success) {
        throw new Error(response.error || 'No se pudo leer la configuración');
      }

      const config = response.config || { mcpServers: {} };
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Construir configuración del servidor
      const serverConfig = {
        command: server.command,
        args: [...server.args]
      };

      // Añadir ruta si es necesaria
      if (server.requiresPath && customPath) {
        let containerPath = null;
        
        // Verificar si la ruta ya está mapeada como volumen
        const containerPathResponse = await window.electron.anythingLLM.getContainerPath(customPath);
        if (containerPathResponse.success && containerPathResponse.containerPath) {
          containerPath = containerPathResponse.containerPath;
        } else {
          // Si no está mapeada y es una ruta externa, mapearla como volumen (como Guacamole)
          if (currentDataDir && !customPath.toLowerCase().startsWith(currentDataDir.toLowerCase())) {
            // Es una ruta externa, necesitamos mapearla como volumen
            // Extraer nombre de la carpeta (equivalente a path.basename)
            const pathParts = customPath.replace(/\\/g, '/').split('/').filter(p => p);
            const folderName = pathParts[pathParts.length - 1] || 'host';
            const volumeName = folderName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const volumeContainerPath = `/mnt/host/${volumeName}`;
            
            // Añadir mapeo de volumen
            const volumeResponse = await window.electron.anythingLLM.addVolumeMapping(customPath, volumeContainerPath);
            if (volumeResponse.success) {
              containerPath = volumeContainerPath;
              
              // El contenedor necesita reiniciarse para aplicar el nuevo volumen
              toast.current?.show({
                severity: 'info',
                summary: 'Volumen añadido',
                detail: 'Se ha añadido un nuevo volumen. El contenedor se reiniciará automáticamente.',
                life: 5000
              });
              
              // Reiniciar contenedor para aplicar el nuevo volumen
              const restartResponse = await window.electron.anythingLLM.restartContainer();
              if (!restartResponse.success) {
                console.warn('[AnythingLLM] No se pudo reiniciar el contenedor automáticamente:', restartResponse.error);
                toast.current?.show({
                  severity: 'warn',
                  summary: 'Reinicio necesario',
                  detail: 'Reinicia AnythingLLM manualmente para aplicar el nuevo volumen.',
                  life: 7000
                });
              }
            } else {
              throw new Error(volumeResponse.error || 'No se pudo mapear el volumen');
            }
          } else if (currentDataDir) {
            // Ruta dentro del directorio de datos
            const normalizedPath = customPath.replace(/\\/g, '/');
            const normalizedDataDir = currentDataDir.replace(/\\/g, '/');
            
            if (normalizedPath.toLowerCase().startsWith(normalizedDataDir.toLowerCase())) {
              const relativePath = normalizedPath.substring(normalizedDataDir.length).replace(/^\/+/, '');
              containerPath = `/app/server/storage/${relativePath}`;
            }
          }
        }
        
        if (!containerPath) {
          throw new Error('No se pudo determinar la ruta del contenedor para la ruta especificada');
        }
        
        serverConfig.args.push(containerPath);
      }

      // Añadir variables de entorno si son necesarias
      if (server.requiresEnv && customEnv) {
        serverConfig.env = {};
        serverConfig.env[server.envLabel] = customEnv;
      }

      // Añadir servidor a la configuración
      config.mcpServers[server.id] = serverConfig;

      // Guardar configuración
      const saveResponse = await window.electron.anythingLLM.writeMCPConfig(config);
      
      if (saveResponse.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Servidor añadido',
          detail: `${server.name} se ha añadido correctamente. Ve a "Agent Skills" → "MCP Servers" y haz clic en "Refresh" para ver los cambios.`,
          life: 7000
        });
        
        // Actualizar estado
        setMcpConfig(JSON.stringify(config, null, 2));
        setMcpServersList(Object.keys(config.mcpServers).map(name => ({
          name,
          ...config.mcpServers[name]
        })));
      } else {
        throw new Error(saveResponse.error || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      setMcpConfigError(error.message || 'Error al añadir el servidor');
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo añadir el servidor',
        life: 5000
      });
    } finally {
      setLoadingMCP(false);
    }
  }, [dataDir]);

  const handleConfirmPath = useCallback(() => {
    if (!pathInput.trim()) {
      setMcpConfigError('La ruta es obligatoria');
      return;
    }
    setShowPathDialog(false);
    const server = pendingServer;
    setPendingServer(null);
    
    // Si también requiere env, pedir env después
    if (server.requiresEnv) {
      setPendingServer(server);
      setEnvInput('');
      setEnvLabel(server.envLabel);
      setShowEnvDialog(true);
    } else {
      installServer(server, pathInput.trim());
    }
    setPathInput('');
  }, [pathInput, pendingServer, installServer]);

  const handleConfirmEnv = useCallback(() => {
    if (!envInput.trim()) {
      setMcpConfigError('El valor es obligatorio');
      return;
    }
    setShowEnvDialog(false);
    const server = pendingServer;
    setPendingServer(null);
    installServer(server, pathInput.trim() || null, envInput.trim());
    setEnvInput('');
    setPathInput('');
  }, [envInput, pendingServer, pathInput, installServer]);

  const handleAddCustomServer = useCallback(async () => {
    if (!customServerForm.name || !customServerForm.command) {
      setMcpConfigError('El nombre y el comando son obligatorios');
      return;
    }

    setLoadingMCP(true);
    setMcpConfigError(null);

    try {
      const response = await window.electron.anythingLLM.readMCPConfig();
      if (!response.success) {
        throw new Error(response.error || 'No se pudo leer la configuración');
      }

      const config = response.config || { mcpServers: {} };
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Parsear args (separados por comas o espacios)
      const args = customServerForm.args
        ? customServerForm.args.split(',').map(a => a.trim()).filter(a => a)
        : [];

      // Parsear env (formato: KEY1=value1,KEY2=value2)
      const env = {};
      if (customServerForm.env) {
        customServerForm.env.split(',').forEach(pair => {
          const [key, value] = pair.split('=').map(s => s.trim());
          if (key && value) {
            env[key] = value;
          }
        });
      }

      // Añadir servidor
      config.mcpServers[customServerForm.name] = {
        command: customServerForm.command,
        args: args,
        env: env
      };

      // Guardar
      const saveResponse = await window.electron.anythingLLM.writeMCPConfig(config);
      
      if (saveResponse.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Servidor añadido',
          detail: `${customServerForm.name} se ha añadido correctamente. Ve a "Agent Skills" → "MCP Servers" y haz clic en "Refresh" para ver los cambios.`,
          life: 7000
        });
        
        setMcpConfig(JSON.stringify(config, null, 2));
        setCustomServerForm({ name: '', command: '', args: '', env: '' });
        setMcpServersList(Object.keys(config.mcpServers).map(name => ({
          name,
          ...config.mcpServers[name]
        })));
      } else {
        throw new Error(saveResponse.error || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      setMcpConfigError(error.message || 'Error al añadir el servidor');
    } finally {
      setLoadingMCP(false);
    }
  }, [customServerForm]);

  const handleSaveMCPConfig = useCallback(async () => {
    setMcpConfigError(null);
    setLoadingMCP(true);

    try {
      // Validar JSON
      const parsed = JSON.parse(mcpConfig);
      
      // Validar estructura básica
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('La configuración debe ser un objeto JSON');
      }

      // Guardar configuración
      const response = await window.electron.anythingLLM.writeMCPConfig(parsed);
      
      if (response.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Configuración guardada',
          detail: 'La configuración MCP se ha guardado correctamente. Ve a "Agent Skills" → "MCP Servers" y haz clic en "Refresh" para ver los cambios.',
          life: 7000
        });
        setShowMCPDialog(false);
      } else {
        setMcpConfigError(response.error || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setMcpConfigError(`Error de sintaxis JSON: ${error.message}`);
      } else {
        setMcpConfigError(error.message || 'Error al guardar la configuración');
      }
    } finally {
      setLoadingMCP(false);
    }
  }, [mcpConfig]);

  const handleFormatJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(mcpConfig);
      setMcpConfig(JSON.stringify(parsed, null, 2));
      setMcpConfigError(null);
      toast.current?.show({
        severity: 'success',
        summary: 'JSON formateado',
        detail: 'El JSON se ha formateado correctamente',
        life: 2000
      });
    } catch (error) {
      setMcpConfigError(`Error de sintaxis JSON: ${error.message}`);
    }
  }, [mcpConfig]);

  const renderStatusCard = () => (
    <div className="anythingllm-status-card">
      <ProgressSpinner style={{ width: '40px', height: '40px' }} />
      <h3>Preparando AnythingLLM…</h3>
      <p>{status.message || 'Inicializando servicio local'}</p>
      <div className="anythingllm-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'mintplexlabs/anythingllm:latest'}</span>
        </div>
        <div>
          <span>Datos</span>
          <span>{status.dataDir || '---'}</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="anythingllm-error-card">
      <h3>Problema al iniciar AnythingLLM</h3>
      <p>{error}</p>
      <ul>
        <li>Verifica que Docker Desktop esté ejecutándose.</li>
        <li>Confirma tu conexión a Internet para descargar la imagen.</li>
        <li>Reintenta con el botón inferior.</li>
      </ul>
      <Button
        label="Reintentar"
        icon="pi pi-sync"
        severity="warning"
        onClick={startService}
      />
    </div>
  );

  const renderWebView = () => {
    if (!url) return null;
    
    const overlayClass = webviewState === 'ready' ? 'anythingllm-overlay fading' : 'anythingllm-overlay';
    
    return (
      <div className="anythingllm-webview-wrapper">
        {webviewState !== 'ready' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>{webviewState === 'error' ? 'Error cargando la UI' : 'Cargando interfaz de AnythingLLM…'}</p>
          </div>
        )}
        <webview
          key={`${url}-${reloadKey}`}
          ref={webviewRef}
          src={url}
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'transparent' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
        />
      </div>
    );
  };

  return (
    <div className="anythingllm-tab">
      <Toast ref={toast} />
      
      {error && renderError()}
      {!error && (!isReady || !url) && renderStatusCard()}
      {!error && isReady && url && renderWebView()}
      
      <div className="anythingllm-toolbar">
        <div className="anythingllm-status-pill">
          <span className={`state ${isReady ? 'ready' : 'pending'}`}>
            {isReady ? 'Listo' : 'Preparando'}
          </span>
        </div>
        <div className="anythingllm-actions">
          <Button
            icon="pi pi-sync"
            size="small"
            className="anythingllm-action-btn"
            onClick={startService}
            tooltip="Reintentar"
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-refresh"
            size="small"
            className="anythingllm-action-btn"
            disabled={!isReady}
            onClick={handleReloadWebView}
            tooltip="Recargar UI"
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-external-link"
            size="small"
            className="anythingllm-action-btn"
            disabled={!isReady || !url}
            onClick={handleOpenExternal}
            tooltip="Abrir en navegador"
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-cog"
            size="small"
            className="anythingllm-action-btn"
            onClick={handleOpenMCPDialog}
            tooltip="Editar configuración MCP"
            tooltipOptions={{ position: 'top' }}
          />
        </div>
      </div>

      {/* Diálogo de configuración MCP */}
      <Dialog
        header="⚙️ Configuración MCP de AnythingLLM"
        visible={showMCPDialog}
        style={{ width: '85vw', maxWidth: '1000px' }}
        contentStyle={{ 
          height: '75vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '0'
        }}
        modal
        onHide={() => setShowMCPDialog(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              {mcpConfigError && (
                <Message severity="error" text={mcpConfigError} style={{ marginRight: '1rem' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                label="Cerrar"
                icon="pi pi-times"
                onClick={() => setShowMCPDialog(false)}
                className="p-button-text"
              />
            </div>
          </div>
        }
      >
        {loadingMCP && !mcpConfig ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <ProgressSpinner />
          </div>
        ) : (
          <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Pestaña: Servidores Populares */}
            <TabPanel header="⭐ Servidores Populares">
              <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
                <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
                  Selecciona un servidor popular para añadirlo automáticamente a tu configuración:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {popularServers.map(server => {
                    const isInstalled = mcpServersList.some(s => s.name === server.id);
                    return (
                      <Card key={server.id} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <i className={`pi ${server.icon}`} style={{ fontSize: '1.2rem' }}></i>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>{server.name}</h3>
                            {isInstalled && (
                              <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                backgroundColor: 'var(--green-500)', 
                                color: 'white',
                                borderRadius: '10px',
                                marginLeft: 'auto'
                              }}>
                                Instalado
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
                            {server.description}
                          </p>
                          <Button
                            label={isInstalled ? "Reinstalar" : "Añadir"}
                            icon={isInstalled ? "pi pi-refresh" : "pi pi-plus"}
                            size="small"
                            onClick={() => handleAddPopularServer(server)}
                            disabled={loadingMCP}
                            style={{ marginTop: '0.5rem' }}
                            className={isInstalled ? "p-button-secondary" : ""}
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabPanel>

            {/* Pestaña: Añadir Personalizado */}
            <TabPanel header="➕ Añadir Personalizado">
              <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
                  <div className="p-field">
                    <label htmlFor="server-name">Nombre del servidor *</label>
                    <InputText
                      id="server-name"
                      value={customServerForm.name}
                      onChange={(e) => setCustomServerForm({ ...customServerForm, name: e.target.value })}
                      placeholder="ej: mi-servidor-mcp"
                    />
                  </div>
                  
                  <div className="p-field">
                    <label htmlFor="server-command">Comando *</label>
                    <InputText
                      id="server-command"
                      value={customServerForm.command}
                      onChange={(e) => setCustomServerForm({ ...customServerForm, command: e.target.value })}
                      placeholder="ej: npx, node, python, uvx"
                    />
                  </div>
                  
                  <div className="p-field">
                    <label htmlFor="server-args">Argumentos (separados por comas)</label>
                    <InputText
                      id="server-args"
                      value={customServerForm.args}
                      onChange={(e) => setCustomServerForm({ ...customServerForm, args: e.target.value })}
                      placeholder='ej: -y, @modelcontextprotocol/server-filesystem, /ruta'
                    />
                    <small style={{ opacity: 0.7 }}>Separa los argumentos con comas</small>
                  </div>
                  
                  <div className="p-field">
                    <label htmlFor="server-env">Variables de entorno (KEY=valor, separadas por comas)</label>
                    <InputText
                      id="server-env"
                      value={customServerForm.env}
                      onChange={(e) => setCustomServerForm({ ...customServerForm, env: e.target.value })}
                      placeholder="ej: API_KEY=mi-clave,TOKEN=mi-token"
                    />
                    <small style={{ opacity: 0.7 }}>Formato: KEY1=valor1,KEY2=valor2</small>
                  </div>
                  
                  <Button
                    label="Añadir Servidor"
                    icon="pi pi-plus"
                    onClick={handleAddCustomServer}
                    disabled={loadingMCP || !customServerForm.name || !customServerForm.command}
                    loading={loadingMCP}
                  />
                </div>
              </div>
            </TabPanel>

            {/* Pestaña: Diagnóstico */}
            <TabPanel header="🔍 Diagnóstico">
              <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
                <Button
                  label="Ejecutar Diagnóstico"
                  icon="pi pi-search"
                  onClick={async () => {
                    setLoadingMCP(true);
                    try {
                      const response = await window.electron.anythingLLM.diagnoseMCPConfig();
                      if (response.success) {
                        const diag = response.diagnostics;
                        const info = `
📁 Directorio de datos: ${diag.dataDir}
📂 Directorio plugins existe: ${diag.pluginsDirExists ? '✅ Sí' : '❌ No'}
📄 Archivo MCP principal existe: ${diag.mcpConfigExists ? '✅ Sí' : '❌ No'}
📄 Ruta del archivo principal: ${diag.mcpConfigPath || 'N/A'}
🐳 Contenedor corriendo: ${diag.containerRunning ? '✅ Sí' : '❌ No'}

📋 Archivos en directorio de datos:
${diag.files?.map(f => `  - ${f}`).join('\n') || 'Ninguno'}

${diag.mcpConfigContent ? `📝 Contenido de anythingllm_mcp_servers.json:\n${JSON.stringify(diag.mcpConfigContent, null, 2)}` : '❌ Archivo vacío o no existe'}

${diag.mcpJsonContent ? `📝 Contenido de mcp.json (raíz):\n${JSON.stringify(diag.mcpJsonContent, null, 2)}` : '❌ mcp.json no existe o está vacío'}

${diag.alternativeFiles?.length > 0 ? `📄 Archivos alternativos encontrados:\n${diag.alternativeFiles.map(f => `  - ${f.path}\n    Contenido: ${JSON.stringify(f.content, null, 2)}`).join('\n\n')}` : ''}
                        `.trim();
                        
                        alert(info);
                        console.log('Diagnóstico MCP:', diag);
                      } else {
                        alert('Error: ' + (response.error || 'No se pudo ejecutar el diagnóstico'));
                      }
                    } catch (error) {
                      alert('Error: ' + error.message);
                    } finally {
                      setLoadingMCP(false);
                    }
                  }}
                  disabled={loadingMCP}
                  style={{ marginBottom: '1rem' }}
                />
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Haz clic en el botón para ver información detallada sobre la configuración MCP,
                  incluyendo la ubicación de los archivos y su contenido.
                </p>
              </div>
            </TabPanel>

            {/* Pestaña: Editor Avanzado */}
            <TabPanel header="⚙️ Editor Avanzado">
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="mcp-config" style={{ fontWeight: 'bold' }}>
                    Configuración JSON de MCP Servers
                  </label>
                  <Button
                    label="Formatear JSON"
                    icon="pi pi-code"
                    size="small"
                    onClick={handleFormatJSON}
                    className="p-button-text"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <InputTextarea
                    id="mcp-config"
                    value={mcpConfig}
                    onChange={(e) => {
                      setMcpConfig(e.target.value);
                      setMcpConfigError(null);
                    }}
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '13px',
                      width: '100%',
                      height: '100%',
                      flex: 1,
                      resize: 'none',
                      overflow: 'auto'
                    }}
                    placeholder='{\n  "mcpServers": {\n    "mi-servidor": {\n      "command": "node",\n      "args": ["/ruta/al/servidor.js"],\n      "env": {}\n    }\n  }\n}'
                  />
                </div>
                
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--surface-ground)', 
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>
                  <strong>💡 Formato esperado:</strong>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem',
                    backgroundColor: 'var(--surface-card)',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    maxHeight: '150px'
                  }}>
{`{
  "mcpServers": {
    "nombre-servidor": {
      "command": "comando",
      "args": ["arg1", "arg2"],
      "env": {
        "VARIABLE": "valor"
      }
    }
  }
}`}
                  </pre>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Button
                      label="Guardar Cambios"
                      icon="pi pi-check"
                      onClick={handleSaveMCPConfig}
                      loading={loadingMCP}
                      disabled={loadingMCP}
                      size="small"
                    />
                  </div>
                  <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.85rem' }}>
                    <strong>Nota:</strong> Después de guardar, ve a la interfaz de AnythingLLM → "Agent Skills" → "MCP Servers" y haz clic en el botón <strong>"Refresh"</strong> para que los cambios surtan efecto.
                  </p>
                </div>
              </div>
            </TabPanel>
          </TabView>
        )}
      </Dialog>

      {/* Diálogo para pedir ruta */}
      <Dialog
        header="📁 Configurar Ruta"
        visible={showPathDialog}
        style={{ width: '600px' }}
        modal
        onHide={() => {
          setShowPathDialog(false);
          setPendingServer(null);
          setPathInput('');
        }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => {
                setShowPathDialog(false);
                setPendingServer(null);
                setPathInput('');
              }}
              className="p-button-text"
            />
            <Button
              label="Continuar"
              icon="pi pi-check"
              onClick={handleConfirmPath}
              disabled={!pathInput.trim()}
            />
          </div>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <label htmlFor="path-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {pendingServer?.pathLabel || 'Introduce la ruta:'}
          </label>
          <InputText
            id="path-input"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder={pendingServer?.pathLabel || 'ej: C:\\Users\\kalid\\Documents'}
            style={{ width: '100%' }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && pathInput.trim()) {
                handleConfirmPath();
              }
            }}
            autoFocus
          />
          
          {dataDir && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: 'var(--surface-ground)', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <strong>💡 Recomendación:</strong>
              <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                Para mejor compatibilidad con Docker, usa una carpeta dentro del directorio de datos de AnythingLLM:
              </p>
              <code style={{ 
                display: 'block', 
                padding: '0.5rem', 
                backgroundColor: 'var(--surface-card)', 
                borderRadius: '3px',
                marginTop: '0.5rem',
                wordBreak: 'break-all'
              }}>
                {dataDir}\\documents
              </code>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
                Esta carpeta ya está montada en el contenedor como <code>/app/server/storage/documents</code>
              </p>
            </div>
          )}

          {pendingServer?.requiresPath && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
              <strong>✨ Mapeo automático de volúmenes (como Guacamole):</strong>
              <p style={{ margin: '0.25rem 0' }}>
                Si usas una ruta externa (ej: <code>C:\Users\kalid\Documents</code>), 
                el sistema <strong>mapeará automáticamente</strong> esa carpeta como volumen en el contenedor Docker.
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', opacity: 0.9 }}>
                ✅ La carpeta se montará como <code>/mnt/host/documents</code> dentro del contenedor
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                ⚠️ El contenedor se reiniciará automáticamente para aplicar el nuevo volumen.
              </p>
            </div>
          )}
          
          {pendingServer?.requiresEnv && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
              Después de la ruta, se te pedirá la API key o token necesario.
            </p>
          )}
        </div>
      </Dialog>

      {/* Diálogo para pedir variable de entorno */}
      <Dialog
        header="🔑 Configurar Variable de Entorno"
        visible={showEnvDialog}
        style={{ width: '500px' }}
        modal
        onHide={() => {
          setShowEnvDialog(false);
          setPendingServer(null);
          setEnvInput('');
        }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => {
                setShowEnvDialog(false);
                setPendingServer(null);
                setEnvInput('');
              }}
              className="p-button-text"
            />
            <Button
              label="Continuar"
              icon="pi pi-check"
              onClick={handleConfirmEnv}
              disabled={!envInput.trim()}
            />
          </div>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <label htmlFor="env-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {envLabel || 'Variable de entorno:'}
          </label>
          <Password
            id="env-input"
            value={envInput}
            onChange={(e) => setEnvInput(e.target.value)}
            placeholder={`Introduce el valor para ${envLabel}`}
            style={{ width: '100%' }}
            feedback={false}
            toggleMask
            onKeyPress={(e) => {
              if (e.key === 'Enter' && envInput.trim()) {
                handleConfirmEnv();
              }
            }}
            inputStyle={{ width: '100%' }}
            autoFocus
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
            Este valor se almacenará de forma segura en la configuración.
          </p>
        </div>
      </Dialog>
    </div>
  );
};

export default AnythingLLMTab;

