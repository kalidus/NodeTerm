import React from 'react';

const theme = {
  name: 'Nature',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#22c55e" />
          <circle cx="8" cy="12" r="1" fill="#fbbf24" />
          <circle cx="12" cy="10" r="1" fill="#fbbf24" />
          <circle cx="16" cy="14" r="1" fill="#fbbf24" />
          <path d="M6 16 Q8 18 10 16 Q12 18 14 16 Q16 18 18 16" stroke="#fbbf24" strokeWidth="1" fill="none" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#22c55e" />
          <circle cx="8" cy="12" r="1" fill="#fbbf24" />
          <circle cx="12" cy="10" r="1" fill="#fbbf24" />
          <circle cx="16" cy="14" r="1" fill="#fbbf24" />
          <path d="M6 16 Q8 18 10 16 Q12 18 14 16 Q16 18 18 16" stroke="#fbbf24" strokeWidth="1" fill="none" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#fbbf24" />
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#fbbf24" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#fbbf24" />
          <path d="M10 9 Q12 7 14 9 Q12 11 10 9" fill="#fbbf24" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M14 2v6h6" fill="#22c55e" />
          <circle cx="10" cy="8" r="1" fill="#fbbf24" />
          <path d="M8 12 Q10 14 12 12 Q14 14 16 12" stroke="#fbbf24" strokeWidth="1" fill="none" />
        </svg>
  }
};

export default theme;
