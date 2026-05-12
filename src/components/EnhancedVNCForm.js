import React, { useEffect, useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { TerminalOptionHelp } from './TerminalOptionHelp';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { RDP_RESOLUTION_VALUES } from '../utils/rdpScreenConfig';

const VNC_COLOR_DEPTHS = [32, 24, 16, 8];

export function createDefaultVncFormData() {
  return {
    name: '',
    server: '',
    password: '',
    port: 5900,
    resolution: '1600x1000',
    colorDepth: 32,
    readOnly: false,
    enableCompression: true,
    imageQuality: 'lossless',
    autoReconnect: true,
    autoResize: true,
    redirectClipboard: true,
    guacDpi: 96
  };
}

export function mapEditNodeDataToVncFormData(editNodeData) {
  if (!editNodeData) {
    return createDefaultVncFormData();
  }
  const data = editNodeData.data || {};
  return {
    name: editNodeData.label || '',
    server: data.server || data.hostname || data.host || '',
    password: data.password || '',
    port: data.port || 5900,
    resolution: data.resolution || '1600x1000',
    colorDepth: data.colorDepth || 32,
    readOnly: data.readOnly === true,
    enableCompression: data.enableCompression !== false,
    imageQuality: data.imageQuality || 'lossless',
    autoReconnect: data.autoReconnect !== false,
    autoResize: data.autoResize !== false,
    redirectClipboard: data.redirectClipboard !== false,
    guacDpi: data.guacDpi || 96
  };
}

export function isVncFormValid(formData) {
  if (!formData) return false;
  return (
    String(formData.name || '').trim() !== '' &&
    String(formData.server || '').trim() !== ''
  );
}

export function VncTerminalDialogHeader({ title }) {
  const display = title != null && typeof title === 'string' ? title.toUpperCase() : title;
  return (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini">
          <i className="pi pi-globe" aria-hidden="true"></i>
        </div>
        <span className="terminal-header-title">{display}</span>
      </div>
      <div className="terminal-header-accent" aria-hidden="true"></div>
    </div>
  );
}

function TerminalSwitchOption({ iconClass, labelText, checked, onCheckedChange, disabled, inputId, helpText }) {
  return (
    <div className="terminal-option-item">
      <div className="flex align-items-center">
        {iconClass ? <i className={`pi ${iconClass} terminal-option-icon`} aria-hidden="true"></i> : null}
        <span className="terminal-option-text">{labelText}</span>
        <TerminalOptionHelp text={helpText} />
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

function TerminalDropdownField({ id, labelNode, value, options, onChange, placeholder, className, rowClassName = 'terminal-row mb-3', helpText }) {
  return (
    <div className={rowClassName}>
      <label className="terminal-label terminal-label-with-help" htmlFor={id}>
        <span>{labelNode}</span>
        <TerminalOptionHelp text={helpText} />
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

export function EnhancedVNCForm({
  formData,
  handleTextChange,
  handleInputChange,
  showPassword,
  setShowPassword,
  isEditMode,
  onHide,
  onGoBack,
  onSubmit,
  loading,
  idPrefix = 'vnc'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState('screen');

  const resolutionOptions = useMemo(
    () => RDP_RESOLUTION_VALUES.map((value) => ({
      label: value === 'fullscreen' ? t('rdp.resolutions.fullscreen') : value,
      value
    })),
    [t]
  );

  const colorDepthOptions = useMemo(
    () => VNC_COLOR_DEPTHS.map((value) => ({
      label: t(`vnc.colorDepths.${value}`),
      value
    })),
    [t]
  );

  const imageQualityOptions = useMemo(
    () => [
      { label: t('vnc.imageQualities.lossless'), value: 'lossless' },
      { label: t('vnc.imageQualities.lossyLow'), value: 'lossy-low' },
      { label: t('vnc.imageQualities.lossyMedium'), value: 'lossy-medium' },
      { label: t('vnc.imageQualities.lossyHigh'), value: 'lossy-high' }
    ],
    [t]
  );

  const advancedOptionTabs = useMemo(
    () => [
      {
        id: 'screen',
        label: t('vnc.advancedTabs.screen'),
        icon: 'pi-desktop'
      },
      {
        id: 'options',
        label: t('vnc.advancedTabs.options'),
        icon: 'pi-cog'
      }
    ],
    [t]
  );

  useEffect(() => {
    const validIds = advancedOptionTabs.map((tab) => tab.id);
    if (!validIds.includes(advancedOptionsTab)) {
      setAdvancedOptionsTab(validIds[0] || 'screen');
    }
  }, [advancedOptionTabs, advancedOptionsTab]);

  const valid = isVncFormValid(formData);
  const busy = !!loading;
  const p = idPrefix;

  const handleFormSubmit = (event) => {
    if (event) event.preventDefault();
    if (!valid || busy) return;
    if (typeof onSubmit === 'function') {
      onSubmit(event);
    }
  };

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
      <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        <div className="terminal-host-port-row mb-3">
          <div className="terminal-host-port-host">
            <label className="terminal-label" htmlFor={`${p}-server`}>
              {t('vnc.fields.server').toUpperCase()}
            </label>
            <div className="terminal-input-wrap">
              <i className="pi pi-server terminal-icon-left" aria-hidden="true"></i>
              <InputText
                id={`${p}-server`}
                value={formData.server}
                onChange={handleTextChange('server')}
                placeholder={t('vnc.placeholders.server')}
                className="terminal-input"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="terminal-host-port-port">
            <label className="terminal-label" htmlFor={`${p}-port`}>
              {t('vnc.fields.port').toUpperCase()}
            </label>
            <div className="terminal-input-wrap terminal-port-input-wrap">
              <InputText
                id={`${p}-port`}
                type="number"
                value={formData.port}
                onChange={handleTextChange('port')}
                placeholder={t('vnc.placeholders.port')}
                className="terminal-input terminal-port-input text-center"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label" htmlFor={`${p}-name`}>
            {t('vnc.fields.name').toUpperCase()}
          </label>
          <div className="terminal-input-wrap">
            <InputText
              id={`${p}-name`}
              value={formData.name}
              onChange={handleTextChange('name')}
              placeholder={t('vnc.placeholders.name')}
              className="terminal-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="terminal-row mb-3">
          <label className="terminal-label" htmlFor={`${p}-password`}>
            {t('vnc.fields.password').toUpperCase()}
          </label>
          <div className="terminal-input-wrap">
            <i className="pi pi-lock terminal-icon-left" aria-hidden="true"></i>
            <InputText
              id={`${p}-password`}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleTextChange('password')}
              placeholder={t('vnc.placeholders.password')}
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
              aria-label={showPassword ? t('vnc.tooltips.hidePassword') : t('vnc.tooltips.showPassword')}
            ></i>
          </div>
          <p className="mt-2 mb-0 opacity-60" style={{ fontSize: '0.7rem' }}>
            {t('vnc.descriptions.password')}
          </p>
        </div>

        <div className="terminal-advanced-section mb-3">
          <button
            type="button"
            className="terminal-advanced-header"
            onClick={() => setShowAdvancedOptions((open) => !open)}
            aria-expanded={showAdvancedOptions}
          >
            <span className="terminal-label mb-0">{t('vnc.sections.advanced').toUpperCase()}</span>
            <i className={`pi ${showAdvancedOptions ? 'pi-chevron-up' : 'pi-chevron-down'} opacity-50`} aria-hidden="true"></i>
          </button>

          {showAdvancedOptions ? (
            <div className="terminal-options-list">
              <div className="terminal-advanced-tabs" role="tablist" aria-label={t('vnc.sections.advanced')}>
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
                      id={`${p}-resolution`}
                      rowClassName="terminal-row"
                      labelNode={t('vnc.fields.resolution').toUpperCase()}
                      value={formData.resolution}
                      options={resolutionOptions}
                      onChange={(v) => handleInputChange('resolution', v)}
                      placeholder={tCommon('labels.select')}
                      helpText={t('vnc.help.resolution')}
                    />
                    <TerminalDropdownField
                      id={`${p}-colorDepth`}
                      rowClassName="terminal-row"
                      labelNode={t('vnc.fields.colorDepth').toUpperCase()}
                      value={formData.colorDepth}
                      options={colorDepthOptions}
                      onChange={(v) => handleInputChange('colorDepth', v)}
                      placeholder={tCommon('labels.select')}
                      helpText={t('vnc.help.colorDepth')}
                    />
                    <div className="terminal-row">
                      <label className="terminal-label terminal-label-with-help" htmlFor={`${p}-guacDpi`}>
                        <span>{t('vnc.fields.dpi').toUpperCase()}</span>
                        <TerminalOptionHelp text={t('vnc.help.dpi')} />
                      </label>
                      <div className="terminal-input-wrap terminal-port-input-wrap">
                        <InputText
                          id={`${p}-guacDpi`}
                          value={formData.guacDpi}
                          onChange={handleTextChange('guacDpi')}
                          placeholder={t('vnc.placeholders.dpi')}
                          className="terminal-input terminal-port-input text-center"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <TerminalDropdownField
                      id={`${p}-imageQuality`}
                      rowClassName="terminal-row"
                      labelNode={t('vnc.fields.imageQuality').toUpperCase()}
                      value={formData.imageQuality}
                      options={imageQualityOptions}
                      onChange={(v) => handleInputChange('imageQuality', v)}
                      placeholder={tCommon('labels.select')}
                      helpText={t('vnc.help.imageQuality')}
                    />
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
                    <TerminalSwitchOption
                      iconClass="pi-eye"
                      labelText={t('vnc.options.readOnly')}
                      checked={formData.readOnly}
                      onCheckedChange={(v) => handleInputChange('readOnly', v)}
                      inputId={`${p}-readOnly`}
                      helpText={t('vnc.help.readOnly')}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-compress"
                      labelText={t('vnc.options.compression')}
                      checked={formData.enableCompression}
                      onCheckedChange={(v) => handleInputChange('enableCompression', v)}
                      inputId={`${p}-compression`}
                      helpText={t('vnc.help.compression')}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-refresh"
                      labelText={t('vnc.options.autoReconnect')}
                      checked={formData.autoReconnect}
                      onCheckedChange={(v) => handleInputChange('autoReconnect', v)}
                      inputId={`${p}-autoReconnect`}
                      helpText={t('vnc.help.autoReconnect')}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-arrows-alt"
                      labelText={t('vnc.options.autoResize')}
                      checked={formData.autoResize}
                      onCheckedChange={(v) => handleInputChange('autoResize', v)}
                      inputId={`${p}-autoResize`}
                      helpText={t('vnc.help.autoResize')}
                    />
                    <TerminalSwitchOption
                      iconClass="pi-copy"
                      labelText={t('vnc.options.clipboard')}
                      checked={formData.redirectClipboard}
                      onCheckedChange={(v) => handleInputChange('redirectClipboard', v)}
                      inputId={`${p}-clipboard`}
                      helpText={t('vnc.help.clipboard')}
                    />
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
