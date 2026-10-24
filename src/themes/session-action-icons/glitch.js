import React from 'react';

const theme = {
  name: 'Glitch',
  description: 'Efecto de distorsión digital con aberración cromática',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.8">
            <circle cx="11.5" cy="11.5" r="9" stroke="#ff0000" strokeWidth="2" />
            <circle cx="12.5" cy="12.5" r="9" stroke="#00ffff" strokeWidth="2" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </g>
          <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <rect x="14" y="8" width="4" height="1" fill="#00ff00" opacity="0.5" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="#ff00ff" strokeWidth="2" transform="translate(-1, 0)" />
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="currentColor" strokeWidth="2" />
          <rect x="15" y="12" width="5" height="1" fill="#ff0000" opacity="0.4" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" stroke="#ff0000" strokeWidth="1.5" />
          <rect x="14" y="4" width="6" height="6" stroke="#00ff00" strokeWidth="1.5" />
          <rect x="4" y="14" width="6" height="6" stroke="#0000ff" strokeWidth="1.5" />
          <rect x="14" y="14" width="6" height="6" stroke="currentColor" strokeWidth="2" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" stroke="#00ffff" strokeWidth="2" />
          <rect x="10" y="10" width="10" height="4" fill="#ff00ff" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 10v2M17 10v2" stroke="#00ff00" strokeWidth="2" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 0)" />
          <path d="M15 18l-6-6 6-6" stroke="#00ffff" strokeWidth="2.5" transform="translate(1, 0)" />
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 0)" />
          <path d="M9 18l6-6-6-6" stroke="#00ffff" strokeWidth="2.5" transform="translate(1, 0)" />
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 1)" />
          <path d="M3 12h18" stroke="#00ff00" strokeWidth="2.5" />
          <path d="M3 18h18" stroke="#0000ff" strokeWidth="2.5" transform="translate(1, -1)" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="#ff0000" strokeWidth="2.5" />
          <path d="M7 6l5 5 5-5" stroke="#00ffff" strokeWidth="2.5" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="#ff0000" strokeWidth="2.5" />
          <path d="M17 18l-5-5-5 5" stroke="#00ffff" strokeWidth="2.5" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#ff0000" strokeWidth="2" transform="translate(-1, 0)" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M12 8v8M8 12h8" stroke="#00ff00" strokeWidth="2" />
        </svg>
  }
};

export default theme;
