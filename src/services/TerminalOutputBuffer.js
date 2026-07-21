/**
 * Ring buffer de salida por terminalId para historico vivo del agente MCP.
 */

const DEFAULT_MAX_CHARS = 200000;
const DEFAULT_READ_MAX_LINES = 100;

/**
 * Prioridad:
 * - ambos > 0 -> maxLines
 * - solo uno > 0 -> ese
 * - ninguno / ambos 0 -> default maxLines=100
 */
function resolveReadLimit(maxChars, maxLines) {
  const lines = (Number.isFinite(maxLines) && maxLines > 0) ? Math.floor(maxLines) : 0;
  const chars = (Number.isFinite(maxChars) && maxChars > 0) ? Math.floor(maxChars) : 0;
  if (lines > 0 && chars > 0) {
    return { limitMode: 'lines', limitValue: lines };
  }
  if (lines > 0) {
    return { limitMode: 'lines', limitValue: lines };
  }
  if (chars > 0) {
    return { limitMode: 'chars', limitValue: chars };
  }
  return { limitMode: 'lines', limitValue: DEFAULT_READ_MAX_LINES };
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

class TerminalOutputBuffer {
  constructor(maxChars = DEFAULT_MAX_CHARS) {
    this.maxChars = maxChars;
    this._sessions = new Map(); // terminalId -> { text, offset, lastActivityAt }
  }

  _ensure(terminalId) {
    let s = this._sessions.get(terminalId);
    if (!s) {
      s = { text: '', offset: 0, lastActivityAt: Date.now() };
      this._sessions.set(terminalId, s);
    }
    return s;
  }

  append(terminalId, chunk) {
    if (!terminalId || chunk == null || chunk === '') return;
    const data = typeof chunk === 'string' ? chunk : String(chunk);
    const s = this._ensure(terminalId);
    s.text += data;
    s.offset += data.length;
    s.lastActivityAt = Date.now();
    if (s.text.length > this.maxChars) {
      const excess = s.text.length - this.maxChars;
      s.text = s.text.slice(excess);
    }
  }

  getOffset(terminalId) {
    const s = this._sessions.get(terminalId);
    return s ? s.offset : 0;
  }

  getLastActivityAt(terminalId) {
    const s = this._sessions.get(terminalId);
    return s ? s.lastActivityAt : null;
  }

  /**
   * Lee texto del buffer.
   * fromOffset: offset absoluto monotono; si es null, lee desde el inicio retenido.
   * maxChars / maxLines: ver resolveReadLimit.
   */
  read(terminalId, { maxChars = null, maxLines = null, fromOffset = null } = {}) {
    const { limitMode, limitValue } = resolveReadLimit(maxChars, maxLines);
    const empty = {
      text: '',
      offset: 0,
      truncated: false,
      lineCount: 0,
      limitMode,
      limitValue,
      lastActivityAt: null
    };

    const s = this._sessions.get(terminalId);
    if (!s) {
      return empty;
    }

    const bufferStartOffset = s.offset - s.text.length;
    let startInText = 0;
    let truncated = false;

    if (fromOffset != null && Number.isFinite(fromOffset)) {
      if (fromOffset < bufferStartOffset) {
        truncated = true;
        startInText = 0;
      } else {
        startInText = Math.max(0, fromOffset - bufferStartOffset);
      }
    }

    let text = s.text.slice(startInText);
    const beforeLimitLen = text.length;
    const beforeLimitLines = countLines(text);

    if (limitMode === 'lines') {
      const lines = text.split('\n');
      if (lines.length > limitValue) {
        text = lines.slice(-limitValue).join('\n');
        truncated = true;
      }
    } else {
      if (text.length > limitValue) {
        text = text.slice(text.length - limitValue);
        truncated = true;
      }
    }

    // Si habia mas contenido antes del limite, marcar truncated
    if (!truncated && (beforeLimitLen > text.length || beforeLimitLines > countLines(text))) {
      truncated = true;
    }

    return {
      text,
      offset: s.offset,
      truncated,
      lineCount: countLines(text),
      limitMode,
      limitValue,
      lastActivityAt: s.lastActivityAt
    };
  }

  /**
   * Espera a que aparezca un patron en el buffer (desde fromOffset o offset actual).
   */
  waitForPattern(terminalId, {
    pattern,
    regex = false,
    timeoutMs = 15000,
    fromOffset = null,
    includeBuffer = true
  } = {}) {
    return new Promise((resolve) => {
      if (!pattern) {
        resolve({ matched: false, match: null, elapsedMs: 0, text: '', timedOut: false, error: 'pattern_required' });
        return;
      }

      const started = Date.now();
      const session = this._ensure(terminalId);
      // Por defecto buscar tambien en el texto ya retenido (no solo datos futuros)
      const startOffset = fromOffset != null
        ? fromOffset
        : Math.max(0, session.offset - session.text.length);
      let matcher;
      try {
        matcher = regex ? new RegExp(pattern) : null;
      } catch (e) {
        resolve({ matched: false, match: null, elapsedMs: 0, text: '', timedOut: false, error: 'invalid_regex' });
        return;
      }

      const stripAnsi = (s) => String(s || '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');

      const check = () => {
        const { text, offset } = this.read(terminalId, {
          fromOffset: startOffset,
          maxChars: this.maxChars
        });
        // PSReadLine y similares inyectan ANSI; buscar tambien sobre texto limpio
        const plain = stripAnsi(text);
        let matchStr = null;
        if (matcher) {
          const m = plain.match(matcher) || text.match(matcher);
          if (m) matchStr = m[0];
        } else if (plain.includes(pattern) || text.includes(pattern)) {
          matchStr = pattern;
        }

        if (matchStr != null) {
          resolve({
            matched: true,
            match: matchStr,
            elapsedMs: Date.now() - started,
            text: includeBuffer ? text : '',
            timedOut: false,
            offset
          });
          return true;
        }

        if (Date.now() - started >= timeoutMs) {
          resolve({
            matched: false,
            match: null,
            elapsedMs: Date.now() - started,
            text: includeBuffer ? text : '',
            timedOut: true,
            offset
          });
          return true;
        }
        return false;
      };

      if (check()) return;

      const interval = setInterval(() => {
        if (check()) clearInterval(interval);
      }, 50);
    });
  }

  /**
   * Espera silencio (idle) tras actividad, o timeout absoluto.
   */
  waitForIdle(terminalId, { idleMs = 1500, timeoutMs = 120000, fromOffset = null } = {}) {
    return new Promise((resolve) => {
      const started = Date.now();
      const startOffset = fromOffset != null ? fromOffset : this.getOffset(terminalId);
      let lastSeenOffset = this.getOffset(terminalId);
      let lastChangeAt = Date.now();

      const tick = () => {
        const offset = this.getOffset(terminalId);
        if (offset !== lastSeenOffset) {
          lastSeenOffset = offset;
          lastChangeAt = Date.now();
        }

        const { text } = this.read(terminalId, {
          fromOffset: startOffset,
          maxChars: this.maxChars
        });

        if (Date.now() - lastChangeAt >= idleMs && offset > startOffset) {
          resolve({ timedOut: false, idle: true, text, offset, elapsedMs: Date.now() - started });
          return true;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve({ timedOut: true, idle: false, text, offset, elapsedMs: Date.now() - started });
          return true;
        }
        return false;
      };

      const interval = setInterval(() => {
        if (tick()) clearInterval(interval);
      }, 50);
    });
  }

  clear(terminalId) {
    this._sessions.delete(terminalId);
  }
}

const terminalOutputBuffer = new TerminalOutputBuffer();

export {
  TerminalOutputBuffer,
  terminalOutputBuffer,
  resolveReadLimit,
  DEFAULT_READ_MAX_LINES
};
export default terminalOutputBuffer;
