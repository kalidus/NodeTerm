import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { TerminalOptionHelp } from '../TerminalOptionHelp';
import { useTranslation } from '../../i18n/hooks/useTranslation';

function deriveSSHAuthMethod(nodeData) {
  if (!nodeData) return 'password';
  if (nodeData.authMethod === 'key' || nodeData.authMethod === 'password') {
    return nodeData.authMethod;
  }
  if (nodeData.privateKey?.trim()) return 'key';
  return 'password';
}

function isWallixUserString(userString) {
  return /^(.+)@(.+)@(.+):(.+):(.+)$/.test((userString || '').trim());
}

// --- EnhancedSSHForm: Formulario SSH mejorado con soporte para claves ---
export function EnhancedSSHForm({
  activeTabIndex,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAuthMethod = 'password', setSSHAuthMethod = () => {},
  sshPrivateKey = '', setSSHPrivateKey = () => {},
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  sshX11Forwarding = false, setSSHX11Forwarding = () => {},
  sshAgentForwarding = false, setSSHAgentForwarding = () => {},
  sshAutoRecording = false, setSSHAutoRecording = () => {},
  sshProxyJumpEnabled = false, setSSHProxyJumpEnabled = () => {},
  sshJumpHost = '', setSSHJumpHost = () => {},
  sshJumpPort = 22, setSSHJumpPort = () => {},
  sshJumpUser = '', setSSHJumpUser = () => {},
  sshJumpAuthMethod = 'password', setSSHJumpAuthMethod = () => {},
  sshJumpPassword = '', setSSHJumpPassword = () => {},
  sshJumpPrivateKey = '', setSSHJumpPrivateKey = () => {},
  sshHostKeyPolicy = 'warn_new', setSSHHostKeyPolicy = () => {},
  sshDescription = '', setSSHDescription = () => {},
  sshUseBastionWallix = false, setSSHUseBastionWallix = () => {},
  foldersOptions = [],
  onSSHConfirm,
  onHide,
  onGoBack,
  sshLoading = false,
  isEditMode = false,
  layoutMode = 'standard',
  hideFooter = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showJumpPassword, setShowJumpPassword] = useState(false);
  const [privateKeyFileName, setPrivateKeyFileName] = useState('');
  const [jumpPrivateKeyFileName, setJumpPrivateKeyFileName] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState('general');
  const [activeFormTab, setActiveFormTab] = useState('general'); // 'general', 'auth', 'advanced'
  const [editingField, setEditingField] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Haz clic en cualquier pastilla para editar su valor.');
  
  const privateKeyInputRef = useRef(null);
  const jumpPrivateKeyInputRef = useRef(null);
  const isWallixUser = useMemo(() => isWallixUserString(sshUser), [sshUser]);
  const advancedOptionTabs = useMemo(() => {
    const tabs = [
      {
        id: 'general',
        label: t('ssh.advancedTabs.general'),
        icon: 'pi-sliders-h'
      }
    ];

    if (!isWallixUser) {
      tabs.push(
        {
          id: 'proxyJump',
          label: t('ssh.auth.proxyJump'),
          icon: 'pi-share-alt'
        },
        {
          id: 'hostKey',
          label: t('ssh.auth.hostKeyPolicy'),
          icon: 'pi-shield'
        }
      );
    }

    return tabs;
  }, [isWallixUser, t]);
  const hostKeyPolicyOptions = useMemo(() => ([
    { label: t('ssh.auth.hostKeyPolicies.warn_new'), value: 'warn_new' },
    { label: t('ssh.auth.hostKeyPolicies.known_hosts'), value: 'known_hosts' },
    { label: t('ssh.auth.hostKeyPolicies.strict'), value: 'strict' }
  ]), [t]);

  const sidebarTabs = useMemo(() => {
    const tabs = [
      { id: 'general', label: 'General', icon: 'pi pi-info-circle' },
      { id: 'folders', label: 'Carpetas', icon: 'pi pi-folder' }
    ];
    if (!isWallixUser) {
      tabs.push(
        { id: 'proxy', label: 'Salto SSH', icon: 'pi pi-share-alt' },
        { id: 'security', label: 'Seguridad', icon: 'pi pi-shield' }
      );
    }
    tabs.push({ id: 'advanced', label: 'Avanzado', icon: 'pi pi-cog' });
    return tabs;
  }, [isWallixUser]);

  useEffect(() => {
    if (!advancedOptionTabs.some((tab) => tab.id === advancedOptionsTab)) {
      setAdvancedOptionsTab(advancedOptionTabs[0]?.id || 'general');
    }
  }, [advancedOptionTabs, advancedOptionsTab]);

  // Validación del formulario
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!sshName?.trim()) {
      errors.name = t('ssh.validation.nameRequired');
    }
    
    if (!sshHost?.trim()) {
      errors.host = t('ssh.validation.hostRequired');
    }
    
    if (!sshUser?.trim()) {
      errors.user = t('ssh.validation.userRequired');
    }
    
    if (sshAuthMethod === 'password' && !sshPassword?.trim()) {
      errors.password = t('ssh.validation.passwordRequired');
    }
    
    if (sshAuthMethod === 'key' && !sshPrivateKey?.trim()) {
      errors.privateKey = t('ssh.validation.privateKeyRequired');
    }
    
    return errors;
  }, [sshName, sshHost, sshUser, sshPassword, sshAuthMethod, sshPrivateKey, t]);

  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    if (onSSHConfirm && typeof onSSHConfirm === 'function') {
      onSSHConfirm();
    }
  }, [validateForm, onSSHConfirm]);

  const handlePrivateKeyFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPrivateKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setSSHPrivateKey(loadEvent.target?.result || '');
    };
    reader.readAsText(file);
  }, [setSSHPrivateKey]);

  const handleJumpPrivateKeyFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setJumpPrivateKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setSSHJumpPrivateKey(loadEvent.target?.result || '');
    };
    reader.readAsText(file);
  }, [setSSHJumpPrivateKey]);

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (sshAuthMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  const renderHostPort = () => (
    <div className="terminal-host-port-row mb-3">
      <div className="terminal-host-port-host">
        <label className="terminal-label">Host / Dirección IP</label>
        <div className="terminal-input-wrap">
          <i className="pi pi-server terminal-icon-left"></i>
          <InputText 
            value={sshHost} 
            onChange={(e) => setSSHHost(e.target.value)}
            placeholder="ssh.ejemplo.com"
            className={`terminal-input ${validationErrors.host ? 'p-invalid' : ''}`}
          />
          <i className="pi pi-ellipsis-h terminal-icon-right opacity-30"></i>
        </div>
      </div>
      <div className="terminal-host-port-port">
        <label className="terminal-label">Puerto</label>
        <div className="terminal-input-wrap terminal-port-input-wrap">
          <InputText
            value={sshPort}
            onChange={(e) => setSSHPort(e.target.value)}
            placeholder="22"
            className="terminal-input terminal-port-input text-center"
          />
        </div>
      </div>
    </div>
  );

  const renderNameDesc = () => (
    <>
      <div className="flex align-items-center gap-2 mb-3">
        <i className="pi pi-info-circle" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Información General
        </span>
      </div>
      <div className="terminal-row grid grid-nogutter gap-3 mb-3">
        <div className="col">
          <label className="terminal-label">Nombre de Conexión</label>
          <div className="terminal-input-wrap">
            <InputText value={sshName} onChange={(e) => setSSHName(e.target.value)} placeholder="Mi Servidor" className="terminal-input" />
          </div>
        </div>
        <div className="col">
          <label className="terminal-label">Descripción</label>
          <div className="terminal-input-wrap">
            <InputText value={sshDescription} onChange={(e) => setSSHDescription(e.target.value)} placeholder="..." className="terminal-input" />
          </div>
        </div>
      </div>
    </>
  );

  const renderAuthMethodSelector = () => (
    <div className="terminal-row mb-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
      <div className="flex align-items-center gap-2 mb-2">
        <i className="pi pi-lock" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Autenticación
        </span>
      </div>
      <label className="terminal-label">{t('ssh.auth.method')}</label>
      <div className="terminal-auth-selector">
        <div
          className={`terminal-auth-chip ${sshAuthMethod === 'password' ? 'active' : ''}`}
          onClick={() => {
            setSSHAuthMethod('password');
            setSSHPrivateKey('');
            setPrivateKeyFileName('');
          }}
        >
          <i className="pi pi-lock"></i> {t('ssh.auth.password')}
        </div>
        <div
          className={`terminal-auth-chip ${sshAuthMethod === 'key' ? 'active' : ''}`}
          onClick={() => {
            setSSHAuthMethod('key');
            setSSHPassword('');
          }}
        >
          <i className="pi pi-key"></i> {t('ssh.auth.key')}
        </div>
      </div>
    </div>
  );

  const renderUserAndAuthInput = () => (
    <>
      <div className="terminal-row mb-3">
        <label className="terminal-label">Usuario</label>
        <div className="terminal-input-wrap">
          <i className="pi pi-user terminal-icon-left"></i>
          <InputText value={sshUser} onChange={(e) => setSSHUser(e.target.value)} placeholder="admin_usuario" className="terminal-input" />
        </div>
      </div>

      {sshAuthMethod === 'password' ? (
        <div className="terminal-row mb-4">
          <label className="terminal-label">{t('ssh.fields.password')}</label>
          <div className="terminal-input-wrap">
            <i className="pi pi-lock terminal-icon-left"></i>
            <InputText
              type={showPassword ? 'text' : 'password'}
              value={sshPassword}
              onChange={(e) => setSSHPassword(e.target.value)}
              placeholder={t('ssh.placeholders.password')}
              className={`terminal-input ${validationErrors.password ? 'p-invalid' : ''}`}
            />
            <i
              className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>
        </div>
      ) : (
        <div className="terminal-row mb-4">
          <label className="terminal-label">{t('ssh.fields.privateKeySSH')}</label>
          <div className="terminal-input-wrap terminal-key-file-wrap">
            <i className="pi pi-file terminal-icon-left"></i>
            <span className="terminal-key-file-name opacity-60 truncate">
              {privateKeyFileName || (sshPrivateKey ? t('ssh.auth.keyLoaded') : t('ssh.auth.keyFilePlaceholder'))}
            </span>
            <input
              ref={privateKeyInputRef}
              type="file"
              accept=".pem,.key,.ppk,text/plain"
              className="terminal-key-file-input"
              onChange={handlePrivateKeyFileChange}
            />
            <button
              type="button"
              className="terminal-key-file-btn"
              onClick={() => privateKeyInputRef.current?.click()}
            >
              {t('ssh.auth.browseKeyFile')}
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderFolderSelector = () => (
    <div className="terminal-row mb-4">
      <label className="terminal-label">
        {t('ssh.fields.targetFolder')}{' '}
        <span className="opacity-50">({tCommon('labels.optional')})</span>
      </label>
      <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
        <i className="pi pi-folder terminal-icon-left"></i>
        <Dropdown
          value={sshTargetFolder}
          options={foldersOptions}
          onChange={(e) => setSSHTargetFolder(e.value)}
          optionLabel="label"
          optionValue="value"
          placeholder={t('ssh.placeholders.targetFolder')}
          showClear
          filter
          filterPlaceholder={t('ssh.placeholders.targetFolder')}
          className="terminal-folder-dropdown"
          panelClassName="terminal-folder-dropdown-panel"
        />
      </div>
    </div>
  );

  const renderFoldersContent = () => (
    <div>
      <div className="flex align-items-center gap-2 mb-3">
        <i className="pi pi-folder" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Carpetas
        </span>
      </div>
      {renderFolderSelector()}
      <div className="terminal-row mb-4">
        <label className="terminal-label">CARPETA REMOTA (INICIAL) <span className="opacity-50">({tCommon('labels.optional')})</span></label>
        <div className="terminal-input-wrap">
          <i className="pi pi-folder-open terminal-icon-left"></i>
          <InputText
            value={sshRemoteFolder}
            onChange={(e) => setSSHRemoteFolder && setSSHRemoteFolder(e.target.value)}
            placeholder={t('ssh.placeholders.remoteFolder') || '/var/www o /home/usuario'}
            className="terminal-input"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedContent = () => (
    <div className="terminal-options-list" style={{ marginTop: 0 }}>
      <div className="terminal-advanced-tabs" role="tablist" aria-label={t('ssh.sections.advanced')}>
        {advancedOptionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ssh-advanced-tab-${tab.id}`}
            aria-selected={advancedOptionsTab === tab.id}
            aria-controls={`ssh-advanced-panel-${tab.id}`}
            className={`terminal-advanced-tab${advancedOptionsTab === tab.id ? ' active' : ''}`}
            onClick={() => setAdvancedOptionsTab(tab.id)}
          >
            <i className={`pi ${tab.icon}`} aria-hidden="true"></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {advancedOptionsTab === 'general' && (
        <div
          id="ssh-advanced-panel-general"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-general"
          className="terminal-advanced-panel-pane"
        >
          <div className="terminal-options-grid">
            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-save terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.autoCopyPassword')}</span>
                <TerminalOptionHelp text={t('ssh.auth.autoCopyPasswordDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAutoCopyPassword}
                onChange={(e) => setSSHAutoCopyPassword(e.value)}
                className="terminal-switch"
                disabled={sshAuthMethod === 'key'}
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-video terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.autoRecording')}</span>
                <TerminalOptionHelp text={t('ssh.auth.autoRecordingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAutoRecording}
                onChange={(e) => setSSHAutoRecording(e.value)}
                className="terminal-switch"
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-shield terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.agentForwarding')}</span>
                <TerminalOptionHelp text={t('ssh.auth.agentForwardingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAgentForwarding}
                onChange={(e) => setSSHAgentForwarding(e.value)}
                className="terminal-switch"
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-desktop terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.x11Forwarding')}</span>
                <TerminalOptionHelp text={t('ssh.auth.x11ForwardingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshX11Forwarding}
                onChange={(e) => setSSHX11Forwarding(e.value)}
                className="terminal-switch"
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-shield terminal-option-icon"></i>
                <span className="terminal-option-text">Bastión / Proxy PAM (Wallix, CyberArk)</span>
                <TerminalOptionHelp text="Optimiza la sesión para pasarelas de salto y bastiones PAM, usando túnel dedicado sin reenvíos innecesarios." />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={!!sshUseBastionWallix}
                onChange={(e) => setSSHUseBastionWallix(e.value)}
                className="terminal-switch"
              />
            </div>
          </div>
        </div>
      )}

      {!isWallixUser && advancedOptionsTab === 'proxyJump' && (
        <div
          id="ssh-advanced-panel-proxyJump"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-proxyJump"
          className="terminal-advanced-panel-pane terminal-proxyjump-panel"
        >
          <p className="terminal-proxyjump-intro">
            <i className="pi pi-question-circle terminal-proxyjump-intro-icon" aria-hidden="true"></i>
            <span>{t('ssh.auth.proxyJumpDescription')}</span>
          </p>
          <div className="terminal-host-port-row mb-2">
            <div className="terminal-host-port-host">
              <label className="terminal-label">{t('ssh.auth.jumpHost').toUpperCase()}</label>
              <div className="terminal-input-wrap">
                <InputText
                  value={sshJumpHost}
                  onChange={(e) => setSSHJumpHost(e.target.value)}
                  placeholder="jump.ejemplo.com"
                  className="terminal-input"
                />
              </div>
            </div>
            <div className="terminal-host-port-port">
              <label className="terminal-label">{t('ssh.auth.jumpPort').toUpperCase()}</label>
              <div className="terminal-input-wrap terminal-port-input-wrap">
                <InputText
                  value={sshJumpPort}
                  onChange={(e) => setSSHJumpPort(e.target.value)}
                  placeholder="22"
                  className="terminal-input terminal-port-input text-center"
                />
              </div>
            </div>
          </div>

          <div className="terminal-row mb-2">
                <label className="terminal-label">{t('ssh.auth.jumpUser').toUpperCase()}</label>
                <div className="terminal-input-wrap">
                  <InputText
                    value={sshJumpUser}
                    onChange={(e) => setSSHJumpUser(e.target.value)}
                    placeholder="jump_user"
                    className="terminal-input"
                  />
                </div>
              </div>

              <div className="terminal-row mb-2">
                <label className="terminal-label">{t('ssh.auth.method').toUpperCase()}</label>
                <div className="terminal-auth-selector">
                  <div
                    className={`terminal-auth-chip ${sshJumpAuthMethod === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setSSHJumpAuthMethod('password');
                      setSSHJumpPrivateKey('');
                      setJumpPrivateKeyFileName('');
                    }}
                  >
                    <i className="pi pi-lock"></i> {t('ssh.auth.password')}
                  </div>
                  <div
                    className={`terminal-auth-chip ${sshJumpAuthMethod === 'key' ? 'active' : ''}`}
                    onClick={() => {
                      setSSHJumpAuthMethod('key');
                      setSSHJumpPassword('');
                    }}
                  >
                    <i className="pi pi-key"></i> {t('ssh.auth.key')}
                  </div>
                </div>
              </div>

              {sshJumpAuthMethod === 'password' ? (
                <div className="terminal-row mb-0">
                  <label className="terminal-label">{t('ssh.auth.jumpPassword').toUpperCase()}</label>
                  <div className="terminal-input-wrap">
                    <InputText
                      type={showJumpPassword ? 'text' : 'password'}
                      value={sshJumpPassword}
                      onChange={(e) => setSSHJumpPassword(e.target.value)}
                      className="terminal-input"
                    />
                    <i
                      className={`pi ${showJumpPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                      onClick={() => setShowJumpPassword(!showJumpPassword)}
                    ></i>
                  </div>
                </div>
              ) : (
                <div className="terminal-row mb-0">
                  <label className="terminal-label">{t('ssh.auth.jumpPrivateKey').toUpperCase()}</label>
                  <div className="terminal-input-wrap terminal-key-file-wrap">
                    <span className="terminal-key-file-name opacity-60 truncate">
                      {jumpPrivateKeyFileName || (sshJumpPrivateKey ? t('ssh.auth.keyLoaded') : t('ssh.auth.keyFilePlaceholder'))}
                    </span>
                    <input
                      ref={jumpPrivateKeyInputRef}
                      type="file"
                      accept=".pem,.key,.ppk,text/plain"
                      className="terminal-key-file-input"
                      onChange={handleJumpPrivateKeyFileChange}
                    />
                    <button
                      type="button"
                      className="terminal-key-file-btn"
                      onClick={() => jumpPrivateKeyInputRef.current?.click()}
                    >
                      {t('ssh.auth.browseKeyFile')}
                    </button>
                  </div>
                </div>
              )}
        </div>
      )}

      {!isWallixUser && advancedOptionsTab === 'hostKey' && (
        <div
          id="ssh-advanced-panel-hostKey"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-hostKey"
          className="terminal-advanced-panel-pane"
        >
          <div className="terminal-row">
            <label className="terminal-label terminal-label-with-help">
              <span>{t('ssh.auth.hostKeyPolicy').toUpperCase()}</span>
              <TerminalOptionHelp text={t('ssh.auth.hostKeyPolicyDescription')} />
            </label>
            <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
              <Dropdown
                value={sshHostKeyPolicy}
                options={hostKeyPolicyOptions}
                onChange={(e) => setSSHHostKeyPolicy(e.value)}
                optionLabel="label"
                optionValue="value"
                className="terminal-folder-dropdown"
                panelClassName="terminal-folder-dropdown-panel"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render del formulario
  if (layoutMode === 'hud-badges') {
    const isFieldWarning = (field) => {
      if (field === 'name' && !sshName?.trim()) return true;
      if (field === 'host' && !sshHost?.trim()) return true;
      if (field === 'user' && !sshUser?.trim()) return true;
      if (field === 'password' && sshAuthMethod === 'password' && !sshPassword?.trim()) return true;
      if (field === 'privateKey' && sshAuthMethod === 'key' && !sshPrivateKey?.trim()) return true;
      return false;
    };

    return (
      <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
          
          {/* Grupo 1: Conexión y Acceso */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚙️ Conexión y Acceso Básicos
            </h4>
            <div className="hud-badge-container">
              
              {/* Nombre */}
              <div 
                className={`hud-badge-pill ${editingField === 'name' ? 'editing' : ''} ${isFieldWarning('name') ? 'warning' : ''}`}
                onClick={() => { setEditingField('name'); setStatusMessage('Editando nombre de la conexión.'); }}
              >
                <i className="pi pi-tag hud-badge-icon"></i>
                <span className="hud-badge-label">Nombre:</span>
                {editingField === 'name' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshName} 
                    onChange={(e) => setSSHName(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshName || 'Definir nombre...'}</span>
                )}
              </div>

              {/* Host */}
              <div 
                className={`hud-badge-pill ${editingField === 'host' ? 'editing' : ''} ${isFieldWarning('host') ? 'warning' : ''}`}
                onClick={() => { setEditingField('host'); setStatusMessage('Editando dirección IP o host del servidor.'); }}
              >
                <i className="pi pi-server hud-badge-icon"></i>
                <span className="hud-badge-label">Host:</span>
                {editingField === 'host' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshHost} 
                    onChange={(e) => setSSHHost(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshHost || 'Definir host...'}</span>
                )}
              </div>

              {/* Puerto */}
              <div 
                className={`hud-badge-pill ${editingField === 'port' ? 'editing' : ''}`}
                onClick={() => { setEditingField('port'); setStatusMessage('Editando puerto SSH (por defecto 22).'); }}
              >
                <i className="pi pi-info-circle hud-badge-icon"></i>
                <span className="hud-badge-label">Puerto:</span>
                {editingField === 'port' ? (
                  <input 
                    type="number" 
                    className="hud-badge-input" 
                    style={{ width: '60px' }}
                    value={sshPort} 
                    onChange={(e) => setSSHPort(parseInt(e.target.value) || 22)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshPort}</span>
                )}
              </div>

              {/* Usuario */}
              <div 
                className={`hud-badge-pill ${editingField === 'user' ? 'editing' : ''} ${isFieldWarning('user') ? 'warning' : ''}`}
                onClick={() => { setEditingField('user'); setStatusMessage('Editando nombre de usuario SSH.'); }}
              >
                <i className="pi pi-user hud-badge-icon"></i>
                <span className="hud-badge-label">Usuario:</span>
                {editingField === 'user' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshUser} 
                    onChange={(e) => setSSHUser(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshUser || 'Definir usuario...'}</span>
                )}
              </div>

              {/* Método Auth */}
              <div 
                className="hud-badge-pill active"
                onClick={() => {
                  const nextMethod = sshAuthMethod === 'password' ? 'key' : 'password';
                  setSSHAuthMethod(nextMethod);
                  setStatusMessage(`Cambiado método de autenticación a: ${nextMethod === 'password' ? 'Contraseña' : 'Clave privada'}`);
                }}
              >
                <i className="pi pi-key hud-badge-icon"></i>
                <span className="hud-badge-label">Auth:</span>
                <span className="hud-badge-value">{sshAuthMethod === 'password' ? 'Contraseña' : 'Clave privada'}</span>
              </div>

              {/* Contraseña (si es contraseña) */}
              {sshAuthMethod === 'password' && (
                <div 
                  className={`hud-badge-pill ${editingField === 'password' ? 'editing' : ''} ${isFieldWarning('password') ? 'warning' : ''}`}
                  onClick={() => { setEditingField('password'); setStatusMessage('Editando contraseña de acceso.'); }}
                >
                  <i className="pi pi-lock hud-badge-icon"></i>
                  <span className="hud-badge-label">Contraseña:</span>
                  {editingField === 'password' ? (
                    <input 
                      type="password" 
                      className="hud-badge-input" 
                      value={sshPassword} 
                      onChange={(e) => setSSHPassword(e.target.value)} 
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                      autoFocus 
                    />
                  ) : (
                    <span className="hud-badge-value">{sshPassword ? '••••••••' : 'Definir contraseña...'}</span>
                  )}
                </div>
              )}

              {/* Clave Privada (si es clave) */}
              {sshAuthMethod === 'key' && (
                <div 
                  className={`hud-badge-pill ${isFieldWarning('privateKey') ? 'warning' : 'active'}`}
                  onClick={() => {
                    privateKeyInputRef.current?.click();
                    setStatusMessage('Abre el explorador de archivos para cargar tu clave privada.');
                  }}
                >
                  <i className="pi pi-file hud-badge-icon"></i>
                  <span className="hud-badge-label">Clave:</span>
                  <span className="hud-badge-value">
                    {privateKeyFileName || (sshPrivateKey ? 'Clave cargada' : 'Cargar clave...')}
                  </span>
                  <input
                    ref={privateKeyInputRef}
                    type="file"
                    accept=".pem,.key,.ppk,text/plain"
                    style={{ display: 'none' }}
                    onChange={handlePrivateKeyFileChange}
                  />
                </div>
              )}

              {/* Carpeta destino */}
              <div className="hud-badge-pill">
                <i className="pi pi-folder hud-badge-icon"></i>
                <span className="hud-badge-label">Carpeta local:</span>
                <Dropdown
                  value={sshTargetFolder}
                  options={foldersOptions}
                  onChange={(e) => {
                    setSSHTargetFolder(e.value);
                    setStatusMessage(`Carpeta local destino cambiada.`);
                  }}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sin carpeta"
                  showClear
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>

              {/* Carpeta remota */}
              <div 
                className={`hud-badge-pill ${editingField === 'remoteFolder' ? 'editing' : ''}`}
                onClick={() => { setEditingField('remoteFolder'); setStatusMessage('Editando directorio inicial en el servidor.'); }}
              >
                <i className="pi pi-folder-open hud-badge-icon"></i>
                <span className="hud-badge-label">Dir. remoto:</span>
                {editingField === 'remoteFolder' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshRemoteFolder} 
                    onChange={(e) => setSSHRemoteFolder(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshRemoteFolder || '/'}</span>
                )}
              </div>

              {/* Descripción */}
              <div 
                className={`hud-badge-pill ${editingField === 'description' ? 'editing' : ''}`}
                onClick={() => { setEditingField('description'); setStatusMessage('Editando descripción para esta conexión.'); }}
              >
                <i className="pi pi-align-left hud-badge-icon"></i>
                <span className="hud-badge-label">Nota:</span>
                {editingField === 'description' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshDescription} 
                    onChange={(e) => setSSHDescription(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshDescription || 'Sin descripción...'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Grupo 2: Opciones de Sesión (Switches) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Opciones de Sesión (Clic para alternar)
            </h4>
            <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
              
              {/* Auto copiar contraseña */}
              <div 
                className={`hud-badge-pill ${sshAutoCopyPassword ? 'active' : ''}`}
                onClick={() => {
                  setSSHAutoCopyPassword(!sshAutoCopyPassword);
                  setStatusMessage(`Auto-copiar contraseña: ${!sshAutoCopyPassword ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-save hud-badge-icon"></i>
                <span className="hud-badge-label">Auto copiar clave:</span>
                <span className="hud-badge-value">{sshAutoCopyPassword ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Auto Recording */}
              <div 
                className={`hud-badge-pill ${sshAutoRecording ? 'active' : ''}`}
                onClick={() => {
                  setSSHAutoRecording(!sshAutoRecording);
                  setStatusMessage(`Grabación automática de sesión: ${!sshAutoRecording ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-video hud-badge-icon"></i>
                <span className="hud-badge-label">Grabar sesión:</span>
                <span className="hud-badge-value">{sshAutoRecording ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Agent Forwarding */}
              <div 
                className={`hud-badge-pill ${sshAgentForwarding ? 'active' : ''}`}
                onClick={() => {
                  setSSHAgentForwarding(!sshAgentForwarding);
                  setStatusMessage(`Reenvío de agente SSH: ${!sshAgentForwarding ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-shield hud-badge-icon"></i>
                <span className="hud-badge-label">Agente SSH:</span>
                <span className="hud-badge-value">{sshAgentForwarding ? 'SÍ' : 'NO'}</span>
              </div>

              {/* X11 Forwarding */}
              <div 
                className={`hud-badge-pill ${sshX11Forwarding ? 'active' : ''}`}
                onClick={() => {
                  setSSHX11Forwarding(!sshX11Forwarding);
                  setStatusMessage(`Reenvío de servidor gráfico X11: ${!sshX11Forwarding ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-desktop hud-badge-icon"></i>
                <span className="hud-badge-label">Gráficos X11:</span>
                <span className="hud-badge-value">{sshX11Forwarding ? 'SÍ' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Grupo 3: Salto SSH (Proxy Jump) */}
          {!isWallixUser && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.75rem 0.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🚀 Túnel y Salto (Proxy Jump)
                </h4>
                <div 
                  className={`hud-badge-pill ${sshProxyJumpEnabled ? 'active' : ''}`}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                  onClick={() => {
                    setSSHProxyJumpEnabled(!sshProxyJumpEnabled);
                    setStatusMessage(`Bastión de Salto SSH: ${!sshProxyJumpEnabled ? 'Habilitado' : 'Deshabilitado'}`);
                  }}
                >
                  <span className="hud-badge-value">{sshProxyJumpEnabled ? 'HABILITADO' : 'DESHABILITADO'}</span>
                </div>
              </div>

              {sshProxyJumpEnabled && (
                <div className="hud-badge-container">
                  {/* Host Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpHost' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpHost'); setStatusMessage('Editando host del servidor de salto.'); }}
                  >
                    <i className="pi pi-server hud-badge-icon"></i>
                    <span className="hud-badge-label">Host salto:</span>
                    {editingField === 'jumpHost' ? (
                      <input 
                        type="text" 
                        className="hud-badge-input" 
                        value={sshJumpHost} 
                        onChange={(e) => setSSHJumpHost(e.target.value)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpHost || 'Definir host...'}</span>
                    )}
                  </div>

                  {/* Puerto Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpPort' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpPort'); setStatusMessage('Editando puerto de salto (por defecto 22).'); }}
                  >
                    <i className="pi pi-info-circle hud-badge-icon"></i>
                    <span className="hud-badge-label">Puerto salto:</span>
                    {editingField === 'jumpPort' ? (
                      <input 
                        type="number" 
                        className="hud-badge-input" 
                        style={{ width: '60px' }}
                        value={sshJumpPort} 
                        onChange={(e) => setSSHJumpPort(parseInt(e.target.value) || 22)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpPort}</span>
                    )}
                  </div>

                  {/* Usuario Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpUser' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpUser'); setStatusMessage('Editando usuario de salto.'); }}
                  >
                    <i className="pi pi-user hud-badge-icon"></i>
                    <span className="hud-badge-label">Usuario salto:</span>
                    {editingField === 'jumpUser' ? (
                      <input 
                        type="text" 
                        className="hud-badge-input" 
                        value={sshJumpUser} 
                        onChange={(e) => setSSHJumpUser(e.target.value)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpUser || 'Definir usuario...'}</span>
                    )}
                  </div>

                  {/* Auth Salto */}
                  <div 
                    className="hud-badge-pill active"
                    onClick={() => {
                      const nextMethod = sshJumpAuthMethod === 'password' ? 'key' : 'password';
                      setSSHJumpAuthMethod(nextMethod);
                      setStatusMessage(`Cambiado método de autenticación de salto a: ${nextMethod === 'password' ? 'Contraseña' : 'Clave privada'}`);
                    }}
                  >
                    <i className="pi pi-key hud-badge-icon"></i>
                    <span className="hud-badge-label">Auth salto:</span>
                    <span className="hud-badge-value">{sshJumpAuthMethod === 'password' ? 'Contraseña' : 'Clave privada'}</span>
                  </div>

                  {/* Contraseña Salto */}
                  {sshJumpAuthMethod === 'password' && (
                    <div 
                      className={`hud-badge-pill ${editingField === 'jumpPassword' ? 'editing' : ''}`}
                      onClick={() => { setEditingField('jumpPassword'); setStatusMessage('Editando contraseña de salto.'); }}
                    >
                      <i className="pi pi-lock hud-badge-icon"></i>
                      <span className="hud-badge-label">Contraseña salto:</span>
                      {editingField === 'jumpPassword' ? (
                        <input 
                          type="password" 
                          className="hud-badge-input" 
                          value={sshJumpPassword} 
                          onChange={(e) => setSSHJumpPassword(e.target.value)} 
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          autoFocus 
                        />
                      ) : (
                        <span className="hud-badge-value">{sshJumpPassword ? '••••••••' : 'Definir contraseña...'}</span>
                      )}
                    </div>
                  )}

                  {/* Clave Salto */}
                  {sshJumpAuthMethod === 'key' && (
                    <div 
                      className="hud-badge-pill active"
                      onClick={() => {
                        jumpPrivateKeyInputRef.current?.click();
                        setStatusMessage('Abre el explorador para cargar la clave privada de salto.');
                      }}
                    >
                      <i className="pi pi-file hud-badge-icon"></i>
                      <span className="hud-badge-label">Clave salto:</span>
                      <span className="hud-badge-value">
                        {jumpPrivateKeyFileName || (sshJumpPrivateKey ? 'Clave cargada' : 'Cargar clave...')}
                      </span>
                      <input
                        ref={jumpPrivateKeyInputRef}
                        type="file"
                        accept=".pem,.key,.ppk,text/plain"
                        style={{ display: 'none' }}
                        onChange={handleJumpPrivateKeyFileChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grupo 4: Seguridad */}
          {!isWallixUser && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🛡️ Políticas de Seguridad
              </h4>
              <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
                {/* Host Key Policy */}
                <div className="hud-badge-pill">
                  <i className="pi pi-shield hud-badge-icon"></i>
                  <span className="hud-badge-label">Host Key:</span>
                  <Dropdown
                    value={sshHostKeyPolicy}
                    options={hostKeyPolicyOptions}
                    onChange={(e) => {
                      setSSHHostKeyPolicy(e.value);
                      setStatusMessage(`Política Host Key cambiada.`);
                    }}
                    optionLabel="label"
                    optionValue="value"
                    className="hud-dropdown-inline"
                    panelClassName="terminal-folder-dropdown-panel"
                  />
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
        {!hideFooter && (
          <div className="terminal-footer" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="terminal-btn-outline" onClick={() => {}}>
              <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
            </button>
            <div className="flex gap-2">
              <button type="button" className="terminal-btn-text app-dialog-btn-cancel" onClick={onHide}>CANCELAR</button>
              <button
                type="button"
                className="terminal-btn-outline terminal-btn-submit app-dialog-btn-confirm"
                onClick={handleSubmit}
                disabled={!isFormValid() || sshLoading}
              >
                <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
                {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render del formulario
  if (layoutMode === 'sidebar') {
    return (
      <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
        <div className="form-layout-sidebar" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginBottom: '1rem' }}>
          <div className="form-sidebar-nav">
            {sidebarTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`form-sidebar-nav-btn ${activeFormTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveFormTab(tab.id)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="form-sidebar-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
            {activeFormTab === 'general' && (
              <div>
                {renderNameDesc()}
                {renderHostPort()}
                {renderAuthMethodSelector()}
                {renderUserAndAuthInput()}
              </div>
            )}
            {activeFormTab === 'folders' && renderFoldersContent()}
            {activeFormTab === 'proxy' && (
              <div className="p-fluid">
                <div className="flex align-items-center gap-2 mb-3">
                  <i className="pi pi-share-alt" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Configuración de Salto SSH (Proxy Jump)
                  </span>
                </div>
                <p className="terminal-proxyjump-intro" style={{ marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                  <i className="pi pi-question-circle" style={{ fontSize: '1rem', color: 'var(--ui-button-primary)' }}></i>
                  <span>{t('ssh.auth.proxyJumpDescription')}</span>
                </p>
                <div className="terminal-host-port-row mb-3">
                  <div className="terminal-host-port-host">
                    <label className="terminal-label">HOST / IP DE SALTO</label>
                    <div className="terminal-input-wrap">
                      <InputText
                        value={sshJumpHost}
                        onChange={(e) => setSSHJumpHost(e.target.value)}
                        placeholder="jump.ejemplo.com"
                        className="terminal-input"
                      />
                    </div>
                  </div>
                  <div className="terminal-host-port-port">
                    <label className="terminal-label">PUERTO</label>
                    <div className="terminal-input-wrap terminal-port-input-wrap">
                      <InputText
                        value={sshJumpPort}
                        onChange={(e) => setSSHJumpPort(parseInt(e.target.value) || 22)}
                        placeholder="22"
                        className="terminal-input terminal-port-input text-center"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="terminal-row mb-3">
                  <label className="terminal-label">USUARIO DE SALTO</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-user terminal-icon-left"></i>
                    <InputText
                      value={sshJumpUser}
                      onChange={(e) => setSSHJumpUser(e.target.value)}
                      placeholder="jump_user"
                      className="terminal-input"
                    />
                  </div>
                </div>

                <div className="terminal-row mb-3">
                  <label className="terminal-label">MÉTODO DE AUTENTICACIÓN</label>
                  <div className="terminal-auth-selector">
                    <div
                      className={`terminal-auth-chip ${sshJumpAuthMethod === 'password' ? 'active' : ''}`}
                      onClick={() => {
                        setSSHJumpAuthMethod('password');
                        setSSHJumpPrivateKey('');
                        setJumpPrivateKeyFileName('');
                      }}
                    >
                      <i className="pi pi-lock"></i> Contraseña
                    </div>
                    <div
                      className={`terminal-auth-chip ${sshJumpAuthMethod === 'key' ? 'active' : ''}`}
                      onClick={() => {
                        setSSHJumpAuthMethod('key');
                        setSSHJumpPassword('');
                      }}
                    >
                      <i className="pi pi-key"></i> Clave privada
                    </div>
                  </div>
                </div>

                {sshJumpAuthMethod === 'password' ? (
                  <div className="terminal-row mb-0">
                    <label className="terminal-label">CONTRASEÑA DE SALTO</label>
                    <div className="terminal-input-wrap">
                      <i className="pi pi-lock terminal-icon-left"></i>
                      <InputText
                        type={showJumpPassword ? 'text' : 'password'}
                        value={sshJumpPassword}
                        onChange={(e) => setSSHJumpPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="terminal-input"
                      />
                      <i
                        className={`pi ${showJumpPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                        onClick={() => setShowJumpPassword(!showJumpPassword)}
                      ></i>
                    </div>
                  </div>
                ) : (
                  <div className="terminal-row mb-0">
                    <label className="terminal-label">CLAVE PRIVADA DE SALTO</label>
                    <div className="terminal-input-wrap terminal-key-file-wrap">
                      <i className="pi pi-file terminal-icon-left"></i>
                      <span className="terminal-key-file-name opacity-60 truncate">
                        {jumpPrivateKeyFileName || (sshJumpPrivateKey ? 'Clave cargada' : 'Selecciona archivo de clave')}
                      </span>
                      <input
                        ref={jumpPrivateKeyInputRef}
                        type="file"
                        accept=".pem,.key,.ppk,text/plain"
                        style={{ display: 'none' }}
                        onChange={handleJumpPrivateKeyFileChange}
                      />
                      <button
                        type="button"
                        className="terminal-key-file-btn"
                        onClick={() => jumpPrivateKeyInputRef.current?.click()}
                      >
                        Examinar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeFormTab === 'security' && (
              <div className="p-fluid">
                <div className="flex align-items-center gap-2 mb-3">
                  <i className="pi pi-shield" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Políticas de Seguridad de Host
                  </span>
                </div>
                <div className="terminal-row">
                  <label className="terminal-label terminal-label-with-help">
                    <span>{t('ssh.auth.hostKeyPolicy').toUpperCase()}</span>
                    <TerminalOptionHelp text={t('ssh.auth.hostKeyPolicyDescription')} />
                  </label>
                  <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
                    <i className="pi pi-shield terminal-icon-left"></i>
                    <Dropdown
                      value={sshHostKeyPolicy}
                      options={hostKeyPolicyOptions}
                      onChange={(e) => setSSHHostKeyPolicy(e.value)}
                      optionLabel="label"
                      optionValue="value"
                      className="terminal-folder-dropdown"
                      panelClassName="terminal-folder-dropdown-panel"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeFormTab === 'advanced' && (
              <div>
                <div className="flex align-items-center gap-2 mb-3">
                  <i className="pi pi-cog" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Opciones Avanzadas
                  </span>
                </div>
                <div className="terminal-options-grid" style={{ gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-save terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.autoCopyPassword')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.autoCopyPasswordDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAutoCopyPassword}
                      onChange={(e) => setSSHAutoCopyPassword(e.value)}
                      className="terminal-switch"
                      disabled={sshAuthMethod === 'key'}
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-video terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.autoRecording')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.autoRecordingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAutoRecording}
                      onChange={(e) => setSSHAutoRecording(e.value)}
                      className="terminal-switch"
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-shield terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.agentForwarding')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.agentForwardingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAgentForwarding}
                      onChange={(e) => setSSHAgentForwarding(e.value)}
                      className="terminal-switch"
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-desktop terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.x11Forwarding')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.x11ForwardingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshX11Forwarding}
                      onChange={(e) => setSSHX11Forwarding(e.value)}
                      className="terminal-switch"
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-shield terminal-option-icon"></i>
                      <span className="terminal-option-text">Bastión / Proxy PAM (Wallix, CyberArk)</span>
                      <TerminalOptionHelp text="Optimiza la sesión para pasarelas de salto y bastiones PAM, usando túnel dedicado sin reenvíos innecesarios." />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={!!sshUseBastionWallix}
                      onChange={(e) => setSSHUseBastionWallix(e.value)}
                      className="terminal-switch"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Terminal */}
        {!hideFooter && (
          <div className="terminal-footer">
            <button type="button" className="terminal-btn-outline" onClick={() => {}}>
              <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
            </button>
            <div className="flex gap-2">
              <button type="button" className="terminal-btn-text app-dialog-btn-cancel" onClick={onHide}>CANCELAR</button>
              <button
                type="button"
                className="terminal-btn-outline terminal-btn-submit app-dialog-btn-confirm"
                onClick={handleSubmit}
                disabled={!isFormValid() || sshLoading}
              >
                <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
                {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
      
      {layoutMode === 'tabbed' && (
        <div className="form-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))', paddingBottom: '0.5rem' }}>
          {[
            { id: 'general', label: 'General', icon: 'pi-info-circle' },
            { id: 'advanced', label: 'Opciones Avanzadas', icon: 'pi-cog' }
          ].map(ft => (
            <button
              key={ft.id}
              type="button"
              onClick={() => setActiveFormTab(ft.id)}
              style={{
                background: activeFormTab === ft.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeFormTab === ft.id ? 'var(--ui-button-primary, #6366f1)' : 'rgba(255, 255, 255, 0.6)',
                border: 'none',
                borderBottom: activeFormTab === ft.id ? '2px solid var(--ui-button-primary, #6366f1)' : 'none',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`pi ${ft.icon}`}></i>
              {ft.label}
            </button>
          ))}
        </div>
      )}

      <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        
        {layoutMode === 'split' ? (
          <div className="grid grid-nogutter">
            <div className="col-12 md:col-6" style={{ padding: '0 1rem 0 0' }}>
              {renderNameDesc()}
              {renderHostPort()}
              {renderAuthMethodSelector()}
              {renderUserAndAuthInput()}
            </div>
            
            <div className="col-12 md:col-6" style={{ padding: '0 0 0 1rem', borderLeft: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
              {renderFolderSelector()}
              <div className="terminal-options-section-title mb-2">OPCIONES AVANZADAS</div>
              {renderAdvancedContent()}
            </div>
          </div>
        ) : layoutMode === 'tabbed' ? (
          <div>
            {activeFormTab === 'general' && (
              <div>
                {renderNameDesc()}
                {renderHostPort()}
                {renderAuthMethodSelector()}
                {renderUserAndAuthInput()}
              </div>
            )}
            
            {activeFormTab === 'advanced' && (
              <div>
                {renderAdvancedContent()}
              </div>
            )}
          </div>
        ) : (
          /* Standard Layout */
          <>
            {renderNameDesc()}
            {renderHostPort()}
            {renderAuthMethodSelector()}
            {renderUserAndAuthInput()}
            {renderFolderSelector()}

            <div className="terminal-advanced-section mb-3">
              <button
                type="button"
                className="terminal-advanced-header"
                onClick={() => setShowAdvancedOptions((open) => !open)}
                aria-expanded={showAdvancedOptions}
              >
                <span className="terminal-label mb-0">{t('ssh.sections.advanced').toUpperCase()}</span>
                <i className={`pi ${showAdvancedOptions ? 'pi-chevron-up' : 'pi-chevron-down'} opacity-50`}></i>
              </button>

              {showAdvancedOptions && renderAdvancedContent()}
            </div>
          </>
        )}

      </div>

      {/* Footer Terminal */}
      {!hideFooter && (
        <div className="terminal-footer">
          <button className="terminal-btn-outline" onClick={() => {}}>
            <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
          </button>
          <div className="flex gap-2">
            <button className="terminal-btn-text app-dialog-btn-cancel" onClick={onHide}>CANCELAR</button>
            <button
              className="terminal-btn-outline terminal-btn-submit app-dialog-btn-confirm"
              onClick={handleSubmit}
              disabled={!isFormValid() || sshLoading}
            >
              <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
              {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
