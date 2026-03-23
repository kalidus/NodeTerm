import React, { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import '../styles/components/terminal-frame.css';

const TerminalFrame = ({
    children,
    title = '',
    headerExtra = null,
    showControls = true,
    hideHeader = false,
    className = '',
    contentClassName = '',
    id,
    style = {},
    isDraggable = false,
    onClose = () => {},
    onMinimize = () => {},
    onMaximize = () => {}
}) => {
    const [frameStyle, setFrameStyle] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEYS.TERMINAL_FRAME_STYLE) || 'macos';
        } catch {
            return 'macos';
        }
    });

    useEffect(() => {
        const handleFrameStyleChange = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.TERMINAL_FRAME_STYLE);
                if (stored && stored !== frameStyle) {
                    setFrameStyle(stored);
                }
            } catch {
                // Ignorar errores de lectura de localStorage
            }
        };

        window.addEventListener('terminal-frame-style-changed', handleFrameStyleChange);
        window.addEventListener('storage', handleFrameStyleChange);

        return () => {
            window.removeEventListener('terminal-frame-style-changed', handleFrameStyleChange);
            window.removeEventListener('storage', handleFrameStyleChange);
        };
    }, [frameStyle]);

    const frameStyleClass = frameStyle ? `terminal-frame-${frameStyle}` : '';

    return (
        <div className={`terminal-frame ${frameStyleClass} ${className}`} id={id} style={style}>
            {!hideHeader && (
                <div 
                    className="terminal-frame-header"
                    style={isDraggable ? { WebkitAppRegion: 'drag' } : {}}
                >
                    {showControls && frameStyle !== 'minimal' && (
                        frameStyle === 'macos' ? (
                            <div className="terminal-frame-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="terminal-frame-dot red" onClick={onClose} title="Cerrar" />
                                <div className="terminal-frame-dot yellow" onClick={onMinimize} title="Minimizar" />
                                <div className="terminal-frame-dot green" onClick={onMaximize} title="Maximizar" />
                            </div>
                        ) : frameStyle === 'gnome' ? (
                            <div className="terminal-frame-controls gnome-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="gnome-dot minimize" onClick={onMinimize} title="Minimizar">
                                    <span style={{ fontSize: 10 }}>−</span>
                                </div>
                                <div className="gnome-dot maximize" onClick={onMaximize} title="Maximizar">
                                    <span style={{ fontSize: 10 }}>□</span>
                                </div>
                                <div className="gnome-dot close" onClick={onClose} title="Cerrar">
                                    <span style={{ fontSize: 10 }}>×</span>
                                </div>
                            </div>
                        ) : frameStyle === 'kde' ? (
                            <div className="terminal-frame-controls kde-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="kde-dot minimize" onClick={onMinimize} title="Minimizar">
                                    <div className="custom-icon icon-min" />
                                </div>
                                <div className="kde-dot maximize" onClick={onMaximize} title="Maximizar">
                                    <div className="custom-icon icon-max" />
                                </div>
                                <div className="kde-dot close" onClick={onClose} title="Cerrar">
                                    <div className="custom-icon icon-close" />
                                </div>
                            </div>
                        ) : frameStyle === 'windows' ? (
                            <div className="terminal-frame-controls windows-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="win-dot minimize" onClick={onMinimize} title="Minimizar">
                                    <div className="custom-icon icon-min" />
                                </div>
                                <div className="win-dot maximize" onClick={onMaximize} title="Maximizar">
                                    <div className="custom-icon icon-max" />
                                </div>
                                <div className="win-dot close" onClick={onClose} title="Cerrar">
                                    <div className="custom-icon icon-close" />
                                </div>
                            </div>
                        ) : frameStyle === 'matcha' ? (
                            <div className="terminal-frame-controls matcha-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="matcha-dot minimize" onClick={onMinimize} title="Minimizar">
                                    <span style={{ fontSize: 11 }}>−</span>
                                </div>
                                <div className="matcha-dot maximize" onClick={onMaximize} title="Maximizar">
                                    <span style={{ fontSize: 11 }}>□</span>
                                </div>
                                <div className="matcha-dot close" onClick={onClose} title="Cerrar">
                                    <span style={{ fontSize: 11 }}>✕</span>
                                </div>
                            </div>
                        ) : frameStyle === 'futuristic' ? (
                            <div className="terminal-frame-controls futuristic-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="cyber-dot minimize" onClick={onMinimize} title="Minimizar">MIN</div>
                                <div className="cyber-dot maximize" onClick={onMaximize} title="Maximizar">MAX</div>
                                <div className="cyber-dot close" onClick={onClose} title="Cerrar">EXE</div>
                            </div>
                        ) : frameStyle === 'modern' ? (
                            <div className="terminal-frame-controls modern-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="glass-dot minimize" onClick={onMinimize} title="Minimizar">
                                    <span style={{ fontSize: 10 }}>−</span>
                                </div>
                                <div className="glass-dot maximize" onClick={onMaximize} title="Maximizar">
                                    <span style={{ fontSize: 10 }}>□</span>
                                </div>
                                <div className="glass-dot close" onClick={onClose} title="Cerrar">
                                    <span style={{ fontSize: 10 }}>✕</span>
                                </div>
                            </div>
                        ) : frameStyle === 'retro' ? (
                            <div className="terminal-frame-controls retro-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="retro-switch minimize" onClick={onMinimize} title="Minimizar" />
                                <div className="retro-switch maximize" onClick={onMaximize} title="Maximizar" />
                                <div className="retro-switch on close" onClick={onClose} title="Cerrar" />
                            </div>
                        ) : frameStyle === 'minimal' ? (
                            null
                        ) : (
                            <div className="terminal-frame-controls" style={isDraggable ? { WebkitAppRegion: 'no-drag' } : {}}>
                                <div className="terminal-frame-window-btn minimize" onClick={onMinimize} title="Minimizar">
                                    <span className="window-icon window-icon-min" />
                                </div>
                                <div className="terminal-frame-window-btn maximize" onClick={onMaximize} title="Maximizar">
                                    <span className="window-icon window-icon-max" />
                                </div>
                                <div className="terminal-frame-window-btn close" onClick={onClose} title="Cerrar">
                                    <span className="window-icon window-icon-close" />
                                </div>
                            </div>
                        )
                    )}

                    {/* Título - actúa como espaciador si no hay título pero sí extra */}
                    <div className="terminal-frame-title" style={{ flex: title ? '1' : '1', visibility: title ? 'visible' : 'hidden' }}>
                        {title}
                    </div>

                    {headerExtra && (
                        <div className="terminal-frame-header-extra" style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            zIndex: 10,
                            ...(isDraggable ? { WebkitAppRegion: 'no-drag' } : {}) 
                        }}>
                            {headerExtra}
                        </div>
                    )}
                </div>
            )}

            <div className={`terminal-frame-content ${contentClassName}`}>
                {children}
            </div>
        </div>
    );
};

export default TerminalFrame;

