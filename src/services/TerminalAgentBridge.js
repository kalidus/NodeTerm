/**
 * Puente del agente MCP hacia terminales PTY visibles de NodeTerm.
 * Escribe por IPC (mismo path que la UI), mantiene buffer, tipado humano y exec con marker.
 */

import { terminalOutputBuffer } from './TerminalOutputBuffer';
import {
  getAgentSession,
  setHumanInputLocked,
  setAgentBusy,
  setShellFamily,
  isAgentBusy
} from './terminalAgentState';
import {
  assertPasswordPrompt,
  markPromptConsumed,
  recordAgentCommand,
  tryIssueTicketAfterWait,
  consumePromptTicket,
  assertInjectRateLimit,
  noteInjectAttempt,
  appendAudit,
  clearTerminalPolicy,
  extractCommandFromWritePayload
} from './secretInjectPolicy.js';

const KEY_MAP = {
  enter: '\r',
  return: '\r',
  tab: '\t',
  escape: '\x1b',
  esc: '\x1b',
  backspace: '\x7f',
  delete: '\x1b[3~',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  'ctrl+c': '\x03',
  'ctrl+d': '\x04',
  'ctrl+z': '\x1a',
  'ctrl+l': '\x0c',
  'ctrl+a': '\x01',
  'ctrl+e': '\x05',
  'ctrl+u': '\x15',
  'ctrl+k': '\x0b',
  'ctrl+w': '\x17'
};

const PTY_TAB_TYPES = new Set(['terminal', 'local-terminal', 'docker']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuidShort() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractSplitLeaves(node, acc = []) {
  if (!node) return acc;
  if (node.type === 'split' || node.first || node.second) {
    extractSplitLeaves(node.first, acc);
    extractSplitLeaves(node.second, acc);
    if (node.leftTerminal) extractSplitLeaves(node.leftTerminal, acc);
    if (node.rightTerminal) extractSplitLeaves(node.rightTerminal, acc);
    if (Array.isArray(node.terminals)) {
      node.terminals.forEach((t) => extractSplitLeaves(t, acc));
    }
    return acc;
  }
  if (node.key && PTY_TAB_TYPES.has(node.type)) {
    acc.push(node);
  } else if (node.id && (node.type === 'ssh' || node.sshConfig || node.terminalType)) {
    acc.push({
      key: node.id || node.key,
      label: node.title || node.label || node.id,
      type: node.sshConfig ? 'terminal' : 'local-terminal',
      terminalType: node.type || node.terminalType,
      sshConfig: node.sshConfig,
      originalKey: node.originalKey
    });
  }
  return acc;
}

function inferShellFamily(tab) {
  if (!tab) return 'unix';
  if (tab.type === 'terminal') return 'unix';
  const tt = (tab.terminalType || '').toLowerCase();
  if (tt === 'powershell' || tt === 'linux-terminal') return 'powershell';
  if (
    tt === 'wsl' ||
    tt === 'ubuntu' ||
    tt === 'debian' ||
    tt === 'wsl-distro' ||
    tt === 'cygwin' ||
    tt.startsWith('wsl') ||
    tt.startsWith('docker')
  ) {
    return 'unix';
  }
  // AI CLIs suelen ir sobre shell host; en Windows PowerShell
  if (['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli', 'hermescli'].includes(tt)) {
    return typeof navigator !== 'undefined' && /win/i.test(navigator.platform || '') ? 'powershell' : 'unix';
  }
  return 'unix';
}

function getIpcWriteChannel(tab, terminalId) {
  if (!tab) return null;
  if (tab.type === 'terminal') {
    return { kind: 'ssh', channel: null, terminalId };
  }
  const tt = tab.terminalType || 'powershell';
  if (tt === 'powershell' || tt === 'linux-terminal') {
    return { kind: 'local', channel: `powershell:data:${terminalId}` };
  }
  if (tt === 'wsl') {
    return { kind: 'local', channel: `wsl:data:${terminalId}` };
  }
  if (tt === 'ubuntu') {
    return { kind: 'local', channel: `ubuntu:data:${terminalId}` };
  }
  if (tt === 'wsl-distro' || tt === 'debian' || (tab.distroInfo && tab.distroInfo.name)) {
    return { kind: 'local', channel: `wsl-distro:data:${terminalId}` };
  }
  if (tt === 'cygwin') {
    return { kind: 'local', channel: `cygwin:data:${terminalId}` };
  }
  if (tt === 'docker' || tab.type === 'docker' || String(tt).startsWith('docker')) {
    return { kind: 'local', channel: `docker:data:${terminalId}` };
  }
  if (tt === 'claude') return { kind: 'local', channel: `claude:data:${terminalId}` };
  if (tt === 'opencode') return { kind: 'local', channel: `opencode:data:${terminalId}` };
  if (tt === 'geminicli') return { kind: 'local', channel: `geminicli:data:${terminalId}` };
  if (tt === 'codexcli') return { kind: 'local', channel: `codexcli:data:${terminalId}` };
  if (tt === 'antigravitycli') return { kind: 'local', channel: `antigravitycli:data:${terminalId}` };
  if (tt === 'hermescli') return { kind: 'local', channel: `hermescli:data:${terminalId}` };
  return { kind: 'local', channel: `powershell:data:${terminalId}` };
}

function getIpcOutputChannel(tab, terminalId) {
  if (!tab) return null;
  if (tab.type === 'terminal') return `ssh:data:${terminalId}`;
  const write = getIpcWriteChannel(tab, terminalId);
  return write && write.channel ? write.channel : null;
}

function findNodeById(nodes, id) {
  if (!Array.isArray(nodes) || id == null) return null;
  const needle = String(id);
  for (const node of nodes) {
    if (!node) continue;
    if (String(node.key) === needle || String(node.id) === needle) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function extractConnectionSecret(node, field = 'password') {
  if (!node) return null;
  const data = node.data || node.sshConfig || {};
  const f = field === 'passphrase' ? 'passphrase' : 'password';
  let value = null;
  if (f === 'passphrase') {
    value = data.passphrase || data.passPhrase || null;
  } else {
    value = data.password || data.sshPassword || null;
  }
  if (value == null || String(value).length === 0) return null;
  return String(value);
}

function extractKeepassSecret(node, field = 'password') {
  if (!node || !node.data) return null;
  if (field !== 'password') return null;
  const value = node.data.password;
  if (value == null || String(value).length === 0) return null;
  return String(value);
}

class TerminalAgentBridge {
  constructor() {
    this._deps = null;
    this._outputUnsubs = new Map();
  }

  /**
   * deps: {
   *   getTabs: () => array,
   *   getActiveTabKey: () => string|null,
   *   openSSHConnection: (nodeOrConn) => void,
   *   createLocalTerminal: (localType, distroInfo?) => string|void, // prefer return tabId
   *   focusTerminal: (terminalId) => void,
   *   findConnectionById: (id) => node|null,
   *   getPasswordsTree: () => Promise<array>|array,
   *   getTerminalRef: (terminalId) => ref|null
   * }
   */
  setDependencies(deps) {
    this._deps = deps;
  }

  _requireDeps() {
    if (!this._deps) {
      throw Object.assign(new Error('Terminal agent bridge not ready'), { code: 'bridge_not_ready' });
    }
    return this._deps;
  }

  _findTab(terminalId) {
    const { getTabs } = this._requireDeps();
    const tabs = getTabs() || [];
    for (const tab of tabs) {
      if (tab.key === terminalId && PTY_TAB_TYPES.has(tab.type)) return tab;
      if (tab.type === 'split') {
        const leaves = extractSplitLeaves(tab);
        const found = leaves.find((t) => t.key === terminalId);
        if (found) return found;
      }
    }
    return null;
  }

  _ensureOutputListener(terminalId, tab) {
    if (this._outputUnsubs.has(terminalId)) return;
    const channel = getIpcOutputChannel(tab, terminalId);
    if (!channel || !window.electron?.ipcRenderer?.on) return;

    const handler = (data) => {
      const chunk = typeof data === 'string' ? data : (data && data.data != null ? data.data : String(data || ''));
      terminalOutputBuffer.append(terminalId, chunk);
    };
    const unsub = window.electron.ipcRenderer.on(channel, handler);
    this._outputUnsubs.set(terminalId, typeof unsub === 'function' ? unsub : () => {});
  }

  _releaseOutputListener(terminalId) {
    const unsub = this._outputUnsubs.get(terminalId);
    if (unsub) {
      try { unsub(); } catch (_) { /* ignore */ }
      this._outputUnsubs.delete(terminalId);
    }
    terminalOutputBuffer.clear(terminalId);
  }

  listOpenTerminals() {
    if (!this._deps || typeof this._deps.getTabs !== 'function') {
      return { terminals: [], error: 'bridge_not_ready', message: 'NodeTerm UI not ready yet' };
    }
    const { getTabs, getActiveTabKey } = this._deps;
    const tabs = getTabs() || [];
    const activeKey = getActiveTabKey ? getActiveTabKey() : null;
    const result = [];

    const pushTab = (tab, parentSplitId = null) => {
      if (!tab || !tab.key || !PTY_TAB_TYPES.has(tab.type)) return;
      this._ensureOutputListener(tab.key, tab);
      setShellFamily(tab.key, inferShellFamily(tab));
      const agent = getAgentSession(tab.key);
      result.push({
        terminalId: tab.key,
        connectionId: tab.originalKey || null,
        name: tab.label || tab.key,
        type: tab.type === 'terminal' ? 'ssh' : (tab.type === 'docker' ? 'docker' : 'local'),
        localType: tab.terminalType || null,
        status: 'connected',
        focused: tab.key === activeKey,
        humanInputLocked: agent.humanInputLocked,
        agentBusy: agent.agentBusy,
        parentSplitId,
        cwd: null,
        pid: null
      });
    };

    for (const tab of tabs) {
      if (PTY_TAB_TYPES.has(tab.type)) {
        pushTab(tab, null);
      } else if (tab.type === 'split') {
        extractSplitLeaves(tab).forEach((leaf) => pushTab(leaf, tab.key));
      }
    }
    return { terminals: result, count: result.length };
  }

  async openTerminal({ connectionId, localType, distroName, cwd, focus = true } = {}) {
    const deps = this._requireDeps();
    if (!connectionId && !localType) {
      return { success: false, error: 'connectionId_or_localType_required' };
    }

    const before = new Set((this.listOpenTerminals().terminals || []).map((t) => t.terminalId));

    if (connectionId) {
      const node = deps.findConnectionById
        ? deps.findConnectionById(connectionId)
        : null;
      if (!node) {
        return { success: false, error: 'connection_not_found', connectionId };
      }
      deps.openSSHConnection(node);
    } else {
      const distroInfo = distroName ? { name: distroName } : null;
      if (typeof deps.createLocalTerminal !== 'function') {
        return { success: false, error: 'local_terminal_unavailable' };
      }
      deps.createLocalTerminal(localType, distroInfo, cwd);
    }

    const deadline = Date.now() + 15000;
    let terminalId = null;
    while (Date.now() < deadline) {
      const { terminals } = this.listOpenTerminals();
      const created = terminals.find((t) => !before.has(t.terminalId));
      if (created) {
        terminalId = created.terminalId;
        break;
      }
      // Si reusa o no detectamos nuevo, coger el focused reciente SSH matching
      if (connectionId) {
        const match = terminals.find((t) => t.connectionId === connectionId && t.focused);
        if (match) {
          terminalId = match.terminalId;
          break;
        }
      }
      await sleep(100);
    }

    if (!terminalId) {
      return { success: false, error: 'open_timeout' };
    }

    if (focus && deps.focusTerminal) {
      deps.focusTerminal(terminalId);
    }

    // Esperar ready basico
    const readyDeadline = Date.now() + 20000;
    while (Date.now() < readyDeadline) {
      const ref = deps.getTerminalRef ? deps.getTerminalRef(terminalId) : null;
      if (ref && typeof ref.isReady === 'function' && ref.isReady()) break;
      if (ref && typeof ref.focus === 'function') break;
      await sleep(100);
    }

    return {
      success: true,
      terminalId,
      status: 'connected'
    };
  }

  focusTerminal(terminalId) {
    const tab = this._findTab(terminalId);
    if (!tab) return { success: false, error: 'terminal_not_found' };
    const { focusTerminal, getTerminalRef } = this._requireDeps();
    if (focusTerminal) focusTerminal(terminalId);
    const ref = getTerminalRef ? getTerminalRef(terminalId) : null;
    if (ref && typeof ref.focus === 'function') {
      try { ref.focus(); } catch (_) { /* ignore */ }
    }
    return { success: true, terminalId, focused: true };
  }

  setInputLock(terminalId, locked) {
    const tab = this._findTab(terminalId);
    if (!tab) return { success: false, error: 'terminal_not_found' };
    const state = setHumanInputLocked(terminalId, locked);
    return {
      success: true,
      terminalId,
      humanInputLocked: state.humanInputLocked
    };
  }

  getStatus(terminalId) {
    const tab = this._findTab(terminalId);
    if (!tab) return { error: 'terminal_not_found' };
    this._ensureOutputListener(terminalId, tab);
    const agent = getAgentSession(terminalId);
    const { getActiveTabKey } = this._requireDeps();
    const activeKey = getActiveTabKey ? getActiveTabKey() : null;
    return {
      terminalId,
      connectionId: tab.originalKey || null,
      type: tab.type === 'terminal' ? 'ssh' : 'local',
      localType: tab.terminalType || null,
      status: 'connected',
      focused: terminalId === activeKey,
      humanInputLocked: agent.humanInputLocked,
      busy: agent.agentBusy,
      lastActivityAt: terminalOutputBuffer.getLastActivityAt(terminalId)
        ? new Date(terminalOutputBuffer.getLastActivityAt(terminalId)).toISOString()
        : null,
      bufferOffset: terminalOutputBuffer.getOffset(terminalId),
      error: null
    };
  }

  rawWrite(terminalId, data) {
    const tab = this._findTab(terminalId);
    if (!tab) throw Object.assign(new Error('terminal_not_found'), { code: 'terminal_not_found' });
    this._ensureOutputListener(terminalId, tab);
    setShellFamily(terminalId, inferShellFamily(tab));

    const ipc = getIpcWriteChannel(tab, terminalId);
    if (!window.electron?.ipcRenderer) {
      throw Object.assign(new Error('electron_unavailable'), { code: 'electron_unavailable' });
    }

    // No append local del input: el buffer solo se alimenta del output IPC real.
    // Si se append-eara aqui, waitForPattern haria match inmediato con el marker.

    if (ipc.kind === 'ssh') {
      window.electron.ipcRenderer.send('ssh:data', { tabId: terminalId, data });
    } else {
      window.electron.ipcRenderer.send(ipc.channel, data);
    }
    return data.length;
  }

  resolveKeys(keys) {
    if (!keys) return '';
    const list = Array.isArray(keys) ? keys : [keys];
    return list.map((k) => {
      const key = String(k).toLowerCase();
      if (KEY_MAP[key] != null) return KEY_MAP[key];
      if (key.startsWith('ctrl+') && key.length === 6) {
        const ch = key.charCodeAt(5) - 96;
        if (ch >= 1 && ch <= 26) return String.fromCharCode(ch);
      }
      return k;
    }).join('');
  }

  async writeTerminal(terminalId, {
    data = null,
    keys = null,
    humanTyping = false,
    takeControl = true,
    keepLocked = false
  } = {}) {
    const tab = this._findTab(terminalId);
    if (!tab) return { success: false, error: 'terminal_not_found' };
    if (isAgentBusy(terminalId)) {
      return { success: false, error: 'busy', statusCode: 409 };
    }

    let payload = data != null ? String(data) : '';
    if (keys) payload += this.resolveKeys(keys);
    if (!payload) return { success: false, error: 'data_or_keys_required' };

    if (takeControl) {
      setHumanInputLocked(terminalId, true);
      setAgentBusy(terminalId, true);
    }

    try {
      const cmdLine = extractCommandFromWritePayload(data, keys);
      if (cmdLine) {
        recordAgentCommand(terminalId, cmdLine);
      }
      const session = getAgentSession(terminalId);
      let bytes = 0;
      if (humanTyping) {
        for (const ch of payload) {
          bytes += this.rawWrite(terminalId, ch);
          const base = session.typingSpeedMs || 25;
          const jitter = Math.floor(Math.random() * 12);
          await sleep(base + jitter);
        }
      } else {
        bytes = this.rawWrite(terminalId, payload);
      }
      return { success: true, bytesWritten: bytes };
    } finally {
      setAgentBusy(terminalId, false);
      if (takeControl && !keepLocked) {
        setHumanInputLocked(terminalId, false);
      }
    }
  }

  readBuffer(terminalId, { maxChars = null, maxLines = null, fromOffset = null } = {}) {
    const tab = this._findTab(terminalId);
    if (!tab) return { error: 'terminal_not_found' };
    this._ensureOutputListener(terminalId, tab);
    const result = terminalOutputBuffer.read(terminalId, { maxChars, maxLines, fromOffset });
    return { terminalId, ...result };
  }

  async waitPattern(terminalId, {
    pattern,
    regex = false,
    timeoutMs = 15000,
    includeBuffer = true,
    takeControl = true,
    keepLocked = false
  } = {}) {
    const tab = this._findTab(terminalId);
    if (!tab) return { error: 'terminal_not_found' };
    this._ensureOutputListener(terminalId, tab);

    if (takeControl) {
      setHumanInputLocked(terminalId, true);
      setAgentBusy(terminalId, true);
    }
    try {
      const waitResult = await terminalOutputBuffer.waitForPattern(terminalId, {
        pattern,
        regex,
        timeoutMs,
        includeBuffer
      });
      let promptTicket = null;
      let matchedPrompt = null;
      let ticketExpiresInMs = null;
      if (waitResult && waitResult.matched) {
        const buf = terminalOutputBuffer.read(terminalId, { maxChars: 2048 });
        const issued = tryIssueTicketAfterWait(terminalId, buf.text || '', buf.offset || 0);
        promptTicket = issued.promptTicket;
        matchedPrompt = issued.matchedPrompt;
        ticketExpiresInMs = issued.ticketExpiresInMs;
      }
      return {
        ...waitResult,
        promptTicket,
        matchedPrompt,
        ticketExpiresInMs
      };
    } finally {
      setAgentBusy(terminalId, false);
      if (takeControl && !keepLocked) {
        setHumanInputLocked(terminalId, false);
      }
    }
  }

  _buildMarkerCommands(shellFamily, token) {
    // Patron con digitos obligatorios + sufijo _END para no hacer match
    // con el eco del propio comando tipado/inyectado.
    const pattern = `NODETERM_DONE_${token}_EC_(-?\\d+)_END`;
    if (shellFamily === 'powershell') {
      return {
        markerLine: `Write-Output ('NODETERM_DONE_${token}_EC_' + $(if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }) + '_END')\r`,
        pattern,
        newline: '\r'
      };
    }
    return {
      markerLine: `printf 'NODETERM_DONE_${token}_EC_%s_END\\n' \"$?\"\n`,
      pattern,
      newline: '\n'
    };
  }

  async execInTerminal(terminalId, {
    command,
    timeoutMs = 120000,
    humanTyping = true,
    keepLocked = false,
    takeControl = true,
    idleMs = 1500,
    appendNewline = true
  } = {}) {
    const tab = this._findTab(terminalId);
    if (!tab) {
      return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: 'terminal_not_found' };
    }
    if (isAgentBusy(terminalId)) {
      return {
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        error: 'busy',
        statusCode: 409,
        terminalId
      };
    }
    if (command == null || String(command).length === 0) {
      return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: 'command_required' };
    }

    this._ensureOutputListener(terminalId, tab);
    const shellFamily = inferShellFamily(tab);
    setShellFamily(terminalId, shellFamily);
    const token = uuidShort();
    const { markerLine, pattern, newline } = this._buildMarkerCommands(shellFamily, token);
    const startOffset = terminalOutputBuffer.getOffset(terminalId);
    const cmd = String(command);
    recordAgentCommand(terminalId, cmd);

    if (takeControl) {
      setHumanInputLocked(terminalId, true);
      setAgentBusy(terminalId, true);
    }

    try {
      const session = getAgentSession(terminalId);

      if (humanTyping) {
        for (const ch of cmd) {
          this.rawWrite(terminalId, ch);
          const base = session.typingSpeedMs || 25;
          await sleep(base + Math.floor(Math.random() * 12));
        }
        if (appendNewline) {
          this.rawWrite(terminalId, newline);
        }
      } else {
        this.rawWrite(terminalId, appendNewline ? cmd + newline : cmd);
      }

      // Marker instantaneo (no tipado)
      await sleep(80);
      this.rawWrite(terminalId, markerLine);

      const waitResult = await terminalOutputBuffer.waitForPattern(terminalId, {
        pattern,
        regex: true,
        timeoutMs,
        fromOffset: startOffset,
        includeBuffer: true
      });

      let exitCode = null;
      let stdout = waitResult.text || '';
      let timedOut = !!waitResult.timedOut;
      const stripAnsi = (s) => String(s || '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');

      if (waitResult.matched) {
        const plain = stripAnsi(stdout);
        const m = plain.match(new RegExp(pattern));
        if (m) {
          exitCode = parseInt(m[1], 10);
          if (Number.isNaN(exitCode)) exitCode = 0;
          // Cortar en el match completo (con digitos + _END), no en el eco del comando
          const fullMarker = m[0];
          const rawIdx = plain.indexOf(fullMarker);
          stdout = rawIdx >= 0 ? plain.slice(0, rawIdx) : plain;
          // Quitar la linea del propio comando marker si quedo en el eco
          const markerCmdIdx = stdout.lastIndexOf(`NODETERM_DONE_${token}_EC_`);
          if (markerCmdIdx >= 0) {
            const lineStart = stdout.lastIndexOf('\n', markerCmdIdx);
            stdout = stdout.slice(0, lineStart >= 0 ? lineStart : markerCmdIdx);
          }
        } else {
          stdout = plain;
        }
        // Quitar eco del comando tipado al inicio si esta
        const echoIdx = stdout.indexOf(cmd);
        if (echoIdx >= 0 && echoIdx < 80) {
          stdout = stdout.slice(echoIdx + cmd.length).replace(/^[\r\n]+/, '');
        }
        stdout = stdout.replace(/\r/g, '').trim();
      } else {
        stdout = stripAnsi(stdout);
        // Fallback idle
        const idle = await terminalOutputBuffer.waitForIdle(terminalId, {
          idleMs,
          timeoutMs: Math.min(5000, timeoutMs),
          fromOffset: startOffset
        });
        stdout = stripAnsi(idle.text || stdout);
        timedOut = timedOut || idle.timedOut;
        exitCode = null;
      }

      return {
        stdout,
        stderr: '',
        exitCode,
        timedOut,
        terminalId
      };
    } finally {
      setAgentBusy(terminalId, false);
      if (takeControl && !keepLocked) {
        setHumanInputLocked(terminalId, false);
      }
    }
  }

  /**
   * Inyecta un secreto por referencia opaca en un terminal abierto.
   * Nunca devuelve el valor del secreto. Requiere promptTicket + prompt activo.
   */
  async injectSecretIntoTerminal(terminalId, {
    source,
    id = null,
    field = 'password',
    promptTicket = null,
    keepLocked = false
  } = {}) {
    const tab = this._findTab(terminalId);
    if (!tab) {
      return { success: false, error: 'terminal_not_found', statusCode: 404 };
    }
    if (isAgentBusy(terminalId)) {
      return { success: false, error: 'busy', statusCode: 409 };
    }

    if (promptTicket == null || String(promptTicket).length === 0) {
      appendAudit({ event: 'inject_denied', terminalId, error: 'prompt_ticket_required' });
      return { success: false, error: 'prompt_ticket_required', statusCode: 400 };
    }

    const rate = assertInjectRateLimit(terminalId);
    if (!rate.ok) {
      appendAudit({ event: 'inject_denied', terminalId, error: rate.error });
      return { success: false, error: rate.error, statusCode: 429 };
    }

    const src = String(source || '').toLowerCase();
    if (src !== 'connection' && src !== 'keepass') {
      return { success: false, error: 'invalid_source', statusCode: 400 };
    }

    const secretField = field === 'passphrase' ? 'passphrase' : 'password';
    if (src === 'keepass' && secretField !== 'password') {
      return { success: false, error: 'invalid_field', statusCode: 400 };
    }
    if (src === 'connection' && secretField !== 'password' && secretField !== 'passphrase') {
      return { success: false, error: 'invalid_field', statusCode: 400 };
    }

    this._ensureOutputListener(terminalId, tab);
    const buf = terminalOutputBuffer.read(terminalId, { maxChars: 2048 });
    const gate = assertPasswordPrompt(buf.text || '', buf.offset || 0, terminalId);
    if (!gate.ok) {
      appendAudit({ event: 'inject_denied', terminalId, error: gate.error });
      return {
        success: false,
        error: gate.error,
        statusCode: gate.error === 'password_prompt_already_consumed' ? 409 : 403
      };
    }

    const ticketResult = consumePromptTicket(
      terminalId,
      promptTicket,
      buf.offset || 0,
      gate.matchedPrompt
    );
    if (!ticketResult.ok) {
      appendAudit({ event: 'inject_denied', terminalId, error: ticketResult.error });
      const statusCode = ticketResult.error === 'prompt_ticket_expired' ? 403
        : ticketResult.error === 'command_correlation_required' ? 403
          : 400;
      return { success: false, error: ticketResult.error, statusCode };
    }

    let secret = null;
    const deps = this._requireDeps();
    const secretRefId = id || tab.originalKey || null;

    if (src === 'connection') {
      let connectionId = id || tab.originalKey || null;
      if (!connectionId) {
        return { success: false, error: 'connection_id_required', statusCode: 400 };
      }
      const node = deps.findConnectionById
        ? deps.findConnectionById(connectionId)
        : null;
      secret = extractConnectionSecret(node, secretField);
      if (!secret && tab.sshConfig) {
        secret = extractConnectionSecret({ data: tab.sshConfig }, secretField);
      }
      if (!secret) {
        return { success: false, error: 'secret_not_found', statusCode: 404 };
      }
    } else {
      if (!id) {
        return { success: false, error: 'keepass_id_required', statusCode: 400 };
      }
      let tree = [];
      try {
        tree = deps.getPasswordsTree
          ? await deps.getPasswordsTree()
          : [];
      } catch (_) {
        tree = [];
      }
      const node = findNodeById(tree || [], id);
      if (!node) {
        return { success: false, error: 'secret_not_found', statusCode: 404 };
      }
      secret = extractKeepassSecret(node, secretField);
      if (!secret) {
        return { success: false, error: 'secret_not_found', statusCode: 404 };
      }
    }

    setHumanInputLocked(terminalId, true);
    setAgentBusy(terminalId, true);
    try {
      this.rawWrite(terminalId, secret);
      this.rawWrite(terminalId, '\n');
      markPromptConsumed(terminalId, buf.offset || 0, gate.matchedPrompt);
      noteInjectAttempt(terminalId);
      appendAudit({
        event: 'inject_ok',
        terminalId,
        source: src,
        id: secretRefId,
        matchedPrompt: gate.matchedPrompt
      });
      return {
        success: true,
        matchedPrompt: gate.matchedPrompt,
        source: src
      };
    } finally {
      secret = null;
      setAgentBusy(terminalId, false);
      if (!keepLocked) {
        setHumanInputLocked(terminalId, false);
      }
    }
  }

  onTabClosed(terminalId) {
    clearTerminalPolicy(terminalId);
    this._releaseOutputListener(terminalId);
  }

  pruneClosedTerminals(activeTerminalIds) {
    const active = activeTerminalIds instanceof Set
      ? activeTerminalIds
      : new Set(activeTerminalIds || []);
    for (const id of [...this._outputUnsubs.keys()]) {
      if (!active.has(id)) {
        this._releaseOutputListener(id);
      }
    }
  }
}

const terminalAgentBridge = new TerminalAgentBridge();

export { TerminalAgentBridge, terminalAgentBridge, extractSplitLeaves, inferShellFamily, KEY_MAP };
export default terminalAgentBridge;
