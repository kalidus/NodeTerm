const BODY_LIMIT = 12000;

export const CONNECTION_TYPES = [
  'ssh',
  'rdp',
  'rdp-guacamole',
  'vnc',
  'vnc-guacamole',
  'sftp',
  'ftp',
  'scp',
  'ssh-tunnel'
];

export const PASSWORD_TYPES = ['password', 'api_key', 'crypto_wallet', 'secure_note'];
export const NOTE_TYPES = ['document', 'quick-note', 'library-file'];

const CATEGORY_BY_TYPE = new Map();
CONNECTION_TYPES.forEach((type) => CATEGORY_BY_TYPE.set(type, 'connection'));
PASSWORD_TYPES.forEach((type) => CATEGORY_BY_TYPE.set(type, 'password'));
NOTE_TYPES.forEach((type) => CATEGORY_BY_TYPE.set(type, 'note'));

function nodeType(node) {
  return String(node?.data?.type || node?.type || '');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function capText(value) {
  const text = clean(value);
  if (text.length <= BODY_LIMIT) return text;
  return text.slice(0, BODY_LIMIT);
}

function uniqueJoin(values) {
  const seen = new Set();
  const parts = [];
  values.forEach((value) => {
    const text = clean(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(text);
  });
  return parts.join(' ');
}

export function htmlToPlain(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenUser(user) {
  const raw = clean(user);
  if (!raw) return '';
  const match = raw.match(/^(.+)@(.+)@(.+):(.+):(.+)$/);
  const shown = match ? match[5] : raw;
  return shown.length > 25 ? `${shown.slice(0, 22)}...` : shown;
}

function connectionHost(data) {
  return clean(data.host || data.hostname || data.server || data.ip || data.targetServer);
}

function connectionUser(data) {
  return clean(data.user || data.username);
}

function noteBody(data) {
  const markdown = clean(data.markdownSource);
  const html = htmlToPlain(data.content || '');
  return capText([markdown, html].filter(Boolean).join('\n'));
}

function folderLabel(path) {
  return path.length ? path.join(' / ') : '';
}

function buildDocument(node, category, kind, folderPath) {
  const data = node.data || {};
  const label = clean(node.label || data.title || data.name);
  const folder = folderLabel(folderPath);
  let identity = '';
  let detail = '';
  let subtitle = '';

  if (category === 'connection') {
    const host = connectionHost(data);
    const user = connectionUser(data);
    identity = uniqueJoin([
      host,
      data.hostname,
      data.server,
      data.ip,
      data.targetServer,
      user,
      data.port,
      data.name
    ]);
    detail = capText([folder, clean(data.description)].filter(Boolean).join(' '));
    const hostPart = host ? (data.port ? `${host}:${data.port}` : host) : '';
    const userPart = shortenUser(user);
    subtitle = [hostPart, userPart].filter(Boolean).join(' · ');
  } else if (category === 'password') {
    identity = uniqueJoin([
      data.username,
      data.url,
      data.group,
      data.serviceName,
      data.endpoint,
      data.name
    ]);
    const noteText = kind === 'secure_note'
      ? uniqueJoin([data.notes, data.noteContent])
      : clean(data.notes);
    detail = capText([folder, noteText].filter(Boolean).join(' '));
    subtitle = [clean(data.username), clean(data.url || data.endpoint || data.serviceName)]
      .filter(Boolean)
      .join(' · ');
  } else if (kind === 'library-file') {
    identity = uniqueJoin([data.name, data.mime]);
    detail = capText(folder);
    subtitle = clean(data.mime);
  } else {
    const tags = Array.isArray(data.tags) ? data.tags.join(' ') : '';
    identity = uniqueJoin([tags]);
    detail = capText([folder, tags, noteBody(data)].filter(Boolean).join('\n'));
    subtitle = '';
  }

  if (!label && !identity && !detail) return null;

  return {
    id: `${category}:${node.key}`,
    key: node.key,
    category,
    kind,
    label,
    identity,
    detail,
    subtitle,
    folder: folder || 'Raíz'
  };
}

/**
 * Aplana conexiones, vault y notas a documentos de búsqueda.
 * Los secretos (password, privateKey, seedPhrase, apiKey, apiSecret, passphrase)
 * no entran en el documento indexado.
 */
export function buildSearchCatalog({ connections = [], passwords = [], documents = [] } = {}) {
  const docs = [];
  const nodesById = new Map();
  const seen = new Set();

  const visitTree = (nodes) => {
    const walk = (list, folderPath) => {
      if (!Array.isArray(list)) return;
      for (const node of list) {
        if (!node || typeof node !== 'object') continue;
        const kind = nodeType(node);
        const category = CATEGORY_BY_TYPE.get(kind);
        if (category && node.key && !seen.has(`${category}:${node.key}`)) {
          const doc = buildDocument(node, category, kind, folderPath);
          if (doc) {
            seen.add(doc.id);
            docs.push(doc);
            nodesById.set(doc.id, node);
          }
        }
        if (node.children?.length) {
          const nextPath = category ? folderPath : (node.label ? [...folderPath, node.label] : folderPath);
          walk(node.children, nextPath);
        }
      }
    };
    walk(nodes, []);
  };

  visitTree(connections);
  visitTree(passwords);
  visitTree(documents);

  return { docs, nodesById };
}
