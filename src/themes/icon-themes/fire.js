import React from 'react';

const theme = {
  name: 'Fire',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#dc2626" />
          <path d="M6 15 Q8 12 10 15 Q12 18 14 15 Q16 12 18 15" stroke="#f97316" strokeWidth="2" fill="none" />
          <circle cx="8" cy="12" r="0.5" fill="#f97316" />
          <circle cx="16" cy="13" r="0.5" fill="#f97316" />
          <circle cx="12" cy="11" r="0.3" fill="#f97316" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#dc2626" />
          <path d="M6 15 Q8 12 10 15 Q12 18 14 15 Q16 12 18 15" stroke="#f97316" strokeWidth="2" fill="none" />
          <circle cx="8" cy="12" r="0.5" fill="#f97316" />
          <circle cx="16" cy="13" r="0.5" fill="#f97316" />
          <circle cx="12" cy="11" r="0.3" fill="#f97316" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#f97316" />
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#f97316" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#f97316" />
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#f97316" strokeWidth="1" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M14 2v6h6" fill="#dc2626" />
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#f97316" strokeWidth="1.5" fill="none" />
          <circle cx="10" cy="14" r="0.5" fill="#f97316" />
          <circle cx="14" cy="16" r="0.5" fill="#f97316" />
        </svg>
  }
};

export default theme;
