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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      rdp: <span className="pi pi-desktop" style={{ display: 'inline-block', color: '#007ad9' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      rdp: <span className="pi pi-desktop" style={{ display: 'inline-block', color: '#007ad9' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      rdp: <span className="pi pi-desktop" style={{ display: 'inline-block', color: '#007ad9' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      rdp: <span className="pi pi-desktop" style={{ display: 'inline-block', color: '#007ad9' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      rdp: <span className="pi pi-desktop" style={{ display: 'inline-block', color: '#007ad9' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
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
      ssh: <span className="pi pi-desktop" style={{ display: 'inline-block' }}></span>,
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff6b35"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8" y="4" width="8" height="14" fill="#1a0033"/></svg>
      )
    }
  }
}; 
