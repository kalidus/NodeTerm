/**
 * custom.js - Reglas que requieren lógica (agregaciones, correlación, parseo estructurado)
 */
const { mitreRefs } = require('./mitre');
const {
  parsePasswd,
  nonEmptyLines,
  splitSections,
  isPrivateIp,
  toArray,
  truncate,
  isSelfNoise
} = require('../parsers');

function finding({ ruleId, title, severity, description, recommendation, platform, mitre = [], evidence = [], count }) {
  return {
    ruleId,
    title,
    severity,
    description,
    recommendation,
    platform,
    mitre: mitreRefs(mitre),
    count: count ?? evidence.length,
    evidence
  };
}

const ev = (collectorId, excerpt) => ({ collectorId, excerpt: truncate(excerpt, 400) });

// ---------------------------------------------------------------------------
// Linux
// ---------------------------------------------------------------------------

function linuxAccounts(ctx) {
  const out = [];
  const users = parsePasswd(ctx.text('linux.users.passwd'));
  if (!users.length) return out;

  const uid0 = users.filter((u) => u.uid === 0 && u.name !== 'root');
  if (uid0.length) {
    out.push(finding({
      ruleId: 'LNX-UID0',
      title: 'Cuentas adicionales con UID 0',
      severity: 'critical',
      description: 'Solo root debería tener UID 0. Una cuenta extra con UID 0 es una puerta trasera clásica.',
      recommendation: 'Bloquea la cuenta, revisa su actividad y busca persistencia asociada.',
      platform: 'linux',
      mitre: ['T1136.001', 'T1078'],
      evidence: uid0.map((u) => ev('linux.users.passwd', `${u.name}:uid=${u.uid}:home=${u.home}:shell=${u.shell}`))
    }));
  }

  const oddHome = users.filter((u) => /^\/(tmp|dev\/shm|var\/tmp)/.test(u.home || ''));
  if (oddHome.length) {
    out.push(finding({
      ruleId: 'LNX-USER-ODD-HOME',
      title: 'Cuentas con directorio personal en rutas temporales',
      severity: 'high',
      description: 'Los usuarios legítimos no suelen tener su home en /tmp o /dev/shm.',
      recommendation: 'Revisa la creación de la cuenta y los ficheros de su directorio.',
      platform: 'linux',
      mitre: ['T1136.001'],
      evidence: oddHome.map((u) => ev('linux.users.passwd', `${u.name}:uid=${u.uid}:home=${u.home}:shell=${u.shell}`))
    }));
  }

  const knownSystemShells = new Set(['root', 'sync', 'shutdown', 'halt', 'postgres', 'git', 'oracle', 'ec2-user', 'ubuntu', 'admin', 'vagrant']);
  const sysShell = users.filter((u) => u.uid > 0 && u.uid < 1000
    && /\/(ba|z|da|k)?sh$/.test(u.shell || '') && !/(nologin|false)$/.test(u.shell || '')
    && !knownSystemShells.has(u.name));
  if (sysShell.length) {
    out.push(finding({
      ruleId: 'LNX-SYSACCT-SHELL',
      title: 'Cuentas de sistema con shell interactiva',
      severity: 'low',
      description: 'Cuentas de servicio (UID < 1000) con shell de login válida; los atacantes las reutilizan.',
      recommendation: 'Cambia su shell a /usr/sbin/nologin si no necesitan acceso interactivo.',
      platform: 'linux',
      mitre: ['T1078'],
      evidence: sysShell.map((u) => ev('linux.users.passwd', `${u.name}:uid=${u.uid}:shell=${u.shell}`))
    }));
  }
  return out;
}

function linuxAuthBrute(ctx) {
  const text = ctx.text('linux.logs.auth') + '\n' + ctx.text('linux.logs.sshd');
  if (!text.trim()) return [];
  const failed = new Map();
  const accepted = new Map();
  for (const line of text.split('\n')) {
    if (isSelfNoise(line)) continue;
    let m = line.match(/Failed (?:password|publickey|keyboard-interactive\/pam) for (?:invalid user )?(\S+) from (\S+)/);
    if (m) failed.set(m[2], (failed.get(m[2]) || 0) + 1);
    m = line.match(/Invalid user (\S+) from (\S+)/);
    if (m) failed.set(m[2], (failed.get(m[2]) || 0) + 1);
    m = line.match(/Accepted (\S+) for (\S+) from (\S+)/);
    if (m) {
      const list = accepted.get(m[3]) || [];
      list.push(`${m[2]} (${m[1]})`);
      accepted.set(m[3], list);
    }
  }
  const out = [];
  const THRESHOLD = 15;
  const attackers = [...failed.entries()].filter(([, n]) => n >= THRESHOLD).sort((a, b) => b[1] - a[1]);
  if (attackers.length) {
    out.push(finding({
      ruleId: 'LNX-AUTH-BRUTE',
      title: 'Ataques de fuerza bruta contra SSH',
      severity: 'medium',
      description: `Direcciones con ${THRESHOLD} o más intentos fallidos de autenticación.`,
      recommendation: 'Limita el acceso por IP/VPN, habilita fail2ban y usa solo claves SSH.',
      platform: 'linux',
      mitre: ['T1110.001'],
      evidence: attackers.slice(0, 10).map(([ip, n]) => ev('linux.logs.auth', `${ip}: ${n} intentos fallidos`)),
      count: attackers.length
    }));
    const success = attackers.filter(([ip]) => accepted.has(ip));
    if (success.length) {
      out.push(finding({
        ruleId: 'LNX-AUTH-BRUTE-SUCCESS',
        title: 'Acceso correcto desde una IP que realizó fuerza bruta',
        severity: 'critical',
        description: 'Una IP con muchos fallos acabó autenticándose: posible compromiso de credenciales.',
        recommendation: 'Cambia credenciales, revoca claves, revisa la actividad posterior al acceso (history, cron, claves SSH).',
        platform: 'linux',
        mitre: ['T1110.001', 'T1078'],
        evidence: success.map(([ip, n]) => ev('linux.logs.auth', `${ip}: ${n} fallos y accesos como ${[...new Set(accepted.get(ip))].join(', ')}`))
      }));
    }
  }
  return out;
}

function linuxAuthorizedKeys(ctx) {
  const text = ctx.text('linux.persist.ssh_keys');
  if (!text.trim()) return [];
  const out = [];
  const recent = [];
  const rootKeys = [];
  const forced = [];
  const refMs = ctx.collectedAt ? Date.parse(ctx.collectedAt) : Date.now();

  for (const section of splitSections(text)) {
    if (!section.title) continue;
    const lines = section.lines.filter((l) => l.trim());
    const lsLine = lines.find((l) => /^[-lrwxsStT]{10}/.test(l));
    const keys = lines.filter((l) => /(ssh-(rsa|ed25519|dss)|ecdsa-sha2)/.test(l));
    if (!keys.length) continue;
    if (/^\/root\//.test(section.title)) rootKeys.push(`${section.title}: ${keys.length} clave(s)`);
    keys.forEach((k) => { if (/^(command|environment)=/.test(k.trim())) forced.push(`${section.title}: ${truncate(k, 160)}`); });
    const dm = lsLine && lsLine.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    if (dm) {
      const modMs = Date.parse(`${dm[1]}T${dm[2]}Z`) - (ctx.tzOffsetMin || 0) * 60000;
      if (refMs - modMs < 14 * 86400000) recent.push(`${section.title}: modificado ${dm[1]} ${dm[2]} (${keys.length} clave/s)`);
    }
  }
  if (recent.length) {
    out.push(finding({
      ruleId: 'LNX-AUTHKEYS-RECENT',
      title: 'authorized_keys modificados en los últimos 14 días',
      severity: 'high',
      description: 'Añadir claves SSH es una técnica de persistencia muy habitual.',
      recommendation: 'Compara cada clave con las autorizadas y elimina las desconocidas.',
      platform: 'linux',
      mitre: ['T1098.004'],
      evidence: recent.map((r) => ev('linux.persist.ssh_keys', r))
    }));
  }
  if (forced.length) {
    out.push(finding({
      ruleId: 'LNX-AUTHKEYS-COMMAND',
      title: 'Claves SSH con opciones command= o environment=',
      severity: 'medium',
      description: 'Pueden ejecutar comandos forzados al conectar; revisa su finalidad.',
      recommendation: 'Valida que sean legítimas.',
      platform: 'linux',
      mitre: ['T1098.004'],
      evidence: forced.map((r) => ev('linux.persist.ssh_keys', r))
    }));
  }
  if (rootKeys.length) {
    out.push(finding({
      ruleId: 'LNX-AUTHKEYS-ROOT',
      title: 'Claves SSH autorizadas para root',
      severity: 'medium',
      description: 'Acceso directo a root con clave; confirma que son las esperadas.',
      recommendation: 'Elimina claves innecesarias y deshabilita login root por SSH si es posible.',
      platform: 'linux',
      mitre: ['T1098.004'],
      evidence: rootKeys.map((r) => ev('linux.persist.ssh_keys', r))
    }));
  }
  return out;
}

function linuxPreload(ctx) {
  const text = ctx.text('linux.kernel.preload');
  if (!text) return [];
  const [fileSide, envSide = ''] = text.split(/^---$/m);
  const preload = nonEmptyLines(fileSide);
  const env = nonEmptyLines(envSide);
  const lines = [...preload.map((l) => `ld.so.preload: ${l}`), ...env.map((l) => `env: ${l}`)];
  if (!lines.length) return [];
  return [finding({
    ruleId: 'LNX-LD-PRELOAD',
    title: 'Librerías precargadas globalmente (ld.so.preload / LD_*)',
    severity: 'high',
    description: '/etc/ld.so.preload es una técnica de rootkit en espacio de usuario para ocultar procesos y ficheros.',
    recommendation: 'Analiza las librerías referenciadas; no confíes en la salida de ls/ps del host.',
    platform: 'linux',
    mitre: ['T1574.006', 'T1014'],
    evidence: lines.map((l) => ev('linux.kernel.preload', l))
  })];
}

function linuxExternalRootLogin(ctx) {
  const text = ctx.text('linux.logins.last');
  const hits = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^root\s+\S+\s+(\S+)\s/);
    if (m && /^\d{1,3}(\.\d{1,3}){3}$/.test(m[1]) && !isPrivateIp(m[1])) hits.push(line.trim());
  }
  if (!hits.length) return [];
  return [finding({
    ruleId: 'LNX-LAST-ROOT-EXTERNAL',
    title: 'Sesiones de root desde direcciones públicas',
    severity: 'medium',
    description: 'El historial de accesos muestra sesiones de root desde IPs públicas.',
    recommendation: 'Valida que los orígenes sean legítimos y restringe el acceso.',
    platform: 'linux',
    mitre: ['T1078', 'T1021.004'],
    evidence: hits.slice(0, 8).map((l) => ev('linux.logins.last', l)),
    count: hits.length
  })];
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

function windowsAuth(ctx) {
  const out = [];
  const fails = ctx.json('windows.ev.logon_fail');
  const oks = ctx.json('windows.ev.logon_ok');

  const failByIp = new Map();
  fails.forEach((r) => {
    const ip = (r.ip || '').trim();
    if (!ip || ip === '-') return;
    failByIp.set(ip, (failByIp.get(ip) || 0) + 1);
  });
  const attackers = [...failByIp.entries()].filter(([, n]) => n >= 20).sort((a, b) => b[1] - a[1]);
  if (attackers.length) {
    out.push(finding({
      ruleId: 'WIN-AUTH-BRUTE',
      title: 'Ataques de fuerza bruta (4625)',
      severity: 'medium',
      description: 'Direcciones con 20 o más inicios de sesión fallidos en los últimos 7 días.',
      recommendation: 'Restringe RDP/SMB desde Internet, aplica bloqueo de cuentas y MFA.',
      platform: 'windows',
      mitre: ['T1110.001'],
      evidence: attackers.slice(0, 10).map(([ip, n]) => ev('windows.ev.logon_fail', `${ip}: ${n} fallos`)),
      count: attackers.length
    }));
    const okByIp = new Map();
    oks.forEach((r) => {
      const ip = (r.ip || '').trim();
      if (!ip) return;
      const list = okByIp.get(ip) || [];
      list.push(`${r.dom || ''}\\${r.user || '?'} (tipo ${r.type})`);
      okByIp.set(ip, list);
    });
    const success = attackers.filter(([ip]) => okByIp.has(ip));
    if (success.length) {
      out.push(finding({
        ruleId: 'WIN-AUTH-BRUTE-SUCCESS',
        title: 'Inicio de sesión correcto desde una IP que realizó fuerza bruta',
        severity: 'critical',
        description: 'Una IP con muchos fallos consiguió autenticarse (4624).',
        recommendation: 'Cambia credenciales, termina sesiones y revisa la actividad posterior.',
        platform: 'windows',
        mitre: ['T1110.001', 'T1078'],
        evidence: success.map(([ip, n]) => ev('windows.ev.logon_ok', `${ip}: ${n} fallos y accesos ${[...new Set(okByIp.get(ip))].join(', ')}`))
      }));
    }
  }

  const rdpExternal = oks.filter((r) => String(r.type) === '10' && r.ip && !isPrivateIp(r.ip));
  if (rdpExternal.length) {
    out.push(finding({
      ruleId: 'WIN-RDP-EXTERNAL',
      title: 'Inicios de sesión RDP desde direcciones públicas',
      severity: 'high',
      description: 'Sesiones interactivas remotas (tipo 10) desde IPs públicas.',
      recommendation: 'Expón RDP solo mediante VPN/gateway con MFA y revisa estas sesiones.',
      platform: 'windows',
      mitre: ['T1021.001', 'T1078'],
      evidence: rdpExternal.slice(0, 10).map((r) => ev('windows.ev.logon_ok', `${r.t} ${r.dom || ''}\\${r.user || '?'} desde ${r.ip}`)),
      count: rdpExternal.length
    }));
  }
  return out;
}

function windowsUsers(ctx) {
  const rows = ctx.json('windows.users.local', { asArray: false });
  const obj = Array.isArray(rows) ? rows[0] : rows;
  if (!obj) return [];
  const out = [];
  const users = toArray(obj.users);
  const admins = toArray(obj.admins);

  const hidden = users.filter((u) => /\$$/.test(u.Name || ''));
  if (hidden.length) {
    out.push(finding({
      ruleId: 'WIN-HIDDEN-USER',
      title: 'Cuentas locales con nombre terminado en $',
      severity: 'high',
      description: 'Las cuentas que terminan en $ se confunden con cuentas de equipo y se usan para ocultar persistencia.',
      recommendation: 'Revisa su pertenencia a grupos y su actividad.',
      platform: 'windows',
      mitre: ['T1136.001'],
      evidence: hidden.map((u) => ev('windows.users.local', `${u.Name} (habilitada=${u.Enabled}, SID=${u.SID?.Value || u.SID || ''})`))
    }));
  }

  const enabled = users.filter((u) => u.Enabled);
  const adminNames = admins.map((a) => a.Name);
  if (adminNames.length) {
    out.push(finding({
      ruleId: 'WIN-LOCAL-ADMINS',
      title: 'Miembros del grupo Administradores locales',
      severity: 'info',
      description: 'Revisa que solo existan cuentas esperadas.',
      recommendation: 'Elimina cuentas innecesarias del grupo.',
      platform: 'windows',
      mitre: [],
      evidence: adminNames.slice(0, 20).map((n) => ev('windows.users.local', n)),
      count: adminNames.length
    }));
  }
  ctx.facts.enabledUsers = enabled.map((u) => u.Name);
  ctx.facts.admins = adminNames;
  return out;
}

function windowsSecurityConfig(ctx) {
  const out = [];
  const def = ctx.json('windows.sec.defender', { asArray: false });
  const d = Array.isArray(def) ? def[0] : def;
  if (d && d.prefs) {
    const p = d.prefs;
    if (p.DisableRealtimeMonitoring === true || String(p.DisableRealtimeMonitoring).toLowerCase() === 'true') {
      out.push(finding({
        ruleId: 'WIN-DEFENDER-OFF',
        title: 'Protección en tiempo real de Defender desactivada',
        severity: 'high',
        description: 'El antivirus no está protegiendo el equipo en tiempo real.',
        recommendation: 'Reactívala y averigua quién la desactivó y cuándo (eventos 5001).',
        platform: 'windows',
        mitre: ['T1562.001'],
        evidence: [ev('windows.sec.defender', 'DisableRealtimeMonitoring=True')]
      }));
    }
    const ex = [...toArray(p.ExclusionPath), ...toArray(p.ExclusionProcess), ...toArray(p.ExclusionExtension)]
      .filter(Boolean)
      // Sin privilegios Defender devuelve "N/A: Must be an administrator..." (no es una exclusión)
      .filter((e) => !/^N\/A\b/i.test(String(e)));
    if (ex.length) {
      out.push(finding({
        ruleId: 'WIN-DEFENDER-EXCLUSIONS',
        title: 'Exclusiones configuradas en Defender',
        severity: 'medium',
        description: 'Los atacantes añaden exclusiones para ejecutar malware sin ser detectados.',
        recommendation: 'Revisa cada exclusión y elimina las innecesarias.',
        platform: 'windows',
        mitre: ['T1562.001'],
        evidence: ex.slice(0, 15).map((e) => ev('windows.sec.defender', String(e))),
        count: ex.length
      }));
    }
  }

  const fw = ctx.json('windows.sec.firewall', { asArray: false });
  const f = Array.isArray(fw) ? fw[0] : fw;
  if (f) {
    const off = toArray(f.profiles).filter((p) => p && (p.Enabled === false || p.Enabled === 0 || String(p.Enabled).toLowerCase() === 'false'));
    if (off.length) {
      out.push(finding({
        ruleId: 'WIN-FIREWALL-OFF',
        title: 'Perfiles del cortafuegos de Windows desactivados',
        severity: 'medium',
        description: 'Uno o más perfiles del firewall están deshabilitados.',
        recommendation: 'Actívalos y revisa las reglas de entrada.',
        platform: 'windows',
        mitre: ['T1562.004'],
        evidence: off.map((p) => ev('windows.sec.firewall', `Perfil ${p.Name} desactivado`))
      }));
    }
  }

  const smb = ctx.json('windows.misc.shares', { asArray: false });
  const s = Array.isArray(smb) ? smb[0] : smb;
  if (s) {
    const shares = toArray(s.shares).filter((x) => x && !/^(ADMIN\$|C\$|[A-Z]\$|IPC\$|print\$)$/i.test(x.Name || ''));
    if (shares.length) {
      out.push(finding({
        ruleId: 'WIN-SMB-SHARES',
        title: 'Recursos compartidos SMB no administrativos',
        severity: 'low',
        description: 'Comprueba que cada recurso compartido sea necesario.',
        recommendation: 'Elimina o restringe los recursos innecesarios.',
        platform: 'windows',
        mitre: ['T1021.002'],
        evidence: shares.map((x) => ev('windows.misc.shares', `${x.Name} -> ${x.Path || ''}`))
      }));
    }
  }
  return out;
}

function windowsWmi(ctx) {
  const rows = ctx.json('windows.persist.wmi', { asArray: false });
  const o = Array.isArray(rows) ? rows[0] : rows;
  if (!o) return [];
  const consumers = toArray(o.consumers).filter((c) => c && (c.CommandLineTemplate || c.ScriptText));
  if (!consumers.length) return [];
  return [finding({
    ruleId: 'WIN-WMI-PERSISTENCE',
    title: 'Suscripciones de eventos WMI con comandos o scripts',
    severity: 'critical',
    description: 'Los consumidores WMI CommandLine/ActiveScript son un mecanismo de persistencia sin fichero muy utilizado por APT.',
    recommendation: 'Exporta filtros, consumidores y enlaces; elimínalos tras preservar la evidencia.',
    platform: 'windows',
    mitre: ['T1546.003'],
    evidence: consumers.map((c) => ev('windows.persist.wmi', `${c.Name}: ${c.CommandLineTemplate || truncate(c.ScriptText, 200)}`))
  })];
}

function windowsProcessAnomalies(ctx) {
  const rows = ctx.json('windows.proc.list');
  if (!rows.length) return [];
  const byPid = new Map(rows.map((r) => [Number(r.pid), r]));
  const shells = /^(cmd|powershell|pwsh|wscript|cscript|mshta|rundll32|regsvr32)\.exe$/i;
  const riskyParents = /^(winword|excel|powerpnt|outlook|acrord32|acrobat|w3wp|httpd|nginx|tomcat\d*|sqlservr|php-cgi|php)\.exe$/i;
  const evidence = [];
  rows.forEach((r) => {
    if (!shells.test(r.name || '')) return;
    const parent = byPid.get(Number(r.ppid));
    if (parent && riskyParents.test(parent.name || '')) {
      if (isSelfNoise(r.cmd || '')) return;
      evidence.push(ev('windows.proc.list', `${parent.name} (PID ${parent.pid}) -> ${r.name} (PID ${r.pid}): ${truncate(r.cmd || '', 200)}`));
    }
  });
  const out = [];
  if (evidence.length) {
    out.push(finding({
      ruleId: 'WIN-PROC-ODD-PARENT',
      title: 'Intérpretes lanzados por Office, servidores web o bases de datos',
      severity: 'high',
      description: 'Procesos de documentos o servicios de red que lanzan cmd/PowerShell son indicadores de exploit o macro maliciosa.',
      recommendation: 'Analiza el árbol de procesos y los registros de la aplicación padre.',
      platform: 'windows',
      mitre: ['T1059', 'T1204'],
      evidence: evidence.slice(0, 8),
      count: evidence.length
    }));
  }
  ctx.facts.processCount = rows.length;
  return out;
}

function windowsUnsigned(ctx) {
  const rows = ctx.json('windows.proc.hashes');
  if (!rows.length) return [];
  const bad = rows.filter((r) => String(r.sig) === 'HashMismatch');
  const unsignedRisky = rows.filter((r) => String(r.sig) === 'NotSigned'
    && /\\(Temp|Users\\Public|ProgramData|Downloads)\\|\\AppData\\/i.test(r.path || ''));
  const out = [];
  if (bad.length) {
    out.push(finding({
      ruleId: 'WIN-SIG-MISMATCH',
      title: 'Ejecutables con firma digital inválida',
      severity: 'high',
      description: 'La firma no coincide con el contenido del fichero (binario alterado).',
      recommendation: 'Compara con una copia original y analiza el binario.',
      platform: 'windows',
      mitre: ['T1554', 'T1036'],
      evidence: bad.map((r) => ev('windows.proc.hashes', `${r.path} sha256=${r.sha256}`))
    }));
  }
  if (unsignedRisky.length) {
    out.push(finding({
      ruleId: 'WIN-UNSIGNED-USERPATH',
      title: 'Ejecutables sin firma en rutas de usuario',
      severity: 'medium',
      description: 'Procesos sin firmar ejecutándose desde Temp, AppData, Public o ProgramData.',
      recommendation: 'Consulta los hashes en fuentes de inteligencia.',
      platform: 'windows',
      mitre: ['T1036.005'],
      evidence: unsignedRisky.slice(0, 10).map((r) => ev('windows.proc.hashes', `${r.path} sha256=${r.sha256}`))
    }));
  }
  return out;
}

const CUSTOM_RULES = {
  linux: [linuxAccounts, linuxAuthBrute, linuxAuthorizedKeys, linuxPreload, linuxExternalRootLogin],
  windows: [windowsAuth, windowsUsers, windowsSecurityConfig, windowsWmi, windowsProcessAnomalies, windowsUnsigned],
  network: []
};

function runCustomRules(ctx) {
  const findings = [];
  for (const fn of CUSTOM_RULES[ctx.platform] || []) {
    try {
      findings.push(...fn(ctx));
    } catch (_) { /* no abortar el análisis */ }
  }
  return findings;
}

module.exports = { runCustomRules, CUSTOM_RULES };
