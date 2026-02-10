import React from 'react';
import { Button } from 'primereact/button';

const TerminalTypeSelector = ({ value, onChange }) => {
    const terminalOptions = [
        { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop', color: '#4fc3f7' }
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
                                (option.value === 'wsl' ? 'rgba(138, 226, 52, 0.1)' : 'rgba(79, 195, 247, 0.1)')
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
