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
    id
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
        <div className={`terminal-frame ${frameStyleClass} ${className}`} id={id}>
            {!hideHeader && (
                <div className="terminal-frame-header">
                    {showControls && frameStyle !== 'minimal' && (
                        frameStyle === 'macos' ? (
                            <div className="terminal-frame-controls">
                                <div className="terminal-frame-dot red" />
                                <div className="terminal-frame-dot yellow" />
                                <div className="terminal-frame-dot green" />
                            </div>
                        ) : frameStyle === 'gnome' ? (
                            <div className="terminal-frame-controls gnome-controls">
                                <div className="gnome-dot">
                                    <span style={{ fontSize: 10 }}>×</span>
                                </div>
                            </div>
                        ) : frameStyle === 'kde' ? (
                            <div className="terminal-frame-controls kde-controls">
                                <div className="kde-dot">
                                    <div className="custom-icon icon-min" />
                                </div>
                                <div className="kde-dot">
                                    <div className="custom-icon icon-max" />
                                </div>
                                <div className="kde-dot close">
                                    <div className="custom-icon icon-close" />
                                </div>
                            </div>
                        ) : frameStyle === 'windows' ? (
                            <div className="terminal-frame-controls windows-controls">
                                <div className="win-dot">
                                    <div className="custom-icon icon-min" />
                                </div>
                                <div className="win-dot">
                                    <div className="custom-icon icon-max" />
                                </div>
                                <div className="win-dot close">
                                    <div className="custom-icon icon-close" />
                                </div>
                            </div>
                        ) : frameStyle === 'matcha' ? (
                            <div className="terminal-frame-controls matcha-controls">
                                <div className="matcha-dot">
                                    <span style={{ fontSize: 11 }}>✕</span>
                                </div>
                            </div>
                        ) : frameStyle === 'futuristic' ? (
                            <div className="terminal-frame-controls futuristic-controls">
                                <div className="cyber-dot">EXE</div>
                            </div>
                        ) : frameStyle === 'modern' ? (
                            <div className="terminal-frame-controls modern-controls">
                                <div className="glass-dot">
                                    <span style={{ fontSize: 10 }}>✕</span>
                                </div>
                            </div>
                        ) : frameStyle === 'retro' ? (
                            <div className="terminal-frame-controls retro-controls">
                                <div className="retro-switch on" />
                            </div>
                        ) : (
                            <div className="terminal-frame-controls">
                                <div className="terminal-frame-window-btn minimize">
                                    <span className="window-icon window-icon-min" />
                                </div>
                                <div className="terminal-frame-window-btn maximize">
                                    <span className="window-icon window-icon-max" />
                                </div>
                                <div className="terminal-frame-window-btn close">
                                    <span className="window-icon window-icon-close" />
                                </div>
                            </div>
                        )
                    )}

                    {title && <div className="terminal-frame-title">{title}</div>}

                    {headerExtra && (
                        <div className="terminal-frame-header-extra">
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
