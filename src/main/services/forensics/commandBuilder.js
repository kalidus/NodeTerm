/**
 * commandBuilder.js - Construcción y validación de comandos forenses
 *
 * Todos los comandos que se ejecutan en un host objetivo pasan por aquí:
 *  - Se construyen en el proceso principal a partir de colectores predefinidos
 *    (el renderer nunca envía comandos libres).
 *  - Se validan con una política de "solo lectura" (defensa en profundidad).
 */

/** Longitud máxima de la línea de comandos en cmd.exe (con margen). */
const MAX_WINDOWS_COMMAND_LENGTH = 8000;

const POWERSHELL_PREAMBLE =
  "$ProgressPreference='SilentlyContinue';$ErrorActionPreference='SilentlyContinue';" +
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8;';

/** Escapa un texto para incluirlo dentro de comillas simples de sh. */
function shQuote(text) {
  return `'${String(text).replace(/'/g, `'\\''`)}'`;
}

/**
 * Comando para ejecutar un script de sh en un host Linux/Unix remoto.
 * stderr se fusiona con stdout para no perder salida (ssh2-promise rechaza con stderr).
 */
function buildShCommand(script, { sudo = false } = {}) {
  const inner = `LC_ALL=C sh -c ${shQuote(script)}`;
  if (sudo) {
    return `sudo -n env LC_ALL=C sh -c ${shQuote(script)} 2>&1`;
  }
  return `${inner} 2>&1`;
}

/** Codifica un script PowerShell como -EncodedCommand (UTF-16LE base64). */
function encodePowerShell(script) {
  return Buffer.from(POWERSHELL_PREAMBLE + script, 'utf16le').toString('base64');
}

/** Argumentos para lanzar PowerShell localmente (sin pasar por un shell). */
function buildPowerShellArgs(script) {
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodePowerShell(script)];
}

/** Línea de comandos completa para ejecutar PowerShell vía SSH en Windows. */
function buildPowerShellCommand(script) {
  return `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShell(script)} 2>&1`;
}

function fitsWindowsCommandLimit(script) {
  return buildPowerShellCommand(script).length <= MAX_WINDOWS_COMMAND_LENGTH;
}

// ---------------------------------------------------------------------------
// Política de solo lectura
// ---------------------------------------------------------------------------

// Comandos prohibidos en "posición de comando" (inicio, tras ; & | ( { ` $( do then)
const SH_FORBIDDEN = [
  /(^|[;&|({`]|\bdo\b|\bthen\b|\$\()\s*(rm|rmdir|mv|cp|dd|mkfs[\w.]*|fdisk|parted|mount|umount|chmod|chown|chgrp|chattr|kill|killall|pkill|shutdown|reboot|halt|poweroff|init|telinit|useradd|userdel|usermod|passwd|chpasswd|groupadd|groupdel|visudo|crontab|apt|apt-get|yum|dnf|zypper|pip|npm|tee|truncate|shred|wget|curl|nc|ncat|socat|ssh|scp|sftp|ftp|telnet|python\d?|perl|ruby|php|node|eval|source|sudo|su|sh|bash|zsh|dash)\b/,
  /(^|[;&|({`]|\bdo\b|\bthen\b|\$\()\s*systemctl\s+(start|stop|restart|enable|disable|mask|unmask|daemon-reload|reload|kill|isolate|set-default)\b/,
  /(^|[;&|({`]|\bdo\b|\bthen\b|\$\()\s*service\s+\S+\s+(start|stop|restart|reload)\b/,
  /(^|[;&|({`]|\bdo\b|\bthen\b|\$\()\s*iptables\s+-[ADIFPRXN]\b/,
  /(^|[;&|({`]|\bdo\b|\bthen\b|\$\()\s*nft\s+(add|delete|flush|insert|replace)\b/,
  /\bsystem\s*\(/, // awk system()
  /\|\s*(sh|bash|zsh|dash|python\d?|perl)\b/, // pipe a intérpretes
  /(^|[^&0-9])>>?\s*(?!\/dev\/null|&)/, // redirecciones a ficheros
  /\bfind\b[^;|]*\s-(delete|fprint\w*|fls)\b/
];

/** Elimina el contenido de cadenas entre comillas simples (patrones de grep/awk/format). */
function stripSingleQuoted(script) {
  return String(script).replace(/'[^']*'/g, "''");
}

const PS_FORBIDDEN = [
  /\b(Remove|Set|New|Stop|Start|Restart|Disable|Enable|Clear|Add|Out|Invoke|Move|Copy|Rename|Install|Uninstall|Register|Unregister|Write|Import|Export|Format|Update|Reset|Suspend|Resume)-[A-Za-z]+/i,
  /\b(iex|Invoke-Expression|Invoke-WebRequest|iwr|curl|wget|Start-Process|saps)\b/i,
  /\bnet(\.exe)?\s+(user|localgroup|stop|start)\s+\S+\s+\S+/i,
  /\bsc(\.exe)?\s+(stop|start|delete|config|create)\b/i,
  /\breg(\.exe)?\s+(add|delete|import)\b/i,
  /\b(shutdown|taskkill|del|rmdir|rd|format)\b\s/i
];

// Excepciones puntuales de Get-/Select/Format-... que empiezan con verbos prohibidos
const PS_ALLOWED_VERB_EXCEPTIONS = [
  /Format-(List|Table|Wide|Custom)/gi,
  /Out-String/gi,
  /Import-Module\s+\w+/gi
];

const DEVICE_ALLOWED = [
  /^show\s/i,
  /^display\s/i,
  /^get\s/i,
  /^terminal\s+length\s+0$/i,
  /^set\s+cli\s+screen-length\s+0$/i,
  /^set\s+cli\s+screen-width\s+\d+$/i,
  /^terminal\s+width\s+\d+$/i,
  /^diagnose\s+(sys|hardware|netlink|ip)\s/i,
  /^execute\s+(ping|traceroute|date)\b/i,
  /^\/[a-z0-9 /-]*\b(print|export)\b[a-z0-9 =_\-./"]*$/i,
  /^\/system\s+(resource|identity|routerboard|package)\s+print$/i
];

const DEVICE_PIPE_FILTER = /^(include|exclude|begin|section|match|last|display\s+set|no-more|count|except|find|grep|egrep)\b/i;

const DEVICE_FORBIDDEN = /(;|&&|\|\||`|\$\(|\bconf(igure)?\b|\bwrite\b|\breload\b|\berase\b|\bdelete\b|\bcopy\b|\bclear\b|\bdebug\b(?!\s+show)|\breset\b|\bset\b(?!\s+cli\s+screen)|\bunset\b|\bshutdown\b|\bformat\b|\bremove\b|\badd\b|\bdisable\b|\benable\b)/i;

function stripAllowedPsVerbs(script) {
  let s = script;
  for (const re of PS_ALLOWED_VERB_EXCEPTIONS) s = s.replace(re, ' ');
  return s;
}

/**
 * Lanza un Error si el spec no cumple la política de solo lectura.
 * spec: { shell: 'sh' | 'powershell' | 'device', script: string }
 */
function assertReadOnly(spec) {
  if (!spec || typeof spec.script !== 'string' || !spec.script.trim()) {
    throw new Error('Comando forense vacío');
  }
  const script = spec.script;
  if (spec.shell === 'sh') {
    const stripped = stripSingleQuoted(script);
    for (const re of SH_FORBIDDEN) {
      if (re.test(stripped)) {
        throw new Error(`Comando bloqueado por la política de solo lectura (sh): ${script.slice(0, 80)}`);
      }
    }
    return true;
  }
  if (spec.shell === 'powershell') {
    const cleaned = stripAllowedPsVerbs(script);
    for (const re of PS_FORBIDDEN) {
      if (re.test(cleaned)) {
        throw new Error(`Comando bloqueado por la política de solo lectura (PowerShell): ${script.slice(0, 80)}`);
      }
    }
    return true;
  }
  if (spec.shell === 'device') {
    const cmd = script.trim();
    const [base, ...filters] = cmd.split(/\s+\|\s+/);
    if (/[\r\n]/.test(cmd)) {
      throw new Error('Comando de dispositivo con saltos de línea no permitido');
    }
    if (DEVICE_FORBIDDEN.test(base)) {
      throw new Error(`Comando de dispositivo bloqueado por la política de solo lectura: ${cmd.slice(0, 80)}`);
    }
    if (!DEVICE_ALLOWED.some((re) => re.test(base))) {
      throw new Error(`Comando de dispositivo no permitido (no es de consulta): ${cmd.slice(0, 80)}`);
    }
    for (const f of filters) {
      if (!DEVICE_PIPE_FILTER.test(f) || /[;&`]|\$\(/.test(f)) {
        throw new Error(`Filtro de salida no permitido: ${f.slice(0, 60)}`);
      }
    }
    return true;
  }
  throw new Error(`Shell forense desconocido: ${spec.shell}`);
}

module.exports = {
  MAX_WINDOWS_COMMAND_LENGTH,
  shQuote,
  buildShCommand,
  encodePowerShell,
  buildPowerShellArgs,
  buildPowerShellCommand,
  fitsWindowsCommandLimit,
  assertReadOnly
};
