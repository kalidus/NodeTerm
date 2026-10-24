import React from 'react';

const theme = {
  name: 'Neón',
  description: 'Iconos con efecto neón brillante',
  icons: {
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonConnectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" stroke="url(#neonConnectionGrad)" strokeWidth="2" fill="none" filter="url(#neonGlow)" />
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)" />
        </svg>,
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#ff0080" />
            </linearGradient>
            <filter id="neonFolderGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="url(#neonFolderGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonFolderGlow)" />
          <path d="M3 7l2-2h4l2 2" stroke="url(#neonFolderGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonFolderGlow)" />
        </svg>,
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonGroupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ff00" />
              <stop offset="100%" stopColor="#00ff80" />
            </linearGradient>
            <filter id="neonGroupGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)" />
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)" />
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)" />
          <rect x="14" y="14" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)" />
        </svg>,
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonKeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffff00" />
              <stop offset="100%" stopColor="#ff8000" />
            </linearGradient>
            <filter id="neonKeyGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="9" cy="12" r="3.5" stroke="url(#neonKeyGrad)" strokeWidth="2" fill="none" filter="url(#neonKeyGlow)" />
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="url(#neonKeyGrad)" strokeWidth="2" fill="none" filter="url(#neonKeyGlow)" />
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)" />
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)" />
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)" />
        </svg>,
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonCollapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonCollapseGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M15 18l-6-6 6-6" stroke="url(#neonCollapseGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonCollapseGlow)" />
        </svg>,
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonExpandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonExpandGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M9 18l6-6-6-6" stroke="url(#neonExpandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonExpandGlow)" />
        </svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonExpandAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonExpandAllGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M7 13l5 5 5-5" stroke="url(#neonExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonExpandAllGlow)" />
          <path d="M7 6l5 5 5-5" stroke="url(#neonExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonExpandAllGlow)" />
        </svg>,
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonCollapseAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonCollapseAllGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M17 11l-5-5-5 5" stroke="url(#neonCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonCollapseAllGlow)" />
          <path d="M17 18l-5-5-5 5" stroke="url(#neonCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonCollapseAllGlow)" />
        </svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonSettingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonSettingsGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="3" stroke="url(#neonSettingsGrad)" strokeWidth="2" fill="none" filter="url(#neonSettingsGlow)" />
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" stroke="url(#neonSettingsGrad)" strokeWidth="1.5" strokeLinecap="round" filter="url(#neonSettingsGlow)" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonTreeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#00ffff" />
            </linearGradient>
            <filter id="neonTreeGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#neonTreeGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonTreeGlow)" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)" />
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)" />
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)" />
        </svg>
  }
};

export default theme;
