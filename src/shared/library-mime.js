/**
 * Mapeo extensión → MIME y categoría de visor para la Biblioteca.
 *
 * Sin require/Buffer: este módulo se embebe en el bundle del renderer (webpack)
 * y también se requiere desde el proceso principal.
 */

/** Categorías que entiende LibraryFileViewer. */
const VIEWER_KINDS = ['pdf', 'image', 'text', 'markdown', 'video', 'audio', 'unsupported'];

const EXT_MIME = {
  pdf: 'application/pdf',

  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  avif: 'image/avif',

  md: 'text/markdown',
  markdown: 'text/markdown',

  txt: 'text/plain',
  log: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  ini: 'text/plain',
  conf: 'text/plain',
  cfg: 'text/plain',
  env: 'text/plain',
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  css: 'text/css',
  scss: 'text/css',
  html: 'text/html',
  htm: 'text/html',
  py: 'text/x-python',
  rb: 'text/x-ruby',
  go: 'text/x-go',
  rs: 'text/x-rust',
  java: 'text/x-java',
  c: 'text/x-c',
  h: 'text/x-c',
  cpp: 'text/x-c++',
  hpp: 'text/x-c++',
  cs: 'text/x-csharp',
  php: 'text/x-php',
  sh: 'text/x-shellscript',
  bash: 'text/x-shellscript',
  zsh: 'text/x-shellscript',
  ps1: 'text/x-powershell',
  bat: 'text/plain',
  sql: 'text/x-sql',
  toml: 'text/plain',
  dockerfile: 'text/plain',

  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',

  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',

  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',

  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar'
};

/** Extensiones de texto plano que el visor abre inline aunque el MIME sea genérico. */
const TEXT_EXTS = new Set(
  Object.keys(EXT_MIME).filter((ext) => {
    const mime = EXT_MIME[ext];
    return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || mime === 'application/x-yaml';
  })
);

/** @returns {string} extensión en minúsculas sin punto, '' si no hay */
function extensionOf(name) {
  if (!name || typeof name !== 'string') return '';
  const clean = name.split(/[?#]/)[0];
  const base = clean.replace(/\\/g, '/').split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/** @returns {string} MIME conocido o 'application/octet-stream' */
function mimeForName(name) {
  const ext = extensionOf(name);
  return EXT_MIME[ext] || 'application/octet-stream';
}

/**
 * Categoría de visor a partir del MIME y, como respaldo, de la extensión.
 * @returns {'pdf'|'image'|'text'|'markdown'|'video'|'audio'|'unsupported'}
 */
function viewerKindFor(mime, name) {
  const ext = extensionOf(name);
  const fromExt = EXT_MIME[ext] || '';
  const given = String(mime || '').toLowerCase().split(';')[0].trim();
  // Nextcloud a veces responde application/octet-stream. La extensión manda.
  const generic = !given
    || given === 'application/octet-stream'
    || given === 'binary/octet-stream'
    || given === 'application/x-download';
  const type = generic ? (fromExt || given) : given;

  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (type === 'text/markdown' || ext === 'md' || ext === 'markdown') return 'markdown';
  // SVG se trata como imagen, pero el visor lo renderiza en sandbox (puede traer scripts)
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('text/') || TEXT_EXTS.has(ext)) return 'text';
  if (type === 'application/json' || type === 'application/xml' || type === 'application/x-yaml') return 'text';
  return 'unsupported';
}

/** true si el visor necesita descargar el contenido como texto en vez de usar una URL. */
function isInlineTextKind(kind) {
  return kind === 'text' || kind === 'markdown';
}

/** Nombre de archivo saneado: sin separadores, sin rutas relativas ni caracteres ilegales. */
function sanitizeFileName(name, fallback = 'archivo') {
  const base = String(name || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\x00-\x1f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim();
  if (!base || base === '.' || base === '..') return fallback;
  return base.length > 180 ? base.slice(0, 180) : base;
}

/** Etiqueta legible de tamaño. */
function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

module.exports = {
  VIEWER_KINDS,
  EXT_MIME,
  extensionOf,
  mimeForName,
  viewerKindFor,
  isInlineTextKind,
  sanitizeFileName,
  formatFileSize
};
