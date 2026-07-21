/**
 * Politica de endurecimiento para inject_secret:
 * ticket opaco de un solo uso, correlacion de comando, rate limit y auditoria.
 */

import {
  assertPasswordPrompt,
  markPromptConsumed,
  clearConsumedPrompt
} from './passwordPromptGate.js';

const TICKET_TTL_MS = 60000;
const COMMAND_MAX_AGE_MS = 120000;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 60000;
const AUDIT_MAX = 100;

const COMMAND_ALLOWLIST = [
  'sudo',
  'su',
  'git',
  'mysql',
  'mariadb',
  'psql',
  'ssh',
  'scp',
  'sftp',
  'doas'
];

/** @type {Map<string, { lastAgentCommand: { text: string, atMs: number }|null, ticket: object|null, injectTimestamps: number[] }>} */
const sessions = new Map();

/** @type {Array<object>} */
const auditLog = [];

function nowMs() {
  return Date.now();
}

function randomTicketId() {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function ensureSession(terminalId) {
  let s = sessions.get(terminalId);
  if (!s) {
    s = { lastAgentCommand: null, ticket: null, injectTimestamps: [] };
    sessions.set(terminalId, s);
  }
  return s;
}

function appendAudit(event) {
  const entry = {
    atMs: nowMs(),
    ...event
  };
  // Nunca incluir secretos
  delete entry.secret;
  delete entry.password;
  delete entry.data;
  auditLog.push(entry);
  if (auditLog.length > AUDIT_MAX) {
    auditLog.splice(0, auditLog.length - AUDIT_MAX);
  }
  try {
    console.info('[MCP-SECRET-AUDIT]', entry);
  } catch (_) { /* ignore */ }
  return entry;
}

function getAudit(limit = 50) {
  const n = Math.max(1, Math.min(AUDIT_MAX, Math.floor(limit) || 50));
  return auditLog.slice(-n);
}

/**
 * True si algun segmento del comando (separado por && ; |) empieza por allowlist.
 */
function assertCommandAllowsSecret(commandText) {
  const raw = String(commandText || '').trim();
  if (!raw) return false;
  const segments = raw.split(/(?:&&|;|\|)/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const first = seg.split(/\s+/)[0];
    if (!first) continue;
    const base = first.toLowerCase().replace(/^["']|["']$/g, '');
    // quitar path: /usr/bin/sudo -> sudo
    const leaf = base.includes('/') ? base.split('/').pop() : base;
    if (COMMAND_ALLOWLIST.includes(leaf)) return true;
  }
  return false;
}

function getValidLastCommand(terminalId) {
  const s = ensureSession(terminalId);
  const cmd = s.lastAgentCommand;
  if (!cmd || !cmd.text) return null;
  if (nowMs() - cmd.atMs > COMMAND_MAX_AGE_MS) return null;
  if (!assertCommandAllowsSecret(cmd.text)) return null;
  return cmd;
}

function recordAgentCommand(terminalId, commandText) {
  if (!terminalId) return;
  const text = String(commandText || '').trim();
  if (!text) return;
  const s = ensureSession(terminalId);
  s.lastAgentCommand = { text, atMs: nowMs() };
}

/**
 * Emite ticket si hay comando correlacionado. No valida el buffer aqui
 * (el caller ya paso assertPasswordPrompt).
 */
function issuePromptTicket(terminalId, { bufferOffset, matchedPrompt, commandText } = {}) {
  if (!terminalId) return null;
  const cmdText = commandText != null
    ? String(commandText)
    : (getValidLastCommand(terminalId)?.text || '');
  if (!cmdText || !assertCommandAllowsSecret(cmdText)) {
    return null;
  }
  const s = ensureSession(terminalId);
  const id = randomTicketId();
  const expiresAtMs = nowMs() + TICKET_TTL_MS;
  s.ticket = {
    id,
    bufferOffset: bufferOffset || 0,
    matchedPrompt: matchedPrompt || 'unknown',
    commandText: cmdText,
    expiresAtMs
  };
  appendAudit({
    event: 'ticket_issued',
    terminalId,
    matchedPrompt: s.ticket.matchedPrompt,
    bufferOffset: s.ticket.bufferOffset
  });
  return {
    promptTicket: id,
    matchedPrompt: s.ticket.matchedPrompt,
    ticketExpiresInMs: TICKET_TTL_MS
  };
}

/**
 * Intenta emitir ticket tras un wait matched + gate de password.
 */
function tryIssueTicketAfterWait(terminalId, bufferText, bufferOffset) {
  const gate = assertPasswordPrompt(bufferText || '', bufferOffset || 0, terminalId);
  if (!gate.ok) {
    return { promptTicket: null, matchedPrompt: null, ticketExpiresInMs: null, gateError: gate.error };
  }
  const cmd = getValidLastCommand(terminalId);
  if (!cmd) {
    appendAudit({
      event: 'ticket_denied',
      terminalId,
      error: 'command_correlation_required',
      matchedPrompt: gate.matchedPrompt
    });
    return {
      promptTicket: null,
      matchedPrompt: gate.matchedPrompt,
      ticketExpiresInMs: null,
      gateError: 'command_correlation_required'
    };
  }
  const issued = issuePromptTicket(terminalId, {
    bufferOffset,
    matchedPrompt: gate.matchedPrompt,
    commandText: cmd.text
  });
  if (!issued) {
    return {
      promptTicket: null,
      matchedPrompt: gate.matchedPrompt,
      ticketExpiresInMs: null,
      gateError: 'command_correlation_required'
    };
  }
  return { ...issued, gateError: null };
}

function assertInjectRateLimit(terminalId) {
  const s = ensureSession(terminalId);
  const cutoff = nowMs() - RATE_LIMIT_WINDOW_MS;
  s.injectTimestamps = (s.injectTimestamps || []).filter((t) => t >= cutoff);
  if (s.injectTimestamps.length >= RATE_LIMIT_COUNT) {
    return { ok: false, error: 'rate_limited' };
  }
  return { ok: true };
}

function noteInjectAttempt(terminalId) {
  const s = ensureSession(terminalId);
  s.injectTimestamps.push(nowMs());
}

/**
 * Valida y consume ticket. No marca prompt consumed ni rate limit success aqui.
 * @returns {{ ok: true, matchedPrompt: string, commandText: string } | { ok: false, error: string }}
 */
function consumePromptTicket(terminalId, ticketId, currentBufferOffset, currentMatchedPrompt) {
  if (!ticketId) {
    return { ok: false, error: 'prompt_ticket_required' };
  }
  const s = ensureSession(terminalId);
  const t = s.ticket;
  if (!t || t.id !== String(ticketId)) {
    return { ok: false, error: 'prompt_ticket_invalid' };
  }
  if (nowMs() > t.expiresAtMs) {
    s.ticket = null;
    return { ok: false, error: 'prompt_ticket_expired' };
  }
  if (currentMatchedPrompt && t.matchedPrompt && currentMatchedPrompt !== t.matchedPrompt) {
    return { ok: false, error: 'prompt_ticket_invalid' };
  }
  // El offset puede avanzar ligeramente; exigir que el ticket no sea de un prompt ya muy viejo:
  // si el bufferOffset actual es menor que el del ticket, invalido; si crecio mucho (>8KB), invalido.
  const ticketOff = t.bufferOffset || 0;
  const curOff = currentBufferOffset || 0;
  if (curOff < ticketOff || curOff - ticketOff > 8192) {
    return { ok: false, error: 'prompt_ticket_invalid' };
  }

  const cmd = getValidLastCommand(terminalId);
  if (!cmd || cmd.text !== t.commandText) {
    // permitir si el texto del ticket sigue en allowlist aunque last se haya actualizado
    if (!assertCommandAllowsSecret(t.commandText)) {
      return { ok: false, error: 'command_correlation_required' };
    }
    if (!cmd) {
      return { ok: false, error: 'command_correlation_required' };
    }
  }

  const matchedPrompt = currentMatchedPrompt || t.matchedPrompt;
  const commandText = t.commandText;
  s.ticket = null;
  return { ok: true, matchedPrompt, commandText };
}

function clearTerminalPolicy(terminalId) {
  if (!terminalId) return;
  sessions.delete(terminalId);
  clearConsumedPrompt(terminalId);
}

function clearAllPolicy() {
  sessions.clear();
  auditLog.length = 0;
}

function extractCommandFromWritePayload(data, keys) {
  const raw = data != null ? String(data) : '';
  const keyList = Array.isArray(keys) ? keys : (keys ? [keys] : []);
  const hasEnter = keyList.some((k) => {
    const s = String(k).toLowerCase();
    return s === 'enter' || s === 'return';
  });
  const endsWithNl = /[\r\n]$/.test(raw);
  if (!hasEnter && !endsWithNl) return null;
  const cmd = raw.replace(/[\r\n]+$/g, '').trim();
  if (!cmd) return null;
  return cmd;
}

export {
  TICKET_TTL_MS,
  COMMAND_MAX_AGE_MS,
  RATE_LIMIT_COUNT,
  RATE_LIMIT_WINDOW_MS,
  COMMAND_ALLOWLIST,
  assertCommandAllowsSecret,
  recordAgentCommand,
  getValidLastCommand,
  issuePromptTicket,
  tryIssueTicketAfterWait,
  consumePromptTicket,
  assertInjectRateLimit,
  noteInjectAttempt,
  appendAudit,
  getAudit,
  clearTerminalPolicy,
  clearAllPolicy,
  extractCommandFromWritePayload,
  assertPasswordPrompt,
  markPromptConsumed
};
