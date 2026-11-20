/**
 * Pestañas cuya sesión vive en WebContentsView (TabHost) también en main,
 * para poder reparentar al desacoplar sin reconectar.
 */

const HOSTED_TYPES = new Set([
  'iron-rdp',
  'rdp-iron',
  'rdp-guacamole',
  'vnc-guacamole',
  'vnc',
  'rdp'
]);

export function isSurfaceHostedTab(tab) {
  if (!tab || !tab.key || tab.embedInHome) return false;
  return HOSTED_TYPES.has(tab.type);
}

export function isSurfaceHostedType(type) {
  return HOSTED_TYPES.has(type);
}
