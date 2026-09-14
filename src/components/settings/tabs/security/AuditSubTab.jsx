import React, { useState, useEffect } from 'react';
import { Checkbox } from 'primereact/checkbox';
import { Slider } from 'primereact/slider';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import { appConfirm } from '../../../ui/AppConfirm';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (dateVal, fallback = 'N/A') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return fallback;
  }
};

const AuditSubTab = ({ onHide, showToast, isVisible = true }) => {
  const { t } = useTranslation('settings');

  // Estados de configuración de auditoría
  const [autoRecordingEnabled, setAutoRecordingEnabled] = useState(() => {
    return localStorage.getItem('audit_auto_recording') === 'true';
  });

  const [recordingQuality, setRecordingQuality] = useState(() => {
    return localStorage.getItem('audit_recording_quality') || 'medium';
  });

  const [encryptRecordings, setEncryptRecordings] = useState(() => {
    return localStorage.getItem('audit_encrypt_recordings') !== 'false';
  });

  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(() => {
    return localStorage.getItem('audit_auto_cleanup') === 'true';
  });

  const [retentionDays, setRetentionDays] = useState(() => {
    const val = parseInt(localStorage.getItem('audit_retention_days') || '30', 10);
    return Number.isFinite(val) ? val : 30;
  });

  const [maxStorageSize, setMaxStorageSize] = useState(() => {
    const val = parseFloat(localStorage.getItem('audit_max_storage_size') || '5.0');
    return Number.isFinite(val) ? val : 5.0;
  });

  const [cleanupOnStartup, setCleanupOnStartup] = useState(() => {
    return localStorage.getItem('audit_cleanup_on_startup') !== 'false';
  });

  const [cleanupFrequency, setCleanupFrequency] = useState(() => {
    return localStorage.getItem('audit_cleanup_frequency') || 'weekly';
  });

  // Estados de ruta y estadísticas
  const [recordingPath, setRecordingPath] = useState('');
  const [isDefaultPath, setIsDefaultPath] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [auditStats, setAuditStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Persistir configuraciones en localStorage
  useEffect(() => {
    localStorage.setItem('audit_auto_recording', String(autoRecordingEnabled));
  }, [autoRecordingEnabled]);

  useEffect(() => {
    localStorage.setItem('audit_recording_quality', recordingQuality);
  }, [recordingQuality]);

  useEffect(() => {
    localStorage.setItem('audit_encrypt_recordings', String(encryptRecordings));
  }, [encryptRecordings]);

  useEffect(() => {
    localStorage.setItem('audit_auto_cleanup', String(autoCleanupEnabled));
  }, [autoCleanupEnabled]);

  useEffect(() => {
    localStorage.setItem('audit_retention_days', String(retentionDays));
  }, [retentionDays]);

  useEffect(() => {
    localStorage.setItem('audit_max_storage_size', String(maxStorageSize));
  }, [maxStorageSize]);

  useEffect(() => {
    localStorage.setItem('audit_cleanup_on_startup', String(cleanupOnStartup));
  }, [cleanupOnStartup]);

  useEffect(() => {
    localStorage.setItem('audit_cleanup_frequency', cleanupFrequency);
  }, [cleanupFrequency]);

  // Cargar ruta de grabaciones
  useEffect(() => {
    let isMounted = true;
    const loadRecordingPath = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          setLoadingPath(true);
          const result = await window.electron.ipcRenderer.invoke('recording:get-path');
          if (isMounted && result && result.success) {
            setRecordingPath(result.currentPath);
            setIsDefaultPath(result.isDefault);
          }
          if (isMounted) setLoadingPath(false);
        }
      } catch (error) {
        console.error('Error cargando ruta de grabaciones:', error);
        if (isMounted) setLoadingPath(false);
      }
    };

    if (isVisible) {
      loadRecordingPath();
    }
    return () => { isMounted = false; };
  }, [isVisible]);

  // Cargar estadísticas
  useEffect(() => {
    let isMounted = true;
    const loadAuditStats = async () => {
      try {
        if (window?.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('recording:stats');
          if (isMounted && result && result.success) {
            setAuditStats({
              fileCount: result.stats?.total || 0,
              totalSize: result.stats?.totalSize || 0,
              oldestFile: null,
              lastCleanup: null
            });
          } else if (isMounted) {
            setAuditStats({ fileCount: 0, totalSize: 0, oldestFile: null, lastCleanup: null });
          }
        }
      } catch (error) {
        console.error('Error cargando estadísticas de auditoría:', error);
        if (isMounted) setAuditStats({ fileCount: 0, totalSize: 0, oldestFile: null, lastCleanup: null });
      }
    };

    loadAuditStats();
    return () => { isMounted = false; };
  }, []);

  const handleManualCleanup = async () => {
    const ok = await appConfirm({
      message: '¿Estás seguro de que quieres ejecutar la limpieza manual de archivos de auditoría?',
      header: 'Confirmar',
      severity: 'warn',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar'
    });
    if (!ok) return;

    try {
      setIsLoading(true);
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('audit:cleanup', {
          retentionDays,
          maxStorageSize: maxStorageSize * 1024 * 1024 * 1024,
          force: true
        });

        if (result && result.success) {
          showToast?.('success', 'Limpieza completada', `Se eliminaron ${result.deletedFiles || 0} archivos. Espacio liberado: ${formatBytes(result.freedSpace || 0)}`);
          const statsResult = await window.electron.ipcRenderer.invoke('audit:get-stats');
          if (statsResult && statsResult.success) {
            setAuditStats(statsResult.stats);
          }
        } else {
          showToast?.('error', 'Error en limpieza', result?.error || 'Error desconocido');
        }
      }
    } catch (error) {
      console.error('Error ejecutando limpieza manual:', error);
      showToast?.('error', 'Error', 'Error ejecutando limpieza manual');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAuditFiles = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('recording:list', {});
        if (result && result.success && result.recordings && result.recordings.length > 0) {
          onHide?.();
          const auditTabId = `audit_global_${Date.now()}`;
          window.dispatchEvent(new CustomEvent('create-audit-tab', {
            detail: {
              tabId: auditTabId,
              title: 'Auditoría Global',
              recordings: result.recordings
            }
          }));
        } else {
          showToast?.('info', 'Información', 'No hay grabaciones disponibles.');
        }
      }
    } catch (error) {
      console.error('Error abriendo grabaciones:', error);
      showToast?.('error', 'Error', 'Error al cargar grabaciones');
    }
  };

  return (
    <div className="security-settings-container">
      <div className="security-settings-content">
        {/* Header */}
        <div className="security-settings-header-wrapper">
          <div className="security-header-content">
            <span className="security-header-icon protocol-dialog-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="auditSettingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#764ba2" />
                    <stop offset="100%" stopColor="#f093fb" />
                  </linearGradient>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e8e8f0" />
                  </linearGradient>
                </defs>
                <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                  fill="url(#auditSettingsGradient)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.6" />
                <g transform="translate(12, 12)">
                  <circle cx="0" cy="0" r="3.5"
                    fill="none"
                    stroke="url(#shieldGradient)"
                    strokeWidth="1.2"
                    opacity="0.98" />
                  <circle cx="0" cy="0" r="1.8"
                    fill="url(#shieldGradient)"
                    opacity="0.98" />
                  <path d="M-2.5,-1.5 L2.5,-1.5 L2.5,1.5 L-2.5,1.5 Z"
                    fill="url(#auditSettingsGradient)"
                    opacity="0.6" />
                </g>
              </svg>
            </span>
            <div className="security-header-text">
              <h3 className="security-header">{t('security.audit.title') || 'Configuración de Auditoría'}</h3>
              <p className="security-description">{t('security.audit.description') || 'Configura el grabado automático de sesiones SSH y la gestión de archivos de auditoría'}</p>
            </div>
          </div>
        </div>

        {/* Grid de 2 columnas para las secciones */}
        <div className="security-layout-grid">
          {/* Contenedor izquierdo: Grabación + Estadísticas */}
          <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, width: '100%' }}>
            {/* Sección de Grabación Automática */}
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-video"></i>
                </div>
                <h4 className="general-section-title">{t('security.audit.autoRecording.title') || 'Grabación Automática de Sesiones SSH'}</h4>
              </div>

              <div className="general-settings-options">
                {/* Activar grabación automática */}
                <div className="general-setting-card" onClick={() => setAutoRecordingEnabled(!autoRecordingEnabled)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon lock">
                      <i className="pi pi-video"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="autoRecording" className="general-setting-label">
                        {t('security.audit.autoRecording.enable') || 'Activar grabación automática'}
                      </label>
                      <p className="general-setting-description">
                        {t('security.audit.autoRecording.enableDescription') || 'Graba automáticamente todas las sesiones SSH iniciadas'}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        inputId="autoRecording"
                        checked={autoRecordingEnabled}
                        onChange={(e) => setAutoRecordingEnabled(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                {autoRecordingEnabled && (
                  <>
                    {/* Calidad de grabación */}
                    <div className="general-icon-selector-section">
                      <div className="general-selector-row-expandable">
                        <div className="general-selector-info-group">
                          <div className="general-selector-icon-compact">
                            <i className="pi pi-sliders-h"></i>
                          </div>
                          <div className="general-selector-text-group">
                            <span className="general-selector-title-compact">{t('security.audit.autoRecording.quality') || 'Calidad de grabación'}</span>
                            <span className="general-selector-description-compact">{t('security.audit.autoRecording.qualityDescription') || 'Nivel de detalle capturado en las grabaciones'}</span>
                          </div>
                        </div>
                        <div className="general-selector-action-wrapper">
                          <Dropdown
                            id="recordingQuality"
                            value={recordingQuality}
                            options={[
                              { label: t('security.audit.autoRecording.qualityOptions.high') || 'Alta (todos los eventos)', value: 'high' },
                              { label: t('security.audit.autoRecording.qualityOptions.medium') || 'Media (eventos importantes)', value: 'medium' },
                              { label: t('security.audit.autoRecording.qualityOptions.low') || 'Baja (solo comandos)', value: 'low' }
                            ]}
                            onChange={(e) => setRecordingQuality(e.value)}
                            style={{ minWidth: '200px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cifrar grabaciones */}
                    <div className="general-setting-card" onClick={() => setEncryptRecordings(!encryptRecordings)}>
                      <div className="general-setting-content">
                        <div className="general-setting-icon lock">
                          <i className="pi pi-lock"></i>
                        </div>
                        <div className="general-setting-info">
                          <label htmlFor="encryptRecordings" className="general-setting-label">
                            {t('security.audit.autoRecording.encrypt') || 'Cifrar grabaciones con clave maestra'}
                          </label>
                          <p className="general-setting-description">
                            {t('security.audit.autoRecording.encryptDescription') || 'Las grabaciones se cifrarán automáticamente si tienes una clave maestra configurada'}
                          </p>
                        </div>
                        <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            inputId="encryptRecordings"
                            checked={encryptRecordings}
                            onChange={(e) => setEncryptRecordings(e.checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ubicación de grabaciones */}
                    <div className="general-icon-selector-section">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="general-selector-row-expandable">
                          <div className="general-selector-info-group">
                            <div className="general-selector-icon-compact">
                              <i className="pi pi-folder-open"></i>
                            </div>
                            <div className="general-selector-text-group">
                              <span className="general-selector-title-compact">{t('security.audit.autoRecording.location') || 'Ubicación de grabaciones'}</span>
                              <span className="general-selector-description-compact">
                                {isDefaultPath
                                  ? (t('security.audit.autoRecording.locationDefault') || 'Ubicación por defecto: AppData/NodeTerm/recordings')
                                  : (t('security.audit.autoRecording.locationCustom') || 'Personalizada: {path}').replace('{path}', recordingPath || t('security.audit.autoRecording.locationLoading') || 'Cargando...')
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <InputText
                            value={recordingPath || ''}
                            readOnly
                            style={{
                              flex: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.8125rem',
                              padding: '0.5rem 0.75rem'
                            }}
                            placeholder={loadingPath ? (t('security.audit.autoRecording.locationLoading') || 'Cargando...') : (t('security.audit.autoRecording.locationPlaceholder') || 'Ruta de grabaciones')}
                          />
                          <Button
                            icon="pi pi-folder-open"
                            label={t('security.audit.autoRecording.changeLocation') || 'Cambiar'}
                            onClick={async () => {
                              try {
                                if (!window?.electron?.dialog?.showOpenDialog) {
                                  showToast?.('warn', t('security.audit.autoRecording.notAvailable') || 'No disponible', t('security.audit.autoRecording.notAvailableDetail') || 'El selector de directorios requiere la app de escritorio');
                                  return;
                                }

                                const result = await window.electron.dialog.showOpenDialog({
                                  properties: ['openDirectory'],
                                  title: t('security.audit.autoRecording.selectFolder') || 'Seleccionar carpeta para guardar grabaciones'
                                });

                                if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                                  const selectedPath = result.filePaths[0];
                                  setLoadingPath(true);

                                  const setResult = await window.electron.ipcRenderer.invoke('recording:set-path', {
                                    customPath: selectedPath
                                  });

                                  if (setResult && setResult.success) {
                                    setRecordingPath(setResult.currentPath);
                                    setIsDefaultPath(false);
                                    showToast?.('success', t('security.audit.autoRecording.locationUpdated') || 'Ubicación actualizada', (t('security.audit.autoRecording.locationUpdatedDetail') || 'Las grabaciones se guardarán en: {path}').replace('{path}', setResult.currentPath));
                                  } else {
                                    showToast?.('error', t('security.audit.autoRecording.error') || 'Error', setResult?.error || t('security.audit.autoRecording.errorDetail') || 'No se pudo cambiar la ubicación');
                                  }
                                  setLoadingPath(false);
                                }
                              } catch (error) {
                                console.error('Error seleccionando carpeta:', error);
                                showToast?.('error', t('security.audit.autoRecording.error') || 'Error', t('security.audit.autoRecording.errorFolder') || 'No se pudo abrir el selector de carpeta');
                                setLoadingPath(false);
                              }
                            }}
                            disabled={loadingPath}
                            style={{ minWidth: '100px' }}
                          />
                          {!isDefaultPath && (
                            <Button
                              icon="pi pi-refresh"
                              label={t('security.audit.autoRecording.restoreLocation') || 'Restaurar'}
                              onClick={async () => {
                                try {
                                  setLoadingPath(true);
                                  const result = await window.electron.ipcRenderer.invoke('recording:set-path', {
                                    customPath: null
                                  });

                                  if (result && result.success) {
                                    setRecordingPath(result.currentPath);
                                    setIsDefaultPath(true);
                                    showToast?.('success', t('security.audit.autoRecording.locationRestored') || 'Ubicación restaurada', t('security.audit.autoRecording.locationRestoredDetail') || 'Se usará la ubicación por defecto');
                                  }
                                  setLoadingPath(false);
                                } catch (error) {
                                  console.error('Error restaurando ruta:', error);
                                  setLoadingPath(false);
                                }
                              }}
                              disabled={loadingPath}
                              style={{ minWidth: '100px' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sección de Estadísticas Actuales */}
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-chart-bar"></i>
                </div>
                <h4 className="general-section-title">{t('security.audit.stats.title') || 'Estadísticas Actuales'}</h4>
              </div>

              <div className="general-settings-options">
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.files') || 'Archivos:'}</span>
                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                        {auditStats?.fileCount || 0}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.totalSize') || 'Tamaño total:'}</span>
                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem' }}>
                        {formatBytes(auditStats?.totalSize || 0)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.oldest') || 'Más antiguo:'}</span>
                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        {formatDate(auditStats?.oldestFile)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-color-secondary)', opacity: 0.8 }}>{t('security.audit.stats.lastCleanup') || 'Última limpieza:'}</span>
                      <span style={{ color: 'var(--text-color)', fontWeight: '500', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        {formatDate(auditStats?.lastCleanup, t('security.audit.stats.never') || 'Nunca')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Limpieza Automática */}
          <div className="general-settings-section" style={{ gridColumn: '2', gridRow: '1', minWidth: 0, width: '100%' }}>
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-trash"></i>
              </div>
              <h4 className="general-section-title">{t('security.audit.cleanup.title') || 'Limpieza Automática de Archivos'}</h4>
            </div>

            <div className="general-settings-options">
              {/* Activar limpieza automática */}
              <div className="general-setting-card" onClick={() => setAutoCleanupEnabled(!autoCleanupEnabled)}>
                <div className="general-setting-content">
                  <div className="general-setting-icon lock">
                    <i className="pi pi-refresh"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="autoCleanup" className="general-setting-label">
                      {t('security.audit.cleanup.enable') || 'Activar limpieza automática'}
                    </label>
                    <p className="general-setting-description">
                      {t('security.audit.cleanup.enableDescription') || 'Elimina automáticamente archivos de auditoría antiguos según las reglas configuradas'}
                    </p>
                  </div>
                  <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      inputId="autoCleanup"
                      checked={autoCleanupEnabled}
                      onChange={(e) => setAutoCleanupEnabled(e.checked)}
                    />
                  </div>
                </div>
              </div>

              {autoCleanupEnabled && (
                <>
                  {/* Días de retención */}
                  <div className="general-icon-selector-section">
                    <div className="general-selector-row-expandable">
                      <div className="general-selector-info-group">
                        <div className="general-selector-icon-compact">
                          <i className="pi pi-calendar"></i>
                        </div>
                        <div className="general-selector-text-group">
                          <span className="general-selector-title-compact">
                            {(t('security.audit.cleanup.retentionDays') || 'Días de retención: {days}').replace('{days}', String(retentionDays))}
                          </span>
                          <span className="general-selector-description-compact">
                            {t('security.audit.cleanup.retentionDescription') || 'Archivos más antiguos serán eliminados automáticamente'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                      <Slider
                        id="retentionDays"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(e.value)}
                        min={1}
                        max={365}
                        step={1}
                        style={{ width: '100%' }}
                      />
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        marginTop: '0.25rem',
                        opacity: 0.7
                      }}>
                        <span>{t('security.audit.cleanup.retentionRange.min') || '1 día'}</span>
                        <span>{t('security.audit.cleanup.retentionRange.max') || '365 días'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tamaño máximo de almacenamiento */}
                  <div className="general-icon-selector-section">
                    <div className="general-selector-row-expandable">
                      <div className="general-selector-info-group">
                        <div className="general-selector-icon-compact">
                          <i className="pi pi-database"></i>
                        </div>
                        <div className="general-selector-text-group">
                          <span className="general-selector-title-compact">
                            {(t('security.audit.cleanup.maxStorage') || 'Tamaño máximo: {size} GB').replace('{size}', String(maxStorageSize))}
                          </span>
                          <span className="general-selector-description-compact">
                            {t('security.audit.cleanup.maxStorageDescription') || 'Límite total de espacio para archivos de auditoría'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                      <Slider
                        id="maxStorageSize"
                        value={maxStorageSize}
                        onChange={(e) => setMaxStorageSize(e.value)}
                        min={0.1}
                        max={100}
                        step={0.1}
                        style={{ width: '100%' }}
                      />
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        marginTop: '0.25rem',
                        opacity: 0.7
                      }}>
                        <span>{t('security.audit.cleanup.maxStorageRange.min') || '0.1 GB'}</span>
                        <span>{t('security.audit.cleanup.maxStorageRange.max') || '100 GB'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ejecutar limpieza al iniciar */}
                  <div className="general-setting-card" onClick={() => setCleanupOnStartup(!cleanupOnStartup)}>
                    <div className="general-setting-content">
                      <div className="general-setting-icon bolt">
                        <i className="pi pi-power-off"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="cleanupOnStartup" className="general-setting-label">
                          {t('security.audit.cleanup.onStartup') || 'Ejecutar limpieza al iniciar la aplicación'}
                        </label>
                        <p className="general-setting-description">
                          {t('security.audit.cleanup.onStartupDescription') || 'Limpia archivos antiguos cada vez que se inicia NodeTerm'}
                        </p>
                      </div>
                      <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          inputId="cleanupOnStartup"
                          checked={cleanupOnStartup}
                          onChange={(e) => setCleanupOnStartup(e.checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Frecuencia de limpieza */}
                  <div className="general-icon-selector-section">
                    <div className="general-selector-row-expandable">
                      <div className="general-selector-info-group">
                        <div className="general-selector-icon-compact">
                          <i className="pi pi-clock"></i>
                        </div>
                        <div className="general-selector-text-group">
                          <span className="general-selector-title-compact">{t('security.audit.cleanup.frequency') || 'Frecuencia de limpieza automática'}</span>
                          <span className="general-selector-description-compact">{t('security.audit.cleanup.frequencyDescription') || 'Con qué frecuencia se ejecutará la limpieza automática'}</span>
                        </div>
                      </div>
                      <div className="general-selector-action-wrapper">
                        <Dropdown
                          id="cleanupFrequency"
                          value={cleanupFrequency}
                          options={[
                            { label: t('security.audit.cleanup.frequencyOptions.daily') || 'Diaria', value: 'daily' },
                            { label: t('security.audit.cleanup.frequencyOptions.weekly') || 'Semanal', value: 'weekly' },
                            { label: t('security.audit.cleanup.frequencyOptions.monthly') || 'Mensual', value: 'monthly' },
                            { label: t('security.audit.cleanup.frequencyOptions.manual') || 'Manual únicamente', value: 'manual' }
                          ]}
                          onChange={(e) => setCleanupFrequency(e.value)}
                          style={{ minWidth: '180px' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Botones de acción */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Button
                  label={t('security.audit.cleanup.runNow') || 'Ejecutar Limpieza Ahora'}
                  icon="pi pi-trash"
                  onClick={handleManualCleanup}
                  disabled={!autoCleanupEnabled || isLoading}
                  className="p-button-warning"
                  style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                />
                <Button
                  label={t('security.audit.cleanup.viewFiles') || 'Ver Archivos'}
                  icon="pi pi-folder-open"
                  onClick={handleViewAuditFiles}
                  className="p-button-secondary"
                  style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AuditSubTab);
