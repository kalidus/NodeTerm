import React from 'react';
import UnlockDialog from '../../../UnlockDialog';

/**
 * Panel Home: desbloquear el vault sin bloquear terminal ni pestañas.
 */
export default function HomeUnlockPanel({
  secureStorage,
  onSuccess,
  hint = ''
}) {
  if (!secureStorage) {
    return <div className="home-widget-empty">No hay almacén seguro disponible.</div>;
  }

  return (
    <div className="home-unlock-panel">
      <UnlockDialog
        visible
        embedded
        secureStorage={secureStorage}
        onSuccess={onSuccess}
        hint={hint}
      />
    </div>
  );
}
