import React from 'react';

const theme = {
  name: 'Gradient',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#grad1)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#667eea" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.8" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#grad2)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#667eea" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.8" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#grad3)" />
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#grad3)" />
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#grad3)" />
          <path d="M6 7h12M6 11h8M6 15h6" stroke="url(#grad3)" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#764ba2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#764ba2" />
              <stop offset="100%" stopColor="#667eea" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="url(#grad4)" />
          <line x1="8" y1="21" x2="16" y2="21" stroke="url(#grad4)" />
          <line x1="12" y1="17" x2="12" y2="21" stroke="url(#grad4)" />
          <circle cx="12" cy="10" r="3" stroke="url(#grad4)" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#764ba2" />
              <stop offset="100%" stopColor="#667eea" />
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#grad5)" />
          <path d="M14 2v6h6" fill="#667eea" />
          <rect x="8" y="8" width="8" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="10" width="6" height="1" fill="#ffffff" opacity="0.8" />
        </svg>
  }
};

export default theme;
