import React from 'react';

const theme = {
  name: 'Crimson Tech',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 8l4-4h6l4 4h6v2H2V8z" fill="#1a0000" stroke="#ff0844" strokeWidth="1" />
          <path d="M2 10l3 11h14l3-11H2z" fill="url(#cr_f_bg)" stroke="#ff0844" strokeWidth="2" filter="url(#cr_f_glow_v2)" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
  }
};

export default theme;
