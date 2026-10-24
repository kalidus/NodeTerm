import React from 'react';

const theme = {
  name: 'Geométrico',
  description: 'Iconos abstractos con formas geométricas puras',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <line x1="12" y1="5" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="15" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18l-2 14H5L3 6z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <polygon points="3,6 7,6 9,2 21,2 21,8 3,8" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,2 22,8 18,20 6,20 2,8" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <polygon points="12,6 18,10 16,18 8,18 6,10" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="9,8 9,16 17,16 17,8" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <circle cx="7" cy="12" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="11" y="6" width="2" height="2" rx="0.5" fill="currentColor" />
          <rect x="13" y="8" width="2" height="2" rx="0.5" fill="currentColor" />
          <rect x="15" y="16" width="2" height="2" rx="0.5" fill="currentColor" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="15,18 7,12 15,6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="9,18 17,12 9,6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="3" rx="1" fill="currentColor" />
          <rect x="3" y="10.5" width="18" height="3" rx="1" fill="currentColor" />
          <rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="7,13 12,18 17,13" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
          <polygon points="7,6 12,11 17,6" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="17,11 12,6 7,11" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
          <polygon points="17,18 12,13 7,18" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,1 15,9 23,9 17,14 19,22 12,18 5,22 7,14 1,9 9,9" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12h8m-8-8v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polygon points="2,12 6,8 10,12 6,16" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <polygon points="16,2 20,6 16,10 12,6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <polygon points="16,14 20,18 16,22 12,18" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
        </svg>
  }
};

export default theme;
