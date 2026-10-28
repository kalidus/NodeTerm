import React from 'react';
import previewClassic from '../../assets/unlock-previews/classic.jpg';
import previewVaultGate from '../../assets/unlock-previews/vault-gate.jpg';
import previewTerminal from '../../assets/unlock-previews/terminal.jpg';
import previewPremiumCard from '../../assets/unlock-previews/premium-card.jpg';
import previewGlassHud from '../../assets/unlock-previews/glass-hud.jpg';
import previewSynthwave from '../../assets/unlock-previews/synthwave.jpg';
import previewAurora from '../../assets/unlock-previews/aurora.jpg';
import previewMatrix from '../../assets/unlock-previews/matrix.jpg';
import previewEmber from '../../assets/unlock-previews/ember.jpg';
import previewNord from '../../assets/unlock-previews/nord.jpg';
import previewMidnight from '../../assets/unlock-previews/midnight.jpg';

const PREVIEW_BY_STYLE = {
  classic: previewClassic,
  'vault-gate': previewVaultGate,
  terminal: previewTerminal,
  'premium-card': previewPremiumCard,
  'glass-hud': previewGlassHud,
  synthwave: previewSynthwave,
  aurora: previewAurora,
  matrix: previewMatrix,
  ember: previewEmber,
  nord: previewNord,
  midnight: previewMidnight
};

/**
 * Miniatura exacta del estilo (imagen de preview).
 */
export default function UnlockStyleThumb({ styleId, alt = '' }) {
  const src = PREVIEW_BY_STYLE[styleId] || PREVIEW_BY_STYLE.classic;
  return (
    <div className="unlock-style-thumb unlock-style-thumb--photo" aria-hidden={alt ? undefined : true}>
      <img src={src} alt={alt} className="unlock-style-thumb-img" loading="lazy" />
    </div>
  );
}
