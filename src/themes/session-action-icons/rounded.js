import React from 'react';

const theme = {
  name: 'Redondeado',
  description: 'Iconos con bordes muy redondeados y suaves',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" rx="8" ry="8" fill="currentColor" opacity="0.15" />
          <circle cx="12" cy="12" r="8" rx="8" ry="8" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6a3 3 0 0 1 3-3h4l2 2h7a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z" fill="currentColor" opacity="0.15" rx="3" ry="3" />
          <path d="M3 6a3 3 0 0 1 3-3h4l2 2h7a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z" stroke="currentColor" strokeWidth="2" rx="3" ry="3" />
          <path d="M3 6l3-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="4" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="14" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          <circle cx="17" cy="7" r="1.5" fill="currentColor" />
          <circle cx="7" cy="17" r="1.5" fill="currentColor" />
          <circle cx="17" cy="17" r="1.5" fill="currentColor" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
          <rect x="9" y="9" width="9" height="6" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
          <rect x="12" y="7" width="2" height="3" rx="1" fill="currentColor" />
          <rect x="14" y="9" width="2" height="3" rx="1" fill="currentColor" />
          <rect x="16" y="15" width="2" height="3" rx="1" fill="currentColor" />
          <circle cx="9" cy="12" r="2" fill="currentColor" opacity="0.4" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor" />
          <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
          <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="4" y="10" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2" />
          <rect x="16" y="4" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2" />
          <rect x="16" y="16" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2" />
        </svg>
  }
};

export default theme;
