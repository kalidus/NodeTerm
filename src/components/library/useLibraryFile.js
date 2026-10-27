import { useCallback, useEffect, useRef, useState } from 'react';
import { isInlineTextKind } from '../../shared/library-mime';
import NextcloudService from '../../services/NextcloudService';

const api = () => (typeof window !== 'undefined' ? window.electron?.library : null);

/** Mensajes legibles para los códigos de error que devuelve el proceso principal. */
export function describeLibraryError(result) {
  const code = result?.code || '';
  switch (code) {
    case 'LIBRARY_LOCKED':
      return 'El contenido está cifrado. Desbloquea el vault para verlo.';
    case 'FILE_NOT_FOUND':
      return 'El archivo ya no existe en su ubicación.';
    case 'FILE_TOO_LARGE':
      return 'El archivo supera el tamaño máximo que puede mostrar el visor.';
    case 'PATH_OUTSIDE_LIBRARY':
      return 'La ruta del archivo no es válida.';
    case 'INVALID_BLOB':
      return 'El archivo está dañado o fue cifrado con otra clave.';
    case 'NOT_CONFIGURED':
      return 'Nextcloud no está configurado. Revísalo en Ajustes → Sincronización.';
    default:
      return result?.error || 'No se pudo abrir el archivo.';
  }
}

/**
 * Prepara el contenido de un archivo para el visor.
 *
 * Los tipos de texto se descargan como cadena; el resto obtiene una URL
 * nodeterm-library:// para que Chromium haga el streaming (PDF, media, imagen).
 *
 * @param {{ key: string, storage: string, relPath: string|null, absPath: string|null, mime: string, label: string }} fileData
 * @param {string} kind categoría devuelta por viewerKindFor
 */
export function useLibraryFile(fileData, kind) {
  const [state, setState] = useState({ status: 'loading', url: '', text: '', error: null, code: null });
  const [reloadToken, setReloadToken] = useState(0);
  const tokenRef = useRef(null);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const library = api();

    const storage = fileData?.storage === 'linked'
      ? 'linked'
      : fileData?.storage === 'webdav'
        ? 'webdav'
        : 'managed';
    const descriptor = {
      storage,
      relPath: fileData?.relPath || null,
      absPath: fileData?.absPath || null,
      remotePath: fileData?.remotePath || null
    };

    const fail = (result) => {
      if (cancelled) return;
      setState({
        status: 'error',
        url: '',
        text: '',
        error: describeLibraryError(result),
        code: result?.code || null
      });
    };

    const run = async () => {
      if (!library) {
        fail({ error: 'La API de la biblioteca no está disponible.' });
        return;
      }
      setState((prev) => ({ ...prev, status: 'loading', error: null, code: null }));

      let request = descriptor;
      if (storage === 'webdav') {
        const service = new NextcloudService();
        const ok = await service.loadConfig();
        if (cancelled) return;
        if (!ok || !service.isConfigured) {
          fail({ code: 'NOT_CONFIGURED' });
          return;
        }
        request = {
          ...descriptor,
          baseUrl: service.baseUrl,
          username: service.username,
          password: service.password,
          ignoreSSLErrors: !!service.ignoreSSLErrors
        };
      }

      if (isInlineTextKind(kind)) {
        const result = await library.readFile({ ...request, encoding: 'utf8' });
        if (cancelled) return;
        if (!result?.success) {
          fail(result);
          return;
        }
        setState({ status: 'ready', url: '', text: result.content || '', error: null, code: null });
        return;
      }

      const access = await library.createAccess({
        ...request,
        mime: fileData?.mime,
        label: fileData?.label
      });
      if (cancelled) return;
      if (!access?.success) {
        fail(access);
        return;
      }
      tokenRef.current = access.token;
      setState({ status: 'ready', url: access.url, text: '', error: null, code: null });
    };

    run().catch((err) => fail({ error: err?.message || String(err) }));

    return () => {
      cancelled = true;
    };
  }, [
    fileData?.storage,
    fileData?.relPath,
    fileData?.absPath,
    fileData?.remotePath,
    fileData?.mime,
    fileData?.label,
    kind,
    reloadToken
  ]);

  // Revoca el token al desmontar para que la URL deje de ser servible
  useEffect(() => {
    return () => {
      const token = tokenRef.current;
      if (token) {
        api()?.revokeAccess(token).catch(() => {});
        tokenRef.current = null;
      }
    };
  }, []);

  // Desbloquear el vault invalida los tokens anteriores: hay que rehacer el acceso
  useEffect(() => {
    const onVaultState = (e) => {
      tokenRef.current = null;
      if (e.detail?.unlocked) reload();
    };
    window.addEventListener('library-vault-state', onVaultState);
    return () => window.removeEventListener('library-vault-state', onVaultState);
  }, [reload]);

  return { ...state, reload };
}
