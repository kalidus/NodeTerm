import React from 'react';
import openWebuiPng from '../assets/ai-clients/open-webui.png';
import anythingLlmPng from '../assets/ai-clients/anything-llm.png';
import librechatPng from '../assets/ai-clients/librechat.png';
import openclawPng from '../assets/ai-clients/openclaw.png';
import agentZeroSvg from '../assets/ai-clients/agent-zero.svg';

/** Recursos oficiales de cada proyecto (repos públicos). */
const BRAND_BY_TAB_TYPE = {
  'anything-llm': { src: anythingLlmPng, alt: 'AnythingLLM' },
  openwebui: { src: openWebuiPng, alt: 'Open WebUI' },
  librechat: { src: librechatPng, alt: 'LibreChat' },
  agentzero: { src: agentZeroSvg, alt: 'Agent Zero' },
  openclaw: { src: openclawPng, alt: 'OpenClaw' }
};

/**
 * Icono de marca para pestañas y barra lateral (clientes de IA embebidos).
 * @param {object} props
 * @param {string} props.tabType — type de la pestaña (p. ej. 'openwebui', 'librechat')
 * @param {number} [props.size=14]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
const AIClientBrandIcon = ({ tabType, size = 14, className, style }) => {
  const meta = BRAND_BY_TAB_TYPE[tabType];
  if (!meta) return null;
  return (
    <img
      src={meta.src}
      alt=""
      role="presentation"
      aria-hidden
      className={className}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        ...style
      }}
    />
  );
};

export default AIClientBrandIcon;
export { BRAND_BY_TAB_TYPE };
