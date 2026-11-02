import React from 'react';
import { vscodeActionCatalog } from '../icon-themes/vscode-catalog';

const FOLDER_SHAPE = 'M3.2 8.2A1.8 1.8 0 0 1 5 6.4h4l1.6 1.8h8.4A1.8 1.8 0 0 1 20.8 10v8.2A1.8 1.8 0 0 1 19 20H5a1.8 1.8 0 0 1-1.8-1.8v-10z';

function actionSvg(spec, pid, children) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={spec.stroke} />
          <stop offset="100%" stopColor={spec.accent} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor={spec.glow} floodOpacity="0.45" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

function buildDuotoneActions(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    description: spec.description,
    icons: {
      newConnection: actionSvg(spec, `${id}-new`, (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill={spec.bg} stroke={`url(#${id}-new-g)`} strokeWidth="1.7" />
          <path d="M12 7.5v9M7.5 12h9" stroke={spec.stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="7" r="1.3" fill={spec.accent} />
        </>
      )),
      newFolder: actionSvg(spec, `${id}-folder`, (
        <>
          <path d={FOLDER_SHAPE} fill={spec.bg} stroke={`url(#${id}-folder-g)`} strokeWidth="1.7" />
          <path d="M3.2 8.2A1.8 1.8 0 0 1 5 6.4h4l1.6 1.8H3.2z" fill={spec.stroke} fillOpacity="0.85" />
          <path d="M12 11.4v5.2M9.4 14h5.2" stroke={spec.accent} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )),
      newGroup: actionSvg(spec, `${id}-group`, (
        <>
          <rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.65" />
          <rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6" fill={spec.bg} stroke={spec.accent} strokeWidth="1.65" />
          <rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.65" />
          <path d="M17 14v6M14 17h6" stroke={spec.tertiary} strokeWidth="1.85" strokeLinecap="round" />
        </>
      )),
      passwordManager: actionSvg(spec, `${id}-pass`, (
        <>
          <rect x="4.8" y="10.6" width="14.4" height="9.4" rx="2.2" fill={spec.bg} stroke={spec.accent} strokeWidth="1.7" />
          <path d="M8.2 10.6V7.8a3.8 3.8 0 0 1 7.6 0v2.8" stroke={spec.stroke} strokeWidth="1.75" />
          <circle cx="12" cy="15.2" r="1.5" fill={spec.stroke} />
        </>
      )),
      collapseLeft: actionSvg(spec, `${id}-left`, (
        <>
          <rect x="3.6" y="4" width="16.8" height="16" rx="3" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <line x1="8.4" y1="4.5" x2="8.4" y2="19.5" stroke={spec.secondary} strokeWidth="1.4" />
          <path d="M15.2 9 12 12l3.2 3" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      expandRight: actionSvg(spec, `${id}-right`, (
        <>
          <rect x="3.6" y="4" width="16.8" height="16" rx="3" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <line x1="8.4" y1="4.5" x2="8.4" y2="19.5" stroke={spec.secondary} strokeWidth="1.4" />
          <path d="M12 9l3.2 3-3.2 3" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      menu: actionSvg(spec, `${id}-menu`, (
        <>
          <rect x="3.5" y="4" width="17" height="16" rx="3" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.6" />
          <path d="M7.2 8.5h9.6" stroke={spec.stroke} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M7.2 12h9.6" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M7.2 15.5h6.4" stroke={spec.tertiary} strokeWidth="1.85" strokeLinecap="round" />
        </>
      )),
      expandAll: actionSvg(spec, `${id}-exp`, (
        <>
          <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <path d="M8.2 8.8 12 12.2l3.8-3.4M8.2 13 12 16.4 15.8 13" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      collapseAll: actionSvg(spec, `${id}-col`, (
        <>
          <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <path d="M8.2 11.4 12 8l3.8 3.4M8.2 15.6 12 12.2l3.8 3.4" stroke={spec.secondary} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      settings: actionSvg(spec, `${id}-set`, (
        <>
          <circle cx="12" cy="12" r="7.8" fill={spec.bg} stroke={`url(#${id}-set-g)`} strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3" fill={spec.accent} fillOpacity="0.3" stroke={spec.stroke} strokeWidth="1.65" />
          <path d="M12 2.4v2M12 19.6v2M2.4 12h2M19.6 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      treeTheme: actionSvg(spec, `${id}-tree`, (
        <>
          <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <path d="M8 7.5v9M8 12h5.5M13.5 9v6.5" stroke={spec.secondary} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="7.5" r="1.4" fill={spec.stroke} />
          <circle cx="13.5" cy="9" r="1.4" fill={spec.accent} />
          <circle cx="13.5" cy="15.5" r="1.4" fill={spec.tertiary} />
        </>
      ))
    }
  };
}

function buildNeonActions(spec) {
  const id = spec.id;
  const base = buildDuotoneActions(spec);
  return {
    ...base,
    icons: Object.fromEntries(
      Object.entries(base.icons).map(([k, svgEl]) => [
        k,
        React.cloneElement(svgEl, {}, (
          <>
            {svgEl.props.children[0]}
            <g filter={`url(#${id}-${k === 'newConnection' ? 'new' : k === 'newFolder' ? 'folder' : k === 'newGroup' ? 'group' : k === 'passwordManager' ? 'pass' : k === 'collapseLeft' ? 'left' : k === 'expandRight' ? 'right' : k === 'expandAll' ? 'exp' : k === 'collapseAll' ? 'col' : k === 'settings' ? 'set' : k === 'treeTheme' ? 'tree' : 'menu'}-f)`}>
              {svgEl.props.children[1]}
            </g>
          </>
        ))
      ])
    )
  };
}

export const vscodeActionIconThemes = Object.fromEntries(
  vscodeActionCatalog.map((spec) => [
    spec.id,
    spec.style === 'neon' ? buildNeonActions(spec) : buildDuotoneActions(spec)
  ])
);

