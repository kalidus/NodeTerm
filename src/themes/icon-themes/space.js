import React from 'react';

const theme = {
  name: 'Space',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6" />
          <circle cx="8" cy="11" r="0.5" fill="#ffffff" />
          <circle cx="12" cy="13" r="0.5" fill="#ffffff" />
          <circle cx="16" cy="10" r="0.5" fill="#ffffff" />
          <circle cx="18" cy="15" r="0.3" fill="#ffffff" />
          <circle cx="6" cy="16" r="0.3" fill="#ffffff" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#3b82f6" />
          <circle cx="8" cy="11" r="0.5" fill="#ffffff" />
          <circle cx="12" cy="13" r="0.5" fill="#ffffff" />
          <circle cx="16" cy="10" r="0.5" fill="#ffffff" />
          <circle cx="18" cy="15" r="0.3" fill="#ffffff" />
          <circle cx="6" cy="16" r="0.3" fill="#ffffff" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="0.5" fill="#ffffff" />
          <path d="M16 5 L20 5 M16 7 L20 7" stroke="#ffffff" strokeWidth="1" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <circle cx="12" cy="10" r="1" fill="#ffffff" />
          <path d="M10 8 L14 8 M10 12 L14 12 M8 10 L16 10" stroke="#ffffff" strokeWidth="1" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#1e1b4b">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M14 2v6h6" fill="#3b82f6" />
          <circle cx="10" cy="8" r="0.5" fill="#ffffff" />
          <circle cx="14" cy="10" r="0.5" fill="#ffffff" />
          <circle cx="12" cy="12" r="0.3" fill="#ffffff" />
          <path d="M8 15 L16 15 M8 17 L14 17" stroke="#ffffff" strokeWidth="1" />
        </svg>
  }
};

export default theme;
