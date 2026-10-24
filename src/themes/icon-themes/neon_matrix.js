import React from 'react';

const theme = {
  name: 'Neon Matrix',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="4" fill="#001500" stroke="#006400" strokeWidth="1.5" />
          <rect x="3" y="10" width="18" height="10" fill="#001500" stroke="#39ff14" strokeWidth="2" filter="url(#nm_glow_new)" />
          <path d="M5 13h14M5 16h14" stroke="#39ff14" strokeWidth="0.5" opacity="0.3" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
  }
};

export default theme;
