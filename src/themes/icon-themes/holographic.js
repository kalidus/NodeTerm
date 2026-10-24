import React from 'react';

const theme = {
  name: 'Holographic',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFolder1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="50%" stopColor="#fecfef" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFolder2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbc2eb" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#holoFolder1)" filter="url(#holoGlow)" />
          <path d="M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z" fill="url(#holoFolder2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <path d="M3.5 8h17" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFolderOpen1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="50%" stopColor="#fecfef" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFolderOpen2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoGlowOpen">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbc2eb" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h5l2 2h8A2.5 2.5 0 0 1 22 9.5v1.5H3L2 19V7.5z" fill="url(#holoFolderOpen1)" opacity="0.6" />
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#holoFolderOpen1)" filter="url(#holoGlowOpen)" />
          <path d="M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z" fill="url(#holoFolderOpen2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <path d="M3.5 12h17" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoSsh1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" />
              <stop offset="100%" stopColor="#fbc2eb" />
            </linearGradient>
            <linearGradient id="holoSsh2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#84fab0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoSshGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a18cd1" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#holoSsh1)" filter="url(#holoSshGlow)" />
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#holoSsh2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoRdp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#43e97b" />
              <stop offset="100%" stopColor="#38f9d7" />
            </linearGradient>
            <linearGradient id="holoRdp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoRdpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#43e97b" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoRdp1)" filter="url(#holoRdpGlow)" />
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoRdp2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="10.5" r="3" stroke="#ffffff" strokeWidth="1.5" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoVnc1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" />
              <stop offset="100%" stopColor="#fee140" />
            </linearGradient>
            <linearGradient id="holoVnc2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoVncGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fa709a" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoVnc1)" filter="url(#holoVncGlow)" />
          <rect x="2" y="4" width="20" height="13" rx="3" fill="url(#holoVnc2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <path d="M8 21h8M12 17v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="12" cy="10.5" rx="3.5" ry="2.5" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="12" cy="10.5" r="1" fill="#ffffff" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFile1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c2e9fb" />
              <stop offset="100%" stopColor="#a1c4fd" />
            </linearGradient>
            <linearGradient id="holoFile2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fecfef" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoFileGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a1c4fd" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFile1)" filter="url(#holoFileGlow)" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFile2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoSftp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a9e" />
              <stop offset="100%" stopColor="#fecfef" />
            </linearGradient>
            <linearGradient id="holoSftp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#43e97b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38f9d7" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoSftpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff9a9e" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoSftp1)" filter="url(#holoSftpGlow)" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoSftp2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="9" y="13" width="6" height="4" stroke="#ffffff" strokeWidth="1.5" rx="0.5" />
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#ffffff" strokeWidth="1.5" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoFtp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84fab0" />
              <stop offset="100%" stopColor="#8fd3f4" />
            </linearGradient>
            <linearGradient id="holoFtp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoFtpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#84fab0" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFtp1)" filter="url(#holoFtpGlow)" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoFtp2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="holoScp1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0c3fc" />
              <stop offset="100%" stopColor="#8ec5fc" />
            </linearGradient>
            <linearGradient id="holoScp2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fa709a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fee140" stopOpacity="0.2" />
            </linearGradient>
            <filter id="holoScpGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#e0c3fc" floodOpacity="0.5" />
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoScp1)" filter="url(#holoScpGlow)" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#holoScp2)" style={{
        mixBlendMode: 'overlay'
      }} />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M9 15l3-3 3 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
  }
};

export default theme;
