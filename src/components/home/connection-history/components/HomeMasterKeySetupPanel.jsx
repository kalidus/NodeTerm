import React from 'react';
import MasterKeySetupForm from '../../../MasterKeySetupForm';

/**
 * Panel Home: crear clave maestra sin bloquear terminal/pestañas.
 */
export default function HomeMasterKeySetupPanel({
  secureStorage,
  onSuccess
}) {
  if (!secureStorage) {
    return (
      <div className="home-widget-empty">
        No hay almacén seguro disponible.
      </div>
    );
  }

  return (
    <div className="home-master-key-setup">
      <MasterKeySetupForm
        secureStorage={secureStorage}
        onSuccess={onSuccess}
        variant="panel"
        autoFocus={false}
        showBrand
      />
    </div>
  );
}
