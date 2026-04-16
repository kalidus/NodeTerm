import React from 'react';
import { Button } from 'primereact/button';

const TerminalTypeSelector = ({ value, onChange }) => {
    const isWindows = window.electron?.platform === 'win32';
    const terminalLabel = isWindows ? 'PowerShell' : 'Terminal';

    const terminalOptions = [
        { label: terminalLabel, value: 'powershell', icon: 'pi pi-desktop', color: '#4fc3f7' },
        { label: 'Claude Code', value: 'claude', icon: 'pi pi-comments', color: '#f59e0b' },
        { label: 'OpenCode', value: 'opencode', icon: 'pi pi-code', color: '#6366f1' },
        { label: 'Gemini CLI', value: 'geminicli', icon: 'pi pi-star', color: '#1a73e8' }
    ];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            color: '#ffffff'
        }}>
            <span style={{ fontWeight: '500' }}>Terminal:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
                {terminalOptions.map((option) => (
                    <Button
                        key={option.value}
                        icon={option.icon}
                        label={option.label}
                        onClick={() => onChange(option.value)}
                        className={value === option.value ? 'p-button-outlined' : 'p-button-text'}
                        style={{
                            color: value === option.value ? option.color : 'rgba(255, 255, 255, 0.7)',
                            borderColor: value === option.value ? option.color : 'transparent',
                            backgroundColor: value === option.value ?
                                (option.value === 'claude'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : (option.value === 'opencode'
                                        ? 'rgba(99, 102, 241, 0.15)'
                                        : (option.value === 'geminicli'
                                            ? 'rgba(26, 115, 232, 0.15)'
                                        : (option.value === 'wsl' ? 'rgba(138, 226, 52, 0.1)' : 'rgba(79, 195, 247, 0.1)')))
                                : 'transparent',
                            fontSize: '12px',
                            padding: '4px 8px',
                            height: '32px',
                            transition: 'all 0.2s ease'
                        }}
                        size="small"
                    />
                ))}
            </div>
        </div>
    );
};

export default TerminalTypeSelector;
