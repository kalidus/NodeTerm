import React from 'react';
import { futuristCatalog } from './futurist-catalog';

const FOLDER = 'M2.5 7.5A2.5 2.5 0 0 1 5 5h4.5l2 2H20a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 21H5A2.5 2.5 0 0 1 2.5 18.5v-11z';
const FOLDER_BACK = 'M2 7.5A2.5 2.5 0 0 1 4.5 5h5l2 2h8A2.5 2.5 0 0 1 22 9.5V11H3L2 19V7.5z';
const FOLDER_FRONT = 'M22 11H4l-1.5 8.5A2 2 0 0 0 4.5 22h16.5a2 2 0 0 0 2-2.5L22 11z';
const FILE = 'M14 2.2H6.2a2 2 0 0 0-2 2v15.6a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2V8.2L14 2.2z';

function HoloSvg({ pid, palette, children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.c1} />
          <stop offset="48%" stopColor={palette.c2} />
          <stop offset="100%" stopColor={palette.c3} />
        </linearGradient>
        <linearGradient id={`${pid}-b`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.veil} stopOpacity="0.82" />
          <stop offset="100%" stopColor={palette.c3} stopOpacity="0.14" />
        </linearGradient>
        <filter id={`${pid}-f`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.25" floodColor={palette.glow} floodOpacity="0.62" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

function holoShape(pid, d, opacity) {
  return (
    <>
      <path d={d} fill={`url(#${pid}-a)`} filter={`url(#${pid}-f)`} opacity={opacity} />
      <path d={d} fill={`url(#${pid}-b)`} style={{ mixBlendMode: 'overlay' }} opacity={opacity} />
    </>
  );
}

export function buildHolographicTheme(spec) {
  const id = spec.id;
  const ink = { stroke: '#ffffff', strokeWidth: 1.45, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return {
    name: spec.name,
    icons: {
      folder: (
        <HoloSvg pid={`${id}-folder`} palette={spec}>
          {holoShape(`${id}-folder`, FOLDER)}
          <path d="M4 9.2h16" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8" />
        </HoloSvg>
      ),
      folderOpen: (
        <HoloSvg pid={`${id}-folderOpen`} palette={spec}>
          {holoShape(`${id}-folderOpen`, FOLDER_BACK, 0.55)}
          {holoShape(`${id}-folderOpen`, FOLDER_FRONT)}
          <path d="M5 12.4h14" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
        </HoloSvg>
      ),
      ssh: (
        <HoloSvg pid={`${id}-ssh`} palette={spec}>
          {holoShape(`${id}-ssh`, 'M2.2 5.4A2.2 2.2 0 0 1 4.4 3.2h15.2a2.2 2.2 0 0 1 2.2 2.2v10.2a2.2 2.2 0 0 1-2.2 2.2H4.4a2.2 2.2 0 0 1-2.2-2.2V5.4z')}
          <path d="M7 8.1l2.8 2.5L7 13.1M12.5 13.3h4.2" {...ink} />
        </HoloSvg>
      ),
      rdp: (
        <HoloSvg pid={`${id}-rdp`} palette={spec}>
          {holoShape(`${id}-rdp`, 'M2.2 5.2A2 2 0 0 1 4.2 3.2h15.6a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H4.2a2 2 0 0 1-2-2V5.2z')}
          <path d="M8.2 20.6h7.6M12 16v4.6" {...ink} />
          <circle cx="12" cy="9.5" r="2.25" {...ink} />
        </HoloSvg>
      ),
      vnc: (
        <HoloSvg pid={`${id}-vnc`} palette={spec}>
          {holoShape(`${id}-vnc`, 'M2.2 5.2A2 2 0 0 1 4.2 3.2h15.6a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H4.2a2 2 0 0 1-2-2V5.2z')}
          <path d="M8.2 20.6h7.6M12 16v4.6" {...ink} />
          <ellipse cx="12" cy="9.5" rx="3.3" ry="2.05" {...ink} />
          <circle cx="12" cy="9.5" r="0.9" fill="#ffffff" />
        </HoloSvg>
      ),
      file: (
        <HoloSvg pid={`${id}-file`} palette={spec}>
          {holoShape(`${id}-file`, FILE)}
          <polyline points="14 2.2 14 8.2 20 8.2" {...ink} />
        </HoloSvg>
      ),
      sftp: (
        <HoloSvg pid={`${id}-sftp`} palette={spec}>
          {holoShape(`${id}-sftp`, FILE)}
          <polyline points="14 2.2 14 8.2 20 8.2" {...ink} />
          <rect x="9.1" y="13" width="5.8" height="4" rx="0.7" {...ink} />
          <path d="M10.3 13v-1.15a1.7 1.7 0 0 1 3.4 0V13" {...ink} />
        </HoloSvg>
      ),
      ftp: (
        <HoloSvg pid={`${id}-ftp`} palette={spec}>
          {holoShape(`${id}-ftp`, FILE)}
          <polyline points="14 2.2 14 8.2 20 8.2" {...ink} />
          <path d="M12 11.4v5M9.7 14.2 12 16.5l2.3-2.3" {...ink} />
        </HoloSvg>
      ),
      scp: (
        <HoloSvg pid={`${id}-scp`} palette={spec}>
          {holoShape(`${id}-scp`, FILE)}
          <polyline points="14 2.2 14 8.2 20 8.2" {...ink} />
          <path d="M12 16.6V11.4M9.7 13.6 12 11.3l2.3 2.3" {...ink} />
        </HoloSvg>
      ),
      password: (
        <HoloSvg pid={`${id}-password`} palette={spec}>
          {holoShape(`${id}-password`, 'M5.2 11.2h13.6a1.6 1.6 0 0 1 1.6 1.6v6.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6z')}
          <path d="M8 11.2V8a4 4 0 0 1 8 0v3.2" {...ink} />
          <circle cx="12" cy="15.3" r="1.05" fill="#ffffff" />
        </HoloSvg>
      ),
      'ssh-tunnel': (
        <HoloSvg pid={`${id}-tunnel`} palette={spec}>
          {holoShape(`${id}-tunnel`, 'M12 2.2 3.2 7.1 12 12l8.8-4.9L12 2.2z')}
          <path d="M3.2 12.1 12 16.9l8.8-4.8" {...ink} />
          <path d="M3.2 16.2 12 21l8.8-4.8" {...ink} opacity="0.7" />
        </HoloSvg>
      )
    }
  };
}

function SynthSvg({ pid, palette, clip, children }) {
  const glow = palette.glowOpacity ?? 0.8;
  const blur = palette.blur ?? 1.45;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.stroke} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation={blur} floodColor={palette.glow} floodOpacity={glow} />
        </filter>
        <clipPath id={`${pid}-c`}>{clip}</clipPath>
      </defs>
      {children}
    </svg>
  );
}

function scanlines(accent, opacity, grid) {
  return (
    <>
      <path d="M3 10h18M3 13h18M3 16h18" stroke={accent} strokeWidth="0.45" opacity={opacity} />
      {grid && <path d="M8 5v14M12 5v14M16 5v14" stroke={accent} strokeWidth="0.35" opacity={opacity * 0.7} />}
    </>
  );
}

function synthBody(pid, palette, d, detail, clipD) {
  const opacity = palette.scanlineOpacity ?? 0.34;
  return (
    <SynthSvg pid={pid} palette={palette} clip={<path d={clipD || d} />}>
      <path d={d} fill={palette.bg} stroke={`url(#${pid}-s)`} strokeWidth="1.7" strokeLinejoin="round" filter={`url(#${pid}-f)`} />
      <g clipPath={`url(#${pid}-c)`}>{scanlines(palette.accent, opacity, palette.grid)}</g>
      {detail}
    </SynthSvg>
  );
}

export function buildSynthwaveTheme(spec) {
  const id = spec.id;
  const accent = {
    stroke: spec.accent,
    strokeWidth: 1.45,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  };
  const sharpFolder = 'M2 6h8l2 2h10v12H2V6z';
  const sharpOpen = 'M2 10l2 10h16l2-10H2z';
  const sharpFile = 'M14 3H5v18h14V9l-5-6z';
  return {
    name: spec.name,
    icons: {
      folder: synthBody(`${id}-folder`, spec, sharpFolder, null),
      folderOpen: (
        <SynthSvg pid={`${id}-folderOpen`} palette={spec} clip={<path d={sharpOpen} />}>
          <path d="M2 6h8l2 2h10v2H2V6z" fill="none" stroke={`url(#${id}-folderOpen-s)`} strokeWidth="1.4" />
          <path d={sharpOpen} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" filter={`url(#${id}-folderOpen-f)`} />
          <g clipPath={`url(#${id}-folderOpen-c)`}>
            {scanlines(spec.accent, spec.scanlineOpacity ?? 0.34, spec.grid)}
          </g>
          <circle cx="12" cy="15" r="1.7" stroke={spec.accent} strokeWidth="1" opacity="0.85" />
        </SynthSvg>
      ),
      ssh: synthBody(
        `${id}-ssh`,
        spec,
        'M3 4.2h18v12.2H3z',
        <path d="M7.4 8.4 9.8 10.6 7.4 12.8M12.2 13h4" {...accent} />,
        'M3 4.2h18v12.2H3z'
      ),
      rdp: synthBody(
        `${id}-rdp`,
        spec,
        'M3.2 3.6h17.6v12.2H3.2z',
        <>
          <path d="M8.2 20.4h7.6M12 15.8v4.6" {...accent} />
          <circle cx="12" cy="9.6" r="2.2" {...accent} />
        </>,
        'M3.2 3.6h17.6v12.2H3.2z'
      ),
      vnc: synthBody(
        `${id}-vnc`,
        spec,
        'M3.2 3.6h17.6v12.2H3.2z',
        <>
          <path d="M8.2 20.4h7.6M12 15.8v4.6" {...accent} />
          <ellipse cx="12" cy="9.6" rx="3.2" ry="2" {...accent} />
          <circle cx="12" cy="9.6" r="0.85" fill={spec.accent} />
        </>,
        'M3.2 3.6h17.6v12.2H3.2z'
      ),
      file: synthBody(
        `${id}-file`,
        spec,
        sharpFile,
        <path d="M14 3v6h6" {...accent} />,
        sharpFile
      ),
      sftp: synthBody(
        `${id}-sftp`,
        spec,
        sharpFile,
        <>
          <path d="M14 3v6h6" {...accent} />
          <rect x="9.2" y="13" width="5.6" height="3.8" rx="0.4" {...accent} />
          <path d="M10.4 13v-1.1a1.6 1.6 0 0 1 3.2 0V13" {...accent} />
        </>,
        sharpFile
      ),
      ftp: synthBody(
        `${id}-ftp`,
        spec,
        sharpFile,
        <>
          <path d="M14 3v6h6" {...accent} />
          <path d="M12 11.5v4.6M9.8 14.2 12 16.4l2.2-2.2" {...accent} />
        </>,
        sharpFile
      ),
      scp: synthBody(
        `${id}-scp`,
        spec,
        sharpFile,
        <>
          <path d="M14 3v6h6" {...accent} />
          <path d="M12 16.5v-4.6M9.8 13.6 12 11.4l2.2 2.2" {...accent} />
        </>,
        sharpFile
      ),
      password: synthBody(
        `${id}-password`,
        spec,
        'M5 11h14v9H5z',
        <>
          <path d="M8 11V7.4a4 4 0 0 1 8 0V11" {...accent} />
          <rect x="11" y="14" width="2" height="3" fill={spec.accent} />
        </>,
        'M5 11h14v9H5z'
      ),
      'ssh-tunnel': (
        <SynthSvg pid={`${id}-tunnel`} palette={spec} clip={<path d="M12 2.2 3 8.2 12 14.2 21 8.2 12 2.2z" />}>
          <path d="M12 2.2 3 8.2 12 14.2 21 8.2 12 2.2z" fill={spec.bg} stroke={`url(#${id}-tunnel-s)`} strokeWidth="1.7" filter={`url(#${id}-tunnel-f)`} />
          <circle cx="12" cy="8.2" r="2.3" stroke={spec.accent} strokeWidth="1" strokeDasharray="1.4 1.2" />
          <path d="M4.2 13.4 12 18.2l7.8-4.8M4.2 17.2 12 22l7.8-4.8" stroke={spec.stroke} strokeWidth="1.35" strokeLinejoin="round" opacity="0.85" />
        </SynthSvg>
      )
    }
  };
}

/** Paleta original magenta / cian, para reparar el tema Synthwave existente. */
export const classicSynthwave = buildSynthwaveTheme({
  id: 'synthwave',
  name: 'Synthwave',
  bg: '#120424',
  stroke: '#ff007f',
  accent: '#00d2ff',
  secondary: '#7928ca',
  glow: '#ff007f',
  grid: true
});

export const futuristIconThemes = Object.fromEntries(
  futuristCatalog.map((spec) => [
    spec.id,
    spec.style === 'holo' ? buildHolographicTheme(spec) : buildSynthwaveTheme(spec)
  ])
);
