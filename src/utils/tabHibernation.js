/**
 * Hibernación de pestañas SSH: unmount UI sin matar la sesión en main.
 * v1: solo terminales SSH simples (no splits / RDP / Guac / locales).
 */

export const HIBERNATION_MRU_EXTRA = 3; // activa + 3 = hasta 4 SSH montados

export function touchMruKeys(prevKeys, tabKey, maxKeep = HIBERNATION_MRU_EXTRA + 1) {
  if (!tabKey) return prevKeys || [];
  const next = [tabKey, ...(prevKeys || []).filter((k) => k !== tabKey)];
  return next.slice(0, Math.max(1, maxKeep));
}

/**
 * ¿Esta pestaña es candidata a hibernar (unmount) cuando sale del MRU?
 */
export function isHibernatableSshTab(tab) {
  if (!tab) return false;
  const type = tab.type;
  if (type === 'split') return false;
  if (type !== 'terminal' && type !== 'TERMINAL') return false;
  if (!tab.sshConfig) return false;
  return true;
}

/**
 * ¿Debe permanecer montada en el renderer?
 */
export function shouldKeepTabMounted(tab, options = {}) {
  const {
    mruKeys = [],
    isActiveTab = false,
    isRecording = false,
    hasFileExplorer = false,
    hasSystemMonitor = false
  } = options;

  if (!tab) return false;

  // Nunca hibernar tipos no-SSH o splits / RDP / etc.
  if (!isHibernatableSshTab(tab)) return true;

  if (isActiveTab) return true;
  if (isRecording) return true;
  if (hasFileExplorer) return true;
  if (hasSystemMonitor) return true;
  if ((mruKeys || []).includes(tab.key)) return true;

  return false;
}
