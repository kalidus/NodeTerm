import { STORAGE_KEYS } from './constants';

const TERMINAL_TITLES = {
  powershell: 'Windows PowerShell',
  wsl: 'WSL',
  cygwin: 'Cygwin',
  claude: 'Claude Code',
  opencode: 'OpenCode',
  geminicli: 'Gemini CLI',
  codexcli: 'Codex CLI',
  antigravitycli: 'Antigravity CLI',
  hermescli: 'Hermes Agent'
};

const AI_CLIENT_OPTIONS = [
  { key: 'claude', label: 'Claude Code', value: 'claude' },
  { key: 'opencode', label: 'OpenCode', value: 'opencode' },
  { key: 'geminicli', label: 'Gemini CLI', value: 'geminicli' },
  { key: 'codexcli', label: 'Codex CLI', value: 'codexcli' },
  { key: 'antigravitycli', label: 'Antigravity CLI', value: 'antigravitycli' },
  { key: 'hermescli', label: 'Hermes Agent', value: 'hermescli' }
];

/**
 * Terminal local por defecto según plataforma.
 * @returns {'powershell' | 'linux-terminal'}
 */
export function getPlatformDefaultTerminalType(platform) {
  const p = platform || (typeof window !== 'undefined' && window.electron?.platform) || 'unknown';
  if (p === 'linux' || p === 'darwin') {
    return 'linux-terminal';
  }
  return 'powershell';
}

/**
 * @param {object} params
 * @param {string} params.platform
 * @param {Array} [params.wslDistributions]
 * @param {boolean} [params.cygwinAvailable]
 * @param {object} [params.aiClientsEnabled]
 * @returns {Array<{ label: string, value: string }>}
 */
export function buildDefaultTerminalOptions({
  platform,
  wslDistributions = [],
  cygwinAvailable = false,
  aiClientsEnabled = {}
}) {
  const options = [];
  const enabledAi = AI_CLIENT_OPTIONS.filter((o) => aiClientsEnabled[o.key] === true);

  if (platform === 'win32') {
    options.push({ label: 'PowerShell', value: 'powershell' });
    enabledAi.forEach((o) => options.push({ label: o.label, value: o.value }));

    if (wslDistributions && wslDistributions.length > 0) {
      wslDistributions.forEach((distro) => {
        options.push({
          label: distro.label || distro.name,
          value: distro.name
        });
      });
    }

    if (cygwinAvailable) {
      options.push({ label: 'Cygwin', value: 'cygwin' });
    }
  } else if (platform === 'linux' || platform === 'darwin') {
    options.push({
      label: platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux',
      value: 'linux-terminal'
    });
    enabledAi.forEach((o) => options.push({ label: o.label, value: o.value }));
  } else {
    options.push({ label: 'PowerShell', value: 'powershell' });
    options.push({ label: 'Terminal', value: 'linux-terminal' });
    enabledAi.forEach((o) => options.push({ label: o.label, value: o.value }));
  }

  return options;
}

function looksLikeWslDistro(value) {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.toLowerCase();
  if (normalized === 'powershell' || normalized === 'cygwin' || normalized === 'linux-terminal') {
    return false;
  }
  if (normalized.startsWith('docker-')) return false;
  const aiValues = AI_CLIENT_OPTIONS.map((o) => o.value);
  if (aiValues.includes(normalized)) return false;

  return normalized.startsWith('wsl-') ||
    normalized.includes('ubuntu') ||
    normalized.includes('debian') ||
    normalized.includes('kali') ||
    normalized.includes('linux') ||
    normalized === 'wsl';
}

function inferWslCategory(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('ubuntu')) return 'ubuntu';
  if (normalized.includes('debian')) return 'debian';
  return 'wsl';
}

function findWslDistro(defaultTerminal, wslDistributions) {
  if (!defaultTerminal || !wslDistributions?.length) return null;
  const normalized = String(defaultTerminal).toLowerCase();
  return wslDistributions.find((d) => {
    const name = d.name ? String(d.name).toLowerCase() : '';
    const label = d.label ? String(d.label).toLowerCase() : '';
    return d.name === defaultTerminal ||
      d.label === defaultTerminal ||
      name === normalized ||
      label === normalized;
  }) || null;
}

/**
 * Resuelve la pestaña inicial a partir del valor guardado en configuración.
 * @param {string|null|undefined} defaultTerminal
 * @param {{ platform?: string, wslDistributions?: Array, useCygwin?: boolean }} context
 * @returns {{ id: string, title: string, type: string, active: boolean, distroInfo?: object }}
 */
export function resolveInitialTabFromDefault(defaultTerminal, context = {}) {
  const platform = context.platform || (typeof window !== 'undefined' && window.electron?.platform) || 'unknown';
  const wslDistributions = context.wslDistributions || [];
  const useCygwin = context.useCygwin === true;
  const tabId = context.tabId || 'tab-1';

  const base = (partial) => ({
    id: tabId,
    active: true,
    ...partial
  });

  if (defaultTerminal) {
    if (defaultTerminal.startsWith('docker-') || defaultTerminal === 'wsl') {
      return base({
        title: 'Windows PowerShell',
        type: 'powershell'
      });
    }

    const wslDistro = findWslDistro(defaultTerminal, wslDistributions);
    if (wslDistro) {
      return base({
        title: wslDistro.label || wslDistro.name,
        type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'),
        distroInfo: wslDistro
      });
    }

    if (defaultTerminal === 'linux-terminal') {
      const title = platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux';
      return base({ title, type: 'powershell' });
    }

    if (TERMINAL_TITLES[defaultTerminal]) {
      return base({
        title: TERMINAL_TITLES[defaultTerminal],
        type: defaultTerminal
      });
    }

    if (looksLikeWslDistro(defaultTerminal)) {
      const inferredCategory = inferWslCategory(defaultTerminal);
      return base({
        title: defaultTerminal,
        type: inferredCategory === 'ubuntu' ? 'ubuntu' : (inferredCategory === 'debian' ? 'debian' : 'wsl-distro'),
        distroInfo: {
          name: defaultTerminal,
          label: defaultTerminal,
          category: inferredCategory
        }
      });
    }

    return base({
      title: defaultTerminal,
      type: 'powershell'
    });
  }

  if (platform === 'linux') {
    return base({ title: 'Terminal Linux', type: 'powershell' });
  }
  if (platform === 'darwin') {
    return base({ title: 'Terminal macOS', type: 'powershell' });
  }
  if (useCygwin) {
    return base({ title: 'Cygwin', type: 'cygwin' });
  }
  return base({ title: 'Windows PowerShell', type: 'powershell' });
}

/**
 * Actualiza tab-1 según el nuevo terminal por defecto (para evento default-terminal-changed).
 * @param {string} defaultTerminal
 * @param {{ platform?: string, wslDistributions?: Array }} context
 * @returns {{ title: string, type: string, distroInfo?: object }|null}
 */
export function resolveTabUpdateFromDefault(defaultTerminal, context = {}) {
  if (!defaultTerminal) return null;

  const resolved = resolveInitialTabFromDefault(defaultTerminal, {
    ...context,
    tabId: 'tab-1'
  });

  const update = {
    title: resolved.title,
    type: resolved.type,
    distroInfo: resolved.distroInfo || null
  };

  return update;
}

/**
 * @param {string|null|undefined} saved
 * @param {Array<{ label: string, value: string }>} options
 * @param {string} [platform]
 * @returns {string}
 */
export function sanitizeDefaultTerminal(saved, options, platform, { terminalOptionsReady = true } = {}) {
  const fallback = getPlatformDefaultTerminalType(platform);
  if (!saved || typeof saved !== 'string') {
    return fallback;
  }

  if (saved === 'wsl' || saved.startsWith('docker-')) {
    if (platform === 'win32' && !terminalOptionsReady) {
      return saved;
    }
    const firstDistro = options.find((o) =>
      o.value !== 'powershell' &&
      o.value !== 'linux-terminal' &&
      o.value !== 'cygwin' &&
      !AI_CLIENT_OPTIONS.some((a) => a.value === o.value)
    );
    return firstDistro?.value || fallback;
  }

  const validValues = new Set(options.map((o) => o.value));
  if (validValues.has(saved)) {
    return saved;
  }

  const wslMatch = options.find((o) =>
    o.value.toLowerCase() === saved.toLowerCase() ||
    o.label?.toLowerCase() === saved.toLowerCase()
  );
  if (wslMatch) {
    return wslMatch.value;
  }

  // No resetear distros WSL/Cygwin guardadas mientras el dropdown aún no tiene todas las opciones
  if (platform === 'win32' && !terminalOptionsReady) {
    if (looksLikeWslDistro(saved) || saved === 'cygwin') {
      return saved;
    }
  }

  return fallback;
}

/**
 * Sanitiza y persiste en localStorage si cambió.
 * @returns {{ value: string, changed: boolean }}
 */
export function sanitizeAndPersistDefaultTerminal(saved, options, platform, context = {}) {
  const sanitized = sanitizeDefaultTerminal(saved, options, platform, context);
  const changed = sanitized !== saved;
  if (changed && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL, sanitized);
  }
  return { value: sanitized, changed };
}

export function isExplicitNonWslDefault(defaultTerminal) {
  if (!defaultTerminal || typeof defaultTerminal !== 'string') return false;
  if (defaultTerminal === 'powershell' || defaultTerminal === 'linux-terminal' || defaultTerminal === 'cygwin') {
    return true;
  }
  return AI_CLIENT_OPTIONS.some((o) => o.value === defaultTerminal);
}
