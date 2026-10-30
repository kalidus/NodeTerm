/**
 * Perfiles de equipos de red (solo comandos de consulta).
 *
 * Cada perfil define: etiqueta, sufijo opcional de usuario, expresión de prompt
 * y la lista de comandos. Añadir un fabricante nuevo = añadir una entrada.
 */

const NETWORK_PROFILES = {
  'cisco-ios': {
    label: 'Cisco IOS / IOS-XE',
    promptRegex: '[\\r\\n][\\w.\\-()/@: ]{1,60}[>#]\\s?$',
    pre: ['terminal length 0', 'terminal width 511'],
    commands: [
      ['meta.version', 'meta', 'Versión y uptime', 'show version'],
      ['users.active', 'users', 'Sesiones de administración activas', 'show users'],
      ['config.running', 'config', 'Configuración en ejecución', 'show running-config'],
      ['config.archive', 'config', 'Historial de cambios de configuración', 'show archive log config all'],
      ['users.aaa', 'users', 'Usuarios locales (en running-config)', 'show running-config | include username|privilege|enable'],
      ['net.interfaces', 'network', 'Interfaces', 'show ip interface brief'],
      ['net.arp', 'network', 'Tabla ARP', 'show ip arp'],
      ['net.routes', 'network', 'Rutas', 'show ip route'],
      ['sec.acl', 'security', 'ACLs', 'show access-lists'],
      ['sec.snmp', 'security', 'SNMP', 'show running-config | include snmp-server'],
      ['sys.ntp', 'system', 'NTP', 'show ntp status'],
      ['logs.buffer', 'logs', 'Log local', 'show logging'],
      ['sys.cpu', 'system', 'CPU por proceso', 'show processes cpu sorted']
    ]
  },
  fortigate: {
    label: 'Fortinet FortiGate',
    promptRegex: '[\\r\\n][\\w.\\-() ]{1,60}\\s[#$]\\s?$',
    pre: [],
    commands: [
      ['meta.version', 'meta', 'Estado del sistema', 'get system status'],
      ['users.admins', 'users', 'Administradores', 'show system admin'],
      ['users.adminlist', 'users', 'Sesiones de administración', 'get system admin status'],
      ['config.full', 'config', 'Configuración completa', 'show full-configuration'],
      ['net.interfaces', 'network', 'Interfaces', 'show system interface'],
      ['net.arp', 'network', 'Tabla ARP', 'get system arp'],
      ['net.routes', 'network', 'Rutas', 'get router info routing-table all'],
      ['sys.perf', 'system', 'Rendimiento', 'get system performance status'],
      ['sec.sessions', 'security', 'Estadísticas de sesiones', 'diagnose sys session stat'],
      ['sec.firewall', 'security', 'Políticas de firewall', 'show firewall policy'],
      ['sec.vpn', 'security', 'VPN IPsec', 'get vpn ipsec tunnel summary']
    ]
  },
  mikrotik: {
    label: 'MikroTik RouterOS',
    userSuffix: '+ct',
    promptRegex: '[\\r\\n][^\\r\\n]{0,60}>\\s?$',
    pre: [],
    commands: [
      ['meta.version', 'meta', 'Recursos del sistema', '/system resource print'],
      ['meta.identity', 'meta', 'Identidad', '/system identity print'],
      ['users.list', 'users', 'Usuarios', '/user print detail'],
      ['users.active', 'users', 'Sesiones activas', '/user active print detail'],
      ['config.export', 'config', 'Configuración exportada', '/export'],
      ['net.services', 'network', 'Servicios IP', '/ip service print'],
      ['net.routes', 'network', 'Rutas', '/ip route print'],
      ['net.neighbors', 'network', 'Vecinos', '/ip neighbor print'],
      ['sec.filter', 'security', 'Reglas de filtrado', '/ip firewall filter print'],
      ['sec.nat', 'security', 'Reglas NAT', '/ip firewall nat print'],
      ['sec.proxy', 'security', 'Proxy y SOCKS', '/ip proxy print'],
      ['persist.scheduler', 'persistence', 'Scheduler', '/system scheduler print detail'],
      ['persist.scripts', 'persistence', 'Scripts', '/system script print'],
      ['logs.log', 'logs', 'Log local', '/log print']
    ]
  },
  juniper: {
    label: 'Juniper Junos',
    promptRegex: '[\\r\\n][\\w.\\-@:]{1,60}[>#]\\s?$',
    pre: ['set cli screen-length 0', 'set cli screen-width 511'],
    commands: [
      ['meta.version', 'meta', 'Versión', 'show version'],
      ['users.active', 'users', 'Usuarios conectados', 'show system users'],
      ['config.set', 'config', 'Configuración (formato set)', 'show configuration | display set'],
      ['config.commit', 'config', 'Historial de commits', 'show system commit'],
      ['net.arp', 'network', 'Tabla ARP', 'show arp no-resolve'],
      ['net.routes', 'network', 'Rutas', 'show route'],
      ['logs.messages', 'logs', 'Log de mensajes', 'show log messages | last 300']
    ]
  },
  generic: {
    label: 'Genérico (show)',
    promptRegex: '[\\r\\n][^\\r\\n]{1,80}[>#$]\\s?$',
    pre: [],
    commands: [
      ['meta.version', 'meta', 'Versión', 'show version'],
      ['users.active', 'users', 'Usuarios', 'show users'],
      ['config.running', 'config', 'Configuración', 'show running-config'],
      ['logs.buffer', 'logs', 'Log', 'show logging']
    ]
  }
};

function listNetworkProfiles() {
  return Object.entries(NETWORK_PROFILES).map(([id, p]) => ({ id, label: p.label }));
}

function getNetworkProfile(vendor) {
  return NETWORK_PROFILES[vendor] || NETWORK_PROFILES.generic;
}

/** Convierte un perfil en colectores comparables a los de Linux/Windows. */
function getNetworkCollectors(vendor) {
  const profile = getNetworkProfile(vendor);
  return profile.commands.map(([id, category, title, script], idx) => ({
    id: `network.${id}`,
    platform: 'network',
    category,
    title,
    shell: 'device',
    script,
    timeoutMs: category === 'config' || category === 'logs' ? 120000 : 60000,
    profiles: ['quick', 'full'],
    needsRoot: false,
    volatility: idx
  }));
}

module.exports = { NETWORK_PROFILES, listNetworkProfiles, getNetworkProfile, getNetworkCollectors };
