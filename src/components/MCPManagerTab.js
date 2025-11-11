import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import MCPCatalog from './MCPCatalog';
import mcpClient from '../services/MCPClientService';

const MCPManagerTab = ({ themeColors }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const toastRef = React.useRef(null);
  const [showInstalledDialog, setShowInstalledDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [editingConfig, setEditingConfig] = useState({});

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
      const freshServers = mcpClient.getServers();
      setServers(freshServers);
      setStats(mcpClient.getStats());
      
      // Verificar si hay un servidor pendiente de seleccionar
      const pendingServerId = window.__mcpConfigSelectServer;
      if (pendingServerId) {
        console.log('🔍 [MCP Manager] loadData: Servidor pendiente detectado:', pendingServerId);
        const server = freshServers.find(s => s.id === pendingServerId);
        if (server) {
          console.log('✅ [MCP Manager] loadData: Abriendo configuración para:', pendingServerId);
          setTimeout(() => {
            openConfigFor(server);
            window.__mcpConfigSelectServer = null;
          }, 100);
        }
      }
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

  const sanitizeFilesystemPath = (rawPath) => {
    if (Array.isArray(rawPath)) {
      return sanitizeFilesystemPath(rawPath[0]);
    }
    if (rawPath && typeof rawPath === 'object') {
      const firstValue = Object.values(rawPath)[0];
      return sanitizeFilesystemPath(firstValue);
    }
    if (typeof rawPath !== 'string') {
      return '';
    }
    const trimmed = rawPath.trim();
    if (!trimmed) {
      return '';
    }
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const stringifyArgsArray = (argsArray) => {
    if (!Array.isArray(argsArray)) {
      return '';
    }
    return argsArray
      .map((arg) => {
        if (arg === undefined || arg === null) {
          return '';
        }
        const value = String(arg);
        if (!value) {
          return '';
        }
        if (/\s/.test(value)) {
          const escaped = value.replace(/"/g, '\\"');
          return `"${escaped}"`;
        }
        return value;
      })
      .filter(Boolean)
      .join(' ');
  };

  const buildFilesystemArgsString = (path) => {
    const sanitizedPath = sanitizeFilesystemPath(path);
    const argsList = ['-y', '@modelcontextprotocol/server-filesystem'];
    if (sanitizedPath) {
      argsList.push(sanitizedPath);
    }
    return stringifyArgsArray(argsList);
  };

  const updateFilesystemAllowedPath = (rawValue) => {
    const normalized = sanitizeFilesystemPath(rawValue);
    setEditingConfig((prev) => {
      const nextConfigValues = { ...(prev.configValues || {}) };
      nextConfigValues.allowedPaths = normalized;
      const targetId = (selectedServer?.id || prev?.mcp?.id || '').toLowerCase();
      if (targetId === 'filesystem') {
        return {
          ...prev,
          configValues: nextConfigValues,
          args: buildFilesystemArgsString(normalized)
        };
      }
      return {
        ...prev,
        configValues: nextConfigValues
      };
    });
  };

  const handleBrowseFilesystemPath = async () => {
    const targetId = (selectedServer?.id || editingConfig?.mcp?.id || '').toLowerCase();
    if (targetId !== 'filesystem') {
      return;
    }
    try {
      if (
        typeof window === 'undefined' ||
        !window?.electron?.dialog?.showOpenDialog
      ) {
        showToast('warn', 'No disponible', 'El selector de directorios requiere la app de escritorio');
        return;
      }
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar directorio permitido'
      });
      if (result && !result.canceled) {
        const selectedPath =
          (Array.isArray(result.filePaths) && result.filePaths[0]) ||
          result.filePath ||
          null;
        if (selectedPath) {
          updateFilesystemAllowedPath(selectedPath);
        }
      }
    } catch (error) {
      console.error('Error abriendo dialog:', error);
      showToast('error', 'Error', 'No se pudo abrir el selector de directorio');
    }
  };

  const openConfigFor = (server) => {
    setSelectedServer(server);
    // Obtener MCP del catálogo para ver configSchema
    // FORZAR recarga del catálogo cada vez para evitar cache de require
    try {
      const catalogPath = require.resolve('../data/mcp-catalog.json');
      delete require.cache[catalogPath];
    } catch (e) {
      // Ignore if path resolution fails
    }
    const mcpData = require('../data/mcp-catalog.json');
    const mcp = mcpData.mcps?.find(m => m.id === server.id);
    console.log('[MCP Manager] openConfigFor - MCP cargado:', { serverId: server.id, mcpFound: !!mcp, hasConfigSchema: !!mcp?.configSchema });
    
    // Mapear valores guardados a configSchema
    const configValues = {};
    const isNative = server?.config?.type === 'native';

    if (isNative) {
      const nativeOptions = server.config?.options || {};
      const api = nativeOptions.api || {};
      configValues.mode = server.config?.mode || 'scraping';
      configValues.renderMode = server.config?.renderMode || 'static';
      configValues.maxResults = nativeOptions.maxResults !== undefined ? String(nativeOptions.maxResults) : '';
      configValues.timeoutMs = nativeOptions.timeoutMs !== undefined ? String(nativeOptions.timeoutMs) : '';
      configValues.maxContentLength = nativeOptions.maxContentLength !== undefined ? String(nativeOptions.maxContentLength) : '';
      configValues.userAgent = nativeOptions.userAgent || '';
      configValues.allowedDomains = (server.config?.allowedDomains || []).join(', ');
      configValues.apiEndpoint = api.endpoint || '';
      configValues.apiKey = api.key || '';
      configValues.apiProvider = api.provider || '';
    } else if (mcp?.configSchema) {
      for (const [key, schema] of Object.entries(mcp.configSchema)) {
        if (schema.envName && server.config?.env?.[schema.envName]) {
          configValues[key] = server.config.env[schema.envName];
        } else if (server.config?.configValues?.[key]) {
          configValues[key] = server.config.configValues[key];
        } else if (mcp.recommendedConfig && mcp.recommendedConfig[key] !== undefined) {
          // Si no existe el valor pero hay una configuración recomendada, usarla
          configValues[key] = mcp.recommendedConfig[key];
        }
      }
    }
    
    // 🔧 ARREGLADO: Al convertir args a string, envolver en comillas si hay espacios
    let argsStr = '';
    if (!isNative && server?.config?.args) {
      if (Array.isArray(server.config.args)) {
        argsStr = server.config.args.map(arg => {
          // Si el argumento contiene espacios, envolverlo en comillas dobles
          return arg.includes(' ') ? `"${arg}"` : arg;
        }).join(' ');
      } else {
        argsStr = server.config.args;
      }
    }

    if (!isNative && server?.id === 'filesystem') {
      const candidates = [
        configValues.allowedPaths,
        server?.config?.configValues?.allowedPaths,
        server?.config?.allowedPaths,
        server?.config?.options?.allowedPaths,
        server?.allowedPaths
      ];

      let normalizedPath = '';
      for (const candidate of candidates) {
        const sanitized = sanitizeFilesystemPath(candidate);
        if (sanitized) {
          normalizedPath = sanitized;
          break;
        }
      }

      if (!normalizedPath && server?.config?.args) {
        let parsedArgs = [];
        if (Array.isArray(server.config.args)) {
          parsedArgs = server.config.args;
        } else if (typeof server.config.args === 'string') {
          const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
          let match;
          while ((match = regex.exec(server.config.args)) !== null) {
            parsedArgs.push(match[1] || match[2] || match[0]);
          }
        }
        if (parsedArgs.length >= 3) {
          normalizedPath = sanitizeFilesystemPath(parsedArgs[2]);
        }
      }

      configValues.allowedPaths = normalizedPath;
      argsStr = buildFilesystemArgsString(normalizedPath);
    }
    
    setEditingConfig({
      type: server?.config?.type || 'external',
      command: isNative ? '' : (server?.config?.command || 'npx'),
      args: argsStr,
      enabled: !!server?.config?.enabled,
      autostart: !!server?.config?.autostart,
      autoRestart: server?.config?.autoRestart !== false,
      configValues,
      mcp
    });
    setShowConfigDialog(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedServer) return;
    const isNative = editingConfig.type === 'native';
    const configValues = editingConfig.configValues || {};
    let payload;

    if (isNative) {
      const configValues = editingConfig.configValues || {};
      const mode = (configValues.mode || 'scraping').toLowerCase() === 'api' ? 'api' : 'scraping';
      const renderMode = (configValues.renderMode || 'static').toLowerCase() === 'rendered' ? 'rendered' : 'static';
      const parseNumber = (value, fallback) => {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : fallback;
      };

      const allowedDomains = (configValues.allowedDomains || '')
        .split(',')
        .map(domain => domain.trim())
        .filter(Boolean);

      payload = {
        type: 'native',
        enabled: !!editingConfig.enabled,
        autostart: !!editingConfig.autostart,
        renderMode,
        mode,
        allowedDomains,
        options: {
          maxResults: parseNumber(configValues.maxResults, 5),
          timeoutMs: parseNumber(configValues.timeoutMs, 5000),
          maxContentLength: parseNumber(configValues.maxContentLength, 200000),
          userAgent: configValues.userAgent || undefined,
          api: {
            endpoint: configValues.apiEndpoint || '',
            key: configValues.apiKey || '',
            provider: configValues.apiProvider || ''
          }
        }
      };
    } else {
      // Construir payload base para servidores externos
      
      let parsedArgs = [];
      
      // 🔧 ESPECIAL: Para filesystem, construir args automáticamente desde allowedPaths
      if (selectedServer.id === 'filesystem') {
        const normalizedPath = sanitizeFilesystemPath(editingConfig.configValues?.allowedPaths);
        parsedArgs = [
          '-y',
          '@modelcontextprotocol/server-filesystem'
        ];
        if (normalizedPath) {
          parsedArgs.push(normalizedPath);
        }
        console.log('[MCP Manager] Args construidos automáticamente para filesystem:', parsedArgs);
      } else {
        // Para otros MCPs, parsear args respetando comillas y paths con espacios
        if (typeof editingConfig.args === 'string') {
          const argsStr = editingConfig.args.trim();
          if (argsStr) {
            // Parser simple que respeta comillas simples y dobles
            const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
            let match;
            while ((match = regex.exec(argsStr)) !== null) {
              // match[1] para comillas dobles, match[2] para simples, match[0] para sin comillas
              parsedArgs.push(match[1] || match[2] || match[0]);
            }
          }
        } else if (Array.isArray(editingConfig.args)) {
          parsedArgs = editingConfig.args;
        }
      }
      
      payload = {
        command: editingConfig.command || 'npx',
        args: parsedArgs,
        enabled: !!editingConfig.enabled,
        autostart: !!editingConfig.autostart,
        autoRestart: !!editingConfig.autoRestart
      };
    }
    
    // Mapear configSchema → env/configValues para persistir correctamente
    try {
      const mcp = editingConfig.mcp || null;
      const env = {};
      
      // Función helper para agregar flags de PowerShell por defecto a ALLOWED_FLAGS
      const ensurePowerShellFlags = (flagsStr) => {
        if (!flagsStr || flagsStr.trim() === '' || flagsStr.toLowerCase() === 'all') {
          return flagsStr; // No modificar si está vacío o es 'all'
        }
        const defaultPowerShellFlags = ['-command', '-Command', '-ExecutionPolicy', '-NoProfile', '-NonInteractive'];
        const existingFlags = flagsStr.split(',').map(f => f.trim()).filter(Boolean);
        const existingLower = existingFlags.map(f => f.toLowerCase());
        
        // Agregar flags de PowerShell que no estén ya presentes
        defaultPowerShellFlags.forEach(flag => {
          if (!existingLower.includes(flag.toLowerCase())) {
            existingFlags.push(flag);
          }
        });
        
        return existingFlags.join(',');
      };
      
      // Procesar configValues y asegurar flags de PowerShell para cli-mcp-server
      const processedConfigValues = { ...configValues };
      if (selectedServer.id === 'cli-mcp-server' && processedConfigValues.ALLOWED_FLAGS !== undefined) {
        if (!processedConfigValues.ALLOWED_FLAGS || processedConfigValues.ALLOWED_FLAGS.trim() === '') {
          // Si está vacío, usar la configuración recomendada del catálogo si existe
          if (mcp && mcp.recommendedConfig && mcp.recommendedConfig.ALLOWED_FLAGS) {
            processedConfigValues.ALLOWED_FLAGS = mcp.recommendedConfig.ALLOWED_FLAGS;
          }
        } else {
          // Si tiene valor, asegurar que incluye flags de PowerShell
          processedConfigValues.ALLOWED_FLAGS = ensurePowerShellFlags(processedConfigValues.ALLOWED_FLAGS);
        }
      }
      
      if (!isNative && mcp && mcp.configSchema) {
        for (const [key, schema] of Object.entries(mcp.configSchema)) {
          const raw = processedConfigValues[key];
          if (raw === undefined || raw === null || raw === '') continue;
          
          let value = raw;
          if (schema.type === 'array') {
            value = Array.isArray(raw) ? raw.join(',') : String(raw).split(',').map(v => v.trim()).join(',');
          } else if (schema.type === 'boolean') {
            value = raw ? 'true' : 'false';
          } else {
            value = String(raw);
          }
          
          if (schema.envName) {
            env[schema.envName] = value;
          }
        }
      }
      
      if (Object.keys(env).length > 0) {
        payload.env = env;
      }
      
      // Si es cli-mcp-server (o runtime python) y tenemos ALLOWED_DIR, establecer cwd para persistir el directorio
      const allowedDir = (payload.env && payload.env.ALLOWED_DIR) ? payload.env.ALLOWED_DIR : undefined;
      const isCli = selectedServer.id === 'cli-mcp-server' || (mcp && mcp.runtime === 'python');
      if (isCli && allowedDir && allowedDir.trim().length > 0) {
        payload.cwd = allowedDir;
      }
      
      // Guardar también los valores visibles por si la UI los requiere (con valores procesados)
      if (selectedServer.id === 'filesystem') {
        const normalizedPath = sanitizeFilesystemPath(processedConfigValues.allowedPaths);
        const allowedPathsArray = normalizedPath ? [normalizedPath] : [];
        payload.configValues = {
          ...processedConfigValues,
          allowedPaths: allowedPathsArray
        };
        if (allowedPathsArray.length > 0) {
          payload.allowedPaths = allowedPathsArray;
        } else {
          delete payload.allowedPaths;
        }
      } else {
        payload.configValues = processedConfigValues;
      }
    } catch (e) {
      console.warn('[MCP Manager] No se pudieron mapear configValues/env:', e?.message);
    }
    
    // Cerrar inmediatamente para evitar el “doble clic” perceptivo; reabrir solo si falla
    setShowConfigDialog(false);
    const result = await mcpClient.updateServerConfig(selectedServer.id, payload);
    if (result?.success) {
      showToast('success', 'Guardado', 'Configuración actualizada');
      setSelectedServer(null);
      await loadData();
    } else {
      // Reabrir si hubo error para que el usuario pueda corregir
      setShowConfigDialog(true);
      showToast('error', 'Error', result?.error || 'No se pudo guardar');
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
        <Button
          label="Ver instalados"
          icon="pi pi-server"
          onClick={() => setShowInstalledDialog(true)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${themeColors.borderColor}`,
            color: themeColors.textPrimary,
            borderRadius: '8px',
            fontSize: '0.85rem',
            padding: '0.65rem 1.0rem',
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
      {/* Diálogo: MCPs Instalados */}
      <Dialog
        header={`MCPs Instalados (${servers.length})`}
        visible={showInstalledDialog}
        onHide={() => setShowInstalledDialog(false)}
        style={{ width: '900px', maxWidth: '95vw' }}
        contentStyle={{ background: themeColors.cardBackground, maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {servers.length === 0 ? (
            <div style={{ textAlign: 'center', color: themeColors.textSecondary, padding: '1rem' }}>
              No hay MCPs instalados
            </div>
          ) : (
            servers.map(server => (
              <div key={server.id} style={{
                background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
                border: `2px solid ${server.running ? 'rgba(100, 200, 100, 0.5)' : themeColors.borderColor}`,
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: themeColors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {server.id}
                      </h4>
                      {server.running && (
                        <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(100, 200, 100, 0.2)', border: '1px solid rgba(100, 200, 100, 0.5)', borderRadius: '10px', color: '#66bb6a', fontWeight: '600' }}>
                          ACTIVO
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: themeColors.textSecondary }}>Estado: <span style={{ color: server.running ? '#66bb6a' : '#9e9e9e', fontWeight: '500' }}>{server.state || 'stopped'}</span></p>
                  </div>
                  <InputSwitch checked={server.config?.enabled} onChange={() => handleToggleServer(server.id, server.config?.enabled)} style={{ transform: 'scale(0.9)' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {server.config?.enabled && !server.running && (
                    <Button label="Iniciar" icon="pi pi-play" onClick={() => handleStartServer(server.id)} style={{ flex: 1, background: 'rgba(100, 200, 100, 0.2)', border: '1px solid rgba(100, 200, 100, 0.5)', color: '#66bb6a', borderRadius: '8px' }} />
                  )}
                  {server.running && (
                    <Button label="Detener" icon="pi pi-stop" onClick={() => handleStopServer(server.id)} style={{ flex: 1, background: 'rgba(255, 193, 7, 0.2)', border: '1px solid rgba(255, 193, 7, 0.5)', color: '#ffc107', borderRadius: '8px' }} />
                  )}
                  <Button label="Configurar" icon="pi pi-cog" onClick={() => openConfigFor(server)} style={{ flex: 1, background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px' }} />
                  <Button icon="pi pi-trash" onClick={() => handleUninstall(server.id)} tooltip="Desinstalar" tooltipOptions={{ position: 'top' }} style={{ background: 'rgba(244, 67, 54, 0.2)', border: '1px solid rgba(244, 67, 54, 0.5)', color: '#f44336', borderRadius: '8px', minWidth: 'auto', aspectRatio: '1' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* Diálogo: Configurar MCP */}
      <Dialog
        header={selectedServer ? `Configurar ${selectedServer.id}` : 'Configurar MCP'}
        visible={showConfigDialog}
        onHide={() => setShowConfigDialog(false)}
        style={{ width: '700px', maxWidth: '95vw' }}
        contentStyle={{ background: themeColors.cardBackground, maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sección: Comando y Toggles */}
          <div style={{ borderBottom: `1px solid ${themeColors.borderColor}`, paddingBottom: '1rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: themeColors.textPrimary }}>Configuración General</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {editingConfig.type !== 'native' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: themeColors.textSecondary, display: 'block', marginBottom: '0.3rem' }}>Comando</label>
                  <InputText value={editingConfig.command || ''} onChange={(e) => setEditingConfig({ ...editingConfig, command: e.target.value })} style={{ width: '100%' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: themeColors.textSecondary }}>Opciones</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <InputSwitch checked={!!editingConfig.enabled} onChange={(e) => setEditingConfig({ ...editingConfig, enabled: e.value })} />
                    <span style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <InputSwitch checked={!!editingConfig.autostart} onChange={(e) => setEditingConfig({ ...editingConfig, autostart: e.value })} />
                    <span style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>Autostart</span>
                  </div>
                </div>
              </div>
            </div>
            {editingConfig.type !== 'native' && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: themeColors.textSecondary, display: 'block', marginBottom: '0.3rem' }}>Args (separados por espacios)</label>
                <InputTextarea value={editingConfig.args || ''} onChange={(e) => setEditingConfig({ ...editingConfig, args: e.target.value })} rows={2} style={{ width: '100%', fontSize: '0.75rem' }} />
              </div>
            )}
          </div>

          {/* Sección: Configuración Específica del MCP */}
          {editingConfig.mcp?.configSchema && (
            <div>
              <h4 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: themeColors.textPrimary }}>Configuración de {editingConfig.mcp.name}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(editingConfig.mcp.configSchema).map(([key, schema]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500', color: themeColors.textPrimary }}>
                      {key} {schema.required && <span style={{ color: '#f44336' }}>*</span>}
                    </label>
                    {schema.description && <p style={{ margin: 0, fontSize: '0.7rem', color: themeColors.textSecondary }}>{schema.description}</p>}
                    {schema.type === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <InputSwitch checked={!!editingConfig.configValues?.[key]} onChange={(e) => setEditingConfig({ ...editingConfig, configValues: { ...editingConfig.configValues, [key]: e.value } })} />
                        <span style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>{editingConfig.configValues?.[key] ? 'Sí' : 'No'}</span>
                      </div>
                    ) : key === 'allowedPaths' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <InputText 
                          type='text' 
                          value={sanitizeFilesystemPath(editingConfig.configValues?.[key])} 
                          onChange={(e) => updateFilesystemAllowedPath(e.target.value)} 
                          placeholder="C:\path\to\directory"
                          style={{ flex: 1, fontSize: '0.75rem' }} 
                        />
                        <Button 
                          icon="pi pi-folder-open" 
                          onClick={handleBrowseFilesystemPath}
                          tooltip="Explorar..."
                          tooltipOptions={{ position: 'top' }}
                          style={{ 
                            background: 'rgba(33, 150, 243, 0.2)', 
                            border: '1px solid rgba(33, 150, 243, 0.5)', 
                            color: '#2196f3', 
                            borderRadius: '8px',
                            minWidth: 'auto',
                            aspectRatio: '1'
                          }} 
                        />
                      </div>
                    ) : schema.type === 'array' ? (
                      <InputTextarea value={editingConfig.configValues?.[key] || ''} onChange={(e) => setEditingConfig({ ...editingConfig, configValues: { ...editingConfig.configValues, [key]: e.target.value } })} placeholder={schema.example ? `Ejemplo: ${schema.example.join(', ')}` : 'Separar con comas'} rows={2} style={{ width: '100%', fontSize: '0.75rem' }} />
                    ) : (
                      <InputText type={schema.secret ? 'password' : 'text'} value={editingConfig.configValues?.[key] || ''} onChange={(e) => setEditingConfig({ ...editingConfig, configValues: { ...editingConfig.configValues, [key]: e.target.value } })} placeholder={schema.example || `Ingresa ${key}`} style={{ width: '100%', fontSize: '0.75rem' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: `1px solid ${themeColors.borderColor}`, paddingTop: '0.75rem' }}>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowConfigDialog(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, color: themeColors.textPrimary, borderRadius: '8px' }} />
            <Button label="Guardar" icon="pi pi-save" onClick={handleSaveConfig} style={{ flex: 1, background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px' }} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MCPManagerTab;

