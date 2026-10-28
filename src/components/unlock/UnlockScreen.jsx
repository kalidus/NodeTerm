import React, { useEffect } from 'react';
import { normalizeUnlockStyle } from './unlockStyles';
import ClassicLayout from './layouts/ClassicLayout';
import VaultGateLayout from './layouts/VaultGateLayout';
import TerminalLayout from './layouts/TerminalLayout';
import PremiumCardLayout from './layouts/PremiumCardLayout';
import GlassHudLayout from './layouts/GlassHudLayout';
import SynthwaveLayout from './layouts/SynthwaveLayout';
import AuroraLayout from './layouts/AuroraLayout';

const LAYOUTS = {
  classic: ClassicLayout,
  'vault-gate': VaultGateLayout,
  terminal: TerminalLayout,
  'premium-card': PremiumCardLayout,
  'glass-hud': GlassHudLayout,
  synthwave: SynthwaveLayout,
  aurora: AuroraLayout
};

/**
 * Shell visual de desbloqueo. La lógica de vault vive en UnlockDialog.
 */
export default function UnlockScreen({
  visible,
  style: styleProp,
  password,
  onPasswordChange,
  rememberPassword,
  onRememberChange,
  preferenceReady = true,
  error = '',
  loading = false,
  onConfirm,
  onHide,
  previewMode = false,
  passwordId = 'unlock-password'
}) {
  const styleId = normalizeUnlockStyle(styleProp);

  useEffect(() => {
    if (!visible || !previewMode) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onHide?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, previewMode, onHide]);

  if (!visible) return null;

  const Layout = LAYOUTS[styleId] || ClassicLayout;
  const shared = {
    visible,
    password,
    onPasswordChange,
    rememberPassword,
    onRememberChange,
    preferenceReady,
    onConfirm,
    error,
    loading,
    previewMode,
    onHide,
    passwordId
  };

  return <Layout {...shared} />;
}
