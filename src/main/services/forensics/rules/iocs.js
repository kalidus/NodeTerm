/**
 * IOCs: importación y búsqueda en los artefactos recolectados.
 */

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/;
const IPV6_RE = /^[0-9a-f:]{3,}$/i;
const HASH_RE = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i;
const DOMAIN_RE = /^(?=.{3,253}$)(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z]{2,}$/i;

/** Quita defang típico de feeds: hxxp, [.], (.) */
function refang(text) {
  return String(text)
    .trim()
    .replace(/^hxxp/i, 'http')
    .replace(/\[\.\]|\(\.\)|\[dot\]/gi, '.')
    .replace(/\[:\]/g, ':');
}

function classifyIoc(raw) {
  const v = refang(raw).replace(/^["']|["']$/g, '').trim();
  if (!v) return null;
  if (HASH_RE.test(v)) return { type: 'hashes', value: v.toLowerCase() };
  if (IPV4_RE.test(v)) return { type: 'ips', value: v };
  if (v.includes(':') && IPV6_RE.test(v) && !v.includes('/')) return { type: 'ips', value: v.toLowerCase() };
  let host = v;
  try {
    if (/^[a-z]+:\/\//i.test(v)) host = new URL(v).hostname;
  } catch (_) { /* noop */ }
  if (DOMAIN_RE.test(host)) return { type: 'domains', value: host.toLowerCase() };
  return { type: 'strings', value: v };
}

/** Parsea JSON {ips,domains,hashes,strings}, CSV o TXT (uno por línea). */
function parseIocFile(raw, ext = '') {
  const out = { ips: [], domains: [], hashes: [], strings: [] };
  const push = (item) => {
    const c = classifyIoc(item);
    if (c) out[c.type].push(c.value);
  };
  const text = String(raw || '');
  const lower = String(ext || '').toLowerCase();

  if (lower === '.json' || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        data.forEach((d) => push(typeof d === 'string' ? d : d?.value || d?.indicator || ''));
      } else {
        for (const key of ['ips', 'domains', 'hashes', 'strings']) {
          (Array.isArray(data[key]) ? data[key] : []).forEach(push);
        }
        (Array.isArray(data.indicators) ? data.indicators : []).forEach((d) => push(typeof d === 'string' ? d : d?.value || ''));
      }
      return out;
    } catch (_) { /* seguir como texto */ }
  }

  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    if (lower === '.csv' || l.includes(',')) {
      l.split(',').slice(0, 3).forEach((cell) => {
        const c = cell.trim();
        if (c && classifyIoc(c) && classifyIoc(c).type !== 'strings') push(c);
      });
    } else {
      push(l);
    }
  }
  return out;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** IPv4 en CIDR sencillo (solo comprueba pertenencia exacta o /n). */
function ipMatchesCidr(ip, cidr) {
  if (!cidr.includes('/')) return ip === cidr;
  const [base, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const toInt = (s) => s.split('.').reduce((acc, o) => (acc << 8) + (parseInt(o, 10) & 255), 0) >>> 0;
  if (!IPV4_RE.test(ip) || !IPV4_RE.test(base)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(base) & mask);
}

/**
 * Busca IOCs en los artefactos. Devuelve [{type, value, collectorId, line}]
 * isNoise(line) permite ignorar líneas generadas por la propia herramienta.
 */
function matchIocs(artifacts, iocs, { isNoise = () => false, maxPerIoc = 3 } = {}) {
  const hits = [];
  if (!iocs) return hits;
  const ipExact = (iocs.ips || []).filter((i) => !i.includes('/'));
  const ipCidr = (iocs.ips || []).filter((i) => i.includes('/'));

  const buildRe = (list, flags = 'i') => (list.length
    ? new RegExp(list.map(escapeRegExp).join('|'), flags)
    : null);
  const domainRe = buildRe(iocs.domains || []);
  const hashRe = buildRe(iocs.hashes || []);
  const stringRe = buildRe(iocs.strings || []);
  const ipRe = ipExact.length
    ? new RegExp(`(?<![\\d.])(?:${ipExact.map(escapeRegExp).join('|')})(?![\\d.])`, 'g')
    : null;
  const anyIpRe = ipCidr.length ? /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g : null;

  const counts = new Map();
  const add = (type, value, collectorId, line) => {
    const key = `${type}:${value}`;
    const n = counts.get(key) || 0;
    if (n >= maxPerIoc) return;
    counts.set(key, n + 1);
    hits.push({ type, value, collectorId, line: line.trim().slice(0, 300) });
  };

  for (const [collectorId, text] of Object.entries(artifacts || {})) {
    for (const line of String(text).split('\n')) {
      if (!line || isNoise(line)) continue;
      if (ipRe) {
        ipRe.lastIndex = 0;
        let m;
        while ((m = ipRe.exec(line))) add('ip', m[0], collectorId, line);
      }
      if (anyIpRe) {
        anyIpRe.lastIndex = 0;
        let m;
        while ((m = anyIpRe.exec(line))) {
          const cidr = ipCidr.find((c) => ipMatchesCidr(m[0], c));
          if (cidr) add('ip', `${m[0]} (${cidr})`, collectorId, line);
        }
      }
      if (domainRe) {
        const m = line.match(domainRe);
        if (m) add('domain', m[0].toLowerCase(), collectorId, line);
      }
      if (hashRe) {
        const m = line.match(hashRe);
        if (m) add('hash', m[0].toLowerCase(), collectorId, line);
      }
      if (stringRe) {
        const m = line.match(stringRe);
        if (m) add('string', m[0], collectorId, line);
      }
    }
  }
  return hits;
}

module.exports = { parseIocFile, matchIocs, classifyIoc, refang, ipMatchesCidr };
