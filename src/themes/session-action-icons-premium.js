import React from 'react';

const ActionIcon = ({ children }) => (
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
  connection: ['#818cf8', '#6366f1'],
  document: ['#7dd3fc', '#38bdf8'],
  folder: ['#fbbf24', '#f472b6'],
  group: ['#2dd4bf', '#22d3ee'],
  password: ['#fcd34d', '#f59e0b'],
  chrome: ['#94a3b8', '#64748b']
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

export const premiumSessionActionIconThemes = {
  studio: {
    name: 'Studio',
    description: 'Trazo fino profesional estilo Linear y Raycast',
    icons: {
      newConnection: (
        <ActionIcon>
          <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.1" />
          <circle cx="12" cy="12" r="8" {...studioStroke} />
          <path d="M12 8.5v7M8.5 12h7" {...studioStroke} />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8.5L14 3.5z" fill="currentColor" opacity="0.1" />
          <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8.5L14 3.5z" {...studioStroke} />
          <path d="M14 3.5V8h4.5" {...studioStroke} />
          <path d="M12 12.2v5M9.5 14.7h5" {...studioStroke} />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path d="M3.5 8.2A1.7 1.7 0 0 1 5.2 6.5h4.1l1.7 1.7h7.8A1.7 1.7 0 0 1 20.5 9.9v8.4a1.7 1.7 0 0 1-1.7 1.7H5.2A1.7 1.7 0 0 1 3.5 18.3V8.2z" fill="currentColor" opacity="0.1" />
          <path d="M3.5 8.2A1.7 1.7 0 0 1 5.2 6.5h4.1l1.7 1.7h7.8A1.7 1.7 0 0 1 20.5 9.9v8.4a1.7 1.7 0 0 1-1.7 1.7H5.2A1.7 1.7 0 0 1 3.5 18.3V8.2z" {...studioStroke} />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="3.8" y="3.8" width="7.2" height="7.2" rx="1.6" fill="currentColor" opacity="0.1" />
          <rect x="13" y="3.8" width="7.2" height="7.2" rx="1.6" fill="currentColor" opacity="0.1" />
          <rect x="3.8" y="13" width="7.2" height="7.2" rx="1.6" fill="currentColor" opacity="0.1" />
          <rect x="13" y="13" width="7.2" height="7.2" rx="1.6" fill="currentColor" opacity="0.1" />
          <rect x="3.8" y="3.8" width="7.2" height="7.2" rx="1.6" {...studioStroke} />
          <rect x="13" y="3.8" width="7.2" height="7.2" rx="1.6" {...studioStroke} />
          <rect x="3.8" y="13" width="7.2" height="7.2" rx="1.6" {...studioStroke} />
          <rect x="13" y="13" width="7.2" height="7.2" rx="1.6" {...studioStroke} />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <circle cx="8.4" cy="12" r="4" fill="currentColor" opacity="0.1" />
          <circle cx="8.4" cy="12" r="4" {...studioStroke} />
          <circle cx="8.4" cy="12" r="1.3" fill="currentColor" opacity="0.35" />
          <path d="M12.2 12h6.4l-1.4 1.6M16.2 12v2.4" {...studioStroke} />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <path d="M14.5 6.5L8.8 12l5.7 5.5" {...studioStroke} />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <path d="M9.5 6.5L15.2 12 9.5 17.5" {...studioStroke} />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <path d="M5 8h14M5 12h14M5 16h14" {...studioStroke} />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path d="M7.5 10.2L12 14.6l4.5-4.4" {...studioStroke} />
          <path d="M7.5 6.4L12 10.8l4.5-4.4" {...studioStroke} opacity="0.45" />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path d="M7.5 13.8L12 9.4l4.5 4.4" {...studioStroke} />
          <path d="M7.5 17.6L12 13.2l4.5 4.4" {...studioStroke} opacity="0.45" />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <circle cx="12" cy="12" r="3.1" fill="currentColor" opacity="0.1" />
          <circle cx="12" cy="12" r="3.1" {...studioStroke} />
          <path d="M12 4.2v1.8M12 18v1.8M4.2 12h1.8M18 12h1.8M6.3 6.3l1.3 1.3M16.4 16.4l1.3 1.3M6.3 17.7l1.3-1.3M16.4 7.6l1.3-1.3" {...studioStroke} />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <circle cx="12" cy="5.6" r="1.7" fill="currentColor" opacity="0.15" />
          <circle cx="6.4" cy="18.2" r="1.7" fill="currentColor" opacity="0.15" />
          <circle cx="17.6" cy="18.2" r="1.7" fill="currentColor" opacity="0.15" />
          <circle cx="12" cy="5.6" r="1.7" {...studioStroke} />
          <circle cx="6.4" cy="18.2" r="1.7" {...studioStroke} />
          <circle cx="17.6" cy="18.2" r="1.7" {...studioStroke} />
          <path d="M12 7.4v4.2M12 11.6H6.4v4.6M12 11.6h5.6v4.6" {...studioStroke} />
        </ActionIcon>
      )
    }
  },

  lucide: {
    name: 'Lucide Soft',
    description: 'Geometria Lucide con trazo 1.75 y padding generoso',
    icons: {
      newConnection: (
        <ActionIcon>
          <circle cx="12" cy="12" r="7.4" {...lucideStroke} />
          <path d="M12 8.8v6.4M8.8 12h6.4" {...lucideStroke} />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path d="M14.2 4H8A1.8 1.8 0 0 0 6.2 5.8v12.4A1.8 1.8 0 0 0 8 20h8a1.8 1.8 0 0 0 1.8-1.8V8.2L14.2 4z" {...lucideStroke} />
          <path d="M14.2 4v4.2H18" {...lucideStroke} />
          <path d="M12 11.4v5.2M9.4 14h5.2" {...lucideStroke} />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h3.7l1.6 1.8h7.1A1.8 1.8 0 0 1 20 10v7.2A1.8 1.8 0 0 1 18.2 19H5.8A1.8 1.8 0 0 1 4 17.2V8.2z" {...lucideStroke} />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="4.4" y="4.4" width="6.4" height="6.4" rx="1.6" {...lucideStroke} />
          <rect x="13.2" y="4.4" width="6.4" height="6.4" rx="1.6" {...lucideStroke} />
          <rect x="4.4" y="13.2" width="6.4" height="6.4" rx="1.6" {...lucideStroke} />
          <rect x="13.2" y="13.2" width="6.4" height="6.4" rx="1.6" {...lucideStroke} />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <circle cx="8.6" cy="12" r="3.6" {...lucideStroke} />
          <path d="M12 12h6.2l-1.6 1.8M16.2 12v2.6" {...lucideStroke} />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <path d="M14.6 6.6L8.8 12l5.8 5.4" {...lucideStroke} />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <path d="M9.4 6.6L15.2 12 9.4 17.4" {...lucideStroke} />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <path d="M5.2 8h13.6M5.2 12h13.6M5.2 16h13.6" {...lucideStroke} />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path d="M8 10.4l4 4 4-4" {...lucideStroke} />
          <path d="M8 6.8l4 4 4-4" {...lucideStroke} />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path d="M8 13.6l4-4 4 4" {...lucideStroke} />
          <path d="M8 17.2l4-4 4 4" {...lucideStroke} />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <circle cx="12" cy="12" r="2.8" {...lucideStroke} />
          <path d="M12 4.4v1.6M12 18v1.6M4.4 12h1.6M18 12h1.6M6.6 6.6l1.15 1.15M16.25 16.25l1.15 1.15M6.6 17.4l1.15-1.15M16.25 7.75l1.15-1.15" {...lucideStroke} />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <circle cx="12" cy="5.8" r="1.6" {...lucideStroke} />
          <circle cx="6.6" cy="18" r="1.6" {...lucideStroke} />
          <circle cx="17.4" cy="18" r="1.6" {...lucideStroke} />
          <path d="M12 7.4v3.8M12 11.2H6.6v4.8M12 11.2h5.4v4.8" {...lucideStroke} />
        </ActionIcon>
      )
    }
  },

  aurora: {
    name: 'Aurora',
    description: 'Gradientes mesh suaves tipo Apple Intelligence',
    icons: {
      newConnection: (
        <ActionIcon>
          <AuroraDefs id="aurora-connection" from={AURORA.connection[0]} to={AURORA.connection[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-connection-soft)" />
          <circle cx="12" cy="12" r="7.4" stroke="url(#aurora-connection-g)" strokeWidth="1.6" />
          <path d="M12 8.8v6.4M8.8 12h6.4" stroke="url(#aurora-connection-g)" strokeWidth="1.7" strokeLinecap="round" />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <AuroraDefs id="aurora-document" from={AURORA.document[0]} to={AURORA.document[1]} />
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#aurora-document-soft)" />
          <path d="M14.2 6.2H8.4A1.2 1.2 0 0 0 7.2 7.4v9.2A1.2 1.2 0 0 0 8.4 17.8h7.2a1.2 1.2 0 0 0 1.2-1.2V8.6L14.2 6.2z" stroke="url(#aurora-document-g)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14.2 6.2V8.8h3" stroke="url(#aurora-document-g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 11.4v4M10 13.4h4" stroke="url(#aurora-document-g)" strokeWidth="1.5" strokeLinecap="round" />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <AuroraDefs id="aurora-folder" from={AURORA.folder[0]} to={AURORA.folder[1]} />
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#aurora-folder-soft)" />
          <path d="M5.4 9.2A1.2 1.2 0 0 1 6.6 8h3.1l1.3 1.3h7.1A1.2 1.2 0 0 1 19.3 10.5v6.3A1.2 1.2 0 0 1 18.1 18H6.6A1.2 1.2 0 0 1 5.4 16.8V9.2z" stroke="url(#aurora-folder-g)" strokeWidth="1.5" strokeLinejoin="round" />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <AuroraDefs id="aurora-group" from={AURORA.group[0]} to={AURORA.group[1]} />
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#aurora-group-soft)" />
          <rect x="6.2" y="6.2" width="4.8" height="4.8" rx="1.2" stroke="url(#aurora-group-g)" strokeWidth="1.45" />
          <rect x="13" y="6.2" width="4.8" height="4.8" rx="1.2" stroke="url(#aurora-group-g)" strokeWidth="1.45" />
          <rect x="6.2" y="13" width="4.8" height="4.8" rx="1.2" stroke="url(#aurora-group-g)" strokeWidth="1.45" />
          <rect x="13" y="13" width="4.8" height="4.8" rx="1.2" stroke="url(#aurora-group-g)" strokeWidth="1.45" />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <AuroraDefs id="aurora-password" from={AURORA.password[0]} to={AURORA.password[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-password-soft)" />
          <circle cx="9" cy="12" r="3.2" stroke="url(#aurora-password-g)" strokeWidth="1.6" />
          <path d="M12.1 12h5.4l-1.3 1.5M16 12v2.2" stroke="url(#aurora-password-g)" strokeWidth="1.6" strokeLinecap="round" />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <AuroraDefs id="aurora-collapse" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-collapse-soft)" />
          <path d="M14.4 7.4L9.2 12l5.2 4.6" stroke="url(#aurora-collapse-g)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <AuroraDefs id="aurora-expand" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-expand-soft)" />
          <path d="M9.6 7.4L14.8 12 9.6 16.6" stroke="url(#aurora-expand-g)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <AuroraDefs id="aurora-menu" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#aurora-menu-soft)" />
          <path d="M7.2 8.6h9.6M7.2 12h9.6M7.2 15.4h9.6" stroke="url(#aurora-menu-g)" strokeWidth="1.6" strokeLinecap="round" />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <AuroraDefs id="aurora-expand-all" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-expand-all-soft)" />
          <path d="M8.2 10.6L12 14.4l3.8-3.8" stroke="url(#aurora-expand-all-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.2 7.6L12 11.4l3.8-3.8" stroke="url(#aurora-expand-all-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <AuroraDefs id="aurora-collapse-all" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-collapse-all-soft)" />
          <path d="M8.2 13.4L12 9.6l3.8 3.8" stroke="url(#aurora-collapse-all-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.2 16.4L12 12.6l3.8 3.8" stroke="url(#aurora-collapse-all-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <AuroraDefs id="aurora-settings" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <circle cx="12" cy="12" r="10" fill="url(#aurora-settings-soft)" />
          <circle cx="12" cy="12" r="2.7" stroke="url(#aurora-settings-g)" strokeWidth="1.5" />
          <path d="M12 5.4v1.5M12 17.1v1.5M5.4 12h1.5M17.1 12h1.5M7.2 7.2l1.05 1.05M15.75 15.75l1.05 1.05M7.2 16.8l1.05-1.05M15.75 8.25l1.05-1.05" stroke="url(#aurora-settings-g)" strokeWidth="1.5" strokeLinecap="round" />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <AuroraDefs id="aurora-tree" from={AURORA.chrome[0]} to={AURORA.chrome[1]} />
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="url(#aurora-tree-soft)" />
          <circle cx="12" cy="7.2" r="1.4" stroke="url(#aurora-tree-g)" strokeWidth="1.4" />
          <circle cx="7.6" cy="16.4" r="1.4" stroke="url(#aurora-tree-g)" strokeWidth="1.4" />
          <circle cx="16.4" cy="16.4" r="1.4" stroke="url(#aurora-tree-g)" strokeWidth="1.4" />
          <path d="M12 8.6v3M12 11.6H7.6v3.2M12 11.6h4.4v3.2" stroke="url(#aurora-tree-g)" strokeWidth="1.4" strokeLinecap="round" />
        </ActionIcon>
      )
    }
  },

  noir: {
    name: 'Noir',
    description: 'Siluetas solidas de alto contraste estilo Stripe',
    icons: {
      newConnection: (
        <ActionIcon>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 0 1 0-17.6zm0 4.3a1 1 0 0 1 1 1V11h2.5a1 1 0 1 1 0 2H13v2.5a1 1 0 1 1-2 0V13H8.5a1 1 0 1 1 0-2H11V8.5a1 1 0 0 1 1-1z"
          />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M7.2 2.8A2.2 2.2 0 0 0 5 5v14a2.2 2.2 0 0 0 2.2 2.2h9.6A2.2 2.2 0 0 0 19 19V8.4L13.6 2.8H7.2zm6.2 1.7L17.3 8h-3.1a.8.8 0 0 1-.8-.8V4.5zM12 11.2a1 1 0 0 1 1 1V14h1.8a1 1 0 1 1 0 2H13v1.8a1 1 0 1 1-2 0V16H9.2a1 1 0 1 1 0-2H11v-1.8a1 1 0 0 1 1-1z"
          />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path
            fill="currentColor"
            d="M4.2 6.4A2.2 2.2 0 0 1 6.4 4.2h3.3l1.7 1.8h6.4A2.2 2.2 0 0 1 20 8.2v9.4a2.2 2.2 0 0 1-2.2 2.2H6.4A2.2 2.2 0 0 1 4.2 17.6V6.4z"
          />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="3.4" y="3.4" width="7.6" height="7.6" rx="1.8" fill="currentColor" />
          <rect x="13" y="3.4" width="7.6" height="7.6" rx="1.8" fill="currentColor" />
          <rect x="3.4" y="13" width="7.6" height="7.6" rx="1.8" fill="currentColor" />
          <rect x="13" y="13" width="7.6" height="7.6" rx="1.8" fill="currentColor" />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M8.4 6.2a5.8 5.8 0 0 1 5.55 4.1H20a1 1 0 0 1 1 1v1.3a1 1 0 0 1-.3.72l-1.7 1.7a1 1 0 0 1-1.4 0l-.3-.3V16a1 1 0 0 1-1-1v-.7h-2.35A5.8 5.8 0 1 1 8.4 6.2zm0 3.3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
          />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <path fill="currentColor" d="M14.8 5.2a1.15 1.15 0 0 1 .05 1.63L10.4 12l4.45 5.17a1.15 1.15 0 1 1-1.75 1.5l-5.1-5.92a1.15 1.15 0 0 1 0-1.5l5.1-5.92A1.15 1.15 0 0 1 14.8 5.2z" />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <path fill="currentColor" d="M9.2 5.2a1.15 1.15 0 0 1 1.7.13l5.1 5.92a1.15 1.15 0 0 1 0 1.5l-5.1 5.92a1.15 1.15 0 1 1-1.75-1.5L13.6 12 9.15 6.83A1.15 1.15 0 0 1 9.2 5.2z" />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <rect x="4" y="6.4" width="16" height="2.1" rx="1.05" fill="currentColor" />
          <rect x="4" y="10.95" width="16" height="2.1" rx="1.05" fill="currentColor" />
          <rect x="4" y="15.5" width="16" height="2.1" rx="1.05" fill="currentColor" />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path fill="currentColor" d="M7.1 5.8a1 1 0 0 1 1.4 0L12 9.3l3.5-3.5a1 1 0 1 1 1.4 1.4l-4.2 4.2a1 1 0 0 1-1.4 0L7.1 7.2a1 1 0 0 1 0-1.4zm0 6.4a1 1 0 0 1 1.4 0L12 15.7l3.5-3.5a1 1 0 1 1 1.4 1.4l-4.2 4.2a1 1 0 0 1-1.4 0l-4.2-4.2a1 1 0 0 1 0-1.4z" />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path fill="currentColor" d="M7.1 18.2a1 1 0 0 1 0-1.4L11.3 12.6a1 1 0 0 1 1.4 0l4.2 4.2a1 1 0 1 1-1.4 1.4L12 14.7l-3.5 3.5a1 1 0 0 1-1.4 0zm0-6.4a1 1 0 0 1 0-1.4l4.2-4.2a1 1 0 0 1 1.4 0l4.2 4.2a1 1 0 1 1-1.4 1.4L12 8.3 8.5 11.8a1 1 0 0 1-1.4 0z" />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M11.1 2.8h1.8c.5 0 .95.34 1.08.82l.4 1.48a7.9 7.9 0 0 1 1.62.94l1.42-.52a1.12 1.12 0 0 1 1.32.42l.9 1.56c.24.42.16.95-.2 1.27l-1.1 1a7.6 7.6 0 0 1 0 1.9l1.1 1c.36.32.44.85.2 1.27l-.9 1.56a1.12 1.12 0 0 1-1.32.42l-1.42-.52a7.9 7.9 0 0 1-1.62.94l-.4 1.48a1.12 1.12 0 0 1-1.08.82h-1.8a1.12 1.12 0 0 1-1.08-.82l-.4-1.48a7.9 7.9 0 0 1-1.62-.94l-1.42.52a1.12 1.12 0 0 1-1.32-.42l-.9-1.56a1.12 1.12 0 0 1 .2-1.27l1.1-1a7.6 7.6 0 0 1 0-1.9l-1.1-1a1.12 1.12 0 0 1-.2-1.27l.9-1.56a1.12 1.12 0 0 1 1.32-.42l1.42.52a7.9 7.9 0 0 1 1.62-.94l.4-1.48A1.12 1.12 0 0 1 11.1 2.8zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"
          />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <circle cx="12" cy="5.4" r="2.15" fill="currentColor" />
          <circle cx="6.2" cy="18.4" r="2.15" fill="currentColor" />
          <circle cx="17.8" cy="18.4" r="2.15" fill="currentColor" />
          <path fill="currentColor" d="M11.15 7.3h1.7v3.5h4.95v2.1H6.2v-2.1h4.95V7.3z" />
        </ActionIcon>
      )
    }
  },

  carbon: {
    name: 'Carbon',
    description: 'Geometria enterprise precisa estilo IBM Carbon',
    icons: {
      newConnection: (
        <ActionIcon>
          <rect x="4" y="4" width="16" height="16" rx="1" {...carbonStroke} />
          <path d="M12 8v8M8 12h8" {...carbonStroke} />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path d="M7 3h7l5 5v13H7V3z" {...carbonStroke} />
          <path d="M14 3v5h5" {...carbonStroke} />
          <path d="M12 12v5M9.5 14.5h5" {...carbonStroke} />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path d="M3 8V6h6l2 2h10v12H3V8z" {...carbonStroke} />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="3" y="3" width="8" height="8" {...carbonStroke} />
          <rect x="13" y="3" width="8" height="8" {...carbonStroke} />
          <rect x="3" y="13" width="8" height="8" {...carbonStroke} />
          <rect x="13" y="13" width="8" height="8" {...carbonStroke} />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <rect x="3" y="8" width="8" height="8" {...carbonStroke} />
          <path d="M11 12h9v3h-2v2h-2v-2h-2" {...carbonStroke} />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <path d="M15 5L8 12l7 7" {...carbonStroke} />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <path d="M9 5l7 7-7 7" {...carbonStroke} />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <path d="M4 7h16M4 12h16M4 17h16" {...carbonStroke} />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path d="M6 9l6 6 6-6" {...carbonStroke} />
          <path d="M6 5l6 6 6-6" {...carbonStroke} />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path d="M6 15l6-6 6 6" {...carbonStroke} />
          <path d="M6 19l6-6 6 6" {...carbonStroke} />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <rect x="9" y="9" width="6" height="6" {...carbonStroke} />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M5.4 18.6l2.1-2.1M16.5 7.5l2.1-2.1" {...carbonStroke} />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <rect x="10" y="3" width="4" height="4" {...carbonStroke} />
          <rect x="3" y="17" width="4" height="4" {...carbonStroke} />
          <rect x="17" y="17" width="4" height="4" {...carbonStroke} />
          <path d="M12 7v5H5v5M12 12h7v5" {...carbonStroke} />
        </ActionIcon>
      )
    }
  },

  quartz: {
    name: 'Quartz',
    description: 'Cristal tipo visionOS con highlight especular',
    icons: {
      newConnection: (
        <ActionIcon>
          <QuartzDefs id="quartz-connection" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-connection-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4.4" ry="2.4" fill="url(#quartz-connection-spec)" />
          <path d="M12 8.6v6.8M8.6 12h6.8" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <QuartzDefs id="quartz-document" />
          <rect x="4.2" y="3.4" width="15.6" height="17.2" rx="4.2" fill="url(#quartz-document-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
          <ellipse cx="8.4" cy="7" rx="4" ry="2.1" fill="url(#quartz-document-spec)" />
          <path d="M13.8 7.2H8.8A1 1 0 0 0 7.8 8.2v8.2A1 1 0 0 0 8.8 17.4h6.4a1 1 0 0 0 1-1V9.4L13.8 7.2z" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" strokeLinejoin="round" />
          <path d="M13.8 7.2V9.4h2.4" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M12 11.6v3.6M10.2 13.4h3.6" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" strokeLinecap="round" />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <QuartzDefs id="quartz-folder" />
          <rect x="3.4" y="5.2" width="17.2" height="13.8" rx="4" fill="url(#quartz-folder-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
          <ellipse cx="8" cy="8.4" rx="4.2" ry="2" fill="url(#quartz-folder-spec)" />
          <path d="M6 10.2A1 1 0 0 1 7 9.2h2.8l1.2 1.2H17A1 1 0 0 1 18 11.4v5.2A1 1 0 0 1 17 17.6H7A1 1 0 0 1 6 16.6v-6.4z" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" strokeLinejoin="round" />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <QuartzDefs id="quartz-group" />
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill="url(#quartz-group-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
          <ellipse cx="8" cy="7.4" rx="3.8" ry="2" fill="url(#quartz-group-spec)" />
          <rect x="6.4" y="6.4" width="4.6" height="4.6" rx="1" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
          <rect x="13" y="6.4" width="4.6" height="4.6" rx="1" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
          <rect x="6.4" y="13" width="4.6" height="4.6" rx="1" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
          <rect x="13" y="13" width="4.6" height="4.6" rx="1" stroke="rgba(255,255,255,0.88)" strokeWidth="1.15" />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <QuartzDefs id="quartz-password" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-password-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9" cy="8.6" rx="4.2" ry="2.3" fill="url(#quartz-password-spec)" />
          <circle cx="9.1" cy="12" r="2.9" stroke="rgba(255,255,255,0.92)" strokeWidth="1.4" />
          <path d="M11.9 12h5l-1.2 1.4M16 12v2" stroke="rgba(255,255,255,0.92)" strokeWidth="1.4" strokeLinecap="round" />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <QuartzDefs id="quartz-collapse" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-collapse-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#quartz-collapse-spec)" />
          <path d="M14.2 7.6L9.2 12l5 4.4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <QuartzDefs id="quartz-expand" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-expand-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#quartz-expand-spec)" />
          <path d="M9.8 7.6L14.8 12l-5 4.4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <QuartzDefs id="quartz-menu" />
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill="url(#quartz-menu-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
          <ellipse cx="8" cy="7.2" rx="3.6" ry="1.9" fill="url(#quartz-menu-spec)" />
          <path d="M7.2 8.8h9.6M7.2 12h9.6M7.2 15.2h9.6" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round" />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <QuartzDefs id="quartz-expand-all" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-expand-all-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#quartz-expand-all-spec)" />
          <path d="M8.4 10.6L12 14.2l3.6-3.6" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.4 7.8L12 11.4l3.6-3.6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <QuartzDefs id="quartz-collapse-all" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-collapse-all-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#quartz-collapse-all-spec)" />
          <path d="M8.4 13.4L12 9.8l3.6 3.6" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.4 16.2L12 12.6l3.6 3.6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <QuartzDefs id="quartz-settings" />
          <circle cx="12" cy="12" r="9.4" fill="url(#quartz-settings-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.15" />
          <ellipse cx="9.2" cy="8.6" rx="4" ry="2.2" fill="url(#quartz-settings-spec)" />
          <circle cx="12" cy="12" r="2.5" stroke="rgba(255,255,255,0.92)" strokeWidth="1.35" />
          <path d="M12 5.8v1.4M12 16.8v1.4M5.8 12h1.4M16.8 12h1.4M7.4 7.4l1 1M15.6 15.6l1 1M7.4 16.6l1-1M15.6 8.4l1-1" stroke="rgba(255,255,255,0.88)" strokeWidth="1.35" strokeLinecap="round" />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <QuartzDefs id="quartz-tree" />
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill="url(#quartz-tree-glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
          <ellipse cx="8" cy="7.2" rx="3.6" ry="1.9" fill="url(#quartz-tree-spec)" />
          <circle cx="12" cy="7.4" r="1.3" stroke="rgba(255,255,255,0.92)" strokeWidth="1.2" />
          <circle cx="7.8" cy="16.2" r="1.3" stroke="rgba(255,255,255,0.92)" strokeWidth="1.2" />
          <circle cx="16.2" cy="16.2" r="1.3" stroke="rgba(255,255,255,0.92)" strokeWidth="1.2" />
          <path d="M12 8.8v2.6M12 11.4H7.8v3.2M12 11.4h4.2v3.2" stroke="rgba(255,255,255,0.88)" strokeWidth="1.2" strokeLinecap="round" />
        </ActionIcon>
      )
    }
  },

  solar: {
    name: 'Solar',
    description: 'Duotono contemporaneo con capa primaria y secundaria',
    icons: {
      newConnection: (
        <ActionIcon>
          <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity="0.22" />
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <path d="M12 8.4v7.2M8.4 12h7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path d="M14 3.6H7.4A1.8 1.8 0 0 0 5.6 5.4v13.2A1.8 1.8 0 0 0 7.4 20.4h9.2a1.8 1.8 0 0 0 1.8-1.8V8.2L14 3.6z" fill="currentColor" opacity="0.22" />
          <path d="M14 3.6H7.4A1.8 1.8 0 0 0 5.6 5.4v13.2A1.8 1.8 0 0 0 7.4 20.4h9.2a1.8 1.8 0 0 0 1.8-1.8V8.2L14 3.6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
          <path d="M14 3.6V8h4.4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
          <path d="M12 12v5M9.5 14.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path d="M3.6 8A1.8 1.8 0 0 1 5.4 6.2h3.9l1.7 1.8h7.6A1.8 1.8 0 0 1 20.4 9.8v8.2a1.8 1.8 0 0 1-1.8 1.8H5.4A1.8 1.8 0 0 1 3.6 18V8z" fill="currentColor" opacity="0.22" />
          <path d="M3.6 8A1.8 1.8 0 0 1 5.4 6.2h3.9l1.7 1.8h7.6A1.8 1.8 0 0 1 20.4 9.8v8.2a1.8 1.8 0 0 1-1.8 1.8H5.4A1.8 1.8 0 0 1 3.6 18V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="3.6" y="3.6" width="7.4" height="7.4" rx="1.6" fill="currentColor" opacity="0.22" />
          <rect x="13" y="3.6" width="7.4" height="7.4" rx="1.6" fill="currentColor" opacity="0.22" />
          <rect x="3.6" y="13" width="7.4" height="7.4" rx="1.6" fill="currentColor" opacity="0.22" />
          <rect x="13" y="13" width="7.4" height="7.4" rx="1.6" fill="currentColor" opacity="0.22" />
          <rect x="3.6" y="3.6" width="7.4" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <rect x="13" y="3.6" width="7.4" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <rect x="3.6" y="13" width="7.4" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <rect x="13" y="13" width="7.4" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <circle cx="8.5" cy="12" r="4.3" fill="currentColor" opacity="0.22" />
          <circle cx="8.5" cy="12" r="4.3" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <path d="M12.6 12H20l-1.6 1.8M16.6 12v2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity="0.22" />
          <path d="M14.6 6.8L8.8 12l5.8 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity="0.22" />
          <path d="M9.4 6.8L15.2 12 9.4 17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <rect x="4" y="6.6" width="16" height="2.2" rx="1.1" fill="currentColor" opacity="0.22" />
          <rect x="4" y="10.9" width="16" height="2.2" rx="1.1" fill="currentColor" opacity="0.22" />
          <rect x="4" y="15.2" width="16" height="2.2" rx="1.1" fill="currentColor" opacity="0.22" />
          <path d="M4 7.7h16M4 12h16M4 16.3h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path d="M7.4 9.6L12 14.2l4.6-4.6" fill="currentColor" opacity="0.22" />
          <path d="M7.4 9.6L12 14.2l4.6-4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d="M7.4 6.2L12 10.8l4.6-4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path d="M7.4 14.4L12 9.8l4.6 4.6" fill="currentColor" opacity="0.22" />
          <path d="M7.4 14.4L12 9.8l4.6 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d="M7.4 17.8L12 13.2l4.6 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <circle cx="12" cy="12" r="3.2" fill="currentColor" opacity="0.22" />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <circle cx="12" cy="5.6" r="2" fill="currentColor" opacity="0.22" />
          <circle cx="6.2" cy="18.2" r="2" fill="currentColor" opacity="0.22" />
          <circle cx="17.8" cy="18.2" r="2" fill="currentColor" opacity="0.22" />
          <circle cx="12" cy="5.6" r="2" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <circle cx="6.2" cy="18.2" r="2" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <circle cx="17.8" cy="18.2" r="2" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <path d="M12 7.6v4M12 11.6H6.2v4.4M12 11.6h5.8v4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        </ActionIcon>
      )
    }
  },

  geist: {
    name: 'Geist',
    description: 'Geometria afilada estilo Vercel Geist',
    icons: {
      newConnection: (
        <ActionIcon>
          <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="1" {...geistStroke} />
          <path d="M12 8.2v7.6M8.2 12h7.6" {...geistStroke} />
        </ActionIcon>
      ),
      newDocument: (
        <ActionIcon>
          <path d="M7.2 3.4h6.6L18.6 8.2V20.6H7.2V3.4z" {...geistStroke} />
          <path d="M13.8 3.4V8.2h4.8" {...geistStroke} />
          <path d="M12 12v5M9.6 14.5h4.8" {...geistStroke} />
        </ActionIcon>
      ),
      newFolder: (
        <ActionIcon>
          <path d="M3.6 7.8V6.2h5.6l1.6 1.8h9.6v11.8H3.6V7.8z" {...geistStroke} />
        </ActionIcon>
      ),
      newGroup: (
        <ActionIcon>
          <rect x="3.6" y="3.6" width="7.4" height="7.4" rx="1" {...geistStroke} />
          <rect x="13" y="3.6" width="7.4" height="7.4" rx="1" {...geistStroke} />
          <rect x="3.6" y="13" width="7.4" height="7.4" rx="1" {...geistStroke} />
          <rect x="13" y="13" width="7.4" height="7.4" rx="1" {...geistStroke} />
        </ActionIcon>
      ),
      passwordManager: (
        <ActionIcon>
          <rect x="3.8" y="8.2" width="7.6" height="7.6" rx="1" {...geistStroke} />
          <path d="M11.4 12H20l-1.8 2M16.6 12v3" {...geistStroke} />
        </ActionIcon>
      ),
      collapseLeft: (
        <ActionIcon>
          <path d="M14.8 5.4L8.4 12l6.4 6.6" {...geistStroke} />
        </ActionIcon>
      ),
      expandRight: (
        <ActionIcon>
          <path d="M9.2 5.4L15.6 12 9.2 18.6" {...geistStroke} />
        </ActionIcon>
      ),
      menu: (
        <ActionIcon>
          <path d="M4.2 7.2h15.6M4.2 12h15.6M4.2 16.8h15.6" {...geistStroke} />
        </ActionIcon>
      ),
      expandAll: (
        <ActionIcon>
          <path d="M6.6 9.2L12 14.6 17.4 9.2" {...geistStroke} />
          <path d="M6.6 5.4L12 10.8 17.4 5.4" {...geistStroke} />
        </ActionIcon>
      ),
      collapseAll: (
        <ActionIcon>
          <path d="M6.6 14.8L12 9.4l5.4 5.4" {...geistStroke} />
          <path d="M6.6 18.6L12 13.2l5.4 5.4" {...geistStroke} />
        </ActionIcon>
      ),
      settings: (
        <ActionIcon>
          <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1" {...geistStroke} />
          <path d="M12 3.6v2.4M12 18v2.4M3.6 12h2.4M18 12h2.4M6 6l1.7 1.7M16.3 16.3L18 18M6 18l1.7-1.7M16.3 7.7L18 6" {...geistStroke} />
        </ActionIcon>
      ),
      treeTheme: (
        <ActionIcon>
          <rect x="10" y="3.2" width="4" height="4" rx="1" {...geistStroke} />
          <rect x="3.4" y="16.8" width="4" height="4" rx="1" {...geistStroke} />
          <rect x="16.6" y="16.8" width="4" height="4" rx="1" {...geistStroke} />
          <path d="M12 7.2v4.2H5.4v5.4M12 11.4h6.6v5.4" {...geistStroke} />
        </ActionIcon>
      )
    }
  }
};
