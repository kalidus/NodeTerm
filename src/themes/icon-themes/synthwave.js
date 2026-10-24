import React from 'react';

const theme = {
  name: 'Synthwave',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 6h8l2 2h10v2H2V6z" stroke="url(#synthFolderNew)" strokeWidth="1.5" />
          <path d="M2 10l2 10h16l2-10H2z" fill="#120424" stroke="#ff007f" strokeWidth="2" filter="url(#synthGlowNew)" />
          <circle cx="12" cy="15" r="3" stroke="#00d2ff" strokeWidth="0.5" opacity="0.5" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
  }
};

export default theme;
