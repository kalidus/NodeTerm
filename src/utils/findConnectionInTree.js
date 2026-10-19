/**
 * Busca un nodo de conexión en el árbol del vault/sidebar.
 * Prioridad: wantedId (key/id) → Wallix → host/user/port (+ local/remote para túneles).
 */

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function nodeType(node) {
  return node?.data?.type || '';
}

function typeMatches(node, types) {
  if (!Array.isArray(types) || types.length === 0) return true;
  const t = nodeType(node);
  if (types.includes(t)) return true;
  // Normalizaciones habituales
  if (types.includes('rdp') && t === 'rdp-guacamole') return true;
  if (types.includes('rdp-guacamole') && t === 'rdp') return true;
  if (types.includes('vnc') && t === 'vnc-guacamole') return true;
  if (types.includes('vnc-guacamole') && t === 'vnc') return true;
  if (types.includes('explorer') && (t === 'ssh' || t === 'sftp' || t === 'ftp' || t === 'scp')) return true;
  return false;
}

function hostsOf(data = {}) {
  return [
    data.server,
    data.host,
    data.hostname,
    data.bastionHost,
    data.targetServer,
    data.sshHost
  ].map(norm).filter(Boolean);
}

function usersOf(data = {}) {
  return [
    data.username,
    data.user,
    data.bastionUser,
    data.targetUser,
    data.sshUser
  ].map(norm).filter(Boolean);
}

function defaultPortForType(type) {
  if (type === 'ftp') return 21;
  if (type === 'rdp' || type === 'rdp-guacamole') return 3389;
  if (type === 'vnc' || type === 'vnc-guacamole') return 5900;
  return 22;
}

/**
 * Puerto efectivo del nodo.
 * Solo los túneles usan sshPort; en RDP/VNC un sshPort residual no debe ganar a port.
 */
function nodeEffectivePort(data = {}) {
  if (data.type === 'ssh-tunnel') {
    return parseInt(data.sshPort || data.port || 22, 10);
  }
  return parseInt(data.port || defaultPortForType(data.type), 10);
}

/** Evita usar ids serializados de historial (`rdp-guacamole:host:user:port`) como key del árbol. */
export function resolveWantedTreeId(...candidates) {
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    const s = String(raw);
    if (s.startsWith('__fav_shortcut__')) continue;
    if (/^(rdp-guacamole|vnc-guacamole|ssh|ssh-tunnel|sftp|ftp|scp|explorer):/i.test(s)) continue;
    return s;
  }
  return '';
}

function portsEqual(a, b) {
  const na = a != null && a !== '' ? parseInt(a, 10) : null;
  const nb = b != null && b !== '' ? parseInt(b, 10) : null;
  if (na == null || Number.isNaN(na) || nb == null || Number.isNaN(nb)) return true;
  return na === nb;
}

/**
 * @param {Array} nodes
 * @param {object} criteria
 * @param {string} [criteria.wantedId]
 * @param {string[]} [criteria.types]
 * @param {string} [criteria.host]
 * @param {string} [criteria.username]
 * @param {number|string} [criteria.port]
 * @param {number|string} [criteria.localPort]
 * @param {number|string} [criteria.remotePort]
 * @param {string} [criteria.bastionHost]
 * @param {string} [criteria.bastionUser]
 * @param {string} [criteria.targetServer]
 * @returns {object|null} nodo del árbol o null
 */
export function findConnectionInTree(nodes, criteria = {}) {
  const {
    wantedId,
    types,
    host,
    username,
    port,
    localPort,
    remotePort,
    bastionHost,
    bastionUser,
    targetServer
  } = criteria;

  const wanted = wantedId != null && wantedId !== '' ? String(wantedId) : '';
  const hostN = norm(host);
  const userN = norm(username);
  const bastionHostN = norm(bastionHost);
  const bastionUserN = norm(bastionUser);
  const targetServerN = norm(targetServer);
  const portN = port != null && port !== '' ? parseInt(port, 10) : null;
  const hasTunnelPorts = (localPort != null && localPort !== '') || (remotePort != null && remotePort !== '');

  let byHost = null;
  let byHostPortOnly = null;
  let byWallix = null;
  let byTunnelPorts = null;

  const walk = (list) => {
    if (!Array.isArray(list)) return null;
    for (const node of list) {
      if (node && node.data && typeMatches(node, types)) {
        if (wanted && (String(node.key) === wanted || String(node.id) === wanted)) {
          return node;
        }

        const data = node.data;
        const nodeHosts = hostsOf(data);
        const nodeUsers = usersOf(data);
        const nodePort = nodeEffectivePort(data);
        const portOk = portN == null || Number.isNaN(portN) || nodePort === portN;
        const tunnelPortsOk = !hasTunnelPorts
          || (portsEqual(localPort, data.localPort) && portsEqual(remotePort, data.remotePort));

        if (
          !byWallix &&
          bastionHostN &&
          targetServerN &&
          data.useBastionWallix &&
          norm(data.bastionHost) === bastionHostN &&
          norm(data.targetServer) === targetServerN &&
          (!bastionUserN || norm(data.bastionUser) === bastionUserN || nodeUsers.includes(bastionUserN))
        ) {
          byWallix = node;
        }

        if (
          !byHost &&
          hostN &&
          userN &&
          nodeHosts.includes(hostN) &&
          nodeUsers.includes(userN) &&
          portOk &&
          tunnelPortsOk
        ) {
          byHost = node;
        }

        // Preferir match de túnel con local/remote cuando se aportan
        if (
          !byTunnelPorts &&
          hasTunnelPorts &&
          hostN &&
          userN &&
          nodeHosts.includes(hostN) &&
          nodeUsers.includes(userN) &&
          portOk &&
          tunnelPortsOk
        ) {
          byTunnelPorts = node;
        }

        // VNC u otros sin username: host + puerto
        if (
          !byHostPortOnly &&
          hostN &&
          !userN &&
          nodeHosts.includes(hostN) &&
          portOk
        ) {
          byHostPortOnly = node;
        }
      }

      if (node?.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const byId = walk(nodes);
  if (byId) return byId;
  return byTunnelPorts || byWallix || byHost || byHostPortOnly || null;
}

export default findConnectionInTree;
