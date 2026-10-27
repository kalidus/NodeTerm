import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppDialog from '../ui/AppDialog';
import NextcloudService from '../../services/NextcloudService';
import { formatFileSize } from '../../shared/library-mime';
import '../../styles/components/library-cloud-browser.css';

/** El proceso principal devuelve el texto crudo de Node cuando el certificado no es de confianza. */
function describeCloudError(message, fallback) {
  const text = String(message || '');
  if (/self signed|unable to verify|certificate|CERT_|UNABLE_TO_VERIFY|use-system-ca/i.test(text)) {
    return 'El certificado de Nextcloud no es de confianza. Activa «Ignorar SSL» en Ajustes → Sincronización y vuelve a guardar.';
  }
  return text || fallback;
}

/**
 * Ruta dentro del espacio del usuario.
 * Nextcloud en un subdirectorio devuelve hrefs como
 * /nextcloud/remote.php/dav/files/usuario/Documentos, no desde la raíz del host.
 */
function toRelativePath(href, username) {
  let clean = String(href || '').trim();
  try {
    if (/^https?:\/\//i.test(clean)) clean = new URL(clean).pathname;
  } catch (_) {
    /* href relativo */
  }
  clean = clean.replace(/\/+$/, '');
  const markers = [
    `/remote.php/dav/files/${encodeURIComponent(username)}`,
    `/remote.php/dav/files/${username}`
  ];
  for (const marker of markers) {
    const at = clean.indexOf(marker);
    if (at !== -1) return clean.slice(at + marker.length).replace(/^\/+/, '');
  }
  return clean.replace(/^\/+/, '');
}

/**
 * Elige una carpeta de Nextcloud para montarla. No descarga nada: el árbol
 * guardará la ruta y los archivos se leerán al abrirlos.
 */
const LibraryCloudBrowserDialog = ({ visible, onHide, onMount }) => {
  const [account, setAccount] = useState(null);
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const serviceRef = useRef(null);

  // Carga la cuenta configurada al abrir
  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setPath('');

    const service = new NextcloudService();
    serviceRef.current = service;
    service.loadConfig()
      .then((ok) => {
        if (cancelled) return;
        if (!ok || !service.isConfigured) {
          setStatus('error');
          setError('No hay ninguna cuenta de Nextcloud configurada, o el vault está bloqueado. Configúrala en Ajustes → Sincronización.');
          return;
        }
        setAccount({
          baseUrl: service.baseUrl,
          username: service.username,
          password: service.password,
          ignoreSSLErrors: service.ignoreSSLErrors
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(describeCloudError(err?.message, 'No se pudo cargar la configuración de Nextcloud.'));
      });

    return () => {
      cancelled = true;
      serviceRef.current = null;
    };
  }, [visible]);

  const listPath = useCallback(async (targetPath) => {
    if (!account) return;
    setStatus('loading');
    setError(null);
    const result = await window.electron?.library?.listWebdav({ ...account, path: targetPath });
    if (!result?.success) {
      setStatus('error');
      setError(describeCloudError(result?.error, 'No se pudo listar la carpeta.'));
      return;
    }
    setEntries(result.entries || []);
    setStatus('ready');
  }, [account]);

  useEffect(() => {
    if (!visible || !account) return;
    listPath(path);
  }, [visible, account, path, listPath]);

  const mountLabel = path.split('/').filter(Boolean).pop() || 'Nextcloud';

  const handleMount = () => {
    onMount?.({ remotePath: path, label: mountLabel });
    onHide?.();
  };

  const crumbs = ['', ...path.split('/').filter(Boolean).map((_, index, all) => all.slice(0, index + 1).join('/'))];

  return (
    <AppDialog
      headerTitle="Montar carpeta de Nextcloud"
      headerIcon="pi pi-cloud"
      visible={visible}
      onHide={onHide}
      size="md"
      confirmLabel={`Montar «${mountLabel}»`}
      confirmIcon="pi pi-link"
      confirmDisabled={status !== 'ready'}
      onConfirm={handleMount}
    >
      <div className="library-cloud">
        <div className="library-cloud__crumbs">
          {crumbs.map((crumb, index) => (
            <button
              key={crumb || 'root'}
              type="button"
              className={`library-cloud__crumb${crumb === path ? ' is-current' : ''}`}
              onClick={() => setPath(crumb)}
            >
              {index === 0 ? <i className="pi pi-home" /> : crumb.split('/').pop()}
            </button>
          ))}
        </div>

        {status === 'loading' ? (
          <div className="library-cloud__state">
            <i className="pi pi-spin pi-spinner" /> Cargando…
          </div>
        ) : status === 'error' ? (
          <div className="library-cloud__state library-cloud__state--error">
            <i className="pi pi-exclamation-triangle" /> {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="library-cloud__state">Esta carpeta está vacía.</div>
        ) : (
          <ul className="library-cloud__list">
            {entries.map((entry) => (
              <li
                key={entry.path}
                className="library-cloud__item"
                onClick={() => {
                  if (entry.isDirectory) setPath(toRelativePath(entry.path, account?.username));
                }}
                onDoubleClick={() => {
                  if (entry.isDirectory) setPath(toRelativePath(entry.path, account?.username));
                }}
              >
                <i className={entry.isDirectory ? 'pi pi-folder' : 'pi pi-file'} />
                <span className="library-cloud__item-name">{entry.name}</span>
                {entry.isDirectory ? (
                  <i className="pi pi-angle-right library-cloud__item-chevron" />
                ) : (
                  <span className="library-cloud__item-size">{formatFileSize(entry.size)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="library-cloud__footer">
          <span>
            Se montará «{mountLabel}». Los archivos se leen en Nextcloud y no se copian a NodeTerm.
          </span>
        </div>
      </div>
    </AppDialog>
  );
};

export default React.memo(LibraryCloudBrowserDialog);
