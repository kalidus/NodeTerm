import React from 'react';

const theme = {
  name: 'Gruvbox',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#b16286"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f" /></svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#b16286"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#fabd2f" /></svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d79921" />
              <stop offset="100%" stopColor="#fabd2f" />
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#3c3836" stroke="url(#gruvboxSSH)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1" fill="#282828" />
          <circle cx="6" cy="8" r="0.8" fill="#fabd2f" />
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#fabd2f" />
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#d79921" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#b16286" />
          <path d="M9 18l3 3 3-3" stroke="url(#gruvboxSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d79921" />
              <stop offset="100%" stopColor="#fabd2f" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3c3836" stroke="url(#gruvboxRDP)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#282828" />
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#gruvboxRDP)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.5" fill="#fabd2f" />
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#d79921" />
          <path d="M8 20l4 2 4-2" stroke="url(#gruvboxRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="gruvboxVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b8bb26" />
              <stop offset="100%" stopColor="#98971a" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3c3836" stroke="url(#gruvboxVNC)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#282828" />
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#gruvboxVNC)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="2" fill="#b8bb26" opacity="0.4" />
          <circle cx="12" cy="10" r="1.3" fill="#98971a" />
          <path d="M8 20l4 2 4-2" stroke="url(#gruvboxVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ebdbb2"><rect x="6" y="2" width="12" height="20" rx="2" /><rect x="8" y="4" width="8" height="14" fill="#3c3836" /></svg>
  }
};

export default theme;
