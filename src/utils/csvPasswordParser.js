/**
 * Parser universal para archivos CSV de contraseñas exportados desde navegadores
 * y gestores de contraseñas (Chrome, Edge, Brave, Firefox, Bitwarden, 1Password, etc.)
 */

import { generatePasswordKey } from './passwordImportMapper.js';

/**
 * Normaliza una cabecera para comparaciones sin acentos ni espacios.
 */
function normalizeHeader(str = '') {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/[^a-z0-9]/g, '_');
}

/**
 * Tokenizador RFC 4180 que maneja comillas, saltos de línea dentro de campos y comillas escapadas ("").
 */
export function tokenizeCsv(text, delimiter = ',') {
  // Limpiar BOM UTF-8 si existe
  let cleanText = text.replace(/^\uFEFF/, '');

  // Detectar delimitador si no está explícito: coma o punto y coma
  if (!delimiter) {
    const firstLine = cleanText.split('\n')[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (semicolons > commas && semicolons > tabs) delimiter = ';';
    else if (tabs > commas && tabs > semicolons) delimiter = '\t';
    else delimiter = ',';
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Comilla escapada ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Cierre de comillas
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Salto CRLF
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some(f => f.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some(f => f.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Último campo y fila
  currentRow.push(currentField);
  if (currentRow.some(f => f.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Analiza las cabeceras de columnas y mapea cada campo a su propiedad estándar.
 */
function mapHeaderIndices(headerRow = []) {
  const mapping = {
    title: -1,
    url: -1,
    username: -1,
    password: -1,
    notes: -1,
    group: -1
  };

  headerRow.forEach((col, idx) => {
    const norm = normalizeHeader(col);

    // Password
    if (mapping.password === -1 && (
      norm === 'password' ||
      norm === 'contrasena' ||
      norm === 'clave' ||
      norm === 'login_password' ||
      norm.includes('password') ||
      norm.includes('contrasena')
    )) {
      mapping.password = idx;
    }
    // Username
    else if (mapping.username === -1 && (
      norm === 'username' ||
      norm === 'user' ||
      norm === 'usuario' ||
      norm === 'nombre_de_usuario' ||
      norm === 'login_username' ||
      norm === 'email' ||
      norm === 'correo' ||
      norm === 'login'
    )) {
      mapping.username = idx;
    }
    // URL
    else if (mapping.url === -1 && (
      norm === 'url' ||
      norm === 'website' ||
      norm === 'login_uri' ||
      norm === 'sitio' ||
      norm === 'sitio_web' ||
      norm === 'formactionorigin' ||
      norm === 'uri'
    )) {
      mapping.url = idx;
    }
    // Title / Name
    else if (mapping.title === -1 && (
      norm === 'name' ||
      norm === 'nombre' ||
      norm === 'title' ||
      norm === 'titulo' ||
      norm === 'service' ||
      norm === 'servicio'
    )) {
      mapping.title = idx;
    }
    // Notes
    else if (mapping.notes === -1 && (
      norm === 'note' ||
      norm === 'notes' ||
      norm === 'nota' ||
      norm === 'notas' ||
      norm === 'comments' ||
      norm === 'comentarios'
    )) {
      mapping.notes = idx;
    }
    // Group / Folder
    else if (mapping.group === -1 && (
      norm === 'group' ||
      norm === 'grouping' ||
      norm === 'grupo' ||
      norm === 'folder' ||
      norm === 'carpeta' ||
      norm === 'category'
    )) {
      mapping.group = idx;
    }
  });

  return mapping;
}

/**
 * Procesa un archivo o texto CSV completo y devuelve la lista de nodos listos para NodeTerm.
 * @param {string} csvText - Contenido del CSV.
 * @param {object} options - Opciones adicionales (ej: group predeterminado).
 * @returns {object} { ok: boolean, entries: Array, nodes: Array, stats: object }
 */
export function parsePasswordCsv(csvText, options = {}) {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    return { ok: false, error: 'El archivo CSV está vacío.', entries: [], nodes: [] };
  }

  // Detectar delimitador: comprobar primera línea
  const firstLine = csvText.split('\n')[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const rows = tokenizeCsv(csvText, delimiter);
  if (!rows || rows.length < 2) {
    return { ok: false, error: 'El archivo CSV no contiene filas de datos.', entries: [], nodes: [] };
  }

  const headerRow = rows[0];
  const mapping = mapHeaderIndices(headerRow);

  // Verificación básica: debe haber al menos URL o Username o Password
  if (mapping.password === -1 && mapping.url === -1 && mapping.username === -1) {
    return {
      ok: false,
      error: 'No se reconocieron las columnas esperadas (name, url, username, password).',
      entries: [],
      nodes: []
    };
  }

  const entries = [];
  const nodes = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const url = (mapping.url !== -1 ? row[mapping.url] : '').trim();
    const username = (mapping.username !== -1 ? row[mapping.username] : '').trim();
    const password = (mapping.password !== -1 ? row[mapping.password] : '').trim();
    let title = (mapping.title !== -1 ? row[mapping.title] : '').trim();
    const notes = (mapping.notes !== -1 ? row[mapping.notes] : '').trim();
    const group = (mapping.group !== -1 ? row[mapping.group] : (options.defaultGroup || '')).trim();

    // Si no hay título, deducir de URL o dominio
    if (!title) {
      if (url) {
        try {
          const withProt = url.startsWith('http') ? url : `https://${url}`;
          title = new URL(withProt).hostname.replace(/^www\./, '');
        } catch {
          title = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        }
      } else if (username) {
        title = username;
      } else {
        title = '(Sin título)';
      }
    }

    // Omitir filas totalmente vacías
    if (!url && !username && !password && !notes) continue;

    const key = generatePasswordKey('password');
    const entryData = {
      title,
      url,
      username,
      password,
      notes,
      group
    };

    entries.push(entryData);

    nodes.push({
      key,
      label: title,
      username,
      password,
      url,
      data: {
        type: 'password',
        username,
        user: username,
        password,
        url,
        group,
        notes
      },
      uid: key,
      createdAt: new Date().toISOString(),
      isUserCreated: true,
      draggable: true,
      droppable: false
    });
  }

  const stats = {
    total: entries.length,
    withPassword: entries.filter(e => e.password && e.password.length > 0).length,
    withUsername: entries.filter(e => e.username && e.username.length > 0).length,
    withUrl: entries.filter(e => e.url && e.url.length > 0).length
  };

  return {
    ok: true,
    entries,
    nodes,
    stats
  };
}

export default parsePasswordCsv;
