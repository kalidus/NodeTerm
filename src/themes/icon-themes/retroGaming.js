import React from 'react';

const theme = {
  name: 'Retro Gaming',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff00ff">
          <rect x="2" y="7" width="20" height="13" rx="1" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" />
          <rect x="8" y="10" width="2" height="2" fill="#ffff00" />
          <rect x="12" y="10" width="2" height="2" fill="#ffff00" />
          <rect x="10" y="12" width="4" height="1" fill="#ffff00" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff00ff">
          <rect x="2" y="7" width="20" height="13" rx="1" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" />
          <rect x="8" y="10" width="2" height="2" fill="#ffff00" />
          <rect x="12" y="10" width="2" height="2" fill="#ffff00" />
          <rect x="10" y="12" width="4" height="1" fill="#ffff00" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <pattern id="retroGrid" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#ff00ff" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect x="3" y="4" width="18" height="12" rx="1" fill="#000" stroke="#ff00ff" strokeWidth="2" />
          <rect x="4" y="6" width="16" height="8" rx="0.5" fill="url(#retroGrid)" />
          <circle cx="6" cy="8" r="1" fill="#00ffff" />
          <rect x="8" y="7.5" width="8" height="1" rx="0.5" fill="#00ffff" />
          <rect x="8" y="9.5" width="6" height="1" rx="0.5" fill="#ff00ff" />
          <rect x="8" y="11.5" width="4" height="1" rx="0.5" fill="#ffff00" />
          <rect x="18" y="5" width="2" height="2" fill="#00ffff" />
          <rect x="18" y="8" width="2" height="2" fill="#ffff00" />
          <path d="M9 18l3 3 3-3" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <defs>
            <pattern id="retroRDPGrid" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#00ffff" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="1" fill="#000" stroke="#00ffff" strokeWidth="2" />
          <rect x="4" y="6" width="16" height="8" rx="0.5" fill="url(#retroRDPGrid)" />
          <circle cx="12" cy="10" r="3" fill="none" stroke="#00ffff" strokeWidth="2" />
          <circle cx="12" cy="10" r="2" fill="#ff00ff" />
          <rect x="10" y="12" width="4" height="1" rx="0.5" fill="#ffff00" />
          <rect x="18" y="5" width="2" height="2" fill="#ff00ff" />
          <rect x="18" y="8" width="2" height="2" fill="#00ffff" />
          <path d="M8 20l4 2 4-2" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffff00">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M14 2v6h6" fill="#ff00ff" />
          <rect x="8" y="8" width="8" height="1" fill="#00ffff" />
          <rect x="8" y="10" width="6" height="1" fill="#00ffff" />
          <rect x="8" y="12" width="8" height="1" fill="#00ffff" />
        </svg>
  }
};

export default theme;
