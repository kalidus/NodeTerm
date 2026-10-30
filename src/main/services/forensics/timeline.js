/**
 * timeline.js - Línea de tiempo unificada a partir de los artefactos
 *
 * Evento: { ts (ISO UTC), source (collectorId), type, text, severity? }
 */
const {
  localIsoToUtc,
  syslogToUtc,
  lastDateToUtc,
  isSelfNoise,
  truncate
} = require('./parsers');

const MAX_EVENTS = 5000;

function addEvent(list, ts, source, type, text) {
  if (!ts) return;
  list.push({ ts, source, type, text: truncate(text, 300) });
}

const FILE_SOURCES = {
  'linux.files.tmp_exec': 'file-tmp-exec',
  'linux.files.bin_recent': 'file-system-binary',
  'linux.files.recent': 'file-modified',
  'linux.files.suid': 'file-suid',
  'linux.persist.units_recent': 'persist-unit'
};

function linuxTimeline(ctx, events) {
  const tz = ctx.tzOffsetMin || 0;

  // Ficheros (find -printf: ISO local \t usuario \t modo [\t tamaño] \t ruta)
  for (const [source, type] of Object.entries(FILE_SOURCES)) {
    for (const line of ctx.text(source).split('\n')) {
      const m = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\t([^\t]*)\t(\d+)\t(?:(\d+)\t)?(.*)$/);
      if (!m) continue;
      addEvent(events, localIsoToUtc(m[1], tz), source, type, `${m[5]} (usuario ${m[2]}, modo ${m[3]})`);
    }
  }

  // last -F
  const LAST_DATE_RE = /[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4}/;
  const lastEntries = (source, defaultType) => {
    for (const line of ctx.text(source).split('\n')) {
      if (!line.trim() || /^(wtmp|btmp) begins/.test(line)) continue;
      const d = line.match(LAST_DATE_RE);
      if (!d) continue;
      const tokens = line.trim().split(/\s+/);
      const type = tokens[0] === 'reboot' ? 'reboot' : defaultType;
      const head = line.slice(0, d.index).trim().replace(/\s+/g, ' ');
      addEvent(events, lastDateToUtc(d[0], tz), source, type, head);
    }
  };
  lastEntries('linux.logins.last', 'login');
  lastEntries('linux.logins.lastb', 'login-failed');

  // auth.log (syslog clásico o ISO)
  for (const line of ctx.text('linux.logs.auth').split('\n')) {
    if (!line.trim() || isSelfNoise(line)) continue;
    let ts = null;
    let rest = '';
    let m = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+\S+\s+(.*)$/);
    if (m) {
      ts = syslogToUtc(m[1], m[2], m[3], ctx.collectedAt, tz);
      rest = m[4];
    } else {
      m = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+\S+\s+(.*)$/);
      if (m) {
        const d = new Date(m[1]);
        ts = Number.isNaN(d.getTime()) ? null : d.toISOString();
        rest = m[2];
      }
    }
    if (!ts) continue;
    let type = 'auth';
    if (/Accepted /.test(rest)) type = 'login-ok';
    else if (/Failed password|Invalid user|authentication failure/.test(rest)) type = 'login-failed';
    else if (/useradd|new user|usermod|new group/.test(rest)) type = 'account-change';
    else if (/sudo:/.test(rest)) type = 'sudo';
    addEvent(events, ts, 'linux.logs.auth', type, rest);
  }

  // Arranque del sistema (uptime)
  const up = ctx.text('linux.meta.system').match(/up\s+(?:(\d+)\s+days?,\s*)?(?:(\d+):(\d+)|(\d+)\s+min)/);
  if (up && ctx.collectedAt) {
    const days = parseInt(up[1] || '0', 10);
    const hours = parseInt(up[2] || '0', 10);
    const mins = parseInt(up[3] || up[4] || '0', 10);
    const boot = new Date(Date.parse(ctx.collectedAt) - ((days * 24 + hours) * 60 + mins) * 60000);
    addEvent(events, boot.toISOString(), 'linux.meta.system', 'boot', 'Arranque del sistema (estimado por uptime)');
  }
}

function windowsTimeline(ctx, events) {
  const evLabels = {
    4625: 'login-failed', 4624: 'login-ok', 4720: 'account-change', 4722: 'account-change', 4724: 'account-change',
    4728: 'group-change', 4732: 'group-change', 4756: 'group-change', 4698: 'task-created', 4702: 'task-created',
    4697: 'service-installed', 7045: 'service-installed', 1102: 'log-cleared', 4719: 'audit-policy', 4688: 'process',
    4104: 'powershell', 1116: 'defender', 1117: 'defender', 5001: 'defender', 5007: 'defender', 1149: 'rdp'
  };
  const sources = ['windows.ev.logon_fail', 'windows.ev.logon_ok', 'windows.ev.accounts', 'windows.ev.services',
    'windows.ev.process', 'windows.ev.powershell', 'windows.ev.defender', 'windows.ev.rdp'];
  for (const source of sources) {
    for (const r of ctx.json(source)) {
      if (!r || !r.t) continue;
      const parts = [`id=${r.id}`];
      if (r.user) parts.push(`${r.dom ? `${r.dom}\\` : ''}${r.user}`);
      if (r.by) parts.push(`por ${r.by}`);
      if (r.ip) parts.push(`desde ${r.ip}`);
      if (r.type) parts.push(`tipo ${r.type}`);
      if (r.svc) parts.push(`${r.svc} ${r.image || ''}`);
      if (r.proc) parts.push(r.proc);
      if (r.cmd) parts.push(r.cmd);
      if (r.msg) parts.push(String(r.msg).replace(/\s+/g, ' '));
      addEvent(events, r.t, source, evLabels[Number(r.id)] || 'event', parts.join(' · '));
    }
  }
  for (const r of ctx.json('windows.files.dropped')) addEvent(events, r.t, 'windows.files.dropped', 'file-dropped', `${r.FullName} (${r.Length} bytes)`);
  for (const r of ctx.json('windows.files.prefetch')) addEvent(events, r.t, 'windows.files.prefetch', 'prefetch', r.Name);
  for (const r of ctx.json('windows.proc.list')) {
    if (r.created && !isSelfNoise(r.cmd || '')) addEvent(events, r.created, 'windows.proc.list', 'process-start', `${r.name} (PID ${r.pid}) ${r.cmd || r.path || ''}`);
  }
  const meta = ctx.json('windows.meta.system', { asArray: false });
  const m = Array.isArray(meta) ? meta[0] : meta;
  if (m && m.boot) addEvent(events, m.boot, 'windows.meta.system', 'boot', 'Arranque del sistema');
}

function buildTimeline(ctx) {
  const events = [];
  if (ctx.platform === 'linux') linuxTimeline(ctx, events);
  else if (ctx.platform === 'windows') windowsTimeline(ctx, events);

  events.sort((a, b) => a.ts.localeCompare(b.ts));
  if (events.length > MAX_EVENTS) return events.slice(events.length - MAX_EVENTS);
  return events;
}

module.exports = { buildTimeline };
