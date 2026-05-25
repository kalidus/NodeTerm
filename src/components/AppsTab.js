import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import AIClientBrandIcon from './AIClientBrandIcon';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/ai-clients-tab.css';
import '../styles/components/apps-tab.css';

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
 * AppsTab — configuración unificada de aplicaciones (RDP, CLI, Web Docker).
 * Layout master-detail integrado en el diálogo de ajustes.
 */
const SUBTAB_DEFAULT_APP = {
  rdp: 'rdp',
  ai: 'claude'
};

const AppsTab = ({
  themeColors,
  activeSubTab,
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
  const { t } = useTranslation('settings');
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

  // UI state — master-detail
  const [selectedAppKey, setSelectedAppKey] = useState('rdp');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Deep link desde SettingsDialog (rdp / clientes-ia → apps)
  useEffect(() => {
    if (!activeSubTab) return;
    const key = SUBTAB_DEFAULT_APP[activeSubTab];
    if (key) {
      setSelectedAppKey(key);
      if (activeSubTab === 'rdp') setCategoryFilter('connectivity');
      else if (activeSubTab === 'ai') setCategoryFilter('cli');
    }
  }, [activeSubTab]);

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

  const visibleClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clientsDefinition.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [clientsDefinition, categoryFilter, searchQuery]);

  useEffect(() => {
    if (visibleClients.length === 0) return;
    if (!visibleClients.some((c) => c.key === selectedAppKey)) {
      setSelectedAppKey(visibleClients[0].key);
    }
  }, [visibleClients, selectedAppKey]);

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
    const isRunning = guacdStatus?.isRunning;
    const statusClass = isRunning ? 'rdp-status-active' : 'rdp-status-inactive';
    const statusText = isRunning ? t('rdp.guacdStatus.active') : t('rdp.guacdStatus.inactive');
    const activeMethodLabel = methodOptions.find(o => o.value === guacdPreferredMethod)?.label || guacdPreferredMethod;

    return (
      <div className="rdp-config-container">
        {/* Tarjeta 1: Estado del Servidor Backend (Guacd) */}
        <div className="rdp-config-card rdp-backend-card">
          <div className="rdp-card-header">
            <div className="rdp-card-icon-wrapper">
              <i className="pi pi-server rdp-card-icon" />
            </div>
            <div className="rdp-card-header-text">
              <h3>{t('rdp.backendTitle') || 'Backend Guacamole'}</h3>
              <p className="rdp-card-subtitle">Servicio de túnel y protocolo RDP</p>
            </div>
          </div>

          <div className="rdp-card-content">
            <div className="rdp-status-display">
              <div className="rdp-status-main">
                <span className={`rdp-status-indicator ${statusClass}`}></span>
                <span className="rdp-status-text">
                  Estado: <strong>{statusText}</strong>
                </span>
              </div>
              <div className="rdp-status-technical">
                <span className="rdp-tech-label">Dirección:</span>
                <code className="rdp-tech-code">
                  guacd://{guacdStatus?.host || '127.0.0.1'}:{guacdStatus?.port || 4822}
                </code>
              </div>
              <div className="rdp-status-technical">
                <span className="rdp-tech-label">Método actual:</span>
                <span className="rdp-tech-value">{activeMethodLabel}</span>
              </div>
            </div>

            <div className="config-field">
              <label htmlFor="guacd-preferred-method" style={{ fontWeight: 'bold' }}>{t('rdp.guacdMethod') || 'Método backend Guacd preferido'}</label>
              <Dropdown
                id="guacd-preferred-method"
                value={guacdPreferredMethod}
                options={methodOptions}
                onChange={(e) => setGuacdPreferredMethod(e.value)}
                style={{ width: '100%' }}
                className="rdp-dropdown-premium"
              />
              <small className="rdp-field-hint">
                {t('rdp.guacdMethodHint') || 'Preferencia → alternativa (Windows: Docker/WSL, Linux: Docker/Nativo)'}
              </small>
            </div>

            <Button
              label={guacdRestarting ? "Reiniciando..." : (t('rdp.restartGuacd') || "Reiniciar Guacd")}
              icon={guacdRestarting ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
              className={`rdp-restart-btn p-button-sm ${isRunning ? 'p-button-secondary' : 'p-button-warning'}`}
              onClick={handleRestartGuacd}
              disabled={guacdRestarting}
            />
          </div>
        </div>

        {/* Tarjeta 2: Parámetros de Sesión y Rendimiento */}
        <div className="rdp-config-card rdp-params-card">
          <div className="rdp-card-header">
            <div className="rdp-card-icon-wrapper params-icon">
              <i className="pi pi-sliders-h rdp-card-icon" />
            </div>
            <div className="rdp-card-header-text">
              <h3>{t('rdp.title') || 'Parámetros de Sesión RDP'}</h3>
              <p className="rdp-card-subtitle">Rendimiento, optimización y tiempos límite</p>
            </div>
            <Button
              icon="pi pi-undo"
              title={t('rdp.resetDefaults') || "Restaurar por defecto"}
              aria-label="Restaurar valores por defecto"
              className="p-button-rounded p-button-text p-button-sm rdp-reset-btn"
              onClick={handleResetRdpDefaults}
            />
          </div>

          <div className="rdp-card-content">
            <div className="rdp-params-grid">
              {/* Field 1: Inactividad de sesión */}
              <div className="rdp-param-field">
                <label htmlFor="rdp-session-activity-min">
                  {t('rdp.sessionActivity') || 'Inactividad de Sesión (min)'}
                </label>
                <InputNumber
                  id="rdp-session-activity-min"
                  value={rdpSessionActivityMinutes}
                  onValueChange={e => setRdpSessionActivityMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1} max={1440} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                  className="rdp-inputnumber-premium"
                />
                <span className="rdp-param-desc">
                  {t('rdp.sessionActivityHint') || 'Tiempo máximo de sesión antes de reconexión.'}
                </span>
              </div>

              {/* Field 2: Umbral de inactividad */}
              <div className="rdp-param-field">
                <label htmlFor="rdp-idle-min">
                  {t('rdp.idleMinutes') || 'Umbral de Inactividad (min)'}
                </label>
                <InputNumber
                  id="rdp-idle-min"
                  value={rdpIdleMinutes}
                  onValueChange={e => setRdpIdleMinutes(Math.max(1, Math.min(1440, e.value || 1)))}
                  min={1} max={1440} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                  className="rdp-inputnumber-premium"
                />
                <span className="rdp-param-desc">
                  {t('rdp.idleMinutesHint') || 'Pausa la conexión tras inactividad para ahorrar recursos.'}
                </span>
              </div>

              {/* Field 3: Debounce de redimensión */}
              <div className="rdp-param-field">
                <label htmlFor="rdp-resize-debounce">
                  {t('rdp.resizeDebounce') || 'Debounce de Redimensión (ms)'}
                </label>
                <InputNumber
                  id="rdp-resize-debounce"
                  value={rdpResizeDebounceMs}
                  onValueChange={e => setRdpResizeDebounceMs(Math.max(100, Math.min(2000, e.value || 300)))}
                  min={100} max={2000} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                  className="rdp-inputnumber-premium"
                />
                <span className="rdp-param-desc">
                  {t('rdp.resizeDebounceHint') || 'Espera antes de enviar el nuevo tamaño al servidor.'}
                </span>
              </div>

              {/* Field 4: Timeout ACK */}
              <div className="rdp-param-field">
                <label htmlFor="rdp-resize-ack-timeout">
                  {t('rdp.resizeAckTimeout') || 'Timeout de ACK (ms)'}
                </label>
                <InputNumber
                  id="rdp-resize-ack-timeout"
                  value={rdpResizeAckTimeoutMs}
                  onValueChange={e => setRdpResizeAckTimeoutMs(Math.max(600, Math.min(5000, e.value || 1500)))}
                  min={600} max={5000} showButtons buttonLayout="horizontal"
                  style={{ width: '100%' }} inputStyle={{ padding: '0.35rem 0.5rem' }}
                  className="rdp-inputnumber-premium"
                />
                <span className="rdp-param-desc">
                  {t('rdp.resizeAckTimeoutHint') || 'Espera de confirmación de pantalla antes de permitir otra redimensión.'}
                </span>
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

  const isClientEnabled = (client) => (client.isRdp ? rdpEnabled : !!clients[client.key]);

  const openWebAppUrl = (url) => {
    if (!url) return;
    window.electron?.import?.openExternal?.(url);
  };

  const totalActive = clientsDefinition.filter(c => isClientEnabled(c)).length;
  const totalCount = clientsDefinition.length;

  const dockerWebKeys = ['anythingllm', 'openwebui', 'librechat', 'agentzero', 'openclaw', 'opennotebook'];
  const dockerRunningCount = dockerWebKeys.filter(
    (k) => clients[k] && dockerStatus[k]?.running
  ).length;
  const dockerEnabledCount = dockerWebKeys.filter((k) => clients[k]).length;
  const cliInstalledCount = ['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli'].filter(
    (k) => getCliStatus(k)?.installed
  ).length;

  const selectedClient =
    clientsDefinition.find((c) => c.key === selectedAppKey) ||
    visibleClients[0] ||
    clientsDefinition[0];

  const renderAppIcon = (client, size = 26) => {
    const brandType = BRAND_TYPE_MAP[client.key];
    if (client.isRdp) {
      return <i className="pi pi-desktop" style={{ fontSize: size, color: client.color }} />;
    }
    return <AIClientBrandIcon tabType={brandType} size={size} />;
  };

  const renderExtraBadges = (client) => {
    const status = dockerStatus[client.key];
    const extras = [];
    if (client.requiresDocker && status?.updateAvailable) {
      extras.push(<Badge key="upd" value="Nueva versión" severity="warning" style={{ fontSize: '0.6rem' }} />);
    }
    if (client.requiresDocker && status && !status.updateAvailable && !status.loading && !status.error) {
      extras.push(<Badge key="ok" value="Actualizado" severity="success" style={{ fontSize: '0.6rem' }} />);
    }
    if (client.isLocalCli && getCliStatus(client.key)?.installed) {
      extras.push(<Badge key="cli" value="CLI listo" severity="success" style={{ fontSize: '0.6rem' }} />);
    }
    return extras;
  };

  const renderListItem = (client) => {
    const isEnabled = isClientEnabled(client);
    const isSelected = selectedAppKey === client.key;
    return (
      <div
        key={client.key}
        id={`app-list-${client.key}`}
        role="button"
        tabIndex={0}
        className={`apps-list-item ${isSelected ? 'selected' : ''} ${!isEnabled ? 'disabled-app' : ''}`}
        onClick={() => setSelectedAppKey(client.key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedAppKey(client.key);
          }
        }}
      >
        <div
          className="apps-list-icon"
          style={{ background: `${client.color}18`, border: `1px solid ${client.color}35` }}
        >
          {renderAppIcon(client, 18)}
        </div>
        <div className="apps-list-body">
          <span className="apps-list-name">{client.shortName}</span>
          <div className="apps-list-meta">
            <StatusDot client={client} />
            <StatusLabel client={client} />
          </div>
        </div>
        <div
          className="apps-list-toggle"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <InputSwitch
            checked={isEnabled}
            onChange={() => handleToggleClient(client.key)}
            disabled={client.isRdp && guacdRestarting}
          />
        </div>
      </div>
    );
  };

  const renderDetailPanel = (client) => {
    if (!client) return null;
    const isEnabled = isClientEnabled(client);
    const status = dockerStatus[client.key];
    const showDockerActions = client.requiresDocker && isEnabled && !client.isRdp;

    return (
      <div key={client.key} className="apps-detail-content">
        <header className="apps-detail-header">
          <div
            className="apps-detail-icon"
            style={{
              background: `linear-gradient(135deg, ${client.color}22, ${client.color}08)`,
              border: `1.5px solid ${client.color}40`
            }}
          >
            {renderAppIcon(client, 30)}
          </div>
          <div className="apps-detail-header-text">
            <div className="apps-detail-title-row">
              <h2 className="apps-detail-title">{client.name}</h2>
              <StatusDot client={client} />
              <StatusLabel client={client} />
            </div>
            <div className="apps-detail-badges">
              {client.badges.map((badge, idx) => (
                <Badge key={idx} value={badge.label} severity={badge.severity} style={{ fontSize: '0.62rem' }} />
              ))}
              {renderExtraBadges(client)}
            </div>
            <p className="apps-detail-desc">{client.description}</p>
          </div>
          <div className="apps-detail-header-actions">
            <span className="apps-detail-enable-label">{isEnabled ? 'Activada' : 'Desactivada'}</span>
            <InputSwitch
              checked={isEnabled}
              onChange={() => handleToggleClient(client.key)}
              disabled={client.isRdp && guacdRestarting}
            />
          </div>
        </header>

        <div className="apps-detail-features">
          {client.features.map((f, idx) => (
            <span
              key={idx}
              className="apps-detail-feature"
              style={{ borderColor: `${client.color}45` }}
            >
              <i className="pi pi-check" style={{ color: client.color }} />
              {f}
            </span>
          ))}
        </div>

        {showDockerActions && (
          <div className="apps-detail-actions">
            <div className="apps-detail-url">
              <i className="pi pi-link" style={{ color: client.color }} />
              <code>{client.url}</code>
              <span
                className="apps-detail-port"
                style={{ background: `${client.color}22`, color: client.color }}
              >
                :{client.port}
              </span>
            </div>
            {status?.running && (
              <Button
                label="Abrir"
                icon="pi pi-external-link"
                className="p-button-sm"
                onClick={() => openWebAppUrl(client.url)}
              />
            )}
            {!status?.running && !status?.loading && (
              <Button
                label="Iniciar"
                icon="pi pi-play"
                className="p-button-success p-button-sm"
                onClick={() => handleStartDockerService(client.key)}
              />
            )}
            <Button
              label="Verificar"
              icon="pi pi-refresh"
              className="p-button-secondary p-button-sm"
              onClick={() => checkDockerServiceStatus(client.key)}
              loading={status?.loading}
            />
            {status?.error && (
              <div className="apps-detail-docker-error">
                <i className="pi pi-exclamation-triangle" />
                <span>{status.error}</span>
              </div>
            )}
          </div>
        )}

        {(client.isLocalCli || client.requiresDocker || client.isRdp) && (
          <section className="apps-detail-config">
            <div className="apps-detail-config-title" style={{ color: client.color }}>
              <i className="pi pi-cog" />
              {client.isRdp
                ? 'Backend y conexión'
                : client.requiresDocker
                  ? 'Actualizaciones Docker'
                  : 'Configuración avanzada'}
            </div>
            {renderAdvancedConfig(client)}
          </section>
        )}
      </div>
    );
  };

  const CATEGORY_PILLS = [
    { key: 'all', label: 'Todas' },
    { key: 'connectivity', label: 'Conectividad' },
    { key: 'cli', label: 'CLI' },
    { key: 'webapps', label: 'Web' }
  ];

  const groupedForList = CATEGORIES.map((cat) => ({
    cat,
    items: visibleClients.filter((c) => c.category === cat.key)
  })).filter((g) => g.items.length > 0);

  const listShowsGroups = categoryFilter === 'all' && !searchQuery.trim();

  return (
    <div className="apps-tab ai-clients-tab">
      <Toast ref={toast} />

      <div className="apps-status-banner">
        <span className="apps-status-stat">
          <span className="apps-stat-dot ok" />
          <strong>{totalActive}</strong> activas de {totalCount}
        </span>
        <span className="apps-status-stat">
          <span className={`apps-stat-dot ${guacdStatus?.isRunning ? 'ok' : 'warn'}`} />
          Guacd {guacdStatus?.isRunning ? 'activo' : 'inactivo'}
        </span>
        {dockerEnabledCount > 0 && (
          <span className="apps-status-stat">
            <span className={`apps-stat-dot ${dockerRunningCount > 0 ? 'ok' : 'muted'}`} />
            Docker {dockerRunningCount}/{dockerEnabledCount} en ejecución
          </span>
        )}
        <span className="apps-status-stat">
          <span className={`apps-stat-dot ${cliInstalledCount > 0 ? 'ok' : 'muted'}`} />
          {cliInstalledCount} CLI instalados
        </span>
      </div>

      <div className="apps-tab-shell">
        <aside className="apps-master">
          <div className="apps-master-toolbar">
            <span className="apps-master-title">Aplicaciones</span>
            <div className="apps-master-search">
              <i className="pi pi-search" />
              <input
                type="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar aplicación"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="apps-master-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                >
                  <i className="pi pi-times" />
                </button>
              )}
            </div>
            <div className="apps-category-pills">
              {CATEGORY_PILLS.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`apps-pill ${categoryFilter === pill.key ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(pill.key)}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="apps-master-list">
            {visibleClients.length === 0 ? (
              <div className="apps-master-empty">
                <i className="pi pi-search" style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} />
                Sin resultados
              </div>
            ) : listShowsGroups ? (
              groupedForList.map(({ cat, items }) => (
                <div key={cat.key}>
                  <div className="apps-list-group-label">{cat.label}</div>
                  {items.map((c) => renderListItem(c))}
                </div>
              ))
            ) : (
              visibleClients.map((c) => renderListItem(c))
            )}
          </div>
        </aside>

        <main className="apps-detail">
          <div className="apps-detail-scroll">
            {selectedClient ? (
              renderDetailPanel(selectedClient)
            ) : (
              <div className="apps-detail-empty">
                <i className="pi pi-th-large" />
                <p>Selecciona una aplicación de la lista para ver su configuración.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppsTab;
