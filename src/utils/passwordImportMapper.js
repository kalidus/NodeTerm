/**
 * Convierte entradas importadas (navegador, CSV, etc.) al formato de nodos del gestor de contraseñas.
 */

export function generatePasswordKey(prefix = 'password') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function mapBrowserEntriesToNodes(entries = [], options = {}) {
  const { group = '' } = options;
  if (!Array.isArray(entries)) return [];

  return entries.map((entry) => {
    const url = entry.url || '';
    const username = entry.username || '';
    const password = entry.password || '';
    const title = entry.title || '';
    const notes = entry.notes || '';
    const label = title || username || url || '(Sin título)';
    const key = generatePasswordKey('password');

    return {
      key,
      label,
      data: {
        type: 'password',
        username,
        password,
        url,
        group: group || '',
        notes
      },
      uid: key,
      createdAt: new Date().toISOString(),
      isUserCreated: true,
      draggable: true,
      droppable: false
    };
  });
}

export default mapBrowserEntriesToNodes;
