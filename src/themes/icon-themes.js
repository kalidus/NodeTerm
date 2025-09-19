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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1976d2"/>
              <stop offset="100%" stopColor="#42a5f5"/>
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="url(#materialSSH)" opacity="0.1"/>
          <rect x="3" y="4" width="18" height="12" rx="2" stroke="url(#materialSSH)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1" fill="none" stroke="url(#materialSSH)" strokeWidth="1"/>
          <circle cx="6" cy="8" r="0.8" fill="url(#materialSSH)"/>
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="url(#materialSSH)"/>
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="url(#materialSSH)" opacity="0.7"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="url(#materialSSH)" opacity="0.5"/>
          <path d="M9 18l3 3 3-3" stroke="url(#materialSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007ad9"/>
              <stop offset="100%" stopColor="#42a5f5"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#materialRDP)" opacity="0.1"/>
          <rect x="2" y="3" width="20" height="14" rx="3" stroke="url(#materialRDP)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="url(#materialRDP)" opacity="0.2"/>
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#materialRDP)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="1.5" fill="url(#materialRDP)"/>
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="url(#materialRDP)"/>
          <path d="M8 20l4 2 4-2" stroke="url(#materialRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5e81ac"/>
              <stop offset="100%" stopColor="#88c0d0"/>
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#3b4252" stroke="url(#nordSSH)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1" fill="#2e3440"/>
          <circle cx="6" cy="8" r="0.8" fill="#88c0d0"/>
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#88c0d0"/>
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#5e81ac"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#4c566a"/>
          <path d="M9 18l3 3 3-3" stroke="url(#nordSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5e81ac"/>
              <stop offset="100%" stopColor="#88c0d0"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3b4252" stroke="url(#nordRDP)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#2e3440"/>
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#nordRDP)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="1.5" fill="#88c0d0"/>
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#5e81ac"/>
          <path d="M8 20l4 2 4-2" stroke="url(#nordRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f92672"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fd971f"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f92672"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fd971f"/></svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#61afef"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#e5c07b"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#61afef"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#e5c07b"/></svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#b16286"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#b16286"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d79921"/>
              <stop offset="100%" stopColor="#fabd2f"/>
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#3c3836" stroke="url(#gruvboxSSH)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1" fill="#282828"/>
          <circle cx="6" cy="8" r="0.8" fill="#fabd2f"/>
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#fabd2f"/>
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#d79921"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#b16286"/>
          <path d="M9 18l3 3 3-3" stroke="url(#gruvboxSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d79921"/>
              <stop offset="100%" stopColor="#fabd2f"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3c3836" stroke="url(#gruvboxRDP)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#282828"/>
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#gruvboxRDP)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="1.5" fill="#fabd2f"/>
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#d79921"/>
          <path d="M8 20l4 2 4-2" stroke="url(#gruvboxRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="synthwaveSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff007c"/>
              <stop offset="100%" stopColor="#00d4ff"/>
            </linearGradient>
            <filter id="synthwaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#0f0f23" stroke="url(#synthwaveSSH)" strokeWidth="1.5" filter="url(#synthwaveGlow)"/>
          <rect x="4" y="6" width="16" height="8" rx="1" fill="#1a1a3a"/>
          <circle cx="6" cy="8" r="0.8" fill="#00d4ff"/>
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#00d4ff"/>
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#ff007c"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#ff6b9d"/>
          <path d="M9 18l3 3 3-3" stroke="url(#synthwaveSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#synthwaveGlow)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="synthwaveRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff007c"/>
              <stop offset="100%" stopColor="#00d4ff"/>
            </linearGradient>
            <filter id="synthwaveRDPGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#0f0f23" stroke="url(#synthwaveRDP)" strokeWidth="1.5" filter="url(#synthwaveRDPGlow)"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#1a1a3a"/>
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#synthwaveRDP)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="1.5" fill="#00d4ff"/>
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#ff007c"/>
          <path d="M8 20l4 2 4-2" stroke="url(#synthwaveRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#synthwaveRDPGlow)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff6b35"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#1a0033"/></svg>
      )
    }
  },

  nodetermBasic: {
    name: 'Nodeterm Basic',
    description: 'Tema básico de NodeTerm con tags SSH y RDP integrados',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#42a5f5"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#64b5f6"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#42a5f5"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#64b5f6"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#42a5f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#616161"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#fff"/></svg>
      )
    }
  },

  cyberpunk: {
    name: 'Cyberpunk',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#cyberGlow)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff0080" filter="url(#cyberGlow)"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlow2">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#cyberGlow2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff0080" filter="url(#cyberGlow2)"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlow3">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#cyberGlow3)"/>
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#cyberGlow3)"/>
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#cyberGlow3)"/>
          <path d="M6 7h12M6 11h8M6 15h6" filter="url(#cyberGlow3)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlow4">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#cyberGlow4)"/>
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#cyberGlow4)"/>
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#cyberGlow4)"/>
          <circle cx="12" cy="10" r="3" filter="url(#cyberGlow4)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlow5">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" filter="url(#cyberGlow5)"/>
          <path d="M14 2v6h6" filter="url(#cyberGlow5)"/>
        </svg>
      )
    }
  },

  retroGaming: {
    name: 'Retro Gaming',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff00ff">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff"/>
          <rect x="8" y="10" width="2" height="2" fill="#ffff00"/>
          <rect x="12" y="10" width="2" height="2" fill="#ffff00"/>
          <rect x="10" y="12" width="4" height="1" fill="#ffff00"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff00ff">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff"/>
          <rect x="8" y="10" width="2" height="2" fill="#ffff00"/>
          <rect x="12" y="10" width="2" height="2" fill="#ffff00"/>
          <rect x="10" y="12" width="4" height="1" fill="#ffff00"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <pattern id="retroGrid" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#ff00ff" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="1" fill="#000" stroke="#ff00ff" strokeWidth="2"/>
          <rect x="4" y="6" width="16" height="8" rx="0.5" fill="url(#retroGrid)"/>
          <circle cx="6" cy="8" r="1" fill="#00ffff"/>
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#00ffff"/>
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#ff00ff"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#ffff00"/>
          <rect x="18" y="5" width="2" height="2" fill="#00ffff"/>
          <rect x="18" y="8" width="2" height="2" fill="#ffff00"/>
          <path d="M9 18l3 3 3-3" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <pattern id="retroRDPGrid" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#00ffff" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="1" fill="#000" stroke="#00ffff" strokeWidth="2"/>
          <rect x="4" y="6" width="16" height="8" rx="0.5" fill="url(#retroRDPGrid)"/>
          <circle cx="12" cy="10" r="3" fill="none" stroke="#00ffff" strokeWidth="2"/>
          <circle cx="12" cy="10" r="2" fill="#ff00ff"/>
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#ffff00"/>
          <rect x="18" y="5" width="2" height="2" fill="#ff00ff"/>
          <rect x="18" y="8" width="2" height="2" fill="#00ffff"/>
          <path d="M8 20l4 2 4-2" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffff00">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#ff00ff"/>
          <rect x="8" y="8" width="8" height="1" fill="#00ffff"/>
          <rect x="8" y="10" width="6" height="1" fill="#00ffff"/>
          <rect x="8" y="12" width="8" height="1" fill="#00ffff"/>
        </svg>
      )
    }
  },

  corporate: {
    name: 'Corporate',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e3a8a">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6"/>
          <rect x="4" y="9" width="16" height="1" fill="#ffffff"/>
          <rect x="4" y="11" width="12" height="1" fill="#ffffff"/>
          <rect x="4" y="13" width="14" height="1" fill="#ffffff"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e3a8a">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6"/>
          <rect x="4" y="9" width="16" height="1" fill="#ffffff"/>
          <rect x="4" y="11" width="12" height="1" fill="#ffffff"/>
          <rect x="4" y="13" width="14" height="1" fill="#ffffff"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <rect x="18" y="4" width="2" height="2" fill="#3b82f6"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <rect x="10" y="8" width="4" height="1" fill="#1e3a8a"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e3a8a">
          <rect x="6" y="2" width="12" height="20" rx="1"/>
          <path d="M14 2v6h6" fill="#3b82f6"/>
          <rect x="8" y="8" width="8" height="1" fill="#ffffff"/>
          <rect x="8" y="10" width="6" height="1" fill="#ffffff"/>
          <rect x="8" y="12" width="8" height="1" fill="#ffffff"/>
          <rect x="8" y="14" width="4" height="1" fill="#ffffff"/>
        </svg>
      )
    }
  },

  nature: {
    name: 'Nature',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#22c55e"/>
          <circle cx="8" cy="12" r="1" fill="#fbbf24"/>
          <circle cx="12" cy="10" r="1" fill="#fbbf24"/>
          <circle cx="16" cy="14" r="1" fill="#fbbf24"/>
          <path d="M6 16 Q8 18 10 16 Q12 18 14 16 Q16 18 18 16" stroke="#fbbf24" strokeWidth="1" fill="none"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#22c55e"/>
          <circle cx="8" cy="12" r="1" fill="#fbbf24"/>
          <circle cx="12" cy="10" r="1" fill="#fbbf24"/>
          <circle cx="16" cy="14" r="1" fill="#fbbf24"/>
          <path d="M6 16 Q8 18 10 16 Q12 18 14 16 Q16 18 18 16" stroke="#fbbf24" strokeWidth="1" fill="none"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#fbbf24"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#fbbf24"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#fbbf24"/>
          <path d="M10 9 Q12 7 14 9 Q12 11 10 9" fill="#fbbf24"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#22c55e"/>
          <circle cx="10" cy="8" r="1" fill="#fbbf24"/>
          <path d="M8 12 Q10 14 12 12 Q14 14 16 12" stroke="#fbbf24" strokeWidth="1" fill="none"/>
        </svg>
      )
    }
  },

  space: {
    name: 'Space',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6"/>
          <circle cx="8" cy="11" r="0.5" fill="#ffffff"/>
          <circle cx="12" cy="13" r="0.5" fill="#ffffff"/>
          <circle cx="16" cy="10" r="0.5" fill="#ffffff"/>
          <circle cx="18" cy="15" r="0.3" fill="#ffffff"/>
          <circle cx="6" cy="16" r="0.3" fill="#ffffff"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6"/>
          <circle cx="8" cy="11" r="0.5" fill="#ffffff"/>
          <circle cx="12" cy="13" r="0.5" fill="#ffffff"/>
          <circle cx="16" cy="10" r="0.5" fill="#ffffff"/>
          <circle cx="18" cy="15" r="0.3" fill="#ffffff"/>
          <circle cx="6" cy="16" r="0.3" fill="#ffffff"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="0.5" fill="#ffffff"/>
          <path d="M16 5 L20 5 M16 7 L20 7" stroke="#ffffff" strokeWidth="1"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#ffffff"/>
          <path d="M10 8 L14 8 M10 12 L14 12 M8 10 L16 10" stroke="#ffffff" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#3b82f6"/>
          <circle cx="10" cy="8" r="0.5" fill="#ffffff"/>
          <circle cx="14" cy="10" r="0.5" fill="#ffffff"/>
          <circle cx="12" cy="12" r="0.3" fill="#ffffff"/>
          <path d="M8 15 L16 15 M8 17 L14 17" stroke="#ffffff" strokeWidth="1"/>
        </svg>
      )
    }
  },

  ocean: {
    name: 'Ocean',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0ea5e9">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#0284c7"/>
          <path d="M4 12 Q6 10 8 12 Q10 14 12 12 Q14 10 16 12 Q18 14 20 12" stroke="#06b6d4" strokeWidth="1.5" fill="none"/>
          <circle cx="6" cy="15" r="0.5" fill="#06b6d4"/>
          <circle cx="18" cy="16" r="0.5" fill="#06b6d4"/>
          <circle cx="12" cy="17" r="0.3" fill="#06b6d4"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0ea5e9">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#0284c7"/>
          <path d="M4 12 Q6 10 8 12 Q10 14 12 12 Q14 10 16 12 Q18 14 20 12" stroke="#06b6d4" strokeWidth="1.5" fill="none"/>
          <circle cx="6" cy="15" r="0.5" fill="#06b6d4"/>
          <circle cx="18" cy="16" r="0.5" fill="#06b6d4"/>
          <circle cx="12" cy="17" r="0.3" fill="#06b6d4"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#06b6d4"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#06b6d4"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#06b6d4"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#06b6d4" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0284c7">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#0ea5e9"/>
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#06b6d4" strokeWidth="1" fill="none"/>
          <circle cx="10" cy="14" r="0.5" fill="#06b6d4"/>
          <circle cx="14" cy="16" r="0.5" fill="#06b6d4"/>
        </svg>
      )
    }
  },

  fire: {
    name: 'Fire',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#dc2626"/>
          <path d="M6 15 Q8 12 10 15 Q12 18 14 15 Q16 12 18 15" stroke="#f97316" strokeWidth="2" fill="none"/>
          <circle cx="8" cy="12" r="0.5" fill="#f97316"/>
          <circle cx="16" cy="13" r="0.5" fill="#f97316"/>
          <circle cx="12" cy="11" r="0.3" fill="#f97316"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#dc2626"/>
          <path d="M6 15 Q8 12 10 15 Q12 18 14 15 Q16 12 18 15" stroke="#f97316" strokeWidth="2" fill="none"/>
          <circle cx="8" cy="12" r="0.5" fill="#f97316"/>
          <circle cx="16" cy="13" r="0.5" fill="#f97316"/>
          <circle cx="12" cy="11" r="0.3" fill="#f97316"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#f97316"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#f97316"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#f97316"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#f97316" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#dc2626"/>
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#f97316" strokeWidth="1.5" fill="none"/>
          <circle cx="10" cy="14" r="0.5" fill="#f97316"/>
          <circle cx="14" cy="16" r="0.5" fill="#f97316"/>
        </svg>
      )
    }
  },

  ice: {
    name: 'Ice',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0ea5e9">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#38bdf8"/>
          <path d="M4 12 Q6 14 8 12 Q10 10 12 12 Q14 14 16 12 Q18 10 20 12" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
          <circle cx="6" cy="15" r="0.5" fill="#ffffff"/>
          <circle cx="18" cy="16" r="0.5" fill="#ffffff"/>
          <circle cx="12" cy="17" r="0.3" fill="#ffffff"/>
          <rect x="8" y="10" width="2" height="1" fill="#ffffff" rx="0.5"/>
          <rect x="14" y="11" width="2" height="1" fill="#ffffff" rx="0.5"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0ea5e9">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#38bdf8"/>
          <path d="M4 12 Q6 14 8 12 Q10 10 12 12 Q14 14 16 12 Q18 10 20 12" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
          <circle cx="6" cy="15" r="0.5" fill="#ffffff"/>
          <circle cx="18" cy="16" r="0.5" fill="#ffffff"/>
          <circle cx="12" cy="17" r="0.3" fill="#ffffff"/>
          <rect x="8" y="10" width="2" height="1" fill="#ffffff" rx="0.5"/>
          <rect x="14" y="11" width="2" height="1" fill="#ffffff" rx="0.5"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#ffffff"/>
          <rect x="17" y="5" width="2" height="2" fill="#ffffff" rx="0.5"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#ffffff"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#ffffff" strokeWidth="1"/>
          <rect x="11" y="9" width="2" height="2" fill="#ffffff" rx="0.5"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#38bdf8">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#0ea5e9"/>
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#ffffff" strokeWidth="1" fill="none"/>
          <circle cx="10" cy="14" r="0.5" fill="#ffffff"/>
          <circle cx="14" cy="16" r="0.5" fill="#ffffff"/>
          <rect x="9" y="12" width="1" height="1" fill="#ffffff" rx="0.5"/>
          <rect x="13" y="13" width="1" height="1" fill="#ffffff" rx="0.5"/>
        </svg>
      )
    }
  },

  forest: {
    name: 'Forest',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#15803d"/>
          <path d="M8 12 Q10 10 12 12 Q14 14 16 12" stroke="#22c55e" strokeWidth="2" fill="none"/>
          <circle cx="6" cy="15" r="1" fill="#22c55e"/>
          <circle cx="18" cy="16" r="1" fill="#22c55e"/>
          <circle cx="12" cy="17" r="0.8" fill="#22c55e"/>
          <path d="M5 15 L7 15 M17 16 L19 16 M11 17 L13 17" stroke="#15803d" strokeWidth="1"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="2" y="7" width="20" height="13" rx="2"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#15803d"/>
          <path d="M8 12 Q10 10 12 12 Q14 14 16 12" stroke="#22c55e" strokeWidth="2" fill="none"/>
          <circle cx="6" cy="15" r="1" fill="#22c55e"/>
          <circle cx="18" cy="16" r="1" fill="#22c55e"/>
          <circle cx="12" cy="17" r="0.8" fill="#22c55e"/>
          <path d="M5 15 L7 15 M17 16 L19 16 M11 17 L13 17" stroke="#15803d" strokeWidth="1"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#22c55e"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#22c55e"/>
          <path d="M16 5 L20 5" stroke="#15803d" strokeWidth="1"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#22c55e"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#22c55e" strokeWidth="1"/>
          <path d="M11 9 L13 9 M11 11 L13 11" stroke="#15803d" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <path d="M14 2v6h6" fill="#15803d"/>
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
          <circle cx="10" cy="14" r="0.8" fill="#22c55e"/>
          <circle cx="14" cy="16" r="0.8" fill="#22c55e"/>
          <path d="M9 14 L11 14 M13 16 L15 16" stroke="#15803d" strokeWidth="1"/>
        </svg>
      )
    }
  },

  sunset: {
    name: 'Sunset',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316"/>
              <stop offset="50%" stopColor="#fb923c"/>
              <stop offset="100%" stopColor="#fed7aa"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#sunsetGrad1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316"/>
          <circle cx="12" cy="12" r="2" fill="#fbbf24"/>
          <path d="M8 16 Q12 18 16 16" stroke="#f97316" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316"/>
              <stop offset="50%" stopColor="#fb923c"/>
              <stop offset="100%" stopColor="#fed7aa"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#sunsetGrad2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316"/>
          <circle cx="12" cy="12" r="2" fill="#fbbf24"/>
          <path d="M8 16 Q12 18 16 16" stroke="#f97316" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#fbbf24"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#fbbf24"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#fbbf24"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#fbbf24" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316"/>
              <stop offset="100%" stopColor="#fb923c"/>
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#sunsetGrad3)"/>
          <path d="M14 2v6h6" fill="#f97316"/>
          <circle cx="12" cy="12" r="1.5" fill="#fbbf24"/>
          <path d="M8 16 Q12 18 16 16" stroke="#fbbf24" strokeWidth="1" fill="none"/>
        </svg>
      )
    }
  },

  matrix: {
    name: 'Matrix',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#001100"/>
          <text x="8" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">01</text>
          <text x="12" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">10</text>
          <text x="16" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">11</text>
          <text x="6" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">010</text>
          <text x="14" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">101</text>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#001100"/>
          <text x="8" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">01</text>
          <text x="12" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">10</text>
          <text x="16" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">11</text>
          <text x="6" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">010</text>
          <text x="14" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">101</text>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <text x="18" y="7" fontSize="2" fill="#00ff00" fontFamily="monospace">$</text>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <text x="11" y="11" fontSize="2" fill="#00ff00" fontFamily="monospace">RDP</text>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="6" y="2" width="12" height="20" rx="1"/>
          <path d="M14 2v6h6" fill="#001100"/>
          <text x="8" y="10" fontSize="2" fill="#00ff00" fontFamily="monospace">FILE</text>
          <text x="8" y="13" fontSize="1.5" fill="#00ff00" fontFamily="monospace">001</text>
          <text x="8" y="15" fontSize="1.5" fill="#00ff00" fontFamily="monospace">110</text>
        </svg>
      )
    }
  },

  neon: {
    name: 'Neon',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow1">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#neonGlow1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" filter="url(#neonGlow1)"/>
          <circle cx="12" cy="12" r="1.5" fill="#ffff00" filter="url(#neonGlow1)"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow2">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#neonGlow2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" filter="url(#neonGlow2)"/>
          <circle cx="12" cy="12" r="1.5" fill="#ffff00" filter="url(#neonGlow2)"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow3">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#neonGlow3)"/>
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#neonGlow3)"/>
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#neonGlow3)"/>
          <path d="M6 7h12M6 11h8M6 15h6" filter="url(#neonGlow3)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow4">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#neonGlow4)"/>
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#neonGlow4)"/>
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#neonGlow4)"/>
          <circle cx="12" cy="10" r="3" filter="url(#neonGlow4)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow5">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" filter="url(#neonGlow5)"/>
          <path d="M14 2v6h6" filter="url(#neonGlow5)"/>
        </svg>
      )
    }
  },

  gradient: {
    name: 'Gradient',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea"/>
              <stop offset="100%" stopColor="#764ba2"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#grad1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#667eea"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.8"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea"/>
              <stop offset="100%" stopColor="#764ba2"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#grad2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#667eea"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.8"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea"/>
              <stop offset="100%" stopColor="#764ba2"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#grad3)"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#grad3)"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#grad3)"/>
          <path d="M6 7h12M6 11h8M6 15h6" stroke="url(#grad3)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#764ba2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#764ba2"/>
              <stop offset="100%" stopColor="#667eea"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#grad4)"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#grad4)"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#grad4)"/>
          <circle cx="12" cy="10" r="3" stroke="url(#grad4)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#764ba2"/>
              <stop offset="100%" stopColor="#667eea"/>
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#grad5)"/>
          <path d="M14 2v6h6" fill="#667eea"/>
          <rect x="8" y="8" width="8" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="8" y="10" width="6" height="1" fill="#ffffff" opacity="0.8"/>
        </svg>
      )
    }
  },


  rainbow: {
    name: 'Rainbow',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="13" rx="2" fill="#ef4444"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316"/>
          <rect x="4" y="9" width="16" height="1" fill="#eab308"/>
          <rect x="4" y="11" width="16" height="1" fill="#22c55e"/>
          <rect x="4" y="13" width="16" height="1" fill="#3b82f6"/>
          <rect x="4" y="15" width="16" height="1" fill="#8b5cf6"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="13" rx="2" fill="#ef4444"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316"/>
          <rect x="4" y="9" width="16" height="1" fill="#eab308"/>
          <rect x="4" y="11" width="16" height="1" fill="#22c55e"/>
          <rect x="4" y="13" width="16" height="1" fill="#3b82f6"/>
          <rect x="4" y="15" width="16" height="1" fill="#8b5cf6"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#ff8000"/>
          <circle cx="18" cy="8" r="1" fill="#ffff00"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0080ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <rect x="10" y="8" width="4" height="1" fill="#8000ff"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="6" y="2" width="12" height="20" rx="2" fill="#8000ff"/>
          <path d="M14 2v6h6" fill="#ff0000"/>
          <rect x="8" y="8" width="8" height="1" fill="#ff8000"/>
          <rect x="8" y="10" width="8" height="1" fill="#ffff00"/>
          <rect x="8" y="12" width="8" height="1" fill="#00ff00"/>
          <rect x="8" y="14" width="8" height="1" fill="#0080ff"/>
        </svg>
      )
    }
  },

  metallic: {
    name: 'Metallic',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c0c0c0"/>
              <stop offset="50%" stopColor="#808080"/>
              <stop offset="100%" stopColor="#404040"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#metalGrad1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#c0c0c0"/>
          <rect x="4" y="10" width="16" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="4" y="12" width="12" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="4" y="14" width="14" height="1" fill="#ffffff" opacity="0.8"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c0c0c0"/>
              <stop offset="50%" stopColor="#808080"/>
              <stop offset="100%" stopColor="#404040"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#metalGrad2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#c0c0c0"/>
          <rect x="4" y="10" width="16" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="4" y="12" width="12" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="4" y="14" width="14" height="1" fill="#ffffff" opacity="0.8"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <rect x="18" y="4" width="2" height="2" fill="#c0c0c0"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <rect x="10" y="8" width="4" height="1" fill="#ffffff"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#808080"/>
              <stop offset="50%" stopColor="#404040"/>
              <stop offset="100%" stopColor="#c0c0c0"/>
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="1" fill="url(#metalGrad3)"/>
          <path d="M14 2v6h6" fill="#c0c0c0"/>
          <rect x="8" y="8" width="8" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="8" y="10" width="6" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="8" y="12" width="8" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="8" y="14" width="4" height="1" fill="#ffffff" opacity="0.8"/>
        </svg>
      )
    }
  },

  holographic: {
    name: 'Holographic',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="holoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0080"/>
              <stop offset="33%" stopColor="#8000ff"/>
              <stop offset="66%" stopColor="#0080ff"/>
              <stop offset="100%" stopColor="#00ff80"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#holoGrad1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff0080"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.7"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="holoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0080"/>
              <stop offset="33%" stopColor="#8000ff"/>
              <stop offset="66%" stopColor="#0080ff"/>
              <stop offset="100%" stopColor="#00ff80"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#holoGrad2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff0080"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.7"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff0080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="holoGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff0080"/>
              <stop offset="50%" stopColor="#8000ff"/>
              <stop offset="100%" stopColor="#00ff80"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#holoGrad3)"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#holoGrad3)"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#holoGrad3)"/>
          <path d="M6 7h12M6 11h8M6 15h6" stroke="url(#holoGrad3)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8000ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="holoGrad4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8000ff"/>
              <stop offset="50%" stopColor="#0080ff"/>
              <stop offset="100%" stopColor="#00ff80"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#holoGrad4)"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#holoGrad4)"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#holoGrad4)"/>
          <circle cx="12" cy="10" r="3" stroke="url(#holoGrad4)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="holoGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ff80"/>
              <stop offset="33%" stopColor="#0080ff"/>
              <stop offset="66%" stopColor="#8000ff"/>
              <stop offset="100%" stopColor="#ff0080"/>
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#holoGrad5)"/>
          <path d="M14 2v6h6" fill="#ff0080"/>
          <rect x="8" y="8" width="8" height="1" fill="#ffffff" opacity="0.8"/>
          <rect x="8" y="10" width="6" height="1" fill="#ffffff" opacity="0.8"/>
        </svg>
      )
    }
  },

  glitch: {
    name: 'Glitch',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a855f7">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#06b6d4"/>
          <rect x="3" y="10" width="2" height="1" fill="#22c55e"/>
          <rect x="6" y="10" width="3" height="1" fill="#22c55e"/>
          <rect x="10" y="10" width="1" height="1" fill="#22c55e"/>
          <rect x="12" y="10" width="2" height="1" fill="#22c55e"/>
          <rect x="15" y="10" width="4" height="1" fill="#22c55e"/>
          <rect x="4" y="12" width="4" height="1" fill="#ef4444"/>
          <rect x="9" y="12" width="2" height="1" fill="#ef4444"/>
          <rect x="12" y="12" width="5" height="1" fill="#ef4444"/>
          <rect x="18" y="12" width="2" height="1" fill="#ef4444"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a855f7">
          <rect x="2" y="7" width="20" height="13" rx="1"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#06b6d4"/>
          <rect x="3" y="10" width="2" height="1" fill="#22c55e"/>
          <rect x="6" y="10" width="3" height="1" fill="#22c55e"/>
          <rect x="10" y="10" width="1" height="1" fill="#22c55e"/>
          <rect x="12" y="10" width="2" height="1" fill="#22c55e"/>
          <rect x="15" y="10" width="4" height="1" fill="#22c55e"/>
          <rect x="4" y="12" width="4" height="1" fill="#ef4444"/>
          <rect x="9" y="12" width="2" height="1" fill="#ef4444"/>
          <rect x="12" y="12" width="5" height="1" fill="#ef4444"/>
          <rect x="18" y="12" width="2" height="1" fill="#ef4444"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <rect x="18" y="4" width="2" height="2" fill="#00ffff"/>
          <rect x="17" y="5" width="1" height="1" fill="#ff0000"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <rect x="10" y="8" width="4" height="1" fill="#ff0000"/>
          <rect x="11" y="9" width="2" height="1" fill="#00ff00"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#00ffff">
          <rect x="6" y="2" width="12" height="20" rx="1"/>
          <path d="M14 2v6h6" fill="#ff00ff"/>
          <rect x="7" y="8" width="2" height="1" fill="#ff0000"/>
          <rect x="10" y="8" width="3" height="1" fill="#ff0000"/>
          <rect x="14" y="8" width="2" height="1" fill="#ff0000"/>
          <rect x="17" y="8" width="1" height="1" fill="#ff0000"/>
          <rect x="8" y="10" width="4" height="1" fill="#00ff00"/>
          <rect x="13" y="10" width="3" height="1" fill="#00ff00"/>
          <rect x="17" y="10" width="1" height="1" fill="#00ff00"/>
        </svg>
      )
    }
  },

  vaporwave: {
    name: 'Vaporwave',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff"/>
              <stop offset="50%" stopColor="#00ffff"/>
              <stop offset="100%" stopColor="#ff0080"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#vaporGrad1)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff00ff"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.9"/>
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff"/>
              <stop offset="50%" stopColor="#00ffff"/>
              <stop offset="100%" stopColor="#ff0080"/>
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#vaporGrad2)"/>
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff00ff"/>
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.9"/>
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 7h12M6 11h8M6 15h6"/>
          <circle cx="18" cy="6" r="1" fill="#00ffff"/>
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#00ffff"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
          <circle cx="12" cy="10" r="1" fill="#ff00ff"/>
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#ff00ff" strokeWidth="1"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0080"/>
              <stop offset="50%" stopColor="#ff00ff"/>
              <stop offset="100%" stopColor="#00ffff"/>
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#vaporGrad3)"/>
          <path d="M14 2v6h6" fill="#ff00ff"/>
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" opacity="0.9"/>
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.8"/>
        </svg>
      )
    }
  }
}; 
