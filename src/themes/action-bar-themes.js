/**
 * Temas visuales para la barra de acciones lateral (QuickAccessSidebar)
 */
export const actionBarThemes = {
    default: {
        id: 'default',
        name: 'Default',
        container: {
            background: 'var(--ui-sidebar-bg, rgba(16, 20, 28, 0.95))',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--ui-sidebar-border, rgba(255, 255, 255, 0.08))',
            boxShadow: 'var(--ui-dialog-shadow, 0 8px 32px rgba(0, 0, 0, 0.4))'
        },
        button: {
            background: 'var(--ui-sidebar-button-bg, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--ui-sidebar-border, rgba(255, 255, 255, 0.08))',
            boxShadow: 'none'
        },
        buttonHover: {
            background: 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))',
            border: '1px solid var(--ui-button-primary, rgba(33, 150, 243, 0.3))',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        },
        iconBox: {
            borderRadius: '10px'
        }
    },
    glassDark: {
        id: 'glassDark',
        name: 'Glass Dark',
        container: {
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        },
        button: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)'
        },
        buttonHover: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.2)'
        },
        iconBox: {
            borderRadius: '8px'
        }
    },
    glassLight: {
        id: 'glassLight',
        name: 'Glass Light',
        container: {
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        },
        button: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)'
        },
        buttonHover: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.3) 100%)',
            border: '1px solid rgba(255,255,255,0.7)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
        },
        iconBox: {
            borderRadius: '8px'
        }
    },
    solidDark: {
        id: 'solidDark',
        name: 'Solid Dark',
        container: {
            background: '#1a1c23',
            backdropFilter: 'none',
            border: '1px solid #2d313d',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        },
        button: {
            background: '#242731',
            border: '1px solid #363b4a',
            boxShadow: 'none'
        },
        buttonHover: {
            background: '#2d313d',
            border: '1px solid #484f63',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        },
        iconBox: {
            borderRadius: '6px'
        }
    },
    neon: {
        id: 'neon',
        name: 'Neon Rim',
        container: {
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(15px)',
            border: '1px solid var(--primary-color, #2196f3)',
            boxShadow: '0 0 15px var(--primary-color-alpha, rgba(33, 150, 243, 0.3)), inset 0 0 5px var(--primary-color-alpha, rgba(33, 150, 243, 0.2))'
        },
        button: {
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none'
        },
        buttonHover: {
            background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.1)',
            border: '1px solid var(--primary-color, #2196f3)',
            boxShadow: '0 0 10px var(--primary-color-alpha, rgba(33, 150, 243, 0.4))'
        },
        iconBox: {
            borderRadius: '10px'
        }
    },
    minimal: {
        id: 'minimal',
        name: 'Minimal',
        container: {
            background: 'transparent',
            backdropFilter: 'none',
            border: 'none',
            boxShadow: 'none'
        },
        button: {
            background: 'transparent',
            border: 'none',
            boxShadow: 'none'
        },
        buttonHover: {
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            boxShadow: 'none'
        },
        iconBox: {
            borderRadius: '8px'
        }
    },
    frosted: {
        id: 'frosted',
        name: 'Frosted Color',
        container: {
            background: 'var(--primary-color-alpha-low, rgba(33, 150, 243, 0.15))',
            backdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        },
        button: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'none'
        },
        buttonHover: {
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        },
        iconBox: {
            borderRadius: '12px'
        }
    }
};
