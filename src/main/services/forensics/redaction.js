/**
 * redaction.js - Redacción de secretos en texto forense
 *
 * Se aplica antes de generar informes y antes de enviar nada a una IA.
 * Los artefactos originales se conservan intactos como evidencia.
 */

const REDACTED = '[REDACTED]';

const RULES = [
  // Claves privadas PEM
  { re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, to: `[REDACTED PRIVATE KEY]` },
  // Hashes de /etc/shadow ($1$, $5$, $6$, $y$, $2a$ ...)
  { re: /\$(?:1|2[aby]?|5|6|y|7)\$[./A-Za-z0-9$]{6,}/g, to: '[REDACTED HASH]' },
  // Cisco: "password 7 XXXX", "secret 5 $1$...", "enable secret ..."
  { re: /^(\s*(?:enable\s+)?(?:password|secret)\s+(?:\d\s+)?)(\S+)/gim, to: (m, k) => `${k}${REDACTED}` },
  { re: /(\busername\s+\S+\s+(?:privilege\s+\d+\s+)?(?:password|secret)\s+(?:\d\s+)?)(\S+)/gi, to: (m, k) => `${k}${REDACTED}` },
  { re: /(\bset\s+(?:password|passwd|psk|secret)\s+(?:ENC\s+)?)(\S+)/gi, to: (m, k) => `${k}${REDACTED}` },
  // snmp-server community X
  { re: /\b(snmp-server\s+community)\s+(\S+)/gi, to: (m, k) => `${k} ${REDACTED}` },
  // Authorization / Bearer / Basic
  { re: /\b(Authorization:\s*(?:Bearer|Basic)\s+)[A-Za-z0-9._~+/=-]{8,}/gi, to: (m, k) => `${k}${REDACTED}` },
  // key=value genéricos
  { re: /\b((?:pass(?:word|wd)?|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|auth[_-]?token|psk|community)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;"']+)/gi, to: (m, k) => `${k}${REDACTED}` },
  // sshpass -p X, mysql -pX, --password X
  { re: /\b(sshpass\s+-p\s*)(\S+)/gi, to: (m, k) => `${k}${REDACTED}` },
  { re: /(--(?:password|passwd|token|secret)[ =])(\S+)/gi, to: (m, k) => `${k}${REDACTED}` },
  // URLs con credenciales
  { re: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)([^\s@/]+)(@)/gi, to: (m, a, b, c) => `${a}${REDACTED}${c}` },
  // AWS access keys y tokens típicos
  { re: /\bAKIA[0-9A-Z]{16}\b/g, to: '[REDACTED AWS KEY]' },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, to: '[REDACTED TOKEN]' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, to: '[REDACTED TOKEN]' },
  // Claves públicas SSH: se conservan los 20 primeros caracteres del blob para identificar
  { re: /\b(ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp\d+)\s+([A-Za-z0-9+/=]{40,})/g, to: (m, t, blob) => `${t} ${blob.slice(0, 20)}...[TRUNCATED]` }
];

function redactText(text) {
  if (text == null) return '';
  let out = String(text);
  for (const { re, to } of RULES) {
    out = out.replace(re, to);
  }
  return out;
}

function redactDeep(value) {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v);
    return out;
  }
  return value;
}

module.exports = { redactText, redactDeep, REDACTED };
