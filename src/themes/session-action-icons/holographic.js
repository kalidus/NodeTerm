import React from 'react';

const theme = {
  name: 'Holográfico',
  description: 'Efecto iridiscente con gradientes cambiantes y brillos mágicos',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="holoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="50%" stopColor="#3a7bd5" />
              <stop offset="100%" stopColor="#00d2ff" />
            </linearGradient>
            <filter id="holoGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <path d="M12 7v10M7 12h10" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
          <circle cx="12" cy="12" r="4" fill="url(#holoGrad1)" fillOpacity="0.1" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <rect x="7" y="10" width="10" height="1" fill="url(#holoGrad1)" fillOpacity="0.5" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <rect x="9" y="10.5" width="9" height="3" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <circle cx="15.5" cy="12" r="1" fill="url(#holoGrad1)" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="url(#holoGrad1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="url(#holoGrad1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5M7 6l5 5 5-5" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5M17 18l-5-5-5 5" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
        </svg>
  }
};

export default theme;
