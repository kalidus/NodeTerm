import React from 'react';

const theme = {
  name: 'Forest',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#15803d" />
          <path d="M8 12 Q10 10 12 12 Q14 14 16 12" stroke="#22c55e" strokeWidth="2" fill="none" />
          <circle cx="6" cy="15" r="1" fill="#22c55e" />
          <circle cx="18" cy="16" r="1" fill="#22c55e" />
          <circle cx="12" cy="17" r="0.8" fill="#22c55e" />
          <path d="M5 15 L7 15 M17 16 L19 16 M11 17 L13 17" stroke="#15803d" strokeWidth="1" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#15803d" />
          <path d="M8 12 Q10 10 12 12 Q14 14 16 12" stroke="#22c55e" strokeWidth="2" fill="none" />
          <circle cx="6" cy="15" r="1" fill="#22c55e" />
          <circle cx="18" cy="16" r="1" fill="#22c55e" />
          <circle cx="12" cy="17" r="0.8" fill="#22c55e" />
          <path d="M5 15 L7 15 M17 16 L19 16 M11 17 L13 17" stroke="#15803d" strokeWidth="1" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#22c55e" />
          <path d="M17 5 Q18 4 19 5 Q18 6 17 5" fill="#22c55e" />
          <path d="M16 5 L20 5" stroke="#15803d" strokeWidth="1" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#22c55e" />
          <path d="M10 8 L14 8 M10 12 L14 12" stroke="#22c55e" strokeWidth="1" />
          <path d="M11 9 L13 9 M11 11 L13 11" stroke="#15803d" strokeWidth="1" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M14 2v6h6" fill="#15803d" />
          <path d="M8 10 Q10 8 12 10 Q14 12 16 10" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          <circle cx="10" cy="14" r="0.8" fill="#22c55e" />
          <circle cx="14" cy="16" r="0.8" fill="#22c55e" />
          <path d="M9 14 L11 14 M13 16 L15 16" stroke="#15803d" strokeWidth="1" />
        </svg>
  }
};

export default theme;
