import React from 'react';
import { futuristCatalog } from './icon-themes/futurist-catalog';

function frame(pid, glow, blur = 0.7, opacity = 0.6) {
  return (
    <filter id={`${pid}-f`} x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation={blur} floodColor={glow} floodOpacity={opacity} />
    </filter>
  );
}

function holoDefs(pid, palette) {
  return (
    <defs>
      <linearGradient id={`${pid}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={palette.c1} />
        <stop offset="50%" stopColor={palette.c2} />
        <stop offset="100%" stopColor={palette.c3} />
      </linearGradient>
      {frame(pid, palette.glow)}
    </defs>
  );
}

function prism(cx, cy) {
  return <path d={`M${cx} ${cy - 1.6} L${cx + 1.4} ${cy + 1} L${cx - 1.4} ${cy + 1} Z`} fill="#ffffff" />;
}

function holoRail(spec) {
  const icon = (key, shape, prismAt) => {
    const pid = `${spec.id}-${key}`;
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        {holoDefs(pid, spec)}
        <path d={shape} fill={`url(#${pid}-a)`} filter={`url(#${pid}-f)`} />
        <path d={shape} fill="none" stroke="#ffffff" strokeWidth="0.55" strokeOpacity="0.55" />
        {prismAt && prism(prismAt[0], prismAt[1])}
      </svg>
    );
  };
  return {
    connections: icon('c', 'M4 4.2h16v4.4H4zM4 9.9h16v4.4H4zM4 15.6h16v4.4H4z', [18.2, 6.2]),
    passwords: icon('p', 'M12 3.2 5.2 6v5.2c0 4.2 2.8 7.6 6.8 8.6 4-1 6.8-4.4 6.8-8.6V6L12 3.2z', [12, 12]),
    documents: icon('d', 'M14 3.2H7.2A1.6 1.6 0 0 0 5.6 4.8v14.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8.2L14 3.2z', [12, 14]),
    favorites: icon('f', 'M12 3.2 14.6 8.8 20.6 9.6 16.2 14l1.2 6.2L12 17.2 6.6 20.2 7.8 14 3.4 9.6 9.4 8.8 12 3.2z', null),
    tools: icon('t', 'M12 3.4 14.2 6.2 17.4 5.6 18 8.8 20.6 10.4 18.8 13 20.6 15.6 18 17.2 17.4 20.4 14.2 19.8 12 22.6 9.8 19.8 6.6 20.4 6 17.2 3.4 15.6 5.2 13 3.4 10.4 6 8.8 6.6 5.6 9.8 6.2 12 3.4z', [12, 13])
  };
}

function halfSun(cx, y, r, color) {
  return <path d={`M${cx - r} ${y} A ${r} ${r} 0 0 1 ${cx + r} ${y} Z`} fill={color} />;
}

function synthWrap(spec, key, children) {
  const pid = `${spec.id}-${key}`;
  const glow = Math.min(spec.glowOpacity ?? 0.4, 0.45);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${pid}-s`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={spec.stroke} />
          <stop offset="100%" stopColor={spec.secondary} />
        </linearGradient>
        <filter id={`${pid}-f`} x="-22%" y="-22%" width="144%" height="144%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor={spec.glow} floodOpacity={glow} />
        </filter>
      </defs>
      <g filter={`url(#${pid}-f)`}>{children}</g>
    </svg>
  );
}

function synthRail(spec) {
  const edge = `url(#${spec.id}`;
  const page = 'M14 3.2H7.2A1.6 1.6 0 0 0 5.6 4.8v14.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8.2L14 3.2z';
  const star = 'M12 2.2 14.8 8.2 21.2 9 16.4 13.4 17.8 20 12 16.6 6.2 20 7.6 13.4 2.8 9 9.2 8.2 12 2.2z';
  return {
    connections: synthWrap(spec, 'c', (
      <>
        {halfSun(16.6, 5.4, 2.8, spec.accent)}
        <rect x="3.2" y="4.6" width="17.6" height="4.4" rx="0.7" fill={spec.bg} stroke={`${edge}-c-s)`} strokeWidth="1.7" />
        <rect x="3.2" y="10.2" width="17.6" height="4.4" rx="0.7" fill={spec.bg} stroke={spec.secondary} strokeWidth="1.7" />
        <rect x="3.2" y="15.8" width="17.6" height="4.4" rx="0.7" fill={spec.bg} stroke={spec.stroke} strokeWidth="1.7" />
        <path d="M7.4 18 12 20.6 16.6 18" stroke={spec.accent} strokeWidth="1.6" strokeLinecap="round" />
      </>
    )),
    passwords: synthWrap(spec, 'p', (
      <>
        <path d="M12 2.4 5 5.4v5.6c0 4.6 3 8 7 9.2 4-1.2 7-4.6 7-9.2V5.4L12 2.4z" fill={spec.bg} stroke={`${edge}-p-s)`} strokeWidth="1.8" />
        {halfSun(12, 12.2, 3.6, spec.accent)}
        <path d="M7.6 12.2h8.8" stroke={spec.secondary} strokeWidth="1.6" />
      </>
    )),
    documents: synthWrap(spec, 'd', (
      <>
        <path d={page} fill={spec.bg} stroke={`${edge}-d-s)`} strokeWidth="1.8" />
        {halfSun(12, 12.4, 3.4, spec.accent)}
        <path d="M8.4 12.4 12 16.6 15.6 12.4M9.4 14.6h5.2" stroke={spec.secondary} strokeWidth="1.6" strokeLinecap="round" />
      </>
    )),
    favorites: synthWrap(spec, 'f', (
      <>
        {halfSun(12, 13.4, 6.4, spec.accent)}
        <path d={star} fill={spec.bg} stroke={`${edge}-f-s)`} strokeWidth="1.6" strokeLinejoin="round" />
      </>
    )),
    tools: synthWrap(spec, 't', (
      <>
        <circle cx="12" cy="12" r="3.2" fill="none" stroke={`${edge}-t-s)`} strokeWidth="2.3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect key={angle} x="10.8" y="2.2" width="2.4" height="6.6" rx="0.3" fill={angle % 90 === 0 ? spec.stroke : spec.secondary} transform={`rotate(${angle} 12 12)`} />
        ))}
        {halfSun(12, 12, 2.1, spec.accent)}
      </>
    ))
  };
}

function cyberRail(spec) {
  const box = (key, shape, extra) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>{frame(`${spec.id}-${key}`, spec.glow, 0.75, 0.7)}</defs>
      <path d={shape} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.45" strokeLinejoin="miter" filter={`url(#${spec.id}-${key}-f)`} />
      {extra}
    </svg>
  );
  const cyan = spec.accent;
  const mag = spec.secondary;
  return {
    connections: box('c', 'M4 4.6h16v4H4zM4 10.2h16v4H4zM4 15.8h16v4H4z', <path d="M6 6.6h2.2M6 12.2h2.2M6 17.8h2.2" stroke={cyan} strokeWidth="1.4" />),
    passwords: box('p', 'M5 7.2 7.4 5h11.2v13.2H5V7.2z', <><rect x="7.2" y="8.6" width="3" height="2" fill={cyan} /><path d="M5.4 14.4h13" stroke={mag} strokeWidth="1.4" /></>),
    documents: box('d', 'M8 3.4h5l4.4 4.2V20H8V3.4z', <path d="M13 3.4v4.4h4.4" stroke={cyan} strokeWidth="1.2" />),
    favorites: box('f', 'M12 3.4 14.4 8.6 20 9.4 15.8 13.4 17 19.2 12 16.4 7 19.2 8.2 13.4 4 9.4 9.6 8.6 12 3.4z', <path d="M12 8.4v4" stroke={mag} strokeWidth="1.3" />),
    tools: box('t', 'M8 4h8l3.4 3.4v9.2L16 20H8l-3.4-3.4V7.4L8 4z', <circle cx="12" cy="12" r="2.2" stroke={cyan} strokeWidth="1.3" />)
  };
}

function tronRail(spec) {
  const box = (key, shape, traces, points) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>{frame(`${spec.id}-${key}`, spec.glow, 0.7, 0.75)}</defs>
      <path d={shape} fill={spec.bg} stroke={spec.stroke} strokeWidth="1.3" filter={`url(#${spec.id}-${key}-f)`} />
      <path d={traces} fill="none" stroke={spec.accent} strokeWidth="1.15" strokeLinecap="square" />
      {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 ? 1.15 : 0.85} fill={i === 0 ? spec.accent : spec.stroke} />)}
    </svg>
  );
  return {
    connections: box('c', 'M4 4.4h16v15.2H4z', 'M7 8h10M7 12h6M7 16h10', [[7, 8], [17, 8], [13, 12], [17, 16]]),
    passwords: box('p', 'M12 3.2 5.4 6v5c0 4 2.6 7.2 6.6 8.2 4-.1 6.6-4.2 6.6-8.2V6L12 3.2z', 'M12 8v6', [[12, 8], [12, 14]]),
    documents: box('d', 'M14 3.2H7.4v17.2h9.2V8.2L14 3.2z', 'M9.2 12h4.2v4', [[9.2, 12], [13.4, 12], [13.4, 16]]),
    favorites: box('f', 'M12 3.2 14.6 8.6 20.4 9.4 16 13.6 17.2 19.4 12 16.6 6.8 19.4 8 13.6 3.6 9.4 9.4 8.6 12 3.2z', 'M12 8.4v5.2M9.6 11h4.8', [[12, 8.4], [9.6, 11], [14.4, 11]]),
    tools: box('t', 'M4.4 4.4h15.2v15.2H4.4z', 'M12 7.2v9.6M7.2 12h9.6', [[12, 7.2], [12, 12], [12, 16.8], [7.2, 12], [16.8, 12]])
  };
}

function termWrap(spec, key, children) {
  const glow = Math.min(spec.glowOpacity ?? 0.4, 0.42);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id={`${spec.id}-${key}-f`} x="-22%" y="-22%" width="144%" height="144%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor={spec.glow} floodOpacity={glow} />
        </filter>
      </defs>
      <g filter={`url(#${spec.id}-${key}-f)`}>{children}</g>
    </svg>
  );
}

function termRail(spec) {
  const bezel = { fill: spec.bg, stroke: spec.stroke, strokeWidth: 1.8, strokeLinejoin: 'round' };
  const slab = (y) => (
    <>
      <rect x="3.2" y={y} width="17.6" height="4.6" rx="0.7" {...bezel} />
      <circle cx="6.2" cy={y + 2.3} r="1.15" fill={spec.accent} />
    </>
  );
  return {
    connections: termWrap(spec, 'c', <>{slab(2.6)}{slab(9.7)}{slab(16.8)}</>),
    passwords: termWrap(spec, 'p', (
      <>
        <path d="M12 2.4 5 5.4v5.6c0 4.6 3 8 7 9.2 4-1.2 7-4.6 7-9.2V5.4L12 2.4z" {...bezel} />
        <rect x="10.5" y="9.4" width="3" height="4.4" fill={spec.accent} />
      </>
    )),
    documents: termWrap(spec, 'd', (
      <>
        <path d="M14 2.8H7.2A1.6 1.6 0 0 0 5.6 4.4v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V8L14 2.8z" {...bezel} />
        <rect x="7.4" y="11" width="9.2" height="2.8" fill={spec.accent} />
        <rect x="7.4" y="15.2" width="9.2" height="1.5" fill={spec.stroke} />
      </>
    )),
    favorites: termWrap(spec, 'f', (
      <path d="M12 2.2 14.8 8.2 21.2 9 16.4 13.4 17.8 20 12 16.6 6.2 20 7.6 13.4 2.8 9 9.2 8.2 12 2.2z" fill={spec.accent} stroke={spec.stroke} strokeWidth="1.6" strokeLinejoin="round" />
    )),
    tools: termWrap(spec, 't', (
      <>
        <circle cx="12" cy="12" r="3.2" fill={spec.secondary} stroke={spec.stroke} strokeWidth="1.8" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect key={angle} x="10.8" y="2.2" width="2.4" height="6.6" rx="0.3" fill={spec.stroke} transform={`rotate(${angle} 12 12)`} />
        ))}
        <rect x="10.6" y="10.3" width="2.8" height="3.4" fill={spec.accent} />
      </>
    ))
  };
}

function railFor(spec) {
  if (spec.style === 'holo') return holoRail(spec);
  if (spec.style === 'cyber') return cyberRail(spec);
  if (spec.style === 'tron') return tronRail(spec);
  if (spec.style === 'terminal') return termRail(spec);
  return synthRail(spec);
}

export const futuristRailIcons = Object.fromEntries(
  futuristCatalog.map((spec) => [spec.id, railFor(spec)])
);
