import React from 'react';

const theme = {
  name: 'Sunset',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#sunsetGrad1)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316" />
          <circle cx="12" cy="12" r="2" fill="#fbbf24" />
          <path d="M8 16 Q12 18 16 16" stroke="#f97316" strokeWidth="1.5" fill="none" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" fill="url(#sunsetGrad2)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316" />
          <circle cx="12" cy="12" r="2" fill="#fbbf24" />
          <path d="M8 16 Q12 18 16 16" stroke="#f97316" strokeWidth="1.5" fill="none" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#fbbf24" />
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#fbbf24" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#fbbf24" />
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#fbbf24" strokeWidth="1" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="sunsetGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" fill="url(#sunsetGrad3)" />
          <path d="M14 2v6h6" fill="#f97316" />
          <circle cx="12" cy="12" r="1.5" fill="#fbbf24" />
          <path d="M8 16 Q12 18 16 16" stroke="#fbbf24" strokeWidth="1" fill="none" />
        </svg>
  }
};

export default theme;
