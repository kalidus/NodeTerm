import React from 'react';
import { vscodeCatalog } from './vscode-catalog';

const FOLDER_BODY = 'M3 7.5A2 2 0 0 1 5 5.5h4.2l1.8 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10z';
const FOLDER_TAB = 'M3 7.5A2 2 0 0 1 5 5.5h4.2l1.8 2H19a2 2 0 0 1 2 2v.8H3v-2.8z';
const FOLDER_OPEN_BACK = 'M3 7.5A2 2 0 0 1 5 5.5h4.2l1.8 2H19a2 2 0 0 1 2 2v2H3v-4z';
const FOLDER_OPEN_FRONT = 'M2.4 11.2h19.2l-1.6 7.2a1.8 1.8 0 0 1-1.76 1.4H5.76A1.8 1.8 0 0 1 4 18.4l-1.6-7.2z';
const FILE_SHAPE = 'M14 3H6.8A1.8 1.8 0 0 0 5 4.8v14.4A1.8 1.8 0 0 0 6.8 21h10.4A1.8 1.8 0 0 0 19 19.2V8L14 3z';

function wrapSvg(spec, pid, children) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={spec.stroke}>
      <defs>
        <linearGradient id={`${pid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={spec.stroke} />
          <stop offset="100%" stopColor={spec.accent} />
        </linearGradient>
        <linearGradient id={`${pid}-s`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={spec.accent} />
          <stop offset="100%" stopColor={spec.secondary} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.65" floodColor={spec.glow} floodOpacity="0.45" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

/**
 * Estilo 1: Duotone Pro (Material Icon Theme, Monokai Pro, Ayu, Night Owl, Noctis)
 * Capas sólidas bitono con insignias semánticas nítidas.
 */
export function buildDuotoneVsCodeTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: wrapSvg(spec, `${id}-folder`, (
        <>
          <path d={FOLDER_BODY} fill={spec.bg} stroke={`url(#${id}-folder-g)`} strokeWidth="1.65" />
          <path d={FOLDER_TAB} fill={spec.stroke} fillOpacity="0.88" stroke="none" />
          <rect x="6.2" y="12.2" width="6.5" height="1.6" rx="0.8" fill={spec.accent} stroke="none" />
          <circle cx="16.8" cy="15.2" r="1.6" fill={spec.secondary} stroke="none" />
        </>
      )),
      folderOpen: wrapSvg(spec, `${id}-folderOpen`, (
        <>
          <path d={FOLDER_OPEN_BACK} fill={spec.stroke} fillOpacity="0.35" stroke={spec.stroke} strokeWidth="1.4" />
          <path d={FOLDER_OPEN_FRONT} fill={spec.bg} stroke={`url(#${id}-folderOpen-g)`} strokeWidth="1.65" />
          <path d="M6.5 15h7" stroke={spec.accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      ssh: wrapSvg(spec, `${id}-ssh`, (
        <>
          <rect x="2.6" y="3.6" width="18.8" height="13.2" rx="2.2" fill={spec.bg} stroke={`url(#${id}-ssh-g)`} strokeWidth="1.65" />
          <path d="M6.6 8.2 9.8 10.4 6.6 12.6" stroke={spec.stroke} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11.4" y1="12.6" x2="15.8" y2="12.6" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" />
          <circle cx="17.6" cy="6.6" r="1.2" fill={spec.tertiary} stroke="none" />
          <path d="M8.5 20.2h7M12 16.8v3.4" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      rdp: wrapSvg(spec, `${id}-rdp`, (
        <>
          <rect x="2.6" y="3.4" width="18.8" height="13" rx="2.2" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.65" />
          <rect x="5" y="5.8" width="6.2" height="3.8" rx="0.7" fill={spec.accent} fillOpacity="0.85" stroke="none" />
          <rect x="12.4" y="5.8" width="6.2" height="3.8" rx="0.7" fill={spec.stroke} fillOpacity="0.85" stroke="none" />
          <rect x="5" y="10.6" width="13.6" height="3.2" rx="0.7" fill={spec.tertiary} fillOpacity="0.65" stroke="none" />
          <path d="M8.5 20.2h7M12 16.4v3.8" stroke={spec.stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      vnc: wrapSvg(spec, `${id}-vnc`, (
        <>
          <rect x="2.6" y="3.4" width="18.8" height="13" rx="2.2" fill={spec.bg} stroke={spec.tertiary} strokeWidth="1.65" />
          <ellipse cx="12" cy="9.9" rx="4.4" ry="2.7" stroke={spec.stroke} strokeWidth="1.55" />
          <circle cx="12" cy="9.9" r="1.5" fill={spec.accent} stroke="none" />
          <path d="M8.5 20.2h7M12 16.4v3.8" stroke={spec.tertiary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      file: wrapSvg(spec, `${id}-file`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <path d="M14 3v5h5" stroke={spec.accent} strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="8" y1="12" x2="15.5" y2="12" stroke={spec.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="15.5" x2="13.5" y2="15.5" stroke={spec.stroke} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )),
      sftp: wrapSvg(spec, `${id}-sftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.accent} strokeWidth="1.6" />
          <path d="M14 3v5h5" stroke={spec.stroke} strokeWidth="1.5" />
          <rect x="8.5" y="12.5" width="7" height="5.2" rx="1" fill={spec.stroke} fillOpacity="0.22" stroke={spec.stroke} strokeWidth="1.5" />
          <path d="M10.2 12.5v-1.4a1.8 1.8 0 0 1 3.6 0v1.4" stroke={spec.tertiary} strokeWidth="1.45" />
        </>
      )),
      ftp: wrapSvg(spec, `${id}-ftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.6" />
          <path d="M14 3v5h5" stroke={spec.secondary} strokeWidth="1.5" />
          <path d="M9 12.2 12 9.4l3 2.8M9 15.6l3 2.8 3-2.8" stroke={spec.stroke} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      scp: wrapSvg(spec, `${id}-scp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.tertiary} strokeWidth="1.6" />
          <path d="M14 3v5h5" stroke={spec.tertiary} strokeWidth="1.5" />
          <path d="M8.5 11.8 11 14l-2.5 2.2M12.5 16.2h3.2" stroke={spec.stroke} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      password: wrapSvg(spec, `${id}-password`, (
        <>
          <rect x="5" y="10.8" width="14" height="9.4" rx="2" fill={spec.bg} stroke={spec.accent} strokeWidth="1.65" />
          <path d="M8.2 10.8V7.8a3.8 3.8 0 0 1 7.6 0v3" stroke={spec.stroke} strokeWidth="1.75" />
          <circle cx="12" cy="15.2" r="1.5" fill={spec.stroke} stroke="none" />
        </>
      )),
      'ssh-tunnel': wrapSvg(spec, `${id}-tunnel`, (
        <>
          <polygon points="12,2.8 20.2,7.5 12,12.2 3.8,7.5" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.6" />
          <polyline points="3.8,12.2 12,16.8 20.2,12.2" stroke={spec.accent} strokeWidth="1.6" strokeLinecap="round" />
          <polyline points="3.8,16.4 12,21 20.2,16.4" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ))
    }
  };
}

/**
 * Estilo 2: Neon Arcade (Andromeda, Outrun, Midnight Synth, Midnight City, JellyFish, Tokyo Night)
 * Contornos luminosos con resplandor neón y núcleo geométrico.
 */
export function buildNeonVsCodeTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: wrapSvg(spec, `${id}-folder`, (
        <g filter={`url(#${id}-folder-f)`}>
          <path d={FOLDER_BODY} fill={spec.bg} stroke={`url(#${id}-folder-g)`} strokeWidth="1.75" />
          <path d="M3.6 10.2h16.8" stroke={spec.accent} strokeWidth="1.15" strokeOpacity="0.85" />
          <polygon points="12,11.6 15,16.4 9,16.4" fill={spec.accent} fillOpacity="0.3" stroke={spec.stroke} strokeWidth="1.2" />
        </g>
      )),
      folderOpen: wrapSvg(spec, `${id}-folderOpen`, (
        <g filter={`url(#${id}-folderOpen-f)`}>
          <path d={FOLDER_OPEN_BACK} fill="none" stroke={spec.secondary} strokeWidth="1.5" />
          <path d={FOLDER_OPEN_FRONT} fill={spec.bg} stroke={`url(#${id}-folderOpen-g)`} strokeWidth="1.75" />
          <line x1="6" y1="15" x2="18" y2="15" stroke={spec.tertiary} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )),
      ssh: wrapSvg(spec, `${id}-ssh`, (
        <g filter={`url(#${id}-ssh-f)`}>
          <rect x="2.5" y="3.5" width="19" height="13.2" rx="2" fill={spec.bg} stroke={`url(#${id}-ssh-g)`} strokeWidth="1.75" />
          <path d="M6.5 8 10 10.2 6.5 12.4" stroke={spec.stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11.5" y1="12.4" x2="16" y2="12.4" stroke={spec.accent} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M7.5 20.2h9M12 16.7v3.5" stroke={spec.secondary} strokeWidth="1.65" strokeLinecap="round" />
        </g>
      )),
      rdp: wrapSvg(spec, `${id}-rdp`, (
        <g filter={`url(#${id}-rdp-f)`}>
          <rect x="2.5" y="3.5" width="19" height="13.2" rx="2" fill={spec.bg} stroke={spec.accent} strokeWidth="1.75" />
          <circle cx="12" cy="10" r="3.4" stroke={spec.stroke} strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.3" fill={spec.tertiary} stroke="none" />
          <path d="M7.5 20.2h9M12 16.7v3.5" stroke={spec.accent} strokeWidth="1.65" strokeLinecap="round" />
        </g>
      )),
      vnc: wrapSvg(spec, `${id}-vnc`, (
        <g filter={`url(#${id}-vnc-f)`}>
          <rect x="2.5" y="3.5" width="19" height="13.2" rx="2" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.75" />
          <path d="M6.8 10s2.3-3.2 5.2-3.2 5.2 3.2 5.2 3.2-2.3 3.2-5.2 3.2-5.2-3.2-5.2-3.2z" stroke={spec.stroke} strokeWidth="1.5" />
          <circle cx="12" cy="10" r="1.4" fill={spec.accent} stroke="none" />
          <path d="M7.5 20.2h9M12 16.7v3.5" stroke={spec.secondary} strokeWidth="1.65" strokeLinecap="round" />
        </g>
      )),
      file: wrapSvg(spec, `${id}-file`, (
        <g filter={`url(#${id}-file-f)`}>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={`url(#${id}-file-g)`} strokeWidth="1.7" />
          <path d="M14 3v5h5" stroke={spec.accent} strokeWidth="1.5" />
          <line x1="8" y1="12.5" x2="16" y2="12.5" stroke={spec.stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="16" x2="13.5" y2="16" stroke={spec.secondary} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )),
      sftp: wrapSvg(spec, `${id}-sftp`, (
        <g filter={`url(#${id}-sftp-f)`}>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <rect x="8.6" y="12.4" width="6.8" height="5" rx="0.9" stroke={spec.accent} strokeWidth="1.5" />
          <path d="M10.2 12.4V11a1.8 1.8 0 0 1 3.6 0v1.4" stroke={spec.tertiary} strokeWidth="1.4" />
        </g>
      )),
      ftp: wrapSvg(spec, `${id}-ftp`, (
        <g filter={`url(#${id}-ftp-f)`}>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.accent} strokeWidth="1.7" />
          <path d="M12 10.4v6.6M9.4 14.4 12 17l2.6-2.6" stroke={spec.stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )),
      scp: wrapSvg(spec, `${id}-scp`, (
        <g filter={`url(#${id}-scp-f)`}>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
          <path d="M12 17v-6.6M9.4 13 12 10.4 14.6 13" stroke={spec.stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )),
      password: wrapSvg(spec, `${id}-password`, (
        <g filter={`url(#${id}-password-f)`}>
          <rect x="5" y="10.8" width="14" height="9.4" rx="2" fill={spec.bg} stroke={`url(#${id}-password-g)`} strokeWidth="1.7" />
          <path d="M8.2 10.8V7.8a3.8 3.8 0 0 1 7.6 0v3" stroke={spec.accent} strokeWidth="1.7" />
          <circle cx="12" cy="15.2" r="1.5" fill={spec.tertiary} stroke="none" />
        </g>
      )),
      'ssh-tunnel': wrapSvg(spec, `${id}-tunnel`, (
        <g filter={`url(#${id}-tunnel-f)`}>
          <circle cx="12" cy="12" r="8" fill={spec.bg} stroke={`url(#${id}-tunnel-g)`} strokeWidth="1.7" />
          <polygon points="12,6.8 17,12 12,17.2 7,12" stroke={spec.accent} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="1.6" fill={spec.tertiary} stroke="none" />
        </g>
      ))
    }
  };
}

/**
 * Estilo 3: Code Studio (Cobalt 2, codeSTACKr, FireFly Pro, Celestial, One Dark Pro)
 * Insignias de desarrollador con corchetes < />, LEDs de estado y alto contraste.
 */
export function buildStudioVsCodeTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: wrapSvg(spec, `${id}-folder`, (
        <>
          <path d={FOLDER_BODY} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <path d={FOLDER_TAB} fill={spec.accent} fillOpacity="0.45" stroke="none" />
          <path d="M9.6 12.2 7.6 14l2 1.8M14.4 12.2l2 1.8-2 1.8" stroke={spec.stroke} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12.7" y1="11.8" x2="11.3" y2="16.2" stroke={spec.secondary} strokeWidth="1.45" strokeLinecap="round" />
        </>
      )),
      folderOpen: wrapSvg(spec, `${id}-folderOpen`, (
        <>
          <path d={FOLDER_OPEN_BACK} fill={spec.accent} fillOpacity="0.3" stroke={spec.accent} strokeWidth="1.4" />
          <path d={FOLDER_OPEN_FRONT} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <circle cx="7.4" cy="15" r="1.15" fill={spec.stroke} stroke="none" />
          <circle cx="11" cy="15" r="1.15" fill={spec.accent} stroke="none" />
          <circle cx="14.6" cy="15" r="1.15" fill={spec.tertiary} stroke="none" />
        </>
      )),
      ssh: wrapSvg(spec, `${id}-ssh`, (
        <>
          <rect x="2.5" y="3.4" width="19" height="13.2" rx="2" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <circle cx="5.2" cy="6" r="0.9" fill={spec.tertiary} stroke="none" />
          <circle cx="7.8" cy="6" r="0.9" fill={spec.stroke} stroke="none" />
          <circle cx="10.4" cy="6" r="0.9" fill={spec.accent} stroke="none" />
          <path d="M6.8 9.2 9.8 11.2 6.8 13.2" stroke={spec.stroke} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11.4" y1="13.2" x2="15.8" y2="13.2" stroke={spec.secondary} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M8.2 20.2h7.6M12 16.6v3.6" stroke={spec.accent} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      rdp: wrapSvg(spec, `${id}-rdp`, (
        <>
          <rect x="2.5" y="3.4" width="19" height="13.2" rx="2" fill={spec.bg} stroke={spec.accent} strokeWidth="1.75" />
          <rect x="5.2" y="6.2" width="13.6" height="7.6" rx="1" stroke={spec.secondary} strokeWidth="1.35" />
          <circle cx="12" cy="10" r="1.8" fill={spec.stroke} stroke="none" />
          <path d="M8.2 20.2h7.6M12 16.6v3.6" stroke={spec.stroke} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      vnc: wrapSvg(spec, `${id}-vnc`, (
        <>
          <rect x="2.5" y="3.4" width="19" height="13.2" rx="2" fill={spec.bg} stroke={spec.tertiary} strokeWidth="1.75" />
          <ellipse cx="12" cy="10" rx="4.2" ry="2.6" stroke={spec.stroke} strokeWidth="1.55" />
          <circle cx="12" cy="10" r="1.4" fill={spec.secondary} stroke="none" />
          <path d="M8.2 20.2h7.6M12 16.6v3.6" stroke={spec.tertiary} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      file: wrapSvg(spec, `${id}-file`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <path d="M14 3v5h5" stroke={spec.accent} strokeWidth="1.5" />
          <path d="M9.8 12.2 8 14l1.8 1.8M14.2 12.2 16 14l-1.8 1.8" stroke={spec.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      sftp: wrapSvg(spec, `${id}-sftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.accent} strokeWidth="1.7" />
          <rect x="8.6" y="12.4" width="6.8" height="5" rx="1" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.55" />
          <path d="M10.2 12.4V11a1.8 1.8 0 0 1 3.6 0v1.4" stroke={spec.secondary} strokeWidth="1.45" />
        </>
      )),
      ftp: wrapSvg(spec, `${id}-ftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
          <path d="M12 10.2v6.6M9.4 14.2 12 16.8l2.6-2.6" stroke={spec.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      scp: wrapSvg(spec, `${id}-scp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.tertiary} strokeWidth="1.7" />
          <path d="M12 16.8v-6.6M9.4 12.8 12 10.2l2.6 2.6" stroke={spec.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      password: wrapSvg(spec, `${id}-password`, (
        <>
          <rect x="5" y="10.8" width="14" height="9.4" rx="2" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <path d="M8.2 10.8V7.8a3.8 3.8 0 0 1 7.6 0v3" stroke={spec.accent} strokeWidth="1.7" />
          <rect x="11" y="14" width="2" height="3.4" rx="0.8" fill={spec.secondary} stroke="none" />
        </>
      )),
      'ssh-tunnel': wrapSvg(spec, `${id}-tunnel`, (
        <>
          <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.65" />
          <path d="M8 12h8M12 8v8" stroke={spec.accent} strokeWidth="1.65" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill={spec.secondary} stroke="none" />
        </>
      ))
    }
  };
}

/**
 * Estilo 4: Horizon Soft (Horizon, Ariake Dark, Natty, Palenight)
 * Degradados crepusculares suaves con paneles internos translúcidos.
 */
export function buildHorizonVsCodeTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: wrapSvg(spec, `${id}-folder`, (
        <>
          <path d={FOLDER_BODY} fill={`url(#${id}-folder-g)`} fillOpacity="0.22" stroke={`url(#${id}-folder-g)`} strokeWidth="1.7" />
          <path d={FOLDER_TAB} fill={`url(#${id}-folder-s)`} fillOpacity="0.65" stroke="none" />
          <path d="M6.5 14.5h11" stroke={spec.accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )),
      folderOpen: wrapSvg(spec, `${id}-folderOpen`, (
        <>
          <path d={FOLDER_OPEN_BACK} fill={spec.stroke} fillOpacity="0.28" stroke={spec.stroke} strokeWidth="1.4" />
          <path d={FOLDER_OPEN_FRONT} fill={spec.bg} stroke={`url(#${id}-folderOpen-g)`} strokeWidth="1.7" />
          <path d="M6.5 15.2h11" stroke={`url(#${id}-folderOpen-s)`} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      ssh: wrapSvg(spec, `${id}-ssh`, (
        <>
          <rect x="2.6" y="3.5" width="18.8" height="13.2" rx="2.4" fill={spec.bg} stroke={`url(#${id}-ssh-g)`} strokeWidth="1.7" />
          <rect x="4.4" y="5.3" width="15.2" height="9.6" rx="1.4" fill={`url(#${id}-ssh-g)`} fillOpacity="0.16" stroke="none" />
          <path d="M6.8 8.4 9.8 10.4 6.8 12.4" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11.4" y1="12.4" x2="15.6" y2="12.4" stroke={spec.accent} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.4 20.2h7.2M12 16.7v3.5" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      rdp: wrapSvg(spec, `${id}-rdp`, (
        <>
          <rect x="2.6" y="3.5" width="18.8" height="13.2" rx="2.4" fill={spec.bg} stroke={`url(#${id}-rdp-s)`} strokeWidth="1.7" />
          <circle cx="12" cy="10" r="3.2" fill={`url(#${id}-rdp-g)`} fillOpacity="0.35" stroke={spec.stroke} strokeWidth="1.5" />
          <path d="M8.4 20.2h7.2M12 16.7v3.5" stroke={spec.accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      vnc: wrapSvg(spec, `${id}-vnc`, (
        <>
          <rect x="2.6" y="3.5" width="18.8" height="13.2" rx="2.4" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
          <ellipse cx="12" cy="10" rx="4.2" ry="2.6" stroke={`url(#${id}-vnc-g)`} strokeWidth="1.55" />
          <circle cx="12" cy="10" r="1.4" fill={spec.accent} stroke="none" />
          <path d="M8.4 20.2h7.2M12 16.7v3.5" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )),
      file: wrapSvg(spec, `${id}-file`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={`url(#${id}-file-g)`} strokeWidth="1.65" />
          <path d="M14 3v5h5" stroke={spec.accent} strokeWidth="1.5" />
          <line x1="8" y1="12.4" x2="15.6" y2="12.4" stroke={spec.stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="15.8" x2="13.4" y2="15.8" stroke={spec.secondary} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )),
      sftp: wrapSvg(spec, `${id}-sftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={`url(#${id}-sftp-g)`} strokeWidth="1.65" />
          <rect x="8.6" y="12.4" width="6.8" height="5" rx="1.2" fill={spec.stroke} fillOpacity="0.2" stroke={spec.accent} strokeWidth="1.5" />
          <path d="M10.2 12.4V11a1.8 1.8 0 0 1 3.6 0v1.4" stroke={spec.secondary} strokeWidth="1.45" />
        </>
      )),
      ftp: wrapSvg(spec, `${id}-ftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.65" />
          <path d="M12 10.4v6.4M9.4 14.2 12 16.8l2.6-2.6" stroke={`url(#${id}-ftp-g)`} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      scp: wrapSvg(spec, `${id}-scp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.accent} strokeWidth="1.65" />
          <path d="M12 16.8v-6.4M9.4 13 12 10.4l2.6 2.6" stroke={`url(#${id}-scp-g)`} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      password: wrapSvg(spec, `${id}-password`, (
        <>
          <rect x="5" y="10.8" width="14" height="9.4" rx="2.2" fill={spec.bg} stroke={`url(#${id}-password-g)`} strokeWidth="1.65" />
          <path d="M8.2 10.8V7.8a3.8 3.8 0 0 1 7.6 0v3" stroke={spec.accent} strokeWidth="1.65" />
          <circle cx="12" cy="15.2" r="1.5" fill={spec.secondary} stroke="none" />
        </>
      )),
      'ssh-tunnel': wrapSvg(spec, `${id}-tunnel`, (
        <>
          <circle cx="12" cy="12" r="8" fill={spec.bg} stroke={`url(#${id}-tunnel-g)`} strokeWidth="1.65" />
          <path d="M7.5 12h9M12 7.5v9" stroke={spec.accent} strokeWidth="1.55" strokeLinecap="round" />
        </>
      ))
    }
  };
}

/**
 * Estilo 5: Kawaii Pastel (Pink-Cat-Boo)
 * Siluetas redondeadas con orejitas de gato y destellos pastel.
 */
export function buildKawaiiVsCodeTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: wrapSvg(spec, `${id}-folder`, (
        <>
          <path d={FOLDER_BODY} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <polygon points="5.2,5.6 7,2.8 8.8,5.6" fill={spec.stroke} stroke={spec.stroke} strokeWidth="1" strokeLinejoin="round" />
          <polygon points="15.2,5.6 17,2.8 18.8,5.6" fill={spec.stroke} stroke={spec.stroke} strokeWidth="1" strokeLinejoin="round" />
          <circle cx="9.2" cy="13" r="1" fill={spec.accent} stroke="none" />
          <circle cx="14.8" cy="13" r="1" fill={spec.accent} stroke="none" />
          <path d="M11 14.4q1 1 2 0" stroke={spec.secondary} strokeWidth="1.35" strokeLinecap="round" />
        </>
      )),
      folderOpen: wrapSvg(spec, `${id}-folderOpen`, (
        <>
          <polygon points="5.2,5.6 7,2.8 8.8,5.6" fill={spec.stroke} stroke="none" />
          <polygon points="15.2,5.6 17,2.8 18.8,5.6" fill={spec.stroke} stroke="none" />
          <path d={FOLDER_OPEN_BACK} fill={spec.secondary} fillOpacity="0.35" stroke={spec.stroke} strokeWidth="1.4" />
          <path d={FOLDER_OPEN_FRONT} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <circle cx="9.2" cy="15" r="1" fill={spec.accent} stroke="none" />
          <circle cx="14.8" cy="15" r="1" fill={spec.accent} stroke="none" />
        </>
      )),
      ssh: wrapSvg(spec, `${id}-ssh`, (
        <>
          <polygon points="4.8,3.6 6.6,1.4 8.4,3.6" fill={spec.stroke} stroke="none" />
          <polygon points="15.6,3.6 17.4,1.4 19.2,3.6" fill={spec.stroke} stroke="none" />
          <rect x="2.6" y="3.6" width="18.8" height="13.2" rx="2.8" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.75" />
          <path d="M6.8 8.4 9.8 10.4 6.8 12.4" stroke={spec.accent} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11.4" y1="12.4" x2="15.6" y2="12.4" stroke={spec.secondary} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M8.4 20.2h7.2M12 16.8v3.4" stroke={spec.stroke} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      rdp: wrapSvg(spec, `${id}-rdp`, (
        <>
          <rect x="2.6" y="3.6" width="18.8" height="13.2" rx="2.8" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.75" />
          <circle cx="12" cy="10" r="3" fill={spec.stroke} fillOpacity="0.3" stroke={spec.accent} strokeWidth="1.55" />
          <path d="M8.4 20.2h7.2M12 16.8v3.4" stroke={spec.secondary} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      vnc: wrapSvg(spec, `${id}-vnc`, (
        <>
          <rect x="2.6" y="3.6" width="18.8" height="13.2" rx="2.8" fill={spec.bg} stroke={spec.accent} strokeWidth="1.75" />
          <ellipse cx="12" cy="10" rx="4.2" ry="2.6" stroke={spec.stroke} strokeWidth="1.55" />
          <circle cx="12" cy="10" r="1.4" fill={spec.secondary} stroke="none" />
          <path d="M8.4 20.2h7.2M12 16.8v3.4" stroke={spec.accent} strokeWidth="1.65" strokeLinecap="round" />
        </>
      )),
      file: wrapSvg(spec, `${id}-file`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <path d="M14 3v5h5" stroke={spec.secondary} strokeWidth="1.5" />
          <circle cx="12" cy="14" r="2.2" fill={spec.accent} fillOpacity="0.4" stroke={spec.stroke} strokeWidth="1.4" />
        </>
      )),
      sftp: wrapSvg(spec, `${id}-sftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <rect x="8.6" y="12.4" width="6.8" height="5" rx="1.4" fill={spec.bg} stroke={spec.accent} strokeWidth="1.55" />
          <path d="M10.2 12.4V11a1.8 1.8 0 0 1 3.6 0v1.4" stroke={spec.secondary} strokeWidth="1.45" />
        </>
      )),
      ftp: wrapSvg(spec, `${id}-ftp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
          <path d="M12 10.4v6.4M9.4 14.2 12 16.8l2.6-2.6" stroke={spec.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      scp: wrapSvg(spec, `${id}-scp`, (
        <>
          <path d={FILE_SHAPE} fill={spec.bg} stroke={spec.accent} strokeWidth="1.7" />
          <path d="M12 16.8v-6.4M9.4 13 12 10.4l2.6 2.6" stroke={spec.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )),
      password: wrapSvg(spec, `${id}-password`, (
        <>
          <rect x="5" y="10.8" width="14" height="9.4" rx="2.6" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <path d="M8.2 10.8V7.8a3.8 3.8 0 0 1 7.6 0v3" stroke={spec.secondary} strokeWidth="1.7" />
          <circle cx="12" cy="15.2" r="1.5" fill={spec.accent} stroke="none" />
        </>
      )),
      'ssh-tunnel': wrapSvg(spec, `${id}-tunnel`, (
        <>
          <circle cx="12" cy="12" r="8" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.4" fill={spec.secondary} fillOpacity="0.3" stroke={spec.accent} strokeWidth="1.5" />
        </>
      ))
    }
  };
}

function buildVsCodeTreeTheme(spec) {
  if (spec.style === 'neon') return buildNeonVsCodeTheme(spec);
  if (spec.style === 'studio') return buildStudioVsCodeTheme(spec);
  if (spec.style === 'horizon') return buildHorizonVsCodeTheme(spec);
  if (spec.style === 'kawaii') return buildKawaiiVsCodeTheme(spec);
  return buildDuotoneVsCodeTheme(spec);
}

export const vscodeIconThemes = Object.fromEntries(
  vscodeCatalog.map((spec) => [spec.id, buildVsCodeTreeTheme(spec)])
);

