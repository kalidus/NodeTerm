import React from 'react';
import { ghostCatalog } from './ghost-catalog';

/** viewBox más cerrado = el trazo ghost ocupa más el recuadro óptico. */
const VB = '1.5 1.5 21 21';

function GhostSvg({ pid, children }) {
  return (
    <svg width="24" height="24" viewBox={VB} fill="none">
      <defs>
        <filter id={pid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

export function buildGhostTheme(spec) {
  const id = spec.id;
  const color = spec.color;
  const glow = `url(#${id}`;
  return {
    name: spec.name,
    icons: {
      folder: (
        <GhostSvg pid={`${id}-folder`}>
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke={color} strokeWidth="1.05" strokeLinejoin="round" filter={`${glow}-folder)`} />
        </GhostSvg>
      ),
      folderOpen: (
        <GhostSvg pid={`${id}-folderOpen`}>
          <path d="M5 6h4l2 2h8c1.1 0 2 .9 2 2v2H3V8c0-1.1.9-2 2-2z" stroke={color} strokeWidth="0.7" opacity="0.3" />
          <path d="M3 10l2 10h14l2-10H3z" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.05" strokeLinejoin="round" filter={`${glow}-folderOpen)`} />
        </GhostSvg>
      ),
      ssh: (
        <GhostSvg pid={`${id}-ssh`}>
          <rect x="4" y="5" width="16" height="12" rx="3" stroke={color} strokeWidth="1.05" filter={`${glow}-ssh)`} />
          <path d="M8 10l2 2-2 2M13 14h3" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
        </GhostSvg>
      ),
      rdp: (
        <GhostSvg pid={`${id}-rdp`}>
          <rect x="4" y="5" width="16" height="12" rx="3" stroke={color} strokeWidth="1.05" filter={`${glow}-rdp)`} />
          <path d="M12 8v4M10 10l2 2 2-2" stroke={color} strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="14" x2="15" y2="14" stroke={color} strokeWidth="0.8" />
        </GhostSvg>
      ),
      vnc: (
        <GhostSvg pid={`${id}-vnc`}>
          <rect x="4" y="5" width="16" height="12" rx="3" stroke={color} strokeWidth="1.05" filter={`${glow}-vnc)`} />
          <circle cx="12" cy="11" r="2.5" stroke={color} strokeWidth="1.05" />
          <path d="M12 13.5V15M10 15h4" stroke={color} strokeWidth="0.8" />
        </GhostSvg>
      ),
      file: (
        <GhostSvg pid={`${id}-file`}>
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke={color} strokeWidth="1.05" strokeLinejoin="round" filter={`${glow}-file)`} />
          <path d="M14 4v6h6" stroke={color} strokeWidth="0.8" opacity="0.4" />
        </GhostSvg>
      ),
      sftp: (
        <GhostSvg pid={`${id}-sftp`}>
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke={color} strokeWidth="0.8" opacity="0.3" />
          <path d="M12 11v6M10 15l2 2 2-2" stroke={color} strokeWidth="1.05" strokeLinecap="round" filter={`${glow}-sftp)`} />
        </GhostSvg>
      ),
      ftp: (
        <GhostSvg pid={`${id}-ftp`}>
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke={color} strokeWidth="0.8" opacity="0.3" />
          <path d="M12 17v-6M14 13.5l-2-2-2 2" stroke={color} strokeWidth="1.05" strokeLinecap="round" filter={`${glow}-ftp)`} />
        </GhostSvg>
      ),
      scp: (
        <GhostSvg pid={`${id}-scp`}>
          <path d="M14 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10l-6-6z" stroke={color} strokeWidth="0.8" opacity="0.3" />
          <path d="M10 14l2-2 2 2M12 12v5" stroke={color} strokeWidth="1.05" strokeLinecap="round" filter={`${glow}-scp)`} />
        </GhostSvg>
      ),
      password: (
        <GhostSvg pid={`${id}-password`}>
          <rect x="6" y="11" width="12" height="8" rx="2" stroke={color} strokeWidth="1.05" filter={`${glow}-password)`} />
          <path d="M9 11V8c0-1.7 1.3-3 3-3s3 1.3 3 3v3" stroke={color} strokeWidth="0.8" />
        </GhostSvg>
      ),
      'ssh-tunnel': (
        <GhostSvg pid={`${id}-tunnel`}>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="0.8" opacity="0.2" />
          <path d="M12 4.5l7 7.5-7 7.5-7-7.5 7-7.5z" stroke={color} strokeWidth="1.25" filter={`${glow}-tunnel)`} />
        </GhostSvg>
      )
    }
  };
}

export const ghostIconThemes = Object.fromEntries(
  ghostCatalog.map((spec) => [spec.id, buildGhostTheme(spec)])
);
