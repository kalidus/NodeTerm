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

    return (
        <div className={`terminal-frame ${className}`} id={id}>
            {!hideHeader && (
                <div className="terminal-frame-header">
                    {showControls && (
                        <div className="terminal-frame-controls">
                            {frameStyle === 'macos' ? (
                                <>
                                    <div className="terminal-frame-dot red" />
                                    <div className="terminal-frame-dot yellow" />
                                    <div className="terminal-frame-dot green" />
                                </>
                            ) : (
                                <div className="terminal-frame-dot theme" />
                            )}
                        </div>
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
