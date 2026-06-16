import React from 'react';

export const railIcons = {
  modern: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="modernConnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4fc3f7" />
            <stop offset="100%" stopColor="#0288d1" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="5" rx="1.5" stroke="url(#modernConnGrad)" strokeWidth="1.8"/>
        <rect x="3" y="10" width="18" height="5" rx="1.5" stroke="url(#modernConnGrad)" strokeWidth="1.8"/>
        <rect x="3" y="17" width="18" height="5" rx="1.5" stroke="url(#modernConnGrad)" strokeWidth="1.8"/>
        <circle cx="6" cy="5.5" r="1" fill="url(#modernConnGrad)"/>
        <circle cx="9" cy="5.5" r="1" fill="url(#modernConnGrad)"/>
        <circle cx="6" cy="12.5" r="1" fill="url(#modernConnGrad)"/>
        <circle cx="9" cy="12.5" r="1" fill="url(#modernConnGrad)"/>
        <circle cx="6" cy="19.5" r="1" fill="url(#modernConnGrad)"/>
        <circle cx="9" cy="19.5" r="1" fill="url(#modernConnGrad)"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="modernPassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef9a9a" />
            <stop offset="100%" stopColor="#d32f2f" />
          </linearGradient>
        </defs>
        <path d="M12 2L4 5V11C4 16.52 7.42 20.24 12 22C16.58 20.24 20 16.52 20 11V5L12 2Z" 
              stroke="url(#modernPassGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7V13" stroke="url(#modernPassGrad)" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="15" r="1.2" fill="url(#modernPassGrad)"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="modernDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64b5f6" />
            <stop offset="100%" stopColor="#1976d2" />
          </linearGradient>
        </defs>
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" 
              stroke="url(#modernDocGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" stroke="url(#modernDocGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="8" y1="12" x2="16" y2="12" stroke="url(#modernDocGrad)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="16" x2="14" y2="16" stroke="url(#modernDocGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="modernFavGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffc107" />
            <stop offset="100%" stopColor="#ff9800" />
          </linearGradient>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
              stroke="url(#modernFavGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="modernToolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="url(#modernToolGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  minimal: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="3" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="4" y="10" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="4" y="17" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="7" cy="5.5" r="0.75" fill="currentColor"/>
        <circle cx="7" cy="12.5" r="0.75" fill="currentColor"/>
        <circle cx="7" cy="19.5" r="0.75" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C12 22 20 18 20 11V5L12 2L4 5V11C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 13V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },

  classic: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="10" width="18" height="5" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="17" width="18" height="5" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
        <circle cx="7" cy="5.5" r="1" fill="currentColor"/>
        <circle cx="7" cy="12.5" r="1" fill="currentColor"/>
        <circle cx="7" cy="19.5" r="1" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C12 22 20 18 20 11V5L12 2L4 5V11C4 18 12 22 12 22Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="11" r="2" fill="currentColor"/>
        <path d="M12 13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  neon: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonConnGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="3" y="3" width="18" height="5" rx="1" stroke="#00f5ff" strokeWidth="2" filter="url(#neonConnGlow)"/>
        <rect x="3" y="10" width="18" height="5" rx="1" stroke="#00f5ff" strokeWidth="2" filter="url(#neonConnGlow)"/>
        <rect x="3" y="17" width="18" height="5" rx="1" stroke="#00f5ff" strokeWidth="2" filter="url(#neonConnGlow)"/>
        <circle cx="7" cy="5.5" r="0.75" fill="#00f5ff"/>
        <circle cx="7" cy="12.5" r="0.75" fill="#00f5ff"/>
        <circle cx="7" cy="19.5" r="0.75" fill="#00f5ff"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonPassGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M12 22C12 22 20 18 20 11V5L12 2L4 5V11C4 18 12 22 12 22Z" stroke="#ff00ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonPassGlow)"/>
        <circle cx="12" cy="11" r="2.5" stroke="#ff00ff" strokeWidth="1.5"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonDocGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#00ff00" strokeWidth="2" filter="url(#neonDocGlow)"/>
        <path d="M14 2V8H20" stroke="#00ff00" strokeWidth="2"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonFavGlow">
            <feGaussianBlur stdDeviation="1.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#ffff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonFavGlow)"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonToolGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="12" cy="12" r="4.5" stroke="#ff8000" strokeWidth="2" filter="url(#neonToolGlow)" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="#ff8000" strokeWidth="2" filter="url(#neonToolGlow)" strokeLinecap="round" />
      </svg>
    )
  },

  outline: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="10" width="18" height="5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="17" width="18" height="5" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="6" y1="5.5" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="6" y1="12.5" x2="8" y2="12.5" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="6" y1="19.5" x2="8" y2="19.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5V11C4 17 12 21 12 21C12 21 20 17 20 11V5L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 11L11 13L15 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="7" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15 8L22 9L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  bold: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="2.8" fill="currentColor" fillOpacity="0.2"/>
        <rect x="3" y="10" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="2.8" fill="currentColor" fillOpacity="0.2"/>
        <rect x="3" y="17" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="2.8" fill="currentColor" fillOpacity="0.2"/>
        <circle cx="7" cy="5.5" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="12.5" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="19.5" r="1.5" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 5.5V11.5C3 17.5 12 22 12 22C12 22 21 17.5 21 11.5V5.5L12 2Z" stroke="currentColor" strokeWidth="2.8" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H5C3.9 2 3 2.9 3 4V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V9L14 2Z" stroke="currentColor" strokeWidth="2.8" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V9H21" stroke="currentColor" strokeWidth="2.8"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.5 8.5L22.5 9.5L17.5 14.5L19 21.5L12 18L5 21.5L6.5 14.5L1.5 9.5L8.5 8.5L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.8" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.2 2.2M16.8 16.8l2.2 2.2M5 19l2.2-2.2M16.8 7.2l2.2-2.2" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    )
  },

  rounded: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="10" width="18" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="17" width="18" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="7" cy="5.5" r="1.2" fill="currentColor"/>
        <circle cx="7" cy="12.5" r="1.2" fill="currentColor"/>
        <circle cx="7" cy="19.5" r="1.2" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17 19.5 20 15.5 20 11V6.5L12 3L4 6.5V11C4 15.5 7 19.5 12 22Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="11.5" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8L14 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.8 8.2L21.6 9.2L16.7 14L17.8 20.8L12 17.6L6.2 20.8L7.3 14L2.4 9.2L9.2 8.2L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  geometric: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="2,3 22,3 22,8 2,8" stroke="currentColor" strokeWidth="2"/>
        <polygon points="2,10 22,10 22,15 2,15" stroke="currentColor" strokeWidth="2"/>
        <polygon points="2,17 22,17 22,22 2,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12,2 22,6 18,17 12,22 6,17 2,6" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/>
        <polygon points="12,7 16,10 14,15 10,15 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="4,2 14,2 20,8 20,22 4,22" stroke="currentColor" strokeWidth="2"/>
        <polygon points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12,2 16,9 23,10 18,15 19,22 12,18 5,22 6,15 1,10 8,9" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="7" width="10" height="10" stroke="currentColor" strokeWidth="2" transform="rotate(45 12 12)"/>
        <polygon points="12,2 14,6 10,6" fill="currentColor"/>
        <polygon points="12,22 14,18 10,18" fill="currentColor"/>
        <polygon points="2,12 6,14 6,10" fill="currentColor"/>
        <polygon points="22,12 18,14 18,10" fill="currentColor"/>
      </svg>
    )
  },

  filled: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="5" rx="1"/>
        <rect x="2" y="10" width="20" height="5" rx="1"/>
        <rect x="2" y="17" width="20" height="5" rx="1"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 5v6c0 5.5 4.5 10 9 11c4.5-1 9-5.5 9-11V5L12 2ZM11 15h2v2h-2v-2Zm0-8h2v6h-2V7Z"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Z"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" />
      </svg>
    )
  },

  duotone: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <rect x="3" y="10" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <rect x="3" y="17" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <circle cx="7" cy="5.5" r="1" fill="currentColor"/>
        <circle cx="7" cy="12.5" r="1" fill="currentColor"/>
        <circle cx="7" cy="19.5" r="1" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5V11C4 16.5 7.5 20.2 12 22C16.5 20.2 20 16.5 20 11V5L12 2Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <path d="M12 6V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    )
  },

  pixel: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 3h20v4H2V3zm0 7h20v4H2v-4zm0 7h20v4H2v-4z" fill="currentColor"/>
        <rect x="5" y="4" width="2" height="2" fill="white"/>
        <rect x="5" y="11" width="2" height="2" fill="white"/>
        <rect x="5" y="18" width="2" height="2" fill="white"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16v6h-2v4h-2v2h-2v2h-4v-2H8v-2H6v-4H4V4zm4 4h8v2H8V8z" fill="currentColor"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 2h10v2h2v2h2v2h2v14H4V2zm10 2v4h4V6h-2V4h-2zm-6 8h8v2H8v-2zm0 4h8v2H8v-2z" fill="currentColor"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 2h2v4h2v2h4v2h-2v2h-2v4h-2v4h-2v-4H9v-4H7V10H5V8h4V6h2V2z" fill="currentColor"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="18" width="2" height="2" />
        <rect x="6" y="16" width="2" height="2" />
        <rect x="8" y="14" width="2" height="2" />
        <rect x="10" y="12" width="2" height="2" />
        <rect x="12" y="10" width="2" height="2" />
        <path d="M14 4h6v6h-2V8h-2V6h-2V4z" />
      </svg>
    )
  },

  glyphs: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="3" y1="5" x2="21" y2="5" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
        <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="5" cy="19" r="1.5" fill="currentColor"/>
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 11V7.5a3 3 0 1 1 6 0V11" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="15.5" r="1" fill="currentColor"/>
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="9" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3l2.5 6h6.5l-5 4.5 2 6.5-6-4-6 4 2-6.5-5-4.5h6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )
  },

  cyberpunk: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4h18M3 12h18M3 20h18" stroke="#00ffff" strokeWidth="2" />
        <rect x="6" y="2" width="4" height="4" fill="#f600ff" />
        <rect x="14" y="10" width="4" height="4" fill="#f600ff" />
        <rect x="8" y="18" width="4" height="4" fill="#f600ff" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 5.5v6c0 6 9 10.5 9 10.5s9-4.5 9-10.5v-6L12 2z" stroke="#f600ff" strokeWidth="2" fill="#f600ff" fillOpacity="0.1" />
        <rect x="10" y="9" width="4" height="5" stroke="#00ffff" strokeWidth="1.5" fill="none" />
        <path d="M11 9V7.5a1 1 0 1 1 2 0V9" stroke="#00ffff" strokeWidth="1.5" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 2h10l6 6v14H4V2z" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" />
        <line x1="8" y1="8" x2="12" y2="8" stroke="#f600ff" strokeWidth="2" />
        <line x1="8" y1="13" x2="16" y2="13" stroke="#f600ff" strokeWidth="2" />
        <line x1="8" y1="17" x2="14" y2="17" stroke="#f600ff" strokeWidth="2" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" stroke="#ffe600" strokeWidth="2" fill="#ffe600" fillOpacity="0.15" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.5" stroke="#00ffff" strokeWidth="1.8" fill="#00ffff" fillOpacity="0.05" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#f600ff" strokeWidth="1.8" />
      </svg>
    )
  },

  glass: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glassBarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="5" rx="1.5" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <rect x="3" y="10" width="18" height="5" rx="1.5" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <rect x="3" y="17" width="18" height="5" rx="1.5" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <circle cx="12" cy="11.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="12" y1="14" x2="12" y2="17" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <path d="M14 2v6h6" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" fill="url(#glassBarGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  },

  vibrant: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vibConnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff007c" />
            <stop offset="100%" stopColor="#784ba0" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="5" rx="1.5" stroke="url(#vibConnGrad)" strokeWidth="2" />
        <rect x="3" y="10" width="18" height="5" rx="1.5" stroke="url(#vibConnGrad)" strokeWidth="2" />
        <rect x="3" y="17" width="18" height="5" rx="1.5" stroke="url(#vibConnGrad)" strokeWidth="2" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vibPassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00dbde" />
            <stop offset="100%" stopColor="#fc00ff" />
          </linearGradient>
        </defs>
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" stroke="url(#vibPassGrad)" strokeWidth="2" fill="url(#vibPassGrad)" fillOpacity="0.1" />
        <circle cx="12" cy="12" r="2" fill="url(#vibPassGrad)" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vibDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fad961" />
            <stop offset="100%" stopColor="#f76b1c" />
          </linearGradient>
        </defs>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="url(#vibDocGrad)" strokeWidth="2" fill="url(#vibDocGrad)" fillOpacity="0.1" />
        <path d="M14 2v6h6" stroke="url(#vibDocGrad)" strokeWidth="2" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vibFavGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" stroke="url(#vibFavGrad)" strokeWidth="2" fill="url(#vibFavGrad)" fillOpacity="0.15" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vibToolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#85ffbd" />
            <stop offset="100%" stopColor="#fffb7d" />
          </linearGradient>
        </defs>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="url(#vibToolGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  holographic: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="holoConnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="50%" stopColor="#3a7bd5" />
            <stop offset="100%" stopColor="#00d2ff" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="5" rx="1.5" stroke="url(#holoConnGrad)" strokeWidth="2" />
        <rect x="3" y="10" width="18" height="5" rx="1.5" stroke="url(#holoConnGrad)" strokeWidth="2" />
        <rect x="3" y="17" width="18" height="5" rx="1.5" stroke="url(#holoConnGrad)" strokeWidth="2" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" stroke="url(#holoConnGrad)" strokeWidth="2" fill="url(#holoConnGrad)" fillOpacity="0.1" />
        <circle cx="12" cy="12" r="2.5" stroke="url(#holoConnGrad)" strokeWidth="1.5" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="url(#holoConnGrad)" strokeWidth="2" />
        <path d="M14 2v6h6" stroke="url(#holoConnGrad)" strokeWidth="1.5" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" stroke="url(#holoConnGrad)" strokeWidth="2" fill="url(#holoConnGrad)" fillOpacity="0.2" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.5" stroke="url(#holoConnGrad)" strokeWidth="1.8" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="url(#holoConnGrad)" strokeWidth="1.5" />
      </svg>
    )
  },

  glitch: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.8">
          <rect x="2" y="3.5" width="18" height="5" rx="1" stroke="#ff0000" strokeWidth="2" />
          <rect x="4" y="2.5" width="18" height="5" rx="1" stroke="#00ffff" strokeWidth="2" />
        </g>
        <rect x="3" y="10" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="17" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" stroke="#ff00ff" strokeWidth="2" transform="translate(-1, 0)" />
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#ff0000" strokeWidth="2" transform="translate(-1, 0)" />
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" stroke="#00ff00" strokeWidth="2.5" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="#ff0000" strokeWidth="2" transform="translate(-1, 0)" />
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
      </svg>
    )
  },

  acrylic: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="1.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <rect x="3" y="10" width="18" height="5" rx="1.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <rect x="3" y="17" width="18" height="5" rx="1.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="white" strokeWidth="1" opacity="0.6" />
      </svg>
    )
  },

  neumorphic: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="5" rx="1.5" fill="#e0e0e0" fillOpacity="0.1" stroke="#748ffc" strokeWidth="2" />
        <rect x="3" y="10" width="18" height="5" rx="1.5" fill="#e0e0e0" fillOpacity="0.1" stroke="#748ffc" strokeWidth="2" />
        <rect x="3" y="17" width="18" height="5" rx="1.5" fill="#e0e0e0" fillOpacity="0.1" stroke="#748ffc" strokeWidth="2" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" fill="#e0e0e0" fillOpacity="0.1" stroke="#ffd43b" strokeWidth="2.5" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#e0e0e0" fillOpacity="0.1" stroke="#f06595" strokeWidth="2.5" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="#e0e0e0" fillOpacity="0.1" stroke="#63e6be" strokeWidth="2.5" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },

  fluent: {
    connections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" rx="4" fill="#0078d4" fillOpacity="0.15" stroke="#0078d4" strokeWidth="1.5" />
        <line x1="4" y1="9" x2="20" y2="9" stroke="#0078d4" strokeWidth="1" />
        <line x1="4" y1="14" x2="20" y2="14" stroke="#0078d4" strokeWidth="1" />
      </svg>
    ),
    passwords: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" fill="#d83b01" fillOpacity="0.15" stroke="#d83b01" strokeWidth="1.5" />
        <circle cx="12" cy="11.5" r="2.5" stroke="#d83b01" strokeWidth="1.5" />
      </svg>
    ),
    documents: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#ffb900" fillOpacity="0.15" stroke="#ffb900" strokeWidth="1.5" />
        <path d="M14 2v6h6" stroke="#ffb900" strokeWidth="1.5" />
      </svg>
    ),
    favorites: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="#107c10" fillOpacity="0.15" stroke="#107c10" strokeWidth="1.5" />
      </svg>
    ),
    tools: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.5" fill="#0078d4" fillOpacity="0.15" stroke="#0078d4" strokeWidth="1.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#0078d4" strokeWidth="1.5" />
      </svg>
    )
  }
};
