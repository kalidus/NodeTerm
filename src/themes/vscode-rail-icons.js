import React from 'react';
import { vscodeActionCatalog } from './icon-themes/vscode-catalog';

function railWrap(spec, key, children) {
  const pid = `vsc-${spec.id}-${key}`;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={spec.stroke} />
          <stop offset="100%" stopColor={spec.accent} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor={spec.glow} floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={spec.style === 'neon' ? `url(#${pid}-f)` : undefined}>
        {children}
      </g>
    </svg>
  );
}

function buildVsCodeRail(spec) {
  const pid = `vsc-${spec.id}`;
  return {
    connections: railWrap(spec, 'c', (
      <>
        <rect x="3.2" y="3.4" width="17.6" height="4.8" rx="1.4" fill={spec.bg} stroke={`url(#${pid}-c-g)`} strokeWidth="1.65" />
        <rect x="3.2" y="9.6" width="17.6" height="4.8" rx="1.4" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.65" />
        <rect x="3.2" y="15.8" width="17.6" height="4.8" rx="1.4" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.65" />
        <circle cx="6.4" cy="5.8" r="1" fill={spec.stroke} />
        <circle cx="6.4" cy="12" r="1" fill={spec.accent} />
        <circle cx="6.4" cy="18.2" r="1" fill={spec.tertiary} />
      </>
    )),
    passwords: railWrap(spec, 'p', (
      <>
        <path d="M12 2.6 4.8 5.6v5.4c0 4.6 3.1 8.1 7.2 9.4 4.1-1.3 7.2-4.8 7.2-9.4V5.6L12 2.6z" fill={spec.bg} stroke={`url(#${pid}-p-g)`} strokeWidth="1.7" strokeLinejoin="round" />
        <circle cx="12" cy="10.8" r="2" fill={spec.accent} />
        <path d="M12 12.8v3.4" stroke={spec.stroke} strokeWidth="1.7" strokeLinecap="round" />
      </>
    )),
    documents: railWrap(spec, 'd', (
      <>
        <path d="M14 2.8H6.8A1.8 1.8 0 0 0 5 4.6v14.8a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V7.8L14 2.8z" fill={spec.bg} stroke={`url(#${pid}-d-g)`} strokeWidth="1.65" />
        <path d="M14 2.8v5h5" stroke={spec.accent} strokeWidth="1.5" />
        <line x1="8.2" y1="12.2" x2="15.8" y2="12.2" stroke={spec.stroke} strokeWidth="1.55" strokeLinecap="round" />
        <line x1="8.2" y1="15.8" x2="13.6" y2="15.8" stroke={spec.secondary} strokeWidth="1.55" strokeLinecap="round" />
      </>
    )),
    favorites: railWrap(spec, 'f', (
      <path
        d="M12 2.5 14.9 8.4l6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5z"
        fill={spec.bg}
        stroke={`url(#${pid}-f-g)`}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    )),
    tools: railWrap(spec, 't', (
      <>
        <circle cx="12" cy="12" r="7.4" fill={spec.bg} stroke={`url(#${pid}-t-g)`} strokeWidth="1.65" />
        <path d="M9.6 9.8 7.2 12l2.4 2.2M14.4 9.8l2.4 2.2-2.4 2.2" stroke={spec.stroke} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12.8" y1="9.2" x2="11.2" y2="14.8" stroke={spec.accent} strokeWidth="1.5" strokeLinecap="round" />
      </>
    ))
  };
}

export const vscodeRailIcons = Object.fromEntries(
  vscodeActionCatalog.map((spec) => [spec.id, buildVsCodeRail(spec)])
);

