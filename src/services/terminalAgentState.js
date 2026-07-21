/**
 * Estado de control del agente MCP por terminal (lock teclado / busy).
 * Los componentes PTY consultan isHumanInputLocked antes de enviar onData.
 */

const listeners = new Set();
const sessions = new Map();

function ensure(terminalId) {
  let s = sessions.get(terminalId);
  if (!s) {
    s = {
      terminalId,
      humanInputLocked: false,
      agentBusy: false,
      agentOwner: null,
      typingSpeedMs: 25,
      shellFamily: 'unix'
    };
    sessions.set(terminalId, s);
  }
  return s;
}

function emit(terminalId) {
  const snapshot = { ...ensure(terminalId) };
  listeners.forEach((fn) => {
    try {
      fn(terminalId, snapshot);
    } catch (_) {
      /* ignore */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent('nodeterm-agent-terminal-state', {
      detail: { terminalId, state: snapshot }
    }));
  } catch (_) {
    /* ignore */
  }
}

export function getAgentSession(terminalId) {
  return { ...ensure(terminalId) };
}

export function getAllAgentSessions() {
  const out = {};
  sessions.forEach((v, k) => {
    out[k] = { ...v };
  });
  return out;
}

export function isHumanInputLocked(terminalId) {
  const s = sessions.get(terminalId);
  return !!(s && s.humanInputLocked);
}

export function isAgentBusy(terminalId) {
  const s = sessions.get(terminalId);
  return !!(s && s.agentBusy);
}

export function setHumanInputLocked(terminalId, locked) {
  const s = ensure(terminalId);
  s.humanInputLocked = !!locked;
  emit(terminalId);
  return { ...s };
}

export function setAgentBusy(terminalId, busy, owner = 'mcp') {
  const s = ensure(terminalId);
  s.agentBusy = !!busy;
  s.agentOwner = busy ? owner : null;
  emit(terminalId);
  return { ...s };
}

export function setShellFamily(terminalId, shellFamily) {
  const s = ensure(terminalId);
  s.shellFamily = shellFamily || 'unix';
  return { ...s };
}

export function setTypingSpeedMs(terminalId, ms) {
  const s = ensure(terminalId);
  if (Number.isFinite(ms) && ms >= 0) s.typingSpeedMs = ms;
  return { ...s };
}

export function subscribeAgentState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function removeAgentSession(terminalId) {
  sessions.delete(terminalId);
  try {
    window.dispatchEvent(new CustomEvent('nodeterm-agent-terminal-state', {
      detail: { terminalId, state: null }
    }));
  } catch (_) {
    /* ignore */
  }
}

/**
 * Bloquea input humano si el agente tiene el terminal bloqueado.
 * Devuelve true si hay que ignorar el onData del usuario.
 */
export function shouldBlockHumanInput(terminalId) {
  return isHumanInputLocked(terminalId);
}
