import React from 'react';

const theme = {
  name: 'Neon Glow',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFolder" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M2 7l4-4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolder)" strokeLinejoin="round" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFolderOpen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M2 7l4-4h6l2 2h8v2" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolderOpen)" strokeLinejoin="round" />
          <path d="M2 10l2.5 10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1L22 10H2z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFolderOpen)" strokeLinejoin="round" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowSsh" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="15" rx="2" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSsh)" />
          <path d="M7 8l3 3-3 3M13 14h4" stroke="#ff00ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowSsh)" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowRdp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#39ff14" strokeWidth="1.5" filter="url(#neonGlowRdp)" />
          <path d="M8 21h8M12 17v4" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" filter="url(#neonGlowRdp)" />
          <circle cx="12" cy="10" r="3" stroke="#39ff14" strokeWidth="1.5" filter="url(#neonGlowRdp)" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowVnc" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowVnc)" />
          <path d="M8 21h8M12 17v4" stroke="#ffea00" strokeWidth="1.5" strokeLinecap="round" filter="url(#neonGlowVnc)" />
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowVnc)" />
          <circle cx="12" cy="10" r="1" fill="#ffea00" filter="url(#neonGlowVnc)" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFile" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ffffff" strokeWidth="1.5" filter="url(#neonGlowFile)" />
          <polyline points="14 2 14 8 20 8" stroke="#ffffff" strokeWidth="1.5" filter="url(#neonGlowFile)" />
        </svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowSftp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSftp)" />
          <polyline points="14 2 14 8 20 8" stroke="#ff00ff" strokeWidth="1.5" filter="url(#neonGlowSftp)" />
          <rect x="9" y="13" width="6" height="4" stroke="#00ffff" strokeWidth="1.5" rx="0.5" filter="url(#neonGlowSftp)" />
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowSftp)" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowFtp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFtp)" />
          <polyline points="14 2 14 8 20 8" stroke="#00ffff" strokeWidth="1.5" filter="url(#neonGlowFtp)" />
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowFtp)" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <filter id="neonGlowScp" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowScp)" />
          <polyline points="14 2 14 8 20 8" stroke="#ffea00" strokeWidth="1.5" filter="url(#neonGlowScp)" />
          <path d="M9 15l3-3 3 3" stroke="#ff00ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowScp)" />
        </svg>
  }
};

export default theme;
