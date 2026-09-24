import React from 'react';

const RailIcon = ({ children }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const AuroraDefs = ({ id, from, to }) => (
  <defs>
    <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={from} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
    <linearGradient id={`${id}-soft`} x1="20%" y1="0%" x2="90%" y2="110%">
      <stop offset="0%" stopColor={from} stopOpacity="0.30" />
      <stop offset="100%" stopColor={to} stopOpacity="0.08" />
    </linearGradient>
  </defs>
);

const QuartzDefs = ({ id }) => (
  <defs>
    <linearGradient id={`${id}-glass`} x1="15%" y1="0%" x2="90%" y2="110%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
      <stop offset="55%" stopColor="rgba(255,255,255,0.10)" />
      <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
    </linearGradient>
    <linearGradient id={`${id}-spec`} x1="0%" y1="0%" x2="60%" y2="55%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
    </linearGradient>
  </defs>
);

const AURORA = {
  connections: ['#818cf8', '#6366f1'],
  passwords: ['#fcd34d', '#f59e0b'],
  documents: ['#7dd3fc', '#38bdf8'],
  favorites: ['#fbbf24', '#f472b6'],
  tools: ['#2dd4bf', '#22d3ee']
};

const studioStroke = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const lucideStroke = {
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const carbonStroke = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter'
};

const geistStroke = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter'
};

export const premiumRailIcons = {
  studio: {
    connections: (
      <RailIcon>
        <rect x="3.8" y="3.6" width="16.4" height="4.6" rx="1.4" fill="currentColor" opacity="0.1" />
        <rect x="3.8" y="9.7" width="16.4" height="4.6" rx="1.4" fill="currentColor" opacity="0.1" />
        <rect x="3.8" y="15.8" width="16.4" height="4.6" rx="1.4" fill="currentColor" opacity="0.1" />
        <rect x="3.8" y="3.6" width="16.4" height="4.6" rx="1.4" {...studioStroke} />
        <rect x="3.8" y="9.7" width="16.4" height="4.6" rx="1.4" {...studioStroke} />
        <rect x="3.8" y="15.8" width="16.4" height="4.6" rx="1.4" {...studioStroke} />
        <circle cx="6.8" cy="5.9" r="0.85" fill="currentColor" />
        <circle cx="6.8" cy="12" r="0.85" fill="currentColor" />
        <circle cx="6.8" cy="18.1" r="0.85" fill="currentColor" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path d="M12 3.2L5.2 5.8v5.6c0 4.7 3 8.4 6.8 9.6 3.8-1.2 6.8-4.9 6.8-9.6V5.8L12 3.2z" fill="currentColor" opacity="0.1" />
        <path d="M12 3.2L5.2 5.8v5.6c0 4.7 3 8.4 6.8 9.6 3.8-1.2 6.8-4.9 6.8-9.6V5.8L12 3.2z" {...studioStroke} />
        <path d="M12 8.4v5.2" {...studioStroke} />
        <circle cx="12" cy="15.6" r="1.05" fill="currentColor" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path d="M14 3.4H7.4A1.6 1.6 0 0 0 5.8 5v14a1.6 1.6 0 0 0 1.6 1.6h9.2A1.6 1.6 0 0 0 18.2 19V8.2L14 3.4z" fill="currentColor" opacity="0.1" />
        <path d="M14 3.4H7.4A1.6 1.6 0 0 0 5.8 5v14a1.6 1.6 0 0 0 1.6 1.6h9.2A1.6 1.6 0 0 0 18.2 19V8.2L14 3.4z" {...studioStroke} />
        <path d="M14 3.4V8h4.2" {...studioStroke} />
        <path d="M8.6 12.2h6.8M8.6 15.6h4.8" {...studioStroke} />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path d="M12 3.4l2.4 5.2 5.6.8-4.1 3.9.9 5.7L12 16.4 7.2 19l.9-5.7-4.1-3.9 5.6-.8L12 3.4z" fill="currentColor" opacity="0.1" />
        <path d="M12 3.4l2.4 5.2 5.6.8-4.1 3.9.9 5.7L12 16.4 7.2 19l.9-5.7-4.1-3.9 5.6-.8L12 3.4z" {...studioStroke} />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path d="M14.6 6.4a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l3.3-3.3a5.4 5.4 0 0 1-7.2 7.2l-6.4 6.4a1.9 1.9 0 0 1-2.7-2.7l6.4-6.4a5.4 5.4 0 0 1 7.2-7.2L14.6 6.4z" fill="currentColor" opacity="0.1" />
        <path d="M14.6 6.4a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l3.3-3.3a5.4 5.4 0 0 1-7.2 7.2l-6.4 6.4a1.9 1.9 0 0 1-2.7-2.7l6.4-6.4a5.4 5.4 0 0 1 7.2-7.2L14.6 6.4z" {...studioStroke} />
      </RailIcon>
    )
  },

  lucide: {
    connections: (
      <RailIcon>
        <rect x="4.2" y="3.8" width="15.6" height="4.2" rx="1.4" {...lucideStroke} />
        <rect x="4.2" y="9.9" width="15.6" height="4.2" rx="1.4" {...lucideStroke} />
        <rect x="4.2" y="16" width="15.6" height="4.2" rx="1.4" {...lucideStroke} />
        <circle cx="7" cy="5.9" r="0.7" fill="currentColor" />
        <circle cx="7" cy="12" r="0.7" fill="currentColor" />
        <circle cx="7" cy="18.1" r="0.7" fill="currentColor" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path d="M12 3.4L5.4 6v5.4c0 4.6 2.9 8.2 6.6 9.4 3.7-1.2 6.6-4.8 6.6-9.4V6L12 3.4z" {...lucideStroke} />
        <path d="M12 8.6v5" {...lucideStroke} />
        <circle cx="12" cy="15.6" r="1" fill="currentColor" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path d="M14.2 3.6H7.6A1.6 1.6 0 0 0 6 5.2v13.6A1.6 1.6 0 0 0 7.6 20.4h8.8a1.6 1.6 0 0 0 1.6-1.6V8.2L14.2 3.6z" {...lucideStroke} />
        <path d="M14.2 3.6V8h4.2" {...lucideStroke} />
        <path d="M8.8 12.2h6.4M8.8 15.6h4.4" {...lucideStroke} />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path d="M12 3.6l2.3 5 5.5.8-4 3.8.9 5.5L12 16.2 7.3 18.7l.9-5.5-4-3.8 5.5-.8L12 3.6z" {...lucideStroke} />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path d="M14.6 6.6a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l3.2-3.2a5.2 5.2 0 0 1-7 7l-6.3 6.3a1.85 1.85 0 0 1-2.6-2.6l6.3-6.3a5.2 5.2 0 0 1 7-7L14.6 6.6z" {...lucideStroke} />
      </RailIcon>
    )
  },

  aurora: {
    connections: (
      <RailIcon>
        <AuroraDefs id="rail-aurora-conn" from={AURORA.connections[0]} to={AURORA.connections[1]} />
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#rail-aurora-conn-soft)" />
        <rect x="6.2" y="6.4" width="11.6" height="2.8" rx="1" stroke="url(#rail-aurora-conn-g)" strokeWidth="1.45" />
        <rect x="6.2" y="10.6" width="11.6" height="2.8" rx="1" stroke="url(#rail-aurora-conn-g)" strokeWidth="1.45" />
        <rect x="6.2" y="14.8" width="11.6" height="2.8" rx="1" stroke="url(#rail-aurora-conn-g)" strokeWidth="1.45" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <AuroraDefs id="rail-aurora-pass" from={AURORA.passwords[0]} to={AURORA.passwords[1]} />
        <circle cx="12" cy="12" r="10" fill="url(#rail-aurora-pass-soft)" />
        <path d="M12 5.2L6.6 7.2v4.8c0 4 2.5 7.1 5.4 8.2 2.9-1.1 5.4-4.2 5.4-8.2V7.2L12 5.2z" stroke="url(#rail-aurora-pass-g)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9.4v4.2" stroke="url(#rail-aurora-pass-g)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="15.2" r="0.9" fill="url(#rail-aurora-pass-g)" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <AuroraDefs id="rail-aurora-doc" from={AURORA.documents[0]} to={AURORA.documents[1]} />
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#rail-aurora-doc-soft)" />
        <path d="M13.8 6.4H8.6A1 1 0 0 0 7.6 7.4v9.2A1 1 0 0 0 8.6 17.6h6.8a1 1 0 0 0 1-1V8.8L13.8 6.4z" stroke="url(#rail-aurora-doc-g)" strokeWidth="1.45" strokeLinejoin="round" />
        <path d="M13.8 6.4V8.8h2.6" stroke="url(#rail-aurora-doc-g)" strokeWidth="1.45" strokeLinejoin="round" />
        <path d="M9.4 11.6h5.2M9.4 14.2h3.6" stroke="url(#rail-aurora-doc-g)" strokeWidth="1.35" strokeLinecap="round" />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <AuroraDefs id="rail-aurora-fav" from={AURORA.favorites[0]} to={AURORA.favorites[1]} />
        <circle cx="12" cy="12" r="10" fill="url(#rail-aurora-fav-soft)" />
        <path d="M12 6.2l1.8 4 4.3.6-3.1 3 .7 4.3L12 16.2 8.3 18.1l.7-4.3-3.1-3 4.3-.6L12 6.2z" stroke="url(#rail-aurora-fav-g)" strokeWidth="1.5" strokeLinejoin="round" />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <AuroraDefs id="rail-aurora-tools" from={AURORA.tools[0]} to={AURORA.tools[1]} />
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#rail-aurora-tools-soft)" />
        <path d="M14.2 8.2a.8.8 0 0 0 0 1.1l1.1 1.1a.8.8 0 0 0 1.1 0l2.2-2.2a4.2 4.2 0 0 1-5.5 5.5l-5.1 5.1a1.5 1.5 0 0 1-2.1-2.1l5.1-5.1a4.2 4.2 0 0 1 5.5-5.5l-2.3 2.1z" stroke="url(#rail-aurora-tools-g)" strokeWidth="1.45" strokeLinejoin="round" />
      </RailIcon>
    )
  },

  noir: {
    connections: (
      <RailIcon>
        <rect x="3.4" y="3.2" width="17.2" height="4.8" rx="1.4" fill="currentColor" />
        <rect x="3.4" y="9.6" width="17.2" height="4.8" rx="1.4" fill="currentColor" />
        <rect x="3.4" y="16" width="17.2" height="4.8" rx="1.4" fill="currentColor" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M12 2.6L4.4 5.5v5.8c0 5.2 3.4 9.4 7.6 10.7 4.2-1.3 7.6-5.5 7.6-10.7V5.5L12 2.6zm0 5.8a1 1 0 0 1 1 1v3.8a1 1 0 1 1-2 0V9.4a1 1 0 0 1 1-1zm0 7.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"
        />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M7.2 2.6A2 2 0 0 0 5.2 4.6v14.8A2 2 0 0 0 7.2 21.4h9.6a2 2 0 0 0 2-2V8.2L13.6 2.6H7.2zm6.2 1.6L17 8h-2.8a.8.8 0 0 1-.8-.8V4.2zM8.4 12.2h7.2a.9.9 0 1 1 0 1.8H8.4a.9.9 0 1 1 0-1.8zm0 3.4h5.2a.9.9 0 1 1 0 1.8H8.4a.9.9 0 1 1 0-1.8z"
        />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path fill="currentColor" d="M12 2.8l2.7 5.8 6.3.9-4.6 4.4 1.1 6.4L12 17.2 6.5 20.3l1.1-6.4-4.6-4.4 6.3-.9L12 2.8z" />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path fill="currentColor" d="M14.8 5.8a1.15 1.15 0 0 1 1.62 0l1.7 1.7a1.15 1.15 0 0 1 0 1.62l-3.1 3.1a6.1 6.1 0 0 1-1.3 7.4l-6.6 6.6a2.2 2.2 0 0 1-3.1-3.1l6.6-6.6a6.1 6.1 0 0 1 7.4-1.3l3.1-3.1z" />
      </RailIcon>
    )
  },

  carbon: {
    connections: (
      <RailIcon>
        <rect x="3" y="3" width="18" height="5" {...carbonStroke} />
        <rect x="3" y="9.5" width="18" height="5" {...carbonStroke} />
        <rect x="3" y="16" width="18" height="5" {...carbonStroke} />
        <rect x="5.5" y="4.6" width="2" height="1.8" fill="currentColor" />
        <rect x="5.5" y="11.1" width="2" height="1.8" fill="currentColor" />
        <rect x="5.5" y="17.6" width="2" height="1.8" fill="currentColor" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path d="M12 3L5 6v6c0 5 3.2 8.8 7 10 3.8-1.2 7-5 7-10V6L12 3z" {...carbonStroke} />
        <path d="M12 8v5" {...carbonStroke} />
        <rect x="11" y="14.4" width="2" height="2" fill="currentColor" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path d="M7 3h7l5 5v13H7V3z" {...carbonStroke} />
        <path d="M14 3v5h5" {...carbonStroke} />
        <path d="M9 12h6M9 16h4" {...carbonStroke} />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path d="M12 3l2.6 5.6L21 9.6l-4.5 4.2 1.1 6.2L12 16.8 6.4 20l1.1-6.2L3 9.6l6.4-1L12 3z" {...carbonStroke} />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path d="M15 6l2 2 3.4-3.4A5.4 5.4 0 0 1 13.2 12.8l-6.6 6.6-3-3 6.6-6.6A5.4 5.4 0 0 1 18.4 2.6L15 6z" {...carbonStroke} />
      </RailIcon>
    )
  },

  quartz: {
    connections: (
      <RailIcon>
        <QuartzDefs id="rail-quartz-conn" />
        <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill="url(#rail-quartz-conn-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
        <ellipse cx="8" cy="7.2" rx="3.6" ry="1.9" fill="url(#rail-quartz-conn-spec)" />
        <rect x="6.4" y="6.6" width="11.2" height="2.6" rx="0.8" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
        <rect x="6.4" y="10.7" width="11.2" height="2.6" rx="0.8" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
        <rect x="6.4" y="14.8" width="11.2" height="2.6" rx="0.8" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <QuartzDefs id="rail-quartz-pass" />
        <circle cx="12" cy="12" r="9.4" fill="url(#rail-quartz-pass-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
        <ellipse cx="9.2" cy="8.6" rx="4.2" ry="2.3" fill="url(#rail-quartz-pass-spec)" />
        <path d="M12 5.4L6.8 7.4v4.6c0 3.8 2.4 6.8 5.2 7.8 2.8-1 5.2-4 5.2-7.8V7.4L12 5.4z" stroke="rgba(255,255,255,0.92)" strokeWidth="1.35" strokeLinejoin="round" />
        <path d="M12 9.4v3.8" stroke="rgba(255,255,255,0.92)" strokeWidth="1.35" strokeLinecap="round" />
        <circle cx="12" cy="14.8" r="0.85" fill="rgba(255,255,255,0.92)" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <QuartzDefs id="rail-quartz-doc" />
        <rect x="4.2" y="3.4" width="15.6" height="17.2" rx="4.2" fill="url(#rail-quartz-doc-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
        <ellipse cx="8.4" cy="7" rx="4" ry="2.1" fill="url(#rail-quartz-doc-spec)" />
        <path d="M13.8 7.2H8.8A1 1 0 0 0 7.8 8.2v8.2A1 1 0 0 0 8.8 17.4h6.4a1 1 0 0 0 1-1V9.4L13.8 7.2z" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M13.8 7.2V9.4h2.4" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" />
        <path d="M9.6 12h4.8M9.6 14.6h3.2" stroke="rgba(255,255,255,0.88)" strokeWidth="1.2" strokeLinecap="round" />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <QuartzDefs id="rail-quartz-fav" />
        <circle cx="12" cy="12" r="9.4" fill="url(#rail-quartz-fav-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
        <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#rail-quartz-fav-spec)" />
        <path d="M12 6.4l1.8 4 4.3.6-3.1 3 .7 4.3L12 16.4 8.3 18.3l.7-4.3-3.1-3 4.3-.6L12 6.4z" stroke="rgba(255,255,255,0.92)" strokeWidth="1.35" strokeLinejoin="round" />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <QuartzDefs id="rail-quartz-tools" />
        <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill="url(#rail-quartz-tools-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
        <ellipse cx="8" cy="7.2" rx="3.6" ry="1.9" fill="url(#rail-quartz-tools-spec)" />
        <path d="M14.1 8.4a.75.75 0 0 0 0 1.05l1 1a.75.75 0 0 0 1.05 0l2.1-2.1a4 4 0 0 1-5.2 5.2l-4.9 4.9a1.4 1.4 0 0 1-2-2l4.9-4.9a4 4 0 0 1 5.2-5.2L14.1 8.4z" stroke="rgba(255,255,255,0.92)" strokeWidth="1.25" strokeLinejoin="round" />
      </RailIcon>
    )
  },

  solar: {
    connections: (
      <RailIcon>
        <rect x="3.6" y="3.4" width="16.8" height="4.8" rx="1.4" fill="currentColor" opacity="0.22" />
        <rect x="3.6" y="9.6" width="16.8" height="4.8" rx="1.4" fill="currentColor" opacity="0.22" />
        <rect x="3.6" y="15.8" width="16.8" height="4.8" rx="1.4" fill="currentColor" opacity="0.22" />
        <rect x="3.6" y="3.4" width="16.8" height="4.8" rx="1.4" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <rect x="3.6" y="9.6" width="16.8" height="4.8" rx="1.4" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <rect x="3.6" y="15.8" width="16.8" height="4.8" rx="1.4" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <circle cx="6.8" cy="5.8" r="0.9" fill="currentColor" opacity="0.9" />
        <circle cx="6.8" cy="12" r="0.9" fill="currentColor" opacity="0.9" />
        <circle cx="6.8" cy="18.2" r="0.9" fill="currentColor" opacity="0.9" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path d="M12 3L5 5.8v5.8c0 4.8 3.1 8.6 7 9.8 3.9-1.2 7-5 7-9.8V5.8L12 3z" fill="currentColor" opacity="0.22" />
        <path d="M12 3L5 5.8v5.8c0 4.8 3.1 8.6 7 9.8 3.9-1.2 7-5 7-9.8V5.8L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
        <path d="M12 8.2v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        <circle cx="12" cy="15.6" r="1.1" fill="currentColor" opacity="0.9" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path d="M14 3.4H7.2A1.6 1.6 0 0 0 5.6 5v14a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V8L14 3.4z" fill="currentColor" opacity="0.22" />
        <path d="M14 3.4H7.2A1.6 1.6 0 0 0 5.6 5v14a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V8L14 3.4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
        <path d="M14 3.4V8h4.4" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <path d="M8.6 12.2h6.8M8.6 15.6h4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path d="M12 3.2l2.5 5.3 5.7.8-4.2 4 .9 5.8L12 16.2 7.1 19.1l.9-5.8-4.2-4 5.7-.8L12 3.2z" fill="currentColor" opacity="0.22" />
        <path d="M12 3.2l2.5 5.3 5.7.8-4.2 4 .9 5.8L12 16.2 7.1 19.1l.9-5.8-4.2-4 5.7-.8L12 3.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a5.5 5.5 0 0 1-7.4 7.4l-6.5 6.5a2 2 0 0 1-2.8-2.8l6.5-6.5a5.5 5.5 0 0 1 7.4-7.4L14.7 6.3z" fill="currentColor" opacity="0.22" />
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a5.5 5.5 0 0 1-7.4 7.4l-6.5 6.5a2 2 0 0 1-2.8-2.8l6.5-6.5a5.5 5.5 0 0 1 7.4-7.4L14.7 6.3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
      </RailIcon>
    )
  },

  geist: {
    connections: (
      <RailIcon>
        <rect x="3.6" y="3.6" width="16.8" height="4.4" rx="1" {...geistStroke} />
        <rect x="3.6" y="9.8" width="16.8" height="4.4" rx="1" {...geistStroke} />
        <rect x="3.6" y="16" width="16.8" height="4.4" rx="1" {...geistStroke} />
        <rect x="5.8" y="5" width="1.6" height="1.6" fill="currentColor" />
        <rect x="5.8" y="11.2" width="1.6" height="1.6" fill="currentColor" />
        <rect x="5.8" y="17.4" width="1.6" height="1.6" fill="currentColor" />
      </RailIcon>
    ),
    passwords: (
      <RailIcon>
        <path d="M12 3.2L5.2 6v5.8c0 4.8 3.1 8.4 6.8 9.6 3.7-1.2 6.8-4.8 6.8-9.6V6L12 3.2z" {...geistStroke} />
        <path d="M12 8.4v5" {...geistStroke} />
        <rect x="11.1" y="14.8" width="1.8" height="1.8" fill="currentColor" />
      </RailIcon>
    ),
    documents: (
      <RailIcon>
        <path d="M7.2 3.4h6.6L18.6 8.2V20.6H7.2V3.4z" {...geistStroke} />
        <path d="M13.8 3.4V8.2h4.8" {...geistStroke} />
        <path d="M9.2 12.2h5.8M9.2 15.6h4" {...geistStroke} />
      </RailIcon>
    ),
    favorites: (
      <RailIcon>
        <path d="M12 3.4l2.5 5.3 5.7.8-4.2 4 .9 5.8L12 16.4 7.1 19.3l.9-5.8-4.2-4 5.7-.8L12 3.4z" {...geistStroke} />
      </RailIcon>
    ),
    tools: (
      <RailIcon>
        <path d="M14.8 6.4l1.6 1.6 3.3-3.3A5.3 5.3 0 0 1 13.2 12.8l-6.4 6.4-2.8-2.8 6.4-6.4A5.3 5.3 0 0 1 18.1 3.1L14.8 6.4z" {...geistStroke} />
      </RailIcon>
    )
  }
};
