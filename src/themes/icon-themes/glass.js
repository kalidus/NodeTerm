import React from 'react';

const theme = {
  name: 'Glassmorphism',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glassIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <path d="M2 10h20" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <path d="M7 8h10M7 12h7" strokeOpacity="0.5" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <circle cx="12" cy="10" r="3" strokeOpacity="0.6" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <ellipse cx="12" cy="10" rx="4" ry="3" strokeOpacity="0.6" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="url(#glassIconGrad)" stroke="rgba(255,255,255,0.4)" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
  }
};

export default theme;
