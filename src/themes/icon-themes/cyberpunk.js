import React from 'react';

const theme = {
  name: 'Cyberpunk',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f600ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="cyberGlowFold">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M2 6h7l2-2h11v16H2V6z" fill="#f600ff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f600ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6h7l2-2h11v16H2V6z" fill="#f600ff" fillOpacity="0.2" filter="url(#cyberGlowFold)" />
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
          <path d="M12 13h6" stroke="#00ffff" strokeWidth="1" filter="url(#cyberGlowFold)" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <path d="M6 7h12M6 11h8M6 15h6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <circle cx="12" cy="10" r="3" stroke="#f600ff" strokeWidth="2" filter="url(#cyberGlowFold)" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlowFold)" />
          <ellipse cx="12" cy="10" rx="4" ry="3" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlowFold)" />
          <circle cx="12" cy="10" r="1.5" fill="#00ffff" filter="url(#cyberGlowFold)" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="#ffe600" fillOpacity="0.05" filter="url(#cyberGlowFold)" />
          <polyline points="13 2 13 9 20 9" filter="url(#cyberGlowFold)" />
        </svg>
  }
};

export default theme;
