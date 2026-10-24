import React from 'react';

const theme = {
  name: 'Glassmorphism',
  description: 'Efecto de cristal traslúcido con desenfoque y bordes suaves',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 13h4M14 11v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M16 17h4M18 15v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M13 12h7M16 12v2M18.5 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
          <rect x="3" y="11" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
          <rect x="3" y="16" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3.5" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6v12M8 12h8" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="4" width="16" height="16" rx="4" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
        </svg>
  }
};

export default theme;
