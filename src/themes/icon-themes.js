import React from 'react';
// Estructura de temas de iconos locales (SVG inline)
export const iconThemes = {
  cyberpunk: {
    name: 'Cyberpunk',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h7l2 2h11v14H2V4z" strokeLinejoin="miter"/></svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h7l2 2h11v14H2V4z" strokeLinejoin="miter"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/>
          <path d="M6 10l3 3-3 3M11 16h7" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="13" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/>
          <path d="M7 21h10M12 16v5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
          <rect x="6" y="6" width="12" height="7" fill="currentColor" fillOpacity="0.2"/>
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="13" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/>
          <circle cx="12" cy="10.5" r="3" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="10.5" r="1" fill="currentColor"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H4v20h16V9l-7-7z" strokeLinejoin="miter"/></svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H4v20h16V9l-7-7z" strokeLinejoin="miter"/>
          <rect x="9" y="13" width="6" height="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H4v20h16V9l-7-7z" strokeLinejoin="miter"/>
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H4v20h16V9l-7-7z" strokeLinejoin="miter"/>
          <path d="M9 15l3-3 3 3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      password: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="10" strokeLinejoin="miter"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinejoin="miter"/>
          <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="miter"/>
        </svg>
      )
    }
  },
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00c853"/>
              <stop offset="100%" stopColor="#64dd17"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#materialVNC)" opacity="0.1"/>
          <rect x="2" y="3" width="20" height="14" rx="3" stroke="url(#materialVNC)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="url(#materialVNC)" opacity="0.15"/>
          {/* Ojo/símbolo de visualización VNC */}
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#materialVNC)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="1.8" fill="url(#materialVNC)"/>
          <circle cx="12" cy="10" r="1" fill="#fff"/>
          <path d="M8 20l4 2 4-2" stroke="url(#materialVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9800"/>
              <stop offset="100%" stopColor="#ffb74d"/>
            </linearGradient>
          </defs>
          {/* Archivo con candado */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialSFTP)" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#materialSFTP)" strokeWidth="1.5"/>
          {/* Candado de seguridad */}
          <rect x="8" y="12" width="8" height="6" rx="1" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none"/>
          <rect x="9" y="15" width="6" height="3" rx="0.5" stroke="url(#materialSFTP)" strokeWidth="1" fill="url(#materialSFTP)" opacity="0.3"/>
          <circle cx="12" cy="13.5" r="1.5" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2196f3"/>
              <stop offset="100%" stopColor="#64b5f6"/>
            </linearGradient>
          </defs>
          {/* Archivo con flechas de transferencia */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialFTP)" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialFTP)" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#materialFTP)" strokeWidth="1.5"/>
          {/* Flechas de transferencia */}
          <path d="M8 12l3-3 3 3" stroke="url(#materialFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16l3 3 3-3" stroke="url(#materialFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSCP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4caf50"/>
              <stop offset="100%" stopColor="#81c784"/>
            </linearGradient>
          </defs>
          {/* Archivo con terminal y flecha */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialSCP)" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialSCP)" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#materialSCP)" strokeWidth="1.5"/>
          {/* Terminal pequeño */}
          <rect x="7" y="10" width="6" height="4" rx="1" stroke="url(#materialSCP)" strokeWidth="1" fill="none"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="url(#materialSCP)"/>
          {/* Flecha de copia */}
          <path d="M16 14l2 2 2-2" stroke="url(#materialSCP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="vncGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff00" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#00ff00" stopOpacity="0.1"/>
            </linearGradient>
            <pattern id="vncTexture" patternUnits="userSpaceOnUse" width="3" height="3">
              <rect width="3" height="3" fill="#1a1a1a"/>
              <circle cx="1.5" cy="1.5" r="0.4" fill="#2a2a2a" opacity="0.4"/>
            </pattern>
          </defs>
          <rect x="1" y="2" width="18" height="16" rx="2.5" fill="#2a2a2a" stroke="#666" strokeWidth="0.8"/>
          <rect x="1" y="2" width="18" height="4" rx="2.5" fill="#3a3a3a" stroke="#666" strokeWidth="0.8"/>
          <circle cx="3.5" cy="4" r="1.3" fill="#00ff00"/>
          <circle cx="6.5" cy="4" r="1.3" fill="#00ff00"/>
          <circle cx="9.5" cy="4" r="1.3" fill="#00ff00"/>
          <rect x="4" y="7" width="12" height="9" rx="1.5" fill="#1a1a1a" stroke="#00ff00" strokeWidth="0.8"/>
          <rect x="4" y="7" width="12" height="2.5" rx="1.5" fill="#2a2a2a" stroke="#00ff00" strokeWidth="0.8"/>
          <rect x="4.5" y="9.5" width="11" height="6" rx="1" fill="url(#vncTexture)"/>
          {/* Símbolo de ojo/visualización VNC */}
          <ellipse cx="10" cy="12" rx="2.5" ry="1.8" fill="none" stroke="#00ff00" strokeWidth="1.2"/>
          <circle cx="10" cy="12" r="1.5" fill="#00ff00" opacity="0.6"/>
          <circle cx="10" cy="12" r="0.8" fill="#fff"/>
          <rect x="11" y="12" width="3.5" height="2" rx="0.5" fill="#00ff00"/>
          <text x="12.7" y="13.2" fontSize="1.8" fill="white" fontFamily="monospace" fontWeight="bold" textAnchor="middle">VNC</text>
          <rect x="1" y="17" width="18" height="1" fill="url(#vncGlow)" rx="0.5"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#605e5c"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#fff"/></svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="fluentSFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0078d4"/>
              <stop offset="100%" stopColor="#106ebe"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#0078d4" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="#0078d4" strokeWidth="1.5"/>
          <rect x="8" y="12" width="8" height="6" rx="1" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
          <rect x="9" y="15" width="6" height="3" rx="0.5" stroke="#0078d4" strokeWidth="1" fill="#0078d4" opacity="0.3"/>
          <circle cx="12" cy="13.5" r="1.5" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="fluentFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0078d4"/>
              <stop offset="100%" stopColor="#106ebe"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#0078d4" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="#0078d4" strokeWidth="1.5"/>
          <path d="M8 12l3-3 3 3" stroke="#0078d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16l3 3 3-3" stroke="#0078d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="fluentSCP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0078d4"/>
              <stop offset="100%" stopColor="#106ebe"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#0078d4" opacity="0.1"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
          <polyline points="14 2 14 8 20 8" stroke="#0078d4" strokeWidth="1.5"/>
          <rect x="7" y="10" width="6" height="4" rx="1" stroke="#0078d4" strokeWidth="1" fill="none"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#0078d4"/>
          <path d="M16 14l2 2 2-2" stroke="#0078d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#00ff00" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#00ff00"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3be8c"/>
              <stop offset="100%" stopColor="#8fbcbb"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3b4252" stroke="url(#nordVNC)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#2e3440"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#nordVNC)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="2" fill="#a3be8c" opacity="0.4"/>
          <circle cx="12" cy="10" r="1.3" fill="#8fbcbb"/>
          <circle cx="12" cy="10" r="0.7" fill="#eceff4"/>
          <path d="M8 20l4 2 4-2" stroke="url(#nordVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ebcb8b"/>
              <stop offset="100%" stopColor="#d08770"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordSFTP)" strokeWidth="1.5"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#nordSFTP)" strokeWidth="1.5"/>
          <rect x="8" y="12" width="8" height="6" rx="1" stroke="url(#nordSFTP)" strokeWidth="1.5" fill="none"/>
          <rect x="9" y="15" width="6" height="3" rx="0.5" stroke="url(#nordSFTP)" strokeWidth="1" fill="#d08770" opacity="0.3"/>
          <circle cx="12" cy="13.5" r="1.5" stroke="url(#nordSFTP)" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#88c0d0"/>
              <stop offset="100%" stopColor="#81a1c1"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordFTP)" strokeWidth="1.5"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#nordFTP)" strokeWidth="1.5"/>
          <path d="M8 12l3-3 3 3" stroke="url(#nordFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16l3 3 3-3" stroke="url(#nordFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSCP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3be8c"/>
              <stop offset="100%" stopColor="#8fbcbb"/>
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordSCP)" strokeWidth="1.5"/>
          <polyline points="14 2 14 8 20 8" stroke="url(#nordSCP)" strokeWidth="1.5"/>
          <rect x="7" y="10" width="6" height="4" rx="1" stroke="url(#nordSCP)" strokeWidth="1" fill="none"/>
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#a3be8c"/>
          <path d="M16 14l2 2 2-2" stroke="url(#nordSCP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#50fa7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#50fa7b" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#50fa7b"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#859900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#859900" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#859900"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#4caf50" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#4caf50"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#4caf50" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#4caf50"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a6e22e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#a6e22e" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#a6e22e"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#98c379" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#98c379" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#98c379"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b8bb26"/>
              <stop offset="100%" stopColor="#98971a"/>
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3c3836" stroke="url(#gruvboxVNC)" strokeWidth="1.5"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#282828"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#gruvboxVNC)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="2" fill="#b8bb26" opacity="0.4"/>
          <circle cx="12" cy="10" r="1.3" fill="#98971a"/>
          <path d="M8 20l4 2 4-2" stroke="url(#gruvboxVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ece6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#9ece6a" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#9ece6a"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c3e88d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#c3e88d" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#c3e88d"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#4caf50" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#4caf50"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="synthwaveVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ff00"/>
              <stop offset="100%" stopColor="#00d4ff"/>
            </linearGradient>
            <filter id="synthwaveVNCGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#0f0f23" stroke="url(#synthwaveVNC)" strokeWidth="1.5" filter="url(#synthwaveVNCGlow)"/>
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#1a1a3a"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#synthwaveVNC)" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="2" fill="#00ff00" opacity="0.4"/>
          <circle cx="12" cy="10" r="1.3" fill="#00d4ff"/>
          <path d="M8 20l4 2 4-2" stroke="url(#synthwaveVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#synthwaveVNCGlow)"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none"/>
          <circle cx="12" cy="10" r="2" fill="#00ff00" opacity="0.3"/>
          <circle cx="12" cy="10" r="1.2" fill="#00ff00"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberVNCGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#cyberVNCGlow)"/>
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#cyberVNCGlow)"/>
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#cyberVNCGlow)"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" filter="url(#cyberVNCGlow)"/>
          <circle cx="12" cy="10" r="2" fill="#00ff41" opacity="0.3" filter="url(#cyberVNCGlow)"/>
          <circle cx="12" cy="10" r="1.2" fill="#00ff41" filter="url(#cyberVNCGlow)"/>
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
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5"/>
          <circle cx="12" cy="10" r="2" fill="#00ff00" opacity="0.2"/>
          <circle cx="12" cy="10" r="1.2" fill="#00ff00"/>
          <text x="10.5" y="11" fontSize="2" fill="#00ff00" fontFamily="monospace">VNC</text>
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
  },

  cyberpunk: {
    name: 'Cyberpunk',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f600ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlowFold">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M2 6h7l2-2h11v16H2V6z" fill="#f600ff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f600ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6h7l2-2h11v16H2V6z" fill="#f600ff" fillOpacity="0.2" filter="url(#cyberGlowFold)" />
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
          <path d="M12 13h6" stroke="#00ffff" strokeWidth="1" filter="url(#cyberGlowFold)" />
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <path d="M6 7h12M6 11h8M6 15h6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <circle cx="12" cy="10" r="3" stroke="#f600ff" strokeWidth="2" filter="url(#cyberGlowFold)" />
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <ellipse cx="12" cy="10" rx="4" ry="3" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
          <circle cx="12" cy="10" r="1.5" fill="#00ffff" filter="url(#cyberGlowFold)" />
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="#ffe600" fillOpacity="0.05" filter="url(#cyberGlowFold)" />
          <polyline points="13 2 13 9 20 9" filter="url(#cyberGlowFold)" />
        </svg>
      )
    }
  },

  glass: {
    name: 'Glassmorphism',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glassIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <path d="M2 10h20" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <path d="M7 8h10M7 12h7" strokeOpacity="0.5" />
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <circle cx="12" cy="10" r="3" strokeOpacity="0.6" />
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <ellipse cx="12" cy="10" rx="4" ry="3" strokeOpacity="0.6" />
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      )
    }
  },

  acrylic: {
    name: 'Acrylic',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <path d="M2 10h20" stroke="#00d2ff" strokeWidth="1" opacity="0.3" />
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M2 10h10l2-2h8" stroke="#00d2ff" strokeWidth="1" />
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="rgba(255,255,255,0.05)" />
          <path d="M7 8h10M7 12h7" opacity="0.5" />
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="rgba(255,255,255,0.05)" />
          <circle cx="12" cy="10" r="3" opacity="0.6" />
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="rgba(255,255,255,0.05)" />
          <ellipse cx="12" cy="10" rx="4" ry="3" opacity="0.6" />
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      )
    }
  },

  neumorphic: {
    name: 'Neumórfico',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f06595" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10z" fill="#000" fillOpacity="0.1" />
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f06595" strokeWidth="2.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10z" />
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <path d="M6 7h12M6 11h8" opacity="0.5" />
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <ellipse cx="12" cy="10" rx="4" ry="3" />
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        </svg>
      )
    }
  },

  fluent: {
    name: 'Fluent',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb900" strokeWidth="1.5">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#ffb900" fillOpacity="0.1" />
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb900" strokeWidth="2">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
          <path d="M4 10h16" opacity="0.5" />
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <path d="M7 8h10M7 12h7" opacity="0.6" />
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <circle cx="12" cy="11" r="3" strokeWidth="2" />
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <ellipse cx="12" cy="11" rx="4" ry="3" strokeWidth="2" />
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#605e5c" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      )
    }
  },

  // ---------------------------------------------------------
  // NEW PREMIUM THEMES (AI GENERATED)
  // ---------------------------------------------------------
  glassmorphism: {
    name: 'Glassmorphism',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFolder" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#4facfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurFolder" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#glassFolder)" filter="url(#blurFolder)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFolderOpen" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#4facfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurFolderOpen">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h5l2 2h8A2.5 2.5 0 0 1 22 9.5v1.5H3L2 19V7.5z" fill="url(#glassFolderOpen)" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.6"/>
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#glassFolderOpen)" filter="url(#blurFolderOpen)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassSsh" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurSsh">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#glassSsh)" filter="url(#blurSsh)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6"/>
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassRdp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#43e97b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38f9d7" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurRdp">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#glassRdp)" filter="url(#blurRdp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6"/>
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8"/>
          <circle cx="12" cy="10.5" r="3" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8"/>
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassVnc" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurVnc">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#glassVnc)" filter="url(#blurVnc)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6"/>
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8"/>
          <ellipse cx="12" cy="10.5" rx="3.5" ry="2.5" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8"/>
          <circle cx="12" cy="10.5" r="1" fill="#ffffff" fillOpacity="0.8"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFile" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a1c4fd" stopOpacity="0.2" />
            </linearGradient>
            <filter id="blurFile">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.1"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassFile)" filter="url(#blurFile)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
        </svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassSftp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fecfef" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurSftp">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassSftp)" filter="url(#blurSftp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <rect x="9" y="13" width="6" height="4" stroke="#ffffff" strokeWidth="1.5" rx="0.5"/>
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#ffffff" strokeWidth="1.5"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFtp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#84fab0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassFtp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassScp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#e0c3fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8ec5fc" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassScp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8"/>
          <path d="M9 15l3-3 3 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  },

  neon_glow: {
    name: 'Neon Glow',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFolder" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M2 7l4-4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolder)" strokeLinejoin="round"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFolderOpen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M2 7l4-4h6l2 2h8v2" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolderOpen)" strokeLinejoin="round"/>
          <path d="M2 10l2.5 10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1L22 10H2z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolderOpen)" strokeLinejoin="round"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowSsh" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="15" rx="2" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSsh)"/>
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ff00ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowSsh)"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowRdp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#39ff14" strokeWidth="1.5" filter="url(#neonGlowRdp)"/>
          <path d="M8 21h8M12 17v4" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" filter="url(#neonGlowRdp)"/>
          <circle cx="12" cy="10" r="3" stroke="#39ff14" strokeWidth="1.5" filter="url(#neonGlowRdp)"/>
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowVnc" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowVnc)"/>
          <path d="M8 21h8M12 17v4" stroke="#ffea00" strokeWidth="1.5" strokeLinecap="round" filter="url(#neonGlowVnc)"/>
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowVnc)"/>
          <circle cx="12" cy="10" r="1" fill="#ffea00" filter="url(#neonGlowVnc)"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFile" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ffffff" strokeWidth="1.5" filter="url(#neonGlowFile)"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" filter="url(#neonGlowFile)"/>
        </svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowSftp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSftp)"/>
          <polyline points="14 2 14 8 20 8" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSftp)"/>
          <rect x="9" y="13" width="6" height="4" stroke="#00ffff" strokeWidth="1.5" rx="0.5" filter="url(#neonGlowSftp)"/>
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowSftp)"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFtp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFtp)"/>
          <polyline points="14 2 14 8 20 8" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFtp)"/>
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowFtp)"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowScp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowScp)"/>
          <polyline points="14 2 14 8 20 8" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowScp)"/>
          <path d="M9 15l3-3 3 3" stroke="#ff00ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowScp)"/>
        </svg>
      )
    }
  },

  cupertino: {
    name: 'Cupertino',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupFolderBack" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#41A2E3" />
              <stop offset="100%" stopColor="#2585C8" />
            </linearGradient>
            <linearGradient id="cupFolderFront" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#7CC0EF" />
              <stop offset="100%" stopColor="#3092D6" />
            </linearGradient>
            <filter id="cupShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1" floodOpacity="0.25"/>
            </filter>
          </defs>
          <path d="M3 6C3 4.89543 3.89543 4 5 4H9.5L12 6.5H19C20.1046 6.5 21 7.39543 21 8.5V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="url(#cupFolderBack)" filter="url(#cupShadow)"/>
          <path d="M3 10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V10Z" fill="url(#cupFolderFront)"/>
          <path d="M3 10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V10.5C21 9.39543 20.1046 8.5 19 8.5H5C3.89543 8.5 3 9.39543 3 10.5V10Z" fill="#ffffff" fillOpacity="0.4"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupFolderOpenBack" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#41A2E3" />
              <stop offset="100%" stopColor="#2585C8" />
            </linearGradient>
            <linearGradient id="cupFolderOpenFront" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#7CC0EF" />
              <stop offset="100%" stopColor="#3092D6" />
            </linearGradient>
            <filter id="cupShadowOpen" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.25"/>
            </filter>
          </defs>
          <path d="M3 6C3 4.89543 3.89543 4 5 4H9.5L12 6.5H19C20.1046 6.5 21 7.39543 21 8.5V12H3V6Z" fill="url(#cupFolderOpenBack)"/>
          <path d="M22.5 11.5H3.5L2 20C2 21.1046 2.89543 22 4 22H19C20.1046 22 21 21.1046 21 20L22.5 11.5Z" fill="url(#cupFolderOpenFront)" filter="url(#cupShadowOpen)"/>
          <path d="M22.5 11.5H3.5L3.2 12.5H22.2L22.5 11.5Z" fill="#ffffff" fillOpacity="0.4"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupSsh" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#2B2D30" />
              <stop offset="100%" stopColor="#1B1C1F" />
            </linearGradient>
            <linearGradient id="cupSshTop" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#4E5157" />
              <stop offset="100%" stopColor="#2B2D30" />
            </linearGradient>
            <filter id="cupShadowSsh" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.3"/>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="16" rx="4" fill="url(#cupSsh)" filter="url(#cupShadowSsh)"/>
          <path d="M2 7C2 4.79086 3.79086 3 6 3H18C20.2091 3 22 4.79086 22 7V8H2V7Z" fill="url(#cupSshTop)"/>
          <circle cx="5" cy="5.5" r="1.5" fill="#FF5F56"/>
          <circle cx="9" cy="5.5" r="1.5" fill="#FFBD2E"/>
          <circle cx="13" cy="5.5" r="1.5" fill="#27C93F"/>
          <path d="M7 11L10 14L7 17M13 17H17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupRdpBack" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#E5E7EB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </linearGradient>
            <linearGradient id="cupRdpScreen" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
            <filter id="cupShadowRdp" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1" floodOpacity="0.2"/>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#cupRdpBack)" filter="url(#cupShadowRdp)"/>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="url(#cupRdpScreen)"/>
          <path d="M8 21H16M12 17V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          <path d="M2 6C2 4.34315 3.34315 3 5 3H19C20.6569 3 22 4.34315 22 6V6.5C22 4.84315 20.6569 3.5 19 3.5H5C3.34315 3.5 2 4.84315 2 6.5V6Z" fill="#ffffff" fillOpacity="0.8"/>
          <circle cx="12" cy="10" r="2.5" fill="#3B82F6"/>
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupVncBack" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#E5E7EB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </linearGradient>
            <linearGradient id="cupVncScreen" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#064E3B" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <filter id="cupShadowVnc" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1" floodOpacity="0.2"/>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#cupVncBack)" filter="url(#cupShadowVnc)"/>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="url(#cupVncScreen)"/>
          <path d="M8 21H16M12 17V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          <path d="M2 6C2 4.34315 3.34315 3 5 3H19C20.6569 3 22 4.34315 22 6V6.5C22 4.84315 20.6569 3.5 19 3.5H5C3.34315 3.5 2 4.84315 2 6.5V6Z" fill="#ffffff" fillOpacity="0.8"/>
          <ellipse cx="12" cy="10" rx="4" ry="3" fill="#10B981" />
          <circle cx="12" cy="10" r="1.5" fill="#ffffff"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupFile" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#E5E7EB" />
            </linearGradient>
            <filter id="cupShadowFile" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.15"/>
            </filter>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="url(#cupFile)" filter="url(#cupShadowFile)"/>
          <path d="M14 2V8H20" fill="#E5E7EB"/>
          <path d="M14 2L20 8H14V2Z" fill="#ffffff"/>
          <path d="M6 4C6 2.89543 6.89543 2 8 2H14V2.5H8C6.89543 2.5 6 3.39543 6 4.5V4Z" fill="#ffffff" fillOpacity="0.8"/>
        </svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupSftp" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
            <filter id="cupShadowSftp" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.15"/>
            </filter>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="url(#cupSftp)" filter="url(#cupShadowSftp)"/>
          <path d="M14 2V8H20" fill="#FDE047"/>
          <path d="M14 2L20 8H14V2Z" fill="#FEF08A"/>
          <rect x="9" y="13" width="6" height="5" rx="1" fill="#713F12"/>
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#713F12" strokeWidth="1.5"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupFtp" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <filter id="cupShadowFtp" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.15"/>
            </filter>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="url(#cupFtp)" filter="url(#cupShadowFtp)"/>
          <path d="M14 2V8H20" fill="#93C5FD"/>
          <path d="M14 2L20 8H14V2Z" fill="#BFDBFE"/>
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cupScp" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="cupShadowScp" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.15"/>
            </filter>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="url(#cupScp)" filter="url(#cupShadowScp)"/>
          <path d="M14 2V8H20" fill="#A7F3D0"/>
          <path d="M14 2L20 8H14V2Z" fill="#D1FAE5"/>
          <path d="M9 15l3-3 3 3" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  },

  // ---------------------------------------------------------
  // ULTRA PREMIUM THEMES
  // ---------------------------------------------------------
  holographic: {
    name: 'Holographic',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFolder1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="50%" stopColor="#fecfef" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFolder2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbc2eb" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#holoFolder1)" filter="url(#holoGlow)"/>
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#holoFolder2)" style={{mixBlendMode: 'overlay'}}/>
          <path d="M3.5 8h17" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8"/>
        </svg>
      ),
      folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFolderOpen1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="50%" stopColor="#fecfef" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFolderOpen2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoGlowOpen">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbc2eb" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h5l2 2h8A2.5 2.5 0 0 1 22 9.5v1.5H3L2 19V7.5z" fill="url(#holoFolderOpen1)" opacity="0.6"/>
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#holoFolderOpen1)" filter="url(#holoGlowOpen)"/>
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#holoFolderOpen2)" style={{mixBlendMode: 'overlay'}}/>
          <path d="M3.5 12h17" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8"/>
        </svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoSsh1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" />
              <stop offset="100%" stopColor="#fbc2eb" />
            </linearGradient>
            <linearGradient id="holoSsh2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#84fab0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoSshGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a18cd1" floodOpacity="0.5"/>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#holoSsh1)" filter="url(#holoSshGlow)"/>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#holoSsh2)" style={{mixBlendMode: 'overlay'}}/>
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      rdp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoRdp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#43e97b" />
              <stop offset="100%" stopColor="#38f9d7" />
            </linearGradient>
            <linearGradient id="holoRdp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoRdpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#43e97b" floodOpacity="0.5"/>
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoRdp1)" filter="url(#holoRdpGlow)"/>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoRdp2)" style={{mixBlendMode: 'overlay'}}/>
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="10.5" r="3" stroke="#ffffff" strokeWidth="1.5"/>
        </svg>
      ),
      vnc: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoVnc1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" />
              <stop offset="100%" stopColor="#fee140" />
            </linearGradient>
            <linearGradient id="holoVnc2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoVncGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fa709a" floodOpacity="0.5"/>
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoVnc1)" filter="url(#holoVncGlow)"/>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoVnc2)" style={{mixBlendMode: 'overlay'}}/>
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
          <ellipse cx="12" cy="10.5" rx="3.5" ry="2.5" stroke="#ffffff" strokeWidth="1.5"/>
          <circle cx="12" cy="10.5" r="1" fill="#ffffff"/>
        </svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFile1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFile2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fecfef" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoFileGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a1c4fd" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFile1)" filter="url(#holoFileGlow)"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFile2)" style={{mixBlendMode: 'overlay'}}/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
      sftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoSftp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="100%" stopColor="#fecfef" />
            </linearGradient>
            <linearGradient id="holoSftp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#43e97b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38f9d7" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoSftpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff9a9e" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoSftp1)" filter="url(#holoSftpGlow)"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoSftp2)" style={{mixBlendMode: 'overlay'}}/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5"/>
          <rect x="9" y="13" width="6" height="4" stroke="#ffffff" strokeWidth="1.5" rx="0.5"/>
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#ffffff" strokeWidth="1.5"/>
        </svg>
      ),
      ftp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFtp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84fab0" />
              <stop offset="100%" stopColor="#8fd3f4" />
            </linearGradient>
            <linearGradient id="holoFtp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoFtpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#84fab0" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFtp1)" filter="url(#holoFtpGlow)"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFtp2)" style={{mixBlendMode: 'overlay'}}/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5"/>
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      scp: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoScp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0c3fc" />
              <stop offset="100%" stopColor="#8ec5fc" />
            </linearGradient>
            <linearGradient id="holoScp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoScpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#e0c3fc" floodOpacity="0.5"/>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoScp1)" filter="url(#holoScpGlow)"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoScp2)" style={{mixBlendMode: 'overlay'}}/>
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5"/>
          <path d="M9 15l3-3 3 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  },

  cyber_blue: {
    name: 'Cyber Blue',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cb_f_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2236" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>
            <filter id="cb_f_glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Cybernetic Geometric Folder Shape */}
          <path d="M3 7l2-2h5l2 2h9v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="url(#cb_f_bg)" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_f_glow)" />
          <path d="M3 9h18M3 11h18" stroke="#00f2fe" strokeWidth="0.5" opacity="0.2" />
          <path d="M21 9l-2-2M3 9l2-2" stroke="#00f2fe" strokeWidth="1" />
          <rect x="7" y="14" width="10" height="1" fill="#00f2fe" opacity="0.4" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cb_fo_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2236" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>
            <filter id="cb_fo_blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H3V7z" fill="#0b0f19" opacity="0.5" />
          <path d="M3 11l1.5 8.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 11H3z" fill="url(#cb_fo_bg)" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_fo_blur)" />
          <path d="M5 13h14" stroke="white" strokeWidth="0.5" opacity="0.1" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="cb_s_glow_v2">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M2 5l2-2h16l2 2v12l-2 2H4l-2-2V5z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M6 9l3 3-3 3M12 15h5" stroke="#00f2fe" strokeWidth="2" strokeLinecap="square" />
          <path d="M2 7h20M2 17h20" stroke="#00f2fe" strokeWidth="0.5" opacity="0.3" />
        </svg>
      ),
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 4h18v13H3V4z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M3 7h18" stroke="#00f2fe" strokeWidth="0.5" opacity="0.3" />
          <circle cx="12" cy="11" r="3" stroke="#00f2fe" strokeWidth="1" />
          <path d="M9 21l2-4h2l2 4" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 4l18 0l0 13l-18 0l0-13z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <rect x="7" y="8" width="10" height="6" stroke="#00f2fe" strokeWidth="1" />
          <circle cx="12" cy="11" r="1.5" fill="#00f2fe" />
          <path d="M9 21l2-4h2l2 4" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M13 3v6h6" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M8 13h8M8 16h5" stroke="#00f2fe" strokeWidth="1" opacity="0.5" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M9 14l3 3 3-3M12 11v6" stroke="#00f2fe" strokeWidth="1.5" />
          <rect x="3" y="19" width="18" height="2" fill="#00f2fe" opacity="0.2" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M12 12l-3 3 3 3M15 12l3 3-3 3" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M8 15l4-4 4 4" stroke="#00f2fe" strokeWidth="2" strokeLinecap="square" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 11h14v9H5v-9z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#00f2fe" strokeWidth="1.5" />
          <circle cx="12" cy="15.5" r="1" fill="#00f2fe" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l-8 5 8 5 8-5-8-5z" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M4 12l8 4 8-4M4 17l8 4 8-4" stroke="#00f2fe" strokeWidth="1.5" opacity="0.5" />
        </svg>
      )
    }
  },

  aurora: {
    name: 'Aurora Borealis',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="au_f_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1e4a" />
              <stop offset="100%" stopColor="#0a0a26" />
            </linearGradient>
            <linearGradient id="au_f_grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8A2BE2" />
              <stop offset="50%" stopColor="#00FFFF" />
              <stop offset="100%" stopColor="#00FA9A" />
            </linearGradient>
            <filter id="au_f_glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Organic Fluid Folder Shape */}
          <path d="M4 7C4 5 6 4 8 4h3l3 3h6c2 0 3 1 3 3v8c0 2-1 3-3 3H7c-2 0-3-1-3-3V7z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" filter="url(#au_f_glow)" />
          <path d="M5 10c4-2 10 2 14 0" stroke="white" strokeWidth="0.5" opacity="0.3" strokeLinecap="round" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H3V7z" fill="#0a0a26" opacity="0.5" />
          <path d="M3 11l1.5 8.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 11H3z" fill="url(#au_f_bg)" stroke="#00FFFF" strokeWidth="1.5" style={{filter: 'drop-shadow(0 0 4px #00FFFF)'}} />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Organic Rounded Screen Shape */}
          <path d="M4 6c0-2 2-3 4-3h8c2 0 4 1 4 3v10c0 2-2 3-4 3H8c-2 0-4-1-4-3V6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" filter="url(#au_f_glow)" />
          <path d="M8 10l3 3-3 3M13 16h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 5c0-2 2-2 4-2h6c2 0 4 0 4 2v9c0 2-2 2-4 2H9c-2 0-4 0-4-2V5z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M9 20c4-1 10 1 12 0" stroke="url(#au_f_grad)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 6c0-2 2-2 4-2h8c2 0 4 0 4 2v10c0 2-2 2-4 2H8c-2 0-4 0-4-2V6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <ellipse cx="12" cy="11" rx="5" ry="3" stroke="white" strokeWidth="1.5" />
          <path d="M12 20v-2" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" />
          <path d="M14 3c0 2 1 6 6 6" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <circle cx="12" cy="14" r="3" stroke="white" strokeWidth="1.5" />
          <path d="M12 12v4M10 14h4" stroke="white" strokeWidth="1" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M9 13l3-3 3 3M12 10v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M8 15c2-2 6-2 8 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 11c0-1 1-2 2-2h8c1 0 2 1 2 2v7c0 1-1 2-2 2H8c-1 0-2-1-2-2v-7z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" />
          <path d="M9 9V7c0-2 1-3 3-3s3 1 3 3v2" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="url(#au_f_grad)" strokeWidth="2" filter="url(#au_f_glow)" />
        </svg>
      )
    }
  },

  ghost_ui: {
    name: 'Ghost UI',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="ghost_glow_v5" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke="white" strokeWidth="0.8" strokeLinejoin="round" filter="url(#ghost_glow_v5)" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v2H3V8c0-1.1.9-2 2-2z" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <path d="M3 10l2 10h14l2-10H3z" fill="rgba(255,255,255,0.03)" stroke="white" strokeWidth="0.8" strokeLinejoin="round" style={{backdropFilter: 'blur(3px)'}} filter="url(#ghost_glow_v5)" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M8 10l2 2-2 2M13 14h3" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </svg>
      ),
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M12 8v4M10 10l2 2 2-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="14" x2="15" y2="14" stroke="white" strokeWidth="0.6" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <circle cx="12" cy="11" r="2.5" stroke="white" strokeWidth="0.8" />
          <path d="M12 13.5V15M10 15h4" stroke="white" strokeWidth="0.6" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.8" strokeLinejoin="round" filter="url(#ghost_glow_v5)" />
          <path d="M14 4v6h6" stroke="white" strokeWidth="0.6" opacity="0.4" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M12 11v6M10 15l2 2 2-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M12 17v-6M14 13.5l-2-2-2 2" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M10 14l2-2 2 2M12 12v5" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="11" width="12" height="8" rx="2" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M9 11V8c0-1.7 1.3-3 3-3s3 1.3 3 3v3" stroke="white" strokeWidth="0.6" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="0.6" opacity="0.2" />
          <path d="M12 4.5l7 7.5-7 7.5-7-7.5 7-7.5z" stroke="white" strokeWidth="1" filter="url(#ghost_glow_v5)" />
        </svg>
      )
    }
  },

  neon_matrix: {
    name: 'Neon Matrix',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="nm_glow_new">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Segmented Digital Folder Shape */}
          <rect x="3" y="5" width="6" height="2" fill="#001500" stroke="#39ff14" strokeWidth="1" filter="url(#nm_glow_new)" />
          <rect x="10" y="7" width="11" height="2" fill="#001500" stroke="#39ff14" strokeWidth="1" />
          <rect x="3" y="9" width="18" height="11" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <rect x="5" y="12" width="1" height="1" fill="#39ff14" />
          <rect x="7" y="12" width="1" height="1" fill="#39ff14" opacity="0.4" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="4" fill="#001500" stroke="#006400" strokeWidth="1.5" />
          <rect x="3" y="10" width="18" height="10" fill="#001500" stroke="#39ff14" strokeWidth="2" filter="url(#nm_glow_new)" />
          <path d="M5 13h14M5 16h14" stroke="#39ff14" strokeWidth="0.5" opacity="0.3" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Pixel Terminal Shape */}
          <path d="M2 4h20v14H2V4z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <rect x="5" y="7" width="2" height="2" fill="#39ff14" />
          <rect x="7" y="9" width="2" height="2" fill="#39ff14" />
          <rect x="5" y="11" width="2" height="2" fill="#39ff14" />
          <rect x="11" y="13" width="6" height="2" fill="#39ff14" />
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 4h20v13H2V4z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <rect x="10" y="8" width="4" height="4" stroke="#39ff14" strokeWidth="1" />
          <path d="M5 21h14M12 17v4" stroke="#39ff14" strokeWidth="1.5" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 4h20v13H2V4z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <rect x="7" y="8" width="10" height="6" stroke="#39ff14" strokeWidth="1" />
          <rect x="11" y="10" width="2" height="2" fill="#39ff14" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H4v18h16V9l-6-6z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <path d="M14 3v6h6" stroke="#39ff14" strokeWidth="1.5" />
          <rect x="7" y="12" width="10" height="1" fill="#39ff14" opacity="0.3" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H4v18h16V9l-6-6z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" />
          <rect x="9" y="13" width="6" height="4" stroke="#39ff14" strokeWidth="1" />
          <path d="M12 11v6" stroke="#39ff14" strokeWidth="1" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H4v18h16V9l-6-6z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" />
          <path d="M8 14h8M12 11v6" stroke="#39ff14" strokeWidth="1" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H4v18h16V9l-6-6z" fill="#001500" stroke="#39ff14" strokeWidth="1.5" />
          <path d="M9 16l3-3 3 3" stroke="#39ff14" strokeWidth="2" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="9" fill="#001500" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <path d="M8 11V8h8v3" stroke="#39ff14" strokeWidth="1.5" />
          <rect x="11" y="15" width="2" height="2" fill="#39ff14" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l10 5-10 5L2 7l10-5z" stroke="#39ff14" strokeWidth="1.5" filter="url(#nm_glow_new)" />
          <path d="M2 12l10 5 10-5M2 17l10 5 10-5" stroke="#39ff14" strokeWidth="1" opacity="0.3" />
        </svg>
      )
>
        </svg>
      )
    }
  },

  obsidian_glass: {
    name: 'Obsidian Glass',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Heavy 3D Beveled Folder Shape */}
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <rect x="6" y="9" width="12" height="1" fill="white" opacity="0.1" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v2H4V6z" fill="#000" stroke="#333" strokeWidth="2" />
          <path d="M4 10l2 10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l2-10H4z" fill="#111" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="14" rx="1" fill="#0a0a0a" stroke="#444" strokeWidth="2" />
          <rect x="3" y="4" width="18" height="14" rx="1" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M7 9l3 3-3 3M13 15h4" stroke="white" strokeWidth="2" />
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <circle cx="12" cy="11" r="3" stroke="white" strokeWidth="1.5" />
          <path d="M8 21h8" stroke="#444" strokeWidth="2" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <ellipse cx="12" cy="11" rx="5" ry="3" stroke="white" strokeWidth="1.2" />
          <path d="M12 17v4" stroke="#444" strokeWidth="2" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M14 3v4h4" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2" />
          <rect x="9" y="13" width="6" height="4" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2" />
          <path d="M9 14h6M12 11l-3 3 3 3" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M9 16l3-3 3 3" stroke="white" strokeWidth="2" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="9" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4L4 10l8 6 8-6-8-6z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M4 14l8 6 8-6" stroke="#444" strokeWidth="2" />
        </svg>
      )
>
        </svg>
      )
    }
  },

  crimson_tech: {
    name: 'Crimson Tech',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cr_f_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a0505" />
              <stop offset="100%" stopColor="#1a0000" />
            </linearGradient>
            <filter id="cr_f_glow_v2">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Angular stealth folder shape */}
          <path d="M2 8l4-4h6l4 4h6v12l-2 2H4l-2-2V8z" fill="url(#cr_f_bg)" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M2 10h20M2 14h20" stroke="#ff0844" strokeWidth="0.5" opacity="0.3" />
          <path d="M6 4v4M12 4v4" stroke="#ff0844" strokeWidth="1" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 8l4-4h6l4 4h6v2H2V8z" fill="#1a0000" stroke="#ff0844" strokeWidth="1" />
          <path d="M2 10l3 11h14l3-11H2z" fill="url(#cr_f_bg)" stroke="#ff0844" strokeWidth="2" filter="url(#cr_f_glow_v2)" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Tactical Terminal Shape */}
          <path d="M3 4h18v14H3V4z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M7 9l4 3-4 3" stroke="#ffb199" strokeWidth="2" strokeLinecap="square" />
          <rect x="12" y="14" width="5" height="2" fill="#ffb199" />
          <path d="M3 6h18M3 16h18" stroke="#ff0844" strokeWidth="0.5" opacity="0.4" />
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 5h20v12H2V5z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M12 21l-3-4h6l-3 4z" fill="#ff0844" />
          <circle cx="12" cy="11" r="3" stroke="#ffb199" strokeWidth="1.5" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 5h20v12H2V5z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M6 8l12 0l-6 6l-6-6z" fill="#ff0844" opacity="0.3" />
          <rect x="11" y="10" width="2" height="2" fill="#ffb199" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5l-3 3v15h16V9l-4-6z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M14 3v6h6" stroke="#ff0844" strokeWidth="1.5" />
          <path d="M5 13h10M5 16h7" stroke="#ff0844" strokeWidth="0.5" opacity="0.4" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5l-3 3v15h16V9l-4-6z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" />
          <rect x="9" y="13" width="6" height="4" stroke="#ffb199" strokeWidth="1.5" />
          <path d="M12 11v6" stroke="#ffb199" strokeWidth="1.5" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5l-3 3v15h16V9l-4-6z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" />
          <path d="M8 14h8M12 11l-3 3 3 3" stroke="#ffb199" strokeWidth="1.5" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5l-3 3v15h16V9l-4-6z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" />
          <path d="M9 16l3-3 3 3" stroke="#ffb199" strokeWidth="2" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 11h14v9H5v-9z" fill="#1a0505" stroke="#ff0844" strokeWidth="1.5" filter="url(#cr_f_glow_v2)" />
          <path d="M8 11V7l4-3l4 3v4" stroke="#ffb199" strokeWidth="1.5" fill="none" />
          <rect x="11" y="14" width="2" height="3" fill="#ffb199" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 12l10 10l10-10L12 2z" stroke="#ff0844" strokeWidth="2" filter="url(#cr_f_glow_v2)" />
          <path d="M6 12h12M12 6v12" stroke="#ff0844" strokeWidth="0.5" opacity="0.3" />
        </svg>
      )
>
        </svg>
      )
    }
  },

  synthwave: {
    name: 'Synthwave',
    icons: {
      folder: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="synthFolderNew" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff007f" />
              <stop offset="100%" stopColor="#7928ca" />
            </linearGradient>
            <filter id="synthGlowNew">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff007f" />
            </filter>
          </defs>
          {/* Sharp Retro 80s Folder Shape */}
          <path d="M2 6h8l2 2h10v12H2V6z" fill="#120424" stroke="url(#synthFolderNew)" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M2 10h20M2 13h20M2 16h20" stroke="#00d2ff" strokeWidth="0.5" opacity="0.3" />
          <path d="M6 6v14M12 8v12M18 8v12" stroke="#ff007f" strokeWidth="0.2" opacity="0.2" />
        </svg>
      ),
      folderOpen: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 6h8l2 2h10v2H2V6z" stroke="url(#synthFolderNew)" strokeWidth="1.5" />
          <path d="M2 10l2 10h16l2-10H2z" fill="#120424" stroke="#ff007f" strokeWidth="2" filter="url(#synthGlowNew)" />
          <circle cx="12" cy="15" r="3" stroke="#00d2ff" strokeWidth="0.5" opacity="0.5" />
        </svg>
      ),
      ssh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Retro Monitor Shape */}
          <rect x="3" y="4" width="18" height="13" rx="1" fill="#120424" stroke="#7928ca" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M3 7h18M3 10h18M3 13h18" stroke="#ff007f" strokeWidth="0.5" opacity="0.2" />
          <path d="M8 9l2 2-2 2M12 13h4" stroke="#00d2ff" strokeWidth="1.5" />
          <path d="M6 20h12M12 17v3" stroke="#7928ca" strokeWidth="1.5" />
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#120424" stroke="#ff007f" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M4 17l-2 4h20l-2-4H4z" fill="#7928ca" />
          <circle cx="12" cy="10" r="3" stroke="#00d2ff" strokeWidth="1.5" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#120424" stroke="#00d2ff" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M12 17v4M8 21h8" stroke="#ff007f" strokeWidth="2" />
          <ellipse cx="12" cy="10" rx="5" ry="3" stroke="#ff007f" strokeWidth="1.5" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5v18h14V9l-5-6z" fill="#120424" stroke="#ff007f" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M14 3v6h6" stroke="#00d2ff" strokeWidth="1.5" />
          <path d="M8 13h8M8 16h5" stroke="#00d2ff" strokeWidth="1" opacity="0.4" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5v18h14V9l-5-6z" fill="#120424" stroke="#7928ca" strokeWidth="2" />
          <rect x="9" y="13" width="6" height="4" stroke="#00d2ff" strokeWidth="1.5" />
          <path d="M12 11v6" stroke="#ff007f" strokeWidth="2" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5v18h14V9l-5-6z" fill="#120424" stroke="#ff007f" strokeWidth="2" />
          <path d="M9 14h6M12 11l-3 3 3 3" stroke="#00d2ff" strokeWidth="2" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H5v18h14V9l-5-6z" fill="#120424" stroke="#00d2ff" strokeWidth="2" />
          <path d="M9 16l3-3 3 3" stroke="#ff007f" strokeWidth="2.5" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 11h14v9H5v-9z" fill="#120424" stroke="#7928ca" strokeWidth="2" filter="url(#synthGlowNew)" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#ff007f" strokeWidth="2" />
          <rect x="11" y="14" width="2" height="3" fill="#00d2ff" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 12l10 10l10-10L12 2z" stroke="#ff007f" strokeWidth="2" filter="url(#synthGlowNew)" />
          <circle cx="12" cy="12" r="5" stroke="#00d2ff" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      )
>
        </svg>
      )
    }
  }
}; 
