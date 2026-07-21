/**
 * Gate duro: solo permite inyectar secretos si el buffer reciente
 * parece un prompt de password activo (allowlist + ventana final + one-shot).
 */

const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Z]|\x1b./g;

const PROMPT_PATTERNS = [
  { name: 'sudo_password', re: /\[sudo\]\s*(contrase[nñ]a|password)\s*(para|for)?/i },
  { name: 'password_for_user', re: /password\s+for\s+\S+/i },
  { name: 'password_colon', re: /(?:^|\n)\s*password\s*:?\s*$/i },
  { name: 'passphrase', re: /(?:^|\n)\s*passphrase\s*(for\s*.*)?:?\s*$/i },
  { name: 'mysql_password', re: /(?:mysql|mariadb).*enter\s+password/i },
  { name: 'contrasena_colon', re: /(?:^|\n)\s*contrase[nñ]a\s*:?\s*$/i },
  { name: 'generic_password_prompt', re: /(?:^|\n)[^\n]*(password|contrase[nñ]a|passphrase)[^\n]*:\s*$/i }
];

/** terminalId -> { bufferOffset, patternName } del ultimo inject consumido */
const consumedPrompts = new Map();

function stripAnsi(text) {
  return String(text || '').replace(ANSI_RE, '');
}

/**
 * Extrae las ultimas N lineas no vacias del texto.
 */
function lastNonEmptyLines(text, maxLines = 5) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  return lines.slice(-maxLines);
}

/**
 * @param {string} bufferText - texto reciente del ring buffer
 * @param {number} bufferOffset - offset absoluto actual del buffer
 * @param {string} terminalId
 * @returns {{ ok: true, matchedPrompt: string } | { ok: false, error: string }}
 */
function assertPasswordPrompt(bufferText, bufferOffset, terminalId) {
  const plain = stripAnsi(bufferText);
  const windowLines = lastNonEmptyLines(plain, 5);
  if (windowLines.length === 0) {
    return { ok: false, error: 'password_prompt_required' };
  }

  const windowText = windowLines.join('\n');
  let matched = null;
  for (const p of PROMPT_PATTERNS) {
    if (p.re.test(windowText)) {
      matched = p.name;
      break;
    }
  }

  if (!matched) {
    return { ok: false, error: 'password_prompt_required' };
  }

  const prev = consumedPrompts.get(terminalId);
  if (prev && prev.bufferOffset === bufferOffset && prev.patternName === matched) {
    return { ok: false, error: 'password_prompt_already_consumed' };
  }

  return { ok: true, matchedPrompt: matched };
}

/**
 * Marca el prompt actual como consumido (one-shot).
 */
function markPromptConsumed(terminalId, bufferOffset, patternName) {
  if (!terminalId) return;
  consumedPrompts.set(terminalId, {
    bufferOffset: bufferOffset || 0,
    patternName: patternName || 'unknown'
  });
}

function clearConsumedPrompt(terminalId) {
  if (terminalId) consumedPrompts.delete(terminalId);
}

function clearAllConsumedPrompts() {
  consumedPrompts.clear();
}

export {
  PROMPT_PATTERNS,
  stripAnsi,
  lastNonEmptyLines,
  assertPasswordPrompt,
  markPromptConsumed,
  clearConsumedPrompt,
  clearAllConsumedPrompts
};
