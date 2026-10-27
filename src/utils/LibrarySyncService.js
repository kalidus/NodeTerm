/**
 * Puente del renderer para la sincronización de archivos de la biblioteca.
 *
 * El árbol de nodos viaja con el resto de datos en nodeterm-documents.json; lo
 * que no cabe ahí son los binarios, que se mueven por WebDAV desde el proceso
 * principal. Este módulo decide qué archivos entran (solo los de carpetas con
 * syncMode 'nextcloud') y reintegra al árbol lo que llega de vuelta.
 */

import NextcloudService from '../services/NextcloudService';
import {
  collectManagedFiles,
  createLibraryFileNode,
  resolveFolderPolicy
} from './documentStore';
import { mimeForName } from '../shared/library-mime';

const REQUEST_EVENT = 'library-sync:run';
const DONE_EVENT = 'library-sync:done';
const SYNC_TIMEOUT_MS = 10 * 60 * 1000;

/** Archivos managed cuya carpeta (o alguna ascendiente) sincroniza con Nextcloud. */
export function collectSyncableFiles(tree) {
  return collectManagedFiles(tree)
    .filter(({ folderKey }) => resolveFolderPolicy(tree, folderKey).syncMode === 'nextcloud')
    .map(({ node, folderKey }) => ({
      relPath: node.data?.relPath,
      folderKey,
      label: node.label,
      mime: node.data?.mime || mimeForName(node.label),
      updatedAt: node.data?.updatedAt || node.data?.createdAt || 0
    }))
    .filter((file) => Boolean(file.relPath));
}

/** Ejecuta la reconciliación contra Nextcloud para un árbol dado. */
export async function runLibrarySync(tree) {
  const library = window.electron?.library;
  if (!library?.sync) {
    return { success: false, error: 'API de biblioteca no disponible', code: 'NO_API' };
  }

  const files = collectSyncableFiles(tree);
  const config = new NextcloudService().loadConfig();
  if (!config?.enabled || !config.url || !config.username) {
    return { success: false, error: 'Nextcloud no está configurado', code: 'NOT_CONFIGURED' };
  }
  // Nada marcado para sincronizar: evitamos crear carpetas remotas vacías
  if (files.length === 0) {
    return { success: true, skipped: true, uploaded: 0, downloaded: 0, conflicts: [], added: [], updated: [] };
  }

  return library.sync({
    baseUrl: config.url,
    username: config.username,
    password: config.password,
    ignoreSSLErrors: !!config.ignoreSSLErrors,
    files
  });
}

/** Inserta un nodo de archivo en la carpeta indicada (o en la raíz). */
function insertInto(nodes, folderKey, node) {
  if (!folderKey) return [...nodes, node];
  let inserted = false;
  const walk = (list) => list.map((item) => {
    if (item.key === folderKey) {
      inserted = true;
      return { ...item, children: [...(item.children || []), node] };
    }
    if (item.children?.length) return { ...item, children: walk(item.children) };
    return item;
  });
  const next = walk(nodes);
  return inserted ? next : [...next, node];
}

/**
 * Añade al árbol los archivos que llegaron del servidor y las copias de
 * conflicto. Los `updated` solo cambian bytes en disco, no requieren nodo.
 * @returns {{ tree: Array, inserted: number }}
 */
export function applySyncResult(tree, result) {
  const incoming = [...(result?.added || []), ...(result?.conflicts || [])];
  if (incoming.length === 0) return { tree, inserted: 0 };

  let next = tree;
  for (const item of incoming) {
    const node = createLibraryFileNode({
      label: item.label,
      storage: 'managed',
      relPath: item.relPath,
      mime: item.mime || mimeForName(item.label),
      size: item.size,
      hash: item.hash || null,
      origin: { kind: 'nextcloud', ref: item.relPath, fetchedAt: Date.now() }
    });
    next = insertInto(next, item.folderKey, node);
  }
  return { tree: next, inserted: incoming.length };
}

/**
 * Pide al panel de Biblioteca que ejecute la sincronización sobre su árbol en
 * memoria. Se hace por eventos porque el estado vivo del árbol es suyo y
 * escribir por debajo en localStorage lo dejaría desincronizado.
 */
export function requestLibrarySync() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ success: false, error: 'Sin ventana', code: 'NO_WINDOW' });
      return;
    }
    const requestId = `libsync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let timer = null;

    const onDone = (event) => {
      if (event.detail?.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener(DONE_EVENT, onDone);
      resolve(event.detail?.result || { success: false, error: 'Respuesta vacía' });
    };

    window.addEventListener(DONE_EVENT, onDone);
    timer = setTimeout(() => {
      window.removeEventListener(DONE_EVENT, onDone);
      resolve({ success: false, error: 'Tiempo de espera agotado', code: 'TIMEOUT' });
    }, SYNC_TIMEOUT_MS);

    window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: { requestId } }));
  });
}

export const LIBRARY_SYNC_EVENTS = { REQUEST_EVENT, DONE_EVENT };
