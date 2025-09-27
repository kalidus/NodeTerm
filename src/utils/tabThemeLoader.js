// Utilidad para cargar y aplicar el tema de pestañas al iniciar la aplicación

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';

// Definición de estilos de pestañas (copiada del TabThemeSelector)
const tabThemes = {
  default: {
    name: 'Por Defecto',
    description: 'Respeta el tema de la interfaz seleccionado',
    styles: {} // Se aplican dinámicamente desde el tema UI
  },
  
  futuristic: {
    name: 'Futurista',
    description: 'Pestañas con efectos cyber y neón',
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #0f3460 100%)',
      '--ui-tab-text': '#00d4ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00d4ff',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  minimalist: {
    name: 'Minimalista',
    description: 'Líneas limpias y elegantes',
    styles: {
      '--ui-tab-bg': '#ffffff',
      '--ui-tab-active-bg': '#f8f9fa',
      '--ui-tab-hover-bg': '#f1f3f4',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#212529',
      '--ui-tab-border': '#dee2e6',
      '--ui-tab-close-hover': '#dc3545',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },

  retro80s: {
    name: 'Retro 80s',
    description: 'Nostálgico con colores neón',
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      '--ui-tab-text': '#ff6b9d',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff006e',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  material: {
    name: 'Material Design',
    description: 'Moderno con elevación y sombras',
    styles: {
      '--ui-tab-bg': '#ffffff',
      '--ui-tab-active-bg': '#e3f2fd',
      '--ui-tab-hover-bg': '#f5f5f5',
      '--ui-tab-text': '#424242',
      '--ui-tab-active-text': '#1976d2',
      '--ui-tab-border': '#e0e0e0',
      '--ui-tab-close-hover': '#d32f2f',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
      '--tab-transition': 'all 0.2s ease',
      '--tab-border-bottom': '2px solid transparent',
      '--tab-active-border-bottom': '2px solid #2196f3'
    }
  },

  nord: {
    name: 'Nord',
    description: 'Colores árticos fríos y minimalistas',
    styles: {
      '--ui-tab-bg': '#2e3440',
      '--ui-tab-active-bg': '#3b4252',
      '--ui-tab-hover-bg': '#434c5e',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#88c0d0',
      '--ui-tab-border': '#4c566a',
      '--ui-tab-close-hover': '#bf616a',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  glass: {
    name: 'Glass',
    description: 'Efecto de cristal transparente',
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

  crystal: {
    name: 'Crystal Style',
    description: 'Cristales translúcidos con refracciones',
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, rgba(240,240,240,.8) 0%, rgba(220,235,255,.6) 50%, rgba(240,240,240,.8) 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, rgba(135,206,250,.9) 0%, rgba(173,216,230,.7) 50%, rgba(135,206,250,.9) 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, rgba(200,220,255,.8) 0%, rgba(180,200,255,.6) 50%, rgba(200,220,255,.8) 100%)',
      '--ui-tab-text': '#0066cc',
      '--ui-tab-active-text': '#003d7a',
      '--ui-tab-border': 'rgba(255,255,255,.3)',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '0',
      '--tab-clip-path': 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
      '--tab-box-shadow': '0 4px 12px rgba(135,206,250,0.3)',
      '--tab-backdrop-filter': 'blur(8px)',
      '--tab-transition': 'all 0.3s ease'
    }
  },

  inkDrop: {
    name: 'Ink Drop',
    description: 'Efecto de gota de tinta expandiéndose',
    styles: {
      '--ui-tab-bg': 'transparent',
      '--ui-tab-active-bg': 'radial-gradient(circle, var(--primary-color, #007bff) 0%, rgba(0,123,255,.2) 70%, transparent 100%)',
      '--ui-tab-hover-bg': 'radial-gradient(circle, rgba(0,123,255,.1) 0%, rgba(0,123,255,.05) 70%, transparent 100%)',
      '--ui-tab-text': 'var(--text-color, #333)',
      '--ui-tab-active-text': 'var(--primary-color, #007bff)',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '50px',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  fabric: {
    name: 'Fabric Style',
    description: 'Textura de tela con costuras',
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

  morphing: {
    name: 'Morphing Style',
    description: 'Las pestañas cambian de forma',
    styles: {
      '--ui-tab-bg': '#f8f9fa',
      '--ui-tab-active-bg': '#007bff',
      '--ui-tab-hover-bg': '#e9ecef',
      '--ui-tab-text': '#495057',
      '--ui-tab-active-text': '#fff',
      '--ui-tab-border': '#dee2e6',
      '--ui-tab-close-hover': '#ff4757',
      '--tab-border-radius': '0',
      '--tab-clip-path': 'polygon(10% 0, 90% 0, 100% 25%, 100% 75%, 90% 100%, 10% 100%, 0 75%, 0 25%)',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }
  },

  soundWave: {
    name: 'Sound Wave',
    description: 'Visualización de ondas de sonido',
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
  }
};

// Nuevos temas añadidos en TabThemeSelector.js (solo styles aquí)
Object.assign(tabThemes, {
  // Futuristas neón
  neonAurora: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #091b2a 0%, #0a2a43 50%, #102b3f 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #00ffd5 0%, #00aaff 50%, #7c4dff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #0c2436 0%, #0d3351 50%, #143b4b 100%)',
    '--ui-tab-text': '#4ef0ff', '--ui-tab-active-text': '#0b1220', '--ui-tab-border': '#4ef0ff', '--ui-tab-close-hover': '#ff579a', '--tab-border-radius': '12px 12px 0 0', '--tab-box-shadow': '0 0 20px rgba(78, 240, 255, 0.35)', '--tab-transition': 'all 0.3s ease' } },
  quantumFlux: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0b0f2b 0%, #121242 50%, #1a0f3d 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #00e5ff 0%, #7b61ff 50%, #ff00e5 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1436 0%, #181a55 50%, #20124a 100%)',
    '--ui-tab-text': '#99aaff', '--ui-tab-active-text': '#000', '--ui-tab-border': '#7b61ff', '--ui-tab-close-hover': '#ff5ec4', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 0 18px rgba(123, 97, 255, 0.35)', '--tab-transition': 'all 0.3s ease' } },
  laserWave: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0b0b16 0%, #0f0f27 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #ff00b8 0%, #00f5ff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #161633 0%, #11112b 100%)',
    '--ui-tab-text': '#00f5ff', '--ui-tab-active-text': '#001016', '--ui-tab-border': '#00f5ff', '--ui-tab-close-hover': '#ff00b8', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 0 22px rgba(0, 245, 255, 0.45)', '--tab-transition': 'all 0.25s ease' } },
  prismTrail: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0b1020 0%, #151a2e 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #ff6ec7 0%, #7b61ff 50%, #00e5ff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #121734 0%, #1a203e 100%)',
    '--ui-tab-text': '#d7c7ff', '--ui-tab-active-text': '#0a0a0a', '--ui-tab-border': '#ff6ec7', '--ui-tab-close-hover': '#00e5ff', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 0 18px rgba(255, 110, 199, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  hyperdrive: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #07131f 0%, #0a1b2b 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #2de2e6 0%, #0ff 50%, #00a3ff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #0b1f33 0%, #0f2842 100%)',
    '--ui-tab-text': '#9beef3', '--ui-tab-active-text': '#00141d', '--ui-tab-border': '#2de2e6', '--ui-tab-close-hover': '#ff2079', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 0 16px rgba(45, 226, 230, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  ionStorm: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #071a1a 0%, #0f2a2a 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #29ffc6 0%, #20e3b2 50%, #0cebeb 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #0b2424 0%, #123333 100%)',
    '--ui-tab-text': '#86fff0', '--ui-tab-active-text': '#002221', '--ui-tab-border': '#29ffc6', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 0 18px rgba(41, 255, 198, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  neonOrbit: { styles: {
    '--ui-tab-bg': 'radial-gradient(circle at 30% 50%, #0f1a2e 0%, #0a1020 60%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #8d85ff 0%, #00eaff 100%)',
    '--ui-tab-hover-bg': 'radial-gradient(circle at 30% 50%, #14223b 0%, #0d172c 60%)',
    '--ui-tab-text': '#b6b3ff', '--ui-tab-active-text': '#041018', '--ui-tab-border': '#8d85ff', '--ui-tab-close-hover': '#00eaff', '--tab-border-radius': '14px 14px 0 0', '--tab-box-shadow': '0 0 16px rgba(141, 133, 255, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  cyberGrid: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0a0a0f 0%, #141425 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #00ffd1 0%, #00b3ff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #121226 0%, #1b1b36 100%)',
    '--ui-tab-text': '#7efce5', '--ui-tab-active-text': '#001313', '--ui-tab-border': '#00ffd1', '--ui-tab-close-hover': '#00b3ff', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 0 18px rgba(0, 255, 209, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  pulseMagenta: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #1b0a16 0%, #2a0f21 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #ff3fa4 0%, #ff7acb 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #2a0f21 0%, #37152b 100%)',
    '--ui-tab-text': '#ff93cf', '--ui-tab-active-text': '#250018', '--ui-tab-border': '#ff3fa4', '--ui-tab-close-hover': '#ffa0dc', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 0 20px rgba(255, 63, 164, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  neonLime: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0a0f0a 0%, #0f1a0f 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #a8ff60 0%, #72ff8f 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #101710 0%, #152215 100%)',
    '--ui-tab-text': '#cfff98', '--ui-tab-active-text': '#0b1109', '--ui-tab-border': '#a8ff60', '--ui-tab-close-hover': '#72ff8f', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 0 16px rgba(168, 255, 96, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  scanlineBlue: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0a0f1f 0%, #0f1b33 100%)',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #00bfff 0%, #3cc8ff 100%)',
    '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1b33 0%, #152540 100%)',
    '--ui-tab-text': '#9ee1ff', '--ui-tab-active-text': '#031018', '--ui-tab-border': '#00bfff', '--ui-tab-close-hover': '#3cc8ff', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 0 16px rgba(0, 191, 255, 0.35)', '--tab-transition': 'all 0.25s ease' } },
  tronBlue: { styles: {
    '--ui-tab-bg': '#0a0e14',
    '--ui-tab-active-bg': 'linear-gradient(135deg, #15f3ff 0%, #00bcd4 100%)',
    '--ui-tab-hover-bg': '#0e141c',
    '--ui-tab-text': '#8deaff', '--ui-tab-active-text': '#071115', '--ui-tab-border': '#15f3ff', '--ui-tab-close-hover': '#00bcd4', '--tab-border-radius': '4px 4px 0 0', '--tab-box-shadow': '0 0 14px rgba(21, 243, 255, 0.45)', '--tab-transition': 'all 0.22s ease' } },

  // Profesionales y modernos
  proSlate: { styles: {
    '--ui-tab-bg': '#2d3138', '--ui-tab-active-bg': '#1f2329', '--ui-tab-hover-bg': '#343a42', '--ui-tab-text': '#d6d8db', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#434a54', '--ui-tab-close-hover': '#e74c3c', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.2s ease' } },
  proOcean: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0f3354 0%, #0b2236 100%)', '--ui-tab-active-bg': '#114a7a', '--ui-tab-hover-bg': '#0e2b46', '--ui-tab-text': '#b7cde3', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#2a72b5', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.2)', '--tab-transition': 'all 0.2s ease' } },
  proForest: { styles: {
    '--ui-tab-bg': '#10271a', '--ui-tab-active-bg': '#1b5e20', '--ui-tab-hover-bg': '#153321', '--ui-tab-text': '#c9e7d3', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#2e7d32', '--ui-tab-close-hover': '#ff7043', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.2)', '--tab-transition': 'all 0.2s ease' } },
  proIndigo: { styles: {
    '--ui-tab-bg': '#263266', '--ui-tab-active-bg': '#3f51b5', '--ui-tab-hover-bg': '#2b3a73', '--ui-tab-text': '#e3e6ff', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#3f51b5', '--ui-tab-close-hover': '#f44336', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.2s ease' } },
  graphite: { styles: {
    '--ui-tab-bg': '#2a2a2a', '--ui-tab-active-bg': '#1e1e1e', '--ui-tab-hover-bg': '#333', '--ui-tab-text': '#ddd', '--ui-tab-active-text': '#fff', '--ui-tab-border': '#444', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '4px 4px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.18s ease' } },
  obsidianGlass: { styles: {
    '--ui-tab-bg': 'rgba(255,255,255,0.06)', '--ui-tab-active-bg': 'rgba(255,255,255,0.12)', '--ui-tab-hover-bg': 'rgba(255,255,255,0.09)', '--ui-tab-text': '#e6e6e6', '--ui-tab-active-text': '#fff', '--ui-tab-border': 'rgba(255,255,255,0.18)', '--ui-tab-close-hover': '#ff6161', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 8px 24px rgba(0,0,0,0.18)', '--tab-transition': 'all 0.25s ease', '--tab-backdrop-filter': 'blur(10px)' } },
  azureGlass: { styles: {
    '--ui-tab-bg': 'rgba(0, 123, 255, 0.12)', '--ui-tab-active-bg': 'rgba(0, 123, 255, 0.22)', '--ui-tab-hover-bg': 'rgba(0, 123, 255, 0.18)', '--ui-tab-text': '#d8ecff', '--ui-tab-active-text': '#fff', '--ui-tab-border': 'rgba(0, 123, 255, 0.35)', '--ui-tab-close-hover': '#ffa000', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 8px 24px rgba(0, 123, 255, 0.18)', '--tab-transition': 'all 0.22s ease' } },
  slateGlass: { styles: {
    '--ui-tab-bg': 'rgba(255,255,255,0.08)', '--ui-tab-active-bg': 'rgba(255,255,255,0.16)', '--ui-tab-hover-bg': 'rgba(255,255,255,0.11)', '--ui-tab-text': '#e8e8e8', '--ui-tab-active-text': '#fff', '--ui-tab-border': 'rgba(255,255,255,0.14)', '--ui-tab-close-hover': '#e74c3c', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 8px 22px rgba(0,0,0,0.16)', '--tab-transition': 'all 0.22s ease' } },
  sandstone: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #e9d5b7 0%, #dcc4a3 100%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #fff1db 0%, #ead7bc 100%)', '--ui-tab-hover-bg': 'linear-gradient(135deg, #eadcc2 0%, #dfcaae 100%)', '--ui-tab-text': '#6b4f3a', '--ui-tab-active-text': '#4a382b', '--ui-tab-border': '#c6a98d', '--ui-tab-close-hover': '#a0522d', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 2px 10px rgba(106, 74, 52, 0.15)', '--tab-transition': 'all 0.22s ease' } },
  midnightBlue: { styles: {
    '--ui-tab-bg': '#0f1730', '--ui-tab-active-bg': '#1f2e5f', '--ui-tab-hover-bg': '#172244', '--ui-tab-text': '#c9d4ff', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#1f2e5f', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '6px 6px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.2s ease' } },
  elegantTaupe: { styles: {
    '--ui-tab-bg': '#b7a69e', '--ui-tab-active-bg': '#cbbdb6', '--ui-tab-hover-bg': '#c0b2aa', '--ui-tab-text': '#3b302b', '--ui-tab-active-text': '#2a221e', '--ui-tab-border': '#9b8b83', '--ui-tab-close-hover': '#a0522d', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 3px 10px rgba(155, 139, 131, 0.35)', '--tab-transition': 'all 0.2s ease' } },
  mutedTeal: { styles: {
    '--ui-tab-bg': '#396e6e', '--ui-tab-active-bg': '#2d5a5a', '--ui-tab-hover-bg': '#3f7b7b', '--ui-tab-text': '#e2f4f4', '--ui-tab-active-text': '#ffffff', '--ui-tab-border': '#2d5a5a', '--ui-tab-close-hover': '#ff7043', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.18)', '--tab-transition': 'all 0.2s ease' } },

  // Minimal y estilizados
  borderless: { styles: {
    '--ui-tab-bg': 'transparent', '--ui-tab-active-bg': 'rgba(0,0,0,0.04)', '--ui-tab-hover-bg': 'rgba(0,0,0,0.02)', '--ui-tab-text': 'var(--text-color, #666)', '--ui-tab-active-text': 'var(--text-color, #222)', '--ui-tab-border': 'transparent', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.15s ease', '--tab-border-bottom': '2px solid transparent', '--tab-active-border-bottom': '2px solid var(--primary-color, #2196f3)'
  } },
  softTouch: { styles: {
    '--ui-tab-bg': '#f6f7f9', '--ui-tab-active-bg': '#ffffff', '--ui-tab-hover-bg': '#eff1f5', '--ui-tab-text': '#5c6670', '--ui-tab-active-text': '#2f3540', '--ui-tab-border': '#e6e8ec', '--ui-tab-close-hover': '#d9534f', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 2px 8px rgba(0,0,0,0.08)', '--tab-transition': 'all 0.18s ease' } },
  roundedPill: { styles: {
    '--ui-tab-bg': '#e7eefb', '--ui-tab-active-bg': '#cfe0ff', '--ui-tab-hover-bg': '#dbe7ff', '--ui-tab-text': '#294a9b', '--ui-tab-active-text': '#1a2f6f', '--ui-tab-border': '#b5c8f5', '--ui-tab-close-hover': '#e74c3c', '--tab-border-radius': '999px 999px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.18s ease' } },
  macTabs: { styles: {
    '--ui-tab-bg': '#ededed', '--ui-tab-active-bg': '#ffffff', '--ui-tab-hover-bg': '#f6f6f6', '--ui-tab-text': '#333', '--ui-tab-active-text': '#111', '--ui-tab-border': '#d7d7d7', '--ui-tab-close-hover': '#ff6b6b', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)', '--tab-transition': 'all 0.18s ease' } },
  flatPills: { styles: {
    '--ui-tab-bg': '#f2f2f2', '--ui-tab-active-bg': '#ffffff', '--ui-tab-hover-bg': '#ebebeb', '--ui-tab-text': '#555', '--ui-tab-active-text': '#222', '--ui-tab-border': '#e0e0e0', '--ui-tab-close-hover': '#e57373', '--tab-border-radius': '16px 16px 0 0', '--tab-box-shadow': 'none', '--tab-transition': 'all 0.16s ease' } },
  pastelCandy: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #ffe4ec 0%, #e8f4ff 100%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #ffd1e0 0%, #d6ecff 100%)', '--ui-tab-hover-bg': 'linear-gradient(135deg, #ffe8f0 0%, #eef6ff 100%)', '--ui-tab-text': '#7a4f6a', '--ui-tab-active-text': '#5b3a4f', '--ui-tab-border': '#ffd1e0', '--ui-tab-close-hover': '#e74c3c', '--tab-border-radius': '12px 12px 0 0', '--tab-box-shadow': '0 2px 8px rgba(255, 171, 192, 0.25)', '--tab-transition': 'all 0.18s ease' } },

  // Animados especiales
  auroraFlow: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0a0f1f 0%, #10223f 100%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #66ffe3 0%, #6a7cff 50%, #ff85d8 100%)', '--ui-tab-hover-bg': 'linear-gradient(135deg, #0f1a33 0%, #162b4f 100%)', '--ui-tab-text': '#bdfcf1', '--ui-tab-active-text': '#051015', '--ui-tab-border': '#66ffe3', '--ui-tab-close-hover': '#ff85d8', '--tab-border-radius': '12px 12px 0 0', '--tab-box-shadow': '0 0 18px rgba(102, 255, 227, 0.35)', '--tab-transition': 'all 0.25s ease', '--tab-background-size': '300% 300%'
  } },
  circuitFlow: { styles: {
    '--ui-tab-bg': '#0a0f14', '--ui-tab-active-bg': 'linear-gradient(135deg, #001821 0%, #002a3a 100%)', '--ui-tab-hover-bg': '#0f161c', '--ui-tab-text': '#9aefff', '--ui-tab-active-text': '#001116', '--ui-tab-border': '#00e1ff', '--ui-tab-close-hover': '#00ffc2', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 0 16px rgba(0, 225, 255, 0.35)', '--tab-transition': 'all 0.25s ease'
  } },
  meteorShower: { styles: {
    '--ui-tab-bg': 'radial-gradient(circle at 20% 20%, #1a2333 0%, #0b1220 70%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #79b8ff 0%, #4f9dff 60%, #7a6cff 100%)', '--ui-tab-hover-bg': 'radial-gradient(circle at 20% 20%, #1c2740 0%, #0d1526 70%)', '--ui-tab-text': '#cfe6ff', '--ui-tab-active-text': '#08101d', '--ui-tab-border': '#79b8ff', '--ui-tab-close-hover': '#7a6cff', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 0 16px rgba(121, 184, 255, 0.35)', '--tab-transition': 'all 0.25s ease'
  } },
  parallaxGrid: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #0a0a0f 0%, #151526 100%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #5af0ff 0%, #7b61ff 100%)', '--ui-tab-hover-bg': 'linear-gradient(135deg, #121226 0%, #1a1a36 100%)', '--ui-tab-text': '#c7faff', '--ui-tab-active-text': '#041016', '--ui-tab-border': '#5af0ff', '--ui-tab-close-hover': '#7b61ff', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 0 16px rgba(90, 240, 255, 0.35)', '--tab-transition': 'all 0.25s ease'
  } },
  rippleInk: { styles: {
    '--ui-tab-bg': '#0b0b0f', '--ui-tab-active-bg': 'linear-gradient(135deg, #09111a 0%, #0e1c2b 100%)', '--ui-tab-hover-bg': '#101019', '--ui-tab-text': '#bfeaff', '--ui-tab-active-text': '#0a131f', '--ui-tab-border': '#55d1ff', '--ui-tab-close-hover': '#00bcd4', '--tab-border-radius': '10px 10px 0 0', '--tab-box-shadow': '0 0 16px rgba(85, 209, 255, 0.35)', '--tab-transition': 'all 0.25s ease'
  } },
  hueShift: { styles: {
    '--ui-tab-bg': 'linear-gradient(135deg, #141414 0%, #1f1f1f 100%)', '--ui-tab-active-bg': 'linear-gradient(135deg, #ff9aff 0%, #7ab8ff 50%, #79ffdf 100%)', '--ui-tab-hover-bg': 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)', '--ui-tab-text': '#e2e2e2', '--ui-tab-active-text': '#0b0b0b', '--ui-tab-border': '#a8bfff', '--ui-tab-close-hover': '#79ffdf', '--tab-border-radius': '8px 8px 0 0', '--tab-box-shadow': '0 0 18px rgba(168, 191, 255, 0.35)', '--tab-transition': 'all 0.25s ease'
  } }
});

// Función para aplicar el tema de pestañas
export const applyTabTheme = (themeName) => {
  const theme = tabThemes[themeName];
  if (!theme) return;

  // Buscar o crear el elemento de estilo para las pestañas
  let tabStyleElement = document.getElementById('tab-theme-styles');
  if (!tabStyleElement) {
    tabStyleElement = document.createElement('style');
    tabStyleElement.id = 'tab-theme-styles';
    document.head.appendChild(tabStyleElement);
  }

  let css = '';

  if (themeName === 'default') {
    // Para el tema default, no agregar CSS personalizado
    // Las variables CSS del tema UI se aplicarán automáticamente
    css = `
      /* Tema default - usa variables del tema UI */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        border-radius: var(--tab-border-radius, 4px 4px 0 0) !important;
        box-shadow: var(--tab-box-shadow, none) !important;
        transition: var(--tab-transition, all 0.2s ease) !important;
        backdrop-filter: var(--tab-backdrop-filter, none) !important;
      }
    `;
  } else {
    // Para temas personalizados, aplicar estilos específicos
    const styles = theme.styles;
    
    // Crear CSS personalizado
    css = `
      :root {
        ${Object.entries(styles).map(([key, value]) => `${key}: ${value};`).join('\n        ')}
      }
      
      .p-tabview .p-tabview-nav {
        background: var(--ui-tab-bg) !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        background: var(--ui-tab-bg) !important;
        color: var(--ui-tab-text) !important;
        border: 1px solid var(--ui-tab-border) !important;
        border-radius: var(--tab-border-radius, 4px 4px 0 0) !important;
        box-shadow: var(--tab-box-shadow, none) !important;
        transition: var(--tab-transition, all 0.2s ease) !important;
        backdrop-filter: var(--tab-backdrop-filter, none) !important;
        border-bottom: var(--tab-border-bottom, 1px solid var(--ui-tab-border)) !important;
        clip-path: var(--tab-clip-path, none) !important;
        filter: var(--tab-filter, none) !important;
        transform: var(--tab-transform, none) !important;
        border-style: var(--tab-border-style, solid) !important;
        background-size: var(--tab-background-size, auto) !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover {
        background: var(--ui-tab-hover-bg) !important;
        ${styles['--tab-active-elevation'] ? 'box-shadow: var(--tab-active-elevation) !important;' : ''}
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        background: var(--ui-tab-active-bg) !important;
        color: var(--ui-tab-active-text) !important;
        border-bottom: var(--tab-active-border-bottom, none) !important;
        ${styles['--tab-active-elevation'] ? 'box-shadow: var(--tab-active-elevation) !important;' : ''}
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-icon {
        color: var(--ui-tab-text) !important;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link .p-tabview-nav-link-icon {
        color: var(--ui-tab-active-text) !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-close {
        color: var(--ui-tab-text) !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-close:hover {
        color: var(--ui-tab-close-hover) !important;
      }
    `;
  }

  tabStyleElement.textContent = css;
};

// Función para cargar el tema guardado al iniciar la aplicación
export const loadSavedTabTheme = () => {
  const savedTheme = localStorage.getItem(TAB_THEME_STORAGE_KEY) || 'default';
  applyTabTheme(savedTheme);
  return savedTheme;
};
