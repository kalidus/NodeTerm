import React from 'react';

const theme = {
  name: 'Fluent',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb900" strokeWidth="1.5">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#ffb900" fillOpacity="0.1" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb900" strokeWidth="2">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
          <path d="M4 10h16" opacity="0.5" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <path d="M7 8h10M7 12h7" opacity="0.6" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <circle cx="12" cy="11" r="3" strokeWidth="2" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="#0078d4" fillOpacity="0.1" />
          <ellipse cx="12" cy="11" rx="4" ry="3" strokeWidth="2" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#605e5c" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
  }
};

export default theme;
