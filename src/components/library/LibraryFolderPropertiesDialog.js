import React, { useEffect, useState } from 'react';
import AppDialog from '../ui/AppDialog';
import { formatFileSize } from '../../shared/library-mime';

const VAULT_OPTIONS = [
  {
    value: 'plain',
    icon: 'pi pi-unlock',
    title: 'Sin cifrar',
    text: 'Solo afecta a las copias guardadas dentro de NodeTerm. Un enlace de Windows o una carpeta de Nextcloud se lee tal cual.'
  },
  {
    value: 'encrypted',
    icon: 'pi pi-lock',
    title: 'Cifrada',
    text: 'Cada copia guardada en NodeTerm se cifra con la clave maestra. Los archivos que solo están enlazados no se modifican.'
  }
];

const SYNC_OPTIONS = [
  {
    value: 'none',
    icon: 'pi pi-desktop',
    title: 'Solo en este equipo',
    text: 'Las copias guardadas en NodeTerm se quedan aquí. Esto no monta ninguna carpeta de Nextcloud.'
  },
  {
    value: 'nextcloud',
    icon: 'pi pi-cloud',
    title: 'Copiar a mis otros equipos',
    text: 'Sube estas copias guardadas a NodeTerm/library para verlas en otros equipos. No sustituye a montar una carpeta tuya.'
  }
];

function OptionList({ name, options, value, onChange, disabled }) {
  return (
    <div className="library-props__options">
      {options.map((option) => (
        <label
          key={option.value}
          className={`library-props__option${value === option.value ? ' is-selected' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          <i className={option.icon} />
          <span className="library-props__option-body">
            <span className="library-props__option-title">{option.title}</span>
            <span className="library-props__option-text">{option.text}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * Propiedades de una carpeta de la Biblioteca: cifrado y sincronización.
 * Al aceptar, el contenedor convierte los blobs si cambia el modo de cifrado.
 *
 * @param {{ visible: boolean, folder: object|null, policy: object,
 *           inheritedPolicy: object, stats: { files: number, bytes: number },
 *           vaultUnlocked: boolean, onHide: Function, onConfirm: Function }} props
 */
const LibraryFolderPropertiesDialog = ({
  visible,
  folder,
  policy,
  inheritedPolicy,
  stats,
  vaultUnlocked,
  onHide,
  onConfirm
}) => {
  const [vaultMode, setVaultMode] = useState('plain');
  const [syncMode, setSyncMode] = useState('none');

  useEffect(() => {
    if (!visible) return;
    setVaultMode(policy?.vaultMode === 'encrypted' ? 'encrypted' : 'plain');
    setSyncMode(policy?.syncMode === 'nextcloud' ? 'nextcloud' : 'none');
  }, [visible, policy?.vaultMode, policy?.syncMode]);

  const vaultChanged = vaultMode !== (policy?.vaultMode || 'plain');
  const needsUnlock = vaultChanged && !vaultUnlocked;

  return (
    <AppDialog
      headerTitle={folder?.label ? `Propiedades de "${folder.label}"` : 'Propiedades de la carpeta'}
      headerIcon="pi pi-sliders-h"
      visible={visible}
      onHide={onHide}
      size="md"
      confirmLabel="Guardar"
      confirmIcon="pi pi-check"
      confirmDisabled={needsUnlock}
      onConfirm={() => onConfirm({ vaultMode, syncMode })}
    >
      <div className="library-props">
        <div className="library-props__summary">
          <span>
            <i className="pi pi-file" /> {stats?.files || 0} archivo{stats?.files === 1 ? '' : 's'} en esta carpeta
          </span>
          {stats?.bytes ? <span><i className="pi pi-database" /> {formatFileSize(stats.bytes)}</span> : null}
        </div>

        <section className="library-props__section">
          <h4>Cifrado en disco</h4>
          <OptionList name="vaultMode" options={VAULT_OPTIONS} value={vaultMode} onChange={setVaultMode} />
          {inheritedPolicy?.inheritedFrom ? (
            <p className="library-props__hint">
              <i className="pi pi-info-circle" /> Las subcarpetas heredan este ajuste salvo que lo cambies en ellas.
            </p>
          ) : null}
          {needsUnlock ? (
            <p className="library-props__hint library-props__hint--warn">
              <i className="pi pi-exclamation-triangle" /> Desbloquea el vault para cambiar el cifrado de esta carpeta.
            </p>
          ) : null}
          {vaultChanged && vaultUnlocked ? (
            <p className="library-props__hint library-props__hint--warn">
              <i className="pi pi-exclamation-triangle" /> Se reescribirán {stats?.files || 0} archivo
              {stats?.files === 1 ? '' : 's'} al guardar. No cierres NodeTerm durante el proceso.
            </p>
          ) : null}
        </section>

        <section className="library-props__section">
          <h4>Copias guardadas en NodeTerm</h4>
          <OptionList name="syncMode" options={SYNC_OPTIONS} value={syncMode} onChange={setSyncMode} />
          <p className="library-props__hint">
            <i className="pi pi-info-circle" /> Para ver una carpeta de Nextcloud sin copiarla, usa «Montar carpeta de Nextcloud».
          </p>
        </section>
      </div>
    </AppDialog>
  );
};

export default React.memo(LibraryFolderPropertiesDialog);
