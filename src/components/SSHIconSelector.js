import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

// SVG inner content — viewBox 0 0 24 24, all attributes kebab-case for innerHTML.
// Every icon uses currentColor so color theming works with style={{ color }}.
const SVGS = {

  // ── GENERAL ────────────────────────────────────────────────────────────────

  server: `<rect x="2" y="2" width="20" height="7" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<rect x="2" y="11" width="20" height="5" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<rect x="2" y="18" width="20" height="4" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<circle cx="18.5" cy="5.5" r="1" fill="currentColor"/>
<circle cx="18.5" cy="13.5" r="1" fill="currentColor"/>
<rect x="5" y="4.5" width="9" height="2" rx="1" fill="currentColor" opacity="0.45"/>
<rect x="5" y="12.5" width="6" height="2" rx="1" fill="currentColor" opacity="0.45"/>`,

  production: `<path d="M12 2C9 5 8 8 8 11H16C16 8 15 5 12 2Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2" stroke-linejoin="round"/>
<path d="M8 11L5.5 15.5H7.5L9 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M16 11L18.5 15.5H16.5L15 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<rect x="10" y="11" width="4" height="9" rx="1.5" fill="currentColor" fill-opacity="0.7"/>
<circle cx="12" cy="7.5" r="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.25"/>`,

  development: `<polyline points="7,8 3,12 7,16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<polyline points="17,8 21,12 17,16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  testing: `<path d="M9.5 3H14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M10 3V9.5L5 17.5C4.4 18.7 5.2 20 6.5 20H17.5C18.8 20 19.6 18.7 19 17.5L14 9.5V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.12"/>
<path d="M6.5 16H17.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
<circle cx="9.5" cy="17.2" r="1.2" fill="currentColor"/>
<circle cx="13.5" cy="15.2" r="0.9" fill="currentColor" opacity="0.65"/>`,

  staging: `<path d="M12 2L22 7L12 12L2 7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.2"/>
<path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  homeserver: `<path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V10.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M8.5 7.5C9.8 6 14.2 6 15.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<path d="M10 9.5C10.8 8.6 13.2 8.6 14 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<circle cx="12" cy="11.2" r="0.9" fill="currentColor"/>`,

  backup: `<path d="M3.5 9C3.5 5.4 7.3 2.5 12 2.5C16.7 2.5 20.5 5.4 20.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<polyline points="20,5 20.5,9 17,9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M20.5 15C20.5 18.6 16.7 21.5 12 21.5C7.3 21.5 3.5 18.6 3.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<polyline points="4,19 3.5,15 7,14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<rect x="8.5" y="10.5" width="7" height="3" rx="1" fill="currentColor" opacity="0.55"/>`,

  monitoring: `<polyline points="2,12 5.5,12 7,6 10,18 13,9 15,14 17.5,11 19.5,13 22,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  gateway: `<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="12" y1="2" x2="12" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="12" y1="15.5" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="2" y1="12" x2="8.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="15.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="12" cy="2" r="1.5" fill="currentColor"/>
<circle cx="12" cy="22" r="1.5" fill="currentColor"/>
<circle cx="2" cy="12" r="1.5" fill="currentColor"/>
<circle cx="22" cy="12" r="1.5" fill="currentColor"/>`,

  bastion: `<rect x="3" y="14" width="18" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="5.5" y="9" width="5" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<rect x="13.5" y="9" width="5" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<path d="M5.5 9V6H7.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M8.5 9V6H10.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M13.5 9V6H15.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M16.5 9V6H18.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<rect x="10" y="18" width="4" height="3" fill="currentColor" opacity="0.5"/>`,

  // ── OS ─────────────────────────────────────────────────────────────────────

  linux: `<ellipse cx="12" cy="7.5" rx="4" ry="4.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<ellipse cx="12" cy="16.5" rx="5.5" ry="5.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.13"/>
<circle cx="10.5" cy="6" r="0.9" fill="currentColor"/>
<circle cx="13.5" cy="6" r="0.9" fill="currentColor"/>
<path d="M10.5 8.5C11 9.2 13 9.2 13.5 8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/>
<line x1="9.5" y1="21.5" x2="8" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="14.5" y1="21.5" x2="16" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  ubuntu: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<circle cx="12" cy="3" r="2" fill="currentColor"/>
<circle cx="20.2" cy="16.5" r="2" fill="currentColor"/>
<circle cx="3.8" cy="16.5" r="2" fill="currentColor"/>
<line x1="12" y1="5" x2="12" y2="8.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="18.5" y1="14.6" x2="15.5" y2="12.8" stroke="currentColor" stroke-width="1.5"/>
<line x1="5.5" y1="14.6" x2="8.5" y2="12.8" stroke="currentColor" stroke-width="1.5"/>`,

  debian: `<circle cx="12" cy="11" r="8.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M12 4C14.5 4 16.5 5.8 17 8C17.5 10.2 16.5 12.5 14.5 13.5C12.5 14.5 10 13.8 9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M9 12C7.8 10.5 8.2 8 10 7C11.5 6.2 13 6.8 13 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M9.5 18C9.8 19.5 9.5 21 8.5 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  centos: `<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="12" y1="2" x2="12" y2="8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="12" y1="15.5" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="2" y1="12" x2="8.5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="15.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="5" y1="5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="14.5" y1="14.5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="19" y1="5" x2="14.5" y2="9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="9.5" y1="14.5" x2="5" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  fedora: `<circle cx="12" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M9 10C9 7.8 10.3 6.5 12 6.5C13.7 6.5 15 7.8 15 10C15 12.2 13.7 13.5 12 13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<line x1="12" y1="6.5" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  arch: `<path d="M12 3L22 21H2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M9 17L12 9L15 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="10" y1="15" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  suse: `<ellipse cx="11" cy="9" rx="5.5" ry="5.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.13"/>
<path d="M16 7.5C18.2 7 20 8.5 20.5 10.5C21 12.5 19.5 14.8 17.5 15.3C16 15.7 14.5 15.2 13.5 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M7.5 13C6.5 15 7 17.8 9 19.3C10.5 20.3 12.5 20.3 14 19.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<circle cx="10" cy="8" r="1.1" fill="currentColor"/>`,

  alpine: `<path d="M12 2L22.5 21H1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M7 21L12 11L17 21" fill="currentColor" fill-opacity="0.35"/>
<path d="M3 16L7.5 9L11.5 15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  windows: `<rect x="3" y="3" width="8.5" height="8.5" rx="1.5" fill="currentColor"/>
<rect x="12.5" y="3" width="8.5" height="8.5" rx="1.5" fill="currentColor" fill-opacity="0.75"/>
<rect x="3" y="12.5" width="8.5" height="8.5" rx="1.5" fill="currentColor" fill-opacity="0.75"/>
<rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1.5" fill="currentColor" fill-opacity="0.5"/>`,

  macos: `<path d="M16.5 3.5C16.5 6 14.2 6.8 12 5.5C13.5 3.2 15.8 3 16.5 3.5Z" fill="currentColor"/>
<path d="M7.5 9C5.5 9 3.5 11 3.5 14C3.5 18 6 22 9 22C10.5 22 11.5 21.2 12 21.2C12.5 21.2 13.5 22 15 22C18 22 20.5 18 20.5 14C20.5 11 18.5 9 16.5 9C15 9 14 10 12 10C10 10 9 9 7.5 9Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>`,

  bsd: `<circle cx="12" cy="14" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<path d="M8 10V5L6.5 3M8 10C8 12.5 10 14 12 14M8 10H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M16 10V5L17.5 3M16 10C16 12.5 14 14 12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  rocky: `<path d="M12 2L22 7.5V16.5L12 22L2 16.5V7.5Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M8 10C8 8 9.8 7 12 7C14.2 7 16 8 16 10C16 12 14.5 13 12 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="12" y1="13" x2="15" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ── CLOUD ──────────────────────────────────────────────────────────────────

  aws: `<path d="M5.5 11C5.5 7.4 8.4 5 12 5C15.6 5 18.5 7.4 18.5 11" stroke="currentColor" stroke-width="1.5" fill="none"/>
<ellipse cx="3.8" cy="13.2" rx="1.8" ry="1.3" stroke="currentColor" stroke-width="1.3" fill="currentColor" fill-opacity="0.15"/>
<ellipse cx="20.2" cy="13.2" rx="1.8" ry="1.3" stroke="currentColor" stroke-width="1.3" fill="currentColor" fill-opacity="0.15"/>
<rect x="5.5" y="11" width="13" height="4.5" rx="2.2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M7 20C9.5 22 14.5 22 17 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M15.5 20L17.5 18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  azure: `<path d="M5 21L13.5 4.5L18 13L14 17.5L21 21H5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M11.5 10.5L14.5 17.5" stroke="currentColor" stroke-width="1" opacity="0.45" stroke-linecap="round"/>`,

  gcp: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<circle cx="12" cy="3.5" r="2" fill="currentColor"/>
<circle cx="20" cy="16.5" r="2" fill="currentColor"/>
<circle cx="4" cy="16.5" r="2" fill="currentColor"/>`,

  digitalocean: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M12 5.5C8.4 5.5 5.5 8.4 5.5 12C5.5 15.6 8.4 18.5 12 18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
<line x1="12" y1="18.5" x2="12" y2="21.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="12" y1="21.5" x2="7.5" y2="21.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="7.5" y1="21.5" x2="7.5" y2="18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  linode: `<path d="M5 21L9.5 4.5L14 14.5L18 8L21 21H5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>`,

  vultr: `<path d="M12 3L21 8.5V15.5L12 21L3 15.5V8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1"/>
<path d="M8 10L12 16L16 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  ovh: `<rect x="2.5" y="4.5" width="19" height="15" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M7.5 12C7.5 9.8 9.3 8 11.5 8H12.5C14.7 8 16.5 9.8 16.5 12C16.5 14.2 14.7 16 12.5 16H11.5C9.3 16 7.5 14.2 7.5 12Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>`,

  // Hetzner IMPROVED — tall tower shape (no longer similar to Hyper-V)
  hetzner: `<rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<rect x="8" y="5" width="8" height="2.5" rx="1" fill="currentColor" opacity="0.55"/>
<rect x="8" y="9.5" width="8" height="2.5" rx="1" fill="currentColor" opacity="0.45"/>
<rect x="8" y="14" width="8" height="2.5" rx="1" fill="currentColor" opacity="0.38"/>
<circle cx="15" cy="19.5" r="1" fill="currentColor"/>`,

  // Oracle IMPROVED — three concentric circles (distinctive brand identity)
  oracle: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2.5" fill="none"/>
<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="12" cy="12" r="1.5" fill="currentColor"/>`,

  ibm: `<line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,

  cloudflare: `<path d="M3 15C3 11.7 5.7 9 9 9C9.7 9 10.4 9.1 11 9.4C11.8 7.4 13.7 6 16 6C19 6 21 8.2 21 11C22 11.6 22.5 12.7 22.5 14C22.5 16 21 17.5 19 17.5H5C3.9 17.5 3 16.4 3 15Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M11.5 11L8.5 15.5H11.5L8.5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  // ── CONTAINERS ─────────────────────────────────────────────────────────────

  // Docker IMPROVED — iconic whale + containers silhouette
  docker: `<rect x="4" y="7.5" width="3.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.65"/>
<rect x="8.5" y="7.5" width="3.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.65"/>
<rect x="13" y="7.5" width="3.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.65"/>
<rect x="8.5" y="3.5" width="3.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.45"/>
<rect x="13" y="3.5" width="3.5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.45"/>
<path d="M20.5 10.5C21.8 10 23 11 22.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M1 14C2.5 17 7 19 12 19C17 19 21.5 17 23 14C23.3 13.3 23 12.5 22.5 12.5H1.5C1 12.5 0.7 13.3 1 14Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,

  kubernetes: `<path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="12" y1="9" x2="12" y2="5" stroke="currentColor" stroke-width="1.5"/>
<line x1="12" y1="15" x2="12" y2="19" stroke="currentColor" stroke-width="1.5"/>
<line x1="9.4" y1="10.5" x2="5.8" y2="8.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="14.6" y1="13.5" x2="18.2" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="9.4" y1="13.5" x2="5.8" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="14.6" y1="10.5" x2="18.2" y2="8.5" stroke="currentColor" stroke-width="1.5"/>`,

  podman: `<ellipse cx="12" cy="14.5" rx="7" ry="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="9.5" cy="12" r="1.2" fill="currentColor"/>
<circle cx="14.5" cy="12" r="1.2" fill="currentColor"/>
<path d="M9 17C10 18.5 14 18.5 15 17" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
<path d="M10.5 8.5C10.5 7.3 11.2 5.5 12 5.5C12.8 5.5 13.5 7.3 13.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="12" y1="5.5" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // LXC IMPROVED — 3 offset containers with connecting lines (not 4 squares like Windows)
  lxc: `<rect x="2" y="4.5" width="9.5" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="12.5" y="4.5" width="9.5" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<rect x="7" y="13" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M11.5 8H7.5L10 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M12.5 8H16.5L14 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  proxmox: `<path d="M12 3L20.5 8V16L12 21L3.5 16V8Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M9 9.5H15.5L12 15.5Z" fill="currentColor" fill-opacity="0.5"/>
<path d="M15.5 9.5L12 15.5L15.5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  vmware: `<rect x="2" y="4.5" width="11" height="9" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="8.5" y="9.5" width="11" height="9" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>`,

  hyperv: `<rect x="2.5" y="2.5" width="8" height="19" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="13.5" y="2.5" width="8" height="19" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" stroke-width="2"/>`,

  kvm: `<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
<rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="4" y1="8" x2="8" y2="8" stroke="currentColor" stroke-width="1.5"/>
<line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1.5"/>
<line x1="4" y1="16" x2="8" y2="16" stroke="currentColor" stroke-width="1.5"/>
<line x1="20" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="1.5"/>
<line x1="20" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.5"/>
<line x1="20" y1="16" x2="16" y2="16" stroke="currentColor" stroke-width="1.5"/>`,

  // ── DATABASES ──────────────────────────────────────────────────────────────

  mysql: `<ellipse cx="12" cy="6" rx="7.5" ry="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<path d="M4.5 6V17C4.5 19.2 7.9 21 12 21C16.1 21 19.5 19.2 19.5 17V6" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M4.5 12C4.5 14.2 7.9 16 12 16C16.1 16 19.5 14.2 19.5 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M16 4C18 3 20.5 3.8 21.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  mariadb: `<ellipse cx="12" cy="6" rx="7.5" ry="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M4.5 6V17C4.5 19.2 7.9 21 12 21C16.1 21 19.5 19.2 19.5 17V6" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M19.5 6C21 7 22 9 22 11C22 13 21 14.5 19.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  postgresql: `<ellipse cx="12" cy="7" rx="7.5" ry="4" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M4.5 7V17C4.5 19.5 7.9 21.5 12 21.5C16.1 21.5 19.5 19.5 19.5 17V7" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M4.5 12.5C4.5 15 7.9 17 12 17C16.1 17 19.5 15 19.5 12.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<circle cx="16" cy="5.5" r="2.2" stroke="currentColor" stroke-width="1.5" fill="none"/>`,

  mongodb: `<path d="M12 2C12 2 7 7.5 7 13.5C7 17.5 9.2 21 12 21C14.8 21 17 17.5 17 13.5C17 7.5 12 2 12 2Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<line x1="12" y1="4" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M12 8.5C13.8 10 15.5 10.5 16.5 10.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,

  redis: `<path d="M12 2L21 7V17L12 22L3 17V7Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>
<line x1="8" y1="8.5" x2="8" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="12" y1="8.5" x2="12" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="16" y1="8.5" x2="16" y2="15.5" stroke="currentColor" stroke-width="1.5"/>`,

  elasticsearch: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.3"/>
<line x1="5.5" y1="9" x2="18.5" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<line x1="5.5" y1="12" x2="18.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<line x1="5.5" y1="15" x2="18.5" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,

  cassandra: `<ellipse cx="12" cy="7.5" rx="7.5" ry="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<ellipse cx="12" cy="16.5" rx="7.5" ry="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="4.5" y1="7.5" x2="4.5" y2="16.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="19.5" y1="7.5" x2="19.5" y2="16.5" stroke="currentColor" stroke-width="1.5"/>
<ellipse cx="12" cy="7.5" rx="3" ry="1.5" fill="currentColor" fill-opacity="0.4"/>
<ellipse cx="12" cy="16.5" rx="3" ry="1.5" fill="currentColor" fill-opacity="0.3"/>`,

  mssql: `<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="7" y1="8.5" x2="17" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="7" y1="12" x2="14.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="7" y1="15.5" x2="11.5" y2="15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="17" cy="16" r="2.5" fill="currentColor" fill-opacity="0.55"/>`,

  oracle_db: `<ellipse cx="12" cy="7" rx="8.5" ry="4.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M3.5 7V17C3.5 19.5 7.4 21.5 12 21.5C16.6 21.5 20.5 19.5 20.5 17V7" stroke="currentColor" stroke-width="1.5" fill="none"/>`,

  influxdb: `<path d="M2 17C4 14 6 10 8 14C10 18 11 10 12 8C13 6 14 10 15 12C16 14 17 17 19 14L22 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ClickHouse — 3 vertical bars (matches the actual CH logo exactly)
  clickhouse: `<rect x="3" y="9" width="5" height="13" rx="1" fill="currentColor" fill-opacity="0.6"/>
<rect x="10" y="4" width="5" height="18" rx="1" fill="currentColor" fill-opacity="0.75"/>
<rect x="17" y="9" width="5" height="13" rx="1" fill="currentColor" fill-opacity="0.6"/>`,

  neo4j: `<circle cx="6" cy="6" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="18" cy="6" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="12" cy="18" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="9" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1.5"/>
<line x1="7.5" y1="8.5" x2="10.5" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="16.5" y1="8.5" x2="13.5" y2="15.5" stroke="currentColor" stroke-width="1.5"/>`,

  // ── SERVICES ───────────────────────────────────────────────────────────────

  nginx: `<path d="M3 21L12 4L21 21H3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.12"/>
<line x1="3" y1="21" x2="21" y2="4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,

  apache: `<path d="M12 2C12 2 4 8.5 4 15C4 19.4 7.6 23 12 23C16.4 23 20 19.4 20 15C20 8.5 12 2 12 2Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M8.5 15C8.5 12.5 10.1 11 12 11C13.9 11 15.5 12.5 15.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="12" y1="11" x2="12" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  haproxy: `<circle cx="5" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="19.5" cy="7" r="2.8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<circle cx="19.5" cy="17" r="2.8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<line x1="8.5" y1="11.5" x2="16.7" y2="8.3" stroke="currentColor" stroke-width="1.5"/>
<line x1="8.5" y1="12.5" x2="16.7" y2="15.7" stroke="currentColor" stroke-width="1.5"/>`,

  traefik: `<path d="M12 3.5L22 9L12 14.5L2 9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M2 14L12 19.5L22 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M5 11.5L12 15.5L19 11.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.5"/>`,

  api: `<rect x="2" y="8" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="14" y="4" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="14" y="14" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<line x1="10" y1="11.5" x2="14" y2="7.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="10" y1="12.5" x2="14" y2="17" stroke="currentColor" stroke-width="1.5"/>`,

  mail: `<rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<path d="M2 7.5L12 13.5L22 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  dns: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<ellipse cx="12" cy="12" rx="4" ry="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="1" opacity="0.55"/>`,

  ftp: `<rect x="3" y="3" width="10" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<path d="M9 3H13L17 7V21H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="13" y1="3" x2="13" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="13" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M16.5 13L21.5 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M19.5 10.5L22 13L19.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  vpn: `<path d="M12 2L20.5 6V11.5C20.5 16.2 16.7 20.5 12 22C7.3 20.5 3.5 16.2 3.5 11.5V6Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<rect x="9" y="12" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.25"/>
<path d="M10 12V10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<circle cx="12" cy="14.5" r="1" fill="currentColor"/>`,

  firewall: `<path d="M12 2L20.5 6V12.5C20.5 17.2 16.8 21.3 12 23C7.2 21.3 3.5 17.2 3.5 12.5V6Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<line x1="6.5" y1="9.5" x2="17.5" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="6.5" y1="13" x2="17.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="6.5" y1="16.5" x2="15.5" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ── DEVOPS ─────────────────────────────────────────────────────────────────

  jenkins: `<circle cx="12" cy="10.5" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="10.2" cy="9" r="1.2" fill="currentColor"/>
<circle cx="13.8" cy="9" r="1.2" fill="currentColor"/>
<path d="M9.5 13.5C10.3 15 13.7 15 14.5 13.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<path d="M11 5.5C11 4.3 10 3 9.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M13 5.5C13 4.3 14 3 14.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="9.5" y1="17" x2="9" y2="21.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="14.5" y1="17" x2="15" y2="21.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  gitlab: `<path d="M12 21.5L2.5 10L6.5 3L9.5 10H14.5L17.5 3L21.5 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M2.5 10L6.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M21.5 10L17.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  github: `<path d="M12 2C6.5 2 2 6.5 2 12C2 16.4 4.9 20.1 8.9 21.4C9.4 21.5 9.5 21.1 9.5 20.9V19.2C6.8 19.8 6.2 17.8 6.2 17.8C5.7 16.6 5 16.3 5 16.3C4.1 15.7 5.1 15.7 5.1 15.7C6.1 15.8 6.7 16.8 6.7 16.8C7.5 18.3 8.9 17.9 9.5 17.6C9.6 17 9.9 16.6 10.2 16.3C7.9 16.1 5.5 15.2 5.5 11.3C5.5 10.2 5.9 9.3 6.6 8.6C6.5 8.3 6.1 7.3 6.6 6C6.6 6 7.5 5.7 9.5 7C10.3 6.8 11.2 6.7 12 6.7C12.8 6.7 13.7 6.8 14.5 7C16.5 5.7 17.4 6 17.4 6C17.9 7.3 17.5 8.3 17.4 8.6C18.1 9.3 18.5 10.2 18.5 11.3C18.5 15.2 16.1 16.1 13.8 16.3C14.2 16.7 14.5 17.4 14.5 18.4V20.9C14.5 21.1 14.6 21.5 15.1 21.4C19.1 20.1 22 16.4 22 12C22 6.5 17.5 2 12 2Z" fill="currentColor"/>`,

  ansible: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<path d="M8 19L13.5 5.5L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="13" y1="11.5" x2="18" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  terraform: `<path d="M9 3.5L2.5 7.3V15.3L9 19.1V11.1L9 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.2"/>
<path d="M15 3.5L21.5 7.3V15.3L15 19.1V11.1L15 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
<path d="M9.5 21L16 17.3V13.3L9.5 17V21Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.12"/>`,

  prometheus: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<path d="M7.5 18C6.5 16.3 6 14.3 6 12C6 8.7 8.7 6 12 6C15.3 6 18 8.7 18 12C18 14.3 17.5 16.3 16.5 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<circle cx="12" cy="12" r="2.5" fill="currentColor"/>`,

  grafana: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M7 15.5C7 13 9.5 11 12.5 11C14 11 15.3 11.5 16 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M16 12.5C17.5 10.5 18.5 9 18.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<circle cx="12.5" cy="11" r="1.8" fill="currentColor"/>
<line x1="12.5" y1="11" x2="12.5" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  sonarqube: `<path d="M4.5 21C4.5 14.5 8.5 9 12 3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<path d="M9 21C9 17 11.5 13 15.5 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<path d="M13.5 21C13.5 19 15.5 16.5 19 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,

  nexus: `<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="19" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="5" cy="19" r="2.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="19" cy="19" r="2.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<line x1="7.2" y1="7.2" x2="9.9" y2="9.9" stroke="currentColor" stroke-width="1.2"/>
<line x1="16.8" y1="7.2" x2="14.1" y2="9.9" stroke="currentColor" stroke-width="1.2"/>
<line x1="7.2" y1="16.8" x2="9.9" y2="14.1" stroke="currentColor" stroke-width="1.2"/>
<line x1="16.8" y1="16.8" x2="14.1" y2="14.1" stroke="currentColor" stroke-width="1.2"/>`,

  harbor: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<path d="M12 4.5V12M12 12L7.5 16.5M12 12L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="5.5" y1="20" x2="18.5" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="8.5" y1="20" x2="8.5" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="15.5" y1="20" x2="15.5" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // HashiCorp Vault — safe door with combination lock
  vault: `<rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="12" y1="8" x2="12" y2="7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="14.5" y1="9.5" x2="15" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="16" y1="12" x2="16.5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // Consul — service mesh / compass
  consul: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M8.5 12C8.5 10 10 8.5 12 8.5C14 8.5 15.5 10 15.5 12C15.5 14 14 15.5 12 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
<circle cx="12" cy="15.5" r="1.5" fill="currentColor"/>
<circle cx="7" cy="11.2" r="1.5" fill="currentColor"/>
<circle cx="17" cy="11.2" r="1.5" fill="currentColor"/>
<line x1="7" y1="12.7" x2="10.5" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="17" y1="12.7" x2="13.5" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ArgoCD — compass rose / navigation wheel
  argocd: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M12 3V6M12 18V21M3 12H6M18 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<path d="M5.6 5.6L7.8 7.8M16.2 16.2L18.4 18.4M5.6 18.4L7.8 16.2M16.2 7.8L18.4 5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="12" cy="12" r="1.2" fill="currentColor"/>`,

  // ── NETWORK DEVICES ────────────────────────────────────────────────────────

  router: `<rect x="2" y="12" width="20" height="9" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<line x1="6" y1="12" x2="6" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="12" y1="12" x2="12" y2="2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="18" y1="12" x2="18" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="7" cy="16" r="1" fill="currentColor"/>
<circle cx="10" cy="16" r="1" fill="currentColor"/>
<circle cx="13" cy="16" r="1" fill="currentColor"/>
<rect x="4.5" y="18.5" width="15" height="1.5" rx="0.7" fill="currentColor" opacity="0.4"/>`,

  switch_hw: `<rect x="1" y="7" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<rect x="3" y="10" width="2.5" height="3.5" rx="0.4" fill="currentColor" opacity="0.7"/>
<rect x="6.3" y="10" width="2.5" height="3.5" rx="0.4" fill="currentColor" opacity="0.6"/>
<rect x="9.6" y="10" width="2.5" height="3.5" rx="0.4" fill="currentColor" opacity="0.7"/>
<rect x="12.9" y="10" width="2.5" height="3.5" rx="0.4" fill="currentColor" opacity="0.6"/>
<rect x="16.2" y="10" width="2.5" height="3.5" rx="0.4" fill="currentColor" opacity="0.7"/>
<circle cx="20.5" cy="12" r="1.2" fill="currentColor"/>`,

  access_point: `<ellipse cx="12" cy="16" rx="8.5" ry="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<path d="M5.5 12.5C7 10.5 9.3 9.5 12 9.5C14.7 9.5 17 10.5 18.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M3 9C5 6.5 8.2 5 12 5C15.8 5 19 6.5 21 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<circle cx="12" cy="16" r="2" fill="currentColor"/>
<line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // Cisco — iconic 7-bar arc (the Cisco bridge logo)
  cisco: `<line x1="2" y1="21" x2="2" y2="15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="5.7" y1="21" x2="5.7" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="9.3" y1="21" x2="9.3" y2="7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="13" y1="21" x2="13" y2="4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="16.7" y1="21" x2="16.7" y2="7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
<line x1="20.3" y1="21" x2="20.3" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,

  juniper: `<path d="M12 3L17 10H14.5L20 18H4L9.5 10H7Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<rect x="10.5" y="18" width="3" height="5" rx="0.8" fill="currentColor"/>`,

  mikrotik: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M5.5 18V7L12 15.5L18.5 7V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  ubiquiti: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M8 8V14C8 16.2 9.8 18 12 18C14.2 18 16 16.2 16 14V8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<line x1="12" y1="18" x2="12" y2="20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  pfsense: `<path d="M12 2L4 5.5V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V5.5Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="12" cy="11" r="2.8" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="12" y1="8.2" x2="12" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="12" y1="13.8" x2="12" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="9.2" y1="11" x2="7" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="14.8" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  opnsense: `<path d="M12 2L3 6V12.5C3 17.5 7 21.5 12 23C17 21.5 21 17.5 21 12.5V6Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<line x1="9.2" y1="10.2" x2="14.8" y2="15.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="14.8" y1="10.2" x2="9.2" y2="15.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  fortinet: `<rect x="3" y="2" width="18" height="20" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M7 8H17M7 12H17M7 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<circle cx="16.5" cy="16.5" r="2.5" fill="currentColor" fill-opacity="0.65"/>`,

  ids: `<path d="M12 2L20 6V13C20 17.4 16.4 21.5 12 23C7.6 21.5 4 17.4 4 13V6Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<circle cx="12" cy="11" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
<line x1="14.2" y1="13.2" x2="17" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="8.5" y1="16.5" x2="15.5" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  vlan: `<rect x="2" y="5" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="15" y="5" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="2" y="15" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="15" y="15" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="9" y="10" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.25"/>
<line x1="9" y1="7.5" x2="6" y2="7.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="15" y1="7.5" x2="18" y2="7.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="9" y1="17.5" x2="6" y2="17.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="15" y1="17.5" x2="18" y2="17.5" stroke="currentColor" stroke-width="1.5"/>`,

  // ── IoT / EMBEDDED ─────────────────────────────────────────────────────────

  // Raspberry Pi — the actual raspberry fruit logo with drupelets
  raspberrypi: `<path d="M10.2 4.8C9.2 3.3 7.5 3.2 7.5 4.8C8 6.3 9.7 6.2 10.2 4.8Z" fill="currentColor"/>
<path d="M13.8 4.8C14.8 3.3 16.5 3.2 16.5 4.8C16 6.3 14.3 6.2 13.8 4.8Z" fill="currentColor"/>
<line x1="12" y1="2.5" x2="12" y2="6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="12" cy="9" r="2.3" fill="currentColor"/>
<circle cx="9" cy="11.5" r="2.3" fill="currentColor"/>
<circle cx="15" cy="11.5" r="2.3" fill="currentColor"/>
<circle cx="9.7" cy="15.3" r="2.3" fill="currentColor" fill-opacity="0.85"/>
<circle cx="14.3" cy="15.3" r="2.3" fill="currentColor" fill-opacity="0.85"/>
<circle cx="12" cy="18.5" r="2.3" fill="currentColor" fill-opacity="0.7"/>`,

  // Arduino — circle with ±A symbol (exact Arduino mark)
  arduino: `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<line x1="2.5" y1="12" x2="4.5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="3.5" y1="11" x2="3.5" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<line x1="19.5" y1="12" x2="21.5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<path d="M8.5 15L12 7.5L15.5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<line x1="9.8" y1="12.5" x2="14.2" y2="12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,

  // ESP32 — chip with pin headers on 4 sides + wifi symbol
  esp32: `<rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="9" y1="7" x2="9" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="12" y1="7" x2="12" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="15" y1="7" x2="15" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="9" y1="17" x2="9" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="12" y1="17" x2="12" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="15" y1="17" x2="15" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="7" y1="10" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="7" y1="14" x2="4" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="17" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="17" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="12" cy="12" r="1.8" fill="currentColor"/>`,

  orangepi: `<circle cx="12" cy="9.5" rx="7" ry="7" r="7" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.18"/>
<circle cx="12" cy="9.5" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.3"/>
<path d="M10 4C10 2.8 10.8 2 12 2C13.2 2 14 2.8 14 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<line x1="12" y1="16.5" x2="12" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // NVIDIA Jetson — NVIDIA arrow mark
  jetson: `<path d="M2 12L11 4V8H15.5C18.5 8 21.5 10.5 21.5 14.5C21.5 18.5 18.5 21 15.5 21H2V17H11V16L2 12Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15" stroke-linejoin="round"/>`,

  // NodeMCU — dev board with USB, distinct from ESP32 chip
  nodemcu: `<rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<rect x="8" y="1" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<line x1="9.5" y1="5" x2="9.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="12" y1="5" x2="12" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="14.5" y1="5" x2="14.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<rect x="6" y="10" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/>
<rect x="4" y="19" width="16" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>`,

  // Rock Pi — SBC board with CPU + DDR
  rock_pi: `<rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<rect x="4" y="20" width="16" height="2.5" rx="0.8" fill="currentColor" fill-opacity="0.35"/>
<circle cx="9" cy="12" r="4" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="14" y="8" width="5.5" height="5" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.18"/>
<rect x="14" y="15" width="5.5" height="2.5" rx="0.5" fill="currentColor" fill-opacity="0.15"/>
<line x1="5" y1="8" x2="5" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="7" y1="8" x2="7" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  balena: `<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M8 7H14C15.1 7 16 7.9 16 9C16 10.1 15.1 11 14 11H8V7Z" fill="currentColor" fill-opacity="0.5"/>
<path d="M8 11H15C16.1 11 17 11.9 17 13C17 14.1 16.1 15 15 15H8V11Z" fill="currentColor" fill-opacity="0.38"/>
<line x1="8" y1="7" x2="8" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ── NAS / STORAGE ──────────────────────────────────────────────────────────

  synology: `<rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<rect x="7.5" y="5" width="9" height="3" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.2"/>
<rect x="7.5" y="10" width="9" height="3" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.17"/>
<rect x="7.5" y="15" width="9" height="3" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.14"/>
<circle cx="15.5" cy="6.5" r="0.9" fill="currentColor"/>
<circle cx="15.5" cy="11.5" r="0.9" fill="currentColor"/>
<circle cx="15.5" cy="16.5" r="0.9" fill="currentColor"/>`,

  qnap: `<rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<rect x="5" y="7" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.2"/>
<rect x="5" y="13" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/>
<circle cx="4.5" cy="12" r="1.2" fill="currentColor"/>
<circle cx="18" cy="9" r="0.9" fill="currentColor"/>
<circle cx="18" cy="15" r="0.9" fill="currentColor"/>`,

  truenas: `<path d="M12 2L20.5 7V17L12 22L3.5 17V7Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
<path d="M8 10L12 16.5L16 10H8Z" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
<line x1="12" y1="5" x2="12" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="8" y1="15.5" x2="5.5" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="16" y1="15.5" x2="18.5" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // Unraid — vertical drive bays (the Unraid signature visual)
  unraid: `<rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.08"/>
<line x1="8.5" y1="5" x2="8.5" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="15.5" y1="5" x2="15.5" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,

  // Ceph — squid/octopus with tentacles (Ceph's distinctive logo)
  ceph: `<circle cx="12" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<circle cx="12" cy="7.5" r="2" fill="currentColor"/>
<path d="M8 13C7 16 6 17.5 5 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M10 13.5C10 17 9.5 18.5 9 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M12 13.5V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path d="M14 13.5C14 17 14.5 18.5 15 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<path d="M16 13C17 16 18 17.5 19 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,

  // MinIO — stylized M chevron (object storage)
  minio: `<path d="M4 20V7L12 14.5L20 7V20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<rect x="2" y="20" width="20" height="2.5" rx="1.25" fill="currentColor" fill-opacity="0.5"/>`,

  glusterfs: `<rect x="2" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<rect x="14" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="2" y="14" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.15"/>
<rect x="14" y="14" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.12"/>
<line x1="10" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="6" y1="11" x2="6" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="18" y1="11" x2="18" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // Longhorn (Rancher Longhorn — persistent storage for K8s)
  longhorn: `<path d="M4 12C4 12 4 7 12 7C20 7 20 12 20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M2 12C2 10 4 12 4 12C4 12 6 14 12 14C18 14 20 12 20 12C20 12 22 10 22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
<ellipse cx="12" cy="16.5" rx="6" ry="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
<circle cx="12" cy="16.5" r="1.5" fill="currentColor"/>`,
};

// ── Presets ────────────────────────────────────────────────────────────────────

export const SSHIconPresets = {
  // General
  DEFAULT:     { id: 'default',     name: 'Por Defecto',   description: 'Icono del tema',            color: '#FF9800', category: 'general',    svg: null },
  SERVER:      { id: 'server',      name: 'Servidor',      description: 'Servidor genérico',          color: '#607D8B', category: 'general',    svg: SVGS.server },
  PRODUCTION:  { id: 'production',  name: 'Producción',    description: 'Servidor de producción',     color: '#F44336', category: 'general',    svg: SVGS.production },
  DEVELOPMENT: { id: 'development', name: 'Desarrollo',    description: 'Servidor de desarrollo',     color: '#4CAF50', category: 'general',    svg: SVGS.development },
  TESTING:     { id: 'testing',     name: 'Testing',       description: 'Servidor de pruebas',        color: '#9C27B0', category: 'general',    svg: SVGS.testing },
  STAGING:     { id: 'staging',     name: 'Staging',       description: 'Servidor de staging',        color: '#FF9800', category: 'general',    svg: SVGS.staging },
  HOMESERVER:  { id: 'homeserver',  name: 'Home Server',   description: 'Servidor doméstico',         color: '#2196F3', category: 'general',    svg: SVGS.homeserver },
  BACKUP:      { id: 'backup',      name: 'Backup',        description: 'Servidor de respaldo',       color: '#795548', category: 'general',    svg: SVGS.backup },
  MONITORING:  { id: 'monitoring',  name: 'Monitoreo',     description: 'Sistema de monitoreo',       color: '#00BCD4', category: 'general',    svg: SVGS.monitoring },
  GATEWAY:     { id: 'gateway',     name: 'Gateway',       description: 'Puerta de enlace',           color: '#3F51B5', category: 'general',    svg: SVGS.gateway },
  BASTION:     { id: 'bastion',     name: 'Bastión',       description: 'Servidor bastión/jump',      color: '#E91E63', category: 'general',    svg: SVGS.bastion },

  // Sistemas Operativos
  LINUX:   { id: 'linux',   name: 'Linux',          description: 'Servidor Linux genérico', color: '#FFC107', category: 'os', svg: SVGS.linux },
  UBUNTU:  { id: 'ubuntu',  name: 'Ubuntu',         description: 'Ubuntu Server',           color: '#E95420', category: 'os', svg: SVGS.ubuntu },
  DEBIAN:  { id: 'debian',  name: 'Debian',         description: 'Debian Server',           color: '#A80030', category: 'os', svg: SVGS.debian },
  CENTOS:  { id: 'centos',  name: 'CentOS/RHEL',    description: 'CentOS/Red Hat',          color: '#932279', category: 'os', svg: SVGS.centos },
  FEDORA:  { id: 'fedora',  name: 'Fedora',         description: 'Fedora Server',           color: '#294172', category: 'os', svg: SVGS.fedora },
  ARCH:    { id: 'arch',    name: 'Arch Linux',     description: 'Arch Linux',              color: '#1793D1', category: 'os', svg: SVGS.arch },
  SUSE:    { id: 'suse',    name: 'SUSE/openSUSE',  description: 'SUSE Linux',              color: '#73BA25', category: 'os', svg: SVGS.suse },
  ALPINE:  { id: 'alpine',  name: 'Alpine',         description: 'Alpine Linux',            color: '#0D597F', category: 'os', svg: SVGS.alpine },
  WINDOWS: { id: 'windows', name: 'Windows Server', description: 'Windows Server',          color: '#0078D4', category: 'os', svg: SVGS.windows },
  MACOS:   { id: 'macos',   name: 'macOS',          description: 'macOS Server',            color: '#555555', category: 'os', svg: SVGS.macos },
  BSD:     { id: 'bsd',     name: 'FreeBSD',        description: 'FreeBSD/OpenBSD',         color: '#AB2B28', category: 'os', svg: SVGS.bsd },
  ROCKY:   { id: 'rocky',   name: 'Rocky Linux',    description: 'Rocky Linux',             color: '#10B981', category: 'os', svg: SVGS.rocky },

  // Cloud / Hosting
  AWS:          { id: 'aws',          name: 'AWS',          description: 'Amazon Web Services',    color: '#FF9900', category: 'cloud', svg: SVGS.aws },
  AZURE:        { id: 'azure',        name: 'Azure',        description: 'Microsoft Azure',        color: '#0078D4', category: 'cloud', svg: SVGS.azure },
  GCP:          { id: 'gcp',          name: 'Google Cloud', description: 'Google Cloud Platform',  color: '#4285F4', category: 'cloud', svg: SVGS.gcp },
  DIGITALOCEAN: { id: 'digitalocean', name: 'DigitalOcean', description: 'DigitalOcean Droplet',   color: '#0080FF', category: 'cloud', svg: SVGS.digitalocean },
  LINODE:       { id: 'linode',       name: 'Linode',       description: 'Linode/Akamai',          color: '#00A95C', category: 'cloud', svg: SVGS.linode },
  VULTR:        { id: 'vultr',        name: 'Vultr',        description: 'Vultr VPS',              color: '#007BFC', category: 'cloud', svg: SVGS.vultr },
  OVH:          { id: 'ovh',          name: 'OVH',          description: 'OVHcloud',               color: '#123F6D', category: 'cloud', svg: SVGS.ovh },
  HETZNER:      { id: 'hetzner',      name: 'Hetzner',      description: 'Hetzner Cloud',          color: '#D50C2D', category: 'cloud', svg: SVGS.hetzner },
  ORACLE:       { id: 'oracle',       name: 'Oracle Cloud', description: 'Oracle Cloud',           color: '#F80000', category: 'cloud', svg: SVGS.oracle },
  IBM:          { id: 'ibm',          name: 'IBM Cloud',    description: 'IBM Cloud',              color: '#1F70C1', category: 'cloud', svg: SVGS.ibm },
  CLOUDFLARE:   { id: 'cloudflare',   name: 'Cloudflare',   description: 'Cloudflare CDN/Tunnel',  color: '#F48120', category: 'cloud', svg: SVGS.cloudflare },

  // Contenedores y Virtualización
  DOCKER:     { id: 'docker',     name: 'Docker',       description: 'Docker Host',          color: '#2496ED', category: 'containers', svg: SVGS.docker },
  KUBERNETES: { id: 'kubernetes', name: 'Kubernetes',   description: 'K8s Node',             color: '#326CE5', category: 'containers', svg: SVGS.kubernetes },
  PODMAN:     { id: 'podman',     name: 'Podman',       description: 'Podman Host',          color: '#892CA0', category: 'containers', svg: SVGS.podman },
  LXC:        { id: 'lxc',        name: 'LXC/LXD',     description: 'Linux Containers',     color: '#333333', category: 'containers', svg: SVGS.lxc },
  PROXMOX:    { id: 'proxmox',    name: 'Proxmox',      description: 'Proxmox VE',           color: '#E57000', category: 'containers', svg: SVGS.proxmox },
  VMWARE:     { id: 'vmware',     name: 'VMware',       description: 'VMware ESXi/vSphere',  color: '#607078', category: 'containers', svg: SVGS.vmware },
  HYPERV:     { id: 'hyperv',     name: 'Hyper-V',      description: 'Microsoft Hyper-V',    color: '#00BCF2', category: 'containers', svg: SVGS.hyperv },
  KVM:        { id: 'kvm',        name: 'KVM/QEMU',     description: 'KVM Hypervisor',       color: '#FF6600', category: 'containers', svg: SVGS.kvm },

  // Bases de Datos
  MYSQL:         { id: 'mysql',         name: 'MySQL',         description: 'MySQL Server',             color: '#4479A1', category: 'databases', svg: SVGS.mysql },
  MARIADB:       { id: 'mariadb',       name: 'MariaDB',       description: 'MariaDB Server',           color: '#C49A3C', category: 'databases', svg: SVGS.mariadb },
  POSTGRESQL:    { id: 'postgresql',    name: 'PostgreSQL',    description: 'PostgreSQL Server',        color: '#336791', category: 'databases', svg: SVGS.postgresql },
  MONGODB:       { id: 'mongodb',       name: 'MongoDB',       description: 'MongoDB Server',           color: '#47A248', category: 'databases', svg: SVGS.mongodb },
  REDIS:         { id: 'redis',         name: 'Redis',         description: 'Redis Server',             color: '#DC382D', category: 'databases', svg: SVGS.redis },
  ELASTICSEARCH: { id: 'elasticsearch', name: 'Elasticsearch', description: 'Elasticsearch Node',       color: '#005571', category: 'databases', svg: SVGS.elasticsearch },
  CASSANDRA:     { id: 'cassandra',     name: 'Cassandra',     description: 'Apache Cassandra',         color: '#1287B1', category: 'databases', svg: SVGS.cassandra },
  MSSQL:         { id: 'mssql',         name: 'SQL Server',    description: 'Microsoft SQL Server',     color: '#CC2927', category: 'databases', svg: SVGS.mssql },
  ORACLE_DB:     { id: 'oracle_db',     name: 'Oracle DB',     description: 'Oracle Database',          color: '#F80000', category: 'databases', svg: SVGS.oracle_db },
  INFLUXDB:      { id: 'influxdb',      name: 'InfluxDB',      description: 'Time-Series Database',     color: '#22ADF6', category: 'databases', svg: SVGS.influxdb },
  CLICKHOUSE:    { id: 'clickhouse',    name: 'ClickHouse',    description: 'OLAP Database',            color: '#FFCC01', category: 'databases', svg: SVGS.clickhouse },
  NEO4J:         { id: 'neo4j',         name: 'Neo4j',         description: 'Graph Database',           color: '#008CC1', category: 'databases', svg: SVGS.neo4j },

  // Servicios Web y Red
  NGINX:     { id: 'nginx',     name: 'Nginx',       description: 'Nginx Web Server',    color: '#009639', category: 'services', svg: SVGS.nginx },
  APACHE:    { id: 'apache',    name: 'Apache',      description: 'Apache HTTP Server',  color: '#D22128', category: 'services', svg: SVGS.apache },
  HAPROXY:   { id: 'haproxy',   name: 'HAProxy',     description: 'Load Balancer',       color: '#106DA4', category: 'services', svg: SVGS.haproxy },
  TRAEFIK:   { id: 'traefik',   name: 'Traefik',     description: 'Traefik Proxy',       color: '#24A1C1', category: 'services', svg: SVGS.traefik },
  API:       { id: 'api',       name: 'API Server',  description: 'Servidor de APIs',    color: '#6C5CE7', category: 'services', svg: SVGS.api },
  MAIL:      { id: 'mail',      name: 'Mail Server', description: 'Servidor de correo',  color: '#EA4335', category: 'services', svg: SVGS.mail },
  DNS:       { id: 'dns',       name: 'DNS Server',  description: 'Servidor DNS',        color: '#34A853', category: 'services', svg: SVGS.dns },
  FTP:       { id: 'ftp',       name: 'FTP Server',  description: 'Servidor FTP/SFTP',   color: '#FF6B35', category: 'services', svg: SVGS.ftp },
  VPN:       { id: 'vpn',       name: 'VPN Server',  description: 'Servidor VPN',        color: '#5C6BC0', category: 'services', svg: SVGS.vpn },
  FIREWALL:  { id: 'firewall',  name: 'Firewall',    description: 'Firewall/Security',   color: '#F44336', category: 'services', svg: SVGS.firewall },

  // DevOps / CI-CD
  JENKINS:   { id: 'jenkins',   name: 'Jenkins',    description: 'Jenkins CI/CD',          color: '#D24939', category: 'devops', svg: SVGS.jenkins },
  GITLAB:    { id: 'gitlab',    name: 'GitLab',     description: 'GitLab Server',           color: '#FC6D26', category: 'devops', svg: SVGS.gitlab },
  GITHUB:    { id: 'github',    name: 'GitHub',     description: 'GitHub Actions Runner',   color: '#181717', category: 'devops', svg: SVGS.github },
  ANSIBLE:   { id: 'ansible',   name: 'Ansible',    description: 'Ansible Control Node',    color: '#EE0000', category: 'devops', svg: SVGS.ansible },
  TERRAFORM: { id: 'terraform', name: 'Terraform',  description: 'Terraform/IaC',           color: '#7B42BC', category: 'devops', svg: SVGS.terraform },
  PROMETHEUS:{ id: 'prometheus',name: 'Prometheus', description: 'Prometheus Monitoring',   color: '#E6522C', category: 'devops', svg: SVGS.prometheus },
  GRAFANA:   { id: 'grafana',   name: 'Grafana',    description: 'Grafana Dashboards',      color: '#F46800', category: 'devops', svg: SVGS.grafana },
  SONARQUBE: { id: 'sonarqube', name: 'SonarQube',  description: 'Code Quality',            color: '#4E9BCD', category: 'devops', svg: SVGS.sonarqube },
  NEXUS:     { id: 'nexus',     name: 'Nexus',      description: 'Artifact Repository',     color: '#1B8653', category: 'devops', svg: SVGS.nexus },
  HARBOR:    { id: 'harbor',    name: 'Harbor',     description: 'Container Registry',      color: '#60B932', category: 'devops', svg: SVGS.harbor },
  VAULT:     { id: 'vault',     name: 'Vault',      description: 'HashiCorp Vault',          color: '#FFCA28', category: 'devops', svg: SVGS.vault },
  CONSUL:    { id: 'consul',    name: 'Consul',     description: 'HashiCorp Consul',         color: '#E03875', category: 'devops', svg: SVGS.consul },
  ARGOCD:    { id: 'argocd',    name: 'ArgoCD',     description: 'Argo CD GitOps',           color: '#EF7B4D', category: 'devops', svg: SVGS.argocd },

  // Red / Dispositivos de Red
  ROUTER:      { id: 'router',      name: 'Router',         description: 'Router con antenas',       color: '#455A64', category: 'network', svg: SVGS.router },
  SWITCH_HW:   { id: 'switch_hw',   name: 'Switch',         description: 'Switch de red',            color: '#37474F', category: 'network', svg: SVGS.switch_hw },
  ACCESS_POINT:{ id: 'access_point',name: 'Access Point',   description: 'Punto de acceso WiFi',     color: '#00BCD4', category: 'network', svg: SVGS.access_point },
  CISCO:       { id: 'cisco',       name: 'Cisco',          description: 'Dispositivo Cisco',        color: '#1BA0D7', category: 'network', svg: SVGS.cisco },
  JUNIPER:     { id: 'juniper',     name: 'Juniper',        description: 'Juniper Networks',         color: '#84BC54', category: 'network', svg: SVGS.juniper },
  MIKROTIK:    { id: 'mikrotik',    name: 'MikroTik',       description: 'MikroTik RouterOS',        color: '#CC0000', category: 'network', svg: SVGS.mikrotik },
  UBIQUITI:    { id: 'ubiquiti',    name: 'Ubiquiti/UniFi', description: 'UniFi / Ubiquiti',         color: '#0559C9', category: 'network', svg: SVGS.ubiquiti },
  PFSENSE:     { id: 'pfsense',     name: 'pfSense',        description: 'pfSense Firewall',         color: '#212121', category: 'network', svg: SVGS.pfsense },
  OPNSENSE:    { id: 'opnsense',    name: 'OPNsense',       description: 'OPNsense Firewall',        color: '#D94F00', category: 'network', svg: SVGS.opnsense },
  FORTINET:    { id: 'fortinet',    name: 'FortiGate',      description: 'Fortinet FortiGate',       color: '#EE3124', category: 'network', svg: SVGS.fortinet },
  IDS:         { id: 'ids',         name: 'IDS/IPS',        description: 'Detección de intrusos',    color: '#7B1FA2', category: 'network', svg: SVGS.ids },
  VLAN:        { id: 'vlan',        name: 'VLAN',           description: 'Red VLAN segmentada',      color: '#0288D1', category: 'network', svg: SVGS.vlan },

  // IoT / Embebidos
  RASPBERRYPI: { id: 'raspberrypi', name: 'Raspberry Pi',  description: 'Raspberry Pi SBC',         color: '#C51A4A', category: 'iot', svg: SVGS.raspberrypi },
  ARDUINO:     { id: 'arduino',     name: 'Arduino',        description: 'Arduino Board',            color: '#00979D', category: 'iot', svg: SVGS.arduino },
  ESP32:       { id: 'esp32',       name: 'ESP32',          description: 'ESP32 / ESP8266',          color: '#E7352C', category: 'iot', svg: SVGS.esp32 },
  ORANGEPI:    { id: 'orangepi',    name: 'Orange Pi',      description: 'Orange Pi SBC',            color: '#FA7A00', category: 'iot', svg: SVGS.orangepi },
  JETSON:      { id: 'jetson',      name: 'NVIDIA Jetson',  description: 'Jetson GPU Module',        color: '#76B900', category: 'iot', svg: SVGS.jetson },
  NODEMCU:     { id: 'nodemcu',     name: 'NodeMCU',        description: 'NodeMCU Dev Board',        color: '#3C99DC', category: 'iot', svg: SVGS.nodemcu },
  ROCK_PI:     { id: 'rock_pi',     name: 'Rock Pi',        description: 'Rock Pi / Radxa SBC',      color: '#FF6B35', category: 'iot', svg: SVGS.rock_pi },
  BALENA:      { id: 'balena',      name: 'balenaOS',       description: 'balenaOS IoT Fleet',       color: '#00B5FF', category: 'iot', svg: SVGS.balena },

  // NAS / Storage
  SYNOLOGY:  { id: 'synology',  name: 'Synology',     description: 'Synology NAS',             color: '#B5A642', category: 'storage', svg: SVGS.synology },
  QNAP:      { id: 'qnap',      name: 'QNAP',         description: 'QNAP NAS',                 color: '#00AEEF', category: 'storage', svg: SVGS.qnap },
  TRUENAS:   { id: 'truenas',   name: 'TrueNAS',      description: 'TrueNAS / FreeNAS',        color: '#0095D5', category: 'storage', svg: SVGS.truenas },
  UNRAID:    { id: 'unraid',    name: 'Unraid',       description: 'Unraid Server',            color: '#FF4C00', category: 'storage', svg: SVGS.unraid },
  CEPH:      { id: 'ceph',      name: 'Ceph',         description: 'Ceph Distributed Storage', color: '#EF5C55', category: 'storage', svg: SVGS.ceph },
  MINIO:     { id: 'minio',     name: 'MinIO',        description: 'MinIO Object Storage',     color: '#C72E49', category: 'storage', svg: SVGS.minio },
  GLUSTERFS: { id: 'glusterfs', name: 'GlusterFS',    description: 'GlusterFS Cluster',        color: '#CE3B2F', category: 'storage', svg: SVGS.glusterfs },
  LONGHORN:  { id: 'longhorn',  name: 'Longhorn',     description: 'Rancher Longhorn (K8s)',   color: '#5F8DC3', category: 'storage', svg: SVGS.longhorn },
};

// ── Categorías ─────────────────────────────────────────────────────────────────

export const SSHIconCategories = {
  general: {
    id: 'general',
    name: 'General',
    icon: '🖥️',
    description: 'Servidores de propósito general'
  },
  os: {
    id: 'os',
    name: 'Sistemas Operativos',
    icon: '🐧',
    description: 'Sistemas operativos específicos'
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud/Hosting',
    icon: '☁️',
    description: 'Proveedores de cloud y hosting'
  },
  containers: {
    id: 'containers',
    name: 'Contenedores',
    icon: '🐳',
    description: 'Contenedores y virtualización'
  },
  databases: {
    id: 'databases',
    name: 'Bases de Datos',
    icon: '🗄️',
    description: 'Servidores de bases de datos'
  },
  services: {
    id: 'services',
    name: 'Servicios',
    icon: '🌐',
    description: 'Servicios web y red'
  },
  devops: {
    id: 'devops',
    name: 'DevOps',
    icon: '⚙️',
    description: 'Herramientas CI/CD y DevOps'
  },
  network: {
    id: 'network',
    name: 'Dispositivos de Red',
    icon: '🔌',
    description: 'Routers, switches y hardware de red'
  },
  iot: {
    id: 'iot',
    name: 'IoT / Embebidos',
    icon: '🤖',
    description: 'Raspberry Pi, Arduino y dispositivos IoT'
  },
  storage: {
    id: 'storage',
    name: 'NAS / Storage',
    icon: '💾',
    description: 'NAS, almacenamiento distribuido y SAN'
  }
};

// ── Renderer ───────────────────────────────────────────────────────────────────

export const SSHIconRenderer = ({ preset, size = 'medium', pixelSize = null }) => {
  if (!preset) return null;

  const sizeMap = { small: 20, medium: 36, large: 56 };
  const px = (pixelSize && typeof pixelSize === 'number') ? pixelSize : (sizeMap[size] ?? 36);

  if (!preset.svg) {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: preset.color, flexShrink: 0 }}
      >
        <rect x="2" y="3" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
        <path d="M6 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="11" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: preset.color, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: preset.svg }}
    />
  );
};

// ── Modal selector ─────────────────────────────────────────────────────────────

export const SSHIconSelectorModal = ({ visible, onHide, selectedIconId, onSelectIcon, theme }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);

  const getInitialCategory = useCallback(() => {
    if (!selectedIconId || selectedIconId === 'default') return 'general';
    const preset = SSHIconPresets[Object.keys(SSHIconPresets).find(key =>
      SSHIconPresets[key].id === selectedIconId
    )];
    return preset?.category || 'general';
  }, [selectedIconId]);

  const [activeCategory, setActiveCategory] = useState(getInitialCategory);

  useEffect(() => {
    if (visible) setActiveCategory(getInitialCategory());
  }, [visible, getInitialCategory]);

  useEffect(() => {
    const onThemeChanged = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  const currentTheme = useMemo(() => {
    return theme || themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [theme, themeVersion]);

  const themeColors = useMemo(() => ({
    dialogBg:      currentTheme.colors?.dialogBackground      || 'rgba(16, 20, 28, 0.95)',
    dialogText:    currentTheme.colors?.dialogText             || '#ffffff',
    buttonPrimary: currentTheme.colors?.buttonPrimary          || '#FF9800',
    buttonHover:   currentTheme.colors?.buttonHoverBackground  || 'rgba(255, 152, 0, 0.2)',
    border:        currentTheme.colors?.contentBorder          || 'rgba(255, 255, 255, 0.1)',
    cardBg:        currentTheme.colors?.contentBackground      || 'rgba(255, 255, 255, 0.05)'
  }), [currentTheme]);

  const presets = useMemo(() =>
    Object.values(SSHIconPresets).filter(p => p.category === activeCategory),
  [activeCategory]);

  const categories = useMemo(() => Object.values(SSHIconCategories), []);

  const handleSelectIcon = useCallback((iconId) => {
    onSelectIcon(iconId);
    onHide();
  }, [onSelectIcon, onHide]);

  if (!visible) return null;

  return (
    <div
      onClick={onHide}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: themeColors.dialogBg,
          color: themeColors.dialogText,
          borderRadius: '16px',
          border: `1px solid ${themeColors.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          width: '880px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-server" style={{ fontSize: '1.5rem', color: themeColors.buttonPrimary }}/>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Selecciona el icono de la conexión SSH</span>
          <button
            onClick={onHide}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: themeColors.dialogText, fontSize: '1.5rem', cursor: 'pointer', padding: 0, width: '32px', height: '32px' }}
          >✕</button>
        </div>

        {/* Pestañas de categorías */}
        <div style={{
          display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${themeColors.border}`
        }}>
          {categories.map(category => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: isActive ? themeColors.buttonPrimary : 'transparent',
                  border: `1px solid ${isActive ? themeColors.buttonPrimary : themeColors.border}`,
                  borderRadius: '8px', cursor: 'pointer',
                  color: isActive ? '#ffffff' : themeColors.dialogText,
                  fontSize: '0.83rem', fontWeight: isActive ? '600' : '500',
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease', pointerEvents: 'auto'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = themeColors.buttonHover; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontSize: '1rem' }}>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Grid de iconos */}
        <div style={{ padding: '1.5rem', pointerEvents: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
            gap: '0.8rem',
            pointerEvents: 'auto'
          }}>
            {presets.map(preset => {
              const isSelected = selectedIconId === preset.id;
              const isHovered  = hoveredId === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={e => { e.stopPropagation(); e.preventDefault(); handleSelectIcon(preset.id); }}
                  onMouseEnter={() => setHoveredId(preset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  type="button"
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-start',
                    padding: '1rem 0.5rem 0.75rem',
                    background: isSelected
                      ? `linear-gradient(135deg, ${themeColors.buttonPrimary}33, ${themeColors.buttonPrimary}11)`
                      : isHovered ? themeColors.buttonHover : themeColors.cardBg,
                    border: isSelected
                      ? `2px solid ${themeColors.buttonPrimary}`
                      : `1px solid ${themeColors.border}`,
                    borderRadius: '12px', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative', minHeight: '130px', gap: '0.45rem',
                    fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: '600',
                    color: themeColors.dialogText, pointerEvents: 'auto', zIndex: 10
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <SSHIconRenderer preset={preset} pixelSize={52} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: themeColors.dialogText, textAlign: 'center', width: '100%', pointerEvents: 'none', lineHeight: '1.2' }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', width: '100%', pointerEvents: 'none', lineHeight: '1.2' }}>
                    {preset.description}
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '0.4rem', right: '0.4rem',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: themeColors.buttonPrimary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.7rem', fontWeight: 'bold', pointerEvents: 'none'
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '1rem 1.5rem',
          borderTop: `1px solid ${themeColors.border}`,
          gap: '0.75rem'
        }}>
          <button
            onClick={() => handleSelectIcon(null)}
            style={{
              padding: '0.7rem 1.4rem', backgroundColor: 'transparent',
              border: `1px solid ${themeColors.border}`,
              color: themeColors.dialogText, borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600'
            }}
          >
            Usar icono del tema
          </button>
          <button
            onClick={onHide}
            style={{
              padding: '0.7rem 1.4rem', backgroundColor: 'transparent',
              border: `1px solid ${themeColors.border}`,
              color: themeColors.dialogText, borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
