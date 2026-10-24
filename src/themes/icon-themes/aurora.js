import React from 'react';

const theme = {
  name: 'Aurora Borealis',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="au_f_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1e4a" />
              <stop offset="100%" stopColor="#0a0a26" />
            </linearGradient>
            <linearGradient id="au_f_grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8A2BE2" />
              <stop offset="50%" stopColor="#00FFFF" />
              <stop offset="100%" stopColor="#00FA9A" />
            </linearGradient>
            <filter id="au_f_glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Organic Fluid Folder Shape */}
          <path d="M4 7C4 5 6 4 8 4h3l3 3h6c2 0 3 1 3 3v8c0 2-1 3-3 3H7c-2 0-3-1-3-3V7z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" filter="url(#au_f_glow)" />
          <path d="M5 10c4-2 10 2 14 0" stroke="white" strokeWidth="0.5" opacity="0.3" strokeLinecap="round" />
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H3V7z" fill="#0a0a26" opacity="0.5" />
          <path d="M3 11l1.5 8.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 11H3z" fill="url(#au_f_bg)" stroke="#00FFFF" strokeWidth="1.5" style={{
        filter: 'drop-shadow(0 0 4px #00FFFF)'
      }} />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Organic Rounded Screen Shape */}
          <path d="M4 6c0-2 2-3 4-3h8c2 0 4 1 4 3v10c0 2-2 3-4 3H8c-2 0-4-1-4-3V6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" filter="url(#au_f_glow)" />
          <path d="M8 10l3 3-3 3M13 16h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    rdp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 5c0-2 2-2 4-2h6c2 0 4 0 4 2v9c0 2-2 2-4 2H9c-2 0-4 0-4-2V5z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M9 20c4-1 10 1 12 0" stroke="url(#au_f_grad)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="1.5" />
        </svg>,
    vnc: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 6c0-2 2-2 4-2h8c2 0 4 0 4 2v10c0 2-2 2-4 2H8c-2 0-4 0-4-2V6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <ellipse cx="12" cy="11" rx="5" ry="3" stroke="white" strokeWidth="1.5" />
          <path d="M12 20v-2" stroke="white" strokeWidth="1.5" />
        </svg>,
    file: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" />
          <path d="M14 3c0 2 1 6 6 6" stroke="white" strokeWidth="1.5" />
        </svg>,
    sftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <circle cx="12" cy="14" r="3" stroke="white" strokeWidth="1.5" />
          <path d="M12 12v4M10 14h4" stroke="white" strokeWidth="1" />
        </svg>,
    ftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M9 13l3-3 3 3M12 10v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    scp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H7c-2 0-3 1-3 3v14c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-6-6z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.5" />
          <path d="M8 15c2-2 6-2 8 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    password: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 11c0-1 1-2 2-2h8c1 0 2 1 2 2v7c0 1-1 2-2 2H8c-1 0-2-1-2-2v-7z" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" />
          <path d="M9 9V7c0-2 1-3 3-3s3 1 3 3v2" stroke="white" strokeWidth="1.5" />
        </svg>,
    'ssh-tunnel': <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="url(#au_f_grad)" strokeWidth="2" filter="url(#au_f_glow)" />
        </svg>
  }
};

export default theme;
