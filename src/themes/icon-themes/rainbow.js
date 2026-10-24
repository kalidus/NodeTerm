import React from 'react';

const theme = {
  name: 'Rainbow',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="13" rx="2" fill="#ef4444" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316" />
          <rect x="4" y="9" width="16" height="1" fill="#eab308" />
          <rect x="4" y="11" width="16" height="1" fill="#22c55e" />
          <rect x="4" y="13" width="16" height="1" fill="#3b82f6" />
          <rect x="4" y="15" width="16" height="1" fill="#8b5cf6" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="13" rx="2" fill="#ef4444" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#f97316" />
          <rect x="4" y="9" width="16" height="1" fill="#eab308" />
          <rect x="4" y="11" width="16" height="1" fill="#22c55e" />
          <rect x="4" y="13" width="16" height="1" fill="#3b82f6" />
          <rect x="4" y="15" width="16" height="1" fill="#8b5cf6" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <circle cx="18" cy="6" r="1" fill="#ff8000" />
          <circle cx="18" cy="8" r="1" fill="#ffff00" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0080ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <rect x="10" y="8" width="4" height="1" fill="#8000ff" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="6" y="2" width="12" height="20" rx="2" fill="#8000ff" />
          <path d="M14 2v6h6" fill="#ff0000" />
          <rect x="8" y="8" width="8" height="1" fill="#ff8000" />
          <rect x="8" y="10" width="8" height="1" fill="#ffff00" />
          <rect x="8" y="12" width="8" height="1" fill="#00ff00" />
          <rect x="8" y="14" width="8" height="1" fill="#0080ff" />
        </svg>
  }
};

export default theme;
