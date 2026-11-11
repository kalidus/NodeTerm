import React from 'react';

/**
 * Icono de vault estilo Termius (glifo relleno):
 * cuerpo redondeado + patas, ranura vertical izq., dial anular.
 */
const VaultSafeIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d={
        // Cuerpo (esquinas redondeadas)
        'M2.85 2.7h10.3A1.95 1.95 0 0 1 15.1 4.65v6.7a1.95 1.95 0 0 1-1.95 1.95H2.85A1.95 1.95 0 0 1 .9 11.35v-6.7A1.95 1.95 0 0 1 2.85 2.7z' +
        // Patas
        'M2.35 13.3h1.95v1.35H2.35z' +
        'M11.7 13.3h1.95v1.35H11.7z' +
        // Ranura vertical (izquierda)
        'M3.55 5.35h1.1v5H3.55z' +
        // Hueco del dial
        'M6.8 7.85a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0'
      }
    />
    {/* Centro del dial → el hueco queda como anillo */}
    <circle cx="9.2" cy="7.85" r="1.75" fill="currentColor" />
  </svg>
);

export default VaultSafeIcon;
