import React, { useEffect, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import AppDialog from '../ui/AppDialog';

/**
 * Pide una URL. Por defecto se abre sin copiarla; la casilla la guarda en NodeTerm.
 */
const LibraryUrlImportDialog = ({ visible, folderLabel, defaultSaveCopy = false, onHide, onConfirm }) => {
  const [url, setUrl] = useState('');
  const [allowPrivate, setAllowPrivate] = useState(false);
  const [saveCopy, setSaveCopy] = useState(false);

  useEffect(() => {
    if (visible) {
      setUrl('');
      setAllowPrivate(false);
      setSaveCopy(!!defaultSaveCopy);
    }
  }, [visible, defaultSaveCopy]);

  const trimmed = url.trim();
  const valid = /^https?:\/\/\S+$/i.test(trimmed);

  const submit = () => {
    if (!valid) return;
    onConfirm(trimmed, { allowPrivate, saveCopy });
  };

  return (
    <AppDialog
      headerTitle="Añadir desde URL"
      headerIcon="pi pi-cloud-download"
      visible={visible}
      onHide={onHide}
      size="sm"
      confirmLabel={saveCopy ? 'Guardar copia' : 'Abrir'}
      confirmIcon={saveCopy ? 'pi pi-save' : 'pi pi-eye'}
      confirmDisabled={!valid}
      onConfirm={submit}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="library-url" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          Dirección del archivo
        </label>
        <InputText
          id="library-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/informe.pdf"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          {saveCopy
            ? `Se guardará una copia ${folderLabel ? `en "${folderLabel}"` : 'en NodeTerm'}.`
            : 'Se abre para verlo y no se copia dentro de NodeTerm.'}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', opacity: 0.85 }}>
          <input
            type="checkbox"
            checked={saveCopy}
            onChange={(e) => setSaveCopy(e.target.checked)}
          />
          Guardar también una copia en NodeTerm
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', opacity: 0.85 }}>
          <input
            type="checkbox"
            checked={allowPrivate}
            onChange={(e) => setAllowPrivate(e.target.checked)}
          />
          Permitir direcciones de red local (intranet, NAS)
        </label>
      </div>
    </AppDialog>
  );
};

export default React.memo(LibraryUrlImportDialog);
