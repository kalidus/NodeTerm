import React from 'react';

const theme = {
  name: 'Nord',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e81ac"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#88c0d0" /></svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e81ac"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M2 7l4-4h6l2 2h8v2" fill="#88c0d0" /></svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5e81ac" />
              <stop offset="100%" stopColor="#88c0d0" />
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#3b4252" stroke="url(#nordSSH)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1" fill="#2e3440" />
          <circle cx="6" cy="8" r="0.8" fill="#88c0d0" />
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#88c0d0" />
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#5e81ac" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#4c566a" />
          <path d="M9 18l3 3 3-3" stroke="url(#nordSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5e81ac" />
              <stop offset="100%" stopColor="#88c0d0" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3b4252" stroke="url(#nordRDP)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#2e3440" />
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#nordRDP)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.5" fill="#88c0d0" />
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#5e81ac" />
          <path d="M8 20l4 2 4-2" stroke="url(#nordRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3be8c" />
              <stop offset="100%" stopColor="#8fbcbb" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#3b4252" stroke="url(#nordVNC)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="#2e3440" />
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#nordVNC)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="2" fill="#a3be8c" opacity="0.4" />
          <circle cx="12" cy="10" r="1.3" fill="#8fbcbb" />
          <circle cx="12" cy="10" r="0.7" fill="#eceff4" />
          <path d="M8 20l4 2 4-2" stroke="url(#nordVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ebcb8b" />
              <stop offset="100%" stopColor="#d08770" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordSFTP)" strokeWidth="1.5" />
          <polyline points="14 2 14 8 20 8" stroke="url(#nordSFTP)" strokeWidth="1.5" />
          <rect x="8" y="12" width="8" height="6" rx="1" stroke="url(#nordSFTP)" strokeWidth="1.5" fill="none" />
          <rect x="9" y="15" width="6" height="3" rx="0.5" stroke="url(#nordSFTP)" strokeWidth="1" fill="#d08770" opacity="0.3" />
          <circle cx="12" cy="13.5" r="1.5" stroke="url(#nordSFTP)" strokeWidth="1.5" fill="none" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#88c0d0" />
              <stop offset="100%" stopColor="#81a1c1" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordFTP)" strokeWidth="1.5" />
          <polyline points="14 2 14 8 20 8" stroke="url(#nordFTP)" strokeWidth="1.5" />
          <path d="M8 12l3-3 3 3" stroke="url(#nordFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16l3 3 3-3" stroke="url(#nordFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="nordSCP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3be8c" />
              <stop offset="100%" stopColor="#8fbcbb" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#434c5e" stroke="url(#nordSCP)" strokeWidth="1.5" />
          <polyline points="14 2 14 8 20 8" stroke="url(#nordSCP)" strokeWidth="1.5" />
          <rect x="7" y="10" width="6" height="4" rx="1" stroke="url(#nordSCP)" strokeWidth="1" fill="none" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#a3be8c" />
          <path d="M16 14l2 2 2-2" stroke="url(#nordSCP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#d8dee9"><rect x="6" y="2" width="12" height="20" rx="2" /><rect x="10" y="6" width="4" height="12" fill="#5e81ac" /></svg>
  }
};

export default theme;
