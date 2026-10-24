import React from 'react';

const theme = {
  name: 'Fluent',
  description: 'Estilo inspirado en Microsoft Fluent con colores suaves y profundidad',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="4" fill="#0078d4" fillOpacity="0.2" />
          <path d="M12 8v8M8 12h8" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#ffb900" fillOpacity="0.2" stroke="#ffb900" strokeWidth="1.5" />
          <path d="M4 10h16" stroke="#ffb900" strokeWidth="1" opacity="0.5" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="4" fill="#107c10" fillOpacity="0.2" stroke="#107c10" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="4" fill="#107c10" fillOpacity="0.2" stroke="#107c10" strokeWidth="1.5" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="#d83b01" strokeWidth="2" />
          <rect x="11" y="11" width="2" height="6" rx="1" fill="#d83b01" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 6l-6 6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 8h16M4 12h16M4 16h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 14l-5-5-5 5" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#0078d4" fillOpacity="0.1" stroke="#0078d4" strokeWidth="1.5" />
          <path d="M12 6v12M6 12h12" stroke="#0078d4" strokeWidth="1" opacity="0.3" />
        </svg>
  }
};

export default theme;
