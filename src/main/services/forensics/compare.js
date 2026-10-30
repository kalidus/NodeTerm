/**
 * compare.js - Comparación entre dos recolecciones (baseline vs actual)
 */
const { parseJsonLoose, nonEmptyLines } = require('./parsers');

const MAX_ITEMS = 200;

function collapse(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

const LINUX_SECTIONS = [
  { id: 'linux.users.passwd', title: 'Usuarios (/etc/passwd)', key: (l) => collapse(l) },
  { id: 'linux.users.sudoers', title: 'Reglas sudo', key: (l) => collapse(l) },
  { id: 'linux.persist.cron', title: 'Tareas cron', key: (l) => collapse(l) },
  { id: 'linux.persist.ssh_keys', title: 'Claves SSH autorizadas', key: (l) => (/(ssh-|ecdsa)/.test(l) ? collapse(l).slice(0, 120) : null) },
  { id: 'linux.persist.services', title: 'Servicios habilitados', key: (l) => { const t = collapse(l).split(' ')[0]; return /\.service$/.test(t) ? t : null; } },
  { id: 'linux.persist.timers', title: 'Timers systemd', key: (l) => { const m = l.match(/(\S+\.timer)/); return m ? m[1] : null; } },
  {
    id: 'linux.net.listen',
    title: 'Puertos en escucha',
    key: (l) => {
      const t = collapse(l).split(' ');
      if (!/LISTEN|UNCONN/.test(l)) return null;
      const proc = (l.match(/users:\(\("([^"]+)"/) || [])[1] || '';
      return `${t[0]} ${t[4] || t[3]} ${proc}`.trim();
    }
  },
  {
    id: 'linux.proc.list',
    title: 'Procesos (usuario + comando)',
    key: (l) => {
      const t = collapse(l).split(' ');
      if (!/^\d+$/.test(t[0])) return null;
      return `${t[2]} ${t.slice(8).join(' ')}`.slice(0, 200);
    }
  },
  { id: 'linux.files.suid', title: 'Ficheros SUID/SGID', key: (l) => (l.split('\t')[3] || null) },
  { id: 'linux.kernel.modules', title: 'Módulos de kernel', key: (l) => { const n = collapse(l).split(' ')[0]; return n && n !== 'Module' && !/^tainted=/.test(n) ? n : null; } }
];

const WINDOWS_SECTIONS = [
  { id: 'windows.proc.list', title: 'Procesos', json: true, key: (r) => `${r.name} ${r.path || ''}` },
  { id: 'windows.net.conns', title: 'Puertos en escucha', json: true, key: (r) => (r.state === 'Listen' ? `${r.proc || ''} ${r.la}:${r.lp}` : null) },
  { id: 'windows.persist.tasks', title: 'Tareas programadas', json: true, key: (r) => `${r.path}${r.name} -> ${r.actions}` },
  { id: 'windows.persist.services', title: 'Servicios', json: true, key: (r) => `${r.Name} ${r.PathName || ''}` },
  { id: 'windows.persist.run', title: 'Autoarranque (Run/IFEO/Startup)', key: (l) => (l.includes('=') ? collapse(l) : null) },
  { id: 'windows.users.local', title: 'Usuarios locales', json: true, nested: 'users', key: (r) => `${r.Name} enabled=${r.Enabled}` },
  { id: 'windows.sec.firewall', title: 'Reglas de entrada del firewall', json: true, nested: 'inbound', key: (r) => r.DisplayName }
];

function extractKeys(section, text) {
  const keys = new Set();
  if (section.json) {
    let rows = parseJsonLoose(text, { asArray: !section.nested });
    if (section.nested) {
      const obj = Array.isArray(rows) ? rows[0] : rows;
      rows = obj ? [].concat(obj[section.nested] || []) : [];
    }
    (rows || []).forEach((r) => {
      const k = section.key(r || {});
      if (k) keys.add(collapse(k));
    });
  } else {
    nonEmptyLines(text).forEach((l) => {
      const k = section.key(l);
      if (k) keys.add(k);
    });
  }
  return keys;
}

function findingKey(f) {
  return `${f.ruleId}|${(f.evidence || []).map((e) => e.excerpt).sort().join('||')}`.slice(0, 600);
}

function compareCases(base, current) {
  const platform = current.case?.target?.platform || base.case?.target?.platform;
  const sectionsDef = platform === 'windows' ? WINDOWS_SECTIONS : platform === 'linux' ? LINUX_SECTIONS : [];

  const sections = [];
  for (const section of sectionsDef) {
    const a = base.artifactsText?.[section.id];
    const b = current.artifactsText?.[section.id];
    if (a == null && b == null) continue;
    const setA = extractKeys(section, a || '');
    const setB = extractKeys(section, b || '');
    const added = [...setB].filter((k) => !setA.has(k));
    const removed = [...setA].filter((k) => !setB.has(k));
    sections.push({
      collectorId: section.id,
      title: section.title,
      added: added.slice(0, MAX_ITEMS),
      removed: removed.slice(0, MAX_ITEMS),
      addedCount: added.length,
      removedCount: removed.length
    });
  }

  // Para equipos de red y para colectores sin sección: comparación por líneas de las configuraciones
  if (platform === 'network') {
    const ids = new Set([...Object.keys(base.artifactsText || {}), ...Object.keys(current.artifactsText || {})]);
    for (const id of ids) {
      if (!/\.config\./.test(id) && !/\.users\./.test(id)) continue;
      const setA = new Set(nonEmptyLines(base.artifactsText?.[id] || '').map(collapse));
      const setB = new Set(nonEmptyLines(current.artifactsText?.[id] || '').map(collapse));
      const added = [...setB].filter((k) => !setA.has(k));
      const removed = [...setA].filter((k) => !setB.has(k));
      sections.push({
        collectorId: id,
        title: id,
        added: added.slice(0, MAX_ITEMS),
        removed: removed.slice(0, MAX_ITEMS),
        addedCount: added.length,
        removedCount: removed.length
      });
    }
  }

  const baseFindings = base.findings?.findings || [];
  const currentFindings = current.findings?.findings || [];
  const baseKeys = new Map(baseFindings.map((f) => [findingKey(f), f]));
  const currentKeys = new Map(currentFindings.map((f) => [findingKey(f), f]));
  const summarizeFinding = (f) => ({ ruleId: f.ruleId, title: f.title, severity: f.severity, count: f.count });
  const newFindings = [...currentKeys.entries()].filter(([k]) => !baseKeys.has(k)).map(([, f]) => summarizeFinding(f));
  const resolved = [...baseKeys.entries()].filter(([k]) => !currentKeys.has(k)).map(([, f]) => summarizeFinding(f));

  return {
    platform,
    sameHost: (base.case?.target?.host || '') === (current.case?.target?.host || ''),
    base: { caseId: base.case?.caseId, createdAt: base.case?.createdAt, host: base.case?.target?.host },
    current: { caseId: current.case?.caseId, createdAt: current.case?.createdAt, host: current.case?.target?.host },
    findings: {
      new: newFindings,
      resolved,
      unchanged: [...currentKeys.keys()].filter((k) => baseKeys.has(k)).length
    },
    sections: sections.filter((s) => s.addedCount || s.removedCount)
  };
}

module.exports = { compareCases };
