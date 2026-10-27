import React from 'react';
import { futuristCatalog } from '../icon-themes/futurist-catalog';

function prism(cx, cy, s = 1.7) {
  return `M${cx} ${cy - s} L${cx + s * 0.9} ${cy + s * 0.68} L${cx - s * 0.9} ${cy + s * 0.68} Z`;
}

function HoloAction({ pid, palette, shape, prismAt = [12, 13], children }) {
  const [px, py] = prismAt;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.c1} />
          <stop offset="45%" stopColor={palette.c2} />
          <stop offset="100%" stopColor={palette.c3} />
        </linearGradient>
        <linearGradient id={`${pid}-g`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="42%" stopColor={palette.veil} stopOpacity="0.15" />
          <stop offset="100%" stopColor={palette.c3} stopOpacity="0" />
        </linearGradient>
        <filter id={`${pid}-f`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.85" floodColor={palette.glow} floodOpacity="0.5" />
        </filter>
      </defs>
      <path d={shape} fill={`url(#${pid}-a)`} filter={`url(#${pid}-f)`} />
      <path d={shape} fill={`url(#${pid}-g)`} />
      <path d={shape} fill="none" stroke="#ffffff" strokeWidth="0.65" strokeOpacity="0.6" />
      <path d={prism(px, py)} fill="#ffffff" />
      {children}
    </svg>
  );
}

const white = { fill: 'none', stroke: '#ffffff', strokeWidth: 1.45, strokeLinecap: 'round', strokeLinejoin: 'round' };

function buildHoloActions(spec) {
  const id = spec.id;
  const plate = 'M5 5h14v14H5z';
  return {
    name: spec.name,
    description: 'Cristal iridiscente con prisma y brillo especular',
    icons: {
      newConnection: (
        <HoloAction pid={`${id}-new`} palette={spec} shape={plate} prismAt={[16.2, 7.2]}>
          <path d="M12 8.2v7.6M8.2 12h7.6" {...white} />
        </HoloAction>
      ),
      newFolder: (
        <HoloAction pid={`${id}-folder`} palette={spec} shape="M3.4 8.6 6.4 5.4h4l1.6 2h6.4v10.4H3.4V8.6z" prismAt={[13.4, 13.4]} />
      ),
      newGroup: (
        <HoloAction pid={`${id}-group`} palette={spec} shape="M4 4h6.2v6.2H4z" prismAt={[7.1, 7.1]}>
          <path d="M13.8 4h6.2v6.2h-6.2zM4 13.8h6.2V20H4z" fill={`url(#${id}-group-a)`} stroke="#ffffff" strokeWidth="0.6" />
          <path d="M14.6 16.9h4.6M16.9 14.6v4.6" {...white} />
        </HoloAction>
      ),
      passwordManager: (
        <HoloAction pid={`${id}-pass`} palette={spec} shape="M4.6 10.6h10.2v8H4.6z" prismAt={[9.6, 14.4]}>
          <path d="M7.2 10.6V8a2.6 2.6 0 0 1 5.2 0v2.6" {...white} />
          <path d="M14.8 12.4h4.4v2.4h-1.6" {...white} />
        </HoloAction>
      ),
      collapseLeft: (
        <HoloAction pid={`${id}-left`} palette={spec} shape="M6 5.2h12v13.6H6z" prismAt={[15.4, 8]}>
          <path d="M14.2 8.2 9.6 12l4.6 3.8" {...white} strokeWidth="1.7" />
        </HoloAction>
      ),
      expandRight: (
        <HoloAction pid={`${id}-right`} palette={spec} shape="M6 5.2h12v13.6H6z" prismAt={[8.4, 8]}>
          <path d="M9.8 8.2 14.4 12 9.8 15.8" {...white} strokeWidth="1.7" />
        </HoloAction>
      ),
      menu: (
        <HoloAction pid={`${id}-menu`} palette={spec} shape="M4 4.4h16v15.2H4z" prismAt={[18, 6.4]}>
          <path d="M7 8.2h10M7 12h10M7 15.8h10" {...white} />
        </HoloAction>
      ),
      expandAll: (
        <HoloAction pid={`${id}-exp`} palette={spec} shape={plate} prismAt={[16.4, 7]}>
          <path d="M8 9.2 12 12.6 16 9.2M8 13.2 12 16.6 16 13.2" {...white} />
        </HoloAction>
      ),
      collapseAll: (
        <HoloAction pid={`${id}-col`} palette={spec} shape={plate} prismAt={[16.4, 17]}>
          <path d="M8 11 12 7.6 16 11M8 15 12 11.6 16 15" {...white} />
        </HoloAction>
      ),
      settings: (
        <HoloAction pid={`${id}-set`} palette={spec} shape="M12 3.4 14.2 6.2 17.6 5.6 18.2 9 21 10.6 19.2 13.2 21 15.8 18.2 17.4 17.6 20.8 14.2 20.2 12 23 9.8 20.2 6.4 20.8 5.8 17.4 3 15.8 4.8 13.2 3 10.6 5.8 9 6.4 5.6 9.8 6.2 12 3.4z" prismAt={[12, 12.2]}>
          <circle cx="12" cy="12.4" r="2.1" {...white} />
        </HoloAction>
      ),
      treeTheme: (
        <HoloAction pid={`${id}-tree`} palette={spec} shape="M4 4h16v16H4z" prismAt={[16.6, 8.2]}>
          <path d="M8 7.2v10.2M8 12.2h5.2M13.2 8.4v7.6" {...white} />
        </HoloAction>
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
      <path d={`M${cx} ${y} L${cx - 5.4} ${y + 5.8} M${cx} ${y} L${cx} ${y + 5.8} M${cx} ${y} L${cx + 5.4} ${y + 5.8}`} stroke={secondary} strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${cx - 4} ${y + 2.7} H${cx + 4}`} stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

function SynthAction({ pid, palette, clip, children }) {
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

function buildSynthActions(spec) {
  const id = spec.id;
  const folder = 'M3.2 9.6h6.2l1.8-2.8h8.4v12.4H3.2V9.6z';
  const left = 'M16.8 3.4 5.6 12 16.8 20.6V3.4z';
  const right = 'M7.2 3.4 18.4 12 7.2 20.6V3.4z';
  return {
    name: spec.name,
    description: 'Sol de neón, horizonte y rejilla en perspectiva',
    icons: {
      newConnection: (
        <SynthAction pid={`${id}-new`} palette={spec}>
          {halfSun(12, 12.2, 5.6, spec.accent)}
          <rect x="10.5" y="3.4" width="3" height="17.2" rx="0.5" fill={spec.stroke} />
          <rect x="3.4" y="10.7" width="17.2" height="3" rx="0.5" fill={spec.secondary} />
        </SynthAction>
      ),
      newFolder: (
        <SynthAction pid={`${id}-folder`} palette={spec} clip={<path d={folder} />}>
          <path d={folder} fill={spec.bg} stroke={`url(#${id}-folder-s)`} strokeWidth="1.8" strokeLinejoin="round" />
          <g clipPath={`url(#${id}-folder-c)`}>
            {halfSun(12.4, 11.2, 4.2, spec.accent)}
            {groundGrid(12.4, 11.2, spec.accent, spec.secondary)}
          </g>
        </SynthAction>
      ),
      newGroup: (
        <SynthAction pid={`${id}-group`} palette={spec}>
          <rect x="3" y="3" width="8.2" height="8.2" rx="1.1" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
          <rect x="12.8" y="3" width="8.2" height="8.2" rx="1.1" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
          <rect x="7.4" y="12.2" width="9.2" height="8.6" rx="1.1" fill={spec.bg} stroke={`url(#${id}-group-s)`} strokeWidth="1.8" />
          {halfSun(12, 16.2, 2.7, spec.accent)}
        </SynthAction>
      ),
      passwordManager: (
        <SynthAction pid={`${id}-pass`} palette={spec}>
          <circle cx="8.2" cy="12" r="4.2" fill={spec.accent} />
          <circle cx="8.2" cy="12" r="1.7" fill={spec.bg} />
          <rect x="11.6" y="10.6" width="8.6" height="2.8" rx="0.4" fill={spec.stroke} />
          <rect x="16.6" y="13.2" width="2.1" height="3.2" fill={spec.secondary} />
          <rect x="13.4" y="13.2" width="1.8" height="2.2" fill={spec.secondary} />
        </SynthAction>
      ),
      collapseLeft: (
        <SynthAction pid={`${id}-left`} palette={spec} clip={<path d={left} />}>
          <path d={left} fill={spec.bg} stroke={`url(#${id}-left-s)`} strokeWidth="1.8" strokeLinejoin="round" />
          <g clipPath={`url(#${id}-left-c)`}>{halfSun(10.4, 12, 3.4, spec.accent)}</g>
        </SynthAction>
      ),
      expandRight: (
        <SynthAction pid={`${id}-right`} palette={spec} clip={<path d={right} />}>
          <path d={right} fill={spec.bg} stroke={`url(#${id}-right-s)`} strokeWidth="1.8" strokeLinejoin="round" />
          <g clipPath={`url(#${id}-right-c)`}>{halfSun(13.6, 12, 3.4, spec.accent)}</g>
        </SynthAction>
      ),
      menu: (
        <SynthAction pid={`${id}-menu`} palette={spec}>
          <rect x="3.2" y="4.2" width="12" height="2.8" rx="0.4" fill={spec.stroke} />
          {halfSun(17.4, 7, 3.1, spec.accent)}
          <rect x="3.2" y="10.6" width="17.6" height="2.8" rx="0.4" fill={spec.secondary} />
          <rect x="3.2" y="17" width="17.6" height="2.8" rx="0.4" fill={spec.stroke} />
        </SynthAction>
      ),
      expandAll: (
        <SynthAction pid={`${id}-exp`} palette={spec}>
          <path d="M4 4.6 12 10.8 20 4.6" fill="none" stroke={spec.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {halfSun(12, 14.8, 3.3, spec.accent)}
          <path d="M4 12.6 12 18.8 20 12.6" fill="none" stroke={spec.secondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </SynthAction>
      ),
      collapseAll: (
        <SynthAction pid={`${id}-col`} palette={spec}>
          {halfSun(12, 9.2, 3.3, spec.accent)}
          <path d="M4 8.2 12 3.6 20 8.2" fill="none" stroke={spec.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15.4 12 10.8 20 15.4" fill="none" stroke={spec.secondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </SynthAction>
      ),
      settings: (
        <SynthAction pid={`${id}-set`} palette={spec}>
          <circle cx="12" cy="12" r="3.4" fill="none" stroke={`url(#${id}-set-s)`} strokeWidth="2.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect key={angle} x="10.7" y="2.2" width="2.6" height="6.6" rx="0.4" fill={angle % 90 === 0 ? spec.stroke : spec.secondary} transform={`rotate(${angle} 12 12)`} />
          ))}
          {halfSun(12, 12, 2.2, spec.accent)}
        </SynthAction>
      ),
      treeTheme: (
        <SynthAction pid={`${id}-tree`} palette={spec}>
          <path d="M5.2 20.4V4.8" stroke={spec.stroke} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M5.2 12.2H12" stroke={spec.secondary} strokeWidth="2.1" strokeLinecap="round" />
          {halfSun(16.4, 12.2, 3.5, spec.accent)}
          <path d="M16.4 7.6v9.2" stroke={spec.stroke} strokeWidth="2.1" strokeLinecap="round" />
        </SynthAction>
      )
    }
  };
}

function CyberAction({ pid, palette, shape, children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${pid}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor={palette.glow} floodOpacity="0.7" />
        </filter>
      </defs>
      <path d={shape} fill={palette.bg} stroke={palette.stroke} strokeWidth="1.5" strokeLinejoin="miter" filter={`url(#${pid}-f)`} />
      {children}
    </svg>
  );
}

function buildCyberActions(spec) {
  const id = spec.id;
  const mark = { fill: 'none', stroke: spec.accent, strokeWidth: 1.45, strokeLinecap: 'square', strokeLinejoin: 'miter' };
  const hex = 'M8 3.6h8l4.2 4v8.8L16 20.4H8l-4.2-4V7.6L8 3.6z';
  return {
    name: spec.name,
    description: 'Chaflán hexagonal, visor HUD y tarjeta de acceso',
    icons: {
      newConnection: (
        <CyberAction pid={`${id}-new`} palette={spec} shape={hex}>
          <path d="M12 8.4v7.2M8.4 12h7.2" {...mark} />
          <rect x="10.9" y="10.9" width="2.2" height="2.2" fill={spec.secondary} />
        </CyberAction>
      ),
      newFolder: (
        <CyberAction pid={`${id}-folder`} palette={spec} shape="M3.2 8.4 6.2 5.2h5l1.6 2H20.4v11H3.2V8.4z">
          <path d="M3.2 10.4h17" stroke={spec.accent} strokeWidth="0.8" />
          <path d="M16 13.2h3v3h-3z" fill={spec.secondary} />
        </CyberAction>
      ),
      newGroup: (
        <CyberAction pid={`${id}-group`} palette={spec} shape="M3.6 3.6h6.6v6.6H3.6z">
          <path d="M13.8 3.6h6.6v6.6h-6.6zM3.6 13.8h6.6v6.6H3.6z" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.3" />
          <path d="M15.2 17h3.8M17.1 15.1v3.8" {...mark} />
        </CyberAction>
      ),
      passwordManager: (
        <CyberAction pid={`${id}-pass`} palette={spec} shape="M4 7.2 6.6 5h13v13.2H4V7.2z">
          <rect x="6.2" y="8.8" width="3.4" height="2.4" fill={spec.accent} />
          <path d="M4.4 14.6h14.6" stroke={spec.secondary} strokeWidth="1.5" />
        </CyberAction>
      ),
      collapseLeft: (
        <CyberAction pid={`${id}-left`} palette={spec} shape="M6.4 4.6h12.2v14.8H6.4z">
          <path d="M14.6 8.2 9.4 12l5.2 3.8" {...mark} strokeWidth="1.7" />
        </CyberAction>
      ),
      expandRight: (
        <CyberAction pid={`${id}-right`} palette={spec} shape="M5.4 4.6h12.2v14.8H5.4z">
          <path d="M9.4 8.2 14.6 12 9.4 15.8" {...mark} strokeWidth="1.7" />
        </CyberAction>
      ),
      menu: (
        <CyberAction pid={`${id}-menu`} palette={spec} shape="M4 4.2h16v15.6H4z">
          <path d="M7 8.4h10M7 12h10M7 15.6h10" stroke={spec.stroke} strokeWidth="1.35" />
          <path d="M7 8.4h1.6M7 12h1.6M7 15.6h1.6" stroke={spec.secondary} strokeWidth="1.35" />
        </CyberAction>
      ),
      expandAll: (
        <CyberAction pid={`${id}-exp`} palette={spec} shape={hex}>
          <path d="M8.2 9.4 12 12.6 15.8 9.4M8.2 13.2 12 16.4 15.8 13.2" {...mark} />
        </CyberAction>
      ),
      collapseAll: (
        <CyberAction pid={`${id}-col`} palette={spec} shape={hex}>
          <path d="M8.2 11.2 12 8 15.8 11.2M8.2 15 12 11.8 15.8 15" {...mark} />
        </CyberAction>
      ),
      settings: (
        <CyberAction pid={`${id}-set`} palette={spec} shape={hex}>
          <path d="M12 8.2v7.6M8.2 12h7.6" stroke={spec.secondary} strokeWidth="1.1" />
          <circle cx="12" cy="12" r="2.3" {...mark} />
        </CyberAction>
      ),
      treeTheme: (
        <CyberAction pid={`${id}-tree`} palette={spec} shape="M4.2 4.2h15.6v15.6H4.2z">
          <path d="M8 7v10M8 12h5.2M13.2 8.4v7.2" {...mark} />
          <path d="M13.2 8.4h2.4v2.4h-2.4z" fill={spec.secondary} />
        </CyberAction>
      )
    }
  };
}

function TronAction({ pid, palette, shape, children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${pid}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.75" floodColor={palette.glow} floodOpacity="0.75" />
        </filter>
      </defs>
      <path d={shape} fill={palette.bg} stroke={palette.stroke} strokeWidth="1.3" filter={`url(#${pid}-f)`} />
      {children}
    </svg>
  );
}

function nodes(points, palette) {
  return points.map(([x, y], i) => (
    <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 0 ? 1.2 : 0.9} fill={i === 0 ? palette.accent : palette.stroke} />
  ));
}

function buildTronActions(spec) {
  const id = spec.id;
  const trace = { fill: 'none', stroke: spec.accent, strokeWidth: 1.15, strokeLinecap: 'square' };
  const plate = 'M4.4 4.4h15.2v15.2H4.4z';
  return {
    name: spec.name,
    description: 'Nodos y pistas de circuito',
    icons: {
      newConnection: (
        <TronAction pid={`${id}-new`} palette={spec} shape={plate}>
          <path d="M12 7.4v9.2M7.4 12h9.2" {...trace} />
          {nodes([[12, 7.4], [12, 12], [12, 16.6], [7.4, 12], [16.6, 12]], spec)}
        </TronAction>
      ),
      newFolder: (
        <TronAction pid={`${id}-folder`} palette={spec} shape="M3.4 8.6 6.2 5.6h4.2l1.5 1.8H20v10.6H3.4V8.6z">
          <path d="M7.2 11.4h5v4.2" {...trace} />
          {nodes([[7.2, 11.4], [12.2, 11.4], [12.2, 15.6]], spec)}
        </TronAction>
      ),
      newGroup: (
        <TronAction pid={`${id}-group`} palette={spec} shape={plate}>
          <path d="M7 8h4v4H7zM13 8h4M13 14h4v4" {...trace} />
          {nodes([[7, 8], [11, 12], [13, 8], [17, 8], [13, 18]], spec)}
        </TronAction>
      ),
      passwordManager: (
        <TronAction pid={`${id}-pass`} palette={spec} shape="M4.6 10.6h14.8v8H4.6z">
          <path d="M8 10.6V8h3.2M12.4 10.6V8.6h3" {...trace} />
          {nodes([[8, 10.6], [11.2, 8], [15.4, 8.6]], spec)}
        </TronAction>
      ),
      collapseLeft: (
        <TronAction pid={`${id}-left`} palette={spec} shape="M6 5h12.4v14H6z">
          <path d="M14.6 8.4H9.6v3.2h3.2V15" {...trace} />
          {nodes([[14.6, 8.4], [9.6, 8.4], [12.8, 15]], spec)}
        </TronAction>
      ),
      expandRight: (
        <TronAction pid={`${id}-right`} palette={spec} shape="M5.6 5H18v14H5.6z">
          <path d="M9.4 8.4h5v3.2H11.2V15" {...trace} />
          {nodes([[9.4, 8.4], [14.4, 8.4], [11.2, 15]], spec)}
        </TronAction>
      ),
      menu: (
        <TronAction pid={`${id}-menu`} palette={spec} shape="M4.2 4.4h15.6v15.2H4.2z">
          <path d="M7.2 8.4h9.6M7.2 12h6.4M7.2 15.6h9.6" {...trace} />
          {nodes([[7.2, 8.4], [7.2, 12], [7.2, 15.6]], spec)}
        </TronAction>
      ),
      expandAll: (
        <TronAction pid={`${id}-exp`} palette={spec} shape={plate}>
          <path d="M8 9.2h8M12 9.2v7" {...trace} />
          {nodes([[8, 9.2], [16, 9.2], [12, 16.2]], spec)}
        </TronAction>
      ),
      collapseAll: (
        <TronAction pid={`${id}-col`} palette={spec} shape={plate}>
          <path d="M8 15.2h8M12 15.2V8" {...trace} />
          {nodes([[12, 8], [8, 15.2], [16, 15.2]], spec)}
        </TronAction>
      ),
      settings: (
        <TronAction pid={`${id}-set`} palette={spec} shape="M12 3.8 15.2 6.2 18.6 5.6 19.2 9 21.4 11.2 19.2 13.6 19.6 17 16.2 17.6 14.4 20.4 12 20.2 9.6 20.4 7.8 17.6 4.4 17 4.8 13.6 2.6 11.2 4.8 9 5.4 5.6 8.8 6.2 12 3.8z">
          <circle cx="12" cy="12" r="2.2" fill="none" stroke={spec.accent} strokeWidth="1.15" />
          {nodes([[12, 12]], spec)}
        </TronAction>
      ),
      treeTheme: (
        <TronAction pid={`${id}-tree`} palette={spec} shape={plate}>
          <path d="M8 7.2v10M8 12.2h5.2v4" {...trace} />
          {nodes([[8, 7.2], [8, 12.2], [13.2, 12.2], [13.2, 16.2]], spec)}
        </TronAction>
      )
    }
  };
}

function TermAction({ pid, palette, children }) {
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

function buildTerminalActions(spec) {
  const id = spec.id;
  const bezel = { fill: spec.bg, stroke: spec.stroke, strokeWidth: 1.8, strokeLinejoin: 'round' };
  const left = 'M16.8 3.4 5.6 12 16.8 20.6V3.4z';
  const right = 'M7.2 3.4 18.4 12 7.2 20.6V3.4z';
  return {
    name: spec.name,
    description: 'Chasis CRT, pantalla y cursor de bloque',
    icons: {
      newConnection: (
        <TermAction pid={`${id}-new`} palette={spec}>
          <rect x="2.2" y="2.4" width="19.6" height="13" rx="1.6" {...bezel} />
          <rect x="4.2" y="4.2" width="15.6" height="9.2" fill={spec.secondary} />
          <rect x="10.6" y="5.6" width="2.8" height="6.4" fill={spec.accent} />
          <rect x="7.4" y="7.4" width="9.2" height="2.8" fill={spec.accent} />
          <path d="M8.4 18.8h7.2M12 15.4v3.4" stroke={spec.stroke} strokeWidth="1.8" strokeLinecap="round" />
        </TermAction>
      ),
      newFolder: (
        <TermAction pid={`${id}-folder`} palette={spec}>
          <path d="M3.2 8.6h6.4l1.8-2.8h8.2v13.4H3.2V8.6z" {...bezel} />
          <rect x="5.2" y="10.2" width="13.6" height="6.8" fill={spec.secondary} />
          {scanlines(5.6, 11.2, 12.8, spec.stroke)}
          <rect x="14.4" y="12.6" width="2.8" height="3" fill={spec.accent} />
        </TermAction>
      ),
      newGroup: (
        <TermAction pid={`${id}-group`} palette={spec}>
          <rect x="2.6" y="2.6" width="8.4" height="8.2" rx="1.1" {...bezel} />
          <rect x="13" y="2.6" width="8.4" height="8.2" rx="1.1" fill={spec.secondary} stroke={spec.stroke} strokeWidth="1.8" />
          <rect x="7.6" y="12.4" width="8.8" height="8.4" rx="1.1" {...bezel} />
          <rect x="10.2" y="14.6" width="3.4" height="3.6" fill={spec.accent} />
        </TermAction>
      ),
      passwordManager: (
        <TermAction pid={`${id}-pass`} palette={spec}>
          <rect x="5.6" y="10.6" width="12.8" height="9" rx="1.6" {...bezel} />
          <path d="M8.2 10.6V7.8a3.8 3.8 0 0 1 7.6 0v2.8" fill="none" stroke={spec.stroke} strokeWidth="2.1" />
          <circle cx="12" cy="14.4" r="1.45" fill={spec.accent} />
          <rect x="11.1" y="15.2" width="1.8" height="2.6" fill={spec.accent} />
        </TermAction>
      ),
      collapseLeft: (
        <TermAction pid={`${id}-left`} palette={spec}>
          <path d={left} {...bezel} />
          <rect x="8.2" y="10.2" width="3.2" height="3.6" fill={spec.accent} />
        </TermAction>
      ),
      expandRight: (
        <TermAction pid={`${id}-right`} palette={spec}>
          <path d={right} {...bezel} />
          <rect x="12.6" y="10.2" width="3.2" height="3.6" fill={spec.accent} />
        </TermAction>
      ),
      menu: (
        <TermAction pid={`${id}-menu`} palette={spec}>
          <rect x="3.2" y="4.2" width="17.6" height="2.8" rx="0.4" fill={spec.stroke} />
          <rect x="3.2" y="10.6" width="17.6" height="2.8" rx="0.4" fill={spec.accent} />
          <rect x="3.2" y="17" width="12.2" height="2.8" rx="0.4" fill={spec.stroke} />
        </TermAction>
      ),
      expandAll: (
        <TermAction pid={`${id}-exp`} palette={spec}>
          <path d="M4 5.2 12 11.4 20 5.2" fill="none" stroke={spec.stroke} strokeWidth="2.3" strokeLinecap="square" strokeLinejoin="miter" />
          <path d="M4 12.8 12 19 20 12.8" fill="none" stroke={spec.accent} strokeWidth="2.3" strokeLinecap="square" strokeLinejoin="miter" />
        </TermAction>
      ),
      collapseAll: (
        <TermAction pid={`${id}-col`} palette={spec}>
          <path d="M4 8.6 12 2.4 20 8.6" fill="none" stroke={spec.accent} strokeWidth="2.3" strokeLinecap="square" strokeLinejoin="miter" />
          <path d="M4 16.2 12 10 20 16.2" fill="none" stroke={spec.stroke} strokeWidth="2.3" strokeLinecap="square" strokeLinejoin="miter" />
        </TermAction>
      ),
      settings: (
        <TermAction pid={`${id}-set`} palette={spec}>
          <circle cx="12" cy="12" r="3.3" fill={spec.secondary} stroke={spec.stroke} strokeWidth="1.8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect key={angle} x="10.7" y="2.2" width="2.6" height="6.6" rx="0.4" fill={spec.stroke} transform={`rotate(${angle} 12 12)`} />
          ))}
          <rect x="10.5" y="10.3" width="3" height="3.4" fill={spec.accent} />
        </TermAction>
      ),
      treeTheme: (
        <TermAction pid={`${id}-tree`} palette={spec}>
          <path d="M5.4 20.2V4.6M5.4 12.2H13" fill="none" stroke={spec.stroke} strokeWidth="2.2" strokeLinecap="square" />
          <path d="M13 7.4v9.6" fill="none" stroke={spec.accent} strokeWidth="2.2" strokeLinecap="square" />
          <rect x="11.4" y="10.4" width="3.2" height="3.6" fill={spec.accent} />
        </TermAction>
      )
    }
  };
}

function buildActionTheme(spec) {
  if (spec.style === 'holo') return buildHoloActions(spec);
  if (spec.style === 'cyber') return buildCyberActions(spec);
  if (spec.style === 'tron') return buildTronActions(spec);
  if (spec.style === 'terminal') return buildTerminalActions(spec);
  return buildSynthActions(spec);
}

const COPY = {
  terminalHud: 'Marco CRT, prompt y cursor de bloque',
  cyberpunkPro: 'Chaflán hexagonal, visor HUD y tarjeta de acceso',
  tronBlue: 'Nodos y pistas de circuito',
  stealthOps: 'Synthwave mate, con el glow contenido'
};

export const futuristActionIconThemes = Object.fromEntries(
  futuristCatalog.map((spec) => {
    const theme = buildActionTheme(spec);
    if (COPY[spec.id]) theme.description = COPY[spec.id];
    return [spec.id, theme];
  })
);

export const futuristActionMeta = futuristCatalog.map((spec) => ({
  id: spec.id,
  name: spec.name,
  group: spec.group,
  description: COPY[spec.id] || futuristActionIconThemes[spec.id].description,
  premium: false
}));
