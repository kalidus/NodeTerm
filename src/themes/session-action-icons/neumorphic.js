import React from 'react';

const theme = {
  name: 'Neumórfico',
  description: 'Iconos suaves con relieve y sombras profundas estilo Neumorphism',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#e0e0e0" opacity="0.1" />
          <path d="M12 7v10M7 12h10" stroke="#748ffc" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="#e0e0e0" fillOpacity="0.1" stroke="#f06595" strokeWidth="2.5" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="2" fill="#e0e0e0" fillOpacity="0.1" stroke="#63e6be" strokeWidth="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" fill="#e0e0e0" fillOpacity="0.1" stroke="#63e6be" strokeWidth="2" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" stroke="#ffd43b" strokeWidth="2.5" />
          <path d="M12 11h8" stroke="#ffd43b" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M8 12l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M8 12l4-4 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
  }
};

export default theme;
