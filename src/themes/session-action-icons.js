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
      // Icono de nueva conexión (organigrama)
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
          {/* Nodo raíz */}
          <rect x="10" y="2" width="4" height="4" rx="1" fill="url(#modernConnectionGrad)" filter="url(#modernShadow)"/>
          {/* Línea vertical */}
          <line x1="12" y1="6" x2="12" y2="9" stroke="url(#modernConnectionGrad)" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Línea horizontal */}
          <line x1="12" y1="9" x2="12" y2="9" stroke="url(#modernConnectionGrad)" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Nodos hijos */}
          <rect x="3" y="12" width="4" height="4" rx="1" fill="url(#modernConnectionGrad)" opacity="0.8" filter="url(#modernShadow)"/>
          <rect x="10" y="12" width="4" height="4" rx="1" fill="url(#modernConnectionGrad)" opacity="0.8" filter="url(#modernShadow)"/>
          <rect x="17" y="12" width="4" height="4" rx="1" fill="url(#modernConnectionGrad)" opacity="0.8" filter="url(#modernShadow)"/>
          {/* Líneas de conexión */}
          <line x1="12" y1="9" x2="5" y2="12" stroke="url(#modernConnectionGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
          <line x1="12" y1="9" x2="12" y2="12" stroke="url(#modernConnectionGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
          <line x1="12" y1="9" x2="19" y2="12" stroke="url(#modernConnectionGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
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
      )
    }
  },
  
  minimal: {
    name: 'Minimalista',
    description: 'Iconos minimalistas con líneas limpias',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="12" y1="7" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="10" x2="5" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="10" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="5" cy="17" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="19" cy="17" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
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
      )
    }
  },
  
  classic: {
    name: 'Clásico',
    description: 'Iconos clásicos estilo PrimeIcons',
    icons: {
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4z" fill="currentColor"/>
          <path d="M5 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z" fill="currentColor"/>
          <path d="M15 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" fill="currentColor"/>
          <path d="M12 18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2z" fill="currentColor"/>
          <line x1="12" y1="8" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="8" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="14" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="16" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5"/>
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
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"/>
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
          <circle cx="12" cy="5" r="2" fill="url(#neonConnectionGrad)" filter="url(#neonGlow)"/>
          <line x1="12" y1="7" x2="12" y2="10" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
          <line x1="12" y1="10" x2="5" y2="14" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
          <line x1="12" y1="10" x2="12" y2="14" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
          <line x1="12" y1="10" x2="19" y2="14" stroke="url(#neonConnectionGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow)"/>
          <circle cx="5" cy="17" r="2" fill="url(#neonConnectionGrad)" filter="url(#neonGlow)"/>
          <circle cx="12" cy="17" r="2" fill="url(#neonConnectionGrad)" filter="url(#neonGlow)"/>
          <circle cx="19" cy="17" r="2" fill="url(#neonConnectionGrad)" filter="url(#neonGlow)"/>
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
          <defs>
            <linearGradient id="neonMenuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
            <filter id="neonMenuGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <line x1="3" y1="6" x2="21" y2="6" stroke="url(#neonMenuGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonMenuGlow)"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="url(#neonMenuGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonMenuGlow)"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="url(#neonMenuGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#neonMenuGlow)"/>
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
      )
    }
  },
  
  outline: {
    name: 'Outline',
    description: 'Iconos outline minimalistas con estilo lineal',
    icons: {
      // Icono de nueva conexión (servidor con conexión)
      newConnection: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Servidor */}
          <rect x="5" y="4" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Indicadores de estado */}
          <circle cx="10" cy="6" r="0.8" fill="currentColor"/>
          <circle cx="12.5" cy="6" r="0.8" fill="currentColor"/>
          {/* Conexión - líneas que salen del servidor */}
          <line x1="12" y1="16" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="19" x2="16" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="19" x2="6" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="16" y1="19" x2="18" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de nueva carpeta (carpeta con lupa superpuesta en la parte frontal)
      newFolder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Carpeta estándar */}
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          <path d="M3 7l2-2h4l2 2" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"/>
          {/* Lupa superpuesta en la parte frontal de la carpeta */}
          <circle cx="14.5" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <line x1="16.5" y1="12.5" x2="18" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      // Icono de nuevo grupo (cuadrícula 3x3 de 9 cuadrados pequeños rellenos)
      newGroup: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cuadrícula 3x3 - 9 cuadrados pequeños rellenos */}
          <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="4" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="4" y="16" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="16" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="16" width="4" height="4" fill="currentColor"/>
        </svg>
      ),
      // Icono de gestor de contraseñas (llave)
      passwordManager: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <rect x="9" y="10" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <rect x="12" y="8" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="14" y="9" width="1.5" height="2" rx="0.75" fill="currentColor"/>
          <rect x="15.5" y="14" width="1.5" height="2" rx="0.75" fill="currentColor"/>
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
      )
    }
  }
};

/**
 * Obtiene el tema de iconos de acción por defecto
 */
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

