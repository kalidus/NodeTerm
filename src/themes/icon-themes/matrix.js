import React from 'react';

const theme = {
  name: 'Matrix',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="2" y="7" width="20" height="13" rx="1" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#001100" />
          <text x="8" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">01</text>
          <text x="12" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">10</text>
          <text x="16" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">11</text>
          <text x="6" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">010</text>
          <text x="14" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">101</text>
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="2" y="7" width="20" height="13" rx="1" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#001100" />
          <text x="8" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">01</text>
          <text x="12" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">10</text>
          <text x="16" y="12" fontSize="3" fill="#00ff00" fontFamily="monospace">11</text>
          <text x="6" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">010</text>
          <text x="14" y="16" fontSize="2" fill="#00ff00" fontFamily="monospace">101</text>
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M6 7h12M6 11h8M6 15h6" />
          <text x="18" y="7" fontSize="2" fill="#00ff00" fontFamily="monospace">$</text>
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
          <text x="11" y="11" fontSize="2" fill="#00ff00" fontFamily="monospace">RDP</text>
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1" ry="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <ellipse cx="12" cy="10" rx="3.5" ry="2.5" />
          <circle cx="12" cy="10" r="2" fill="#00ff00" opacity="0.2" />
          <circle cx="12" cy="10" r="1.2" fill="#00ff00" />
          <text x="10.5" y="11" fontSize="2" fill="#00ff00" fontFamily="monospace">VNC</text>
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
          <rect x="6" y="2" width="12" height="20" rx="1" />
          <path d="M14 2v6h6" fill="#001100" />
          <text x="8" y="10" fontSize="2" fill="#00ff00" fontFamily="monospace">FILE</text>
          <text x="8" y="13" fontSize="1.5" fill="#00ff00" fontFamily="monospace">001</text>
          <text x="8" y="15" fontSize="1.5" fill="#00ff00" fontFamily="monospace">110</text>
        </svg>
  }
};

export default theme;
