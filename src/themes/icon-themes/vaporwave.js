import React from 'react';

const theme = {
  name: 'Vaporwave',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="50%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#ff0080" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#vaporGrad1)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff00ff" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.9" />
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="50%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#ff0080" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#vaporGrad2)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#ff00ff" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.9" />
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#00ffff" />
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#00ffff" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#ff00ff" />
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#ff00ff" strokeWidth="1" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="vaporGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0080" />
              <stop offset="50%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#00ffff" />
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#vaporGrad3)" />
          <path d="M14 2v6h6" fill="#ff00ff" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" opacity="0.9" />
          <path d="M8 16 Q12 18 16 16" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.8" />
        </svg>
  }
};

export default theme;
