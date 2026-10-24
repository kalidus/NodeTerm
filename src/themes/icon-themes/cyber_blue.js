import React from 'react';

const theme = {
  name: 'Cyber Blue',
  icons: {
    folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cb_f_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2236" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>
            <filter id="cb_f_glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Cybernetic Geometric Folder Shape */}
          <path d="M3 7l2-2h5l2 2h9v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="url(#cb_f_bg)" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_f_glow)" />
          <path d="M3 9h18M3 11h18" stroke="#00f2fe" strokeWidth="0.5" opacity="0.2" />
          <path d="M21 9l-2-2M3 9l2-2" stroke="#00f2fe" strokeWidth="1" />
          <rect x="7" y="14" width="10" height="1" fill="#00f2fe" opacity="0.4" />
        </svg>,
    folderOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="cb_fo_bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2236" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>
            <filter id="cb_fo_blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H3V7z" fill="#0b0f19" opacity="0.5" />
          <path d="M3 11l1.5 8.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 11H3z" fill="url(#cb_fo_bg)" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_fo_blur)" />
          <path d="M5 13h14" stroke="white" strokeWidth="0.5" opacity="0.1" />
        </svg>,
    ssh: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="cb_s_glow_v2">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M2 5l2-2h16l2 2v12l-2 2H4l-2-2V5z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M6 9l3 3-3 3M12 15h5" stroke="#00f2fe" strokeWidth="2" strokeLinecap="square" />
          <path d="M2 7h20M2 17h20" stroke="#00f2fe" strokeWidth="0.5" opacity="0.3" />
        </svg>,
    rdp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 4h18v13H3V4z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M3 7h18" stroke="#00f2fe" strokeWidth="0.5" opacity="0.3" />
          <circle cx="12" cy="11" r="3" stroke="#00f2fe" strokeWidth="1" />
          <path d="M9 21l2-4h2l2 4" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>,
    vnc: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 4l18 0l0 13l-18 0l0-13z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <rect x="7" y="8" width="10" height="6" stroke="#00f2fe" strokeWidth="1" />
          <circle cx="12" cy="11" r="1.5" fill="#00f2fe" />
          <path d="M9 21l2-4h2l2 4" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>,
    file: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M13 3v6h6" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M8 13h8M8 16h5" stroke="#00f2fe" strokeWidth="1" opacity="0.5" />
        </svg>,
    sftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M9 14l3 3 3-3M12 11v6" stroke="#00f2fe" strokeWidth="1.5" />
          <rect x="3" y="19" width="18" height="2" fill="#00f2fe" opacity="0.2" />
        </svg>,
    ftp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M12 12l-3 3 3 3M15 12l3 3-3 3" stroke="#00f2fe" strokeWidth="1.5" />
        </svg>,
    scp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 3H5v18h14V9l-6-6z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" />
          <path d="M8 15l4-4 4 4" stroke="#00f2fe" strokeWidth="2" strokeLinecap="square" />
        </svg>,
    password: <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 11h14v9H5v-9z" fill="#0b0f19" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#00f2fe" strokeWidth="1.5" />
          <circle cx="12" cy="15.5" r="1" fill="#00f2fe" />
        </svg>,
    'ssh-tunnel': <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l-8 5 8 5 8-5-8-5z" stroke="#00f2fe" strokeWidth="1.5" filter="url(#cb_s_glow_v2)" />
          <path d="M4 12l8 4 8-4M4 17l8 4 8-4" stroke="#00f2fe" strokeWidth="1.5" opacity="0.5" />
        </svg>
  }
};

export default theme;
