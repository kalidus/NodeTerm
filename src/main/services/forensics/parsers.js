/**
 * parsers.js - Utilidades de parseo de artefactos forenses
 */

/** Líneas que genera la propia herramienta al ejecutarse (no deben generar hallazgos). */
const SELF_NOISE_RE = /LC_ALL=C sh -c|-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand|\$ProgressPreference='SilentlyContinue'|NodeTerm Forensics/i;

function isSelfNoise(line) {
  return SELF_NOISE_RE.test(line);
}

/**
 * Parsea la salida JSON de PowerShell (-Compress) tolerando ruido previo/posterior.
 * Siempre devuelve un array de objetos (objeto único => [obj]) o null si no es JSON.
 */
function parseJsonLoose(text, { asArray = true } = {}) {
  if (text == null) return null;
  const s = String(text).trim();
  if (!s) return asArray ? [] : null;
  const tryParse = (str) => {
    try { return JSON.parse(str); } catch (_) { return undefined; }
  };
  let parsed = tryParse(s);
  if (parsed === undefined) {
    const firstObj = s.search(/[[{]/);
    const lastObj = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
    if (firstObj >= 0 && lastObj > firstObj) parsed = tryParse(s.slice(firstObj, lastObj + 1));
  }
  if (parsed === undefined) return null;
  if (!asArray) return parsed;
  if (Array.isArray(parsed)) return parsed;
  return parsed == null ? [] : [parsed];
}

/** Siempre array (PowerShell serializa 1 elemento como objeto). */
function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Divide un artefacto con cabeceras "### ruta" en secciones. */
function splitSections(text) {
  const sections = [];
  let current = { title: null, lines: [] };
  for (const line of String(text || '').split('\n')) {
    if (line.startsWith('### ')) {
      if (current.title !== null || current.lines.length) sections.push(current);
      current = { title: line.slice(4).trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.title !== null || current.lines.length) sections.push(current);
  return sections;
}

function nonEmptyLines(text) {
  return String(text || '').split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() && !isSelfNoise(l));
}

/** Parseo de /etc/passwd -> [{name, uid, gid, home, shell}] */
function parsePasswd(text) {
  return nonEmptyLines(text)
    .map((l) => l.split(':'))
    .filter((p) => p.length >= 7)
    .map((p) => ({ name: p[0], uid: parseInt(p[2], 10), gid: parseInt(p[3], 10), gecos: p[4], home: p[5], shell: p[6] }));
}

/** meta.system (Linux): { collectedAt: ISO UTC, tzOffsetMin, uptime, hostname, uname, id } */
function parseLinuxMeta(text) {
  const lines = String(text || '').split('\n');
  const out = { collectedAt: null, tzOffsetMin: 0, hostname: null, uname: null, uptime: null, id: null, os: null };
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(lines[0] || '')) out.collectedAt = lines[0].trim();
  const tz = (lines[1] || '').trim().match(/^([+-])(\d{2})(\d{2})$/);
  if (tz) out.tzOffsetMin = (tz[1] === '-' ? -1 : 1) * (parseInt(tz[2], 10) * 60 + parseInt(tz[3], 10));
  const upIdx = lines.findIndex((l) => /\bup\b/.test(l) && /load average/.test(l));
  if (upIdx >= 0) out.uptime = lines[upIdx].trim();
  const unameIdx = lines.findIndex((l) => /^Linux |^Darwin |^FreeBSD |^OpenBSD /.test(l));
  if (unameIdx >= 0) {
    out.uname = lines[unameIdx].trim();
    out.hostname = (lines[unameIdx - 1] || '').trim() || null;
  }
  out.id = (lines.find((l) => /^uid=/.test(l)) || '').trim() || null;
  const pretty = lines.find((l) => /^PRETTY_NAME=/.test(l));
  if (pretty) out.os = pretty.replace(/^PRETTY_NAME=/, '').replace(/"/g, '');
  return out;
}

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

/**
 * Convierte una fecha local del host ("2026-10-30T08:12:33" sin zona) a ISO UTC.
 */
function localIsoToUtc(localIso, tzOffsetMin = 0) {
  const m = String(localIso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - tzOffsetMin * 60000;
  return new Date(ms).toISOString();
}

/** "Oct 30 08:12:33" (syslog sin año) -> ISO UTC usando el año de referencia. */
function syslogToUtc(mon, day, time, refIso, tzOffsetMin = 0) {
  const ref = refIso ? new Date(refIso) : new Date();
  const [hh, mm, ss] = time.split(':').map(Number);
  let year = ref.getUTCFullYear();
  let ms = Date.UTC(year, MONTHS[mon], +day, hh, mm, ss) - tzOffsetMin * 60000;
  if (ms - ref.getTime() > 2 * 86400000) {
    year -= 1;
    ms = Date.UTC(year, MONTHS[mon], +day, hh, mm, ss) - tzOffsetMin * 60000;
  }
  return new Date(ms).toISOString();
}

/** "Mon Oct 30 08:12:33 2026" (last -F) -> ISO UTC */
function lastDateToUtc(str, tzOffsetMin = 0) {
  const m = String(str).match(/([A-Z][a-z]{2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\d{4})/);
  if (!m) return null;
  const [hh, mm, ss] = m[4].split(':').map(Number);
  return new Date(Date.UTC(+m[5], MONTHS[m[2]], +m[3], hh, mm, ss) - tzOffsetMin * 60000).toISOString();
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const v = String(ip).trim().toLowerCase();
  if (!v || v === '-' || v === '::1' || v === '127.0.0.1' || v === '::' || v === '0.0.0.0' || v === 'localhost') return true;
  if (/^fe80:/.test(v) || /^f[cd][0-9a-f]{2}:/.test(v)) return true;
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\./);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}

function truncate(text, max = 300) {
  const s = String(text);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

module.exports = {
  isSelfNoise,
  parseJsonLoose,
  toArray,
  splitSections,
  nonEmptyLines,
  parsePasswd,
  parseLinuxMeta,
  localIsoToUtc,
  syslogToUtc,
  lastDateToUtc,
  isPrivateIp,
  truncate
};
