import React from 'react';
// Estructura de temas de iconos locales (SVG inline)
export const iconThemes = {
  material: {
    name: 'Material',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      )
    }
  },
  fluent: {
    name: 'Fluent',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0078d4"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#50e6ff"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0078d4"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#50e6ff"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {/* Definir gradiente para el efecto de resplandor */}
          <defs>
            <linearGradient id="terminalGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0078d4" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#0078d4" stopOpacity="0.1"/>
            </linearGradient>
            <pattern id="terminalTexture" patternUnits="userSpaceOnUse" width="3" height="3">
              <rect width="3" height="3" fill="#1a1a1a"/>
              <circle cx="1.5" cy="1.5" r="0.4" fill="#2a2a2a" opacity="0.4"/>
            </pattern>
          </defs>
          
          {/* Ventana del terminal ocupando más espacio */}
          <rect x="1" y="2" width="18" height="16" rx="2.5" fill="#2a2a2a" stroke="#666" strokeWidth="0.8"/>
          
          {/* Barra de título más proporcionada */}
          <rect x="1" y="2" width="18" height="4" rx="2.5" fill="#3a3a3a" stroke="#666" strokeWidth="0.8"/>
          
          {/* Controles de ventana (3 círculos azules) más grandes */}
          <circle cx="3.5" cy="4" r="1.3" fill="#0078d4"/>
          <circle cx="6.5" cy="4" r="1.3" fill="#0078d4"/>
          <circle cx="9.5" cy="4" r="1.3" fill="#0078d4"/>
          
          {/* Pantalla del terminal con textura ocupando más espacio */}
          <rect x="2" y="6" width="16" height="11" rx="1.5" fill="url(#terminalTexture)"/>
          
          {/* Prompt brillante con efecto de resplandor más centrado */}
          <g>
            {/* Efecto de resplandor */}
            <rect x="3" y="12" width="14" height="4" fill="url(#terminalGlow)" rx="1"/>
            {/* Prompt principal más grande */}
            <text x="4" y="14.5" fontSize="4" fill="#00a8ff" fontFamily="monospace" fontWeight="bold">&gt;</text>
            <text x="6" y="14.5" fontSize="4" fill="#00a8ff" fontFamily="monospace">/</text>
            {/* Cursor parpadeante más visible */}
            <rect x="7.5" y="13" width="1" height="3" fill="#00a8ff" opacity="0.9"/>
          </g>
          
          {/* Resplandor sutil en la parte inferior más amplio */}
          <rect x="1" y="17" width="18" height="1" fill="url(#terminalGlow)" rx="0.5"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {/* Definir gradiente para el efecto de resplandor RDP */}
          <defs>
            <linearGradient id="rdpGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00bcf2" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#00bcf2" stopOpacity="0.1"/>
            </linearGradient>
            <pattern id="rdpTexture" patternUnits="userSpaceOnUse" width="3" height="3">
              <rect width="3" height="3" fill="#1a1a1a"/>
              <circle cx="1.5" cy="1.5" r="0.4" fill="#2a2a2a" opacity="0.4"/>
            </pattern>
          </defs>
          
          {/* Ventana exterior (monitor principal) */}
          <rect x="1" y="2" width="18" height="16" rx="2.5" fill="#2a2a2a" stroke="#666" strokeWidth="0.8"/>
          
          {/* Barra de título de la ventana exterior */}
          <rect x="1" y="2" width="18" height="4" rx="2.5" fill="#3a3a3a" stroke="#666" strokeWidth="0.8"/>
          
          {/* Controles de ventana exterior (3 círculos azul claro) */}
          <circle cx="3.5" cy="4" r="1.3" fill="#00bcf2"/>
          <circle cx="6.5" cy="4" r="1.3" fill="#00bcf2"/>
          <circle cx="9.5" cy="4" r="1.3" fill="#00bcf2"/>
          
          {/* Ventana interior (escritorio remoto) centrada */}
          <rect x="4" y="7" width="12" height="9" rx="1.5" fill="#1a1a1a" stroke="#00bcf2" strokeWidth="0.8"/>
          
          {/* Barra de título de la ventana interior */}
          <rect x="4" y="7" width="12" height="2.5" rx="1.5" fill="#2a2a2a" stroke="#00bcf2" strokeWidth="0.8"/>
          
          {/* Controles de ventana interior (3 círculos más pequeños) */}
          <circle cx="5.5" cy="8.2" r="0.8" fill="#00bcf2"/>
          <circle cx="7" cy="8.2" r="0.8" fill="#00bcf2"/>
          <circle cx="8.5" cy="8.2" r="0.8" fill="#00bcf2"/>
          
          {/* Pantalla del escritorio remoto */}
          <rect x="4.5" y="9.5" width="11" height="6" rx="1" fill="url(#rdpTexture)"/>
          
          {/* Cursor del mouse (flecha) */}
          <path d="M8 11 L10 11 L9 13 L8.5 12.5 L8 13 Z" fill="#00bcf2" opacity="0.9"/>
          
          {/* Botón/etiqueta RDP */}
          <rect x="11" y="12" width="3.5" height="2" rx="0.5" fill="#00bcf2"/>
          <text x="12.7" y="13.2" fontSize="1.8" fill="white" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RDP</text>
          
          {/* Resplandor sutil en la parte inferior */}
          <rect x="1" y="17" width="18" height="1" fill="url(#rdpGlow)" rx="0.5"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#605e5c"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#fff"/></svg>
      )
    }
  },
  linea: {
    name: 'Linea',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l4-4h6l2 2h8v2"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l4-4h6l2 2h8v2"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#607d8b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12"/></svg>
      )
    }
  },
  nord: {
    name: 'Nord',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e81ac"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#88c0d0"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e81ac"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#88c0d0"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e81ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#d8dee9"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#5e81ac"/></svg>
      )
    }
  },
  dracula: {
    name: 'Dracula',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#bd93f9"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#ff79c6"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#bd93f9"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#ff79c6"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bd93f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f8f8f2"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#bd93f9"/></svg>
      )
    }
  },
  solarized: {
    name: 'Solarized',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#b58900"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#268bd2"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#b58900"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#268bd2"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b58900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fdf6e3"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#b58900"/></svg>
      )
    }
  },

  vscode: {
    name: 'VS Code',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#dcb67a"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#f5d18a"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#dcb67a"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#f5d18a"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dcb67a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#606060"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="3" fill="#fff"/><rect x="8" y="8" width="6" height="1" fill="#ccc"/><rect x="8" y="10" width="8" height="1" fill="#ccc"/></svg>
      )
    }
  },

  atom: {
    name: 'Atom',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#4fc3f7"><rect x="2" y="7" width="20" height="13" rx="3"/><path d="M2 7l4-4h6l2 2h8v2" fill="#81d4fa"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#4fc3f7"><rect x="2" y="7" width="20" height="13" rx="3"/><path d="M2 7l4-4h6l2 2h8v2" fill="#81d4fa"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#90a4ae"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#e8eaf6"/></svg>
      )
    }
  },

  monokai: {
    name: 'Monokai',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fd971f"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#f92672"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fd971f"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#f92672"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fd971f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#272822"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#a6e22e"/></svg>
      )
    }
  },

  onedark: {
    name: 'One Dark',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#e5c07b"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#d19a66"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#e5c07b"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#d19a66"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#abb2bf"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#282c34"/></svg>
      )
    }
  },

  gruvbox: {
    name: 'Gruvbox',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#d79921"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#d79921"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d79921" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ebdbb2"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#3c3836"/></svg>
      )
    }
  },

  tokyonight: {
    name: 'Tokyo Night',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#bb9af7"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#9aa5ce"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#bb9af7"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#9aa5ce"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bb9af7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#c0caf5"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#1a1b26"/></svg>
      )
    }
  },

  catppuccin: {
    name: 'Catppuccin',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5c2e7"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#cba6f7"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5c2e7"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#cba6f7"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5c2e7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#cdd6f4"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#1e1e2e"/></svg>
      )
    }
  },

  palenight: {
    name: 'Palenight',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#c792ea"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#ffcb6b"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#c792ea"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#ffcb6b"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c792ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a6accd"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#292d3e"/></svg>
      )
    }
  },

  minimal: {
    name: 'Minimal',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 7l4-4h6l2 2h7v2"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 7l4-4h6l2 2h7v2"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M14 2v6h6"/></svg>
      )
    }
  },

  highcontrast: {
    name: 'High Contrast',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" stroke="#fff" strokeWidth="2">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#fff"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" stroke="#fff" strokeWidth="2">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#fff"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" stroke="#fff" strokeWidth="2">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#fff"/>
        </svg>
      )
    }
  },

  synthwave: {
    name: 'Synthwave',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff007c"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#00d4ff"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff007c"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#00d4ff"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff007c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff6b35"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#1a0033"/></svg>
      )
    }
  }
}; 
