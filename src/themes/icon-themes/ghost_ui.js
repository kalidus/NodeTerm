import React from 'react';

const theme = {
  name: 'Ghost UI',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="ghost_glow_v5" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke="white" strokeWidth="0.8" strokeLinejoin="round" filter="url(#ghost_glow_v5)" />
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v2H3V8c0-1.1.9-2 2-2z" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <path d="M3 10l2 10h14l2-10H3z" fill="rgba(255,255,255,0.03)" stroke="white" strokeWidth="0.8" strokeLinejoin="round" style={{
        backdropFilter: 'blur(3px)'
      }} filter="url(#ghost_glow_v5)" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M8 10l2 2-2 2M13 14h3" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </svg>,
    rdp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M12 8v4M10 10l2 2 2-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="14" x2="15" y2="14" stroke="white" strokeWidth="0.6" />
        </svg>,
    vnc: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="3" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <circle cx="12" cy="11" r="2.5" stroke="white" strokeWidth="0.8" />
          <path d="M12 13.5V15M10 15h4" stroke="white" strokeWidth="0.6" />
        </svg>,
    file: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.8" strokeLinejoin="round" filter="url(#ghost_glow_v5)" />
          <path d="M14 4v6h6" stroke="white" strokeWidth="0.6" opacity="0.4" />
        </svg>,
    sftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M12 11v6M10 15l2 2 2-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>,
    ftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M12 17v-6M14 13.5l-2-2-2 2" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>,
    scp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <path d="M10 14l2-2 2 2M12 12v5" stroke="white" strokeWidth="0.8" strokeLinecap="round" filter="url(#ghost_glow_v5)" />
        </svg>,
    password: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="11" width="12" height="8" rx="2" stroke="white" strokeWidth="0.8" filter="url(#ghost_glow_v5)" />
          <path d="M9 11V8c0-1.7 1.3-3 3-3s3 1.3 3 3v3" stroke="white" strokeWidth="0.6" />
        </svg>,
    'ssh-tunnel': <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="0.6" opacity="0.2" />
          <path d="M12 4.5l7 7.5-7 7.5-7-7.5 7-7.5z" stroke="white" strokeWidth="1" filter="url(#ghost_glow_v5)" />
        </svg>
  }
};

export default theme;
