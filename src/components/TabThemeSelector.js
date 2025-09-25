import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { generateAdvancedCSS } from '../utils/tabThemeStyles';
import { applyTabTheme } from '../utils/tabThemeLoader';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';

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


  diamond: {
    name: 'Diamond',
    description: 'Pestañas en forma de diamante brillante',
    preview: {
      background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
      transform: 'rotate(45deg) scale(0.7)',
      borderRadius: '4px',
      border: '2px solid #ff6b9d',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #2c2c2c 0%, #1a1a1a 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #3c3c3c 0%, #2a2a2a 100%)',
      '--ui-tab-text': '#ff6b9d',
      '--ui-tab-active-text': '#1a1a1a',
      '--ui-tab-border': '#ff6b9d',
      '--ui-tab-close-hover': '#c44569',
      '--tab-border-radius': '4px',
      '--tab-box-shadow': '0 0 20px rgba(255, 107, 157, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)',
      '--tab-transition': 'all 0.3s ease'
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

  crystal: {
    name: 'Crystal',
    description: 'Cristales multifacéticos brillantes',
    preview: {
      background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%), linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      borderRadius: '0',
      border: '2px solid #2196f3',
      clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
      boxShadow: '0 0 20px rgba(33, 150, 243, 0.5), inset 0 0 20px rgba(255,255,255,0.2)'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #263238 0%, #37474f 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%), linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #37474f 0%, #455a64 100%)',
      '--ui-tab-text': '#90caf9',
      '--ui-tab-active-text': '#0d47a1',
      '--ui-tab-border': '#2196f3',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '0',
      '--tab-clip-path': 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
      '--tab-box-shadow': '0 0 20px rgba(33, 150, 243, 0.5), inset 0 0 20px rgba(255,255,255,0.2)',
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
  }
};

const TabThemeSelector = () => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [currentUITheme, setCurrentUITheme] = useState('Light');

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
  }, []); // Solo ejecutar al montar el componente

  useEffect(() => {
    // Escuchar cambios en el tema UI
    const handleThemeChange = () => {
      const currentTheme = themeManager.getCurrentTheme();
      if (currentTheme) {
        setCurrentUITheme(currentTheme.name);
        // Re-aplicar tema de pestañas si es default
        if (selectedTheme === 'default') {
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

  const TabPreview = ({ theme, isSelected, onClick }) => {
    const previewStyle = {
      ...theme.preview,
      width: '100%',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      cursor: 'pointer',
      border: isSelected ? '2px solid var(--primary-color)' : theme.preview.border || '1px solid #ddd',
      marginBottom: '8px'
    };

    return (
      <div style={previewStyle} onClick={onClick}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px'
        }}>
          <i className="pi pi-desktop" style={{ 
            fontSize: '14px',
            color: theme.styles?.['--ui-tab-text'] || '#666'
          }} />
          <span style={{ 
            fontSize: '12px',
            color: theme.styles?.['--ui-tab-text'] || '#666',
            fontWeight: '500'
          }}>
            Terminal
          </span>
          <i className="pi pi-times" style={{ 
            fontSize: '10px',
            color: theme.styles?.['--ui-tab-text'] || '#666',
            opacity: 0.7
          }} />
        </div>
        
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="pi pi-check" style={{ 
              fontSize: '8px',
              color: 'white'
            }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      padding: '1rem 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      width: '100%'
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        color: 'var(--text-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="pi pi-palette" style={{ color: 'var(--primary-color)' }}></i>
        Estilos de Pestañas
      </h3>
      
      <p style={{
        marginBottom: '2rem',
        color: 'var(--text-color-secondary)',
        fontSize: '0.9rem',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Personaliza el aspecto de las pestañas con diferentes estilos. Los cambios se aplican inmediatamente.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1200px',
        padding: '0 1rem'
      }}>
        {Object.entries(tabThemes).map(([key, theme]) => (
          <Card
            key={key}
            style={{
              background: 'var(--surface-card)',
              border: selectedTheme === key ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)',
              borderRadius: '8px',
              padding: '0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: selectedTheme === key ? 'translateY(-2px)' : 'none',
              boxShadow: selectedTheme === key ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={() => handleThemeSelect(key)}
          >
            <div style={{ padding: '1rem' }}>
              <TabPreview 
                theme={theme} 
                isSelected={selectedTheme === key}
                onClick={() => handleThemeSelect(key)}
              />
              
              <h4 style={{
                margin: '0 0 0.5rem 0',
                color: 'var(--text-color)',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                {theme.name}
              </h4>
              
              <p style={{
                margin: '0',
                color: 'var(--text-color-secondary)',
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}>
                {theme.description}
              </p>
              
              {selectedTheme === key && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--primary-color)',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  <i className="pi pi-check-circle" style={{ fontSize: '0.8rem' }} />
                  Tema activo
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'var(--surface-100)',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <i className="pi pi-info-circle" style={{ 
            color: 'var(--primary-color)',
            fontSize: '0.9rem'
          }} />
          <strong style={{ 
            color: 'var(--text-color)',
            fontSize: '0.9rem'
          }}>
            Información
          </strong>
        </div>
        <p style={{
          margin: '0',
          color: 'var(--text-color-secondary)',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}>
          El tema "Por Defecto" adapta automáticamente el estilo de las pestañas al tema de interfaz seleccionado. 
          Los demás temas son independientes y conservan su apariencia sin importar el tema de la interfaz.
        </p>
      </div>
    </div>
  );
};

export default TabThemeSelector;
