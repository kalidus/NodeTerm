import React from 'react';

const theme = {
  name: 'Moderno',
  description: 'Iconos modernos con gradientes y sombras suaves',
  icons: {
    // Icono de nueva conexión (círculo con plus)
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernConnectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            <filter id="modernShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" fill="url(#modernConnectionGrad)" opacity="0.15" filter="url(#modernShadow)" />
          <circle cx="12" cy="12" r="8" stroke="url(#modernConnectionGrad)" strokeWidth="1.8" strokeLinecap="round" filter="url(#modernShadow)" />
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="url(#modernConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#modernShadow)" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="url(#modernConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#modernShadow)" />
        </svg>,
    // Icono de nueva nota/documento
    newDocument: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernDocumentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64b5f6" />
              <stop offset="100%" stopColor="#42a5f5" />
            </linearGradient>
            <filter id="modernDocumentShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="url(#modernDocumentGrad)" opacity="0.15" filter="url(#modernDocumentShadow)" />
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 2v6h6" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="18" x2="12" y2="12" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="9" y1="15" x2="15" y2="15" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>,
    // Icono de nueva carpeta
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f093fb" />
              <stop offset="100%" stopColor="#f5576c" />
            </linearGradient>
            <filter id="modernFolderShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Carpeta principal */}
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="url(#modernFolderGrad)" opacity="0.15" filter="url(#modernFolderShadow)" />
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="url(#modernFolderGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Solapa de la carpeta */}
          <path d="M3 7l2-2h4l2 2" stroke="url(#modernFolderGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Líneas decorativas */}
          <line x1="7" y1="11" x2="17" y2="11" stroke="url(#modernFolderGrad)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
          <line x1="7" y1="14" x2="15" y2="14" stroke="url(#modernFolderGrad)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
        </svg>,
    // Icono de nuevo grupo (cuadrícula)
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernGroupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4facfe" />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
            <filter id="modernGroupShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Cuadrícula 2x2 */}
          <rect x="4" y="4" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)" />
          <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Puntos decorativos en el centro de cada cuadro */}
          <circle cx="7" cy="7" r="1" fill="url(#modernGroupGrad)" />
          <circle cx="17" cy="7" r="1" fill="url(#modernGroupGrad)" />
          <circle cx="7" cy="17" r="1" fill="url(#modernGroupGrad)" />
          <circle cx="17" cy="17" r="1" fill="url(#modernGroupGrad)" />
        </svg>,
    // Icono de gestor de contraseñas (llave)
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernKeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id="modernKeyShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Anillo de la llave */}
          <circle cx="9" cy="12" r="3.5" fill="url(#modernKeyGrad)" opacity="0.2" filter="url(#modernKeyShadow)" />
          <circle cx="9" cy="12" r="3.5" stroke="url(#modernKeyGrad)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Cuerpo de la llave */}
          <rect x="9" y="10" width="8" height="4" rx="2" fill="url(#modernKeyGrad)" opacity="0.2" filter="url(#modernKeyShadow)" />
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="url(#modernKeyGrad)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Dientes de la llave */}
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)" />
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)" />
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)" />
          {/* Brillo decorativo */}
          <circle cx="9" cy="12" r="1.5" fill="url(#modernKeyGrad)" opacity="0.4" />
        </svg>,
    // Icono de colapsar/descolapsar (flecha izquierda)
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernCollapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernCollapseShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M15 18l-6-6 6-6" stroke="url(#modernCollapseGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernCollapseShadow)" />
        </svg>,
    // Icono de expandir (flecha derecha)
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernExpandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernExpandShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M9 18l6-6-6-6" stroke="url(#modernExpandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernExpandShadow)" />
        </svg>,
    // Icono de menú
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>,
    // Icono de expandir todo
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernExpandAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernExpandAllShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M7 13l5 5 5-5" stroke="url(#modernExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernExpandAllShadow)" />
          <path d="M7 6l5 5 5-5" stroke="url(#modernExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernExpandAllShadow)" />
        </svg>,
    // Icono de colapsar todo
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernCollapseAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernCollapseAllShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M17 11l-5-5-5 5" stroke="url(#modernCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernCollapseAllShadow)" />
          <path d="M17 18l-5-5-5 5" stroke="url(#modernCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernCollapseAllShadow)" />
        </svg>,
    // Icono de configuración
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernSettingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernSettingsShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="3" stroke="url(#modernSettingsGrad)" strokeWidth="2" fill="none" filter="url(#modernSettingsShadow)" />
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" stroke="url(#modernSettingsGrad)" strokeWidth="1.5" strokeLinecap="round" filter="url(#modernSettingsShadow)" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernTreeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#modernTreeGrad)" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2" />
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2" />
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2" />
        </svg>
  }
};

export default theme;
