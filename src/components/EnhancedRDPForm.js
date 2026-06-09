import React, { useEffect, useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { TerminalOptionHelp } from './TerminalOptionHelp';
import { useTranslation } from '../i18n/hooks/useTranslation';
import {
  RDP_COLOR_DEPTHS,
  RDP_RESOLUTION_VALUES,
  buildRdpPresetFormPatch
} from '../utils/rdpScreenConfig';

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
  idPrefix = 'rdp',
  applyFormPatch,
  layoutMode = 'standard'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState((layoutMode === 'tabbed' || layoutMode === 'sidebar') ? 'general' : 'screen');
  const [editingField, setEditingField] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Haz clic en cualquier pastilla para editar su valor.');

  const presetOptions = useMemo(
    () => [
      { label: t('rdp.presets.default'), value: 'default' },
      { label: t('rdp.presets.performance'), value: 'performance' },
      { label: t('rdp.presets.quality'), value: 'quality' }
    ],
    [t]
  );

  const resolutionOptions = useMemo(
    () => RDP_RESOLUTION_VALUES.map((value) => ({
      label: value === 'fullscreen' ? t('rdp.resolutions.fullscreen') : value,
      value
    })),
    [t]
  );

  const colorDepthOptions = useMemo(
    () => RDP_COLOR_DEPTHS.map((value) => ({
      label: t(`rdp.colorDepths.${value}`),
      value
    })),
    [t]
  );

  const handlePresetChange = (presetId) => {
    const patch = buildRdpPresetFormPatch(presetId, formData);
    if (typeof applyFormPatch === 'function') {
      applyFormPatch(patch);
      return;
    }
    Object.entries(patch).forEach(([field, value]) => {
      handleInputChange(field, value);
    });
  };

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
    const tabs = [];
    if (layoutMode === 'tabbed' || layoutMode === 'sidebar') {
      tabs.push({
        id: 'general',
        label: 'General',
        icon: 'pi-info-circle'
      });
    }
    tabs.push(
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
    );
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
  }, [formData.clientType, formData.guacEnableDrive, layoutMode, t]);

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

  const renderCredentials = () => (
    <>
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
            role="button"
            tabIndex={0}
          >
            <i className="pi pi-desktop" aria-hidden="true"></i> {t('rdp.clientTypes.mstsc')}
          </div>
          <div
            className={`terminal-auth-chip ${formData.clientType === 'guacamole' ? 'active' : ''}`}
            onClick={() => handleInputChange('clientType', 'guacamole')}
            role="button"
            tabIndex={0}
          >
            <i className="pi pi-globe" aria-hidden="true"></i> {t('rdp.clientTypes.guacamole')}
          </div>
        </div>
      </div>

      {formData.clientType === 'guacamole' ? (
        <TerminalDropdownField
          id={`${p}-guacSecurity`}
          labelNode={t('rdp.fields.security').toUpperCase()}
          value={formData.guacSecurity}
          options={guacSecurityOptions}
          onChange={(v) => handleInputChange('guacSecurity', v)}
          placeholder={tCommon('labels.select')}
          helpText={t('rdp.help.security')}
        />
      ) : null}
    </>
  );

  const renderAdvancedTabsBar = () => (
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
          style={layoutMode === 'tabbed' ? {
            background: advancedOptionsTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: advancedOptionsTab === tab.id ? 'var(--ui-button-primary, #6366f1)' : 'rgba(255, 255, 255, 0.6)',
            borderBottom: advancedOptionsTab === tab.id ? '2px solid var(--ui-button-primary, #6366f1)' : 'none',
            borderRadius: '0',
            padding: '0.5rem 1rem'
          } : undefined}
        >
          <i className={`pi ${tab.icon}`} aria-hidden="true"></i>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const renderTabContentPanel = () => {
    switch (advancedOptionsTab) {
      case 'general':
        return renderCredentials();
      case 'screen':
        return (
          <div id={`${p}-advanced-panel-screen`} role="tabpanel" className="terminal-advanced-panel-pane">
            <div className="terminal-screen-grid">
              <TerminalDropdownField
                id={`${p}-preset`}
                rowClassName="terminal-row"
                labelNode={t('rdp.fields.preset').toUpperCase()}
                value={formData.preset}
                options={presetOptions}
                onChange={handlePresetChange}
                placeholder={tCommon('labels.select')}
                helpText={t('rdp.help.preset')}
              />
              <TerminalDropdownField
                id={`${p}-resolution`}
                rowClassName="terminal-row"
                labelNode={t('rdp.fields.resolution').toUpperCase()}
                value={formData.resolution}
                options={resolutionOptions}
                onChange={(v) => handleInputChange('resolution', v)}
                placeholder={tCommon('labels.select')}
                helpText={t('rdp.help.resolution')}
              />
              <TerminalDropdownField
                id={`${p}-colorDepth`}
                rowClassName="terminal-row"
                labelNode={t('rdp.fields.color').toUpperCase()}
                value={formData.colorDepth}
                options={colorDepthOptions}
                onChange={(v) => handleInputChange('colorDepth', v)}
                placeholder={tCommon('labels.select')}
                helpText={t('rdp.help.color')}
              />
              <div className="terminal-row">
                <label className="terminal-label terminal-label-with-help" htmlFor={`${p}-guacDpi`}>
                  <span>{t('rdp.fields.dpi').toUpperCase()}</span>
                  <TerminalOptionHelp text={t('rdp.help.dpi')} />
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
        );
      case 'options':
        return (
          <div id={`${p}-advanced-panel-options`} role="tabpanel" className="terminal-advanced-panel-pane">
            <div className="terminal-options-grid">
              {formData.clientType === 'mstsc' ? (
                <>
                  <TerminalSwitchOption
                    iconClass="pi-copy"
                    labelText={t('rdp.options.clipboard')}
                    checked={formData.redirectClipboard}
                    onCheckedChange={(v) => handleInputChange('redirectClipboard', v)}
                    inputId={`${p}-mstsc-clipboard`}
                    helpText={t('rdp.help.clipboard')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-volume-up"
                    labelText={t('rdp.options.audio')}
                    checked={formData.redirectAudio}
                    onCheckedChange={(v) => handleInputChange('redirectAudio', v)}
                    inputId={`${p}-mstsc-audio`}
                    helpText={t('rdp.help.audio')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-print"
                    labelText={t('rdp.options.printers')}
                    checked={formData.redirectPrinters}
                    onCheckedChange={(v) => handleInputChange('redirectPrinters', v)}
                    inputId={`${p}-mstsc-printers`}
                    helpText={t('rdp.help.printers')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-folder"
                    labelText={t('rdp.options.folders')}
                    checked={formData.redirectFolders}
                    onCheckedChange={(v) => handleInputChange('redirectFolders', v)}
                    inputId={`${p}-mstsc-folders`}
                    helpText={t('rdp.help.folders')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-arrows-alt"
                    labelText={t('rdp.options.smartSizing')}
                    checked={formData.smartSizing}
                    onCheckedChange={(v) => handleInputChange('smartSizing', v)}
                    inputId={`${p}-mstsc-smart`}
                    helpText={t('rdp.help.smartSizing')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-window-maximize"
                    labelText={t('rdp.options.fullscreen')}
                    checked={formData.fullscreen}
                    onCheckedChange={(v) => handleInputChange('fullscreen', v)}
                    inputId={`${p}-mstsc-fullscreen`}
                    helpText={t('rdp.help.fullscreen')}
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
                    helpText={t('rdp.help.clipboard')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-volume-up"
                    labelText={t('rdp.options.audio')}
                    checked={formData.redirectAudio}
                    onCheckedChange={(v) => handleInputChange('redirectAudio', v)}
                    inputId={`${p}-guac-audio`}
                    helpText={t('rdp.help.audio')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-database"
                    labelText={t('rdp.options.enableDrive')}
                    checked={formData.guacEnableDrive}
                    onCheckedChange={(v) => handleInputChange('guacEnableDrive', v)}
                    inputId={`${p}-guac-drive`}
                    helpText={t('rdp.help.enableDrive')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-arrows-alt"
                    labelText={t('rdp.options.autoResize')}
                    checked={formData.autoResize}
                    onCheckedChange={(v) => handleInputChange('autoResize', v)}
                    inputId={`${p}-guac-resize`}
                    helpText={t('rdp.help.autoResize')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-image"
                    labelText={t('rdp.options.enableWallpaper')}
                    checked={formData.guacEnableWallpaper}
                    onCheckedChange={(v) => handleInputChange('guacEnableWallpaper', v)}
                    inputId={`${p}-guac-wallpaper`}
                    helpText={t('rdp.help.enableWallpaper')}
                  />
                  <TerminalSwitchOption
                    iconClass="pi-print"
                    labelText={t('rdp.options.printers')}
                    checked={formData.redirectPrinters}
                    onCheckedChange={(v) => handleInputChange('redirectPrinters', v)}
                    inputId={`${p}-guac-printers`}
                    helpText={t('rdp.help.printers')}
                  />
                </>
              )}
            </div>
          </div>
        );
      case 'guacamole':
        return (
          <div id={`${p}-advanced-panel-guacamole`} role="tabpanel" className="terminal-advanced-panel-pane">
            <TerminalOptionSection title={t('rdp.advanced.performance')}>
              <TerminalSwitchOption
                iconClass="pi-palette"
                labelText={t('rdp.advanced.enableGfx')}
                checked={formData.guacEnableGfx}
                onCheckedChange={(v) => handleInputChange('guacEnableGfx', v)}
                inputId={`${p}-guac-gfx`}
                helpText={t('rdp.help.enableGfx')}
              />
              <TerminalSwitchOption
                iconClass="pi-image"
                labelText={t('rdp.advanced.desktopComposition')}
                checked={formData.guacEnableDesktopComposition}
                onCheckedChange={(v) => handleInputChange('guacEnableDesktopComposition', v)}
                inputId={`${p}-guac-composition`}
                helpText={t('rdp.help.desktopComposition')}
              />
              <TerminalSwitchOption
                iconClass="pi-star"
                labelText={t('rdp.advanced.fontSmoothing')}
                checked={formData.guacEnableFontSmoothing}
                onCheckedChange={(v) => handleInputChange('guacEnableFontSmoothing', v)}
                inputId={`${p}-guac-font`}
                helpText={t('rdp.help.fontSmoothing')}
              />
              <TerminalSwitchOption
                iconClass="pi-tags"
                labelText={t('rdp.advanced.theming')}
                checked={formData.guacEnableTheming}
                onCheckedChange={(v) => handleInputChange('guacEnableTheming', v)}
                inputId={`${p}-guac-theme`}
                helpText={t('rdp.help.theming')}
              />
            </TerminalOptionSection>
            <TerminalOptionSection title={t('rdp.advanced.interface')}>
              <TerminalSwitchOption
                iconClass="pi-arrows-h"
                labelText={t('rdp.advanced.fullWindowDrag')}
                checked={formData.guacEnableFullWindowDrag}
                onCheckedChange={(v) => handleInputChange('guacEnableFullWindowDrag', v)}
                inputId={`${p}-guac-drag`}
                helpText={t('rdp.help.fullWindowDrag')}
              />
              <TerminalSwitchOption
                iconClass="pi-bars"
                labelText={t('rdp.advanced.menuAnimations')}
                checked={formData.guacEnableMenuAnimations}
                onCheckedChange={(v) => handleInputChange('guacEnableMenuAnimations', v)}
                inputId={`${p}-guac-menu`}
                helpText={t('rdp.help.menuAnimations')}
              />
            </TerminalOptionSection>
            <TerminalOptionSection title={t('rdp.advanced.cache')}>
              <TerminalSwitchOption
                iconClass="pi-font"
                labelText={t('rdp.advanced.glyphCaching')}
                checked={!formData.guacDisableGlyphCaching}
                onCheckedChange={(v) => handleInputChange('guacDisableGlyphCaching', !v)}
                inputId={`${p}-guac-glyph-cache`}
                helpText={t('rdp.help.glyphCaching')}
              />
              <TerminalSwitchOption
                iconClass="pi-mobile"
                labelText={t('rdp.advanced.offscreenCaching')}
                checked={!formData.guacDisableOffscreenCaching}
                onCheckedChange={(v) => handleInputChange('guacDisableOffscreenCaching', !v)}
                inputId={`${p}-guac-offscreen-cache`}
                helpText={t('rdp.help.offscreenCaching')}
              />
              <TerminalSwitchOption
                iconClass="pi-images"
                labelText={t('rdp.advanced.bitmapCaching')}
                checked={!formData.guacDisableBitmapCaching}
                onCheckedChange={(v) => handleInputChange('guacDisableBitmapCaching', !v)}
                inputId={`${p}-guac-bitmap-cache`}
                helpText={t('rdp.help.bitmapCaching')}
              />
              <TerminalSwitchOption
                iconClass="pi-clone"
                labelText={t('rdp.advanced.copyRect')}
                checked={!formData.guacDisableCopyRect}
                onCheckedChange={(v) => handleInputChange('guacDisableCopyRect', !v)}
                inputId={`${p}-guac-copy-rect`}
                helpText={t('rdp.help.copyRect')}
              />
            </TerminalOptionSection>
          </div>
        );
      case 'sharedFolder':
        return (
          <div id={`${p}-advanced-panel-sharedFolder`} role="tabpanel" className="terminal-advanced-panel-pane">
            <div className="terminal-row mb-0">
              <label className="terminal-label terminal-label-with-help" htmlFor={`${p}-guacDriveHostDir`}>
                <span>{t('rdp.fields.localPath').toUpperCase()}</span>
                <TerminalOptionHelp text={t('rdp.help.localPath')} />
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
        );
      default:
        return null;
    }
  };

  if (layoutMode === 'hud-badges') {
    const isFieldWarning = (field) => {
      if (field === 'name' && !String(formData.name || '').trim()) return true;
      if (field === 'server' && !String(formData.server || '').trim()) return true;
      if (field === 'username' && !String(formData.username || '').trim()) return true;
      return false;
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
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
          
          {/* Grupo 1: Acceso RDP */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🖥️ Configuración de Acceso RDP
            </h4>
            <div className="hud-badge-container">
              {/* Nombre */}
              <div 
                className={`hud-badge-pill ${editingField === 'name' ? 'editing' : ''} ${isFieldWarning('name') ? 'warning' : ''}`}
                onClick={() => { setEditingField('name'); setStatusMessage('Editando nombre de conexión RDP.'); }}
              >
                <i className="pi pi-tag hud-badge-icon"></i>
                <span className="hud-badge-label">Nombre:</span>
                {editingField === 'name' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={formData.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.name || 'Definir nombre...'}</span>
                )}
              </div>

              {/* Servidor */}
              <div 
                className={`hud-badge-pill ${editingField === 'server' ? 'editing' : ''} ${isFieldWarning('server') ? 'warning' : ''}`}
                onClick={() => { setEditingField('server'); setStatusMessage('Editando servidor o dirección IP RDP.'); }}
              >
                <i className="pi pi-server hud-badge-icon"></i>
                <span className="hud-badge-label">Servidor:</span>
                {editingField === 'server' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={formData.server} 
                    onChange={(e) => handleInputChange('server', e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.server || 'Definir servidor...'}</span>
                )}
              </div>

              {/* Puerto */}
              <div 
                className={`hud-badge-pill ${editingField === 'port' ? 'editing' : ''}`}
                onClick={() => { setEditingField('port'); setStatusMessage('Editando puerto RDP (por defecto 3389).'); }}
              >
                <i className="pi pi-info-circle hud-badge-icon"></i>
                <span className="hud-badge-label">Puerto:</span>
                {editingField === 'port' ? (
                  <input 
                    type="number" 
                    className="hud-badge-input" 
                    style={{ width: '60px' }}
                    value={formData.port} 
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 3389)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.port}</span>
                )}
              </div>

              {/* Usuario */}
              <div 
                className={`hud-badge-pill ${editingField === 'username' ? 'editing' : ''} ${isFieldWarning('username') ? 'warning' : ''}`}
                onClick={() => { setEditingField('username'); setStatusMessage('Editando usuario RDP.'); }}
              >
                <i className="pi pi-user hud-badge-icon"></i>
                <span className="hud-badge-label">Usuario:</span>
                {editingField === 'username' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={formData.username} 
                    onChange={(e) => handleInputChange('username', e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.username || 'Definir usuario...'}</span>
                )}
              </div>

              {/* Contraseña */}
              <div 
                className={`hud-badge-pill ${editingField === 'password' ? 'editing' : ''}`}
                onClick={() => { setEditingField('password'); setStatusMessage('Editando contraseña de acceso RDP.'); }}
              >
                <i className="pi pi-lock hud-badge-icon"></i>
                <span className="hud-badge-label">Contraseña:</span>
                {editingField === 'password' ? (
                  <input 
                    type="password" 
                    className="hud-badge-input" 
                    value={formData.password} 
                    onChange={(e) => handleInputChange('password', e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.password ? '••••••••' : 'Definir contraseña...'}</span>
                )}
              </div>

              {/* Cliente (MSTSC vs Guacamole) */}
              <div 
                className="hud-badge-pill active"
                onClick={() => {
                  const nextClient = formData.clientType === 'mstsc' ? 'guacamole' : 'mstsc';
                  handleInputChange('clientType', nextClient);
                  setStatusMessage(`Cambiado cliente RDP a: ${nextClient === 'mstsc' ? 'Escritorio Nativo (MSTSC)' : 'Escritorio Web (Guacamole)'}`);
                }}
              >
                <i className="pi pi-desktop hud-badge-icon"></i>
                <span className="hud-badge-label">Cliente:</span>
                <span className="hud-badge-value">{formData.clientType === 'mstsc' ? 'MSTSC' : 'Guacamole'}</span>
              </div>

              {/* Seguridad RDP (solo Guacamole) */}
              {formData.clientType === 'guacamole' && (
                <div className="hud-badge-pill">
                  <i className="pi pi-shield hud-badge-icon"></i>
                  <span className="hud-badge-label">Seguridad:</span>
                  <Dropdown
                    value={formData.guacSecurity}
                    options={guacSecurityOptions}
                    onChange={(e) => {
                      handleInputChange('guacSecurity', e.value);
                      setStatusMessage(`Seguridad de Guacamole cambiada.`);
                    }}
                    placeholder="Seleccionar..."
                    className="hud-dropdown-inline"
                    panelClassName="terminal-folder-dropdown-panel"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Grupo 2: Pantalla y Rendimiento */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📺 Pantalla y Rendimiento RDP
            </h4>
            <div className="hud-badge-container">
              {/* Preset */}
              <div className="hud-badge-pill">
                <i className="pi pi-sliders-h hud-badge-icon"></i>
                <span className="hud-badge-label">Rendimiento:</span>
                <Dropdown
                  value={formData.preset}
                  options={presetOptions}
                  onChange={(e) => {
                    handlePresetChange(e.value);
                    setStatusMessage(`Perfil de rendimiento cambiado a: ${e.value}`);
                  }}
                  placeholder="Seleccionar..."
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>

              {/* Resolución */}
              <div className="hud-badge-pill">
                <i className="pi pi-desktop hud-badge-icon"></i>
                <span className="hud-badge-label">Resolución:</span>
                <Dropdown
                  value={formData.resolution}
                  options={resolutionOptions}
                  onChange={(e) => {
                    handleInputChange('resolution', e.value);
                    setStatusMessage(`Resolución de pantalla cambiada.`);
                  }}
                  placeholder="Seleccionar..."
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>

              {/* Color */}
              <div className="hud-badge-pill">
                <i className="pi pi-palette hud-badge-icon"></i>
                <span className="hud-badge-label">Color:</span>
                <Dropdown
                  value={formData.colorDepth}
                  options={colorDepthOptions}
                  onChange={(e) => {
                    handleInputChange('colorDepth', e.value);
                    setStatusMessage(`Profundidad de color cambiada.`);
                  }}
                  placeholder="Seleccionar..."
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>

              {/* DPI */}
              <div 
                className={`hud-badge-pill ${editingField === 'guacDpi' ? 'editing' : ''}`}
                onClick={() => { setEditingField('guacDpi'); setStatusMessage('Editando resolución DPI (por defecto 96).'); }}
              >
                <i className="pi pi-info-circle hud-badge-icon"></i>
                <span className="hud-badge-label">DPI:</span>
                {editingField === 'guacDpi' ? (
                  <input 
                    type="number" 
                    className="hud-badge-input" 
                    style={{ width: '60px' }}
                    value={formData.guacDpi} 
                    onChange={(e) => handleInputChange('guacDpi', parseInt(e.target.value) || 96)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.guacDpi}</span>
                )}
              </div>
            </div>
          </div>

          {/* Grupo 3: Dispositivos y Recursos (Clic para alternar) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Dispositivos y Recursos Compartidos
            </h4>
            <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
              
              {/* Portapapeles */}
              <div 
                className={`hud-badge-pill ${formData.redirectClipboard ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('redirectClipboard', !formData.redirectClipboard);
                  setStatusMessage(`Redirección de portapapeles: ${!formData.redirectClipboard ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-copy hud-badge-icon"></i>
                <span className="hud-badge-label">Portapapeles:</span>
                <span className="hud-badge-value">{formData.redirectClipboard ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Audio */}
              <div 
                className={`hud-badge-pill ${formData.redirectAudio ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('redirectAudio', !formData.redirectAudio);
                  setStatusMessage(`Redirección de audio: ${!formData.redirectAudio ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-volume-up hud-badge-icon"></i>
                <span className="hud-badge-label">Audio:</span>
                <span className="hud-badge-value">{formData.redirectAudio ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Impresoras */}
              <div 
                className={`hud-badge-pill ${formData.redirectPrinters ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('redirectPrinters', !formData.redirectPrinters);
                  setStatusMessage(`Redirección de impresoras: ${!formData.redirectPrinters ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-print hud-badge-icon"></i>
                <span className="hud-badge-label">Impresoras:</span>
                <span className="hud-badge-value">{formData.redirectPrinters ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Opciones específicas según Cliente */}
              {formData.clientType === 'guacamole' ? (
                <>
                  {/* Habilitar Disco Virtual */}
                  <div 
                    className={`hud-badge-pill ${formData.guacEnableDrive ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('guacEnableDrive', !formData.guacEnableDrive);
                      setStatusMessage(`Disco virtual de intercambio de archivos: ${!formData.guacEnableDrive ? 'Habilitado' : 'Deshabilitado'}`);
                    }}
                  >
                    <i className="pi pi-database hud-badge-icon"></i>
                    <span className="hud-badge-label">Disco Virtual:</span>
                    <span className="hud-badge-value">{formData.guacEnableDrive ? 'SÍ' : 'NO'}</span>
                  </div>

                  {/* Auto Redimensionar */}
                  <div 
                    className={`hud-badge-pill ${formData.autoResize ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('autoResize', !formData.autoResize);
                      setStatusMessage(`Redimensionar automáticamente resolución: ${!formData.autoResize ? 'Activado' : 'Desactivado'}`);
                    }}
                  >
                    <i className="pi pi-arrows-alt hud-badge-icon"></i>
                    <span className="hud-badge-label">Auto Ajuste:</span>
                    <span className="hud-badge-value">{formData.autoResize ? 'SÍ' : 'NO'}</span>
                  </div>

                  {/* Habilitar Fondo Pantalla */}
                  <div 
                    className={`hud-badge-pill ${formData.guacEnableWallpaper ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('guacEnableWallpaper', !formData.guacEnableWallpaper);
                      setStatusMessage(`Mostrar fondo de pantalla remoto: ${!formData.guacEnableWallpaper ? 'SÍ' : 'NO'}`);
                    }}
                  >
                    <i className="pi pi-image hud-badge-icon"></i>
                    <span className="hud-badge-label">Fondo:</span>
                    <span className="hud-badge-value">{formData.guacEnableWallpaper ? 'SÍ' : 'NO'}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Redireccionar Carpetas MSTSC */}
                  <div 
                    className={`hud-badge-pill ${formData.redirectFolders ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('redirectFolders', !formData.redirectFolders);
                      setStatusMessage(`Compartir carpetas del sistema local con MSTSC: ${!formData.redirectFolders ? 'SÍ' : 'NO'}`);
                    }}
                  >
                    <i className="pi pi-folder hud-badge-icon"></i>
                    <span className="hud-badge-label">Carpetas locales:</span>
                    <span className="hud-badge-value">{formData.redirectFolders ? 'SÍ' : 'NO'}</span>
                  </div>

                  {/* Smart Sizing MSTSC */}
                  <div 
                    className={`hud-badge-pill ${formData.smartSizing ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('smartSizing', !formData.smartSizing);
                      setStatusMessage(`Ajuste dinámico inteligente: ${!formData.smartSizing ? 'SÍ' : 'NO'}`);
                    }}
                  >
                    <i className="pi pi-arrows-alt hud-badge-icon"></i>
                    <span className="hud-badge-label">Smart Sizing:</span>
                    <span className="hud-badge-value">{formData.smartSizing ? 'SÍ' : 'NO'}</span>
                  </div>

                  {/* Fullscreen MSTSC */}
                  <div 
                    className={`hud-badge-pill ${formData.fullscreen ? 'active' : ''}`}
                    onClick={() => {
                      handleInputChange('fullscreen', !formData.fullscreen);
                      setStatusMessage(`Abrir RDP en pantalla completa: ${!formData.fullscreen ? 'SÍ' : 'NO'}`);
                    }}
                  >
                    <i className="pi pi-window-maximize hud-badge-icon"></i>
                    <span className="hud-badge-label">Pantalla completa:</span>
                    <span className="hud-badge-value">{formData.fullscreen ? 'SÍ' : 'NO'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grupo 4: Carpeta Compartida RDP (solo Guacamole y si está activado) */}
          {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📁 Carpeta Compartida (Disco Virtual)
              </h4>
              <div className="hud-badge-container">
                <div 
                  className="hud-badge-pill active"
                  onClick={() => {
                    onSelectFolder && onSelectFolder();
                    setStatusMessage('Selecciona la carpeta local a compartir con el servidor RDP.');
                  }}
                >
                  <i className="pi pi-folder-open hud-badge-icon"></i>
                  <span className="hud-badge-label">Ruta local compartida:</span>
                  <span className="hud-badge-value">{formData.guacDriveHostDir || 'Seleccionar carpeta local...'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Grupo 5: Optimización Avanzada Guacamole */}
          {formData.clientType === 'guacamole' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚀 Rendimiento Avanzado (Guacamole)
              </h4>
              <div className="hud-badge-container">
                {/* GFX */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableGfx ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableGfx', !formData.guacEnableGfx)}
                >
                  <span className="hud-badge-label">Habilitar GFX:</span>
                  <span className="hud-badge-value">{formData.guacEnableGfx ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Composición */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableDesktopComposition ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableDesktopComposition', !formData.guacEnableDesktopComposition)}
                >
                  <span className="hud-badge-label">Composición escritorio:</span>
                  <span className="hud-badge-value">{formData.guacEnableDesktopComposition ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Suavizado fuentes */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableFontSmoothing ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableFontSmoothing', !formData.guacEnableFontSmoothing)}
                >
                  <span className="hud-badge-label">Suavizado fuentes:</span>
                  <span className="hud-badge-value">{formData.guacEnableFontSmoothing ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Temas */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableTheming ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableTheming', !formData.guacEnableTheming)}
                >
                  <span className="hud-badge-label">Temas visuales:</span>
                  <span className="hud-badge-value">{formData.guacEnableTheming ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Arrastre ventanas */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableFullWindowDrag ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableFullWindowDrag', !formData.guacEnableFullWindowDrag)}
                >
                  <span className="hud-badge-label">Arrastre de ventana:</span>
                  <span className="hud-badge-value">{formData.guacEnableFullWindowDrag ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Animaciones menú */}
                <div 
                  className={`hud-badge-pill ${formData.guacEnableMenuAnimations ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacEnableMenuAnimations', !formData.guacEnableMenuAnimations)}
                >
                  <span className="hud-badge-label">Animaciones menú:</span>
                  <span className="hud-badge-value">{formData.guacEnableMenuAnimations ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Glyph Caching */}
                <div 
                  className={`hud-badge-pill ${!formData.guacDisableGlyphCaching ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacDisableGlyphCaching', !formData.guacDisableGlyphCaching)}
                >
                  <span className="hud-badge-label">Cache Glifos:</span>
                  <span className="hud-badge-value">{!formData.guacDisableGlyphCaching ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Offscreen Caching */}
                <div 
                  className={`hud-badge-pill ${!formData.guacDisableOffscreenCaching ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacDisableOffscreenCaching', !formData.guacDisableOffscreenCaching)}
                >
                  <span className="hud-badge-label">Cache Offscreen:</span>
                  <span className="hud-badge-value">{!formData.guacDisableOffscreenCaching ? 'SÍ' : 'NO'}</span>
                </div>

                {/* Bitmap Caching */}
                <div 
                  className={`hud-badge-pill ${!formData.guacDisableBitmapCaching ? 'active' : ''}`}
                  onClick={() => handleInputChange('guacDisableBitmapCaching', !formData.guacDisableBitmapCaching)}
                >
                  <span className="hud-badge-label">Cache Bitmaps:</span>
                  <span className="hud-badge-value">{!formData.guacDisableBitmapCaching ? 'SÍ' : 'NO'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Barra de Estado HUD */}
        <div className="hud-status-line">
          <i className="pi pi-info-circle" style={{ color: 'var(--ui-button-primary)' }}></i>
          <span>{statusMessage}</span>
        </div>

        {/* Footer */}
        <div className="terminal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
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
              <i className={busy ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-check mr-2'} aria-hidden="true"></i>
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

  if (layoutMode === 'sidebar') {
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
        <div className="form-layout-sidebar" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginBottom: '1rem' }}>
          <div className="form-sidebar-nav">
            {advancedOptionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`form-sidebar-nav-btn ${advancedOptionsTab === tab.id ? 'active' : ''}`}
                onClick={() => setAdvancedOptionsTab(tab.id)}
              >
                <i className={`pi ${tab.icon}`} aria-hidden="true"></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="form-sidebar-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
            <div style={{ marginTop: '0.25rem' }}>
              {renderTabContentPanel()}
            </div>
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
        
        {layoutMode === 'split' ? (
          <div className="grid" style={{ gap: '0' }}>
            <div className="col-12 md:col-6" style={{ padding: '0 1rem 0 0' }}>
              {renderCredentials()}
            </div>
            
            <div className="col-12 md:col-6" style={{ padding: '0 0 0 1rem', borderLeft: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
              <div className="terminal-options-section-title mb-2">OPCIONES DE PANTALLA Y SISTEMA</div>
              {renderAdvancedTabsBar()}
              <div style={{ marginTop: '0.75rem' }}>
                {renderTabContentPanel()}
              </div>
            </div>
          </div>
        ) : layoutMode === 'tabbed' ? (
          <div>
            {renderAdvancedTabsBar()}
            <div style={{ marginTop: '1.25rem' }}>
              {renderTabContentPanel()}
            </div>
          </div>
        ) : (
          /* Standard Layout */
          <>
            {renderCredentials()}

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

              {showAdvancedOptions && (
                <div className="terminal-options-list">
                  {renderAdvancedTabsBar()}
                  {renderTabContentPanel()}
                </div>
              )}
            </div>
          </>
        )}

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
