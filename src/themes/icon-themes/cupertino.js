import React from 'react';

const theme = {
  name: 'Cupertino',
  icons: {
    folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="#2585C8" />
          <path d="M2 8h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" fill="#3092D6" />
          <path d="M2 8c0-.5.5-1 1-1h18c.5 0 1 .5 1 1v0.5H2V8z" fill="#ffffff" fillOpacity="0.15" />
        </svg>,
    folderOpen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="#2585C8" />
          <path d="M2 10h20v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10z" fill="#3092D6" />
          <path d="M2 10c0-.5.5-1 1-1h18c.5 0 1 .5 1 1v0.5H2V10z" fill="#ffffff" fillOpacity="0.15" />
        </svg>,
    ssh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="16" rx="4" fill="#1B1C1F" />
          <path d="M2 7C2 4.79086 3.79086 3 6 3H18C20.2091 3 22 4.79086 22 7V8H2V7Z" fill="#2B2D30" />
          <circle cx="5" cy="5.5" r="1.5" fill="#FF5F56" />
          <circle cx="9" cy="5.5" r="1.5" fill="#FFBD2E" />
          <circle cx="13" cy="5.5" r="1.5" fill="#27C93F" />
          <path d="M7 11L10 14L7 17M13 17H17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    rdp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#9CA3AF" />
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#1F2937" />
          <path d="M8 21H16M12 17V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 6C2 4.34315 3.34315 3 5 3H19C20.6569 3 22 4.34315 22 6V6.5C22 4.84315 20.6569 3.5 19 3.5H5C3.34315 3.5 2 4.84315 2 6.5V6Z" fill="#ffffff" fillOpacity="0.8" />
          <circle cx="12" cy="10" r="2.5" fill="#3B82F6" />
        </svg>,
    vnc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="3" fill="#9CA3AF" />
          <rect x="3" y="4" width="18" height="12" rx="2" fill="#047857" />
          <path d="M8 21H16M12 17V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 6C2 4.34315 3.34315 3 5 3H19C20.6569 3 22 4.34315 22 6V6.5C22 4.84315 20.6569 3.5 19 3.5H5C3.34315 3.5 2 4.84315 2 6.5V6Z" fill="#ffffff" fillOpacity="0.8" />
          <ellipse cx="12" cy="10" rx="4" ry="3" fill="#10B981" />
          <circle cx="12" cy="10" r="1.5" fill="#ffffff" />
        </svg>,
    file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#F3F4F6" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="#E5E7EB" strokeWidth="1" />
          <polygon points="14 2 20 8 14 8" fill="#D1D5DB" />
        </svg>,
    sftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#EAB308" />
          <polygon points="14 2 20 8 14 8" fill="#FDE047" />
          <rect x="9" y="13" width="6" height="5" rx="1" fill="#713F12" />
          <path d="M10 13v-1.5a2 2 0 1 1 4 0V13" stroke="#713F12" strokeWidth="1.5" />
        </svg>,
    ftp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#3B82F6" />
          <polygon points="14 2 20 8 14 8" fill="#93C5FD" />
          <path d="M12 12l-3 3 3 3M9 15h6" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>,
    scp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#10B981" />
          <polygon points="14 2 20 8 14 8" fill="#A7F3D0" />
          <path d="M9 15l3-3 3 3" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
  }
};

export default theme;
