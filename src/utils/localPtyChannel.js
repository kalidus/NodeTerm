import { isBroadcastMember } from './broadcastMembership';

const LOCAL_TYPES = new Set([
  'powershell',
  'linux-terminal',
  'wsl',
  'cygwin',
  'ubuntu',
  'debian',
  'wsl-distro',
]);

export function isSplittableLocal(node) {
  return !!resolvePtyChannel(node);
}

function hasRealSshConfig(node) {
  const cfg = node?.sshConfig;
  return !!(cfg && (cfg.host || cfg.username));
}

/** Prefijo IPC (`powershell`, `wsl`, `ubuntu`, `wsl-distro`, `cygwin`) o null si es SSH. */
export function resolvePtyChannel(node) {
  if (!node) return null;
  if (hasRealSshConfig(node) && !node.local && !node.ptyChannel) return null;
  if (node.ptyChannel) return node.ptyChannel;

  // terminalType normal; si falta, usar type del tab (legacy: type:'powershell')
  // o asumir powershell en pestañas local-terminal.
  let type = node.terminalType;
  if (!type && node.type === 'local-terminal') type = 'powershell';
  if (!type && LOCAL_TYPES.has(node.type)) type = node.type;
  if (!type || !LOCAL_TYPES.has(type)) return null;

  if (type === 'powershell' || type === 'linux-terminal') return 'powershell';
  if (type === 'wsl') return 'wsl';
  if (type === 'cygwin') return 'cygwin';
  if (type === 'ubuntu') return 'ubuntu';
  if (type === 'debian' || type === 'wsl-distro') {
    if (node.distroInfo?.category === 'ubuntu') return 'ubuntu';
    if (node.distroInfo?.category) return 'wsl-distro';
    return 'ubuntu';
  }
  return null;
}

export function publishBroadcastInput(broadcastRef, tabId, data) {
  const props = broadcastRef?.current;
  if (!props?.onBroadcastData) return;
  if (!isBroadcastMember({
    isBroadcastActive: props.isBroadcastActive,
    broadcastExcludedTargets: props.broadcastExcludedTargets,
  }, tabId)) return;
  props.onBroadcastData(tabId, data);
}
