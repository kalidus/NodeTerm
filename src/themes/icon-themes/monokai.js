import React from 'react';

const theme = {
  name: 'Monokai',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#f92672"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#fd971f" /></svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#f92672"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#fd971f" /></svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fd971f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ad9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a6e22e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" />
          <circle cx="12" cy="10" r="2" fill="#a6e22e" opacity="0.3" />
          <circle cx="12" cy="10" r="1.2" fill="#a6e22e" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#272822"><rect x="6" y="2" width="12" height="20" rx="2" /><rect x="8" y="4" width="8" height="14" fill="#a6e22e" /></svg>
  }
};

export default theme;
