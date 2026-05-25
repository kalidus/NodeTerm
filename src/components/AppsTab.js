import React, { useState, useEffect, useRef } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import AIClientBrandIcon from './AIClientBrandIcon';
import '../styles/components/ai-clients-tab.css'; // Reusar y ampliar estilos existentes

const CATEGORIES = [
  {
    key: 'connectivity',
    label: 'Conectividad & Sistemas',
    emoji: '🔌',
    description: 'Herramientas de conexión remota y virtualización de terminales',
    clients: ['rdp']
  },
  {
    key: 'cli',
    label: 'CLI Local',
    emoji: '🖥️',
    description: 'Herramientas de IA que se ejecutan como proceso local en tu terminal',
    clients: ['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli']
  },
  {
    key: 'webapps',
    label: 'Aplicaciones Web de IA',
    emoji: '🌐',
    description: 'Interfaces web completas que se ejecutan en contenedores Docker',
    clients: ['anythingllm', 'openwebui', 'librechat', 'agentzero', 'openclaw', 'opennotebook']
  }
];

const AI_CLIENTS_STORAGE_KEY = 'ai_clients_enabled';

/**
 * Componente unificado "AppsTab" (Tienda de APPs) para NodeTerm.
 * Fusiona RDP y Clientes de IA en una única interfaz premium estilo tienda.
 */
const AppsTab = ({
  themeColors,
  rdpIdleMinutes,
  setRdpIdleMinutes,
  rdpSessionActivityMinutes,
  setRdpSessionActivityMinutes,
  rdpResizeDebounceMs,
  setRdpResizeDebounceMs,
  rdpResizeAckTimeoutMs,
  setRdpResizeAckTimeoutMs,
  rdpGuacdInactivityMs,
  setRdpGuacdInactivityMs,
  guacdPreferredMethod,
  setGuacdPreferredMethod,
  guacdStatus,
  guacdRestarting,
  handleRestartGuacd,
  handleResetRdpDefaults,
  methodOptions
}) => {
  const toast = useRef(null);

  // Estado para cada cliente de IA
  const [clients, setClients] = useState({
    claude: false,
    opencode: false,
    geminicli: false,
    codexcli: false,
    antigravitycli: false,
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false,
    opennotebook: false
  });

  // Estado de RDP (siempre activo en NodeTerm por defecto)
  const [rdpEnabled, setRdpEnabled] = useState(true);

  // Estado de carga para verificar servicios Docker
  const [dockerStatus, setDockerStatus] = useState({
    anythingllm: { loading: false, running: false, updateAvailable: false, error: null },
    openwebui: { loading: false, running: false, updateAvailable: false, error: null },
    librechat: { loading: false, running: false, updateAvailable: false, error: null },
    agentzero: { loading: false, running: false, updateAvailable: false, error: null },
    openclaw: { loading: false, running: false, updateAvailable: false, error: null },
    opennotebook: { loading: false, running: false, updateAvailable: false, error: null }
  });

  const [claudeCliStatus, setClaudeCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });
  const [openCodeCliStatus, setOpenCodeCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });
  const [geminiCliStatus, setGeminiCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [geminiApiKeySaved, setGeminiApiKeySaved] = useState(false);
  const [codexCliStatus, setCodexCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });
  const [codexApiKeyInput, setCodexApiKeyInput] = useState('');
  const [codexApiKeySaved, setCodexApiKeySaved] = useState(false);
  const [antigravityCliStatus, setAntigravityCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });

  // Estados para configuración detallada de los CLIs
  const [claudeConfig, setClaudeConfig] = useState({ binaryPath: '', defaultModel: '', extraArgs: '', authToken: '' });
  const [openCodeConfig, setOpenCodeConfig] = useState({ binaryPath: '', extraArgs: '' });
  const [geminiCliConfig, setGeminiCliConfig] = useState({ binaryPath: '', extraArgs: '', apiKey: '' });
  const [codexCliConfig, setCodexCliConfig] = useState({ binaryPath: '', extraArgs: '', apiKey: '' });
  const [antigravityCliConfig, setAntigravityCliConfig] = useState({ binaryPath: '', extraArgs: '' });

  // UI state
  const [collapsedSections, setCollapsedSections] = useState({});
  const [expandedConfigs, setExpandedConfigs] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleConfig  = (key) => setExpandedConfigs(prev => ({ ...prev, [key]: !prev[key] }));

  // Cargar configuración desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(AI_CLIENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClients(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('[AppsTab] Error al cargar configuración:', error);
      }
    }

    checkClaudeCliStatus();
    checkOpenCodeCliStatus();
    checkGeminiCliStatus();
    checkCodexCliStatus();
    checkAntigravityCliStatus();
  }, []);

  // Cargar configuraciones detalladas desde el proceso principal
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [claude, opencode, gemini, codex, antigravity] = await Promise.all([
          window.electron?.claude?.getConfig?.(),
          window.electron?.opencode?.getConfig?.(),
          window.electron?.geminicli?.getConfig?.(),
          window.electron?.codexcli?.getConfig?.(),
          window.electron?.antigravitycli?.getConfig?.()
        ]);

        if (claude) setClaudeConfig({ ...claude, authToken: '' });
        if (opencode) setOpenCodeConfig(opencode);
        if (gemini) setGeminiCliConfig({ ...gemini, apiKey: '' });
        if (codex) setCodexCliConfig({ ...codex, apiKey: '' });
        if (antigravity) setAntigravityCliConfig(antigravity);
      } catch (error) {
        console.error('[AppsTab] Error al cargar configuraciones detalladas:', error);
      }
    };
    loadConfigs();
  }, []);

  // Verificar estado de servicios Docker al montar y cuando cambian los toggles
  useEffect(() => {
    const dockerKeys = ['anythingllm', 'openwebui', 'librechat', 'agentzero', 'openclaw', 'opennotebook'];
    dockerKeys.forEach(key => {
      if (clients[key]) {
        checkDockerServiceStatus(key);
      }
    });
  }, [
    clients.anythingllm,
    clients.openwebui,
    clients.librechat,
    clients.agentzero,
    clients.openclaw,
    clients.opennotebook
  ]);

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

  const checkGeminiCliStatus = async () => {
    setGeminiCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [result, cfg] = await Promise.all([
        window.electron?.geminicli?.getCliStatus?.(),
        window.electron?.geminicli?.getConfig?.()
      ]);
      if (result?.success) {
        setGeminiCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
        setGeminiApiKeySaved(cfg?.apiKey === '********');
      } else {
        setGeminiCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar Gemini CLI'
        }));
      }
    } catch (error) {
      setGeminiCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar Gemini CLI'
      }));
    }
  };

  const installGeminiCli = async () => {
    setGeminiCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.geminicli?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar Gemini CLI');
      }
      await checkGeminiCliStatus();
      return true;
    } catch (error) {
      setGeminiCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar Gemini CLI'
      }));
      return false;
    }
  };

  const saveGeminiApiKey = async () => {
    try {
      const current = await window.electron?.geminicli?.getConfig?.();
      const result = await window.electron?.geminicli?.setConfig?.({
        binaryPath: current?.binaryPath || '',
        extraArgs: current?.extraArgs || '',
        apiKey: geminiApiKeyInput || ''
      });

      if (result?.success) {
        setGeminiApiKeySaved(!!geminiApiKeyInput.trim());
        setGeminiApiKeyInput('');
      } else {
        setGeminiCliStatus(prev => ({
          ...prev,
          error: result?.error || 'No se pudo guardar la API key'
        }));
      }
    } catch (error) {
      setGeminiCliStatus(prev => ({
        ...prev,
        error: error.message || 'No se pudo guardar la API key'
      }));
    }
  };

  const checkCodexCliStatus = async () => {
    setCodexCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [result, cfg] = await Promise.all([
        window.electron?.codexcli?.getCliStatus?.(),
        window.electron?.codexcli?.getConfig?.()
      ]);
      if (result?.success) {
        setCodexCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
        setCodexApiKeySaved(cfg?.apiKey === '********');
      } else {
        setCodexCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar Codex CLI'
        }));
      }
    } catch (error) {
      setCodexCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar Codex CLI'
      }));
    }
  };

  const installCodexCli = async () => {
    setCodexCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.codexcli?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar Codex CLI');
      }
      await checkCodexCliStatus();
      return true;
    } catch (error) {
      setCodexCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar Codex CLI'
      }));
      return false;
    }
  };

  const saveCodexApiKey = async () => {
    try {
      const current = await window.electron?.codexcli?.getConfig?.();
      const result = await window.electron?.codexcli?.setConfig?.({
        binaryPath: current?.binaryPath || '',
        extraArgs: current?.extraArgs || '',
        apiKey: codexApiKeyInput || ''
      });

      if (result?.success) {
        setCodexApiKeySaved(!!codexApiKeyInput.trim());
        setCodexApiKeyInput('');
      } else {
        setCodexCliStatus(prev => ({
          ...prev,
          error: result?.error || 'No se pudo guardar la API key'
        }));
      }
    } catch (error) {
      setCodexCliStatus(prev => ({
        ...prev,
        error: error.message || 'No se pudo guardar la API key'
      }));
    }
  };

  const checkAntigravityCliStatus = async () => {
    setAntigravityCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.electron?.antigravitycli?.getCliStatus?.();
      if (result?.success) {
        setAntigravityCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
      } else {
        setAntigravityCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar Antigravity CLI'
        }));
      }
    } catch (error) {
      setAntigravityCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar Antigravity CLI'
      }));
    }
  };

  const installAntigravityCli = async () => {
    setAntigravityCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.antigravitycli?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar Antigravity CLI');
      }
      await checkAntigravityCliStatus();
      return true;
    } catch (error) {
      setAntigravityCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar Antigravity CLI'
      }));
      return false;
    }
  };

  const handleSaveClaudeConfig = async () => {
    try {
      const validation = await window.electron?.claude?.validateConfig?.(claudeConfig);
      if (validation && validation.valid === false) {
        setClaudeCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.claude?.setConfig?.(claudeConfig);
      if (result?.success) {
        setClaudeConfig(prev => ({ ...prev, authToken: '' }));
        setClaudeCliStatus(prev => ({ ...prev, error: null }));
        await checkClaudeCliStatus();
      } else {
        setClaudeCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setClaudeCliStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleSaveOpenCodeConfig = async () => {
    try {
      const validation = await window.electron?.opencode?.validateConfig?.(openCodeConfig);
      if (validation && validation.valid === false) {
        setOpenCodeCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.opencode?.setConfig?.(openCodeConfig);
      if (result?.success) {
        setOpenCodeCliStatus(prev => ({ ...prev, error: null }));
        await checkOpenCodeCliStatus();
      } else {
        setOpenCodeCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setOpenCodeCliStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleSaveGeminiCliConfig = async () => {
    try {
      const validation = await window.electron?.geminicli?.validateConfig?.(geminiCliConfig);
      if (validation && validation.valid === false) {
        setGeminiCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.geminicli?.setConfig?.(geminiCliConfig);
      if (result?.success) {
        setGeminiCliConfig(prev => ({ ...prev, apiKey: '' }));
        setGeminiCliStatus(prev => ({ ...prev, error: null }));
        await checkGeminiCliStatus();
      } else {
        setGeminiCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setGeminiCliStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleSaveAntigravityCliConfig = async () => {
    try {
      const validation = await window.electron?.antigravitycli?.validateConfig?.(antigravityCliConfig);
      if (validation && validation.valid === false) {
        setAntigravityCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.antigravitycli?.setConfig?.(antigravityCliConfig);
      if (result?.success) {
        setAntigravityCliStatus(prev => ({ ...prev, error: null }));
        await checkAntigravityCliStatus();
      } else {
        setAntigravityCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setAntigravityCliStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleSaveCodexCliConfig = async () => {
    try {
      const validation = await window.electron?.codexcli?.validateConfig?.(codexCliConfig);
      if (validation && validation.valid === false) {
        setCodexCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.codexcli?.setConfig?.(codexCliConfig);
      if (result?.success) {
        setCodexCliConfig(prev => ({ ...prev, apiKey: '' }));
        setCodexCliStatus(prev => ({ ...prev, error: null }));
        await checkCodexCliStatus();
      } else {
        setCodexCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setCodexCliStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleToggleClient = async (clientKey) => {
    if (clientKey === 'rdp') {
      // RDP está siempre activada nativamente. El switch enciende/apaga el servicio backend guacd
      if (handleRestartGuacd && !guacdRestarting) {
        await handleRestartGuacd();
      }
      return;
    }

    if (clientKey === 'claude') {
      const willEnable = !clients.claude;
      if (willEnable && !claudeCliStatus.installed) {
        const ok = await installClaudeCli();
        if (!ok) return;
      }
      saveClientsConfig({ ...clients, claude: willEnable });
      return;
    }

    if (clientKey === 'opencode') {
      const willEnable = !clients.opencode;
      if (willEnable && !openCodeCliStatus.installed) {
        const ok = await installOpenCodeCli();
        if (!ok) return;
      }
      saveClientsConfig({ ...clients, opencode: willEnable });
      return;
    }

    if (clientKey === 'geminicli') {
      const willEnable = !clients.geminicli;
      if (willEnable && !geminiCliStatus.installed) {
        const ok = await installGeminiCli();
        if (!ok) return;
      }
      saveClientsConfig({ ...clients, geminicli: willEnable });
      return;
    }

    if (clientKey === 'codexcli') {
      const willEnable = !clients.codexcli;
      if (willEnable && !codexCliStatus.installed) {
        const ok = await installCodexCli();
        if (!ok) return;
      }
      saveClientsConfig({ ...clients, codexcli: willEnable });
      return;
    }

    if (clientKey === 'antigravitycli') {
      const willEnable = !clients.antigravitycli;
      saveClientsConfig({ ...clients, antigravitycli: willEnable });

      if (willEnable && !antigravityCliStatus.installed) {
        const ok = await installAntigravityCli();
        if (!ok) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Antigravity CLI activado',
            detail: 'El cliente quedó habilitado, pero la instalación automática falló. Expande la configuración y pulsa "Instalar CLI".',
            life: 6000
          });
        }
      }
      return;
    }

    const newClients = { ...clients, [clientKey]: !clients[clientKey] };
    saveClientsConfig(newClients);

    if (newClients[clientKey] && ['anythingllm', 'openwebui', 'librechat', 'openclaw', 'opennotebook'].includes(clientKey)) {
      await checkDockerServiceStatus(clientKey);
    }
  };

  const checkDockerServiceStatus = async (serviceKey) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceKey]: { ...prev[serviceKey], loading: true, error: null }
    }));

    try {
      const ipcMap = {
        anythingllm: 'anythingllm:get-status',
        openwebui: 'openwebui:get-status',
        librechat: 'librechat:get-status',
        agentzero: 'agentzero:get-status',
        openclaw: 'openclaw:get-status',
        opennotebook: 'opennotebook:get-status'
      };
      
      const ipcKey = ipcMap[serviceKey];
      if (!ipcKey) return;

      const result = await window.electron.ipcRenderer.invoke(ipcKey);
      
      if (result.success) {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: result.status?.isRunning || false,
            updateAvailable: result.status?.updateAvailable || false,
            error: null
          }
        }));
      } else {
        setDockerStatus(prev => ({
          ...prev,
          [serviceKey]: {
            loading: false,
            running: false,
            updateAvailable: false,
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
          updateAvailable: false,
          error: error.message || 'Error de conexión'
        }
      }));
    }
  };

  const checkDockerUpdate = async (serviceId) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], loading: true, error: null }
    }));

    try {
      const result = await window.electron.ipcRenderer.invoke(`${serviceId}:check-update`);
      if (result.success) {
        const statusResult = await window.electron.ipcRenderer.invoke(`${serviceId}:get-status`);
        setDockerStatus(prev => ({
          ...prev,
          [serviceId]: { 
            ...prev[serviceId], 
            loading: false, 
            running: statusResult.status?.isRunning || false, 
            updateAvailable: statusResult.status?.updateAvailable || false,
            error: null 
          }
        }));
        
        if (statusResult.status?.updateAvailable) {
          toast.current?.show({ severity: 'info', summary: 'Actualización Detectada', detail: `Hay una nueva versión para ${serviceId}`, life: 3000 });
        } else {
          toast.current?.show({ severity: 'success', summary: 'Actualizado', detail: `${serviceId} ya está en la última versión`, life: 2000 });
        }
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: `No se pudo verificar ${serviceId}: ${error.message}`, life: 3000 });
      setDockerStatus(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], loading: false, error: error.message }
      }));
    }
  };

  const applyDockerUpdate = async (serviceId) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], loading: true, error: null }
    }));

    try {
      const result = await window.electron.ipcRenderer.invoke(`${serviceId}:apply-update`);
      if (result.success) {
        toast.current?.show({ severity: 'success', summary: 'Completado', detail: `${serviceId} se ha actualizado y reiniciado`, life: 5000 });
        await checkDockerServiceStatus(serviceId);
      } else {
        throw new Error(result.error || 'Error en la actualización');
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error en la actualización', detail: error.message, life: 5000 });
      setDockerStatus(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], loading: false, error: error.message }
      }));
    }
  };

  const handleStartDockerService = async (serviceKey) => {
    setDockerStatus(prev => ({
      ...prev,
      [serviceKey]: { ...prev[serviceKey], loading: true, error: null }
    }));

    try {
      const ipcKey = `${serviceKey}:start`;
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

  const BRAND_TYPE_MAP = {
    claude: 'claude',
    opencode: 'opencode',
    geminicli: 'geminicli',
    codexcli: 'codexcli',
    antigravitycli: 'antigravitycli',
    anythingllm: 'anything-llm',
    openwebui: 'openwebui',
    librechat: 'librechat',
    agentzero: 'agentzero',
    openclaw: 'openclaw',
    opennotebook: 'open-notebook'
  };

  // Mapeo dinámico de requisitos del RDP
  const getRdpReqBadges = () => {
    if (guacdPreferredMethod === 'docker') {
      return [{ label: 'DOCKER', severity: 'info' }];
    } else if (guacdPreferredMethod === 'wsl') {
      return [{ label: 'WSL', severity: 'danger' }];
    }
    return [{ label: 'NATIVO / LOCAL', severity: 'success' }];
  };

  // Definición de los clientes de IA + RDP
  const clientsDefinition = [
    {
      key: 'rdp', category: 'connectivity',
      name: 'RDP (Guacamole Connection)', shortName: 'RDP',
      color: '#3b82f6',
      description: 'Conexión a escritorios remotos mediante Guacamole. Admite escalado dinámico de pantalla y redirección de audio.',
      features: ['Microsoft RDP', 'Sandboxing seguro', 'Warm-up automático', 'Redimensión dinámica'],
      get badges() { return getRdpReqBadges(); },
      requiresDocker: guacdPreferredMethod === 'docker',
      requiresWSL: guacdPreferredMethod === 'wsl',
      isRdp: true
    },
    {
      key: 'claude', category: 'cli',
      name: 'Claude Code', shortName: 'Claude Code',
      color: '#f59e0b',
      description: 'Integra Claude Code como terminal local en NodeTerm. Instalación automática del CLI incluida.',
      features: ['Instalación automática', 'Terminal local dedicada', 'Multi-modelo'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'STANDALONE', severity: 'success' }],
      requiresDocker: false, isLocalCli: true
    },
    {
      key: 'opencode', category: 'cli',
      name: 'OpenCode', shortName: 'OpenCode',
      color: '#6366f1',
      description: 'Agente de IA open-source para codificación en terminal. Soporta 75+ proveedores de modelos.',
      features: ['Open Source', '75+ proveedores', 'Terminal dedicada'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'STANDALONE', severity: 'success' }],
      requiresDocker: false, isLocalCli: true
    },
    {
      key: 'geminicli', category: 'cli',
      name: 'Gemini CLI', shortName: 'Gemini CLI',
      color: '#1a73e8',
      description: 'CLI oficial de Google Gemini. Accede a los modelos Gemini con soporte para código y análisis.',
      features: ['Google Gemini', 'Gratis con API Key', 'Terminal dedicada'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'STANDALONE', severity: 'success' }],
      requiresDocker: false, isLocalCli: true
    },
    {
      key: 'codexcli', category: 'cli',
      name: 'Codex CLI', shortName: 'Codex CLI',
      color: '#10b981',
      description: 'CLI de OpenAI Codex. Agente de codificación ligero y open-source que ejecuta comandos y lee archivos.',
      features: ['OpenAI Codex', 'Ligero', 'Terminal dedicada'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'STANDALONE', severity: 'success' }],
      requiresDocker: false, isLocalCli: true
    },
    {
      key: 'antigravitycli', category: 'cli',
      name: 'Antigravity CLI', shortName: 'Antigravity CLI',
      color: '#4285f4',
      description: 'CLI de Google Antigravity. Ejecución paralela, subagentes y sincronización de estado de la conversación.',
      features: ['Google Antigravity', 'Subagentes', 'Terminal dedicada'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'STANDALONE', severity: 'success' }],
      requiresDocker: false, isLocalCli: true
    },
    {
      key: 'anythingllm', category: 'webapps',
      name: 'AnythingLLM', shortName: 'AnythingLLM',
      color: '#4CAF50',
      description: 'Plataforma completa de IA con RAG, documentos, embeddings y soporte multi-modelo.',
      features: ['RAG avanzado', 'Múltiples LLMs', 'Documentos'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 3001, url: 'http://127.0.0.1:3001'
    },
    {
      key: 'openwebui', category: 'webapps',
      name: 'Open WebUI', shortName: 'Open WebUI',
      color: '#2196F3',
      description: 'Interfaz web moderna tipo ChatGPT para Ollama y modelos de lenguaje locales.',
      features: ['Ollama nativo', 'Historial', 'Plugins/Modelfiles'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 3000, url: 'http://127.0.0.1:3000'
    },
    {
      key: 'librechat', category: 'webapps',
      name: 'LibreChat', shortName: 'LibreChat',
      color: '#9C27B0',
      description: 'Interfaz de chat avanzada y personalizable. Soporta múltiples proveedores (OpenAI, Anthropic).',
      features: ['Multi-proveedor', 'Historial avanzado', 'Presets de agente'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 3080, url: 'http://127.0.0.1:3080'
    },
    {
      key: 'agentzero', category: 'webapps',
      name: 'Agent Zero', shortName: 'Agent Zero',
      color: '#E91E63',
      description: 'Framework de IA agente para interactuar con agentes autónomos usando modelos locales o nube.',
      features: ['Agentes autónomos', 'Ejecución de código', 'Búsqueda web'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 3081, url: 'http://127.0.0.1:3081'
    },
    {
      key: 'openclaw', category: 'webapps',
      name: 'OpenClaw', shortName: 'OpenClaw',
      color: '#FF6B35',
      description: 'Gateway de agentes IA con sandboxing Docker, multi-modelo y soporte de mensajería.',
      features: ['Sandbox seguro', 'Multi-proveedor', 'Agentes concurrentes'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 18789, url: 'http://127.0.0.1:18789'
    },
    {
      key: 'opennotebook', category: 'webapps',
      name: 'Open Notebook', shortName: 'Open Notebook',
      color: '#10B981',
      description: 'Alternativa local auto-hospedada a Google NotebookLM. Analiza PDFs y documentos.',
      features: ['Google Gemini RAG', 'Privacidad local', 'Notas inteligentes'],
      badges: [{ label: 'DOCKER REQUIRED', severity: 'info' }],
      requiresDocker: true, port: 8502, url: 'http://127.0.0.1:8502'
    }
  ];

  const getCliStatus = (key) => {
    if (key === 'claude') return claudeCliStatus;
    if (key === 'opencode') return openCodeCliStatus;
    if (key === 'geminicli') return geminiCliStatus;
    if (key === 'codexcli') return codexCliStatus;
    if (key === 'antigravitycli') return antigravityCliStatus;
    return null;
  };

  const StatusDot = ({ client }) => {
    if (client.isRdp) {
      if (guacdRestarting) return <span className="ai-status-dot loading" title="Reiniciando..." />;
      if (guacdStatus?.isRunning) return <span className="ai-status-dot running" title="Guacd activo" />;
      return <span className="ai-status-dot stopped" title="Guacd inactivo" />;
    }
    if (client.isLocalCli) {
      const s = getCliStatus(client.key);
      if (!s) return null;
      if (s.loading) return <span className="ai-status-dot loading" title="Verificando..." />;
      if (s.installed) return <span className="ai-status-dot installed" title={`Instalado${s.version ? ` (${s.version})` : ''}`} />;
      return <span className="ai-status-dot not-installed" title="No instalado" />;
    }
    if (client.requiresDocker) {
      const s = dockerStatus[client.key];
      if (!clients[client.key]) return null;
      if (!s) return null;
      if (s.loading) return <span className="ai-status-dot loading" title="Verificando..." />;
      if (s.running) return <span className="ai-status-dot running" title="En ejecución" />;
      if (s.error) return <span className="ai-status-dot error" title={s.error} />;
      return <span className="ai-status-dot stopped" title="Detenido" />;
    }
    return null;
  };

  const StatusLabel = ({ client }) => {
    if (client.isRdp) {
      if (guacdRestarting) return <span className="ai-status-label stopped">Reiniciando...</span>;
      if (guacdStatus?.isRunning) return <span className="ai-status-label running">Activo</span>;
      return <span className="ai-status-label stopped">Inactivo</span>;
    }
    if (client.isLocalCli) {
      const s = getCliStatus(client.key);
      if (!s || s.loading) return null;
      if (s.installed) return <span className="ai-status-label installed">{s.version && s.version !== 'unknown' ? `v${s.version}` : 'Instalado'}</span>;
      return <span className="ai-status-label not-installed">No instalado</span>;
    }
    if (client.requiresDocker && clients[client.key]) {
      const s = dockerStatus[client.key];
      if (!s || s.loading) return null;
      if (s.running) return <span className="ai-status-label running">Running</span>;
      if (s.error) return <span className="ai-status-label error">Error</span>;
      return <span className="ai-status-label stopped">Detenido</span>;
    }
    return null;
  };

  // Render para config avanzada de RDP
  const renderRdpAdvancedConfig = () => {
    return (
      <div className="adv-config-inner" style={{ borderLeft: '3px solid #3b82f6' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Fila: Método backend guacd */}
          <div className="config-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="config-field">
              <label htmlFor="guacd-preferred-method" style={{ fontWeight: 'bold' }}>Método Backend Guacd Preferido</label>
              <Dropdown
                id="guacd-preferred-method"
                value={guacdPreferredMethod}
                options={methodOptions}
                onChange={(e) => setGuacdPreferredMethod(e.value)}
                style={{ width: '100%' }}
              />
              <small style={{ color: 'var(--text-color-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>
                Preferencia → alternativa (Windows: Docker/WSL, Linux: Docker/Nativo)
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: guacdStatus?.isRunning ? '#22c55e' : '#ef4444',
                boxShadow: guacdStatus?.isRunning ? '0 0 0 2px rgba(34,197,94,0.2)' : '0 0 0 2px rgba(239,68,68,0.2)'
              }}></span>
              <strong style={{ fontSize: '0.75rem' }}>Estado Guacd:</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: guacdStatus?.isRunning ? '#22c55e' : '#ef4444' }}>
                {guacdStatus?.isRunning ? 'En ejecución' : 'Inactivo'}
              </span>
            </div>
            <Button
              label={guacdRestarting ? "Reiniciando..." : "Reiniciar Guacd"}
              icon={guacdRestarting ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
              className="p-button-secondary p-button-sm"
              onClick={handleRestartGuacd}
              disabled={guacdRestarting}
            />
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.75rem' }}>Parámetros de Sesión RDP</strong>
              <Button
                label="Restaurar por defecto"
                icon="pi pi-refresh"
                className="p-button-text p-button-secondary p-button-sm"
                onClick={handleResetRdpDefaults}
              />
            </div>
            
            <div className="config-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="config-field">
                <label htmlFor="rdp-session-activity-min">Inactividad de Sesión (min)</label>
                <InputNumber
                  id="rdp-session-activity-min"
                  value={rdpSessionActivityMinutes}
                  onValueChange={e => setRdpSessionActivityMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1} max={1440} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                />
              </div>

              <div className="config-field">
                <label htmlFor="rdp-idle-min">Umbral de Inactividad (min)</label>
                <InputNumber
                  id="rdp-idle-min"
                  value={rdpIdleMinutes}
                  onValueChange={e => setRdpIdleMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1} max={1440} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                />
              </div>

              <div className="config-field">
                <label htmlFor="rdp-resize-debounce">Debounce de Redimensión (ms)</label>
                <InputNumber
                  id="rdp-resize-debounce"
                  value={rdpResizeDebounceMs}
                  onValueChange={e => setRdpResizeDebounceMs(Math.max(100, Math.min(2000, e.value || 300)))}
                  min={100} max={2000} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                />
              </div>

              <div className="config-field">
                <label htmlFor="rdp-resize-ack-timeout">Timeout de ACK (ms)</label>
                <InputNumber
                  id="rdp-resize-ack-timeout"
                  value={rdpResizeAckTimeoutMs}
                  onValueChange={e => setRdpResizeAckTimeoutMs(Math.max(600, Math.min(5000, e.value || 1500)))}
                  min={600} max={5000} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render para config avanzada de cada cliente de IA
  const renderAdvancedConfig = (client) => {
    const key = client.key;
    if (client.isRdp) {
      return renderRdpAdvancedConfig();
    }
    if (key === 'claude') {
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-info-circle" style={{ color: '#f59e0b' }} />
            <strong>Estado CLI:</strong>{' '}
            <span>{claudeCliStatus.loading ? 'verificando...' : claudeCliStatus.installed ? `instalado${claudeCliStatus.version ? ` (${claudeCliStatus.version})` : ''}` : 'no instalado'}</span>
            {claudeCliStatus.binaryPath && <code className="cli-path">{claudeCliStatus.binaryPath}</code>}
          </div>
          <div className="cli-action-row">
            {!claudeCliStatus.installed && <Button label="Instalar CLI" icon="pi pi-download" className="p-button-warning p-button-sm" onClick={installClaudeCli} loading={claudeCliStatus.installing} />}
            {claudeCliStatus.installed && <Button label="Reinstalar" icon="pi pi-refresh" className="p-button-secondary p-button-sm" onClick={installClaudeCli} loading={claudeCliStatus.installing} />}
            <Button label="Verificar" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={checkClaudeCliStatus} loading={claudeCliStatus.loading} />
          </div>
          <div className="config-grid">
            <div className="config-field"><label>Ruta binario</label><InputText value={claudeConfig.binaryPath} onChange={(e) => setClaudeConfig(p => ({ ...p, binaryPath: e.target.value }))} placeholder="npx @anthropic-ai/claude-code" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Modelo</label><InputText value={claudeConfig.defaultModel} onChange={(e) => setClaudeConfig(p => ({ ...p, defaultModel: e.target.value }))} placeholder="claude-3-7-sonnet-latest" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Args extra</label><InputText value={claudeConfig.extraArgs} onChange={(e) => setClaudeConfig(p => ({ ...p, extraArgs: e.target.value }))} placeholder="--no-interactive" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Auth Token</label><Password value={claudeConfig.authToken} onChange={(e) => setClaudeConfig(p => ({ ...p, authToken: e.target.value }))} feedback={false} toggleMask placeholder="Token opcional" className="p-inputtext-sm" style={{ width: '100%' }} inputStyle={{ width: '100%' }} /></div>
          </div>
          <Button label="Guardar Configuración" icon="pi pi-save" className="p-button-warning p-button-sm p-button-text" style={{ marginTop: '0.5rem' }} onClick={handleSaveClaudeConfig} />
          {claudeCliStatus.error && <div className="config-error"><i className="pi pi-times-circle" /> {claudeCliStatus.error}</div>}
        </div>
      );
    }
    if (key === 'opencode') {
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-info-circle" style={{ color: '#6366f1' }} />
            <strong>Estado CLI:</strong>{' '}
            <span>{openCodeCliStatus.loading ? 'verificando...' : openCodeCliStatus.installed ? `instalado${openCodeCliStatus.version ? ` (${openCodeCliStatus.version})` : ''}` : 'no instalado'}</span>
            {openCodeCliStatus.binaryPath && <code className="cli-path">{openCodeCliStatus.binaryPath}</code>}
          </div>
          <div className="cli-action-row">
            {!openCodeCliStatus.installed && <Button label="Instalar CLI" icon="pi pi-download" className="p-button-sm" style={{ background: '#6366f1', border: 'none' }} onClick={installOpenCodeCli} loading={openCodeCliStatus.installing} />}
            {openCodeCliStatus.installed && <Button label="Reinstalar" icon="pi pi-refresh" className="p-button-secondary p-button-sm" onClick={installOpenCodeCli} loading={openCodeCliStatus.installing} />}
            <Button label="Verificar" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={checkOpenCodeCliStatus} loading={openCodeCliStatus.loading} />
          </div>
          <div className="config-grid">
            <div className="config-field"><label>Ruta binario</label><InputText value={openCodeConfig.binaryPath} onChange={(e) => setOpenCodeConfig(p => ({ ...p, binaryPath: e.target.value }))} placeholder="opencode" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Args extra</label><InputText value={openCodeConfig.extraArgs} onChange={(e) => setOpenCodeConfig(p => ({ ...p, extraArgs: e.target.value }))} placeholder="" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
          </div>
          <Button label="Guardar Configuración" icon="pi pi-save" className="p-button-sm p-button-text" style={{ marginTop: '0.5rem', color: '#6366f1' }} onClick={handleSaveOpenCodeConfig} />
          {openCodeCliStatus.error && <div className="config-error"><i className="pi pi-times-circle" /> {openCodeCliStatus.error}</div>}
        </div>
      );
    }
    if (key === 'geminicli') {
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-info-circle" style={{ color: '#1a73e8' }} />
            <strong>Estado CLI:</strong>{' '}
            <span>{geminiCliStatus.loading ? 'verificando...' : geminiCliStatus.installed ? `instalado${geminiCliStatus.version ? ` (${geminiCliStatus.version})` : ''}` : 'no instalado'}</span>
            {geminiCliStatus.binaryPath && <code className="cli-path">{geminiCliStatus.binaryPath}</code>}
          </div>
          <div className="cli-action-row">
            {!geminiCliStatus.installed && <Button label="Instalar CLI" icon="pi pi-download" className="p-button-sm" style={{ background: '#1a73e8', border: 'none' }} onClick={installGeminiCli} loading={geminiCliStatus.installing} />}
            {geminiCliStatus.installed && <Button label="Reinstalar" icon="pi pi-refresh" className="p-button-secondary p-button-sm" onClick={installGeminiCli} loading={geminiCliStatus.installing} />}
            <Button label="Verificar" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={checkGeminiCliStatus} loading={geminiCliStatus.loading} />
          </div>
          <div className="config-grid">
            <div className="config-field"><label>Ruta binario</label><InputText value={geminiCliConfig.binaryPath} onChange={(e) => setGeminiCliConfig(p => ({ ...p, binaryPath: e.target.value }))} placeholder="gemini" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Args extra</label><InputText value={geminiCliConfig.extraArgs} onChange={(e) => setGeminiCliConfig(p => ({ ...p, extraArgs: e.target.value }))} placeholder="--model gemini-1.5-flash" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
          </div>
          <Button label="Guardar Configuración" icon="pi pi-save" className="p-button-sm p-button-text" style={{ marginTop: '0.5rem', color: '#1a73e8' }} onClick={handleSaveGeminiCliConfig} />
          <div style={{ marginTop: '0.75rem' }}>
            <Password value={geminiApiKeyInput} onChange={(e) => setGeminiApiKeyInput(e.target.value)} feedback={false} toggleMask placeholder={geminiApiKeySaved ? 'API key guardada (escribe para reemplazar)' : 'Pegar API key Gemini'} style={{ width: '100%', maxWidth: '420px' }} inputStyle={{ width: '100%' }} />
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button label={geminiApiKeyInput.trim() ? 'Guardar API key' : 'Eliminar API key'} icon="pi pi-key" className="p-button-secondary p-button-sm" onClick={saveGeminiApiKey} />
            {geminiApiKeySaved && <span style={{ color: '#93c5fd', fontSize: '0.85rem', alignSelf: 'center' }}>API key guardada</span>}
          </div>
          {geminiCliStatus.error && <div className="config-error"><i className="pi pi-times-circle" /> {geminiCliStatus.error}</div>}
        </div>
      );
    }
    if (key === 'antigravitycli') {
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-info-circle" style={{ color: '#4285f4' }} />
            <strong>Estado CLI:</strong>{' '}
            <span>{antigravityCliStatus.loading ? 'verificando...' : antigravityCliStatus.installed ? `instalado${antigravityCliStatus.version ? ` (${antigravityCliStatus.version})` : ''}` : 'no instalado'}</span>
            {antigravityCliStatus.binaryPath && <code className="cli-path">{antigravityCliStatus.binaryPath}</code>}
          </div>
          <div className="cli-action-row">
            {!antigravityCliStatus.installed && <Button label="Instalar CLI" icon="pi pi-download" className="p-button-sm" style={{ background: '#4285f4', border: 'none' }} onClick={installAntigravityCli} loading={antigravityCliStatus.installing} />}
            {antigravityCliStatus.installed && <Button label="Reinstalar" icon="pi pi-refresh" className="p-button-secondary p-button-sm" onClick={installAntigravityCli} loading={antigravityCliStatus.installing} />}
            <Button label="Verificar" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={checkAntigravityCliStatus} loading={antigravityCliStatus.loading} />
          </div>
          <div className="config-grid">
            <div className="config-field"><label>Ruta binario</label><InputText value={antigravityCliConfig.binaryPath} onChange={(e) => setAntigravityCliConfig(p => ({ ...p, binaryPath: e.target.value }))} placeholder="%LOCALAPPDATA%\\agy\\bin\\agy.exe" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Args extra</label><InputText value={antigravityCliConfig.extraArgs} onChange={(e) => setAntigravityCliConfig(p => ({ ...p, extraArgs: e.target.value }))} placeholder="" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
          </div>
          <Button label="Guardar Configuración" icon="pi pi-save" className="p-button-sm p-button-text" style={{ marginTop: '0.5rem', color: '#4285f4' }} onClick={handleSaveAntigravityCliConfig} />
          <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', opacity: 0.85, color: 'var(--text-color-secondary)' }}>
            La autenticación se realiza dentro del CLI con tu cuenta Google. Tras instalar, reinicia NodeTerm si no se detecta el binario.
          </p>
          {antigravityCliStatus.error && <div className="config-error"><i className="pi pi-times-circle" /> {antigravityCliStatus.error}</div>}
        </div>
      );
    }
    if (key === 'codexcli') {
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-info-circle" style={{ color: '#10b981' }} />
            <strong>Estado CLI:</strong>{' '}
            <span>{codexCliStatus.loading ? 'verificando...' : codexCliStatus.installed ? `instalado${codexCliStatus.version ? ` (${codexCliStatus.version})` : ''}` : 'no instalado'}</span>
            {codexCliStatus.binaryPath && <code className="cli-path">{codexCliStatus.binaryPath}</code>}
          </div>
          <div className="cli-action-row">
            {!codexCliStatus.installed && <Button label="Instalar CLI" icon="pi pi-download" className="p-button-sm" style={{ background: '#10b981', border: 'none' }} onClick={installCodexCli} loading={codexCliStatus.installing} />}
            {codexCliStatus.installed && <Button label="Reinstalar" icon="pi pi-refresh" className="p-button-secondary p-button-sm" onClick={installCodexCli} loading={codexCliStatus.installing} />}
            <Button label="Verificar" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={checkCodexCliStatus} loading={codexCliStatus.loading} />
          </div>
          <div className="config-grid">
            <div className="config-field"><label>Ruta binario</label><InputText value={codexCliConfig.binaryPath} onChange={(e) => setCodexCliConfig(p => ({ ...p, binaryPath: e.target.value }))} placeholder="codex" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
            <div className="config-field"><label>Args extra</label><InputText value={codexCliConfig.extraArgs} onChange={(e) => setCodexCliConfig(p => ({ ...p, extraArgs: e.target.value }))} placeholder="" className="p-inputtext-sm" style={{ width: '100%' }} /></div>
          </div>
          <Button label="Guardar Configuración" icon="pi pi-save" className="p-button-sm p-button-text" style={{ marginTop: '0.5rem', color: '#10b981' }} onClick={handleSaveCodexCliConfig} />
          <div style={{ marginTop: '0.75rem' }}>
            <Password value={codexApiKeyInput} onChange={(e) => setCodexApiKeyInput(e.target.value)} feedback={false} toggleMask placeholder={codexApiKeySaved ? 'API key guardada (escribe para reemplazar)' : 'Pegar API key OpenAI'} style={{ width: '100%', maxWidth: '420px' }} inputStyle={{ width: '100%' }} />
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button label={codexApiKeyInput.trim() ? 'Guardar API key' : 'Eliminar API key'} icon="pi pi-key" className="p-button-secondary p-button-sm" onClick={saveCodexApiKey} />
            {codexApiKeySaved && <span style={{ color: '#93c5fd', fontSize: '0.85rem', alignSelf: 'center' }}>API key guardada</span>}
          </div>
          {codexCliStatus.error && <div className="config-error"><i className="pi pi-times-circle" /> {codexCliStatus.error}</div>}
        </div>
      );
    }
    if (client.requiresDocker) {
      const status = dockerStatus[client.key];
      const isBusy = status?.loading;
      return (
        <div className="adv-config-inner">
          <div className="cli-status-row">
            <i className="pi pi-docker" style={{ color: client.color }} />
            <strong>Servidor Docker:</strong>{' '}
            <span>{status?.updateAvailable ? 'Actualización disponible' : 'Actualizado a la última versión'}</span>
          </div>
          <div className="cli-action-row">
            <Button label="Buscar actualización" icon="pi pi-search" className="p-button-secondary p-button-sm" onClick={() => checkDockerUpdate(client.key)} loading={isBusy} />
            {status?.updateAvailable && (
              <Button label="Actualizar ahora" icon="pi pi-download" className="p-button-success p-button-sm" onClick={() => applyDockerUpdate(client.key)} loading={isBusy} />
            )}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
            Las actualizaciones descargarán la última imagen de Docker Hub y reiniciarán el contenedor automáticamente.
          </div>
        </div>
      );
    }
    return null;
  };

  // Card view
  const renderClientCard = (client) => {
    const isEnabled = client.isRdp ? rdpEnabled : clients[client.key];
    const status = dockerStatus[client.key];
    const brandType = BRAND_TYPE_MAP[client.key];
    const isConfigOpen = !!expandedConfigs[client.key];

    return (
      <div
        key={client.key}
        id={`app-card-${client.key}`}
        className={`ai-client-card ${isEnabled ? 'enabled' : 'disabled'}`}
        style={{ borderLeft: `3px solid ${isEnabled ? client.color : 'var(--surface-border)'}` }}
      >
        {/* Header */}
        <div className="ai-client-card-header" style={{ background: `linear-gradient(135deg, ${client.color}16, ${client.color}06)`, borderBottom: `1px solid ${client.color}28` }}>
          <div className="ai-client-icon-wrapper" style={{ background: `${client.color}18`, border: `1.5px solid ${client.color}35` }}>
            {client.isRdp ? (
              <i className="pi pi-desktop" style={{ fontSize: 22, color: client.color }} />
            ) : (
              <AIClientBrandIcon tabType={brandType} size={26} />
            )}
          </div>
          <div className="ai-client-header-info">
            <div className="ai-client-name-row">
              <h3 className="ai-client-name">{client.name}</h3>
              <StatusDot client={client} />
              <StatusLabel client={client} />
            </div>
            <div className="ai-client-badges">
              {client.badges.map((badge, idx) => (
                <Badge key={idx} value={badge.label} severity={badge.severity} style={{ marginRight: '0.3rem', fontSize: '0.6rem' }} />
              ))}
              {client.requiresDocker && status?.updateAvailable && (
                <Badge value="Nueva Versión" severity="warning" style={{ marginRight: '0.3rem', fontSize: '0.6rem' }} />
              )}
              {client.requiresDocker && status && !status.updateAvailable && !status.loading && !status.error && (
                <Badge value="Actualizado" severity="success" style={{ marginRight: '0.3rem', fontSize: '0.6rem' }} />
              )}
              {client.isLocalCli && getCliStatus(client.key)?.installed && (
                <Badge value="Actualizado" severity="success" style={{ marginRight: '0.3rem', fontSize: '0.6rem' }} />
              )}
            </div>
          </div>
          <div className="ai-client-toggle">
            <InputSwitch 
              checked={isEnabled} 
              onChange={() => handleToggleClient(client.key)} 
              disabled={client.isRdp && guacdRestarting} // Desactivar si se está reiniciando guacd
            />
          </div>
        </div>

        {/* Body */}
        <div className="ai-client-card-body">
          <p className="ai-client-description">{client.description}</p>

          <div className="ai-client-features">
            {client.features.map((f, idx) => (
              <span key={idx} className="ai-feature-chip" style={{ borderColor: `${client.color}50`, color: 'var(--text-color)' }}>
                <i className="pi pi-check" style={{ color: client.color, fontSize: '0.6rem' }} />
                {f}
              </span>
            ))}
          </div>

          {/* Docker info para apps de Docker */}
          {client.requiresDocker && isEnabled && status && (
            <div className="ai-docker-info">
              <div className="docker-url-row">
                <i className="pi pi-link" style={{ color: client.color }} />
                <code>{client.url}</code>
                <span className="docker-port-chip" style={{ background: `${client.color}20`, color: client.color }}>:{client.port}</span>
              </div>
              <div className="docker-action-row">
                {!status.running && !status.loading && (
                  <Button label="Iniciar" icon="pi pi-play" onClick={() => handleStartDockerService(client.key)} className="p-button-success p-button-sm" />
                )}
                <Button label="Verificar" icon="pi pi-refresh" onClick={() => checkDockerServiceStatus(client.key)} className="p-button-secondary p-button-sm" loading={status.loading} />
              </div>
              {status.error && (
                <div className="docker-error">
                  <i className="pi pi-exclamation-triangle" style={{ color: '#f44336' }} />
                  <span>{status.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Acordeón de configuración avanzada */}
          {(client.isLocalCli || client.requiresDocker || client.isRdp) && (
            <div className="config-accordion">
              <button className="config-accordion-toggle" onClick={() => toggleConfig(client.key)} style={{ color: client.color }}>
                <i className={`pi pi-chevron-${isConfigOpen ? 'down' : 'right'}`} />
                {client.isRdp ? 'Ajustes del Backend y Conexión' : client.requiresDocker ? 'Actualizaciones (Docker)' : 'Configuración avanzada'}
              </button>
              {isConfigOpen && (
                <div className="config-accordion-body">
                  {renderAdvancedConfig(client)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // List view row
  const renderClientRow = (client) => {
    const isEnabled = client.isRdp ? rdpEnabled : clients[client.key];
    const brandType = BRAND_TYPE_MAP[client.key];
    return (
      <div
        key={client.key}
        id={`app-row-${client.key}`}
        className={`ai-client-row ${isEnabled ? 'enabled' : 'disabled'}`}
        style={{ borderLeft: `3px solid ${isEnabled ? client.color : 'transparent'}` }}
      >
        <div className="ai-row-icon" style={{ background: `${client.color}15`, border: `1px solid ${client.color}30` }}>
          {client.isRdp ? (
            <i className="pi pi-desktop" style={{ fontSize: 20, color: client.color }} />
          ) : (
            <AIClientBrandIcon tabType={brandType} size={20} />
          )}
        </div>
        <div className="ai-row-info">
          <span className="ai-row-name">{client.name}</span>
          <div className="ai-row-badges">
            {client.badges.map((b, i) => <Badge key={i} value={b.label} severity={b.severity} style={{ fontSize: '0.55rem', marginRight: '0.25rem' }} />)}
            {client.requiresDocker && dockerStatus[client.key]?.updateAvailable && (
              <Badge value="Nueva Versión" severity="warning" style={{ fontSize: '0.55rem', marginRight: '0.25rem' }} />
            )}
            {client.requiresDocker && dockerStatus[client.key] && !dockerStatus[client.key].updateAvailable && !dockerStatus[client.key].loading && !dockerStatus[client.key].error && (
              <Badge value="Actualizado" severity="success" style={{ fontSize: '0.55rem', marginRight: '0.25rem' }} />
            )}
            {client.isLocalCli && getCliStatus(client.key)?.installed && (
              <Badge value="Actualizado" severity="success" style={{ fontSize: '0.55rem', marginRight: '0.25rem' }} />
            )}
          </div>
        </div>
        <div className="ai-row-status">
          <StatusDot client={client} />
          <StatusLabel client={client} />
        </div>
        <div className="ai-row-toggle">
          <InputSwitch 
            checked={isEnabled} 
            onChange={() => handleToggleClient(client.key)} 
            disabled={client.isRdp && guacdRestarting}
          />
        </div>
      </div>
    );
  };

  const totalActive = clientsDefinition.filter(c => c.isRdp ? rdpEnabled : clients[c.key]).length;
  const totalCount = clientsDefinition.length;

  const filteredClients = (categoryClients) => {
    if (!searchQuery.trim()) return categoryClients;
    const q = searchQuery.toLowerCase();
    return categoryClients.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  };

  return (
    <div className="ai-clients-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toast ref={toast} />
      
      {/* Toolbar */}
      <div className="ai-clients-toolbar">
        <div className="ai-toolbar-left">
          <span className="ai-toolbar-title">Tienda de APPs</span>
          <span className="ai-toolbar-count">{totalActive} activas · {totalCount} total</span>
        </div>
        <div className="ai-toolbar-right">
          <div className="ai-search-wrapper">
            <i className="pi pi-search ai-search-icon" />
            <input
              className="ai-search-input"
              placeholder="Buscar aplicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="ai-search-clear" onClick={() => setSearchQuery('')}><i className="pi pi-times" /></button>
            )}
          </div>
          <div className="ai-view-toggle">
            <button className={`ai-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Vista cuadrícula">
              <i className="pi pi-th-large" />
            </button>
            <button className={`ai-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vista lista">
              <i className="pi pi-list" />
            </button>
          </div>
        </div>
      </div>

      {/* Categorías */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        {CATEGORIES.map(cat => {
          const catClients = clientsDefinition.filter(c => c.category === cat.key);
          const visible = filteredClients(catClients);
          if (visible.length === 0) return null;
          const activeInCat = visible.filter(c => c.isRdp ? rdpEnabled : clients[c.key]).length;
          const isCollapsed = !!collapsedSections[cat.key];

          return (
            <div key={cat.key} className="ai-category-section">
              <button className="ai-category-header" onClick={() => toggleSection(cat.key)}>
                <div className="ai-category-header-left">
                  <span className="ai-category-emoji">{cat.emoji}</span>
                  <span className="ai-category-label">{cat.label}</span>
                  <span className="ai-category-meta">
                    {visible.length} aplicación{visible.length !== 1 ? 'es' : ''}
                    {activeInCat > 0 && <span className="ai-category-active-badge">{activeInCat} activa{activeInCat !== 1 ? 's' : ''}</span>}
                  </span>
                </div>
                <i className={`pi pi-chevron-${isCollapsed ? 'right' : 'down'} ai-category-chevron`} />
              </button>

              {!isCollapsed && (
                viewMode === 'grid'
                  ? <div className="ai-clients-grid">{visible.map(c => renderClientCard(c))}</div>
                  : <div className="ai-clients-list">{visible.map(c => renderClientRow(c))}</div>
              )}
            </div>
          );
        })}

        {/* Sin resultados */}
        {searchQuery && CATEGORIES.every(cat => filteredClients(clientsDefinition.filter(c => c.category === cat.key)).length === 0) && (
          <div className="ai-no-results">
            <i className="pi pi-search" style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p>No se encontraron aplicaciones para <strong>"{searchQuery}"</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppsTab;
