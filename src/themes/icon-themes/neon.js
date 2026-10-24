import React from 'react';

const theme = {
  name: 'Neon',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow1">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#neonGlow1)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" filter="url(#neonGlow1)" />
          <circle cx="12" cy="12" r="1.5" fill="#ffff00" filter="url(#neonGlow1)" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow2">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="7" width="20" height="13" rx="2" filter="url(#neonGlow2)" />
          <path d="M2 7l4-4h6l2 2h8v2" fill="#00ffff" filter="url(#neonGlow2)" />
          <circle cx="12" cy="12" r="1.5" fill="#ffff00" filter="url(#neonGlow2)" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow3">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#neonGlow3)" />
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#neonGlow3)" />
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#neonGlow3)" />
          <path d="M6 7h12M6 11h8M6 15h6" filter="url(#neonGlow3)" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow4">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" filter="url(#neonGlow4)" />
          <line x1="8" y1="21" x2="16" y2="21" filter="url(#neonGlow4)" />
          <line x1="12" y1="17" x2="12" y2="21" filter="url(#neonGlow4)" />
          <circle cx="12" cy="10" r="3" filter="url(#neonGlow4)" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <filter id="neonGlow5">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="6" y="2" width="12" height="20" rx="2" filter="url(#neonGlow5)" />
          <path d="M14 2v6h6" filter="url(#neonGlow5)" />
        </svg>
  }
};

export default theme;
