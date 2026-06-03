import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressBar } from 'primereact/progressbar';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { mapBrowserEntriesToNodes } from '../utils/passwordImportMapper';
import { useTranslation } from '../i18n/hooks/useTranslation';

const BrowserImportPanel = ({
  onImportPasswordsComplete,
  showToast,
  defaultContainerName
}) => {
  const { t } = useTranslation('common');
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [firefoxMasterPassword, setFirefoxMasterPassword] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [placeInFolder, setPlaceInFolder] = useState(true);
  const [containerFolderName, setContainerFolderName] = useState(
    defaultContainerName || `Browser imported - ${new Date().toLocaleDateString()}`
  );
  const [preview, setPreview] = useState(null);
  const [platformUnsupported, setPlatformUnsupported] = useState(false);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  const profileOptions = profiles.map((p) => ({
    label: `${p.browserLabel} — ${p.profileLabel}`,
    value: p.id
  }));

  const loadProfiles = useCallback(async () => {
    if (!window.electron?.browserImport?.listProfiles) {
      setPlatformUnsupported(true);
      return;
    }
    setLoadingProfiles(true);
    try {
      const res = await window.electron.browserImport.listProfiles();
      if (res?.platformUnsupported) {
        setPlatformUnsupported(true);
        setProfiles([]);
        return;
      }
      if (!res?.ok) {
        showToast?.({
          severity: 'error',
          summary: t('browserImport.error') || 'Error',
          detail: res?.error || 'No se pudieron detectar perfiles',
          life: 4000
        });
        return;
      }
      setProfiles(res.profiles || []);
      if (res.profiles?.length && !selectedProfileId) {
        setSelectedProfileId(res.profiles[0].id);
      }
    } catch (err) {
      showToast?.({
        severity: 'error',
        summary: t('browserImport.error') || 'Error',
        detail: err?.message || 'Error al listar perfiles',
        life: 4000
      });
    } finally {
      setLoadingProfiles(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runImport = async () => {
    if (!selectedProfile) {
      showToast?.({
        severity: 'warn',
        summary: t('browserImport.warning') || 'Aviso',
        detail: t('browserImport.selectProfile') || 'Seleccione un perfil de navegador',
        life: 3000
      });
      return;
    }

    setImporting(true);
    setProgress(15);
    setPreview(null);

    try {
      let res;
      if (selectedProfile.type === 'firefox') {
        res = await window.electron.browserImport.importFirefox({
          profilePath: selectedProfile.profilePath,
          masterPassword: firefoxMasterPassword
        });
      } else {
        res = await window.electron.browserImport.importChromium({
          browserId: selectedProfile.browserId,
          userDataPath: selectedProfile.userDataPath,
          profileDir: selectedProfile.profileDir
        });
      }

      setProgress(70);

      if (!res?.ok) {
        showToast?.({
          severity: 'error',
          summary: t('browserImport.error') || 'Error',
          detail: res?.error || 'Error al importar',
          life: 5000
        });
        if (res?.needsMasterPassword) {
          showToast?.({
            severity: 'warn',
            summary: t('browserImport.firefoxMasterRequired') || 'Contraseña maestra',
            detail: res.error,
            life: 5000
          });
        }
        return;
      }

      const entries = res.entries || [];
      const stats = res.stats || {};
      const sampleUrls = entries.slice(0, 5).map((e) => e.url).filter(Boolean);
      const sampleUsers = entries
        .filter((e) => e.username)
        .slice(0, 5)
        .map((e) => `${e.username} — ${e.url || e.title}`)
        .filter(Boolean);

      setPreview({
        entries,
        stats,
        sampleUrls,
        sampleUsers
      });
      setProgress(100);

      showToast?.({
        severity: 'info',
        summary: t('browserImport.previewReady') || 'Listo para importar',
        detail: t('browserImport.previewDetail', {
          imported: stats.imported ?? entries.length,
          skipped: stats.skipped ?? 0
        }) || `${stats.imported ?? entries.length} credenciales · ${stats.skipped ?? 0} omitidas`,
        life: 4000
      });
    } catch (err) {
      showToast?.({
        severity: 'error',
        summary: t('browserImport.error') || 'Error',
        detail: err?.message || 'Error inesperado',
        life: 4000
      });
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (!preview?.entries?.length) {
      showToast?.({
        severity: 'warn',
        summary: t('browserImport.warning') || 'Aviso',
        detail: t('browserImport.noEntries') || 'No hay entradas para importar',
        life: 3000
      });
      return;
    }

    const nodes = mapBrowserEntriesToNodes(preview.entries);
    const payload = {
      nodes,
      createContainerFolder: !!placeInFolder,
      containerFolderName:
        containerFolderName ||
        `${selectedProfile?.browserLabel || 'Browser'} - ${selectedProfile?.profileLabel || ''}`.trim()
    };

    if (onImportPasswordsComplete) {
      onImportPasswordsComplete(payload);
    } else {
      window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
    }

    showToast?.({
      severity: 'success',
      summary: t('browserImport.success') || 'Importación exitosa',
      detail: t('browserImport.importedCount', { count: nodes.length }) || `${nodes.length} contraseñas importadas`,
      life: 3000
    });

    setPreview(null);
    setProgress(0);
  };

  if (platformUnsupported) {
    return (
      <Message
        severity="warn"
        className="w-full"
        text={t('browserImport.windowsOnly') || 'La importación directa desde navegadores solo está disponible en Windows.'}
      />
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <Message
        severity="info"
        className="w-full mb-3"
        text={
          t('browserImport.hintCloseBrowser') ||
          'Cierra el navegador si la lectura falla. En Chrome 127+ algunas contraseñas (cifrado App-Bound) no se pueden importar directamente.'
        }
      />

      <div className="import-two-col-grid">
        <div>
          <div className="mb-3">
            <div className="flex align-items-center" style={{ gap: 8 }}>
              <input
                type="checkbox"
                id="browser-placeInFolder"
                checked={placeInFolder}
                onChange={(e) => setPlaceInFolder(e.target.checked)}
                disabled={importing}
              />
              <label htmlFor="browser-placeInFolder" style={{ fontWeight: 500 }}>
                {t('browserImport.createFolder') || 'Crear carpeta'}
              </label>
            </div>
            {placeInFolder && (
              <div style={{ marginLeft: 26, marginTop: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  {t('browserImport.folderName') || 'Nombre de la carpeta'}
                </label>
                <InputText
                  value={containerFolderName}
                  onChange={(e) => setContainerFolderName(e.target.value)}
                  placeholder="Browser imported - ..."
                  style={{ width: 320 }}
                  disabled={importing}
                />
              </div>
            )}
          </div>

          {preview && (
            <div
              style={{
                background: 'var(--surface-ground)',
                border: '1px solid var(--surface-border)',
                borderRadius: 8,
                padding: 12,
                marginTop: 8
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {t('browserImport.previewTitle') || 'Vista previa'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                {t('browserImport.previewStats', {
                  imported: preview.stats?.imported ?? preview.entries.length,
                  skipped: preview.stats?.skipped ?? 0
                }) ||
                  `Importables: ${preview.stats?.imported ?? preview.entries.length} · Omitidas: ${preview.stats?.skipped ?? 0}`}
                {(preview.stats?.skippedAbe ?? 0) > 0 && (
                  <span style={{ display: 'block', color: 'var(--orange-500)', marginTop: 4 }}>
                    {t('browserImport.skippedAbe', { count: preview.stats.skippedAbe }) ||
                      `${preview.stats.skippedAbe} omitidas por cifrado App-Bound (Chrome 127+)`}
                  </span>
                )}
              </div>
              {preview.sampleUsers?.length > 0 && (
                <ul style={{ fontSize: 12, margin: '8px 0 0 16px', color: 'var(--text-color-secondary)' }}>
                  {preview.sampleUsers.map((line, i) => (
                    <li key={`u-${i}`} style={{ wordBreak: 'break-all' }}>{line}</li>
                  ))}
                </ul>
              )}
              {!preview.sampleUsers?.length && preview.sampleUrls?.length > 0 && (
                <ul style={{ fontSize: 12, margin: '8px 0 0 16px', color: 'var(--text-color-secondary)' }}>
                  {preview.sampleUrls.map((url, i) => (
                    <li key={i} style={{ wordBreak: 'break-all' }}>{url}</li>
                  ))}
                </ul>
              )}
              {(preview.stats?.importedUsernameOnly ?? 0) > 0 && (
                <div style={{ fontSize: 12, marginTop: 8, color: 'var(--orange-500)' }}>
                  {t('browserImport.usernameOnlyHint', {
                    count: preview.stats.importedUsernameOnly
                  }) ||
                    `${preview.stats.importedUsernameOnly} entradas con usuario/URL; la contraseña puede requerir exportar CSV del navegador.`}
                </div>
              )}
              <Button
                label={t('browserImport.confirmImport') || 'Confirmar importación'}
                icon="pi pi-check"
                className="mt-3"
                onClick={confirmImport}
                disabled={importing}
              />
            </div>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t('browserImport.selectProfileLabel') || 'Perfil del navegador'}
            </label>
            <Dropdown
              value={selectedProfileId}
              options={profileOptions}
              onChange={(e) => {
                setSelectedProfileId(e.value);
                setPreview(null);
              }}
              placeholder={loadingProfiles ? '...' : t('browserImport.noProfiles') || 'Sin perfiles detectados'}
              style={{ width: '100%', maxWidth: 420 }}
              disabled={importing || loadingProfiles || !profileOptions.length}
            />
            <Button
              icon="pi pi-refresh"
              className="p-button-text p-button-sm ml-2"
              onClick={loadProfiles}
              disabled={importing || loadingProfiles}
              tooltip={t('browserImport.refresh') || 'Actualizar lista'}
            />
          </div>

          {selectedProfile?.type === 'firefox' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t('browserImport.firefoxMaster') || 'Contraseña maestra de Firefox (opcional)'}
              </label>
              <Password
                value={firefoxMasterPassword}
                onChange={(e) => setFirefoxMasterPassword(e.target.value)}
                placeholder={t('browserImport.firefoxMasterPlaceholder') || 'Solo si configuraste una en Firefox'}
                feedback={false}
                toggleMask
                inputStyle={{ width: '100%', maxWidth: 420 }}
                disabled={importing}
              />
            </div>
          )}

          {importing && (
            <div style={{ marginTop: 12, background: 'var(--surface-ground)', borderRadius: 6, padding: 10 }}>
              <div className="flex align-items-center justify-content-between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{t('browserImport.scanning') || 'Escaneando...'}</span>
                <span style={{ color: 'var(--text-color-secondary)' }}>{progress}%</span>
              </div>
              <ProgressBar value={progress} style={{ height: 6 }} />
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button
              label={importing ? (t('browserImport.scanning') || 'Escaneando…') : (t('browserImport.scan') || 'Escanear credenciales')}
              icon={importing ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
              onClick={runImport}
              disabled={!selectedProfile || importing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserImportPanel;
