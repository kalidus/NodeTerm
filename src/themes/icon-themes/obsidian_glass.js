import React from 'react';

const theme = {
  name: 'Obsidian Glass',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Heavy 3D Beveled Folder Shape */}
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <rect x="6" y="9" width="12" height="1" fill="white" opacity="0.1" />
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 6a2 2 0 0 1 2-2h3l3 3h8a2 2 0 0 1 2 2v2H4V6z" fill="#000" stroke="#333" strokeWidth="2" />
          <path d="M4 10l2 10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l2-10H4z" fill="#111" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="14" rx="1" fill="#0a0a0a" stroke="#444" strokeWidth="2" />
          <rect x="3" y="4" width="18" height="14" rx="1" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M7 9l3 3-3 3M13 15h4" stroke="white" strokeWidth="2" />
      rdp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <circle cx="12" cy="11" r="3" stroke="white" strokeWidth="1.5" />
          <path d="M8 21h8" stroke="#444" strokeWidth="2" />
        </svg>
      ),
      vnc: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v13H4V4z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <ellipse cx="12" cy="11" rx="5" ry="3" stroke="white" strokeWidth="1.2" />
          <path d="M12 17v4" stroke="#444" strokeWidth="2" />
        </svg>
      ),
      file: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M14 3v4h4" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
      ),
      sftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2" />
          <rect x="9" y="13" width="6" height="4" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      ftp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2" />
          <path d="M9 14h6M12 11l-3 3 3 3" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      scp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6v18h12V7z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M9 16l3-3 3 3" stroke="white" strokeWidth="2" />
        </svg>
      ),
      password: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="9" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="white" strokeWidth="1.5" />
        </svg>
      ),
      'ssh-tunnel': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4L4 10l8 6 8-6-8-6z" fill="#050505" stroke="#444" strokeWidth="2.5" />
          <path d="M4 14l8 6 8-6" stroke="#444" strokeWidth="2" />
        </svg>
      )
>
        </svg>
  }
};

export default theme;
