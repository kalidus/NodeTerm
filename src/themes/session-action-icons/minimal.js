import React from 'react';

const theme = {
  name: 'Minimalista',
  description: 'Iconos minimalistas con líneas limpias',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M3 7l2-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="currentColor" />
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="currentColor" />
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="currentColor" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
        </svg>
  }
};

export default theme;
