import React, { useEffect, useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Tooltip } from 'primereact/tooltip';
import { useTranslation } from '../i18n/hooks/useTranslation';

export const TERMINAL_PRO_DIALOG_STYLE = {
  width: '680px',
  maxWidth: '95vw',
  minWidth: '460px',
  height: 'auto',
  maxHeight: '90vh',
  minHeight: '480px'
};

export const TERMINAL_PRO_DIALOG_CONTENT_STYLE = {
  padding: '0',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  flex: '1',
  minHeight: '0',
  background: 'var(--ui-dialog-bg)'
};

export const TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE = {
  marginTop: '10px',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

export function createDefaultRdpFormData() {
  return {
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'guacamole',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false,
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    autoResize: true,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: true,
    guacEnableDrive: false,
    guacDriveHostDir: '',
    guacEnableGfx: false,
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  };
}

export function mapEditNodeDataToRdpFormData(editNodeData) {
  if (!editNodeData) {
    return createDefaultRdpFormData();
  }
  const data = editNodeData.data || {};
  return {
    name: editNodeData.label || '',
    server: data.server || data.hostname || '',
    username: data.username || '',
    password: data.password || '',
    port: data.port || 3389,
    clientType: data.clientType || 'guacamole',
    preset: data.preset || 'default',
    resolution: data.resolution || '1600x1000',
    colorDepth: data.colorDepth || 32,
    redirectFolders: data.redirectFolders !== undefined ? data.redirectFolders : true,
    redirectClipboard: data.redirectClipboard !== undefined ? data.redirectClipboard : true,
    redirectPrinters: data.redirectPrinters || false,
    redirectAudio: data.redirectAudio !== undefined ? data.redirectAudio : true,
    fullscreen: data.fullscreen || false,
    smartSizing: data.smartSizing !== undefined ? data.smartSizing : true,
    span: data.span || false,
    admin: data.admin || false,
    public: data.public || false,
    autoResize: data.autoResize !== false,
    guacDpi: data.guacDpi || 96,
    guacSecurity: data.guacSecurity || 'any',
    guacEnableWallpaper: data.guacEnableWallpaper || false,
    guacEnableDrive: data.guacEnableDrive || false,
    guacDriveHostDir: data.guacDriveHostDir || '',
    guacEnableGfx: data.guacEnableGfx || false,
    guacEnableDesktopComposition: data.guacEnableDesktopComposition || false,
    guacEnableFontSmoothing: data.guacEnableFontSmoothing || false,
    guacEnableTheming: data.guacEnableTheming || false,
    guacEnableFullWindowDrag: data.guacEnableFullWindowDrag || false,
    guacEnableMenuAnimations: data.guacEnableMenuAnimations || false,
    guacDisableGlyphCaching: data.guacDisableGlyphCaching || false,
    guacDisableOffscreenCaching: data.guacDisableOffscreenCaching || false,
    guacDisableBitmapCaching: data.guacDisableBitmapCaching || false,
    guacDisableCopyRect: data.guacDisableCopyRect || false
  };
}

export function isRdpFormValid(formData) {
  if (!formData) return false;
  return (
    String(formData.name || '').trim() !== '' &&
    String(formData.server || '').trim() !== '' &&
    String(formData.username || '').trim() !== ''
  );
}

export function RdpTerminalDialogHeader({ title }) {
  const display = title != null && typeof title === 'string' ? title.toUpperCase() : title;
  return (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini">
          <i className="pi pi-desktop" aria-hidden="true"></i>
        </div>
        <span className="terminal-header-title">{display}</span>
      </div>
      <div className="terminal-header-accent" aria-hidden="true"></div>
    </div>
  );
}

function TerminalOptionSection({ title, children }) {
  return (
    <div className="terminal-options-section">
      <div className="terminal-options-section-title">{title}</div>
      <div className="terminal-options-grid">
        {children}
      </div>
    </div>
  );
}

function TerminalSwitchOption({ iconClass, labelText, checked, onCheckedChange, disabled, inputId }) {
  return (
    <div className="terminal-option-item">
      <div className="flex align-items-center">
        {iconClass ? <i className={`pi ${iconClass} terminal-option-icon`} aria-hidden="true"></i> : null}
        <span className="terminal-option-text">{labelText}</span>
      </div>
      <div className="terminal-dotted-spacer"></div>
      <InputSwitch
        inputId={inputId}
        checked={!!checked}
        onChange={(e) => onCheckedChange(!!e.value)}
        className="terminal-switch"
        disabled={!!disabled}
      />
    </div>
  );
}

function TerminalDropdownField({ id, labelNode, value, options, onChange, placeholder, className, rowClassName = 'terminal-row mb-3' }) {
  return (
    <div className={rowClassName}>
      <label className="terminal-label" htmlFor={id}>
        {labelNode}
      </label>
      <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
        <Dropdown
          inputId={id}
          value={value}
          options={options}
          onChange={(e) => onChange(e.value)}
          placeholder={placeholder}
          className={className || 'terminal-folder-dropdown'}
          panelClassName="terminal-folder-dropdown-panel"
        />
      </div>
    </div>
  );
}

export function EnhancedRDPForm({
  formData,
  handleTextChange,
  handleInputChange,
  showPassword,
  setShowPassword,
  onSelectFolder,
  isEditMode,
  onHide,
  onGoBack,
  onSubmit,
  loading,
  idPrefix = 'rdp'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState('screen');

  const presetOptions = useMemo(
    () => [
      { label: t('rdp.presets.default'), value: 'default' },
      { label: t('rdp.presets.performance'), value: 'performance' },
      { label: t('rdp.presets.quality'), value: 'quality' }
    ],
    [t]
  );

  const resolutionOptions = useMemo(
    () => [
      { label: t('rdp.resolutions.fullscreen'), value: 'fullscreen' },
      { label: '1920x1080', value: '1920x1080' },
      { label: '1600x1000', value: '1600x1000' },
      { label: '1366x768', value: '1366x768' },
      { label: '1024x768', value: '1024x768' }
    ],
    [t]
  );

  const colorDepthOptions = useMemo(
    () => [
      { label: t('rdp.colorDepths.32'), value: 32 },
      { label: t('rdp.colorDepths.24'), value: 24 },
      { label: t('rdp.colorDepths.16'), value: 16 },
      { label: t('rdp.colorDepths.15'), value: 15 }
    ],
    [t]
  );

  const guacSecurityOptions = useMemo(
    () => [
      { label: t('rdp.securityOptions.any'), value: 'any' },
      { label: t('rdp.securityOptions.rdp'), value: 'rdp' },
      { label: t('rdp.securityOptions.tls'), value: 'tls' },
      { label: t('rdp.securityOptions.nla'), value: 'nla' }
    ],
    [t]
  );

  const advancedOptionTabs = useMemo(() => {
    const tabs = [
      {
        id: 'screen',
        label: t('rdp.sections.screen'),
        icon: 'pi-desktop'
      },
      {
        id: 'options',
        label: t('rdp.sections.options'),
        icon: 'pi-cog'
      }
    ];
    if (formData.clientType === 'guacamole') {
      tabs.push({
        id: 'guacamole',
        label: t('rdp.sections.advanced'),
        icon: 'pi-sliders-h'
      });
    }
    if (formData.clientType === 'guacamole' && formData.guacEnableDrive) {
      tabs.push({
        id: 'sharedFolder',
        label: t('rdp.fields.sharedFolder'),
        icon: 'pi-folder'
      });
    }
    return tabs;
  }, [formData.clientType, formData.guacEnableDrive, t]);

  useEffect(() => {
    const validIds = advancedOptionTabs.map((tab) => tab.id);
    if (!validIds.includes(advancedOptionsTab)) {
      setAdvancedOptionsTab(validIds[0] || 'screen');
    }
  }, [advancedOptionTabs, advancedOptionsTab]);

  const valid = isRdpFormValid(formData);
  const busy = !!loading;

  const handleFormSubmit = (event) => {
    if (event) event.preventDefault();
    if (!valid || busy) return;
    if (typeof onSubmit === 'function') {
      onSubmit(event);
    }
  };

  const p = idPrefix;

  return (
    <form
      className="connection-terminal-form"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '0.75rem 1rem'
      }}
      onSubmit={handleFormSubmit}
      noValidate
    >
      <Tooltip target=".rdp-form-tip" />

      <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        <div className="terminal-host-port-row mb-3">
          <div className="terminal-host-port-host">
            <label className="terminal-label" htmlFor={`${p}-server`}>
              {t('rdp.fields.server').toUpperCase()}
            </label>
            <div className="terminal-input-wrap">
              <i className="pi pi-server terminal-icon-left" aria-hidden="true"></i>
              <InputText
                id={`${p}-server`}
                value={formData.server}
                onChange={handleTextChange('server')}
                placeholder={t('rdp.placeholders.server')}
                className="terminal-input"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="terminal-host-port-port">
            <label className="terminal-label" htmlFor={`${p}-port`}>
              {t('rdp.fields.port').toUpperCase()}
            </label>
            <div className="terminal-input-wrap terminal-port-input-wrap">
              <InputText
                id={`${p}-port`}
                type="number"
                value={formData.port}
                onChange={handleTextChange('port')}
                placeholder={t('rdp.placeholders.port')}
                className="terminal-input terminal-port-input text-center"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label" htmlFor={`${p}-name`}>
            {t('rdp.fields.name').toUpperCase()}
          </label>
          <div className="terminal-input-wrap">
            <InputText
              id={`${p}-name`}
              value={formData.name}
              onChange={handleTextChange('name')}
              placeholder={t('rdp.placeholders.name')}
              className="terminal-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label" htmlFor={`${p}-username`}>
            {t('rdp.fields.username').toUpperCase()}
          </label>
          <div className="terminal-input-wrap">
            <i className="pi pi-user terminal-icon-left" aria-hidden="true"></i>
            <InputText
              id={`${p}-username`}
              value={formData.username}
              onChange={handleTextChange('username')}
              placeholder={t('rdp.placeholders.username')}
              className="terminal-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label" htmlFor={`${p}-password`}>
            {t('rdp.fields.password').toUpperCase()}
          </label>
          <div className="terminal-input-wrap">
            <i className="pi pi-lock terminal-icon-left" aria-hidden="true"></i>
            <InputText
              id={`${p}-password`}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleTextChange('password')}
              placeholder={t('rdp.placeholders.password')}
              className="terminal-input"
              autoComplete="off"
            />
            <i
              className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
              onClick={() => setShowPassword(!showPassword)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={showPassword ? t('rdp.tooltips.hidePassword') : t('rdp.tooltips.showPassword')}
            ></i>
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label">{t('rdp.fields.client').toUpperCase()}</label>
          <div className="terminal-auth-selector">
            <div
              className={`terminal-auth-chip ${formData.clientType === 'mstsc' ? 'active' : ''}`}
              onClick={() => handleInputChange('clientType', 'mstsc')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInputChange('clientType', 'mstsc');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i className="pi pi-desktop" aria-hidden="true"></i> {t('rdp.clientTypes.mstsc')}
            </div>
            <div
              className={`terminal-auth-chip ${formData.clientType === 'guacamole' ? 'active' : ''}`}
              onClick={() => handleInputChange('clientType', 'guacamole')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInputChange('clientType', 'guacamole');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i className="pi pi-globe" aria-hidden="true"></i> {t('rdp.clientTypes.guacamole')}
            </div>
          </div>
        </div>

        {formData.clientType === 'guacamole' ? (
          <>
            <TerminalDropdownField
              id={`${p}-guacSecurity`}
              labelNode={t('rdp.fields.security').toUpperCase()}
              value={formData.guacSecurity}
              options={guacSecurityOptions}
              onChange={(v) => handleInputChange('guacSecurity', v)}
              placeholder={tCommon('labels.select')}
            />
            <p
              className="rdp-form-tip mt-0 mb-3 opacity-60"
              style={{ fontSize: '0.7rem' }}
              data-pr-tooltip={t('rdp.descriptions.security')}
            >
              {t('rdp.descriptions.security')}
            </p>
          </>
        ) : null}

        <div className="terminal-advanced-section mb-3">
          <button
            type="button"
            className="terminal-advanced-header"
            onClick={() => setShowAdvancedOptions((open) => !open)}
            aria-expanded={showAdvancedOptions}
          >
            <span className="terminal-label mb-0">{t('rdp.sections.advanced').toUpperCase()}</span>
            <i className={`pi ${showAdvancedOptions ? 'pi-chevron-up' : 'pi-chevron-down'} opacity-50`} aria-hidden="true"></i>
          </button>

          {showAdvancedOptions ? (
            <div className="terminal-options-list">
              <div className="terminal-advanced-tabs" role="tablist" aria-label={t('rdp.sections.advanced')}>
                {advancedOptionTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`${p}-advanced-tab-${tab.id}`}
                    aria-selected={advancedOptionsTab === tab.id}
                    aria-controls={`${p}-advanced-panel-${tab.id}`}
                    className={`terminal-advanced-tab${advancedOptionsTab === tab.id ? ' active' : ''}`}
                    onClick={() => setAdvancedOptionsTab(tab.id)}
                  >
                    <i className={`pi ${tab.icon}`} aria-hidden="true"></i>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {advancedOptionsTab === 'screen' ? (
                <div
                  id={`${p}-advanced-panel-screen`}
                  role="tabpanel"
                  aria-labelledby={`${p}-advanced-tab-screen`}
                  className="terminal-advanced-panel-pane"
                >
                  <div className="terminal-screen-grid">
                    <TerminalDropdownField
                      id={`${p}-preset`}
                      rowClassName="terminal-row"
                      labelNode={t('rdp.fields.preset').toUpperCase()}
                      value={formData.preset}
                      options={presetOptions}
                      onChange={(v) => handleInputChange('preset', v)}
                      placeholder={tCommon('labels.select')}
                    />
                    <TerminalDropdownField
                      id={`${p}-resolution`}
                      rowClassName="terminal-row"
                      labelNode={t('rdp.fields.resolution').toUpperCase()}
                      value={formData.resolution}
                      options={resolutionOptions}
                      onChange={(v) => handleInputChange('resolution', v)}
                      placeholder={tCommon('labels.select')}
                    />
                    <TerminalDropdownField
                      id={`${p}-colorDepth`}
                      rowClassName="terminal-row"
                      labelNode={t('rdp.fields.color').toUpperCase()}
                      value={formData.colorDepth}
                      options={colorDepthOptions}
                      onChange={(v) => handleInputChange('colorDepth', v)}
                      placeholder={tCommon('labels.select')}
                    />
                    <div className="terminal-row">
                      <label className="terminal-label" htmlFor={`${p}-guacDpi`}>
                        {t('rdp.fields.dpi').toUpperCase()}
                      </label>
                      <div className="terminal-input-wrap terminal-port-input-wrap">
                        <InputText
                          id={`${p}-guacDpi`}
                          value={formData.guacDpi}
                          onChange={handleTextChange('guacDpi')}
                          placeholder={t('rdp.placeholders.dpi')}
                          className="terminal-input terminal-port-input text-center"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {advancedOptionsTab === 'options' ? (
                <div
                  id={`${p}-advanced-panel-options`}
                  role="tabpanel"
                  aria-labelledby={`${p}-advanced-tab-options`}
                  className="terminal-advanced-panel-pane"
                >
                  <div className="terminal-options-grid">
                    {formData.clientType === 'mstsc' ? (
                      <>
                        <TerminalSwitchOption
                          iconClass="pi-copy"
                          labelText={t('rdp.options.clipboard')}
                          checked={formData.redirectClipboard}
                          onCheckedChange={(v) => handleInputChange('redirectClipboard', v)}
                          inputId={`${p}-mstsc-clipboard`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-volume-up"
                          labelText={t('rdp.options.audio')}
                          checked={formData.redirectAudio}
                          onCheckedChange={(v) => handleInputChange('redirectAudio', v)}
                          inputId={`${p}-mstsc-audio`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-print"
                          labelText={t('rdp.options.printers')}
                          checked={formData.redirectPrinters}
                          onCheckedChange={(v) => handleInputChange('redirectPrinters', v)}
                          inputId={`${p}-mstsc-printers`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-folder"
                          labelText={t('rdp.options.folders')}
                          checked={formData.redirectFolders}
                          onCheckedChange={(v) => handleInputChange('redirectFolders', v)}
                          inputId={`${p}-mstsc-folders`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-arrows-alt"
                          labelText={t('rdp.options.smartSizing')}
                          checked={formData.smartSizing}
                          onCheckedChange={(v) => handleInputChange('smartSizing', v)}
                          inputId={`${p}-mstsc-smart`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-window-maximize"
                          labelText={t('rdp.options.fullscreen')}
                          checked={formData.fullscreen}
                          onCheckedChange={(v) => handleInputChange('fullscreen', v)}
                          inputId={`${p}-mstsc-fullscreen`}
                        />
                      </>
                    ) : (
                      <>
                        <TerminalSwitchOption
                          iconClass="pi-copy"
                          labelText={t('rdp.options.clipboard')}
                          checked={formData.redirectClipboard}
                          onCheckedChange={(v) => handleInputChange('redirectClipboard', v)}
                          inputId={`${p}-guac-clipboard`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-volume-up"
                          labelText={t('rdp.options.audio')}
                          checked={formData.redirectAudio}
                          onCheckedChange={(v) => handleInputChange('redirectAudio', v)}
                          inputId={`${p}-guac-audio`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-database"
                          labelText={t('rdp.options.enableDrive')}
                          checked={formData.guacEnableDrive}
                          onCheckedChange={(v) => handleInputChange('guacEnableDrive', v)}
                          inputId={`${p}-guac-drive`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-arrows-alt"
                          labelText={t('rdp.options.autoResize')}
                          checked={formData.autoResize}
                          onCheckedChange={(v) => handleInputChange('autoResize', v)}
                          inputId={`${p}-guac-resize`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-image"
                          labelText={t('rdp.options.enableWallpaper')}
                          checked={formData.guacEnableWallpaper}
                          onCheckedChange={(v) => handleInputChange('guacEnableWallpaper', v)}
                          inputId={`${p}-guac-wallpaper`}
                        />
                        <TerminalSwitchOption
                          iconClass="pi-print"
                          labelText={t('rdp.options.printers')}
                          checked={formData.redirectPrinters}
                          onCheckedChange={(v) => handleInputChange('redirectPrinters', v)}
                          inputId={`${p}-guac-printers`}
                        />
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {advancedOptionsTab === 'guacamole' && formData.clientType === 'guacamole' ? (
                <div
                  id={`${p}-advanced-panel-guacamole`}
                  role="tabpanel"
                  aria-labelledby={`${p}-advanced-tab-guacamole`}
                  className="terminal-advanced-panel-pane"
                >
                  <TerminalOptionSection title={t('rdp.advanced.performance')}>
                    <TerminalSwitchOption
                      iconClass="pi-palette"
                      labelText={t('rdp.advanced.enableGfx')}
                      checked={formData.guacEnableGfx}
                      onCheckedChange={(v) => handleInputChange('guacEnableGfx', v)}
                      inputId={`${p}-guac-gfx`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-image"
                      labelText={t('rdp.advanced.desktopComposition')}
                      checked={formData.guacEnableDesktopComposition}
                      onCheckedChange={(v) => handleInputChange('guacEnableDesktopComposition', v)}
                      inputId={`${p}-guac-composition`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-star"
                      labelText={t('rdp.advanced.fontSmoothing')}
                      checked={formData.guacEnableFontSmoothing}
                      onCheckedChange={(v) => handleInputChange('guacEnableFontSmoothing', v)}
                      inputId={`${p}-guac-font`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-tags"
                      labelText={t('rdp.advanced.theming')}
                      checked={formData.guacEnableTheming}
                      onCheckedChange={(v) => handleInputChange('guacEnableTheming', v)}
                      inputId={`${p}-guac-theme`}
                    />
                  </TerminalOptionSection>
                  <TerminalOptionSection title={t('rdp.advanced.interface')}>
                    <TerminalSwitchOption
                      iconClass="pi-arrows-h"
                      labelText={t('rdp.advanced.fullWindowDrag')}
                      checked={formData.guacEnableFullWindowDrag}
                      onCheckedChange={(v) => handleInputChange('guacEnableFullWindowDrag', v)}
                      inputId={`${p}-guac-drag`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-bars"
                      labelText={t('rdp.advanced.menuAnimations')}
                      checked={formData.guacEnableMenuAnimations}
                      onCheckedChange={(v) => handleInputChange('guacEnableMenuAnimations', v)}
                      inputId={`${p}-guac-menu`}
                    />
                  </TerminalOptionSection>
                  <TerminalOptionSection title={t('rdp.advanced.cache')}>
                    <TerminalSwitchOption
                      iconClass="pi-font"
                      labelText={t('rdp.advanced.glyphCaching')}
                      checked={!formData.guacDisableGlyphCaching}
                      onCheckedChange={(v) => handleInputChange('guacDisableGlyphCaching', !v)}
                      inputId={`${p}-guac-glyph-cache`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-mobile"
                      labelText={t('rdp.advanced.offscreenCaching')}
                      checked={!formData.guacDisableOffscreenCaching}
                      onCheckedChange={(v) => handleInputChange('guacDisableOffscreenCaching', !v)}
                      inputId={`${p}-guac-offscreen-cache`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-images"
                      labelText={t('rdp.advanced.bitmapCaching')}
                      checked={!formData.guacDisableBitmapCaching}
                      onCheckedChange={(v) => handleInputChange('guacDisableBitmapCaching', !v)}
                      inputId={`${p}-guac-bitmap-cache`}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-clone"
                      labelText={t('rdp.advanced.copyRect')}
                      checked={!formData.guacDisableCopyRect}
                      onCheckedChange={(v) => handleInputChange('guacDisableCopyRect', !v)}
                      inputId={`${p}-guac-copy-rect`}
                    />
                  </TerminalOptionSection>
                </div>
              ) : null}

              {advancedOptionsTab === 'sharedFolder' && formData.clientType === 'guacamole' && formData.guacEnableDrive ? (
                <div
                  id={`${p}-advanced-panel-sharedFolder`}
                  role="tabpanel"
                  aria-labelledby={`${p}-advanced-tab-sharedFolder`}
                  className="terminal-advanced-panel-pane"
                >
                  <div className="terminal-row mb-0">
                    <label className="terminal-label" htmlFor={`${p}-guacDriveHostDir`}>
                      {t('rdp.fields.localPath').toUpperCase()}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                      <div className="terminal-input-wrap" style={{ flex: 1 }}>
                        <i className="pi pi-folder terminal-icon-left" aria-hidden="true"></i>
                        <InputText
                          id={`${p}-guacDriveHostDir`}
                          value={formData.guacDriveHostDir}
                          onChange={handleTextChange('guacDriveHostDir')}
                          placeholder={t('rdp.placeholders.localPath')}
                          className="terminal-input"
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="button"
                        className="terminal-key-file-btn"
                        onClick={() => onSelectFolder && onSelectFolder()}
                        disabled={!onSelectFolder || busy}
                      >
                        <i className="pi pi-folder-open" aria-hidden="true"></i> {tCommon('buttons.browse')}
                      </button>
                    </div>
                    <p className="mt-2 mb-0 opacity-60" style={{ fontSize: '0.7rem' }}>
                      {t('rdp.descriptions.sharedFolder')}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="terminal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="flex gap-2 align-items-center" style={{ flexWrap: 'wrap' }}>
          {typeof onGoBack === 'function' ? (
            <button type="button" className="terminal-btn-text" onClick={onGoBack} disabled={busy}>
              {tCommon('buttons.back').toUpperCase()}
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 align-items-center" style={{ flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button type="button" className="terminal-btn-text" onClick={onHide} disabled={busy}>
            {tCommon('buttons.cancel').toUpperCase()}
          </button>
          <button
            type="submit"
            className="terminal-btn-outline terminal-btn-submit"
            disabled={!valid || busy}
          >
            <i
              className={busy ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-check mr-2'}
              aria-hidden="true"
            ></i>
            {busy
              ? tCommon('labels.loading')
              : isEditMode
                ? tCommon('buttons.save').toUpperCase()
                : tCommon('buttons.connect').toUpperCase()}
          </button>
        </div>
      </div>
    </form>
  );
}
