import React, { useMemo, useState } from 'react';
import { Slider } from 'primereact/slider';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { useHomeWallpaper } from '../../utils/homeWallpaper';

function skipMessage(t, reason) {
  if (reason === 'tooLarge') return t('appearance.homePage.wallpaper.tooLarge');
  if (reason === 'invalidType') return t('appearance.homePage.wallpaper.invalidType');
  if (reason === 'unreadable') return t('appearance.homePage.wallpaper.unreadable');
  return t('appearance.homePage.wallpaper.unavailable');
}

export default function HomeWallpaperPicker({
  compact = false,
  hideHeading = false,
  hideDim = false,
  themeColors = {}
}) {
  const { t } = useTranslation('settings');
  const {
    state,
    thumbUrls,
    busy,
    importWallpapers,
    deleteWallpaper,
    setActiveWallpaper,
    setWallpaperDim,
    clearActiveWallpaper
  } = useHomeWallpaper();
  const [notice, setNotice] = useState('');

  const text = themeColors.textPrimary || 'var(--ui-dialog-text)';
  const muted = themeColors.textSecondary || 'var(--text-color-secondary)';
  const accent = themeColors.primaryColor || 'var(--ui-button-primary)';

  const handleImport = async () => {
    setNotice('');
    const result = await importWallpapers();
    if (!result?.ok && result?.error === 'unavailable') {
      setNotice(t('appearance.homePage.wallpaper.unavailable'));
      return;
    }
    const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
    if (skipped.length > 0) {
      setNotice(skipMessage(t, skipped[0].reason));
    }
  };

  const thumbs = useMemo(() => state.items, [state.items]);

  return (
    <div className={compact ? 'home-wallpaper-picker is-compact' : 'home-wallpaper-picker'}>
      <div className="home-wallpaper-picker-head">
        {!hideHeading ? (
          <div>
            <div className="home-wallpaper-picker-title" style={{ color: text }}>
              {t('appearance.homePage.wallpaper.title')}
            </div>
            {!compact ? (
              <div className="home-wallpaper-picker-desc" style={{ color: muted }}>
                {t('appearance.homePage.wallpaper.description')}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="home-wallpaper-picker-desc" style={{ color: muted }}>
            {t('appearance.homePage.wallpaper.description')}
          </div>
        )}
        <div className="home-wallpaper-picker-actions">
          <button
            type="button"
            className="home-wallpaper-btn"
            onClick={handleImport}
            disabled={busy}
            style={{ borderColor: `${accent}66`, color: text }}
          >
            <i className="pi pi-upload" />
            {t('appearance.homePage.wallpaper.upload')}
          </button>
          {state.activeId ? (
            <button
              type="button"
              className="home-wallpaper-btn is-ghost"
              onClick={clearActiveWallpaper}
              disabled={busy}
              style={{ color: muted }}
            >
              {t('appearance.homePage.wallpaper.restore')}
            </button>
          ) : null}
        </div>
      </div>

      {thumbs.length === 0 ? (
        <div className="home-wallpaper-empty" style={{ color: muted }}>
          {t('appearance.homePage.wallpaper.empty')}
        </div>
      ) : (
        <div className="home-wallpaper-grid">
          {thumbs.map((item) => {
            const active = item.id === state.activeId;
            return (
              <div
                key={item.id}
                className={`home-wallpaper-thumb${active ? ' is-active' : ''}`}
                style={{ borderColor: active ? accent : 'rgba(255,255,255,0.12)' }}
              >
                <button
                  type="button"
                  className="home-wallpaper-thumb-btn"
                  title={t('appearance.homePage.wallpaper.apply')}
                  onClick={() => setActiveWallpaper(item.id)}
                  disabled={busy}
                  style={{
                    backgroundImage: thumbUrls[item.id] ? `url(${thumbUrls[item.id]})` : 'none',
                    backgroundColor: 'rgba(0,0,0,0.25)'
                  }}
                />
                <button
                  type="button"
                  className="home-wallpaper-thumb-remove"
                  title={t('appearance.homePage.wallpaper.remove')}
                  onClick={() => deleteWallpaper(item.id)}
                  disabled={busy}
                >
                  <i className="pi pi-times" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!hideDim ? (
        <div className="home-wallpaper-dim">
          <div className="home-wallpaper-dim-row">
            <span style={{ color: text }}>{t('appearance.homePage.wallpaper.dim')}</span>
            <span className="home-wallpaper-dim-value" style={{ color: accent, background: `${accent}22` }}>
              {state.dim}%
            </span>
          </div>
          <Slider
            value={state.dim}
            onChange={(e) => setWallpaperDim(e.value)}
            min={0}
            max={80}
            step={1}
            style={{ width: '100%', height: '4px' }}
          />
        </div>
      ) : null}

      {notice ? (
        <div className="home-wallpaper-notice" style={{ color: muted }}>{notice}</div>
      ) : null}
    </div>
  );
}
