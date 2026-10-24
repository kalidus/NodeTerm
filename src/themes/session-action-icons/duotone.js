import React from 'react';

const theme = {
  name: 'Duotono',
  description: 'Iconos con dos tonos de color superpuestos',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.4" />
          <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.6" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="12" y1="15" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="15" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" opacity="0.3" />
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" opacity="0.5" />
          <path d="M2 5l2-2h5l2 2" fill="currentColor" opacity="0.7" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" fill="currentColor" opacity="0.3" />
          <rect x="14" y="3" width="7" height="7" fill="currentColor" opacity="0.3" />
          <rect x="3" y="14" width="7" height="7" fill="currentColor" opacity="0.3" />
          <rect x="14" y="14" width="7" height="7" fill="currentColor" opacity="0.3" />
          <rect x="4" y="4" width="5" height="5" fill="currentColor" opacity="0.6" />
          <rect x="15" y="4" width="5" height="5" fill="currentColor" opacity="0.6" />
          <rect x="4" y="15" width="5" height="5" fill="currentColor" opacity="0.6" />
          <rect x="15" y="15" width="5" height="5" fill="currentColor" opacity="0.6" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4.5" fill="currentColor" opacity="0.3" />
          <circle cx="8" cy="12" r="3" fill="currentColor" opacity="0.6" />
          <rect x="8" y="8" width="10" height="8" rx="3" fill="currentColor" opacity="0.3" />
          <rect x="9" y="9" width="8" height="6" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="11" y="6" width="2" height="3" rx="1" fill="currentColor" />
          <rect x="13" y="8" width="2" height="3" rx="1" fill="currentColor" />
          <rect x="15" y="16" width="2" height="3" rx="1" fill="currentColor" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="6,14 12,20 18,14" fill="currentColor" opacity="0.4" />
          <polygon points="6,14 12,20 18,14" fill="currentColor" opacity="0.7" />
          <polygon points="6,6 12,12 18,6" fill="currentColor" opacity="0.4" />
          <polygon points="6,6 12,12 18,6" fill="currentColor" opacity="0.7" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,10 12,4 6,10" fill="currentColor" opacity="0.4" />
          <polygon points="18,10 12,4 6,10" fill="currentColor" opacity="0.7" />
          <polygon points="18,18 12,12 6,18" fill="currentColor" opacity="0.4" />
          <polygon points="18,18 12,12 6,18" fill="currentColor" opacity="0.7" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <rect x="4" y="10" width="4" height="4" rx="1" fill="currentColor" opacity="0.3" />
          <rect x="16" y="4" width="4" height="4" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
  }
};

export default theme;
