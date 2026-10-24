import React from 'react';

const theme = {
  name: 'Cyberpunk',
  description: 'Estilo futurista con colores neón vibrantes y formas angulares',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="cyberGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <path d="M12 8v8M8 12h8" stroke="#f600ff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6h7l2-2h11v16H2V6z" stroke="#f600ff" strokeWidth="2" fill="#f600ff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlow)" />
          <rect x="6" y="13" width="4" height="1" fill="#00ffff" filter="url(#cyberGlow)" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <rect x="14" y="3" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <rect x="3" y="14" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <path d="M14 17h7M17.5 13.5v7" stroke="#f600ff" strokeWidth="2" filter="url(#cyberGlow)" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="5" stroke="#ffe600" strokeWidth="2" fill="#ffe600" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <path d="M13 12h7v4h-2M15 12v2" stroke="#ffe600" strokeWidth="2" strokeLinecap="square" filter="url(#cyberGlow)" />
          <rect x="6" y="10" width="4" height="4" rx="1" fill="#ffe600" filter="url(#cyberGlow)" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="#00ffff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)" />
          <path d="M18 19l-7-7 7-7" stroke="#f600ff" strokeWidth="1" strokeLinecap="square" filter="url(#cyberGlow)" opacity="0.6" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19l7-7-7-7" stroke="#00ffff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)" />
          <path d="M6 19l7-7-7-7" stroke="#f600ff" strokeWidth="1" strokeLinecap="square" filter="url(#cyberGlow)" opacity="0.6" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)" />
          <circle cx="3" cy="6" r="1.5" fill="#f600ff" filter="url(#cyberGlow)" />
          <circle cx="3" cy="12" r="1.5" fill="#f600ff" filter="url(#cyberGlow)" />
          <circle cx="3" cy="18" r="1.5" fill="#f600ff" filter="url(#cyberGlow)" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9l6 6 6-6" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)" />
          <path d="M6 4l6 6 6-6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 15l-6-6-6 6" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)" />
          <path d="M18 20l-6-6-6 6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4v16M12 12h8M4 12h8" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)" />
          <rect x="16" y="10" width="4" height="4" fill="#f600ff" filter="url(#cyberGlow)" />
          <rect x="2" y="10" width="4" height="4" fill="#f600ff" filter="url(#cyberGlow)" />
        </svg>
  }
};

export default theme;
