import React from 'react';
import { futuristCatalog } from './futurist-catalog';

const FOLDER = 'M3.2 8.4 6.4 5.2h4.1l1.7 2h6.4c.8 0 1.4.6 1.4 1.4v9.2c0 .8-.6 1.4-1.4 1.4H4.6c-.8 0-1.4-.6-1.4-1.4V8.4z';
const FOLDER_BACK = 'M2.4 8A2 2 0 0 1 4.4 6h4.6l1.6 1.8h8.2c.7 0 1.2.5 1.2 1.2V11H3.2L2.4 18V8z';
const FOLDER_FRONT = 'M21.4 11.2H4.2L2.8 19.2c-.2.9.5 1.8 1.4 1.8h15.2c.8 0 1.5-.6 1.6-1.4l.4-8.4z';
const FILE = 'M14 3.2H7.2c-.9 0-1.6.7-1.6 1.6v14.4c0 .9.7 1.6 1.6 1.6h9.6c.9 0 1.6-.7 1.6-1.6V8.2L14 3.2z';
const SCREEN = 'M3.2 5.2h17.6v11.2H3.2z';
const HEX = 'M8 3.4h8l4.4 4.2v8.8L16 20.6H8l-4.4-4.2V7.6L8 3.4z';

function prism(cx, cy, s = 2) {
  return `M${cx} ${cy - s} L${cx + s * 0.92} ${cy + s * 0.7} L${cx - s * 0.92} ${cy + s * 0.7} Z`;
}

function HoloIcon({ pid, palette, shape, prismAt = [12, 14], under, children }) {
  const [px, py] = prismAt;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.c1} />
          <stop offset="42%" stopColor={palette.c2} />
          <stop offset="100%" stopColor={palette.c3} />
        </linearGradient>
        <linearGradient id={`${pid}-g`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="38%" stopColor={palette.veil} stopOpacity="0.2" />
          <stop offset="100%" stopColor={palette.c3} stopOpacity="0" />
        </linearGradient>
        <filter id={`${pid}-f`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor={palette.glow} floodOpacity="0.5" />
        </filter>
      </defs>
      {under}
      <path d={shape} fill={`url(#${pid}-a)`} filter={`url(#${pid}-f)`} />
      <path d={shape} fill={`url(#${pid}-g)`} />
      <path d={shape} fill="none" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M6.2 6.4h6.4" stroke="#ffffff" strokeWidth="1.05" strokeLinecap="round" opacity="0.8" />
      <path d={prism(px, py, 2.05)} fill="#ffffff" opacity="0.95" />
      <path d={prism(px, py, 1.15)} fill={palette.c2} />
      {children}
    </svg>
  );
}

const ink = { fill: 'none', stroke: '#ffffff', strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function buildHolographicTheme(spec) {
  const id = spec.id;
  return {
    name: spec.name,
    icons: {
      folder: <HoloIcon pid={`${id}-folder`} palette={spec} shape={FOLDER} prismAt={[13.5, 14.2]} />,
      folderOpen: (
        <HoloIcon
          pid={`${id}-folderOpen`}
          palette={spec}
          shape={FOLDER_FRONT}
          prismAt={[13, 16]}
          under={<path d={FOLDER_BACK} fill={`url(#${id}-folderOpen-a)`} opacity="0.45" />}
        />
      ),
      ssh: (
        <HoloIcon pid={`${id}-ssh`} palette={spec} shape={SCREEN} prismAt={[15.2, 11]}>
          <path d="M6.6 8.6 9.4 11 6.6 13.4M11.6 13.6h3.2" {...ink} />
        </HoloIcon>
      ),
      rdp: (
        <HoloIcon pid={`${id}-rdp`} palette={spec} shape="M3.2 4.4h17.6v10.4H3.2z" prismAt={[12, 9.2]}>
          <path d="M8.4 20.4h7.2M12 14.8v5.6" {...ink} />
        </HoloIcon>
      ),
      vnc: (
        <HoloIcon pid={`${id}-vnc`} palette={spec} shape="M3.2 4.4h17.6v10.4H3.2z" prismAt={[12, 9.4]}>
          <path d="M8.4 20.4h7.2M12 14.8v5.6" {...ink} />
          <ellipse cx="12" cy="9.2" rx="3.1" ry="1.7" {...ink} strokeWidth="1.1" />
        </HoloIcon>
      ),
      file: (
        <HoloIcon pid={`${id}-file`} palette={spec} shape={FILE} prismAt={[12, 14.5]}>
          <path d="M14 3.2v5h5" {...ink} />
        </HoloIcon>
      ),
      sftp: (
        <HoloIcon pid={`${id}-sftp`} palette={spec} shape={FILE} prismAt={[12, 16.2]}>
          <path d="M14 3.2v5h5" {...ink} />
          <rect x="9.3" y="12.2" width="5.4" height="3.4" rx="0.5" {...ink} strokeWidth="1.1" />
        </HoloIcon>
      ),
      ftp: (
        <HoloIcon pid={`${id}-ftp`} palette={spec} shape={FILE} prismAt={[16.2, 15]}>
          <path d="M14 3.2v5h5M12 11.6v4.4M9.8 14.2 12 16.4l2.2-2.2" {...ink} />
        </HoloIcon>
      ),
      scp: (
        <HoloIcon pid={`${id}-scp`} palette={spec} shape={FILE} prismAt={[16.2, 15]}>
          <path d="M14 3.2v5h5M12 16.4v-4.4M9.8 13.6 12 11.4l2.2 2.2" {...ink} />
        </HoloIcon>
      ),
      password: (
        <HoloIcon pid={`${id}-password`} palette={spec} shape="M5.4 11.2h13.2v8.2H5.4z" prismAt={[12, 15.2]}>
          <path d="M8.2 11.2V8.1a3.8 3.8 0 0 1 7.6 0v3.1" {...ink} />
        </HoloIcon>
      ),
      'ssh-tunnel': (
        <HoloIcon pid={`${id}-tunnel`} palette={spec} shape="M12 2.4 3.4 7.2 12 12l8.6-4.8L12 2.4z" prismAt={[12, 7.4]}>
          <path d="M3.6 12.4 12 17.2l8.4-4.8M3.6 16.4 12 21.2l8.4-4.8" {...ink} />
        </HoloIcon>
      )
    }
  };
}

function halfSun(cx, y, r, color) {
  return <path d={`M${cx - r} ${y} A ${r} ${r} 0 0 1 ${cx + r} ${y} Z`} fill={color} />;
}

function groundGrid(cx, y, accent, secondary) {
  return (
    <>
      <path d={`M${cx} ${y} L${cx - 6.2} ${y + 6.6} M${cx} ${y} L${cx} ${y + 6.6} M${cx} ${y} L${cx + 6.2} ${y + 6.6}`} stroke={secondary} strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${cx - 4.6} ${y + 3.1} H${cx + 4.6}`} stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

function SynthSvg({ pid, palette, clip, children }) {
  const glow = Math.min(palette.glowOpacity ?? 0.4, 0.45);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-s`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={palette.stroke} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-22%" y="-22%" width="144%" height="144%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor={palette.glow} floodOpacity={glow} />
        </filter>
        {clip && <clipPath id={`${pid}-c`}>{clip}</clipPath>}
      </defs>
      <g filter={`url(#${pid}-f)`}>{children}</g>
    </svg>
  );
}

export function buildSynthwaveTheme(spec) {
  const id = spec.id;
  const edge = { fill: spec.bg, stroke: `url(#${id}-edge)`, strokeWidth: 1.8, strokeLinejoin: 'round' };
  const folder = 'M3.2 9.6h6.2l1.8-2.8h8.4v12.4H3.2V9.6z';
  const page = 'M14.2 3H7.2A1.6 1.6 0 0 0 5.6 4.6v14.8A1.6 1.6 0 0 0 7.2 21h9.6a1.6 1.6 0 0 0 1.6-1.6V8.2L14.2 3z';
  return {
    name: spec.name,
    icons: {
      folder: (
        <SynthSvg pid={`${id}-folder`} palette={spec} clip={<path d={folder} />}>
          <path d={folder} {...edge} stroke={`url(#${id}-folder-s)`} />
          <g clipPath={`url(#${id}-folder-c)`}>
            {halfSun(12.4, 11.2, 4.3, spec.accent)}
            {groundGrid(12.4, 11.2, spec.accent, spec.secondary)}
          </g>
        </SynthSvg>
      ),
      folderOpen: (
        <SynthSvg pid={`${id}-folderOpen`} palette={spec} clip={<path d="M2.4 11.2 4.6 20.2h14.8l2.2-9H2.4z" />}>
          <path d="M3 7.2h6.4l1.6 2H21" fill="none" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M2.4 11.2 4.6 20.2h14.8l2.2-9H2.4z" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.8" />
          <g clipPath={`url(#${id}-folderOpen-c)`}>
            {halfSun(12, 13.4, 3.6, spec.accent)}
            {groundGrid(12, 13.4, spec.accent, spec.stroke)}
          </g>
        </SynthSvg>
      ),
      ssh: (
        <SynthSvg pid={`${id}-ssh`} palette={spec} clip={<rect x="3.2" y="3.4" width="17.6" height="11.2" rx="1.2" />}>
          <rect x="2.4" y="2.6" width="19.2" height="12.8" rx="1.6" fill={spec.bg} stroke={`url(#${id}-ssh-s)`} strokeWidth="1.8" />
          <g clipPath={`url(#${id}-ssh-c)`}>
            {halfSun(12, 8.6, 3.8, spec.accent)}
            {groundGrid(12, 8.6, spec.accent, spec.secondary)}
          </g>
          <path d="M8 19.4h8M12 15.4v4" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
        </SynthSvg>
      ),
      rdp: (
        <SynthSvg pid={`${id}-rdp`} palette={spec} clip={<rect x="4.2" y="3.2" width="15.6" height="10" />}>
          <rect x="3.2" y="2.4" width="17.6" height="11.6" rx="1.2" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.8" />
          <g clipPath={`url(#${id}-rdp-c)`}>
            {halfSun(12, 7.6, 3.4, spec.accent)}
            <path d="M6.4 7.6h11.2" stroke={spec.secondary} strokeWidth="1.6" />
          </g>
          <path d="M7.2 18.8h9.6M9.2 14.2 8 18.8M14.8 14.2 16 18.8" stroke={spec.secondary} strokeWidth="1.8" strokeLinecap="round" />
        </SynthSvg>
      ),
      vnc: (
        <SynthSvg pid={`${id}-vnc`} palette={spec}>
          <path d="M2.4 12s3.4-5.2 9.6-5.2S21.6 12 21.6 12s-3.4 5.2-9.6 5.2S2.4 12 2.4 12z" fill={spec.bg} stroke={`url(#${id}-vnc-s)`} strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.1" fill={spec.accent} />
          <circle cx="12" cy="12" r="1.3" fill={spec.bg} />
        </SynthSvg>
      ),
      file: (
        <SynthSvg pid={`${id}-file`} palette={spec} clip={<path d={page} />}>
          <path d={page} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.8" />
          <g clipPath={`url(#${id}-file-c)`}>
            {halfSun(12, 11.4, 3.6, spec.accent)}
            {groundGrid(12, 11.4, spec.accent, spec.secondary)}
          </g>
          <path d="M14.2 3v5.2h5.2" stroke={spec.secondary} strokeWidth="1.7" />
        </SynthSvg>
      ),
      sftp: (
        <SynthSvg pid={`${id}-sftp`} palette={spec}>
          <path d={page} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.8" />
          <circle cx="12" cy="13.6" r="2.5" fill={spec.accent} />
          <rect x="11.1" y="15.2" width="1.8" height="3.2" rx="0.3" fill={spec.secondary} />
        </SynthSvg>
      ),
      ftp: (
        <SynthSvg pid={`${id}-ftp`} palette={spec}>
          <path d={page} fill={spec.bg} stroke={spec.secondary} strokeWidth="1.8" />
          {halfSun(12, 11.2, 3.2, spec.accent)}
          <path d="M12 13.2v4.6M9.4 15.6 12 18.2l2.6-2.6" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SynthSvg>
      ),
      scp: (
        <SynthSvg pid={`${id}-scp`} palette={spec}>
          <path d={page} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.8" />
          {halfSun(12, 16.4, 2.8, spec.accent)}
          <path d="M12 14.6V10M9.4 12.4 12 9.8l2.6 2.6" stroke={spec.secondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SynthSvg>
      ),
      password: (
        <SynthSvg pid={`${id}-password`} palette={spec}>
          <circle cx="8.2" cy="12" r="4.2" fill={spec.accent} />
          <circle cx="8.2" cy="12" r="1.7" fill={spec.bg} />
          <rect x="11.6" y="10.6" width="8.6" height="2.8" rx="0.4" fill={spec.stroke} />
          <rect x="16.6" y="13.2" width="2.1" height="3.2" fill={spec.secondary} />
          <rect x="13.4" y="13.2" width="1.8" height="2.2" fill={spec.secondary} />
        </SynthSvg>
      ),
      'ssh-tunnel': (
        <SynthSvg pid={`${id}-tunnel`} palette={spec} clip={<circle cx="12" cy="11" r="6.2" />}>
          <circle cx="12" cy="11" r="7.4" fill={spec.bg} stroke={`url(#${id}-tunnel-s)`} strokeWidth="1.8" />
          <g clipPath={`url(#${id}-tunnel-c)`}>
            {halfSun(12, 11, 4.6, spec.accent)}
            {groundGrid(12, 11, spec.accent, spec.secondary)}
          </g>
        </SynthSvg>
      )
    }
  };
}

function CyberIcon({ pid, palette, shape, children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${pid}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.85" floodColor={palette.glow} floodOpacity="0.7" />
        </filter>
      </defs>
      <path d={shape} fill={palette.bg} stroke={palette.stroke} strokeWidth="1.55" strokeLinejoin="miter" filter={`url(#${pid}-f)`} />
      <path d={shape} fill="none" stroke={palette.secondary} strokeWidth="0.6" opacity="0.85" transform="translate(0.6 0.6)" />
      {children}
    </svg>
  );
}

const cyberInk = (palette) => ({
  fill: 'none',
  stroke: palette.accent,
  strokeWidth: 1.4,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter'
});

export function buildCyberTheme(spec) {
  const id = spec.id;
  const mark = cyberInk(spec);
  return {
    name: spec.name,
    icons: {
      folder: (
        <CyberIcon pid={`${id}-folder`} palette={spec} shape="M3 8.2 6.2 5h5l1.6 2H20v11.2H3V8.2z">
          <path d="M3 10.2h17" stroke={spec.accent} strokeWidth="0.8" />
          <path d="M16.2 13.2h3.2v3.2h-3.2z" fill={spec.secondary} />
        </CyberIcon>
      ),
      folderOpen: (
        <CyberIcon pid={`${id}-folderOpen`} palette={spec} shape="M3 11.2 5.2 19.6h15.2L22 11.2H3z">
          <path d="M3 7.2h7l1.6 2H21" stroke={spec.stroke} strokeWidth="1.4" />
          <path d="M14 14.6h4" stroke={spec.accent} strokeWidth="1.3" />
        </CyberIcon>
      ),
      ssh: (
        <CyberIcon pid={`${id}-ssh`} palette={spec} shape={HEX}>
          <path d="M7.2 10.2 12 7.6l4.8 2.6" stroke={spec.stroke} strokeWidth="1.3" />
          <path d="M8.4 12.4h7.2" {...mark} strokeWidth="1.8" />
          <path d="M12 12.4v3.2" stroke={spec.secondary} strokeWidth="1.4" />
        </CyberIcon>
      ),
      rdp: (
        <CyberIcon pid={`${id}-rdp`} palette={spec} shape="M3.4 5.2 6 3.4h12l2.6 1.8v9.2H3.4V5.2z">
          <path d="M8 20.4h8M12 14.4v6" stroke={spec.accent} strokeWidth="1.3" strokeLinecap="square" />
          <path d={prism(12, 9.2, 1.8)} fill={spec.secondary} />
        </CyberIcon>
      ),
      vnc: (
        <CyberIcon pid={`${id}-vnc`} palette={spec} shape="M3.4 5.2 6 3.4h12l2.6 1.8v9.2H3.4V5.2z">
          <path d="M7.6 9.4 12 7.4l4.4 2M7.6 9.4 12 11.4l4.4-2" {...mark} />
          <path d="M8 20.4h8M12 14.4v6" stroke={spec.stroke} strokeWidth="1.2" />
        </CyberIcon>
      ),
      file: (
        <CyberIcon pid={`${id}-file`} palette={spec} shape="M8 3.2h5.2L18.2 8v12.2H8V3.2z">
          <path d="M13.2 3.2V8h5" stroke={spec.accent} strokeWidth="1.2" />
          <path d="M10 13.5h6M10 16.2h4" stroke={spec.secondary} strokeWidth="1.1" />
        </CyberIcon>
      ),
      sftp: (
        <CyberIcon pid={`${id}-sftp`} palette={spec} shape="M8 3.2h5.2L18.2 8v12.2H8V3.2z">
          <rect x="10" y="12.4" width="4.2" height="3" fill={spec.accent} />
          <path d="M10.6 12.4V11a1.4 1.4 0 0 1 2.8 0v1.4" {...mark} />
        </CyberIcon>
      ),
      ftp: (
        <CyberIcon pid={`${id}-ftp`} palette={spec} shape="M8 3.2h5.2L18.2 8v12.2H8V3.2z">
          <path d="M12 11.4v5.2M9.6 14.6 12 17l2.4-2.4" {...mark} />
        </CyberIcon>
      ),
      scp: (
        <CyberIcon pid={`${id}-scp`} palette={spec} shape="M8 3.2h5.2L18.2 8v12.2H8V3.2z">
          <path d="M12 16.8v-5.2M9.6 13.6 12 11l2.4 2.6" {...mark} />
        </CyberIcon>
      ),
      password: (
        <CyberIcon pid={`${id}-password`} palette={spec} shape="M4.2 7.4 7 5.2h12.2v12.2H4.2V7.4z">
          <rect x="6.4" y="9.2" width="3.6" height="2.6" fill={spec.accent} />
          <path d="M4.6 14.8h14.2" stroke={spec.secondary} strokeWidth="1.5" />
          <path d="M16.4 8.2v6.4" stroke={spec.stroke} strokeWidth="0.8" opacity="0.7" />
        </CyberIcon>
      ),
      'ssh-tunnel': (
        <CyberIcon pid={`${id}-tunnel`} palette={spec} shape={HEX}>
          <path d={prism(12, 11.2, 2.4)} fill="none" stroke={spec.accent} strokeWidth="1.2" />
          <path d="M12 6.2v2.2M12 14.2v2.2" stroke={spec.secondary} strokeWidth="1.2" />
        </CyberIcon>
      )
    }
  };
}

function TronIcon({ pid, palette, shape, children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${pid}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor={palette.glow} floodOpacity="0.75" />
        </filter>
      </defs>
      <path d={shape} fill={palette.bg} stroke={palette.stroke} strokeWidth="1.35" filter={`url(#${pid}-f)`} />
      {children}
    </svg>
  );
}

function nodes(points, palette) {
  return points.map(([x, y], i) => (
    <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 0 ? 1.25 : 0.95} fill={i === 0 ? palette.accent : palette.stroke} />
  ));
}

export function buildTronTheme(spec) {
  const id = spec.id;
  const trace = { fill: 'none', stroke: spec.accent, strokeWidth: 1.15, strokeLinejoin: 'miter', strokeLinecap: 'square' };
  return {
    name: spec.name,
    icons: {
      folder: (
        <TronIcon pid={`${id}-folder`} palette={spec} shape={FOLDER}>
          <path d="M7.2 11.2h5.2v4.6" {...trace} />
          {nodes([[7.2, 11.2], [12.4, 11.2], [12.4, 15.8]], spec)}
        </TronIcon>
      ),
      folderOpen: (
        <TronIcon pid={`${id}-folderOpen`} palette={spec} shape={FOLDER_FRONT}>
          <path d="M7 14.4h6v3.2" {...trace} />
          {nodes([[7, 14.4], [13, 14.4], [13, 17.6]], spec)}
        </TronIcon>
      ),
      ssh: (
        <TronIcon pid={`${id}-ssh`} palette={spec} shape={SCREEN}>
          <path d="M6.4 8.6h4.2v2.6H8.2v2.4" {...trace} />
          {nodes([[6.4, 8.6], [10.6, 8.6], [8.2, 13.6]], spec)}
          <path d="M13.2 13.4h4" stroke={spec.stroke} strokeWidth="1.3" />
        </TronIcon>
      ),
      rdp: (
        <TronIcon pid={`${id}-rdp`} palette={spec} shape="M3.2 4.4h17.6v10.6H3.2z">
          <path d="M8 8.2h8M12 8.2v4.2" {...trace} />
          {nodes([[8, 8.2], [16, 8.2], [12, 12.4]], spec)}
          <path d="M9 20.2h6M12 15v5.2" stroke={spec.stroke} strokeWidth="1.15" />
        </TronIcon>
      ),
      vnc: (
        <TronIcon pid={`${id}-vnc`} palette={spec} shape="M3.2 4.4h17.6v10.6H3.2z">
          <path d="M8 10.2h3.2M12.8 10.2H16" {...trace} />
          {nodes([[8, 10.2], [11.2, 10.2], [12.8, 10.2], [16, 10.2]], spec)}
          <path d="M9 20.2h6M12 15v5.2" stroke={spec.stroke} strokeWidth="1.15" />
        </TronIcon>
      ),
      file: (
        <TronIcon pid={`${id}-file`} palette={spec} shape={FILE}>
          <path d="M9 12.2h4.2v4" {...trace} />
          {nodes([[9, 12.2], [13.2, 12.2], [13.2, 16.2]], spec)}
        </TronIcon>
      ),
      sftp: (
        <TronIcon pid={`${id}-sftp`} palette={spec} shape={FILE}>
          <path d="M9.2 13.4h5.6v3.2H9.2z" {...trace} />
          {nodes([[9.2, 13.4], [14.8, 16.6]], spec)}
        </TronIcon>
      ),
      ftp: (
        <TronIcon pid={`${id}-ftp`} palette={spec} shape={FILE}>
          <path d="M12 11.2v5.2M12 16.4l-2.2-2M12 16.4l2.2-2" {...trace} />
          {nodes([[12, 11.2], [12, 16.4]], spec)}
        </TronIcon>
      ),
      scp: (
        <TronIcon pid={`${id}-scp`} palette={spec} shape={FILE}>
          <path d="M12 16.6V11.4M12 11.4l-2.2 2M12 11.4l2.2 2" {...trace} />
          {nodes([[12, 16.6], [12, 11.4]], spec)}
        </TronIcon>
      ),
      password: (
        <TronIcon pid={`${id}-password`} palette={spec} shape="M5.4 11h13.2v8.2H5.4z">
          <path d="M8.2 11V8.2h3.2M12.6 11V8.2" {...trace} />
          {nodes([[8.2, 11], [11.4, 8.2], [12.6, 11]], spec)}
        </TronIcon>
      ),
      'ssh-tunnel': (
        <TronIcon pid={`${id}-tunnel`} palette={spec} shape="M12 2.6 4 7.2v9.6L12 21.4l8-4.6V7.2L12 2.6z">
          <path d="M12 6.2v11.2M7.2 9.2h9.6" {...trace} />
          {nodes([[12, 6.2], [12, 12], [12, 17.4], [7.2, 9.2], [16.8, 9.2]], spec)}
        </TronIcon>
      )
    }
  };
}

function CrtSvg({ pid, palette, children }) {
  const glow = Math.min(palette.glowOpacity ?? 0.4, 0.42);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${pid}-f`} x="-22%" y="-22%" width="144%" height="144%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor={palette.glow} floodOpacity={glow} />
        </filter>
      </defs>
      <g filter={`url(#${pid}-f)`}>{children}</g>
    </svg>
  );
}

function scanlines(x, y, w, color) {
  return (
    <>
      <rect x={x} y={y} width={w} height="1.4" fill={color} />
      <rect x={x} y={y + 2.5} width={w} height="1.4" fill={color} opacity="0.45" />
    </>
  );
}

export function buildTerminalTheme(spec) {
  const id = spec.id;
  const bezel = { fill: spec.bg, stroke: spec.stroke, strokeWidth: 1.8, strokeLinejoin: 'round' };
  return {
    name: spec.name,
    icons: {
      folder: (
        <CrtSvg pid={`${id}-folder`} palette={spec}>
          <path d="M3.2 8.6h6.4l1.8-2.8h8.2v13.4H3.2V8.6z" {...bezel} />
          <rect x="5.2" y="10.2" width="13.6" height="6.8" fill={spec.secondary} />
          {scanlines(5.6, 11.2, 12.8, spec.stroke)}
          <rect x="14.4" y="12.6" width="2.8" height="3" fill={spec.accent} />
        </CrtSvg>
      ),
      folderOpen: (
        <CrtSvg pid={`${id}-folderOpen`} palette={spec}>
          <path d="M3 6.8h6.2l1.6 2.2H21" fill="none" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M2.4 10.4 4.8 20h14.4l2.4-9.6H2.4z" {...bezel} />
          <rect x="6" y="12.2" width="12" height="4.6" fill={spec.secondary} />
          {scanlines(6.4, 12.8, 11.2, spec.accent)}
        </CrtSvg>
      ),
      ssh: (
        <CrtSvg pid={`${id}-ssh`} palette={spec}>
          <rect x="2.2" y="2.4" width="19.6" height="13" rx="1.6" {...bezel} />
          <rect x="4.2" y="4.2" width="15.6" height="9.2" fill={spec.secondary} />
          <path d="M6.6 6.8 10.4 9.2 6.6 11.6" fill="none" stroke={spec.accent} strokeWidth="2" strokeLinejoin="miter" />
          <rect x="12" y="7.2" width="3.2" height="4.2" fill={spec.accent} />
          <path d="M8.4 18.8h7.2M12 15.4v3.4" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
        </CrtSvg>
      ),
      rdp: (
        <CrtSvg pid={`${id}-rdp`} palette={spec}>
          <rect x="2.6" y="2.6" width="18.8" height="12.2" rx="1.4" {...bezel} />
          <rect x="4.6" y="4.4" width="14.8" height="8.4" fill={spec.secondary} />
          <rect x="6.4" y="5.8" width="7.2" height="5.2" fill="none" stroke={spec.accent} strokeWidth="1.7" />
          <path d="M6.6 18.6h10.8M8.4 14.8 7.2 18.6M15.6 14.8 16.8 18.6" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
        </CrtSvg>
      ),
      vnc: (
        <CrtSvg pid={`${id}-vnc`} palette={spec}>
          <rect x="2.6" y="2.6" width="18.8" height="12.2" rx="1.4" {...bezel} />
          <rect x="4.6" y="4.4" width="14.8" height="8.4" fill={spec.secondary} />
          <ellipse cx="12" cy="8.6" rx="4.2" ry="2.5" fill="none" stroke={spec.accent} strokeWidth="1.8" />
          <circle cx="12" cy="8.6" r="1.35" fill={spec.accent} />
          <path d="M8.4 18.6h7.2M12 14.8v3.8" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
        </CrtSvg>
      ),
      file: (
        <CrtSvg pid={`${id}-file`} palette={spec}>
          <path d="M14 2.8H7.2A1.6 1.6 0 0 0 5.6 4.4v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8L14 2.8z" {...bezel} />
          <path d="M14 2.8V8h5.2" fill="none" stroke={spec.stroke} strokeWidth="1.7" />
          <rect x="7.2" y="10.2" width="9.6" height="3.2" fill={spec.accent} />
          {scanlines(7.4, 14.4, 9.2, spec.stroke)}
        </CrtSvg>
      ),
      sftp: (
        <CrtSvg pid={`${id}-sftp`} palette={spec}>
          <path d="M14 2.8H7.2A1.6 1.6 0 0 0 5.6 4.4v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8L14 2.8z" {...bezel} />
          <rect x="8.6" y="12.4" width="6.8" height="5.2" rx="0.8" fill={spec.secondary} stroke={spec.accent} strokeWidth="1.7" />
          <path d="M10 12.4V10.6a2 2 0 0 1 4 0v1.8" fill="none" stroke={spec.stroke} strokeWidth="1.8" />
        </CrtSvg>
      ),
      ftp: (
        <CrtSvg pid={`${id}-ftp`} palette={spec}>
          <path d="M14 2.8H7.2A1.6 1.6 0 0 0 5.6 4.4v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8L14 2.8z" {...bezel} />
          <path d="M12 11.2v5.4M9.2 14.4 12 17.2l2.8-2.8" fill="none" stroke={spec.accent} strokeWidth="1.9" strokeLinecap="square" strokeLinejoin="miter" />
        </CrtSvg>
      ),
      scp: (
        <CrtSvg pid={`${id}-scp`} palette={spec}>
          <path d="M14 2.8H7.2A1.6 1.6 0 0 0 5.6 4.4v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8L14 2.8z" {...bezel} />
          <path d="M12 17.2v-5.4M9.2 14 12 11.2l2.8 2.8" fill="none" stroke={spec.accent} strokeWidth="1.9" strokeLinecap="square" strokeLinejoin="miter" />
        </CrtSvg>
      ),
      password: (
        <CrtSvg pid={`${id}-password`} palette={spec}>
          <rect x="5.6" y="10.6" width="12.8" height="9" rx="1.6" {...bezel} />
          <path d="M8.2 10.6V7.8a3.8 3.8 0 0 1 7.6 0v2.8" fill="none" stroke={spec.stroke} strokeWidth="2.1" />
          <circle cx="12" cy="14.4" r="1.45" fill={spec.accent} />
          <rect x="11.1" y="15.2" width="1.8" height="2.6" fill={spec.accent} />
        </CrtSvg>
      ),
      'ssh-tunnel': (
        <CrtSvg pid={`${id}-tunnel`} palette={spec}>
          <path d="M4 7.2h10.4v6.2H4z" {...bezel} />
          <path d="M9.6 10.6h10.4v6.2H9.6z" fill={spec.secondary} stroke={spec.accent} strokeWidth="1.8" />
          <rect x="15.2" y="12.4" width="2.6" height="2.8" fill={spec.accent} />
        </CrtSvg>
      )
    }
  };
}

/** Paleta original magenta / cian. */
export const classicSynthwave = buildSynthwaveTheme({
  id: 'synthwave',
  name: 'Synthwave',
  bg: '#120424',
  stroke: '#ff007f',
  accent: '#00d2ff',
  secondary: '#7928ca',
  glow: '#ff007f'
});

function buildTreeTheme(spec) {
  if (spec.style === 'holo') return buildHolographicTheme(spec);
  if (spec.style === 'cyber') return buildCyberTheme(spec);
  if (spec.style === 'tron') return buildTronTheme(spec);
  if (spec.style === 'terminal') return buildTerminalTheme(spec);
  return buildSynthwaveTheme(spec);
}

export const futuristIconThemes = Object.fromEntries(
  futuristCatalog.map((spec) => [spec.id, buildTreeTheme(spec)])
);
