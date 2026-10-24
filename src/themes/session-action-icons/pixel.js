import React from 'react';

const theme = {
  name: 'Pixel',
  description: 'Iconos estilo pixel art con bordes definidos',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" fill="currentColor" opacity="0.1" />
          <rect x="2" y="2" width="20" height="20" stroke="currentColor" strokeWidth="2" />
          <rect x="9" y="9" width="6" height="6" fill="currentColor" />
          <rect x="10" y="2" width="4" height="7" fill="currentColor" />
          <rect x="10" y="15" width="4" height="7" fill="currentColor" />
          <rect x="2" y="10" width="7" height="4" fill="currentColor" />
          <rect x="15" y="10" width="7" height="4" fill="currentColor" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="6" width="20" height="16" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="2" y="6" width="20" height="16" stroke="currentColor" strokeWidth="2" />
          <rect x="2" y="2" width="12" height="6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
          <rect x="2" y="2" width="12" height="6" stroke="currentColor" strokeWidth="2" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="2" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
          <rect x="2" y="14" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="4" width="4" height="4" fill="currentColor" />
          <rect x="16" y="4" width="4" height="4" fill="currentColor" />
          <rect x="4" y="16" width="4" height="4" fill="currentColor" />
          <rect x="16" y="16" width="4" height="4" fill="currentColor" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <circle cx="7" cy="12" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="10" y="6" width="3" height="3" fill="currentColor" />
          <rect x="13" y="8" width="3" height="3" fill="currentColor" />
          <rect x="15" y="16" width="3" height="3" fill="currentColor" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="5" width="3" height="3" fill="currentColor" />
          <rect x="13" y="8" width="3" height="3" fill="currentColor" />
          <rect x="10" y="11" width="3" height="3" fill="currentColor" />
          <rect x="13" y="14" width="3" height="3" fill="currentColor" />
          <rect x="16" y="17" width="3" height="3" fill="currentColor" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="3" height="3" fill="currentColor" />
          <rect x="8" y="8" width="3" height="3" fill="currentColor" />
          <rect x="11" y="11" width="3" height="3" fill="currentColor" />
          <rect x="8" y="14" width="3" height="3" fill="currentColor" />
          <rect x="5" y="17" width="3" height="3" fill="currentColor" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="4" width="20" height="4" fill="currentColor" />
          <rect x="2" y="10" width="20" height="4" fill="currentColor" />
          <rect x="2" y="16" width="20" height="4" fill="currentColor" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="13" width="3" height="3" fill="currentColor" />
          <rect x="9" y="16" width="3" height="3" fill="currentColor" />
          <rect x="12" y="19" width="3" height="3" fill="currentColor" />
          <rect x="6" y="6" width="3" height="3" fill="currentColor" />
          <rect x="9" y="9" width="3" height="3" fill="currentColor" />
          <rect x="12" y="12" width="3" height="3" fill="currentColor" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="10" width="3" height="3" fill="currentColor" />
          <rect x="12" y="7" width="3" height="3" fill="currentColor" />
          <rect x="9" y="4" width="3" height="3" fill="currentColor" />
          <rect x="15" y="18" width="3" height="3" fill="currentColor" />
          <rect x="12" y="15" width="3" height="3" fill="currentColor" />
          <rect x="9" y="12" width="3" height="3" fill="currentColor" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
          <rect x="10" y="10" width="4" height="4" fill="currentColor" />
          <rect x="10" y="1" width="4" height="6" fill="currentColor" />
          <rect x="10" y="17" width="4" height="6" fill="currentColor" />
          <rect x="1" y="10" width="6" height="4" fill="currentColor" />
          <rect x="17" y="10" width="6" height="4" fill="currentColor" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="2" width="4" height="20" fill="currentColor" opacity="0.3" />
          <rect x="10" y="10" width="10" height="4" fill="currentColor" opacity="0.3" />
          <rect x="2" y="9" width="6" height="6" fill="currentColor" />
          <rect x="16" y="3" width="6" height="6" fill="currentColor" />
          <rect x="16" y="15" width="6" height="6" fill="currentColor" />
        </svg>
  }
};

export default theme;
