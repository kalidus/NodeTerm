'use strict';

const WALLIX_PROXY_PATTERN = /^(.+)@(.+)@(.+):(.+):(.+)$/;

function isWallixProxyString(str) {
  return str ? WALLIX_PROXY_PATTERN.test(String(str).trim()) : false;
}

function parseWallixProxyString(str) {
  const trimmed = String(str || '').trim();
  const match = trimmed.match(WALLIX_PROXY_PATTERN);
  if (!match) {
    return { isWallix: false, raw: trimmed };
  }
  const [, account, domain, targetServer, service, targetUser] = match;
  return {
    isWallix: true,
    raw: trimmed,
    account,
    domain,
    targetServer,
    service,
    targetUser
  };
}

function hostnameFromWallixUrl(url) {
  if (!url) return '';
  const base = String(url).replace(/\/$/, '');
  try {
    return new URL(base.includes('://') ? base : `https://${base}`).hostname;
  } catch (_) {
    return base.replace(/^https?:\/\//, '').split('/')[0] || base;
  }
}

/**
 * Campos bastion aplicados al importar desde la API Wallix (paridad con guardado manual).
 */
function applyWallixBastionImportFields(nodeData, { bastionHostname, proxyUsername, targetName, serviceLabel }) {
  if (!nodeData) return;
  nodeData.useBastionWallix = true;
  nodeData.isBastion = true;
  nodeData.bastionHost = bastionHostname;
  nodeData.bastionUser = proxyUsername;
  nodeData.targetServer = targetName;
  nodeData.wallixService = serviceLabel;
}

/**
 * Rellena flags bastion en nodos legacy (import Wallix antiguo o solo cadena proxy en user/username).
 */
function normalizeWallixConnectionData(data, options = {}) {
  if (!data || data.type === 'folder') return data;

  const wallixUrl = options.wallixUrl || '';
  const proxyStr = String(
    data.bastionUser || data.user || data.username || ''
  ).trim();

  const isWallixImported = data.importedFrom === 'Wallix';
  const isWallixFormat = isWallixProxyString(proxyStr);
  if (!isWallixImported && !isWallixFormat) return data;

  const parsed = parseWallixProxyString(proxyStr);
  const bastionFromUrl = hostnameFromWallixUrl(wallixUrl);
  const next = { ...data };

  if (!next.useBastionWallix) next.useBastionWallix = true;
  if (!next.isBastion) next.isBastion = true;

  if (isWallixFormat) {
    if (!next.bastionUser) next.bastionUser = parsed.raw;
    if (!next.targetServer && parsed.isWallix) next.targetServer = parsed.targetServer;
    if (!next.wallixService && parsed.isWallix) next.wallixService = parsed.service;
  }

  if (!next.bastionHost) {
    next.bastionHost = data.bastionHost
      || data.host
      || data.server
      || bastionFromUrl
      || '';
  }

  if (isWallixFormat && !next.bastionUser) {
    next.bastionUser = parsed.raw;
  }

  return next;
}

function mergeWallixBastionFromIncoming(existingData, incomingData) {
  if (!existingData || !incomingData) return existingData;
  const merged = { ...existingData };

  const bastionKeys = [
    'useBastionWallix',
    'isBastion',
    'bastionHost',
    'bastionUser',
    'targetServer',
    'wallixService'
  ];

  for (const key of bastionKeys) {
    if (incomingData[key] !== undefined && incomingData[key] !== null && incomingData[key] !== '') {
      merged[key] = incomingData[key];
    }
  }

  if (incomingData.useBastionWallix === true) {
    merged.useBastionWallix = true;
    merged.isBastion = true;
  }

  if (incomingData.user !== undefined && incomingData.user !== '') {
    merged.user = incomingData.user;
  }
  if (incomingData.username !== undefined && incomingData.username !== '') {
    merged.username = incomingData.username;
  }
  if (incomingData.host !== undefined && incomingData.host !== '') {
    merged.host = incomingData.host;
  }
  if (incomingData.server !== undefined && incomingData.server !== '') {
    merged.server = incomingData.server;
  }
  if (incomingData.port !== undefined && incomingData.port !== null) {
    merged.port = incomingData.port;
  }

  return merged;
}

function migrateWallixBastionInTree(nodes, inheritedWallixUrl = null) {
  if (!Array.isArray(nodes)) return nodes;

  return nodes.map((node) => {
    const wallixUrl = node.data?.wallixUrl || inheritedWallixUrl;
    const migrated = { ...node };

    if (migrated.data && !migrated.droppable) {
      migrated.data = normalizeWallixConnectionData(migrated.data, { wallixUrl });
    }

    if (Array.isArray(migrated.children) && migrated.children.length > 0) {
      migrated.children = migrateWallixBastionInTree(migrated.children, wallixUrl);
    }

    return migrated;
  });
}

module.exports = {
  WALLIX_PROXY_PATTERN,
  isWallixProxyString,
  parseWallixProxyString,
  hostnameFromWallixUrl,
  applyWallixBastionImportFields,
  normalizeWallixConnectionData,
  mergeWallixBastionFromIncoming,
  migrateWallixBastionInTree
};
