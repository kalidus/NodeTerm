import React from 'react';

const theme = {
  name: 'Vibrante',
  description: 'Gradientes modernos y coloridos con altas saturaciones',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF3CAC" />
              <stop offset="52%" stopColor="#784BA0" />
              <stop offset="100%" stopColor="#2B86C5" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#vibrantGrad1)" strokeWidth="2.5" />
          <path d="M12 7v10M7 12h10" stroke="url(#vibrantGrad1)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00DBDE" />
              <stop offset="100%" stopColor="#FC00FF" />
            </linearGradient>
          </defs>
          <path d="M3 7a3 3 0 0 1 3-3h4l2 2h6a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7z" stroke="url(#vibrantGrad2)" strokeWidth="2.5" />
          <circle cx="15" cy="14" r="3" fill="url(#vibrantGrad2)" fillOpacity="0.2" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAD961" />
              <stop offset="100%" stopColor="#F76B1C" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="14" y="3" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="3" y="14" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="14" y="14" width="7" height="7" rx="2" fill="url(#vibrantGrad3)" />
          <path d="M17.5 14v7M14 17.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#85FFBD" />
              <stop offset="100%" stopColor="#FFFB7D" />
            </linearGradient>
          </defs>
          <circle cx="8" cy="12" r="4.5" stroke="url(#vibrantGrad4)" strokeWidth="2.5" />
          <rect x="11" y="10" width="8" height="4" rx="2" fill="url(#vibrantGrad4)" />
          <path d="M14 9v2M16.5 9v2" stroke="#2D3436" strokeWidth="1.2" strokeLinecap="round" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="url(#vibrantGrad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19l7-7-7-7" stroke="url(#vibrantGrad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
          <rect x="3" y="11" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
          <rect x="3" y="16" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="url(#vibrantGrad1)" strokeWidth="2.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="url(#vibrantGrad1)" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M7 12h10" stroke="url(#vibrantGrad2)" strokeWidth="2.5" />
          <rect x="15" y="10" width="4" height="4" rx="1" fill="url(#vibrantGrad2)" />
          <rect x="5" y="10" width="4" height="4" rx="1" fill="url(#vibrantGrad2)" />
        </svg>
  }
};

export default theme;
