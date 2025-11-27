import React, { useState, useEffect, useMemo } from 'react';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { generateAdvancedCSS } from '../utils/tabThemeStyles';
import { applyTabTheme } from '../utils/tabThemeLoader';
import '../styles/components/tab-theme-selector.css';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';
const REDUCED_MOTION_KEY = 'nodeterm_tab_reduced_motion';
const ANIM_SPEED_KEY = 'nodeterm_tab_anim_speed'; // 'slow' | 'normal' | 'fast' | 'turbo'

// Definición de estilos de pestañas
const tabThemes = {
  default: {
    name: 'Por Defecto',
    description: 'Respeta el tema de la interfaz seleccionado',
    preview: {
      backgroundColor: 'var(--ui-tab-bg)',
      borderRadius: '4px 4px 0 0',
      border: '1px solid var(--ui-tab-border)',
      transition: 'all 0.2s ease'
    },
    styles: {} // Se aplican dinámicamente desde el tema UI
  },
  
  futuristic: {
    name: 'Futurista',
    description: 'Pestañas con efectos cyber y neón',
    preview: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      borderRadius: '8px 8px 0 0',
      border: '1px solid #00d4ff',
      boxShadow: '0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #0f3460 100%)',
      '--ui-tab-text': '#00d4ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00d4ff',
      '--ui-tab-close-hover': '#ff073a',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      '--tab-transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  minimalist: {
    name: 'Minimalista',
    description: 'Diseño limpio y simple',
    preview: {
      backgroundColor: '#fafafa',
      borderRadius: '0',
      border: 'none',
      borderBottom: '2px solid transparent',
      transition: 'border-bottom-color 0.2s ease'
    },
    styles: {
      '--ui-tab-bg': 'transparent',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': 'rgba(0,0,0,0.02)',
      '--ui-tab-text': '#666666',
      '--ui-tab-active-text': '#2196f3',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease',
      '--tab-border-bottom': '2px solid transparent',
      '--tab-active-border-bottom': '2px solid #2196f3'
    }
  },
  
  
  retro80s: {
    name: 'Retro 80s',
    description: 'Nostálgico con colores neón',
    preview: {
      background: 'linear-gradient(45deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #ff006e',
      boxShadow: '0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #2d1b69 0%, #0c0c0c 50%, #2d1b69 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #ff006e 0%, #2d1b69 50%, #3a86ff 100%)',
      '--ui-tab-text': '#ff006e',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff006e',
      '--ui-tab-close-hover': '#ffbe0b',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },
  
  material: {
    name: 'Material Design',
    description: 'Diseño moderno con elevación',
    preview: {
      backgroundColor: '#ffffff',
      borderRadius: '4px 4px 0 0',
      border: 'none',
      boxShadow: '0 2px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.24)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    },
    styles: {
      '--ui-tab-bg': '#f5f5f5',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': '#eeeeee',
      '--ui-tab-text': '#424242',
      '--ui-tab-active-text': '#1976d2',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 2px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.24)',
      '--tab-transition': 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      '--tab-active-elevation': '0 4px 8px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.26)'
    }
  },
  
  nord: {
    name: 'Nord',
    description: 'Colores fríos del ártico',
    preview: {
      backgroundColor: '#3b4252',
      borderRadius: '6px 6px 0 0',
      border: '1px solid #434c5e',
      transition: 'all 0.2s ease'
    },
    styles: {
      '--ui-tab-bg': '#3b4252',
      '--ui-tab-active-bg': '#2e3440',
      '--ui-tab-hover-bg': '#434c5e',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#88c0d0',
      '--ui-tab-border': '#434c5e',
      '--ui-tab-close-hover': '#bf616a',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  
  glass: {
    name: 'Glass',
    description: 'Efecto de cristal transparente',
    preview: {
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '12px 12px 0 0',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'rgba(255, 255, 255, 0.08)',
      '--ui-tab-active-bg': 'rgba(255, 255, 255, 0.15)',
      '--ui-tab-hover-bg': 'rgba(255, 255, 255, 0.12)',
      '--ui-tab-text': 'rgba(255, 255, 255, 0.8)',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': 'rgba(255, 255, 255, 0.2)',
      '--ui-tab-close-hover': '#ff5555',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-backdrop-filter': 'blur(10px)'
    }
  },




  neonCity: {
    name: 'Neon City',
    description: 'Luces de neón de ciudad nocturna',
    preview: {
      background: 'linear-gradient(135deg, #0c0c0c 0%, #1a0033 50%, #000000 100%)',
      borderRadius: '2px 2px 0 0',
      border: '1px solid #ff0080',
      boxShadow: '0 0 20px #ff0080, inset 0 0 20px rgba(255, 0, 128, 0.1)',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0c0c0c 0%, #1a0033 50%, #000000 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff0080 0%, #7928ca 50%, #ff0080 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a0033 0%, #0c0c0c 50%, #1a0033 100%)',
      '--ui-tab-text': '#00ffff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff0080',
      '--ui-tab-close-hover': '#ff073a',
      '--tab-border-radius': '2px 2px 0 0',
      '--tab-box-shadow': '0 0 20px #ff0080, inset 0 0 20px rgba(255, 0, 128, 0.1)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  galaxy: {
    name: 'Galaxy',
    description: 'Colores galácticos con estrellas',
    preview: {
      background: 'radial-gradient(ellipse at center, #3b4371 0%, #1e2751 50%, #0f1419 100%)',
      borderRadius: '25px 25px 0 0',
      border: '1px solid #6c5ce7',
      boxShadow: '0 0 30px rgba(108, 92, 231, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      transition: 'all 0.4s ease'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(ellipse at center, #2d3561 0%, #1e2751 50%, #0f1419 100%)',
      '--ui-tab-active-bg': 'radial-gradient(ellipse at center, #6c5ce7 0%, #a29bfe 50%, #6c5ce7 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(ellipse at center, #3b4371 0%, #2d3561 50%, #1e2751 100%)',
      '--ui-tab-text': '#dda0dd',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#6c5ce7',
      '--ui-tab-close-hover': '#fd79a8',
      '--tab-border-radius': '25px 25px 0 0',
      '--tab-box-shadow': '0 0 30px rgba(108, 92, 231, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      '--tab-transition': 'all 0.4s ease'
    }
  },


  holographic: {
    name: 'Holographic',
    description: 'Efecto holográfico iridiscente',
    preview: {
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffa726)',
      borderRadius: '8px 8px 0 0',
      border: '1px solid transparent',
      backgroundSize: '400% 400%',
      animation: 'holographic 3s ease infinite'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #2c2c2c 0%, #1a1a1a 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffa726)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #3c3c3c 0%, #2a2a2a 100%)',
      '--ui-tab-text': '#a0a0a0',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 4px 15px rgba(255, 107, 107, 0.3)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-background-size': '400% 400%'
    }
  },

  vhs: {
    name: 'VHS Retro',
    description: 'Estilo VHS con scanlines y glitch',
    preview: {
      background: 'linear-gradient(90deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      borderRadius: '0',
      border: '2px solid #ff0040',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(90deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
      '--ui-tab-active-bg': 'linear-gradient(90deg, #ff0040 0%, #00ffff 50%, #ff0040 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(90deg, #1a1a1a 0%, #000000 50%, #1a1a1a 100%)',
      '--ui-tab-text': '#00ff00',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': '#ff0040',
      '--ui-tab-close-hover': '#ffff00',
      '--tab-border-radius': '0',
      '--tab-box-shadow': '0 0 10px #ff0040, inset 0 0 10px rgba(0, 255, 255, 0.2)',
      '--tab-transition': 'all 0.2s ease'
    }
  },


  carbon: {
    name: 'Carbon Fiber',
    description: 'Textura de fibra de carbono',
    preview: {
      background: 'repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 2px, #2a2a2a 2px, #2a2a2a 4px)',
      borderRadius: '6px 6px 0 0',
      border: '1px solid #444444',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)'
    },
    styles: {
      '--ui-tab-bg': 'repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 2px, #2a2a2a 2px, #2a2a2a 4px)',
      '--ui-tab-active-bg': 'repeating-linear-gradient(45deg, #333333 0px, #333333 2px, #444444 2px, #444444 4px)',
      '--ui-tab-hover-bg': 'repeating-linear-gradient(45deg, #2a2a2a 0px, #2a2a2a 2px, #3a3a3a 2px, #3a3a3a 4px)',
      '--ui-tab-text': '#cccccc',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#444444',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  lavaLamp: {
    name: 'Lava Lamp',
    description: 'Burbujas de lava en movimiento',
    preview: {
      background: 'radial-gradient(circle at 30% 30%, #ff6b35 0%, #f7931e 25%, #ff6b35 50%, #f7931e 75%, #ff6b35 100%)',
      borderRadius: '20px 20px 0 0',
      border: 'none',
      animation: 'lava-bubble 4s ease-in-out infinite'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 50% 50%, #2c1810 0%, #1a0f08 50%, #0f0804 100%)',
      '--ui-tab-active-bg': 'radial-gradient(circle at 30% 30%, #ff6b35 0%, #f7931e 25%, #ff6b35 50%, #f7931e 75%, #ff6b35 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 70% 70%, #3c2420 0%, #2c1810 50%, #1a0f08 100%)',
      '--ui-tab-text': '#ffab91',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#d84315',
      '--tab-border-radius': '20px 20px 0 0',
      '--tab-box-shadow': '0 4px 20px rgba(255, 107, 53, 0.4)',
      '--tab-transition': 'all 0.4s ease'
    }
  },


  cyberpunk2077: {
    name: 'Cyberpunk 2077',
    description: 'Estilo del videojuego Cyberpunk 2077',
    preview: {
      background: 'linear-gradient(135deg, #fcee21 0%, #ff0080 50%, #7928ca 100%)',
      borderRadius: '0',
      border: '2px solid #fcee21',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      boxShadow: '0 0 15px #fcee21, inset 0 0 15px rgba(252, 238, 33, 0.2)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #fcee21 0%, #ff0080 50%, #7928ca 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      '--ui-tab-text': '#fcee21',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': '#fcee21',
      '--ui-tab-close-hover': '#ff0080',
      '--tab-border-radius': '0',
      '--tab-clip-path': 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      '--tab-box-shadow': '0 0 15px #fcee21, inset 0 0 15px rgba(252, 238, 33, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  discord: {
    name: 'Discord Style',
    description: 'Estilo similar a Discord',
    preview: {
      background: '#5865f2',
      borderRadius: '8px 8px 0 0',
      border: 'none',
      transition: 'all 0.2s ease'
    },
    styles: {
      '--ui-tab-bg': '#2f3136',
      '--ui-tab-active-bg': '#5865f2',
      '--ui-tab-hover-bg': '#36393f',
      '--ui-tab-text': '#b9bbbe',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ed4245',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  rainbow: {
    name: 'Rainbow',
    description: 'Arcoíris animado brillante',
    preview: {
      background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff0080)',
      borderRadius: '12px 12px 0 0',
      border: 'none',
      backgroundSize: '200% 200%',
      animation: 'rainbow-shift 3s ease infinite'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #1a1a1a 0%, #2a2a2a 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff0080)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #2a2a2a 0%, #3a3a3a 100%)',
      '--ui-tab-text': '#ffffff',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 4px 20px rgba(255, 255, 255, 0.3)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-background-size': '200% 200%'
    }
  },

  terminal: {
    name: 'Terminal Hacker',
    description: 'Estilo de terminal de hacker',
    preview: {
      background: '#000000',
      borderRadius: '0',
      border: '1px solid #00ff00',
      fontFamily: 'monospace',
      color: '#00ff00'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#001100',
      '--ui-tab-hover-bg': '#003300',
      '--ui-tab-text': '#00ff00',
      '--ui-tab-active-text': '#00ff00',
      '--ui-tab-border': '#00ff00',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '0',
      '--tab-box-shadow': '0 0 10px #00ff00, inset 0 0 10px rgba(0, 255, 0, 0.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  terminalBlue: {
    name: 'Terminal Azul Neón',
    description: 'Terminal hacker en azul neón',
    preview: {
      background: '#000000',
      borderRadius: '0',
      border: '1px solid #00bfff',
      fontFamily: 'monospace',
      color: '#00bfff'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#000f1a',
      '--ui-tab-hover-bg': '#001a2e',
      '--ui-tab-text': '#00bfff',
      '--ui-tab-active-text': '#00bfff',
      '--ui-tab-border': '#00bfff',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '0',
      '--tab-box-shadow': '0 0 10px #00bfff, inset 0 0 10px rgba(0, 191, 255, 0.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  terminalOrange: {
    name: 'Terminal Naranja Neón',
    description: 'Terminal hacker en naranja neón',
    preview: {
      background: '#000000',
      borderRadius: '0',
      border: '1px solid #ff8c00',
      fontFamily: 'monospace',
      color: '#ff8c00'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#1a0f00',
      '--ui-tab-hover-bg': '#2e1a00',
      '--ui-tab-text': '#ff8c00',
      '--ui-tab-active-text': '#ff8c00',
      '--ui-tab-border': '#ff8c00',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '0',
      '--tab-box-shadow': '0 0 10px #ff8c00, inset 0 0 10px rgba(255, 140, 0, 0.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  neonPink: {
    name: 'Neon Pink',
    description: 'Rosa neón vibrante',
    preview: {
      background: 'linear-gradient(135deg, #ff0080 0%, #ff4da6 50%, #ff80cc 100%)',
      borderRadius: '15px 15px 0 0',
      border: '2px solid #ff0080',
      boxShadow: '0 0 25px #ff0080, inset 0 0 25px rgba(255, 0, 128, 0.2)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1a0011 0%, #330022 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff0080 0%, #ff4da6 50%, #ff80cc 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #330022 0%, #4d0033 100%)',
      '--ui-tab-text': '#ff66b3',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff0080',
      '--ui-tab-close-hover': '#cc0066',
      '--tab-border-radius': '15px 15px 0 0',
      '--tab-box-shadow': '0 0 25px #ff0080, inset 0 0 25px rgba(255, 0, 128, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  vintage: {
    name: 'Vintage Paper',
    description: 'Papel vintage envejecido',
    preview: {
      background: 'linear-gradient(135deg, #f4f1de 0%, #e9edc9 100%)',
      borderRadius: '8px 8px 0 0',
      border: '2px solid #b7b7a4',
      boxShadow: '2px 2px 10px rgba(139, 69, 19, 0.3), inset 0 0 20px rgba(139, 69, 19, 0.1)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #d4a574 0%, #c9ada7 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #f4f1de 0%, #e9edc9 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #e9edc9 0%, #f4f1de 100%)',
      '--ui-tab-text': '#8b4513',
      '--ui-tab-active-text': '#654321',
      '--ui-tab-border': '#b7b7a4',
      '--ui-tab-close-hover': '#d2691e',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '2px 2px 10px rgba(139, 69, 19, 0.3), inset 0 0 20px rgba(139, 69, 19, 0.1)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  ocean: {
    name: 'Ocean Depths',
    description: 'Profundidades del océano',
    preview: {
      background: 'radial-gradient(ellipse at center, #006994 0%, #004d6b 50%, #002635 100%)',
      borderRadius: '20px 20px 0 0',
      border: '1px solid #4fc3f7',
      boxShadow: '0 0 20px rgba(79, 195, 247, 0.4), inset 0 0 20px rgba(79, 195, 247, 0.1)'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(ellipse at center, #002635 0%, #001a23 50%, #000d11 100%)',
      '--ui-tab-active-bg': 'radial-gradient(ellipse at center, #006994 0%, #004d6b 50%, #002635 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(ellipse at center, #004d6b 0%, #002635 50%, #001a23 100%)',
      '--ui-tab-text': '#4fc3f7',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#4fc3f7',
      '--ui-tab-close-hover': '#29b6f6',
      '--tab-border-radius': '20px 20px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(79, 195, 247, 0.4), inset 0 0 20px rgba(79, 195, 247, 0.1)',
      '--tab-transition': 'all 0.4s ease'
    }
  },

  fire: {
    name: 'Fire Element',
    description: 'Elemento fuego ardiente',
    preview: {
      background: 'linear-gradient(45deg, #ff4500 0%, #ff6347 25%, #ff8c00 50%, #ffa500 75%, #ff4500 100%)',
      borderRadius: '12px 12px 0 0',
      border: '2px solid #ff4500',
      boxShadow: '0 0 30px #ff4500, inset 0 0 30px rgba(255, 69, 0, 0.3)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #2d1810 0%, #1a0f08 50%, #0f0804 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff4500 0%, #ff6347 25%, #ff8c00 50%, #ffa500 75%, #ff4500 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #3c2420 0%, #2d1810 50%, #1a0f08 100%)',
      '--ui-tab-text': '#ff8c00',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff4500',
      '--ui-tab-close-hover': '#dc143c',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 0 30px #ff4500, inset 0 0 30px rgba(255, 69, 0, 0.3)',
      '--tab-transition': 'all 0.3s ease'
    }
  },


  steam: {
    name: 'Steam Punk',
    description: 'Estilo steampunk industrial',
    preview: {
      background: 'linear-gradient(135deg, #8d6e63 0%, #6d4c41 50%, #5d4037 100%)',
      borderRadius: '4px 4px 0 0',
      border: '3px solid #bf9000',
      boxShadow: 'inset 0 0 20px rgba(191, 144, 0, 0.3), 0 0 15px rgba(191, 144, 0, 0.5)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #3e2723 0%, #2e1a15 50%, #1e1108 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #8d6e63 0%, #6d4c41 50%, #5d4037 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #4e342e 0%, #3e2723 50%, #2e1a15 100%)',
      '--ui-tab-text': '#bf9000',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#bf9000',
      '--ui-tab-close-hover': '#ff6f00',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'inset 0 0 20px rgba(191, 144, 0, 0.3), 0 0 15px rgba(191, 144, 0, 0.5)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  steamBlue: {
    name: 'Steam Punk Azul',
    description: 'Steampunk industrial en azul metálico',
    preview: {
      background: 'linear-gradient(135deg, #546e7a 0%, #455a64 50%, #37474f 100%)',
      borderRadius: '4px 4px 0 0',
      border: '3px solid #00bcd4',
      boxShadow: 'inset 0 0 20px rgba(0, 188, 212, 0.3), 0 0 15px rgba(0, 188, 212, 0.5)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #263238 0%, #1a2332 50%, #0d1117 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #546e7a 0%, #455a64 50%, #37474f 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #37474f 0%, #263238 50%, #1a2332 100%)',
      '--ui-tab-text': '#00bcd4',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00bcd4',
      '--ui-tab-close-hover': '#ff5722',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'inset 0 0 20px rgba(0, 188, 212, 0.3), 0 0 15px rgba(0, 188, 212, 0.5)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-active-border-bottom': 'none'
    }
  },

  steamGreen: {
    name: 'Steam Punk Verde',
    description: 'Steampunk industrial en verde metálico',
    preview: {
      background: 'linear-gradient(135deg, #558b2f 0%, #33691e 50%, #1b5e20 100%)',
      borderRadius: '4px 4px 0 0',
      border: '3px solid #4caf50',
      boxShadow: 'inset 0 0 20px rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.5)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1b5e20 0%, #0d3e0d 50%, #051f05 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #558b2f 0%, #33691e 50%, #1b5e20 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #33691e 0%, #1b5e20 50%, #0d3e0d 100%)',
      '--ui-tab-text': '#4caf50',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#4caf50',
      '--ui-tab-close-hover': '#ff5722',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'inset 0 0 20px rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.5)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  space: {
    name: 'Space Station',
    description: 'Estación espacial futurista',
    preview: {
      background: 'linear-gradient(135deg, #37474f 0%, #263238 50%, #102027 100%)',
      borderRadius: '0 20px 0 0',
      border: '2px solid #00bcd4',
      boxShadow: '0 0 20px rgba(0, 188, 212, 0.4), inset 2px 2px 10px rgba(0, 188, 212, 0.2)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #102027 0%, #0d1117 50%, #000000 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #37474f 0%, #263238 50%, #102027 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #263238 0%, #102027 50%, #0d1117 100%)',
      '--ui-tab-text': '#00bcd4',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00bcd4',
      '--ui-tab-close-hover': '#ff5722',
      '--tab-border-radius': '0 20px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(0, 188, 212, 0.4), inset 2px 2px 10px rgba(0, 188, 212, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  vscode: {
    name: 'VS Code Style',
    description: 'Pestañas estilo Visual Studio Code',
    preview: {
      background: '#2d2d30',
      borderRadius: '0',
      border: '1px solid #3e3e42',
      borderBottom: 'none',
      color: '#cccccc',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: '400'
    },
    styles: {
      '--ui-tab-bg': '#2d2d30',
      '--ui-tab-active-bg': '#1e1e1e',
      '--ui-tab-hover-bg': '#3e3e42',
      '--ui-tab-text': '#cccccc',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#3e3e42',
      '--ui-tab-close-hover': '#f48771',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease',
      '--tab-font-family': 'Segoe UI, system-ui, sans-serif',
      '--tab-font-size': '13px',
      '--tab-font-weight': '400',
      '--tab-padding': '8px 12px',
      '--tab-min-width': '120px',
      '--tab-max-width': '240px'
    }
  },

  dracula: {
    name: 'Dracula Style',
    description: 'Pestañas estilo Dracula con púrpura oscuro',
    preview: {
      background: 'linear-gradient(135deg, #bd93f9 0%, #8b5cf6 100%)',
      borderRadius: '8px 8px 0 0',
      border: '2px solid #ff79c6',
      boxShadow: '0 0 20px rgba(189, 147, 249, 0.5)'
    },
    styles: {
      '--ui-tab-bg': '#282a36',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #bd93f9 0%, #8b5cf6 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #44475a 0%, #6272a4 100%)',
      '--ui-tab-text': '#f8f8f2',
      '--ui-tab-active-text': '#282a36',
      '--ui-tab-border': '#ff79c6',
      '--ui-tab-close-hover': '#ff5555',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(189, 147, 249, 0.5)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  nord: {
    name: 'Nord Style',
    description: 'Pestañas estilo Nord frías y minimalistas',
    preview: {
      background: 'linear-gradient(135deg, #88c0d0 0%, #5e81ac 100%)',
      borderRadius: '6px 6px 0 0',
      border: '1px solid #81a1c1',
      boxShadow: '0 2px 8px rgba(136, 192, 208, 0.3)'
    },
    styles: {
      '--ui-tab-bg': '#2e3440',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #88c0d0 0%, #5e81ac 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #3b4252 0%, #434c5e 100%)',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#2e3440',
      '--ui-tab-border': '#81a1c1',
      '--ui-tab-close-hover': '#bf616a',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(136, 192, 208, 0.3)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  synthwave: {
    name: 'Synthwave Style',
    description: 'Pestañas estilo Synthwave 84 retro neón',
    preview: {
      background: 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      borderRadius: '4px 4px 0 0',
      border: '2px solid #ff006e',
      boxShadow: '0 0 25px rgba(255, 0, 110, 0.6), inset 0 0 15px rgba(131, 56, 236, 0.3)'
    },
    styles: {
      '--ui-tab-bg': '#0d0221',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a0b2e 0%, #16213e 100%)',
      '--ui-tab-text': '#ff006e',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff006e',
      '--ui-tab-close-hover': '#ffbe0b',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 25px rgba(255, 0, 110, 0.6), inset 0 0 15px rgba(131, 56, 236, 0.3)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  cyberpunk: {
    name: 'Cyberpunk Style',
    description: 'Pestañas estilo Cyberpunk futuristas',
    preview: {
      background: 'linear-gradient(135deg, #00f5ff 0%, #ff0080 100%)',
      borderRadius: '0',
      border: '1px solid #00f5ff',
      boxShadow: '0 0 30px rgba(0, 245, 255, 0.8), inset 0 0 20px rgba(255, 0, 128, 0.2)'
    },
    styles: {
      '--ui-tab-bg': '#0a0a0a',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00f5ff 0%, #ff0080 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      '--ui-tab-text': '#00f5ff',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': '#00f5ff',
      '--ui-tab-close-hover': '#ff0080',
      '--tab-border-radius': '0',
      '--tab-box-shadow': '0 0 30px rgba(0, 245, 255, 0.8), inset 0 0 20px rgba(255, 0, 128, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  matrix: {
    name: 'Matrix Style',
    description: 'Pestañas estilo Matrix verde hacker',
    preview: {
      background: 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)',
      borderRadius: '2px 2px 0 0',
      border: '1px solid #00ff41',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.7), inset 0 0 10px rgba(0, 255, 65, 0.1)'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #001100 0%, #002200 100%)',
      '--ui-tab-text': '#00ff41',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': '#00ff41',
      '--ui-tab-close-hover': '#ff0040',
      '--tab-border-radius': '2px 2px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(0, 255, 65, 0.7), inset 0 0 10px rgba(0, 255, 65, 0.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  hologram: {
    name: 'Hologram Style',
    description: 'Pestañas estilo holográfico translúcido',
    preview: {
      background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.8) 0%, rgba(255, 0, 255, 0.8) 100%)',
      borderRadius: '12px 12px 0 0',
      border: '1px solid rgba(0, 255, 255, 0.6)',
      boxShadow: '0 0 25px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(255, 0, 255, 0.2)'
    },
    styles: {
      '--ui-tab-bg': 'rgba(0, 0, 0, 0.8)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, rgba(0, 255, 255, 0.8) 0%, rgba(255, 0, 255, 0.8) 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
      '--ui-tab-text': '#00ffff',
      '--ui-tab-active-text': '#000000',
      '--ui-tab-border': 'rgba(0, 255, 255, 0.6)',
      '--ui-tab-close-hover': '#ff00ff',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 0 25px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(255, 0, 255, 0.2)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-backdrop-filter': 'blur(10px)'
    }
  },

  plasma: {
    name: 'Plasma Style',
    description: 'Pestañas estilo plasma energético',
    preview: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
      borderRadius: '8px 8px 0 0',
      border: '2px solid #ff6b6b',
      boxShadow: '0 0 35px rgba(255, 107, 107, 0.6), 0 0 20px rgba(78, 205, 196, 0.4)'
    },
    styles: {
      '--ui-tab-bg': '#1a1a2e',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
      '--ui-tab-text': '#ff6b6b',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff6b6b',
      '--ui-tab-close-hover': '#4ecdc4',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 35px rgba(255, 107, 107, 0.6), 0 0 20px rgba(78, 205, 196, 0.4)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  // NUEVOS ESTILOS ÚNICOS Y CREATIVOS
  
  origami: {
    name: 'Origami Style',
    description: 'Papel doblado con sombras geométricas',
    preview: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)',
      border: 'none',
      position: 'relative',
      boxShadow: '2px 2px 6px rgba(0,0,0,0.1)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #fff 0%, #f8f9fa 50%, #e9ecef 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 50%, #ced4da 100%)',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#212529',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#dc3545',
      '--tab-border-radius': '0',
      '--tab-clip-path': 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)',
      '--tab-box-shadow': '2px 2px 6px rgba(0,0,0,0.1)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  liquidMetal: {
    name: 'Liquid Metal',
    description: 'Efecto de metal líquido con reflexiones',
    preview: {
      background: 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 25%, #d3d3d3 50%, #silver 75%, #b8b8b8 100%)',
      borderRadius: '20px',
      border: '1px solid #999',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #a0a0a0 0%, #888 25%, #b3b3b3 50%, #999 75%, #989898 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 25%, #d3d3d3 50%, #silver 75%, #b8b8b8 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #b0b0b0 0%, #989898 25%, #c3c3c3 50%, #aaa 75%, #a8a8a8 100%)',
      '--ui-tab-text': '#333',
      '--ui-tab-active-text': '#000',
      '--ui-tab-border': '#999',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '20px',
      '--tab-box-shadow': '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
      '--tab-transition': 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  paperStack: {
    name: 'Paper Stack',
    description: 'Pestañas apiladas como hojas de papel',
    preview: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '4px 4px 0 0',
      position: 'relative',
      boxShadow: '2px 0 0 #f8f9fa, 4px 0 0 #f1f3f4, 0 2px 4px rgba(0,0,0,0.1)'
    },
    styles: {
      '--ui-tab-bg': '#fff',
      '--ui-tab-active-bg': '#fff',
      '--ui-tab-hover-bg': '#f8f9fa',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#212529',
      '--ui-tab-border': '#ddd',
      '--ui-tab-close-hover': '#dc3545',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '2px 0 0 #f8f9fa, 4px 0 0 #f1f3f4, 0 2px 4px rgba(0,0,0,0.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },



  fabric: {
    name: 'Fabric Style',
    description: 'Textura de tela con costuras',
    preview: {
      background: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, #f8f9fa 0%, #fff 50%, #f8f9fa 100%)',
      backgroundSize: '10px 10px, 100% 100%',
      border: '2px dashed #dee2e6',
      borderRadius: '8px'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 2px 2px, rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, #f8f9fa 0%, #fff 50%, #f8f9fa 100%)',
      '--ui-tab-active-bg': 'radial-gradient(circle at 2px 2px, rgba(0,123,255,.1) 1px, transparent 1px), linear-gradient(90deg, #e3f2fd 0%, #bbdefb 50%, #e3f2fd 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 2px 2px, rgba(0,0,0,.15) 1px, transparent 1px), linear-gradient(90deg, #e9ecef 0%, #f8f9fa 50%, #e9ecef 100%)',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#1565c0',
      '--ui-tab-border': '#dee2e6',
      '--ui-tab-close-hover': '#dc3545',
      '--tab-border-radius': '8px',
      '--tab-border-style': 'dashed',
      '--tab-background-size': '10px 10px, 100% 100%',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  vintageFilm: {
    name: 'Vintage Film',
    description: 'Estilo película antigua con grain',
    preview: {
      background: 'radial-gradient(circle at 20% 20%, rgba(139,69,19,.1) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(160,82,45,.1) 1px, transparent 1px), linear-gradient(45deg, #f4f1e8 0%, #e8dcc6 100%)',
      backgroundSize: '15px 15px, 12px 12px, 100% 100%',
      border: '1px solid #8b4513',
      borderRadius: '4px',
      filter: 'sepia(.3) contrast(1.1)'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 20% 20%, rgba(139,69,19,.1) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(160,82,45,.1) 1px, transparent 1px), linear-gradient(45deg, #f4f1e8 0%, #e8dcc6 100%)',
      '--ui-tab-active-bg': 'radial-gradient(circle at 20% 20%, rgba(139,69,19,.15) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(160,82,45,.15) 1px, transparent 1px), linear-gradient(45deg, #fff8e1 0%, #f3e5ab 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 20% 20%, rgba(139,69,19,.12) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(160,82,45,.12) 1px, transparent 1px), linear-gradient(45deg, #f9f6f0 0%, #ede0c8 100%)',
      '--ui-tab-text': '#8b4513',
      '--ui-tab-active-text': '#5d2f04',
      '--ui-tab-border': '#8b4513',
      '--ui-tab-close-hover': '#d2691e',
      '--tab-border-radius': '4px',
      '--tab-background-size': '15px 15px, 12px 12px, 100% 100%',
      '--tab-filter': 'sepia(.3) contrast(1.1)',
      '--tab-box-shadow': 'inset 0 0 10px rgba(139,69,19,.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  magnetic: {
    name: 'Magnetic Style',
    description: 'Pestañas que se "atraen" magnéticamente',
    preview: {
      background: 'linear-gradient(135deg, #333 0%, #555 50%, #333 100%)',
      border: '2px solid #666',
      borderRadius: '6px',
      color: '#fff',
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 6px 12px rgba(0,0,0,.3)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #333 0%, #555 50%, #333 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #444 0%, #666 50%, #444 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #3a3a3a 0%, #5c5c5c 50%, #3a3a3a 100%)',
      '--ui-tab-text': '#fff',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': '#666',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '6px',
      '--tab-box-shadow': '0 6px 12px rgba(0,0,0,.3)',
      '--tab-transform': 'translateY(-2px) scale(1.02)',
      '--tab-transition': 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  },

  watercolor: {
    name: 'Watercolor Style',
    description: 'Efecto acuarela con manchas de color',
    preview: {
      background: 'radial-gradient(ellipse at top left, rgba(255,182,193,.3) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(173,216,230,.3) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(221,160,221,.3) 0%, transparent 50%), #fff',
      borderRadius: '20px',
      border: 'none',
      filter: 'blur(0.3px)'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(ellipse at top left, rgba(255,182,193,.2) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(173,216,230,.2) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(221,160,221,.2) 0%, transparent 50%), #fff',
      '--ui-tab-active-bg': 'radial-gradient(ellipse at top left, rgba(255,182,193,.4) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(173,216,230,.4) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(221,160,221,.4) 0%, transparent 50%), #fff',
      '--ui-tab-hover-bg': 'radial-gradient(ellipse at top left, rgba(255,182,193,.3) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(173,216,230,.3) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(221,160,221,.3) 0%, transparent 50%), #fff',
      '--ui-tab-text': '#8e44ad',
      '--ui-tab-active-text': '#6c3483',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#e74c3c',
      '--tab-border-radius': '20px',
      '--tab-filter': 'blur(0.3px)',
      '--tab-box-shadow': '0 4px 15px rgba(0,0,0,.1)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  mechanical: {
    name: 'Mechanical Style',
    description: 'Estilo industrial con tornillos y metal',
    preview: {
      background: 'radial-gradient(circle at 8px 8px, #666 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) 8px, #666 2px, transparent 2px), linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 50%, #a0a0a0 100%)',
      border: '2px solid #999',
      borderRadius: '0',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.1)'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 8px 8px, #666 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) 8px, #666 2px, transparent 2px), radial-gradient(circle at 8px calc(100% - 8px), #666 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) calc(100% - 8px), #666 2px, transparent 2px), linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 50%, #a0a0a0 100%)',
      '--ui-tab-active-bg': 'radial-gradient(circle at 8px 8px, #555 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) 8px, #555 2px, transparent 2px), radial-gradient(circle at 8px calc(100% - 8px), #555 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) calc(100% - 8px), #555 2px, transparent 2px), linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 50%, #b0b0b0 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 8px 8px, #777 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) 8px, #777 2px, transparent 2px), radial-gradient(circle at 8px calc(100% - 8px), #777 2px, transparent 2px), radial-gradient(circle at calc(100% - 8px) calc(100% - 8px), #777 2px, transparent 2px), linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 50%, #909090 100%)',
      '--ui-tab-text': '#333',
      '--ui-tab-active-text': '#000',
      '--ui-tab-border': '#999',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'inset 0 2px 4px rgba(0,0,0,.1)',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  // ESTILOS EXPERIMENTALES AVANZADOS

  particleSystem: {
    name: 'Particle System',
    description: 'Partículas que orbitan alrededor',
    preview: {
      background: 'rgba(0,0,0,.9)',
      border: '1px solid #333',
      borderRadius: '8px',
      color: '#00d4ff',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'rgba(0,0,0,.9)',
      '--ui-tab-active-bg': 'rgba(0,20,40,.9)',
      '--ui-tab-hover-bg': 'rgba(10,10,20,.9)',
      '--ui-tab-text': '#00d4ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#333',
      '--ui-tab-close-hover': '#ff073a',
      '--tab-border-radius': '8px',
      '--tab-box-shadow': '0 0 20px rgba(0, 212, 255, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },


  soundWave: {
    name: 'Sound Wave',
    description: 'Visualización de ondas de sonido',
    preview: {
      background: '#1a1a1a',
      border: 'none',
      borderRadius: '8px',
      color: '#00ff88',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': '#1a1a1a',
      '--ui-tab-active-bg': '#0d1f0d',
      '--ui-tab-hover-bg': '#2d2d2d',
      '--ui-tab-text': '#00ff88',
      '--ui-tab-active-text': '#00ff88',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '8px',
      '--tab-box-shadow': '0 0 15px rgba(0, 255, 136, 0.3)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  dnaHelix: {
    name: 'DNA Helix',
    description: 'Doble hélice animada',
    preview: {
      background: 'linear-gradient(135deg, #001122 0%, #003366 100%)',
      border: '1px solid #0066cc',
      borderRadius: '12px',
      color: '#00ccff',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #001122 0%, #003366 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #003366 0%, #0066cc 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #002244 0%, #004488 100%)',
      '--ui-tab-text': '#00ccff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#0066cc',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '12px',
      '--tab-box-shadow': '0 0 25px rgba(0, 204, 255, 0.4)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  // Versiones estáticas de los temas terminales para la categoría Futuristas
  terminalStatic: {
    name: 'Terminal Hacker Verde',
    description: 'Estilo de terminal de hacker verde (estático)',
    preview: {
      background: '#000000',
      borderRadius: '4px 4px 0 0',
      border: '2px solid #00ff00',
      fontFamily: 'monospace',
      color: '#00ff00',
      boxShadow: '0 0 15px #00ff00'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#002200',
      '--ui-tab-hover-bg': '#003300',
      '--ui-tab-text': '#00ff00',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00ff00',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 15px #00ff00, inset 0 0 15px rgba(0, 255, 0, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  terminalBlueStatic: {
    name: 'Terminal Hacker Azul',
    description: 'Terminal hacker en azul neón (estático)',
    preview: {
      background: '#000000',
      borderRadius: '4px 4px 0 0',
      border: '2px solid #00bfff',
      fontFamily: 'monospace',
      color: '#00bfff',
      boxShadow: '0 0 15px #00bfff'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#00152e',
      '--ui-tab-hover-bg': '#002a4d',
      '--ui-tab-text': '#00bfff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00bfff',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 15px #00bfff, inset 0 0 15px rgba(0, 191, 255, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  terminalOrangeStatic: {
    name: 'Terminal Hacker Naranja',
    description: 'Terminal hacker en naranja neón (estático)',
    preview: {
      background: '#000000',
      borderRadius: '4px 4px 0 0',
      border: '2px solid #ff8c00',
      fontFamily: 'monospace',
      color: '#ff8c00',
      boxShadow: '0 0 15px #ff8c00'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#2e1500',
      '--ui-tab-hover-bg': '#4d2200',
      '--ui-tab-text': '#ff8c00',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff8c00',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 15px #ff8c00, inset 0 0 15px rgba(255, 140, 0, 0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  // Nuevos temas basados en temas de interfaz
  uiLight: {
    name: 'UI Light',
    description: 'Basado en el tema Light de la interfaz',
    preview: {
      background: '#ffffff',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #e0e0e0',
      color: '#495057'
    },
    styles: {
      '--ui-tab-bg': '#ffffff',
      '--ui-tab-active-bg': '#e3f2fd',
      '--ui-tab-hover-bg': '#f5f5f5',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#1976d2',
      '--ui-tab-border': '#e0e0e0',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiDark: {
    name: 'UI Dark',
    description: 'Basado en el tema Dark de la interfaz',
    preview: {
      background: '#2d2d30',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #3e3e42',
      color: '#cccccc'
    },
    styles: {
      '--ui-tab-bg': '#2d2d30',
      '--ui-tab-active-bg': '#1e1e1e',
      '--ui-tab-hover-bg': '#3e3e42',
      '--ui-tab-text': '#cccccc',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#3e3e42',
      '--ui-tab-close-hover': '#f48771',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiDracula: {
    name: 'UI Dracula',
    description: 'Basado en el tema Dracula de la interfaz',
    preview: {
      background: '#282a36',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #44475a',
      color: '#f8f8f2'
    },
    styles: {
      '--ui-tab-bg': '#282a36',
      '--ui-tab-active-bg': '#44475a',
      '--ui-tab-hover-bg': '#44475a',
      '--ui-tab-text': '#f8f8f2',
      '--ui-tab-active-text': '#50fa7b',
      '--ui-tab-border': '#44475a',
      '--ui-tab-close-hover': '#ff5555',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiNord: {
    name: 'UI Nord',
    description: 'Basado en el tema Nord de la interfaz',
    preview: {
      background: '#2e3440',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #3b4252',
      color: '#d8dee9'
    },
    styles: {
      '--ui-tab-bg': '#2e3440',
      '--ui-tab-active-bg': '#3b4252',
      '--ui-tab-hover-bg': '#434c5e',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#88c0d0',
      '--ui-tab-border': '#3b4252',
      '--ui-tab-close-hover': '#bf616a',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiCyberpunk: {
    name: 'UI Cyberpunk',
    description: 'Basado en el tema Cyberpunk de la interfaz',
    preview: {
      background: '#0a0a0a',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #ff0080',
      color: '#00ff00'
    },
    styles: {
      '--ui-tab-bg': '#0a0a0a',
      '--ui-tab-active-bg': '#1a1a1a',
      '--ui-tab-hover-bg': '#2a2a2a',
      '--ui-tab-text': '#00ff00',
      '--ui-tab-active-text': '#ffff00',
      '--ui-tab-border': '#ff0080',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 10px #ff0080',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  uiMatrix: {
    name: 'UI Matrix',
    description: 'Basado en el tema Matrix de la interfaz',
    preview: {
      background: '#000000',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #00ff00',
      color: '#00ff00'
    },
    styles: {
      '--ui-tab-bg': '#000000',
      '--ui-tab-active-bg': '#001100',
      '--ui-tab-hover-bg': '#002200',
      '--ui-tab-text': '#00ff00',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00ff00',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 5px #00ff00',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiSolarizedLight: {
    name: 'UI Solarized Light',
    description: 'Basado en el tema Solarized Light de la interfaz',
    preview: {
      background: '#fdf6e3',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #93a1a1',
      color: '#586e75'
    },
    styles: {
      '--ui-tab-bg': '#fdf6e3',
      '--ui-tab-active-bg': '#eee8d5',
      '--ui-tab-hover-bg': '#f4f1e8',
      '--ui-tab-text': '#586e75',
      '--ui-tab-active-text': '#268bd2',
      '--ui-tab-border': '#93a1a1',
      '--ui-tab-close-hover': '#dc322f',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiSolarizedDark: {
    name: 'UI Solarized Dark',
    description: 'Basado en el tema Solarized Dark de la interfaz',
    preview: {
      background: '#002b36',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #586e75',
      color: '#839496'
    },
    styles: {
      '--ui-tab-bg': '#002b36',
      '--ui-tab-active-bg': '#073642',
      '--ui-tab-hover-bg': '#0a4b5a',
      '--ui-tab-text': '#839496',
      '--ui-tab-active-text': '#2aa198',
      '--ui-tab-border': '#586e75',
      '--ui-tab-close-hover': '#dc322f',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiTokyoNight: {
    name: 'UI Tokyo Night',
    description: 'Basado en el tema Tokyo Night de la interfaz',
    preview: {
      background: '#1a1b26',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #414868',
      color: '#a9b1d6'
    },
    styles: {
      '--ui-tab-bg': '#1a1b26',
      '--ui-tab-active-bg': '#24283b',
      '--ui-tab-hover-bg': '#2d3142',
      '--ui-tab-text': '#a9b1d6',
      '--ui-tab-active-text': '#7aa2f7',
      '--ui-tab-border': '#414868',
      '--ui-tab-close-hover': '#f7768e',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiSynthwave84: {
    name: 'UI Synthwave 84',
    description: 'Basado en el tema Synthwave 84 de la interfaz',
    preview: {
      background: '#241b2f',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #ff00ff',
      color: '#ff00ff'
    },
    styles: {
      '--ui-tab-bg': '#241b2f',
      '--ui-tab-active-bg': '#2d1b3d',
      '--ui-tab-hover-bg': '#3d1b4d',
      '--ui-tab-text': '#ff00ff',
      '--ui-tab-active-text': '#00ffff',
      '--ui-tab-border': '#ff00ff',
      '--ui-tab-close-hover': '#ff0000',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 8px #ff00ff',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  uiPalenight: {
    name: 'UI Palenight',
    description: 'Basado en el tema Palenight de la interfaz',
    preview: {
      background: '#292d3e',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #434758',
      color: '#a6accd'
    },
    styles: {
      '--ui-tab-bg': '#292d3e',
      '--ui-tab-active-bg': '#32374d',
      '--ui-tab-hover-bg': '#3c4252',
      '--ui-tab-text': '#a6accd',
      '--ui-tab-active-text': '#89ddff',
      '--ui-tab-border': '#434758',
      '--ui-tab-close-hover': '#f07178',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiAyuDark: {
    name: 'UI Ayu Dark',
    description: 'Basado en el tema Ayu Dark de la interfaz',
    preview: {
      background: '#0f1419',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #3e4b59',
      color: '#e6e1cf'
    },
    styles: {
      '--ui-tab-bg': '#0f1419',
      '--ui-tab-active-bg': '#1a1f2e',
      '--ui-tab-hover-bg': '#252a3a',
      '--ui-tab-text': '#e6e1cf',
      '--ui-tab-active-text': '#aadba4',
      '--ui-tab-border': '#3e4b59',
      '--ui-tab-close-hover': '#f07178',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiZenburn: {
    name: 'UI Zenburn',
    description: 'Basado en el tema Zenburn de la interfaz',
    preview: {
      background: '#3f3f3f',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #5f5f5f',
      color: '#dcdccc'
    },
    styles: {
      '--ui-tab-bg': '#3f3f3f',
      '--ui-tab-active-bg': '#4f4f4f',
      '--ui-tab-hover-bg': '#5f5f5f',
      '--ui-tab-text': '#dcdccc',
      '--ui-tab-active-text': '#8fb28f',
      '--ui-tab-border': '#5f5f5f',
      '--ui-tab-close-hover': '#cc9393',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiTomorrowNight: {
    name: 'UI Tomorrow Night',
    description: 'Basado en el tema Tomorrow Night de la interfaz',
    preview: {
      background: '#1d1f21',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #373b41',
      color: '#c5c8c6'
    },
    styles: {
      '--ui-tab-bg': '#1d1f21',
      '--ui-tab-active-bg': '#282a2e',
      '--ui-tab-hover-bg': '#373b41',
      '--ui-tab-text': '#c5c8c6',
      '--ui-tab-active-text': '#81a2be',
      '--ui-tab-border': '#373b41',
      '--ui-tab-close-hover': '#cc6666',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  uiOceanicNext: {
    name: 'UI Oceanic Next',
    description: 'Basado en el tema Oceanic Next de la interfaz',
    preview: {
      background: '#1b2b34',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #4f5b66',
      color: '#d8dee9'
    },
    styles: {
      '--ui-tab-bg': '#1b2b34',
      '--ui-tab-active-bg': '#24323d',
      '--ui-tab-hover-bg': '#2d3a46',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#5fb3b3',
      '--ui-tab-border': '#4f5b66',
      '--ui-tab-close-hover': '#ec5f67',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  }
};

// Categorías propuestas y claves de nuevos temas
const NEW_FUTURISTIC_KEYS = [
  'scanlineBlue', 'tronBlue', 'ionStorm',
  'terminalStatic', 'terminalBlueStatic', 'terminalOrangeStatic',
  'neonAurora', 'quantumFlux', 'laserWave', 'prismTrail', 'hyperdrive',
  'neonOrbit', 'cyberGrid', 'pulseMagenta', 'neonLime',
  'steam', 'steamBlue', 'steamGreen',
  'futuristic', 'hologram', 'particleSystem', 'soundWave', 'dnaHelix'
];

const NEW_PRO_KEYS = [
  'proSlate', 'proOcean', 'proForest', 'proIndigo', 'graphite', 'obsidianGlass',
  'azureGlass', 'slateGlass', 'sandstone', 'midnightBlue', 'elegantTaupe', 'mutedTeal'
];

const NEW_MINIMAL_KEYS = [
  'borderless', 'softTouch', 'roundedPill', 'macTabs', 'pastelCandy',
  'material', 'paperStack', 'fabric', 'watercolor',
  'vintageFilm', 'mechanical', 'minimalist', 'vintage',
  'origami'
];

const NEW_ANIMATED_KEYS = [
  'auroraFlow', 'circuitFlow', 'meteorShower', 'parallaxGrid', 'rippleInk',
  'synthwave', 'cyberpunk', 'matrix', 'neonCity', 'galaxy',
  'cyberpunk2077', 'space', 'holographic',
  'terminal', 'terminalBlue', 'terminalOrange',
  'ocean', 'rainbow', 'plasma'
];

const NEW_OTHERS_KEYS = [
  'fire',
  'retro80s', 'vhs', 'lavaLamp', 'neonPink',
  'magnetic', 'liquidMetal'
];

// Temas nuevos: Futuristas Neón
Object.assign(tabThemes, {
  neonAurora: {
    name: 'Neon Aurora',
    description: 'Degradados polares con brillos neón',
    preview: {
      background: 'linear-gradient(135deg, #091b2a 0%, #0a2a43 50%, #102b3f 100%)',
      borderRadius: '12px 12px 0 0',
      border: '1px solid #4ef0ff',
      boxShadow: '0 0 20px rgba(78, 240, 255, 0.35)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #091b2a 0%, #0a2a43 50%, #102b3f 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00ffd5 0%, #00aaff 50%, #7c4dff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0c2436 0%, #0d3351 50%, #143b4b 100%)',
      '--ui-tab-text': '#4ef0ff',
      '--ui-tab-active-text': '#0b1220',
      '--ui-tab-border': '#4ef0ff',
      '--ui-tab-close-hover': '#ff579a',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(78, 240, 255, 0.35)',
      '--tab-transition': 'all 0.3s ease'
    }
  },
  quantumFlux: {
    name: 'Quantum Flux',
    description: 'Energía cuántica en cian y violeta',
    preview: {
      background: 'linear-gradient(135deg, #0b0f2b 0%, #121242 50%, #1a0f3d 100%)',
      border: '1px solid #7b61ff',
      boxShadow: '0 0 18px rgba(123, 97, 255, 0.35)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0b0f2b 0%, #121242 50%, #1a0f3d 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00e5ff 0%, #7b61ff 50%, #ff00e5 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1436 0%, #181a55 50%, #20124a 100%)',
      '--ui-tab-text': '#99aaff',
      '--ui-tab-active-text': '#000',
      '--ui-tab-border': '#7b61ff',
      '--ui-tab-close-hover': '#ff5ec4',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 0 18px rgba(123, 97, 255, 0.35)',
      '--tab-transition': 'all 0.3s ease'
    }
  },
  laserWave: {
    name: 'Laser Wave',
    description: 'Ráfagas láser magenta y cian',
    preview: {
      background: 'linear-gradient(135deg, #06060a 0%, #0f0f27 100%)',
      border: '1px solid #00f5ff'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0b0b16 0%, #0f0f27 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff00b8 0%, #00f5ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #161633 0%, #11112b 100%)',
      '--ui-tab-text': '#00f5ff',
      '--ui-tab-active-text': '#001016',
      '--ui-tab-border': '#00f5ff',
      '--ui-tab-close-hover': '#ff00b8',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 0 22px rgba(0, 245, 255, 0.45)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  prismTrail: {
    name: 'Prism Trail',
    description: 'Rastro prismático multicolor',
    preview: {
      background: 'linear-gradient(135deg, #0b1020 0%, #151a2e 100%)',
      border: '1px solid #ff6ec7'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0b1020 0%, #151a2e 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff6ec7 0%, #7b61ff 50%, #00e5ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #121734 0%, #1a203e 100%)',
      '--ui-tab-text': '#d7c7ff',
      '--ui-tab-active-text': '#0a0a0a',
      '--ui-tab-border': '#ff6ec7',
      '--ui-tab-close-hover': '#00e5ff',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 18px rgba(255, 110, 199, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  hyperdrive: {
    name: 'Hyperdrive',
    description: 'Impulso hiperespacial azul eléctrico',
    preview: {
      background: 'linear-gradient(135deg, #07131f 0%, #0a1b2b 100%)',
      border: '1px solid #2de2e6'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #07131f 0%, #0a1b2b 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #2de2e6 0%, #0ff 50%, #00a3ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0b1f33 0%, #0f2842 100%)',
      '--ui-tab-text': '#9beef3',
      '--ui-tab-active-text': '#00141d',
      '--ui-tab-border': '#2de2e6',
      '--ui-tab-close-hover': '#ff2079',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(45, 226, 230, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  ionStorm: {
    name: 'Ion Storm',
    description: 'Tormenta iónica verde/azul',
    preview: {
      background: 'linear-gradient(135deg, #071a1a 0%, #0f2a2a 100%)',
      border: '1px solid #29ffc6'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #071a1a 0%, #0f2a2a 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #29ffc6 0%, #20e3b2 50%, #0cebeb 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0b2424 0%, #123333 100%)',
      '--ui-tab-text': '#86fff0',
      '--ui-tab-active-text': '#002221',
      '--ui-tab-border': '#29ffc6',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 0 18px rgba(41, 255, 198, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  neonOrbit: {
    name: 'Neon Orbit',
    description: 'Órbitas cian/violeta',
    preview: {
      background: 'radial-gradient(circle at 30% 50%, #0f1a2e 0%, #0a1020 60%)',
      border: '1px solid #8d85ff'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 30% 50%, #0f1a2e 0%, #0a1020 60%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #8d85ff 0%, #00eaff 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 30% 50%, #14223b 0%, #0d172c 60%)',
      '--ui-tab-text': '#b6b3ff',
      '--ui-tab-active-text': '#041018',
      '--ui-tab-border': '#8d85ff',
      '--ui-tab-close-hover': '#00eaff',
      '--tab-border-radius': '14px 14px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(141, 133, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  cyberGrid: {
    name: 'Cyber Grid',
    description: 'Rejilla cyber turquesa',
    preview: {
      background: 'linear-gradient(135deg, #0a0a0f 0%, #141425 100%)',
      border: '1px solid #00ffd1'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0a0a0f 0%, #141425 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00ffd1 0%, #00b3ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #121226 0%, #1b1b36 100%)',
      '--ui-tab-text': '#7efce5',
      '--ui-tab-active-text': '#001313',
      '--ui-tab-border': '#00ffd1',
      '--ui-tab-close-hover': '#00b3ff',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 0 18px rgba(0, 255, 209, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  pulseMagenta: {
    name: 'Pulse Magenta',
    description: 'Pulso magenta brillante',
    preview: {
      background: 'linear-gradient(135deg, #1b0a16 0%, #2a0f21 100%)',
      border: '1px solid #ff3fa4'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1b0a16 0%, #2a0f21 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ff3fa4 0%, #ff7acb 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #2a0f21 0%, #37152b 100%)',
      '--ui-tab-text': '#ff93cf',
      '--ui-tab-active-text': '#250018',
      '--ui-tab-border': '#ff3fa4',
      '--ui-tab-close-hover': '#ffa0dc',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 0 20px rgba(255, 63, 164, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  neonLime: {
    name: 'Neon Lime',
    description: 'Verde lima ácido',
    preview: {
      background: '#0d120d',
      border: '1px solid #a8ff60'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0a0f0a 0%, #0f1a0f 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #a8ff60 0%, #72ff8f 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #101710 0%, #152215 100%)',
      '--ui-tab-text': '#cfff98',
      '--ui-tab-active-text': '#0b1109',
      '--ui-tab-border': '#a8ff60',
      '--ui-tab-close-hover': '#72ff8f',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(168, 255, 96, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  scanlineBlue: {
    name: 'Scanline Blue',
    description: 'Azul escáner retro',
    preview: {
      background: 'linear-gradient(135deg, #0a0f1f 0%, #0f1b33 100%)',
      border: '1px solid #00bfff'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0a0f1f 0%, #0f1b33 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #00bfff 0%, #3cc8ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1b33 0%, #152540 100%)',
      '--ui-tab-text': '#9ee1ff',
      '--ui-tab-active-text': '#031018',
      '--ui-tab-border': '#00bfff',
      '--ui-tab-close-hover': '#3cc8ff',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(0, 191, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  tronBlue: {
    name: 'Tron Blue',
    description: 'Bordes azules estilo Tron',
    preview: {
      background: '#0a0e14',
      border: '1px solid #15f3ff',
      boxShadow: '0 0 14px rgba(21, 243, 255, 0.45)'
    },
    styles: {
      '--ui-tab-bg': '#0a0e14',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #15f3ff 0%, #00bcd4 100%)',
      '--ui-tab-hover-bg': '#0e141c',
      '--ui-tab-text': '#8deaff',
      '--ui-tab-active-text': '#071115',
      '--ui-tab-border': '#15f3ff',
      '--ui-tab-close-hover': '#00bcd4',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 14px rgba(21, 243, 255, 0.45)',
      '--tab-transition': 'all 0.22s ease'
    }
  }
});

// Temas nuevos: Profesionales y Modernos
Object.assign(tabThemes, {
  proSlate: {
    name: 'Pro Slate',
    description: 'Pizarra profesional sobria',
    preview: {
      background: '#2d3138',
      border: '1px solid #434a54'
    },
    styles: {
      '--ui-tab-bg': '#2d3138',
      '--ui-tab-active-bg': '#1f2329',
      '--ui-tab-hover-bg': '#343a42',
      '--ui-tab-text': '#d6d8db',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#434a54',
      '--ui-tab-close-hover': '#e74c3c',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  proOcean: {
    name: 'Pro Ocean',
    description: 'Azules corporativos elegantes',
    preview: {
      background: 'linear-gradient(135deg, #0f3354 0%, #0b2236 100%)',
      border: '1px solid #2a72b5'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0f3354 0%, #0b2236 100%)',
      '--ui-tab-active-bg': '#114a7a',
      '--ui-tab-hover-bg': '#0e2b46',
      '--ui-tab-text': '#b7cde3',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#2a72b5',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.2)',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  proForest: {
    name: 'Pro Forest',
    description: 'Verdes sobrios profesionales',
    preview: {
      background: '#11301f',
      border: '1px solid #2e7d32'
    },
    styles: {
      '--ui-tab-bg': '#10271a',
      '--ui-tab-active-bg': '#1b5e20',
      '--ui-tab-hover-bg': '#153321',
      '--ui-tab-text': '#c9e7d3',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#2e7d32',
      '--ui-tab-close-hover': '#ff7043',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.2)',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  proIndigo: {
    name: 'Pro Indigo',
    description: 'Indigo empresarial moderno',
    preview: {
      background: '#263266',
      border: '1px solid #3f51b5'
    },
    styles: {
      '--ui-tab-bg': '#263266',
      '--ui-tab-active-bg': '#3f51b5',
      '--ui-tab-hover-bg': '#2b3a73',
      '--ui-tab-text': '#e3e6ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#3f51b5',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  graphite: {
    name: 'Graphite',
    description: 'Gris grafito pulcro',
    preview: {
      background: '#2a2a2a',
      border: '1px solid #444'
    },
    styles: {
      '--ui-tab-bg': '#2a2a2a',
      '--ui-tab-active-bg': '#1e1e1e',
      '--ui-tab-hover-bg': '#333',
      '--ui-tab-text': '#ddd',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': '#444',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.18s ease'
    }
  },
  obsidianGlass: {
    name: 'Obsidian Glass',
    description: 'Vidrio oscuro elegante',
    preview: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(10px)'
    },
    styles: {
      '--ui-tab-bg': 'rgba(255,255,255,0.06)',
      '--ui-tab-active-bg': 'rgba(255,255,255,0.12)',
      '--ui-tab-hover-bg': 'rgba(255,255,255,0.09)',
      '--ui-tab-text': '#e6e6e6',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': 'rgba(255,255,255,0.18)',
      '--ui-tab-close-hover': '#ff6161',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 8px 24px rgba(0,0,0,0.18)',
      '--tab-transition': 'all 0.25s ease',
      '--tab-backdrop-filter': 'blur(10px)'
    }
  },
  azureGlass: {
    name: 'Azure Glass',
    description: 'Vidrio claro azulado',
    preview: {
      background: 'rgba(0, 123, 255, 0.12)',
      border: '1px solid rgba(0, 123, 255, 0.35)'
    },
    styles: {
      '--ui-tab-bg': 'rgba(0, 123, 255, 0.12)',
      '--ui-tab-active-bg': 'rgba(0, 123, 255, 0.22)',
      '--ui-tab-hover-bg': 'rgba(0, 123, 255, 0.18)',
      '--ui-tab-text': '#d8ecff',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': 'rgba(0, 123, 255, 0.35)',
      '--ui-tab-close-hover': '#ffa000',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 8px 24px rgba(0, 123, 255, 0.18)',
      '--tab-transition': 'all 0.22s ease'
    }
  },
  slateGlass: {
    name: 'Slate Glass',
    description: 'Vidrio pizarra tenue',
    preview: {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)'
    },
    styles: {
      '--ui-tab-bg': 'rgba(255,255,255,0.08)',
      '--ui-tab-active-bg': 'rgba(255,255,255,0.16)',
      '--ui-tab-hover-bg': 'rgba(255,255,255,0.11)',
      '--ui-tab-text': '#e8e8e8',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': 'rgba(255,255,255,0.14)',
      '--ui-tab-close-hover': '#e74c3c',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 8px 22px rgba(0,0,0,0.16)',
      '--tab-transition': 'all 0.22s ease'
    }
  },
  sandstone: {
    name: 'Sandstone',
    description: 'Piedra arenisca suave',
    preview: {
      background: 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      border: '1px solid #c6a98d'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)',
      '--ui-tab-text': '#6b4f3a',
      '--ui-tab-active-text': '#4a382b',
      '--ui-tab-border': '#c6a98d',
      '--ui-tab-close-hover': '#a0522d',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 2px 10px rgba(106, 74, 52, 0.15)',
      '--tab-transition': 'all 0.22s ease'
    }
  },
  midnightBlue: {
    name: 'Midnight Blue',
    description: 'Azul medianoche profesional',
    preview: {
      background: '#0f1730',
      border: '1px solid #1f2e5f'
    },
    styles: {
      '--ui-tab-bg': '#0f1730',
      '--ui-tab-active-bg': '#1f2e5f',
      '--ui-tab-hover-bg': '#172244',
      '--ui-tab-text': '#c9d4ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#1f2e5f',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  elegantTaupe: {
    name: 'Elegant Taupe',
    description: 'Taupe elegante y neutro',
    preview: {
      background: '#b7a69e',
      border: '1px solid #9b8b83'
    },
    styles: {
      '--ui-tab-bg': '#b7a69e',
      '--ui-tab-active-bg': '#cbbdb6',
      '--ui-tab-hover-bg': '#c0b2aa',
      '--ui-tab-text': '#3b302b',
      '--ui-tab-active-text': '#2a221e',
      '--ui-tab-border': '#9b8b83',
      '--ui-tab-close-hover': '#a0522d',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 3px 10px rgba(155, 139, 131, 0.35)',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  mutedTeal: {
    name: 'Muted Teal',
    description: 'Verde azulado suave',
    preview: {
      background: '#396e6e',
      border: '1px solid #2d5a5a'
    },
    styles: {
      '--ui-tab-bg': '#396e6e',
      '--ui-tab-active-bg': '#2d5a5a',
      '--ui-tab-hover-bg': '#3f7b7b',
      '--ui-tab-text': '#e2f4f4',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#2d5a5a',
      '--ui-tab-close-hover': '#ff7043',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.18)',
      '--tab-transition': 'all 0.2s ease'
    }
  }
});

// Temas nuevos: Minimal y estilizados
Object.assign(tabThemes, {
  borderless: {
    name: 'Borderless',
    description: 'Sin borde, enfoque minimal',
    preview: {
      background: 'transparent',
      border: '1px solid transparent'
    },
    styles: {
      '--ui-tab-bg': 'transparent',
      '--ui-tab-active-bg': 'rgba(0,0,0,0.04)',
      '--ui-tab-hover-bg': 'rgba(0,0,0,0.02)',
      '--ui-tab-text': 'var(--text-color, #666)',
      '--ui-tab-active-text': 'var(--text-color, #222)',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.15s ease',
      '--tab-border-bottom': '2px solid transparent',
      '--tab-active-border-bottom': '2px solid var(--primary-color, #2196f3)'
    }
  },
  softTouch: {
    name: 'Soft Touch',
    description: 'Superficie mate suave',
    preview: {
      background: '#f6f7f9',
      border: '1px solid #e6e8ec'
    },
    styles: {
      '--ui-tab-bg': '#f6f7f9',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': '#eff1f5',
      '--ui-tab-text': '#5c6670',
      '--ui-tab-active-text': '#2f3540',
      '--ui-tab-border': '#e6e8ec',
      '--ui-tab-close-hover': '#d9534f',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.08)',
      '--tab-transition': 'all 0.18s ease'
    }
  },
  roundedPill: {
    name: 'Rounded Pill',
    description: 'Píldoras redondeadas',
    preview: {
      background: '#e7eefb',
      borderRadius: '999px 999px 0 0',
      border: '1px solid #b5c8f5'
    },
    styles: {
      '--ui-tab-bg': '#e7eefb',
      '--ui-tab-active-bg': '#cfe0ff',
      '--ui-tab-hover-bg': '#dbe7ff',
      '--ui-tab-text': '#294a9b',
      '--ui-tab-active-text': '#1a2f6f',
      '--ui-tab-border': '#b5c8f5',
      '--ui-tab-close-hover': '#e74c3c',
      '--tab-border-radius': '999px 999px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.18s ease'
    }
  },
  macTabs: {
    name: 'Mac Tabs',
    description: 'Estilo macOS suave',
    preview: {
      background: '#ededed',
      border: '1px solid #d7d7d7'
    },
    styles: {
      '--ui-tab-bg': '#ededed',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': '#f6f6f6',
      '--ui-tab-text': '#333',
      '--ui-tab-active-text': '#111',
      '--ui-tab-border': '#d7d7d7',
      '--ui-tab-close-hover': '#ff6b6b',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)',
      '--tab-transition': 'all 0.18s ease'
    }
  },
  pastelCandy: {
    name: 'Pastel Candy',
    description: 'Pasteles suaves con contraste',
    preview: {
      background: 'linear-gradient(135deg, #ffe4ec 0%, #e8f4ff 100%)',
      border: '1px solid #ffd1e0'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #ffe4ec 0%, #e8f4ff 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #ffd1e0 0%, #d6ecff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #ffe8f0 0%, #eef6ff 100%)',
      '--ui-tab-text': '#7a4f6a',
      '--ui-tab-active-text': '#5b3a4f',
      '--ui-tab-border': '#ffd1e0',
      '--ui-tab-close-hover': '#e74c3c',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(255, 171, 192, 0.25)',
      '--tab-transition': 'all 0.18s ease'
    }
  }
});

// Temas nuevos: Animados Especiales (animaciones se añaden en tabThemeStyles)
Object.assign(tabThemes, {
  auroraFlow: {
    name: 'Aurora Flow',
    description: 'Auroras fluidas en movimiento',
    preview: {
      background: 'linear-gradient(135deg, #0a0f1f 0%, #10223f 100%)',
      border: '1px solid #66ffe3'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0a0f1f 0%, #10223f 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #66ffe3 0%, #6a7cff 50%, #ff85d8 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1a33 0%, #162b4f 100%)',
      '--ui-tab-text': '#bdfcf1',
      '--ui-tab-active-text': '#051015',
      '--ui-tab-border': '#66ffe3',
      '--ui-tab-close-hover': '#ff85d8',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 0 18px rgba(102, 255, 227, 0.35)',
      '--tab-transition': 'all 0.25s ease',
      '--tab-background-size': '300% 300%'
    }
  },
  circuitFlow: {
    name: 'Circuit Flow',
    description: 'Trazas electrónicas animadas',
    preview: {
      background: '#0a0f14',
      border: '1px solid #00e1ff'
    },
    styles: {
      '--ui-tab-bg': '#0a0f14',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #001821 0%, #002a3a 100%)',
      '--ui-tab-hover-bg': '#0f161c',
      '--ui-tab-text': '#9aefff',
      '--ui-tab-active-text': '#001116',
      '--ui-tab-border': '#00e1ff',
      '--ui-tab-close-hover': '#00ffc2',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(0, 225, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  meteorShower: {
    name: 'Meteor Shower',
    description: 'Lluvia de meteoros sutil',
    preview: {
      background: 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      border: '1px solid #79b8ff'
    },
    styles: {
      '--ui-tab-bg': 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #79b8ff 0%, #4f9dff 60%, #7a6cff 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle at 20% 20%, #1c2740 0%, #0d1526 70%)',
      '--ui-tab-text': '#cfe6ff',
      '--ui-tab-active-text': '#08101d',
      '--ui-tab-border': '#79b8ff',
      '--ui-tab-close-hover': '#7a6cff',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(121, 184, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  parallaxGrid: {
    name: 'Parallax Grid',
    description: 'Cuadrícula con paralaje',
    preview: {
      background: 'linear-gradient(135deg, #0a0a0f 0%, #151526 100%)',
      border: '1px solid #5af0ff'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0a0a0f 0%, #151526 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #5af0ff 0%, #7b61ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #121226 0%, #1a1a36 100%)',
      '--ui-tab-text': '#c7faff',
      '--ui-tab-active-text': '#041016',
      '--ui-tab-border': '#5af0ff',
      '--ui-tab-close-hover': '#7b61ff',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(90, 240, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
  rippleInk: {
    name: 'Ripple Ink',
    description: 'Ondas de tinta al activar',
    preview: {
      background: '#0b0b0f',
      border: '1px solid #55d1ff'
    },
    styles: {
      '--ui-tab-bg': '#0b0b0f',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #09111a 0%, #0e1c2b 100%)',
      '--ui-tab-hover-bg': '#101019',
      '--ui-tab-text': '#bfeaff',
      '--ui-tab-active-text': '#0a131f',
      '--ui-tab-border': '#55d1ff',
      '--ui-tab-close-hover': '#00bcd4',
      '--tab-border-radius': '10px 10px 0 0',
      '--tab-box-shadow': '0 0 16px rgba(85, 209, 255, 0.35)',
      '--tab-transition': 'all 0.25s ease'
    }
  },
});

// Storage key para columnas
const COLS_PER_ROW_KEY = 'nodeterm_tab_themes_cols';

// Definición de categorías
const CATEGORIES = [
  { id: 'clasicos', name: 'Clásicos', icon: '🎨', getKeys: () => Object.keys(tabThemes).filter(k => ![...NEW_FUTURISTIC_KEYS, ...NEW_PRO_KEYS, ...NEW_MINIMAL_KEYS, ...NEW_ANIMATED_KEYS, ...NEW_OTHERS_KEYS].includes(k)) },
  { id: 'futuristas', name: 'Futuristas', icon: '🚀', getKeys: () => NEW_FUTURISTIC_KEYS.filter(k => tabThemes[k]) },
  { id: 'modernos', name: 'Modernos', icon: '✨', getKeys: () => NEW_PRO_KEYS.filter(k => tabThemes[k]) },
  { id: 'minimal', name: 'Minimal', icon: '◻️', getKeys: () => NEW_MINIMAL_KEYS.filter(k => tabThemes[k]) },
  { id: 'animados', name: 'Animados', icon: '🎬', getKeys: () => NEW_ANIMATED_KEYS.filter(k => tabThemes[k]) },
  { id: 'otros', name: 'Otros', icon: '🔮', getKeys: () => NEW_OTHERS_KEYS.filter(k => tabThemes[k]) }
];

const TabThemeSelector = () => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [currentUITheme, setCurrentUITheme] = useState('Light');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [animSpeed, setAnimSpeed] = useState('normal');
  const [selectedCategory, setSelectedCategory] = useState('clasicos');
  const [colsPerRow, setColsPerRow] = useState(() => {
    const saved = localStorage.getItem(COLS_PER_ROW_KEY);
    return saved ? parseInt(saved, 10) : 3;
  });

  useEffect(() => {
    // Cargar tema guardado al inicializar
    const savedTheme = localStorage.getItem(TAB_THEME_STORAGE_KEY) || 'default';
    setSelectedTheme(savedTheme);
    
    // Aplicar tema inicial
    applyTabThemeWithAnimations(savedTheme);
    
    // Obtener tema UI actual
    const currentTheme = themeManager.getCurrentTheme();
    if (currentTheme) {
      setCurrentUITheme(currentTheme.name);
    }
    // Reduced motion inicial
    const savedReduced = localStorage.getItem(REDUCED_MOTION_KEY);
    let initialReduced = false;
    if (savedReduced === 'true' || savedReduced === 'false') {
      initialReduced = savedReduced === 'true';
    } else if (window.matchMedia) {
      initialReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    setReducedMotion(initialReduced);
    document.documentElement.setAttribute('data-tab-reduced-motion', initialReduced ? 'true' : 'false');

    // Velocidad de animación (ya inicializada globalmente)
    const savedSpeed = localStorage.getItem(ANIM_SPEED_KEY) || 'normal';
    setAnimSpeed(savedSpeed);
    // No sobrescribir si ya está establecido globalmente
    if (!document.documentElement.hasAttribute('data-tab-anim-speed')) {
      document.documentElement.setAttribute('data-tab-anim-speed', savedSpeed);
    }
  }, []); // Solo ejecutar al montar el componente

  useEffect(() => {
    // Escuchar cambios en el tema UI
    const handleThemeChange = () => {
      const currentTheme = themeManager.getCurrentTheme();
      if (currentTheme) {
        setCurrentUITheme(currentTheme.name);
        
        // Si el tema de pestañas no es 'default', cambiarlo automáticamente a 'default'
        // para que respete el nuevo tema UI seleccionado
        if (selectedTheme !== 'default') {
          console.log(`[TAB-THEME] Cambiando tema de pestañas de "${selectedTheme}" a "default" debido a cambio de tema UI`);
          setSelectedTheme('default');
          localStorage.setItem(TAB_THEME_STORAGE_KEY, 'default');
          applyTabThemeWithAnimations('default');
        } else {
          // Re-aplicar tema de pestañas si ya es default
          applyTabThemeWithAnimations('default');
        }
      }
    };
    
    window.addEventListener('theme-changed', handleThemeChange);
    
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, [selectedTheme]); // Dependencia solo para el listener

  const applyTabThemeWithAnimations = (themeName) => {
    // Usar la función del loader para aplicar el tema base
    applyTabTheme(themeName);
    
    // Añadir animaciones específicas si no es default
    if (themeName !== 'default') {
      const theme = tabThemes[themeName];
      if (theme) {
        let tabStyleElement = document.getElementById('tab-theme-styles');
        if (tabStyleElement) {
          // Añadir animaciones específicas al CSS existente
          const animationsCSS = generateAdvancedCSS(themeName, theme.styles);
          tabStyleElement.textContent += animationsCSS;
        }
      }
    }
  };

  const handleThemeSelect = (themeName) => {
    setSelectedTheme(themeName);
    localStorage.setItem(TAB_THEME_STORAGE_KEY, themeName);
    applyTabThemeWithAnimations(themeName);
  };

  const handleReducedMotionToggle = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem(REDUCED_MOTION_KEY, newValue ? 'true' : 'false');
    document.documentElement.setAttribute('data-tab-reduced-motion', newValue ? 'true' : 'false');
  };

  const handleAnimSpeedChange = (e) => {
    const value = e.target.value;
    setAnimSpeed(value);
    localStorage.setItem(ANIM_SPEED_KEY, value);
    document.documentElement.setAttribute('data-tab-anim-speed', value);
  };

  const handleColsPerRowToggle = () => {
    const nextCols = colsPerRow === 2 ? 3 : colsPerRow === 3 ? 4 : colsPerRow === 4 ? 5 : 2;
    setColsPerRow(nextCols);
    localStorage.setItem(COLS_PER_ROW_KEY, String(nextCols));
  };

  // Obtener tema actual para el hero
  const activeTheme = tabThemes[selectedTheme] || tabThemes.default;

  // Obtener temas filtrados por categoría
  const filteredThemes = useMemo(() => {
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return [];
    return category.getKeys().map(key => ({ key, theme: tabThemes[key] })).filter(t => t.theme);
  }, [selectedCategory]);

  // Estilo para el preview de la pestaña
  const getTabSampleStyle = (theme) => {
    return {
      background: theme.preview?.background || theme.styles?.['--ui-tab-bg'] || 'var(--ui-tab-bg)',
      color: theme.styles?.['--ui-tab-text'] || 'var(--ui-tab-text)',
      borderRadius: theme.preview?.borderRadius || theme.styles?.['--tab-border-radius'] || '4px 4px 0 0',
      border: theme.preview?.border || `1px solid ${theme.styles?.['--ui-tab-border'] || 'var(--ui-tab-border)'}`,
      boxShadow: theme.preview?.boxShadow || theme.styles?.['--tab-box-shadow'] || 'none'
    };
  };

  return (
    <div className="tab-theme-selector-container">
      {/* Hero Section - Tema Activo */}
      <div className="tab-theme-hero-section">
        <div className="tab-theme-hero-content">
          {/* Preview grande del tema activo */}
          <div className="tab-theme-hero-preview">
            <div className="tab-theme-hero-tab-preview" style={{ background: 'var(--ui-content-bg)' }}>
              <div 
                className="tab-theme-hero-tab-sample"
                style={getTabSampleStyle(activeTheme)}
              >
                <i className="pi pi-desktop" />
                <span>Terminal</span>
                <i className="pi pi-times close-icon" />
              </div>
            </div>
            <div className="tab-theme-hero-tabs-bar">
              <div 
                className="tab-theme-hero-mini-tab active"
                style={getTabSampleStyle(activeTheme)}
              >
                <i className="pi pi-desktop" />
                <span>Terminal</span>
              </div>
              <div 
                className="tab-theme-hero-mini-tab"
                style={{
                  ...getTabSampleStyle(activeTheme),
                  opacity: 0.5,
                  background: activeTheme.styles?.['--ui-tab-bg'] || 'transparent'
                }}
              >
                <i className="pi pi-folder" />
                <span>SFTP</span>
              </div>
              <div 
                className="tab-theme-hero-mini-tab"
                style={{
                  ...getTabSampleStyle(activeTheme),
                  opacity: 0.5,
                  background: activeTheme.styles?.['--ui-tab-bg'] || 'transparent'
                }}
              >
                <i className="pi pi-code" />
                <span>Editor</span>
              </div>
            </div>
          </div>

          {/* Info del tema activo */}
          <div className="tab-theme-hero-info">
            <div className="tab-theme-hero-badge">
              <i className="pi pi-check" />
              Tema Activo
            </div>
            <h2 className="tab-theme-hero-name">{activeTheme.name}</h2>
            <p className="tab-theme-hero-description">{activeTheme.description}</p>

            {/* Panel de opciones */}
            <div className="tab-theme-options-wrapper">
              <div className="tab-theme-anim-card">
                <div className="tab-theme-anim-card-header">
                  <span className="tab-theme-anim-card-title">
                    <i className="pi pi-sliders-h" />
                    Animaciones
                  </span>
                </div>
                <div className="tab-theme-anim-card-options">
                  <div 
                    className="tab-theme-anim-option"
                    onClick={handleReducedMotionToggle}
                  >
                    <span>Reducir movimiento</span>
                    <div className={`tab-theme-mini-toggle ${reducedMotion ? 'on' : ''}`} />
                  </div>
                  <div className="tab-theme-speed-row">
                    <span>Velocidad:</span>
                    <select 
                      className="tab-theme-speed-select"
                      value={animSpeed} 
                      onChange={handleAnimSpeedChange}
                    >
                      <option value="slow">Lento</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Rápido</option>
                      <option value="turbo">Turbo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Exploración */}
      <div className="tab-theme-explore-section">
        {/* Header con filtros */}
        <div className="tab-theme-explore-header">
          <div className="tab-theme-explore-title">
            <i className="pi pi-th-large" />
            Explorar Estilos
          </div>

          {/* Pills de categoría */}
          <div className="tab-theme-category-filters">
            {CATEGORIES.map(category => {
              const count = category.getKeys().length;
              return (
                <button
                  key={category.id}
                  className={`tab-theme-category-pill ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="tab-theme-category-pill-icon">{category.icon}</span>
                  <span>{category.name}</span>
                  <span className="tab-theme-category-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Botón de columnas */}
          <button
            className="tab-theme-per-row-btn"
            onClick={handleColsPerRowToggle}
            title={`${colsPerRow} columnas. Clic para cambiar: 2 → 3 → 4 → 5 → 2...`}
          >
            <i className="pi pi-th-large" />
          </button>
        </div>

        {/* Grid de temas */}
        <div className="tab-theme-thumbnails-container">
          <div className={`tab-theme-thumbnails-grid cols-${colsPerRow}`}>
            {filteredThemes.map(({ key, theme }) => (
              <div 
                key={key}
                className={`tab-theme-thumbnail ${selectedTheme === key ? 'active' : ''}`}
                onClick={() => handleThemeSelect(key)}
              >
                {selectedTheme === key && (
                  <div className="tab-theme-thumbnail-check">
                    <i className="pi pi-check" />
                  </div>
                )}
                
                <div 
                  className="tab-theme-thumbnail-preview"
                  style={{ background: theme.preview?.background || theme.styles?.['--ui-tab-bg'] || 'var(--ui-content-bg)' }}
                >
                  <div 
                    className="tab-theme-thumbnail-tab-sample"
                    style={getTabSampleStyle(theme)}
                  >
                    <i className="pi pi-desktop" />
                    <span>Terminal</span>
                    <i className="pi pi-times close-icon" />
                  </div>
                </div>

                <div className="tab-theme-thumbnail-info">
                  <div className="tab-theme-thumbnail-name">{theme.name}</div>
                  <div className="tab-theme-thumbnail-description">{theme.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="tab-theme-info-box">
          <i className="pi pi-info-circle" />
          <div className="tab-theme-info-box-content">
            <div className="tab-theme-info-box-title">Información</div>
            <p className="tab-theme-info-box-text">
              El tema "Por Defecto" adapta automáticamente el estilo de las pestañas al tema de interfaz seleccionado. 
              Los demás temas son independientes y conservan su apariencia sin importar el tema de la interfaz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabThemeSelector;
