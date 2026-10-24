import React from 'react';

const theme = {
  name: 'Relleno',
  description: 'Iconos completamente rellenos con formas sólidas',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <circle cx="12" cy="12" r="4" fill="white" />
          <rect x="11" y="2" width="2" height="6" fill="white" />
          <rect x="11" y="16" width="2" height="6" fill="white" />
          <rect x="2" y="11" width="6" height="2" fill="white" />
          <rect x="16" y="11" width="6" height="2" fill="white" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" />
          <path d="M2 5l2-2h5l2 2" fill="currentColor" opacity="0.7" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" fill="currentColor" />
          <rect x="14" y="3" width="7" height="7" fill="currentColor" />
          <rect x="3" y="14" width="7" height="7" fill="currentColor" />
          <rect x="14" y="14" width="7" height="7" fill="currentColor" />
          <circle cx="6.5" cy="6.5" r="1.5" fill="white" opacity="0.8" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" opacity="0.8" />
          <circle cx="6.5" cy="17.5" r="1.5" fill="white" opacity="0.8" />
          <circle cx="17.5" cy="17.5" r="1.5" fill="white" opacity="0.8" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4.5" fill="currentColor" />
          <rect x="8" y="8" width="10" height="8" rx="3" fill="currentColor" />
          <rect x="11" y="6" width="2.5" height="3" rx="1" fill="white" />
          <rect x="13.5" y="8" width="2.5" height="3" rx="1" fill="white" />
          <rect x="15.5" y="16" width="2.5" height="3" rx="1" fill="white" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="16,19 7,12 16,5" fill="currentColor" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="8,19 17,12 8,5" fill="currentColor" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" />
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor" />
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="6,14 12,20 18,14" fill="currentColor" />
          <polygon points="6,6 12,12 18,6" fill="currentColor" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,10 12,4 6,10" fill="currentColor" />
          <polygon points="18,18 12,12 6,18" fill="currentColor" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="white" />
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="4" y="10" width="4" height="4" rx="1" fill="currentColor" />
          <rect x="16" y="4" width="4" height="4" rx="1" fill="currentColor" />
          <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor" />
        </svg>
  }
};

export default theme;
