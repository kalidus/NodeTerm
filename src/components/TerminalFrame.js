import React from 'react';
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
    return (
        <div className={`terminal-frame ${className}`} id={id}>
            {!hideHeader && (
                <div className="terminal-frame-header">
                    {showControls && (
                        <div className="terminal-frame-controls">
                            <div className="terminal-frame-dot theme" />
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
