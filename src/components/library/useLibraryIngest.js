import { useCallback, useEffect, useState } from 'react';
import {
  addNodeToTree,
  createFolderNode,
  createLibraryFileNode,
  createLinkedFolderNode,
  createCloudFolderNode,
  resolveFolderPolicy,
  findNodeInTree
} from '../../utils/documentStore';
import { sanitizeFileName, mimeForName } from '../../shared/library-mime';
import { readText as readClipboardText } from '../../utils/clipboard';
import NextcloudService from '../../services/NextcloudService';
import { describeLibraryError } from './useLibraryFile';

/** Abre un temporal en el visor sin insertarlo en el árbol. */
function openPreview(file) {
  if (!file?.absPath) return;
  window.dispatchEvent(new CustomEvent('open-library-file-tab', {
    detail: {
      key: `preview_${Date.now()}`,
      label: file.label || 'Archivo',
      mode: 'new',
      data: {
        storage: 'linked',
        absPath: file.absPath,
        mime: file.mime || mimeForName(file.label || ''),
        size: Number(file.size) || 0,
        origin: { kind: 'preview', ref: file.absPath, fetchedAt: Date.now() }
      }
    }
  }));
}

async function loadNextcloudAccount() {
  const service = new NextcloudService();
  const ok = await service.loadConfig();
  if (!ok || !service.isConfigured) return null;
  return {
    baseUrl: service.baseUrl,
    username: service.username,
    password: service.password,
    ignoreSSLErrors: !!service.ignoreSSLErrors
  };
}

const api = () => (typeof window !== 'undefined' ? window.electron?.library : null);

/** Nombre libre dentro de una carpeta: evita dos "informe.pdf" hermanos. */
function uniqueLabelIn(siblings, label) {
  const taken = new Set((siblings || []).map((n) => (n?.label || '').toLowerCase()));
  if (!taken.has(label.toLowerCase())) return label;
  const dot = label.lastIndexOf('.');
  const stem = dot > 0 ? label.slice(0, dot) : label;
  const ext = dot > 0 ? label.slice(dot) : '';
  let i = 2;
  while (taken.has(`${stem} (${i})${ext}`.toLowerCase())) i += 1;
  return `${stem} (${i})${ext}`;
}

/**
 * Ingesta de archivos en la Biblioteca: disco, arrastrar y soltar, portapapeles,
 * URL y carpetas enlazadas. Centraliza el alta del blob en el proceso principal
 * y la inserción del nodo en el árbol.
 *
 * @param {{ documentNodes: Array, setDocumentNodes: Function,
 *           setExpandedKeys: Function, showToast?: Function }} options
 */
export function useLibraryIngest({ documentNodes, setDocumentNodes, setExpandedKeys, showToast }) {
  const [busy, setBusy] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api()?.getStatus()
      .then((status) => {
        if (!cancelled) setUnlocked(Boolean(status?.unlocked));
      })
      .catch(() => {});
    const onUnlockChange = (e) => setUnlocked(Boolean(e.detail?.unlocked));
    window.addEventListener('library-vault-state', onUnlockChange);
    return () => {
      cancelled = true;
      window.removeEventListener('library-vault-state', onUnlockChange);
    };
  }, []);

  const notify = useCallback((severity, summary, detail) => {
    showToast?.({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 });
  }, [showToast]);

  /** Política efectiva de la carpeta destino. */
  const policyFor = useCallback((folderKey) => resolveFolderPolicy(documentNodes, folderKey), [documentNodes]);

  /** Inserta un nodo de archivo en el árbol evitando nombres duplicados. */
  const insertFileNode = useCallback((folderKey, file) => {
    let created = null;
    setDocumentNodes((prev) => {
      const parent = folderKey ? findNodeInTree(prev, folderKey) : null;
      const siblings = folderKey ? parent?.children || [] : prev;
      created = createLibraryFileNode({
        ...file,
        label: uniqueLabelIn(siblings, file.label)
      });
      return addNodeToTree(prev, folderKey, created);
    });
    if (folderKey) {
      setExpandedKeys((prev) => ({ ...prev, [folderKey]: true }));
    }
    return created;
  }, [setDocumentNodes, setExpandedKeys]);

  /** Comprueba que se puede escribir en la carpeta antes de pedir nada al usuario. */
  const ensureWritable = useCallback((folderKey) => {
    const library = api();
    if (!library) {
      notify('error', 'Biblioteca no disponible', 'La API de archivos no está cargada.');
      return null;
    }
    const policy = policyFor(folderKey);
    if (policy.vaultMode === 'encrypted' && !unlocked) {
      notify('warn', 'Carpeta cifrada', 'Desbloquea el vault para añadir archivos a esta carpeta.');
      return null;
    }
    return { library, encrypt: policy.vaultMode === 'encrypted' };
  }, [policyFor, unlocked, notify]);

  /**
   * Importa rutas del disco a una carpeta.
   * @returns {Promise<number>} archivos importados
   */
  const importFromPaths = useCallback(async (folderKey, paths, origin) => {
    const ctx = ensureWritable(folderKey);
    if (!ctx || !paths?.length) return 0;

    setBusy({ total: paths.length, done: 0 });
    let imported = 0;
    const failures = [];

    for (let i = 0; i < paths.length; i += 1) {
      const sourcePath = paths[i];
      setBusy({ total: paths.length, done: i });
      try {
        const result = await ctx.library.importPath({
          folderKey,
          sourcePath,
          encrypt: ctx.encrypt,
          origin: origin || { kind: 'local', ref: sourcePath, fetchedAt: Date.now() }
        });
        if (result?.success) {
          insertFileNode(folderKey, result.file);
          imported += 1;
        } else {
          failures.push(`${sourcePath}: ${describeLibraryError(result)}`);
        }
      } catch (err) {
        failures.push(`${sourcePath}: ${err?.message || err}`);
      }
    }

    setBusy(null);
    if (imported) {
      notify('success', 'Archivos añadidos', imported === 1 ? '1 archivo añadido a la biblioteca' : `${imported} archivos añadidos`);
    }
    if (failures.length) {
      notify('error', 'Algunos archivos no se pudieron añadir', failures.slice(0, 3).join('\n'));
    }
    return imported;
  }, [ensureWritable, insertFileNode, notify]);

  /** Diálogo del sistema para elegir archivos. */
  const pickAndImportFiles = useCallback(async (folderKey) => {
    const ctx = ensureWritable(folderKey);
    if (!ctx) return 0;
    const picked = await ctx.library.pickFiles({ multiple: true });
    if (!picked?.success || picked.canceled || !picked.paths?.length) return 0;
    return importFromPaths(folderKey, picked.paths);
  }, [ensureWritable, importFromPaths]);

  /**
   * Copia una carpeta local entera replicando su jerarquía como carpetas de la
   * biblioteca. El blob de cada archivo queda bajo la carpeta que lo contiene.
   */
  const pickAndImportFolder = useCallback(async (parentKey) => {
    const ctx = ensureWritable(parentKey);
    if (!ctx) return 0;

    const picked = await ctx.library.pickFolder();
    if (!picked?.success || picked.canceled || !picked.path) return 0;

    const scan = await ctx.library.scanFolder({ sourcePath: picked.path });
    if (!scan?.success) {
      notify('error', 'No se pudo leer la carpeta', describeLibraryError(scan));
      return 0;
    }
    if (!scan.entries.length) {
      notify('warn', 'Carpeta vacía', 'No se encontró ningún archivo para importar.');
      return 0;
    }
    if (scan.truncated) {
      notify('warn', 'Carpeta muy grande', 'Solo se importarán los primeros 2000 archivos.');
    }

    const rootName = picked.path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || 'Carpeta';
    const rootFolder = createFolderNode(rootName);
    setDocumentNodes((prev) => addNodeToTree(prev, parentKey, rootFolder));
    if (parentKey) setExpandedKeys((prev) => ({ ...prev, [parentKey]: true }));

    // relativo del directorio → key de la carpeta ya creada
    const folderKeys = new Map([['', rootFolder.key]]);
    const ensureSubfolder = (relativeDir) => {
      if (folderKeys.has(relativeDir)) return folderKeys.get(relativeDir);
      const segments = relativeDir.split('/');
      const name = segments.pop();
      const parentRel = segments.join('/');
      const parentFolderKey = ensureSubfolder(parentRel);
      const folder = createFolderNode(name);
      setDocumentNodes((prev) => addNodeToTree(prev, parentFolderKey, folder));
      folderKeys.set(relativeDir, folder.key);
      return folder.key;
    };

    setBusy({ total: scan.entries.length, done: 0 });
    let imported = 0;
    for (let i = 0; i < scan.entries.length; i += 1) {
      const entry = scan.entries[i];
      setBusy({ total: scan.entries.length, done: i });
      const relativeDir = entry.relative.includes('/')
        ? entry.relative.slice(0, entry.relative.lastIndexOf('/'))
        : '';
      const targetKey = ensureSubfolder(relativeDir);
      try {
        const result = await ctx.library.importPath({
          folderKey: targetKey,
          sourcePath: entry.path,
          encrypt: ctx.encrypt,
          origin: { kind: 'local', ref: entry.path, fetchedAt: Date.now() }
        });
        if (result?.success) {
          insertFileNode(targetKey, result.file);
          imported += 1;
        }
      } catch (_) {
        /* se informa en el resumen */
      }
    }
    setBusy(null);

    notify(
      imported ? 'success' : 'error',
      imported ? 'Carpeta importada' : 'No se pudo importar la carpeta',
      `${imported} de ${scan.entries.length} archivos añadidos`
    );
    return imported;
  }, [ensureWritable, insertFileNode, notify, setDocumentNodes, setExpandedKeys]);

  /** Monta una carpeta local sin copiar nada: el árbol solo guarda la ruta. */
  const linkFolderAt = useCallback((parentKey, absPath) => {
    const name = String(absPath || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || absPath;
    const node = createLinkedFolderNode(name, absPath);
    setDocumentNodes((prev) => addNodeToTree(prev, parentKey, node));
    if (parentKey) setExpandedKeys((prev) => ({ ...prev, [parentKey]: true }));
    notify('success', 'Carpeta enlazada', `"${name}" se lee en su sitio, sin copiarse.`);
    return true;
  }, [setDocumentNodes, setExpandedKeys, notify]);

  const linkLocalFolder = useCallback(async (parentKey) => {
    const library = api();
    if (!library) return false;
    const picked = await library.pickFolder();
    if (!picked?.success || picked.canceled || !picked.path) return false;
    return linkFolderAt(parentKey, picked.path);
  }, [linkFolderAt]);

  /**
   * Elige archivos. Con saveCopy se guardan en NodeTerm; si no, solo se enlazan.
   */
  const pickAndAddFiles = useCallback(async (folderKey, { saveCopy = false } = {}) => {
    if (saveCopy) {
      const ctx = ensureWritable(folderKey);
      if (!ctx) return 0;
      const picked = await ctx.library.pickFiles({ multiple: true });
      if (!picked?.success || picked.canceled || !picked.paths?.length) return 0;
      return importFromPaths(folderKey, picked.paths);
    }
    const library = api();
    if (!library) return 0;
    const picked = await library.pickFiles({ multiple: true });
    if (!picked?.success || picked.canceled || !picked.paths?.length) return 0;
    let added = 0;
    for (const sourcePath of picked.paths) {
      const info = await library.classifyPath(sourcePath);
      if (!info?.success || info.isDirectory) continue;
      insertFileNode(folderKey, {
        label: info.name,
        storage: 'linked',
        absPath: info.path,
        size: info.size,
        mime: mimeForName(info.name),
        origin: { kind: 'local', ref: info.path, fetchedAt: Date.now() }
      });
      added += 1;
    }
    if (added) {
      notify('success', 'Archivos enlazados', `${added} archivo(s) se leen desde su carpeta, sin copiarse.`);
    }
    return added;
  }, [ensureWritable, importFromPaths, insertFileNode, notify]);

  /** Monta una carpeta de Nextcloud. El nodo guarda la ruta, no los bytes. */
  const mountCloudFolder = useCallback((parentKey, { remotePath, label } = {}) => {
    const node = createCloudFolderNode(label, remotePath);
    setDocumentNodes((prev) => addNodeToTree(prev, parentKey, node));
    if (parentKey) setExpandedKeys((prev) => ({ ...prev, [parentKey]: true }));
    notify('success', 'Carpeta de Nextcloud', `"${node.label}" se lee en el servidor, sin copiar los archivos.`);
    return node;
  }, [setDocumentNodes, setExpandedKeys, notify]);

  /** Copia a NodeTerm un archivo que hasta ahora solo se leía en su sitio. */
  const saveCopyOfNode = useCallback(async (node) => {
    const ctx = ensureWritable(null);
    if (!ctx || !node) return false;

    if (node.data?.storage === 'linked' && node.data.absPath) {
      const result = await ctx.library.importPath({
        folderKey: null,
        sourcePath: node.data.absPath,
        encrypt: ctx.encrypt,
        origin: { kind: 'local', ref: node.data.absPath, fetchedAt: Date.now() }
      });
      if (!result?.success) {
        notify('error', 'No se pudo guardar la copia', describeLibraryError(result));
        return false;
      }
      insertFileNode(null, result.file);
      notify('success', 'Copia guardada', `"${result.file.label}" quedó dentro de NodeTerm.`);
      return true;
    }

    if (node.data?.storage === 'webdav' && node.data.remotePath) {
      const account = await loadNextcloudAccount();
      if (!account) {
        notify('warn', 'Nextcloud', 'Configura la cuenta en Ajustes → Sincronización.');
        return false;
      }
      setBusy({ total: 1, done: 0, label: 'Guardando copia…' });
      try {
        const result = await ctx.library.importWebdav({
          ...account,
          folderKey: null,
          remotePath: node.data.remotePath,
          fileName: node.label,
          encrypt: ctx.encrypt
        });
        if (!result?.success) {
          notify('error', 'No se pudo guardar la copia', describeLibraryError(result));
          return false;
        }
        insertFileNode(null, result.file);
        notify('success', 'Copia guardada', `"${result.file.label}" quedó dentro de NodeTerm.`);
        return true;
      } finally {
        setBusy(null);
      }
    }
    return false;
  }, [ensureWritable, insertFileNode, notify]);

  /**
   * Trae una URL. Sin saveCopy se abre desde un temporal y no entra en el árbol.
   */
  const importFromUrl = useCallback(async (folderKey, url, { allowPrivate, saveCopy = false } = {}) => {
    if (!url) return false;
    if (!saveCopy) {
      setBusy({ total: 1, done: 0, label: 'Abriendo…' });
      try {
        const result = await api()?.stageUrl({ url, allowPrivate: !!allowPrivate });
        if (!result?.success) {
          notify('error', 'No se pudo abrir', describeLibraryError(result));
          return false;
        }
        openPreview(result);
        notify('info', 'Abierto sin guardar', `"${result.label}" no se ha copiado a NodeTerm.`);
        return true;
      } finally {
        setBusy(null);
      }
    }

    const ctx = ensureWritable(folderKey);
    if (!ctx) return false;

    setBusy({ total: 1, done: 0, label: 'Descargando…' });
    try {
      const result = await ctx.library.downloadUrl({
        folderKey,
        url,
        encrypt: ctx.encrypt,
        allowPrivate: !!allowPrivate
      });
      if (!result?.success) {
        notify('error', 'Descarga fallida', describeLibraryError(result));
        return false;
      }
      insertFileNode(folderKey, result.file);
      notify('success', 'Descargado', `"${result.file.label}" añadido a la biblioteca.`);
      return true;
    } finally {
      setBusy(null);
    }
  }, [ensureWritable, insertFileNode, notify]);

  /**
   * Pega una imagen o texto. Sin saveCopy se abre y no queda en el árbol.
   */
  const importFromClipboard = useCallback(async (folderKey, { saveCopy = false } = {}) => {
    const library = api();
    if (!library) return false;

    const image = await library.readClipboardImage();
    if (image?.success) {
      const fileName = `Captura ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      if (!saveCopy) {
        const staged = await library.stageBuffer({ fileName, data: image.data, mime: image.mime });
        if (!staged?.success) {
          notify('error', 'No se pudo abrir la imagen', describeLibraryError(staged));
          return false;
        }
        openPreview(staged);
        notify('info', 'Abierto sin guardar', `"${staged.label}" no se ha copiado a NodeTerm.`);
        return true;
      }
      const ctx = ensureWritable(folderKey);
      if (!ctx) return false;
      const result = await ctx.library.importBuffer({
        folderKey,
        fileName,
        data: image.data,
        mime: image.mime,
        encrypt: ctx.encrypt,
        origin: { kind: 'clipboard', ref: 'image', fetchedAt: Date.now() }
      });
      if (result?.success) {
        insertFileNode(folderKey, result.file);
        notify('success', 'Imagen guardada', `"${result.file.label}" quedó dentro de NodeTerm.`);
        return true;
      }
      notify('error', 'No se pudo pegar la imagen', describeLibraryError(result));
      return false;
    }

    const text = await readClipboardText();
    if (!text.trim()) {
      notify('warn', 'Portapapeles vacío', 'No hay imagen ni texto que pegar.');
      return false;
    }
    const fileName = `Nota pegada ${new Date().toISOString().slice(0, 10)}.txt`;
    if (!saveCopy) {
      const staged = await library.stageBuffer({ fileName, data: text, mime: 'text/plain' });
      if (!staged?.success) {
        notify('error', 'No se pudo abrir el texto', describeLibraryError(staged));
        return false;
      }
      openPreview(staged);
      notify('info', 'Abierto sin guardar', `"${staged.label}" no se ha copiado a NodeTerm.`);
      return true;
    }
    const ctx = ensureWritable(folderKey);
    if (!ctx) return false;
    const result = await ctx.library.importBuffer({
      folderKey,
      fileName,
      data: text,
      mime: 'text/plain',
      encrypt: ctx.encrypt,
      origin: { kind: 'clipboard', ref: 'text', fetchedAt: Date.now() }
    });
    if (result?.success) {
      insertFileNode(folderKey, result.file);
      notify('success', 'Texto guardado', `"${result.file.label}" quedó dentro de NodeTerm.`);
      return true;
    }
    notify('error', 'No se pudo pegar el texto', describeLibraryError(result));
    return false;
  }, [ensureWritable, insertFileNode, notify]);

  /**
   * Suelta desde el explorador. Una carpeta siempre se enlaza. Un archivo se
   * enlaza salvo que saveCopy pida guardarlo dentro de NodeTerm.
   */
  const importFromDataTransfer = useCallback(async (folderKey, dataTransfer, { saveCopy = false } = {}) => {
    const library = api();
    if (!library || !dataTransfer) return 0;

    const files = Array.from(dataTransfer.files || []);
    let added = 0;
    const copyPaths = [];

    for (const file of files) {
      const realPath = window.electron?.webUtils?.getPathForFile?.(file) || file.path || '';
      if (realPath) {
        const info = await library.classifyPath(realPath);
        if (info?.success && info.isDirectory) {
          linkFolderAt(folderKey, info.path);
          added += 1;
          continue;
        }
        if (!saveCopy) {
          insertFileNode(folderKey, {
            label: info?.name || file.name || 'archivo',
            storage: 'linked',
            absPath: info?.path || realPath,
            size: info?.size || file.size || 0,
            mime: file.type || mimeForName(file.name || ''),
            origin: { kind: 'local', ref: realPath, fetchedAt: Date.now() }
          });
          added += 1;
          continue;
        }
        copyPaths.push(realPath);
        continue;
      }

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const fileName = sanitizeFileName(file.name || 'archivo');
        const mime = file.type || mimeForName(fileName);
        if (!saveCopy) {
          const staged = await library.stageBuffer({ fileName, data, mime });
          if (staged?.success) {
            openPreview(staged);
            added += 1;
          } else {
            notify('error', 'No se pudo abrir el archivo', describeLibraryError(staged));
          }
          continue;
        }
        const ctx = ensureWritable(folderKey);
        if (!ctx) continue;
        const result = await ctx.library.importBuffer({
          folderKey,
          fileName,
          data,
          mime,
          encrypt: ctx.encrypt,
          origin: { kind: 'local', ref: 'drag-drop', fetchedAt: Date.now() }
        });
        if (result?.success) {
          insertFileNode(folderKey, result.file);
          added += 1;
        }
      } catch (err) {
        notify('error', 'No se pudo añadir el archivo', err?.message || String(err));
      }
    }

    if (copyPaths.length) {
      added += await importFromPaths(folderKey, copyPaths, { kind: 'local', ref: 'drag-drop', fetchedAt: Date.now() });
    }

    if (!files.length) {
      const url = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain');
      if (url && /^https?:\/\//i.test(url.trim())) {
        const ok = await importFromUrl(folderKey, url.trim(), { saveCopy });
        if (ok) added += 1;
      }
    }

    return added;
  }, [ensureWritable, importFromPaths, importFromUrl, insertFileNode, linkFolderAt, notify]);

  /** Borra el blob de un archivo managed; los enlazados no se tocan en disco. */
  const removeFileBlob = useCallback(async (node) => {
    if (node?.data?.storage !== 'managed' || !node.data.relPath) return;
    try {
      await api()?.deleteFile({ relPath: node.data.relPath });
    } catch (err) {
      console.warn('[Library] No se pudo borrar el blob:', err?.message || err);
    }
  }, []);

  return {
    busy,
    unlocked,
    policyFor,
    insertFileNode,
    importFromPaths,
    pickAndImportFiles,
    pickAndAddFiles,
    pickAndImportFolder,
    linkLocalFolder,
    mountCloudFolder,
    saveCopyOfNode,
    importFromUrl,
    importFromClipboard,
    importFromDataTransfer,
    removeFileBlob
  };
}
