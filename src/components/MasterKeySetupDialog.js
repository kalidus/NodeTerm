import React from 'react';
import MasterKeySetupForm from './MasterKeySetupForm';
import '../styles/components/unlock-screen.css';

/**
 * Overlay fullscreen opcional para crear la clave maestra.
 * El first-run usa el panel de Home; este dialog queda disponible si se monta a mano.
 */
const MasterKeySetupDialog = ({ visible, onSuccess, secureStorage }) => {
  if (!visible) return null;

  return (
    <div
      className="unlock-screen-overlay mk-setup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mk-setup-title"
    >
      <MasterKeySetupForm
        secureStorage={secureStorage}
        onSuccess={onSuccess}
        variant="overlay"
        autoFocus
      />
    </div>
  );
};

export default MasterKeySetupDialog;
