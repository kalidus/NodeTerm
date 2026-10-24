import React from 'react';

const theme = {
  name: 'Material',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSSH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1976d2" />
              <stop offset="100%" stopColor="#42a5f5" />
            </linearGradient>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="2" fill="url(#materialSSH)" opacity="0.1" />
          <rect x="3" y="4" width="18" height="12" rx="2" stroke="url(#materialSSH)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1" fill="none" stroke="url(#materialSSH)" strokeWidth="1" />
          <circle cx="6" cy="8" r="0.8" fill="url(#materialSSH)" />
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="url(#materialSSH)" />
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="url(#materialSSH)" opacity="0.7" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="url(#materialSSH)" opacity="0.5" />
          <path d="M9 18l3 3 3-3" stroke="url(#materialSSH)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialRDP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007ad9" />
              <stop offset="100%" stopColor="#42a5f5" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#materialRDP)" opacity="0.1" />
          <rect x="2" y="3" width="20" height="14" rx="3" stroke="url(#materialRDP)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="url(#materialRDP)" opacity="0.2" />
          <circle cx="12" cy="10" r="2.5" fill="none" stroke="url(#materialRDP)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.5" fill="url(#materialRDP)" />
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="url(#materialRDP)" />
          <path d="M8 20l4 2 4-2" stroke="url(#materialRDP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialVNC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00c853" />
              <stop offset="100%" stopColor="#64dd17" />
            </linearGradient>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="3" fill="url(#materialVNC)" opacity="0.1" />
          <rect x="2" y="3" width="20" height="14" rx="3" stroke="url(#materialVNC)" strokeWidth="1.5" />
          <rect x="4" y="6" width="16" height="8" rx="1.5" fill="url(#materialVNC)" opacity="0.15" />
          {/* Ojo/símbolo de visualización VNC */}
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" fill="none" stroke="url(#materialVNC)" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.8" fill="url(#materialVNC)" />
          <circle cx="12" cy="10" r="1" fill="#fff" />
          <path d="M8 20l4 2 4-2" stroke="url(#materialVNC)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9800" />
              <stop offset="100%" stopColor="#ffb74d" />
            </linearGradient>
          </defs>
          {/* Archivo con candado */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialSFTP)" opacity="0.1" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none" />
          <polyline points="14 2 14 8 20 8" stroke="url(#materialSFTP)" strokeWidth="1.5" />
          {/* Candado de seguridad */}
          <rect x="8" y="12" width="8" height="6" rx="1" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none" />
          <rect x="9" y="15" width="6" height="3" rx="0.5" stroke="url(#materialSFTP)" strokeWidth="1" fill="url(#materialSFTP)" opacity="0.3" />
          <circle cx="12" cy="13.5" r="1.5" stroke="url(#materialSFTP)" strokeWidth="1.5" fill="none" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialFTP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2196f3" />
              <stop offset="100%" stopColor="#64b5f6" />
            </linearGradient>
          </defs>
          {/* Archivo con flechas de transferencia */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialFTP)" opacity="0.1" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialFTP)" strokeWidth="1.5" fill="none" />
          <polyline points="14 2 14 8 20 8" stroke="url(#materialFTP)" strokeWidth="1.5" />
          {/* Flechas de transferencia */}
          <path d="M8 12l3-3 3 3" stroke="url(#materialFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16l3 3 3-3" stroke="url(#materialFTP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="materialSCP" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4caf50" />
              <stop offset="100%" stopColor="#81c784" />
            </linearGradient>
          </defs>
          {/* Archivo con terminal y flecha */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#materialSCP)" opacity="0.1" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#materialSCP)" strokeWidth="1.5" fill="none" />
          <polyline points="14 2 14 8 20 8" stroke="url(#materialSCP)" strokeWidth="1.5" />
          {/* Terminal pequeño */}
          <rect x="7" y="10" width="6" height="4" rx="1" stroke="url(#materialSCP)" strokeWidth="1" fill="none" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="url(#materialSCP)" />
          {/* Flecha de copia */}
          <path d="M16 14l2 2 2-2" stroke="url(#materialSCP)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
  }
};

export default theme;
