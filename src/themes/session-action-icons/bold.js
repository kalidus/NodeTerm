import React from 'react';

const theme = {
  name: 'Audaz',
  description: 'Iconos gruesos y audaces con líneas pesadas',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" />
          <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" opacity="0.3" />
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
          <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
          <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
          <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
          <rect x="8" y="9" width="9" height="6" rx="3" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" />
          <rect x="11" y="6" width="2.5" height="3" rx="1" fill="currentColor" />
          <rect x="13.5" y="8" width="2.5" height="3" rx="1" fill="currentColor" />
          <rect x="15.5" y="15" width="2.5" height="3" rx="1" fill="currentColor" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 14l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M6 6l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 10l-6-6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M18 18l-6-6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="3" />
          <path d="M12 0v8m0 8v8M24 12h-8m-8 0H0M20.93 3.07l-5.66 5.66m0 3.54l5.66 5.66M3.07 20.93l5.66-5.66m0-3.54L3.07 3.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <rect x="3" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2" />
          <rect x="15" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2" />
          <rect x="15" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2" />
        </svg>
  }
};

export default theme;
