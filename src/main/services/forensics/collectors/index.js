/**
 * Registro de colectores forenses.
 */
const { LINUX_COLLECTORS } = require('./linux');
const { WINDOWS_COLLECTORS } = require('./windows');
const { getNetworkCollectors, listNetworkProfiles, getNetworkProfile } = require('./network-device');

const PLATFORMS = ['linux', 'windows', 'network'];
const PROFILES = ['quick', 'full'];

/**
 * @param {{platform:'linux'|'windows'|'network', profile?:'quick'|'full', vendor?:string}} opts
 */
function getCollectors({ platform, profile = 'quick', vendor } = {}) {
  let list;
  if (platform === 'linux') list = LINUX_COLLECTORS;
  else if (platform === 'windows') list = WINDOWS_COLLECTORS;
  else if (platform === 'network') list = getNetworkCollectors(vendor);
  else throw new Error(`Plataforma forense desconocida: ${platform}`);
  const p = PROFILES.includes(profile) ? profile : 'quick';
  return list
    .filter((c) => c.profiles.includes(p))
    .slice()
    .sort((a, b) => (a.volatility ?? 5) - (b.volatility ?? 5));
}

function getAllCollectors() {
  const all = [...LINUX_COLLECTORS, ...WINDOWS_COLLECTORS];
  for (const { id } of listNetworkProfiles()) all.push(...getNetworkCollectors(id));
  return all;
}

/** Metadatos serializables para el renderer (sin scripts). */
function describeCollectors({ platform, profile, vendor }) {
  return getCollectors({ platform, profile, vendor }).map((c) => ({
    id: c.id,
    category: c.category,
    title: c.title,
    needsRoot: c.needsRoot
  }));
}

module.exports = {
  PLATFORMS,
  PROFILES,
  getCollectors,
  getAllCollectors,
  describeCollectors,
  listNetworkProfiles,
  getNetworkProfile
};
