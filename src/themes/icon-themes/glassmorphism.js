import React from 'react';

const theme = {
  name: 'Glassmorphism',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFolder" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#4facfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurFolder" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#glassFolder)" filter="url(#blurFolder)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFolderOpen" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#4facfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurFolderOpen">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h5l2 2h8A2.5 2.5 0 0 1 22 9.5v1.5H3L2 19V7.5z" fill="url(#glassFolderOpen)" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#glassFolderOpen)" filter="url(#blurFolderOpen)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassSsh" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurSsh">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#glassSsh)" filter="url(#blurSsh)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassRdp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#43e97b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38f9d7" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurRdp">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#glassRdp)" filter="url(#blurRdp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
          <circle cx="12" cy="10.5" r="3" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassVnc" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurVnc">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#glassVnc)" filter="url(#blurVnc)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
          <ellipse cx="12" cy="10.5" rx="3.5" ry="2.5" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="12" cy="10.5" r="1" fill="#ffffff" fillOpacity="0.8" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFile" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a1c4fd" stopOpacity="0.2" />
            </linearGradient>
            <filter id="blurFile">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.1" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassFile)" filter="url(#blurFile)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
        </svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassSftp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fecfef" stopOpacity="0.3" />
            </linearGradient>
            <filter id="blurSftp">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassSftp)" filter="url(#blurSftp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <rect x="9" y="13" width="6" height="4" stroke="#ffffff" strokeWidth="1.5" rx="0.5" />
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#ffffff" strokeWidth="1.5" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassFtp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#84fab0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassFtp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="glassScp" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#e0c3fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8ec5fc" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#glassScp)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          <path d="M9 15l3-3 3 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
  }
};

export default theme;
