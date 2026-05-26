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
    clients: ['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli', 'hermescli']
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
    hermescli: false,
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
  const [hermesCliStatus, setHermesCliStatus] = useState({
    loading: false, installed: false, installing: false, version: null, binaryPath: null, error: null
  });

  // Estados para configuración detallada de los CLIs
  const [claudeConfig, setClaudeConfig] = useState({ binaryPath: '', defaultModel: '', extraArgs: '', authToken: '' });
  const [openCodeConfig, setOpenCodeConfig] = useState({ binaryPath: '', extraArgs: '' });
  const [geminiCliConfig, setGeminiCliConfig] = useState({ binaryPath: '', extraArgs: '', apiKey: '' });
  const [codexCliConfig, setCodexCliConfig] = useState({ binaryPath: '', extraArgs: '', apiKey: '' });
  const [antigravityCliConfig, setAntigravityCliConfig] = useState({ binaryPath: '', extraArgs: '' });
  const [hermesCliConfig, setHermesCliConfig] = useState({ binaryPath: '', extraArgs: '' });

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
    checkHermesCliStatus();
  }, []);

  // Cargar configuraciones detalladas desde el proceso principal
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [claude, opencode, gemini, codex, antigravity, hermes] = await Promise.all([
          window.electron?.claude?.getConfig?.(),
          window.electron?.opencode?.getConfig?.(),
          window.electron?.geminicli?.getConfig?.(),
          window.electron?.codexcli?.getConfig?.(),
          window.electron?.antigravitycli?.getConfig?.(),
          window.electron?.hermescli?.getConfig?.()
        ]);

        if (claude) setClaudeConfig({ ...claude, authToken: '' });
        if (opencode) setOpenCodeConfig(opencode);
        if (gemini) setGeminiCliConfig({ ...gemini, apiKey: '' });
        if (codex) setCodexCliConfig({ ...codex, apiKey: '' });
        if (antigravity) setAntigravityCliConfig(antigravity);
        if (hermes) setHermesCliConfig(hermes);
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

  const checkHermesCliStatus = async () => {
    setHermesCliStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.electron?.hermescli?.getCliStatus?.();
      if (result?.success) {
        setHermesCliStatus({
          loading: false,
          installed: !!result.installed,
          installing: false,
          version: result.version || null,
          binaryPath: result.binaryPath || null,
          error: null
        });
      } else {
        setHermesCliStatus(prev => ({
          ...prev,
          loading: false,
          installing: false,
          error: result?.error || 'No se pudo verificar Hermes CLI'
        }));
      }
    } catch (error) {
      setHermesCliStatus(prev => ({
        ...prev,
        loading: false,
        installing: false,
        error: error.message || 'No se pudo verificar Hermes CLI'
      }));
    }
  };

  const installHermesCli = async () => {
    setHermesCliStatus(prev => ({ ...prev, installing: true, error: null }));
    try {
      const result = await window.electron?.hermescli?.installCli?.();
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo instalar Hermes CLI');
      }
      await checkHermesCliStatus();
      return true;
    } catch (error) {
      setHermesCliStatus(prev => ({
        ...prev,
        installing: false,
        error: error.message || 'No se pudo instalar Hermes CLI'
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

  const handleSaveHermesCliConfig = async () => {
    try {
      const validation = await window.electron?.hermescli?.validateConfig?.(hermesCliConfig);
      if (validation && validation.valid === false) {
        setHermesCliStatus(prev => ({ ...prev, error: validation.error || 'Configuración inválida' }));
        return;
      }
      const result = await window.electron?.hermescli?.setConfig?.(hermesCliConfig);
      if (result?.success) {
        setHermesCliStatus(prev => ({ ...prev, error: null }));
        await checkHermesCliStatus();
      } else {
        setHermesCliStatus(prev => ({ ...prev, error: result?.error || 'Error al guardar' }));
      }
    } catch (error) {
      setHermesCliStatus(prev => ({ ...prev, error: error.message }));
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

    if (clientKey === 'hermescli') {
      const willEnable = !clients.hermescli;
      saveClientsConfig({ ...clients, hermescli: willEnable });

      if (willEnable && !hermesCliStatus.installed) {
        const ok = await installHermesCli();
        if (!ok) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Hermes Agent activado',
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
    hermescli: 'hermescli',
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
      key: 'hermescli', category: 'cli',
      name: 'Hermes Agent', shortName: 'Hermes',
      color: '#14b8a6',
      description: 'Agente IA autónomo de Nous Research con memoria persistente, skills y TUI. Configura el modelo con hermes model o hermes setup.',
      features: ['Memoria persistente', 'Skills', 'TUI interactivo'],
      badges: [{ label: 'LOCAL CLI', severity: 'warning' }, { label: 'BETA WIN', severity: 'info' }],
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
    if (key === 'hermescli') return hermesCliStatus;
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
    const statusClass = isRunning ? 'apps-status-active' : 'apps-status-inactive';
    const statusText = isRunning ? t('rdp.guacdStatus.active') : t('rdp.guacdStatus.inactive');
    const activeMethodLabel = methodOptions.find(o => o.value === guacdPreferredMethod)?.label || guacdPreferredMethod;

    return (
      <div className="apps-config-container">
        {/* Tarjeta 1: Estado del Servidor Backend (Guacd) */}
        <div className="apps-config-card apps-backend-card">
          <div className="apps-card-header">
            <div className="apps-card-icon-wrapper">
              <i className="pi pi-server apps-card-icon" />
            </div>
            <div className="apps-card-header-text">
              <h3>{t('rdp.backendTitle') || 'Backend Guacamole'}</h3>
              <p className="apps-card-subtitle">Servicio de túnel y protocolo RDP</p>
            </div>
          </div>

          <div className="apps-card-content">
            <div className="apps-status-display">
              <div className="apps-status-main">
                <span className={`apps-status-indicator ${statusClass}`}></span>
                <span className="apps-status-text">
                  Estado: <strong>{statusText}</strong>
                </span>
              </div>
              <div className="apps-status-technical">
                <span className="apps-tech-label">Dirección:</span>
                <code className="apps-tech-code">
                  guacd://{guacdStatus?.host || '127.0.0.1'}:{guacdStatus?.port || 4822}
                </code>
              </div>
              <div className="apps-status-technical">
                <span className="apps-tech-label">Método actual:</span>
                <span className="apps-tech-value">{activeMethodLabel}</span>
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
              <small className="apps-field-hint">
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
        <div className="apps-config-card apps-params-card">
          <div className="apps-card-header">
            <div className="apps-card-icon-wrapper params-icon">
              <i className="pi pi-sliders-h apps-card-icon" />
            </div>
            <div className="apps-card-header-text">
              <h3>{t('rdp.title') || 'Parámetros de Sesión RDP'}</h3>
              <p className="apps-card-subtitle">Rendimiento, optimización y tiempos límite</p>
            </div>
            <Button
              icon="pi pi-undo"
              title={t('rdp.resetDefaults') || "Restaurar por defecto"}
              aria-label="Restaurar valores por defecto"
              className="p-button-rounded p-button-text p-button-sm rdp-reset-btn"
              onClick={handleResetRdpDefaults}
            />
          </div>

          <div className="apps-card-content">
            <div className="apps-params-grid">
              {/* Field 1: Inactividad de sesión */}
              <div className="apps-param-field">
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
                <span className="apps-param-desc">
                  {t('rdp.sessionActivityHint') || 'Tiempo máximo de sesión antes de reconexión.'}
                </span>
              </div>

              {/* Field 2: Umbral de inactividad */}
              <div className="apps-param-field">
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
                <span className="apps-param-desc">
                  {t('rdp.idleMinutesHint') || 'Pausa la conexión tras inactividad para ahorrar recursos.'}
                </span>
              </div>

              {/* Field 3: Debounce de redimensión */}
              <div className="apps-param-field">
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
                <span className="apps-param-desc">
                  {t('rdp.resizeDebounceHint') || 'Espera antes de enviar el nuevo tamaño al servidor.'}
                </span>
              </div>

              {/* Field 4: Timeout ACK */}
              <div className="apps-param-field">
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
                <span className="apps-param-desc">
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
    
    if (client.isLocalCli) {
      const status = getCliStatus(key);
      const isInstalled = status?.installed;
      const cliStatusClass = isInstalled ? 'apps-status-active' : 'apps-status-inactive';
      const cliStatusText = status?.loading 
        ? 'verificando...' 
        : isInstalled 
          ? `Listo${status.version && status.version !== 'unknown' ? ` (v${status.version})` : ''}` 
          : 'No instalado';
      
      // Determine dynamic functions, configs and save handlers based on key
      let config, setConfig, installFn, checkFn, saveFn, brandClass, brandColor;
      if (key === 'claude') {
        config = claudeConfig; setConfig = setClaudeConfig;
        installFn = installClaudeCli; checkFn = checkClaudeCliStatus; saveFn = handleSaveClaudeConfig;
        brandClass = 'btn-brand-claude'; brandColor = '#f59e0b';
      } else if (key === 'opencode') {
        config = openCodeConfig; setConfig = setOpenCodeConfig;
        installFn = installOpenCodeCli; checkFn = checkOpenCodeCliStatus; saveFn = handleSaveOpenCodeConfig;
        brandClass = 'btn-brand-opencode'; brandColor = '#6366f1';
      } else if (key === 'geminicli') {
        config = geminiCliConfig; setConfig = setGeminiCliConfig;
        installFn = installGeminiCli; checkFn = checkGeminiCliStatus; saveFn = handleSaveGeminiCliConfig;
        brandClass = 'btn-brand-gemini'; brandColor = '#1a73e8';
      } else if (key === 'antigravitycli') {
        config = antigravityCliConfig; setConfig = setAntigravityCliConfig;
        installFn = installAntigravityCli; checkFn = checkAntigravityCliStatus; saveFn = handleSaveAntigravityCliConfig;
        brandClass = 'btn-brand-antigravity'; brandColor = '#4285f4';
      } else if (key === 'hermescli') {
        config = hermesCliConfig; setConfig = setHermesCliConfig;
        installFn = installHermesCli; checkFn = checkHermesCliStatus; saveFn = handleSaveHermesCliConfig;
        brandClass = 'btn-brand-hermes'; brandColor = '#14b8a6';
      } else if (key === 'codexcli') {
        config = codexCliConfig; setConfig = setCodexCliConfig;
        installFn = installCodexCli; checkFn = checkCodexCliStatus; saveFn = handleSaveCodexCliConfig;
        brandClass = 'btn-brand-codex'; brandColor = '#10b981';
      }

      return (
        <div className="apps-config-container">
          {/* Tarjeta 1: Estado del CLI y Acciones */}
          <div className="apps-config-card apps-cli-status-card" style={{ borderColor: `${brandColor}25` }}>
            <div className="apps-card-header">
              <div className="apps-card-icon-wrapper" style={{ background: `${brandColor}12`, borderColor: `${brandColor}25`, color: brandColor }}>
                <i className="pi pi-info-circle apps-card-icon" />
              </div>
              <div className="apps-card-header-text">
                <h3>Estado del CLI</h3>
                <p className="apps-card-subtitle">Verificación e instalación del binario</p>
              </div>
            </div>

            <div className="apps-card-content">
              <div className="apps-status-display">
                <div className="apps-status-main">
                  <span className={`apps-status-indicator ${cliStatusClass}`}></span>
                  <span className="apps-status-text">
                    Estado: <strong>{cliStatusText}</strong>
                  </span>
                </div>
                {status?.binaryPath && (
                  <div className="apps-status-technical">
                    <span className="apps-tech-label">Binario:</span>
                    <code className="apps-tech-code">{status.binaryPath}</code>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {!isInstalled && (
                  <Button 
                    label="Instalar CLI" 
                    icon="pi pi-download" 
                    className={`apps-restart-btn p-button-sm ${brandClass}`} 
                    onClick={installFn} 
                    loading={status?.installing} 
                  />
                )}
                {isInstalled && (
                  <Button 
                    label="Reinstalar" 
                    icon="pi pi-refresh" 
                    className="apps-restart-btn p-button-secondary p-button-sm" 
                    onClick={installFn} 
                    loading={status?.installing} 
                  />
                )}
                <Button 
                  label="Verificar Estado" 
                  icon="pi pi-search" 
                  className="apps-restart-btn p-button-secondary p-button-sm" 
                  onClick={checkFn} 
                  loading={status?.loading} 
                />
              </div>
              
              {key === 'antigravitycli' && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.66rem', opacity: 0.8, color: 'var(--text-color-secondary)', lineHeight: 1.35 }}>
                  La autenticación se realiza dentro del CLI con tu cuenta Google. Tras instalar, reinicia NodeTerm si no se detecta el binario.
                </p>
              )}
              {key === 'hermescli' && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.66rem', opacity: 0.8, color: 'var(--text-color-secondary)', lineHeight: 1.35 }}>
                  Hermes en Windows nativo está en beta. Tras instalar, ejecuta hermes model o hermes setup. Multilínea: Ctrl+J.
                </p>
              )}
              {status?.error && (
                <div className="apps-detail-docker-error" style={{ marginTop: '0.5rem' }}>
                  <i className="pi pi-times-circle" />
                  <span>{status.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Configuración de Ejecución */}
          <div className="apps-config-card apps-cli-params-card" style={{ borderColor: `${brandColor}25` }}>
            <div className="apps-card-header">
              <div className="apps-card-icon-wrapper" style={{ background: `${brandColor}12`, borderColor: `${brandColor}25`, color: brandColor }}>
                <i className="pi pi-cog apps-card-icon" />
              </div>
              <div className="apps-card-header-text">
                <h3>Configuración</h3>
                <p className="apps-card-subtitle">Parámetros y credenciales del proceso</p>
              </div>
            </div>

            <div className="apps-card-content">
              <div className="apps-params-grid">
                <div className="apps-param-field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor={`${key}-binary-path`}>Ruta Binario</label>
                  <InputText 
                    id={`${key}-binary-path`}
                    value={config.binaryPath} 
                    onChange={(e) => setConfig(p => ({ ...p, binaryPath: e.target.value }))} 
                    placeholder={key === 'claude' ? 'npx @anthropic-ai/claude-code' : key === 'antigravitycli' ? '%LOCALAPPDATA%\\agy\\bin\\agy.exe' : key === 'hermescli' ? '%LOCALAPPDATA%\\hermes\\bin\\hermes.exe' : key} 
                    className="p-inputtext-sm" 
                    style={{ width: '100%' }} 
                  />
                </div>

                {key === 'claude' && (
                  <div className="apps-param-field">
                    <label htmlFor="claude-model">Modelo por defecto</label>
                    <InputText 
                      id="claude-model"
                      value={claudeConfig.defaultModel} 
                      onChange={(e) => setConfig(p => ({ ...p, defaultModel: e.target.value }))} 
                      placeholder="claude-3-7-sonnet-latest" 
                      className="p-inputtext-sm" 
                      style={{ width: '100%' }} 
                    />
                  </div>
                )}

                <div className="apps-param-field" style={{ gridColumn: key !== 'claude' ? 'span 2' : 'span 1' }}>
                  <label htmlFor={`${key}-extra-args`}>Argumentos Extra</label>
                  <InputText 
                    id={`${key}-extra-args`}
                    value={config.extraArgs} 
                    onChange={(e) => setConfig(p => ({ ...p, extraArgs: e.target.value }))} 
                    placeholder={key === 'claude' ? '--no-interactive' : ''} 
                    className="p-inputtext-sm" 
                    style={{ width: '100%' }} 
                  />
                </div>

                {key === 'claude' && (
                  <div className="apps-param-field" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="claude-auth-token">Auth Token</label>
                    <Password 
                      id="claude-auth-token"
                      value={claudeConfig.authToken} 
                      onChange={(e) => setConfig(p => ({ ...p, authToken: e.target.value }))} 
                      feedback={false} 
                      toggleMask 
                      placeholder="Token opcional" 
                      className="p-inputtext-sm" 
                      style={{ width: '100%' }} 
                      inputStyle={{ width: '100%' }} 
                    />
                  </div>
                )}
              </div>

              {(key === 'geminicli' || key === 'codexcli') && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
                  <div className="apps-param-field">
                    <label htmlFor={`${key}-api-key`}>{key === 'geminicli' ? 'API Key de Gemini' : 'API Key de OpenAI'}</label>
                    <Password 
                      id={`${key}-api-key`}
                      value={key === 'geminicli' ? geminiApiKeyInput : codexApiKeyInput} 
                      onChange={(e) => key === 'geminicli' ? setGeminiApiKeyInput(e.target.value) : setCodexApiKeyInput(e.target.value)} 
                      feedback={false} 
                      toggleMask 
                      placeholder={key === 'geminicli' 
                        ? (geminiApiKeySaved ? 'API key guardada (escribe para reemplazar)' : 'Pegar API key Gemini') 
                        : (codexApiKeySaved ? 'API key guardada (escribe para reemplazar)' : 'Pegar API key OpenAI')
                      } 
                      style={{ width: '100%' }} 
                      inputStyle={{ width: '100%' }} 
                    />
                  </div>
                  <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Button 
                      label={(key === 'geminicli' ? geminiApiKeyInput : codexApiKeyInput).trim() ? 'Guardar API key' : 'Eliminar API key'} 
                      icon="pi pi-key" 
                      className="p-button-secondary p-button-sm" 
                      onClick={key === 'geminicli' ? saveGeminiApiKey : saveCodexApiKey} 
                    />
                    {((key === 'geminicli' && geminiApiKeySaved) || (key === 'codexcli' && codexApiKeySaved)) && (
                      <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="pi pi-check" /> Guardada
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button 
                label="Guardar Configuración" 
                icon="pi pi-save" 
                className={`p-button-sm p-button-text ${brandClass}`}
                style={{ marginTop: '0.5rem', color: brandColor, alignSelf: 'flex-start' }} 
                onClick={saveFn} 
              />
            </div>
          </div>
        </div>
      );
    }
    
    if (client.requiresDocker) {
      const status = dockerStatus[client.key];
      const isBusy = status?.loading;
      const dockerStatusClass = status?.running ? 'apps-status-active' : 'apps-status-inactive';
      
      return (
        <div className="apps-config-container" style={{ gridTemplateColumns: '1fr' }}>
          <div className="apps-config-card apps-docker-card" style={{ borderColor: `${client.color}25` }}>
            <div className="apps-card-header">
              <div className="apps-card-icon-wrapper" style={{ background: `${client.color}12`, borderColor: `${client.color}25`, color: client.color }}>
                <i className="pi pi-docker apps-card-icon" />
              </div>
              <div className="apps-card-header-text">
                <h3>Servidor Docker</h3>
                <p className="apps-card-subtitle">Administración de imagen y actualizaciones del contenedor</p>
              </div>
            </div>

            <div className="apps-card-content">
              <div className="apps-status-display">
                <div className="apps-status-main">
                  <span className={`apps-status-indicator ${dockerStatusClass}`}></span>
                  <span className="apps-status-text">
                    Estado del contenedor: <strong>{status?.running ? 'En ejecución' : 'Detenido'}</strong>
                  </span>
                </div>
                <div className="apps-status-technical">
                  <span className="apps-tech-label">Imagen:</span>
                  <span className="apps-tech-value" style={{ color: status?.updateAvailable ? '#eab308' : '#22c55e', fontWeight: 600 }}>
                    {status?.updateAvailable ? 'Actualización disponible' : 'Actualizado a la última versión'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <Button 
                  label="Buscar actualización" 
                  icon="pi pi-search" 
                  className="p-button-secondary p-button-sm" 
                  onClick={() => checkDockerUpdate(client.key)} 
                  loading={isBusy} 
                />
                {status?.updateAvailable && (
                  <Button 
                    label="Actualizar ahora" 
                    icon="pi pi-download" 
                    className="p-button-success p-button-sm" 
                    onClick={() => applyDockerUpdate(client.key)} 
                    loading={isBusy} 
                  />
                )}
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.68rem', color: 'var(--text-color-secondary)', lineHeight: 1.35 }}>
                Las actualizaciones descargarán la última imagen de Docker Hub y reiniciarán el contenedor automáticamente.
              </p>
            </div>
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
  const cliInstalledCount = ['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli', 'hermescli'].filter(
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
