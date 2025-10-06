import React from 'react';

/**
 * Colección de iconos para grupos de pestañas.
 * Estos iconos se integran perfectamente con los temas de la aplicación
 * usando variables CSS del tema activo.
 */
export const groupTabIcons = {
  // === ICONOS PRINCIPALES DE GRUPOS ===
  
  groupGrid: {
    name: 'Grupos Cuadrícula',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupGrid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Cuadrícula de grupos */}
        <rect x="15" y="15" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2"/>
        <rect x="45" y="15" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2"/>
        <rect x="15" y="45" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2"/>
        <rect x="45" y="45" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2"/>
        
        {/* Puntos centrales */}
        <circle cx="27.5" cy="27.5" r="3" fill="url(#g_groupGrid)"/>
        <circle cx="57.5" cy="27.5" r="3" fill="url(#g_groupGrid)"/>
        <circle cx="27.5" cy="57.5" r="3" fill="url(#g_groupGrid)"/>
        <circle cx="57.5" cy="57.5" r="3" fill="url(#g_groupGrid)"/>
      </svg>
    )
  },

  groupLayers: {
    name: 'Grupos Capas',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupLayers" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Capas superpuestas */}
        <rect x="20" y="30" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5" opacity="0.8"/>
        <rect x="25" y="25" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5" opacity="0.9"/>
        <rect x="30" y="20" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5"/>
        
        {/* Iconos de grupo en cada capa */}
        <circle cx="50" cy="35" r="4" fill="url(#g_groupLayers)"/>
        <circle cx="55" cy="40" r="4" fill="url(#g_groupLayers)"/>
        <circle cx="60" cy="45" r="4" fill="url(#g_groupLayers)"/>
      </svg>
    )
  },

  groupNetwork: {
    name: 'Grupos Red',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupNetwork" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Nodos de red */}
        <circle cx="30" cy="30" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3"/>
        <circle cx="70" cy="30" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3"/>
        <circle cx="30" cy="70" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3"/>
        <circle cx="70" cy="70" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3"/>
        <circle cx="50" cy="50" r="10" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupNetwork)" strokeWidth="3"/>
        
        {/* Conexiones */}
        <line x1="30" y1="30" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2"/>
        <line x1="70" y1="30" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2"/>
        <line x1="30" y1="70" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2"/>
        <line x1="70" y1="70" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2"/>
        
        {/* Puntos centrales */}
        <circle cx="30" cy="30" r="3" fill="url(#g_groupNetwork)"/>
        <circle cx="70" cy="30" r="3" fill="url(#g_groupNetwork)"/>
        <circle cx="30" cy="70" r="3" fill="url(#g_groupNetwork)"/>
        <circle cx="70" cy="70" r="3" fill="url(#g_groupNetwork)"/>
        <circle cx="50" cy="50" r="4" fill="url(#g_groupNetwork)"/>
      </svg>
    )
  },

  groupFolders: {
    name: 'Grupos Carpetas',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupFolders" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Carpetas agrupadas */}
        <path d="M20 35 L20 75 L35 75 L40 65 L60 65 L65 75 L80 75 L80 35 L20 35 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5"/>
        <path d="M25 30 L25 70 L30 70 L35 60 L55 60 L60 70 L75 70 L75 30 L25 30 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5" opacity="0.8"/>
        <path d="M30 25 L30 65 L35 65 L40 55 L60 55 L65 65 L70 65 L70 25 L30 25 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5" opacity="0.6"/>
        
        {/* Iconos de grupo en las carpetas */}
        <circle cx="35" cy="50" r="3" fill="url(#g_groupFolders)"/>
        <circle cx="50" cy="50" r="3" fill="url(#g_groupFolders)"/>
        <circle cx="65" cy="50" r="3" fill="url(#g_groupFolders)"/>
      </svg>
    )
  },

  groupTabs: {
    name: 'Grupos Pestañas',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupTabs" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Pestañas agrupadas */}
        <rect x="15" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        <rect x="40" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        <rect x="65" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        
        {/* Pestañas superiores */}
        <path d="M15 40 L20 30 L35 30 L40 40" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        <path d="M40 40 L45 30 L60 30 L65 40" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        <path d="M65 40 L70 30 L85 30 L90 40" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupTabs)" strokeWidth="2"/>
        
        {/* Iconos en las pestañas */}
        <circle cx="27.5" cy="50" r="2" fill="url(#g_groupTabs)"/>
        <circle cx="52.5" cy="50" r="2" fill="url(#g_groupTabs)"/>
        <circle cx="77.5" cy="50" r="2" fill="url(#g_groupTabs)"/>
      </svg>
    )
  },

  groupCollection: {
    name: 'Colección Grupos',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupCollection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Contenedor principal */}
        <rect x="10" y="20" width="80" height="60" rx="6" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupCollection)" strokeWidth="3"/>
        
        {/* Elementos del grupo */}
        <rect x="20" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        <rect x="40" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        <rect x="60" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        
        <rect x="20" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        <rect x="40" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        <rect x="60" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2"/>
        
        {/* Puntos centrales */}
        <circle cx="27.5" cy="37.5" r="2" fill="url(#g_groupCollection)"/>
        <circle cx="47.5" cy="37.5" r="2" fill="url(#g_groupCollection)"/>
        <circle cx="67.5" cy="37.5" r="2" fill="url(#g_groupCollection)"/>
        <circle cx="27.5" cy="57.5" r="2" fill="url(#g_groupCollection)"/>
        <circle cx="47.5" cy="57.5" r="2" fill="url(#g_groupCollection)"/>
        <circle cx="67.5" cy="57.5" r="2" fill="url(#g_groupCollection)"/>
      </svg>
    )
  },

  groupMatrix: {
    name: 'Grupos Matrix',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupMatrix" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Matriz de grupos */}
        <rect x="15" y="15" width="70" height="70" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupMatrix)" strokeWidth="2.5"/>
        
        {/* Líneas de la matriz */}
        <line x1="35" y1="15" x2="35" y2="85" stroke="url(#g_groupMatrix)" strokeWidth="1.5"/>
        <line x1="55" y1="15" x2="55" y2="85" stroke="url(#g_groupMatrix)" strokeWidth="1.5"/>
        <line x1="15" y1="35" x2="85" y2="35" stroke="url(#g_groupMatrix)" strokeWidth="1.5"/>
        <line x1="15" y1="55" x2="85" y2="55" stroke="url(#g_groupMatrix)" strokeWidth="1.5"/>
        
        {/* Elementos en cada celda */}
        <circle cx="25" cy="25" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="45" cy="25" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="65" cy="25" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="25" cy="45" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="45" cy="45" r="4" fill="url(#g_groupMatrix)"/>
        <circle cx="65" cy="45" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="25" cy="65" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="45" cy="65" r="3" fill="url(#g_groupMatrix)"/>
        <circle cx="65" cy="65" r="3" fill="url(#g_groupMatrix)"/>
      </svg>
    )
  },

  groupHexagon: {
    name: 'Grupos Hexágono',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupHexagon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Hexágonos agrupados */}
        <path d="M50 15 L70 25 L70 45 L50 55 L30 45 L30 25 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupHexagon)" strokeWidth="2.5"/>
        <path d="M50 25 L65 32 L65 48 L50 55 L35 48 L35 32 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupHexagon)" strokeWidth="2.5" opacity="0.8"/>
        <path d="M50 35 L60 40 L60 50 L50 55 L40 50 L40 40 Z" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupHexagon)" strokeWidth="2.5"/>
        
        {/* Puntos centrales */}
        <circle cx="50" cy="35" r="3" fill="url(#g_groupHexagon)"/>
        <circle cx="50" cy="45" r="3" fill="url(#g_groupHexagon)"/>
        <circle cx="50" cy="50" r="4" fill="url(#g_groupHexagon)"/>
      </svg>
    )
  },

  // === ICONOS ALTERNATIVOS ===

  groupCircle: {
    name: 'Grupos Círculo',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupCircle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Círculos concéntricos */}
        <circle cx="50" cy="50" r="35" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupCircle)" strokeWidth="3"/>
        <circle cx="50" cy="50" r="25" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCircle)" strokeWidth="2.5"/>
        <circle cx="50" cy="50" r="15" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupCircle)" strokeWidth="2"/>
        
        {/* Puntos en el centro */}
        <circle cx="50" cy="50" r="5" fill="url(#g_groupCircle)"/>
        <circle cx="40" cy="40" r="2" fill="url(#g_groupCircle)"/>
        <circle cx="60" cy="40" r="2" fill="url(#g_groupCircle)"/>
        <circle cx="40" cy="60" r="2" fill="url(#g_groupCircle)"/>
        <circle cx="60" cy="60" r="2" fill="url(#g_groupCircle)"/>
      </svg>
    )
  },

  groupSquare: {
    name: 'Grupos Cuadrado',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupSquare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Cuadrados anidados */}
        <rect x="15" y="15" width="70" height="70" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupSquare)" strokeWidth="3"/>
        <rect x="25" y="25" width="50" height="50" rx="3" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupSquare)" strokeWidth="2.5"/>
        <rect x="35" y="35" width="30" height="30" rx="2" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupSquare)" strokeWidth="2"/>
        
        {/* Puntos en las esquinas */}
        <circle cx="30" cy="30" r="3" fill="url(#g_groupSquare)"/>
        <circle cx="70" cy="30" r="3" fill="url(#g_groupSquare)"/>
        <circle cx="30" cy="70" r="3" fill="url(#g_groupSquare)"/>
        <circle cx="70" cy="70" r="3" fill="url(#g_groupSquare)"/>
        <circle cx="50" cy="50" r="4" fill="url(#g_groupSquare)"/>
      </svg>
    )
  },

  groupDiamond: {
    name: 'Grupos Diamante',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupDiamond" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
        </defs>
        {/* Diamantes anidados */}
        <path d="M50 10 L80 50 L50 90 L20 50 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupDiamond)" strokeWidth="3"/>
        <path d="M50 20 L70 50 L50 80 L30 50 Z" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupDiamond)" strokeWidth="2.5"/>
        <path d="M50 30 L60 50 L50 70 L40 50 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupDiamond)" strokeWidth="2"/>
        
        {/* Puntos centrales */}
        <circle cx="50" cy="50" r="4" fill="url(#g_groupDiamond)"/>
        <circle cx="45" cy="45" r="2" fill="url(#g_groupDiamond)"/>
        <circle cx="55" cy="45" r="2" fill="url(#g_groupDiamond)"/>
        <circle cx="45" cy="55" r="2" fill="url(#g_groupDiamond)"/>
        <circle cx="55" cy="55" r="2" fill="url(#g_groupDiamond)"/>
      </svg>
    )
  }
};

/**
 * Obtiene el icono de grupos desde localStorage o devuelve el predeterminado
 */
export function getGroupTabIcon(size = 20) {
  const savedIcon = localStorage.getItem('group_tab_icon') || 'groupGrid';
  const iconData = groupTabIcons[savedIcon] || groupTabIcons.groupGrid;
  
  return iconData.icon(size);
}

/**
 * Guarda la preferencia de icono de grupos en localStorage
 */
export function setGroupTabIcon(iconKey) {
  localStorage.setItem('group_tab_icon', iconKey);
  // Disparar evento para que otros componentes se actualicen
  window.dispatchEvent(new Event('group-icon-changed'));
}
