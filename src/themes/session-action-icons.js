import React from 'react';

/**
 * Temas de iconos para los botones de acción del explorador de sesiones
 * Cada tema incluye 4 iconos: nueva conexión, nueva carpeta, nuevo grupo, gestor de contraseñas
 */
export const sessionActionIconThemes = {
  modern: {
    name: 'Moderno',
    description: 'Iconos modernos con gradientes y sombras suaves',
    icons: {
      // Icono de nueva conexión (círculo con plus)
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernConnectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            <filter id="modernShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" fill="url(#modernConnectionGrad)" opacity="0.15" filter="url(#modernShadow)"/>
          <circle cx="12" cy="12" r="8" stroke="url(#modernConnectionGrad)" strokeWidth="1.8" strokeLinecap="round" filter="url(#modernShadow)"/>
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="url(#modernConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#modernShadow)"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="url(#modernConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#modernShadow)"/>
        </svg>
      ),
      // Icono de nueva nota/documento
      newDocument: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernDocumentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64b5f6" />
              <stop offset="100%" stopColor="#42a5f5" />
            </linearGradient>
            <filter id="modernDocumentShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                fill="url(#modernDocumentGrad)" opacity="0.15" filter="url(#modernDocumentShadow)"/>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M14 2v6h6" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="18" x2="12" y2="12" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="9" y1="15" x2="15" y2="15" stroke="url(#modernDocumentGrad)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de nueva carpeta
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f093fb" />
              <stop offset="100%" stopColor="#f5576c" />
            </linearGradient>
            <filter id="modernFolderShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Carpeta principal */}
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                fill="url(#modernFolderGrad)" 
                opacity="0.15" 
                filter="url(#modernFolderShadow)"/>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="url(#modernFolderGrad)" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
          {/* Solapa de la carpeta */}
          <path d="M3 7l2-2h4l2 2" 
                stroke="url(#modernFolderGrad)" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
          {/* Líneas decorativas */}
          <line x1="7" y1="11" x2="17" y2="11" stroke="url(#modernFolderGrad)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
          <line x1="7" y1="14" x2="15" y2="14" stroke="url(#modernFolderGrad)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de nuevo grupo (cuadrícula)
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernGroupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4facfe" />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
            <filter id="modernGroupShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Cuadrícula 2x2 */}
          <rect x="4" y="4" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)"/>
          <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="14" y="4" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)"/>
          <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="4" y="14" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)"/>
          <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="14" y="14" width="6" height="6" rx="1.5" fill="url(#modernGroupGrad)" opacity="0.2" filter="url(#modernGroupShadow)"/>
          <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="url(#modernGroupGrad)" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Puntos decorativos en el centro de cada cuadro */}
          <circle cx="7" cy="7" r="1" fill="url(#modernGroupGrad)"/>
          <circle cx="17" cy="7" r="1" fill="url(#modernGroupGrad)"/>
          <circle cx="7" cy="17" r="1" fill="url(#modernGroupGrad)"/>
          <circle cx="17" cy="17" r="1" fill="url(#modernGroupGrad)"/>
        </svg>
      ),
      // Icono de gestor de contraseñas (llave)
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernKeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id="modernKeyShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Anillo de la llave */}
          <circle cx="9" cy="12" r="3.5" 
                  fill="url(#modernKeyGrad)" 
                  opacity="0.2" 
                  filter="url(#modernKeyShadow)"/>
          <circle cx="9" cy="12" r="3.5" 
                  stroke="url(#modernKeyGrad)" 
                  strokeWidth="1.8" 
                  strokeLinecap="round"/>
          {/* Cuerpo de la llave */}
          <rect x="9" y="10" width="8" height="4" rx="2" 
                fill="url(#modernKeyGrad)" 
                opacity="0.2" 
                filter="url(#modernKeyShadow)"/>
          <rect x="9" y="10" width="8" height="4" rx="2" 
                stroke="url(#modernKeyGrad)" 
                strokeWidth="1.8" 
                strokeLinecap="round"/>
          {/* Dientes de la llave */}
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)"/>
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)"/>
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="url(#modernKeyGrad)"/>
          {/* Brillo decorativo */}
          <circle cx="9" cy="12" r="1.5" fill="url(#modernKeyGrad)" opacity="0.4"/>
        </svg>
      ),
      // Icono de colapsar/descolapsar (flecha izquierda)
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernCollapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernCollapseShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M15 18l-6-6 6-6" 
                stroke="url(#modernCollapseGrad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
                filter="url(#modernCollapseShadow)"/>
        </svg>
      ),
      // Icono de expandir (flecha derecha)
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernExpandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernExpandShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M9 18l6-6-6-6" 
                stroke="url(#modernExpandGrad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
                filter="url(#modernExpandShadow)"/>
        </svg>
      ),
      // Icono de menú
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de expandir todo
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernExpandAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernExpandAllShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M7 13l5 5 5-5" stroke="url(#modernExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernExpandAllShadow)"/>
          <path d="M7 6l5 5 5-5" stroke="url(#modernExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernExpandAllShadow)"/>
        </svg>
      ),
      // Icono de colapsar todo
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernCollapseAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernCollapseAllShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M17 11l-5-5-5 5" stroke="url(#modernCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernCollapseAllShadow)"/>
          <path d="M17 18l-5-5-5 5" stroke="url(#modernCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#modernCollapseAllShadow)"/>
        </svg>
      ),
      // Icono de configuración
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernSettingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="modernSettingsShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="3" stroke="url(#modernSettingsGrad)" strokeWidth="2" fill="none" filter="url(#modernSettingsShadow)"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="url(#modernSettingsGrad)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                filter="url(#modernSettingsShadow)"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="modernTreeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#modernTreeGrad)" strokeWidth="2" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="url(#modernTreeGrad)" strokeWidth="2"/>
        </svg>
      )
    }
  },
  
  minimal: {
    name: 'Minimalista',
    description: 'Iconos minimalistas con líneas limpias',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          <path d="M3 7l2-2h4l2 2" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
  },
  
  classic: {
    name: 'Clásico',
    description: 'Iconos clásicos estilo PrimeIcons',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                fill="currentColor" 
                opacity="0.1"/>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="14" y="4" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="4" y="14" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
          <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" fill="currentColor" opacity="0.1"/>
          <circle cx="9" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="9" y="10" width="8" height="4" rx="2" fill="currentColor" opacity="0.1"/>
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1"/>
        </svg>
      )
    }
  },
  
  neon: {
    name: 'Neón',
    description: 'Iconos con efecto neón brillante',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonConnectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Círculo exterior */}
          <circle cx="12" cy="12" r="8" stroke="url(#neonConnectionGrad)" strokeWidth="2" fill="none" filter="url(#neonGlow)"/>
          {/* Símbolo plus */}
          <line x1="12" y1="8" x2="12" y2="16" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#ff0080" />
            </linearGradient>
            <filter id="neonFolderGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="url(#neonFolderGrad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
                filter="url(#neonFolderGlow)"/>
          <path d="M3 7l2-2h4l2 2" 
                stroke="url(#neonFolderGrad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
                filter="url(#neonFolderGlow)"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonGroupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ff00" />
              <stop offset="100%" stopColor="#00ff80" />
            </linearGradient>
            <filter id="neonGroupGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)"/>
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)"/>
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)"/>
          <rect x="14" y="14" width="6" height="6" rx="1" stroke="url(#neonGroupGrad)" strokeWidth="2" fill="none" filter="url(#neonGroupGlow)"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonKeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffff00" />
              <stop offset="100%" stopColor="#ff8000" />
            </linearGradient>
            <filter id="neonKeyGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="9" cy="12" r="3.5" stroke="url(#neonKeyGrad)" strokeWidth="2" fill="none" filter="url(#neonKeyGlow)"/>
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="url(#neonKeyGrad)" strokeWidth="2" fill="none" filter="url(#neonKeyGlow)"/>
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)"/>
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)"/>
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="url(#neonKeyGrad)" filter="url(#neonKeyGlow)"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonCollapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonCollapseGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M15 18l-6-6 6-6" stroke="url(#neonCollapseGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonCollapseGlow)"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonExpandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonExpandGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M9 18l6-6-6-6" stroke="url(#neonExpandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonExpandGlow)"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonExpandAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonExpandAllGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M7 13l5 5 5-5" stroke="url(#neonExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonExpandAllGlow)"/>
          <path d="M7 6l5 5 5-5" stroke="url(#neonExpandAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonExpandAllGlow)"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonCollapseAllGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonCollapseAllGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M17 11l-5-5-5 5" stroke="url(#neonCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonCollapseAllGlow)"/>
          <path d="M17 18l-5-5-5 5" stroke="url(#neonCollapseAllGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonCollapseAllGlow)"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonSettingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonSettingsGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="3" stroke="url(#neonSettingsGrad)" strokeWidth="2" fill="none" filter="url(#neonSettingsGlow)"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="url(#neonSettingsGrad)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                filter="url(#neonSettingsGlow)"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="neonTreeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#00ffff" />
            </linearGradient>
            <filter id="neonTreeGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#neonTreeGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonTreeGlow)"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="url(#neonTreeGrad)" strokeWidth="2" filter="url(#neonTreeGlow)"/>
        </svg>
      )
    }
  },
  
  outline: {
    name: 'Outline',
    description: 'Iconos outline minimalistas con estilo lineal',
    icons: {
      // Icono de nueva conexión (servidor/base de datos conectado a red)
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Pila de servidor/base de datos - tres cilindros horizontales más grandes y centrados */}
          {/* Cilindro superior */}
          <ellipse cx="12" cy="4.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="5.5" y1="4.5" x2="18.5" y2="4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* Cilindro medio */}
          <ellipse cx="12" cy="8.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="5.5" y1="8.5" x2="18.5" y2="8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* Cilindro inferior */}
          <ellipse cx="12" cy="12.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="5.5" y1="12.5" x2="18.5" y2="12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* Línea vertical de conexión */}
          <line x1="12" y1="15" x2="12" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* Línea horizontal de red */}
          <line x1="2" y1="19.5" x2="22" y2="19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* Tres nodos cuadrados en la red - más grandes y centrados */}
          <rect x="2" y="18.5" width="3" height="3" fill="currentColor"/>
          <rect x="10.5" y="18.5" width="3" height="3" fill="currentColor"/>
          <rect x="19" y="18.5" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      // Icono de nueva carpeta (carpeta con lupa superpuesta en la parte frontal)
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Carpeta estándar - más grande */}
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          <path d="M2 6l2-2h5l2 2" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          {/* Líneas decorativas en la carpeta */}
          <line x1="6" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
          <line x1="6" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
          {/* Lupa superpuesta en la parte frontal de la carpeta - más grande */}
          <circle cx="15.5" cy="10.5" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="17.5" y1="12.5" x2="19.5" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de nuevo grupo (cuadrícula 3x3 de 9 cuadrados pequeños rellenos)
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cuadrícula 3x3 - 9 cuadrados más grandes y mejor espaciados */}
          <rect x="2.5" y="2.5" width="5" height="5" fill="currentColor"/>
          <rect x="9.5" y="2.5" width="5" height="5" fill="currentColor"/>
          <rect x="16.5" y="2.5" width="5" height="5" fill="currentColor"/>
          <rect x="2.5" y="9.5" width="5" height="5" fill="currentColor"/>
          <rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/>
          <rect x="16.5" y="9.5" width="5" height="5" fill="currentColor"/>
          <rect x="2.5" y="16.5" width="5" height="5" fill="currentColor"/>
          <rect x="9.5" y="16.5" width="5" height="5" fill="currentColor"/>
          <rect x="16.5" y="16.5" width="5" height="5" fill="currentColor"/>
        </svg>
      ),
      // Icono de gestor de contraseñas (llave)
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Anillo de la llave - más grande */}
          <circle cx="8.5" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          {/* Cuerpo de la llave - más grande */}
          <rect x="8.5" y="9.5" width="9" height="5" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
          {/* Dientes de la llave - más grandes y detallados */}
          <rect x="11.5" y="7" width="2" height="2.5" rx="1" fill="currentColor"/>
          <rect x="13.5" y="8.5" width="2" height="2.5" rx="1" fill="currentColor"/>
          <rect x="15.5" y="14.5" width="2" height="2.5" rx="1" fill="currentColor"/>
          {/* Brillo decorativo en el anillo */}
          <circle cx="8.5" cy="12" r="2" fill="currentColor" opacity="0.3"/>
        </svg>
      ),
      // Icono de colapsar (chevron izquierdo angular - flecha angular apuntando a la izquierda)
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" fill="none"/>
        </svg>
      ),
      // Icono de expandir (chevron derecho)
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      // Icono de menú (tres líneas horizontales)
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de expandir todo
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      // Icono de colapsar todo
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      // Icono de configuración
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
  },

  bold: {
    name: 'Audaz',
    description: 'Iconos gruesos y audaces con líneas pesadas',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none"/>
          <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" 
                fill="currentColor" 
                opacity="0.3"/>
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
          <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
          <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
          <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
          <rect x="8" y="9" width="9" height="6" rx="3" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3"/>
          <rect x="11" y="6" width="2.5" height="3" rx="1" fill="currentColor"/>
          <rect x="13.5" y="8" width="2.5" height="3" rx="1" fill="currentColor"/>
          <rect x="15.5" y="15" width="2.5" height="3" rx="1" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <line x1="2" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 14l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M6 6l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 10l-6-6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M18 18l-6-6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="3"/>
          <path d="M12 0v8m0 8v8M24 12h-8m-8 0H0M20.93 3.07l-5.66 5.66m0 3.54l5.66 5.66M3.07 20.93l5.66-5.66m0-3.54L3.07 3.07" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <rect x="3" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2"/>
          <rect x="15" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2"/>
          <rect x="15" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.2"/>
        </svg>
      )
    }
  },

  rounded: {
    name: 'Redondeado',
    description: 'Iconos con bordes muy redondeados y suaves',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" rx="8" ry="8" fill="currentColor" opacity="0.15"/>
          <circle cx="12" cy="12" r="8" rx="8" ry="8" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6a3 3 0 0 1 3-3h4l2 2h7a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z" 
                fill="currentColor" 
                opacity="0.15"
                rx="3" ry="3"/>
          <path d="M3 6a3 3 0 0 1 3-3h4l2 2h7a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z" 
                stroke="currentColor" 
                strokeWidth="2"
                rx="3" ry="3"/>
          <path d="M3 6l3-2h4l2 2" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="4" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="4" y="14" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="17" r="1.5" fill="currentColor"/>
          <circle cx="17" cy="17" r="1.5" fill="currentColor"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
          <rect x="9" y="9" width="9" height="6" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
          <rect x="12" y="7" width="2" height="3" rx="1" fill="currentColor"/>
          <rect x="14" y="9" width="2" height="3" rx="1" fill="currentColor"/>
          <rect x="16" y="15" width="2" height="3" rx="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="2" fill="currentColor" opacity="0.4"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor"/>
          <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/>
          <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2"/>
          <rect x="16" y="4" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2"/>
          <rect x="16" y="16" width="4" height="4" rx="1.5" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.2"/>
        </svg>
      )
    }
  },

  geometric: {
    name: 'Geométrico',
    description: 'Iconos abstractos con formas geométricas puras',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <line x1="12" y1="5" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="15" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="15" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18l-2 14H5L3 6z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <polygon points="3,6 7,6 9,2 21,2 21,8 3,8" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,2 22,8 18,20 6,20 2,8" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <polygon points="12,6 18,10 16,18 8,18 6,10" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="9,8 9,16 17,16 17,8" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="7" cy="12" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="11" y="6" width="2" height="2" rx="0.5" fill="currentColor"/>
          <rect x="13" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
          <rect x="15" y="16" width="2" height="2" rx="0.5" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="15,18 7,12 15,6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="9,18 17,12 9,6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="3" rx="1" fill="currentColor"/>
          <rect x="3" y="10.5" width="18" height="3" rx="1" fill="currentColor"/>
          <rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="7,13 12,18 17,13" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2"/>
          <polygon points="7,6 12,11 17,6" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="17,11 12,6 7,11" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2"/>
          <polygon points="17,18 12,13 7,18" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,1 15,9 23,9 17,14 19,22 12,18 5,22 7,14 1,9 9,9" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12h8m-8-8v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polygon points="2,12 6,8 10,12 6,16" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
          <polygon points="16,2 20,6 16,10 12,6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
          <polygon points="16,14 20,18 16,22 12,18" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
        </svg>
      )
    }
  },

  filled: {
    name: 'Relleno',
    description: 'Iconos completamente rellenos con formas sólidas',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="currentColor"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
          <rect x="11" y="2" width="2" height="6" fill="white"/>
          <rect x="11" y="16" width="2" height="6" fill="white"/>
          <rect x="2" y="11" width="6" height="2" fill="white"/>
          <rect x="16" y="11" width="6" height="2" fill="white"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor"/>
          <path d="M2 5l2-2h5l2 2" fill="currentColor" opacity="0.7"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
          <rect x="14" y="3" width="7" height="7" fill="currentColor"/>
          <rect x="3" y="14" width="7" height="7" fill="currentColor"/>
          <rect x="14" y="14" width="7" height="7" fill="currentColor"/>
          <circle cx="6.5" cy="6.5" r="1.5" fill="white" opacity="0.8"/>
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" opacity="0.8"/>
          <circle cx="6.5" cy="17.5" r="1.5" fill="white" opacity="0.8"/>
          <circle cx="17.5" cy="17.5" r="1.5" fill="white" opacity="0.8"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4.5" fill="currentColor"/>
          <rect x="8" y="8" width="10" height="8" rx="3" fill="currentColor"/>
          <rect x="11" y="6" width="2.5" height="3" rx="1" fill="white"/>
          <rect x="13.5" y="8" width="2.5" height="3" rx="1" fill="white"/>
          <rect x="15.5" y="16" width="2.5" height="3" rx="1" fill="white"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="16,19 7,12 16,5" fill="currentColor"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="8,19 17,12 8,5" fill="currentColor"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor"/>
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor"/>
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="6,14 12,20 18,14" fill="currentColor"/>
          <polygon points="6,6 12,12 18,6" fill="currentColor"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,10 12,4 6,10" fill="currentColor"/>
          <polygon points="18,18 12,12 6,18" fill="currentColor"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="white"/>
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" fill="currentColor"/>
          <rect x="16" y="4" width="4" height="4" rx="1" fill="currentColor"/>
          <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor"/>
        </svg>
      )
    }
  },

  duotone: {
    name: 'Duotono',
    description: 'Iconos con dos tonos de color superpuestos',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.4"/>
          <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.6"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
          <line x1="12" y1="15" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
          <line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
          <line x1="15" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" opacity="0.3"/>
          <path d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="currentColor" opacity="0.5"/>
          <path d="M2 5l2-2h5l2 2" fill="currentColor" opacity="0.7"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" fill="currentColor" opacity="0.3"/>
          <rect x="14" y="3" width="7" height="7" fill="currentColor" opacity="0.3"/>
          <rect x="3" y="14" width="7" height="7" fill="currentColor" opacity="0.3"/>
          <rect x="14" y="14" width="7" height="7" fill="currentColor" opacity="0.3"/>
          <rect x="4" y="4" width="5" height="5" fill="currentColor" opacity="0.6"/>
          <rect x="15" y="4" width="5" height="5" fill="currentColor" opacity="0.6"/>
          <rect x="4" y="15" width="5" height="5" fill="currentColor" opacity="0.6"/>
          <rect x="15" y="15" width="5" height="5" fill="currentColor" opacity="0.6"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4.5" fill="currentColor" opacity="0.3"/>
          <circle cx="8" cy="12" r="3" fill="currentColor" opacity="0.6"/>
          <rect x="8" y="8" width="10" height="8" rx="3" fill="currentColor" opacity="0.3"/>
          <rect x="9" y="9" width="8" height="6" rx="2" fill="currentColor" opacity="0.6"/>
          <rect x="11" y="6" width="2" height="3" rx="1" fill="currentColor"/>
          <rect x="13" y="8" width="2" height="3" rx="1" fill="currentColor"/>
          <rect x="15" y="16" width="2" height="3" rx="1" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
          <path d="M16 19L7 12L16 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
          <path d="M8 19l9-7-9-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4"/>
          <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4"/>
          <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4"/>
          <rect x="2" y="16" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="6,14 12,20 18,14" fill="currentColor" opacity="0.4"/>
          <polygon points="6,14 12,20 18,14" fill="currentColor" opacity="0.7"/>
          <polygon points="6,6 12,12 18,6" fill="currentColor" opacity="0.4"/>
          <polygon points="6,6 12,12 18,6" fill="currentColor" opacity="0.7"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,10 12,4 6,10" fill="currentColor" opacity="0.4"/>
          <polygon points="18,10 12,4 6,10" fill="currentColor" opacity="0.7"/>
          <polygon points="18,18 12,12 6,18" fill="currentColor" opacity="0.4"/>
          <polygon points="18,18 12,12 6,18" fill="currentColor" opacity="0.7"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <path d="M12 0v6m0 6v6M24 12h-6m-6 0H0M20.78 3.22l-4.24 4.24m0 3.54l4.24 4.24M3.22 20.78l4.24-4.24m0-3.54L3.22 3.22" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
                opacity="0.6"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <rect x="4" y="10" width="4" height="4" rx="1" fill="currentColor" opacity="0.3"/>
          <rect x="16" y="4" width="4" height="4" rx="1" fill="currentColor" opacity="0.4"/>
          <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
        </svg>
      )
    }
  },

  pixel: {
    name: 'Pixel',
    description: 'Iconos estilo pixel art con bordes definidos',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" fill="currentColor" opacity="0.1"/>
          <rect x="2" y="2" width="20" height="20" stroke="currentColor" strokeWidth="2"/>
          <rect x="9" y="9" width="6" height="6" fill="currentColor"/>
          <rect x="10" y="2" width="4" height="7" fill="currentColor"/>
          <rect x="10" y="15" width="4" height="7" fill="currentColor"/>
          <rect x="2" y="10" width="7" height="4" fill="currentColor"/>
          <rect x="15" y="10" width="7" height="4" fill="currentColor"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="6" width="20" height="16" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="2" y="6" width="20" height="16" stroke="currentColor" strokeWidth="2"/>
          <rect x="2" y="2" width="12" height="6" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
          <rect x="2" y="2" width="12" height="6" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="2" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
          <rect x="2" y="14" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="8" height="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
          <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="4" y="16" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="16" width="4" height="4" fill="currentColor"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="7" cy="12" r="3" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="10" y="6" width="3" height="3" fill="currentColor"/>
          <rect x="13" y="8" width="3" height="3" fill="currentColor"/>
          <rect x="15" y="16" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
          <rect x="13" y="8" width="3" height="3" fill="currentColor"/>
          <rect x="10" y="11" width="3" height="3" fill="currentColor"/>
          <rect x="13" y="14" width="3" height="3" fill="currentColor"/>
          <rect x="16" y="17" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
          <rect x="8" y="8" width="3" height="3" fill="currentColor"/>
          <rect x="11" y="11" width="3" height="3" fill="currentColor"/>
          <rect x="8" y="14" width="3" height="3" fill="currentColor"/>
          <rect x="5" y="17" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="4" width="20" height="4" fill="currentColor"/>
          <rect x="2" y="10" width="20" height="4" fill="currentColor"/>
          <rect x="2" y="16" width="20" height="4" fill="currentColor"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="13" width="3" height="3" fill="currentColor"/>
          <rect x="9" y="16" width="3" height="3" fill="currentColor"/>
          <rect x="12" y="19" width="3" height="3" fill="currentColor"/>
          <rect x="6" y="6" width="3" height="3" fill="currentColor"/>
          <rect x="9" y="9" width="3" height="3" fill="currentColor"/>
          <rect x="12" y="12" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="10" width="3" height="3" fill="currentColor"/>
          <rect x="12" y="7" width="3" height="3" fill="currentColor"/>
          <rect x="9" y="4" width="3" height="3" fill="currentColor"/>
          <rect x="15" y="18" width="3" height="3" fill="currentColor"/>
          <rect x="12" y="15" width="3" height="3" fill="currentColor"/>
          <rect x="9" y="12" width="3" height="3" fill="currentColor"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="1" width="4" height="6" fill="currentColor"/>
          <rect x="10" y="17" width="4" height="6" fill="currentColor"/>
          <rect x="1" y="10" width="6" height="4" fill="currentColor"/>
          <rect x="17" y="10" width="6" height="4" fill="currentColor"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="2" width="4" height="20" fill="currentColor" opacity="0.3"/>
          <rect x="10" y="10" width="10" height="4" fill="currentColor" opacity="0.3"/>
          <rect x="2" y="9" width="6" height="6" fill="currentColor"/>
          <rect x="16" y="3" width="6" height="6" fill="currentColor"/>
          <rect x="16" y="15" width="6" height="6" fill="currentColor"/>
        </svg>
      )
    }
  },

  glyphs: {
    name: 'Glyphs',
    description: 'Iconos modernos estilo Glyphs.fyi - limpios y bien balanceados',
    icons: {
      // Icono de nueva conexión - círculo con plus centrado
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      // Icono de nueva carpeta - carpeta moderna con solapa
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 0 .707.293H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          <path d="M3 7l2-2h4.586a1 1 0 0 1 .707.293l1.414 1.414" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      // Icono de nuevo grupo - desde Glyphs.fyi (adaptado a viewBox 24x24)
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.6 4.8C3.6 4.1373 4.1373 3.6 4.8 3.6H9.6C10.2627 3.6 10.8 4.1373 10.8 4.8V9.6C10.8 10.2627 10.2627 10.8 9.6 10.8H4.8C4.1373 10.8 3.6 10.2627 3.6 9.6V4.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.2 4.8C13.2 4.1373 13.7373 3.6 14.4 3.6H19.2C19.8627 3.6 20.4 4.1373 20.4 4.8V9.6C20.4 10.2627 19.8627 10.8 19.2 10.8H14.4C13.7373 10.8 13.2 10.2627 13.2 9.6V4.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.6 14.4C3.6 13.7373 4.1373 13.2 4.8 13.2H9.6C10.2627 13.2 10.8 13.7373 10.8 14.4V19.2C10.8 19.8627 10.2627 20.4 9.6 20.4H4.8C4.1373 20.4 3.6 19.8627 3.6 19.2V14.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20.3613 16.8H13.1613" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.7613 20.4L16.7613 13.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      // Icono de gestor de contraseñas - llave moderna
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8.5" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.5 12h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          <path d="M12 8.5v-2a2.5 2.5 0 0 1 5 0v2" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      // Icono de colapsar - chevron izquierdo
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      // Icono de expandir - chevron derecho
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      // Icono de menú - tres líneas horizontales
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      // Icono de expandir todo - dos chevrons hacia abajo
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      // Icono de colapsar todo - dos chevrons hacia arriba
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
      // Icono de configuración - engranaje moderno
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 1v3m0 16v3m11-11h-3m-16 0H1m18.364-8.364l-2.121 2.121M6.757 17.243l-2.121 2.121m14.728 0l-2.121-2.121M6.757 6.757L4.636 4.636" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  },

  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Estilo futurista con colores neón vibrantes y formas angulares',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="cyberGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <path d="M12 8v8M8 12h8" stroke="#f600ff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)"/>
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6h7l2-2h11v16H2V6z" stroke="#f600ff" strokeWidth="2" fill="#f600ff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <path d="M2 10h20" stroke="#00ffff" strokeWidth="1.5" filter="url(#cyberGlow)"/>
          <rect x="6" y="13" width="4" height="1" fill="#00ffff" filter="url(#cyberGlow)"/>
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <rect x="14" y="3" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <rect x="3" y="14" width="7" height="7" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <path d="M14 17h7M17.5 13.5v7" stroke="#f600ff" strokeWidth="2" filter="url(#cyberGlow)"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="5" stroke="#ffe600" strokeWidth="2" fill="#ffe600" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <path d="M13 12h7v4h-2M15 12v2" stroke="#ffe600" strokeWidth="2" strokeLinecap="square" filter="url(#cyberGlow)"/>
          <rect x="6" y="10" width="4" height="4" rx="1" fill="#ffe600" filter="url(#cyberGlow)"/>
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="#00ffff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)"/>
          <path d="M18 19l-7-7 7-7" stroke="#f600ff" strokeWidth="1" strokeLinecap="square" filter="url(#cyberGlow)" opacity="0.6"/>
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19l7-7-7-7" stroke="#00ffff" strokeWidth="2.5" strokeLinecap="square" filter="url(#cyberGlow)"/>
          <path d="M6 19l7-7-7-7" stroke="#f600ff" strokeWidth="1" strokeLinecap="square" filter="url(#cyberGlow)" opacity="0.6"/>
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)"/>
          <circle cx="3" cy="6" r="1.5" fill="#f600ff" filter="url(#cyberGlow)"/>
          <circle cx="3" cy="12" r="1.5" fill="#f600ff" filter="url(#cyberGlow)"/>
          <circle cx="3" cy="18" r="1.5" fill="#f600ff" filter="url(#cyberGlow)"/>
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9l6 6 6-6" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)"/>
          <path d="M6 4l6 6 6-6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)"/>
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 15l-6-6-6 6" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)"/>
          <path d="M18 20l-6-6-6 6" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)"/>
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="#00ffff" strokeWidth="2" fill="#00ffff" fillOpacity="0.1" filter="url(#cyberGlow)"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#f600ff" strokeWidth="1.5" filter="url(#cyberGlow)"/>
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4v16M12 12h8M4 12h8" stroke="#00ffff" strokeWidth="2" filter="url(#cyberGlow)"/>
          <rect x="16" y="10" width="4" height="4" fill="#f600ff" filter="url(#cyberGlow)"/>
          <rect x="2" y="10" width="4" height="4" fill="#f600ff" filter="url(#cyberGlow)"/>
        </svg>
      )
    }
  },

  glass: {
    name: 'Glassmorphism',
    description: 'Efecto de cristal traslúcido con desenfoque y bordes suaves',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 13h4M14 11v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="2" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M16 17h4M18 15v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M13 12h7M16 12v2M18.5 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
          <rect x="3" y="11" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
          <rect x="3" y="16" width="18" height="2" rx="1" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3.5" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6v12M8 12h8" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="4" width="16" height="16" rx="4" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.3)" />
        </svg>
      )
    }
  },

  vibrant: {
    name: 'Vibrante',
    description: 'Gradientes modernos y coloridos con altas saturaciones',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF3CAC" />
              <stop offset="52%" stopColor="#784BA0" />
              <stop offset="100%" stopColor="#2B86C5" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#vibrantGrad1)" strokeWidth="2.5" />
          <path d="M12 7v10M7 12h10" stroke="url(#vibrantGrad1)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00DBDE" />
              <stop offset="100%" stopColor="#FC00FF" />
            </linearGradient>
          </defs>
          <path d="M3 7a3 3 0 0 1 3-3h4l2 2h6a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7z" stroke="url(#vibrantGrad2)" strokeWidth="2.5" />
          <circle cx="15" cy="14" r="3" fill="url(#vibrantGrad2)" fillOpacity="0.2" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAD961" />
              <stop offset="100%" stopColor="#F76B1C" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="14" y="3" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="3" y="14" width="7" height="7" rx="2" stroke="url(#vibrantGrad3)" strokeWidth="2.5" />
          <rect x="14" y="14" width="7" height="7" rx="2" fill="url(#vibrantGrad3)" />
          <path d="M17.5 14v7M14 17.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vibrantGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#85FFBD" />
              <stop offset="100%" stopColor="#FFFB7D" />
            </linearGradient>
          </defs>
          <circle cx="8" cy="12" r="4.5" stroke="url(#vibrantGrad4)" strokeWidth="2.5" />
          <rect x="11" y="10" width="8" height="4" rx="2" fill="url(#vibrantGrad4)" />
          <path d="M14 9v2M16.5 9v2" stroke="#2D3436" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="url(#vibrantGrad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19l7-7-7-7" stroke="url(#vibrantGrad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
          <rect x="3" y="11" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
          <rect x="3" y="16" width="18" height="2.5" rx="1.25" fill="url(#vibrantGrad2)" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="url(#vibrantGrad3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="url(#vibrantGrad1)" strokeWidth="2.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="url(#vibrantGrad1)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M7 12h10" stroke="url(#vibrantGrad2)" strokeWidth="2.5" />
          <rect x="15" y="10" width="4" height="4" rx="1" fill="url(#vibrantGrad2)" />
          <rect x="5" y="10" width="4" height="4" rx="1" fill="url(#vibrantGrad2)" />
        </svg>
      )
    }
  },

  holographic: {
    name: 'Holográfico',
    description: 'Efecto iridiscente con gradientes cambiantes y brillos mágicos',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="holoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="50%" stopColor="#3a7bd5" />
              <stop offset="100%" stopColor="#00d2ff" />
            </linearGradient>
            <filter id="holoGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <path d="M12 7v10M7 12h10" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
          <circle cx="12" cy="12" r="4" fill="url(#holoGrad1)" fillOpacity="0.1" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <rect x="7" y="10" width="10" height="1" fill="url(#holoGrad1)" fillOpacity="0.5" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <rect x="9" y="10.5" width="9" height="3" rx="1.5" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <circle cx="15.5" cy="12" r="1" fill="url(#holoGrad1)" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="url(#holoGrad1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="url(#holoGrad1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5M7 6l5 5 5-5" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5M17 18l-5-5-5 5" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5" stroke="url(#holoGrad1)" strokeWidth="1.5" filter="url(#holoGlow)" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="url(#holoGrad1)" strokeWidth="2" strokeLinecap="round" filter="url(#holoGlow)" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="url(#holoGrad1)" strokeWidth="2" filter="url(#holoGlow)" />
        </svg>
      )
    }
  },

  glitch: {
    name: 'Glitch',
    description: 'Efecto de distorsión digital con aberración cromática',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.8">
            <circle cx="11.5" cy="11.5" r="9" stroke="#ff0000" strokeWidth="2" />
            <circle cx="12.5" cy="12.5" r="9" stroke="#00ffff" strokeWidth="2" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </g>
          <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
          <rect x="14" y="8" width="4" height="1" fill="#00ff00" opacity="0.5" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="#ff00ff" strokeWidth="2" transform="translate(-1, 0)" />
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
          <path d="M3 7h4l2-2h11v14H3V7z" stroke="currentColor" strokeWidth="2" />
          <rect x="15" y="12" width="5" height="1" fill="#ff0000" opacity="0.4" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="6" height="6" stroke="#ff0000" strokeWidth="1.5" />
          <rect x="14" y="4" width="6" height="6" stroke="#00ff00" strokeWidth="1.5" />
          <rect x="4" y="14" width="6" height="6" stroke="#0000ff" strokeWidth="1.5" />
          <rect x="14" y="14" width="6" height="6" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" stroke="#00ffff" strokeWidth="2" />
          <rect x="10" y="10" width="10" height="4" fill="#ff00ff" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 10v2M17 10v2" stroke="#00ff00" strokeWidth="2" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 0)" />
          <path d="M15 18l-6-6 6-6" stroke="#00ffff" strokeWidth="2.5" transform="translate(1, 0)" />
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 0)" />
          <path d="M9 18l6-6-6-6" stroke="#00ffff" strokeWidth="2.5" transform="translate(1, 0)" />
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18" stroke="#ff0000" strokeWidth="2.5" transform="translate(-1, 1)" />
          <path d="M3 12h18" stroke="#00ff00" strokeWidth="2.5" />
          <path d="M3 18h18" stroke="#0000ff" strokeWidth="2.5" transform="translate(1, -1)" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="#ff0000" strokeWidth="2.5" />
          <path d="M7 6l5 5 5-5" stroke="#00ffff" strokeWidth="2.5" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="#ff0000" strokeWidth="2.5" />
          <path d="M17 18l-5-5-5 5" stroke="#00ffff" strokeWidth="2.5" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#ff0000" strokeWidth="2" transform="translate(-1, 0)" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#00ffff" strokeWidth="2" transform="translate(1, 0)" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M12 8v8M8 12h8" stroke="#00ff00" strokeWidth="2" />
        </svg>
      )
    }
  },

  acrylic: {
    name: 'Acrylic',
    description: 'Efecto de cristal esmerilado con bordes suaves y traslúcido',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <path d="M12 7v10M7 12h10" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <rect x="7" y="10" width="10" height="1.5" rx="0.75" fill="#3a7bd5" opacity="0.6" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          <rect x="13" y="4" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          <rect x="4" y="13" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          <rect x="13" y="13" width="7" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <rect x="9" y="10" width="10" height="4" rx="2" fill="#3a7bd5" opacity="0.4" />
          <circle cx="15" cy="12" r="1" fill="white" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="16" height="2" rx="1" fill="white" opacity="0.5" />
          <rect x="4" y="11" width="16" height="2" rx="1" fill="white" opacity="0.8" />
          <rect x="4" y="16" width="16" height="2" rx="1" fill="white" opacity="0.5" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11l5 5 5-5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 13l-5-5-5 5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" opacity="0.8" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5l-4 4h8l-4-4z" fill="#00d2ff" opacity="0.8" />
          <path d="M12 19l-4-4h8l-4 4z" fill="#00d2ff" opacity="0.4" />
          <path d="M5 12h14" stroke="white" strokeWidth="1" opacity="0.5" />
        </svg>
      )
    }
  },

  neumorphic: {
    name: 'Neumórfico',
    description: 'Iconos suaves con relieve y sombras profundas estilo Neumorphism',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#e0e0e0" opacity="0.1" />
          <path d="M12 7v10M7 12h10" stroke="#748ffc" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="#e0e0e0" fillOpacity="0.1" stroke="#f06595" strokeWidth="2.5" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="7" height="7" rx="2" fill="#e0e0e0" fillOpacity="0.1" stroke="#63e6be" strokeWidth="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" fill="#e0e0e0" fillOpacity="0.1" stroke="#63e6be" strokeWidth="2" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="12" r="4" stroke="#ffd43b" strokeWidth="2.5" />
          <path d="M12 11h8" stroke="#ffd43b" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M8 12l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M8 12l4-4 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
      )
    }
  },

  fluent: {
    name: 'Fluent',
    description: 'Estilo inspirado en Microsoft Fluent con colores suaves y profundidad',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="4" fill="#0078d4" fillOpacity="0.2" />
          <path d="M12 8v8M8 12h8" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="#ffb900" fillOpacity="0.2" stroke="#ffb900" strokeWidth="1.5" />
          <path d="M4 10h16" stroke="#ffb900" strokeWidth="1" opacity="0.5" />
        </svg>
      ),
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="4" fill="#107c10" fillOpacity="0.2" stroke="#107c10" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="4" fill="#107c10" fillOpacity="0.2" stroke="#107c10" strokeWidth="1.5" />
        </svg>
      ),
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="#d83b01" strokeWidth="2" />
          <rect x="11" y="11" width="2" height="6" rx="1" fill="#d83b01" />
        </svg>
      ),
      collapseLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 6l-6 6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      expandRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      menu: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 8h16M4 12h16M4 16h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      expandAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6l5 5 5-5" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      ),
      collapseAll: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 14l-5-5-5 5" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 18l-5-5-5 5" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      ),
      settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      treeTheme: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#0078d4" fillOpacity="0.1" stroke="#0078d4" strokeWidth="1.5" />
          <path d="M12 6v12M6 12h12" stroke="#0078d4" strokeWidth="1" opacity="0.3" />
        </svg>
      )
    }
  }
};

/**
 * Obtiene el tema de iconos de acción por defecto
 */
/** Icono de nueva nota para la barra de la sidebar (fallback si el tema no define newDocument). */
export const newDocumentToolbarIcon = sessionActionIconThemes.modern.icons.newDocument;

export const getDefaultSessionActionIconTheme = () => {
  try {
    return localStorage.getItem('sessionActionIconTheme') || 'modern';
  } catch {
    return 'modern';
  }
};

/**
 * Guarda el tema de iconos de acción seleccionado
 */
export const setSessionActionIconTheme = (theme) => {
  try {
    localStorage.setItem('sessionActionIconTheme', theme);
  } catch (error) {
    console.error('Error guardando tema de iconos de acción:', error);
  }
};

