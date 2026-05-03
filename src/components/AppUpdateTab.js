import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { useTranslation } from '../i18n/hooks/useTranslation';

const AppUpdateTab = ({
  contentHeight,
  currentAppVersion,
  updateStatus,
  isCheckingUpdates,
  checkForUpdates,
  downloadProgress,
  updateInfo,
  isDownloading,
  downloadUpdate,
  installUpdate,
  isInstalling,
  autoCheckEnabled,
  handleAutoCheckChange,
  autoInstallEnabled,
  handleAutoInstallChange,
  autoDownloadEnabled,
  handleAutoDownloadChange,
  updateChannel,
  handleChannelChange
}) => {
  const { t } = useTranslation('settings');

  return (
    <div style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
      <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
        {/* Header */}
        <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
          <div className="general-header-content">
            <span className="general-header-icon protocol-dialog-header-icon">
              <i className="pi pi-refresh"></i>
            </span>
            <div className="general-header-text">
              <h3 className="general-header">{t('updateChannels.updatesTitle')}</h3>
              <p className="general-description">{t('updateChannels.updatesDescription')}</p>
            </div>
          </div>
        </div>

        {/* Grid de 2 columnas para las secciones */}
        <div className="general-settings-content">
          {/* Card 1: Buscar Actualizaciones e Información */}
          <div className="general-settings-section">
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-search"></i>
              </div>
              <h4 className="general-section-title">{t('updateChannels.checkUpdates')}</h4>
            </div>

            <div className="general-settings-options">
              {/* Card principal de actualizaciones */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(var(--primary-color-rgb, 33, 150, 243), 0.08) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.03) 100%)',
                border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.2)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '0.5rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}>
                {/* Decoración de fondo sutil */}
                <div style={{
                  position: 'absolute',
                  top: '-40%',
                  right: '-15%',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(var(--primary-color-rgb, 33, 150, 243), 0.08) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}></div>

                {/* Versión actual destacada */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.6875rem',
                      fontWeight: '600',
                      color: 'var(--text-color-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.375rem'
                    }}>
                      Versión Actual
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.8) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(var(--primary-color-rgb, 33, 150, 243), 0.25)',
                        flexShrink: 0
                      }}>
                        <i className="pi pi-check-circle" style={{ fontSize: '1.25rem', color: '#ffffff' }}></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '1.375rem',
                          fontWeight: '700',
                          color: 'var(--ui-dialog-text)',
                          lineHeight: '1.2',
                          letterSpacing: '-0.3px',
                          marginBottom: '0.125rem'
                        }}>
                          v{currentAppVersion}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-color-secondary)',
                          lineHeight: '1.3'
                        }}>
                          {updateStatus === 'downloaded'
                            ? (t('updateChannels.downloadCompleteDetail') || 'Actualización lista para instalar')
                            : updateStatus === 'available'
                              ? (t('updateChannels.newVersion') || 'Nueva versión disponible')
                              : (t('updateChannels.upToDateDetail') || 'Instalada y actualizada')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de verificación */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Button
                    label={isCheckingUpdates ? t('updateChannels.checking') : t('updateChannels.checkNow')}
                    icon={isCheckingUpdates ? "pi pi-spin pi-spinner" : "pi pi-search"}
                    onClick={checkForUpdates}
                    disabled={isCheckingUpdates}
                    className="p-button-primary"
                    style={{
                      width: '100%',
                      height: '42px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      borderRadius: '10px',
                      boxShadow: '0 3px 10px rgba(var(--primary-color-rgb, 33, 150, 243), 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Estados de actualización */}
              {updateStatus === 'downloading' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(33, 150, 243, 0.05) 100%)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(33, 150, 243, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.125rem', color: 'var(--primary-color)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--ui-dialog-text)', marginBottom: '0.125rem' }}>
                        Descargando actualización
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                        {downloadProgress.toFixed(1)}% completado
                      </div>
                    </div>
                  </div>
                  <div style={{
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary-color) 0%, rgba(var(--primary-color-rgb, 33, 150, 243), 0.8) 100%)',
                      width: `${downloadProgress}%`,
                      transition: 'width 0.3s ease',
                      borderRadius: '3px',
                      boxShadow: '0 0 6px rgba(var(--primary-color-rgb, 33, 150, 243), 0.4)'
                    }}></div>
                  </div>
                </div>
              )}

              {updateStatus === 'available' && updateInfo && !isDownloading && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.05) 100%)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-check-circle" style={{ fontSize: '1.125rem', color: 'var(--green-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--green-500)', marginBottom: '0.375rem' }}>
                        Nueva versión disponible
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        background: 'rgba(76, 175, 80, 0.15)',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--green-600)',
                        marginBottom: '0.5rem'
                      }}>
                        <i className="pi pi-arrow-up" style={{ fontSize: '0.6875rem' }}></i>
                        <span>v{updateInfo.version || 'desconocida'}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                        Hay una nueva versión disponible para descargar e instalar.
                      </div>
                    </div>
                  </div>
                  {!autoDownloadEnabled && (
                    <Button
                      label={t('updateChannels.download')}
                      icon="pi pi-download"
                      onClick={downloadUpdate}
                      disabled={isDownloading}
                      className="p-button-success"
                      style={{
                        width: '100%',
                        height: '40px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        borderRadius: '10px',
                        boxShadow: '0 3px 10px rgba(76, 175, 80, 0.2)'
                      }}
                    />
                  )}
                </div>
              )}

              {updateStatus === 'downloaded' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.05) 100%)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-check-circle" style={{ fontSize: '1.125rem', color: 'var(--green-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--green-500)', marginBottom: '0.375rem' }}>
                        Actualización lista para instalar
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                        La actualización se ha descargado correctamente. Haz clic en el botón para instalar y reiniciar la aplicación.
                      </div>
                    </div>
                  </div>
                  <Button
                    label={t('updateChannels.install')}
                    icon="pi pi-check"
                    onClick={installUpdate}
                    disabled={isInstalling}
                    className="p-button-success"
                    style={{
                      width: '100%',
                      height: '40px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      borderRadius: '10px',
                      boxShadow: '0 3px 10px rgba(76, 175, 80, 0.2)'
                    }}
                  />
                </div>
              )}

              {updateStatus === 'error' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.12) 0%, rgba(244, 67, 54, 0.05) 100%)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(244, 67, 54, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-times-circle" style={{ fontSize: '1.125rem', color: 'var(--red-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--red-500)', marginBottom: '0.375rem' }}>
                        Error al buscar actualizaciones
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: '1.4' }}>
                        No se pudo conectar con el servidor de actualizaciones. Verifica tu conexión a internet e intenta nuevamente.
                      </div>
                    </div>
                  </div>
                  <Button
                    label={t('updateChannels.retry')}
                    icon="pi pi-refresh"
                    onClick={checkForUpdates}
                    className="p-button-outlined"
                    style={{
                      width: '100%',
                      height: '40px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      borderRadius: '10px'
                    }}
                  />
                </div>
              )}

              {/* Sección: Información */}
              <div style={{
                marginTop: '0.5rem',
                padding: '1rem',
                background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(76, 175, 80, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-shield" style={{ fontSize: '0.875rem', color: 'var(--green-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--ui-dialog-text)',
                        marginBottom: '0.25rem'
                      }}>
                        Seguridad
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        lineHeight: '1.4'
                      }}>
                        Actualizaciones firmadas y verificadas
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(33, 150, 243, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-server" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--ui-dialog-text)',
                        marginBottom: '0.25rem'
                      }}>
                        Distribución
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        lineHeight: '1.4'
                      }}>
                        GitHub Releases
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 193, 7, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-bell" style={{ fontSize: '0.875rem', color: 'var(--yellow-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--ui-dialog-text)',
                        marginBottom: '0.25rem'
                      }}>
                        Notificaciones
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        lineHeight: '1.4'
                      }}>
                        Alertas automáticas de seguridad
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(156, 39, 176, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="pi pi-cog" style={{ fontSize: '0.875rem', color: 'var(--purple-500)' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--ui-dialog-text)',
                        marginBottom: '0.25rem'
                      }}>
                        Configuración
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        lineHeight: '1.4'
                      }}>
                        Personaliza búsqueda y descarga
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Configuración de Actualizaciones (Canal + Búsqueda Automática) */}
          <div className="general-settings-section">
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-cog"></i>
              </div>
              <h4 className="general-section-title">Configuración de Actualizaciones</h4>
            </div>

            <div className="general-settings-options">
              {/* Subsección: Búsqueda Automática */}
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-color-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="pi pi-clock" style={{ fontSize: '0.875rem' }}></i>
                  <span>Búsqueda Automática</span>
                </div>
                <div className="general-setting-card" onClick={() => handleAutoCheckChange(!autoCheckEnabled)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon lock">
                      <i className="pi pi-check"></i>
                    </div>
                    <div className="general-setting-info">
                      <label className="general-setting-label">
                        Buscar automáticamente
                      </label>
                      <p className="general-setting-description">
                        Cada 24 horas
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={autoCheckEnabled}
                        onChange={(e) => handleAutoCheckChange(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => handleAutoInstallChange(!autoInstallEnabled)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon bolt">
                      <i className="pi pi-refresh"></i>
                    </div>
                    <div className="general-setting-info">
                      <label className="general-setting-label">
                        Instalar automáticamente al detectar nueva versión
                      </label>
                      <p className="general-setting-description">
                        Al cerrar la aplicación
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={autoInstallEnabled}
                        onChange={(e) => handleAutoInstallChange(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => handleAutoDownloadChange(!autoDownloadEnabled)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon bolt">
                      <i className="pi pi-download"></i>
                    </div>
                    <div className="general-setting-info">
                      <label className="general-setting-label">
                        Descargar automáticamente
                      </label>
                      <p className="general-setting-description">
                        En segundo plano
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={autoDownloadEnabled}
                        onChange={(e) => handleAutoDownloadChange(e.checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Subsección: Canal */}
              <div style={{
                padding: '1rem',
                background: 'rgba(var(--primary-color-rgb, 33, 150, 243), 0.04)',
                borderRadius: '10px',
                border: '1px solid rgba(var(--primary-color-rgb, 33, 150, 243), 0.12)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-color-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="pi pi-sitemap" style={{ fontSize: '0.875rem' }}></i>
                  <span>Canal</span>
                </div>
                <div className="general-setting-card" onClick={() => handleChannelChange('latest')}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon lock">
                      <i className="pi pi-shield"></i>
                    </div>
                    <div className="general-setting-info">
                      <label className="general-setting-label">
                        {t('updateChannels.stableRecommended')}
                      </label>
                      <p className="general-setting-description">
                        {t('updateChannels.stableDescription')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={updateChannel === 'latest'}
                        onChange={() => handleChannelChange('latest')}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => handleChannelChange('beta')}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon bolt">
                      <i className="pi pi-flask"></i>
                    </div>
                    <div className="general-setting-info">
                      <label className="general-setting-label">
                        {t('updateChannels.beta')}
                      </label>
                      <p className="general-setting-description">
                        {t('updateChannels.betaDescription')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={updateChannel === 'beta'}
                        onChange={() => handleChannelChange('beta')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppUpdateTab;
