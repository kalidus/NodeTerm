/**
 * Hibernación de pestañas: unmount UI sin matar la sesión en main.
 * Solo SSH simples con preserve/ring. Locales NO hibernan: unmount haría *:stop
 * y el switch-back sería un cold start (rompe la sensación de instantáneo).
 */

function readIsLowRam() {
  try {
    return !!window?.electron?.linuxPerf?.isLowRam;
  } catch {
    return false;
  }
}

/** activa + N extras. Low-RAM → menos pestañas montadas. */
export function getHibernationMruExtra() {
  return readIsLowRam() ? 1 : 3;
}

/** @deprecated Prefer getHibernationMruExtra(); se mantiene por compat. */
export const HIBERNATION_MRU_EXTRA = 3;

export function touchMruKeys(prevKeys, tabKey, maxKeep) {
  const keep = typeof maxKeep === 'number'
    ? maxKeep
    : getHibernationMruExtra() + 1;
  if (!tabKey) return prevKeys || [];
  const next = [tabKey, ...(prevKeys || []).filter((k) => k !== tabKey)];
  return next.slice(0, Math.max(1, keep));
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
 * Locales: desactivado hasta exista preserve PTY + ring como SSH.
 * @returns {false}
 */
export function isHibernatableLocalTab(_tab) {
  return false;
}

export function isHibernatableTab(tab) {
  return isHibernatableSshTab(tab);
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

  // Tipos no hibernables (Home, locales, RDP, Guac, splits, etc.) siempre montados.
  if (!isHibernatableTab(tab)) return true;

  if (isActiveTab) return true;
  if (isRecording) return true;
  if (hasFileExplorer) return true;
  if (hasSystemMonitor) return true;
  if ((mruKeys || []).includes(tab.key)) return true;

  return false;
}
