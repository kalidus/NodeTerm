import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { SSHIconSelectorModal } from '../SSHIconSelector';
import { iconThemes } from '../../themes/icon-themes';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { AppDialogHeader } from '../ui/AppDialog';
import {
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from '../EnhancedRDPForm';
import { EnhancedSSHForm } from './EnhancedSSHForm';
import { resolveSSHIconPreset, renderSSHDialogHeaderIconContent } from './sshDialogHeaderHelpers';

// --- NewSSHConnectionDialog: Diálogo simple solo para SSH ---
export function NewSSHConnectionDialog({
  visible,
  onHide,
  onGoBack,
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
  sshIcon = null, setSSHIcon = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  iconTheme = 'material'
}) {
  const { t } = useTranslation('dialogs');
  const [showIconSelector, setShowIconSelector] = useState(false);

  // Reset fields on dialog open
  useEffect(() => {
    if (visible) {
      if (setSSHName) setSSHName('');
      if (setSSHHost) setSSHHost('');
      if (setSSHUser) setSSHUser('');
      if (setSSHPassword) setSSHPassword('');
      if (setSSHRemoteFolder) setSSHRemoteFolder('');
      if (setSSHPort) setSSHPort(22);
      if (setSSHTargetFolder) setSSHTargetFolder(null);
      if (setSSHAutoCopyPassword) setSSHAutoCopyPassword(false);
      if (setSSHX11Forwarding) setSSHX11Forwarding(false);
      if (setSSHAgentForwarding) setSSHAgentForwarding(false);
      if (setSSHAutoRecording) setSSHAutoRecording(false);
      if (setSSHProxyJumpEnabled) setSSHProxyJumpEnabled(false);
      if (setSSHJumpHost) setSSHJumpHost('');
      if (setSSHJumpPort) setSSHJumpPort(22);
      if (setSSHJumpUser) setSSHJumpUser('');
      if (setSSHJumpAuthMethod) setSSHJumpAuthMethod('password');
      if (setSSHJumpPassword) setSSHJumpPassword('');
      if (setSSHJumpPrivateKey) setSSHJumpPrivateKey('');
      if (setSSHHostKeyPolicy) setSSHHostKeyPolicy('warn_new');
      if (setSSHDescription) setSSHDescription('');
      if (setSSHIcon) setSSHIcon(null);
      if (setSSHAuthMethod) setSSHAuthMethod('password');
      if (setSSHPrivateKey) setSSHPrivateKey('');
    }
  }, [
    visible,
    setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort,
    setSSHTargetFolder, setSSHAutoCopyPassword, setSSHX11Forwarding, setSSHAgentForwarding,
    setSSHAutoRecording, setSSHProxyJumpEnabled, setSSHJumpHost, setSSHJumpPort, setSSHJumpUser,
    setSSHJumpAuthMethod, setSSHJumpPassword, setSSHJumpPrivateKey, setSSHHostKeyPolicy,
    setSSHDescription, setSSHIcon, setSSHAuthMethod, setSSHPrivateKey
  ]);

  const currentIconPreset = useMemo(() => resolveSSHIconPreset(sshIcon), [sshIcon]);
  const themeSSHIcon = useMemo(() => {
    const theme = iconThemes[iconTheme] || iconThemes.material;
    return theme?.icons?.ssh || null;
  }, [iconTheme]);

  const handleIconSelect = useCallback((iconId) => {
    if (setSSHIcon && typeof setSSHIcon === 'function') {
      setSSHIcon(iconId === 'default' || iconId == null ? null : iconId);
    }
  }, [setSSHIcon]);

  const headerTemplate = (
    <AppDialogHeader
      icon={(
        <button
          type="button"
          onClick={() => setShowIconSelector(true)}
          className="app-dialog-header-icon-btn"
          title="Cambiar Icono"
        >
          {renderSSHDialogHeaderIconContent(currentIconPreset, themeSSHIcon)}
        </button>
      )}
      title={t('ssh.title.new').toUpperCase()}
    />
  );

  return (
    <>
    <Dialog
      header={headerTemplate}
      visible={visible}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      onHide={onHide}
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="app-dialog terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
        <EnhancedSSHForm
          activeTabIndex={0}
          sshName={sshName}
          setSSHName={setSSHName}
          sshHost={sshHost}
          setSSHHost={setSSHHost}
          sshUser={sshUser}
          setSSHUser={setSSHUser}
          sshPassword={sshPassword}
          setSSHPassword={setSSHPassword}
          sshPort={sshPort}
          setSSHPort={setSSHPort}
          sshRemoteFolder={sshRemoteFolder}
          setSSHRemoteFolder={setSSHRemoteFolder}
          sshTargetFolder={sshTargetFolder}
          setSSHTargetFolder={setSSHTargetFolder}
          sshAuthMethod={sshAuthMethod}
          setSSHAuthMethod={setSSHAuthMethod}
          sshPrivateKey={sshPrivateKey}
          setSSHPrivateKey={setSSHPrivateKey}
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
          sshX11Forwarding={sshX11Forwarding}
          setSSHX11Forwarding={setSSHX11Forwarding}
          sshAgentForwarding={sshAgentForwarding}
          setSSHAgentForwarding={setSSHAgentForwarding}
          sshAutoRecording={sshAutoRecording}
          setSSHAutoRecording={setSSHAutoRecording}
          sshProxyJumpEnabled={sshProxyJumpEnabled}
          setSSHProxyJumpEnabled={setSSHProxyJumpEnabled}
          sshJumpHost={sshJumpHost}
          setSSHJumpHost={setSSHJumpHost}
          sshJumpPort={sshJumpPort}
          setSSHJumpPort={setSSHJumpPort}
          sshJumpUser={sshJumpUser}
          setSSHJumpUser={setSSHJumpUser}
          sshJumpAuthMethod={sshJumpAuthMethod}
          setSSHJumpAuthMethod={setSSHJumpAuthMethod}
          sshJumpPassword={sshJumpPassword}
          setSSHJumpPassword={setSSHJumpPassword}
          sshJumpPrivateKey={sshJumpPrivateKey}
          setSSHJumpPrivateKey={setSSHJumpPrivateKey}
          sshHostKeyPolicy={sshHostKeyPolicy}
          setSSHHostKeyPolicy={setSSHHostKeyPolicy}
          sshDescription={sshDescription}
          setSSHDescription={setSSHDescription}
          foldersOptions={foldersOptions}
          onSSHConfirm={onSSHConfirm}
          onHide={onHide}
          onGoBack={onGoBack}
          sshLoading={sshLoading}
        />
      </div>
    </Dialog>

    <SSHIconSelectorModal
      visible={showIconSelector}
      onHide={() => setShowIconSelector(false)}
      selectedIconId={sshIcon ?? 'default'}
      onSelectIcon={handleIconSelect}
    />
    </>
  );
}
