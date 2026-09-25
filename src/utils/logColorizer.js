/**
 * Colorea salida tipo log inyectando SGR ANSI.
 * No toca chunks TUI ni lineas que ya traen escape sequences.
 */

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const MAX_LINE_LEN = 4096;
const DEFAULT_PENDING_MS = 24;

export const SSH_LOG_HIGHLIGHT_KEY = 'nodeterm_ssh_log_highlight';

const STYLE = {
  error: `${ESC}[1;31m`,
  warn: `${ESC}[33m`,
  info: `${ESC}[36m`,
  debug: `${ESC}[2;37m`,
  success: `${ESC}[32m`,
  timestamp: `${ESC}[2;37m`,
  ip: `${ESC}[35m`,
  http2: `${ESC}[32m`,
  http3: `${ESC}[36m`,
  http4: `${ESC}[33m`,
  http5: `${ESC}[1;31m`
};

const LEVEL_STYLE = {
  FATAL: STYLE.error,
  CRITICAL: STYLE.error,
  ERROR: STYLE.error,
  ERR: STYLE.error,
  WARNING: STYLE.warn,
  WARN: STYLE.warn,
  NOTICE: STYLE.info,
  INFO: STYLE.info,
  DEBUG: STYLE.debug,
  TRACE: STYLE.debug,
  SUCCESS: STYLE.success,
  OK: STYLE.success
};

const RE_LEVEL = /\b(FATAL|CRITICAL|ERROR|WARNING|WARN|NOTICE|INFO|DEBUG|TRACE|SUCCESS|ERR|OK)\b/gi;
const RE_ISO_TS = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g;
const RE_SYSLOG_TS = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/g;
const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\b/g;
const RE_IPV6 = /\b[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){7}\b/g;
const RE_HTTP_METHOD_STATUS = /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+\s+(?:HTTP\/[\d.]+\s+)?([1-5]\d{2})\b/g;
const RE_HTTP_VERSION_STATUS = /\bHTTP\/[\d.]+\s+([1-5]\d{2})\b/g;
const RE_CSI = /\x1b\[[0-9;?=]*([A-Za-z@`~])/g;

export function isSshLogHighlightEnabled() {
  try {
    return localStorage.getItem(SSH_LOG_HIGHLIGHT_KEY) !== 'false';
  } catch (_) {
    return true;
  }
}

function httpStyleForStatus(code) {
  const n = code.charCodeAt(0);
  if (n === 50) return STYLE.http2; // 2
  if (n === 51) return STYLE.http3; // 3
  if (n === 52) return STYLE.http4; // 4
  if (n === 53) return STYLE.http5; // 5
  return STYLE.info;
}

function hasInteractiveEscapes(text) {
  if (!text || text.indexOf(ESC) === -1) return false;
  if (text.indexOf(`${ESC}]`) !== -1) return true;
  if (text.indexOf(`${ESC}7`) !== -1 || text.indexOf(`${ESC}8`) !== -1) return true;
  if (text.indexOf(`${ESC}(`) !== -1 || text.indexOf(`${ESC})`) !== -1) return true;
  RE_CSI.lastIndex = 0;
  let m;
  while ((m = RE_CSI.exec(text))) {
    if (m[1] !== 'm') return true;
  }
  return false;
}

function collectMatches(line, regex, getStyle, useGroup) {
  const ranges = [];
  regex.lastIndex = 0;
  let m;
  while ((m = regex.exec(line))) {
    if (useGroup && m[1] != null) {
      const group = m[1];
      const inner = m.index + m[0].indexOf(group);
      ranges.push({ start: inner, end: inner + group.length, style: getStyle(group, m) });
    } else {
      ranges.push({ start: m.index, end: m.index + m[0].length, style: getStyle(m[0], m) });
    }
    if (regex.lastIndex === m.index) {
      regex.lastIndex += 1;
    }
  }
  return ranges;
}

function applyRanges(line, ranges) {
  if (ranges.length === 0) return line;
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let lastEnd = 0;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start < lastEnd || r.start >= r.end) continue;
    kept.push(r);
    lastEnd = r.end;
  }
  if (kept.length === 0) return line;
  let out = '';
  let cursor = 0;
  for (let i = 0; i < kept.length; i++) {
    const r = kept[i];
    out += line.slice(cursor, r.start);
    out += r.style + line.slice(r.start, r.end) + RESET;
    cursor = r.end;
  }
  out += line.slice(cursor);
  return out;
}

export function colorizeLogLine(line) {
  if (!line) return line;
  const nl = line.endsWith('\n');
  const crlf = line.endsWith('\r\n');
  let body = line;
  let suffix = '';
  if (crlf) {
    body = line.slice(0, -2);
    suffix = '\r\n';
  } else if (nl) {
    body = line.slice(0, -1);
    suffix = '\n';
  }
  if (!body || body.length > MAX_LINE_LEN) return line;
  if (body.indexOf(ESC) !== -1) return line;

  const ranges = [];
  ranges.push(...collectMatches(body, RE_LEVEL, (text) => (
    LEVEL_STYLE[text.toUpperCase()] || STYLE.info
  )));
  ranges.push(...collectMatches(body, RE_ISO_TS, () => STYLE.timestamp));
  ranges.push(...collectMatches(body, RE_SYSLOG_TS, () => STYLE.timestamp));
  ranges.push(...collectMatches(body, RE_IPV4, () => STYLE.ip));
  ranges.push(...collectMatches(body, RE_IPV6, () => STYLE.ip));
  ranges.push(...collectMatches(body, RE_HTTP_METHOD_STATUS, httpStyleForStatus, true));
  ranges.push(...collectMatches(body, RE_HTTP_VERSION_STATUS, httpStyleForStatus, true));

  if (ranges.length === 0) return line;
  return applyRanges(body, ranges) + suffix;
}

function colorizeCompleteText(text) {
  if (!text) return '';
  if (hasInteractiveEscapes(text)) return text;
  let out = '';
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      out += colorizeLogLine(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  if (start < text.length) {
    out += colorizeLogLine(text.slice(start));
  }
  return out;
}

export function createLogColorizer(options = {}) {
  const timeoutMs = options.pendingTimeoutMs != null ? options.pendingTimeoutMs : DEFAULT_PENDING_MS;
  const onPending = options.onPending;
  let pending = '';
  let timer = null;
  let enabled = options.enabled !== false;

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedulePending = () => {
    clearTimer();
    if (!pending) return;
    timer = setTimeout(() => {
      timer = null;
      const out = flush();
      if (out && typeof onPending === 'function') {
        onPending(out);
      }
    }, timeoutMs);
  };

  const push = (chunk) => {
    if (!chunk) return '';
    const data = typeof chunk === 'string' ? chunk : String(chunk);
    if (!enabled) {
      const out = pending + data;
      pending = '';
      clearTimer();
      return out;
    }
    if (hasInteractiveEscapes(data) || hasInteractiveEscapes(pending)) {
      const out = pending + data;
      pending = '';
      clearTimer();
      return out;
    }
    pending += data;
    if (pending.indexOf('\r') !== -1 && pending.indexOf('\n') === -1) {
      const out = pending;
      pending = '';
      clearTimer();
      return out;
    }
    const lastNl = pending.lastIndexOf('\n');
    if (lastNl === -1) {
      schedulePending();
      return '';
    }
    const complete = pending.slice(0, lastNl + 1);
    pending = pending.slice(lastNl + 1);
    if (pending) schedulePending();
    else clearTimer();
    return colorizeCompleteText(complete);
  };

  const flush = () => {
    clearTimer();
    if (!pending) return '';
    const text = pending;
    pending = '';
    if (!enabled) return text;
    if (hasInteractiveEscapes(text) || (text.indexOf('\r') !== -1 && text.indexOf('\n') === -1)) {
      return text;
    }
    return colorizeLogLine(text);
  };

  const setEnabled = (next) => {
    enabled = !!next;
  };

  const destroy = () => {
    clearTimer();
    pending = '';
  };

  return { push, flush, setEnabled, destroy };
}
