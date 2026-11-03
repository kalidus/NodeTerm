import React from 'react';
import UnlockStyleThumb from '../unlock/UnlockStyleThumb';
import { normalizeSplashStyle } from './splashStyles';

/**
 * Miniatura fotográfica del splash (mismos assets/IDs que unlock).
 */
export default function SplashStyleThumb({ styleId, alt = '' }) {
  return <UnlockStyleThumb styleId={normalizeSplashStyle(styleId)} alt={alt} />;
}
