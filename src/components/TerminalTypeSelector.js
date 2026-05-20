import React, { useEffect, useState } from 'react';
import { Button } from 'primereact/button';

const TerminalTypeSelector = ({ value, onChange }) => {
    const isWindows = window.electron?.platform === 'win32';
    const terminalLabel = isWindows ? 'PowerShell' : 'Terminal';
    const [aiClientsEnabled, setAiClientsEnabled] = useState({
        claude: false,
        opencode: false,
        geminicli: false,
        codexcli: false,
        antigravitycli: false
    });

    useEffect(() => {
        const syncAiClients = () => {
            try {
                const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
                setAiClientsEnabled({
                    claude: cfg.claude === true,
                    opencode: cfg.opencode === true,
                    geminicli: cfg.geminicli === true,
                    codexcli: cfg.codexcli === true,
                    antigravitycli: cfg.antigravitycli === true
                });
            } catch {
                setAiClientsEnabled({
                    claude: false,
                    opencode: false,
                    geminicli: false,
                    codexcli: false,
        antigravitycli: false
                });
            }
        };

        syncAiClients();
        window.addEventListener('ai-clients-config-changed', syncAiClients);
        window.addEventListener('storage', syncAiClients);

        return () => {
            window.removeEventListener('ai-clients-config-changed', syncAiClients);
            window.removeEventListener('storage', syncAiClients);
        };
    }, []);

    const terminalOptions = [
        { label: terminalLabel, value: 'powershell', icon: 'pi pi-desktop', color: '#4fc3f7' },
        ...(aiClientsEnabled.claude ? [{ label: 'Claude Code', value: 'claude', icon: 'pi pi-comments', color: '#f59e0b' }] : []),
        ...(aiClientsEnabled.opencode ? [{ label: 'OpenCode', value: 'opencode', icon: 'pi pi-code', color: '#6366f1' }] : []),
        ...(aiClientsEnabled.geminicli ? [{ label: 'Gemini CLI', value: 'geminicli', icon: 'pi pi-star', color: '#1a73e8' }] : []),
        ...(aiClientsEnabled.codexcli ? [{ label: 'Codex CLI', value: 'codexcli', icon: 'pi pi-bolt', color: '#10b981' }] : []),
        ...(aiClientsEnabled.antigravitycli ? [{ label: 'Antigravity CLI', value: 'antigravitycli', icon: 'pi pi-sparkles', color: '#4285f4' }] : [])
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
                                        : (option.value === 'codexcli'
                                            ? 'rgba(16, 185, 129, 0.15)'
                                        : (option.value === 'antigravitycli'
                                            ? 'rgba(66, 133, 244, 0.15)'
                                        : (option.value === 'wsl' ? 'rgba(138, 226, 52, 0.1)' : 'rgba(79, 195, 247, 0.1)')))))
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
