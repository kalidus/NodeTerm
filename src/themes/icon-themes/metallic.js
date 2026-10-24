import React from 'react';

const theme = {
  name: 'Metallic',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c0c0c0" />
              <stop offset="50%" stopColor="#808080" />
              <stop offset="100%" stopColor="#404040" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#metalGrad1)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#c0c0c0" />
          <rect x="4" y="10" width="16" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="4" y="12" width="12" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="4" y="14" width="14" height="1" fill="#ffffff" opacity="0.8" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c0c0c0" />
              <stop offset="50%" stopColor="#808080" />
              <stop offset="100%" stopColor="#404040" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#metalGrad2)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#c0c0c0" />
          <rect x="4" y="10" width="16" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="4" y="12" width="12" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="4" y="14" width="14" height="1" fill="#ffffff" opacity="0.8" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <rect x="18" y="4" width="2" height="2" fill="#c0c0c0" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <rect x="10" y="8" width="4" height="1" fill="#ffffff" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="metalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#808080" />
              <stop offset="50%" stopColor="#404040" />
              <stop offset="100%" stopColor="#c0c0c0" />
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="1" fill="url(#metalGrad3)" />
          <path d="M14 2v6h6" fill="#c0c0c0" />
          <rect x="8" y="8" width="8" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="10" width="6" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="12" width="8" height="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="14" width="4" height="1" fill="#ffffff" opacity="0.8" />
        </svg>
  }
};

export default theme;
