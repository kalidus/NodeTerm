import React from 'react';

/**
 * Colección de iconos futuristas de calidad profesional para la pestaña de inicio.
 * Recreados con el máximo detalle de las imágenes proporcionadas, con efectos de neón,
 * gradientes complejos y múltiples capas para un acabado premium.
 */
export const homeTabIcons = {
  // === ICONOS PRINCIPALES - FUTURISTAS Y PROFESIONALES ===
  
  wifiHeartHome: {
    name: 'Hogar Conectado Futurista',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_wifiHeart1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff"/>
            <stop offset="50%" stopColor="#0099cc"/>
            <stop offset="100%" stopColor="#006699"/>
          </linearGradient>
          <radialGradient id="g_wifiHeart2" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#004466" stopOpacity="0.3"/>
          </radialGradient>
          <filter id="f_wifiHeart1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Casa futurista con base */}
        <path d="M15 45 L50 15 L85 45 L85 85 L15 85 Z" fill="url(#g_wifiHeart1)" filter="url(#f_wifiHeart1)"/>
        <path d="M15 45 L50 15 L85 45 L85 85 L15 85 Z" fill="url(#g_wifiHeart2)"/>
        
        {/* Señales WiFi con efecto neón */}
        <path d="M35 58 Q50 48 65 58" stroke="#00ffff" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#f_wifiHeart1)"/>
        <path d="M25 50 Q50 35 75 50" stroke="#00ffff" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#f_wifiHeart1)"/>
        <path d="M15 42 Q50 22 85 42" stroke="#00ffff" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#f_wifiHeart1)"/>
        
        {/* Punto central con brillo */}
        <circle cx="50" cy="65" r="3" fill="#ffffff" filter="url(#f_wifiHeart1)"/>
        
        {/* Corazón futurista */}
        <path d="M50 85 C45 80 40 75 40 70 C40 67 42 65 45 65 C47 65 48 66 50 68 C52 66 53 65 55 65 C58 65 60 67 60 70 C60 75 55 80 50 85 Z" fill="#ff3366" filter="url(#f_wifiHeart1)"/>
      </svg>
    )
  },

  cyberHouse: {
    name: 'Casa Cibernética',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_cyberHouse1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff88"/>
            <stop offset="100%" stopColor="#006644"/>
          </linearGradient>
          <filter id="f_cyberHouse1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Estructura principal */}
        <rect x="20" y="40" width="60" height="45" fill="url(#g_cyberHouse1)" filter="url(#f_cyberHouse1)"/>
        <polygon points="20,40 50,15 80,40" fill="url(#g_cyberHouse1)" filter="url(#f_cyberHouse1)"/>
        
        {/* Líneas de energía */}
        <line x1="25" y1="50" x2="75" y2="50" stroke="#00ff88" strokeWidth="2" filter="url(#f_cyberHouse1)"/>
        <line x1="25" y1="60" x2="75" y2="60" stroke="#00ff88" strokeWidth="2" filter="url(#f_cyberHouse1)"/>
        <line x1="25" y1="70" x2="75" y2="70" stroke="#00ff88" strokeWidth="2" filter="url(#f_cyberHouse1)"/>
        
        {/* Puerta futurista */}
        <rect x="45" y="65" width="10" height="20" fill="#001122" filter="url(#f_cyberHouse1)"/>
        <circle cx="50" cy="75" r="2" fill="#00ff88"/>
      </svg>
    )
  },

  neonHome: {
    name: 'Hogar Neón',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_neonHome1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff00ff"/>
            <stop offset="100%" stopColor="#660066"/>
          </linearGradient>
          <filter id="f_neonHome1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Casa con efecto neón */}
        <path d="M20 50 L50 20 L80 50 L80 85 L20 85 Z" fill="url(#g_neonHome1)" filter="url(#f_neonHome1)"/>
        
        {/* Ventanas brillantes */}
        <rect x="30" y="60" width="8" height="12" fill="#ffffff" opacity="0.8" filter="url(#f_neonHome1)"/>
        <rect x="62" y="60" width="8" height="12" fill="#ffffff" opacity="0.8" filter="url(#f_neonHome1)"/>
        
        {/* Puerta neón */}
        <rect x="46" y="70" width="8" height="15" fill="#ff00ff" filter="url(#f_neonHome1)"/>
      </svg>
    )
  },


  hologramHouse: {
    name: 'Casa Holográfica',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_hologram1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#004488"/>
          </linearGradient>
          <filter id="f_hologram1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Casa holográfica */}
        <path d="M25 55 L50 25 L75 55 L75 85 L25 85 Z" fill="url(#g_hologram1)" filter="url(#f_hologram1)" opacity="0.7"/>
        
        {/* Líneas de energía */}
        <line x1="30" y1="65" x2="70" y2="65" stroke="#00ffff" strokeWidth="2" filter="url(#f_hologram1)"/>
        <line x1="30" y1="75" x2="70" y2="75" stroke="#00ffff" strokeWidth="2" filter="url(#f_hologram1)"/>
        
        {/* Partículas flotantes */}
        <circle cx="35" cy="40" r="1" fill="#ffffff" opacity="0.8"/>
        <circle cx="65" cy="45" r="1" fill="#ffffff" opacity="0.8"/>
        <circle cx="45" cy="35" r="1" fill="#ffffff" opacity="0.8"/>
      </svg>
    )
  },

  matrixHome: {
    name: 'Hogar Matrix',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_matrix1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff00"/>
            <stop offset="100%" stopColor="#004400"/>
          </linearGradient>
          <filter id="f_matrix1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Casa Matrix */}
        <rect x="25" y="45" width="50" height="40" fill="url(#g_matrix1)" filter="url(#f_matrix1)"/>
        <polygon points="25,45 50,20 75,45" fill="url(#g_matrix1)" filter="url(#f_matrix1)"/>
        
        {/* Código Matrix */}
        <text x="30" y="60" fontSize="6" fill="#00ff00" fontFamily="monospace">01</text>
        <text x="40" y="60" fontSize="6" fill="#00ff00" fontFamily="monospace">10</text>
        <text x="50" y="60" fontSize="6" fill="#00ff00" fontFamily="monospace">11</text>
        <text x="60" y="60" fontSize="6" fill="#00ff00" fontFamily="monospace">01</text>
        
        <text x="30" y="75" fontSize="6" fill="#00ff00" fontFamily="monospace">11</text>
        <text x="40" y="75" fontSize="6" fill="#00ff00" fontFamily="monospace">00</text>
        <text x="50" y="75" fontSize="6" fill="#00ff00" fontFamily="monospace">10</text>
        <text x="60" y="75" fontSize="6" fill="#00ff00" fontFamily="monospace">11</text>
      </svg>
    )
  },

  quantumHome: {
    name: 'Hogar Cuántico',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_quantum1" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff6600"/>
            <stop offset="100%" stopColor="#330000"/>
          </radialGradient>
          <filter id="f_quantum1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Casa cuántica */}
        <circle cx="50" cy="50" r="35" fill="url(#g_quantum1)" filter="url(#f_quantum1)" opacity="0.8"/>
        
        {/* Partículas cuánticas */}
        <circle cx="35" cy="35" r="3" fill="#ff6600" filter="url(#f_quantum1)"/>
        <circle cx="65" cy="35" r="3" fill="#ff6600" filter="url(#f_quantum1)"/>
        <circle cx="50" cy="25" r="3" fill="#ff6600" filter="url(#f_quantum1)"/>
        
        {/* Centro energético */}
        <circle cx="50" cy="50" r="8" fill="#ffffff" filter="url(#f_quantum1)"/>
      </svg>
    )
  },

  cyberpunkHouse: {
    name: 'Casa Cyberpunk',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_cyberpunk1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff0088"/>
            <stop offset="100%" stopColor="#880044"/>
          </linearGradient>
          <filter id="f_cyberpunk1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Estructura cyberpunk */}
        <rect x="20" y="50" width="60" height="35" fill="url(#g_cyberpunk1)" filter="url(#f_cyberpunk1)"/>
        <polygon points="20,50 50,25 80,50" fill="url(#g_cyberpunk1)" filter="url(#f_cyberpunk1)"/>
        
        {/* Líneas de energía cyberpunk */}
        <line x1="25" y1="60" x2="75" y2="60" stroke="#ff0088" strokeWidth="3" filter="url(#f_cyberpunk1)"/>
        <line x1="25" y1="70" x2="75" y2="70" stroke="#ff0088" strokeWidth="3" filter="url(#f_cyberpunk1)"/>
        
        {/* Luces neón */}
        <circle cx="35" y="65" r="2" fill="#ffffff" filter="url(#f_cyberpunk1)"/>
        <circle cx="65" y="65" r="2" fill="#ffffff" filter="url(#f_cyberpunk1)"/>
      </svg>
    )
  },

  // === ICONOS CASAS REALISTAS Y PROFESIONALES ===

  modernMansion: {
    name: 'Mansión Moderna',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="mansionGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5e7eb"/>
            <stop offset="50%" stopColor="#f3f4f6"/>
            <stop offset="100%" stopColor="#e5e7eb"/>
          </linearGradient>
          <linearGradient id="mansionGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280"/>
            <stop offset="100%" stopColor="#374151"/>
          </linearGradient>
          <linearGradient id="mansionGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#1d4ed8"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="20" y="45" width="60" height="40" fill="url(#mansionGrad1)" stroke="#374151" strokeWidth="2"/>
        <polygon points="20,45 50,20 80,45" fill="url(#mansionGrad1)" stroke="#374151" strokeWidth="2"/>
        
        {/* Chimenea */}
        <rect x="65" y="25" width="8" height="15" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="66" y="15" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        
        {/* Ventanas principales */}
        <rect x="28" y="55" width="8" height="10" rx="1" fill="url(#mansionGrad3)" stroke="#1d4ed8" strokeWidth="1.5"/>
        <rect x="64" y="55" width="8" height="10" rx="1" fill="url(#mansionGrad3)" stroke="#1d4ed8" strokeWidth="1.5"/>
        
        {/* Ventanas del ático */}
        <rect x="35" y="35" width="6" height="8" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="59" y="35" width="6" height="8" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        
        {/* Puerta principal */}
        <rect x="45" y="65" width="10" height="20" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="53" cy="75" r="1.2" fill="#fbbf24"/>
        
        {/* Tejado con textura */}
        <path d="M20 45 L50 20 L80 45" fill="url(#mansionGrad2)" stroke="#374151" strokeWidth="2"/>
        <line x1="30" y1="35" x2="30" y2="45" stroke="#4b5563" strokeWidth="1"/>
        <line x1="40" y1="30" x2="40" y2="45" stroke="#4b5563" strokeWidth="1"/>
        <line x1="50" y1="25" x2="50" y2="45" stroke="#4b5563" strokeWidth="1"/>
        <line x1="60" y1="30" x2="60" y2="45" stroke="#4b5563" strokeWidth="1"/>
        <line x1="70" y1="35" x2="70" y2="45" stroke="#4b5563" strokeWidth="1"/>
        
        {/* Base/cimientos */}
        <rect x="18" y="85" width="64" height="8" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
      </svg>
    )
  },

  luxuryVilla: {
    name: 'Villa de Lujo',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="villaGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="villaGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
          <linearGradient id="villaGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="15" y="50" width="70" height="35" fill="url(#villaGrad1)" stroke="#d97706" strokeWidth="2"/>
        <polygon points="15,50 50,25 85,50" fill="url(#villaGrad3)" stroke="#991b1b" strokeWidth="2"/>
        
        {/* Ala izquierda */}
        <rect x="5" y="60" width="25" height="25" fill="url(#villaGrad1)" stroke="#d97706" strokeWidth="1.5"/>
        <polygon points="5,60 17.5,45 30,60" fill="url(#villaGrad3)" stroke="#991b1b" strokeWidth="1.5"/>
        
        {/* Ala derecha */}
        <rect x="70" y="60" width="25" height="25" fill="url(#villaGrad1)" stroke="#d97706" strokeWidth="1.5"/>
        <polygon points="70,60 82.5,45 95,60" fill="url(#villaGrad3)" stroke="#991b1b" strokeWidth="1.5"/>
        
        {/* Pórtico */}
        <rect x="40" y="70" width="20" height="15" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="58" cy="78" r="1.5" fill="#fbbf24"/>
        
        {/* Ventanas grandes */}
        <rect x="25" y="58" width="10" height="12" rx="1" fill="url(#villaGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="65" y="58" width="10" height="12" rx="1" fill="url(#villaGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="45" y="58" width="10" height="12" rx="1" fill="url(#villaGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        
        {/* Ventanas pequeñas */}
        <rect x="10" y="68" width="8" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="82" y="68" width="8" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        
        {/* Columnas del pórtico */}
        <rect x="42" y="60" width="3" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="55" y="60" width="3" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        
        {/* Jardín */}
        <ellipse cx="30" cy="90" rx="15" ry="8" fill="#16a34a" opacity="0.6"/>
        <ellipse cx="70" cy="90" rx="15" ry="8" fill="#16a34a" opacity="0.6"/>
      </svg>
    )
  },

  contemporaryHome: {
    name: 'Casa Contemporánea',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="contempGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="contempGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
          <linearGradient id="contempGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#0891b2"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="25" y="40" width="50" height="45" fill="url(#contempGrad1)" stroke="#64748b" strokeWidth="2"/>
        
        {/* Tejado moderno */}
        <polygon points="20,40 50,15 80,40" fill="url(#contempGrad2)" stroke="#0f172a" strokeWidth="2"/>
        
        {/* Ventana panorámica */}
        <rect x="30" y="50" width="40" height="20" rx="2" fill="url(#contempGrad3)" stroke="#0891b2" strokeWidth="1.5"/>
        
        {/* Ventanas laterales */}
        <rect x="35" y="25" width="8" height="12" rx="1" fill="#67e8f9" stroke="#06b6d4" strokeWidth="1"/>
        <rect x="57" y="25" width="8" height="12" rx="1" fill="#67e8f9" stroke="#06b6d4" strokeWidth="1"/>
        
        {/* Puerta moderna */}
        <rect x="47" y="70" width="6" height="15" rx="3" fill="#374151" stroke="#111827" strokeWidth="1.5"/>
        
        {/* Líneas arquitectónicas */}
        <line x1="50" y1="40" x2="50" y2="85" stroke="#94a3b8" strokeWidth="1"/>
        <line x1="25" y1="55" x2="75" y2="55" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Base moderna */}
        <rect x="22" y="85" width="56" height="10" fill="#475569" stroke="#334155" strokeWidth="1.5"/>
      </svg>
    )
  },

  colonialHouse: {
    name: 'Casa Colonial',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="colonialGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef2f2"/>
            <stop offset="100%" stopColor="#fecaca"/>
          </linearGradient>
          <linearGradient id="colonialGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="colonialGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="20" y="45" width="60" height="40" fill="url(#colonialGrad1)" stroke="#dc2626" strokeWidth="2"/>
        <polygon points="20,45 50,20 80,45" fill="url(#colonialGrad2)" stroke="#431407" strokeWidth="2"/>
        
        {/* Columnas */}
        <rect x="25" y="50" width="6" height="35" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <rect x="35" y="50" width="6" height="35" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <rect x="59" y="50" width="6" height="35" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <rect x="69" y="50" width="6" height="35" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        
        {/* Puerta principal */}
        <rect x="45" y="60" width="10" height="25" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="53" cy="72" r="1.5" fill="#fbbf24"/>
        
        {/* Ventanas simétricas */}
        <rect x="30" y="55" width="8" height="10" rx="1" fill="url(#colonialGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="62" y="55" width="8" height="10" rx="1" fill="url(#colonialGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        
        {/* Ventanas del segundo piso */}
        <rect x="32" y="35" width="6" height="8" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="62" y="35" width="6" height="8" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        
        {/* Escaleras */}
        <rect x="42" y="85" width="16" height="4" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="44" y="81" width="12" height="4" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="46" y="77" width="8" height="4" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
      </svg>
    )
  },

  victorianHouse: {
    name: 'Casa Victoriana',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="victorianGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="victorianGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="victorianGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af"/>
            <stop offset="100%" stopColor="#1e3a8a"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="15" y="50" width="70" height="35" fill="url(#victorianGrad1)" stroke="#d97706" strokeWidth="2"/>
        
        {/* Tejado principal */}
        <polygon points="15,50 50,20 85,50" fill="url(#victorianGrad2)" stroke="#431407" strokeWidth="2"/>
        
        {/* Torre/torreón */}
        <rect x="42" y="35" width="16" height="20" fill="url(#victorianGrad1)" stroke="#d97706" strokeWidth="1.5"/>
        <polygon points="42,35 50,15 58,35" fill="url(#victorianGrad2)" stroke="#431407" strokeWidth="1.5"/>
        
        {/* Chimenea */}
        <rect x="60" y="25" width="8" height="20" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="61" y="15" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        
        {/* Ventanas ornamentadas */}
        <rect x="25" y="58" width="10" height="12" rx="2" fill="url(#victorianGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        <rect x="65" y="58" width="10" height="12" rx="2" fill="url(#victorianGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        <rect x="45" y="40" width="8" height="12" rx="2" fill="url(#victorianGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        
        {/* Puerta principal ornamentada */}
        <rect x="43" y="65" width="14" height="20" rx="3" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="55" cy="75" r="1.5" fill="#fbbf24"/>
        
        {/* Detalles decorativos */}
        <circle cx="50" cy="32" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="48" y="30" width="4" height="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        
        {/* Jardín victoriano */}
        <ellipse cx="30" cy="90" rx="12" ry="6" fill="#16a34a" opacity="0.7"/>
        <ellipse cx="70" cy="90" rx="12" ry="6" fill="#16a34a" opacity="0.7"/>
        <circle cx="30" cy="85" r="3" fill="#22c55e"/>
        <circle cx="70" cy="85" r="3" fill="#22c55e"/>
      </svg>
    )
  },

  mediterraneanVilla: {
    name: 'Villa Mediterránea',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="medGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="medGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </linearGradient>
          <linearGradient id="medGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="20" y="45" width="60" height="40" fill="url(#medGrad1)" stroke="#d97706" strokeWidth="2"/>
        
        {/* Tejado mediterráneo */}
        <polygon points="15,45 50,15 85,45" fill="url(#medGrad2)" stroke="#991b1b" strokeWidth="2"/>
        
        {/* Terraza */}
        <rect x="25" y="40" width="50" height="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"/>
        
        {/* Arcos característicos */}
        <path d="M35 40 Q35 35 40 35 Q45 35 45 40" stroke="#d97706" strokeWidth="2" fill="none"/>
        <path d="M55 40 Q55 35 60 35 Q65 35 65 40" stroke="#d97706" strokeWidth="2" fill="none"/>
        
        {/* Ventanas con persianas */}
        <rect x="30" y="55" width="12" height="15" rx="1" fill="url(#medGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="58" y="55" width="12" height="15" rx="1" fill="url(#medGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        
        {/* Persiana */}
        <rect x="32" y="57" width="8" height="11" fill="#0f172a" opacity="0.6"/>
        <rect x="60" y="57" width="8" height="11" fill="#0f172a" opacity="0.6"/>
        
        {/* Puerta principal */}
        <rect x="46" y="65" width="8" height="20" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="52" cy="75" r="1.2" fill="#fbbf24"/>
        
        {/* Balcón */}
        <rect x="40" y="35" width="20" height="5" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="42" y="30" width="3" height="10" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        <rect x="47" y="30" width="3" height="10" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        <rect x="52" y="30" width="3" height="10" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        <rect x="57" y="30" width="3" height="10" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        
        {/* Jardín mediterráneo */}
        <ellipse cx="25" cy="90" rx="15" ry="8" fill="#16a34a" opacity="0.6"/>
        <ellipse cx="75" cy="90" rx="15" ry="8" fill="#16a34a" opacity="0.6"/>
        <circle cx="25" cy="85" r="4" fill="#22c55e"/>
        <circle cx="75" cy="85" r="4" fill="#22c55e"/>
      </svg>
    )
  },

  tudorHouse: {
    name: 'Casa Tudor',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="tudorGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="tudorGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="tudorGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="20" y="45" width="60" height="40" fill="url(#tudorGrad1)" stroke="#d97706" strokeWidth="2"/>
        
        {/* Tejado Tudor */}
        <polygon points="15,45 50,20 85,45" fill="url(#tudorGrad2)" stroke="#431407" strokeWidth="2"/>
        
        {/* Vigas de madera características */}
        <rect x="25" y="50" width="50" height="4" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        <rect x="25" y="60" width="50" height="4" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        <rect x="25" y="70" width="50" height="4" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        
        {/* Vigas verticales */}
        <rect x="35" y="45" width="4" height="40" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        <rect x="50" y="45" width="4" height="40" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        <rect x="65" y="45" width="4" height="40" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        
        {/* Ventanas con marco de madera */}
        <rect x="30" y="55" width="8" height="10" rx="1" fill="url(#tudorGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="62" y="55" width="8" height="10" rx="1" fill="url(#tudorGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        
        {/* Cruz en la ventana */}
        <line x1="34" y1="55" x2="34" y2="65" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="30" y1="60" x2="38" y2="60" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="66" y1="55" x2="66" y2="65" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="62" y1="60" x2="70" y2="60" stroke="#1e3a8a" strokeWidth="1"/>
        
        {/* Puerta principal */}
        <rect x="46" y="65" width="8" height="20" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="52" cy="75" r="1.2" fill="#fbbf24"/>
        
        {/* Chimenea */}
        <rect x="65" y="25" width="8" height="15" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="66" y="15" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        
        {/* Base de piedra */}
        <rect x="18" y="85" width="64" height="8" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
      </svg>
    )
  },

  modernFarmhouse: {
    name: 'Granja Moderna',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="farmGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="farmGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="farmGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        {/* Estructura principal */}
        <rect x="25" y="40" width="50" height="45" fill="url(#farmGrad1)" stroke="#64748b" strokeWidth="2"/>
        
        {/* Tejado granero */}
        <polygon points="20,40 50,15 80,40" fill="url(#farmGrad2)" stroke="#431407" strokeWidth="2"/>
        
        {/* Granero adjunto */}
        <rect x="5" y="50" width="25" height="35" fill="url(#farmGrad1)" stroke="#64748b" strokeWidth="2"/>
        <polygon points="5,50 17.5,35 30,50" fill="url(#farmGrad2)" stroke="#431407" strokeWidth="2"/>
        
        {/* Puerta del granero */}
        <rect x="12" y="60" width="11" height="25" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        
        {/* Ventanas principales */}
        <rect x="35" y="50" width="12" height="15" rx="1" fill="url(#farmGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="53" y="50" width="12" height="15" rx="1" fill="url(#farmGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        
        {/* Puerta principal */}
        <rect x="48" y="65" width="4" height="20" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        
        {/* Porche */}
        <rect x="40" y="75" width="20" height="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"/>
        <rect x="42" y="70" width="3" height="15" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        <rect x="55" y="70" width="3" height="15" fill="#d97706" stroke="#991b1b" strokeWidth="1"/>
        
        {/* Chimenea */}
        <rect x="65" y="25" width="8" height="15" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="66" y="15" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        
        {/* Jardín/vegetación */}
        <ellipse cx="30" cy="90" rx="20" ry="8" fill="#16a34a" opacity="0.6"/>
        <ellipse cx="70" cy="90" rx="20" ry="8" fill="#16a34a" opacity="0.6"/>
        <circle cx="25" cy="85" r="4" fill="#22c55e"/>
        <circle cx="35" cy="88" r="3" fill="#22c55e"/>
        <circle cx="65" cy="85" r="4" fill="#22c55e"/>
        <circle cx="75" cy="88" r="3" fill="#22c55e"/>
      </svg>
    )
  },

  // === CASAS ADICIONALES REALISTAS DE ALTA CALIDAD ===

  modernPenthouse: {
    name: 'Ático Moderno',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="pentGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="pentGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
          <linearGradient id="pentGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#0891b2"/>
          </linearGradient>
        </defs>
        <rect x="20" y="30" width="60" height="55" fill="url(#pentGrad1)" stroke="#64748b" strokeWidth="2"/>
        <polygon points="15,30 50,10 85,30" fill="url(#pentGrad2)" stroke="#0f172a" strokeWidth="2"/>
        <rect x="25" y="25" width="50" height="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"/>
        <rect x="25" y="40" width="50" height="25" rx="2" fill="url(#pentGrad3)" stroke="#0891b2" strokeWidth="1.5"/>
        <rect x="30" y="15" width="8" height="12" rx="1" fill="#67e8f9" stroke="#06b6d4" strokeWidth="1"/>
        <rect x="62" y="15" width="8" height="12" rx="1" fill="#67e8f9" stroke="#06b6d4" strokeWidth="1"/>
        <rect x="47" y="70" width="6" height="15" rx="3" fill="#374151" stroke="#111827" strokeWidth="1.5"/>
        <rect x="25" y="28" width="50" height="2" fill="#64748b" stroke="#374151" strokeWidth="1"/>
        <line x1="50" y1="30" x2="50" y2="85" stroke="#94a3b8" strokeWidth="1"/>
        <line x1="25" y1="50" x2="75" y2="50" stroke="#94a3b8" strokeWidth="1"/>
        <rect x="18" y="85" width="64" height="10" fill="#475569" stroke="#334155" strokeWidth="1.5"/>
      </svg>
    )
  },

  artDecoMansion: {
    name: 'Mansión Art Déco',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="artDecoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="artDecoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="artDecoGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="15" y="45" width="70" height="40" fill="url(#artDecoGrad1)" stroke="#d97706" strokeWidth="2"/>
        <polygon points="15,45 35,25 55,35 75,25 95,45" fill="url(#artDecoGrad2)" stroke="#431407" strokeWidth="2"/>
        <rect x="10" y="35" width="15" height="50" fill="url(#artDecoGrad1)" stroke="#d97706" strokeWidth="1.5"/>
        <rect x="75" y="35" width="15" height="50" fill="url(#artDecoGrad1)" stroke="#d97706" strokeWidth="1.5"/>
        <polygon points="10,35 17.5,20 25,35" fill="url(#artDecoGrad2)" stroke="#431407" strokeWidth="1.5"/>
        <polygon points="75,35 82.5,20 90,35" fill="url(#artDecoGrad2)" stroke="#431407" strokeWidth="1.5"/>
        <rect x="25" y="55" width="12" height="15" rx="2" fill="url(#artDecoGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="63" y="55" width="12" height="15" rx="2" fill="url(#artDecoGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="44" y="55" width="12" height="15" rx="2" fill="url(#artDecoGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="15" y="45" width="8" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="77" y="45" width="8" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="46" y="70" width="8" height="15" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="50" cy="78" r="1.2" fill="#fbbf24"/>
        <rect x="35" y="40" width="30" height="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="35" y="35" width="30" height="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="35" y="30" width="30" height="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <ellipse cx="30" cy="90" rx="12" ry="6" fill="#16a34a" opacity="0.7"/>
        <ellipse cx="70" cy="90" rx="12" ry="6" fill="#16a34a" opacity="0.7"/>
        <circle cx="30" cy="85" r="3" fill="#22c55e"/>
        <circle cx="70" cy="85" r="3" fill="#22c55e"/>
      </svg>
    )
  },

  beachHouse: {
    name: 'Casa de Playa',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="beachGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="beachGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
          <linearGradient id="beachGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect x="25" y="40" width="50" height="45" fill="url(#beachGrad1)" stroke="#d97706" strokeWidth="2"/>
        <polygon points="20,40 50,20 80,40" fill="url(#beachGrad3)" stroke="#d97706" strokeWidth="2"/>
        <rect x="20" y="75" width="60" height="10" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="22" y="70" width="3" height="15" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="27" y="70" width="3" height="15" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="70" y="70" width="3" height="15" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="75" y="70" width="3" height="15" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="30" y="50" width="15" height="20" rx="2" fill="url(#beachGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="55" y="50" width="15" height="20" rx="2" fill="url(#beachGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="47" y="65" width="6" height="20" rx="3" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <path d="M35 35 Q45 30 55 35" stroke="#451a03" strokeWidth="2" fill="none"/>
        <path d="M37 37 Q45 32 53 37" stroke="#451a03" strokeWidth="2" fill="none"/>
        <ellipse cx="50" cy="95" rx="50" ry="8" fill="#fbbf24" opacity="0.8"/>
        <ellipse cx="30" cy="92" rx="8" ry="3" fill="#22c55e" opacity="0.6"/>
        <ellipse cx="70" cy="93" rx="8" ry="3" fill="#22c55e" opacity="0.6"/>
        <line x1="15" y1="85" x2="15" y2="75" stroke="#451a03" strokeWidth="3" strokeLinecap="round"/>
        <path d="M15 75 Q10 70 15 65 Q20 70 15 75" fill="#22c55e"/>
        <line x1="85" y1="85" x2="85" y2="75" stroke="#451a03" strokeWidth="3" strokeLinecap="round"/>
        <path d="M85 75 Q80 70 85 65 Q90 70 85 75" fill="#22c55e"/>
      </svg>
    )
  },

  mountainLodge: {
    name: 'Refugio de Montaña',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="lodgeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400e"/>
            <stop offset="100%" stopColor="#451a03"/>
          </linearGradient>
          <linearGradient id="lodgeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
        </defs>
        <rect x="20" y="45" width="60" height="40" fill="url(#lodgeGrad1)" stroke="#451a03" strokeWidth="2"/>
        <polygon points="15,45 50,25 85,45" fill="url(#lodgeGrad2)" stroke="#431407" strokeWidth="2"/>
        <rect x="65" y="25" width="12" height="20" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="67" y="15" width="8" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        <rect x="30" y="55" width="10" height="12" rx="1" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1.5"/>
        <rect x="60" y="55" width="10" height="12" rx="1" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1.5"/>
        <line x1="35" y1="55" x2="35" y2="67" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="30" y1="61" x2="40" y2="61" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="65" y1="55" x2="65" y2="67" stroke="#1e3a8a" strokeWidth="1"/>
        <line x1="60" y1="61" x2="70" y2="61" stroke="#1e3a8a" strokeWidth="1"/>
        <rect x="46" y="65" width="8" height="20" rx="2" fill="#451a03" stroke="#1f2937" strokeWidth="1.5"/>
        <circle cx="50" cy="75" r="1.2" fill="#fbbf24"/>
        <rect x="42" y="80" width="16" height="5" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <polygon points="0,85 20,70 40,75 60,65 80,70 100,75 100,100 0,100" fill="#6b7280" opacity="0.7"/>
        <polygon points="0,90 15,80 30,85 45,75 60,80 75,75 100,80 100,100 0,100" fill="#9ca3af" opacity="0.5"/>
        <rect x="20" y="40" width="60" height="5" fill="#ffffff" opacity="0.8"/>
      </svg>
    )
  },

  industrialLoft: {
    name: 'Loft Industrial',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="loftGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="loftGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#1f2937"/>
          </linearGradient>
          <linearGradient id="loftGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="100%" stopColor="#dc2626"/>
          </linearGradient>
        </defs>
        <rect x="15" y="35" width="70" height="50" fill="url(#loftGrad1)" stroke="#64748b" strokeWidth="2"/>
        <rect x="15" y="30" width="70" height="10" fill="url(#loftGrad2)" stroke="#1f2937" strokeWidth="2"/>
        <rect x="20" y="45" width="25" height="25" rx="2" fill="url(#loftGrad3)" stroke="#dc2626" strokeWidth="1.5"/>
        <rect x="55" y="45" width="25" height="25" rx="2" fill="url(#loftGrad3)" stroke="#dc2626" strokeWidth="1.5"/>
        <rect x="22" y="47" width="21" height="21" rx="1" fill="none" stroke="#1f2937" strokeWidth="1"/>
        <rect x="57" y="47" width="21" height="21" rx="1" fill="none" stroke="#1f2937" strokeWidth="1"/>
        <line x1="32.5" y1="47" x2="32.5" y2="68" stroke="#1f2937" strokeWidth="1"/>
        <line x1="67.5" y1="47" x2="67.5" y2="68" stroke="#1f2937" strokeWidth="1"/>
        <rect x="46" y="70" width="8" height="15" rx="2" fill="#374151" stroke="#1f2937" strokeWidth="1.5"/>
        <rect x="60" y="80" width="15" height="5" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="62" y="75" width="11" height="5" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="64" y="70" width="7" height="5" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="10" y="40" width="3" height="40" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="87" y="40" width="3" height="40" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <rect x="12" y="85" width="76" height="10" fill="#9ca3af" stroke="#6b7280" strokeWidth="1.5"/>
      </svg>
    )
  },

  gothicCastle: {
    name: 'Castillo Gótico',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="gothicGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280"/>
            <stop offset="100%" stopColor="#374151"/>
          </linearGradient>
          <linearGradient id="gothicGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#1f2937"/>
          </linearGradient>
          <linearGradient id="gothicGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af"/>
            <stop offset="100%" stopColor="#1e3a8a"/>
          </linearGradient>
        </defs>
        <rect x="20" y="40" width="60" height="45" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="2"/>
        <rect x="15" y="30" width="12" height="55" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="1.5"/>
        <rect x="73" y="30" width="12" height="55" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="1.5"/>
        <rect x="42" y="20" width="16" height="65" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="1.5"/>
        <polygon points="15,30 21,15 27,30" fill="url(#gothicGrad2)" stroke="#1f2937" strokeWidth="1.5"/>
        <polygon points="73,30 79,15 85,30" fill="url(#gothicGrad2)" stroke="#1f2937" strokeWidth="1.5"/>
        <polygon points="42,20 50,5 58,20" fill="url(#gothicGrad2)" stroke="#1f2937" strokeWidth="1.5"/>
        <path d="M25 50 Q30 45 35 50 Q30 55 25 50" fill="url(#gothicGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        <path d="M65 50 Q70 45 75 50 Q70 55 65 50" fill="url(#gothicGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        <path d="M47 35 Q50 30 53 35 Q50 40 47 35" fill="url(#gothicGrad3)" stroke="#1e3a8a" strokeWidth="1.5"/>
        <path d="M45 70 Q50 65 55 70 Q50 85 45 70" fill="#1f2937" stroke="#111827" strokeWidth="1.5"/>
        <rect x="10" y="60" width="8" height="25" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="1"/>
        <rect x="82" y="60" width="8" height="25" fill="url(#gothicGrad1)" stroke="#374151" strokeWidth="1"/>
        <polygon points="10,60 14,50 18,60" fill="url(#gothicGrad2)" stroke="#1f2937" strokeWidth="1"/>
        <polygon points="82,60 86,50 90,60" fill="url(#gothicGrad2)" stroke="#1f2937" strokeWidth="1"/>
        <rect x="45" y="85" width="10" height="3" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <ellipse cx="50" cy="95" rx="40" ry="5" fill="#1e40af" opacity="0.6"/>
      </svg>
    )
  },

  modernChalet: {
    name: 'Chalet Alpino',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="chaletGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="chaletGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400e"/>
            <stop offset="100%" stopColor="#451a03"/>
          </linearGradient>
          <linearGradient id="chaletGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="25" y="45" width="50" height="40" fill="url(#chaletGrad1)" stroke="#d97706" strokeWidth="2"/>
        <polygon points="20,45 50,25 80,45" fill="url(#chaletGrad2)" stroke="#451a03" strokeWidth="2"/>
        <rect x="30" y="65" width="40" height="8" fill="url(#chaletGrad2)" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="32" y="60" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="37" y="60" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="61" y="60" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="66" y="60" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="35" y="50" width="15" height="12" rx="1" fill="url(#chaletGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="50" y="50" width="15" height="12" rx="1" fill="url(#chaletGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="46" y="75" width="8" height="10" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="70" y="35" width="8" height="15" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="71" y="25" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        <polygon points="0,85 15,75 30,80 45,70 60,75 75,70 90,75 100,80 100,100 0,100" fill="#6b7280" opacity="0.6"/>
        <polygon points="0,90 10,85 20,88 30,83 40,87 50,82 60,86 70,81 80,85 90,82 100,85 100,100 0,100" fill="#9ca3af" opacity="0.4"/>
        <rect x="30" y="68" width="40" height="3" fill="#ffffff" opacity="0.9"/>
      </svg>
    )
  },

  luxuryEstate: {
    name: 'Finca de Lujo',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="estateGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="estateGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
          <linearGradient id="estateGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
          <linearGradient id="estateGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
        </defs>
        <rect x="20" y="40" width="60" height="45" fill="url(#estateGrad1)" stroke="#64748b" strokeWidth="2"/>
        <polygon points="15,40 50,20 85,40" fill="url(#estateGrad2)" stroke="#0f172a" strokeWidth="2"/>
        <rect x="25" y="50" width="4" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="31" y="50" width="4" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="65" y="50" width="4" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="71" y="50" width="4" height="25" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="40" y="55" width="12" height="15" rx="1" fill="url(#estateGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="48" y="55" width="12" height="15" rx="1" fill="url(#estateGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="47" y="70" width="6" height="15" rx="3" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="50" cy="77" r="1" fill="#fbbf24"/>
        <rect x="42" y="85" width="16" height="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <rect x="44" y="82" width="12" height="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <ellipse cx="30" cy="95" rx="15" ry="5" fill="url(#estateGrad4)" opacity="0.8"/>
        <ellipse cx="70" cy="95" rx="15" ry="5" fill="url(#estateGrad4)" opacity="0.8"/>
        <circle cx="30" cy="90" r="4" fill="#22c55e"/>
        <circle cx="70" cy="90" r="4" fill="#22c55e"/>
        <circle cx="50" cy="88" r="3" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1"/>
        <circle cx="50" cy="88" r="1.5" fill="#67e8f9"/>
      </svg>
    )
  },

  rusticCabin: {
    name: 'Cabaña Rústica',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="cabinGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400e"/>
            <stop offset="100%" stopColor="#451a03"/>
          </linearGradient>
          <linearGradient id="cabinGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
        </defs>
        <rect x="25" y="45" width="50" height="40" fill="url(#cabinGrad1)" stroke="#451a03" strokeWidth="2"/>
        <polygon points="20,45 50,25 80,45" fill="url(#cabinGrad2)" stroke="#431407" strokeWidth="2"/>
        <line x1="30" y1="45" x2="30" y2="85" stroke="#7c2d12" strokeWidth="2"/>
        <line x1="50" y1="45" x2="50" y2="85" stroke="#7c2d12" strokeWidth="2"/>
        <line x1="70" y1="45" x2="70" y2="85" stroke="#7c2d12" strokeWidth="2"/>
        <line x1="25" y1="55" x2="75" y2="55" stroke="#7c2d12" strokeWidth="2"/>
        <line x1="25" y1="65" x2="75" y2="65" stroke="#7c2d12" strokeWidth="2"/>
        <line x1="25" y1="75" x2="75" y2="75" stroke="#7c2d12" strokeWidth="2"/>
        <rect x="35" y="55" width="8" height="8" rx="1" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="57" y="55" width="8" height="8" rx="1" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
        <rect x="47" y="70" width="6" height="15" rx="2" fill="#7c2d12" stroke="#431407" strokeWidth="1.5"/>
        <rect x="65" y="35" width="10" height="15" fill="#6b7280" stroke="#374151" strokeWidth="1.5"/>
        <rect x="67" y="25" width="6" height="10" fill="#ef4444" stroke="#374151" strokeWidth="1"/>
        <rect x="40" y="80" width="20" height="5" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <polygon points="0,85 10,75 20,80 30,70 40,75 50,68 60,72 70,65 80,70 90,68 100,72 100,100 0,100" fill="#16a34a" opacity="0.6"/>
        <circle cx="15" cy="80" r="6" fill="#22c55e" opacity="0.8"/>
        <circle cx="35" cy="78" r="5" fill="#22c55e" opacity="0.8"/>
        <circle cx="65" cy="75" r="6" fill="#22c55e" opacity="0.8"/>
        <circle cx="85" cy="78" r="5" fill="#22c55e" opacity="0.8"/>
      </svg>
    )
  },

  contemporaryVilla: {
    name: 'Villa Contemporánea',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="contVillaGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="contVillaGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#1f2937"/>
          </linearGradient>
          <linearGradient id="contVillaGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#0891b2"/>
          </linearGradient>
        </defs>
        <rect x="20" y="35" width="60" height="50" fill="url(#contVillaGrad1)" stroke="#64748b" strokeWidth="2"/>
        <rect x="20" y="30" width="60" height="8" fill="url(#contVillaGrad2)" stroke="#1f2937" strokeWidth="2"/>
        <rect x="25" y="25" width="50" height="3" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
        <rect x="30" y="15" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="35" y="15" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="63" y="15" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="68" y="15" width="2" height="13" fill="#451a03" stroke="#1f2937" strokeWidth="1"/>
        <rect x="25" y="45" width="20" height="25" rx="2" fill="url(#contVillaGrad3)" stroke="#0891b2" strokeWidth="1.5"/>
        <rect x="55" y="45" width="20" height="25" rx="2" fill="url(#contVillaGrad3)" stroke="#0891b2" strokeWidth="1.5"/>
        <rect x="47" y="65" width="6" height="20" rx="3" fill="#374151" stroke="#1f2937" strokeWidth="1.5"/>
        <ellipse cx="70" cy="90" rx="15" ry="8" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5"/>
        <ellipse cx="70" cy="88" rx="12" ry="6" fill="#67e8f9" opacity="0.6"/>
        <rect x="15" y="85" width="70" height="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"/>
        <ellipse cx="30" cy="95" rx="12" ry="5" fill="#22c55e" opacity="0.7"/>
        <circle cx="30" cy="90" r="3" fill="#22c55e"/>
      </svg>
    )
  },

  japaneseHouse: {
    name: 'Casa Japonesa',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="japGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fbbf24"/>
          </linearGradient>
          <linearGradient id="japGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#451a03"/>
          </linearGradient>
          <linearGradient id="japGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </linearGradient>
        </defs>
        <rect x="25" y="50" width="50" height="35" fill="url(#japGrad1)" stroke="#d97706" strokeWidth="2"/>
        <path d="M15 50 L20 45 L50 30 L80 45 L85 50" fill="url(#japGrad3)" stroke="#991b1b" strokeWidth="2"/>
        <path d="M18 48 L22 43 L50 28 L78 43 L82 48" fill="url(#japGrad2)" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="30" y="60" width="12" height="15" rx="1" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
        <rect x="58" y="60" width="12" height="15" rx="1" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
        <line x1="36" y1="60" x2="36" y2="75" stroke="#d97706" strokeWidth="1"/>
        <line x1="30" y1="67" x2="42" y2="67" stroke="#d97706" strokeWidth="1"/>
        <line x1="64" y1="60" x2="64" y2="75" stroke="#d97706" strokeWidth="1"/>
        <line x1="58" y1="67" x2="70" y2="67" stroke="#d97706" strokeWidth="1"/>
        <rect x="47" y="68" width="6" height="17" rx="1" fill="#7c2d12" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="20" y="85" width="60" height="5" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <ellipse cx="50" cy="95" rx="45" ry="8" fill="#22c55e" opacity="0.6"/>
        <circle cx="30" cy="90" r="4" fill="#dc2626" opacity="0.8"/>
        <circle cx="70" cy="90" r="4" fill="#dc2626" opacity="0.8"/>
      </svg>
    )
  },

  tropicalVilla: {
    name: 'Villa Tropical',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="tropGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fbbf24"/>
          </linearGradient>
          <linearGradient id="tropGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
          <linearGradient id="tropGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
        </defs>
        <rect x="25" y="40" width="50" height="45" fill="url(#tropGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <polygon points="20,40 50,20 80,40" fill="#d97706" stroke="#92400e" strokeWidth="2"/>
        <rect x="20" y="70" width="60" height="12" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="22" y="65" width="3" height="20" fill="#7c2d12" stroke="#451a03" strokeWidth="1"/>
        <rect x="28" y="65" width="3" height="20" fill="#7c2d12" stroke="#451a03" strokeWidth="1"/>
        <rect x="69" y="65" width="3" height="20" fill="#7c2d12" stroke="#451a03" strokeWidth="1"/>
        <rect x="75" y="65" width="3" height="20" fill="#7c2d12" stroke="#451a03" strokeWidth="1"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="url(#tropGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="52" y="50" width="16" height="18" rx="2" fill="url(#tropGrad2)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="47" y="72" width="6" height="13" rx="2" fill="#7c2d12" stroke="#451a03" strokeWidth="1.5"/>
        <line x1="10" y1="85" x2="10" y2="72" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="10" cy="70" r="8" fill="url(#tropGrad3)"/>
        <circle cx="10" cy="68" r="5" fill="#22c55e"/>
        <line x1="90" y1="85" x2="90" y2="72" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="90" cy="70" r="8" fill="url(#tropGrad3)"/>
        <circle cx="90" cy="68" r="5" fill="#22c55e"/>
        <ellipse cx="50" cy="95" rx="50" ry="8" fill="#fbbf24" opacity="0.7"/>
      </svg>
    )
  },

  scandinavianHome: {
    name: 'Casa Escandinava',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="scandGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="scandGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569"/>
            <stop offset="100%" stopColor="#334155"/>
          </linearGradient>
          <linearGradient id="scandGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="25" y="40" width="50" height="45" fill="url(#scandGrad1)" stroke="#94a3b8" strokeWidth="2"/>
        <polygon points="20,40 50,20 80,40" fill="url(#scandGrad2)" stroke="#334155" strokeWidth="2"/>
        <rect x="30" y="50" width="18" height="20" rx="1" fill="url(#scandGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="52" y="50" width="18" height="20" rx="1" fill="url(#scandGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <line x1="39" y1="50" x2="39" y2="70" stroke="#0284c7" strokeWidth="1"/>
        <line x1="30" y1="60" x2="48" y2="60" stroke="#0284c7" strokeWidth="1"/>
        <line x1="61" y1="50" x2="61" y2="70" stroke="#0284c7" strokeWidth="1"/>
        <line x1="52" y1="60" x2="70" y2="60" stroke="#0284c7" strokeWidth="1"/>
        <rect x="46" y="70" width="8" height="15" rx="1" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5"/>
        <circle cx="50" cy="78" r="1" fill="#475569"/>
        <rect x="65" y="30" width="8" height="15" fill="#6b7280" stroke="#475569" strokeWidth="1.5"/>
        <rect x="66" y="20" width="6" height="10" fill="#94a3b8" stroke="#475569" strokeWidth="1"/>
        <ellipse cx="50" cy="92" rx="40" ry="6" fill="#cbd5e1" opacity="0.6"/>
        <rect x="22" y="85" width="56" height="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
      </svg>
    )
  },

  frenchChateau: {
    name: 'Château Francés',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="chateauGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          <linearGradient id="chateauGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280"/>
            <stop offset="100%" stopColor="#475569"/>
          </linearGradient>
          <linearGradient id="chateauGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect x="20" y="45" width="60" height="40" fill="url(#chateauGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <polygon points="18,45 30,30 50,35 70,30 82,45" fill="url(#chateauGrad2)" stroke="#475569" strokeWidth="2"/>
        <rect x="15" y="40" width="12" height="45" fill="url(#chateauGrad1)" stroke="#f59e0b" strokeWidth="1.5"/>
        <rect x="73" y="40" width="12" height="45" fill="url(#chateauGrad1)" stroke="#f59e0b" strokeWidth="1.5"/>
        <polygon points="15,40 21,25 27,40" fill="url(#chateauGrad2)" stroke="#475569" strokeWidth="1.5"/>
        <polygon points="73,40 79,25 85,40" fill="url(#chateauGrad2)" stroke="#475569" strokeWidth="1.5"/>
        <circle cx="21" cy="32" r="2" fill="#fbbf24"/>
        <circle cx="79" cy="32" r="2" fill="#fbbf24"/>
        <rect x="30" y="55" width="12" height="16" rx="1" fill="url(#chateauGrad3)" stroke="#1d4ed8" strokeWidth="1.5"/>
        <rect x="58" y="55" width="12" height="16" rx="1" fill="url(#chateauGrad3)" stroke="#1d4ed8" strokeWidth="1.5"/>
        <rect x="17" y="50" width="8" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="75" y="50" width="8" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="46" y="72" width="8" height="13" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="50" cy="79" r="1" fill="#fbbf24"/>
        <ellipse cx="50" cy="92" rx="35" ry="6" fill="#22c55e" opacity="0.6"/>
        <circle cx="35" cy="88" r="3" fill="#ef4444"/>
        <circle cx="65" cy="88" r="3" fill="#ef4444"/>
      </svg>
    )
  },

  spanishHacienda: {
    name: 'Hacienda Española',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="hacGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fde047"/>
          </linearGradient>
          <linearGradient id="hacGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c"/>
            <stop offset="100%" stopColor="#c2410c"/>
          </linearGradient>
          <linearGradient id="hacGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="15" y="45" width="70" height="40" fill="url(#hacGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <polygon points="12,45 50,28 88,45" fill="url(#hacGrad2)" stroke="#c2410c" strokeWidth="2"/>
        <rect x="10" y="50" width="15" height="35" fill="url(#hacGrad1)" stroke="#f59e0b" strokeWidth="1.5"/>
        <rect x="75" y="50" width="15" height="35" fill="url(#hacGrad1)" stroke="#f59e0b" strokeWidth="1.5"/>
        <path d="M20 60 A5 5 0 0 1 30 60" stroke="#d97706" strokeWidth="1.5" fill="#fef3c7"/>
        <path d="M70 60 A5 5 0 0 1 80 60" stroke="#d97706" strokeWidth="1.5" fill="#fef3c7"/>
        <path d="M30 55 A8 8 0 0 1 46 55 L46 70 L30 70 Z" fill="url(#hacGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <path d="M54 55 A8 8 0 0 1 70 55 L70 70 L54 70 Z" fill="url(#hacGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="47" y="72" width="6" height="13" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="40" y="85" width="20" height="8" fill="#ea580c" stroke="#c2410c" strokeWidth="1.5"/>
        <ellipse cx="50" cy="95" rx="40" ry="6" fill="#22c55e" opacity="0.7"/>
        <circle cx="30" cy="90" r="4" fill="#fbbf24"/>
        <circle cx="70" cy="90" r="4" fill="#fbbf24"/>
      </svg>
    )
  },

  modernSkyscraper: {
    name: 'Rascacielos Moderno',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="skyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0"/>
            <stop offset="100%" stopColor="#94a3b8"/>
          </linearGradient>
          <linearGradient id="skyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="35" y="10" width="30" height="75" fill="url(#skyGrad1)" stroke="#64748b" strokeWidth="2"/>
        <rect x="35" y="5" width="30" height="8" fill="#334155" stroke="#1e293b" strokeWidth="1.5"/>
        <rect x="38" y="18" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="51" y="18" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="38" y="30" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="51" y="30" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="38" y="42" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="51" y="42" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="38" y="54" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="51" y="54" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="38" y="66" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="51" y="66" width="11" height="10" rx="1" fill="url(#skyGrad2)" stroke="#0284c7" strokeWidth="1"/>
        <rect x="45" y="78" width="10" height="7" rx="1" fill="#475569" stroke="#334155" strokeWidth="1"/>
        <rect x="30" y="85" width="40" height="10" fill="#64748b" stroke="#475569" strokeWidth="1.5"/>
      </svg>
    )
  },

  ecoGreenHome: {
    name: 'Casa Ecológica',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="ecoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4"/>
            <stop offset="100%" stopColor="#bbf7d0"/>
          </linearGradient>
          <linearGradient id="ecoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
          <linearGradient id="ecoGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="22" y="38" width="56" height="47" fill="url(#ecoGrad1)" stroke="#22c55e" strokeWidth="2"/>
        <polygon points="18,38 50,18 82,38" fill="url(#ecoGrad2)" stroke="#16a34a" strokeWidth="2"/>
        <rect x="35" y="25" width="30" height="10" rx="1" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5"/>
        <line x1="35" y1="30" x2="65" y2="30" stroke="#60a5fa" strokeWidth="0.5"/>
        <line x1="42" y1="25" x2="42" y2="35" stroke="#60a5fa" strokeWidth="0.5"/>
        <line x1="50" y1="25" x2="50" y2="35" stroke="#60a5fa" strokeWidth="0.5"/>
        <line x1="58" y1="25" x2="58" y2="35" stroke="#60a5fa" strokeWidth="0.5"/>
        <rect x="30" y="48" width="16" height="20" rx="2" fill="url(#ecoGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="54" y="48" width="16" height="20" rx="2" fill="url(#ecoGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="46" y="70" width="8" height="15" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <circle cx="50" cy="78" r="1.5" fill="#22c55e"/>
        <rect x="20" y="85" width="60" height="8" fill="url(#ecoGrad2)" stroke="#16a34a" strokeWidth="1.5"/>
        <circle cx="25" cy="90" r="5" fill="#22c55e" opacity="0.8"/>
        <circle cx="35" cy="92" r="4" fill="#22c55e" opacity="0.8"/>
        <circle cx="65" cy="92" r="4" fill="#22c55e" opacity="0.8"/>
        <circle cx="75" cy="90" r="5" fill="#22c55e" opacity="0.8"/>
        <path d="M50 55 Q55 55 58 60 Q58 65 50 68" fill="#22c55e" opacity="0.6"/>
      </svg>
    )
  },

  desertAdobeHouse: {
    name: 'Casa Adobe del Desierto',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="adobeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa"/>
            <stop offset="100%" stopColor="#fdba74"/>
          </linearGradient>
          <linearGradient id="adobeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#f97316"/>
          </linearGradient>
          <linearGradient id="adobeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect x="20" y="45" width="60" height="40" rx="3" fill="url(#adobeGrad1)" stroke="#f97316" strokeWidth="2"/>
        <rect x="20" y="38" width="60" height="10" rx="2" fill="url(#adobeGrad2)" stroke="#ea580c" strokeWidth="1.5"/>
        <rect x="10" y="52" width="18" height="33" rx="2" fill="url(#adobeGrad1)" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="72" y="52" width="18" height="33" rx="2" fill="url(#adobeGrad1)" stroke="#f97316" strokeWidth="1.5"/>
        <rect x="12" y="45" width="14" height="10" rx="2" fill="url(#adobeGrad2)" stroke="#ea580c" strokeWidth="1"/>
        <rect x="74" y="45" width="14" height="10" rx="2" fill="url(#adobeGrad2)" stroke="#ea580c" strokeWidth="1"/>
        <path d="M30 58 A3 3 0 0 1 36 58 L36 72 L30 72 Z" fill="url(#adobeGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <path d="M64 58 A3 3 0 0 1 70 58 L70 72 L64 72 Z" fill="url(#adobeGrad3)" stroke="#0284c7" strokeWidth="1.5"/>
        <rect x="47" y="72" width="6" height="13" rx="2" fill="#7c2d12" stroke="#451a03" strokeWidth="1.5"/>
        <ellipse cx="50" cy="93" rx="45" ry="7" fill="#fbbf24" opacity="0.7"/>
        <circle cx="30" cy="88" r="3" fill="#22c55e" opacity="0.6"/>
        <circle cx="70" cy="88" r="3" fill="#22c55e" opacity="0.6"/>
      </svg>
    )
  },

  skylineApartment: {
    name: 'Apartamento Urbano',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="aptGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#cbd5e1"/>
          </linearGradient>
          <linearGradient id="aptGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect x="25" y="15" width="50" height="70" fill="url(#aptGrad1)" stroke="#64748b" strokeWidth="2"/>
        <rect x="30" y="23" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="45" y="23" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="60" y="23" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="30" y="36" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="45" y="36" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="60" y="36" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="30" y="49" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="45" y="49" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="60" y="49" width="10" height="10" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="30" y="62" width="10" height="10" rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
        <rect x="45" y="62" width="10" height="10" rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
        <rect x="60" y="62" width="10" height="10" rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
        <rect x="46" y="75" width="8" height="10" rx="1" fill="#475569" stroke="#334155" strokeWidth="1.5"/>
        <rect x="23" y="85" width="54" height="8" fill="#64748b" stroke="#475569" strokeWidth="1.5"/>
        <rect x="25" y="10" width="50" height="3" fill="url(#aptGrad2)"/>
      </svg>
    )
  },

  gardenCottage: {
    name: 'Cottage con Jardín',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="cottageGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          <linearGradient id="cottageGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </linearGradient>
          <linearGradient id="cottageGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
        </defs>
        <rect x="25" y="45" width="50" height="40" fill="url(#cottageGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <polygon points="20,45 50,25 80,45" fill="url(#cottageGrad2)" stroke="#991b1b" strokeWidth="2"/>
        <rect x="32" y="55" width="10" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5"/>
        <rect x="58" y="55" width="10" height="12" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5"/>
        <rect x="47" y="70" width="6" height="15" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="65" y="35" width="8" height="15" fill="#7c2d12" stroke="#451a03" strokeWidth="1.5"/>
        <rect x="66" y="25" width="6" height="10" fill="#6b7280" stroke="#475569" strokeWidth="1"/>
        <ellipse cx="50" cy="95" rx="48" ry="8" fill="url(#cottageGrad3)" opacity="0.7"/>
        <circle cx="20" cy="85" r="6" fill="#ef4444"/>
        <circle cx="80" cy="85" r="6" fill="#f59e0b"/>
        <circle cx="30" cy="90" r="5" fill="#22c55e"/>
        <circle cx="40" cy="92" r="4" fill="#22c55e"/>
        <circle cx="60" cy="92" r="4" fill="#22c55e"/>
        <circle cx="70" cy="90" r="5" fill="#22c55e"/>
        <path d="M15 88 Q20 83 25 88" stroke="#16a34a" strokeWidth="2" fill="none"/>
        <path d="M75 88 Q80 83 85 88" stroke="#16a34a" strokeWidth="2" fill="none"/>
      </svg>
    )
  },

  californianModern: {
    name: 'Casa Californiana',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="caliGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc"/>
            <stop offset="100%" stopColor="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="caliGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
          <linearGradient id="caliGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect x="18" y="35" width="64" height="50" fill="url(#caliGrad1)" stroke="#64748b" strokeWidth="2"/>
        <rect x="18" y="28" width="64" height="10" fill="#475569" stroke="#334155" strokeWidth="1.5"/>
        <rect x="22" y="45" width="26" height="30" rx="2" fill="url(#caliGrad2)" stroke="#0284c7" strokeWidth="2"/>
        <rect x="52" y="45" width="26" height="30" rx="2" fill="url(#caliGrad2)" stroke="#0284c7" strokeWidth="2"/>
        <line x1="35" y1="45" x2="35" y2="75" stroke="#06b6d4" strokeWidth="1.5"/>
        <line x1="22" y1="60" x2="48" y2="60" stroke="#06b6d4" strokeWidth="1.5"/>
        <line x1="65" y1="45" x2="65" y2="75" stroke="#06b6d4" strokeWidth="1.5"/>
        <line x1="52" y1="60" x2="78" y2="60" stroke="#06b6d4" strokeWidth="1.5"/>
        <rect x="46" y="77" width="8" height="8" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="1.5"/>
        <rect x="15" y="85" width="70" height="8" fill="url(#caliGrad3)" stroke="#f59e0b" strokeWidth="1.5"/>
        <rect x="18" y="87" width="64" height="3" fill="#fbbf24"/>
        <circle cx="30" cy="90" r="3" fill="#22c55e" opacity="0.7"/>
        <circle cx="70" cy="90" r="3" fill="#22c55e" opacity="0.7"/>
      </svg>
    )
  },

  luxuryPalace: {
    name: 'Palacio de Lujo',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="palaceGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7"/>
            <stop offset="100%" stopColor="#fbbf24"/>
          </linearGradient>
          <linearGradient id="palaceGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="palaceGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect x="15" y="40" width="70" height="45" fill="url(#palaceGrad1)" stroke="#f59e0b" strokeWidth="2.5"/>
        <polygon points="10,40 50,15 90,40" fill="url(#palaceGrad2)" stroke="#f59e0b" strokeWidth="2"/>
        <rect x="10" y="35" width="15" height="50" fill="url(#palaceGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <rect x="75" y="35" width="15" height="50" fill="url(#palaceGrad1)" stroke="#f59e0b" strokeWidth="2"/>
        <polygon points="10,35 17.5,18 25,35" fill="url(#palaceGrad2)" stroke="#f59e0b" strokeWidth="1.5"/>
        <polygon points="75,35 82.5,18 90,35" fill="url(#palaceGrad2)" stroke="#f59e0b" strokeWidth="1.5"/>
        <circle cx="17.5" cy="25" r="2.5" fill="#fbbf24"/>
        <circle cx="82.5" cy="25" r="2.5" fill="#fbbf24"/>
        <rect x="20" y="50" width="60" height="3" fill="#fbbf24"/>
        <rect x="22" y="45" width="56" height="3" fill="#fbbf24"/>
        <rect x="30" y="55" width="15" height="18" rx="2" fill="url(#palaceGrad3)" stroke="#1d4ed8" strokeWidth="2"/>
        <rect x="55" y="55" width="15" height="18" rx="2" fill="url(#palaceGrad3)" stroke="#1d4ed8" strokeWidth="2"/>
        <rect x="15" y="55" width="10" height="15" rx="1" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="75" y="55" width="10" height="15" rx="1" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1"/>
        <rect x="45" y="73" width="10" height="12" rx="3" fill="#92400e" stroke="#fbbf24" strokeWidth="2"/>
        <circle cx="50" cy="80" r="1.5" fill="#fbbf24"/>
        <rect x="40" y="85" width="20" height="5" fill="url(#palaceGrad2)" stroke="#f59e0b" strokeWidth="1"/>
        <ellipse cx="50" cy="93" rx="35" ry="6" fill="#22c55e" opacity="0.7"/>
      </svg>
    )
  },

  // === ICONOS FUTURISTAS: CENTRO DE CONTROL / OPERACIONES ===

  controlCenter: {
    name: 'Centro de Control',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ctrlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#0b1220" stroke="url(#ctrlGrad)" strokeWidth="1.6"/>
        <rect x="5" y="7" width="10" height="6" rx="1.2" fill="#0f1a2b" stroke="#22d3ee" strokeWidth="1"/>
        <path d="M6 12 Q10 9 14 12" stroke="#22d3ee" strokeWidth="1.4" fill="none"/>
        <circle cx="17.5" cy="9.5" r="1.2" fill="#22d3ee"/>
        <rect x="16" y="12.5" width="4.5" height="1.6" rx="0.8" fill="#7c3aed"/>
        <rect x="6" y="15" width="12" height="2.2" rx="1.1" fill="#111827" stroke="#7c3aed" strokeWidth="1"/>
      </svg>
    )
  },

  operationsHub: {
    name: 'Centro de Operaciones',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" fill="#0b1220" stroke="#00d4ff" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="5.5" stroke="#7c3aed" strokeWidth="1.4"/>
        <path d="M12 6.5 V9.5 M12 14.5 V17.5 M6.5 12 H9.5 M14.5 12 H17.5" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.5" fill="#22d3ee"/>
      </svg>
    )
  },

  commandConsole: {
    name: 'Consola de Comandos',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#0f0f23" stroke="#7c3aed" strokeWidth="1.6"/>
        <path d="M7.5 12.5 L10 10 M7.5 12.5 L10 15" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="11.5" y="14.2" width="5.5" height="1.6" rx="0.8" fill="#22d3ee"/>
        <circle cx="6" cy="7.5" r="0.6" fill="#22d3ee"/>
        <circle cx="7.8" cy="7.5" r="0.6" fill="#7c3aed"/>
        <circle cx="9.6" cy="7.5" r="0.6" fill="#00d4ff"/>
      </svg>
    )
  },

  radarSweep: {
    name: 'Radar',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="#22d3ee" strokeWidth="1.6"/>
        <path d="M12 12 L18 8" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="15.5" cy="9.8" r="1.2" fill="#22d3ee"/>
        <path d="M7 12 A5 5 0 0 1 12 7" stroke="#00d4ff" strokeWidth="1.2" fill="none"/>
      </svg>
    )
  },

  satelliteUplink: {
    name: 'Enlace Satelital',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5.5 18.5 l3-3 3 3 -3 3 -3-3Z" fill="#7c3aed"/>
        <path d="M11 8 l3-3 3 3 -3 3 -3-3Z" fill="#22d3ee"/>
        <path d="M8.5 15 L15 8.5" stroke="#00d4ff" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M16.5 12.5 Q19 10 20.5 12.5" stroke="#22d3ee" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      </svg>
    )
  },

  networkHub: {
    name: 'Hub de Red',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="2.2" fill="#22d3ee"/>
        <circle cx="6" cy="7" r="1.8" fill="#7c3aed"/>
        <circle cx="18" cy="7" r="1.8" fill="#7c3aed"/>
        <circle cx="6" cy="17" r="1.8" fill="#7c3aed"/>
        <circle cx="18" cy="17" r="1.8" fill="#7c3aed"/>
        <path d="M12 12 L6 7 M12 12 L18 7 M12 12 L6 17 M12 12 L18 17" stroke="#00d4ff" strokeWidth="1.6"/>
      </svg>
    )
  },

  analyticsDashboard: {
    name: 'Panel Analítico',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="6" width="17" height="12" rx="2" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.6"/>
        <path d="M6.5 15 L9.5 12.2 L12 13.6 L16.5 9.5" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <circle cx="16.5" cy="9.5" r="1" fill="#7c3aed"/>
        <rect x="5.5" y="7.2" width="12" height="1.4" rx="0.7" fill="#111827"/>
      </svg>
    )
  },

  systemMonitor: {
    name: 'Monitor de Sistema',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5.5" width="17" height="11.5" rx="2" fill="#0f1a2b" stroke="#00d4ff" strokeWidth="1.6"/>
        <path d="M5.8 12 h2.2 l1.1-3.2 1.4 6 1.2-3h2.2 l1-2.2 1 2.2 h2.1" stroke="#22d3ee" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="8.5" y="18.2" width="7" height="1.6" rx="0.8" fill="#7c3aed"/>
      </svg>
    )
  },

  slidersControl: {
    name: 'Controles Deslizantes',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M6 6 v12" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M12 6 v12" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M18 6 v12" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="4.5" y="9.5" width="3" height="3" rx="1" fill="#7c3aed"/>
        <rect x="10.5" y="7" width="3" height="3" rx="1" fill="#00d4ff"/>
        <rect x="16.5" y="12" width="3" height="3" rx="1" fill="#7c3aed"/>
      </svg>
    )
  },

  serverRack: {
    name: 'Rack de Servidores',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="6" y="4.5" width="12" height="15" rx="1.6" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.6"/>
        <rect x="8" y="6.5" width="8" height="2.6" rx="0.6" fill="#111827" stroke="#7c3aed" strokeWidth="1"/>
        <rect x="8" y="10" width="8" height="2.6" rx="0.6" fill="#111827" stroke="#7c3aed" strokeWidth="1"/>
        <rect x="8" y="13.5" width="8" height="2.6" rx="0.6" fill="#111827" stroke="#7c3aed" strokeWidth="1"/>
        <circle cx="9.4" cy="7.8" r="0.4" fill="#00d4ff"/>
        <circle cx="9.4" cy="11.3" r="0.4" fill="#00d4ff"/>
        <circle cx="9.4" cy="14.8" r="0.4" fill="#00d4ff"/>
      </svg>
    )
  },

  globeGrid: {
    name: 'Globo en Rejilla',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="#22d3ee" strokeWidth="1.6"/>
        <path d="M4.2 12 h15.6 M12 4.2 v15.6 M7.5 7.5 A8.5 8.5 0 0 0 16.5 16.5 M16.5 7.5 A8.5 8.5 0 0 0 7.5 16.5" stroke="#7c3aed" strokeWidth="1.2" fill="none"/>
      </svg>
    )
  },

  waveformScope: {
    name: 'Osciloscopio',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="6" width="17" height="12" rx="2" fill="#0b1220" stroke="#00d4ff" strokeWidth="1.6"/>
        <path d="M5.8 12 H8 l1-2.5 1.2 5 1-2.2 H13 l1-2 1 2 h2.2" stroke="#22d3ee" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  shieldOps: {
    name: 'Seguridad (Ops)',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4 l7 3 v5.5c0 4.6-4.2 7.4-7 8.5-2.8-1.1-7-3.9-7-8.5V7l7-3Z" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.6"/>
        <path d="M9.5 12.5 l1.8 1.8 3.7-3.7" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },

  holoConsole: {
    name: 'Consola Holográfica',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="holoCtrl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect x="5" y="14" width="14" height="3.2" rx="1.6" fill="#0b1220" stroke="url(#holoCtrl)" strokeWidth="1.4"/>
        <rect x="7" y="7" width="10" height="5.2" rx="1.2" fill="#0f1a2b" stroke="#22d3ee" strokeWidth="1.2"/>
        <path d="M8 11 Q12 8.7 16 11" stroke="#22d3ee" strokeWidth="1.4" fill="none"/>
      </svg>
    )
  },

  cockpitHUD: {
    name: 'HUD de Cabina',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.8" stroke="#00d4ff" strokeWidth="1.6"/>
        <path d="M8 12 h8" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M12 8 v8" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="2.2" fill="#22d3ee"/>
      </svg>
    )
  },

  opsTimeline: {
    name: 'Línea de Tiempo (Ops)',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 12 h16" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="6.5" cy="12" r="1.1" fill="#7c3aed"/>
        <circle cx="12" cy="12" r="1.1" fill="#22d3ee"/>
        <circle cx="17.5" cy="12" r="1.1" fill="#7c3aed"/>
      </svg>
    )
  },

  opsGrid: {
    name: 'Rejilla de Operaciones',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="2" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.6"/>
        <path d="M4 10 H20 M4 14 H20 M8 6 V18 M16 6 V18" stroke="#7c3aed" strokeWidth="1.2"/>
        <circle cx="10" cy="12" r="1" fill="#22d3ee"/>
        <circle cx="14" cy="12" r="1" fill="#22d3ee"/>
      </svg>
    )
  },

  // === ICONOS DE ALTA DETALLA Y COLOR (OPS / CONTROL) ===

  opCenterNeon: {
    name: 'Centro de Control Neón',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="opNeonGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffe0"/>
            <stop offset="100%" stopColor="#0066ff"/>
          </linearGradient>
          <linearGradient id="opNeonGradB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff00ff"/>
            <stop offset="100%" stopColor="#00e5ff"/>
          </linearGradient>
          <filter id="opNeonGlowA" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4"/>
          </filter>
        </defs>
        <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.8" fill="#0a0f1f" stroke="url(#opNeonGradA)" strokeWidth="1.6"/>
        <rect x="5.2" y="7.3" width="8.8" height="5.1" rx="1.2" fill="#0e1630" stroke="#00e5ff" strokeWidth="1"/>
        <path d="M6.2 11 Q9.6 8.9 13 11" stroke="#00e5ff" strokeWidth="1.3" fill="none"/>
        <rect x="15.2" y="8.2" width="3.6" height="1.6" rx="0.8" fill="#ff00ff"/>
        <rect x="6.2" y="14.4" width="11.6" height="2.2" rx="1.1" fill="#0f172a" stroke="url(#opNeonGradB)" strokeWidth="1" filter="url(#opNeonGlowA)"/>
        <circle cx="7.6" cy="8.6" r="0.6" fill="#00e5ff"/>
        <circle cx="9.0" cy="8.6" r="0.6" fill="#ff00ff"/>
        <circle cx="10.4" cy="8.6" r="0.6" fill="#00ffe0"/>
      </svg>
    )
  },

  controlMatrixGrid: {
    name: 'Matriz de Control',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ctrlMxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff88"/>
            <stop offset="100%" stopColor="#006644"/>
          </linearGradient>
        </defs>
        <rect x="4" y="6" width="16" height="12" rx="2" fill="#061218" stroke="#00d4aa" strokeWidth="1.6"/>
        <path d="M6 8 H18 M6 10 H18 M6 12 H18 M6 14 H18" stroke="#00ffa8" strokeWidth="1" opacity="0.9"/>
        <circle cx="8" cy="8" r="0.75" fill="url(#ctrlMxGrad)"/>
        <circle cx="12" cy="10" r="0.75" fill="#00e6a0"/>
        <circle cx="16" cy="12" r="0.75" fill="#00ffcc"/>
        <rect x="7.2" y="15" width="9.6" height="2.2" rx="1.1" fill="#0a1a1f" stroke="#00ffcc" strokeWidth="1"/>
      </svg>
    )
  },

  multiPanelCockpit: {
    name: 'Cabina Multipanel',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5.2" width="17" height="13.6" rx="2.4" fill="#0c1326" stroke="#22d3ee" strokeWidth="1.6"/>
        <rect x="5.2" y="7" width="5.6" height="4.2" rx="0.8" fill="#101b33" stroke="#7c3aed" strokeWidth="1"/>
        <rect x="11.6" y="7" width="5.6" height="4.2" rx="0.8" fill="#101b33" stroke="#00d4ff" strokeWidth="1"/>
        <rect x="5.2" y="12.2" width="12" height="4" rx="1.2" fill="#0f172a" stroke="#22d3ee" strokeWidth="1"/>
        <path d="M6.4 13.8 H15.8" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )
  },

  cyberOpsShield: {
    name: 'Escudo Cibernético',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="cybShieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5ff"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <path d="M12 4.2 l7 2.9 v5.6c0 4.4-4 7.1-7 8.2-3-1.1-7-3.8-7-8.2V7.1l7-2.9Z" fill="#0a0f1f" stroke="url(#cybShieldGrad)" strokeWidth="1.6"/>
        <path d="M9.2 12.5 l2.2 2.2 4.4-4.4" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="9.2" r="1.2" fill="#7c3aed"/>
      </svg>
    )
  },

  alertCenter: {
    name: 'Centro de Alertas',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="2" fill="#1a0e16" stroke="#ff00aa" strokeWidth="1.6"/>
        <path d="M12 8 l2.8 4.8 h-5.6L12 8Z" fill="#ff4dd2"/>
        <rect x="7" y="14.5" width="10" height="1.6" rx="0.8" fill="#33091f" stroke="#ff4dd2" strokeWidth="1"/>
      </svg>
    )
  },

  commandPalette: {
    name: 'Paleta de Comandos',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="cmdPalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399"/>
            <stop offset="100%" stopColor="#10b981"/>
          </linearGradient>
        </defs>
        <rect x="3.5" y="6" width="17" height="12" rx="2" fill="#071912" stroke="#10b981" strokeWidth="1.6"/>
        <rect x="5.5" y="8" width="7.5" height="3.2" rx="0.8" fill="#0b2419" stroke="#34d399" strokeWidth="1"/>
        <rect x="13.8" y="8" width="4.7" height="3.2" rx="0.8" fill="url(#cmdPalGrad)"/>
        <rect x="5.5" y="12.5" width="13" height="1.8" rx="0.9" fill="#0b2419" stroke="#10b981" strokeWidth="1"/>
      </svg>
    )
  },

  telemetryRings: {
    name: 'Anillos de Telemetría',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.8" stroke="#00d4ff" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="5.3" stroke="#7c3aed" strokeWidth="1.4"/>
        <circle cx="12" cy="12" r="3.2" stroke="#22d3ee" strokeWidth="1.3"/>
        <circle cx="12" cy="12" r="1.4" fill="#22d3ee"/>
      </svg>
    )
  },

  meshNetwork: {
    name: 'Red Mallada',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="6" r="1.2" fill="#22d3ee"/>
        <circle cx="18" cy="6" r="1.2" fill="#22d3ee"/>
        <circle cx="6" cy="18" r="1.2" fill="#22d3ee"/>
        <circle cx="18" cy="18" r="1.2" fill="#22d3ee"/>
        <circle cx="12" cy="12" r="1.4" fill="#7c3aed"/>
        <path d="M6 6 L12 12 L18 6 L18 18 L12 12 L6 18 Z" stroke="#00d4ff" strokeWidth="1.4"/>
      </svg>
    )
  },

  kpiGauges: {
    name: 'Indicadores KPI',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="kpiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#f43f5e"/>
          </linearGradient>
        </defs>
        <path d="M12 5 a7 7 0 0 1 7 7h-14a7 7 0 0 1 7-7Z" fill="#0b1220" stroke="url(#kpiGrad)" strokeWidth="1.6"/>
        <path d="M12 12 L16 9.5" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.2" fill="#fb7185"/>
      </svg>
    )
  },

  pipelineFlow: {
    name: 'Flujo de Pipeline',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="7" width="5" height="3" rx="0.8" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.2"/>
        <rect x="10.5" y="7" width="5" height="3" rx="0.8" fill="#0b1220" stroke="#7c3aed" strokeWidth="1.2"/>
        <rect x="16.5" y="7" width="3.5" height="3" rx="0.8" fill="#0b1220" stroke="#00d4ff" strokeWidth="1.2"/>
        <path d="M7 10 L7 12 H12 L12 14 H18" stroke="#00d4ff" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
  },

  securityVault: {
    name: 'Bóveda de Seguridad',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5.2" y="6" width="13.6" height="12" rx="1.6" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="3" stroke="#7c3aed" strokeWidth="1.6"/>
        <path d="M12 9 v6 M9 12 h6" stroke="#00d4ff" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    )
  },

  quantumConsole: {
    name: 'Consola Cuántica',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <radialGradient id="qConsGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#7c3aed"/>
            <stop offset="100%" stopColor="#00d4ff"/>
          </radialGradient>
        </defs>
        <rect x="3.5" y="6" width="17" height="12" rx="2.2" fill="#0a0f1f" stroke="#7c3aed" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="4.2" fill="url(#qConsGrad)" opacity="0.7"/>
        <path d="M8.5 12 h7" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
  },

  // === ICONOS ADICIONALES - MÁS VARIEDAD FUTURISTA ===


  holographicHome: {
    name: 'Hogar Holográfico',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_holographic1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#aa00ff"/>
            <stop offset="100%" stopColor="#440088"/>
          </linearGradient>
          <filter id="f_holographic1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M30 60 L50 30 L70 60 L70 85 L30 85 Z" fill="url(#g_holographic1)" filter="url(#f_holographic1)" opacity="0.6"/>
        <circle cx="50" cy="45" r="15" fill="url(#g_holographic1)" filter="url(#f_holographic1)" opacity="0.4"/>
      </svg>
    )
  },

  energyHouse: {
    name: 'Casa Energética',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_energy1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffff00"/>
            <stop offset="100%" stopColor="#666600"/>
          </linearGradient>
          <filter id="f_energy1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="50" width="50" height="35" fill="url(#g_energy1)" filter="url(#f_energy1)"/>
        <polygon points="25,50 50,25 75,50" fill="url(#g_energy1)" filter="url(#f_energy1)"/>
        <path d="M35 65 Q50 55 65 65" stroke="#ffff00" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#f_energy1)"/>
        <circle cx="50" cy="70" r="3" fill="#ffffff" filter="url(#f_energy1)"/>
      </svg>
    )
  },

  digitalHome: {
    name: 'Hogar Digital',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_digital1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00aaff"/>
            <stop offset="100%" stopColor="#0066aa"/>
          </linearGradient>
          <filter id="f_digital1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="20" y="45" width="60" height="40" fill="url(#g_digital1)" filter="url(#f_digital1)"/>
        <polygon points="20,45 50,20 80,45" fill="url(#g_digital1)" filter="url(#f_digital1)"/>
        <rect x="35" y="60" width="8" height="8" fill="#ffffff" opacity="0.8"/>
        <rect x="57" y="60" width="8" height="8" fill="#ffffff" opacity="0.8"/>
        <rect x="46" y="75" width="8" height="10" fill="#00aaff" filter="url(#f_digital1)"/>
      </svg>
    )
  },

  laserHouse: {
    name: 'Casa Láser',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_laser1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4444"/>
            <stop offset="100%" stopColor="#880000"/>
          </linearGradient>
          <filter id="f_laser1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M25 55 L50 20 L75 55 L75 85 L25 85 Z" fill="url(#g_laser1)" filter="url(#f_laser1)"/>
        <line x1="30" y1="70" x2="70" y2="70" stroke="#ff4444" strokeWidth="3" filter="url(#f_laser1)"/>
        <line x1="30" y1="80" x2="70" y2="80" stroke="#ff4444" strokeWidth="3" filter="url(#f_laser1)"/>
        <circle cx="50" cy="35" r="2" fill="#ffffff" filter="url(#f_laser1)"/>
      </svg>
    )
  },

  plasmaHome: {
    name: 'Hogar Plasma',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_plasma1" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ff00aa"/>
            <stop offset="100%" stopColor="#440022"/>
          </radialGradient>
          <filter id="f_plasma1">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="55" r="30" fill="url(#g_plasma1)" filter="url(#f_plasma1)"/>
        <circle cx="40" cy="45" r="2" fill="#ffffff" opacity="0.9"/>
        <circle cx="60" cy="45" r="2" fill="#ffffff" opacity="0.9"/>
        <circle cx="50" cy="65" r="2" fill="#ffffff" opacity="0.9"/>
      </svg>
    )
  },


  neonMatrix: {
    name: 'Matrix Neón',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_neonMatrix1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff00"/>
            <stop offset="100%" stopColor="#004400"/>
          </linearGradient>
          <filter id="f_neonMatrix1">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="20" y="40" width="60" height="45" fill="url(#g_neonMatrix1)" filter="url(#f_neonMatrix1)"/>
        <polygon points="20,40 50,15 80,40" fill="url(#g_neonMatrix1)" filter="url(#f_neonMatrix1)"/>
        <line x1="25" y1="55" x2="75" y2="55" stroke="#00ff00" strokeWidth="2" filter="url(#f_neonMatrix1)"/>
        <line x1="25" y1="70" x2="75" y2="70" stroke="#00ff00" strokeWidth="2" filter="url(#f_neonMatrix1)"/>
      </svg>
    )
  },

  cyberGlow: {
    name: 'Resplandor Cibernético',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_cyberGlow1" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff6600"/>
            <stop offset="100%" stopColor="#330000"/>
          </radialGradient>
          <filter id="f_cyberGlow1">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M30 60 L50 25 L70 60 L70 85 L30 85 Z" fill="url(#g_cyberGlow1)" filter="url(#f_cyberGlow1)"/>
        <circle cx="50" cy="45" r="8" fill="#ffffff" filter="url(#f_cyberGlow1)"/>
      </svg>
    )
  },


  energyCore: {
    name: 'Núcleo Energético',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCore1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffff00"/>
            <stop offset="100%" stopColor="#666600"/>
          </radialGradient>
          <filter id="f_energyCore1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCore1)" filter="url(#f_energyCore1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCore1)"/>
        <circle cx="50" cy="50" r="5" fill="#ffff00" filter="url(#f_energyCore1)"/>
      </svg>
    )
  },

  energyCoreBlue: {
    name: 'Núcleo Azul',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreBlue1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00aaff"/>
            <stop offset="100%" stopColor="#003366"/>
          </radialGradient>
          <filter id="f_energyCoreBlue1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreBlue1)" filter="url(#f_energyCoreBlue1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreBlue1)"/>
        <circle cx="50" cy="50" r="5" fill="#00aaff" filter="url(#f_energyCoreBlue1)"/>
      </svg>
    )
  },

  energyCoreRed: {
    name: 'Núcleo Rojo',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreRed1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff4444"/>
            <stop offset="100%" stopColor="#660000"/>
          </radialGradient>
          <filter id="f_energyCoreRed1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreRed1)" filter="url(#f_energyCoreRed1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreRed1)"/>
        <circle cx="50" cy="50" r="5" fill="#ff4444" filter="url(#f_energyCoreRed1)"/>
      </svg>
    )
  },

  energyCoreGreen: {
    name: 'Núcleo Verde',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreGreen1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00ff88"/>
            <stop offset="100%" stopColor="#006644"/>
          </radialGradient>
          <filter id="f_energyCoreGreen1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreGreen1)" filter="url(#f_energyCoreGreen1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreGreen1)"/>
        <circle cx="50" cy="50" r="5" fill="#00ff88" filter="url(#f_energyCoreGreen1)"/>
      </svg>
    )
  },

  energyCorePurple: {
    name: 'Núcleo Púrpura',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCorePurple1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#aa00ff"/>
            <stop offset="100%" stopColor="#440088"/>
          </radialGradient>
          <filter id="f_energyCorePurple1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCorePurple1)" filter="url(#f_energyCorePurple1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCorePurple1)"/>
        <circle cx="50" cy="50" r="5" fill="#aa00ff" filter="url(#f_energyCorePurple1)"/>
      </svg>
    )
  },

  energyCoreCyan: {
    name: 'Núcleo Cyan',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreCyan1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#004488"/>
          </radialGradient>
          <filter id="f_energyCoreCyan1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreCyan1)" filter="url(#f_energyCoreCyan1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreCyan1)"/>
        <circle cx="50" cy="50" r="5" fill="#00ffff" filter="url(#f_energyCoreCyan1)"/>
      </svg>
    )
  },

  energyCoreOrange: {
    name: 'Núcleo Naranja',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreOrange1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff6600"/>
            <stop offset="100%" stopColor="#663300"/>
          </radialGradient>
          <filter id="f_energyCoreOrange1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreOrange1)" filter="url(#f_energyCoreOrange1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreOrange1)"/>
        <circle cx="50" cy="50" r="5" fill="#ff6600" filter="url(#f_energyCoreOrange1)"/>
      </svg>
    )
  },

  energyCorePink: {
    name: 'Núcleo Rosa',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCorePink1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff00aa"/>
            <stop offset="100%" stopColor="#660044"/>
          </radialGradient>
          <filter id="f_energyCorePink1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCorePink1)" filter="url(#f_energyCorePink1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCorePink1)"/>
        <circle cx="50" cy="50" r="5" fill="#ff00aa" filter="url(#f_energyCorePink1)"/>
      </svg>
    )
  },

  energyCoreMagenta: {
    name: 'Núcleo Magenta',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="g_energyCoreMagenta1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff00ff"/>
            <stop offset="100%" stopColor="#660066"/>
          </radialGradient>
          <filter id="f_energyCoreMagenta1">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="url(#g_energyCoreMagenta1)" filter="url(#f_energyCoreMagenta1)"/>
        <circle cx="50" cy="50" r="15" fill="#ffffff" filter="url(#f_energyCoreMagenta1)"/>
        <circle cx="50" cy="50" r="5" fill="#ff00ff" filter="url(#f_energyCoreMagenta1)"/>
      </svg>
    )
  },

  neonCircuit: {
    name: 'Circuito Neón',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_neonCircuit1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#004488"/>
          </linearGradient>
          <filter id="f_neonCircuit1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="45" width="50" height="40" fill="url(#g_neonCircuit1)" filter="url(#f_neonCircuit1)"/>
        <polygon points="25,45 50,20 75,45" fill="url(#g_neonCircuit1)" filter="url(#f_neonCircuit1)"/>
        <line x1="30" y1="60" x2="70" y2="60" stroke="#00ffff" strokeWidth="3" filter="url(#f_neonCircuit1)"/>
        <line x1="30" y1="75" x2="70" y2="75" stroke="#00ffff" strokeWidth="3" filter="url(#f_neonCircuit1)"/>
      </svg>
    )
  },

  brainPlugHome: {
    name: 'Hogar IA',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_brainPlug" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff"/>
            <stop offset="100%" stopColor="#2979ff"/>
          </linearGradient>
          <filter id="f_brainPlug">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M15 45 L50 18 L85 45 M15 45 L15 85 L85 85 L85 45" stroke="url(#g_brainPlug)" strokeWidth="4.5" fill="none" filter="url(#f_brainPlug)"/>
        <circle cx="40" cy="58" r="14" stroke="url(#g_brainPlug)" strokeWidth="3" fill="none" filter="url(#f_brainPlug)"/>
        <path d="M32 52 Q36 48 40 52 Q44 56 48 52" stroke="#00e5ff" strokeWidth="2.5" fill="none"/>
        <path d="M32 58 Q36 62 40 58 Q44 54 48 58" stroke="#00e5ff" strokeWidth="2.5" fill="none"/>
        <path d="M32 64 Q36 68 40 64 Q44 60 48 64" stroke="#00e5ff" strokeWidth="2.5" fill="none"/>
        <rect x="60" y="70" width="16" height="12" rx="2" stroke="#2979ff" strokeWidth="3" fill="none" filter="url(#f_brainPlug)"/>
        <line x1="64" y1="73" x2="64" y2="78" stroke="#2979ff" strokeWidth="3" strokeLinecap="round"/>
        <line x1="72" y1="73" x2="72" y2="78" stroke="#2979ff" strokeWidth="3" strokeLinecap="round"/>
        <path d="M54 60 L60 70" stroke="#00e5ff" strokeWidth="2.5"/>
      </svg>
    )
  },

  purplePlugHome: {
    name: 'Energía Inteligente',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_purplePlug" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d946ef"/>
            <stop offset="100%" stopColor="#a855f7"/>
          </linearGradient>
          <filter id="f_purplePlug">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M15 45 L50 18 L85 45 L85 85 L15 85 Z" fill="url(#g_purplePlug)" filter="url(#f_purplePlug)"/>
        <rect x="38" y="50" width="24" height="20" rx="3" fill="#1e0e2e" stroke="#d946ef" strokeWidth="2.5"/>
        <line x1="44" y1="55" x2="44" y2="60" stroke="#d946ef" strokeWidth="3" strokeLinecap="round"/>
        <line x1="56" y1="55" x2="56" y2="60" stroke="#d946ef" strokeWidth="3" strokeLinecap="round"/>
        <path d="M45 78 L55 85 M50 82 L50 70" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" filter="url(#f_purplePlug)"/>
        <path d="M55 78 L45 85" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" filter="url(#f_purplePlug)"/>
      </svg>
    )
  },

  chipSecurityHex: {
    name: 'Chip Seguro',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_chipSec" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981"/>
            <stop offset="100%" stopColor="#34d399"/>
          </linearGradient>
          <filter id="f_chipSec">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M50 15 L85 35 L85 75 L50 95 L15 75 L15 35 Z" stroke="url(#g_chipSec)" strokeWidth="4.5" fill="none" filter="url(#f_chipSec)"/>
        <rect x="38" y="38" width="24" height="24" rx="3" stroke="#10b981" strokeWidth="3" fill="none"/>
        <line x1="25" y1="42" x2="38" y2="42" stroke="#10b981" strokeWidth="3"/>
        <line x1="25" y1="58" x2="38" y2="58" stroke="#10b981" strokeWidth="3"/>
        <line x1="62" y1="42" x2="75" y2="42" stroke="#10b981" strokeWidth="3"/>
        <line x1="62" y1="58" x2="75" y2="58" stroke="#10b981" strokeWidth="3"/>
        <rect x="30" y="70" width="12" height="10" rx="2" stroke="#10b981" strokeWidth="2.5" fill="none"/>
        <path d="M32 70 V 65 C32 62 34 60 36 60 C38 60 40 62 40 65 V 70" stroke="#10b981" strokeWidth="2.5" fill="none"/>
      </svg>
    )
  },

  colorLayers: {
    name: 'Capas de Color',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <filter id="f_layers">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <ellipse cx="50" cy="70" rx="32" ry="14" fill="#ec4899" filter="url(#f_layers)"/>
        <ellipse cx="50" cy="50" rx="32" ry="14" fill="#06b6d4" filter="url(#f_layers)"/>
        <ellipse cx="50" cy="30" rx="32" ry="14" fill="#fbbf24" filter="url(#f_layers)"/>
        <circle cx="50" cy="30" r="10" fill="#f97316"/>
        <circle cx="50" cy="30" r="5" fill="#fbbf24"/>
      </svg>
    )
  },

  upArrow: {
    name: 'Subida',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_upArrow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16"/>
            <stop offset="100%" stopColor="#a3e635"/>
          </linearGradient>
          <filter id="f_upArrow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" stroke="url(#g_upArrow)" strokeWidth="5" fill="none" filter="url(#f_upArrow)"/>
        <path d="M50 30 L50 70 M50 30 L35 45 M50 30 L65 45" stroke="url(#g_upArrow)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#f_upArrow)"/>
      </svg>
    )
  },

  // === Fila 2 ===
  
  cloudHeart: {
    name: 'Nube y Corazón',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
         <defs>
          <linearGradient id="g_cloudHeart" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#d946ef"/>
          </linearGradient>
          <filter id="f_cloudHeart">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 M20 50 V 85 H 80 V 50" stroke="url(#g_cloudHeart)" strokeWidth="4.5" fill="none" filter="url(#f_cloudHeart)"/>
        <path d="M40 20 C30 20 25 30 35 35 C30 45 45 45 50 35 C60 35 65 25 55 20 Z" stroke="url(#g_cloudHeart)" strokeWidth="4" fill="none" filter="url(#f_cloudHeart)"/>
        <path d="M50 75 C45 70 42 67 42 64 C42 62 43 60 45 60 C47 60 48 61 50 63 C52 61 53 60 55 60 C57 60 58 62 58 64 C58 67 55 70 50 75 Z" fill="#d946ef" filter="url(#f_cloudHeart)"/>
      </svg>
    )
  },

  gearFuture: {
    name: 'Engranaje Futuro',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981"/>
            <stop offset="100%" stopColor="#34d399"/>
          </linearGradient>
          <linearGradient id="gearCenterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#fb923c"/>
          </linearGradient>
          <filter id="gearGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="30" fill="#042f2e" stroke="url(#gearGrad)" strokeWidth="4" filter="url(#gearGlow)"/>
        <path d="M50 15 L45 25 L55 25 Z" fill="url(#gearGrad)" filter="url(#gearGlow)"/>
        <path d="M50 85 L45 75 L55 75 Z" fill="url(#gearGrad)" filter="url(#gearGlow)"/>
        <path d="M15 50 L25 45 L25 55 Z" fill="url(#gearGrad)" filter="url(#gearGlow)"/>
        <path d="M85 50 L75 45 L75 55 Z" fill="url(#gearGrad)" filter="url(#gearGlow)"/>
        <circle cx="50" cy="50" r="15" fill="#451a03" stroke="url(#gearCenterGrad)" strokeWidth="3" filter="url(#gearGlow)"/>
        <circle cx="50" cy="50" r="8" fill="url(#gearCenterGrad)" filter="url(#gearGlow)"/>
      </svg>
    )
  },

  soundHome: {
    name: 'Casa Sonido',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="soundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#fb923c"/>
          </linearGradient>
          <filter id="soundGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#451a03" stroke="url(#soundGrad)" strokeWidth="4" filter="url(#soundGlow)"/>
        <path d="M40 55 L32 60 L32 70 L40 75 L40 55 Z" fill="url(#soundGrad)" filter="url(#soundGlow)"/>
        <path d="M45 50 C50 55 50 75 45 80" stroke="url(#soundGrad)" strokeWidth="3.5" fill="none" filter="url(#soundGlow)"/>
        <path d="M50 45 C58 55 58 75 50 85" stroke="url(#soundGrad)" strokeWidth="3.5" fill="none" filter="url(#soundGlow)" opacity="0.7"/>
      </svg>
    )
  },

  brainHome: {
    name: 'Casa IA',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#22d3ee"/>
          </linearGradient>
          <filter id="brainGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#0e7490" stroke="url(#brainGrad)" strokeWidth="4" filter="url(#brainGlow)"/>
        <circle cx="50" cy="60" r="15" fill="none" stroke="url(#brainGrad)" strokeWidth="3" filter="url(#brainGlow)"/>
        <path d="M40 55 Q45 50 50 55 Q55 60 60 55" stroke="#06b6d4" strokeWidth="2.5" fill="none" filter="url(#brainGlow)"/>
        <path d="M40 65 Q45 70 50 65 Q55 60 60 65" stroke="#06b6d4" strokeWidth="2.5" fill="none" filter="url(#brainGlow)"/>
      </svg>
    )
  },

  leafHome: {
    name: 'Casa Eco',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16"/>
            <stop offset="100%" stopColor="#a3e635"/>
          </linearGradient>
          <filter id="leafGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#365314" stroke="url(#leafGrad)" strokeWidth="4" filter="url(#leafGlow)"/>
        <path d="M50 55 Q60 55 65 65 Q65 75 50 80 Q50 65 50 55 Z" fill="url(#leafGrad)" filter="url(#leafGlow)"/>
        <path d="M50 55 L50 80" stroke="#365314" strokeWidth="3" filter="url(#leafGlow)"/>
      </svg>
    )
  },

  lockHome: {
    name: 'Casa Segura',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#f87171"/>
          </linearGradient>
          <filter id="lockGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#450a0a" stroke="url(#lockGrad)" strokeWidth="4" filter="url(#lockGlow)"/>
        <rect x="40" y="60" width="20" height="15" rx="3" fill="none" stroke="url(#lockGrad)" strokeWidth="3.5" filter="url(#lockGlow)"/>
        <path d="M42 60 L42 52 C42 48 45 45 50 45 C55 45 58 48 58 52 L58 60" stroke="url(#lockGrad)" strokeWidth="3.5" fill="none" filter="url(#lockGlow)"/>
      </svg>
    )
  },

  // === Fila 3 ===

  tempHome: {
    name: 'Termostato',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_temp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#22d3ee"/>
          </linearGradient>
          <filter id="f_temp">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#0e7490" stroke="url(#g_temp)" strokeWidth="4" filter="url(#f_temp)"/>
        <rect x="44" y="45" width="12" height="30" rx="6" stroke="#06b6d4" strokeWidth="3" fill="none"/>
        <circle cx="50" cy="70" r="8" fill="#06b6d4"/>
        <line x1="50" y1="50" x2="50" y2="65" stroke="#0e7490" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    )
  },

  lightningHome: {
    name: 'Casa Energía',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_lightning" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171"/>
            <stop offset="100%" stopColor="#dc2626"/>
          </linearGradient>
          <filter id="f_lightning">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M20 50 L50 25 L80 50 L80 85 L20 85 Z" fill="#450a0a" stroke="url(#g_lightning)" strokeWidth="4" filter="url(#f_lightning)"/>
        <path d="M58 45 L45 60 L52 60 L42 75 L55 60 L48 60 L58 45 Z" fill="url(#g_lightning)" filter="url(#f_lightning)"/>
      </svg>
    )
  },


  battery: {
    name: 'Batería',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_battery" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16"/>
            <stop offset="100%" stopColor="#a3e635"/>
          </linearGradient>
          <filter id="f_battery"><feGaussianBlur stdDeviation="2" result="blur"/></filter>
        </defs>
        <rect x="30" y="20" width="40" height="60" rx="5" fill="#365314" stroke="url(#g_battery)" strokeWidth="4" filter="url(#f_battery)"/>
        <rect x="40" y="15" width="20" height="5" rx="2" fill="url(#g_battery)"/>
        <rect x="35" y="65" width="30" height="10" rx="2" fill="url(#g_battery)"/>
        <rect x="35" y="50" width="30" height="10" rx="2" fill="url(#g_battery)"/>
        <rect x="35" y="35" width="30" height="10" rx="2" fill="url(#g_battery)"/>
      </svg>
    )
  },

  // === ICONOS DE GRUPOS - INTEGRADOS CON TEMAS ===

  groupGrid: {
    name: 'Grupos Cuadrícula',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="g_groupGrid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ui-tab-active-text, #1976d2)"/>
            <stop offset="100%" stopColor="var(--ui-button-primary, #1565c0)"/>
          </linearGradient>
          <filter id="f_groupGrid">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Cuadrícula de grupos */}
        <rect x="15" y="15" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2" filter="url(#f_groupGrid)"/>
        <rect x="45" y="15" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2" filter="url(#f_groupGrid)"/>
        <rect x="15" y="45" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2" filter="url(#f_groupGrid)"/>
        <rect x="45" y="45" width="25" height="25" rx="3" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupGrid)" strokeWidth="2" filter="url(#f_groupGrid)"/>
        
        {/* Puntos centrales */}
        <circle cx="27.5" cy="27.5" r="3" fill="url(#g_groupGrid)" filter="url(#f_groupGrid)"/>
        <circle cx="57.5" cy="27.5" r="3" fill="url(#g_groupGrid)" filter="url(#f_groupGrid)"/>
        <circle cx="27.5" cy="57.5" r="3" fill="url(#g_groupGrid)" filter="url(#f_groupGrid)"/>
        <circle cx="57.5" cy="57.5" r="3" fill="url(#g_groupGrid)" filter="url(#f_groupGrid)"/>
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
          <filter id="f_groupLayers">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Capas superpuestas */}
        <rect x="20" y="30" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5" filter="url(#f_groupLayers)" opacity="0.8"/>
        <rect x="25" y="25" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5" filter="url(#f_groupLayers)" opacity="0.9"/>
        <rect x="30" y="20" width="60" height="40" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupLayers)" strokeWidth="2.5" filter="url(#f_groupLayers)"/>
        
        {/* Iconos de grupo en cada capa */}
        <circle cx="50" cy="35" r="4" fill="url(#g_groupLayers)" filter="url(#f_groupLayers)"/>
        <circle cx="55" cy="40" r="4" fill="url(#g_groupLayers)" filter="url(#f_groupLayers)"/>
        <circle cx="60" cy="45" r="4" fill="url(#g_groupLayers)" filter="url(#f_groupLayers)"/>
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
          <filter id="f_groupNetwork">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Nodos de red */}
        <circle cx="30" cy="30" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3" filter="url(#f_groupNetwork)"/>
        <circle cx="70" cy="30" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3" filter="url(#f_groupNetwork)"/>
        <circle cx="30" cy="70" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3" filter="url(#f_groupNetwork)"/>
        <circle cx="70" cy="70" r="8" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupNetwork)" strokeWidth="3" filter="url(#f_groupNetwork)"/>
        <circle cx="50" cy="50" r="10" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupNetwork)" strokeWidth="3" filter="url(#f_groupNetwork)"/>
        
        {/* Conexiones */}
        <line x1="30" y1="30" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2" filter="url(#f_groupNetwork)"/>
        <line x1="70" y1="30" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2" filter="url(#f_groupNetwork)"/>
        <line x1="30" y1="70" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2" filter="url(#f_groupNetwork)"/>
        <line x1="70" y1="70" x2="50" y2="50" stroke="url(#g_groupNetwork)" strokeWidth="2" filter="url(#f_groupNetwork)"/>
        
        {/* Puntos centrales */}
        <circle cx="30" cy="30" r="3" fill="url(#g_groupNetwork)" filter="url(#f_groupNetwork)"/>
        <circle cx="70" cy="30" r="3" fill="url(#g_groupNetwork)" filter="url(#f_groupNetwork)"/>
        <circle cx="30" cy="70" r="3" fill="url(#g_groupNetwork)" filter="url(#f_groupNetwork)"/>
        <circle cx="70" cy="70" r="3" fill="url(#g_groupNetwork)" filter="url(#f_groupNetwork)"/>
        <circle cx="50" cy="50" r="4" fill="url(#g_groupNetwork)" filter="url(#f_groupNetwork)"/>
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
          <filter id="f_groupFolders">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Carpetas agrupadas */}
        <path d="M20 35 L20 75 L35 75 L40 65 L60 65 L65 75 L80 75 L80 35 L20 35 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5" filter="url(#f_groupFolders)"/>
        <path d="M25 30 L25 70 L30 70 L35 60 L55 60 L60 70 L75 70 L75 30 L25 30 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5" filter="url(#f_groupFolders)" opacity="0.8"/>
        <path d="M30 25 L30 65 L35 65 L40 55 L60 55 L65 65 L70 65 L70 25 L30 25 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupFolders)" strokeWidth="2.5" filter="url(#f_groupFolders)" opacity="0.6"/>
        
        {/* Iconos de grupo en las carpetas */}
        <circle cx="35" cy="50" r="3" fill="url(#g_groupFolders)" filter="url(#f_groupFolders)"/>
        <circle cx="50" cy="50" r="3" fill="url(#g_groupFolders)" filter="url(#f_groupFolders)"/>
        <circle cx="65" cy="50" r="3" fill="url(#g_groupFolders)" filter="url(#f_groupFolders)"/>
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
          <filter id="f_groupTabs">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Pestañas agrupadas */}
        <rect x="15" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        <rect x="40" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        <rect x="65" y="40" width="25" height="35" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        
        {/* Pestañas superiores */}
        <path d="M15 40 L20 30 L35 30 L40 40" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        <path d="M40 40 L45 30 L60 30 L65 40" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        <path d="M65 40 L70 30 L85 30 L90 40" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupTabs)" strokeWidth="2" filter="url(#f_groupTabs)"/>
        
        {/* Iconos en las pestañas */}
        <circle cx="27.5" cy="50" r="2" fill="url(#g_groupTabs)" filter="url(#f_groupTabs)"/>
        <circle cx="52.5" cy="50" r="2" fill="url(#g_groupTabs)" filter="url(#f_groupTabs)"/>
        <circle cx="77.5" cy="50" r="2" fill="url(#g_groupTabs)" filter="url(#f_groupTabs)"/>
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
          <filter id="f_groupCollection">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Contenedor principal */}
        <rect x="10" y="20" width="80" height="60" rx="6" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupCollection)" strokeWidth="3" filter="url(#f_groupCollection)"/>
        
        {/* Elementos del grupo */}
        <rect x="20" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        <rect x="40" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        <rect x="60" y="30" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        
        <rect x="20" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        <rect x="40" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        <rect x="60" y="50" width="15" height="15" rx="2" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupCollection)" strokeWidth="2" filter="url(#f_groupCollection)"/>
        
        {/* Puntos centrales */}
        <circle cx="27.5" cy="37.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
        <circle cx="47.5" cy="37.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
        <circle cx="67.5" cy="37.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
        <circle cx="27.5" cy="57.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
        <circle cx="47.5" cy="57.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
        <circle cx="67.5" cy="57.5" r="2" fill="url(#g_groupCollection)" filter="url(#f_groupCollection)"/>
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
          <filter id="f_groupMatrix">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Matriz de grupos */}
        <rect x="15" y="15" width="70" height="70" rx="4" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupMatrix)" strokeWidth="2.5" filter="url(#f_groupMatrix)"/>
        
        {/* Líneas de la matriz */}
        <line x1="35" y1="15" x2="35" y2="85" stroke="url(#g_groupMatrix)" strokeWidth="1.5" filter="url(#f_groupMatrix)"/>
        <line x1="55" y1="15" x2="55" y2="85" stroke="url(#g_groupMatrix)" strokeWidth="1.5" filter="url(#f_groupMatrix)"/>
        <line x1="15" y1="35" x2="85" y2="35" stroke="url(#g_groupMatrix)" strokeWidth="1.5" filter="url(#f_groupMatrix)"/>
        <line x1="15" y1="55" x2="85" y2="55" stroke="url(#g_groupMatrix)" strokeWidth="1.5" filter="url(#f_groupMatrix)"/>
        
        {/* Elementos en cada celda */}
        <circle cx="25" cy="25" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="45" cy="25" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="65" cy="25" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="25" cy="45" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="45" cy="45" r="4" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="65" cy="45" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="25" cy="65" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="45" cy="65" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
        <circle cx="65" cy="65" r="3" fill="url(#g_groupMatrix)" filter="url(#f_groupMatrix)"/>
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
          <filter id="f_groupHexagon">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Hexágonos agrupados */}
        <path d="M50 15 L70 25 L70 45 L50 55 L30 45 L30 25 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupHexagon)" strokeWidth="2.5" filter="url(#f_groupHexagon)"/>
        <path d="M50 25 L65 32 L65 48 L50 55 L35 48 L35 32 Z" fill="var(--ui-tab-bg, #f5f5f5)" stroke="url(#g_groupHexagon)" strokeWidth="2.5" filter="url(#f_groupHexagon)" opacity="0.8"/>
        <path d="M50 35 L60 40 L60 50 L50 55 L40 50 L40 40 Z" fill="var(--ui-tab-active-bg, #e3f2fd)" stroke="url(#g_groupHexagon)" strokeWidth="2.5" filter="url(#f_groupHexagon)"/>
        
        {/* Puntos centrales */}
        <circle cx="50" cy="35" r="3" fill="url(#g_groupHexagon)" filter="url(#f_groupHexagon)"/>
        <circle cx="50" cy="45" r="3" fill="url(#g_groupHexagon)" filter="url(#f_groupHexagon)"/>
        <circle cx="50" cy="50" r="4" fill="url(#g_groupHexagon)" filter="url(#f_groupHexagon)"/>
      </svg>
    )
  },

  secureHouse: {
    name: 'Casa Segura',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M60 34L40 18L20 34L20 62L60 62L60 34Z" fill="#F2C94C" />
        <path d="M60 34H62C62 33.3924 61.7238 32.8178 61.2494 32.4383L60 34ZM40 18L41.2494 16.4383C40.519 15.8539 39.481 15.8539 38.7506 16.4383L40 18ZM20 34L18.7506 32.4383C18.2762 32.8178 18 33.3924 18 34H20ZM20 62H18C18 63.1046 18.8954 64 20 64V62ZM60 62V64C61.1046 64 62 63.1046 62 62H60ZM61.2494 32.4383L41.2494 16.4383L38.7506 19.5617L58.7506 35.5617L61.2494 32.4383ZM38.7506 16.4383L18.7506 32.4383L21.2494 35.5617L41.2494 19.5617L38.7506 16.4383ZM18 34L18 62H22L22 34H18ZM20 64H60V60L20 60V64ZM62 62L62 34H58L58 62H62Z" fill="#F2C94C" />
        <path d="M67.5 40L64.5 37.6L40 18L15.5 37.6L12.5 40" stroke="#EB5757" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path fillRule="evenodd" clipRule="evenodd" d="M55 30V19H49V25.2L55 30Z" fill="#EB5757" />
        <path d="M55 19H57C57 17.8954 56.1046 17 55 17V19ZM55 30L53.7506 31.5617C54.3509 32.042 55.1734 32.1356 55.8664 31.8026C56.5593 31.4696 57 30.7688 57 30H55ZM49 19V17C47.8954 17 47 17.8954 47 19H49ZM49 25.2H47C47 25.8076 47.2762 26.3822 47.7506 26.7617L49 25.2ZM53 19V30H57V19H53ZM49 21H55V17H49V21ZM51 25.2V19H47V25.2H51ZM47.7506 26.7617L53.7506 31.5617L56.2494 28.4383L50.2494 23.6383L47.7506 26.7617Z" fill="#EB5757" />
        <rect x="34" y="38" width="12" height="12" fill="#F2F2F2" />
      </svg>
    )
  },

};

/**
 * Obtiene el icono de inicio desde localStorage o devuelve el predeterminado
 */
export function getHomeTabIcon(size = 22) {
  const savedIcon = localStorage.getItem('home_tab_icon') || 'wifiHeartHome';
  const iconData = homeTabIcons[savedIcon] || homeTabIcons.wifiHeartHome;
  
  return iconData.icon(size);
}

/**
 * Guarda la preferencia de icono de inicio en localStorage
 */
export function setHomeTabIcon(iconKey) {
  localStorage.setItem('home_tab_icon', iconKey);
  // Disparar evento para que otros componentes se actualicen
  window.dispatchEvent(new Event('home-icon-changed'));
}

// Categorías de iconos para el selector (agrupación para mejor UX)
const HOME_ICON_CATEGORIES = {
  Casas: [
    'modernMansion','luxuryVilla','contemporaryHome','colonialHouse','victorianHouse','mediterraneanVilla','tudorHouse','modernFarmhouse',
    'modernPenthouse','artDecoMansion','beachHouse','mountainLodge','industrialLoft','gothicCastle','modernChalet','luxuryEstate','rusticCabin','contemporaryVilla',
    'japaneseHouse','tropicalVilla','scandinavianHome','frenchChateau','spanishHacienda','modernSkyscraper','ecoGreenHome','desertAdobeHouse','skylineApartment','gardenCottage','californianModern','luxuryPalace','secureHouse'
  ],
  'Control / Operaciones': [
    'controlCenter','operationsHub','commandConsole','radarSweep','satelliteUplink','networkHub','analyticsDashboard','systemMonitor','slidersControl','serverRack','globeGrid','waveformScope','shieldOps','holoConsole','cockpitHUD','opsTimeline','opsGrid',
    'opCenterNeon','controlMatrixGrid','multiPanelCockpit','cyberOpsShield','alertCenter','commandPalette','telemetryRings','meshNetwork','kpiGauges','pipelineFlow','securityVault','quantumConsole'
  ],
  Futuristas: [
    'wifiHeartHome','cyberHouse','neonHome','hologramHouse','matrixHome','quantumHome','cyberpunkHouse','holographicHome','energyHouse','digitalHome','laserHouse','plasmaHome','neonMatrix','cyberGlow','neonCircuit',
    'brainPlugHome','purplePlugHome','chipSecurityHex','colorLayers','upArrow','cloudHeart','gearFuture','soundHome','brainHome','leafHome','lockHome','tempHome','lightningHome','battery'
  ]
};

/**
 * Devuelve una lista de opciones agrupadas para usar en el selector (PrimeReact optionGroup)
 */
export function getHomeTabIconGroups() {
  const makeItem = (key) => {
    const data = homeTabIcons[key];
    if (!data) return null;
    return { label: data.name, value: key, icon: data.icon(20) };
  };
  const groups = Object.entries(HOME_ICON_CATEGORIES).map(([label, keys]) => ({
    label,
    items: keys.map(makeItem).filter(Boolean)
  })).filter(g => g.items && g.items.length > 0);
  return groups;
}
