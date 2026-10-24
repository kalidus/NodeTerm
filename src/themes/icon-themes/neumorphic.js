import React from 'react';

const theme = {
  name: 'Neumórfico',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f06595" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10z" fill="#000" fillOpacity="0.1" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f06595" strokeWidth="2.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10z" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <path d="M6 7h12M6 11h8" opacity="0.5" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <circle cx="12" cy="10" r="3" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#748ffc" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#000" fillOpacity="0.1" />
          <ellipse cx="12" cy="10" rx="4" ry="3" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        </svg>
  }
};

export default theme;
