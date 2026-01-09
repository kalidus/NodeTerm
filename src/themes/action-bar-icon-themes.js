import React from 'react';

/**
 * Colección de temas de iconos para la barra de acciones de la página de inicio.
 * Cada tema define un conjunto completo de iconos SVG para las acciones disponibles.
 */

// Iconos del tema Nodeterm (tema por defecto - iconos actuales)
const nodetermIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={color} opacity="0.9"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={color} opacity="0.7"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={color} opacity="0.7"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={color} opacity="0.5"/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Tres monitores conectados */}
      <rect x="2" y="4" width="6" height="5" rx="0.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <line x1="5" y1="9" x2="5" y2="11" stroke={color} strokeWidth="1"/>
      <line x1="3" y1="11" x2="7" y2="11" stroke={color} strokeWidth="1"/>
      
      <rect x="9" y="4" width="6" height="5" rx="0.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <line x1="12" y1="9" x2="12" y2="11" stroke={color} strokeWidth="1"/>
      <line x1="10" y1="11" x2="14" y2="11" stroke={color} strokeWidth="1"/>
      
      <rect x="16" y="4" width="6" height="5" rx="0.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <line x1="19" y1="9" x2="19" y2="11" stroke={color} strokeWidth="1"/>
      <line x1="17" y1="11" x2="21" y2="11" stroke={color} strokeWidth="1"/>
      
      {/* Líneas de conexión */}
      <path d="M5 14 L12 17 L19 14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="19" r="2" stroke={color} strokeWidth="1.2" fill="none"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Llave */}
      <circle cx="8" cy="8" r="4" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="8" r="1.5" fill={color}/>
      <line x1="11" y1="11" x2="20" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="16" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="18" x2="20" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Círculo de grabación */}
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* Triángulo de play */}
      <path d="M10 8 L10 16 L16 12 Z" fill={color}/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Señales de red */}
      <path d="M12 20 L12 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 16 Q12 12 16 16" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M5 13 Q12 6 19 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M2 10 Q12 0 22 10" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Sliders horizontales */}
      <line x1="4" y1="6" x2="20" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="2" fill={color}/>
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="12" r="2" fill={color}/>
      <line x1="4" y1="18" x2="20" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="18" r="2" fill={color}/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M8 10 L11 12 L8 14" fill={color}/>
      <line x1="14" y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Barra de estado minimalista */}
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.2" fill="none"/>
      {/* Barras de estadísticas */}
      <rect x="5" y="12" width="2" height="5" fill={color}/>
      <rect x="8" y="10" width="2" height="7" fill={color}/>
      <rect x="11" y="8" width="2" height="9" fill={color}/>
      <rect x="14" y="11" width="2" height="6" fill={color}/>
      <rect x="17" y="13" width="2" height="4" fill={color}/>
    </svg>
  )
};

// Iconos del tema Minimal (iconos simples y limpios)
const minimalIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="6" stroke={color} strokeWidth="1.5" fill="none"/>
      <rect x="14" y="4" width="6" height="6" stroke={color} strokeWidth="1.5" fill="none"/>
      <rect x="4" y="14" width="6" height="6" stroke={color} strokeWidth="1.5" fill="none"/>
      <rect x="14" y="14" width="6" height="6" stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="5" cy="19" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="19" cy="19" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="8" x2="7" y2="16" stroke={color} strokeWidth="1.5"/>
      <line x1="12" y1="8" x2="17" y2="16" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M8 11 L8 8 C8 5 10 3 12 3 C14 3 16 5 16 8 L16 11" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="16" r="1.5" fill={color}/>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="1.5"/>
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12 M4.93 4.93 L7.76 7.76 M16.24 16.24 L19.07 19.07 M4.93 19.07 L7.76 16.24 M16.24 7.76 L19.07 4.93" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="1" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M8 10 L11 12.5 L8 15" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="13" y1="15" x2="16" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="17" width="18" height="3" rx="1" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="6" cy="18.5" r="1" fill={color}/>
      <line x1="9" y1="18.5" x2="18" y2="18.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
};

// Iconos del tema Neon (iconos brillantes con efectos de neón)
const neonIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_nuevo">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="none" filter="url(#neonGlow_nuevo)"/>
      <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2.5" strokeLinecap="round" filter="url(#neonGlow_nuevo)"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" filter="url(#neonGlow_nuevo)"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_grupo">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.3" filter="url(#neonGlow_grupo)"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2" filter="url(#neonGlow_grupo)"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2" filter="url(#neonGlow_grupo)"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.1" filter="url(#neonGlow_grupo)"/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_conex">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="5" r="3" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.3" filter="url(#neonGlow_conex)"/>
      <circle cx="5" cy="18" r="3" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.3" filter="url(#neonGlow_conex)"/>
      <circle cx="19" cy="18" r="3" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.3" filter="url(#neonGlow_conex)"/>
      <line x1="12" y1="8" x2="7" y2="15" stroke={color} strokeWidth="1.5" filter="url(#neonGlow_conex)"/>
      <line x1="12" y1="8" x2="17" y2="15" stroke={color} strokeWidth="1.5" filter="url(#neonGlow_conex)"/>
      <line x1="8" y1="18" x2="16" y2="18" stroke={color} strokeWidth="1.5" filter="url(#neonGlow_conex)"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_pass">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.15" filter="url(#neonGlow_pass)"/>
      <path d="M8 11 L8 8 C8 5.5 9.5 4 12 4 C14.5 4 16 5.5 16 8 L16 11" stroke={color} strokeWidth="1.5" fill="none" filter="url(#neonGlow_pass)"/>
      <circle cx="12" cy="16" r="2" fill={color} filter="url(#neonGlow_pass)"/>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_audit">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.1" filter="url(#neonGlow_audit)"/>
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1" fill="none" filter="url(#neonGlow_audit)"/>
      <circle cx="12" cy="12" r="2" fill={color} filter="url(#neonGlow_audit)"/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_net">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="19" r="2" fill={color} filter="url(#neonGlow_net)"/>
      <path d="M7 15 Q12 11 17 15" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#neonGlow_net)"/>
      <path d="M4 11 Q12 4 20 11" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#neonGlow_net)"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_config">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.3" filter="url(#neonGlow_config)"/>
      <path d="M12 1 L12 5 M12 19 L12 23 M1 12 L5 12 M19 12 L23 12" stroke={color} strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow_config)"/>
      <path d="M4.22 4.22 L7.05 7.05 M16.95 16.95 L19.78 19.78 M4.22 19.78 L7.05 16.95 M16.95 7.05 L19.78 4.22" stroke={color} strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow_config)"/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_term">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.1" filter="url(#neonGlow_term)"/>
      <path d="M7 9 L10 12 L7 15" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlow_term)"/>
      <line x1="12" y1="15" x2="17" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" filter="url(#neonGlow_term)"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <filter id="neonGlow_status">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="2" y="16" width="20" height="5" rx="1" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.15" filter="url(#neonGlow_status)"/>
      <rect x="4" y="13" width="3" height="3" fill={color} filter="url(#neonGlow_status)"/>
      <rect x="8" y="10" width="3" height="6" fill={color} filter="url(#neonGlow_status)"/>
      <rect x="12" y="7" width="3" height="9" fill={color} filter="url(#neonGlow_status)"/>
      <rect x="16" y="11" width="3" height="5" fill={color} filter="url(#neonGlow_status)"/>
    </svg>
  )
};

// Iconos del tema Flat (iconos planos con colores sólidos)
const flatIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="3" fill={color}/>
      <line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={color}/>
      <rect x="13" y="3" width="8" height="8" rx="2" fill={color} opacity="0.7"/>
      <rect x="3" y="13" width="8" height="8" rx="2" fill={color} opacity="0.7"/>
      <rect x="13" y="13" width="8" height="8" rx="2" fill={color} opacity="0.5"/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="4" fill={color}/>
      <circle cx="5" cy="19" r="4" fill={color}/>
      <circle cx="19" cy="19" r="4" fill={color}/>
      <path d="M12 9 L5 15 M12 9 L19 15 M9 19 L15 19" stroke={color} strokeWidth="2"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="12" rx="2" fill={color}/>
      <rect x="7" y="5" width="10" height="8" rx="5" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="12" cy="16" r="2" fill="white"/>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" fill={color}/>
      <line x1="7" y1="8" x2="17" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="7" y1="12" x2="15" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="7" y1="16" x2="12" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color}/>
      <circle cx="12" cy="17" r="2" fill="white"/>
      <path d="M7 12 Q12 8 17 12" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M4 8 Q12 2 20 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 15 C13.6569 15 15 13.6569 15 12 C15 10.3431 13.6569 9 12 9 C10.3431 9 9 10.3431 9 12 C9 13.6569 10.3431 15 12 15 Z" fill={color}/>
      <path d="M19.4 15 C19.2669 15.3016 19.2272 15.6362 19.286 15.9606 C19.3448 16.285 19.4995 16.5843 19.73 16.82 L19.79 16.88 C19.976 17.0657 20.1235 17.2863 20.2241 17.5291 C20.3248 17.7719 20.3766 18.0322 20.3766 18.295 C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609 C20.1235 19.3037 19.976 19.5243 19.79 19.71 C19.6043 19.896 19.3837 20.0435 19.1409 20.1441 C18.8981 20.2448 18.6378 20.2966 18.375 20.2966 C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441 C17.3663 20.0435 17.1457 19.896 16.96 19.71 L16.9 19.65 C16.6643 19.4195 16.365 19.2648 16.0406 19.206 C15.7162 19.1472 15.3816 19.1869 15.08 19.32 C14.7842 19.4468 14.532 19.6572 14.3543 19.9255 C14.1766 20.1938 14.0813 20.5082 14.08 20.83 L14.08 21 C14.08 21.5304 13.8693 22.0391 13.4942 22.4142 C13.1191 22.7893 12.6104 23 12.08 23 C11.5496 23 11.0409 22.7893 10.6658 22.4142 C10.2907 22.0391 10.08 21.5304 10.08 21 L10.08 20.91 C10.0723 20.579 9.96512 20.258 9.77251 19.9887 C9.5799 19.7194 9.31074 19.5143 9 19.4 C8.69838 19.2669 8.36381 19.2272 8.03941 19.286 C7.71502 19.3448 7.41568 19.4995 7.18 19.73 L7.12 19.79 C6.93425 19.976 6.71368 20.1235 6.47088 20.2241 C6.22808 20.3248 5.96783 20.3766 5.705 20.3766 C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241 C4.69632 20.1235 4.47575 19.976 4.29 19.79 C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409 C3.75523 18.8981 3.70343 18.6378 3.70343 18.375 C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091 C3.95653 17.3663 4.10405 17.1457 4.29 16.96 L4.35 16.9 C4.58054 16.6643 4.73519 16.365 4.794 16.0406 C4.85282 15.7162 4.81312 15.3816 4.68 15.08 C4.55324 14.7842 4.34276 14.532 4.07447 14.3543 C3.80618 14.1766 3.49179 14.0813 3.17 14.08 L3 14.08 C2.46957 14.08 1.96086 13.8693 1.58579 13.4942 C1.21071 13.1191 1 12.6104 1 12.08 C1 11.5496 1.21071 11.0409 1.58579 10.6658 C1.96086 10.2907 2.46957 10.08 3 10.08 L3.09 10.08 C3.42099 10.0723 3.742 9.96512 4.0113 9.77251 C4.28059 9.5799 4.48572 9.31074 4.6 9 C4.73312 8.69838 4.77282 8.36381 4.714 8.03941 C4.65519 7.71502 4.50054 7.41568 4.27 7.18 L4.21 7.12 C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088 C3.67523 6.22808 3.62343 5.96783 3.62343 5.705 C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912 C3.87653 4.69632 4.02405 4.47575 4.21 4.29 C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588 C5.10192 3.75523 5.36217 3.70343 5.625 3.70343 C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588 C6.63368 3.95653 6.85425 4.10405 7.04 4.29 L7.1 4.35 C7.33568 4.58054 7.63502 4.73519 7.95941 4.794 C8.28381 4.85282 8.61838 4.81312 8.92 4.68 L9 4.68 C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447 C9.90337 3.80618 9.99872 3.49179 10 3.17 L10 3 C10 2.46957 10.2107 1.96086 10.5858 1.58579 C10.9609 1.21071 11.4696 1 12 1 C12.5304 1 13.0391 1.21071 13.4142 1.58579 C13.7893 1.96086 14 2.46957 14 3 L14 3.09 C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447 C14.452 4.26276 14.7042 4.47324 15 4.6 C15.3016 4.73312 15.6362 4.77282 15.9606 4.714 C16.285 4.65519 16.5843 4.50054 16.82 4.27 L16.88 4.21 C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588 C17.7719 3.67523 18.0322 3.62343 18.295 3.62343 C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588 C19.3037 3.87653 19.5243 4.02405 19.71 4.21 C19.896 4.39575 20.0435 4.61632 20.1441 4.85912 C20.2448 5.10192 20.2966 5.36217 20.2966 5.625 C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088 C20.0435 6.63368 19.896 6.85425 19.71 7.04 L19.65 7.1 C19.4195 7.33568 19.2648 7.63502 19.206 7.95941 C19.1472 8.28381 19.1869 8.61838 19.32 8.92 L19.32 9 C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569 C20.1938 9.90337 20.5082 9.99872 20.83 10 L21 10 C21.5304 10 22.0391 10.2107 22.4142 10.5858 C22.7893 10.9609 23 11.4696 23 12 C23 12.5304 22.7893 13.0391 22.4142 13.4142 C22.0391 13.7893 21.5304 14 21 14 L20.91 14 C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743 C19.7372 14.452 19.5268 14.7042 19.4 15 Z" stroke={color} strokeWidth="2" fill="none"/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" fill={color}/>
      <path d="M6 9 L10 12 L6 15" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="15" x2="18" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="15" width="20" height="6" rx="1" fill={color}/>
      <rect x="4" y="17" width="2" height="2" rx="0.5" fill="white"/>
      <rect x="8" y="17" width="12" height="2" rx="0.5" fill="white" opacity="0.7"/>
    </svg>
  )
};

// Iconos del tema Outline (iconos solo con contorno)
const outlineIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="3" stroke={color} strokeWidth="1.5"/>
      <circle cx="5" cy="19" r="3" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="19" r="3" stroke={color} strokeWidth="1.5"/>
      <line x1="10" y1="7.5" x2="6.5" y2="16.5" stroke={color} strokeWidth="1.5"/>
      <line x1="14" y1="7.5" x2="17.5" y2="16.5" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M8 11 L8 8 C8 5.5 9.8 4 12 4 C14.2 4 16 5.5 16 8 L16 11" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="16" r="1.5" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14,2 14,8 20,8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="14" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.55C5 11.7 5.42 10.85 6.24 10.5C6.75 10.27 7.29 10.16 7.84 10.16H8.93C9.03 10.16 9.13 10.18 9.22 10.21C9.88 10.4 10.5 10.67 11.06 11C11.14 11.05 11.22 11.11 11.3 11.16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 12.55C19 11.7 18.58 10.85 17.76 10.5C17.25 10.27 16.71 10.16 16.16 10.16H15.07C14.97 10.16 14.87 10.18 14.78 10.21C14.12 10.4 13.5 10.67 12.94 11C12.86 11.05 12.78 11.11 12.7 11.16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19V15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8Z" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
      <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74493 20.1656 6.23584 20.3766 5.705 20.3766C5.17416 20.3766 4.66507 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95233 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87233 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74493 3.62343 6.23584 3.62343 5.705C3.62343 5.17416 3.83445 4.66507 4.21 4.29C4.58507 3.91445 5.09416 3.70343 5.625 3.70343C6.15584 3.70343 6.66493 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95233 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87233 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58507 20.2966 5.09416 20.2966 5.625C20.2966 6.15584 20.0856 6.66493 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M7 9L10 12L7 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="13" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="16" width="20" height="5" rx="1" stroke={color} strokeWidth="1.5"/>
      <line x1="5" y1="18.5" x2="7" y2="18.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="18.5" x2="19" y2="18.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
};

// Iconos del tema Original (exactamente como están en NodeTermStatus.js)
const originalIcons = {
  nuevo: (size = 20, color = '#22c55e') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pi pi-plus-circle replicado */}
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
      <line x1="12" y1="7" x2="12" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  grupo: (size = 20, color = '#ff9800') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pi pi-th-large replicado */}
      <rect x="3" y="3" width="8" height="8" rx="1" fill={color}/>
      <rect x="13" y="3" width="8" height="8" rx="1" fill={color}/>
      <rect x="3" y="13" width="8" height="8" rx="1" fill={color}/>
      <rect x="13" y="13" width="8" height="8" rx="1" fill={color}/>
    </svg>
  ),
  conexiones: (size = 20, color = '#64C8FF') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}>
      {/* Red de nodos interconectados - exacto de NodeTermStatus */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
      <circle cx="6" cy="6" r="2" fill="currentColor"/>
      <circle cx="18" cy="6" r="2" fill="currentColor"/>
      <circle cx="6" cy="18" r="2" fill="currentColor"/>
      <circle cx="18" cy="18" r="2" fill="currentColor"/>
      <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
      <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="20" cy="12" r="1.5" fill="currentColor"/>
      <line x1="12" y1="12" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="12" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  contraseñas: (size = 20, color = '#FFC107') => (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ color }}>
      {/* Escudo con llave - exacto de NodeTermStatus (escalado) */}
      <path fillRule="evenodd" clipRule="evenodd" d="M39.9999 13C33.8099 16.1734 26.9136 17.8608 19.8642 17.8608C18.9124 17.8608 17.9635 17.8301 17.0187 17.7691C15.7991 23.3474 15.6642 29.1518 16.6707 34.8601C18.4726 45.0788 23.8172 54.336 31.766 61.0058C34.3146 63.1443 37.0786 64.973 40 66.4707C42.9214 64.973 45.6854 63.1443 48.234 61.0058C56.1828 54.336 61.5274 45.0788 63.3292 34.8601C64.3358 29.1518 64.2008 23.3474 62.9813 17.769C62.0364 17.8301 61.0874 17.8608 60.1356 17.8608C53.0862 17.8608 46.1899 16.1734 39.9999 13Z" fill={color} fillOpacity="0.8"/>
      <path d="M39.9999 13L40.9123 11.2203C40.3395 10.9266 39.6603 10.9266 39.0875 11.2203L39.9999 13ZM17.0187 17.7691L17.1476 15.7732C16.1611 15.7095 15.276 16.3761 15.0649 17.3419L17.0187 17.7691ZM16.6707 34.8601L14.7011 35.2074L16.6707 34.8601ZM31.766 61.0058L33.0515 59.4737L31.766 61.0058ZM40 66.4707L39.0876 68.2504C39.6604 68.5441 40.3396 68.5441 40.9124 68.2504L40 66.4707ZM48.234 61.0058L49.5196 62.5379L48.234 61.0058ZM63.3292 34.8601L65.2989 35.2074V35.2074L63.3292 34.8601ZM62.9813 17.769L64.9351 17.3419C64.724 16.3761 63.8389 15.7095 62.8524 15.7732L62.9813 17.769Z" fill={color} fillOpacity="0.6"/>
      <g clipPath="url(#clip0_original)">
        <path fillRule="evenodd" clipRule="evenodd" d="M39.9999 23.2373C36.5071 25.1816 32.5508 26.2242 28.4937 26.2242C27.9184 26.2242 27.3452 26.2032 26.775 26.1617C26.1045 29.4411 26.0267 32.836 26.5688 36.1831L26.823 37.7531C27.7555 43.5117 30.6063 48.7863 34.9129 52.7212L35.5499 53.3032C36.9142 54.5498 38.409 55.6225 39.9999 56.5082C41.5908 55.6225 43.0856 54.5498 44.4499 53.3032L45.0869 52.7212C49.3935 48.7863 52.2443 43.5117 53.1768 37.7531L53.431 36.1831C53.9731 32.836 53.8953 29.4411 53.2248 26.1617C52.6546 26.2032 52.0813 26.2242 51.506 26.2242C47.4489 26.2242 43.4926 25.1816 39.9999 23.2373Z" fill={color} fillOpacity="0.95"/>
      </g>
      <defs>
        <clipPath id="clip0_original">
          <rect width="32" height="37.3335" fill="white" transform="translate(24 21.333)" />
        </clipPath>
      </defs>
    </svg>
  ),
  audit: (size = 20, color = '#a855f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pi pi-video replicado */}
      <rect x="2" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M16 10L22 6V18L16 14V10Z" fill={color}/>
    </svg>
  ),
  nettools: (size = 20, color = '#06b6d4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pi pi-wifi replicado */}
      <path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" fill={color}/>
      <path d="M8.5 15.5C9.5 14.5 10.7 14 12 14C13.3 14 14.5 14.5 15.5 15.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 12C7 10 9.3 9 12 9C14.7 9 17 10 19 12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M2 8.5C5 5.5 8.3 4 12 4C15.7 4 19 5.5 22 8.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  config: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* pi pi-sliders-h replicado */}
      <line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="7" cy="6" r="2.5" fill={color} stroke={color} strokeWidth="1"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="17" cy="12" r="2.5" fill={color} stroke={color} strokeWidth="1"/>
      <line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="11" cy="18" r="2.5" fill={color} stroke={color} strokeWidth="1"/>
    </svg>
  ),
  terminal: (size = 20, color = '#00BCD4') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Terminal exacto de NodeTermStatus */}
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M8 10 L11 12 L8 14 Z" fill={color}/>
      <line x1="14" y1="12" x2="18" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  statusbar: (size = 20, color = '#4fc3f7') => (
    <svg width={size} height={size} viewBox="0 0 32 20" fill="none">
      {/* StatusBar exacto de NodeTermStatus (simplificado) */}
      <rect x="1" y="1" width="30" height="18" rx="2" fill={color} opacity="0.12" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>
      <circle cx="4" cy="6" r="1.5" fill={color}/>
      <circle cx="4" cy="6" r="0.6" fill={color} opacity="0.3"/>
      <text x="6.5" y="7.5" fontSize="3" fill={color} opacity="0.9" fontFamily="monospace" fontWeight="500">0 dB</text>
      <g opacity="0.9">
        <rect x="13" y="9" width="1.2" height="2" fill={color}/>
        <rect x="14.8" y="7.5" width="1.2" height="3.5" fill={color}/>
        <rect x="16.6" y="5" width="1.2" height="6" fill={color}/>
        <rect x="18.4" y="7" width="1.2" height="4" fill={color}/>
        <rect x="20.2" y="8.5" width="1.2" height="2.5" fill={color}/>
        <rect x="22" y="9.5" width="1.2" height="1.5" fill={color}/>
      </g>
      <path d="M 24 5 L 24 11 M 24 5 L 26 7 L 26 9 L 24 11" stroke={color} strokeWidth="1.2" fill="none" opacity="0.9" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="27.5" y="8.5" fontSize="3" fill={color} opacity="0.9" fontFamily="monospace" fontWeight="500">34/12</text>
      <rect x="2" y="16" width="28" height="1.5" rx="0.5" fill={color} opacity="0.7"/>
    </svg>
  )
};

/**
 * Objeto principal de temas de iconos de la barra de acciones.
 * Cada tema tiene un nombre para mostrar y un conjunto de iconos.
 */
export const actionBarIconThemes = {
  original: {
    name: 'Original',
    description: 'Iconos originales de NodeTerm',
    icons: originalIcons
  },
  nodeterm: {
    name: 'Nodeterm',
    description: 'Iconos rediseñados de NodeTerm',
    icons: nodetermIcons
  },
  minimal: {
    name: 'Minimal',
    description: 'Iconos simples y limpios',
    icons: minimalIcons
  },
  neon: {
    name: 'Neon',
    description: 'Iconos con efectos de neón brillantes',
    icons: neonIcons
  },
  flat: {
    name: 'Flat',
    description: 'Iconos planos con colores sólidos',
    icons: flatIcons
  },
  outline: {
    name: 'Outline',
    description: 'Iconos solo con contorno',
    icons: outlineIcons
  }
};

/**
 * Lista de temas disponibles para usar en selectores
 */
export const actionBarIconThemeList = Object.keys(actionBarIconThemes).map(key => ({
  value: key,
  label: actionBarIconThemes[key].name,
  description: actionBarIconThemes[key].description
}));

/**
 * Obtiene un icono específico de un tema
 * @param {string} themeName - Nombre del tema (nodeterm, minimal, neon, flat, outline)
 * @param {string} iconName - Nombre del icono (nuevo, grupo, conexiones, etc.)
 * @param {number} size - Tamaño del icono en píxeles
 * @param {string} color - Color del icono (opcional, usa el color por defecto si no se especifica)
 * @returns {JSX.Element} El icono SVG
 */
export const getActionBarIcon = (themeName, iconName, size = 20, color = null) => {
  const theme = actionBarIconThemes[themeName] || actionBarIconThemes.original;
  const iconFn = theme.icons[iconName];
  
  if (!iconFn) {
    console.warn(`Icono "${iconName}" no encontrado en tema "${themeName}"`);
    return null;
  }
  
  // Si se proporciona color, usarlo; si no, usar el color por defecto del icono
  return color ? iconFn(size, color) : iconFn(size);
};

/**
 * Colores por defecto para cada tipo de icono de la barra de acciones
 */
export const actionBarIconColors = {
  nuevo: '#22c55e',
  grupo: '#ff9800',
  conexiones: '#64C8FF',
  contraseñas: '#FFC107',
  audit: '#a855f7',
  nettools: '#06b6d4',
  config: '#4fc3f7',
  terminal: '#00BCD4',
  statusbar: '#4fc3f7'
};

/**
 * Lista de todos los nombres de iconos disponibles
 */
export const actionBarIconNames = [
  'nuevo',
  'grupo', 
  'conexiones',
  'contraseñas',
  'audit',
  'nettools',
  'config',
  'terminal',
  'statusbar'
];

export default actionBarIconThemes;
