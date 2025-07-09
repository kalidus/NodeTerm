import React from 'react';
// Estructura de temas de iconos locales (SVG inline)
export const iconThemes = {
  material: {
    name: 'Material',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#43a047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 15h.01M16 15h.01"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      )
    }
  },
  fluent: {
    name: 'Fluent',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0078d4"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#50e6ff"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#107c10"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.5" fill="#fff"/><circle cx="16" cy="15" r="1.5" fill="#fff"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#605e5c"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#fff"/></svg>
      )
    }
  },
  linea: {
    name: 'Linea',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l4-4h6l2 2h8v2"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.5"/><circle cx="16" cy="15" r="1.5"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#607d8b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12"/></svg>
      )
    }
  },
  nord: {
    name: 'Nord',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e81ac"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#88c0d0"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a3be8c"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.5" fill="#eceff4"/><circle cx="16" cy="15" r="1.5" fill="#eceff4"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#d8dee9"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#5e81ac"/></svg>
      )
    }
  },
  dracula: {
    name: 'Dracula',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#bd93f9"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#ff79c6"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#50fa7b"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.5" fill="#f8f8f2"/><circle cx="16" cy="15" r="1.5" fill="#f8f8f2"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f8f8f2"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#bd93f9"/></svg>
      )
    }
  },
  solarized: {
    name: 'Solarized',
    icons: {
      folder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#b58900"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 7l4-4h6l2 2h8v2" fill="#268bd2"/></svg>
      ),
      ssh: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#2aa198"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.5" fill="#fdf6e3"/><circle cx="16" cy="15" r="1.5" fill="#fdf6e3"/></svg>
      ),
      file: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fdf6e3"><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="10" y="6" width="4" height="12" fill="#b58900"/></svg>
      )
    }
  }
}; 