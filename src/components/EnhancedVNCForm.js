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
  idPrefix = 'vnc',
  layoutMode = 'standard'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState((layoutMode === 'tabbed' || layoutMode === 'sidebar') ? 'general' : 'screen');
  const [editingField, setEditingField] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Haz clic en cualquier pastilla para editar su valor.');

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
        label: t('vnc.advancedTabs.screen'),
        icon: 'pi-desktop'
      },
      {
        id: 'options',
        label: t('vnc.advancedTabs.options'),
        icon: 'pi-cog'
      }
    );
    return tabs;
  }, [layoutMode, t]);

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

  const renderCredentials = () => (
    <>
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
            role="button"
            tabIndex={0}
            aria-label={showPassword ? t('vnc.tooltips.hidePassword') : t('vnc.tooltips.showPassword')}
          ></i>
        </div>
        <p className="mt-2 mb-0 opacity-60" style={{ fontSize: '0.7rem' }}>
          {t('vnc.descriptions.password')}
        </p>
      </div>
    </>
  );

  const renderAdvancedTabsBar = () => (
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
        );
      case 'options':
        return (
          <div id={`${p}-advanced-panel-options`} role="tabpanel" className="terminal-advanced-panel-pane">
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
        );
      default:
        return null;
    }
  };

  if (layoutMode === 'hud-badges') {
    const isFieldWarning = (field) => {
      if (field === 'name' && !String(formData.name || '').trim()) return true;
      if (field === 'server' && !String(formData.server || '').trim()) return true;
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
          
          {/* Grupo 1: Acceso VNC */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🖥️ Configuración de Acceso VNC
            </h4>
            <div className="hud-badge-container">
              {/* Nombre */}
              <div 
                className={`hud-badge-pill ${editingField === 'name' ? 'editing' : ''} ${isFieldWarning('name') ? 'warning' : ''}`}
                onClick={() => { setEditingField('name'); setStatusMessage('Editando nombre de conexión VNC.'); }}
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
                onClick={() => { setEditingField('server'); setStatusMessage('Editando servidor o dirección IP VNC.'); }}
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
                onClick={() => { setEditingField('port'); setStatusMessage('Editando puerto VNC (por defecto 5900).'); }}
              >
                <i className="pi pi-info-circle hud-badge-icon"></i>
                <span className="hud-badge-label">Puerto:</span>
                {editingField === 'port' ? (
                  <input 
                    type="number" 
                    className="hud-badge-input" 
                    style={{ width: '60px' }}
                    value={formData.port} 
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 5900)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{formData.port}</span>
                )}
              </div>

              {/* Contraseña */}
              <div 
                className={`hud-badge-pill ${editingField === 'password' ? 'editing' : ''}`}
                onClick={() => { setEditingField('password'); setStatusMessage('Editando contraseña de acceso VNC (si requiere).'); }}
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
                  <span className="hud-badge-value">{formData.password ? '••••••••' : 'Sin contraseña...'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Grupo 2: Pantalla y Calidad */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📺 Pantalla y Calidad de Imagen VNC
            </h4>
            <div className="hud-badge-container">
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

              {/* Calidad de Imagen */}
              <div className="hud-badge-pill">
                <i className="pi pi-images hud-badge-icon"></i>
                <span className="hud-badge-label">Calidad:</span>
                <Dropdown
                  value={formData.imageQuality}
                  options={imageQualityOptions}
                  onChange={(e) => {
                    handleInputChange('imageQuality', e.value);
                    setStatusMessage(`Calidad de imagen cambiada a: ${e.value}`);
                  }}
                  placeholder="Seleccionar..."
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>
            </div>
          </div>

          {/* Grupo 3: Opciones de Sesión (Switches) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Opciones de Sesión (Clic para alternar)
            </h4>
            <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
              
              {/* Solo Lectura */}
              <div 
                className={`hud-badge-pill ${formData.readOnly ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('readOnly', !formData.readOnly);
                  setStatusMessage(`Modo Solo Lectura (sin enviar ratón/teclado): ${!formData.readOnly ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-eye hud-badge-icon"></i>
                <span className="hud-badge-label">Solo Lectura:</span>
                <span className="hud-badge-value">{formData.readOnly ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Compresión */}
              <div 
                className={`hud-badge-pill ${formData.enableCompression ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('enableCompression', !formData.enableCompression);
                  setStatusMessage(`Compresión de imagen en red: ${!formData.enableCompression ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-compress hud-badge-icon"></i>
                <span className="hud-badge-label">Compresión:</span>
                <span className="hud-badge-value">{formData.enableCompression ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Reconectar Automático */}
              <div 
                className={`hud-badge-pill ${formData.autoReconnect ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('autoReconnect', !formData.autoReconnect);
                  setStatusMessage(`Reconectar automáticamente si se pierde la conexión: ${!formData.autoReconnect ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-refresh hud-badge-icon"></i>
                <span className="hud-badge-label">Reconexión Auto:</span>
                <span className="hud-badge-value">{formData.autoReconnect ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Auto Redimensionar */}
              <div 
                className={`hud-badge-pill ${formData.autoResize ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('autoResize', !formData.autoResize);
                  setStatusMessage(`Redimensionar resolución según el tamaño de la ventana: ${!formData.autoResize ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-arrows-alt hud-badge-icon"></i>
                <span className="hud-badge-label">Auto Ajuste:</span>
                <span className="hud-badge-value">{formData.autoResize ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Portapapeles */}
              <div 
                className={`hud-badge-pill ${formData.redirectClipboard ? 'active' : ''}`}
                onClick={() => {
                  handleInputChange('redirectClipboard', !formData.redirectClipboard);
                  setStatusMessage(`Redirección de portapapeles bidireccional: ${!formData.redirectClipboard ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-copy hud-badge-icon"></i>
                <span className="hud-badge-label">Portapapeles:</span>
                <span className="hud-badge-value">{formData.redirectClipboard ? 'SÍ' : 'NO'}</span>
              </div>
            </div>
          </div>

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
              <div className="terminal-options-section-title mb-2">OPCIONES DE SISTEMA VNC</div>
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
                <span className="terminal-label mb-0">{t('vnc.sections.advanced').toUpperCase()}</span>
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
