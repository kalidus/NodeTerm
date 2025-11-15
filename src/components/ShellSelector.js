import React, { useState, useEffect, useMemo } from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const ShellSelector = ({
  selectedShell = 'powershell',
  onShellChange = () => {},
  availableShells = [],
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentTheme = useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, []);

  const themeColors = useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      textPrimary: currentTheme.colors?.sidebarText || '#ffffff',
      textSecondary: currentTheme.colors?.textMuted || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || '#2196f3',
      successColor: '#4CAF50',
      warningColor: '#FFC107'
    };
  }, [currentTheme]);

  // Obtener nombre y icono de la shell
  const getShellInfo = (shell) => {
    const shellMap = {
      'powershell': { name: 'PowerShell', icon: 'pi-desktop', color: '#4fc3f7' },
      'cygwin': { name: 'Cygwin', icon: 'pi-server', color: '#FFC107' },
    };
    
    // Para WSL distros
    if (shell.startsWith('wsl-')) {
      const distroName = shell.replace('wsl-', '');
      return { name: `WSL: ${distroName}`, icon: 'pi-server', color: '#8ae234' };
    }
    
    return shellMap[shell] || { name: shell, icon: 'pi-desktop', color: '#9E9E9E' };
  };

  const currentShellInfo = getShellInfo(selectedShell);

  // Agrupar shells disponibles
  const groupedShells = useMemo(() => {
    const groups = {
      windows: [],
      wsl: [],
      other: []
    };

    if (availableShells.length === 0) {
      // Si no hay shells disponibles, mostrar al menos PowerShell
      groups.windows.push({ value: 'powershell', label: 'PowerShell', icon: 'pi-desktop', color: '#4fc3f7' });
    } else {
      availableShells.forEach(shell => {
        if (shell === 'powershell') {
          groups.windows.push({ value: 'powershell', label: 'PowerShell', icon: 'pi-desktop', color: '#4fc3f7' });
        } else if (shell === 'cygwin') {
          groups.windows.push({ value: 'cygwin', label: 'Cygwin', icon: 'pi-server', color: '#FFC107' });
        } else if (shell.startsWith('wsl-')) {
          const distroName = shell.replace('wsl-', '');
          groups.wsl.push({ value: shell, label: `${distroName}`, icon: 'pi-server', color: '#8ae234' });
        } else {
          groups.other.push({ value: shell, label: shell, icon: 'pi-desktop', color: '#9E9E9E' });
        }
      });
    }

    return groups;
  }, [availableShells]);

  const handleShellChange = (shell) => {
    onShellChange(shell);
    setIsExpanded(false);
    // Guardar en localStorage
    localStorage.setItem('defaultMcpShell', shell);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botón Principal */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isLoading}
        style={{
          background: isExpanded
            ? `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`
            : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '4px',
          padding: '0.3rem 0.5rem',
          color: 'white',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '32px',
          height: '24px',
          fontSize: '0.7rem',
          opacity: isLoading ? 0.5 : 1,
          position: 'relative'
        }}
        title={`Shell: ${currentShellInfo.name}`}
      >
        <i className={`pi ${currentShellInfo.icon}`} style={{ fontSize: '0.75rem' }} />
      </button>

      {/* Panel Expandible */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '0.5rem',
            backgroundColor: themeColors.background,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '4px',
            padding: '0.5rem',
            minWidth: '180px',
            maxHeight: '250px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
        >
          {/* Grupo Windows */}
          {groupedShells.windows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: themeColors.textSecondary,
                  fontWeight: '600',
                  padding: '0.3rem 0.5rem',
                  textTransform: 'uppercase',
                  opacity: 0.7
                }}
              >
                Windows
              </div>
              {groupedShells.windows.map(shell => (
                <button
                  key={shell.value}
                  onClick={() => handleShellChange(shell.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    marginBottom: '0.2rem',
                    border: 'none',
                    borderRadius: '3px',
                    backgroundColor: selectedShell === shell.value
                      ? `${shell.color}30`
                      : 'rgba(255,255,255,0.05)',
                    color: selectedShell === shell.value ? shell.color : themeColors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: selectedShell === shell.value ? '600' : '400',
                    border: selectedShell === shell.value ? `1px solid ${shell.color}` : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  <i className={`pi ${shell.icon}`} style={{ fontSize: '0.65rem', width: '14px' }} />
                  <span>{shell.label}</span>
                  {selectedShell === shell.value && (
                    <i className="pi pi-check" style={{ fontSize: '0.65rem', marginLeft: 'auto' }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Grupo WSL */}
          {groupedShells.wsl.length > 0 && (
            <div style={{ marginTop: groupedShells.windows.length > 0 ? '0.3rem' : 0 }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: themeColors.textSecondary,
                  fontWeight: '600',
                  padding: '0.3rem 0.5rem',
                  textTransform: 'uppercase',
                  opacity: 0.7
                }}
              >
                WSL Distros
              </div>
              {groupedShells.wsl.map(shell => (
                <button
                  key={shell.value}
                  onClick={() => handleShellChange(shell.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    marginBottom: '0.2rem',
                    border: 'none',
                    borderRadius: '3px',
                    backgroundColor: selectedShell === shell.value
                      ? `${shell.color}30`
                      : 'rgba(255,255,255,0.05)',
                    color: selectedShell === shell.value ? shell.color : themeColors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: selectedShell === shell.value ? '600' : '400',
                    border: selectedShell === shell.value ? `1px solid ${shell.color}` : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  <i className={`pi ${shell.icon}`} style={{ fontSize: '0.65rem', width: '14px' }} />
                  <span>{shell.label}</span>
                  {selectedShell === shell.value && (
                    <i className="pi pi-check" style={{ fontSize: '0.65rem', marginLeft: 'auto' }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Grupo Other */}
          {groupedShells.other.length > 0 && (
            <div style={{ marginTop: (groupedShells.windows.length > 0 || groupedShells.wsl.length > 0) ? '0.3rem' : 0 }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: themeColors.textSecondary,
                  fontWeight: '600',
                  padding: '0.3rem 0.5rem',
                  textTransform: 'uppercase',
                  opacity: 0.7
                }}
              >
                Otras
              </div>
              {groupedShells.other.map(shell => (
                <button
                  key={shell.value}
                  onClick={() => handleShellChange(shell.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    marginBottom: '0.2rem',
                    border: 'none',
                    borderRadius: '3px',
                    backgroundColor: selectedShell === shell.value
                      ? `${shell.color}30`
                      : 'rgba(255,255,255,0.05)',
                    color: selectedShell === shell.value ? shell.color : themeColors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: selectedShell === shell.value ? '600' : '400',
                    border: selectedShell === shell.value ? `1px solid ${shell.color}` : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedShell !== shell.value) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  <i className={`pi ${shell.icon}`} style={{ fontSize: '0.65rem', width: '14px' }} />
                  <span>{shell.label}</span>
                  {selectedShell === shell.value && (
                    <i className="pi pi-check" style={{ fontSize: '0.65rem', marginLeft: 'auto' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cerrar panel si hace click fuera */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default ShellSelector;

