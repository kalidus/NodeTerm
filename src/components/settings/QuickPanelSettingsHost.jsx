import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import GeneralSettingsTab from './tabs/GeneralSettingsTab';
import SecuritySettingsTab from './tabs/SecuritySettingsTab';
import { STORAGE_KEYS } from '../../utils/constants';
import {
  buildDefaultTerminalOptions,
  getPlatformDefaultTerminalType,
  sanitizeAndPersistDefaultTerminal,
  setDefaultLocalTerminal as persistDefaultLocalTerminal
} from '../../utils/defaultLocalTerminal';

function readAiClientsEnabled() {
  try {
    const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
    return {
      cygwin: cfg.cygwin === true,
      claude: cfg.claude === true,
      opencode: cfg.opencode === true,
      codexcli: cfg.codexcli === true,
      antigravitycli: cfg.antigravitycli === true,
      hermescli: cfg.hermescli === true
    };
  } catch {
    return {};
  }
}

function readSavedTerminal() {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL) || getPlatformDefaultTerminalType();
  } catch {
    return getPlatformDefaultTerminalType();
  }
}

/**
 * Monta General o Seguridad dentro del panel rápido, reutilizando las pestañas de Configuración.
 */
export default function QuickPanelSettingsHost({
  mode = 'general',
  securitySubTab = 'clave-maestra',
  contentHeight = 480,
  onClose
}) {
  const toastRef = useRef(null);
  const [platform, setPlatform] = useState(() => window.electron?.platform || 'unknown');
  const [wslDistributions, setWslDistributions] = useState([]);
  const [wslLoaded, setWslLoaded] = useState(() => (window.electron?.platform || 'unknown') !== 'win32');
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [cygwinDone, setCygwinDone] = useState(() => (window.electron?.platform || 'unknown') !== 'win32');
  const [aiClientsEnabled, setAiClientsEnabled] = useState(readAiClientsEnabled);
  const [defaultLocalTerminal, setDefaultLocalTerminal] = useState(readSavedTerminal);

  useEffect(() => {
    if (window.electron?.platform) setPlatform(window.electron.platform);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWslLoaded(platform !== 'win32');
    const detect = async () => {
      try {
        if (platform === 'win32' && window.electron?.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          if (!cancelled) setWslDistributions(Array.isArray(distributions) ? distributions : []);
        } else if (!cancelled) {
          setWslDistributions([]);
        }
      } catch {
        if (!cancelled) setWslDistributions([]);
      } finally {
        if (!cancelled) setWslLoaded(true);
      }
    };
    detect();
    return () => { cancelled = true; };
  }, [platform]);

  useEffect(() => {
    let cancelled = false;
    setCygwinDone(platform !== 'win32');
    const detect = async () => {
      try {
        if (platform === 'win32' && window.electronAPI) {
          const result = await window.electronAPI.invoke('cygwin:detect');
          if (!cancelled) {
            setCygwinAvailable(result && typeof result.available === 'boolean' ? result.available : false);
          }
        } else if (!cancelled) {
          setCygwinAvailable(false);
        }
      } catch {
        if (!cancelled) setCygwinAvailable(false);
      } finally {
        if (!cancelled) setCygwinDone(true);
      }
    };
    if (platform === 'win32') detect();
    return () => { cancelled = true; };
  }, [platform]);

  useEffect(() => {
    const syncClients = () => setAiClientsEnabled(readAiClientsEnabled());
    const onStorage = (event) => {
      if (event.key === 'ai_clients_enabled') syncClients();
    };
    window.addEventListener('ai-clients-config-changed', syncClients);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ai-clients-config-changed', syncClients);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const defaultTerminalOptions = useMemo(() => buildDefaultTerminalOptions({
    platform,
    wslDistributions,
    cygwinAvailable,
    aiClientsEnabled
  }), [platform, wslDistributions, cygwinAvailable, aiClientsEnabled]);

  const terminalOptionsReady = platform !== 'win32' || (wslLoaded && cygwinDone);

  useEffect(() => {
    if (!terminalOptionsReady || defaultTerminalOptions.length === 0) return;
    const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL);
    const { value, changed } = sanitizeAndPersistDefaultTerminal(saved, defaultTerminalOptions, platform, {
      terminalOptionsReady: true
    });
    if (changed) persistDefaultLocalTerminal(value);
    setDefaultLocalTerminal((prev) => (prev === value ? prev : value));
  }, [defaultTerminalOptions, platform, terminalOptionsReady]);

  useEffect(() => {
    const onTerminalChanged = (event) => {
      const next = event.detail?.terminalType;
      if (next) setDefaultLocalTerminal(next);
    };
    window.addEventListener('default-terminal-changed', onTerminalChanged);
    return () => window.removeEventListener('default-terminal-changed', onTerminalChanged);
  }, []);

  const handleDefaultTerminalChange = useCallback((terminalType) => {
    if (!persistDefaultLocalTerminal(terminalType)) return;
    setDefaultLocalTerminal(terminalType);
  }, []);

  const showToast = useCallback((severity, summary, detail, life = 3000) => {
    toastRef.current?.show?.({ severity, summary, detail, life });
  }, []);

  const publishMasterKey = useCallback((key) => {
    window.dispatchEvent(new CustomEvent('master-key-updated', { detail: { key } }));
  }, []);

  const height = Math.max(240, contentHeight || 480);

  return (
    <>
      <Toast ref={toastRef} position="top-right" baseZIndex={100000} appendTo={typeof document !== 'undefined' ? document.body : undefined} />
      {mode === 'security' ? (
        <SecuritySettingsTab
          contentHeight={height}
          activeSubTab={securitySubTab || 'clave-maestra'}
          toastRef={toastRef}
          showToast={showToast}
          onHide={onClose}
          isVisible
          onMasterPasswordConfigured={publishMasterKey}
          onMasterPasswordChanged={publishMasterKey}
        />
      ) : (
        <GeneralSettingsTab
          contentHeight={height}
          defaultLocalTerminal={defaultLocalTerminal}
          defaultTerminalOptions={defaultTerminalOptions}
          terminalOptionsReady={terminalOptionsReady}
          onDefaultTerminalChange={handleDefaultTerminalChange}
        />
      )}
    </>
  );
}
