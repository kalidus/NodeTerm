import React from 'react';

const theme = {
  name: 'Acrylic',
  description: 'Efecto de cristal esmerilado con bordes suaves y traslúcido',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <path d="M12 7v10M7 12h10" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <rect x="7" y="10" width="10" height="1.5" rx="0.75" fill="#3a7bd5" opacity="0.6" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="13" y="4" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="4" y="13" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="13" y="13" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <rect x="9" y="10" width="10" height="4" rx="2" fill="#3a7bd5" opacity="0.4" />
          <circle cx="15" cy="12" r="1" fill="white" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="16" height="2" rx="1" fill="white" opacity="0.5" />
          <rect x="4" y="11" width="16" height="2" rx="1" fill="white" opacity="0.8" />
          <rect x="4" y="16" width="16" height="2" rx="1" fill="white" opacity="0.5" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" opacity="0.8" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5l-4 4h8l-4-4z" fill="#00d2ff" opacity="0.8" />
          <path d="M12 19l-4-4h8l-4 4z" fill="#00d2ff" opacity="0.4" />
          <path d="M5 12h14" stroke="white" strokeWidth="1" opacity="0.5" />
        </svg>
  }
};

export default theme;
